import sql from "@/app/api/utils/sql";
import { scoreLeadFromText } from "@/utils/leadScoring";
import { serverEvents } from "@/server/pubsub";

const CATEGORIES = [
  "Apparel & Fabrics",
  "Electronics",
  "Agriculture & Food",
  "Auto Parts",
  "Health & Beauty",
  "Machinery & Parts",
  "Home & Construction",
  "Sports & Toys",
  "Other"
];

function detectCategory(text) {
  const lower = text.toLowerCase();
  const categoryKeywords = {
    "Apparel & Fabrics": ['clothing', 'apparel', 'fabric', 'textile', 'garment', 'fashion', 'shirt', 'dress', 'jeans', 'uniform'],
    "Electronics": ['electronics', 'electronic', 'gadget', 'phone', 'computer', 'laptop', 'tv', 'camera', 'component', 'circuit'],
    "Agriculture & Food": ['agriculture', 'food', 'farm', 'crop', 'grain', 'fruit', 'vegetable', 'meat', 'dairy', 'seafood'],
    "Auto Parts": ['auto', 'car', 'vehicle', 'part', 'tire', 'engine', 'brake', 'wheel', 'automotive'],
    "Health & Beauty": ['health', 'beauty', 'cosmetic', 'skincare', 'medicine', 'pharmaceutical', 'supplement', 'vital'],
    "Machinery & Parts": ['machinery', 'machine', 'equipment', 'tool', 'industrial', 'engine', 'motor', 'part', 'component'],
    "Home & Construction": ['home', 'construction', 'furniture', 'building', 'material', 'decoration', 'interior', 'fixture'],
    "Sports & Toys": ['sports', 'toy', 'game', 'equipment', 'fitness', 'outdoor', 'play', 'recreation']
  };
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

export async function POST(request) {
  try {
    const { messages } = await request.json();

    // 1. Get business context
    const settingsResult =
      await sql`SELECT * FROM business_settings ORDER BY id DESC LIMIT 1`;
    const settings = settingsResult[0] || {
      business_name: "Sokogate",
      business_description:
        "Africa's premier B2B wholesale marketplace connecting African wholesalers to global buyers.",
      ai_goal:
        "Capture leads by answering sourcing questions and collecting contact info.",
    };

     const systemPrompt = `You are the Sokogate AI Sales Agent — Africa's #1 B2B Sourcing AI.

Business: Sokogate AI by Ultimo Trading Ltd
Mission: Turn B2B inquiries into qualified leads 24/7 automatically

ABOUT SOKOGATE:
Sokogate is the AI-powered sales agent built for Sokogate wholesalers. We help you:
- Qualify buyers conversationally
- Capture WhatsApp contacts (Africa's #1 business communication)
- Score intent automatically
- Grow your Africa-to-world trade pipeline — hands-free

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

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let aiContent;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-flash/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatMessages }),
        },
      );

      if (!response.ok) {
        console.error('AI service error:', response.status, response.statusText);
        throw new Error(`AI Integration error: ${response.status}`);
      }

      const data = await response.json();
      aiContent = data.choices[0].message.content;
    } catch (error) {
      console.error('Chat fetch failed:', error.message);
      const fallbackContent = "I'm sorry, I'm having trouble connecting to our AI service right now. Please try again in a moment, or contact us directly at hello@sokogate.com.";
      return Response.json({ content: fallbackContent, leadCaptured: false });
    }

     // Check if lead data was captured
     const leadMatch = aiContent.match(/\|LEAD_DATA:({.*?})\|/s);
     if (leadMatch) {
       try {
         const leadData = JSON.parse(leadMatch[1]);

         // Compute keyword-based score for verification/backup
         const keywordScore = scoreLeadFromText(messages.map(m => m.content).join(' ') + ' ' + (leadData.message || ''));

         // Determine category: use AI-provided or fallback detection
         let category = leadData.category || "Other";
         if (category === "Other" || !category) {
           // Try to infer from the conversation
           const allText = messages.map(m => m.content).join(' ') + ' ' + (leadData.message || '');
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

    return Response.json({ content: aiContent, leadCaptured: false });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
