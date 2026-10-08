# GitHub Copilot Repository Guidelines

## 1. Project Context & Stack

- **Framework:** Nest.js (App Router), TypeScript (strict mode enabled)
- **Styling:** Tailwind CSS + Radix UI primitives

## 2. Code Architecture & Conventions

- Maintain a modular folder structure:
  - `src/modules/<feature-name>/` -> Feature-specific components, hooks, and queries.
  - `src/components/ui/` -> Low-level, headless, or reusable design system primitives.
- Inspect `prisma/schema.prisma` when a task is related to the database to ensure the code matches the project's schema.
- Inspect `project-structure.md` to understand the project structure.
- If the prompt is just a question, simply answer without modifying any file.

## 3. Operational Boundaries for the Agent

- Keep responses concise: provide the target code modifications with brief explanations, not full boilerplate rewrites of untouched code.
- Never edit `pnpm-lock.yaml`, `.env*`, or production deployment manifests without explicit user direction.
- Before suggesting refactors, verify the existing design patterns in neighboring files.
