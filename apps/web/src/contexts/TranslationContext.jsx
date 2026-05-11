"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const TranslationContext = createContext(null);

// English translations
const en = {
  chat: {
    title: "Sokogate Assistant",
    online: "Online & Ready",
    poweredBy: "Powered by",
    placeholder: "Type your sourcing inquiry...",
    send: "Send",
    needHumanHelp: "Need human help?",
    talkToHuman: "Talk to a Human",
    greetingNew: (params) => `👋 Hello! I'm your AI sourcing assistant from **${params.businessName}**.

I help connect buyers and suppliers across Africa and beyond. Whether you're looking to source products in bulk or find buyers for your goods — I'm here to help!

To get started, could you tell me your name and what you're looking for?`,
    greetingReturning: (params) => `👋 Welcome back, **${params.name}**! I'm your AI sourcing assistant from **${params.businessName}**.

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
      success: (params) => `I've notified our human support team! They'll join this conversation shortly.\n\nOr message us directly on WhatsApp for faster assistance:\n👉 ${params.waLink}`,
      error: "I'm sorry, I couldn't connect you to a human right now. Please try again later or message us on WhatsApp."
    }
  },
  lead: {
    captured: (params) => `${params.name ? params.name + ", you're now in our system!" : "Your details have been saved!"}`,
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

Share your product + quantity + destination so we can confirm best payment path.`,
  },
  progress: {
    greeting: "Greeting",
    needs: "Needs",
    contact: "Contact",
    qualified: "Qualified",
    help: "Human Help",
  },
  feedback: {
    title: "How was your chat experience?",
    prompt: "Rate your chat experience",
    thumbsUp: "Helpful",
    thumbsDown: "Not helpful",
    thankYou: "Thanks for your feedback!",
    email: {
      invalidTitle: "Please provide a valid email address",
      suggestions: (params) => `Try: ${params.first}@gmail.com, ${params.first}.${params.last}@company.com, etc.`,
      hint: "Or type your email in the chat input below.",
      verified: (params) => `Email verified: ${params.email}`
    }
  }
};

// Swahili translations
const sw = {
  chat: {
    title: "Msaidizi wa Sokogate",
    online: "Mtandaoni & Tayari",
    poweredBy: "Inatoa nguvu na",
    placeholder: "Andika swali la kununua...",
    send: "Tuma",
    needHumanHelp: "Unahitaji msaada wa binadamu?",
    talkToHuman: "Bonga na Mtu",
    greetingNew: (params) => `👋 Halo! Mimi ni msaidizi wako wa AI wa Sokogate.

Ninawafanya watengenezee bidhaa na wewe kote Afrika na zaidi. Iwapo unatafuta kusource bidhaa kwa wingi au kupata wanuaji — niko hapa kusaidia!

Kuanza, unaweza kuniambia jina lako na unachotafuta?`,
    greetingReturning: (params) => `👋 Karibu tena, **${params.name}**! Mimi ni msaidizi wako wa AI wa Sokogate.

Nikuweze kukusaidiaje leo? Je, unatafuta kusource bidhaa au kupata wanuaji?`,
    quickOptions: "Chaguzi haraka",
    humanInstead: "Bonga na Mtu Badala Yake",
    askingForHuman: "🎧 Msaada wa binadamu umetakiwa - Tafadhali subiri...",
    connecting: "Inawasha...",
    humanAssistance: "Ungependa kuzungumza na mwakilishi wa binadamu? Watakusaidia maswali magumu.",
    yesConnect: "Ndiyo, nifanye",
    continueAI: "La, endelea na AI",
    chatUnavailable: "Samahani, kuna tatizo kwa sasa. Tafadhali jaribu tena baadaye!",
    handoff: {
      success: (params) => `Nimeripoti timu yetu ya msaada wa binadamu! Watakuwa na mazungumzo hivi karibuni.\n\nAu tunaweza kuwasiliana moja kwa moja kwa WhatsApp kwa msaada wa haraka:\n👉 ${params.waLink}`,
      error: "Samahani, sikuweza kukuunganisha na binadamu kwa sasa. Tafadhali jaribu tena baadaye au tupigie ujumbe kwenye WhatsApp."
    }
  },
  lead: {
    captured: (params) => `${params.name ? params.name + ", umeingizwa kwenye mfumo wetu!" : "Maelezo yako yamehifadhiwa!"}`,
    leadScore: "Alama ya Lead",
    category: "Kategoria",
    priority: "Uhitaji",
    talkToHuman: "Bonga na Mtu",
    highIntent: "Lead wa Hitaji la Juu",
    highDesc: "Tayari kununua/kauza sasa",
    mediumIntent: "Lead wa Hitaji cha Kati",
    mediumDesc: "Anapendezwa, anatafuta chaguzi",
    lowIntent: "Lead wa Hitaji wa Chini",
    lowDesc: "Anatafuta-tafuta/utafiti",
    highValue: "Msaada wa Kipaumbele",
    nextSteps: "Hatua Zifuatazo"
  },
  faq: {
    electronics: `👋 Asante! Ninaweza kusaidia hili kwa Sokogate.

Unatafuta **electronics kwa wingi**. Tafadhali toa:
1) Bidhaa hasa (simu, laptops, nk)
2) Idadi / MOQ
3) Nchi/mji wa marudio
4) Bajeti (hiari)

Baada ya kupata maelezo yako ya mawasiliano, tutafuata kwa haraka.`,
    apparel: `👋 Asante! Ninaweza kusaidia hili kwa Sokogate.

Unatafuta **wavuvi wa nguo na mavazi**. Tuma:
1) Aina ya nguo
2) Ukubwa / idadi (MOQ)
3) Marudio yako
4) Bei/bajeti unayoyotaka (hiari)

Kisha tutakuunganisha na wasambazaji waliothibitishwa.`,
    agriculture: `👋 Asante! Ninaweza kusaidia hili kwa Sokogate.

Unahitaji **bidhaa za kilimo na chakula**. Shiriki:
1) Jina la bidhaa
2) Idadi / MOQ
3) Sifa za ubora (aibu, ufumbaji)
4) Marudio + muda

Baada ya kukamata WhatsApp + jina, tutakukopesha chaguzi.`,
    supplier: `👋 Asante! Ninaweza kusaidia hili kwa Sokogate.

Wewe ni **msambazaji anayetafuta wanuaji**. Tafadhali tuambie:
1) Unauzwa nini (kategoria + SKUs)
2) MOQ bora / bei za jumla
3) Maeneo unayoweza kusafirisha
4) Maeneo unayoyotaka

Tutakuunganisha na watu wa kugawana B2B.`,
    payment: `👋 Asante! Ninaweza kusaidia hili kwa Sokogate.

Tunakubali:
- **M-Pesa**
- **Wave**
- **Airtel Money**
- **MTN MoMo**
- **Visa**
- Chaguzi nyingine za Kiafrika na kimataifa

 Shiriki bidhaa + idadi + marudio ili tubaini njia bora ya malipo.`,
  },
  progress: {
    greeting: "Salamu",
    needs: "Mahitaji",
    contact: "Mawasiliano",
    qualified: "Imekamilika",
    help: "Usaidizi"
  },
  feedback: {
    title: "Jinsi ungependa mazungumzo yetu?",
    prompt: "Rate your chat experience",
    thumbsUp: "Ilitusaidia",
    thumbsDown: "Haikusaidia",
    thankYou: "Asante kwa maoni yako!",
    email: {
      invalidTitle: "Tafadhali toa anwani ya barua pepe sahihi",
      suggestions: (params) => `Jaribu: ${params.first}@gmail.com, ${params.first}.${params.last}@kampuni.com, nk.`,
      hint: "Au andika anwani yako kwenye kisanduku cha mawasiliano hapa chini.",
      verified: (params) => `Barua pepe imethibitishwa: ${params.email}`
    }
  }
};

const translations = { en, sw };

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sokogate_language');
      if (stored) return stored;
      const browserLang = navigator.language?.split('-')[0];
      return browserLang === 'sw' ? 'sw' : 'en';
    }
    return 'en';
  });

  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    if (!value) return key;

    if (typeof value === 'function') {
      return value(params);
    }
    return value;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('sokogate_language', language);
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    if (lang === 'en' || lang === 'sw') {
      setLanguage(lang);
    }
  }, []);

  return (
    <TranslationContext.Provider value={{ language, t, changeLanguage, isSwahili: language === 'sw' }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
