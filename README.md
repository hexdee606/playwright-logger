# 🎯 Playwright Logger

A clean and consistent Playwright Reporter for human-readable test logs.

## ✨ Features

- CLI-safe ASCII icons
- Uniform aligned log tags
- Color-coded by log level
- Optional verbose mode
- Stack trace + error formatting
- Timezone-aware timestamps
- Attachment info shown inline

## 📦 Install

```bash
npm install --save-dev @hexdee606/playwright-logger
```

## 🔧 Use in `playwright.config.ts`

```ts
reporter: [
    ['playwright-ascii-logger', {
        timezone: 'IST',
        logLevel: 'verbose' // or 'standard'
    }]
]
```

## 🛠 Options

| Key        | Type     | Description                                 |
|------------|----------|---------------------------------------------|
| `timezone` | `string` | IANA timezone (e.g., `Asia/Kolkata`, `UTC`) |
| `logLevel` | `string` | `'standard'` or `'verbose'`                 |
