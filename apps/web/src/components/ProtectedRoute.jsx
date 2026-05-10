"use client";

import React from "react";
import { Navigate, useLocation } from "react-router";
import useUser from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { status } = useUser();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/account/signin" state={{ from: location }} replace />;
  }

  return children;
}
