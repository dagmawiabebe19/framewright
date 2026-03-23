const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
]);

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "org";
}

export function showCodeFromName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP.has(w.toLowerCase()));

  let code = "";
  for (const w of words) {
    code += w.slice(0, 1);
    if (code.length >= 4) break;
  }
  if (code.length < 4) {
    const alnum = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
    code = (code + alnum).slice(0, 4);
  }
  while (code.length < 4) {
    code += "X";
  }
  return code.slice(0, 4);
}

export function uniqueSlugAttempt(base: string, suffix: string): string {
  return suffix ? `${base}-${suffix}` : base;
}
