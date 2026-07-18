import { readFileSync } from "fs";

const input = readFileSync(0, "utf8");
const map = new Map();
let hadError = false;

for (const line of input.split("\n")) {
  const match = line.match(/^(.+)\(\d+,\d+\): error (TS\d+):/);
  if (match) {
    if (!map.has(match[1])) map.set(match[1], new Set());
    map.get(match[1]).add(match[2]);
    hadError = true;
  } else if (/error TS\d+/.test(line)) {
    // Global/config errors (no file(line,col) anchor) still fail the check.
    console.log(line.trim());
    hadError = true;
  }
}

for (const [file, codes] of map) {
  console.log(`${file}: ${[...codes].join(", ")}`);
}

if (hadError) process.exitCode = 1;
