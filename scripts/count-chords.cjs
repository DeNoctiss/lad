const fs = require("fs");
const content = fs.readFileSync("src/chordsDb.ts", "utf8");
const matches = content.match(/name:\s*"([^"]+)"/g) ?? [];
const names = new Set(matches.map((m) => m.match(/"([^"]+)"/)[1]));
console.log("Total positions:", matches.length);
console.log("Unique chord names:", names.size);
