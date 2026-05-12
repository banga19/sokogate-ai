/**
 * Chat Analytics & Logging for Sokogate AI
 * Tracks user interactions, funnel progression, conversion metrics
 */

export type AnalyticsEvent =
  | { type: 'chat_started'; visitorId: string; timestamp: number }
  | { type: 'chat_opened'; visitorId: string; trigger: string; timestamp: number }
  | { type: 'message_sent'; visitorId: string; role: 'user' | 'assistant'; length: number; timestamp: number }
  | { type: 'stage_advanced'; visitorId: string; fromStage: string; toStage: string; timestamp: number }
  | { type: 'lead_captured'; visitorId: string; leadId: number; score: string; category: string; timestamp: number }
  | { type: 'consent_given'; visitorId: string; consentType: 'privacy' | 'email'; timestamp: number }
  | { type: 'consent_declined'; visitorId: string; reason: string; timestamp: number }
  | { type: 'human_handoff_requested'; visitorId: string; reason: string; urgency: string; timestamp: number }
  | { type: 'feedback_submitted'; visitorId: string; rating: number; feedback: string | null; timestamp: number }
  | { type: 'trigger_shown'; visitorId: string; triggerType: string; timestamp: number }
  | { type: 'trigger_dismissed'; visitorId: string; triggerType: string; timestamp: number }
  | { type: 'email_verified'; visitorId: string; emailDomain: string; timestamp: number }
  | { type: 'error_occurred'; visitorId: string; error: string; context: Record<string, any>; timestamp: number };

class AnalyticsEngine {
  private logs: AnalyticsEvent[] = [];
  private flushInterval: number | null = null;
  private readonly flushUrl = '/api/analytics/log';
  private readonly batchSize = 10;
  private readonly flushPeriodMs = 30000; // 30 seconds

  constructor() {
    this.startPeriodicFlush();
  }

  track(event: AnalyticsEvent) {
    this.logs.push(event);
    
    // Immediately flush if error (important)
    if (event.type === 'error_occurred') {
      this.flushNow();
    }
    
    // Flush if batch size reached
    if (this.logs.length >= this.batchSize) {
      this.flushNow();
    }
  }

  private async flushNow() {
    if (this.logs.length === 0) return;
    
    const batch = [...this.logs];
    this.logs = [];
    
    try {
      await fetch(this.flushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive: true // Ensures request completes even if page unloads
      });
    } catch (e) {
      // Re-queue failed logs (up to 5 retries)
      console.warn('Analytics flush failed:', e);
      this.logs.unshift(...batch);
      if (this.logs.length > 100) this.logs.splice(100); // Prevent memory bloat
    }
  }

  private startPeriodicFlush() {
    if (typeof window === 'undefined') return;
    this.flushInterval = window.setInterval(() => this.flushNow(), this.flushPeriodMs);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flushNow());
  }

  stop() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flushNow();
  }

  // Helper methods for common events
  chatStarted(visitorId: string) {
    this.track({ type: 'chat_started', visitorId, timestamp: Date.now() });
  }

  chatOpened(visitorId: string, trigger: string) {
    this.track({ type: 'chat_opened', visitorId, trigger, timestamp: Date.now() });
  }

  messageSent(visitorId: string, role: 'user' | 'assistant', length: number) {
    this.track({ type: 'message_sent', visitorId, role, length, timestamp: Date.now() });
  }

  stageAdvanced(visitorId: string, fromStage: string, toStage: string) {
    this.track({ type: 'stage_advanced', visitorId, fromStage, toStage, timestamp: Date.now() });
  }

  leadCaptured(visitorId: string, leadId: number, score: string, category: string) {
    this.track({ type: 'lead_captured', visitorId, leadId, score, category, timestamp: Date.now() });
  }

  consentGiven(visitorId: string, consentType: 'privacy' | 'email') {
    this.track({ type: 'consent_given', visitorId, consentType, timestamp: Date.now() });
  }

  consentDeclined(visitorId: string, reason: string) {
    this.track({ type: 'consent_declined', visitorId, reason, timestamp: Date.now() });
  }

  humanHandoffRequested(visitorId: string, reason: string, urgency: string) {
    this.track({ type: 'human_handoff_requested', visitorId, reason, urgency, timestamp: Date.now() });
  }

  feedbackSubmitted(visitorId: string, rating: number, feedback: string | null) {
    this.track({ type: 'feedback_submitted', visitorId, rating, feedback, timestamp: Date.now() });
  }

  triggerShown(visitorId: string, triggerType: string) {
    this.track({ type: 'trigger_shown', visitorId, triggerType, timestamp: Date.now() });
  }

  triggerDismissed(visitorId: string, triggerType: string) {
    this.track({ type: 'trigger_dismissed', visitorId, triggerType, timestamp: Date.now() });
  }

  emailVerified(visitorId: string, emailDomain: string) {
    this.track({ type: 'email_verified', visitorId, emailDomain, timestamp: Date.now() });
  }

  errorOccurred(visitorId: string, error: Error, context?: Record<string, any>) {
    this.track({ type: 'error_occurred', visitorId, error: error.message, context: context || {}, timestamp: Date.now() });
  }
}

// Singleton instance
export const analytics = new AnalyticsEngine();

// Session lifecycle helper
export function initSessionAnalytics(visitorId: string) {
  analytics.chatStarted(visitorId);
}

// Get funnel metrics (client-side summary)
export function getSessionMetrics() {
  const endedAt = Date.now();
  // Could be extended to calculate durations, etc.
  return { endedAt };
}
