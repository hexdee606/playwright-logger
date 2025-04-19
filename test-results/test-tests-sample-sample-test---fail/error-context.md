# Test info

- Name: sample test - fail
- Location: E:\HEXDEE606\Projects\nodejs\playwright-logger\test\tests\sample.spec.ts:8:1

# Error details

```
Error: page.textContent: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('h1')

    at E:\HEXDEE606\Projects\nodejs\playwright-logger\test\tests\sample.spec.ts:10:23
```

# Page snapshot

```yaml
- navigation:
  - link "About":
    - /url: https://about.google/?fg=1&utm_source=google-IN&utm_medium=referral&utm_campaign=hp-header
  - link "Store":
    - /url: https://store.google.com/IN?utm_source=hp_header&utm_medium=google_ooo&utm_campaign=GS100042&hl=en-IN
  - link "Gmail":
    - /url: https://mail.google.com/mail/&ogbl
  - link "Search for Images":
    - /url: https://www.google.com/imghp?hl=en&ogbl
    - text: Images
  - button "Google apps":
    - img
  - link "Sign in":
    - /url: https://accounts.google.com/ServiceLogin?hl=en&passive=true&continue=https://www.google.com/%3Fgws_rd%3Dssl&ec=GAZAmgQ
  - iframe
- img
- search:
  - img
  - combobox "Search"
  - button "Search by voice":
    - img
  - button "Search by image":
    - img
  - button "Google Search"
  - button "I'm Feeling Lucky"
- text: "Today's Googly:"
- link "How many pedals did the first bicycle have?"
- text: "Google offered in:"
- link "हिन्दी":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=hi&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCBc
- link "বাংলা":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=bn&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCBg
- link "తెలుగు":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=te&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCBk
- link "मराठी":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=mr&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCBo
- link "தமிழ்":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=ta&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCBs
- link "ગુજરાતી":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=gu&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCBw
- link "ಕನ್ನಡ":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=kn&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCB0
- link "മലയാളം":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=ml&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCB4
- link "ਪੰਜਾਬੀ":
  - /url: https://www.google.com/setprefs?sig=0_TygkcsSxJsUpv8xv_YWJa_ZAHNg%3D&hl=pa&source=homepage&sa=X&ved=0ahUKEwj5kajRmuSMAxXLA7kGHSwbC5QQ2ZgBCB8
- contentinfo:
  - text: India
  - link "Advertising":
    - /url: https://www.google.com/intl/en_in/ads/?subid=ww-ww-et-g-awa-a-g_hpafoot1_1!o2&utm_source=google.com&utm_medium=referral&utm_campaign=google_hpafooter&fg=1
  - link "Business":
    - /url: https://www.google.com/services/?subid=ww-ww-et-g-awa-a-g_hpbfoot1_1!o2&utm_source=google.com&utm_medium=referral&utm_campaign=google_hpbfooter&fg=1
  - link "How Search works":
    - /url: https://google.com/search/howsearchworks/?fg=1
  - link "Privacy":
    - /url: https://policies.google.com/privacy?hl=en-IN&fg=1
  - link "Terms":
    - /url: https://policies.google.com/terms?hl=en-IN&fg=1
  - button "Settings"
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test('sample test - pass', async ({ page }) => {
   4 |     await page.goto('https://www.google.com');
   5 |     expect(await page.title()).toContain('Google');
   6 | });
   7 |
   8 | test('sample test - fail', async ({ page }) => {
   9 |     await page.goto('http://www.google.com');
> 10 |     expect(await page.textContent('h1')).toBe('Not Present');
     |                       ^ Error: page.textContent: Test timeout of 30000ms exceeded.
  11 | });
  12 |
```