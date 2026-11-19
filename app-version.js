/* ════════════════════════════════════════════════════════════════
   Latest Bhagavad Gita Android app — read by the app on start.

   When you publish a new BhagavadGita.apk:
     1. set APP_BUILD_DATE in the app (assets/www/app-update.js) to a new date
     2. build and upload the new BhagavadGita.apk
     3. change "date" below to that same date
   Apps whose built-in date differs from "date" show a small
   "new version available – Update" notice that downloads "apk".
   Keep the part between { } valid JSON (double quotes, no trailing comma).
   ════════════════════════════════════════════════════════════════ */
window.GITA_APP_LATEST = {
  "date": "2026-11-19",
  "apk": "https://github.com/kolluruharshavardhanhindu-cyber/BhagavadGita/raw/refs/heads/main/BhagavadGita.apk?raw=true"
};
