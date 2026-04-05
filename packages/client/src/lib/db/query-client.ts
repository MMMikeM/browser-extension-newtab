import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity, // never evict — 30-day ms value overflows 32-bit setTimeout
      retry: 2,
    },
  },
});
