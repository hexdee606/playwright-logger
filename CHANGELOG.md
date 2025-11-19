# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-11-20

### Added
- ✅ Final-summary reporter with compact runtime output and single, well-structured final summary.
- 🔎 Enhanced locator extraction: robust parsing from step titles and attachments (`css`, `xpath`, `text`, `id`, `role`).
- 🧩 Best-effort locator chooser for tests and failures (attachments → title parsing fallback).
- 🧭 Timezone-aware timestamps configurable via reporter options or env vars.
- ⚙️ Reporter options supported from `playwright.config.ts` (verbosity, timezone, jsonPath, printErrorsImmediate).
- 📝 Optional JSON summary output for CI ingestion (configurable path).
- 📎 Attachment file listing in final summary with relative paths.
- 🐛 TypeScript improvements: explicit return types, safer recursion, defensive parsing.
- 🧪 Verbosity levels (0 | 1 | 2) including verbose step logs when enabled.
- 🧭 Fixture guidance included for optional runtime locator capture (monkey-patch `page.locator()`).

### Changed
- ♻️ Refactored runtime output: compact one-line per-test messages and deferred detailed failures to final summary.
- 🧰 Replaced the earlier prototype reporter with a robust, typed reporter implementation `src/reporter.ts`.
- 🛡️ TTY-aware color output; plain-text fallback for non-TTY CI pipelines.
---

## [0.0.1] - 2025-04-19

### Added
- ✅ Initial public release
- 🧩 CLI-friendly log output with consistent tags
- 🧠 Stack trace + error parsing
- 📁 Location info for steps and scenarios
- 📎 Attachment display support
- 🕒 Formatted timestamps using timezone
