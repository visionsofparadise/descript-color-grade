import { readFileSync } from "fs";

const input = readFileSync(0, "utf8");
const map = new Map();

for (const line of input.split("\n")) {
  const match = line.match(/^(.+)\(\d+,\d+\): error (TS\d+):/);
  if (match) {
    if (!map.has(match[1])) map.set(match[1], new Set());
    map.get(match[1]).add(match[2]);
  }
}

for (const [file, codes] of map) {
  console.log(`${file}: ${[...codes].join(", ")}`);
}
