export class NotFoundError extends Error {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} not found: ${id}` : `${entity} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class StaleUpdateError extends Error {
  constructor(entity: string, id: string) {
    super(`Stale or missing ${entity}: ${id}`);
    this.name = "StaleUpdateError";
  }
}

export class InsertFailedError extends Error {
  constructor(entity: string) {
    super(`Insert failed: no ${entity} row returned`);
    this.name = "InsertFailedError";
  }
}
