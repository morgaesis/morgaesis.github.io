import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const includeDrafts = args.has("--include-drafts");
const blogDir = fileURLToPath(new URL("../blog/", import.meta.url));

const hardPhrases = [
  /\bit'?s\s+not\s+[^.!?]{0,120}\bit'?s\b/i,
  /\bnot\s+[^.!?]{0,120}\bbut\b/i,
  /\bnot\s+[^.!?]{0,120}\brather than\b/i,
  /\bnot\s+[^.!?]{0,80}[.!?]\s+(it|this|that)\s+(is|was|means)\b/i,
  /\bkey takeaway\b/i,
  /\bin conclusion\b/i,
  /\bat the end of the day\b/i,
  /\bgame[- ]changer\b/i,
  /\bseamless(?:ly)?\b/i,
  /\brobust\b/i,
  /\bdelve\b/i,
];

const softPhrases = [
  /\bthis is where\b/i,
  /\bthat is why\b/i,
  /\bthe point is\b/i,
  /\bthe answer is\b(?!\s+wrong\b)/i,
  /\bthe solution is\b/i,
  /\bthe trap is\b/i,
  /\bthe rule is\b/i,
];

const files = readdirSync(blogDir)
  .filter((file) => file.endsWith(".md"))
  .sort();

const findings = [];
const warnings = [];

for (const file of files) {
  const path = join(blogDir, file);
  const source = readFileSync(path, "utf8");
  const { body, frontmatter } = splitFrontmatter(source);

  if (!includeDrafts && /^\s*draft:\s*true\s*$/im.test(frontmatter)) {
    continue;
  }

  const text = stripNonProse(body);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph, index) => {
    const where = `${file} paragraph ${index + 1}`;
    const words = wordCount(paragraph);
    const footnotes = paragraph.match(/\[\^[^\]]+\]/g)?.length ?? 0;
    const commas = (paragraph.match(/,/g) ?? []).length;
    const semicolons = (paragraph.match(/;/g) ?? []).length;

    if (words > 130) {
      findings.push([where, `paragraph is ${words} words; split or cut it`]);
    } else if (words > 95) {
      warnings.push([where, `paragraph is ${words} words; check reader load`]);
    }

    if (footnotes >= 3) {
      findings.push([where, `citation pile has ${footnotes} footnotes; use one source and make the operational point`]);
    }

    if (commas + semicolons >= 8) {
      warnings.push([where, `list rhythm has ${commas} commas and ${semicolons} semicolons; check whether one example would be kinder`]);
    }

    for (const pattern of hardPhrases) {
      if (pattern.test(paragraph)) {
        findings.push([where, `hard AI-tell phrase: "${excerpt(paragraph)}"`]);
        break;
      }
    }

    const shouldCount = (paragraph.match(/\bshould\b/gi) ?? []).length;
    if (shouldCount >= 3) {
      warnings.push([where, `"should" appears ${shouldCount} times; consider a concrete actor or command`]);
    }

    for (const pattern of softPhrases) {
      if (pattern.test(paragraph)) {
        warnings.push([where, `soft bridge phrase: "${excerpt(paragraph)}"`]);
        break;
      }
    }
  });
}

if (warnings.length > 0) {
  console.log("Writing review warnings:");
  for (const [where, message] of warnings) {
    console.log(`- ${where}: ${message}`);
  }
}

if (findings.length > 0) {
  console.error("Writing review failed:");
  for (const [where, message] of findings) {
    console.error(`- ${where}: ${message}`);
  }
  process.exit(1);
}

console.log("Writing review passed.");

function splitFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: "", body: source };
  }
  return {
    frontmatter: match[1],
    body: source.slice(match[0].length),
  };
}

function stripNonProse(source) {
  const lines = source.split(/\r?\n/);
  const kept = [];
  let inFence = false;
  let inFigure = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^<figure\b/i.test(trimmed)) {
      inFigure = true;
      continue;
    }
    if (inFigure) {
      if (/<\/figure>/i.test(trimmed)) {
        inFigure = false;
      }
      continue;
    }

    if (/^\[\^/.test(trimmed)) continue;
    if (/^</.test(trimmed)) continue;
    if (/^---$/.test(trimmed)) continue;

    kept.push(line.replace(/`([^`]+)`/g, "$1"));
  }

  return kept.join("\n");
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function excerpt(text) {
  return text.length <= 130 ? text : `${text.slice(0, 127)}...`;
}
