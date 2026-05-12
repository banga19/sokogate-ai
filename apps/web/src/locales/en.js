/**
 * English translations for Sokogate AI
 */

export default {
  chat: {
    title: "Sokogate Assistant",
    online: "Online & Ready",
    poweredBy: "Powered by",
    placeholder: "Type your sourcing inquiry...",
    send: "Send",
    needHumanHelp: "Need human help?",
    talkToHuman: "Talk to a Human",
    openChat: "Open Chat",
    greetingNew: (businessName) => `👋 Hello! I'm your AI sourcing assistant from **${businessName}**.

I help connect buyers and suppliers across Africa and beyond. Whether you're looking to source products in bulk or find buyers for your goods — I'm here to help!

To get started, could you tell me your name and what you're looking for?`,
    greetingReturning: (businessName, name) => `👋 Welcome back, **${name}**! I'm your AI sourcing assistant from **${businessName}**.

How can I help you today? Are you looking to source products or find buyers?`,
    quickOptions: "Quick options",
    humanInstead: "Talk to a Human Instead",
    askingForHuman: "🎧 Human agent requested - Please wait...",
    connecting: "Connecting...",
    humanAssistance: "Would you like to speak with a human representative? They can assist with complex inquiries.",
    yesConnect: "Yes, connect me",
    continueAI: "No, continue with AI",
    chatUnavailable: "Sorry, I'm having a bit of trouble right now. Please try again in a moment!",
    handoff: {
      success: (waLink) => `I've notified our human support team! They'll join this conversation shortly.

Or message us directly on WhatsApp for faster assistance:
👉 ${waLink}`,
      error: "I'm sorry, I couldn't connect you to a human right now. Please try again later or message us on WhatsApp."
    }
  },
  lead: {
    captured: (name) => `${name ? name + ", you're now in our system!" : "Your details have been saved!"}`,
    leadScore: "Lead Score",
    category: "Category",
    priority: "Priority",
    talkToHuman: "Talk to Human",
    highIntent: "High Intent Lead",
    highDesc: "Ready to buy/sell now",
    mediumIntent: "Medium Intent Lead",
    mediumDesc: "Interested, evaluating options",
    lowIntent: "Low Intent Lead",
    lowDesc: "Just browsing/research",
    highValue: "Priority Support",
    nextSteps: "Next Steps"
  },
  faq: {
    electronics: `👋 Thanks! I can help with that through Sokogate.

You're looking for **electronics in bulk**. Please share:
1) Exact items (phones, laptops, etc)
2) Quantity / MOQ
3) Destination country/city
4) Budget (optional)

Once I have your contact details, we'll follow up quickly.`,
    apparel: `👋 Thanks! I can help with that through Sokogate.

You're looking for **clothing & apparel suppliers**. Please send:
1) Apparel type
2) Sizes / quantity (MOQ)
3) Your destination
4) Target price/budget (optional)

Then we'll connect you to verified wholesalers.`,
    agriculture: `👋 Thanks! I can help with that through Sokogate.

You need **agriculture & food products**. Share:
1) Product name(s)
2) Quantity / MOQ
3) Quality specs (grade, packaging)
4) Destination + timeline

After capturing WhatsApp + name, we'll source options for you.`,
    supplier: `👋 Thanks! I can help with that through Sokogate.

You're a **supplier looking for buyers**. Please tell us:
1) What you sell (category + SKUs)
2) Best MOQ / wholesale pricing
3) Shipping locations you can serve
4) Target buyer regions

We'll match you with interested B2B buyers.`,
    payment: `👋 Thanks! I can help with that through Sokogate.

We accept:
- **M-Pesa**
- **Wave**
- **Airtel Money**
- **MTN MoMo**
- **Visa**
- Other major African & international options

Share your product + quantity + destination so we can confirm best payment path.`
  },
  progress: {
    greeting: "Greeting",
    needs: "Needs",
    contact: "Contact",
    qualified: "Qualified",
    help: "Human Help"
  },
  feedback: {
    title: "How was your chat experience?",
    prompt: "Rate your chat experience",
    thumbsUp: "Helpful",
    thumbsDown: "Not helpful",
    thankYou: "Thanks for your feedback!",
    email: {
      invalidTitle: "Please provide a valid email address",
      suggestions: (first, last) => `Try: ${first}@gmail.com, ${first}.${last}@company.com, etc.`,
      hint: "Or type your email in the chat input below.",
      verified: (email) => `Email verified: ${email}`
    }
  }
};
