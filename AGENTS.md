# AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/<feature>/` — no remote tracker. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles are used as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: a root `CONTEXT.md` plus `docs/adr/` for ADRs. See `docs/agents/domain.md`.

## Commits

When the work for a request is done, commit it on `main` before the turn ends. A commit made on another branch is merged into `main` in that same turn. Stage only the files that belong to the change. Push only when the user asks.

## React Native Testing Library in this project

This project uses `@testing-library/react-native` v14. Its APIs and testing conventions can differ from your training data (render and queries are async; use `screen`). Before writing or changing RNTL tests, read the relevant guide in `node_modules/@testing-library/react-native/docs/`, starting with `node_modules/@testing-library/react-native/docs/guides/llm-guidelines.md`. Prefer those package docs over stale assumptions, and follow deprecation notices.
