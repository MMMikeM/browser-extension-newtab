import { renderToString } from "react-dom/server";
import { PendingShell } from "~/AppBackground";

export const render = async (): Promise<string> =>
  renderToString(<PendingShell />);
