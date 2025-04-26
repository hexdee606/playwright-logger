/**
 * @file AsciiHumanReporter.ts
 * @description
 * A custom Playwright reporter for displaying clean and human-readable test results in the terminal.
 * It uses colored console output with timestamps, and logs test steps, results, errors, and attachments.
 * The output format is easy to understand and works well for both basic and verbose logging.
 *
 * @author
 * Dipen
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

import moment from 'moment-timezone';
import {consola, createConsola} from "consola";
import path from 'path';

/**
 * Options for customizing the logger.
 * @property timezone - The timezone to use for timestamps. Defaults to 'Asia/Kolkata'.
 * @property verbosity - The level of detail to show in logs (0: minimal, 1: standard, 2: verbose). Defaults to 1.
 */
interface LoggerOptions {
    timezone?: string;
    verbosity?: 0 | 1 | 2;
    printsToStdIo?: boolean;
}

/**
 * Type for log level keys used in logging.
 */
type LogLevelKey = 'INFO' | 'STEP' | 'SUCCESS' | 'WARN' | 'ERROR';

/**
 * Tags for each log level for easy identification.
 */
const LOG_TAGS: Record<LogLevelKey, string> = {
    INFO: '[*]',
    STEP: '[#]',
    SUCCESS: '[✓]',
    WARN: '[!]',
    ERROR: '[x]'
};

/**
 * Terminal color functions for each log level.
 */
const LOG_COLORS: Record<LogLevelKey, (msg: string) => string> = {
    INFO: (msg) => `\x1b[36m${msg}\x1b[0m`,    // Cyan
    STEP: (msg) => `\x1b[34m${msg}\x1b[0m`,    // Blue
    SUCCESS: (msg) => `\x1b[32m${msg}\x1b[0m`, // Green
    WARN: (msg) => `\x1b[33m${msg}\x1b[0m`,    // Yellow
    ERROR: (msg) => `\x1b[31m${msg}\x1b[0m`    // Red
};

/**
 * A Playwright reporter that prints human-readable, timestamped logs in the console.
 */
export default class PlaywrightReporter implements Reporter {
    private timezone: string;
    private verbosity: 0 | 1 | 2;
    private startTime: number;
    private printsToStdIo: boolean;

    /**
     * Creates a new reporter instance with optional settings.
     * @param opts LoggerOptions to configure timezone and verbosity.
     */
    constructor(opts: LoggerOptions = {}) {
        this.timezone = this.normalizeTimezone(opts.timezone || process.env.PLAYWRIGHT_REPORTER_TIMEZONE || 'Asia/Kolkata');
        this.verbosity = parseInt(opts.verbosity?.toString() || process.env.PLAYWRIGHT_REPORTER_VERBOSITY || '1', 10) as 0 | 1 | 2;
        this.startTime = Date.now(); // Save test run start time
        this.printsToStdIo = true;
    }

    /**
     * Called when test run begins.
     */
    onBegin(config: FullConfig, suite: Suite): void {
        this.log('INFO', 'Test Run Started',
            `Playwright: v${config.version}`,
            `Projects: ${config.projects.length}`,
            `Tests: ${this.countTests(suite)}`
        );
    }

    /**
     * Called when a test starts.
     */
    onTestBegin(test: TestCase, result: TestResult): void {
        const project = test.titlePath()[1] || 'unknown';
        const location = this.formatLocation(test.location);
        this.log('INFO', `Scenario: ${test.title}`, `Project: ${project}`, `File: ${location}`);
    }

    /**
     * Called when a test step begins.
     */
    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
        if (this.verbosity < 2) return;

        const {cleanTitle} = this.parseStepTitle(step.title);
        const project = test.titlePath()[1] || 'unknown';
        const stepLoc = this.formatLocation(step.location);
        const testLoc = this.formatLocation(test.location);
        const retry = result.retry ?? 0;

        this.log('STEP', `Step: ${cleanTitle}`, `Category: ${step.category}`, `Project: ${project}`, `StepLoc: ${stepLoc}`, `TestLoc: ${testLoc}`, `Retry: ${retry}`);
    }

    /**
     * Called when a test step ends.
     */
    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
        if (this.verbosity < 2) return;

        const status: LogLevelKey = step.error ? 'ERROR' : 'SUCCESS';
        const errorMsg = step.error?.message || 'none';
        const {cleanTitle} = this.parseStepTitle(step.title);
        const stepLoc = this.formatLocation(step.location);

        this.log(status, `Step Done: ${cleanTitle}`, `Duration: ${step.duration}ms`, `StepLoc: ${stepLoc}`, `Error: ${errorMsg}`);
        if (step.error?.stack && status === 'ERROR') {
            this.log('ERROR', `Stack Trace:\n${step.error.stack}`);
        }
    }

    /**
     * Called when a test ends.
     */
    onTestEnd(test: TestCase, result: TestResult): void {
        const status = this.mapStatusToLogLevel(result.status);
        const duration = `${result.duration}ms`;

        this.log(status, `Scenario Complete: ${test.title}`, `Status: ${result.status}`, `Duration: ${duration}`);

        // Log errors if any
        result.errors.forEach((e, i) => {
            this.log('ERROR', `✖ Error ${i + 1}: ${e.message}`);
            if (e.stack) this.log('ERROR', `Stack Trace:\n${e.stack}`);
        });

        // Log any attachments
        if (this.verbosity >= 1) {
            result.attachments.forEach(att => {
                this.log('INFO', `📎 Attachment: ${att.name} (${att.contentType})`);
                if (att.path) this.log('INFO', `     ${path.relative(process.cwd(), att.path)}`);
            });
        }
    }

    /**
     * Called when there is a global error during the test run.
     */
    onError(error: TestError): void {
        let contextInfo = '';
        if (error.location) {
            contextInfo = ` (File: ${this.formatLocation(error.location)})`;
        }
        this.log('ERROR', `Global Error: ${error.message}${contextInfo}`);
        if (error.stack) this.log('ERROR', `Stack Trace:\n${error.stack}`);
    }

    /**
     * Called when all tests have finished.
     */
    onEnd(result: FullResult): void {
        const duration = `${Date.now() - this.startTime}ms`;
        const status = result.status === 'passed' ? 'SUCCESS' : 'ERROR';
        this.log(status, 'Test Run Finished', `Status: ${result.status}`, `Total Duration: ${duration}`);
    }

    /**
     * Tells Playwright that this reporter logs to the console.
     */
    printsToStdio(): boolean {
        return this.printsToStdIo;
    }

    // ─────────────────────────────
    // Helper Functions
    // ─────────────────────────────

    /**
     * Print a formatted log message to the console.
     */
    private log(level: LogLevelKey, ...messages: string[]): void {
        if (this.verbosity < 2 && level === 'STEP') return;
        if (level === "INFO") {
            consola.info(LOG_COLORS[level](` ${messages.join(' | ')}`));
        } else if (level === "STEP") {
            consola.start(LOG_COLORS[level](` ${messages.join(' | ')}`));
        } else if (level === "SUCCESS") {
            consola.success(LOG_COLORS[level](` ${messages.join(' | ')}`));
        } else if (level === "WARN") {
            consola.warn(LOG_COLORS[level](` ${messages.join(' | ')}`));
        } else if (level === "ERROR") {
            consola.error(LOG_COLORS[level](` ${messages.join(' | ')}`));
        }

    }

    /**
     * Normalize common timezone aliases into full timezone names.
     */
    private normalizeTimezone(tz: string): string {
        const aliases: Record<string, string> = {
            IST: 'Asia/Kolkata',
            PST: 'America/Los_Angeles',
            EST: 'America/New_York',
            UTC: 'UTC'
        };
        return aliases[tz] || tz;
    }

    /**
     * Clean up step title by removing unnecessary selector info.
     */
    private parseStepTitle(title: string): { cleanTitle: string } {
        return {cleanTitle: title.replace(/\[selector: .+?]/gi, '').trim()};
    }

    /**
     * Format file and line number as string.
     */
    private formatLocation(loc?: Location): string {
        if (!loc?.file) return 'auto';
        const file = path.basename(loc.file);
        return loc.line != null ? `${file}:${loc.line}` : file;
    }

    /**
     * Recursively count all tests inside a suite and its child suites.
     */
    private countTests(suite: Suite): number {
        return suite.tests.length + suite.suites.reduce((sum, s) => sum + this.countTests(s), 0);
    }

    /**
     * Convert a test status to a corresponding log level.
     */
    private mapStatusToLogLevel(status: TestStatus): LogLevelKey {
        return <LogLevelKey>{
            passed: 'SUCCESS',
            failed: 'ERROR',
            skipped: 'WARN',
            timedOut: 'ERROR',
            interrupted: 'ERROR',
        }[status];
    }
}