"use client";

import React from "react";
import { Link, useNavigate } from "react-router";
import { useUser } from "@/utils/useUser";
import { useAuth } from "@/utils/useAuth";
import {
  User,
  Mail,
  LogOut,
  ChevronRight,
  Settings,
  Shield,
  CreditCard,
  Loader2,
} from "lucide-react";

export default function AccountPage() {
  const navigate = useNavigate();
  const { data: session, status } = useUser();
  const { signOut } = useAuth();

  // Redirect to sign in if not authenticated
  React.useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/account/signin?callbackUrl=/account");
    }
  }, [status, navigate]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800">My Account</h1>
          <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-black shrink-0">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (user.name?.[0] || user.email?.[0] || "U").toUpperCase()
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800">{user.name || "User"}</h2>
              <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                <Mail size={14} />
                {user.email}
              </p>
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-2">
                  <Shield size={12} />
                  Verified
                </span>
              )}
            </div>

            {/* Edit button */}
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings className="text-slate-500" size={20} />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <CreditCard className="text-blue-600" size={20} />
              <span className="font-medium text-slate-700">Payment Methods</span>
            </div>
            <ChevronRight className="text-slate-400" size={18} />
          </button>

          <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="text-green-600" size={20} />
              <span className="font-medium text-slate-700">Security & Privacy</span>
            </div>
            <ChevronRight className="text-slate-400" size={18} />
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="text-slate-600" size={20} />
              <span className="font-medium text-slate-700">Settings</span>
            </div>
            <ChevronRight className="text-slate-400" size={18} />
          </button>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to sign out?")) {
                signOut({ callbackUrl: "/" });
              }
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="text-red-600" size={20} />
              <span className="font-medium text-red-600">Sign Out</span>
            </div>
            <ChevronRight className="text-slate-400" size={18} />
          </button>
        </div>

        {/* Back to dashboard */}
        <div className="mt-6 text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
