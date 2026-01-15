/**
 * Recursively masks secrets in objects to prevent accidental logging.
 * 
 * Masks keys (case-insensitive):
 * - password
 * - token
 * - cookie
 * - authorization
 * - secret
 * - session
 * 
 * Does not break types - returns the same structure with masked values.
 * 
 * @param input - The value to mask secrets in
 * @returns The input with secrets masked (value replaced with "***")
 */
export function maskSecrets(input: unknown): unknown {
  // Primitive types: return as-is
  if (input === null || input === undefined) {
    return input;
  }
  
  if (typeof input !== "object") {
    return input;
  }
  
  // Arrays: recursively process each element
  if (Array.isArray(input)) {
    return input.map((item) => maskSecrets(item));
  }
  
  // Objects: recursively process each property
  const obj = input as Record<string, unknown>;
  const masked: Record<string, unknown> = {};
  
  const secretKeys = ["password", "token", "cookie", "authorization", "secret", "session"];
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSecret = secretKeys.some((secretKey) => keyLower.includes(secretKey));
    
    if (isSecret) {
      masked[key] = "***";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSecrets(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}