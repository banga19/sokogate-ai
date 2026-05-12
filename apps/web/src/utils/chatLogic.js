/**
 * Chat Business Logic
 * Pure functions for lead scoring, category detection, message formatting, etc.
 * Extracted from ChatWidget.jsx for testability and reuse
 */

// Quick replies displayed before user initiates conversation
export const QUICK_REPLIES = [
  "I want to source electronics in bulk",
  "Looking for clothing & apparel suppliers",
  "Need agriculture & food products",
  "I'm a supplier looking for buyers",
  "What payment methods do you accept?",
];

// Trigger configuration for proactive chat
export const TRIGGER_CONFIG = {
  timeOnPageMs: 30000,
  scrollDepthPercent: 50,
  dwellTimeMs: 15000,
};

// Categories for AI classification
export const CATEGORIES = [
  "Apparel & Fabrics", "Electronics", "Agriculture & Food", "Auto Parts",
  "Health & Beauty", "Machinery & Parts", "Home & Construction", "Sports & Toys", "Other"
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function extractNameFromText(text) {
  if (!text) return null;
  // Match "My name is John Doe" or "I'm John" or "This is John"
  const nameRegex = /\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z]+\s+[a-z][a-z]+)/i;
  const match = text.match(nameRegex);
  if (match) return match[1].trim();
  
  // Match "John Doe" (Two capitalized words)
  const capMatch = text.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/);
  if (capMatch) return capMatch[1];
  
  return null;
}

export function extractCompanyFromText(text) {
  if (!text) return null;
  // Look for company indicators
  const patterns = [
    /(?:from|at|working at|employed at)\s+([A-Za-z0-9\s&]+?)(?:\s+in|\s+with|$)/i,
    /company[\s:]+([A-Za-z0-9\s&]+)/i,
    /organization[\s:]+([A-Za-z0-9\s&]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

export function detectCategory(text) {
  if (!text) return "Other";
  
  const rawTokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const tokenSet = new Set(rawTokens);
  
  // Add singular forms
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

  let bestCategory = "Other";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(map)) {
    const score = keywords.reduce((sum, kw) => sum + (tokenSet.has(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestScore > 0 ? bestCategory : "Other";
}

export function scoreLeadFromText(text) {
  if (!text) return 'Medium';
  
  const lower = text.toLowerCase();
  const highKeywords = ['urgent', 'asap', 'immediate', '1000', '5000', 'million', 'purchase order', 'po', 'contract', 'large quantity', 'bulk order', 'container'];
  const lowKeywords = ['browsing', 'just looking', 'maybe later', 'research', 'ideas'];
  
  const highCount = highKeywords.filter(k => lower.includes(k)).length;
  const lowCount = lowKeywords.filter(k => lower.includes(k)).length;
  
  if (highCount >= 1) return 'High';
  if (lowCount >= 2) return 'Low';
  return 'Medium';
}

export function generateWhatsAppLink(phoneNumber, message) {
  const clean = phoneNumber.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encoded}`;
}

export function buildScoreMessage(score, category, isHighValue) {
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

// ============================================
// EMAIL VALIDATION & SUGGESTIONS
// ============================================

export function validateEmail(email) {
  if (!email) return { valid: false, reason: 'missing' };
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, reason: 'invalid_format' };
  }
  return { valid: true };
}

export function generateEmailSuggestions(name, partialEmail) {
  if (!name) return [];
  
  const names = name.toLowerCase().split(/\s+/).filter(Boolean);
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  
  const suggestions = [];
  
  // Generate name-based emails
  if (names.length >= 2) {
    const [first, last] = names;
    domains.forEach(domain => {
      suggestions.push({
        type: 'complete',
        text: `${first}.${last}@${domain}`,
      });
      suggestions.push({
        type: 'complete',
        text: `${first}${last}@${domain}`,
      });
      suggestions.push({
        type: 'complete',
        text: `${first[0]}${last}@${domain}`,
      });
    });
  }
  
  // If user already typed part of email, complete it
  if (partialEmail && partialEmail.includes('@')) {
    const [local, domain] = partialEmail.split('@');
    if (domain) {
      const matching = domains.filter(d => d.startsWith(domain) || domain.startsWith(d));
      matching.forEach(d => {
        suggestions.push({
          type: 'complete',
          text: `${local}@${d}`,
        });
      });
    }
  }
  
  // Deduplicate
  const seen = new Set();
  return suggestions.filter(s => {
    if (seen.has(s.text)) return false;
    seen.add(s.text);
    return true;
  });
}

// ============================================
// CONVERSATION STATE
// ============================================

export function buildProgressIndicator(stage) {
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

export function looksLikeLeadCaptured({ messages }) {
  const text = (messages || []).map(m => m?.content || '').join(' ').toLowerCase();
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const phone = /(\+?\d[\d\s-]{7,}\d)/.test(text);
  const nameHeuristic = /\b(my name is|i am|i'm|this is)\s+[a-z]{2,}(?:\s+[a-z]{2,})?/i.test(text) || 
                        /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(messages?.map(m => m?.content||'').join(''));
  return { hasContact: email || phone, hasName: !!nameHeuristic };
}

export function buildLeadCaptureNextStep({ missingName, missingInquiry, missingCategory, missingCompany }) {
  const parts = [];
  if (missingName) parts.push("your full name");
  if (missingCompany) parts.push("your company name");
  if (missingInquiry) parts.push("the full product inquiry (items + quantity/MOQ + destination)");
  if (missingCategory) parts.push("the product category (e.g., Electronics, Apparel & Fabrics)");
  return `Thanks — I've got your contact. To complete your lead, please share ${parts.join(", ")}.\n\nReply in one message so we can connect you immediately.`;
}

// ============================================
// CATEGORY-SPECIFIC GUIDANCE
// ============================================

export function detectUserRole(latestUserText) {
  if (!latestUserText) return 'buyer';
  const lower = latestUserText.toLowerCase();
  const isSupplier = lower.includes('supplier') || 
                     lower.includes('manufacturer') || 
                     lower.includes('wholesaler') || 
                     lower.includes('distributor');
  return isSupplier ? 'supplier' : 'buyer';
}

export function getCategoryGuidance(category, userIsSupplier) {
  const guidanceMap = {
    "Apparel & Fabrics": userIsSupplier ? 
      "For apparel suppliers: ask about manufacturing capacity, export experience, MOQ, and shipping regions." :
      "For apparel buyers: ask about garment type, sizes, quantities, fabric preferences, MOQ, and target price.",
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
  };
  
  return guidanceMap[category] || "Ask targeted questions to understand: exact product needs, quantity/MOQ, destination, timeline, and budget. Get specifics to match with suppliers.";
}

// ============================================
// HANDOFF DETECTION
// ============================================

export function shouldNotifyHumanRep(score, category, message) {
  const highKeywords = ["container","large quantity","urgent","asap","immediate","purchase order","po","contract","1000","10000","million"];
  const highTouchCats = ["Machinery & Parts","Auto Parts","Home & Construction"];
  return score === "High" || highKeywords.some(k => message.toLowerCase().includes(k)) || highTouchCats.includes(category);
}

export function detectHandoffRequest(text) {
  if (!text) return null;
  const handoffPatterns = /talk to a human|speak to someone|human assistant|real person|agent|representative/i;
  const match = text.match(handoffPatterns);
  if (match) {
    return {
      reason: "User requested human assistance",
      urgency: "medium"
    };
  }
  return null;
}
