import fs from "node:fs";
import path from "node:path";

const slidesDir = "slides";
const configPath = "config.json";
const slideNamePattern = /^(\d{2})_(\d{2})_[a-z0-9]+(?:_[a-z0-9]+)*\.md$/;
const requiredCdnKeys = [
  "revealCss",
  "highlightCss",
  "revealJs",
  "markdownPlugin",
  "highlightPlugin"
];

const errors = [];

function addError(message) {
  errors.push(message);
}

function collectMarkdownFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .sort((left, right) => left.name.localeCompare(right.name));

  return [
    ...directories.flatMap((entry) => {
      return collectMarkdownFiles(path.join(directory, entry.name));
    }),
    ...files.map((entry) => path.join(directory, entry.name))
  ];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isExternalReference(target) {
  return /^(?:[a-z]+:)?\/\//i.test(target) || target.startsWith("#");
}

function stripFragmentAndQuery(target) {
  return target.split("#")[0].split("?")[0];
}

function resolveAssetPath(slidePath, target) {
  if (target.startsWith("assets/")) {
    return path.resolve(target);
  }

  return path.resolve(path.dirname(slidePath), target);
}

function validateConfig() {
  if (!fs.existsSync(configPath)) {
    addError(`${configPath} does not exist`);
    return;
  }

  let config;

  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    addError(`${configPath} is not valid JSON: ${error.message}`);
    return;
  }

  if (!isNonEmptyString(config.title)) {
    addError(`${configPath}: title must be a non-empty string`);
  }

  if (!isNonEmptyString(config.lang)) {
    addError(`${configPath}: lang must be a non-empty string`);
  }

  if (!config.cdn || typeof config.cdn !== "object" || Array.isArray(config.cdn)) {
    addError(`${configPath}: cdn must be an object`);
  } else {
    for (const key of requiredCdnKeys) {
      if (!isNonEmptyString(config.cdn[key])) {
        addError(`${configPath}: cdn.${key} must be a non-empty string`);
      }
    }
  }

  if (!config.reveal || typeof config.reveal !== "object" || Array.isArray(config.reveal)) {
    addError(`${configPath}: reveal must be an object`);
  } else {
    if (!isPositiveNumber(config.reveal.width)) {
      addError(`${configPath}: reveal.width must be a positive number`);
    }

    if (!isPositiveNumber(config.reveal.height)) {
      addError(`${configPath}: reveal.height must be a positive number`);
    }
  }
}

function validateSlideFiles() {
  if (!fs.existsSync(slidesDir)) {
    addError(`${slidesDir} does not exist`);
    return [];
  }

  const files = collectMarkdownFiles(slidesDir);

  if (files.length === 0) {
    addError(`${slidesDir} must contain at least one Markdown file`);
    return [];
  }

  const chapters = new Map();
  const seenSlideNumbers = new Set();

  for (const filePath of files) {
    const relativePath = path.relative(slidesDir, filePath);
    const fileName = path.basename(filePath);
    const match = fileName.match(slideNamePattern);

    if (!match) {
      addError(`${relativePath}: invalid filename, expected NN_NN_slug.md`);
      continue;
    }

    const chapter = Number.parseInt(match[1], 10);
    const section = Number.parseInt(match[2], 10);
    const slideNumber = `${match[1]}_${match[2]}`;

    if (seenSlideNumbers.has(slideNumber)) {
      addError(`${relativePath}: duplicate slide number ${slideNumber}`);
      continue;
    }

    seenSlideNumbers.add(slideNumber);
    const sections = chapters.get(chapter) ?? [];
    sections.push(section);
    chapters.set(chapter, sections);
  }

  const chapterNumbers = [...chapters.keys()].sort((left, right) => left - right);

  for (let index = 0; index < chapterNumbers.length; index += 1) {
    const expectedChapter = index + 1;
    const actualChapter = chapterNumbers[index];

    if (actualChapter !== expectedChapter) {
      addError(`chapter numbering must be contiguous from 01: missing or misplaced ${String(expectedChapter).padStart(2, "0")}`);
      break;
    }
  }

  for (const chapter of chapterNumbers) {
    const sections = [...chapters.get(chapter)].sort((left, right) => left - right);

    for (let index = 0; index < sections.length; index += 1) {
      const expectedSection = index + 1;
      const actualSection = sections[index];

      if (actualSection !== expectedSection) {
        const chapterLabel = String(chapter).padStart(2, "0");
        const sectionLabel = String(expectedSection).padStart(2, "0");
        addError(`${chapterLabel}: section numbering must be contiguous from 01: missing or misplaced ${sectionLabel}`);
        break;
      }
    }
  }

  return files;
}

function validateSlideContent(files) {
  const markdownReferencePattern = /!?\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const htmlSourcePattern = /<(?:img|source)\b[^>]*\bsrc=["']([^"']+)["']/gi;

  for (const slidePath of files) {
    const relativePath = path.relative(slidesDir, slidePath);
    const content = fs.readFileSync(slidePath, "utf-8");

    if (!/^#{1,6}\s+\S/m.test(content)) {
      addError(`${relativePath}: must contain at least one Markdown heading`);
    }

    for (const pattern of [markdownReferencePattern, htmlSourcePattern]) {
      pattern.lastIndex = 0;

      for (const match of content.matchAll(pattern)) {
        const rawTarget = match[1];
        const target = stripFragmentAndQuery(rawTarget);

        if (!target || isExternalReference(target)) {
          continue;
        }

        const resolvedPath = resolveAssetPath(slidePath, target);

        if (!fs.existsSync(resolvedPath)) {
          addError(`${relativePath}: referenced asset does not exist: ${rawTarget}`);
        }
      }
    }
  }
}

validateConfig();
const slideFiles = validateSlideFiles();
validateSlideContent(slideFiles);

if (errors.length > 0) {
  console.error("Validation failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log("Validation complete");
