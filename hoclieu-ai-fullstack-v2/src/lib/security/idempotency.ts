import crypto from "crypto";

export function createIdempotencyKey(parts: (string | number)[]): string {
  const raw = parts.join(":");
  return crypto.createHash("sha256").update(raw).digest("hex");
}
