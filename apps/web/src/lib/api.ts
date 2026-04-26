export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type TraceEvent =
  | {
      type: "thought" | "tool_request";
      content: string;
      tool_calls?: { name: string; args: Record<string, unknown> }[];
    }
  | { type: "tool_result"; tool: string; content: string };

export type CriticFlag = {
  severity: "high" | "med" | "low";
  issue: string;
  evidence: string;
};

export type CriticVerdict = {
  trust_score: number;
  verdict: "PASS" | "WARN" | "FAIL";
  flags: CriticFlag[];
  summary: string;
};

export type StreamEvent =
  | { event: "step"; data: TraceEvent }
  | { event: "final"; data: { text: string } }
  | { event: "critic"; data: CriticVerdict }
  | { event: "error"; data: { kind: string; text: string } };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function* streamQuery(
  messagesOrQuery: string | ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body =
    typeof messagesOrQuery === "string"
      ? { query: messagesOrQuery }
      : { messages: messagesOrQuery };
  const r = await fetch(`${API_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

export type TriageResult = {
  model?: string;
  runs_on?: string;
  result?: {
    observation: string;
    condition: string | null;
    severity: "low" | "moderate" | "high" | "critical";
    recommended_specialty: string;
    rationale: string;
  };
  error?: string;
};

export async function triagePhoto(file: File): Promise<TriageResult | null> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // base64 — chunked to avoid call-stack issues on large files
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + 0x8000))
    );
  }
  const b64 = btoa(bin);
  const r = await fetch(`${API_URL}/api/triage_photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_b64: b64 }),
  });
  if (!r.ok) return null;
  return (await r.json()) as TriageResult;
}

export type Health = {
  api: string;
  facilities?: number;
  services?: number;
  ollama?: { ollama_up?: boolean; models?: string[] };
  tool_cache?: { hits: number; misses: number; size: number; hit_rate: number };
};

export async function fetchHealth(): Promise<Health | null> {
  try {
    const r = await fetch(`${API_URL}/healthz`);
    if (!r.ok) return null;
    return (await r.json()) as Health;
  } catch {
    return null;
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

export async function listFacilities(
  state?: string,
  limit = 1500
): Promise<Facility[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (state) params.set("state", state);
  const r = await fetch(`${API_URL}/api/facilities?${params}`);
  if (!r.ok) return [];
  return (await r.json()) as Facility[];
}

export type DesertFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    district: string;
    state: string;
    total_facilities: number;
    coverage: number;
    coverage_ratio: number;
    severity: number; // 0..1
    specialty: string;
  };
};

export type Counterfactual = {
  district: string;
  state: string;
  facilities_now: number;
  cemonc_now: number;
  cemonc_after: number;
  coverage_now_pct: number;
  coverage_after_pct: number;
  annual_district_maternal_deaths_est: number;
  estimated_averted_deaths_per_year: number;
  method: string;
};

export async function fetchCounterfactual(
  district: string,
  bedsAdded: number
): Promise<Counterfactual | null> {
  const params = new URLSearchParams({ district, beds_added: String(bedsAdded) });
  const r = await fetch(`${API_URL}/api/counterfactual?${params}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.error ? null : (j as Counterfactual);
}

export type StockoutFacility = {
  facility_id: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  in_stock: boolean;
  last_verified_iso: string;
  hours_ago: number;
};

export type StockoutPayload = {
  commodity: string;
  label: string;
  scarcity_index: number;
  facilities_polled: number;
  in_stock_count: number;
  stockout_pct: number;
  facilities: StockoutFacility[];
};

export async function fetchStockout(commodity: string): Promise<StockoutPayload | null> {
  const r = await fetch(`${API_URL}/api/stockout?commodity=${encodeURIComponent(commodity)}`);
  if (!r.ok) return null;
  return (await r.json()) as StockoutPayload;
}

export async function fetchDeserts(
  specialty: string,
  state?: string
): Promise<DesertFeature[]> {
  const params = new URLSearchParams({ specialty });
  if (state) params.set("state", state);
  const r = await fetch(`${API_URL}/api/deserts?${params}`);
  if (!r.ok) return [];
  const j = (await r.json()) as { features: DesertFeature[] };
  return j.features || [];
}
