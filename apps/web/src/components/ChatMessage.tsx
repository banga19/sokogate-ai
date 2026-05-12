"use client";

import React from 'react';
import DOMPurify from 'dompurify';

/**
 * ChatMessage - Individual chat bubble component
 */
export function ChatMessage({ msg, primaryColor }) {
  return (
    <div
      key={msg.id}
      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            msg.role === "user" ? "bg-slate-200 text-slate-600" : "text-white"
          }`}
          style={
            msg.role === "assistant"
              ? { backgroundColor: primaryColor }
              : {}
          }
        >
          {msg.role === "user" ? (
            <User size={14} />
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
            __html: formatMessage(msg.content, primaryColor),
          }}
        />
      </div>
    </div>
  );
}

/**
 * Format message with basic markdown and WhatsApp links
 * Also sanitizes HTML to prevent XSS
 */
function formatMessage(content, primaryColor) {
  if (!content) return '';

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

  // Sanitize HTML
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['br', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^https?:\/\/wa\.me\/\d+/i
  });
}

import { User, Bot } from 'lucide-react';
