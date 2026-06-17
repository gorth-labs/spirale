import { Response } from "express";

type SseClient = { res: Response };
const clients = new Map<number, Set<SseClient>>();

export function addClient(runId: number, res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  if (!clients.has(runId)) clients.set(runId, new Set());
  const client: SseClient = { res };
  clients.get(runId)!.add(client);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  res.on("close", () => {
    clearInterval(heartbeat);
    clients.get(runId)?.delete(client);
    if (clients.get(runId)?.size === 0) clients.delete(runId);
  });
}

export function emit(runId: number, event: string, data: unknown): void {
  const set = clients.get(runId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of set) {
    client.res.write(payload);
  }
}

export function makeEmitter(runId: number) {
  return (event: string, data: unknown) => emit(runId, event, data);
}
