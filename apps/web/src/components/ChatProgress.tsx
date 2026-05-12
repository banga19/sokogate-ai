"use client";

import React from 'react';

/**
 * ChatProgress - Visual indicator of conversation stage
 * Shows 5 stages with icons and progress bar
 */
export function ChatProgress({ stage, progress, t }) {
  if (!stage || !progress) return null;

  const stages = [
    { key: 'greeting', label: t('progress.greeting'), icon: '👋' },
    { key: 'needs_assessment', label: t('progress.needs'), icon: '🔍' },
    { key: 'contact_capture', label: t('progress.contact'), icon: '📝' },
    { key: 'qualified', label: t('progress.qualified'), icon: '✅' },
    { key: 'handoff_requested', label: t('progress.help'), icon: '🎧' },
  ];

  const currentIndex = progress.currentIndex;

  return (
    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Conversation Progress
        </span>
        <span className="text-[10px] font-bold" style={{ color: progress.progress >= 100 ? '#10b981' : '#1E3A8A' }}>
          {progress.progress}%
        </span>
      </div>
      <div className="flex items-center gap-1">
        {stages.map((s, idx) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  idx <= currentIndex
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-[8px] mt-1 text-center ${
                  idx <= currentIndex ? "text-slate-700 font-bold" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`flex-1 h-1 rounded ${
                  idx < currentIndex ? "bg-green-500" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
