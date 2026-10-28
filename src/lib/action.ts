export type ActionState = { error?: string; ok?: string; url?: string } | undefined;

export const fail = (error: string): ActionState => ({ error });

export function formString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function safeNext(next: string | null | undefined): string {
  // Only allow same-site relative paths to prevent open redirects.
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

/** Like formString but without trimming (for passwords and secrets). */
export function formRaw(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}
