import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

type WSMessage =
  | { type: 'connected'; message: string }
  | { type: 'newLead'; lead: Record<string, unknown> }
  | { type: 'updateLead'; lead: Record<string, unknown> }
  | { type: 'analyticsUpdate'; analytics: Record<string, unknown> };

export function useRealtimeLeads() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const WS_URL =
      (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
      '//' + window.location.host + '/api/ws';

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log('[Realtime] WebSocket connected');

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        switch (data.type) {
          case 'newLead':
            queryClient.setQueryData(['leads'], (old: unknown = []) => [data.lead, ...old] as Record<string, unknown>[]);
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            break;
          case 'updateLead':
            queryClient.setQueryData(['leads'], (old: Record<string, unknown>[] = []) =>
              old.map((lead) => (lead.id === data.lead.id ? { ...lead, ...data.lead } : lead))
            );
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            break;
          case 'analyticsUpdate':
            queryClient.setQueryData(['analytics'], data.analytics);
            break;
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse message:', err);
      }
    };

    ws.onclose = () => console.log('[Realtime] WebSocket disconnected');
    ws.onerror = (err) => console.error('[Realtime] WebSocket error:', err);

    return () => ws.close();
  }, [queryClient]);

  return wsRef;
}
