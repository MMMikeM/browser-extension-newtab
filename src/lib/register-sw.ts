export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (location.protocol.endsWith("-extension:")) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}
