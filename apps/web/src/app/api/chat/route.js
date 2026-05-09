import sql from "@/app/api/utils/sql";
import { queryProducts } from "@/app/api/utils/productSql";
import { scoreLeadFromText } from "@/utils/leadScoring";
import { serverEvents } from "@/server/pubsub";
import OpenAI from "openai";

const CATEGORIES = [
  "Apparel & Fabrics",
  "Electronics",
  "Agriculture & Food",
  "Auto Parts",
  "Health & Beauty",
  "Machinery & Parts",
  "Home & Construction",
  "Sports & Toys",
  "Other",
];

function detectCategory(text) {
  const lower = text.toLowerCase();
  const categoryKeywords = {
    "Apparel & Fabrics": [
      "clothing",
      "apparel",
      "fabric",
      "textile",
      "garment",
      "fashion",
      "shirt",
      "dress",
      "jeans",
      "uniform",
    ],
    Electronics: [
      "electronics",
      "electronic",
      "gadget",
      "phone",
      "computer",
      "laptop",
      "tv",
      "camera",
      "component",
      "circuit",
    ],
    "Agriculture & Food": [
      "agriculture",
      "food",
      "farm",
      "crop",
      "grain",
      "fruit",
      "vegetable",
      "meat",
      "dairy",
      "seafood",
    ],
    "Auto Parts": [
      "auto",
      "car",
      "vehicle",
      "part",
      "tire",
      "engine",
      "brake",
      "wheel",
      "automotive",
    ],
    "Health & Beauty": [
      "health",
      "beauty",
      "cosmetic",
      "skincare",
      "medicine",
      "pharmaceutical",
      "supplement",
      "vital",
    ],
    "Machinery & Parts": [
      "machinery",
      "machine",
      "equipment",
      "tool",
      "industrial",
      "engine",
      "motor",
      "part",
      "component",
    ],
    "Home & Construction": [
      "home",
      "construction",
      "furniture",
      "building",
      "material",
      "decoration",
      "interior",
      "fixture",
    ],
    "Sports & Toys": ["sports", "toy", "game", "equipment", "fitness", "outdoor", "play", "recreation"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "Other";
}

function extractLeadData(aiContent) {
  // Extracts the first JSON object after |LEAD_DATA: ... |
  // Tolerant to whitespace/newlines.
  try {
    if (!aiContent || typeof aiContent !== "string") return null;
    const startToken = "|LEAD_DATA:";
    const startIdx = aiContent.indexOf(startToken);
    if (startIdx === -1) return null;

    const afterStart = aiContent.slice(startIdx + startToken.length);
    const endToken = "|";
    const endIdxRelative = afterStart.indexOf(endToken);
    if (endIdxRelative === -1) return null;

    const jsonStrCandidate = afterStart.slice(0, endIdxRelative).trim();

    // Some models may wrap JSON in extra characters; try a direct JSON.parse first.
    const parsed = JSON.parse(jsonStrCandidate);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
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
  if (kind === "electronics") {
    return (
      base +
      `You’re looking for **electronics in bulk**. To connect you with the right suppliers, please share:\n` +
      `1) The exact items (e.g., phones, laptops, cameras, components)\n` +
      `2) Quantity / MOQ\n` +
      `3) Your destination country/city\n` +
      `4) Budget range (optional)\n\n` +
      `Once I have your contact details, we’ll follow up with supplier quotes quickly.`
    );
  }

  if (kind === "apparel") {
    return (
      base +
      `You’re looking for **clothing & apparel suppliers**. Please send:\n` +
      `1) The apparel type (e.g., T-shirts, jeans, uniforms, fabrics)\n` +
      `2) Sizes / quantity (MOQ)\n` +
      `3) Your destination\n` +
      `4) Target price or budget (optional)\n\n` +
      `Then we’ll connect you to verified wholesalers and push quotes to your WhatsApp.`
    );
  }

  if (kind === "agriculture") {
    return (
      base +
      `You need **agriculture & food products**. Please share:\n` +
      `1) Product name(s) (fresh/frozen/packaged)\n` +
      `2) Quantity / MOQ\n` +
      `3) Any quality specs (grade, packaging)\n` +
      `4) Destination + preferred delivery timeline\n\n` +
      `After we capture your WhatsApp + name, we’ll help source the best options and pricing.`
    );
  }

  if (kind === "supplier_buyers") {
    return (
      base +
      `You’re a **supplier looking for buyers**. Tell us:\n` +
      `1) What you sell (product category + SKUs if available)\n` +
      `2) Your best MOQ / wholesale pricing\n` +
      `3) Shipping locations you can serve\n` +
      `4) Your target buyer regions\n\n` +
      `We’ll match you with interested B2B buyers and contact you through WhatsApp.`
    );
  }

  if (kind === "payment_methods") {
    return (
      base +
      `Here are our accepted **payment methods**:\n` +
      `- **M-Pesa**\n` +
      `- **Wave**\n` +
      `- **Airtel Money**\n` +
      `- **MTN MoMo**\n` +
      `- **Visa**\n` +
      `- Other major African & international payment options (where available)\n\n` +
      `If you share the product + quantity and your destination, we’ll confirm the best payment path for your order.`
    );
  }

  return base + `Tell me a bit more so I can match you to the right suppliers.`;
}

function detectFAQKind(userText) {
  const t = (userText || "").toLowerCase();

  if (t.includes("electronics") && (t.includes("bulk") || t.includes("wholesale"))) return "electronics";
  if (t.includes("clothing") || t.includes("apparel") || t.includes("garment") || t.includes("fashion")) return "apparel";
  if (t.includes("agriculture") || t.includes("food") || t.includes("farm") || t.includes("produce") || t.includes("grain")) return "agriculture";
  if (t.includes("supplier") && (t.includes("buyers") || t.includes("buyer"))) return "supplier_buyers";
  if (t.includes("payment") && (t.includes("method") || t.includes("methods") || t.includes("mpesa") || t.includes("wave") || t.includes("momo") || t.includes("visa")))
    return "payment_methods";

  // Quick-replies exact-ish fallback
  if (t.includes("i want to source electronics in bulk")) return "electronics";
  if (t.includes("looking for clothing") || t.includes("looking for clothing & apparel suppliers")) return "apparel";
  if (t.includes("need agriculture") || t.includes("need agriculture & food products")) return "agriculture";
  if (t.includes("i'm a supplier looking for buyers") || t.includes("im a supplier looking for buyers")) return "supplier_buyers";
  if (t.includes("what payment methods do you accept")) return "payment_methods";

  return null;
}

function extractContactFromText(userText) {
  const text = userText || "";
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(\+?\d[\d\s-]{7,}\d)/);

  const email = emailMatch ? emailMatch[0] : null;
  const phone = phoneMatch ? phoneMatch[0] : null;

  // Very light WhatsApp extraction: if phone exists we can treat it as whatsapp candidate.
  const whatsapp = phone ? phone : null;

  return { email, phone, whatsapp };
}

async function fetchRelevantProducts(userText, limit = 5) {
  try {
    const categoryMatch = detectCategory(userText);

    // Fetch a reasonable batch of recent active products, optionally filtered by category
    let whereClause = "is_active = true";
    const params = [];

    if (categoryMatch && categoryMatch !== "Other") {
      whereClause += ` AND category = $${params.length + 1}`;
      params.push(categoryMatch);
    }

    const query = `
      SELECT * FROM products
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;
    params.push(30); // fetch up to 30 candidates

    const products = await queryProducts(query, params);

    // Score products by keyword relevance
    const keywords = extractKeywords(userText);
    if (keywords.length > 0) {
      const scored = products.map(p => {
        const searchable = `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
        const matches = keywords.filter(k => searchable.includes(k)).length;
        return { product: p, score: matches };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);

      if (scored.length > 0) return scored;
    }

    // Fallback: return most recent products
    return products.slice(0, limit);
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

function extractKeywords(text) {
  // Extract meaningful product-related keywords (simple heuristic)
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(["i", "need", "want", "looking", "for", "the", "a", "an", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "must", "shall", "to", "of", "in", "on", "at", "by", "with", "and", "or", "but", "if", "then", "so", "as", "when", "where", "why", "how", "all", "any", "some", "most", "many", "few", "such", "no", "not", "only", "also", "very", "just", "really", "please", "thanks", "thank", "you", "your", "my", "our", "their", "his", "her", "its"]);
  const keywords = words.filter(w => w.length > 3 && !stopWords.has(w));
  // Deduplicate and limit
  return [...new Set(keywords)].slice(0, 5);
}

function formatProductContext(products) {
  if (!products || products.length === 0) return "";

  const lines = products.map(p => {
    const specs = p.specifications ? JSON.stringify(p.specifications) : "";
    return `Product: ${p.name}
Category: ${p.category || "N/A"}
Price: ${p.currency || "USD"} ${p.price ? p.price.toFixed(2) : "Contact for price"}
Stock: ${p.stock_quantity > 0 ? p.stock_quantity + " units available" : "Out of stock"}
SKU: ${p.sku || "N/A"}
${p.description ? `Description: ${p.description}` : ""}
`;
  });

  return `\n\nREAL-TIME PRODUCT DATA FROM SOKOGATE DATABASE:\n${lines.join("---\n")}\n\n`;
}

function looksLikeLeadCaptured({ messages }) {
  // If user already gave name + any contact method (phone/whatsapp/email) in the messages
  // we still rely on model for final LEAD_DATA, but this helps us reduce back-and-forth.
  const text = (messages || []).map((m) => m?.content).filter(Boolean).join(" ").toLowerCase();

  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const phone = /(\+?\d[\d\s-]{7,}\d)/.test(text);
  const hasContact = email || phone;

  // Name heuristic: user saying "I'm X" / "My name is X" / contains a typical greeting + two words
  const nameHeuristic =
    /\b(my name is|i am|i'm|this is)\s+[a-z]{2,}(?:\s+[a-z]{2,})?/i.test(text) || /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(messages?.map((m)=>m?.content||'').join(''));

  return { hasContact, hasName: !!nameHeuristic };
}

function buildLeadCaptureNextStep({ missingName, missingInquiry, missingCategory }) {
  const parts = [];
  if (missingName) parts.push("your full name");
  if (missingInquiry) parts.push("the full product inquiry (items + quantity/MOQ + destination)");
  if (missingCategory) parts.push("the product category (e.g., Electronics, Apparel & Fabrics, Agriculture & Food)");

  const joined = parts.join(", ");
  return (
    `Thanks — I’ve got your contact. To complete your lead, please share ${joined}.\n\n` +
    `Reply in one message so we can connect you with the right suppliers immediately.`
  );
}

export async function POST(request) {
  try {
    const { messages } = await request.json();
    const safeMessages = Array.isArray(messages) ? messages : [];

    // Deterministic intent routing for the most common quick options
    const latestUserText = getLatestUserMessage(safeMessages);
    const faqKind = detectFAQKind(latestUserText);

    if (faqKind) {
      const deterministicContent = buildDeterministicAnswer({ kind: faqKind });
      return Response.json({ content: deterministicContent, leadCaptured: false });
    }

    // 1. Get business context + product data (if relevant)
    const settingsResult =
      await sql`SELECT * FROM business_settings ORDER BY id DESC LIMIT 1`;
    const settings = settingsResult[0] || {
      business_name: "Sokogate",
      business_description:
        "Africa's premier B2B wholesale marketplace connecting African wholesalers to global buyers.",
      ai_goal:
        "Capture leads by answering sourcing questions and collecting contact info.",
    };

    // Fetch relevant products based on user inquiry
    let productContext = "";
    let relevantProducts = [];
    if (latestUserText && latestUserText.length > 5) {
      relevantProducts = await fetchRelevantProducts(latestUserText);
      if (relevantProducts.length > 0) {
        productContext = formatProductContext(relevantProducts);
      }
    }

    const systemPrompt = `You are the Sokogate AI Sales Agent — Africa's #1 B2B Sourcing AI.

Business: Sokogate AI by Ultimo Trading Ltd
Mission: Turn B2B inquiries into qualified leads 24/7 automatically

ABOUT SOKOGATE:
Sokogate is the AI-powered sales agent built for Sokogate wholesalers. We help you:
- Qualify buyers conversationally
- Capture WhatsApp contacts (Africa's #1 business communication)
- Score intent automatically
- Access real-time product inventory and pricing from our database
- Grow your Africa-to-world trade pipeline — hands-free

PRODUCT DATA ACCESS:
You have access to Sokogate's live product database. When users ask about specific products or categories, use the provided REAL-TIME PRODUCT DATA (if available) to give accurate, up-to-date information on:
- Product names and descriptions
- Current pricing (in the listed currency)
- Availability and stock levels
- SKU identifiers
- Product specifications

If real-time product data is provided, reference specific products by name and give exact details. If no product data is available, answer generally and encourage the user to specify what they need so you can look it up.

PRODUCT CATEGORIES:
Sokogate handles sourcing across all major categories:
- Apparel & Fabrics (clothing, textiles, uniforms)
- Electronics (gadgets, components, devices)
- Agriculture & Food (farm produce, seafood, packaged foods)
- Auto Parts (vehicles, components, tires)
- Health & Beauty (cosmetics, supplements, pharmaceuticals)
- Machinery & Parts (industrial equipment, tools)
- Home & Construction (furniture, building materials)
- Sports & Toys (equipment, games, outdoor gear)

PAYMENT METHODS:
We support M-Pesa, Wave, Airtel Money, MTN MoMo, Visa, and other major African & international payment options.

SHIPPING:
- Air freight: 7-15 days delivery
- Sea freight: 45-75 days delivery
- Full tracking available for all shipments

YOUR GOAL:
Act as a friendly but professional B2B sourcing assistant. Guide visitors through:
1. Understanding what they need to buy or sell
2. Identifying the correct product category
3. Collecting their name and WhatsApp number (PRIORITY)
4. Understanding quantity, budget, and timeline
5. Assigning an intent score (High/Medium/Low) based on readiness

CAPTURE RULE:
Once you have a name + at least one contact method (WhatsApp/phone/email), you MUST append this EXACT line to your message:
|LEAD_DATA:{"name":"Full Name","email":"email@example.com","phone":"phone number","whatsapp":"whatsapp number","message":"their full inquiry","score":"High/Medium/Low","intent_summary":"concise 2-sentence summary of need and urgency","category":"Detected product category"}|

DON'T:
- Mention LEAD_DATA to the user
- Ask for contact info again if already provided
- Break the conversational flow`;

    // Build chat messages with product context if available
    const contextMessage = productContext
      ? { role: "system", content: `IMPORTANT CONTEXT FOR THIS CONVERSATION:\n${productContext}\nUse the above product data to provide accurate pricing, availability, and specifications. If the user mentions products not in this data, say you'll check the database for them.` }
      : null;

    const chatMessages = contextMessage
      ? [ { role: "system", content: systemPrompt }, contextMessage, ...safeMessages ]
      : [ { role: "system", content: systemPrompt }, ...safeMessages ];

    let aiContent;
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      aiContent = completion.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API error:", error.message);
      const fallbackContent =
        "I'm sorry, I'm having trouble connecting to our AI service right now. Please try again in a moment, or contact us directly at hello@sokogate.com.";
      return Response.json({ content: fallbackContent, leadCaptured: false });
    }

    // Check if lead data was captured (robust extractor)
    const leadData = extractLeadData(aiContent);

    if (leadData) {
      try {
        // Compute keyword-based score for verification/backup
        const keywordScore = scoreLeadFromText(
          safeMessages.map((m) => m.content).join(" ") + " " + (leadData.message || ""),
        );

        // Determine category: use AI-provided or fallback detection
        let category = leadData.category || "Other";
        if (category === "Other" || !category) {
          // Try to infer from the conversation
          const allText =
            safeMessages.map((m) => m.content).join(" ") + " " + (leadData.message || "");
          category = detectCategory(allText);
        }

        // Save lead to DB including keyword score and category
        const newLead = await sql`
          INSERT INTO leads (
            name, email, phone, whatsapp, message, score, intent_summary,
            keyword_score, category, source
          )
          VALUES (
            ${leadData.name || null},
            ${leadData.email || null},
            ${leadData.phone || null},
            ${leadData.whatsapp || null},
            ${leadData.message || null},
            ${leadData.score || "Medium"},
            ${leadData.intent_summary || null},
            ${keywordScore},
            ${category},
            'chat'
          )
          RETURNING *
        `;

        // Broadcast new lead to connected clients
        serverEvents.emitLead(newLead[0]);

        const cleanContent = aiContent.replace(/\|LEAD_DATA:.*?\|/s, "").trim();
        return Response.json({
          content: cleanContent,
          leadCaptured: true,
          leadName: leadData.name,
          whatsapp: leadData.whatsapp,
        });
      } catch (parseError) {
        console.error("Error parsing lead data:", parseError);
      }
    }

    // Step 4: lead capture next step (reduce repetitive back-and-forth)
    // If the user already provided contact info but LEAD_DATA wasn't captured,
    // ask only for the missing pieces.
    const allText = safeMessages.map((m) => m?.content).filter(Boolean).join(" ");
    const contactHeuristic = looksLikeLeadCaptured({ messages: safeMessages });

    // Heuristics for missing pieces (simple + safe)
    const detectedCategory = detectCategory(allText);
    const missingCategory = !detectedCategory || detectedCategory === "Other";

    const hasProductSignals = /electronics|clothing|apparel|agriculture|food|farm|produce|supplier|buyers|quantity|moq|\bpcs\b|\bunits\b|shipping|destination/i.test(
      allText,
    );
    const missingInquiry = !hasProductSignals;

    const missingName = !contactHeuristic.hasName;

    if (contactHeuristic.hasContact && (missingName || missingInquiry || missingCategory)) {
      const leadCaptureContent = buildLeadCaptureNextStep({
        missingName,
        missingInquiry,
        missingCategory,
      });
      return Response.json({ content: leadCaptureContent, leadCaptured: false });
    }

    // Default: return AI content, but remove LEAD_DATA tag if it exists in any form.
    const clean = (aiContent || "").replace(/\|LEAD_DATA:.*?\|/s, "").trim();
    return Response.json({ content: clean || aiContent, leadCaptured: false });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
