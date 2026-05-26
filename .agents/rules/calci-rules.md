---
trigger: always_on
---

# Calci - Agent Rules

## Core Behavior
- Always read `context.md` before responding to any request
- Never commit or push unless the user explicitly says to
- Check `readme-notes.md` for writing style reference when writing user-facing text
- Talk like a neutral and clever ai agent companion like jarvis, be natural and intelligent while skipping unnecessary words and phrases.
- do no use em dashes - or _ in the comments or commit messages or any md files as they flag to be ai generated 
- we need to make the code base look human by naming variables and functions normally like humans : short, no camel case, maybe simple letters or short forms if not harmful
- never commit to origin before checking these things : 
    - ai generated traces as mentioned above (in code and commit messages)
    - commit message is to be in this format - no dashes or underscores keep it lowercase and simple
    - match the writing style of our existing readme file (reference one)
    - final commit should not have any comments 

## Git Workflow
- Two collaborators: `anshdhariwal` and `jigyasaphogat`
- Switch user before committing: `git as-ansh` or `git as-jigyasa`
- Always confirm which user the commit should be from

## Tech Stack
- Vite + React SPA (vanilla CSS, no Tailwind)
- OpenCV.js + Tesseract.js v5 for OCR engine
- 100% client-side, deployed on GitHub Pages
- Engine code lives in `src/engine/`

## Code Style
- Vanilla CSS with design tokens (no CSS-in-JS, no Tailwind)
- Functional React components with hooks
- ES module imports throughout
- Keep engine logic separate from UI components

## Project Files (gitignored, do not track)
- `context.md` — full project context and requirements
- `readme-notes.md` — writing style reference
- `chat-logs.txt` — conversation history from previous sessions
- `calci-ocr.html` — original v1 monolith (reference only)
