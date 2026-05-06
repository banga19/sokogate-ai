"use client";
import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatWidgetContext = createContext(null);

export function ChatWidgetProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <ChatWidgetContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
    </ChatWidgetContext.Provider>
  );
}

export function useChatWidget() {
  const context = useContext(ChatWidgetContext);
  if (!context) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider');
  }
  return context;
}
