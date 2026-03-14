/**
 * Thrown by service-layer functions when user-supplied data fails validation.
 * Actions catch this and return { error } to the client instead of crashing.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
