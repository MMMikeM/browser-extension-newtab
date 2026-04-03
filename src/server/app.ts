import { OpenAPIHono } from "@hono/zod-openapi";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { categoryRoutes } from "./routes/categories";
import { noteRoutes } from "./routes/notes";
import { pushRoutes } from "./routes/push";
import { eventsRoute } from "./routes/events";

const app = new OpenAPIHono();

// CORS — needed for extension context (moz-extension:// origin)
app.use("*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", c.req.header("origin") ?? "*");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Client-Id");
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Expose-Headers", "*");
});

app.options("*", () => new Response(null, { status: 204 }));

const api = app
  .route("/api/auth", authRoutes)
  .route("/api/tasks", taskRoutes)
  .route("/api/categories", categoryRoutes)
  .route("/api/notes", noteRoutes)
  .route("/api/push", pushRoutes)
  .route("/api/events", eventsRoute);

app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: { title: "NewTab Todo API", version: "1.0.0" },
});

export type AppType = typeof api;
export default app;
