/**
 * Sanitizes a next URL parameter to prevent open redirect vulnerabilities.
 * 
 * Security rules:
 * - Only allows strings starting with "/"
 * - Rejects "//" (protocol-relative URLs)
 * - Rejects "\" (backslashes)
 * - Rejects protocol schemes like "http:", "javascript:", "data:"
 * - Handles URL decoding with try/catch and rejects encoded "//" (%2F%2F...)
 * 
 * @param next - The next URL parameter to sanitize
 * @returns Sanitized relative path or null if invalid
 */
export function sanitizeNextUrl(next: string | null | undefined): string | null {
  // null/empty -> null
  if (!next) return null;
  
  const trimmed = next.trim();
  if (!trimmed) return null;
  
  // Must start with "/" (relative path only)
  if (!trimmed.startsWith("/")) return null;
  
  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith("//")) return null;
  
  // Reject backslashes (Windows paths or encoded separators)
  if (trimmed.includes("\\")) return null;
  
  // Reject protocol schemes: check for ":" before first "/"
  // This catches http:, https:, javascript:, data:, etc.
  const firstSlashIndex = trimmed.indexOf("/");
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex !== -1 && (firstSlashIndex === -1 || colonIndex < firstSlashIndex)) {
    return null;
  }
  
  // Handle URL-encoded attacks: decode and check for "//"
  try {
    const decoded = decodeURIComponent(trimmed);
    // Check if decoded value contains "//" (after decoding %2F%2F)
    if (decoded.includes("//")) return null;
    // Also check for backslash in decoded value
    if (decoded.includes("\\")) return null;
    // Check for protocol in decoded value
    const decodedFirstSlash = decoded.indexOf("/");
    const decodedColon = decoded.indexOf(":");
    if (decodedColon !== -1 && (decodedFirstSlash === -1 || decodedColon < decodedFirstSlash)) {
      return null;
    }
  } catch {
    // Invalid encoding, reject
    return null;
  }
  
  // Additional check: reject if contains encoded "//" in original string
  // This catches %2F%2F, %2f%2f (case variations)
  if (trimmed.includes("%2F%2F") || trimmed.includes("%2f%2f")) return null;
  
  return trimmed;
}