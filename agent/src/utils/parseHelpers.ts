export function stripNonJsonPrefix(text: string): string {
  const firstBrace = text.search(/[{[]/);
  if (firstBrace === -1) return text;
  return text.slice(firstBrace);
}
