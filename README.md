# revealjs-markdown-template

A template for building Reveal.js presentations from Markdown files.

## Requirements

- Node.js `>=20`
- npm

## Quick Start

```bash
npm install
npm start
```

`npm start` runs validation, builds `dist/`, and starts a local preview server.

## Directory Layout

```text
.
├── assets/
├── config.json
├── scripts/
├── slides/
├── template/
└── dist/
```

- `slides/`: Markdown slides. One file maps to one slide.
- `assets/`: Theme CSS and local images or supporting files.
- `template/`: HTML template used to generate the final presentation page.
- `scripts/`: Build and validation scripts.
- `dist/`: Generated output.

## Slide Rules

- Keep a one-file-to-one-slide structure.
- Name slide files as `NN_NN_slug.md`.
- Use `slides/` subdirectories when it helps organize larger decks.
- Build order is:
  - directory name order
  - then file name order within each directory
- All slide files are merged into a single `dist/slides.md`.

Example:

```text
slides/
├── 01_intro/
│   ├── 01_01_title.md
│   └── 01_02_scope.md
├── 02_details/
│   └── 02_01_architecture.md
└── 99_01_appendix.md
```

## Assets

- Put local images and supporting files under `assets/`.
- Reference them from slide Markdown with paths like `assets/example.svg`.
- `assets/` is copied into `dist/assets/` during build.

## Configuration

Presentation settings live in `config.json`.

Current responsibilities:

- document title
- HTML `lang`
- Reveal.js CDN URLs
- Reveal.js initialization options

Example:

```json
{
  "title": "Reveal Presentation",
  "lang": "ja",
  "reveal": {
    "hash": true,
    "slideNumber": true,
    "width": 1600,
    "height": 900,
    "plugins": ["RevealMarkdown", "RevealHighlight"]
  }
}
```

## Available Scripts

- `npm run validate`: Validate `config.json` and slide files.
- `npm run build`: Build `dist/index.html`, `dist/slides.md`, and `dist/assets/`.
- `npm run preview`: Serve the generated `dist/` directory locally.
- `npm run all`: Run `validate`, `build`, and `preview` in sequence.
- `npm start`: Alias for `npm run all`.

## Validation

The validator fails on invalid project state.

Current checks include:

- `config.json` exists and contains required fields
- `slides/` exists and contains at least one Markdown file
- slide file names follow `NN_NN_slug.md`
- chapter and section numbering are contiguous
- duplicate slide numbers are rejected
- each slide contains at least one Markdown heading
- referenced local assets exist

## Output

The build generates:

- `dist/index.html`
- `dist/slides.md`
- `dist/assets/`

`dist/` is recreated on every build.

## Template Workflow

This repository is intended to be used as a single-presentation repository template.

A typical workflow is:

1. Clone or copy the template into a new working directory.
2. Edit `config.json`.
3. Replace the sample slides under `slides/`.
4. Add any required local assets under `assets/`.
5. Run `npm start` while editing.
