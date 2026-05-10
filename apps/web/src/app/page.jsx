"use client";

import React from "react";
import {
  ArrowRight,
  Bot,
  TrendingUp,
  Users,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  LayoutDashboard,
  MessageSquare,
  Shirt,
  Cpu,
  Leaf,
  Wrench,
  Heart,
  Home,
  Package,
  LogIn,
} from "lucide-react";
import ChatWidget from "../components/ChatWidget";
import { useQuery } from "@tanstack/react-query";
import { useChatWidget } from "@/contexts/ChatWidgetContext";

const fetchSettings = async () => {
  const res = await fetch("/api/settings");
  if (!res.ok) {
    return {
      business_name: "Sokogate AI",
      business_description: "Africa's #1 B2B Sourcing AI — Turn B2B Inquiries Into Qualified Leads 24/7 Automatically",
      ai_goal: "Qualify buyers, capture WhatsApp contacts, score intent, and grow your Africa-to-world trade pipeline without lifting a finger",
      primary_color: "#1E3A8A",
      secondary_color: "#EF4444",
    };
  }
  return res.json();
};

const CATEGORIES = [
  { icon: <Shirt size={20} />, label: "Apparel & Fabrics" },
  { icon: <Cpu size={20} />, label: "Electronics" },
  { icon: <Leaf size={20} />, label: "Agriculture & Food" },
  { icon: <Wrench size={20} />, label: "Machinery & Parts" },
  { icon: <Heart size={20} />, label: "Health & Beauty" },
  { icon: <Home size={20} />, label: "Home & Construction" },
  { icon: <Globe size={20} />, label: "Auto Parts" },
  { icon: <Package size={20} />, label: "Sports & Gifts" },
];

export default function LandingPage() {
  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    retry: false,
  });

  const { openChat } = useChatWidget();

  const primaryColor = settings.primary_color || "#1E3A8A";
  const secondaryColor = settings.secondary_color || "#EF4444";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <ChatWidget settings={settings} />

      {/* Navbar */}
      <nav className="border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h1
              className="font-black text-xl tracking-tight"
              style={{ color: primaryColor }}
            >
              Sokogate AI
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              By Ultimo Trading Ltd
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
          <a
            href="#categories"
            className="hover:text-blue-600 transition-colors"
          >
            Categories
          </a>
          <a href="#features" className="hover:text-blue-600 transition-colors">
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-blue-600 transition-colors"
          >
            How it Works
          </a>
          <a
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <LogIn size={16} /> Sign In
          </a>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <LayoutDashboard size={16} /> Dashboard
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, ${primaryColor} 0%, transparent 60%), radial-gradient(circle at 80% 20%, ${secondaryColor} 0%, transparent 50%)`,
          }}
        />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-[#1E3A8A] text-xs font-black uppercase mb-6">
              <Zap size={14} className="fill-blue-600" />
              Africa's #1 B2B Sourcing AI
            </div>
            <h2 className="text-5xl md:text-6xl font-black leading-[1.1] mb-6 tracking-tight">
              Turn B2B Inquiries Into{" "}
              <span style={{ color: secondaryColor }}>Qualified Leads</span> —
              24/7 Automatically
            </h2>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed max-w-xl">
              The AI sales agent built for Sokogate wholesalers. Qualify buyers,
              capture WhatsApp contacts, score intent, and grow your
              Africa-to-world trade pipeline — without lifting a finger.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a
                href="/dashboard"
                className="px-8 py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-xl"
                style={{ backgroundColor: primaryColor }}
              >
                Launch Dashboard <ArrowRight size={18} />
              </a>
                <button
                  onClick={openChat}
                  className="px-8 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-base hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} /> Try AI Demo
                </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4 mt-8 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 size={16} className="text-green-500" /> M-Pesa &
                10+ payment methods
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 size={16} className="text-green-500" /> Air & Sea
                shipping
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 size={16} className="text-green-500" /> Gemini AI
                powered
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="flex-1 relative max-w-lg w-full">
            <div
              className="absolute -inset-4 rounded-[3rem] blur-3xl opacity-30"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-2 items-center">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: secondaryColor }}
                />
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 h-5 bg-slate-200 rounded text-[10px] text-slate-400 flex items-center px-3">
                  sokogate.com/dashboard
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Leads", val: "128", color: primaryColor },
                    { label: "High Intent", val: "34", color: secondaryColor },
                    { label: "Qualified", val: "89", color: "#10B981" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50"
                    >
                      <p className="text-[10px] text-slate-400">{s.label}</p>
                      <p
                        className="text-xl font-black"
                        style={{ color: s.color }}
                      >
                        {s.val}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    {
                      name: "Ahmed K.",
                      intent: "🔥 High",
                      category: "Electronics bulk",
                    },
                    {
                      name: "Aisha M.",
                      intent: "⚡ Medium",
                      category: "Apparel & Fabrics",
                    },
                  ].map((l, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {l.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">
                          {l.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {l.category}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold">{l.intent}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="absolute -bottom-4 -left-4 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2"
              style={{ animation: "float 3s ease-in-out infinite" }}
            >
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">
                💬
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">
                  WhatsApp Lead!
                </p>
                <p className="text-[10px] text-slate-400">
                  +254 712 *** captured
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section
        id="categories"
        className="py-16 px-6 bg-slate-50 border-y border-slate-100"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              AI handles inquiries for all
            </p>
            <h3 className="text-2xl font-black text-slate-800">
              Sokogate's Product Categories
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {CATEGORIES.map((cat, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-default text-center group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:text-white transition-all"
                  style={{ backgroundColor: `${primaryColor}10` }}
                >
                  <span style={{ color: primaryColor }}>{cat.icon}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-600 leading-tight">
                  {cat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-black mb-4">
              Built for African B2B Trade
            </h3>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Specifically designed to help Sokogate vendors handle global
              wholesale sourcing with AI precision.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Users size={28} />,
                title: "AI Lead Scoring",
                desc: "Instantly scores leads as High, Medium, or Low intent based on conversation analysis — so you focus on the hottest prospects first.",
                color: primaryColor,
                bg: "#1E3A8A15",
              },
              {
                icon: <Globe size={28} />,
                title: "WhatsApp First",
                desc: "Automatically captures WhatsApp numbers — the #1 business communication tool across Africa. Generate direct wa.me links instantly.",
                color: "#10B981",
                bg: "#10B98115",
              },
              {
                icon: <ShieldCheck size={28} />,
                title: "Auto CRM",
                desc: "Every captured lead is saved with intent summary, contact info, and score into your dashboard — zero manual data entry required.",
                color: secondaryColor,
                bg: "#EF444415",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-all group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all"
                  style={{ backgroundColor: f.bg, color: f.color }}
                >
                  {f.icon}
                </div>
                <h4 className="text-xl font-black mb-3">{f.title}</h4>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-24 px-6"
        style={{ backgroundColor: `${primaryColor}08` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-black mb-4">How It Works</h3>
            <p className="text-slate-500 max-w-xl mx-auto">
              From visitor to qualified lead in minutes — fully automated.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: "01",
                title: "Visitor Chats",
                desc: "A buyer or supplier visits your site and clicks the AI chat widget. The AI greets them and learns what they need.",
                emoji: "💬",
              },
              {
                step: "02",
                title: "AI Qualifies",
                desc: "The agent gathers their name, WhatsApp, email, product interest, quantity, and budget — conversationally, no forms needed.",
                emoji: "🤖",
              },
              {
                step: "03",
                title: "Lead Saved",
                desc: "Contact details + intent summary are automatically saved in your dashboard with an AI lead score. You take it from there!",
                emoji: "🎯",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="relative bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center"
              >
                <div className="text-4xl mb-4">{s.emoji}</div>
                <div className="text-xs font-black text-slate-300 mb-2 tracking-widest">
                  STEP {s.step}
                </div>
                <h4
                  className="text-lg font-black mb-3"
                  style={{ color: primaryColor }}
                >
                  {s.title}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-white overflow-hidden relative">
        <div
          className="absolute inset-0 z-0"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[150px] opacity-20 -mr-48 -mt-48"
          style={{ backgroundColor: secondaryColor }}
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
            Start Capturing Leads from Sokogate Visitors Today
          </h2>
          <p className="text-lg text-blue-100 mb-10 leading-relaxed opacity-80">
            Join Ultimo Trading partners using AI to dominate the
            Africa-to-world B2B landscape.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="px-10 py-4 bg-white font-black rounded-2xl hover:bg-blue-50 transition-all text-base shadow-2xl"
              style={{ color: primaryColor }}
            >
              Open Dashboard
            </a>
            <a
              href="/settings"
              className="px-10 py-4 border-2 border-white/30 hover:bg-white/10 font-black rounded-2xl transition-all text-base"
            >
              Configure AI Agent
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Bot size={16} />
            </div>
            <span className="font-black text-slate-800">Sokogate AI</span>
            <span className="text-slate-300">·</span>
            <a
              href="https://ultimotradingltd.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
            >
              ultimotradingltd.co.ke
            </a>
          </div>
          <p className="text-slate-400 text-sm">
            © 2026 Ultimo Trading Ltd. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <a
              href="/dashboard"
              className="hover:text-blue-600 transition-colors font-medium"
            >
              Dashboard
            </a>
            <a
              href="/settings"
              className="hover:text-blue-600 transition-colors font-medium"
            >
              Settings
            </a>
            <a
              href="https://sokogate.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors font-medium"
            >
              Sokogate.com
            </a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
