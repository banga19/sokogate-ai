/**
 * Server-side event pub/sub for real-time updates.
 * Uses Node.js EventEmitter to broadcast events to WebSocket clients.
 */

import { EventEmitter } from 'node:events';
import { broadcastToClients } from './websocket';

type LeadEvent = {
  type: 'newLead' | 'updateLead' | 'deleteLead';
  lead: Record<string, unknown>;
};

type AnalyticsEvent = {
  type: 'analyticsUpdate';
  analytics: Record<string, unknown>;
};

type ServerEvent = LeadEvent | AnalyticsEvent;

class ServerEvents extends EventEmitter {
  constructor() {
    super();
  }

  emitLead(lead: Record<string, unknown>) {
    this.emit('newLead' as const, lead);
    // Broadcast immediately
    broadcastToClients(JSON.stringify({ type: 'newLead', lead }));
  }

  emitLeadUpdate(lead: Record<string, unknown>) {
    this.emit('updateLead' as const, lead);
    // Broadcast immediately
    broadcastToClients(JSON.stringify({ type: 'updateLead', lead }));
  }

  emitAnalytics(analytics: Record<string, unknown>) {
    this.emit('analyticsUpdate' as const, analytics);
    // Broadcast immediately
    broadcastToClients(JSON.stringify({ type: 'analyticsUpdate', analytics }));
  }
}

export const serverEvents = new ServerEvents();
