// Round 16: a paid course whose access ended with its academic period. Thrown
// by services/lessons.ts and services/courses.ts instead of letting a bare
// 403 ACCESS_EXPIRED fall through to the generic/sequential-access handling,
// so callers can show "Access ended — Renew" instead of a wrong message.
export class AccessExpiredError extends Error {
  code = "ACCESS_EXPIRED" as const;

  constructor(message: string = "Your access to this course has ended.") {
    super(message);
    this.name = "AccessExpiredError";
    Object.setPrototypeOf(this, AccessExpiredError.prototype);
  }
}
