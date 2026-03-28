export const registerServiceWorker = () => {
  console.log("[sw] registerServiceWorker called", {
    hasWindow: typeof window !== "undefined",
    protocol: typeof window !== "undefined" ? location.protocol : "n/a",
    hasServiceWorker: typeof window !== "undefined" ? "serviceWorker" in navigator : false,
  });

  if (typeof window === "undefined") return;
  if (location.protocol.endsWith("-extension:")) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    console.log("[sw] window loaded, registering /sw.js");
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("[sw] registered:", reg.scope))
      .catch((err) => console.error("[sw] registration failed:", err));
  });
};
