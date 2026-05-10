"use client";

import React, { useState, useEffect } from "react";
import { Navigate } from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Save,
  ArrowLeft,
  Sparkles,
  Globe,
  Target,
  Palette,
  CheckCircle,
  LayoutDashboard,
  Settings as SettingsIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";

const fetchSettings = async () => {
  const res = await fetch("/api/settings");
  if (!res.ok) {
    return {
      business_name: "Sokogate",
      business_description: "Africa's premier B2B wholesale marketplace connecting African wholesalers to global buyers.",
      ai_goal: "Capture leads by answering sourcing questions and collecting contact info.",
      primary_color: "#1E3A8A",
      secondary_color: "#EF4444",
    };
  }
  return res.json();
};

const updateSettings = async (settings) => {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
};

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const queryClient = useQueryClient();
  const { data: initialSettings, isLoading, error } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    retry: false,
  });

  const [formData, setFormData] = useState({
    business_name: "",
    business_description: "",
    ai_goal: "",
    primary_color: "#1E3A8A",
    secondary_color: "#EF4444",
  });

  useEffect(() => {
    if (initialSettings) {
      setFormData({
        business_name: initialSettings.business_name || "",
        business_description: initialSettings.business_description || "",
        ai_goal: initialSettings.ai_goal || "",
        primary_color: initialSettings.primary_color || "#1E3A8A",
        secondary_color: initialSettings.secondary_color || "#EF4444",
      });
    }
  }, [initialSettings]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update settings.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-slate-500">Loading settings...</div>
    );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-64 bg-[#1E3A8A] text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#1E3A8A] font-black">S</span>
            </div>
            Sokogate AI
          </h1>
        </div>

        <nav className="flex-1 px-4 py-4">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-lg text-white/70 hover:text-white font-medium mb-2 transition-colors"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </a>
          <a
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-white font-medium mb-2 transition-colors"
          >
            <SettingsIcon size={20} />
            Settings
          </a>
        </nav>
      </aside>

      <main className="flex-1 p-12">
        <div className="max-w-3xl mx-auto">
          <header className="mb-10 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">
                AI Agent Configuration
              </h2>
              <p className="text-slate-500 font-medium">
                Customize how your AI interacts with potential customers and
                represents your brand.
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex items-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {mutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save size={20} /> Save Changes
                </>
              )}
            </button>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Settings */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Globe size={18} className="text-[#1E3A8A]" />
                <h3 className="font-bold text-slate-800">Business Identity</h3>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        business_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] transition-all"
                    placeholder="e.g. Sokogate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Business Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.business_description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        business_description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] transition-all"
                    placeholder="Describe what your business does, your key products, and unique value proposition..."
                  />
                  <p className="text-xs text-slate-400 mt-2 italic">
                    This helps the AI understand the context of customer
                    inquiries.
                  </p>
                </div>
              </div>
            </section>

            {/* AI Personality */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Sparkles size={18} className="text-[#1E3A8A]" />
                <h3 className="font-bold text-slate-800">
                  AI Behavior & Goals
                </h3>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    AI Agent Goal
                  </label>
                  <textarea
                    rows={3}
                    value={formData.ai_goal}
                    onChange={(e) =>
                      setFormData({ ...formData, ai_goal: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] transition-all"
                    placeholder="e.g. Capture contact details for bulk sourcing inquiries..."
                  />
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Define exactly what you want the AI to achieve during a
                    conversation.
                  </p>
                </div>
              </div>
            </section>

            {/* Visual Branding */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Palette size={18} className="text-[#1E3A8A]" />
                <h3 className="font-bold text-slate-800">Widget Appearance</h3>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-4">
                      Primary Brand Color
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            primary_color: e.target.value,
                          })
                        }
                        className="w-16 h-16 rounded-xl border-4 border-white shadow-sm cursor-pointer"
                      />
                      <div>
                        <p className="font-mono text-sm uppercase font-bold text-slate-600">
                          {formData.primary_color}
                        </p>
                        <p className="text-xs text-slate-400">
                          Main widget & buttons
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-4">
                      Secondary Accent Color
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            secondary_color: e.target.value,
                          })
                        }
                        className="w-16 h-16 rounded-xl border-4 border-white shadow-sm cursor-pointer"
                      />
                      <div>
                        <p className="font-mono text-sm uppercase font-bold text-slate-600">
                          {formData.secondary_color}
                        </p>
                        <p className="text-xs text-slate-400">
                          Highlights & notifications
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </form>

          <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
            <CheckCircle className="text-blue-600 mt-1 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-blue-900">
                Pro-Tip for Lead Generation
              </h4>
              <p className="text-sm text-blue-700 leading-relaxed mt-1">
                Be specific in your "AI Goal". For example: "Always ask for the
                customer's WhatsApp number if they are from East Africa" or
                "Offer a 10% discount on first bulk orders in exchange for an
                email".
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingsIconWrapper({ size }) {
  return <SettingsIcon size={size} />;
}
