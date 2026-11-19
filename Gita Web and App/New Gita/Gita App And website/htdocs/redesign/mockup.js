/* ════════════════════════════════════════════════════════════════
   BHAGAVAD GITA — "DIVYA" REDESIGN · interaction & motion engine
   Vanilla JS, no dependencies. Uses the real project data from
   ../gita-data.js and loads meanings (../TatparyasMultiLan.js,
   ../DyanaAndMahatyam.js) on demand, exactly like the live app.
   ════════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} };
const def = (name) => { try { return eval('typeof ' + name + ' !== "undefined" ? ' + name + ' : null'); } catch(e){ return null; } };

/* ─── project data ─────────────────────────────────────────── */
const AUDIO_BASE = 'https://raw.githubusercontent.com/kolluruharshavardhanhindu-cyber/BhagavadGita/main/';
const LANGS = [
  { k:'te', n:'తెలుగు',   e:'Telugu',    data:'gitaData',           dy:'gitaDyanaslokaTelugu',     mh:'gitaMahatyamTeluguData',     mean:'tatparyaDatTelugu',    dyM:'dyanatatparyaTelugu',    mhM:'gitaMahatmyaTatparyaTelugu' },
  { k:'en', n:'English',  e:'English',   data:'gitaEnglishData',    dy:'gitadyanaslokaEnglish',    mh:'gitamahatyamenglishdata',    mean:'tatparyaDataEnglish',  dyM:'dyanatatparyaEnglish',   mhM:'gitaMahatmyaTatparyaEnglish' },
  { k:'hi', n:'देवनागरी',  e:'Devanagari', data:'gitaDevanagariData', dy:'gitaDyanaslokaDevanagari', mh:'gitaMahatyamDevanagariData', mean:'tatparyaDataSanskrit', dyM:'dyanatatparyaSanskrit',  mhM:'gitaMahatmyaTatparyaSanskrit' },
  { k:'ta', n:'தமிழ்',    e:'Tamil',     data:'gitaTamilData',      dy:'gitaDyanaslokaTamil',      mh:'gitaMahatyamTamilData',      mean:'tatparyaDataTamil',    dyM:'dyanatatparyaTamil',     mhM:'gitaMahatmyaTatparyaTamil' },
  { k:'kn', n:'ಕನ್ನಡ',    e:'Kannada',   data:'gitaKannadaData',    dy:'gitaDyanaslokaKannada',    mh:'gitaMahatyamKannadaData',    mean:'tatparyaDataKannada',  dyM:'dyanatatparyaKannada',   mhM:'gitaMahatmyaTatparyaKannada' },
  { k:'ml', n:'മലയാളം',   e:'Malayalam', data:'gitaMalayalamData',  dy:'gitaDyanaslokaMalayalam',  mh:'gitaMahatyamMalayalamData',  mean:'tatparyaDataMalayalam',dyM:'dyanatatparyaMalayalam', mhM:'gitaMahatmyaTatparyaMalayalam' },
  { k:'gu', n:'ગુજરાતી',   e:'Gujarati',  data:'gitaGujaratiData',   dy:'gitaDyanaslokaGujarati',   mh:'gitaMahatyamGujaratiData',   mean:'tatparyaDataGujarati', dyM:'dyanatatparyaGujarati',  mhM:'gitaMahatmyaTatparyaGujarati' },
  { k:'bn', n:'বাংলা',    e:'Bengali',   data:'gitaBengaliData',    dy:'gitaDyanaslokaBengali',    mh:'gitaMahatyamBengaliData',    mean:'tatparyaDataBengali',  dyM:'dyanatatparyaBengali',   mhM:'gitaMahatmyaTatparyaBengali' },
  { k:'or', n:'ଓଡ଼ିଆ',     e:'Odia',      data:'gitaOdissaData',     dy:'gitaDyanaslokaOdia',       mh:'gitaMahatyamOdiaData',       mean:'tatparyaDataOdia',     dyM:'dyanatatparyaOdia',      mhM:'gitaMahatmyaTatparyaOdia' }
];
const L = Object.fromEntries(LANGS.map(l => [l.k, l]));
const TE = def('gitaData') || {};
const LABEL = {
  sloka:   { te:'శ్లోకం', en:'Sloka', hi:'श्लोक', ta:'சுலோகம்', kn:'ಶ್ಲೋಕ', ml:'ശ്ലോകം', gu:'શ્લોક', bn:'শ্লোক', or:'ଶ୍ଲୋକ' },
  meaning: { te:'తాత్పర్యం', en:'Meaning', hi:'तात्पर्यम्', ta:'பொருள்', kn:'ತಾತ್ಪರ್ಯ', ml:'താത്പര്യം', gu:'તાત્પર્ય', bn:'তাৎপর্য', or:'ତାତ୍ପର୍ଯ୍ୟ' },
  test:    { te:'గీత పరీక్ష', en:'Gita Test', hi:'गीता परीक्षा', ta:'கீதை சோதனை', kn:'ಗೀತಾ ಪರೀಕ್ಷೆ', ml:'ഗീത പരീക്ഷ', gu:'ગીતા પરીક્ષા', bn:'গীতা পরীক্ষা', or:'ଗୀତା ପରୀକ୍ଷା' },
  dyana:   { te:'ధ్యాన శ్లోకాలు', en:'Dyanaslokas', hi:'ध्यान श्लोक', ta:'தியான ஸ்லோகங்கள்', kn:'ಧ್ಯಾನ ಶ್ಲೋಕಗಳು', ml:'ധ്യാന ശ്ലോകങ്ങൾ', gu:'ધ્યાન શ્લોકો', bn:'ধ্যান শ্লোক', or:'ଧ୍ୟାନ ଶ୍ଲୋକ' },
  mahatyam:{ te:'గీతా మాహాత్మ్యం', en:'Gita Mahatyam', hi:'गीता माहात्म्य', ta:'கீதா மாஹாத்மியம்', kn:'ಗೀತಾ ಮಾಹಾತ್ಮ್ಯ', ml:'ഗീതാ മാഹാത്മ്യം', gu:'ગીતા માહાત્મ્ય', bn:'গীতা মাহাত্ম্য', or:'ଗୀତା ମାହାତ୍ମ୍ୟ' }
};
const NAMES = {
  te: ["అర్జున విషాద యోగం","సాంఖ్య యోగం","కర్మ యోగం","జ్ఞాన యోగం","కర్మ సన్యాస యోగం","ఆత్మ సంయమ యోగం","జ్ఞాన విజ్ఞాన యోగం","అక్షర పరబ్రహ్మ యోగం","రాజ విద్యా రాజ గుహ్య యోగం","విభూతి యోగం","విశ్వరూప సందర్శన యోగం","భక్తి యోగం","క్షేత్ర క్షేత్రజ్ఞ విభాగ యోగం","గుణత్రయ విభాగ యోగం","పురుషోత్తమ ప్రాప్తి యోగం","దైవాసుర సంపద్విభాగ యోగం","శ్రద్ధాత్రయ విభాగ యోగం","మోక్షసన్న్యాసయోగం"],
  en: ["Arjuna Vishada Yogam","Samkhya Yogam","Karma Yogam","Jyana Yogam","Karma Sanyasa Yogam","Atma Samyama Yogam","Jyana Vijyana Yogam","Akshara Parabrahma Yogam","Raja Vidya Raja Guhya Yogam","Vibhuti Yogam","Vishvarupa Samdarshana Yogam","Bhakti Yogam","Kshetra Kshetrajya Vibhaga Yogam","Gunatraya Vibhaga Yogam","Purushottama Prapti Yogam","Daivasura Sampadvibhaga Yogam","Shraddhatraya Vibhaga Yogam","Moksha Sanyasa Yogam"]
};

let lang = store.get('gitaRedesignLang', null) || (() => { try { return localStorage.getItem('gitaLang') || 'te'; } catch(e){ return 'te'; } })();
if(!L[lang] || !def(L[lang].data)) lang = 'te';

const langData = (k = lang) => def(L[k].data) || TE;
const chapter = (ch, k = lang) => { const d = langData(k); return (d && d[ch] && d[ch].slokas && d[ch].slokas.length) ? d[ch] : TE[ch]; };
const sloka = (ch, i, k = lang) => { const c = chapter(ch, k); return (c && c.slokas[i]) || (TE[ch] && TE[ch].slokas[i]) || ''; };
const count = (ch) => (TE[ch] ? TE[ch].slokas.length : 0);
const chName = (ch, k = lang) => (NAMES[k] && NAMES[k][ch - 1]) || (chapter(ch, k) && chapter(ch, k).name) || NAMES.te[ch - 1];
const lbl = (key, k = lang) => LABEL[key][k] || LABEL[key].en;
const special = (key, k = lang) => {
  const l = L[k], d = def(key === 'dyana' ? l.dy : l.mh) || def(key === 'dyana' ? L.te.dy : L.te.mh);
  return d && d[1] ? d[1].slokas : [];
};
const audioUrl = (it) => it.kind === 'dyana' ? `${AUDIO_BASE}GitaDyanaSlokas/dyanaslokam_${it.i + 1}.mp3`
  : it.kind === 'mahatyam' ? `${AUDIO_BASE}GitaMahatyam/mahatyam_${it.i + 1}.mp3`
  : `${AUDIO_BASE}GitaAudio/audio_${it.ch}_${it.i + 1}.mp3`;

/* meanings: loaded on demand (3.7 MB) */
let meaningP = null;
function ensureMeanings(){
  if(meaningP) return meaningP;
  meaningP = Promise.all(['../TatparyasMultiLan.js', '../DyanaAndMahatyam.js'].map(src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s);
  }))).catch(e => { meaningP = null; throw e; });
  return meaningP;
}
function meaning(it, k = lang){
  const pick = (kk) => {
    const l = L[kk];
    if(it.kind === 'dyana'){ const d = def(l.dyM); return d && d[it.i]; }
    if(it.kind === 'mahatyam'){ const d = def(l.mhM); return d && d[it.i]; }
    const d = def(l.mean); return d && d[it.ch] && d[it.ch][it.i];
  };
  return pick(k) || pick('en') || pick('te') || null;
}

/* reading progress (per device) */
const READ = store.get('gitaRedesignRead', {});
const readCount = (ch) => (READ[ch] ? READ[ch].length : 0);
function markRead(ch, i){
  READ[ch] = READ[ch] || [];
  if(READ[ch].includes(i)) return;
  READ[ch].push(i); store.set('gitaRedesignRead', READ);
  updateProgressUI(ch);
}

/* ─── toast ─────────────────────────────────────────────────── */
function toast(msg, icon = 'auto_awesome'){
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="msi">${icon}</span><span></span>`;
  t.lastChild.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2800);
}

/* ─── text scramble (script-aware decode) ──────────────────── */
function scramble(el, text, dur = 750){
  if(!el) return;
  cancelAnimationFrame(el._sr);
  if(RM){ el.textContent = text; return; }
  const to = Array.from(text), pool = to.filter(c => c.trim());
  const t0 = performance.now(); let frame = 0;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), n = Math.floor(p * to.length);
    if(frame++ % 2 === 0 || p === 1){
      let out = '';
      for(let k = 0; k < to.length; k++){
        const c = to[k];
        out += (k < n || c === '\n' || c === ' ') ? c : (pool[(Math.random() * pool.length) | 0] || c);
      }
      el.textContent = out;
    }
    if(p < 1) el._sr = requestAnimationFrame(step);
  };
  el._sr = requestAnimationFrame(step);
}

/* ════════ 0 · INTRO ════════ */
(function intro(){
  const g = $('#introPetals');
  let h = '';
  for(let k = 0; k < 12; k++){
    h += `<path class="petal" style="--r:${k * 30}deg;animation-delay:${k * 60 + 200}ms" d="M100 100 C 86 70, 90 40, 100 22 C 110 40, 114 70, 100 100 Z"/>`;
  }
  g.innerHTML = h;
  const minTime = new Promise(r => setTimeout(r, RM ? 50 : 2300));
  const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  Promise.all([minTime, fonts]).then(() => {
    $('#intro').classList.add('open');
    document.body.classList.remove('is-loading');
    setTimeout(startHero, 350);
    setTimeout(() => $('#intro').classList.add('gone'), 1300);
  });
})();

/* ════════ 1 · HERO ════════ */
function splitHero(){
  const h = $('#heroTitle'); let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach(n => {
      if(n.nodeType === 3){
        const frag = document.createDocumentFragment();
        Array.from(n.textContent).forEach(c => {
          const s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i++);
          s.textContent = c === ' ' ? ' ' : c; s.setAttribute('aria-hidden', 'true'); frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if(n.nodeType === 1 && n.classList.contains('text-grad')){
        n.classList.add('ch'); n.style.setProperty('--i', i); i += 6;
      }
    });
  };
  walk(h);
}
splitHero();
function startHero(){ $('#heroTitle').classList.add('go'); }

function mandala(svg, kind){
  let s = '';
  if(kind === 'A'){
    s += '<circle r="97" fill="none" stroke="currentColor" stroke-width=".5"/><circle r="90" fill="none" stroke="currentColor" stroke-width=".3"/><circle r="62" fill="none" stroke="currentColor" stroke-width=".4"/>';
    for(let k = 0; k < 24; k++) s += `<ellipse cx="0" cy="-76" rx="7" ry="18" transform="rotate(${k * 15})" fill="none" stroke="currentColor" stroke-width=".45"/>`;
    for(let k = 0; k < 48; k++) s += `<circle cx="0" cy="-93.5" r="${k % 2 ? .7 : 1.4}" transform="rotate(${k * 7.5})" fill="currentColor"/>`;
  } else {
    s += '<circle r="96" fill="none" stroke="currentColor" stroke-width=".5" stroke-dasharray="2 3"/><circle r="72" fill="none" stroke="currentColor" stroke-width=".5"/>';
    for(let k = 0; k < 12; k++) s += `<path d="M0 -96 L7 -74 L0 -66 L-7 -74 Z" transform="rotate(${k * 30})" fill="none" stroke="currentColor" stroke-width=".55"/>`;
    for(let k = 0; k < 16; k++) s += `<path d="M0 -70 C 6 -60, 6 -52, 0 -46 C -6 -52, -6 -60, 0 -70 Z" transform="rotate(${k * 22.5})" fill="currentColor" opacity=".18"/>`;
  }
  svg.innerHTML = s;
}
mandala($('#mandalaA'), 'A');
mandala($('#mandalaB'), 'B');

/* hero parallax (pointer + device tilt) */
(function parallax(){
  const stage = $('#stage'); let tx = 0, ty = 0, x = 0, y = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const tick = () => {
    x = lerp(x, tx, .06); y = lerp(y, ty, .06);
    stage.style.setProperty('--mx', x.toFixed(3)); stage.style.setProperty('--my', y.toFixed(3));
    requestAnimationFrame(tick);
  };
  if(!RM) tick();
})();

/* Gita 2.47 cycling through every script */
(function ticker(){
  const order = ['te', 'hi', 'en', 'ta', 'kn', 'ml', 'gu', 'bn', 'or'].filter(k => def(L[k].data));
  let n = 0;
  const show = () => {
    const k = order[n++ % order.length];
    $('#tickerLang').textContent = L[k].e.toUpperCase();
    scramble($('#ticker'), sloka(2, 46, k).replace(/\n\s*/g, '\n').trim(), 1100);
  };
  show(); setInterval(show, 4800);
})();

/* count-up stats */
function countUp(el){
  const to = +el.dataset.count, t0 = performance.now(), d = 1600;
  const step = (t) => { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e); if(p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ════════ ambient cosmos canvas ════════ */
const Cosmos = (function(){
  const c = $('#cosmos'), x = c.getContext('2d');
  let W, H, DPR, stars = [], embers = [], col = {}, running = true, mx = -999, my = -999;
  const readColors = () => { const cs = getComputedStyle(root); col.star = cs.getPropertyValue('--star').trim(); col.ember = cs.getPropertyValue('--ember').trim(); col.dark = root.dataset.theme === 'dark'; };
  const size = () => {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    c.width = W * DPR; c.height = H * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.min(170, Math.round(W * H / 9000));
    stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: Math.random() * .02 + .005 }));
    embers = Array.from({ length: Math.min(46, Math.round(W / 30)) }, () => newEmber(true));
  };
  const newEmber = (any) => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 10, vy: -(Math.random() * .5 + .15), vx: 0, r: Math.random() * 2.2 + .6, p: Math.random() * 6.28, life: 1 });
  const draw = () => {
    if(running){
      x.clearRect(0, 0, W, H);
      const sy = scrollY * .05;
      x.fillStyle = col.star;
      for(const s of stars){
        s.p += s.s; x.globalAlpha = (col.dark ? .25 : .15) + Math.abs(Math.sin(s.p)) * (col.dark ? .65 : .35);
        x.beginPath(); x.arc(s.x, (s.y - sy % H + H) % H, s.r, 0, 6.283); x.fill();
      }
      x.fillStyle = col.ember;
      for(const e of embers){
        e.p += .02; e.x += Math.sin(e.p) * .35 + e.vx; e.y += e.vy; e.vx *= .95;
        const dx = e.x - mx, dy = e.y - my, d2 = dx * dx + dy * dy;
        if(d2 < 14000){ const f = (14000 - d2) / 14000; e.vx += (dx / Math.sqrt(d2 + 1)) * f * 1.4; e.y += (dy > 0 ? 1 : -1) * f; }
        if(e.y < -10) Object.assign(e, newEmber(false));
        x.globalAlpha = .35 + .4 * Math.abs(Math.sin(e.p * 2));
        x.shadowBlur = 12; x.shadowColor = col.ember;
        x.beginPath(); x.arc(e.x, e.y, e.r, 0, 6.283); x.fill(); x.shadowBlur = 0;
      }
      x.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  };
  addEventListener('resize', size);
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden && !root.classList.contains('calm'); });
  readColors(); size(); if(!RM) draw();
  return { readColors, pause(v){ running = !v; if(v) x.clearRect(0, 0, W, H); } };
})();

/* ════════ chrome: progress · topbar · nav pill · tour · cursor ════════ */
(function chrome(){
  const bar = $('#progBar'), top = $('#topbar'); let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    top.classList.toggle('hide', y > lastY && y > 300 && !$('#sheet').classList.contains('open'));
    lastY = y;
  }, { passive: true });

  /* tour rail */
  const tour = $('#tour'); const secs = $$('[data-tour]');
  secs.forEach((s, k) => { const a = document.createElement('a'); a.href = '#' + s.id; a.innerHTML = `<span>${String(k + 1).padStart(2, '0')} · ${s.dataset.tour}</span>`; a.setAttribute('aria-label', s.dataset.tour); tour.appendChild(a); });
  const navLinks = $$('#nav a'), pill = $('#nav .pill');
  const movePill = (a) => { if(!a){ pill.style.opacity = 0; return; } pill.style.opacity = 1; pill.style.left = a.offsetLeft + 'px'; pill.style.width = a.offsetWidth + 'px'; };
  const io = new IntersectionObserver((es) => {
    es.forEach(en => {
      if(!en.isIntersecting) return;
      const id = en.target.id;
      $$('#tour a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
      const map = { chapters:'chapters', reader:'reader', rangeInfo:'reader', test:'test', dhyana:'dhyana', votd:'dhyana', lineage:'lineage' };
      const hit = navLinks.find(a => a.getAttribute('href') === '#' + map[id]);
      navLinks.forEach(a => a.classList.toggle('on', a === hit)); movePill(hit);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => io.observe(s));
  movePill(null);

  /* custom cursor */
  if(FINE && !RM){
    const ring = $('.cursor'), dot = $('.cursor-dot'); let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)`; }, { passive: true });
    document.addEventListener('pointerover', (e) => { ring.classList.toggle('hot', !!e.target.closest('a,button,.tilt,.node,.sloka,.level,.dcard')); });
    const loop = () => { rx = lerp(rx, x, .16); ry = lerp(ry, y, .16); ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); };
    loop();
  }

  /* magnetic buttons + ripple */
  document.addEventListener('pointermove', (e) => {
    if(!FINE) return;
    const m = e.target.closest('.magnetic');
    $$('.magnetic.mag-on').forEach(b => { if(b !== m){ b.classList.remove('mag-on'); b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); } });
    if(!m) return;
    const r = m.getBoundingClientRect();
    m.classList.add('mag-on');
    m.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px');
    m.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px');
  }, { passive: true });
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if(!b) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, sp = document.createElement('span');
    sp.className = 'ripple'; sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(sp); setTimeout(() => sp.remove(), 700);
  });

  /* theme: circular reveal from the toggle */
  $('#themeBtn').addEventListener('click', (e) => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next; store.set('gitaRedesignTheme', next);
      try { localStorage.setItem('gitaRedesignTheme', next); } catch(_){}
      $('meta[name=theme-color]').setAttribute('content', next === 'dark' ? '#070514' : '#fbf3e4');
      Cosmos.readColors(); paintSwatches();
    };
    if(!document.startViewTransition || RM){ apply(); return; }
    const x = e.clientX, y = e.clientY, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 900, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
    });
  });
  /* store.set JSON-encodes; the head script reads raw → keep raw value */
  try { const t = localStorage.getItem('gitaRedesignTheme'); if(t && t[0] === '"') localStorage.setItem('gitaRedesignTheme', JSON.parse(t)); } catch(_){}

  $('#calmBtn').addEventListener('click', function(){
    const on = !root.classList.contains('calm');
    root.classList.toggle('calm', on); Cosmos.pause(on);
    this.setAttribute('aria-pressed', on); this.firstChild.textContent = on ? 'motion_photos_paused' : 'motion_photos_on';
    toast(on ? 'Ambient motion paused' : 'Ambient motion resumed', on ? 'pause_circle' : 'play_circle');
  });
})();

/* ════════ scroll reveal ════════ */
const revealIO = new IntersectionObserver((es) => {
  es.forEach(en => {
    if(!en.isIntersecting) return;
    const el = en.target; el.classList.add('in'); revealIO.unobserve(el);
    $$('[data-count]', el).forEach(countUp);
  });
}, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
function watchReveal(scope = document){
  $$('[data-reveal]', scope).forEach(el => {
    if(el._rv) return; el._rv = 1;
    const sib = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    el.style.transitionDelay = (Math.min(sib.indexOf(el) % 10, 6) * 70) + 'ms';
    revealIO.observe(el);
  });
}
watchReveal();
revealIO.observe($('.hero .stats'));

/* ════════ segmented controls (shared) ════════ */
function seg(el, onChange){
  const pill = $('.pill', el), btns = $$('button', el);
  const place = () => { const on = $('button.on', el) || btns[0]; pill.style.left = on.offsetLeft + 'px'; pill.style.width = on.offsetWidth + 'px'; if(el.classList.contains('lang-bar')){ pill.style.top = on.offsetTop + 'px'; pill.style.height = on.offsetHeight + 'px'; } };
  btns.forEach(b => b.addEventListener('click', () => { if(b.classList.contains('on')) return; btns.forEach(x => x.classList.toggle('on', x === b)); place(); buzz(6); onChange && onChange(b); }));
  addEventListener('resize', place); requestAnimationFrame(place); setTimeout(place, 600);
  if(document.fonts) document.fonts.ready.then(place);
  return { place };
}

/* ════════ 2 · LANGUAGE ════════ */
const langBar = $('#langBar');
LANGS.filter(l => def(l.data)).forEach(l => {
  const b = document.createElement('button'); b.dataset.k = l.k; b.setAttribute('role', 'tab');
  b.innerHTML = `${l.n}<small>${l.e}</small>`; if(l.k === lang) b.classList.add('on');
  langBar.appendChild(b);
});
const langSeg = seg(langBar, (b) => setLang(b.dataset.k));
function paintLangDemo(){
  scramble($('#lsName'), chName(2)); scramble($('#lsLabel'), `${lbl('sloka')} 47 · ${lbl('meaning')}`); scramble($('#lsTest'), lbl('test'));
}
function setLang(k){
  lang = k; store.set('gitaRedesignLang', k);
  try { localStorage.setItem('gitaLang', k); } catch(e){}
  paintLangDemo(); Wheel.refresh(true); buildGrid(); Reader.render(Reader.ch, true); Carousel.render(); VOTD.paint(true);
  $('#dsDyana').textContent = lbl('dyana'); $('#dsMaha').textContent = lbl('mahatyam'); dhSeg.place();
  toast(`${L[k].n} · ${L[k].e}`, 'translate');
}

/* ════════ 3 · CHAKRA WHEEL ════════ */
const Wheel = (function(){
  const el = $('#chakra'), rotor = $('#rotor'), spokes = $('#spokes'), hub = $('#hub');
  const STEP = 20; let rot = 0, vel = 0, target = null, dragging = false, sel = 0, nodes = [];
  /* spokes */
  let s = '<circle r="99" fill="none" stroke="currentColor" stroke-width=".4"/><circle r="30" fill="none" stroke="currentColor" stroke-width=".5"/>';
  for(let k = 0; k < 18; k++) s += `<line x1="0" y1="-30" x2="0" y2="-99" transform="rotate(${k * 20 + 10})" stroke="currentColor" stroke-width=".4"/><path d="M0 -99 L4 -92 L-4 -92Z" transform="rotate(${k * 20 + 10})" fill="currentColor"/>`;
  spokes.innerHTML = s;
  for(let k = 0; k < 18; k++){
    const n = document.createElement('button');
    n.className = 'node'; n.type = 'button'; n.setAttribute('role', 'option'); n.textContent = k + 1;
    n.innerHTML += `<svg class="ring-prog" viewBox="0 0 74 74"><circle cx="37" cy="37" r="34" stroke-dasharray="213.6" stroke-dashoffset="213.6"/></svg>`;
    n.addEventListener('click', (e) => { if(el._moved) return; goTo(k); e.stopPropagation(); });
    el.appendChild(n); nodes.push(n);
  }
  const layout = () => {
    const R = el.clientWidth * .42;
    nodes.forEach((n, k) => {
      const a = (k * STEP + rot - 90) * Math.PI / 180;
      n.style.transform = `translate(${(Math.cos(a) * R).toFixed(1)}px,${(Math.sin(a) * R).toFixed(1)}px)`;
    });
    rotor.style.transform = `rotate(${rot}deg)`;
  };
  const nearest = () => ((Math.round(-rot / STEP) % 18) + 18) % 18;
  function goTo(k){ const cur = -rot / STEP; let d = k - (((Math.round(cur) % 18) + 18) % 18); if(d > 9) d -= 18; if(d < -9) d += 18; target = -(Math.round(cur) + d) * STEP; }
  function select(k, quiet){
    if(k === sel && !quiet) return;
    sel = k; nodes.forEach((n, j) => { n.classList.toggle('on', j === k); n.setAttribute('aria-selected', j === k); });
    hub.classList.add('swap');
    setTimeout(() => {
      $('#hubNum').textContent = k + 1; $('#hubName').textContent = chName(k + 1);
      $('#hubCnt').textContent = `${count(k + 1)} ${lbl('sloka')}`; hub.classList.remove('swap');
    }, quiet ? 0 : 180);
    $('#ccEyebrow').textContent = `Chapter ${k + 1}`; scramble($('#ccName'), chName(k + 1), 500);
    $('#ccCount').textContent = count(k + 1); $('#ccMins').textContent = '~' + Math.max(1, Math.round(count(k + 1) * 14 / 60));
    $('#ccRead').textContent = Math.round(readCount(k + 1) / count(k + 1) * 100) + '%';
    $('#ccFirst').textContent = sloka(k + 1, 0).replace(/\n\s*/g, '\n').trim();
    if(!quiet) buzz(5);
  }
  const loop = () => {
    if(!dragging){
      if(target !== null){ const d = target - rot; rot += d * .14; if(Math.abs(d) < .05){ rot = target; target = null; } }
      else if(Math.abs(vel) > .02){ rot += vel; vel *= .94; if(Math.abs(vel) <= .3){ vel = 0; target = Math.round(rot / STEP) * STEP; } }
    }
    layout(); const n = nearest(); if(n !== sel) select(n);
    requestAnimationFrame(loop);
  };
  /* drag by angle around the centre */
  const ang = (e) => { const r = el.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; };
  let last = 0, lastT = 0, downX = 0, downY = 0;
  el.addEventListener('pointerdown', (e) => { dragging = true; el._moved = false; target = null; vel = 0; last = ang(e); lastT = performance.now(); downX = e.clientX; downY = e.clientY; el.setPointerCapture(e.pointerId); el.focus({ preventScroll: true }); });
  el.addEventListener('pointermove', (e) => {
    if(!dragging) return;
    if(Math.hypot(e.clientX - downX, e.clientY - downY) > 6) el._moved = true;
    const a = ang(e); let d = a - last; if(d > 180) d -= 360; if(d < -180) d += 360;
    const now = performance.now(); rot += d; vel = d / Math.max(1, now - lastT) * 16; last = a; lastT = now;
  });
  const up = (e) => {
    if(!dragging) return; dragging = false;
    if(!el._moved){ const hit = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('node')); if(hit) goTo(nodes.indexOf(hit)); }
    else if(Math.abs(vel) < .4) target = Math.round(rot / STEP) * STEP;
    setTimeout(() => { el._moved = false; }, 0);
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { if(document.activeElement !== el) return; e.preventDefault(); target = (target ?? Math.round(rot / STEP) * STEP) + (e.deltaY > 0 ? -STEP : STEP); }, { passive: false });
  el.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); goTo((sel + 1) % 18); }
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); goTo((sel + 17) % 18); }
    if(e.key === 'Enter'){ openChapter(sel + 1); }
  });
  addEventListener('resize', layout);
  select(0, true); for(let k = 1; k <= 18; k++) updateRing(k);
  /* a little welcome spin when the wheel scrolls into view */
  const io = new IntersectionObserver(es => { if(es[0].isIntersecting){ io.disconnect(); if(!RM){ rot = 200; target = -STEP; } } }, { threshold: .4 }); io.observe(el);
  loop();
  function updateRing(ch){
    const c = nodes[ch - 1] && $('circle', nodes[ch - 1]); if(!c) return;
    c.style.transition = 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)';
    c.style.strokeDashoffset = 213.6 * (1 - readCount(ch) / count(ch));
  }
  return { refresh(){ select(sel, true); }, updateRing, get sel(){ return sel; }, goTo };
})();
$('#ccOpen').addEventListener('click', (e) => { e.preventDefault(); openChapter(Wheel.sel + 1); });

/* view switch: wheel ⇄ 3D grid */
function buildGrid(){
  const g = $('#gridView'); let h = '';
  for(let k = 1; k <= 18; k++){
    h += `<a class="tilt glass" href="#reader" data-ch="${k}" style="--i:${k}"><span class="n">${String(k).padStart(2, '0')}</span><span><span class="nm">${chName(k)}</span><div class="c">${count(k)} ${lbl('sloka')}</div><div class="bar"><i style="--w:${Math.round(readCount(k) / count(k) * 100)}%"></i></div></span></a>`;
  }
  g.innerHTML = h;
}
buildGrid();
seg($('#viewSwitch'), (b) => {
  const grid = b.dataset.view === 'grid';
  $('#wheelView').hidden = grid; $('#gridView').hidden = !grid;
  if(grid){ const g = $('#gridView'); g.classList.remove('in'); void g.offsetWidth; g.classList.add('in'); }
});
$('#gridView').addEventListener('pointermove', (e) => {
  const c = e.target.closest('.tilt'); if(!c) return;
  const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
  c.style.setProperty('--ry', ((px - .5) * 18).toFixed(1) + 'deg'); c.style.setProperty('--rx', ((.5 - py) * 18).toFixed(1) + 'deg');
  c.style.setProperty('--px', px * 100 + '%'); c.style.setProperty('--py', py * 100 + '%');
});
$('#gridView').addEventListener('pointerout', (e) => { const c = e.target.closest('.tilt'); if(c && !c.contains(e.relatedTarget)){ c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
$('#gridView').addEventListener('click', (e) => { const c = e.target.closest('.tilt'); if(!c) return; e.preventDefault(); openChapter(+c.dataset.ch); });

function openChapter(ch){
  Reader.render(ch);
  $('#reader').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
}
function updateProgressUI(ch){
  Wheel.updateRing(ch);
  const bar = $(`#gridView .tilt[data-ch="${ch}"] .bar i`); if(bar) bar.style.setProperty('--w', Math.round(readCount(ch) / count(ch) * 100) + '%');
  if(Wheel.sel + 1 === ch) $('#ccRead').textContent = Math.round(readCount(ch) / count(ch) * 100) + '%';
  if(Reader.ch === ch) $('#rhProg').style.transform = `scaleX(${readCount(ch) / count(ch)})`;
}

/* ════════ AUDIO ENGINE (single element · analyser · fallback) ════════ */
const AE = { el: null, ctx: null, an: null, data: null, cors: true };
function audioEl(){
  if(AE.el) return AE.el;
  const a = new Audio(); a.preload = 'auto';
  if(AE.cors) a.crossOrigin = 'anonymous';
  a.addEventListener('ended', onEnded);
  a.addEventListener('error', onAudioError);
  a.addEventListener('pause', () => { if(P.status === 'playing' && !a.ended){ P.status = 'paused'; syncIsland(); } });
  a.addEventListener('playing', () => { if(P.status !== 'idle'){ P.status = 'playing'; syncIsland(); tick(); } });
  return (AE.el = a);
}
function analyser(){
  if(AE.an || !AE.cors) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext; AE.ctx = new C();
    const src = AE.ctx.createMediaElementSource(AE.el);
    AE.an = AE.ctx.createAnalyser(); AE.an.fftSize = 64; AE.an.smoothingTimeConstant = .75;
    src.connect(AE.an); AE.an.connect(AE.ctx.destination); AE.data = new Uint8Array(AE.an.frequencyBinCount);
  } catch(e){ AE.an = null; }
}
function onAudioError(){
  if(P.status === 'idle') return;
  if(AE.cors){            /* host refused CORS: rebuild without the analyser, keep playing with a synthetic waveform */
    AE.cors = false; const old = AE.el; AE.el = null; old.removeAttribute('src');
    if(AE.ctx){ AE.ctx.close().catch(() => {}); AE.ctx = null; AE.an = null; }
    loadPos(); return;
  }
  toast(`Couldn't load audio for this sloka`, 'wifi_off'); next();
}

const P = { list: [], pos: 0, speed: 1, status: 'idle', card: null, words: [], weights: [], label: '' };
function playList(list, speed = 1, label = ''){ P.list = list; P.pos = 0; P.speed = speed; P.label = label; loadPos(); }
function itemKey(it){ return it.kind === 'ch' ? `${it.ch}-${it.i}` : `${it.kind}-${it.i}`; }
function loadPos(){
  const it = P.list[P.pos]; if(!it){ stop(); return; }
  clearCard();
  const a = audioEl(); a.src = audioUrl(it); a.playbackRate = a.defaultPlaybackRate = P.speed;
  analyser(); if(AE.ctx && AE.ctx.state === 'suspended') AE.ctx.resume();
  P.status = 'playing';
  const card = $(`[data-key="${itemKey(it)}"]`);
  if(card){
    P.card = card; card.classList.add('playing');
    const pb = $('.play .msi', card) || $('.play-s .msi', card); if(pb) pb.textContent = 'pause';
    P.words = $$('.w', card); P.weights = P.words.map(w => Math.max(2, Array.from(w.textContent).length));
    if(card.classList.contains('sloka') && !inView(card)) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else { P.card = null; P.words = []; }
  if(it.kind === 'ch') markRead(it.ch, it.i);
  const p = a.play(); if(p) p.catch(err => { if(err && err.name === 'NotAllowedError'){ P.status = 'paused'; syncIsland(); toast('Tap play to start audio', 'touch_app'); } });
  syncIsland(true); tick();
}
const inView = (el) => { const r = el.getBoundingClientRect(); return r.top > 60 && r.bottom < innerHeight; };
function clearCard(){
  if(!P.card) return;
  P.card.classList.remove('playing');
  const pb = $('.play .msi', P.card) || $('.play-s .msi', P.card); if(pb) pb.textContent = 'play_arrow';
  P.words.forEach(w => w.classList.remove('said', 'now'));
  $$('.viz i', P.card).forEach(i => i.style.height = '20%');
  const t = $('.time', P.card); if(t) t.textContent = '';
  P.card = null;
}
function onEnded(){ if(P.status === 'playing') next(); }
function next(){ if(P.pos + 1 < P.list.length){ P.pos++; loadPos(); } else stop(); }
function prev(){ if(P.pos > 0){ P.pos--; loadPos(); } else { AE.el.currentTime = 0; } }
function pauseResume(){
  const a = audioEl();
  if(P.status === 'playing'){ P.status = 'paused'; a.pause(); }
  else if(P.status === 'paused'){ P.status = 'playing'; if(AE.ctx) AE.ctx.resume(); a.play().catch(() => {}); tick(); }
  syncIsland();
}
function stop(){
  P.status = 'idle'; clearCard(); if(AE.el){ AE.el.pause(); }
  syncIsland();
}
const fmt = (s) => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';
let ticking = false;
function tick(){
  if(ticking) return; ticking = true;
  const bars = () => {
    const out = new Array(16);
    if(AE.an){ AE.an.getByteFrequencyData(AE.data); for(let k = 0; k < 16; k++) out[k] = AE.data[k + 1] / 255; }
    else { const t = performance.now(); for(let k = 0; k < 16; k++) out[k] = .25 + .6 * Math.abs(Math.sin(t * .006 + k * .7) * Math.cos(t * .0023 + k)); }
    return out;
  };
  const f = () => {
    if(P.status !== 'playing'){ ticking = false; return; }
    const a = AE.el, frac = a.duration ? a.currentTime / a.duration : 0, v = bars();
    if(P.card){
      $$('.viz i', P.card).forEach((b, k) => b.style.height = (12 + v[k] * 88).toFixed(0) + '%');
      const t = $('.time', P.card); if(t) t.textContent = `${fmt(a.currentTime)} / ${fmt(a.duration)}`;
      if(P.words.length){       /* word-sync: spread recitation time over words by their length */
        const tot = P.weights.reduce((x, y) => x + y, 0); let acc = 0, idx = P.words.length - 1;
        const lead = Math.min(1, frac * 1.04);
        for(let k = 0; k < P.weights.length; k++){ acc += P.weights[k]; if(acc / tot >= lead){ idx = k; break; } }
        P.words.forEach((w, k) => { w.classList.toggle('said', k < idx); w.classList.toggle('now', k === idx); });
      }
    }
    $$('#islandViz i').forEach((b, k) => b.style.height = (20 + v[k * 2] * 80).toFixed(0) + '%');
    $('#islandProg').style.transform = `scaleX(${frac})`;
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

/* ════════ 5 · DYNAMIC ISLAND ════════ */
const island = $('#island');
$('#islandViz').innerHTML = '<i></i>'.repeat(8);
function syncIsland(morph){
  const it = P.list[P.pos];
  if(P.status === 'idle'){ island.classList.remove('wide', 'playing'); setTimeout(() => { if(P.status === 'idle') island.classList.remove('show'); }, 250); return; }
  island.classList.add('show'); island.classList.toggle('playing', P.status === 'playing');
  if(morph){ island.classList.remove('wide'); setTimeout(() => island.classList.add('wide'), RM ? 0 : 380); } else island.classList.add('wide');
  if(it){
    $('#islandTitle').textContent = it.kind === 'ch' ? `${lbl('sloka')} ${it.ch}.${it.i + 1}` : `${lbl(it.kind)} · ${it.i + 1}`;
    $('#islandSub').textContent = (it.kind === 'ch' ? chName(it.ch) : '') + (P.list.length > 1 ? `  ·  ${P.pos + 1}/${P.list.length}` : '') + (P.speed !== 1 ? `  ·  ${P.speed}×` : '');
  }
  $('#isPlay .msi').textContent = P.status === 'playing' ? 'pause' : 'play_arrow';
  $('#isPlay').setAttribute('aria-label', P.status === 'playing' ? 'Pause' : 'Play');
}
$('#isPlay').addEventListener('click', pauseResume);
$('#isNext').addEventListener('click', next);
$('#isPrev').addEventListener('click', prev);
$('#isClose').addEventListener('click', stop);
island.addEventListener('click', (e) => { if(!e.target.closest('button') && !island.classList.contains('wide')) island.classList.add('wide'); });

/* ════════ 4 · READER ════════ */
const Reader = (function(){
  const box = $('#slokas'); let ch = 2, shown = 0; const PAGE = 10;
  const readIO = new IntersectionObserver((es) => {
    es.forEach(en => {
      const c = en.target;
      if(en.isIntersecting){ c._rt = setTimeout(() => { const [a, b] = c.dataset.key.split('-').map(Number); markRead(a, b); }, 1500); }
      else clearTimeout(c._rt);
    });
  }, { threshold: .6 });
  const medal = '<svg viewBox="-50 -50 100 100"><circle r="47" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 4"/>' +
    Array.from({ length: 8 }, (_, k) => `<path d="M0 -47 L5 -38 L0 -33 L-5 -38Z" transform="rotate(${k * 45})" fill="currentColor"/>`).join('') + '</svg>';
  function card(c, i){
    const d = document.createElement('article');
    d.className = 'sloka glass'; d.dataset.key = `${c}-${i}`; d.setAttribute('data-reveal', '');
    const words = sloka(c, i).replace(/\n\s*/g, '\n').trim().split('\n').map(line =>
      line.split(/(\s+)/).map(t => t.trim() ? `<span class="w">${esc(t)}</span>` : t).join('')).join('\n');
    d.innerHTML = `<div class="no">${medal}<span>${i + 1}</span></div>
      <div class="txt">${words}</div>
      <div class="acts">
        <button class="play" aria-label="Play sloka ${i + 1}"><span class="msi fill">play_arrow</span></button>
        <div class="viz" aria-hidden="true">${'<i></i>'.repeat(16)}</div>
        <button class="tbtn" aria-expanded="false"><span>${lbl('meaning')}</span><span class="msi">expand_more</span></button>
        <span class="time"></span>
      </div>
      <div class="leaf"><div><div class="scroll"><h4>${lbl('meaning')} · ${c}.${i + 1}</h4><p></p></div></div></div>`;
    return d;
  }
  function more(){
    const total = count(ch), frag = document.createDocumentFragment(), from = shown;
    shown = Math.min(total, shown + PAGE);
    for(let i = from; i < shown; i++) frag.appendChild(card(ch, i));
    box.appendChild(frag); watchReveal(box); $$('.sloka', box).slice(from).forEach(c => readIO.observe(c));
    $('#moreBtn').hidden = shown >= total;
    $('#moreBtn').lastChild.textContent = `Show more slokas (${total - shown} left)`;
  }
  function render(c, keepLang){
    const playingHere = P.status !== 'idle' && P.list[P.pos] && P.list[P.pos].ch === c && keepLang;
    if(P.status !== 'idle' && !playingHere && !keepLang) stop();
    const keep = keepLang ? shown : 0;
    ch = c; shown = 0; box.innerHTML = '';
    $('#rhChip').textContent = `Chapter ${c}`;
    scramble($('#rhTitle'), `${c}. ${chName(c)}`, 600);
    $('#rhProg').style.transform = `scaleX(${readCount(c) / count(c)})`;
    more(); while(shown < keep) more();
    if(playingHere){             /* re-attach the playing card without restarting the audio */
      const card = $(`[data-key="${itemKey(P.list[P.pos])}"]`);
      P.card = card || null; P.words = card ? $$('.w', card) : []; P.weights = P.words.map(w => Math.max(2, Array.from(w.textContent).length));
      if(card){ card.classList.add('playing'); $('.play .msi', card).textContent = P.status === 'playing' ? 'pause' : 'play_arrow'; }
    }
  }
  $('#moreBtn').addEventListener('click', more);
  box.addEventListener('click', (e) => {
    const c = e.target.closest('.sloka'); if(!c) return;
    const [a, i] = c.dataset.key.split('-').map(Number);
    if(e.target.closest('.play')){
      if(P.card === c){ pauseResume(); return; }
      playList([{ kind: 'ch', ch: a, i }], 1); return;
    }
    const tb = e.target.closest('.tbtn');
    if(tb){ toggleMeaning(c, { kind: 'ch', ch: a, i }, tb); }
  });
  box.addEventListener('dblclick', (e) => {
    const c = e.target.closest('.sloka'); if(!c || e.target.closest('button')) return;
    window.getSelection && window.getSelection().removeAllRanges();
    Sheet.open(+c.dataset.key.split('-')[1] + 1);
  });
  render(2);
  return { render, get ch(){ return ch; } };
})();
function esc(s){ return s.replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function toggleMeaning(card, it, btn){
  const leaf = $('.leaf', card), p = $('.leaf p', card), open = !leaf.classList.contains('open');
  btn.setAttribute('aria-expanded', open);
  if(!open){ leaf.classList.remove('open'); return; }
  if(!p.dataset.done){
    p.innerHTML = '<div class="skel" style="width:92%"></div><div class="skel" style="width:80%"></div><div class="skel" style="width:60%"></div>';
    leaf.classList.add('open');
    ensureMeanings().then(() => {
      const m = meaning(it);
      p.dataset.done = 1; leaf.classList.remove('open');
      p.innerHTML = m ? m.split(/(\s+)/).map((w, k) => w.trim() ? `<span class="ln" style="--i:${Math.min(k, 120)}">${esc(w)}</span>` : w).join('') : 'Meaning not available yet.';
      requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('open')));
    }).catch(() => { p.textContent = 'Could not load meanings. Check your connection.'; });
  } else leaf.classList.add('open');
  if(it.kind === 'ch') markRead(it.ch, it.i);
}
$('#playAllBtn').addEventListener('click', () => Sheet.open(1));

/* ════════ 6 · RANGE SHEET ════════ */
const Sheet = (function(){
  const sh = $('#sheet'), back = $('#sheetBack');
  const st = { from: 1, to: 5, it: 2, speed: 1, pat: 'A' }; let chase = null, total = 1;
  const spSeg = seg($('#rSpeed'), b => { st.speed = +b.dataset.v; }), ptSeg = seg($('#rPattern'), b => { st.pat = b.dataset.v; beads(); });
  const seq = () => { const out = [];
    if(st.pat === 'A'){ for(let i = st.from; i <= st.to; i++) for(let r = 0; r < st.it; r++) out.push(i); }
    else { for(let r = 0; r < st.it; r++) for(let i = st.from; i <= st.to; i++) out.push(i); }
    return out; };
  function beads(){
    const s = seq(), show = s.slice(0, 40);
    $('#beads').innerHTML = show.map((n, k) => `<span class="bead" style="--i:${k}">${n}</span>`).join('') + (s.length > 40 ? `<span class="bead" style="--i:41;width:auto;padding:0 10px">+${s.length - 40}</span>` : '');
    clearInterval(chase); let k = 0; const bs = $$('#beads .bead').slice(0, show.length);
    chase = setInterval(() => { bs.forEach((b, j) => b.classList.toggle('lit', j === k % bs.length)); k++; }, 380);
  }
  function paint(key){
    $('#rFrom').textContent = st.from; $('#rTo').textContent = st.to; $('#rIt').value = st.it; $('#rItTxt').textContent = st.it;
    if(key){ const o = $(key === 'from' ? '#rFrom' : '#rTo'); o.classList.remove('bump'); void o.offsetWidth; o.classList.add('bump'); }
    beads();
  }
  $$('[data-step]', sh).forEach(b => b.addEventListener('click', () => {
    const [k, d] = b.dataset.step.split(':'); st[k] = clamp(st[k] + +d, 1, total);
    if(st.from > st.to){ if(k === 'from') st.to = st.from; else st.from = st.to; }
    buzz(5); paint(k);
  }));
  $('#rIt').addEventListener('input', (e) => { st.it = +e.target.value; paint(); });
  function open(from){
    total = count(Reader.ch); st.from = clamp(from, 1, total); st.to = clamp(st.from + 4, 1, total);
    $('#sheetSub').textContent = `${Reader.ch}. ${chName(Reader.ch)} · ${total} ${lbl('sloka')}`;
    sh.classList.add('open'); back.classList.add('open'); $('#topbar').classList.remove('hide');
    paint(); setTimeout(() => { spSeg.place(); ptSeg.place(); }, 50); buzz(10);
    setTimeout(() => $('#rStart').focus({ preventScroll: true }), 400);
  }
  function close(){ sh.classList.remove('open'); back.classList.remove('open'); clearInterval(chase); }
  back.addEventListener('click', close); $('#rClose').addEventListener('click', close);
  addEventListener('keydown', (e) => { if(e.key === 'Escape' && sh.classList.contains('open')) close(); });
  /* swipe the sheet down to dismiss */
  let y0 = null; sh.addEventListener('pointerdown', (e) => { if(e.target.closest('.grab,h3')) y0 = e.clientY; });
  addEventListener('pointerup', (e) => { if(y0 !== null && e.clientY - y0 > 60) close(); y0 = null; });
  $('#rStart').addEventListener('click', () => {
    const list = seq().map(n => ({ kind: 'ch', ch: Reader.ch, i: n - 1 }));
    close(); playList(list, st.speed, 'range');
    toast(`Playing ${st.from}–${st.to} · ×${st.it} · ${st.speed}×`, 'repeat');
  });
  return { open, close };
})();
$('#openSheetBtn').addEventListener('click', () => Sheet.open(1));
$('#demoIslandBtn').addEventListener('click', () => { if(Reader.ch !== 2) Reader.render(2); playList([{ kind: 'ch', ch: 2, i: 46 }], 1); });

/* ════════ 7 · SLOKA TEST ════════ */
const Test = (function(){
  const LV = [
    ['beginner', 'Beginner', 'First stanza shown. Recall the second.'],
    ['easy', 'Easy', 'Half of the first stanza shown.'],
    ['intermediate', 'Intermediate', 'Half of the second stanza shown.'],
    ['advanced', 'Advanced', 'Easy or Intermediate, chosen at random.'],
    ['supreme', 'Supreme', 'Random chapter. Number kept hidden.']
  ];
  let level = 'beginner', scope = 'current', streak = 0, busy = false, cur = null;
  $('#levels').innerHTML = LV.map(([k, t, d], j) => `<button class="level${j ? '' : ' on'}" data-k="${k}"><span class="dot"></span><b>${t}</b><small>${d}</small></button>`).join('');
  $('#levels').addEventListener('click', (e) => { const b = e.target.closest('.level'); if(!b) return; $$('.level').forEach(x => x.classList.toggle('on', x === b)); level = b.dataset.k; buzz(6); });
  seg($('#testScope'), b => { scope = b.dataset.scope; });
  const words = (s) => s.split(/\s+/).filter(Boolean);
  function build(){
    let lv = level === 'advanced' ? (Math.random() < .5 ? 'easy' : 'intermediate') : level;
    const ch = (scope === 'any' || level === 'supreme') ? 1 + ((Math.random() * 18) | 0) : Reader.ch;
    let i, lines, tries = 0;
    do { i = (Math.random() * count(ch)) | 0; lines = sloka(ch, i).split('\n').map(x => x.trim()).filter(Boolean); } while(lines.length < 2 && ++tries < 20);
    if(lines.length > 2 && /uvacha|ఉవాచ|उवाच|:$/.test(lines[0])) lines = lines.slice(1);
    const h = Math.ceil(lines.length / 2), s1 = lines.slice(0, h).join('\n'), s2 = lines.slice(h).join('\n');
    let shown, hidden;
    if(lv === 'beginner' || lv === 'supreme'){ shown = s1; hidden = s2; }
    else if(lv === 'easy'){ const w = words(s1), k = Math.ceil(w.length / 2); shown = w.slice(0, k).join(' ') + ' …'; hidden = w.slice(k).join(' ') + '\n' + s2; }
    else { const w = words(s2), k = Math.ceil(w.length / 2); shown = s1 + '\n' + w.slice(0, k).join(' ') + ' …'; hidden = w.slice(k).join(' '); }
    return { ch, i, shown, hidden, lv, supreme: level === 'supreme' };
  }
  function paint(q){
    $('#qLevel').textContent = LV.find(x => x[0] === level)[1] + (level === 'advanced' ? ` → ${q.lv}` : '');
    $('#qChap').textContent = q.supreme ? 'Chapter ?' : `Chapter ${q.ch} · ${lbl('sloka')} ?`;
    $('#s1').textContent = q.shown; $('#s2').textContent = q.hidden;
    $('#veil').classList.remove('lift'); $('#revealBtn').disabled = false;
  }
  function generate(){
    if(busy) return; busy = true; cur = build();
    const f = $('#flip');
    if(f.classList.contains('turn')){ f.classList.remove('turn'); setTimeout(() => { paint(cur); f.classList.add('turn'); busy = false; }, RM ? 0 : 550); }
    else { paint(cur); f.classList.add('turn'); setTimeout(() => busy = false, 600); }
    buzz(10);
  }
  $('#genBtn').addEventListener('click', generate);
  $('#nextQBtn').addEventListener('click', generate);
  $('#revealBtn').addEventListener('click', (e) => {
    if(!cur || $('#veil').classList.contains('lift')) return;
    $('#veil').classList.add('lift'); e.currentTarget.disabled = true;
    $('#qChap').textContent = `Chapter ${cur.ch} · ${lbl('sloka')} ${cur.i + 1}`;
    streak = Math.min(5, streak + 1);
    $('#streakRing').style.strokeDashoffset = 100.5 * (1 - streak / 5); $('#streakTxt').textContent = `${streak} / 5`;
    const r = e.currentTarget.getBoundingClientRect(); Petals.burst(r.left + r.width / 2, r.top + r.height / 2, streak === 5 ? 120 : 60);
    if(streak === 5){ toast('Five in a row — shubham!', 'workspace_premium'); streak = 0; setTimeout(() => { $('#streakRing').style.strokeDashoffset = 100.5; $('#streakTxt').textContent = '0 / 5'; }, 2200); }
    buzz([10, 40, 10]);
  });
})();

/* lotus-petal confetti */
const Petals = (function(){
  const c = $('#petals'), x = c.getContext('2d'); let ps = [], on = false;
  const size = () => { const d = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * d; c.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); };
  addEventListener('resize', size); size();
  const cols = ['#ff8a2a', '#ffb15c', '#ff5d8f', '#f6c667', '#ffd1dc', '#fff2c9'];
  function burst(cx, cy, n){
    if(RM) return;
    for(let k = 0; k < n; k++){
      const a = Math.random() * Math.PI * 2, s = Math.random() * 9 + 4;
      ps.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 7, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, w: Math.random() * 6 + 5, h: Math.random() * 10 + 9, c: cols[(Math.random() * cols.length) | 0], life: 1, sw: Math.random() * 6.28 });
    }
    if(!on){ on = true; requestAnimationFrame(loop); }
  }
  function loop(){
    x.clearRect(0, 0, innerWidth, innerHeight);
    ps = ps.filter(p => p.life > 0 && p.y < innerHeight + 40);
    for(const p of ps){
      p.vy += .22; p.vx *= .985; p.vy *= .985; p.sw += .08; p.x += p.vx + Math.sin(p.sw) * 1.2; p.y += p.vy; p.r += p.vr; p.life -= .006;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(1, Math.abs(Math.cos(p.sw))); x.globalAlpha = Math.min(1, p.life * 1.5);
      x.fillStyle = p.c; x.beginPath(); x.moveTo(0, -p.h / 2); x.quadraticCurveTo(p.w, 0, 0, p.h / 2); x.quadraticCurveTo(-p.w, 0, 0, -p.h / 2); x.fill(); x.restore();
    }
    if(ps.length) requestAnimationFrame(loop); else { on = false; x.clearRect(0, 0, innerWidth, innerHeight); }
  }
  return { burst };
})();

/* ════════ 8 · DHYANA / MAHATYAM CAROUSEL ════════ */
let dhKind = 'dyana';
const dhSeg = seg($('#dhyanaSwitch'), b => { dhKind = b.dataset.k; Carousel.render(); });
$('#dsDyana').textContent = lbl('dyana'); $('#dsMaha').textContent = lbl('mahatyam');
const Carousel = (function(){
  const el = $('#carousel'), dots = $('#cDots');
  function render(){
    const list = special(dhKind);
    el.innerHTML = list.map((t, i) => `<article class="dcard glass" data-key="${dhKind}-${i}"><span class="k">${i + 1}</span><span class="tag">${lbl(dhKind)} · ${i + 1}</span><div class="t">${esc(t.replace(/\n\s*/g, '\n').trim())}</div><button class="btn sm play-s magnetic"><span class="msi fill">play_arrow</span>Listen</button></article>`).join('');
    dots.innerHTML = list.map(() => '<i></i>').join('');
    el.scrollLeft = 0; requestAnimationFrame(fx);
  }
  function fx(){
    const mid = innerWidth / 2; let best = 0, bd = 1e9;
    $$('.dcard', el).forEach((c, k) => {
      const r = c.getBoundingClientRect(), d = (r.left + r.width / 2 - mid) / innerWidth;
      const ad = Math.min(1, Math.abs(d) * 1.6);
      c.style.setProperty('--s', (1 - ad * .12).toFixed(3)); c.style.setProperty('--o', (1 - ad * .45).toFixed(3)); c.style.setProperty('--ry', (-d * 22).toFixed(1) + 'deg');
      if(Math.abs(d) < bd){ bd = Math.abs(d); best = k; }
    });
    $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === best));
  }
  el.addEventListener('scroll', () => requestAnimationFrame(fx), { passive: true });
  addEventListener('resize', fx);
  /* mouse drag-to-scroll */
  let down = null;
  el.addEventListener('pointerdown', (e) => { if(e.pointerType !== 'mouse' || e.target.closest('button')) return; down = { x: e.clientX, s: el.scrollLeft }; el.classList.add('drag'); });
  addEventListener('pointermove', (e) => { if(down) el.scrollLeft = down.s - (e.clientX - down.x); });
  addEventListener('pointerup', () => { if(!down) return; down = null; el.classList.remove('drag');
    const cs = $$('.dcard', el), mid = el.scrollLeft + el.clientWidth / 2;
    const t = cs.reduce((a, c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(a.offsetLeft + a.offsetWidth / 2 - mid) ? c : a, cs[0]);
    if(t) el.scrollTo({ left: t.offsetLeft + t.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' }); });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.play-s'); if(!b) return;
    const c = b.closest('.dcard'), [kind, i] = c.dataset.key.split('-');
    if(P.card === c){ pauseResume(); return; }
    playList([{ kind, i: +i }], 1);
  });
  render();
  return { render };
})();

/* ════════ 9 · VERSE OF THE DAY ════════ */
const VOTD = (function(){
  const flat = []; for(let c = 1; c <= 18; c++) for(let i = 0; i < count(c); i++) flat.push([c, i]);
  const now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  let cur = flat[(doy * 37) % flat.length];
  $('#vdDay').textContent = now.getDate(); $('#vdMon').textContent = now.toLocaleString('en', { month: 'short' });
  function paint(quick){
    const [c, i] = cur;
    $('#vdRef').textContent = `Gita ${c}.${i + 1} · ${chName(c)}`;
    const t = sloka(c, i).replace(/\n\s*/g, '\n').trim();
    quick ? scramble($('#vdText'), t, 900) : ($('#vdText').textContent = t);
    const m = meaning({ kind: 'ch', ch: c, i });
    $('#vdMeaning').textContent = m || 'Meaning loads as you arrive…';
  }
  paint();
  const io = new IntersectionObserver(es => { if(es[0].isIntersecting){ io.disconnect(); ensureMeanings().then(() => paint()).catch(() => {}); } }, { rootMargin: '400px' });
  io.observe($('#votd'));
  $('#vdShuffle').addEventListener('click', () => { cur = flat[(Math.random() * flat.length) | 0]; paint(true); ensureMeanings().then(() => paint()).catch(() => {}); });
  $('#vdCopy').addEventListener('click', () => {
    const txt = `${$('#vdRef').textContent}\n\n${sloka(cur[0], cur[1]).trim()}`;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Verse copied', 'content_copy'), () => toast('Copy not allowed here', 'block'));
  });
  $('#vdPlay').addEventListener('click', () => { playList([{ kind: 'ch', ch: cur[0], i: cur[1] }], 1); });
  return { paint };
})();

/* ════════ 10 · LINEAGE TIMELINE ════════ */
(function lineage(){
  const IMG = 'https://kolluruharshavardhanhindu-cyber.github.io/BhagavadGita/';
  const people = [
    ['parents.webp', 'Parents · తల్లిదండ్రులు', 'కొల్లూరు వెంకటరమణ మూర్తి – విశాలాక్షి', 'Strength, faith and blessing — always guiding with love.', 'ధర్మో రక్షతి రక్షితః'],
    ['teacher.webp', 'Guru · గురువు', 'కొల్లూరు వసంత గారు', 'Taught me the Gita. Gold medallist, Ganapathy Sachchidananda Ashram.', 'గురుర్బ్రహ్మా గురుర్విష్ణుః'],
    ['balaswamy.webp', 'Recitation · ప్రేరణ', 'శ్రీ దత్త విజయానంద తీర్థ స్వామీజీ', 'Avadhoota Datta Peetham. His pure, clear recitation is the voice of this project.', 'శుద్ధ ఉచ్చారణ'],
    ['sastrymava.webp', 'Idea · ప్రేరణ', 'చెముడుపాటి శివ రామ శాస్త్రి గారు', 'His project sparked the idea of bringing the Gita to everyone through technology.', 'జ్ఞానం · భక్తి'],
    ['me.webp', 'Creator · సృష్టికర్త', 'కొల్లూరు హర్ష వర్ధన్', 'Built this website with love, for everyone who learns and reads the Gita.', 'ధర్మమే మార్గం']
  ];
  const tl = $('#timeline');
  people.forEach(([img, role, name, desc, q]) => {
    const it = document.createElement('div'); it.className = 'tl-item';
    it.innerHTML = `<span class="knot"></span><div class="tl-card glass" data-reveal><div class="ph"><img loading="lazy" src="${IMG + img}" alt=""></div><div><small>${role}</small><h4>${name}</h4><p>${desc}</p></div></div><div class="tl-quote" data-reveal>“${q}”</div>`;
    tl.appendChild(it);
  });
  watchReveal(tl);
  const kio = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('in', en.isIntersecting || en.boundingClientRect.top < 0)), { rootMargin: '-45% 0px -45% 0px' });
  $$('.tl-item', tl).forEach(i => kio.observe(i));
  const path = $('#tlPath'), svg = $('svg.line', tl);
  const draw = () => {
    const r = tl.getBoundingClientRect(), H = r.height;
    svg.setAttribute('viewBox', `0 0 4 ${H}`); path.setAttribute('d', `M2 0 V ${H}`); $('path.bg', svg).setAttribute('d', `M2 0 V ${H}`);
    const p = clamp((innerHeight * .55 - r.top) / H, 0, 1);
    path.style.strokeDasharray = H; path.style.strokeDashoffset = H * (1 - p);
  };
  addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true }); addEventListener('resize', draw); draw();
})();

/* ════════ 11 · PHONE TILT ════════ */
(function phone(){
  const ph = $('#phone'), sec = $('#app');
  sec.addEventListener('pointermove', (e) => {
    const r = ph.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    ph.style.setProperty('--ry', (dx * 40 - 6).toFixed(1) + 'deg'); ph.style.setProperty('--rx', (-dy * 30).toFixed(1) + 'deg');
  });
  sec.addEventListener('pointerleave', () => { ph.style.setProperty('--ry', '-14deg'); ph.style.setProperty('--rx', '0deg'); });
})();

/* ════════ 12 · MOTION TOKENS & PALETTE ════════ */
(function tokens(){
  const T = [
    ['--ease-out', 'cubic-bezier(.16,1,.3,1)', 'Reveals, cards, page entry'],
    ['--ease-spring', 'cubic-bezier(.34,1.56,.64,1)', 'Pills, toggles, island, beads'],
    ['--ease-inout', 'cubic-bezier(.65,0,.35,1)', 'Curtain, card flip, palm-leaf, theme wipe'],
    ['linear', 'linear', 'Mandalas, orbits, light rings']
  ];
  $('#tokens').innerHTML = T.map(([n, v, u]) => `<div class="tok glass" data-reveal style="--e:${v}"><b>${n}</b><code>${v}</code><div style="font-size:12.5px;color:var(--muted);margin-top:4px">${u}</div><div class="track"><i></i></div></div>`).join('');
  watchReveal($('#tokens'));
  $$('.tok').forEach(t => t.addEventListener('click', () => { t.classList.remove('play'); void t.offsetWidth; t.classList.add('play'); }));
})();
function paintSwatches(){
  const cs = getComputedStyle(root);
  $('#swatches').innerHTML = ['bg', 'bg-2', 'ink', 'saffron', 'gold', 'lotus', 'peacock', 'sky'].map(n => {
    const v = cs.getPropertyValue('--' + n).trim(); return `<div class="sw"><i style="background:${v}"></i><span>--${n}<br><code>${v}</code></span></div>`;
  }).join('');
}
paintSwatches();

paintLangDemo();
})();
