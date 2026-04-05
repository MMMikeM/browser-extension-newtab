import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { categoryRoutes } from "./routes/categories";
import { noteRoutes } from "./routes/notes";
import { pushRoutes } from "./routes/push";
import { eventsRoute } from "./routes/events";
import { inviteRoutes } from "./routes/invites";
import { contactRoutes } from "./routes/contacts";

const app = new OpenAPIHono();

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// Compress all responses except SSE (streamSSE is a streaming response — buffered
// compression would break it by preventing chunks from flushing to the client).
app.use("*", async (c, next) => {
  if (c.req.path === "/api/events") return next();
  return compress()(c, next);
});

app.use(
  "*",
  secureHeaders({
    xFrameOptions: "DENY",
    strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
  }),
);

// CORS — needed for extension context (moz-extension:// origin).
// Headers are set BEFORE next() so they're present on error responses too:
// if a route throws HTTPException, onError() calls c.json() which picks up
// whatever is already in c._headers — but post-next() code is never reached.
app.use("*", (c, next) => {
  c.header("Access-Control-Allow-Origin", c.req.header("origin") ?? "*");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Client-Id");
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Expose-Headers", "*");
  c.header("Access-Control-Max-Age", "86400");
  return next();
});

app.options("*", (c) => c.body(null, 204));

const api = app
  .route("/api/auth", authRoutes)
  .route("/api/tasks", taskRoutes)
  .route("/api/categories", categoryRoutes)
  .route("/api/notes", noteRoutes)
  .route("/api/push", pushRoutes)
  .route("/api/events", eventsRoute)
  .route("/api/invites", inviteRoutes)
  .route("/api/contacts", contactRoutes);

app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: { title: "NewTab Todo API", version: "1.0.0" },
});

export type AppType = typeof api;
export default app;
