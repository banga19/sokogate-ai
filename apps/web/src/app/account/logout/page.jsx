"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/utils/useAuth";
import { Loader2 } from "lucide-react";

export default function SignOutPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await signOut({ callbackUrl: "/" });
      } catch (error) {
        console.error("Sign out error:", error);
        navigate("/");
      }
    };
    performSignOut();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Signing you out...</p>
      </div>
    </div>
  );
}
