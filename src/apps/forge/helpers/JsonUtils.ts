/**
 * JSON utilities ported from Holocron Toolset (toolset/data/me_controls.py).
 * Strip JavaScript-style comments from JSON text for config/JSON-with-comments parsing.
 */

/**
 * Strip JavaScript-style comments from JSON text.
 * Handles both single-line (//) and multi-line (/* *\/) comments while preserving strings and escapes.
 */
export function stripJsonComments(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    const newLine: string[] = [];
    let i = 0;
    let inString = false;
    let escapeNext = false;

    while (i < line.length) {
      const char = line[i];

      if (escapeNext) {
        newLine.push(char);
        escapeNext = false;
        i += 1;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        newLine.push(char);
        i += 1;
        continue;
      }

      if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inString = !inString;
      }

      if (!inString) {
        if (char === "/" && i + 1 < line.length && line[i + 1] === "/") {
          break;
        }
        if (char === "/" && i + 1 < line.length && line[i + 1] === "*") {
          i += 2;
          while (i + 1 < line.length) {
            if (line[i] === "*" && line[i + 1] === "/") {
              i += 2;
              break;
            }
            i += 1;
          }
          continue;
        }
      }

      newLine.push(char);
      i += 1;
    }

    result.push(newLine.join(""));
  }

  return result.join("\n");
}
