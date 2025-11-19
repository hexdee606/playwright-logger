/**
 * ./src/reporter.ts
 *
 * Pro-level reporter:
 *  - compact runtime output
 *  - single, well-structured final summary at the end
 *  - optional AI summarization
 *  - locator extraction (xpath|css|id|text|role) from step titles & attachments
 *
 * Controls:
 *  - PLAYWRIGHT_REPORTER_VERBOSITY = 0|1|2 (default 1)
 *  - PLAYWRIGHT_REPORTER_PRINT_ERRORS_IMMEDIATE = 1 to print full error inline (legacy)
 *  - PLAYWRIGHT_REPORTER_JSON = ./reports/summary.json to write machine summary
 *  - PLAYWRIGHT_REPORTER_AI_SUMMARIZE = 1 to attempt AI summary (requires ai module & keys)
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
  TestError,
  Suite,
  FullConfig,
  FullResult,
  Location,
  TestStatus
} from '@playwright/test/reporter';

import path from 'path';
import fs from 'fs';
import { consola } from 'consola';

type Verbosity = 0 | 1 | 2;

interface ReporterOptions {
  verbosity?: Verbosity;
  timezone?: string;
  jsonPath?: string | null;
  printErrorsImmediate?: boolean;
}

type LogLevelKey = 'INFO' | 'STEP' | 'SUCCESS' | 'WARN' | 'ERROR';
const LOG_TAGS: Record<LogLevelKey, string> = { INFO: '[*]', STEP: '[#]', SUCCESS: '[✓]', WARN: '[!]', ERROR: '[x]' };

const isTTY = Boolean(process.stdout && process.stdout.isTTY);
const color = {
  cyan: (s: string) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s),
  blue: (s: string) => (isTTY ? `\x1b[34m${s}\x1b[0m` : s),
  green: (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s: string) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  dim: (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
};

interface AttachmentLike { name: string; contentType?: string; path?: string; body?: Buffer | string; }

interface FailureEntry {
  title: string;
  testId?: string;
  status?: TestStatus;
  message: string;
  stack?: string;
  duration?: number;
  workerIndex?: number;
  attachments?: Array<{ name: string; path?: string; contentType?: string }>;
  locator?: string | null;
  locatorType?: string | null;
}

export default class AsciiHumanReporter implements Reporter {
  private verbosity: Verbosity;
  private timezone: string;
  private startTime: number;
  private printsToStdioFlag = true;
  private jsonSummaryPath: string | null;
  private printErrorsImmediate: boolean;

  private summary = { tests: [] as Array<{ testId?: string; title: string; status?: TestStatus; duration?: number; workerIndex?: number; errorCount?: number; attachments?: Array<{ name: string; path?: string; contentType?: string }>; locator?: string | null; locatorType?: string | null }> };
  private failures: FailureEntry[] = [];

  constructor(opts: ReporterOptions = {}) {
    // envs
    const envVerb = process.env.PLAYWRIGHT_REPORTER_VERBOSITY;
    const envTz = process.env.PLAYWRIGHT_REPORTER_TIMEZONE;
    const envJson = process.env.PLAYWRIGHT_REPORTER_JSON;
    const envImmediate = process.env.PLAYWRIGHT_REPORTER_PRINT_ERRORS_IMMEDIATE;

    // merge: opts > env > default
    this.verbosity = (typeof opts.verbosity === 'number' ? opts.verbosity : (envVerb ? Number(envVerb) : 1)) as Verbosity;
    this.timezone = opts.timezone || envTz || 'Asia/Kolkata';
    this.jsonSummaryPath = opts.jsonPath ?? envJson ?? null;
    this.printErrorsImmediate = typeof opts.printErrorsImmediate === 'boolean' ? opts.printErrorsImmediate : envImmediate === '1';

    this.startTime = Date.now();

    if (this.jsonSummaryPath) {
      try { fs.mkdirSync(path.dirname(this.jsonSummaryPath), { recursive: true }); } catch { /* ignore */ }
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    const projects = config.projects?.length ?? 0;
    const tests = this.countTests(suite);
    this._log('INFO', `Run started`, `Playwright: v${config.version ?? 'unknown'}`, `Projects: ${projects}`, `Tests: ${tests}`);
  }

  onTestBegin(test: TestCase): void {
    const project = test.titlePath()[1] || 'unknown';
    const loc = this.formatLocation(test.location);
    this._log('INFO', `${this.padTag('RUN')} ${test.title} [${project}] (${loc})`);
  }

  onStepBegin(_test: TestCase, _result: TestResult, step: TestStep): void {
    if (this.verbosity < 2) return;

    const parsed = this.parseStepEnhanced(step);
    const stepLoc = this.formatLocation(step.location);
    const category = step.category ?? 'unknown';

    const extras = [
      parsed.locator ? `locator: ${parsed.locator}` : null,
      parsed.locatorType ? `type: ${parsed.locatorType}` : null,
      `category: ${category}`,
      stepLoc !== 'unknown' ? `loc: ${stepLoc}` : null
    ].filter(Boolean).join(' | ');

    this._log('STEP', `→ ${parsed.cleanTitle}`, extras || undefined);
  }

  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
    if (this.verbosity < 2) return;

    const status: LogLevelKey = step.error ? 'ERROR' : 'SUCCESS';
    const parsed = this.parseStepEnhanced(step);
    const stepLoc = this.formatLocation(step.location);
    const dur = typeof step.duration === 'number' ? `${step.duration}ms` : 'n/a';

    const extras = [
      parsed.locator ? `locator: ${parsed.locator}` : null,
      parsed.locatorType ? `type: ${parsed.locatorType}` : null,
      `duration: ${dur}`,
      stepLoc !== 'unknown' ? `loc: ${stepLoc}` : null,
      step.error ? `error: ${step.error.message}` : null
    ].filter(Boolean).join(' | ');

    this._log(status, `${status === 'SUCCESS' ? '✓' : '✖'} ${parsed.cleanTitle}`, extras || undefined);

    if (step.error?.stack && status === 'ERROR') {
      this._log('ERROR', this.dim(this.stackExcerpt(step.error.stack, 6)));
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const status = result.status;
    const emoji = status === 'passed' ? '✓' : status === 'skipped' ? '↩' : '✖';
    const colorFn = status === 'passed' ? color.green : status === 'skipped' ? color.cyan : color.red;

    this._rawLog(`${colorFn(`${emoji} ${test.title}`)} ${this.dim(`(${result.duration ?? 0}ms)`)}`);

    // choose locator for the test if any from attachments or result (best-effort)
    const { locator: testLocator, locatorType: testLocatorType } = this.chooseLocatorFromResult(test, result);

    this.summary.tests.push({
      testId: test.id,
      title: test.title,
      status: result.status,
      duration: result.duration,
      workerIndex: result.workerIndex,
      errorCount: result.errors?.length ?? 0,
      attachments: (result.attachments || []).map(a => ({ name: a.name, path: a.path, contentType: a.contentType })),
      locator: testLocator,
      locatorType: testLocatorType
    });

    if (result.status === 'failed' || result.status === 'timedOut' || result.status === 'interrupted') {
      const firstError = (result.errors && result.errors.length) ? result.errors[0] : result.error;
      const message = firstError?.message ?? String(firstError ?? 'Unknown failure');
      const stack = firstError?.stack ?? undefined;
      const attachments = (result.attachments || []).map(a => ({ name: a.name, path: a.path, contentType: a.contentType }));
      const { locator, locatorType } = this.chooseLocatorFromResult(test, result);

      this.failures.push({
        title: test.title,
        testId: test.id,
        status: result.status,
        message,
        stack,
        duration: result.duration,
        workerIndex: result.workerIndex,
        attachments,
        locator,
        locatorType
      });

      if (this.printErrorsImmediate) {
        this._log('ERROR', `Failure: ${test.title}`);
        this._log('ERROR', this.dim(this.truncateLine(message, 500)));
        if (stack) this._log('ERROR', this.dim(this.stackExcerpt(stack, 8)));
        if (attachments.length) {
          attachments.forEach(att => this._log('INFO', `Attachment: ${att.name} ${att.path ? `(${path.relative(process.cwd(), att.path)})` : ''}`));
        }
        if (locator) {
          this._log('INFO', `Locator: ${locator} ${locatorType ? `(${locatorType})` : ''}`);
        }
      }
    }
  }

  onError(error: TestError): void {
    const ctx = error.location ? ` (at ${this.formatLocation(error.location)})` : '';
    const msg = error?.message ?? JSON.stringify(error);
    this._log('ERROR', `Global error: ${msg}${ctx}`);
    if (error.stack) this._log('ERROR', this.dim(this.stackExcerpt(error.stack, 6)));
  }

  onStdOut(chunk: string | Buffer, _test: void | TestCase, _result: void | TestResult): void {
    if (this.verbosity < 2) return;
    const txt = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    this._log('INFO', `STDOUT: ${this.dim(txt.trim())}`);
  }

  onStdErr(chunk: string | Buffer, _test: void | TestCase, _result: void | TestResult): void {
    const txt = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    this._log('WARN', `STDERR: ${this.dim(txt.trim())}`);
  }

  async onEnd(result: FullResult): Promise<void> {
    const durationMs = Date.now() - this.startTime;
    this._separator();
    this._log('INFO', `FINAL SUMMARY`, `Status: ${result.status}`, `Total run time: ${this.humanDuration(durationMs)}`);

    const totals = this.calculateTotals();
    this._log('INFO', `Totals — total: ${totals.total}   passed: ${color.green(String(totals.passed))}   failed: ${color.red(String(totals.failed))}   skipped: ${color.cyan(String(totals.skipped))}   timedOut: ${color.yellow(String(totals.timedOut))}   interrupted: ${color.red(String(totals.interrupted))}`);

    if (this.failures.length) {
      this._log('ERROR', `Failures (${this.failures.length}):`);
      let idx = 1;
      for (const f of this.failures) {
        const locInfo = f.locator ? ` locator=${f.locator}${f.locatorType ? ` (${f.locatorType})` : ''}` : '';
        this._log('ERROR', `${idx}. ${f.title} [${f.status}] (${f.duration ?? 0}ms)${locInfo}`);
        this._log('ERROR', this.dim(`   → ${this.truncateLine(f.message, 400)}`));
        if (f.stack) {
          const excerpt = this.stackExcerpt(f.stack, 6);
          excerpt.split('\n').forEach(line => this._log('ERROR', this.dim(`     ${line}`)));
        }
        if (f.attachments && f.attachments.length) {
          f.attachments.forEach(att => {
            this._log('INFO', this.dim(`     Attachment: ${att.name} ${att.path ? `(${path.relative(process.cwd(), att.path)})` : ''}`));
          });
        }
        idx++;
      }
    } else {
      this._log('SUCCESS', 'All scenarios passed ✅');
    }

    if (this.jsonSummaryPath) {
      try {
        const json = { status: result.status, startTime: new Date().toISOString(), duration: durationMs, totals, failures: this.failures, tests: this.summary.tests };
        fs.writeFileSync(this.jsonSummaryPath, JSON.stringify(json, null, 2), 'utf8');
        this._log('INFO', `Wrote JSON summary to ${this.jsonSummaryPath}`);
      } catch (err) {
        this._log('WARN', `Failed to write JSON summary: ${String(err)}`);
      }
    }

    this._separator();
  }

  printsToStdio(): boolean { return this.printsToStdioFlag; }

  /* ----------------- Helpers ----------------- */

  private calculateTotals(): { total: number; passed: number; failed: number; skipped: number; timedOut: number; interrupted: number } {
    const totals = { total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0 };
    for (const t of this.summary.tests) {
      totals.total++;
      switch (t.status) {
        case 'passed': totals.passed++; break;
        case 'failed': totals.failed++; break;
        case 'skipped': totals.skipped++; break;
        case 'timedOut': totals.timedOut++; break;
        case 'interrupted': totals.interrupted++; break;
        default: break;
      }
    }
    return totals;
  }

  private humanDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  }

  private truncateLine(s: string, max = 300): string {
    if (!s) return '';
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  private stackExcerpt(stack: string, maxLines = 5): string {
    if (!stack) return '';
    const lines = stack.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.slice(0, maxLines).join('\n');
  }

  private padTag(tag: string): string {
    return `[${tag}]`.padEnd(10);
  }

  private _log(level: LogLevelKey, ...parts: Array<string | number | undefined>): void {
    if (this.verbosity < 2 && level === 'STEP') return;
    const tag = LOG_TAGS[level] ?? '[ ]';
    const ts = this.now();
    const txt = parts.filter(p => p !== undefined && p !== null && String(p).length > 0).join(' | ');
    const out = `${this.dim(ts)} ${color.cyan(tag)} ${txt}`;
    try {
      switch (level) {
        case 'INFO': consola.info(out); break;
        case 'STEP': (consola as any).start ? (consola as any).start(out) : consola.info(out); break;
        case 'SUCCESS': consola.success(out); break;
        case 'WARN': consola.warn(out); break;
        case 'ERROR': consola.error(out); break;
        default: consola.log(out);
      }
    } catch {
      // fallback
      // eslint-disable-next-line no-console
      console.log(out);
    }
  }

  private _rawLog(s: string): void {
    try { consola.log(s); } catch { console.log(s); }
  }

  private _separator(): void {
    const line = ''.padEnd(Math.min(120, process.stdout.columns || 120), '─');
    try { consola.log(line); } catch { console.log(line); }
  }

  private now(): string {
    try { return new Date().toLocaleString('sv-SE', { timeZone: this.timezone }).replace(' ', 'T'); }
    catch { return new Date().toISOString(); }
  }

  private formatLocation(loc?: Location): string {
    if (!loc?.file) return 'unknown';
    const file = path.basename(loc.file);
    return loc.line != null ? `${file}:${loc.line}` : file;
  }

  private parseStepTitle(title: string): { cleanTitle: string } {
    return { cleanTitle: (title || '').replace(/\[selector: .+?]/gi, '').trim() };
  }

  private countTests(suite: Suite): number {
    try {
      const anySuite = suite as any;
      if (typeof anySuite.allTests === 'function') {
        const all = anySuite.allTests();
        return Array.isArray(all) ? all.length : 0;
      }
    } catch {
      // ignore and fall back
    }

    const fileTests = Array.isArray(suite.tests) ? suite.tests.length : 0;
    const childSuites = Array.isArray(suite.suites) ? suite.suites : [];
    const childCount = childSuites.reduce((sum: number, child: Suite) => sum + this.countTests(child), 0);

    return fileTests + childCount;
  }

  /**
   * Enhanced step parser: returns clean title + best-effort locator and its type.
   * It checks:
   *  - step.attachments for a locator-like attachment
   *  - step.title for [selector: ...] or patterns like css=..., xpath=..., id=..., text=...
   *  - quoted strings that look like selectors
   */
  private parseStepEnhanced(step: TestStep): { cleanTitle: string; locator: string | null; locatorType: string | null } {
    const title = step?.title ?? '';
    const cleanTitle = (title || '').replace(/\[selector:.*?\]/gi, '').trim();

    // 1) attachments on the step might include locator information
    try {
      if (Array.isArray((step as any).attachments)) {
        for (const att of (step as any).attachments as AttachmentLike[]) {
          if (!att) continue;
          const n = (att.name || '').toLowerCase();
          if (n.includes('locator') || n.includes('selector') || n.includes('sel')) {
            // if path present, try to read body (but attachments may be files)
            try {
              if (att.path && fs.existsSync(att.path)) {
                const body = fs.readFileSync(att.path, 'utf8').trim();
                const parsed = this.parseLocatorFromString(body);
                if (parsed.locator) return { cleanTitle, locator: parsed.locator, locatorType: parsed.type };
              }
            } catch { /* ignore */ }
            if (typeof att.body === 'string' && att.body.trim()) {
              const parsed = this.parseLocatorFromString(att.body as string);
              if (parsed.locator) return { cleanTitle, locator: parsed.locator, locatorType: parsed.type };
            }
          }
        }
      }
    } catch {
      // ignore attachment parsing issues
    }

    // 2) parse locator from title text
    const parsedFromTitle = this.parseLocatorFromString(title);
    if (parsedFromTitle.locator) return { cleanTitle, locator: parsedFromTitle.locator, locatorType: parsedFromTitle.type };

    // 3) fallback null
    return { cleanTitle, locator: null, locatorType: null };
  }

  /**
   * Parse a locator from a string. Returns { locator, type } where type can be 'css', 'xpath', 'text', 'id', 'role' or null.
   */
  private parseLocatorFromString(s?: string): { locator: string | null; type: string | null } {
    if (!s) return { locator: null, type: null };
    // common Playwright bracket format: [selector: ...]
    const bracket = s.match(/\[selector:\s*(.+?)\]/i);
    if (bracket) {
      const sel = bracket[1].trim();
      return { locator: sel, type: this.detectLocatorType(sel) };
    }

    // explicit kv like css=..., xpath=..., id=..., text=...
    const kv = s.match(/\b(?:css|xpath|id|text|role)[=:]\s*("?)(.+?)\1\b/i);
    if (kv) {
      const t = kv[0].split('=')[0].split(':')[0].toLowerCase();
      const sel = kv[2].trim();
      return { locator: sel, type: t };
    }

    // bare xpath (starts with // or xpath=)
    const xpathMatch = s.match(/(^| )(\/{1,2}[^ \t\n]+)/);
    if (xpathMatch) {
      const sel = xpathMatch[2].trim();
      return { locator: sel, type: 'xpath' };
    }

    // quoted candidate
    const quote = s.match(/(["'`])((?:\\\1|.)*?)\1/);
    if (quote) {
      const candidate = quote[2];
      if (candidate.includes('/') || candidate.startsWith('//') || candidate.includes('#') || candidate.includes('>') || candidate.includes('[')) {
        return { locator: candidate, type: this.detectLocatorType(candidate) };
      }
    }

    // detect simple css/id pattern in string
    const cssCandidate = s.match(/[#.][a-zA-Z0-9_\-:.[\]=()"']+/);
    if (cssCandidate) {
      return { locator: cssCandidate[0], type: 'css' };
    }

    return { locator: null, type: null };
  }

  private detectLocatorType(selector: string): string | null {
    if (!selector) return null;
    const s = selector.trim();
    if (/^\s*\/\//.test(s) || s.startsWith('xpath=') || s.startsWith('//')) return 'xpath';
    if (/^css=/.test(s)) return 'css';
    if (/^text=/.test(s)) return 'text';
    if (/^role=/.test(s)) return 'role';
    if (/^id=/.test(s) || /^\#[A-Za-z0-9\-_]/.test(s)) return 'id';
    if (/^[.#\[]/.test(s) || s.includes('>')) return 'css';
    return null;
  }

  /**
   * Choose a locator from test case / result attachments or summary info.
   * Best-effort: looks into result.attachments and into test.attachments if available.
   */
  private chooseLocatorFromResult(test: TestCase, result: TestResult): { locator: string | null; locatorType: string | null } {
    try {
      // check test-level attachments if present (some runners may attach)
      const attachments = (result.attachments || []) as AttachmentLike[];
      for (const att of attachments) {
        const name = (att.name || '').toLowerCase();
        if (name.includes('locator') || name.includes('selector') || name.includes('sel')) {
          if (att.path && fs.existsSync(att.path)) {
            const body = fs.readFileSync(att.path, 'utf8').trim();
            const parsed = this.parseLocatorFromString(body);
            if (parsed.locator) return { locator: parsed.locator, locatorType: parsed.type };
          }
          if (typeof att.body === 'string' && att.body.trim()) {
            const parsed = this.parseLocatorFromString(att.body);
            if (parsed.locator) return { locator: parsed.locator, locatorType: parsed.type };
          }
        }
      }
    } catch {
      // ignore
    }

    // try to parse from test.title
    const parsed = this.parseLocatorFromString(test.title);
    if (parsed.locator) return { locator: parsed.locator, locatorType: parsed.type };

    return { locator: null, locatorType: null };
  }

  private dim(s: string): string { return color.dim(s); }
}
