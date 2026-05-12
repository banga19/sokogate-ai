"use client";

import React from 'react';
import { Award, Headphones } from 'lucide-react';

/**
 * LeadScoreDisplay - Shows lead score, category, and priority badge
 */
export function LeadScoreDisplay({ score, category, isHighValue, onHumanHelp, t }) {
  const scoreConfig = {
    High: {
      bg: "bg-red-50 border-red-200",
      icon: "🔥",
      title: t('lead.highIntent'),
      desc: t('lead.highDesc'),
      color: "text-red-700",
    },
    Medium: {
      bg: "bg-amber-50 border-amber-200",
      icon: "⚡",
      title: t('lead.mediumIntent'),
      desc: t('lead.mediumDesc'),
      color: "text-amber-700",
    },
    Low: {
      bg: "bg-blue-50 border-blue-200",
      icon: "📋",
      title: t('lead.lowIntent'),
      desc: t('lead.lowDesc'),
      color: "text-blue-700",
    },
  };

  const config = scoreConfig[score] || scoreConfig.Low;

  return (
    <div className={`px-4 py-3 border-t ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl ${config.color}`}>{config.icon}</div>
        <div className="flex-1">
          <h4 className={`text-xs font-black ${config.color} mb-1`}>
            {config.title}
          </h4>
          <p className="text-[10px] text-slate-600 mb-2">{config.desc}</p>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">
              {t('lead.category')}: <span className="font-bold text-slate-700">{category}</span>
            </span>
            {isHighValue && (
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Award size={10} /> {t('lead.priority')}
              </span>
            )}
          </div>
          {onHumanHelp && (
            <button
              onClick={onHumanHelp}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Headphones size={12} />
              {t('lead.talkToHuman')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
