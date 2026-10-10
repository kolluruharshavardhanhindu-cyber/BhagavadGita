/*  VIEW HELPERS (chapters + special views)
   The viewer shows either a numbered chapter (#chapter-N) or a special
   view: Dyana slokas (#dyana) or Gita Mahatyam (#mahatyam). "num" is a
   number for chapters and a string key ('dyana' / 'mahatyam') for the
   special views. To add another special view, add it to SPECIAL_VIEWS,
   to specialLabel and to specialLanguageData. */
const DYANA_KEY = 'dyana';
const MAHATYAM_KEY = 'mahatyam';
const AUDIO_BASE = "https://raw.githubusercontent.com/kolluruharshavardhanhindu-cyber/BhagavadGita/main/";

const SPECIAL_VIEWS = {
  dyana:    { folder: "GitaDyanaSlokas", prefix: "dyanaslokam_" },
  mahatyam: { folder: "GitaMahatyam",    prefix: "mahatyam_"     }
};

function isSpecialView(num){
  return typeof num === "string" && Object.prototype.hasOwnProperty.call(SPECIAL_VIEWS, num);
}

function getAudioUrl(num, i){
  if(isSpecialView(num)){
    const v = SPECIAL_VIEWS[num];
    return `${AUDIO_BASE}${v.folder}/${v.prefix}${i+1}.mp3`;
  }
  return `${AUDIO_BASE}GitaAudio/audio_${num}_${i+1}.mp3`;
}

function getCurrentViewNum(){
  const key = location.hash.replace("#","");
  if(isSpecialView(key)) return key;
  const n = parseInt(location.hash.replace("#chapter-",""));
  return isNaN(n) ? null : n;
}

/* Number of slokas in the current view (used only for counting) */
function getViewTotal(num){
  if(isSpecialView(num)) return getSpecialData(num).slokas.length;
  return gitaData[num] ? gitaData[num].slokas.length : 0;
}

/* ─── GLOBAL AUDIO CONTROLLER ─────────────────────── */
let currentAudio = null;
let activeSlokaDiv = null;    // currently highlighted sloka box

function stopCurrentAudio(){
  if(currentAudio){
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  document.querySelectorAll(".sloka-audio-btn")
    .forEach(btn => btn.innerText = "volume_up");
  clearActiveHighlight();
}

function clearActiveHighlight(){
  if(activeSlokaDiv){
    activeSlokaDiv.classList.remove("sloka-playing");
    activeSlokaDiv = null;
  }
}

/* ─── RANGE PLAYER STATE ─────────────────────────────
   Shared by the "Play All" button (locked to the whole
   chapter) and double-clicking a sloka (editable range). */
let rangePlayer = {
  active: false,
  num: null,
  list: [],   // ordered list of 0-based sloka indices to play
  pos: 0,
  speed: 1
};
let selectedSpeed = 1;

const rangeModal      = document.getElementById("rangeModal");
const playAllBtn      = document.getElementById("playAllBtn");
const playAllLabel    = document.getElementById("playAllLabel");
const stopPlayAllBtn  = document.getElementById("stopPlayAllBtn");

/* ─── RANGE PLAYER: modal controls ─────────────────────── */
function openRangeModal(locked){
  const num = getCurrentViewNum();
  const total = num === null ? 0 : getViewTotal(num);
  if(!total) return;

  const fromInput = document.getElementById("rangeFrom");
  const toInput   = document.getElementById("rangeTo");

  fromInput.value = 1;
  toInput.value   = total;
  fromInput.readOnly = locked;
  toInput.readOnly   = locked;
  fromInput.classList.toggle("locked-input", locked);
  toInput.classList.toggle("locked-input", locked);

  document.getElementById("rangeIterations").value = 1;
  setActiveSpeedButton(1);

  const title = document.getElementById("rangeModalTitle");
  if(title) title.innerText = locked ? "Play All Slokas" : "Play Selected Slokas";

  try { const sel = window.getSelection && window.getSelection(); if(sel) sel.removeAllRanges(); } catch(e){}   /* double-tap selects a word on Android */
  rangeModal.classList.remove("hidden");
  rangeModal.style.display = "flex";
  rangeModal.dataset.openedAt = Date.now();
  fitRangeModalToViewport();
  document.body.classList.add("modal-open");
  /* On phones/tablets do NOT auto-focus: it would raise the keyboard at once and cover the popup.
     The keyboard only appears when the person taps a field (and then the sheet rides above it). */
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if(!coarse) setTimeout(() => { const it = document.getElementById("rangeIterations"); if(it) it.focus({preventScroll:true}); }, 60);
}

function closeRangeModal(){
  rangeModal.classList.add("hidden");
  rangeModal.style.display = "none";
  rangeModal.style.top = rangeModal.style.height = "";
  document.body.classList.remove("modal-open");
  if(document.activeElement && rangeModal.contains(document.activeElement)) document.activeElement.blur();
}

/* ── Keep the Play All popup fully visible when the on-screen keyboard opens ──
   The popup is sized to the *visual* viewport (the area above the keyboard), so the
   bottom sheet always sits on top of the keyboard instead of behind it. Works for
   mobile browsers (visualViewport) and Android WebView (adjustResize / adjustPan). */
function fitRangeModalToViewport(){
  if(!rangeModal || rangeModal.style.display !== "flex") return;
  const vv = window.visualViewport;
  if(vv){
    rangeModal.style.top    = Math.max(0, vv.offsetTop) + "px";
    rangeModal.style.height = vv.height + "px";
  } else {
    rangeModal.style.height = window.innerHeight + "px";
  }
  const f = document.activeElement;
  if(f && rangeModal.contains(f) && f.matches && f.matches("input")){
    try { f.scrollIntoView({block:"center", behavior:"auto"}); } catch(e){}
  }
}
if(window.visualViewport){
  window.visualViewport.addEventListener("resize", fitRangeModalToViewport);
  window.visualViewport.addEventListener("scroll", fitRangeModalToViewport);
}
window.addEventListener("resize", fitRangeModalToViewport);
window.addEventListener("orientationchange", () => setTimeout(fitRangeModalToViewport, 250));
if(rangeModal){   /* GitaTest.html also loads this file but has no Play All popup */
  rangeModal.addEventListener("focusin", (e) => {
    if(e.target && e.target.matches && e.target.matches("input")) setTimeout(fitRangeModalToViewport, 320);
  });
  /* tap on the dimmed backdrop closes the popup */
  rangeModal.addEventListener("click", (e) => {
    /* ignore the trailing click of the double-tap that just opened the popup */
    if(e.target === rangeModal && Date.now() - (+rangeModal.dataset.openedAt || 0) > 700) cancelRangeModal();
  });
}

function cancelRangeModal(){
  closeRangeModal();
  stopRangeMode();
}

/* Escape closes the Play All popup (V6 behaviour) */
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && rangeModal && rangeModal.style.display === "flex") cancelRangeModal();
});

function setActiveSpeedButton(speed){
  selectedSpeed = speed;
  document.querySelectorAll(".range-speed-btn").forEach(b=>{
    b.classList.toggle("active", parseFloat(b.dataset.speed) === speed);
  });
}

document.querySelectorAll(".range-speed-btn").forEach(btn=>{
  btn.addEventListener("click", () => {
    setActiveSpeedButton(parseFloat(btn.dataset.speed));
  });
});

function startRangePattern(patternType){
  const num = getCurrentViewNum();
  const total = num === null ? 0 : getViewTotal(num);
  if(!total) return;

  let from = parseInt(document.getElementById("rangeFrom").value, 10);
  let to   = parseInt(document.getElementById("rangeTo").value, 10);
  let iterations = parseInt(document.getElementById("rangeIterations").value, 10);

  if(isNaN(from) || from < 1) from = 1;
  if(isNaN(to) || to > total) to = total;
  if(to < 1) to = 1;
  if(from > to){ const t = from; from = to; to = t; }
  if(isNaN(iterations) || iterations < 1) iterations = 1;
  if(iterations > 20) iterations = 20;

  const list = [];
  if(patternType === 'A'){
    // repeat each sloka N times before moving on: 1,1,1,2,2,2,3,3,3...
    for(let idx = from; idx <= to; idx++){
      for(let k = 0; k < iterations; k++) list.push(idx - 1);
    }
  } else {
    // repeat the whole sequence N times: 1,2,3,1,2,3,1,2,3...
    for(let k = 0; k < iterations; k++){
      for(let idx = from; idx <= to; idx++) list.push(idx - 1);
    }
  }

  closeRangeModal();
  startRangeSequence(num, list, selectedSpeed);
}

/* ─── RANGE PLAYER: sequential playback ─────────────────────── */
function startRangeSequence(num, list, speed){
  stopCurrentAudio();
  rangePlayer.active = true;
  rangePlayer.num = num;
  rangePlayer.list = list;
  rangePlayer.pos = 0;
  rangePlayer.speed = speed;
  updateRangePlayerUI();
  playRangeStep();
}

function playRangeStep(){
  if(!rangePlayer.active) return;

  const num = rangePlayer.num;
  if(rangePlayer.pos >= rangePlayer.list.length){
    stopRangeMode();
    return;
  }

  const i = rangePlayer.list[rangePlayer.pos];
  clearActiveHighlight();
  const div = slokaContainer.children[i];
  if(!div){
    rangePlayer.pos++;
    playRangeStep();
    return;
  }
  const audioBtn = div.querySelector(".sloka-audio-btn");
  div.classList.add("sloka-playing");
  activeSlokaDiv = div;
  div.scrollIntoView({ behavior: "smooth", block: "center" });

  const audioFile = getAudioUrl(num, i);
  currentAudio = new Audio(audioFile);
  currentAudio.playbackRate = rangePlayer.speed;
  currentAudio.play().then(()=>{
    audioBtn.innerText = "stop_circle";
  }).catch(()=>{
    // file missing/failed — skip to next in the list
    audioBtn.innerText = "volume_up";
    rangePlayer.pos++;
    playRangeStep();
  });
  currentAudio.onended = () => {
    if(!rangePlayer.active) return;
    audioBtn.innerText = "volume_up";
    rangePlayer.pos++;
    playRangeStep();
  };
}

function resetRangePlayer(){
  rangePlayer.active = false;
  clearActiveHighlight();
  updateRangePlayerUI();
}

function stopRangeMode(){
  rangePlayer.active = false;
  updateRangePlayerUI();
  stopCurrentAudio();
}

// Kept for the existing header stop button (id="stopPlayAllBtn").
function stopPlayAllMode(){
  stopRangeMode();
}

function updateRangePlayerUI(){
  if(!playAllBtn) return;
  if(rangePlayer.active){
    playAllBtn.classList.add("armed");
    stopPlayAllBtn.classList.remove("hidden");
  } else {
    playAllBtn.classList.remove("armed");
    stopPlayAllBtn.classList.add("hidden");
  }
}

/* ─── Single click / double click on a sloka's audio icon ── */
function handleSingleAudioClick(num, i, audioBtn){
  const audioFile = getAudioUrl(num, i);

  if(rangePlayer.active){
    // Clicking the (playing) audio button stops the range/loop feature entirely
    stopRangeMode();
    return;
  }

  // Normal single play/pause toggle — no repeat, no auto-continue
  if(currentAudio && currentAudio.src.includes(audioFile) && !currentAudio.paused){
    stopCurrentAudio();
    return;
  }
  stopCurrentAudio();
  currentAudio = new Audio(audioFile);
  currentAudio.play().then(()=>{
    audioBtn.innerText = "stop_circle";
  }).catch(()=>{
    alert("Audio file not found !!!");
  });
  currentAudio.onended = () => {
    audioBtn.innerText = "volume_up";
    currentAudio = null;
  };
}

function handleDoubleAudioClick(num, i, audioBtn){
  // Double-click always stops the range/loop feature and plays just this one sloka
  stopRangeMode();
  stopCurrentAudio();

  const audioFile = getAudioUrl(num, i);
  currentAudio = new Audio(audioFile);
  currentAudio.play().then(()=>{
    audioBtn.innerText = "stop_circle";
  }).catch(()=>{
    alert("Audio file not found !!!");
  });
  currentAudio.onended = () => {
    audioBtn.innerText = "volume_up";
    currentAudio = null;
  };
}

const home           = document.getElementById("home");
const viewer         = document.getElementById("viewer");
const chapterTitle   = document.getElementById("chapterTitle");
const slokaContainer = document.getElementById("slokaContainer");
const bell           = document.getElementById("bell");

/* ─── GITA DATA ────────────────────────────────────── */
/* Sloka text (all languages) is loaded from gita-data.js — see the <script> tag in index.html. */


/* Meanings (tatparya) now live in TatparyasMultiLan.js (chapters) and DyanaAndMahatyam.js
   (Dyana slokas + Gita Mahatmya); both are loaded on demand — see ensureMeaningData() below. */

const chapterTeluguNames = [
  "అర్జున విషాద యోగం","సాంఖ్య యోగం","కర్మ యోగం",
  "జ్ఞాన యోగం","కర్మ సన్యాస యోగం","ఆత్మ సంయమ యోగం",
  "జ్ఞాన విజ్ఞాన యోగం","అక్షర పరబ్రహ్మ యోగం","రాజ విద్యా రాజ గుహ్య యోగం",
  "విభూతి యోగం","విశ్వరూప సందర్శన యోగం","భక్తి యోగం",
  "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగం","గుణత్రయ విభాగ యోగం","పురుషోత్తమ ప్రాప్తి యోగం",
  "దైవాసుర సంపద్విభాగ యోగం","శ్రద్ధాత్రయ విభాగ యోగం","మోక్షసన్న్యాసయోగం"
];

/* ─── MULTI-LANGUAGE SUPPORT ────────────────────────────── */
const languageData = {
  te: gitaData,
  en: (typeof gitaEnglishData    !== 'undefined') ? gitaEnglishData    : null,
  hi: (typeof gitaDevanagariData !== 'undefined') ? gitaDevanagariData : null,
  ta: (typeof gitaTamilData      !== 'undefined') ? gitaTamilData      : null,
  kn: (typeof gitaKannadaData    !== 'undefined') ? gitaKannadaData    : null,
  ml: (typeof gitaMalayalamData  !== 'undefined') ? gitaMalayalamData  : null,
  gu: (typeof gitaGujaratiData   !== 'undefined') ? gitaGujaratiData   : null,
  bn: (typeof gitaBengaliData    !== 'undefined') ? gitaBengaliData    : null,
  or: (typeof gitaOdissaData     !== 'undefined') ? gitaOdissaData     : null,
};

/*
 * Chapter names for every language.
 * Telugu uses the exact approved 18 names below.
 * All other languages are taken from their own language data's `name`
 * field and are exposed through the same chapterNames structure.
 */
const chapterNames = {
  te: [
    "అర్జున విషాద యోగం","సాంఖ్య యోగం","కర్మ యోగం", 
    "జ్ఞాన యోగం","కర్మ సన్యాస యోగం","ఆత్మ సంయమ యోగం", 
    "జ్ఞాన విజ్ఞాన యోగం","అక్షర పరబ్రహ్మ యోగం","రాజ విద్యా రాజ గుహ్య యోగం", 
    "విభూతి యోగం","విశ్వరూప సందర్శన యోగం","భక్తి యోగం", 
    "క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగం","గుణత్రయ విభాగ యోగం","పురుషోత్తమ ప్రాప్తి యోగం", 
    "దైవాసుర సంపద్విభాగ యోగం","శ్రద్ధాత్రయ విభాగ యోగం","మోక్షసన్న్యాసయోగం"
  ],

  en: [
    "Arjuna Vishada Yogam","Samkhya Yogam","Karma Yogam", 
    "Jyana Yogam","Karma Sanyasa Yogam","Atma Samyama Yogam", 
    "Jyana Vijyana Yogam","Akshara Parabrahma Yogam","Raja Vidya Raja Guhya Yogam", 
    "Vibhuti Yogam","Vishvarupa Samdarshana Yogam","Bhakti Yogam", 
    "Kshetra Kshetrajya Vibhaga Yogam","Gunatraya Vibhaga Yogam","Purushottama Prapti Yogam", 
    "Daivasura Sampadvibhaga Yogam","Shraddhatraya Vibhaga Yogam","Moksha Sannyasa Yogam"
  ],

  hi: [
    "अर्जुन विषाद योगं","सांख्य योगं","कर्म योगं", 
    "ज्ञान योगं","कर्म सन्यास योगं","आत्म संयम योगं", 
    "ज्ञान विज्ञान योगं","अक्षर परब्रह्म योगं","राज विद्या राज गुह्य योगं", 
    "विभूति योगं","विश्वरूप संदर्शन योगं","भक्ति योगं", 
    "क्षेत्र क्षेत्रज्ञ विभाग योगं","गुणत्रय विभाग योगं","पुरुषोत्तम प्राप्ति योगं", 
    "दैवासुर संपद्विभाग योगं","श्रद्धात्रय विभाग योगं","मोक्षसन्न्यासयोगं"
  ],

  ta: [
    "அர்ஜுந விஷாத யோகம்","ஸாம்க்ய யோகம்","கர்ம யோகம்", 
    "ஜ்ஞாந யோகம்","கர்ம ஸந்யாஸ யோகம்","ஆத்ம ஸம்யம யோகம்", 
    "ஜ்ஞாந விஜ்ஞாந யோகம்","அக்ஷர பரப்ரஹ்ம யோகம்","ராஜ வித்யா ராஜ குஹ்ய யோகம்", 
    "விபூதி யோகம்","விஶ்வரூப ஸம்தர்ஶந யோகம்","பக்தி யோகம்", 
    "க்ஷேத்ர க்ஷேத்ரஜ்ஞ விபாக யோகம்","குணத்ரய விபாக யோகம்","புருஷோத்தம ப்ராப்தி யோகம்", 
    "தைவாஸுர ஸம்பத்விபாக யோகம்","ஶ்ரத்தாத்ரய விபாக யோகம்","மோக்ஷஸந்ந்யாஸயோகம்"
  ],

  kn: [
    "ಅರ್ಜುನ ವಿಷಾದ ಯೋಗಂ","ಸಾಂಖ್ಯ ಯೋಗಂ","ಕರ್ಮ ಯೋಗಂ", 
    "ಜ್ಞಾನ ಯೋಗಂ","ಕರ್ಮ ಸನ್ಯಾಸ ಯೋಗಂ","ಆತ್ಮ ಸಂಯಮ ಯೋಗಂ", 
    "ಜ್ಞಾನ ವಿಜ್ಞಾನ ಯೋಗಂ","ಅಕ್ಷರ ಪರಬ್ರಹ್ಮ ಯೋಗಂ","ರಾಜ ವಿದ್ಯಾ ರಾಜ ಗುಹ್ಯ ಯೋಗಂ", 
    "ವಿಭೂತಿ ಯೋಗಂ","ವಿಶ್ವರೂಪ ಸಂದರ್ಶನ ಯೋಗಂ","ಭಕ್ತಿ ಯೋಗಂ", 
    "ಕ್ಷೇತ್ರ ಕ್ಷೇತ್ರಜ್ಞ ವಿಭಾಗ ಯೋಗಂ","ಗುಣತ್ರಯ ವಿಭಾಗ ಯೋಗಂ","ಪುರುಷೋತ್ತಮ ಪ್ರಾಪ್ತಿ ಯೋಗಂ", 
    "ದೈವಾಸುರ ಸಂಪದ್ವಿಭಾಗ ಯೋಗಂ","ಶ್ರದ್ಧಾತ್ರಯ ವಿಭಾಗ ಯೋಗಂ","ಮೋಕ್ಷಸನ್ನ್ಯಾಸಯೋಗಂ"
  ],

  ml: [
    "അർജുന വിഷാദ യോഗം","സാംഖ്യ യോഗം","കർമ യോഗം", 
    "ജ്ഞാന യോഗം","കർമ സന്യാസ യോഗം","ആത്മ സംയമ യോഗം", 
    "ജ്ഞാന വിജ്ഞാന യോഗം","അക്ഷര പരബ്രഹ്മ യോഗം","രാജ വിദ്യാ രാജ ഗുഹ്യ യോഗം", 
    "വിഭൂതി യോഗം","വിശ്വരൂപ സന്ദർശന യോഗം","ഭക്തി യോഗം", 
    "ക്ഷേത്ര ക്ഷേത്രജ്ഞ വിഭാഗ യോഗം","ഗുണത്രയ വിഭാഗ യോഗം","പുരുഷോത്തമ പ്രാപ്തി യോഗം", 
    "ദൈവാസുര സമ്പദ്വിഭാഗ യോഗം","ശ്രദ്ധാത്രയ വിഭാഗ യോഗം","മോക്ഷസന്ന്യാസയോഗം"
  ],

  gu: [
    "અર્જુન વિષાદ યોગં","સાંખ્ય યોગં","કર્મ યોગં", 
    "જ્ઞાન યોગં","કર્મ સન્યાસ યોગં","આત્મ સંયમ યોગં", 
    "જ્ઞાન વિજ્ઞાન યોગં","અક્ષર પરબ્રહ્મ યોગં","રાજ વિદ્યા રાજ ગુહ્ય યોગં", 
    "વિભૂતિ યોગં","વિશ્વરૂપ સંદર્શન યોગં","ભક્તિ યોગં", 
    "ક્ષેત્ર ક્ષેત્રજ્ઞ વિભાગ યોગં","ગુણત્રય વિભાગ યોગં","પુરુષોત્તમ પ્રાપ્તિ યોગં", 
    "દૈવાસુર સંપદ્વિભાગ યોગં","શ્રદ્ધાત્રય વિભાગ યોગં","મોક્ષસન્ન્યાસયોગં"
  ],

  bn: [
    "অর্জুন বিষাদ যোগং","সাংখ্য যোগং","কর্ম যোগং", 
    "জ্ঞান যোগং","কর্ম সন্যাস যোগং","আত্ম সংযম যোগং", 
    "জ্ঞান বিজ্ঞান যোগং","অক্ষর পরব্রহ্ম যোগং","রাজ বিদ্যা রাজ গুহ্য যোগং", 
    "বিভূতি যোগং","বিশ্বরূপ সংদর্শন যোগং","ভক্তি যোগং", 
    "ক্ষেত্র ক্ষেত্রজ্ঞ বিভাগ যোগং","গুণত্রয় বিভাগ যোগং","পুরুষোত্তম প্রাপ্তি যোগং", 
    "দৈবাসুর সম্পদ্বিভাগ যোগং","শ্রদ্ধাত্রয় বিভাগ যোগং","মোক্ষসন্ন্যাসযোগং"
  ],

  or: [
    "ଅର୍ଜୁନ ଵିଷାଦ ଯୋଗଂ","ସାଂଖ୍ଯ ଯୋଗଂ","କର୍ମ ଯୋଗଂ", 
    "ଜ୍ଞାନ ଯୋଗଂ","କର୍ମ ସନ୍ଯାସ ଯୋଗଂ","ଆତ୍ମ ସଂଯମ ଯୋଗଂ", 
    "ଜ୍ଞାନ ଵିଜ୍ଞାନ ଯୋଗଂ","ଅକ୍ଷର ପରବ୍ରହ୍ମ ଯୋଗଂ","ରାଜ ଵିଦ୍ଯା ରାଜ ଗୁହ୍ଯ ଯୋଗଂ", 
    "ଵିଭୂତି ଯୋଗଂ","ଵିଶ୍ଵରୂପ ସଂଦର୍ଶନ ଯୋଗଂ","ଭକ୍ତି ଯୋଗଂ", 
    "କ୍ଷେତ୍ର କ୍ଷେତ୍ରଜ୍ଞ ଵିଭାଗ ଯୋଗଂ","ଗୁଣତ୍ରଯ ଵିଭାଗ ଯୋଗଂ","ପୁରୁଷୋତ୍ତମ ପ୍ରାପ୍ତି ଯୋଗଂ", 
    "ଦୈଵାସୁର ସଂପଦ୍ଵିଭାଗ ଯୋଗଂ","ଶ୍ରଦ୍ଧାତ୍ରଯ ଵିଭାଗ ଯୋଗଂ","ମୋକ୍ଷସନ୍ନ୍ଯାସଯୋଗଂ"
  ]
};
Object.keys(chapterNames).forEach(lang => {
  if (lang === "te") return;
  const data = languageData[lang];
  chapterNames[lang] = Array.from({length: 18}, (_, index) =>
    data && data[index + 1] && data[index + 1].name
      ? data[index + 1].name
      : chapterNames.te[index]
  );
});

const slokaLabel = {
  te: "శ్లోకం", en: "Sloka", hi: "श्लोक", ta: "சுலோகம்", kn: "ಶ್ಲೋಕ",
  ml: "ശ്ലോകം", gu: "શ્લોક", bn: "শ্লোক", or: "ଶ୍ଲୋକ"
};

const tatparyamLabel = {
  te: "తాత్పర్యం",
  en: "Meaning",
  hi: "तात्पर्यम्",
  ta: "பொருள்",
  kn: "ತಾತ್ಪರ್ಯ",
  ml: "താത്പര്യം",
  gu: "તાત્પર્ય",
  bn: "তাৎপর্য",
  or: "ତାତ୍ପର୍ଯ୍ୟ"
};

const aboutUsLabel = {
  te: "మా గురించి",
  en: "About Us",
  hi: "हमारे बारे में",
  ta: "எங்களைப் பற்றி",
  kn: "ನಮ್ಮ ಬಗ್ಗೆ",
  ml: "ഞങ്ങളെക്കുറിച്ച്",
  gu: "અમારા વિશે",
  bn: "আমাদের সম্পর্কে",
  or: "ଆମ ବିଷୟରେ"
};

const inspirationLabel = {
  te: "ప్రేరణ",
  en: "Inspiration",
  hi: "प्रेरणा",
  ta: "ஊக்கம்",
  kn: "ಸ್ಫೂರ್ತಿ",
  ml: "പ്രചോദനം",
  gu: "પ્રેરણા",
  bn: "অনুপ্রেরণা",
  or: "ପ୍ରେରଣା"
};

const gitaTestLabel = {
  te: "గీత పరీక్ష",
  en: "Gita Test",
  hi: "गीता परीक्षा",
  ta: "கீதை சோதனை",
  kn: "ಗೀತಾ ಪರೀಕ್ಷೆ",
  ml: "ഗീത പരീക്ഷ",
  gu: "ગીતા પરીક્ષા",
  bn: "গীতা পরীক্ষা",
  or: "ଗୀତା ପରୀକ୍ଷା"
};

const dyanaLabel = {
  te: "ధ్యాన శ్లోకాలు",
  en: "Dyanaslokas",
  hi: "ध्यान श्लोक",
  ta: "தியான ஸ்லோகங்கள்",
  kn: "ಧ್ಯಾನ ಶ್ಲೋಕಗಳು",
  ml: "ധ്യാന ശ്ലോകങ്ങൾ",
  gu: "ધ્યાન શ્લોકો",
  bn: "ধ্যান শ্লোক",
  or: "ଧ୍ୟାନ ଶ୍ଲୋକ"
};

const mahatyamLabel = {
  te: "గీతా మాహాత్మ్యం",
  en: "Gita Mahatyam",
  hi: "गीता माहात्म्य",
  ta: "கீதா மாஹாத்மியம்",
  kn: "ಗೀತಾ ಮಾಹಾತ್ಮ್ಯ",
  ml: "ഗീതാ മാഹാത്മ്യം",
  gu: "ગીતા માહાત્મ્ય",
  bn: "গীতা মাহাত্ম্য",
  or: "ଗୀତା ମାହାତ୍ମ୍ୟ"
};

const specialLabel = { dyana: dyanaLabel, mahatyam: mahatyamLabel };

function getSpecialLabel(key){
  const l = specialLabel[key] || {};
  return l[currentLang] || l.te || "";
}

function updateStaticLabels(){
  for(const key of Object.keys(SPECIAL_VIEWS)){
    const el = document.getElementById(key + 'BtnLabel');
    if(el) el.innerText = getSpecialLabel(key);
  }

  const aboutEl = document.getElementById('aboutUsLabel');
  if(aboutEl) aboutEl.innerText = aboutUsLabel[currentLang] || aboutUsLabel.te;

  const inspEl = document.getElementById('inspirationLabel');
  if(inspEl) inspEl.innerText = inspirationLabel[currentLang] || inspirationLabel.te;

  const gitaTestEl = document.getElementById('gitaTestLabel');
  if(gitaTestEl) gitaTestEl.innerText = gitaTestLabel[currentLang] || gitaTestLabel.te;
}

// Telugu is the default language, but the user's last choice (saved in
// localStorage by changeLanguage) carries forward across pages/reloads so
// that pages like GitaTest.html open in the language chosen on the home page.
let currentLang = localStorage.getItem('gitaLang') || 'te';
if (!languageData[currentLang]) currentLang = 'te';

// Keep the dropdown synchronized with the active language.
document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = currentLang;
  renderChapterGrid();
  updateStaticLabels();
});

/*  DYANA SLOKAS — per-language data (defined in gita-data.js)  */
const dyanaLanguageData = {
  te: (typeof gitaDyanaslokaTelugu     !== 'undefined') ? gitaDyanaslokaTelugu     : null,
  en: (typeof gitadyanaslokaEnglish    !== 'undefined') ? gitadyanaslokaEnglish    : null,
  hi: (typeof gitaDyanaslokaDevanagari !== 'undefined') ? gitaDyanaslokaDevanagari : null,
  ta: (typeof gitaDyanaslokaTamil      !== 'undefined') ? gitaDyanaslokaTamil      : null,
  kn: (typeof gitaDyanaslokaKannada    !== 'undefined') ? gitaDyanaslokaKannada    : null,
  ml: (typeof gitaDyanaslokaMalayalam  !== 'undefined') ? gitaDyanaslokaMalayalam  : null,
  gu: (typeof gitaDyanaslokaGujarati   !== 'undefined') ? gitaDyanaslokaGujarati   : null,
  bn: (typeof gitaDyanaslokaBengali    !== 'undefined') ? gitaDyanaslokaBengali    : null,
  or: (typeof gitaDyanaslokaOdia       !== 'undefined') ? gitaDyanaslokaOdia       : null,
};

/*  GITA MAHATYAM — per-language data (defined in gita-data.js)  */
const mahatyamLanguageData = {
  te: (typeof gitaMahatyamTeluguData     !== 'undefined') ? gitaMahatyamTeluguData     : null,
  en: (typeof gitamahatyamenglishdata    !== 'undefined') ? gitamahatyamenglishdata    : null,
  hi: (typeof gitaMahatyamDevanagariData !== 'undefined') ? gitaMahatyamDevanagariData : null,
  ta: (typeof gitaMahatyamTamilData      !== 'undefined') ? gitaMahatyamTamilData      : null,
  kn: (typeof gitaMahatyamKannadaData    !== 'undefined') ? gitaMahatyamKannadaData    : null,
  ml: (typeof gitaMahatyamMalayalamData  !== 'undefined') ? gitaMahatyamMalayalamData  : null,
  gu: (typeof gitaMahatyamGujaratiData   !== 'undefined') ? gitaMahatyamGujaratiData   : null,
  bn: (typeof gitaMahatyamBengaliData    !== 'undefined') ? gitaMahatyamBengaliData    : null,
  or: (typeof gitaMahatyamOdiaData       !== 'undefined') ? gitaMahatyamOdiaData       : null,
};

const specialLanguageData = { dyana: dyanaLanguageData, mahatyam: mahatyamLanguageData };

function getSpecialData(key){
  const all = specialLanguageData[key] || {};
  const d = all[currentLang] || all.te;
  // If gita-data.js is stale/missing the block, fail softly instead of breaking the page
  return d ? d[1] : { name: key, slokas: [] };
}

function getDyanaData(){ return getSpecialData(DYANA_KEY); }
function getMahatyamData(){ return getSpecialData(MAHATYAM_KEY); }


/*  MEANINGS (తాత్పర్యం) — chapters, Dyana slokas and Gita Mahatmya, in all 9 languages.
    Data files are big (~3.8 MB), so they are fetched the first time a meaning is opened.
    Site language keys → data-set language: hi (Devanagari) uses the Sanskrit data set. */
const MEANING_FILES = ["TatparyasMultiLan.js", "DyanaAndMahatyam.js"];
let meaningDataPromise = null;

function ensureMeaningData(){
  if(meaningDataPromise) return meaningDataPromise;
  meaningDataPromise = Promise.all(MEANING_FILES.map(src => new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src + "?v=10102026a";
    el.onload = resolve;
    el.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(el);
  }))).catch(err => { meaningDataPromise = null; throw err; });   /* allow a retry after a failure */
  return meaningDataPromise;
}

function getMeaningSets(){
  return {
    chapter: {
      te: typeof tatparyaDatTelugu !== "undefined" ? tatparyaDatTelugu : null,
      en: typeof tatparyaDataEnglish !== "undefined" ? tatparyaDataEnglish : null,
      hi: typeof tatparyaDataSanskrit !== "undefined" ? tatparyaDataSanskrit : null,
      ta: typeof tatparyaDataTamil !== "undefined" ? tatparyaDataTamil : null,
      kn: typeof tatparyaDataKannada !== "undefined" ? tatparyaDataKannada : null,
      ml: typeof tatparyaDataMalayalam !== "undefined" ? tatparyaDataMalayalam : null,
      gu: typeof tatparyaDataGujarati !== "undefined" ? tatparyaDataGujarati : null,
      bn: typeof tatparyaDataBengali !== "undefined" ? tatparyaDataBengali : null,
      or: typeof tatparyaDataOdia !== "undefined" ? tatparyaDataOdia : null
    },
    dyana: {
      te: typeof dyanatatparyaTelugu !== "undefined" ? dyanatatparyaTelugu : null,
      en: typeof dyanatatparyaEnglish !== "undefined" ? dyanatatparyaEnglish : null,
      hi: typeof dyanatatparyaSanskrit !== "undefined" ? dyanatatparyaSanskrit : null,
      ta: typeof dyanatatparyaTamil !== "undefined" ? dyanatatparyaTamil : null,
      kn: typeof dyanatatparyaKannada !== "undefined" ? dyanatatparyaKannada : null,
      ml: typeof dyanatatparyaMalayalam !== "undefined" ? dyanatatparyaMalayalam : null,
      gu: typeof dyanatatparyaGujarati !== "undefined" ? dyanatatparyaGujarati : null,
      bn: typeof dyanatatparyaBengali !== "undefined" ? dyanatatparyaBengali : null,
      or: typeof dyanatatparyaOdia !== "undefined" ? dyanatatparyaOdia : null
    },
    mahatyam: {
      te: typeof gitaMahatmyaTatparyaTelugu !== "undefined" ? gitaMahatmyaTatparyaTelugu : null,
      en: typeof gitaMahatmyaTatparyaEnglish !== "undefined" ? gitaMahatmyaTatparyaEnglish : null,
      hi: typeof gitaMahatmyaTatparyaSanskrit !== "undefined" ? gitaMahatmyaTatparyaSanskrit : null,
      ta: typeof gitaMahatmyaTatparyaTamil !== "undefined" ? gitaMahatmyaTatparyaTamil : null,
      kn: typeof gitaMahatmyaTatparyaKannada !== "undefined" ? gitaMahatmyaTatparyaKannada : null,
      ml: typeof gitaMahatmyaTatparyaMalayalam !== "undefined" ? gitaMahatmyaTatparyaMalayalam : null,
      gu: typeof gitaMahatmyaTatparyaGujarati !== "undefined" ? gitaMahatmyaTatparyaGujarati : null,
      bn: typeof gitaMahatmyaTatparyaBengali !== "undefined" ? gitaMahatmyaTatparyaBengali : null,
      or: typeof gitaMahatmyaTatparyaOdia !== "undefined" ? gitaMahatmyaTatparyaOdia : null
    }
  };
}

/* Meaning text for chapter number (or "dyana"/"mahatyam") + 0-based sloka index; null if none. */
function getMeaning(num, i, lang){
  const sets = getMeaningSets();
  const set = isSpecialView(num) ? sets[num] : sets.chapter;
  const data = set && set[lang];
  if(!data) return null;
  const entry = isSpecialView(num) ? data[i] : (data[num] && data[num][i]);
  return (entry === undefined || entry === null || entry === "") ? null : entry;
}

function getLangData(){
  return languageData[currentLang] || gitaData;
}

function renderChapterGrid(){
  const grid = document.getElementById("chapterGrid");
  if(!grid) return;
  const data = getLangData();
  const names = chapterNames[currentLang] || chapterNames.te;
  let html = "";
  for(let i = 1; i <= 18; i++){
    const chName = names[i - 1] || (data[i] && data[i].name) || gitaData[i].name;
    html += `
      <a href="#chapter-${i}"
        class="card h-36 flex flex-col items-center justify-center gap-2 p-3 fade">
        <span class="material-symbols-outlined text-4xl text-saffron">menu_book</span>
        <span class="text-sm font-bold text-center">${i}. ${chName}</span>
      </a>`;
  }
  grid.innerHTML = html;
}

/* ── Discoverability: tell people that double-tap / double-click on a sloka opens Play popup ── */
const dblHintText = {
  te: ["ఏదైనా శ్లోకంపై రెండుసార్లు నొక్కండి (డబుల్ ట్యాప్) – ప్లే చేసే శ్లోకాల పరిధి ఎంచుకోవచ్చు", "ఏదైనా శ్లోకంపై డబుల్ క్లిక్ చేయండి – ప్లే చేసే శ్లోకాల పరిధి ఎంచుకోవచ్చు"],
  en: ["Double-tap any sloka to choose a range to play, repeat and speed", "Double-click any sloka to choose a range to play, repeat and speed"],
  hi: ["किसी भी श्लोक पर दो बार टैप करें – चलाने की सीमा चुनें", "किसी भी श्लोक पर डबल क्लिक करें – चलाने की सीमा चुनें"]
};
function showDoubleTapHint(){
  let el = document.getElementById("dblHint");
  if(!el){
    el = document.createElement("p");
    el.id = "dblHint"; el.className = "dbl-hint";
    chapterTitle.insertAdjacentElement("afterend", el);
  }
  const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const set = dblHintText[currentLang] || dblHintText.en;
  el.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">touch_app</span><span></span>';
  el.lastChild.textContent = touch ? set[0] : set[1];
  /* first time on this device: one-time toast + a gentle pulse on the first sloka */
  let seen = false;
  try { seen = localStorage.getItem("gitaDblHintSeen") === "1"; } catch(e){}
  if(!seen){
    try { localStorage.setItem("gitaDblHintSeen", "1"); } catch(e){}
    if(window.GitaUI) window.GitaUI.toast(touch ? set[0] : set[1], {duration: 6000});
    setTimeout(() => { const f = slokaContainer.firstElementChild; if(f){ f.classList.add("dbl-pulse"); setTimeout(() => f.classList.remove("dbl-pulse"), 2600); } }, 400);
  }
}

function changeLanguage(lang){
  currentLang = languageData[lang] ? lang : 'te';
  localStorage.setItem('gitaLang', currentLang);

  const langSelect = document.getElementById("langSelect");
  if(langSelect) langSelect.value = currentLang;

  renderChapterGrid();
  updateStaticLabels();
  if(location.hash.startsWith("#chapter-") || isSpecialView(getCurrentViewNum())){
    loadFromHash();
  }
}

/* ─── NAVIGATION ────────────────────────────── */
function loadFromHash(){
  // Guard so app.js can be safely included on pages (e.g. GitaTest.html)
  // that don't have the #home / #viewer sections.
  if(!home || !viewer) return;

  stopCurrentAudio();
  const hash = location.hash;

  if(!hash.startsWith("#chapter-") && !isSpecialView(getCurrentViewNum())){
    home.classList.remove("hidden");
    viewer.classList.add("hidden");
    return;
  }

  const num = getCurrentViewNum();
  let chData;
  if(isSpecialView(num)){
    chData = getSpecialData(num);
  } else {
    if(!num || !gitaData[num]) return;
    const langData = getLangData();
    chData = langData[num] || gitaData[num];
  }

  resetRangePlayer();

  bell.currentTime = 0;
  bell.play().catch(()=>{});

  home.classList.add("hidden");
  viewer.classList.remove("hidden");

  if(isSpecialView(num)){
    chapterTitle.innerText = getSpecialLabel(num);
  } else {
    const names = chapterNames[currentLang] || chapterNames.te;
    const displayChapterName = names[num - 1] || chData.name;
    chapterTitle.innerText = `Chapter ${num}: ${displayChapterName}`;
  }
  slokaContainer.innerHTML = "";
  showDoubleTapHint();

  chData.slokas.forEach((sloka, i) => {
    const div = document.createElement("div");
    div.className = "sloka-box";

    /* ── Audio button (top-right) ── */
    const audioBtn = document.createElement("div");
    audioBtn.className = "sloka-audio-btn material-symbols-outlined";
    audioBtn.innerText = "volume_up";

    let clickTimer = null;
    audioBtn.addEventListener("click", () => {
      if(clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickTimer = null;
        handleSingleAudioClick(num, i, audioBtn);
      }, 250);
    });
    audioBtn.addEventListener("dblclick", (e) => {
      e.stopPropagation(); // keep this separate from the sloka-box range-player double-click
      if(clickTimer){ clearTimeout(clickTimer); clickTimer = null; }
      handleDoubleAudioClick(num, i, audioBtn);
    });

    /* ── Sloka text ── */
    const text = document.createElement("div");
    text.innerText = `${slokaLabel[currentLang] || "శ్లోకం"} ${i+1}\n${sloka}`;

    /* ── తాత్పర్యం panel ── */
    const panel = document.createElement("div");
    panel.className = "tatparyam-panel";

    /* ── తాత్పర్యం button (bottom-right) ── */
    const tatBtn = document.createElement("button");
    tatBtn.className = "tatparyam-btn";
    tatBtn.innerHTML = `<span class="material-symbols-outlined btn-icon">auto_stories</span><span class="btn-label">${tatparyamLabel[currentLang] || "తాత్పర్యం"}</span>`;

    tatBtn.onclick = () => {
      /* Toggle: if already visible, hide it */
      if(panel.classList.contains('visible')){
        panel.classList.remove('visible');
        return;
      }
      /* Build content from the meaning data files (loaded on first use) */
      if(panel.innerHTML.trim() === '' || panel.dataset.failed){
        delete panel.dataset.failed;
        const header = `
          <div class="tatparyam-panel-header">
            <span class="material-symbols-outlined" style="font-size:15px;">auto_stories</span>
            ${tatparyamLabel[currentLang] || "తాత్పర్యం"}
          </div>`;
        const lang = currentLang;
        panel.innerHTML = header + '<div><em style="opacity:0.6;">…</em></div>';
        ensureMeaningData().then(() => {
          if(currentLang !== lang) return;   /* language changed meanwhile: the view re-renders itself */
          const text = getMeaning(num, i, lang);
          const notReadyMsg = lang === 'te'
            ? '<em style="opacity:0.6;">త్వరలో జోడించబడుతుంది…</em>'
            : '<em style="opacity:0.6;">We will add meanings further in the respective language.</em>';
          panel.innerHTML = header + '<div>' + (text !== null ? text : notReadyMsg) + '</div>';
        }).catch(() => {
          panel.innerHTML = header + '<div><em style="opacity:0.6;">Could not load the meanings. Check your connection and try again.</em></div>';
          panel.dataset.failed = '1';
        });
      }
      panel.classList.add('visible');
    };

    /* ── Double-click anywhere on the sloka box (text/panel area)
           opens the Range Player, or exits range mode if already active ── */
    let lastTapAt = 0, lastTapX = 0, lastTapY = 0, lastOpenAt = 0;
    const onSlokaDouble = (e) => {
      if(e.target.closest(".sloka-audio-btn") || e.target.closest(".tatparyam-btn")){
        return; // those have their own dblclick / click handling
      }
      const now = Date.now();
      if(now - lastOpenAt < 600) return;           /* dblclick + touch fallback must not fire twice */
      lastOpenAt = now;
      if(rangePlayer.active){
        stopRangeMode();
        return;
      }
      openRangeModal(false);
    };
    div.addEventListener("dblclick", onSlokaDouble);
    /* Some Android WebViews never fire dblclick: detect a double-tap ourselves */
    div.addEventListener("touchend", (e) => {
      const t = e.changedTouches && e.changedTouches[0]; if(!t) return;
      const now = Date.now();
      if(now - lastTapAt < 350 && Math.abs(t.clientX - lastTapX) < 30 && Math.abs(t.clientY - lastTapY) < 30){
        lastTapAt = 0; onSlokaDouble(e);
      } else { lastTapAt = now; lastTapX = t.clientX; lastTapY = t.clientY; }
    }, {passive:true});

    div.appendChild(audioBtn);
    div.appendChild(text);
    div.appendChild(panel);
    div.appendChild(tatBtn);
    slokaContainer.appendChild(div);
  });
}

function initLanguageUI(){
  const sel = document.getElementById("langSelect");
  if(sel) sel.value = currentLang;
  renderChapterGrid();
}

window.addEventListener("load", () => {
  initLanguageUI();
  loadFromHash();
});
window.addEventListener("hashchange", loadFromHash);

function navigate(page){ window.location.href = page; }

function goBack(){
  stopCurrentAudio();
  resetRangePlayer();
  location.hash = "";
}
