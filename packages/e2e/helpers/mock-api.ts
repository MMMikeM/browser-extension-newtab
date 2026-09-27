import type { Page } from "@playwright/test";

/**
 * Serves /api/* from in-memory fixtures and signs the page in: specs and screenshots
 * need only the Vite dev server. SSE gets a 204 so the client stops reconnecting.
 */

const MOCK_ME = { id: "u-mike", name: "Mike Murray", username: "mike" };
const MOCK_SARAH = { id: "u-sarah", name: "Sarah Murray", username: "sarah" };
const MOCK_SAM = { id: "u-sam", name: "Sam Okafor", username: "sam" };

type MockUser = typeof MOCK_ME;

const TIMESTAMP = "2026-09-20T09:00:00.000Z";

/** Local YYYY-MM-DD, `offsetDays` from today — due dates render relative to the device's today */
const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const mockData = () => {
  let order = 0;
  const task = (title: string, extra: Record<string, unknown> = {}) => {
    const n = order++;
    return {
      id: `t-${n}`,
      userId: MOCK_ME.id,
      categoryId: null,
      assigneeId: null,
      parentId: null,
      title,
      description: null,
      status: "todo",
      dueDate: null,
      sortOrder: `a${n.toString(36).padStart(2, "0")}`,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      user: { id: MOCK_ME.id, name: MOCK_ME.name },
      subtasks: [],
      shares: [] as unknown[],
      assignee: null as MockUser | null,
      ...extra,
    };
  };
  const shareWith = (taskId: string, user: MockUser) => ({
    id: `s-${taskId}-${user.id}`,
    taskId,
    sharedWithUserId: user.id,
    categoryId: null,
    permission: "edit",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    sharedWithUser: user,
  });

  const flights = task(
    "Book flights for the October trip and check whether the Tuesday fare is still under €200",
    { description: "Sam said the 7am one is fine" },
  );
  const thankYou = task("Write a thank-you note to Anna", { dueDate: isoDay(5) });
  thankYou.shares = [shareWith(thankYou.id, MOCK_SARAH)];

  const tasks = [
    flights,
    task("Compare Tuesday and Wednesday fares", { parentId: flights.id }),
    task("Ask Sam about airport pickup", { parentId: flights.id, status: "done" }),
    thankYou,
    task("Call the plumber about the kitchen tap", { dueDate: isoDay(0) }),
    task("Renew passport", { dueDate: isoDay(-3) }),
    task("Pick up dry cleaning"),
    task("Sort out the car insurance renewal before it lapses", {
      assigneeId: MOCK_SAM.id,
      assignee: MOCK_SAM,
    }),
    task("Buy oat milk", { status: "done" }),
    task("Return library books", { status: "done" }),
    task("Draft Q4 roadmap for the team offsite", { categoryId: "c-work", dueDate: isoDay(2) }),
    task("Reply to Priya about the contract", { categoryId: "c-work" }),
    task("Eggs", {
      categoryId: "c-groc",
      userId: MOCK_SARAH.id,
      user: { id: MOCK_SARAH.id, name: MOCK_SARAH.name },
    }),
    task("Sourdough", { categoryId: "c-groc" }),
  ];

  const category = (id: string, name: string, color: string, owner: MockUser, sortOrder: string) => ({
    id,
    userId: owner.id,
    name,
    color,
    sortOrder,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    user: { name: owner.name },
    collaborators: [] as unknown[],
  });
  const groceries = category("c-groc", "Groceries", "oklch(0.68 0.16 58)", MOCK_SARAH, "a2");
  groceries.collaborators = [
    { id: "cc1", categoryId: "c-groc", userId: MOCK_ME.id, addedAt: TIMESTAMP, user: { ...MOCK_ME, avatarUrl: null } },
  ];
  const home = category("c-home", "Home", "oklch(0.60 0.12 138)", MOCK_ME, "a1");
  home.collaborators = [
    { id: "cc2", categoryId: "c-home", userId: MOCK_SAM.id, addedAt: TIMESTAMP, user: { ...MOCK_SAM, avatarUrl: null } },
  ];
  const categories = [
    category("c-work", "Work", "oklch(0.55 0.07 228)", MOCK_ME, "a0"),
    home,
    groceries,
  ];

  const contacts = [MOCK_SARAH, MOCK_SAM].map((u) => ({
    id: `ct-${u.id}`,
    userId: MOCK_ME.id,
    contactUserId: u.id,
    createdAt: TIMESTAMP,
    contactUser: { ...u, avatarUrl: null },
  }));

  return { tasks, categories, contacts, notes: [] as unknown[] };
};

type MockData = ReturnType<typeof mockData>;

type MockApiOptions = {
  signedIn?: boolean;
  data?: MockData;
  /** Suppress the one-time swipe peek, which would otherwise move the first row on touch */
  swipeHintSeen?: boolean;
};

export const mockApi = async (
  page: Page,
  { signedIn = true, data = mockData(), swipeHintSeen = true }: MockApiOptions = {},
) => {
  await page.addInitScript(
    ({ me, signedIn, swipeHintSeen }) => {
      if (signedIn) {
        localStorage.setItem("newtab-todo-token", "mock-token");
        localStorage.setItem("newtab-todo-user-id", me.id);
        localStorage.setItem("newtab-todo-user-info", JSON.stringify(me));
      }
      if (swipeHintSeen) localStorage.setItem("newtab-todo-swipe-hint-seen", "1");
    },
    { me: MOCK_ME, signedIn, swipeHintSeen },
  );

  const collections: Record<string, unknown> = {
    "/api/tasks": data.tasks,
    "/api/categories": data.categories,
    "/api/contacts": data.contacts,
    "/api/notes": data.notes,
  };

  // Production builds call SERVER_URL cross-origin, so answer preflights and allow the origin
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, x-client-id",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (path.startsWith("/api/events")) return route.fulfill({ status: 204, headers: cors, body: "" });

    let body: unknown = {};
    if (request.method() === "GET") body = collections[path] ?? {};
    else {
      try {
        body = request.postDataJSON() ?? {};
      } catch {
        // Non-JSON mutation body: answer with an empty object
      }
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: cors,
      body: JSON.stringify(body),
    });
  });

  return data;
};
