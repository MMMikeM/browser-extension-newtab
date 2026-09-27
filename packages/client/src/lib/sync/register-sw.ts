const UPDATE_POLL_MS = 60 * 60 * 1000;

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

  // Pick up the new worker, but never reload the page while the user is looking at it
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

      // Fallback: deploy pushes are the primary update signal
      setInterval(() => {
        reg.update().catch((err) => console.warn("[sw] update check failed:", err));
      }, UPDATE_POLL_MS);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch((err) => console.warn("[sw] update check failed:", err));
        }
      });
    })
    .catch((err) => console.error("[sw] registration failed:", err));
};
