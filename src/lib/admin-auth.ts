export function isAdminAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const expected = process.env.ADMIN_SECRET;
  return !!(expected && key === expected);
}
