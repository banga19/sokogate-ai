/**
 * Server-side event pub/sub for real-time updates.
 * Manages WebSocket clients and broadcasts events.
 */

import { EventEmitter } from 'node:events';

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
  // Set of connected WebSocket clients
  clients: Set<any> = new Set();

  addClient(ws: any) {
    this.clients.add(ws);
  }

  removeClient(ws: any) {
    this.clients.delete(ws);
  }

  broadcast(payload: string) {
    this.clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN === 1
        client.send(payload);
      }
    });
  }

  emitLead(lead: Record<string, unknown>) {
    this.emit('newLead' as const, lead);
    this.broadcast(JSON.stringify({ type: 'newLead', lead }));
  }

  emitLeadUpdate(lead: Record<string, unknown>) {
    this.emit('updateLead' as const, lead);
    this.broadcast(JSON.stringify({ type: 'updateLead', lead }));
  }

  emitAnalytics(analytics: Record<string, unknown>) {
    this.emit('analyticsUpdate' as const, analytics);
    this.broadcast(JSON.stringify({ type: 'analyticsUpdate', analytics }));
  }
}

export const serverEvents = new ServerEvents();
