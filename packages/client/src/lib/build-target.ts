export type BuildTarget = "server" | "extension" | "browser";

export const getBuildTarget = (): BuildTarget => {
  if (typeof window === "undefined") return "server";
  if (location.protocol.endsWith("-extension:")) return "extension";
  return "browser";
};
