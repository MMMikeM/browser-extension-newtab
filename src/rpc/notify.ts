import { broadcastChange } from "~/server/events";
import { notifyOtherDevices } from "~/server/push";

export const notifyAll = () => {
  broadcastChange();
  notifyOtherDevices().catch(() => {});
};
