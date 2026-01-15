/**
 * Verifies that the request origin/referer matches the host to prevent CSRF attacks.
 * 
 * Logic:
 * - Origin/Referer must match Host (including port if specified)
 * - If Origin is missing, returns ok=false (for dangerous endpoints)
 * 
 * @param req - The incoming request
 * @returns Object with ok boolean and optional reason string
 */
export function verifySameOrigin(req: Request): { ok: boolean; reason?: string } {
  const host = req.headers.get("host");
  if (!host) {
    return { ok: false, reason: "Missing host header" };
  }

  const origin = req.headers.get("origin") || req.headers.get("referer");
  
  // For dangerous endpoints, origin must be present
  if (!origin) {
    return { ok: false, reason: "Missing origin/referer header" };
  }

  try {
    // Parse origin/referer URL
    const originUrl = new URL(origin);
    const originHost = originUrl.hostname;
    const originPort = originUrl.port || null;

    // Parse host (may include port)
    const hostParts = host.split(":");
    const hostHostname = hostParts[0];
    const hostPort = hostParts[1] || null;

    // Compare hostnames (case-insensitive)
    if (originHost.toLowerCase() !== hostHostname.toLowerCase()) {
      return { ok: false, reason: `Origin hostname mismatch: ${originHost} vs ${hostHostname}` };
    }

    // Compare ports: if both are specified, they must match
    // If only one is specified, we compare:
    // - If origin has port but host doesn't: check if origin port is default (80 for http, 443 for https)
    // - If host has port but origin doesn't: check if host port is default
    // For simplicity, we require explicit match if both have ports
    if (originPort && hostPort) {
      if (originPort !== hostPort) {
        return { ok: false, reason: `Origin port mismatch: ${originPort} vs ${hostPort}` };
      }
    } else if (originPort && !hostPort) {
      // Origin has port, host doesn't - reject non-default ports
      const isDefaultPort = originPort === "80" || originPort === "443" || originPort === "";
      if (!isDefaultPort) {
        return { ok: false, reason: `Origin has non-default port ${originPort} but host has no port` };
      }
    } else if (!originPort && hostPort) {
      // Host has port, origin doesn't - reject non-default ports
      const isDefaultPort = hostPort === "80" || hostPort === "443" || hostPort === "";
      if (!isDefaultPort) {
        return { ok: false, reason: `Host has non-default port ${hostPort} but origin has no port` };
      }
    }
    // If both don't have ports, they match (default ports)

    return { ok: true };
  } catch {
    // Invalid origin URL
    return { ok: false, reason: `Invalid origin URL: ${origin}` };
  }
}
