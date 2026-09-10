"use client";

import { useSyncExternalStore } from "react";
import { fetchRuntime, type Runtime } from "./api";

/* One fetch of GET /api/runtime shared by every component that renders a
   runtime badge (tool count, agent backend, critic, tracing, vision route).
   Backed by useSyncExternalStore so there is no setState-in-effect. */

type Listener = () => void;

let snapshot: Runtime | null = null;
let started = false;
const listeners = new Set<Listener>();

function start() {
  if (started) return;
  started = true;
  fetchRuntime().then((r) => {
    if (!r) {
      started = false; // let the next subscriber retry
      return;
    }
    snapshot = r;
    listeners.forEach((l) => l());
  });
}

function subscribe(l: Listener) {
  listeners.add(l);
  start();
  return () => {
    listeners.delete(l);
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
