# Bug: `fieldUpdatedAt`/`fieldCreatedAt` converts values to Date at runtime but TypeScript types still say string

## Summary

When using `syncedCrud` with `fieldUpdatedAt` and/or `fieldCreatedAt`, Legend State converts the specified fields from ISO strings to `Date` objects at runtime. However, the TypeScript types for the CRUD callbacks (`create`, `update`, `delete`) still type these fields as `string`. This means downstream code that receives the callback input has no type-level warning that the values are actually Dates, leading to silent runtime failures.

## Reproduction

```typescript
import { observable } from "@legendapp/state";
import { syncedCrud } from "@legendapp/state/sync-plugins/crud";

const tasks$ = observable(
  syncedCrud({
    list: () => fetch("/api/tasks").then((r) => r.json()),
    create: (input) => {
      // TypeScript says input.createdAt is `string`
      // At runtime, input.createdAt is a `Date` object
      console.log(typeof input.createdAt);           // "object"
      console.log(input.createdAt instanceof Date);   // true

      // This silently breaks any downstream code expecting a string:
      fetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(input), // Date gets serialized differently
      });
    },
    update: (input) => {
      // Same issue — TypeScript says string, runtime is Date
      console.log(typeof input.updatedAt);            // "object"
      console.log(input.updatedAt instanceof Date);   // true
    },
    fieldUpdatedAt: "updatedAt",
    fieldCreatedAt: "createdAt",
  }),
);
```

## Expected behavior

Either:

**Option A**: The TypeScript types for `create`/`update`/`delete` callback parameters should reflect that `fieldUpdatedAt`/`fieldCreatedAt` fields are `Date`, not `string`. This way, downstream code gets a compile-time error when treating them as strings.

**Option B**: The runtime values should remain as strings (matching the types), with Legend State doing its internal timestamp comparison without mutating the user's data shape.

## Actual behavior

- TypeScript types say the fields are `string` (based on the inferred schema)
- Runtime values are `Date` objects
- No compile-time warning
- Runtime failures when passing to validators/APIs that expect strings (e.g., Zod schemas, fetch bodies)
- Combined with `retry: { infinite: true }`, this creates a retry storm since the validation error repeats forever

## Environment

- `@legendapp/state`: 3.0.0-beta.46
- TypeScript: 6.0.2

## Workaround

Use `transformStringifyDates` to convert Dates back to strings before CRUD callbacks fire:

```typescript
import { transformStringifyDates } from "@legendapp/state/sync";

syncedCrud({
  // ...
  transform: transformStringifyDates<TaskType, "createdAt" | "updatedAt">("createdAt", "updatedAt"),
  fieldUpdatedAt: "updatedAt",
  fieldCreatedAt: "createdAt",
});
```

However, this changes the LOCAL observable type to have `Date` fields, which propagates throughout the app and requires additional type gymnastics.
