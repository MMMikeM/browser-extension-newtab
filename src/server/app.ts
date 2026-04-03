import { Hono } from "hono";
import { autoNotify } from "./broadcast";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { categoryRoutes } from "./routes/categories";
import { noteRoutes } from "./routes/notes";
import { pushRoutes } from "./routes/push";
import { eventsRoute } from "./routes/events";

const app = new Hono();

// CORS — needed for extension context (moz-extension:// origin)
app.use("*", async (c, next) => {
  await next();
  c.header("Access-Control-Allow-Origin", c.req.header("origin") ?? "*");
  c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Expose-Headers", "*");
});

app.options("*", () => new Response(null, { status: 204 }));

app.use("/api/*", autoNotify);

const api = app
  .route("/api/auth", authRoutes)
  .route("/api/tasks", taskRoutes)
  .route("/api/categories", categoryRoutes)
  .route("/api/notes", noteRoutes)
  .route("/api/push", pushRoutes)
  .route("/api/events", eventsRoute);

export type AppType = typeof api;
export default app;
