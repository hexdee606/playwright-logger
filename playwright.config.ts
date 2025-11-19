/*
  ================================================================
  Playwright Configuration (`playwright.config.ts`)
  ================================================================

  Author: Dipen Chavan (hexdee606)
  Version: 0.0.3
  Last Modified: 2025-03-14
  Description: This configuration file sets up Playwright for end-to-end
               testing with behavior-driven development (BDD) integration.
               It includes settings for test directories, timeouts, retries,
               reporting, logging, and parallel test execution.

  Notes:
    - The 'timeout' is set globally for all tests.
    - Retry count is set to 0 (no retries) for failed tests.
    - Video and screenshot capture options are enabled for better debugging.
    - Headless mode is configurable through the 'headless' setting.
    - Custom configurations for BDD are also integrated.
    - Parallel execution is enabled to speed up the tests.

  ================================================================
*/

import { defineConfig } from "@playwright/test"; // Import Playwright test configuration function

/**
 * Playwright Test Configuration.
 * This includes general settings like timeout, retries, workers, and paths for tests and output.
 */
export default defineConfig({
    /**
     * Directories for test files and output.
     * Defines where Playwright will look for test files and where to store the results.
     */
    testDir: "./test/tests/",        // Directory path for test files
    outputDir: "./test/outputs/",    // Directory path to store test artifacts (logs, screenshots, reports)

    /**
     * Timeout and retry settings for tests.
     * Defines how long to wait before timing out a test and the retry behavior.
     */
    timeout: 5 * 1000,          // Global test timeout (max test duration)
    retries: 0,                              // Number of retries for failed tests (set to 0 for no retries)
    workers: 4,                              // Number of parallel workers to run tests concurrently
    fullyParallel: true,                     // Enable full parallel test execution

    /**
     * Snapshot and reporting settings.
     * Defines how snapshots and test reports are handled.
     */
    updateSnapshots: "missing",              // Only update snapshots if they're missing or outdated
    reportSlowTests: null,                   // Set a threshold to report slow tests (can be a number of milliseconds)
    reporter: [
        ['./src/reporter.ts', {
            verbosity: 2,
            timezone: 'IST',
            printErrorsImmediate: false
        }]
    ],

    /**
     * Expectation timeout settings.
     * Defines the timeout for each assertion in tests.
     */
    expect: {
        timeout: 5000,         // Timeout for each individual expectation
    },

    /**
     * Logging settings.
     * Controls the verbosity of the output (e.g., quiet mode vs. detailed logging).
     */
    quiet: true,                  // If 'true', suppress verbose logs; otherwise, show detailed logs

    use: {
        browserName: "chromium",              // The browser to use for the tests
        defaultBrowserType: "chromium",       // The default browser type to use
        headless: true,            // Run tests in headless mode (true or false)
        trace: "retain-on-first-failure",     // Keep trace on first failure for debugging
        video: "retain-on-failure",           // Record video on failure
        screenshot: "on-first-failure",       // Capture a screenshot on the first failure
        acceptDownloads: true,                // Allow file downloads during tests

        // Configure viewport based on headless mode
        viewport: { width: 1280, height: 720 },
    },

    /**
     * Project configuration (used for running tests across different browsers or environments).
     * This allows the configuration to be customized for different projects or setups.
     */
    projects: [
        {
            name: "suit1",                         // Name of the test suite
            fullyParallel: false                   // Do not run tests in this suite fully in parallel
        }
    ]
});
