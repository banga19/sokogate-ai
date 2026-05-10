"use client";

export default function LoginRedirect() {
  if (typeof window !== "undefined") {
    window.location.replace("/account/signin");
  }
  return null;
}