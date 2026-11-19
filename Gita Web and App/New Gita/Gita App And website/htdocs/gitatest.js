/* ─────────────────────────────────────────────────────────────
   GitaTest.js
   Bhagavad Gita Sloka Test — Beginner / Easy / Intermediate / Advanced /
   Supreme / Identify
   Identify level has two directions, chosen on its card:
     • guess  : the whole sloka is shown, you name its chapter + sloka number
     • recall : the chapter + sloka number are shown, you recall the sloka

   Reuses the sloka data already loaded by gita-data.js + app.js:
     - gitaData        : Telugu (default) chapters { name, slokas[] }
     - languageData     : { te, en, hi, ta, kn, ml, gu, bn, or }
     - chapterNames      : localized chapter name arrays
     - getLangData()    : returns languageData[currentLang] || gitaData
     - currentLang      : 'te' by default (set in app.js)
   ───────────────────────────────────────────────────────────── */

(function () {

  /* ─── STANZA / HALF SPLITTING ──────────────────────────────
     A Bhagavad Gita sloka is written as:  Stanza1 । Stanza2 ॥
     In this dataset the separators are not always the Devanagari
     danda characters — some entries (and the English transliteration)
     use plain ASCII pipes instead:  Stanza1 | Stanza2 ||
     So we look for whichever marker (danda or pipe) appears first. */

  function findEarliest(text, markers) {
    // markers: array of { symbol, len }. Returns {index, len} of the
    // earliest occurring marker, or {index:-1, len:0} if none found.
    let best = { index: -1, len: 0 };
    markers.forEach(m => {
      const idx = text.indexOf(m.symbol);
      if (idx !== -1 && (best.index === -1 || idx < best.index)) {
        best = { index: idx, len: m.len };
      }
    });
    return best;
  }

  function splitSloka(rawSloka) {
    // Normalize whitespace/newlines so character-based math is meaningful.
    const text = rawSloka.replace(/\s+/g, " ").trim();

    // 1) Find the end of the sloka: "॥" (single char) or "||" (two chars).
    const end = findEarliest(text, [
      { symbol: "॥", len: 1 },
      { symbol: "||", len: 2 }
    ]);
    const body = (end.index === -1 ? text : text.substring(0, end.index)).trim();

    // 2) Within that body, find the stanza separator: "।" or a lone "|".
    const sep = findEarliest(body, [
      { symbol: "।", len: 1 },
      { symbol: "|", len: 1 }
    ]);

    let firstStanza, secondStanza;
    if (sep.index === -1) {
      // No internal separator found — treat the whole body as stanza 1.
      firstStanza = body.trim();
      secondStanza = "";
    } else {
      firstStanza = body.substring(0, sep.index).trim();
      secondStanza = body.substring(sep.index + sep.len).trim();
    }

    return { firstStanza, secondStanza };
  }

  function divideStanza(stanza) {
    stanza = (stanza || "").trim();
    if (!stanza) return { firstHalf: "", secondHalf: "" };

    const middle = Math.floor(stanza.length / 2);
    const leftSpace = stanza.lastIndexOf(" ", middle);
    const rightSpace = stanza.indexOf(" ", middle);

    let splitPosition;
    if (leftSpace === -1 && rightSpace === -1) {
      // Single word with no space at all — can't split without breaking it.
      return { firstHalf: stanza, secondHalf: "" };
    } else if (leftSpace === -1) {
      splitPosition = rightSpace;
    } else if (rightSpace === -1) {
      splitPosition = leftSpace;
    } else {
      const leftDistance = middle - leftSpace;
      const rightDistance = rightSpace - middle;
      // Equal distance -> prefer the right space.
      splitPosition = rightDistance <= leftDistance ? rightSpace : leftSpace;
    }

    return {
      firstHalf: stanza.substring(0, splitPosition).trim(),
      secondHalf: stanza.substring(splitPosition).trim()
    };
  }

  function buildSlokaModel(rawSloka) {
    const { firstStanza, secondStanza } = splitSloka(rawSloka);
    const firstHalves = divideStanza(firstStanza);
    const secondHalves = divideStanza(secondStanza);
    return {
      originalSloka: rawSloka,
      firstStanza,
      secondStanza,
      firstStanzaHalf1: firstHalves.firstHalf,
      firstStanzaHalf2: firstHalves.secondHalf,
      secondStanzaHalf1: secondHalves.firstHalf,
      secondStanzaHalf2: secondHalves.secondHalf
    };
  }

  /* ─── SLOKA PICKING (avoid immediate repeats where possible) ─── */

  const usedIndices = {}; // { chapterNum: Set(usedSlokaIndices) }

  function pickRandomSlokaIndex(chapterNum, total) {
    if (!usedIndices[chapterNum]) usedIndices[chapterNum] = new Set();
    const used = usedIndices[chapterNum];

    if (used.size >= total) used.clear(); // exhausted -> allow repeats again

    let idx;
    let guard = 0;
    do {
      idx = Math.floor(Math.random() * total);
      guard++;
    } while (used.has(idx) && guard < total * 3);

    used.add(idx);
    return idx;
  }

  /* ─── SUPREME LEVEL: pick a random chapter that has slokas ───── */

  function pickRandomChapterNum(langData) {
    const valid = [];
    for (let i = 1; i <= 18; i++) {
      if (langData[i] && langData[i].slokas && langData[i].slokas.length) valid.push(i);
    }
    if (!valid.length) return null;
    return valid[Math.floor(Math.random() * valid.length)];
  }

  function updateChapterSelectState() {
    const difficulty = getSelectedDifficulty();
    const isRandom = difficulty === "supreme" || difficulty === "identify";
    chapterSelect.disabled = isRandom;
    if (chapterHelperText) {
      chapterHelperText.classList.toggle("hidden", !isRandom);
      const t = chapterHelperText.querySelector("span:last-child");
      if (t) t.textContent = difficulty === "identify"
        ? "Identify level picks a random sloka from all 18 chapters — chapter selection is disabled."
        : "Supreme level picks a random chapter automatically — chapter selection is disabled.";
    }
  }

  /* ─── DOM ─── */

  const difficultyInputs = () => Array.from(document.querySelectorAll('input[name="difficulty"]'));
  const chapterSelect = document.getElementById("chapterSelect");
  const generateBtn = document.getElementById("generateBtn");
  const viewBtn = document.getElementById("viewBtn");
  const errorMsg = document.getElementById("errorMsg");
  const resultSection = document.getElementById("resultSection");
  const firstStanzaBox = document.getElementById("firstStanzaBox");
  const secondStanzaBox = document.getElementById("secondStanzaBox");
  const firstStanzaHeading = document.getElementById("firstStanzaHeading");
  const secondStanzaHeading = document.getElementById("secondStanzaHeading");
  const fullSlokaBox = document.getElementById("fullSlokaBox");
  const chapterLabel = document.getElementById("chapterLabel");
  const difficultyLabel = document.getElementById("difficultyLabel");
  const chapterHelperText = document.getElementById("chapterHelperText");

  let currentModel = null;
  let revealed = false;
  let currentDifficulty = null;
  let currentChapterNum = null;
  let currentChapterName = "";
  let currentSlokaNumber = null;
  let identifyMode = null;   // "guess" | "recall" (Identify level only)

  /* "Chapter 2: Sankhya Yogam · Sloka 47" (or the Dhyana / Mahatyam label) */
  function fullReference() {
    const base = isSpecialView(currentChapterNum) ? getSpecialLabel(currentChapterNum) : "Chapter " + currentChapterNum;
    return base + (currentChapterName ? ": " + currentChapterName : "") + " · Sloka " + currentSlokaNumber;
  }

  function getSelectedDifficulty() {
    const checked = difficultyInputs().find(i => i.checked);
    return checked ? checked.value : null;
  }

  function populateChapterDropdown() {
    const names = (typeof chapterNames !== "undefined" && (chapterNames[currentLang] || chapterNames.te)) || [];
    let html = '<option value="" disabled selected>Select a chapter…</option>';
    for (let i = 1; i <= 18; i++) {
      const nm = names[i - 1] ? ` — ${names[i - 1]}` : "";
      html += `<option value="${i}">Chapter ${i}${nm}</option>`;
    }
    for (const key of Object.keys(SPECIAL_VIEWS)) {
      html += `<option value="${key}">${getSpecialLabel(key)}</option>`;
    }
    chapterSelect.innerHTML = html;
  }

  function hiddenPlaceholder(label) {
    return `<div class="gt-hidden-line">
      <span class="gt-hidden-label">${label}</span>
      <span class="gt-hidden-dots"><span class="material-symbols-outlined" aria-hidden="true">visibility_off</span>•••••• hidden ••••••</span>
    </div>`;
  }

  function visibleLine(label, text) {
    return `<div class="gt-visible-line">
      <span class="gt-visible-label">${label}</span>
      <div class="gt-sloka-text">${text}</div>
    </div>`;
  }

  function renderQuestion(difficulty, model) {
    let firstStanzaHtml = "";
    let secondStanzaHtml = "";

    if (difficulty === "identify") {
      if (identifyMode === "guess") {
        firstStanzaHeading.classList.add("hidden");
        secondStanzaHeading.classList.add("hidden");
        secondStanzaBox.classList.add("hidden");
        firstStanzaBox.innerHTML = visibleLine("Which chapter and sloka is this?", model.originalSloka.replace(/\n/g, "<br>"));
        secondStanzaBox.innerHTML = "";
      } else {
        firstStanzaBox.innerHTML = hiddenPlaceholder("First Stanza");
        secondStanzaBox.innerHTML = hiddenPlaceholder("Second Stanza");
      }
      return;
    }

    if (difficulty === "beginner") {
      firstStanzaHtml = visibleLine("First Stanza", model.firstStanza);
      secondStanzaHtml = hiddenPlaceholder("Second Stanza");
    } else if (difficulty === "easy") {
      firstStanzaHtml =
        visibleLine("First Stanza (first half)", model.firstStanzaHalf1) +
        hiddenPlaceholder("First Stanza (second half)");
      secondStanzaHtml = hiddenPlaceholder("Second Stanza");
    } else if (difficulty === "intermediate") {
      firstStanzaHtml = hiddenPlaceholder("First Stanza");
      secondStanzaHtml =
        visibleLine("Second Stanza (first half)", model.secondStanzaHalf1) +
        hiddenPlaceholder("Second Stanza (second half)");
    } else if (difficulty === "advanced" || difficulty === "supreme") {
      const pattern = Math.random() < 0.5 ? "A" : "B";
      if (pattern === "A") {
        // Pattern A = Easy pattern
        firstStanzaHtml =
          visibleLine("First Stanza (first half)", model.firstStanzaHalf1) +
          hiddenPlaceholder("First Stanza (second half)");
        secondStanzaHtml = hiddenPlaceholder("Second Stanza");
      } else {
        // Pattern B = Intermediate pattern
        firstStanzaHtml = hiddenPlaceholder("First Stanza");
        secondStanzaHtml =
          visibleLine("Second Stanza (first half)", model.secondStanzaHalf1) +
          hiddenPlaceholder("Second Stanza (second half)");
      }
    }

    firstStanzaBox.innerHTML = firstStanzaHtml;
    secondStanzaBox.innerHTML = secondStanzaHtml;
  }

  function renderFull(model) {
    // Hide the split stanza headings/boxes and show the complete sloka
    // (with its original | and || markers) as one unlabeled block.
    firstStanzaHeading.classList.add("hidden");
    secondStanzaHeading.classList.add("hidden");
    firstStanzaBox.classList.add("hidden");
    secondStanzaBox.classList.add("hidden");
    firstStanzaBox.innerHTML = "";
    secondStanzaBox.innerHTML = "";

    // Supreme level keeps the chapter/sloka number hidden until View is
    // clicked — reveal it now, alongside the full sloka text.
    if (currentDifficulty === "supreme") {
      chapterLabel.textContent = fullReference();
    }

    fullSlokaBox.innerHTML = `<div class="gt-sloka-text">${model.originalSloka.replace(/\n/g, "<br>")}</div>`;
    fullSlokaBox.classList.remove("hidden");
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove("hidden");
  }
  function clearError() {
    errorMsg.textContent = "";
    errorMsg.classList.add("hidden");
  }

  /* ─── SESSION TRACKING (questions practised — no scoring) ─── */
  const $ = (id) => document.getElementById(id);
  const stats = { asked: 0, revealed: 0 };

  function setViewLabel(text) {
    const l = $("viewBtnLabel");
    if (l) l.textContent = text; else viewBtn.textContent = text;
  }

  function updateStats() {
    $("statAsked").textContent = stats.asked;
  }

  function toast(msg, type) {
    if (window.GitaUI) window.GitaUI.toast(msg, { type: type });
  }

  function hideAllQuestionUI() {
    resultSection.classList.add("hidden");
    $("resultsCard").classList.add("hidden");
  }

  function resetSession() {
    stats.asked = stats.revealed = 0;
    currentModel = null;
    revealed = false;
    hideAllQuestionUI();
    $("sessionBar").classList.add("hidden");
    clearError();
    updateStats();
  }

  function finishSession() {
    if (!stats.revealed) {
      showError("Reveal a verse first to see your session summary.");
      return;
    }
    clearError();
    $("resPracticed").textContent = stats.revealed;
    $("resText").textContent = "You practised " + stats.revealed + " verse" + (stats.revealed === 1 ? "" : "s") + " this session. Keep reciting — every verse is a step.";
    resultSection.classList.add("hidden");
    const card = $("resultsCard");
    card.classList.remove("hidden");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onGenerate() {
    clearError();

    const difficulty = getSelectedDifficulty();
    if (!difficulty) {
      showError("Please select a difficulty level first.");
      return;
    }

    const langData = (typeof getLangData === "function") ? getLangData() : gitaData;

    let chapterNum;
    if (difficulty === "supreme" || difficulty === "identify") {
      chapterNum = pickRandomChapterNum(langData || gitaData);
      if (!chapterNum) {
        showError("No sloka data available to generate a Supreme question.");
        return;
      }
    } else if (isSpecialView(chapterSelect.value)) {
      chapterNum = chapterSelect.value;
    } else {
      chapterNum = parseInt(chapterSelect.value, 10);
      if (!chapterNum) {
        showError("Please select a chapter.");
        return;
      }
    }

    const isDyana = isSpecialView(chapterNum);
    const chapterData = isDyana
      ? getSpecialData(chapterNum)
      : ((langData && langData[chapterNum]) || gitaData[chapterNum]);
    if (!chapterData || !chapterData.slokas || !chapterData.slokas.length) {
      showError("No slokas found for that chapter.");
      return;
    }

    const idx = pickRandomSlokaIndex(chapterNum, chapterData.slokas.length);
    const rawSloka = chapterData.slokas[idx];
    currentModel = buildSlokaModel(rawSloka);
    revealed = false;

    currentDifficulty = difficulty;
    currentChapterNum = chapterNum;
    currentSlokaNumber = idx + 1;
    const names = (typeof chapterNames !== "undefined" && (chapterNames[currentLang] || chapterNames.te)) || [];
    currentChapterName = isDyana ? "" : (names[chapterNum - 1] || chapterData.name || "");

    const modeInput = document.querySelector('input[name="identifyMode"]:checked');
    identifyMode = difficulty === "identify" ? ((modeInput && modeInput.value) || "guess") : null;
    difficultyLabel.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1) +
      (identifyMode ? (identifyMode === "guess" ? " · Name the number" : " · Recall the sloka") : "");
    // Supreme keeps chapter + sloka number secret until View; Identify-guess asks for them;
    // every other level shows them at the top right away.
    chapterLabel.textContent = (difficulty === "supreme") ? "Chapter: ???"
      : (identifyMode === "guess" ? "Chapter ? · Sloka ?" : fullReference());

    // Reset from any previous "revealed" state back to the split stanza view
    firstStanzaHeading.classList.remove("hidden");
    secondStanzaHeading.classList.remove("hidden");
    firstStanzaBox.classList.remove("hidden");
    secondStanzaBox.classList.remove("hidden");
    fullSlokaBox.classList.add("hidden");
    fullSlokaBox.innerHTML = "";

    renderQuestion(difficulty, currentModel);

    resultSection.classList.remove("hidden");
    viewBtn.classList.remove("hidden");
    viewBtn.disabled = false;
    setViewLabel(identifyMode === "guess" ? "Show answer" : "View");
    const gb = $("guessBox");
    if (gb) {
      gb.classList.toggle("hidden", identifyMode !== "guess");
      $("guessChapter").value = ""; $("guessSloka").value = "";
      $("guessResult").className = "guess-result hidden"; $("guessResult").textContent = "";
      $("checkBtn").disabled = false;
    }

    /* session bookkeeping + fresh question state */
    stats.asked++;
    $("qNumber").textContent = stats.asked;
    $("sessionBar").classList.remove("hidden");
    $("resultsCard").classList.add("hidden");
    $("nextBtn").classList.add("hidden");
    resultSection.style.animation = "none";
    void resultSection.offsetWidth;
    resultSection.style.animation = "";
    updateStats();
    if (window.innerWidth < 900) resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* correct: true / false (Identify-guess) or null (plain reveal) */
  function finishReveal(correct, from) {
    revealed = true;
    viewBtn.disabled = true;
    setViewLabel("Revealed");
    stats.revealed++;
    $("nextBtn").classList.remove("hidden");
    document.dispatchEvent(new CustomEvent("gitatest:reveal", { detail: { correct: correct, from: from } }));
  }

  function onView() {
    if (!currentModel || revealed) return;
    if (identifyMode === "guess") { showAnswer(null); return; }
    renderFull(currentModel);
    finishReveal(null, viewBtn);
  }

  function showGuess(msg, kind) {
    const r = $("guessResult");
    r.textContent = msg;
    r.className = "guess-result is-" + kind;
  }

  function onCheck() {
    if (!currentModel || revealed || identifyMode !== "guess") return;
    const c = parseInt($("guessChapter").value, 10), n = parseInt($("guessSloka").value, 10);
    if (!c || !n) { showGuess("Enter both the chapter and the sloka number.", "warn"); return; }
    showAnswer({ c: c, n: n });
  }

  function showAnswer(guess) {
    chapterLabel.textContent = fullReference();
    $("checkBtn").disabled = true;
    let correct = false;
    if (!guess) showGuess("Answer: " + fullReference(), "info");
    else if (guess.c === currentChapterNum && guess.n === currentSlokaNumber) { showGuess("Correct! Chapter " + currentChapterNum + ", Sloka " + currentSlokaNumber + ".", "ok"); correct = true; }
    else if (guess.c === currentChapterNum) showGuess("Right chapter! It is sloka " + currentSlokaNumber + ".", "near");
    else showGuess("Not quite — it is Chapter " + currentChapterNum + ", Sloka " + currentSlokaNumber + ".", "no");
    finishReveal(correct, guess ? $("checkBtn") : viewBtn);
  }

  function init() {
    populateChapterDropdown();
    difficultyInputs().forEach(input => input.addEventListener("change", updateChapterSelectState));
    /* picking an Identify mode also selects the Identify level */
    document.querySelectorAll('input[name="identifyMode"]').forEach(m => m.addEventListener("change", () => {
      const lvl = document.querySelector('input[name="difficulty"][value="identify"]');
      if (lvl && !lvl.checked) { lvl.checked = true; updateChapterSelectState(); }
    }));
    updateChapterSelectState();
    generateBtn.addEventListener("click", onGenerate);
    viewBtn.addEventListener("click", onView);
    if ($("checkBtn")) {
      $("checkBtn").addEventListener("click", onCheck);
      ["guessChapter", "guessSloka"].forEach(id => $(id).addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); onCheck(); } }));
    }
    $("nextBtn").addEventListener("click", onGenerate);
    $("finishBtn").addEventListener("click", finishSession);
    $("resetBtn").addEventListener("click", () => { resetSession(); toast("Session reset"); });
    $("keepBtn").addEventListener("click", () => { $("resultsCard").classList.add("hidden"); onGenerate(); });
    $("newSessionBtn").addEventListener("click", () => { resetSession(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
