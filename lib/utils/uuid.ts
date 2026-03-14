/**
 * Checks if a given string is a valid v4 UUID format.
 * Returns true if valid, false otherwise.
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Fallback to a broader UUID regex in case the database generates non-v4 UUIDs 
  // (though defaultRandom() typically generates v4)
  const uuidGenercRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidV4Regex.test(id) || uuidGenercRegex.test(id);
}
