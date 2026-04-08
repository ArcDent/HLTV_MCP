export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function includesIgnoreCase(source: string | undefined, needle: string | undefined): boolean {
  if (!source || !needle) {
    return false;
  }

  return source.toLowerCase().includes(needle.toLowerCase());
}

export function equalsIgnoreCase(source: string | undefined, needle: string | undefined): boolean {
  if (!source || !needle) {
    return false;
  }

  return source.toLowerCase() === needle.toLowerCase();
}

export function truncate(input: string, maxLength: number): string {
  return input.length <= maxLength ? input : `${input.slice(0, maxLength - 1)}…`;
}

export function toTitle(input: string): string {
  if (!input) {
    return input;
  }

  return input.charAt(0).toUpperCase() + input.slice(1);
}
