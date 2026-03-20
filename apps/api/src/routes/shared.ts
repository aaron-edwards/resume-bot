export const SESSION_COOKIE = "session-id";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function cookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function getIp(request: {
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}): string {
  return (
    (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? request.ip ?? "unknown"
  );
}
