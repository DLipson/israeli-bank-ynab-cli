import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Parse a .env file into key-value pairs.
 * Preserves awareness of comments and blank lines for rewriting.
 */
export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }
  const content = readFileSync(path, "utf-8");
  const vars: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

/**
 * Write/update specific keys in a .env file, preserving comments and structure.
 * Only the keys in `updates` are changed; everything else stays the same.
 */
export function writeEnvFile(path: string, updates: Record<string, string>): void {
  let lines: string[] = [];

  if (existsSync(path)) {
    const content = readFileSync(path, "utf-8");
    lines = content.split(/\r?\n/);
  }

  const remaining = { ...updates };

  // Update existing lines
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (key in remaining) {
      lines[i] = `${key}=${remaining[key]}`;
      delete remaining[key];
    }
  }

  // Append any new keys not found in existing file
  for (const [key, value] of Object.entries(remaining)) {
    lines.push(`${key}=${value}`);
  }

  writeFileSync(path, lines.join("\n"), "utf-8");
}

/**
 * Clear specific keys in a .env file (set them to empty string).
 */
export function clearEnvVars(path: string, keys: string[]): void {
  const updates: Record<string, string> = {};
  for (const key of keys) {
    updates[key] = "";
  }
  writeEnvFile(path, updates);
}
