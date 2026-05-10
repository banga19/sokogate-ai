"use client";
import React, { useState, useCallback } from "react";
import {Outlet, Navigate} from "react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  Search,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Bot,
  X,
  Globe,
  ExternalLink,
  Home,
  BarChart2,
  ChevronRight,
  Star,
  Zap,
  Tag,
  CreditCard,
  Truck,
  Package,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { User, LogOut } from "lucide-react";
import { useUser } from "@/contexts/AuthContext";
import useAuth from "@/utils/useAuth";
import { useRealtimeLeads } from "@/utils/useRealtimeLeads";

const fetchLeads = async () => {
  const res = await fetch("/api/leads");
  if (!res.ok) return [];
  return res.json();
};

const fetchAnalytics = async () => {
  const res = await fetch("/api/leads/analytics");
  if (!res.ok) return { total: 0, highIntent: 0, qualified: 0 };
  return res.json();
};

const updateLeadStatus = async ({ id, status }) => {
  const res = await fetch("/api/leads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
};

const PRIMARY = "#1E3A8A";
const SECONDARY = "#EF4444";

function ScoreBadge({ score }) {
  const config = {
    High: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      icon: "🔥",
    },
    Medium: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-200",
      icon: "⚡",
    },
    Low: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: "📋",
    },
  };
  const c = config[score] || config["Low"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${c.bg} ${c.text} ${c.border}`}
    >
      <span>{c.icon}</span> {score}
    </span>
  );
}

function LeadStatusSelect({ value, onChange, isPending }) {
  return (
    <select
      value={value || "New"}
      onChange={(e) => onChange(e.target.value)}
      disabled={isPending}
      className={`text-xs font-bold rounded-lg px-2 py-1.5 border focus:outline-none cursor-pointer transition-colors ${
        value === "New"
          ? "text-blue-700 bg-blue-50 border-blue-200"
          : value === "Qualified"
            ? "text-green-700 bg-green-50 border-green-200"
            : "text-slate-500 bg-slate-50 border-slate-200"
      }`}
    >
      <option value="New">🆕 New</option>
      <option value="Qualified">✅ Qualified</option>
      <option value="Closed">🔒 Closed</option>
    </select>
  );
}

function CategoryBadge({ category }) {
  if (!category) return <span className="text-slate-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
      <Tag size={10} /> {category}
    </span>
  );
}

function PaymentBadge({ status }) {
  const map = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    paid: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
    failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
    refunded: { bg: "bg-purple-100", text: "text-purple-700", label: "Refunded" },
  };
  const s = status ? (map[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status }) : { bg: "bg-gray-100", text: "text-gray-500", label: "Not set" };
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${s.bg} ${s.text} border-transparent`}>{s.label}</span>;
}

function ShippingBadge({ status }) {
  const map = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
    in_transit: { bg: "bg-blue-100", text: "text-blue-700", label: "In Transit" },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  };
  const s = status ? (map[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status }) : { bg: "bg-gray-100", text: "text-gray-500", label: "Not set" };
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${s.bg} ${s.text} border-transparent`}>{s.label}</span>;
}

function PaymentSelect({ value, onChange, isPending }) {
  return (
    <select
      value={value || "pending"}
      onChange={(e) => onChange(e.target.value)}
      disabled={isPending}
      className="text-xs font-bold rounded-lg px-2 py-1.5 border focus:outline-none cursor-pointer transition-colors bg-white"
    >
      <option value="pending">⏳ Pending</option>
      <option value="paid">✅ Paid</option>
      <option value="failed">❌ Failed</option>
      <option value="refunded">🔄 Refunded</option>
    </select>
  );
}

function ShippingSelect({ value, onChange, isPending }) {
  return (
    <select
      value={value || "pending"}
      onChange={(e) => onChange(e.target.value)}
      disabled={isPending}
      className="text-xs font-bold rounded-lg px-2 py-1.5 border focus:outline-none cursor-pointer transition-colors bg-white"
    >
      <option value="pending">⏳ Pending</option>
      <option value="in_transit">🚚 In Transit</option>
      <option value="delivered">🏠 Delivered</option>
      <option value="cancelled">❌ Cancelled</option>
    </select>
  );
}

function LeadDetailModal({ lead, onClose, onStatusUpdate, onPaymentUpdate, onShippingUpdate, isStatusPending, isPaymentPending, isShippingPending }) {
  if (!lead) return null;
  const whatsappNum = lead.whatsapp || lead.phone;
  const waLink = whatsappNum
    ? `https://wa.me/${whatsappNum.replace(/\D/g, "")}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-slate-100"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY}15, ${SECONDARY}10)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg"
              style={{ backgroundColor: PRIMARY }}
            >
              {(lead.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">
                {lead.name || "Anonymous"}
              </h3>
              <p className="text-xs text-slate-500">
                Lead #{lead.id} ·{" "}
                {new Date(lead.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-slate-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
           {/* Score & Status */}
           <div className="flex items-center justify-between">
             <ScoreBadge score={lead.score} />
             <LeadStatusSelect
               value={lead.status}
               onChange={onStatusUpdate}
               isPending={isStatusPending}
             />
           </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Contact Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors group"
                >
                  <Mail size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium truncate group-hover:text-blue-700">
                    {lead.email}
                  </span>
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-green-50 transition-colors group"
                >
                  <Phone size={16} className="text-green-500 shrink-0" />
                  <span className="text-xs text-slate-700 font-medium group-hover:text-green-700">
                    {lead.phone}
                  </span>
                </a>
              )}
              {lead.whatsapp && (
                <a
                  href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors col-span-2"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-xs text-green-700 font-bold">
                    WhatsApp: {lead.whatsapp}
                  </span>
                  <ExternalLink size={12} className="text-green-500 ml-auto" />
                </a>
              )}
            </div>
           </div>

           {/* Category */}
           {lead.category && (
             <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
               <div className="flex items-center gap-2">
                 <Tag size={16} className="text-blue-600" />
                 <span className="text-xs font-bold text-blue-800">Category</span>
               </div>
               <CategoryBadge category={lead.category} />
             </div>
           )}

           {/* Intent Summary */}
          {lead.intent_summary && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <h4 className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Zap size={12} /> AI Intent Summary
              </h4>
              <p className="text-sm text-amber-800 leading-relaxed italic">
                "{lead.intent_summary}"
              </p>
            </div>
          )}

          {/* Original Message */}
          {lead.message && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Original Inquiry
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {lead.message}
              </p>
            </div>
           )}

           {/* Payment & Logistics */}
           <div className="grid grid-cols-2 gap-4">
             {/* Payment Status */}
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                   <CreditCard size={12} /> Payment
                 </h4>
                 <PaymentSelect
                   value={lead.payment_status}
                   onChange={(value) => onPaymentUpdate?.(value)}
                   isPending={isPaymentPending}
                 />
               </div>
               <div className="flex items-center gap-2">
                 <PaymentBadge status={lead.payment_status} />
               </div>
             </div>

             {/* Shipping Status */}
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                   <Truck size={12} /> Shipping
                 </h4>
                 <ShippingSelect
                   value={lead.shipping_status}
                   onChange={(value) => onShippingUpdate?.(value)}
                   isPending={isShippingPending}
                 />
               </div>
               <div className="flex items-center gap-2">
                 <ShippingBadge status={lead.shipping_status} />
                 {lead.shipping_tracking_number && (
                   <span className="text-xs text-slate-500 flex items-center gap-1 ml-2">
                     <Package size={10} /> {lead.shipping_tracking_number}
                   </span>
                 )}
               </div>
             </div>
           </div>

           {/* Actions */}
          <div className="flex gap-3 pt-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors text-sm"
              >
                💬 Message on WhatsApp
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}?subject=Re: Your Sokogate Inquiry`}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-white rounded-xl font-bold transition-colors text-sm"
                style={{ backgroundColor: PRIMARY }}
              >
                <Mail size={16} /> Send Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
   );
}

function CreateLeadModal({ show, onClose, newLead, setNewLead, createLeadMutation }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-slate-100"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY}15, ${SECONDARY}10)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg"
              style={{ backgroundColor: PRIMARY }}
            >
              <Plus size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">
                Create New Lead
              </h3>
              <p className="text-xs text-slate-500">
                Manually add a lead to the database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-slate-100 p-2 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Name *</label>
            <input
              type="text"
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
              style={{ "--tw-ring-color": PRIMARY }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                style={{ "--tw-ring-color": PRIMARY }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone</label>
              <input
                type="tel"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="+254 712 345 678"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                style={{ "--tw-ring-color": PRIMARY }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">WhatsApp</label>
              <input
                type="tel"
                value={newLead.whatsapp}
                onChange={(e) => setNewLead({ ...newLead, whatsapp: e.target.value })}
                placeholder="+254 712 345 678"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                style={{ "--tw-ring-color": PRIMARY }}
              />
            </div>

            {/* Score */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Score</label>
              <select
                value={newLead.score}
                onChange={(e) => setNewLead({ ...newLead, score: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm bg-white"
                style={{ "--tw-ring-color": PRIMARY }}
              >
                <option value="High">🔥 High</option>
                <option value="Medium">⚡ Medium</option>
                <option value="Low">📋 Low</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Category</label>
            <input
              type="text"
              value={newLead.category}
              onChange={(e) => setNewLead({ ...newLead, category: e.target.value })}
              placeholder="Electronics, Apparel, etc."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
              style={{ "--tw-ring-color": PRIMARY }}
            />
          </div>

          {/* Intent Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Intent Summary</label>
            <textarea
              value={newLead.intent_summary}
              onChange={(e) => setNewLead({ ...newLead, intent_summary: e.target.value })}
              placeholder="Brief summary of lead's intent..."
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm resize-none"
              style={{ "--tw-ring-color": PRIMARY }}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Original Message</label>
            <textarea
              value={newLead.message}
              onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
              placeholder="Full inquiry/message from lead..."
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm resize-none"
              style={{ "--tw-ring-color": PRIMARY }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => createLeadMutation.mutate(newLead)}
              disabled={!newLead.name.trim() || createLeadMutation.isPending}
              className="flex-1 px-4 py-3 text-white rounded-xl font-bold transition-colors text-sm disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Auth state
  const { data: session, status } = useUser();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  // Connect to real-time WebSocket for live updates
  useRealtimeLeads();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: fetchLeads,
    retry: false,
  });
  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    retry: false,
  });

   const mutation = useMutation({
     mutationFn: updateLeadStatus,
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["leads"] });
       queryClient.invalidateQueries({ queryKey: ["analytics"] });
     },
   });

   const updatePaymentMutation = useMutation({
     mutationFn: async ({ id, payment_status }) => {
       const res = await fetch("/api/leads", {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ id, payment_status }),
       });
       if (!res.ok) throw new Error("Failed to update payment status");
       return res.json();
     },
     onSuccess: (updatedLead) => {
       queryClient.setQueryData(['leads'], old => old.map(l => l.id === updatedLead.id ? updatedLead : l));
       queryClient.invalidateQueries({ queryKey: ["analytics"] });
     },
   });

  const updateShippingMutation = useMutation({
    mutationFn: async ({ id, shipping_status }) => {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, shipping_status }),
      });
      if (!res.ok) throw new Error("Failed to update shipping status");
      return res.json();
    },
    onSuccess: (updatedLead) => {
      queryClient.setQueryData(['leads'], old => old.map(l => l.id === updatedLead.id ? updatedLead : l));
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData) => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      if (!res.ok) throw new Error("Failed to create lead");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setShowCreateModal(false);
      setNewLead({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        category: "",
        intent_summary: "",
        message: "",
        score: "Medium",
      });
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeTab, setActiveTab] = useState("leads"); // leads | analytics
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    category: "",
    intent_summary: "",
    message: "",
    score: "Medium",
  });

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    const matchesFilter =
      filterStatus === "All" || lead.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "New").length,
    qualified: leads.filter((l) => l.status === "Qualified").length,
    highIntent: leads.filter((l) => l.score === "High").length,
  };

  const exportCSV = useCallback(() => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "WhatsApp",
      "Category",
      "Score",
      "Keyword Score",
      "Status",
      "Payment",
      "Shipping",
      "Intent Summary",
      "Message",
      "Date",
      "Source",
    ];
    const rows = leads.map((l) => [
      l.name || "",
      l.email || "",
      l.phone || "",
      l.whatsapp || "",
      l.category || "",
      l.score || "",
      l.keyword_score || "",
      l.status || "",
      l.payment_status || "",
      l.shipping_status || "",
      `"${(l.intent_summary || "").replace(/"/g, '""')}"`,
      `"${(l.message || "").replace(/"/g, '""')}"`,
      new Date(l.created_at).toLocaleDateString(),
      l.source || "chat",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sokogate-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [leads]);

  // Prepare chart data
  const chartData =
    analytics?.dailyLeads?.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      High: parseInt(d.high) || 0,
      Medium: parseInt(d.medium) || 0,
      Low: parseInt(d.low) || 0,
      Total: parseInt(d.total) || 0,
    })) || [];

  const conversionRate =
    analytics?.totals?.total > 0
      ? Math.round((analytics.totals.qualified / analytics.totals.total) * 100)
      : 0;

  const whatsappRate =
    analytics?.totals?.total > 0
      ? Math.round(
          (analytics.totals.with_whatsapp / analytics.totals.total) * 100,
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex">
       {selectedLead && (
         <LeadDetailModal
           lead={selectedLead}
           onClose={() => setSelectedLead(null)}
           onStatusUpdate={(status) => {
            mutation.mutate({ id: selectedLead.id, status });
            setSelectedLead(prev => ({ ...prev, status }));
          }}
          onPaymentUpdate={(payment_status) => {
            updatePaymentMutation.mutate({ id: selectedLead.id, payment_status });
            setSelectedLead(prev => ({ ...prev, payment_status }));
          }}
          onShippingUpdate={(shipping_status) => {
            updateShippingMutation.mutate({ id: selectedLead.id, shipping_status });
            setSelectedLead(prev => ({ ...prev, shipping_status }));
          }}
          isStatusPending={mutation.isPending}
          isPaymentPending={updatePaymentMutation.isPending}
          isShippingPending={updateShippingMutation.isPending}
         />
       )}

      {/* Sidebar */}
      <aside
        className="w-64 text-white flex flex-col shrink-0"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0">
              <Bot size={20} style={{ color: PRIMARY }} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Sokogate AI</h1>
              <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">
                Sales Lead Agent
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white font-medium transition-colors text-sm"
          >
            <Home size={18} /> Home
          </a>
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 bg-white/15 rounded-xl text-white font-bold text-sm"
          >
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <a
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white font-medium transition-colors text-sm"
          >
            <SettingsIcon size={18} /> Settings
          </a>
        </nav>

        {/* Stats Sidebar Card */}
        <div className="p-4 m-4 rounded-2xl bg-white/10 border border-white/10 space-y-3">
          <p className="text-[10px] font-black text-blue-200 uppercase tracking-wider">
            Quick Stats
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-blue-200">Total Leads</span>
              <span className="font-black text-white">{stats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-blue-200">Conversion</span>
              <span className="font-black text-green-400">
                {conversionRate}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-blue-200">WhatsApp Rate</span>
              <span className="font-black text-yellow-300">
                {whatsappRate}%
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
              style={{ backgroundColor: SECONDARY }}
            >
              U
            </div>
            <div>
              <p className="text-sm font-bold">Ultimo Admin</p>
              <p className="text-[10px] text-blue-200 italic">Elite Partner</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        <CreateLeadModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          newLead={newLead}
          setNewLead={setNewLead}
          createLeadMutation={createLeadMutation}
        />
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              Lead Command Center
            </h2>
            <p className="text-xs text-slate-400">
              Sokogate AI · Ultimo Trading Ltd
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("leads")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "leads" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                <Users size={12} className="inline mr-1" />
                Leads
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "analytics" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                <BarChart2 size={12} className="inline mr-1" />
                Analytics
              </button>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search leads..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                style={{ "--tw-ring-color": PRIMARY }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>

             <a
               href="/"
               className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-colors"
               style={{ backgroundColor: SECONDARY }}
             >
               <Globe size={14} /> View Site
             </a>

             {/* Auth Section */}
             {status === 'authenticated' && session?.user ? (
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
                   {session.user.image ? (
                     <img
                       src={session.user.image}
                       alt={session.user.name || "User"}
                       className="w-6 h-6 rounded-full"
                     />
                   ) : (
                     <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                       {(session.user.name || session.user.email?.[0] || "U").toUpperCase()}
                     </div>
                   )}
                   <span className="text-xs font-bold text-slate-700 hidden sm:block">
                     {session.user.name?.split(' ')[0] || 'User'}
                   </span>
                 </div>
                 <button
                   onClick={() => signOut({ callbackUrl: "/" })}
                   className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                 >
                   <LogOut size={14} />
                   Sign Out
                 </button>
               </div>
             ) : status === 'loading' ? (
               <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
             ) : (
               <a
                 href="/account/signin"
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
               >
                 <User size={14} />
                 Sign In
               </a>
             )}
           </div>
        </header>

        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Leads",
                value: stats.total,
                icon: <Users size={18} />,
                color: "blue",
                sub: "All time",
              },
              {
                label: "New Leads",
                value: stats.new,
                icon: <Clock size={18} />,
                color: "orange",
                sub: "Needs action",
              },
              {
                label: "High Intent",
                value: stats.highIntent,
                icon: <Star size={18} />,
                color: "red",
                sub: "Priority",
              },
              {
                label: "Qualified",
                value: stats.qualified,
                icon: <CheckCircle2 size={18} />,
                color: "green",
                sub: "Closing",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2 rounded-xl bg-${s.color}-100 text-${s.color}-600`}
                  >
                    {s.icon}
                  </div>
                  <span
                    className={`text-[10px] font-black text-${s.color}-500 uppercase`}
                  >
                    {s.sub}
                  </span>
                </div>
                <p className="text-3xl font-black text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Leads Tab */}
          {activeTab === "leads" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="font-black text-slate-800">
                    Lead Submissions
                  </h3>
                  <p className="text-xs text-slate-400">
                    {filteredLeads.length} leads shown
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors hover:opacity-90"
                    style={{ backgroundColor: PRIMARY, color: "white" }}
                  >
                    <Plus size={14} /> Add new lead
                  </button>

                  <div className="flex gap-2 flex-wrap">
                    {["All", "New", "Qualified", "Closed"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          filterStatus === status
                            ? "text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                        style={
                          filterStatus === status
                            ? { backgroundColor: PRIMARY }
                            : {}
                        }
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 text-center text-slate-400">
                  <div
                    className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <p>Loading leads...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                         <th className="px-6 py-3">Lead</th>
                         <th className="px-6 py-3">Category</th>
                         <th className="px-6 py-3">Contact</th>
                         <th className="px-6 py-3">Score</th>
                         <th className="px-6 py-3">Intent</th>
                         <th className="px-6 py-3">Status</th>
                         <th className="px-6 py-3">Payment</th>
                         <th className="px-6 py-3">Shipping</th>
                         <th className="px-6 py-3">Actions</th>
                       </tr>
                     </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                                style={{ backgroundColor: PRIMARY }}
                              >
                                {(lead.name || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">
                                  {lead.name || "Anonymous"}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(lead.created_at).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" },
                                  )}
                                </p>
                              </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <CategoryBadge category={lead.category} />
                           </td>
                           <td className="px-6 py-4">
                             <div className="space-y-1">
                              {lead.email && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <Mail size={11} className="text-blue-400" />
                                  <span className="truncate max-w-[160px]">
                                    {lead.email}
                                  </span>
                                </div>
                              )}
                              {(lead.whatsapp || lead.phone) && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                  <span className="text-[10px]">💬</span>
                                  <span>{lead.whatsapp || lead.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <ScoreBadge score={lead.score} />
                          </td>
                          <td className="px-6 py-4 max-w-[200px]">
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 italic">
                              {lead.intent_summary || lead.message || "—"}
                            </p>
                          </td>
                          <td
                            className="px-6 py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LeadStatusSelect
                              value={lead.status}
                              onChange={(status) => mutation.mutate({ id: lead.id, status })}
                              isPending={mutation.isPending}
                             />
                           </td>
                           <td className="px-6 py-4">
                             <PaymentBadge status={lead.payment_status} />
                           </td>
                           <td className="px-6 py-4">
                             <ShippingBadge status={lead.shipping_status} />
                           </td>
                           <td
                             className="px-6 py-4"
                             onClick={(e) => e.stopPropagation()}
                           >
                             <div className="flex items-center gap-2">
                              {(lead.whatsapp || lead.phone) && (
                                <a
                                  href={`https://wa.me/${(lead.whatsapp || lead.phone).replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-200 transition-colors"
                                >
                                  💬 WA
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <ChevronRight
                                  size={14}
                                  className="text-slate-400"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredLeads.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                      <MessageSquare
                        className="mx-auto mb-4 opacity-20"
                        size={48}
                      />
                      <p className="font-medium">No leads found.</p>
                      <p className="text-xs mt-1">
                        Try the AI chat widget on the homepage to capture your
                        first lead!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-green-500" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Conversion Rate
                    </p>
                  </div>
                  <p className="text-4xl font-black" style={{ color: PRIMARY }}>
                    {conversionRate}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Leads → Qualified
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">💬</span>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      WhatsApp Capture Rate
                    </p>
                  </div>
                  <p className="text-4xl font-black text-green-600">
                    {whatsappRate}%
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Leads with WhatsApp
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} style={{ color: SECONDARY }} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      High Intent Leads
                    </p>
                  </div>
                  <p
                    className="text-4xl font-black"
                    style={{ color: SECONDARY }}
                  >
                    {analytics?.totals?.high_intent || 0}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Ready to buy / sell
                  </p>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 mb-1">
                  Lead Volume (Last 14 Days)
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Breakdown by AI-scored intent level
                </p>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} barSize={16} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                        cursor={{ fill: "#f8fafc" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                      />
                      <Bar
                        dataKey="High"
                        fill={SECONDARY}
                        radius={[4, 4, 0, 0]}
                        name="High Intent"
                      />
                      <Bar
                        dataKey="Medium"
                        fill="#F59E0B"
                        radius={[4, 4, 0, 0]}
                        name="Medium Intent"
                      />
                      <Bar
                        dataKey="Low"
                        fill={PRIMARY}
                        radius={[4, 4, 0, 0]}
                        name="Low Intent"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                    <BarChart2 size={40} className="mb-3" />
                    <p className="font-medium text-slate-400">No data yet</p>
                    <p className="text-xs text-slate-300">
                      Start capturing leads to see your chart!
                    </p>
                  </div>
                )}
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-4">
                    Score Breakdown
                  </h3>
                  <div className="space-y-3">
                    {(analytics?.scoreBreakdown || []).map((s) => {
                      const pct =
                        stats.total > 0
                          ? Math.round((s.count / stats.total) * 100)
                          : 0;
                      const colors = {
                        High: SECONDARY,
                        Medium: "#F59E0B",
                        Low: PRIMARY,
                      };
                      return (
                        <div key={s.score}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span>{s.score} Intent</span>
                            <span>
                              {s.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: colors[s.score] || "#64748b",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 mb-4">
                    Pipeline Status
                  </h3>
                  <div className="space-y-3">
                    {(analytics?.statusBreakdown || []).map((s) => {
                      const pct =
                        stats.total > 0
                          ? Math.round((s.count / stats.total) * 100)
                          : 0;
                      const colors = {
                        New: "#3B82F6",
                        Qualified: "#10B981",
                        Closed: "#64748b",
                      };
                      return (
                        <div key={s.status}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span>{s.status}</span>
                            <span>
                              {s.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: colors[s.status] || "#64748b",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
