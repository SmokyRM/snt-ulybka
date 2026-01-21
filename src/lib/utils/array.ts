/**
 * Normalizes a value to an array, ensuring it's always an array type.
 * Useful for defensive programming when dealing with potentially undefined or null values.
 *
 * @param value - The value to normalize (can be array, undefined, null, or any other type)
 * @returns An array - either the input if it's already an array, or an empty array
 *
 * @example
 * ```ts
 * const items = normalizeArray(possiblyUndefinedArray); // Always returns []
 * const safe = items[0] ?? null; // Safe to access
 * ```
 */
export function normalizeArray<T>(value: T[] | undefined | null | unknown): T[] {
  return Array.isArray(value) ? value : [];
}
