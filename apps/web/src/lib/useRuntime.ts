"use client";

import { useSyncExternalStore } from "react";
import { fetchRuntime, type Runtime } from "./api";

/* One fetch of GET /api/runtime shared by every component that renders a
   runtime badge (tool count, agent backend, critic, tracing, vision route).
   Backed by useSyncExternalStore so there is no setState-in-effect. */

type Listener = () => void;

let snapshot: Runtime | null = null;
let started = false;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;

function start() {
  if (started) return;
  started = true;
  fetchRuntime().then((r) => {
    if (r) {
      attempt = 0;
      snapshot = r;
      listeners.forEach((l) => l());
      return;
    }
    // fetchRuntime() resolves null on any failure (API cold-starting, network
    // down). Retry with backoff while something is still mounted, otherwise
    // every badge would sit on "connecting…" until a new subscriber happened
    // to mount and call start() again.
    started = false;
    if (listeners.size === 0) return;
    const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (listeners.size > 0) start();
    }, delay);
  });
}

function subscribe(l: Listener) {
  listeners.add(l);
  start();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0 && retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

export function useRuntime(): Runtime | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function runsOnLabel(runsOn: string | null | undefined): string | null {
  if (runsOn === "device") return "on-device";
  if (runsOn === "cloud") return "cloud";
  return null;
}
