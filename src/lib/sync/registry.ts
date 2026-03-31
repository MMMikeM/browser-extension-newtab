import { defineModel } from "./types";

export const MODELS = {
  tasks: defineModel("tasks"),
  users: defineModel("users"),
  notes: defineModel("notes"),
};

export const IDB_CONFIG = {
  databaseName: "newtab-todo",
  version: 2,
  tableNames: Object.keys(MODELS),
};
