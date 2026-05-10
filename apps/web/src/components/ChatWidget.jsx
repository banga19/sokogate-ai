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
  RefreshCw,
  ChevronRight,
  Award,
  Clock,
  Target,
  LogOut,
} from "lucide-react";
import { useChatWidget } from "@/contexts/ChatWidgetContext";
import { useUser } from "@/utils/useUser";
import useAuth from "@/utils/useAuth";
import { Link } from "react-router";

const QUICK_REPLIES = [
  "I want to source electronics in bulk",
  "Looking for clothing & apparel suppliers",
  "Need agriculture & food products",
  "I'm a supplier looking for buyers",
  "What payment methods do you accept?",
];

// Progress indicator component
function ChatProgress({ stage, progress }) {
  if (!stage || !progress) return null;

  const stages = [
    { key: 'greeting', label: 'Greeting', icon: '👋' },
    { key: 'needs_assessment', label: 'Needs', icon: '🔍' },
    { key: 'contact_capture', label: 'Contact', icon: '📝' },
    { key: 'qualified', label: 'Qualified', icon: '✅' },
    { key: 'handoff_requested', label: 'Human Help', icon: '🎧' },
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
function LeadScoreDisplay({ score, category, isHighValue, onHumanHelp }) {
  const scoreConfig = {
    High: {
      bg: "bg-red-50 border-red-200",
      icon: "🔥",
      title: "High Intent Lead",
      desc: "Ready to buy/sell now",
      color: "text-red-700",
    },
    Medium: {
      bg: "bg-amber-50 border-amber-200",
      icon: "⚡",
      title: "Medium Intent Lead",
      desc: "Interested, evaluating options",
      color: "text-amber-700",
    },
    Low: {
      bg: "bg-blue-50 border-blue-200",
      icon: "📋",
      title: "Low Intent Lead",
      desc: "Just browsing/research",
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
              Category: <span className="font-bold text-slate-700">{category}</span>
            </span>
            {isHighValue && (
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Award size={10} /> Priority
              </span>
            )}
          </div>
          {onHumanHelp && (
            <button
              onClick={onHumanHelp}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Headphones size={12} />
              Talk to a Human
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatWidget({ settings = {} }) {
  const { isOpen, openChat, closeChat, toggleChat } = useChatWidget();

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
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [capturedWhatsapp, setCapturedWhatsapp] = useState(null);
  const [capturedName, setCapturedName] = useState(null);
  const [leadScore, setLeadScore] = useState(null);
  const [leadCategory, setLeadCategory] = useState(null);
  const [isHighValue, setIsHighValue] = useState(false);
  const [conversationStage, setConversationStage] = useState("greeting");
  const [progress, setProgress] = useState(null);
  const [showNotification, setShowNotification] = useState(true);
  const [showHumanHelp, setShowHumanHelp] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auth
  const { data: session, status: authStatus } = useUser();
  const { signOut } = useAuth();

  const primaryColor = settings.primary_color || "#1E3A8A";
  const secondaryColor = settings.secondary_color || "#EF4444";
  const businessName = settings.business_name || "Sokogate";

   // Fetch visitor data on mount (if returning visitor)
  useEffect(() => {
    const fetchVisitor = async () => {
      if (visitorId && visitorId !== "vis_anonymous") {
        try {
          const res = await fetch(`/api/visitor?id=${visitorId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.visitor) {
              if (data.visitor.name) setCapturedName(data.visitor.name);
              // Could store company in state if needed for other UI, but AI gets it via system prompt via visitor endpoint background
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
    const initial = []; // Will be populated by API call with personalization
    setMessages(initial);
    messagesRef.current = initial;
  }, [businessName, visitorId]);

  // Initialize with personalized greeting
  useEffect(() => {
    const initializeChat = async () => {
      let greeting;

      if (capturedName) {
        greeting = `👋 Welcome back, **${capturedName}**! I'm your AI sourcing assistant from **${businessName}**.\n\n` +
                   "How can I help you today? Are you looking to source products or find buyers?";
      } else {
        greeting = `👋 Hello! I'm your AI sourcing assistant from **${businessName}**.\n\n` +
                   "I help connect buyers and suppliers across Africa and beyond. Whether you're looking to source products in bulk or find buyers for your goods — I'm here to help!\n\n" +
                   "To get started, could you tell me your name and what you're looking for?";
      }

      setMessages([{ role: "assistant", content: greeting }]);
    };

    initializeChat();
  }, [businessName, capturedName, visitorId]);

  useEffect(() => {
    const handleError = (event) => {
      if (event?.detail === 'unhandledrejection') {
        console.warn('Chat API unavailable — using demo mode');
      }
    };
    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

       if (data?.leadCaptured) {
         setLeadCaptured(true);
         setCapturedWhatsapp(data.whatsapp);
         setCapturedName(data.leadName);
         setLeadScore(data.score);
         setLeadCategory(data.category || "General");
         setIsHighValue(data.isHighValue || false);
         setConversationStage(data.stage || 'qualified');
         setProgress(data.progress || null);
       } else if (data?.handoffRequested) {
         setShowHumanHelp(false);
         setConversationStage('handoff_requested');
       } else if (data?.stage) {
         setConversationStage(data.stage);
         setProgress(data.progress || null);
       }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having a bit of trouble right now. Please try again in a moment!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHumanHelp = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: visitorId,
          reason: "User requested human assistance via chat widget",
          urgency: "normal"
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I've notified our human support team! They'll join this conversation shortly.\n\nIn the meantime, you can also reach us directly on WhatsApp for faster assistance:\n" +
                   `👉 https://wa.me/254700000000?text=${encodeURIComponent("Hello, I need assistance with my inquiry")}`,
        },
      ]);

      setShowHumanHelp(false);
    } catch (error) {
      console.error("Handoff error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I couldn't connect you to a human right now. Please try again later or message us on WhatsApp.",
        },
      ]);
      setShowHumanHelp(false);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldNotifyValue = (score, category) => {
    const highValuePatterns = ["container", "large quantity", "urgent", "asap", "1000", "10000"];
    const highTouchCategories = ["Machinery & Parts", "Auto Parts"];
    return (
      score === "High" ||
      highValuePatterns.some(p => (category || "").toLowerCase().includes(p)) ||
      highTouchCategories.includes(category)
    );
  };

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
                <p className="font-bold text-sm">{businessName} Assistant</p>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 bg-green-400 rounded-full"
                    style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                  />
                  <p className="text-[10px] text-blue-100 font-medium uppercase tracking-wider">
                    Online & Ready
                  </p>
                </div>
              </div>
              {/* Auth indicator */}
              {authStatus === 'authenticated' && session?.user && (
                <Link
                  to="/account"
                  className="hidden md:flex items-center gap-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="My Account"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center text-[8px] font-bold">
                      {(session.user.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium">Account</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
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
            <ChatProgress stage={conversationStage} progress={progress} />
          )}

          {/* Lead Captured Banner with Score */}
          {leadCaptured && leadScore && (
            <div className="shrink-0">
              <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-green-50 border-b border-green-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span className="text-xs font-bold text-green-700">
                    {capturedName ? `${capturedName}, you're now in our system!` : "Your details have been saved!"}
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
              />
            </div>
          )}

          {/* Human Help Requested Banner */}
          {showHumanHelp && (
            <div className="shrink-0 px-4 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-700 font-bold mb-2">
                🎧 Human agent requested - Please wait...
              </p>
              <button
                onClick={handleHumanHelp}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Headphones size={12} />}
                {isLoading ? "Requesting..." : "Request Human Support"}
              </button>
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
          >
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

            {/* Quick Replies */}
            {showQuickReplies && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Quick options
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
                  Talk to a Human Instead
                </button>
              </div>
            )}
          </div>

          {/* Human Help Panel */}
          {showHumanHelp && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-800 mb-2">
                Would you like to speak with a human representative? They can assist with complex inquiries.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleHumanHelp}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Headphones size={12} />}
                  {isLoading ? "Connecting..." : "Yes, connect me"}
                </button>
                <button
                  onClick={() => setShowHumanHelp(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  No, continue with AI
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
                placeholder="Type your sourcing inquiry..."
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
                Powered by{" "}
                <span className="font-bold" style={{ color: primaryColor }}>
                  Sokogate AI
                </span>{" "}
                & Gemini
              </p>
              {!leadCaptured && (
                <button
                  onClick={() => setShowHumanHelp(true)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <Headphones size={10} />
                  Need human help?
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Badge */}
      {!isOpen && showNotification && (
        <div
          className="mb-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 flex items-center gap-3 max-w-[280px]"
          style={{ animation: "float 3s ease-in-out infinite" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-800">
              👋 Looking to source products?
            </p>
            <p className="text-[10px] text-slate-500">
              Talk to our AI agent now!
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="text-slate-300 hover:text-slate-500"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => {
          toggleChat();
          setShowNotification(false);
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
