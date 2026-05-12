"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  User,
  Bot,
  Loader2,
  CheckCircle2,
  Phone,
  Headphones,
  Award,
  Languages,
  LogOut,
} from "lucide-react";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { useUser } from "@/contexts/AuthContext";
import useAuth from "@/utils/useAuth";
import { Link } from "react-router";
import { useTranslation } from "@/contexts/TranslationContext";
import { getUserIdentity, saveUserIdentity, extractIdentityFromText } from "@/utils/personalization";
import { hasDataConsent, setDataConsent, getPrivacyNotice } from "@/utils/leadCapture";
import { analytics, initSessionAnalytics } from "@/utils/analytics";

const QUICK_REPLIES = [
  "I want to source electronics in bulk",
  "Looking for clothing & apparel suppliers",
  "Need agriculture & food products",
  "I'm a supplier looking for buyers",
  "What payment methods do you accept?",
];

// Proactive chat trigger configuration
const TRIGGER_CONFIG = {
  timeOnPageMs: 30000, // 30 seconds
  scrollDepthPercent: 50, // 50% scroll depth
  dwellTimeMs: 15000, // 15 seconds of inactivity (cursor still)
};

// Dwell time tracking
let dwellTimeCheckInterval = null;
let lastMouseMoveTime = Date.now();
let isCurrentlyDwelling = false;

// Session-based trigger tracking to avoid spamming users
function hasTriggerBeenShown(triggerType) {
  if (typeof window === 'undefined') return true;
  const key = `sokogate_trigger_shown_${triggerType}`;
  return sessionStorage.getItem(key) === 'true';
}

function markTriggerShown(triggerType) {
  if (typeof window === 'undefined') return;
  const key = `sokogate_trigger_shown_${triggerType}`;
  sessionStorage.setItem(key, 'true');
}

// Check if triggers are globally disabled (user dismissed)
function areTriggersGloballyDisabled() {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem('sokogate_triggers_disabled') === 'true';
}

function disableTriggersForSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('sokogate_triggers_disabled', 'true');
}

// Progress indicator component
function ChatProgress({ stage, progress, t }) {
  if (!stage || !progress) return null;

  const stages = [
    { key: 'greeting', label: t('progress.greeting'), icon: '👋' },
    { key: 'needs_assessment', label: t('progress.needs'), icon: '🔍' },
    { key: 'contact_capture', label: t('progress.contact'), icon: '📝' },
    { key: 'qualified', label: t('progress.qualified'), icon: '✅' },
    { key: 'handoff_requested', label: t('progress.help'), icon: '🎧' },
  ];

  const currentIndex = progress.currentIndex;

  return (
    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Conversation Progress
        </span>
        <span className="text-[10px] font-bold" style={{ color: progress.progress >= 100 ? '#10b981' : '#1E3A8A' }}>
          {progress.progress}%
        </span>
      </div>
      <div className="flex items-center gap-1">
        {stages.map((s, idx) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  idx <= currentIndex
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-[8px] mt-1 text-center ${
                  idx <= currentIndex ? "text-slate-700 font-bold" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`flex-1 h-1 rounded ${
                  idx < currentIndex ? "bg-green-500" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Lead score display component
function LeadScoreDisplay({ score, category, isHighValue, onHumanHelp, t }) {
  const scoreConfig = {
    High: {
      bg: "bg-red-50 border-red-200",
      icon: "🔥",
      title: t('lead.highIntent'),
      desc: t('lead.highDesc'),
      color: "text-red-700",
    },
    Medium: {
      bg: "bg-amber-50 border-amber-200",
      icon: "⚡",
      title: t('lead.mediumIntent'),
      desc: t('lead.mediumDesc'),
      color: "text-amber-700",
    },
    Low: {
      bg: "bg-blue-50 border-blue-200",
      icon: "📋",
      title: t('lead.lowIntent'),
      desc: t('lead.lowDesc'),
      color: "text-blue-700",
    },
  };

  const config = scoreConfig[score] || scoreConfig.Low;

  return (
    <div className={`px-4 py-3 border-t ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl ${config.color}`}>{config.icon}</div>
        <div className="flex-1">
          <h4 className={`text-xs font-black ${config.color} mb-1`}>
            {config.title}
          </h4>
          <p className="text-[10px] text-slate-600 mb-2">{config.desc}</p>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">
              {t('lead.category')}: <span className="font-bold text-slate-700">{category}</span>
            </span>
            {isHighValue && (
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Award size={10} /> {t('lead.priority')}
              </span>
            )}
          </div>
          {onHumanHelp && (
            <button
              onClick={onHumanHelp}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Headphones size={12} />
              {t('lead.talkToHuman')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatWidget({ settings = {} }) {
  const { isOpen, openChat, closeChat, toggleChat } = useChatWidget();
  const { t, language, changeLanguage } = useTranslation();

  // Visitor ID generation/retrieval
  const getVisitorId = () => {
    if (typeof window !== "undefined") {
      let vid = localStorage.getItem("sokogate_visitor_id");
      if (!vid) {
        vid = "vis_" + Math.random().toString(36).substr(2,9) + Date.now().toString(36);
        localStorage.setItem("sokogate_visitor_id", vid);
      }
      return vid;
    }
    return "vis_ssr";
  };

   const [visitorId] = useState(getVisitorId());

   // Initialize analytics session
   useEffect(() => {
     if (visitorId && visitorId !== 'vis_ssr') {
       initSessionAnalytics(visitorId);
     }
   }, [visitorId]);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [input, setInput] = useState("");
   const [isLoading, setIsLoading] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [capturedWhatsapp, setCapturedWhatsapp] = useState(null);
    const [capturedName, setCapturedName] = useState(null);
    const [capturedCompany, setCapturedCompany] = useState(null);
    const [capturedEmail, setCapturedEmail] = useState(null);
    const [emailValid, setEmailValid] = useState(true);
    const [emailSuggestions, setEmailSuggestions] = useState([]);
    const [leadScore, setLeadScore] = useState(null);
    const [leadCategory, setLeadCategory] = useState(null);
    const [isHighValue, setIsHighValue] = useState(false);
    const [conversationStage, setConversationStage] = useState("greeting");
    const [progress, setProgress] = useState(null);
    const [showNotification, setShowNotification] = useState(true);
    const [showHumanHelp, setShowHumanHelp] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState(false);
    const [hasConsent, setHasConsent] = useState(() => hasDataConsent());
    const [showConsentPrompt, setShowConsentPrompt] = useState(false);
    const [pendingLeadData, setPendingLeadData] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Email validation and enrichment
  const generateEmailSuggestions = (name, email) => {
    if (!name) return [];
    const suggestions = [];
    const cleanName = name.toLowerCase().trim();
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts[1] || '';

    // Common personal email domains
    const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

    // Build patterns
    const patterns = [];
    if (lastName) {
      patterns.push(`${firstName}.${lastName}`);
      patterns.push(`${firstName}${lastName}`);
      patterns.push(`${firstName[0]}${lastName}`);
      patterns.push(`${firstName}${lastName[0]}`);
      patterns.push(`${firstName}-${lastName}`);
    }
    patterns.push(firstName);
    patterns.push(`${firstName}.${lastName || 'mail'}`);

    // Generate up to 3 candidate emails with common domains
    const candidates = [];
    patterns.forEach(pattern => {
      if (candidates.length >= 3) return;
      const domain = personalDomains[Math.floor(Math.random() * personalDomains.length)];
      candidates.push(`${pattern}@${domain}`);
    });

    // If email was partially provided (missing domain), complete it
    if (email && email.includes('@')) {
      const [localPart] = email.split('@');
      if (localPart) {
        candidates.unshift(`${localPart}@gmail.com`, `${localPart}@company.com`);
      }
    }

    suggestions.push(...candidates.slice(0, 3).map(email => ({
      type: 'complete',
      text: email,
    })));

    // Add a generic hint
    suggestions.push({
      type: 'hint',
      text: `Common: ${firstName}@gmail.com, ${firstName}.${lastName}@company.com`,
    });

    return suggestions.slice(0, 4);
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') return { valid: false, reason: 'missing' };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return { valid: false, reason: 'invalid_format' };
    }
    return { valid: true };
  };

  // Auth
  const { data: session, status: authStatus } = useUser();
  const { signOut } = useAuth();

  const primaryColor = settings.primary_color || "#1E3A8A";
  const secondaryColor = settings.secondary_color || "#EF4444";
  const businessName = settings.business_name || "Sokogate";

  // Format message helper
  const formatMessage = (content) => {
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");

    // Convert WhatsApp links
    formatted = formatted.replace(
      /https?:\/\/wa\.me\/\d+\?text=([^\s)]+)/g,
      (match, encodedText) => {
        const decoded = decodeURIComponent(encodedText);
        return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="underline text-green-600 hover:text-green-700">📱 WhatsApp: ${decoded}</a>`;
      }
    );

    // Convert plain WhatsApp numbers to links
    formatted = formatted.replace(
      /(?: WhatsApp:\s*)?(\+?\d[\d\s-]{7,}\d)/g,
      (match, phone) => {
        const clean = phone.replace(/\D/g, "");
        return `<a href="https://wa.me/${clean}" target="_blank" rel="noopener noreferrer" class="underline text-green-600 hover:text-green-700">💬 ${phone}</a>`;
      }
    );

    return formatted;
  };

  // Fetch visitor data on mount
  useEffect(() => {
    const fetchVisitor = async () => {
      if (visitorId && visitorId !== "vis_anonymous") {
        try {
          const res = await fetch(`/api/visitor?id=${visitorId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.visitor) {
              if (data.visitor.name) setCapturedName(data.visitor.name);
            }
          }
        } catch (e) {
          console.warn("Could not fetch visitor data:", e);
        }
      }
    };
    fetchVisitor();
  }, [visitorId]);

  useEffect(() => {
    const initial = [];
    setMessages(initial);
    messagesRef.current = initial;
  }, [businessName, visitorId]);

   // Initialize with personalized greeting
    useEffect(() => {
      const initializeChat = async () => {
        // Try to get user identity from storage/cookies
        const userIdentity = getUserIdentity();
        if (userIdentity.name) {
          setCapturedName(userIdentity.name);
        }
        if (userIdentity.company) {
          // Update visitor with company info if not already set
          if (!capturedCompany) setCapturedCompany(userIdentity.company);
        }

        console.log('[DEBUG] businessName:', businessName, 'type:', typeof businessName);
        console.log('[DEBUG] capturedName:', capturedName);
        const greeting = capturedName
          ? t('chat.greetingReturning', { businessName, name: capturedName })
          : t('chat.greetingNew', { businessName });
        console.log('[DEBUG] greeting:', greeting);
        setMessages([{ role: "assistant", content: greeting }]);
      };

      initializeChat();
    }, [businessName, capturedName, visitorId, t]);

   // Proactive triggers
   useEffect(() => {
     if (isOpen || hasTriggerBeenShown('time') || areTriggersGloballyDisabled()) return;
     const timer = setTimeout(() => {
       // Show notification instead of opening chat directly
       setShowNotification(true);
       markTriggerShown('time');
     }, TRIGGER_CONFIG.timeOnPageMs);
     return () => clearTimeout(timer);
   }, [isOpen]);

   // Dwell time detection (inactivity)
   useEffect(() => {
     if (isOpen || hasTriggerBeenShown('dwell') || typeof window === 'undefined' || areTriggersGloballyDisabled()) return;

     const resetDwellTimer = () => {
       lastMouseMoveTime = Date.now();
       isCurrentlyDwelling = false;
       if (dwellTimeCheckInterval) clearInterval(dwellTimeCheckInterval);
       dwellTimeCheckInterval = setInterval(() => {
         const inactiveMs = Date.now() - lastMouseMoveTime;
         if (inactiveMs >= TRIGGER_CONFIG.dwellTimeMs && !isCurrentlyDwelling) {
           isCurrentlyDwelling = true;
           setShowNotification(true);
           markTriggerShown('dwell');
           if (dwellTimeCheckInterval) clearInterval(dwellTimeCheckInterval);
         }
       }, 1000);
     };

     window.addEventListener('mousemove', resetDwellTimer);
     window.addEventListener('keydown', resetDwellTimer);
     window.addEventListener('scroll', resetDwellTimer);
     // Start timer
     resetDwellTimer();

     return () => {
       window.removeEventListener('mousemove', resetDwellTimer);
       window.removeEventListener('keydown', resetDwellTimer);
       window.removeEventListener('scroll', resetDwellTimer);
       if (dwellTimeCheckInterval) clearInterval(dwellTimeCheckInterval);
     };
   }, [isOpen]);

   useEffect(() => {
      if (isOpen || hasTriggerBeenShown('exit') || typeof window === 'undefined' || areTriggersGloballyDisabled()) return;
      const handleMouseLeave = (e) => {
        if (e.clientY <= 0) {
          // Show notification instead of opening directly
          setShowNotification(true);
          markTriggerShown('exit');
        }
      };
      window.addEventListener('mouseleave', handleMouseLeave);
      return () => window.removeEventListener('mouseleave', handleMouseLeave);
    }, [isOpen]);

    useEffect(() => {
      if (isOpen || hasTriggerBeenShown('scroll') || typeof window === 'undefined' || areTriggersGloballyDisabled()) return;
      const handleScroll = () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent >= TRIGGER_CONFIG.scrollDepthPercent) {
          // Show notification instead of opening directly
          setShowNotification(true);
          markTriggerShown('scroll');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }, [isOpen]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShowNotification(false);
    }
  }, [isOpen]);

   const handleSend = async (text) => {
     const msgText = text || input;
     if (!msgText.trim() || isLoading) return;

     const userMessage = { role: "user", content: msgText };

     setMessages((prev) => [...prev, userMessage]);
     setInput("");
     setIsLoading(true);

     // Track user message
     analytics.messageSent(visitorId, 'user', msgText.trim().length);

     try {
      const payloadMessages = [...messagesRef.current, userMessage];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, visitorId }),
      });

      if (!response.ok) throw new Error("Chat failed");
      const data = await response.json();

       setMessages((prev) => [
         ...prev,
         { role: "assistant", content: data.content },
       ]);

       // Track assistant message
       analytics.messageSent(visitorId, 'assistant', data.content.length);

       if (data?.leadCaptured) {
         // Store lead data temporarily and request consent
         setPendingLeadData(data);
         
         // Pre-fill company if available
         if (data.company) {
           setCapturedCompany(data.company);
         }

         if (hasConsent) {
           // Already have consent, proceed with lead capture
           finalizeLeadCapture(data);
         } else {
           // Need to request consent first
           setShowConsentPrompt(true);
         }
       } else if (leadCaptured && !emailValid) {
        // Check if user typed an email in their message (manual fix after initial capture)
        const userMsg = messages.length > 0 ? messages[messages.length - 1]?.content : '';
        const emailMatch = userMsg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
        if (emailMatch) {
          const foundEmail = emailMatch[0];
          const emailCheck = validateEmail(foundEmail);
          if (emailCheck.valid) {
            setCapturedEmail(foundEmail);
            setEmailValid(true);
            setEmailSuggestions([]);
            // Attempt backend update
            try {
              await fetch("/api/leads/update-email", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitorId, email: foundEmail }),
              });
            } catch (e) { /* swallow */ }
          }
        }
      } else if (data?.handoffRequested) {
        setShowHumanHelp(false);
        setConversationStage('handoff_requested');
       } else if (data?.stage) {
         const prevStage = conversationStage;
         setConversationStage(data.stage);
         setProgress(data.progress || null);
         // Track stage advancement
         if (prevStage !== data.stage) {
           analytics.stageAdvanced(visitorId, prevStage, data.stage);
         }
       }
     } catch (error) {
       console.error(error);
       analytics.errorOccurred(visitorId, error, { context: 'chat_api' });
       setMessages((prev) => [
         ...prev,
         {
           role: "assistant",
           content: t('chat.chatUnavailable'),
         },
       ]);
     } finally {
       setIsLoading(false);
     }
  };

  const handleHumanHelp = async () => {
    setIsLoading(true);
    try {
      analytics.humanHandoffRequested(visitorId, 'user_requested', 'normal');
      const response = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: visitorId,
          reason: "User requested human assistance via chat widget",
          urgency: "normal"
        }),
      });

      const waLink = `https://wa.me/254758947124?text=${encodeURIComponent("Hello, I need assistance with my inquiry")}`;
      console.log('[DEBUG] waLink:', waLink);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t('chat.handoff.success', { waLink }),
        },
      ]);
      setShowHumanHelp(false);
    } catch (error) {
      console.error("Handoff error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t('chat.handoff.error'),
        },
      ]);
      setShowHumanHelp(false);
    } finally {
      setIsLoading(false);
    }
  };

    const handleFeedback = async (rating) => {
      setFeedbackGiven(true);
      setShowFeedback(false);
      analytics.feedbackSubmitted(visitorId, rating, null);
      try {
        await fetch("/api/feedback", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           visitorId,
           leadId: leadCaptured ? leadScore : null,
           rating,
         }),
       });
     } catch (error) {
       console.error("Feedback error:", error);
     }
   };

    const handleEmailSuggestion = async (suggestedEmail) => {
      // Update the lead record directly
      try {
        const res = await fetch("/api/leads/update-email", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            email: suggestedEmail,
          }),
        });

        if (res.ok) {
          setCapturedEmail(suggestedEmail);
          setEmailValid(true);
          setEmailSuggestions([]);
          
          // Track email verification
          const domain = suggestedEmail.split('@')[1];
          analytics.emailVerified(visitorId, domain);

          // Add confirmation message to chat
          setMessages((prev) => [
            ...prev,
            {
              role: "user",
              content: `My email is: ${suggestedEmail}`,
            },
          ]);
        }
      } catch (error) {
        console.error("Email update error:", error);
        analytics.errorOccurred(visitorId, error, { context: 'email_suggestion' });
      }
    };

    const handleConsent = async (consentGiven) => {
      if (consentGiven) {
        setDataConsent(true);
        setHasConsent(true);
        analytics.consentGiven(visitorId, 'privacy');
        if (pendingLeadData) {
          await finalizeLeadCapture(pendingLeadData);
        }
      } else {
        setDataConsent(false);
        setShowConsentPrompt(false);
        setPendingLeadData(null);
        analytics.consentDeclined(visitorId, 'user_declined');
        // Add a message to chat about consent decline
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "No problem! I'll continue helping you without storing your personal data. Feel free to continue our conversation.",
          },
        ]);
      }
      setShowConsentPrompt(false);
    };

    const finalizeLeadCapture = (data) => {
      setLeadCaptured(true);
      setCapturedWhatsapp(data.whatsapp);
      setCapturedName(data.leadName);
      setCapturedCompany(data.company || null);
      setCapturedEmail(data.email || null);
      const emailCheck = validateEmail(data.email);
      setEmailValid(emailCheck.valid);
      if (!emailCheck.valid && data.leadName) {
        setEmailSuggestions(generateEmailSuggestions(data.leadName, data.email));
      } else {
        setEmailSuggestions([]);
      }
      setLeadScore(data.score);
      setLeadCategory(data.category || "General");
      setIsHighValue(data.isHighValue || false);
      setConversationStage(data.stage || 'qualified');
      setProgress(data.progress || null);
      setShowConsentPrompt(false);
      setPendingLeadData(null);
      
      // Track lead capture with analytics
      if (data.leadId) {
        analytics.leadCaptured(visitorId, data.leadId, data.score, data.category || 'General');
      }
    };

  const showQuickReplies = messages.length <= 1 && !isLoading && !leadCaptured;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ width: "400px", height: "620px" }}
        >
          {/* Header */}
          <div
            className="p-4 text-white flex justify-between items-center shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">{t('chat.title')}</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 bg-green-400 rounded-full"
                    style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                  <p className="text-[10px] text-blue-100 font-medium uppercase tracking-wider">
                    {t('chat.online')}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <button
                onClick={() => changeLanguage(language === 'en' ? 'sw' : 'en')}
                className="hidden md:flex items-center gap-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs"
                title="Switch language"
              >
                <Languages size={14} />
                <span>{language === 'en' ? 'SW' : 'EN'}</span>
              </button>
              {authStatus === 'authenticated' && session?.user ? (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="hidden md:flex items-center gap-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs"
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              ) : (
                authStatus !== 'loading' ? (
                  <Link
                    to="/account/signin"
                    className="hidden md:flex items-center gap-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <User size={14} />
                    <span>Sign in</span>
                  </Link>
                ) : null
              )}
              <button
                onClick={closeChat}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {conversationStage && conversationStage !== 'greeting' && (
            <ChatProgress stage={conversationStage} progress={progress} t={t} />
          )}

          {/* Lead Captured Banner with Score */}
          {leadCaptured && leadScore && (
            <div className="shrink-0">
              <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-green-50 border-b border-green-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span className="text-xs font-bold text-green-700">
                    {t('lead.captured', { name: capturedName })}
                  </span>
                </div>
                {capturedWhatsapp && (
                  <a
                    href={`https://wa.me/${capturedWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shrink-0"
                  >
                    <Phone size={10} />
                    WhatsApp Us
                  </a>
                )}
              </div>
              <LeadScoreDisplay
                score={leadScore}
                category={leadCategory}
                isHighValue={isHighValue}
                onHumanHelp={() => setShowHumanHelp(true)}
                t={t}
              />
            </div>
          )}

          {/* Human Help Requested Banner */}
          {showHumanHelp && (
            <div className="shrink-0 px-4 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-700 font-bold mb-2">
                {t('chat.askingForHuman')}
              </p>
              <button
                onClick={handleHumanHelp}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Headphones size={12} />}
                {t('chat.yesConnect')}
              </button>
            </div>
          )}

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
            >
              {/* GDPR Consent Prompt */}
              {showConsentPrompt && pendingLeadData && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Bot size={14} />
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 rounded-tl-none"
                         style={{ borderLeftColor: primaryColor }}>
                      <p className="text-sm text-slate-800 mb-3">
                        Before I save your details and connect you with suppliers, I need your explicit consent.
                      </p>
                      <div className="bg-slate-50 p-3 rounded-lg mb-3 text-xs text-slate-600 leading-relaxed">
                        {getPrivacyNotice()}
                      </div>
                      <p className="text-sm font-bold text-slate-800 mb-2">
                        Do you consent to us storing your information to provide our services?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConsent(true)}
                          className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Yes, I Consent
                        </button>
                        <button
                          onClick={() => handleConsent(false)}
                          className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          No, Decline
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user" ? "bg-slate-200" : "text-white"
                    }`}
                    style={
                      msg.role === "assistant"
                        ? { backgroundColor: primaryColor }
                        : {}
                    }
                  >
                    {msg.role === "user" ? (
                      <User size={14} className="text-slate-600" />
                    ) : (
                      <Bot size={14} />
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-white text-slate-800 rounded-tr-none"
                        : "bg-white text-slate-800 rounded-tl-none border-l-4"
                    }`}
                    style={
                      msg.role === "assistant"
                        ? { borderLeftColor: primaryColor }
                        : {}
                    }
                    dangerouslySetInnerHTML={{
                      __html: formatMessage(msg.content),
                    }}
                  />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Bot size={14} />
                  </div>
                  <div
                    className="bg-white p-3 rounded-2xl shadow-sm border-l-4 flex gap-1.5 items-center"
                    style={{ borderLeftColor: primaryColor }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        animation: "bounce-dot 1s ease-in-out 0ms infinite",
                      }}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        animation: "bounce-dot 1s ease-in-out 150ms infinite",
                      }}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        animation: "bounce-dot 1s ease-in-out 300ms infinite",
                      }}
                    />
                  </div>
               </div>
             </div>
           )}

           {/* Email Validation & Enrichment */}
           {leadCaptured && !emailValid && emailSuggestions.length > 0 && (
             <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
               <div className="flex items-start gap-2">
                 <div className="text-amber-600 mt-0.5">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                   </svg>
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] font-bold text-amber-800 mb-1">{t('email.invalidTitle')}</p>
                   {emailSuggestions.map((suggestion, idx) => (
                    suggestion.type === 'complete' ? (
                      <button
                        key={idx}
                        onClick={() => handleEmailSuggestion(suggestion.text)}
                        className="block w-full text-left text-[10px] px-2 py-1.5 mb-1 bg-white border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                      >
                        Use: {suggestion.text}
                      </button>
                    ) : (
                      <p key={idx} className="text-[9px] text-amber-600 italic">
                        {suggestion.text}
                      </p>
                    )
                  ))}
                   <p className="text-[9px] text-amber-600 mt-1">
                     {t('email.hint')}
                   </p>
                 </div>
               </div>
             </div>
           )}

           {/* Email Validated Confirmation */}
           {leadCaptured && emailValid && capturedEmail && (
             <div className="px-4 py-2 bg-green-50 border-t border-green-100">
               <div className="flex items-center gap-2">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-600">
                   <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                 </svg>
                 <span className="text-[10px] text-green-700 font-medium">
                   {t('email.verified', { email: capturedEmail })}
                 </span>
               </div>
             </div>
           )}

            {/* Quick Replies */}
            {showQuickReplies && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  {t('chat.quickOptions')}
                </p>
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(reply)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all font-medium text-slate-600 hover:text-blue-700"
                  >
                    {reply}
                  </button>
                ))}
                <button
                  onClick={() => setShowHumanHelp(true)}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 transition-colors"
                >
                  <Headphones size={12} />
                  {t('chat.humanInstead')}
                </button>
              </div>
            )}
          </div>

          {/* Human Help Panel */}
          {showHumanHelp && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-800 mb-2">
                {t('chat.humanAssistance')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleHumanHelp}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Headphones size={12} />}
                  {t('chat.yesConnect')}
                </button>
                <button
                  onClick={() => setShowHumanHelp(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  {t('chat.continueAI')}
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder={t('chat.placeholder')}
                className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl focus:outline-none text-sm transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 rounded-lg text-white transition-all active:scale-90 disabled:opacity-40"
                style={{ backgroundColor: primaryColor }}
              >
                <Send size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-center text-slate-400 font-medium">
                {t('chat.poweredBy')}{" "}
                <span className="font-bold" style={{ color: primaryColor }}>
                  Sokogate AI
                </span>
              </p>
              {!leadCaptured && (
                <button
                  onClick={() => setShowHumanHelp(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <Headphones size={10} />
                  {t('chat.needHumanHelp')}
                </button>
              )}
            </div>
          </div>

          {/* Feedback Prompt */}
          {leadCaptured && !feedbackGiven && !showFeedback && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowFeedback(true)}
                className="text-[10px] text-slate-500 hover:text-blue-600 transition-colors"
              >
                {t('feedback.prompt')}
              </button>
            </div>
          )}

          {/* Feedback Buttons */}
          {showFeedback && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-600 mb-2">{t('feedback.title')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback(5)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {t('feedback.thumbsUp')}
                </button>
                <button
                  onClick={() => handleFeedback(1)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                  </svg>
                  {t('feedback.thumbsDown')}
                </button>
              </div>
            </div>
          )}

          {/* Feedback Submitted Confirmation */}
          {feedbackGiven && (
            <div className="px-4 py-2 bg-green-50 border-t border-green-100">
              <p className="text-[10px] text-green-700 font-medium">{t('feedback.thankYou')}</p>
            </div>
          )}
        </div>
      )}

      {/* Notification Badge */}
      {!isOpen && showNotification && (
        <div
          className="mb-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 flex items-start gap-3 max-w-[280px]"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-800 mb-1">
              👋 {t('chat.quickOptions')}?
            </p>
            <p className="text-[10px] text-slate-500 mb-2">
              {t('chat.needHumanHelp')}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  openChat();
                  setShowNotification(false);
                  // Track which trigger opened the chat
                  analytics.chatOpened(visitorId, 'proactive_notification');
                }}
                className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('chat.openChat')}
              </button>
              <button
                onClick={() => {
                  setShowNotification(false);
                  disableTriggersForSession();
                  analytics.triggerDismissed(visitorId, 'proactive_notification');
                }}
                className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-[10px]"
                title="Don't show again this session"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Toggle Button */}
      <button
        onClick={() => {
          toggleChat();
          setShowNotification(false);
          // Track chat open event
          if (isOpen) {
            analytics.chatOpened(visitorId, 'manual_toggle');
          }
        }}
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 relative"
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
        {!isOpen && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center"
            style={{
              backgroundColor: secondaryColor,
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          >
            <span className="text-[9px] font-bold">AI</span>
          </div>
        )}
      </button>

      <style jsx global>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
