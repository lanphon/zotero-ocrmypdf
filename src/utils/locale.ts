// Minimal locale helper to satisfy build in this environment
export function getString(key: string): string {
  // In a real plugin this would look up localized strings.
  // For the purposes of building, return the key as a fallback.
  return key;
}
