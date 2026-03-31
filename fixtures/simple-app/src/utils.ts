export function formatName(first: string, last: string): string {
  return `${first} ${last}`;
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-');
}
