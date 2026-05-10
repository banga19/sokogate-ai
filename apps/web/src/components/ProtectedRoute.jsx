"use client";

import React from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "@auth/create/react";

export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession();
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

  if (!session) {
    return <Navigate to="/account/signin" state={{ from: location }} replace />;
  }

  return children;
}

