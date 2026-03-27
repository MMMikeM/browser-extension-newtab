import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { matchQuery, MutationCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { idbPersister } from "~/lib/persister";
import appCss from "../styles/app.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      queryClient.invalidateQueries({
        predicate: (query) =>
          mutation.meta?.invalidates?.some((queryKey) => matchQuery({ queryKey }, query)) ?? true,
      });
    },
  }),
});

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "New Tab Todo" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: idbPersister }}
        >
          <Outlet />
        </PersistQueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
