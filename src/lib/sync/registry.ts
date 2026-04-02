import { defineModel } from "./types";

export const MODELS = {
  categories: defineModel("categories"),
  tasks: defineModel("tasks"),
  notes: defineModel("notes"),
};

export const IDB_CONFIG = {
  databaseName: "newtab-todo",
  version: 4,
  tableNames: Object.keys(MODELS),
};
