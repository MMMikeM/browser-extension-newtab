/**
 * iOS raises the on-screen keyboard only for a focus made during the tap itself. A page that opens
 * from a tap and focuses its field once it has rendered gets no keyboard. Focusing this stand-in
 * during the tap raises it, and moving focus from one field to another keeps it up while the page
 * changes underneath. Outside any route, so the change doesn't unmount it.
 */
let standIn: HTMLInputElement | undefined;

export const holdKeyboard = () => {
  standIn ??= Object.assign(document.createElement("input"), {
    type: "text",
    tabIndex: -1,
    // 16px, or iOS zooms the page to it
    style: "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;",
  });
  standIn.setAttribute("aria-hidden", "true");
  document.body.append(standIn);
  standIn.focus({ preventScroll: true });
};

/** Once the real field has focus. */
export const releaseKeyboard = () => standIn?.remove();
