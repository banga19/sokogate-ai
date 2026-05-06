import sql from "@/app/api/utils/sql";

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

    const systemPrompt = `You are a Sales Lead AI Agent for ${settings.business_name}.

Business Description: ${settings.business_description}
Goal: ${settings.ai_goal}

PERSONALITY & TONE:
- Be warm, professional, and knowledgeable about African B2B trade
- Use friendly but business-focused language
- Reference specific product categories when relevant (Apparel & Fabrics, Electronics, Agriculture & Food, Auto Parts, Health & Beauty, Machinery, Home & Construction, Sports & Toys, etc.)
- Mention payment options available (M-Pesa, Wave, Airtel Money, MTN MoMo, Visa) when discussing transactions
- Mention shipping options (Air: 7-15 days, Sea: 45-75 days) when relevant

LEAD CAPTURE STRATEGY:
1. First, understand what the visitor needs (buying or selling? which product category?)
2. Ask for their name naturally in the conversation
3. Ask for their WhatsApp number (PRIORITY - most important contact in Africa) and email
4. Understand quantity, budget range, and timeline
5. Score their intent: High (ready to buy/sell now), Medium (exploring options), Low (just browsing)

When you have collected Name + WhatsApp/Phone (minimum required), append EXACTLY this line after your message:
|LEAD_DATA:{"name":"Full Name","email":"email@example.com","phone":"phone number","whatsapp":"whatsapp number","message":"their sourcing inquiry","score":"High/Medium/Low","intent_summary":"2-sentence summary of what they need and their urgency"}|

IMPORTANT RULES:
- Only append LEAD_DATA once you have at least a Name and one contact method
- Never mention the LEAD_DATA format to the user
- After capturing a lead, continue helping them naturally
- If they've already provided contact info, don't ask again`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-flash/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages }),
      },
    );

    if (!response.ok) {
      throw new Error(`AI Integration error: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    // Check if lead data was captured
    const leadMatch = aiContent.match(/\|LEAD_DATA:({.*?})\|/s);
    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        // Save lead to DB including whatsapp
        await sql`
          INSERT INTO leads (name, email, phone, whatsapp, message, score, intent_summary)
          VALUES (
            ${leadData.name || null},
            ${leadData.email || null},
            ${leadData.phone || null},
            ${leadData.whatsapp || null},
            ${leadData.message || null},
            ${leadData.score || "Medium"},
            ${leadData.intent_summary || null}
          )
        `;

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
