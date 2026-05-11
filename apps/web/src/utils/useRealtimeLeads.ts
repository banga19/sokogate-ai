import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type WSMessage =
  | { type: 'connected'; message: string }
  | { type: 'newLead'; lead: Record<string, unknown> }
  | { type: 'updateLead'; lead: Record<string, unknown> }
  | { type: 'newProspect'; prospect: Record<string, unknown> }
  | { type: 'updateProspect'; prospect: Record<string, unknown> }
  | { type: 'newInvestor'; investor: Record<string, unknown> }
  | { type: 'updateInvestor'; investor: Record<string, unknown> }
  | { type: 'newPartnership'; partnership: Record<string, unknown> }
  | { type: 'updatePartnership'; partnership: Record<string, unknown> }
  | { type: 'newMetric'; metric: Record<string, unknown> }
  | { type: 'updateMetric'; metric: Record<string, unknown> }
  | { type: 'analyticsUpdate'; analytics: Record<string, unknown> };

export function useRealtimeLeads() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 10;
  const INITIAL_RECONNECT_DELAY = 1000; // 1 second

  const connect = () => {
    if (typeof window === 'undefined') return;

    const WS_URL =
      (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
      '//' + window.location.host + '/api/ws';

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Realtime] WebSocket connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          switch (data.type) {
            case 'newLead':
              queryClient.setQueryData(['leads'], (old: unknown = []) => {
                const oldLeads = (old || []) as Record<string, unknown>[];
                return [data.lead, ...oldLeads.filter(l => l.id !== data.lead.id)];
              });
              queryClient.invalidateQueries({ queryKey: ['analytics'] });
              break;
            case 'updateLead':
              queryClient.setQueryData(['leads'], (old: Record<string, unknown>[] = []) =>
                old.map((lead) => (lead.id === data.lead.id ? { ...lead, ...data.lead } : lead))
              );
              queryClient.invalidateQueries({ queryKey: ['analytics'] });
              break;
            case 'newProspect':
              queryClient.setQueryData(['prospects'], (old: unknown = []) => {
                const oldProspects = (old || []) as Record<string, unknown>[];
                return [data.prospect, ...oldProspects.filter(p => p.id !== data.prospect.id)];
              });
              break;
            case 'updateProspect':
              queryClient.setQueryData(['prospects'], (old: Record<string, unknown>[] = []) =>
                old.map((p) => (p.id === data.prospect.id ? { ...p, ...data.prospect } : p))
              );
              break;
            case 'newInvestor':
              queryClient.setQueryData(['investors'], (old: unknown = []) => {
                const oldInvestors = (old || []) as Record<string, unknown>[];
                return [data.investor, ...oldInvestors.filter(i => i.id !== data.investor.id)];
              });
              break;
            case 'updateInvestor':
              queryClient.setQueryData(['investors'], (old: Record<string, unknown>[] = []) =>
                old.map((i) => (i.id === data.investor.id ? { ...i, ...data.investor } : i))
              );
              break;
            case 'newPartnership':
              queryClient.setQueryData(['partnerships'], (old: unknown = []) => {
                const oldPartnerships = (old || []) as Record<string, unknown>[];
                return [data.partnership, ...oldPartnerships.filter(p => p.id !== data.partnership.id)];
              });
              break;
            case 'updatePartnership':
              queryClient.setQueryData(['partnerships'], (old: Record<string, unknown>[] = []) =>
                old.map((p) => (p.id === data.partnership.id ? { ...p, ...data.partnership } : p))
              );
              break;
            case 'newMetric':
              queryClient.setQueryData(['metrics'], (old: unknown = []) => {
                const oldMetrics = (old || []) as Record<string, unknown>[];
                return [data.metric, ...oldMetrics.filter(m => m.id !== data.metric.id)];
              });
              break;
            case 'updateMetric':
              queryClient.setQueryData(['metrics'], (old: Record<string, unknown>[] = []) =>
                old.map((m) => (m.id === data.metric.id ? { ...m, ...data.metric } : m))
              );
              break;
            case 'analyticsUpdate':
              queryClient.setQueryData(['analytics'], data.analytics);
              break;
          }
        } catch (err) {
          console.error('[Realtime] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[Realtime] WebSocket disconnected');
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[Realtime] Max reconnection attempts reached');
        }
      };

      ws.onerror = (err) => {
        console.error('[Realtime] WebSocket error:', err);
      };

    } catch (err) {
      console.error('[Realtime] Failed to create WebSocket:', err);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  return wsRef;
}
