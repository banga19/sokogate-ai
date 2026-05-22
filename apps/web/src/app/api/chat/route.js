import sql from "@/app/api/utils/sql";
import { queryProducts } from "@/app/api/utils/productSql";
import { scoreLeadFromText } from "@/utils/leadScoring";
import { serverEvents } from "@/server/pubsub";
import Anthropic from "@anthropic-ai/sdk";
import { fetchProductDetails, searchProducts } from "@/lib/webProductSearch";
import { applyRateLimit } from "@/app/api/utils/rateLimiter";
import { getCachedKnowledge, setCachedKnowledge } from "@/app/api/utils/knowledgeCache";


const CATEGORIES = [
  "Apparel & Fabrics", "Electronics", "Agriculture & Food", "Auto Parts",
  "Health & Beauty", "Machinery & Parts", "Home & Construction", "Sports & Toys", "Other"
];

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx except 429)
      if (error.status === 400 || (error.status >= 500 && error.status < 600 && attempt === maxRetries)) {
        throw error;
      }
      
      // Only retry on rate limits (429) or server errors (5xx)
      const shouldRetry = error.status === 429 || error.status >= 500;
      if (!shouldRetry || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(initialDelay * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      
      // Respect Retry-After header if present
      const retryAfter = error.headers?.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw lastError;
}

/**
 * Throw a clear error if the lead database is not available.
 * Prevents silent failures where the mock SQL client appears to succeed
 * but no data is ever persisted to the real database.
 */
function assertDatabaseReady() {
  if (sql.isMock) {
    throw new Error(
      'Database is unavailable: DATABASE_URL is not set or is invalid. ' +
      'Leads cannot be saved. Set a valid Postgres DATABASE_URL and restart.'
    );
  }
}

// ============================================
// UTILITIES
// ============================================

function detectCategory(text) {
  if (!text) return "Other";
  
  // Tokenize: split into words, lowercase, remove non-alphanumeric
  const rawTokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const tokenSet = new Set(rawTokens);
  
  // Add singular forms (strip trailing 's') to handle plurals
  rawTokens.forEach(t => {
    if (t.endsWith('s') && t.length > 1) {
      tokenSet.add(t.slice(0, -1));
    }
  });

  const map = {
    "Apparel & Fabrics": ["clothing","apparel","fabric","textile","garment","fashion","shirt","dress","jeans","uniform", "clothes", "garments"],
    "Electronics": ["electronics","electronic","gadget","phone","computer","laptop","tv","camera","component","circuit", "pc", "laptop"],
    "Agriculture & Food": ["agriculture","food","farm","crop","grain","fruit","vegetable","meat","dairy","seafood", "produce", "agri"],
    "Auto Parts": ["auto","car","vehicle","part","tire","engine","brake","wheel","automotive", "automobile", "motorcycle"],
    "Health & Beauty": ["health","beauty","cosmetic","skincare","medicine","pharmaceutical","supplement", "cosmetics", "skin", "care", "pharma"],
    "Machinery & Parts": ["machinery","machine","equipment","tool","industrial","engine","motor", "machines", "tools", "heavy"],
    "Home & Construction": ["home","construction","furniture","building","material","decoration","interior", "furnishings", "fixtures"],
    "Sports & Toys": ["sports","toy","game","equipment","fitness","outdoor","play","recreation", "sport", "toys", "games"]
  };

  // Score categories by number of matched keywords
  let bestCategory = "Other";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(map)) {
    const score = keywords.reduce((sum, kw) => sum + (tokenSet.has(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

   // Only return a specific category if score is at least 1 (default to "Other" if no matches)
   return bestScore > 0 ? bestCategory : "Other";
}

function extractLeadData(aiContent) {
  try {
    if (!aiContent || typeof aiContent !== "string") return null;
    const start = aiContent.indexOf("|LEAD_DATA:");
    if (start === -1) return null;
    const jsonStr = aiContent.slice(start + 10, aiContent.indexOf("|", start + 10)).trim();
    return JSON.parse(jsonStr);
  } catch { return null; }
}

function extractHandoffRequest(aiContent) {
  try {
    const start = aiContent.indexOf("|HANDOFF:");
    if (start === -1) return null;
    const jsonStr = aiContent.slice(start + 8, aiContent.indexOf("|", start + 8)).trim();
    return JSON.parse(jsonStr);
  } catch { return null; }
}

function getLatestUserMessage(messages) {
  const arr = Array.isArray(messages) ? messages : [];
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    if (m?.role === "user" && typeof m?.content === "string") return m.content;
  }
  return "";
}

function buildDeterministicAnswer({ kind }) {
  const base = `👋 Thanks! I can help with that through Sokogate.\n\n`;
  if (kind === "electronics") return base + `You're looking for **electronics in bulk**. Please share:\n1) Exact items (phones, laptops, etc)\n2) Quantity / MOQ\n3) Destination country/city\n4) Budget (optional)\n\nOnce I have your contact details, we'll follow up quickly.`;
  if (kind === "apparel") return base + `You're looking for **clothing & apparel suppliers**. Please send:\n1) Apparel type\n2) Sizes / quantity (MOQ)\n3) Your destination\n4) Target price/budget (optional)\n\nThen we'll connect you to verified wholesalers.`;
  if (kind === "agriculture") return base + `You need **agriculture & food products**. Share:\n1) Product name(s)\n2) Quantity / MOQ\n3) Quality specs (grade, packaging)\n4) Destination + timeline\n\nAfter capturing WhatsApp + name, we'll source options for you.`;
  if (kind === "supplier_buyers") return base + `You're a **supplier looking for buyers**. Please tell us:\n1) What you sell (category + SKUs)\n2) Best MOQ / wholesale pricing\n3) Shipping locations you can serve\n4) Target buyer regions\n\nWe'll match you with interested B2B buyers.`;
  if (kind === "payment_methods") return base + `We accept:\n- **M-Pesa**\n- **Wave**\n- **Airtel Money**\n- **MTN MoMo**\n- **Visa**\n- Other major African & international options\n\nShare your product + quantity + destination so we can confirm best payment path.`;
  return base + "Tell me more so I can match you to the right suppliers.";
}

function detectFAQKind(userText) {
  const t = (userText || "").toLowerCase();
  if (t.includes("electronics") && (t.includes("bulk") || t.includes("wholesale"))) return "electronics";
  if (t.includes("clothing") || t.includes("apparel") || t.includes("garment") || t.includes("fashion")) return "apparel";
  if (t.includes("agriculture") || t.includes("food") || t.includes("farm") || t.includes("produce")) return "agriculture";
  if (t.includes("supplier") && (t.includes("buyers") || t.includes("buyer"))) return "supplier_buyers";
  if (t.includes("payment") && (t.includes("method") || t.includes("mpesa") || t.includes("wave") || t.includes("visa"))) return "payment_methods";
  if (t.includes("i want to source electronics in bulk")) return "electronics";
  if (t.includes("looking for clothing") || t.includes("looking for clothing & apparel suppliers")) return "apparel";
  if (t.includes("need agriculture") || t.includes("need agriculture & food products")) return "agriculture";
  if (t.includes("i'm a supplier looking for buyers")) return "supplier_buyers";
  if (t.includes("what payment methods do you accept")) return "payment_methods";
  return null;
}

function extractContactFromText(userText) {
  const text = userText || "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = text.match(/(\+?\d[\d\s-]{7,}\d)/)?.[0] || null;
  return { email, phone, whatsapp: phone };
}

function extractCompanyFromText(userText) {
  const text = userText || "";
  const patterns = [
    /(?:from|at|working at|company|organization|firm)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\.|,|;|$)/i,
    /([A-Z][A-Za-z0-9\s&]+?(?:Inc|Ltd|LLC|Ltd\.|Corp|Co|Company))/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function extractNameFromText(text) {
  const patterns = [
    /\b(my name is|i am|i'm|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /\b(name's?|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[2]) return m[2].trim();
  }
  return null;
}

async function fetchRelevantProducts(userText, limit = 5) {
  try {
    const categoryMatch = detectCategory(userText);
    let whereClause = "is_active = true";
    const params = [];
    if (categoryMatch && categoryMatch !== "Other") {
      whereClause += ` AND category = $${params.length + 1}`;
      params.push(categoryMatch);
    }
    const query = `SELECT * FROM products WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(30);
    const products = await queryProducts(query, params);

    const keywords = extractKeywords(userText);
    if (keywords.length > 0) {
      const scored = products.map(p => {
        const searchable = `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
        const matches = keywords.filter(k => searchable.includes(k)).length;
        return { product: p, score: matches };
      })
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(i => i.product);
      if (scored.length > 0) return scored;
    }
    return products.slice(0, limit);
  } catch (e) {
    console.error("Product fetch error:", e);
    return [];
  }
}

function formatScrapedProductContext(products) {
  if (!products?.length) return '';

  return `\n\nREAL-TIME PRODUCT DATA (FROM sokogate.com):\n${products.map(p => {
    const name = p.name || 'N/A';
    const desc = p.description ? p.description.replace(/\s+/g, ' ').trim() : null;
    const price = p.price != null ? `${p.currency || 'USD'} ${Number(p.price).toFixed(2)}` : null;
    const stock = p.stock_quantity != null ? (p.stock_quantity > 0 ? `${p.stock_quantity} units (approx)` : 'Out of stock (approx)') : 'N/A';
    const sku = p.sku || p.sku === '' ? p.sku : 'N/A';
    const url = p.url || 'N/A';

    const parts = [
      `Product: ${name}`,
      desc ? `Description: ${desc}` : null,
      price ? `Price: ${price}` : 'Price: Contact / Not found',
      `Stock: ${stock}`,
      `SKU: ${sku}`,
      url ? `Source URL: ${url}` : null,
    ].filter(Boolean);

    return parts.join('\n');
  }).join('\n---\n')}\n\n`;
}

async function fetchScrapedProductDetails(userText, limit = 3) {
  const scraped = await searchProducts(userText, limit);
  if (!scraped?.length) return [];

  // If URLs exist, try to fetch details for the top matches
  const detailed = await Promise.all(
    scraped.slice(0, limit).map(async (p) => {
      if (p?.url) {
        const d = await fetchProductDetails(p.url);
        return d ? { ...p, ...d, url: p.url } : p;
      }
      return p;
    })
  );

  return detailed.filter(Boolean);
}


function extractKeywords(text) {
  const words = text.toLowerCase().split(/\s+/);
  const stop = new Set(["i","need","want","looking","for","the","a","an","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","may","might","can","must","shall","to","of","in","on","at","by","with","and","or","but","if","then","so","as","when","where","why","how","all","any","some","most","many","few","such","no","not","only","also","very","just","really","please","thanks","thank","you","your","my","our","their","his","her","its","am","im","i'm","from","we","us"]);
  return [...new Set(words.filter(w => w.length > 3 && !stop.has(w)))].slice(0, 5);
}

function formatProductContext(products) {
  if (!products?.length) return "";
  return `\n\nREAL-TIME PRODUCT DATA:\n${products.map(p => `Product: ${p.name}\nCategory: ${p.category || "N/A"}\nPrice: ${p.currency || "USD"} ${p.price?.toFixed(2) || "Contact"}\nStock: ${p.stock_quantity > 0 ? p.stock_quantity + " units" : "Out"}\nSKU: ${p.sku || "N/A"}`).join("\n---\n")}\n\n`;
}

function looksLikeLeadCaptured({ messages }) {
  const text = (messages || []).map(m => m?.content).filter(Boolean).join(" ").toLowerCase();
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const phone = /(\+?\d[\d\s-]{7,}\d)/.test(text);
  const nameHeuristic = /\b(my name is|i am|i'm|this is)\s+[a-z]{2,}(?:\s+[a-z]{2,})?/i.test(text) || /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(messages?.map(m => m?.content||'').join(''));
  return { hasContact: email || phone, hasName: !!nameHeuristic };
}

function buildLeadCaptureNextStep({ missingName, missingInquiry, missingCategory, missingCompany }) {
  const parts = [];
  if (missingName) parts.push("your full name");
  if (missingCompany) parts.push("your company name");
  if (missingInquiry) parts.push("the full product inquiry (items + quantity/MOQ + destination)");
  if (missingCategory) parts.push("the product category (e.g., Electronics, Apparel & Fabrics)");
  return `Thanks — I've got your contact. To complete your lead, please share ${parts.join(", ")}.\n\nReply in one message so we can connect you immediately.`;
}

function buildProgressIndicator(stage) {
  const stages = [
    { key: 'greeting', label: 'Greeting', icon: '👋' },
    { key: 'needs_assessment', label: 'Needs', icon: '🔍' },
    { key: 'contact_capture', label: 'Contact', icon: '📝' },
    { key: 'qualified', label: 'Done', icon: '✅' },
    { key: 'handoff_requested', label: 'Help', icon: '🎧' }
  ];
  const idx = stages.findIndex(s => s.key === stage);
  if (idx === -1) return null;
  return { stages, currentIndex: idx, progress: Math.round(((idx + 1) / stages.length) * 100) };
}

function generateWhatsAppLink(phoneNumber, message) {
  const clean = phoneNumber.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encoded}`;
}

function shouldNotifyHumanRep(score, category, message) {
  const highKeywords = ["container","large quantity","urgent","asap","immediate","purchase order","po","contract","1000","10000","million"];
  const highTouchCats = ["Machinery & Parts","Auto Parts","Home & Construction"];
  return score === "High" || highKeywords.some(k => message.toLowerCase().includes(k)) || highTouchCats.includes(category);
}

function buildScoreMessage(score, category, isHighValue) {
  const icons = { High: "🔥", Medium: "⚡", Low: "📋" };
  const desc = {
    High: "**High Intent** — You're ready! We'll connect you within 24 hours.",
    Medium: "Medium Intent — We'll follow up within 48 hours.",
    Low: "Low Intent — Browse our catalog, message when ready."
  };
  let msg = `\n---\n**Lead Score: ${icons[score]} ${score}**\n${desc[score]}\n**Category:** ${category}\n\n`;
  if (isHighValue) msg += `🚀 **Priority Support** — Our human team will prioritize your request.\n`;
  msg += `**Next Steps:**\n`;
  if (score === "High") msg += "1. Expect WhatsApp call within 24h\n2. Have PO/contract ready\n3. We'll send quotes via WhatsApp\n";
  else if (score === "Medium") msg += "1. We'll email catalog within 24h\n2. Schedule a WhatsApp call\n3. Request samples if needed\n";
  else msg += "1. Browse catalog\n2. Message us on WhatsApp when ready\n3. Ask me anything!\n";
  if (score !== "Low") msg += `\n💬 WhatsApp: ${generateWhatsAppLink("+254758947124", `Following up about ${category}`)}`;
  return msg;
}

async function logInteraction(visitorId, leadId, userMsg, aiResp) {
  try {
    await sql`INSERT INTO ai_interactions (visitor_id, lead_id, user_message, ai_response) VALUES (${visitorId}, ${leadId || null}, ${userMsg}, ${aiResp})`;
  } catch (e) { console.warn("Log failed:", e); }
}

async function createHandoffRecord(leadId, visitorId, reason, urgency) {
  try {
    const [res] = await sql`INSERT INTO handoff_requests (lead_id, visitor_id, reason, urgency, status) VALUES (${leadId}, ${visitorId}, ${reason}, ${urgency}, 'pending') RETURNING *`;
    if (leadId) await sql`UPDATE leads SET handoff_requested = TRUE, conversation_stage = 'handoff_requested', status = 'Qualified' WHERE id = ${leadId}`;
    return res[0];
  } catch (e) {
    console.error("Handoff create failed:", e);
    return null;
  }
}

// ============================================
// CACHING LAYER
// ============================================

async function getCachedKnowledgeBase() {
  // Try shared cache first
  const cached = getCachedKnowledge();
  if (cached) return cached;
  
  try {
    const result = await sql`SELECT question, answer, category, priority FROM knowledge_base WHERE is_active = TRUE ORDER BY priority DESC LIMIT 15`;
    setCachedKnowledge(result);
    return result;
  } catch (e) {
    console.warn("Knowledge base fetch failed:", e);
    return [];
  }
}

export async function POST(request) {
  try {
    // Request size validation
    const contentType = request.headers.get('content-type') || '';
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    
    // Enforce max body size (10MB)
    const MAX_BODY_SIZE = 10 * 1024 * 1024;
    if (contentLength > MAX_BODY_SIZE) {
      return Response.json(
        { error: 'Request too large', maxSize: '10MB' },
        { status: 413 }
      );
    }
    
    // Parse body with size limit (JSON parse can be memory intensive)
    const reader = request.body;
    if (!reader) {
      return Response.json({ error: 'Empty body' }, { status: 400 });
    }
    
    const { messages, visitorId: providedVisitorId } = await request.json();
    const safeMessages = Array.isArray(messages) ? messages : [];
    
    // Limit number of messages to prevent abuse
    if (safeMessages.length > 50) {
      return Response.json(
        { error: 'Too many messages in request', max: 50 },
        { status: 400 }
      );
    }
    
    // Limit total message content size
    const totalContentLength = safeMessages.reduce((sum, msg) => {
      return sum + (msg?.content?.length || 0);
    }, 0);
    if (totalContentLength > 100000) { // 100KB of raw text
      return Response.json(
        { error: 'Total message content too large' },
        { status: 400 }
      );
    }

    // Rate limiting: per visitorId (session) and per IP (network)
    const clientIP = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     request.headers.get('cf-connecting-ip') ||
                     'unknown';

    const sessionId = providedVisitorId || ('vis_' + Math.random().toString(36).substr(2,9) + Date.now().toString(36));

    // Use visitorId for session-based rate limiting, fallback to IP
    
    // Check rate limit: 30 requests per minute per session, 60 per minute per IP
    const sessionLimit = applyRateLimit(request, sessionId, {
      maxRequests: 30,
      windowMs: 60 * 1000,
      getIdentifier: () => sessionId,
    });
    
    if (sessionLimit) return sessionLimit;
    
    const ipLimit = applyRateLimit(request, `ip:${clientIP}`, {
      maxRequests: 60,
      windowMs: 60 * 1000,
      getIdentifier: () => `ip:${clientIP}`,
    });
    
    if (ipLimit) return ipLimit;

    // Visitor
    let visitorId = providedVisitorId || ('vis_' + Math.random().toString(36).substr(2,9) + Date.now().toString(36));
    const latestUserText = getLatestUserMessage(safeMessages);
    let visitor = { visitor_id: visitorId, conversation_stage: 'greeting', name: null, company: null, lead_id: null, visit_count: 0 };
    try {
      const existing = await sql`SELECT * FROM visitors WHERE visitor_id = ${visitorId} LIMIT 1`;
      if (existing.length > 0) {
        await sql`UPDATE visitors SET last_seen = NOW() WHERE visitor_id = ${visitorId}`;
        visitor = existing[0];
      } else {
        const name = extractNameFromText(latestUserText);
        const company = extractCompanyFromText(latestUserText);
        const [newV] = await sql`INSERT INTO visitors (visitor_id, name, company, conversation_stage, visit_count) VALUES (${visitorId}, ${name || null}, ${company || null}, 'greeting', 1) RETURNING *`;
        visitor = newV;
      }
    } catch (e) {
      console.warn("Visitor tracking unavailable:", e);
    }
    const currentStage = visitor.conversation_stage || 'greeting';

    // Settings
    const settingsResult = await sql`SELECT * FROM business_settings ORDER BY id DESC LIMIT 1`;
    const settings = settingsResult[0] || {
      business_name: "Sokogate",
      business_description: "Africa's premier B2B wholesale marketplace connecting African wholesalers to global buyers.",
      ai_goal: "Capture leads by answering sourcing questions and collecting contact info."
    };

     // Knowledge base (cached)
     let knowledgeResult = await getCachedKnowledgeBase();
     const knowledgeContext = knowledgeResult.length ? `\n\nCURRENT KNOWLEDGE BASE:\n${knowledgeResult.map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n---\n')}\n` : '';

    // FAQ short-circuit
    const faqKind = detectFAQKind(latestUserText);
    if (faqKind) {
      const content = buildDeterministicAnswer({ kind: faqKind });
      await logInteraction(visitorId, null, latestUserText, content);
      return Response.json({ content, leadCaptured: false, stage: currentStage, progress: buildProgressIndicator(currentStage) });
    }

     // Handoff request check
     if (latestUserText.toLowerCase().match(/talk to a human|speak to someone|human assistant|real person/)) {
       return Response.json({
         content: `I've connected you with a human agent! 🎉

One of our **${settings.business_name}** representatives will be with you shortly.

Or message us directly:
👉 https://wa.me/254758947124?text=${encodeURIComponent("Hello, I need assistance")}

Thank you!`,
         handoffRequested: true,
         leadCaptured: false,
         stage: 'handoff_requested'
       });
     }

      // System prompt
      const detectedCategory = detectCategory(latestUserText);
      
      // Define category-specific follow-up questions for dynamic branching
      const categoryFollowUpQuestions = {
        "Apparel & Fabrics": {
          buyer: ["What type of apparel are you looking for?", "What sizes and quantities do you need?", "Do you have any fabric preferences?", "What's your target price range?"],
          supplier: ["What types of garments do you manufacture?", "What's your production capacity and MOQ?", "Do you have export experience?", "Which regions do you ship to?"]
        },
        "Electronics": {
          buyer: ["What specific electronics do you need (phones, laptops, components)?", "What quantity are you looking for?", "What are the required specifications?", "Which destination country/city?"],
          supplier: ["What electronic products do you supply?", "What's your MOQ and wholesale pricing?", "Which regions can you ship to?", "Do you have any certifications?"]
        },
        "Agriculture & Food": {
          buyer: ["What specific agriculture or food products do you need?", "What quantity and MOQ are required?", "What quality specifications (grade, packaging) do you need?", "What's your destination and timeline?"],
          supplier: ["What agriculture/food products do you supply?", "What's your MOQ and pricing?", "What quality certifications do you have?", "Which regions do you serve?"]
        },
        "Auto Parts": {
          buyer: ["What type of vehicle and specific parts do you need?", "What quantity are you looking for?", "Do you need OEM or aftermarket parts?", "What's your destination?"],
          supplier: ["What auto parts do you manufacture/supply?", "What's your MOQ and pricing?", "Which vehicle models are compatible?", "Which regions do you ship to?"]
        },
        "Health & Beauty": {
          buyer: ["What type of health/beauty products do you need (cosmetics, supplements)?", "What quantity are you looking for?", "What regulatory requirements do you need (FDA, KEBS)?", "What's your destination?"],
          supplier: ["What health/beauty products do you manufacture?", "What's your MOQ and wholesale pricing?", "Which regulatory certifications do you have?", "Which regions do you serve?"]
        },
        "Machinery & Parts": {
          buyer: ["What type of machinery or equipment do you need?", "What quantity are you looking for?", "What are the power requirements and intended use?", "Are there any shipping constraints?"],
          supplier: ["What machinery/equipment do you supply?", "What's your MOQ and pricing?", "What are the power specifications?", "Which regions do you ship to?"]
        },
        "Home & Construction": {
          buyer: ["What type of home/construction materials do you need?", "What quantity are you looking for?", "What are the dimensions and specifications?", "What's your destination city/country?"],
          supplier: ["What home/construction materials do you supply?", "What's your MOQ and pricing?", "What are the standard dimensions?", "Which regions do you serve?"]
        },
        "Sports & Toys": {
          buyer: ["What type of sports or toys products do you need?", "What quantity are you looking for?", "Are there any safety certifications required?", "What's your target market?"],
          supplier: ["What sports/toys products do you supply?", "What's your MOQ and pricing?", "What safety certifications do you have?", "Which regions do you serve?"]
        }
      };
      
      // Determine if user is likely a buyer or supplier based on keywords
      const userIsSupplier = latestUserText?.toLowerCase().includes('supplier') || 
                           latestUserText?.toLowerCase().includes('manufacturer') ||
                           latestUserText?.toLowerCase().includes('wholesaler') ||
                           latestUserText?.toLowerCase().includes('distributor');
                           
      const categoryGuidance = {
        "Apparel & Fabrics": userIsSupplier ? 
          "For apparel suppliers: ask about manufacturing capacity, export experience, MOQ, and shipping regions." :
          "For apparel buyers: ask about garment type, sizes, fabric preferences, MOQ, and target price.",
        "Electronics": userIsSupplier ? 
          "For electronics suppliers: ask about product types, MOQ, wholesale pricing, shipping regions, and certifications." :
          "For electronics buyers: ask about specific items (phones, laptops), quantity, specs, destination, and budget.",
        "Agriculture & Food": userIsSupplier ? 
          "For agriculture/food suppliers: ask about product types, MOQ, pricing, quality certifications, and regions served." :
          "For agriculture/food buyers: ask about product names, quantity, quality specs, destination, and timeline.",
        "Auto Parts": userIsSupplier ? 
          "For auto parts suppliers: ask about part types, MOQ, pricing, vehicle compatibility, and shipping regions." :
          "For auto parts buyers: ask about vehicle type, specific parts needed, quantity, OEM/aftermarket preference, and destination.",
        "Health & Beauty": userIsSupplier ? 
          "For health/beauty suppliers: ask about product types, MOQ, wholesale pricing, regulatory certifications, and regions served." :
          "For health/beauty buyers: ask about product types (cosmetics, supplements), quantity, regulatory needs, and destination.",
        "Machinery & Parts": userIsSupplier ? 
          "For machinery suppliers: ask about equipment types, MOQ, pricing, power specs, and shipping regions." :
          "For machinery buyers: ask about equipment type, quantity, power requirements, intended use, and shipping constraints.",
        "Home & Construction": userIsSupplier ? 
          "For home/construction suppliers: ask about material types, MOQ, pricing, dimensions, and regions served." :
          "For home/construction buyers: ask about material type, quantity, dimensions, specifications, and destination.",
        "Sports & Toys": userIsSupplier ? 
          "For sports/toys suppliers: ask about product types, MOQ, pricing, safety certifications, and regions served." :
          "For sports/toys buyers: ask about product type, quantity, safety certifications needed, and target market."
      }[detectedCategory] || "Ask targeted questions to understand: exact product needs, quantity/MOQ, destination, timeline, and budget. Get specifics to match with suppliers.";
      
       // Add follow-up questions to system prompt if we have enough context
       let followUpGuidance = "";
       if (detectedCategory !== "Other" && (capturedName || latestUserText?.length > 20)) {
         const categoryKey = detectedCategory;
         if (categoryFollowUpQuestions[categoryKey]) {
           const questionSet = userIsSupplier ? 
             categoryFollowUpQuestions[categoryKey].supplier : 
             categoryFollowUpQuestions[categoryKey].buyer;
           followUpGuidance = `\n\nDYNAMIC FOLLOW-UP QUESTIONS:\nBased on the detected category (${detectedCategory}) and whether the user is a ${userIsSupplier ? 'supplier' : 'buyer'}, consider asking:\n${questionSet.map((q, i) => `${i+1}) ${q}`).join('\n')}`;
         }
       }

      const systemPrompt = `You are the Sokogate AI Sales Agent — Africa's #1 B2B Sourcing AI.

Business: ${settings.business_name} | ${settings.business_description}
Mission: ${settings.ai_goal}

${knowledgeContext}

PRODUCT DATA:
When asked about products, use REAL-TIME PRODUCT DATA (provided separately) for accurate pricing, stock, and specs. If no data, answer generally and ask for specifics to look up.

CATEGORIES: Apparel & Fabrics, Electronics, Agriculture & Food, Auto Parts, Health & Beauty, Machinery & Parts, Home & Construction, Sports & Toys.
DETECTED CATEGORY: ${detectedCategory === "Other" ? "Not yet determined" : detectedCategory}

PAYMENTS: M-Pesa, Wave, Airtel Money, MTN MoMo, Visa, and more.
SHIPPING: Air 7-15 days, Sea 45-75 days, full tracking.

VISITOR CONTEXT:
${visitor.name ? `Name: ${visitor.name}` : 'New visitor'}${visitor.company ? ` | Company: ${visitor.company}` : ''} | Visits: ${visitor.visit_count || 0}
CURRENT STAGE: ${currentStage.toUpperCase()}
Goal: Greeting → Needs → Contact → Qualified

INSTRUCTIONS:
1. ${visitor.name ? `Welcome ${visitor.name}` : 'Ask for name and company early.'}
2. Understand what they want to buy/sell (product, quantity, destination)
3. Capture WhatsApp number (PRIORITY) and email
4. Determine intent score:
    - High: Urgent, bulk orders (1000+ units), ready to buy now
    - Medium: Interested, requesting quotes/samples, specific needs
    - Low: Browsing, vague interest, no timeline
5. If user asks for "human" or "real person", respond with handoff message
6. When you have: name + contact (phone/WhatsApp/email) + product details → append LEAD_DATA

CATEGORY-SPECIFIC GUIDANCE:
${categoryGuidance}
${followUpGuidance}

WHATSAPP DEEP LINK EXAMPLE:
${generateWhatsAppLink("+254758947124", "Hello, I need assistance")}

HANDOFF:
If user says "talk to a human", respond with helpful handoff message.

LEAD CAPTURE (append to your message when ready):
|LEAD_DATA:{"name":"Full Name","company":"Company","email":"email","phone":"phone","whatsapp":"whatsapp","message":"Full inquiry summary","score":"High/Medium/Low","intent_summary":"2-sentence summary","category":"Detected category"}|

If score is High, also tell user: "Since this is high-priority, I'm notifying our human team to prioritize your request."
DO NOT mention LEAD_DATA or HANDOFF tokens to user. Ask only for missing info, never repeat already given.`;

     // Product context: fetch from sokogate.com product database first, fallback to web scrape
     let productContext = "";
     if (latestUserText?.length > 5) {
       try {
         // First, try the product database (sokogate.com DB via PRODUCTS_DATABASE_URL)
         let products = await fetchRelevantProducts(latestUserText);
         if (!products || products.length === 0) {
           // Fallback: scrape sokogate.com website if DB returns no results
           products = await fetchScrapedProductDetails(latestUserText, 5);
           if (products?.length) productContext = formatScrapedProductContext(products);
         } else {
           productContext = formatProductContext(products);
         }
       } catch (e) {
         console.warn("Product fetch error:", e);
       }
     }

    // Prepare full system prompt including product context
    let fullSystemPrompt = systemPrompt;
    if (productContext) {
      fullSystemPrompt += `\n\nPRODUCT CONTEXT:\n${productContext}\nUse for accurate info.`;
    }

    // Convert messages to Anthropic format (no system in array, pass separately)
    const anthropicMessages = safeMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

     // Anthropic Claude call with retry logic
     let aiContent;
     try {
       const apiKey = process.env.ANTHROPIC_API_KEY;
       if (!apiKey) {
         throw new Error("Anthropic API key not configured");
       }
       const anthropic = new Anthropic({ apiKey });

       const msg = await retryWithBackoff(() =>
         anthropic.messages.create({
           model: "claude-3-5-haiku-latest",
           max_tokens: 1024,
           system: fullSystemPrompt,
           messages: anthropicMessages,
           temperature: 0.7,
         }),
         3, // max retries
         1000 // initial delay
       );

       aiContent = msg.content[0].text;
     } catch (error) {
       console.error("Anthropic error:", error.message);
       return Response.json({ content: "I'm having connection trouble. Try again or WhatsApp us.", leadCaptured: false, stage: currentStage });
     }

    // Log
    await logInteraction(visitorId, visitor.lead_id, latestUserText, aiContent);

    // Handoff from AI response
    const handoffData = extractHandoffRequest(aiContent);
    if (handoffData) {
      await createHandoffRecord(visitor.lead_id, visitorId, handoffData.reason, handoffData.urgency || "normal");
      return Response.json({ content: aiContent.replace(/\|HANDOFF:.*?\|/s, "").trim(), handoffRequested: true, leadCaptured: false, stage: 'handoff_requested' });
    }

      // Lead capture
      const leadData = extractLeadData(aiContent);
      if (leadData) {
        try {
          // Guard: refuse to write leads when the DB connection is a mock
          assertDatabaseReady();

          const keywordScore = scoreLeadFromText(safeMessages.map(m => m.content).join(" ") + " " + (leadData.message || ""));
          let category = leadData.category || "Other";
          if (category === "Other") category = detectCategory(safeMessages.map(m => m.content).join(" ") + " " + (leadData.message || ""));

         const newStage = leadData.company ? 'qualified' : 'contact_capture';

         // Use transaction to ensure lead insert and visitor update are atomic
         const newLead = await sql.transaction(async (client) => {
           const insertRes = await client.query(
             `INSERT INTO leads (
                name, email, phone, whatsapp, message, score, intent_summary,
                keyword_score, category, source, visitor_id, company,
                conversation_stage, handoff_requested, status
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
              ) RETURNING *`,
             [
               leadData.name || null,
               leadData.email || null,
               leadData.phone || null,
               leadData.whatsapp || null,
               leadData.message || null,
               leadData.score || "Medium",
               leadData.intent_summary || null,
               keywordScore,
               category,
               'chat',
               visitorId,
               leadData.company || null,
               newStage,
               false,
               'Qualified'
             ]
           );
           const leadRow = insertRes.rows[0];
           await client.query(
             `UPDATE visitors SET lead_id = $1, conversation_stage = 'qualified' WHERE visitor_id = $2`,
             [leadRow.id, visitorId]
           );
           return leadRow;
         });

         const isHighValue = shouldNotifyHumanRep(leadData.score || "Medium", category, leadData.message || "");
         if (isHighValue) await createHandoffRecord(newLead.id, visitorId, "High-value lead", "high");

         serverEvents.emitLead(newLead);

          const clean = aiContent.replace(/\|LEAD_DATA:.*?\|/s, "").trim();
          const scoreMsg = buildScoreMessage(leadData.score, category, isHighValue);

            return Response.json({
              content: clean + "\n\n" + scoreMsg,
              leadCaptured: true,
              leadName: leadData.name,
              company: leadData.company || null,
              email: leadData.email || null,
              whatsapp: leadData.whatsapp,
              score: leadData.score,
              category,
              isHighValue,
              leadId: newLead.id,
              stage: 'qualified',
              progress: buildProgressIndicator('qualified')
            });
       } catch (e) {
         console.error("Lead save failed:", e.message);
         return Response.json({
           error: "Failed to save lead to database",
           leadCaptured: false,
           content: aiContent.replace(/\|LEAD_DATA:.*?\|/s, "").trim(),
           stage: currentStage,
           debugError: e.message
         }, { status: 500 });
       }
     }

     // Progressive capture
     const allText = safeMessages.map(m => m?.content).filter(Boolean).join(" ");
     const contactHeuristic = looksLikeLeadCaptured({ messages: safeMessages });
     const missingName = !contactHeuristic.hasName;
     const hasContact = contactHeuristic.hasContact;
     const missingInquiry = !(/electronics|clothing|apparel|agriculture|food|supplier|quantity|moq|shipping|destination/i.test(allText));
     const conversationCategory = detectCategory(allText);
     const missingCategory = !conversationCategory || conversationCategory === "Other";
     const missingCompany = !(visitor.company || extractCompanyFromText(allText));

    if (hasContact && (missingName || missingInquiry || missingCategory || missingCompany)) {
      try { await sql`UPDATE visitors SET conversation_stage = 'contact_capture' WHERE visitor_id = ${visitorId}`; } catch (e) {}
      return Response.json({
        content: buildLeadCaptureNextStep({ missingName, missingInquiry, missingCategory, missingCompany }),
        leadCaptured: false,
        stage: 'contact_capture',
        progress: buildProgressIndicator('contact_capture')
      });
    }

    // Stage advance
    if (currentStage === 'greeting' && latestUserText?.length > 10) {
      try { await sql`UPDATE visitors SET conversation_stage = 'needs_assessment' WHERE visitor_id = ${visitorId}`; } catch (e) {}
    }

    const clean = (aiContent || "").replace(/\|LEAD_DATA:.*?\|/s, "").trim();
    return Response.json({ content: clean, leadCaptured: false, stage: currentStage, progress: buildProgressIndicator(currentStage) });

  } catch (error) {
    console.error("Chat error:", error);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
