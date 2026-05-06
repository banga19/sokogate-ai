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
} from "lucide-react";

const QUICK_REPLIES = [
  "I want to source electronics in bulk",
  "Looking for clothing & apparel suppliers",
  "Need agriculture & food products",
  "I'm a supplier looking for buyers",
  "What payment methods do you accept?",
];

export default function ChatWidget({ settings = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [capturedWhatsapp, setCapturedWhatsapp] = useState(null);
  const [capturedName, setCapturedName] = useState(null);
  const [showNotification, setShowNotification] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const primaryColor = settings.primary_color || "#1E3A8A";
  const secondaryColor = settings.secondary_color || "#EF4444";
  const businessName = settings.business_name || "Sokogate";

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `👋 Hello! I'm your AI sourcing assistant from **${businessName}**.\n\nI help connect buyers and suppliers across Africa and beyond. Whether you're looking to source products in bulk or find buyers for your goods — I'm here to help!\n\nWhat are you looking for today?`,
      },
    ]);
  }, [businessName]);

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

  const handleSend = async (text) => {
    const msgText = text || input;
    if (!msgText.trim() || isLoading) return;

    const userMessage = { role: "user", content: msgText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error("Chat failed");
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);

      if (data.leadCaptured && !leadCaptured) {
        setLeadCaptured(true);
        if (data.whatsapp) setCapturedWhatsapp(data.whatsapp);
        if (data.leadName) setCapturedName(data.leadName);
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

  const formatMessage = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  };

  const showQuickReplies = messages.length <= 1 && !isLoading;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ width: "390px", height: "580px" }}
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
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Lead Captured Banner */}
          {leadCaptured && (
            <div className="shrink-0 bg-green-50 border-b border-green-100 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <p className="text-xs font-bold text-green-700">
                  {capturedName
                    ? `${capturedName}, you're now in our system!`
                    : "Your details have been saved!"}
                </p>
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
              </div>
            )}
          </div>

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
            <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
              Powered by{" "}
              <span className="font-bold" style={{ color: primaryColor }}>
                Sokogate AI
              </span>{" "}
              & Gemini
            </p>
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
          setIsOpen(!isOpen);
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
