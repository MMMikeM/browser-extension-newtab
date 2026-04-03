import { HTTPException } from "hono/http-exception";

export class NotFoundError extends HTTPException {
  constructor(entity: string, id?: string) {
    super(404, { message: id ? `${entity} not found: ${id}` : `${entity} not found` });
  }
}

export class ConflictError extends HTTPException {
  constructor(message: string) {
    super(409, { message });
  }
}

export class StaleUpdateError extends HTTPException {
  constructor(entity: string, id: string) {
    super(409, { message: `Stale or missing ${entity}: ${id}` });
  }
}

export class InsertFailedError extends HTTPException {
  constructor(entity: string) {
    super(500, { message: `Insert failed: no ${entity} row returned` });
  }
}
