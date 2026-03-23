export function getIp(request: {
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}): string {
  return (
    (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? request.ip ?? "unknown"
  );
}
