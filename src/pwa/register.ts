import { registerSW } from "virtual:pwa-register";
import { registerInstallPrompt, registerUpdateHandler, setNeedsRefresh, setOfflineReady, setOfflineStatus, type BeforeInstallPromptEvent } from "@/pwa/state";

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    setNeedsRefresh(true);
  },
  onOfflineReady() {
    setOfflineReady(true);
  }
});

registerUpdateHandler(async () => {
  setNeedsRefresh(false);
  await updateServiceWorker(true);
});

setOfflineStatus(typeof navigator !== "undefined" ? navigator.onLine === false : false);

window.addEventListener("online", () => setOfflineStatus(false));
window.addEventListener("offline", () => setOfflineStatus(true));
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  registerInstallPrompt(event as BeforeInstallPromptEvent);
});
window.addEventListener("appinstalled", () => {
  registerInstallPrompt(null);
});
