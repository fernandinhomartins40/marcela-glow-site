const fs = require("fs");
const path = require("path");

const roots = ["apps", "packages"];
const extensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".ts",
  ".tsx",
]);

const ignoredDirs = new Set([".turbo", "dist", "node_modules"]);

const mojibakePatterns = [
  { label: "UTF-8 read as Windows-1252 marker", regex: /\u00c3[\u0080-\u00bf]/ },
  { label: "extra Windows-1252 marker", regex: /\u00c2[\u0080-\u00bf]/ },
  { label: "smart punctuation mojibake", regex: /\u00e2[\u0080-\u00bf]/ },
  { label: "replacement character", regex: /\ufffd/ },
];

const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;

    const text = fs.readFileSync(fullPath, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      const match = mojibakePatterns.find((pattern) => pattern.regex.test(line));
      if (match) {
        findings.push({
          file: fullPath,
          line: index + 1,
          label: match.label,
          text: line.trim(),
        });
      }
    });
  }
}

roots.forEach(walk);

if (findings.length > 0) {
  console.error("Encoding check failed. Possible mojibake found:");
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line} - ${finding.label}: ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Encoding check passed.");
