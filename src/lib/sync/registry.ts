import { defineModel } from "./types";

export const MODELS = {
  categories: defineModel("categories"),
  tasks: defineModel("tasks"),
  users: defineModel("users"),
  notes: defineModel("notes"),
};

export const IDB_CONFIG = {
  databaseName: "newtab-todo",
  version: 3,
  tableNames: Object.keys(MODELS),
};
