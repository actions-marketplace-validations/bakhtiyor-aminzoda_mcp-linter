/**
 * ANSI styling with the two escape hatches everyone expects: NO_COLOR and a
 * non-TTY stream. A CI log should never contain colour codes.
 */
export interface Palette {
  readonly enabled: boolean;
  bold(text: string): string;
  dim(text: string): string;
  red(text: string): string;
  yellow(text: string): string;
  blue(text: string): string;
  green(text: string): string;
  cyan(text: string): string;
}

const CODES = {
  reset: "\u001B[0m",
  bold: "\u001B[1m",
  dim: "\u001B[2m",
  red: "\u001B[31m",
  green: "\u001B[32m",
  yellow: "\u001B[33m",
  blue: "\u001B[34m",
  cyan: "\u001B[36m",
} as const;

export function createPalette(options: { color: boolean; isTty: boolean }): Palette {
  const enabled = options.color && options.isTty && process.env["NO_COLOR"] === undefined;

  const paint = (code: string) => (text: string): string =>
    enabled ? `${code}${text}${CODES.reset}` : text;

  return {
    enabled,
    bold: paint(CODES.bold),
    dim: paint(CODES.dim),
    red: paint(CODES.red),
    yellow: paint(CODES.yellow),
    blue: paint(CODES.blue),
    green: paint(CODES.green),
    cyan: paint(CODES.cyan),
  };
}
