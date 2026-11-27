import fs from "fs";

const k1 = fs.readFileSync("src/nwscript/NWScriptDefK1.ts", "utf8");
const re = /(\d+):\s*\{([\s\S]*?)\n  \},/g;
const stubs = [];
let m;
while ((m = re.exec(k1))) {
  const body = m[2];
  const name = body.match(/name:\s*"([^"]+)"/);
  if (!name) continue;
  const hasAction = /action:\s*(?:async\s*)?(?:function|\()/.test(body);
  if (!hasAction) stubs.push([Number(m[1]), name[1]]);
}
fs.writeFileSync(
  "tmp-stubs.txt",
  stubs.map(([i, n]) => `${i}\t${n}`).join("\n") + "\n",
  "utf8"
);
console.log("count", stubs.length);
