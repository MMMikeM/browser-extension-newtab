export const TOKEN_KEY = "newtab-todo-token";
export const EVENTS_PATH = "/api/events";
export const SSE_DATA_CHANGED = "data-changed";
export const MSG_TOKEN_CHANGED = "TOKEN_CHANGED";

export const API_TASKS_PATH = "/api/tasks";
export const API_USERS_PATH = "/api/users";
export const API_NOTES_PATH = "/api/notes";

export const MSG_SYNC_TASKS = "SYNC_TASKS";
export const MSG_SYNC_USERS = "SYNC_USERS";
export const MSG_SYNC_NOTES = "SYNC_NOTES";

export const IDB_CONFIG = {
  databaseName: "newtab-todo",
  version: 2,
  tableNames: ["tasks", "users", "notes"],
};
