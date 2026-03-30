import { registerSW } from "virtual:pwa-register";
import { registerUpdateHandler, setNeedsRefresh, setOfflineReady, setOfflineStatus } from "@/pwa/state";

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
