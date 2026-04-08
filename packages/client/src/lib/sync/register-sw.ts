const UPDATE_POLL_INTERVAL = 60 * 60 * 1000; // 1 hour

export const registerServiceWorker = () => {
  console.log("[sw] guards:", {
    hasWindow: typeof window !== "undefined",
    isExtension: typeof window !== "undefined" && location.protocol.endsWith("-extension:"),
    hasSW: typeof window !== "undefined" && "serviceWorker" in navigator,
  });

  if (typeof window === "undefined") return console.log("[sw] skipped: no window");
  if (location.protocol.endsWith("-extension:"))
    return console.log("[sw] skipped: extension context");
  if (!("serviceWorker" in navigator)) return console.log("[sw] skipped: no serviceWorker API");

  // Visibility-aware reload: if backgrounded, reload silently.
  // If visible, defer until user switches away.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (document.visibilityState === "hidden") {
      window.location.reload();
      return;
    }
    const reloadOnHide = () => {
      if (document.visibilityState === "hidden") {
        window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", reloadOnHide);
  });

  console.log("[sw] calling register(/sw.js)");
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      console.log("[sw] registered:", reg.scope, reg);

      // Poll for SW updates hourly as fallback (push is the primary mechanism)
      setInterval(() => {
        reg.update().catch((err) => console.warn("[sw] update check failed:", err));
      }, UPDATE_POLL_INTERVAL);

      // Check for updates when tab becomes visible (user re-opens the app)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch((err) => console.warn("[sw] update check failed:", err));
        }
      });
    })
    .catch((err) => console.error("[sw] registration failed:", err));
};
