import { useSyncExternalStore } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface PwaState {
  canInstall: boolean;
  installPromptAvailable: boolean;
  isOffline: boolean;
  isOfflineReady: boolean;
  needsRefresh: boolean;
}

const listeners = new Set<() => void>();

let installPromptEvent: BeforeInstallPromptEvent | null = null;
let applyUpdate: (() => Promise<void>) | null = null;
let pwaState: PwaState = {
  canInstall: typeof navigator !== "undefined" ? navigator.onLine === false : false,
  installPromptAvailable: false,
  isOffline: typeof navigator !== "undefined" ? navigator.onLine === false : false,
  isOfflineReady: false,
  needsRefresh: false
};

function emit() {
  listeners.forEach((listener) => listener());
}

function updateState(patch: Partial<PwaState>) {
  pwaState = {
    ...pwaState,
    ...patch
  };
  emit();
}

export function subscribePwaState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaStateSnapshot() {
  return pwaState;
}

export function usePwaState() {
  return useSyncExternalStore(subscribePwaState, getPwaStateSnapshot, getPwaStateSnapshot);
}

export function setOfflineStatus(isOffline: boolean) {
  updateState({ isOffline });
}

export function setOfflineReady(isOfflineReady: boolean) {
  updateState({ isOfflineReady });
}

export function setNeedsRefresh(needsRefresh: boolean) {
  updateState({ needsRefresh });
}

export function registerInstallPrompt(event: BeforeInstallPromptEvent | null) {
  installPromptEvent = event;
  updateState({ installPromptAvailable: Boolean(event) });
}

export function registerUpdateHandler(handler: (() => Promise<void>) | null) {
  applyUpdate = handler;
}

export async function promptForInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!installPromptEvent) {
    return "unavailable";
  }

  await installPromptEvent.prompt();
  const choice = await installPromptEvent.userChoice;
  if (choice.outcome === "accepted") {
    registerInstallPrompt(null);
  }

  return choice.outcome;
}

export async function applyPwaUpdate(): Promise<boolean> {
  if (!applyUpdate) {
    return false;
  }

  await applyUpdate();
  return true;
}
