# Issue tracker: Local Markdown

Issues and specs for this repository live as Markdown files in `.scratch/` until a remote issue tracker is configured.

## Conventions

- Use one directory per feature: `.scratch/<feature-slug>/`.
- Store the feature specification in `.scratch/<feature-slug>/spec.md`.
- Store implementation tickets in `.scratch/<feature-slug>/issues/`, with one numbered Markdown file per ticket.
- Record triage state with a `Status:` line near the top of the file.
- Append discussion history under a `## Comments` heading when needed.

## Publishing

When a skill says to publish to the issue tracker, create or update the corresponding Markdown file under `.scratch/`.

This repository currently has no Git remote. Replace this configuration when the project adopts GitHub, GitLab, or another tracker.
