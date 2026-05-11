/**
 * Server-side event pub/sub for real-time updates.
 * Manages WebSocket clients and broadcasts events.
 */

import { EventEmitter } from 'node:events';

type LeadEvent = {
  type: 'newLead' | 'updateLead' | 'deleteLead';
  lead: Record<string, unknown>;
};

type ProspectEvent = {
  type: 'newProspect' | 'updateProspect' | 'deleteProspect';
  prospect: Record<string, unknown>;
};

type InvestorEvent = {
  type: 'newInvestor' | 'updateInvestor' | 'deleteInvestor';
  investor: Record<string, unknown>;
};

type PartnershipEvent = {
  type: 'newPartnership' | 'updatePartnership' | 'deletePartnership';
  partnership: Record<string, unknown>;
};

type MetricEvent = {
  type: 'newMetric' | 'updateMetric' | 'deleteMetric';
  metric: Record<string, unknown>;
};

type AnalyticsEvent = {
  type: 'analyticsUpdate';
  analytics: Record<string, unknown>;
};

type ServerEvent = LeadEvent | ProspectEvent | InvestorEvent | PartnershipEvent | MetricEvent | AnalyticsEvent;

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

   emitProspect(prospect: Record<string, unknown>) {
     this.emit('newProspect' as const, prospect);
     this.broadcast(JSON.stringify({ type: 'newProspect', prospect }));
   }

   emitProspectUpdate(prospect: Record<string, unknown>) {
     this.emit('updateProspect' as const, prospect);
     this.broadcast(JSON.stringify({ type: 'updateProspect', prospect }));
   }

   emitInvestor(investor: Record<string, unknown>) {
     this.emit('newInvestor' as const, investor);
     this.broadcast(JSON.stringify({ type: 'newInvestor', investor }));
   }

   emitInvestorUpdate(investor: Record<string, unknown>) {
     this.emit('updateInvestor' as const, investor);
     this.broadcast(JSON.stringify({ type: 'updateInvestor', investor }));
   }

   emitPartnership(partnership: Record<string, unknown>) {
     this.emit('newPartnership' as const, partnership);
     this.broadcast(JSON.stringify({ type: 'newPartnership', partnership }));
   }

   emitPartnershipUpdate(partnership: Record<string, unknown>) {
     this.emit('updatePartnership' as const, partnership);
     this.broadcast(JSON.stringify({ type: 'updatePartnership', partnership }));
   }

   emitMetric(metric: Record<string, unknown>) {
     this.emit('newMetric' as const, metric);
     this.broadcast(JSON.stringify({ type: 'newMetric', metric }));
   }

   emitMetricUpdate(metric: Record<string, unknown>) {
     this.emit('updateMetric' as const, metric);
     this.broadcast(JSON.stringify({ type: 'updateMetric', metric }));
   }

    emitAnalytics(analytics: Record<string, unknown>) {
      this.emit('analyticsUpdate' as const, analytics);
      this.broadcast(JSON.stringify({ type: 'analyticsUpdate', analytics }));
    }

    emitHandoff(handoff: Record<string, unknown>) {
      this.emit('newHandoff' as const, handoff);
      this.broadcast(JSON.stringify({ type: 'newHandoff', handoff }));
    }
  }

  export const serverEvents = new ServerEvents();
