import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyPwaUpdate, getPwaStateSnapshot, promptForInstall, registerInstallPrompt, registerUpdateHandler, setNeedsRefresh, setOfflineReady, setOfflineStatus } from "@/pwa/state";

describe("pwa state", () => {
  beforeEach(() => {
    registerInstallPrompt(null);
    registerUpdateHandler(null);
    setOfflineStatus(false);
    setOfflineReady(false);
    setNeedsRefresh(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("verfolgt Offline- und Update-Status", () => {
    setOfflineStatus(true);
    setOfflineReady(true);
    setNeedsRefresh(true);

    expect(getPwaStateSnapshot()).toMatchObject({
      isOffline: true,
      isOfflineReady: true,
      needsRefresh: true
    });
  });

  it("führt den Installationsprompt aus und räumt akzeptierte Prompts ab", async () => {
    const prompt = vi.fn(async () => undefined);
    registerInstallPrompt({
      prompt,
      userChoice: Promise.resolve({
        outcome: "accepted",
        platform: "web"
      })
    } as unknown as import("@/pwa/state").BeforeInstallPromptEvent);

    await expect(promptForInstall()).resolves.toBe("accepted");
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(getPwaStateSnapshot().installPromptAvailable).toBe(false);
  });

  it("wendet registrierte Updates an", async () => {
    const update = vi.fn(async () => undefined);
    registerUpdateHandler(update);

    await expect(applyPwaUpdate()).resolves.toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
