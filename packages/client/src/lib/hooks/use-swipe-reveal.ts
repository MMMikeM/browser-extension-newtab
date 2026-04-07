import { useEffect, useRef, useState } from "react";

const DRAWER_WIDTH = 148;
const OPEN_THRESHOLD = 60;

// Module-level registry: when one row opens, all others close
const closeRegistry = new Set<() => void>();

/**
 * Swipe-to-reveal hook for mobile list rows.
 *
 * Attaches non-passive touchmove (required for preventDefault) via useEffect
 * rather than React synthetic events so we can actually stop scroll during
 * a horizontal swipe. Transform is applied directly to the DOM to avoid
 * per-pixel re-renders during drag — state only changes on snap.
 *
 * Usage:
 *   const swipe = useSwipeReveal(disabled);
 *   <div ref={swipe.containerRef}>          // receives touch events + outside-tap guard
 *     <div className="absolute right-0 ..."> // action drawer
 *     <div ref={swipe.contentRef}>           // slides left via translateX
 */
export const useSwipeReveal = (disabled = false) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // Refs to avoid stale closures in native event listeners
  const isOpenRef = useRef(false);
  const isDraggingRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentPx = useRef(0);

  const close = () => {
    const el = contentRef.current;
    if (el) {
      el.style.transition = "transform 200ms ease-out";
      el.style.transform = "translateX(0px)";
    }
    currentPx.current = 0;
    isOpenRef.current = false;
    setIsOpen(false);
  };

  useEffect(() => {
    if (disabled) return;
    const container = containerRef.current;
    if (!container) return;

    closeRegistry.add(close);

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isDraggingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;

      if (!isDraggingRef.current) {
        // Primarily vertical — yield to scroll, abort swipe
        if (Math.abs(dy) > Math.abs(dx)) {
          touchStartX.current = null;
          return;
        }
        if (Math.abs(dx) > 6) {
          isDraggingRef.current = true;
          const el = contentRef.current;
          if (el) el.style.transition = "none";
        }
      }

      if (!isDraggingRef.current) return;
      e.preventDefault(); // stop scroll — requires non-passive listener

      const base = isOpenRef.current ? -DRAWER_WIDTH : 0;
      const next = Math.min(0, Math.max(-DRAWER_WIDTH, base + dx));
      currentPx.current = next;
      const el = contentRef.current;
      if (el) el.style.transform = `translateX(${next}px)`;
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) {
        touchStartX.current = null;
        return;
      }

      const shouldOpen = isOpenRef.current
        ? currentPx.current > -(DRAWER_WIDTH - OPEN_THRESHOLD) // swipe right past threshold to close
        : currentPx.current < -OPEN_THRESHOLD; // swipe left past threshold to open

      if (shouldOpen) {
        closeRegistry.forEach((fn) => {
          if (fn !== close) fn();
        });
      }

      const el = contentRef.current;
      if (el) {
        el.style.transition = "transform 200ms ease-out";
        el.style.transform = shouldOpen ? `translateX(${-DRAWER_WIDTH}px)` : "translateX(0px)";
      }

      currentPx.current = shouldOpen ? -DRAWER_WIDTH : 0;
      isOpenRef.current = shouldOpen;
      setIsOpen(shouldOpen);
      isDraggingRef.current = false;
      touchStartX.current = null;
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      closeRegistry.delete(close);
    };
  }, [disabled]);

  // Close when user taps outside the container
  useEffect(() => {
    if (!isOpen || disabled) return;
    const onOutside = (e: TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const el = contentRef.current;
        if (el) {
          el.style.transition = "transform 200ms ease-out";
          el.style.transform = "translateX(0px)";
        }
        currentPx.current = 0;
        isOpenRef.current = false;
        setIsOpen(false);
      }
    };
    document.addEventListener("touchstart", onOutside, { passive: true });
    return () => document.removeEventListener("touchstart", onOutside);
  }, [isOpen, disabled]);

  return {
    containerRef,
    contentRef,
    isOpen,
    close,
    drawerWidth: DRAWER_WIDTH,
  };
};
