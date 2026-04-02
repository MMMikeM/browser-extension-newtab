# RPC Layer (`src/rpc/`)

TanStack Start server functions. Isomorphic — on the server they execute directly, on the client they become RPC fetch calls.

## Key rules

- **Don't put these in `src/server/`** — import protection would block the client-side RPC stubs.
- **Input validation happens here** via `.inputValidator(schema)`, not in the repo layer.
- All mutations call `notifyAll()` after success — broadcasts SSE to connected clients + Web Push to offline devices. Fire-and-forget (push failures swallowed).
