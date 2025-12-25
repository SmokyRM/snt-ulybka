const PUBLIC_ROUTES = ["/", "/docs", "/electricity", "/fees", "/contacts", "/login"] as const;
const USER_PREFIXES = ["/cabinet"] as const;
const ADMIN_PREFIXES = ["/admin"] as const;

const startsWithPrefix = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => pathname.startsWith(prefix));

const isPublicPath = (pathname: string): boolean => PUBLIC_ROUTES.includes(pathname as typeof PUBLIC_ROUTES[number]);

const isUserPath = (pathname: string): boolean => startsWithPrefix(pathname, USER_PREFIXES);

const isAdminPath = (pathname: string): boolean => startsWithPrefix(pathname, ADMIN_PREFIXES);

export { PUBLIC_ROUTES, USER_PREFIXES, ADMIN_PREFIXES, isPublicPath, isUserPath, isAdminPath };
