# 🎯 Playwright Logger — Human-friendly Test Reporter & Logger

> Clean, compact, professional terminal reporting for Playwright runs.  
> Compact runtime lines + single, well-formatted **FINAL SUMMARY**. No AI dependency — simple, fast, CI-friendly.

---

## Highlights

- ✅ Compact one-line per-test runtime output for fast scanning  
- ✅ Single **FINAL SUMMARY** block with totals and failure details (message, short stack excerpt, attachments, locator)  
- 🔎 Locator extraction from step titles and attachments (`css`, `xpath`, `text`, `id`, `role`)  
- ⚙️ Configurable via `playwright.config.ts` and environment variables  
- 📄 Optional JSON summary (`summary.json`) for CI dashboards  
- 🧭 Timezone-aware timestamps, TTY-aware color output, and plain-text fallback for CI  
- 🔐 Small, defensive TypeScript code with explicit types

---

## Install

```bash
npm install --save-dev @hexdee606/playwright-logger
# or
yarn add -D @hexdee606/playwright-logger
````

> Use the compiled `dist` reporter in CI. For local development you may point Playwright to the `.ts` source if you compile on the fly.

---

## Quick usage (playwright.config.ts)

```ts
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  reporter: [
    ['list'],
    [@hexdee606/playwright-logger, {
      verbosity: 1,                 // 0 | 1 | 2
      timezone: 'Asia/Kolkata',
      jsonPath: './reports/summary.json',
      printErrorsImmediate: false  // true prints full error blocks during the run
    }]
  ],
});
```

---

## Reporter options

You can configure either in `playwright.config.ts` or via environment variables. Config options take precedence over env vars.

### Config object (in `playwright.config.ts`)

|                    Key |       Type       |     Default    | Description                                                |
| ---------------------: | :--------------: | :------------: | ---------------------------------------------------------- |
|            `verbosity` |   `0 \| 1 \| 2`  |       `1`      | `0` = minimal, `1` = standard, `2` = verbose (shows steps) |
|             `timezone` |     `string`     | `Asia/Kolkata` | IANA timezone for timestamps                               |
|             `jsonPath` | `string \| null` |     `null`     | Optional path to write a JSON summary                      |
| `printErrorsImmediate` |     `boolean`    |     `false`    | Print full error blocks inline during run (legacy)         |

### Environment variables (fallback)

| Env                                          | Effect                          |   |    |
| -------------------------------------------- | ------------------------------- | - | -- |
| `PLAYWRIGHT_REPORTER_VERBOSITY`              | Override verbosity (0           | 1 | 2) |
| `PLAYWRIGHT_REPORTER_TIMEZONE`               | Override timezone               |   |    |
| `PLAYWRIGHT_REPORTER_JSON`                   | Path to JSON summary file       |   |    |
| `PLAYWRIGHT_REPORTER_PRINT_ERRORS_IMMEDIATE` | `1` to print errors immediately |   |    |

---

## Locator extraction behavior

The reporter tries to show a locator for steps and failures using this priority:

1. **Step attachments** named `locator`, `selector`, `sel` — reporter reads and parses body.
2. **Parsed from step title** — recognizes Playwright's `[selector: ...]` as well as `css=...`, `xpath=...`, quoted selectors, simple CSS candidates.
3. **Fallback** — no locator shown.

This strategy makes the reporter compatible with plain Playwright steps and many BDD runners (Cucumber, Mocha wrappers) where selectors are included in step text or attachments.

---

## Fixture guidance (optional) — capture runtime locators

For guaranteed runtime selectors (especially useful for Cucumber and custom runners), add an optional fixture patch that:

* monkey-patches `page.locator()` to record selectors used at runtime (non-breaking)
* exposes `log.recordLocator(selector)` for step code to call explicitly
* attaches a `locators.txt` file at test teardown for post-mortem

**Pseudo example to include in your `fixtures.ts`:**

```ts
// inside your log fixture (pseudo)
const locatorCalls: Array<{ selector: string; ts: number }> = [];
const originalLocator = page.locator.bind(page);
(page as any).locator = function patchedLocator(selector: any, ...args: any[]) {
  try {
    const sel = typeof selector === 'string' ? selector : String(selector);
    locatorCalls.push({ selector: sel, ts: Date.now() });
  } catch {}
  return originalLocator(selector, ...args);
};

// expose helper for step code (useful for Cucumber)
(logger as any).recordLocator = (selector: string) => locatorCalls.push({ selector, ts: Date.now() });

// on teardown attach locators file
if (locatorCalls.length) {
  const file = path.join(outDir, `locators-${Date.now()}.txt`);
  fs.writeFileSync(file, locatorCalls.map(c => `${new Date(c.ts).toISOString()} ${c.selector}`).join('\n'), 'utf8');
  await testInfo.attach('locators.txt', { path: file, contentType: 'text/plain' });
}
```

The fixture is **optional** — reporter already parses selectors from step titles and attachments.

---

## Example terminal output

**During run (compact):**

```
[*] 2025-11-20T12:25:31 Run started | Playwright: v1.56.1 | Projects: 1 | Tests: 2
RUN     sample test - pass [suit1] (sample.spec.ts:3)
✓ sample test - pass (2621ms)
RUN     sample test - failed [suit1] (sample.spec.ts:8)
✖ sample test - failed (2837ms)
```

**Final summary:**

```
────────────────────────────────────────────────────────────
FINAL SUMMARY | Status: failed | Total run time: 7s
Totals — total: 2   passed: 1   failed: 1   skipped: 0   timedOut: 0   interrupted: 0

Failures (1):
1. sample test - failed [failed] (2837ms)  locator=css=div.header (css)
   → Error: expect(received).toContain(expected) // indexOf
     Expected substring: "Facebook – log in or sign up"
     Received string:    "X. It’s what’s happening / X"
     at test/tests/sample.spec.ts:10:32
     Attachment: screenshot (test/outputs/...png)
────────────────────────────────────────────────────────────
```

---

## JSON summary format (example)

If `jsonPath` is set, the reporter writes:

```json
{
  "status": "failed",
  "startTime": "2025-11-20T12:25:31.000Z",
  "duration": 7019,
  "totals": { "total": 2, "passed": 1, "failed": 1, "skipped": 0, "timedOut": 0, "interrupted": 0 },
  "failures": [
    {
      "title": "sample test - failed",
      "status": "failed",
      "message": "...",
      "stack": "...",
      "locator": "css=div.header",
      "locatorType": "css",
      "attachments": [{ "name": "screenshot", "path": "..." }]
    }
  ],
  "tests": [ /* per-test summaries */ ]
}
```

---

## Troubleshooting

* **No logs appear** — ensure `playwright.config.ts` includes this reporter and path is correct.
* **Reporter not loaded** — ensure reporter path in `reporter` array points to file/module exported as default.
* **Selectors missing** — add optional fixture monkey-patch or call `log.recordLocator(selector)` from step code.
* **Colors broken in CI** — color is TTY-aware; non-TTY output will be plain text but still structured.

---

## Contributing & Tests

* Fork → branch → PR. Include unit tests for locator parsing helpers (`parseLocatorFromString`) and reporter hooks.
* Build TypeScript to `dist` for CI.
* Tests should mock Playwright reporter hooks (`onTestEnd`, `onStepEnd`) and assert console output and produced JSON summary.

---

## Changelog

See `CHANGELOG.md` in the repo.

---

## License & Author

**MIT** — Dipen Chavan (hexdee606)
GitHub: [https://github.com/hexdee606](https://github.com/hexdee606)