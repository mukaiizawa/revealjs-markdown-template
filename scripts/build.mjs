import fs from "node:fs";
import path from "node:path";

const slidesDir = "slides";
const distDir = "dist";
const configPath = "config.json";
const indexTemplatePath = "template/index.template.html";

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

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const slideFiles = collectMarkdownFiles(slidesDir);

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const indexTemplate = fs.readFileSync(indexTemplatePath, "utf-8");

function serializeRevealOptions(revealOptions) {
  const entries = Object.entries(revealOptions).map(([key, value]) => {
    if (key === "plugins") {
      return `  plugins: [${value.join(", ")}]`;
    }

    return `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  });

  return `{\n${entries.join(",\n")}\n}`;
}

const combined = slideFiles
  .map((filePath) => {
    return fs.readFileSync(filePath, "utf-8");
  })
  .join("\n\n---\n\n");

const indexHtml = indexTemplate
  .replaceAll("{{LANG}}", config.lang)
  .replaceAll("{{TITLE}}", config.title)
  .replaceAll("{{CDN_REVEAL_CSS}}", config.cdn.revealCss)
  .replaceAll("{{CDN_HIGHLIGHT_CSS}}", config.cdn.highlightCss)
  .replaceAll("{{CDN_REVEAL_JS}}", config.cdn.revealJs)
  .replaceAll("{{CDN_MARKDOWN_PLUGIN}}", config.cdn.markdownPlugin)
  .replaceAll("{{CDN_HIGHLIGHT_PLUGIN}}", config.cdn.highlightPlugin)
  .replaceAll("{{REVEAL_OPTIONS_JSON}}", serializeRevealOptions(config.reveal));

fs.writeFileSync(path.join(distDir, "slides.md"), combined);
fs.writeFileSync(path.join(distDir, "index.html"), indexHtml);
copyDirectory("assets", path.join(distDir, "assets"));

console.log("Built dist/");
