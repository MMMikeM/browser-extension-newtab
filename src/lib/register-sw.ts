export const registerServiceWorker = () => {
  if (typeof window === "undefined") return;
  if (location.protocol.endsWith("-extension:")) return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => console.log("[sw] registered:", reg.scope))
    .catch((err) => console.error("[sw] registration failed:", err));
};
