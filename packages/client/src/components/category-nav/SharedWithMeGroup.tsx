import { type ReactNode } from "react";
import { cn } from "~/lib/utils";

// A fieldset for the group role and its name, as the colour swatches in the category options
// use; the floated legend drops the fieldset's border-notch layout
export function SharedWithMeGroup({
  headingClassName,
  children,
}: {
  headingClassName?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend
        className={cn(
          "float-left w-full text-xs font-medium tracking-wide text-hint uppercase",
          headingClassName,
        )}
      >
        Shared with me
      </legend>
      <div className="clear-left flex flex-col">{children}</div>
    </fieldset>
  );
}
