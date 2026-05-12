/**
 * Swahili translations for Sokogate AI
 */

export default {
  chat: {
    title: "Msaidizi wa Sokogate",
    online: "Mtandaoni & Tayari",
    poweredBy: "Inatoa nguvu na",
    placeholder: "Andika swali la kununua...",
    send: "Tuma",
    needHumanHelp: "Unahitaji msaada wa binadamu?",
    talkToHuman: "Bonga na Mtu",
    openChat: "Fungua Mazungumzo",
    greetingNew: (businessName) => `👋 Halo! Mimi ni msaidizi wako wa AI wa Sokogate.

Ninawafanya watengenezee bidhaa na wewe kote Afrika na zaidi. Iwapo unatafuta kusource bidhaa kwa wingi au kupata wanuaji — niko hapa kusaidia!

Kuanza, unaweza kuniambia jina lako na unachotafuta?`,
    greetingReturning: (businessName, name) => `👋 Karibu tena, **${name}**! Mimi ni msaidizi wako wa AI wa Sokogate.

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
      success: (waLink) => `Nimeripoti timu yetu ya msaada wa binadamu! Watakuwa na mazungumzo hivi karibuni.

Au tunaweza kuwasiliana moja kwa moja kwa WhatsApp kwa msaada wa haraka:
👉 ${waLink}`,
      error: "Samahani, sikuweza kukuunganisha na binadamu kwa sasa. Tafadhali jaribu tena baadaye au tupigie ujumbe kwenye WhatsApp."
    }
  },
  lead: {
    captured: (name) => `${name ? name + ", umeingizwa kwenye mfumo wetu!" : "Maelezo yako yamehifadhiwa!"}`,
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

Shiriki bidhaa + idadi + marudio ili tubaini njia bora ya malipo.`
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
      suggestions: (first, last) => `Jaribu: ${first}@gmail.com, ${first}.${last}@kampuni.com, nk.`,
      hint: "Au andika anwani yako kwenye kisanduku cha mawasiliano hapa chini.",
      verified: (email) => `Barua pepe imethibitishwa: ${email}`
    }
  }
};
