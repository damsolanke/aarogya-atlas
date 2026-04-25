export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type TraceEvent =
  | {
      type: "thought" | "tool_request";
      content: string;
      tool_calls?: { name: string; args: Record<string, unknown> }[];
    }
  | { type: "tool_result"; tool: string; content: string };

export type StreamEvent =
  | { event: "step"; data: TraceEvent }
  | { event: "final"; data: { text: string } }
  | { event: "error"; data: { kind: string; text: string } };

export async function* streamQuery(
  query: string,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const r = await fetch(`${API_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });
  if (!r.ok || !r.body) {
    throw new Error(`API error: ${r.status} ${r.statusText}`);
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice("data:".length).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json) as StreamEvent;
      } catch {
        // ignore parse errors on partial chunks
      }
    }
  }
}

export type Facility = {
  id: string;
  name: string;
  address_district: string | null;
  address_state: string | null;
  latitude: number;
  longitude: number;
  services: string[];
};

export async function listFacilities(state = "Karnataka", limit = 500): Promise<Facility[]> {
  const r = await fetch(`${API_URL}/api/facilities?state=${state}&limit=${limit}`);
  if (!r.ok) return [];
  return (await r.json()) as Facility[];
}
