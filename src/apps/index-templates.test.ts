import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("HTML templates", () => {
  test("include runtime-config.js", () => {
    const files = [
      "src/apps/launcher/index.html",
      "src/apps/game/index.html",
      "src/apps/forge/index.html",
      "src/apps/debugger/index.html",
    ];

    for (const file of files) {
      const html = read(file);
      expect(html).toContain("runtime-config.js");
    }
  });
});


