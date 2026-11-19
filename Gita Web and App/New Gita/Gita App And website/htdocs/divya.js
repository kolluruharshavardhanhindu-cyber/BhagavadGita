/* ════════════════════════════════════════════════════════════════
   BHAGAVAD GITA — "DIVYA" motion & interaction layer (all pages)
   Loaded with `defer` after glass.js. It never re-implements app logic:
   it reads app.js state (Player, currentLang, data…) and wraps a few
   app.js functions (renderChapterGrid, changeLanguage, syncUI,
   openRangeModal, closeRangeModal) to add the redesigned UI on top.
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
var $  = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var root = document.documentElement;
var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
/* read an app.js global (works for const/let too) */
function G(name){ try { return (0, eval)(name); } catch(e){ return undefined; } }
function lerp(a, b, t){ return a + (b - a) * t; }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
function buzz(ms){ try { var ua = navigator.userActivation; if(navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(ms); } catch(e){} }
function toast(msg, type){ if(window.GitaUI && GitaUI.toast) GitaUI.toast(msg, { type: type || 'info' }); }
function lsGet(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function lang(){ return G('currentLang') || 'te'; }
function slokaWord(){ var s = G('slokaLabel'); return (s && s[lang()]) || 'Sloka'; }
/* plural used after a count. Hindi, Bengali and Odia use the bare noun after a number ("47 श्लोक"). */
var SLOKAS = { te:'శ్లోకాలు', en:'Slokas', hi:'श्लोक', ta:'சுலோகங்கள்', kn:'ಶ್ಲೋಕಗಳು', ml:'ശ്ലോകങ്ങൾ', gu:'શ્લોકો', bn:'শ্লোক', or:'ଶ୍ଲୋକ' };
function slokaCount(n){ return n + ' ' + (n === 1 ? slokaWord() : (SLOKAS[lang()] || 'Slokas')); }

/* ─── scramble decode ─── */
function scramble(el, text, dur){
  if(!el) return; dur = dur || 700;
  cancelAnimationFrame(el._sr);
  if(RM){ el.textContent = text; return; }
  var to = Array.from(text), pool = to.filter(function(c){ return c.trim(); }), t0 = performance.now(), f = 0;
  function step(t){
    var p = Math.min(1, (t - t0) / dur), n = Math.floor(p * to.length);
    if(f++ % 2 === 0 || p === 1){
      var out = '';
      for(var k = 0; k < to.length; k++){ var c = to[k]; out += (k < n || c === '\n' || c === ' ') ? c : (pool[(Math.random() * pool.length) | 0] || c); }
      el.textContent = out;
    }
    if(p < 1) el._sr = requestAnimationFrame(step);
  }
  el._sr = requestAnimationFrame(step);
}

/* ─── reading progress (per device, chapters only) ─── */
var READ = lsGet('gitaRead', {});
function readCount(ch){ return READ[ch] ? READ[ch].length : 0; }
function chTotal(ch){ var d = G('gitaData'); return d && d[ch] ? d[ch].slokas.length : 0; }
function markRead(ch, i){
  if(typeof ch !== 'number' || !ch) return;
  READ[ch] = READ[ch] || [];
  if(READ[ch].indexOf(i) >= 0) return;
  READ[ch].push(i); lsSet('gitaRead', READ);
  if(Home.onRead) Home.onRead(ch);
  var rp = $('#readProg'); if(rp && viewNum() === ch) rp.style.transform = 'scaleX(' + (readCount(ch) / chTotal(ch)) + ')';
}
function viewNum(){ var f = G('getCurrentViewNum'); return f ? f() : null; }

/* ════════ shared chrome ════════ */
function ambient(){
  if(!$('.d-backdrop')){ var b = document.createElement('div'); b.className = 'd-backdrop'; document.body.insertBefore(b, document.body.firstChild); }
  var cur = document.createElement('div'); cur.className = 'd-cursor';
  var dot = document.createElement('div'); dot.className = 'd-cursor-dot';
  document.body.appendChild(cur); document.body.appendChild(dot);
  if(FINE && !RM){
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', function(e){ x = e.clientX; y = e.clientY; dot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }, { passive: true });
    document.addEventListener('pointerover', function(e){ cur.classList.toggle('hot', !!(e.target.closest && e.target.closest('a,button,.card,.node,.sloka-box,.radio-card,.dcard,label'))); });
    (function loop(){ rx = lerp(rx, x, .16); ry = lerp(ry, y, .16); cur.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; requestAnimationFrame(loop); })();
  }
  /* magnetic + ripple */
  document.addEventListener('pointermove', function(e){
    if(!FINE) return;
    var m = e.target.closest && e.target.closest('.magnetic');
    $$('.magnetic.mag-on').forEach(function(b){ if(b !== m){ b.classList.remove('mag-on'); b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); } });
    if(!m) return;
    var r = m.getBoundingClientRect(); m.classList.add('mag-on');
    m.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .2).toFixed(1) + 'px');
    m.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + 'px');
  }, { passive: true });
  document.addEventListener('pointerdown', function(e){
    var b = e.target.closest && e.target.closest('.btn,.d-btn,.play-all-btn,.c-btn'); if(!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, sp = document.createElement('span');
    sp.className = 'd-ripple'; sp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(sp); setTimeout(function(){ sp.remove(); }, 700);
  });
}

var Cosmos = (function(){
  var c, x, W, H, stars = [], embers = [], col = {}, running = true, mx = -999, my = -999;
  function readColors(){ var cs = getComputedStyle(root); col.star = cs.getPropertyValue('--star').trim(); col.ember = cs.getPropertyValue('--ember').trim(); col.dark = root.getAttribute('data-theme') === 'dark'; }
  function ember(any){ return { x: Math.random() * W, y: any ? Math.random() * H : H + 10, vy: -(Math.random() * .5 + .15), vx: 0, r: Math.random() * 2.2 + .6, p: Math.random() * 6.28 }; }
  function size(){
    var d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
    var n = Math.min(160, Math.round(W * H / 9500));
    stars = []; for(var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: Math.random() * .02 + .005 });
    embers = []; for(var j = 0; j < Math.min(40, Math.round(W / 32)); j++) embers.push(ember(true));
  }
  function draw(){
    if(running){
      x.clearRect(0, 0, W, H);
      var sy = scrollY * .05; x.fillStyle = col.star;
      stars.forEach(function(s){ s.p += s.s; x.globalAlpha = (col.dark ? .25 : .14) + Math.abs(Math.sin(s.p)) * (col.dark ? .65 : .32);
        x.beginPath(); x.arc(s.x, ((s.y - sy % H) + H) % H, s.r, 0, 6.283); x.fill(); });
      x.fillStyle = col.ember; x.shadowColor = col.ember;
      embers.forEach(function(e){
        e.p += .02; e.x += Math.sin(e.p) * .35 + e.vx; e.y += e.vy; e.vx *= .95;
        var dx = e.x - mx, dy = e.y - my, d2 = dx * dx + dy * dy;
        if(d2 < 14000){ var f = (14000 - d2) / 14000; e.vx += dx / Math.sqrt(d2 + 1) * f * 1.4; }
        if(e.y < -10){ var n = ember(false); for(var k in n) e[k] = n[k]; }
        x.globalAlpha = .3 + .4 * Math.abs(Math.sin(e.p * 2)); x.shadowBlur = 10;
        x.beginPath(); x.arc(e.x, e.y, e.r, 0, 6.283); x.fill(); x.shadowBlur = 0;
      });
      x.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  }
  function init(){
    c = document.createElement('canvas'); c.id = 'dCosmos'; c.setAttribute('aria-hidden', 'true'); document.body.insertBefore(c, document.body.firstChild);
    x = c.getContext('2d'); readColors(); size(); draw();
    addEventListener('resize', size);
    addEventListener('pointermove', function(e){ mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', function(){ running = !document.hidden; });
  }
  return { init: init, readColors: function(){ if(c) readColors(); } };
})();

var Petals = (function(){
  var c, x, ps = [], on = false, cols = ['#ff8a2a', '#ffb15c', '#ff5d8f', '#f6c667', '#ffd1dc', '#fff2c9'];
  function ensure(){
    if(c) return; c = document.createElement('canvas'); c.id = 'dPetals'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c); x = c.getContext('2d');
    size(); addEventListener('resize', size);
  }
  function size(){ var d = Math.min(2, devicePixelRatio || 1); c.width = innerWidth * d; c.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); }
  function burst(cx, cy, n){
    if(RM) return; ensure();
    for(var k = 0; k < n; k++){
      var a = Math.random() * Math.PI * 2, s = Math.random() * 9 + 4;
      ps.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 7, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, w: Math.random() * 6 + 5, h: Math.random() * 10 + 9, c: cols[(Math.random() * cols.length) | 0], life: 1, sw: Math.random() * 6.28 });
    }
    if(!on){ on = true; requestAnimationFrame(loop); }
  }
  function loop(){
    x.clearRect(0, 0, innerWidth, innerHeight);
    ps = ps.filter(function(p){ return p.life > 0 && p.y < innerHeight + 40; });
    ps.forEach(function(p){
      p.vy += .22; p.vx *= .985; p.vy *= .985; p.sw += .08; p.x += p.vx + Math.sin(p.sw) * 1.2; p.y += p.vy; p.r += p.vr; p.life -= .006;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(1, Math.abs(Math.cos(p.sw))); x.globalAlpha = Math.min(1, p.life * 1.5);
      x.fillStyle = p.c; x.beginPath(); x.moveTo(0, -p.h / 2); x.quadraticCurveTo(p.w, 0, 0, p.h / 2); x.quadraticCurveTo(-p.w, 0, 0, -p.h / 2); x.fill(); x.restore();
    });
    if(ps.length) requestAnimationFrame(loop); else { on = false; x.clearRect(0, 0, innerWidth, innerHeight); }
  }
  return { burst: burst };
})();

function header(){
  var h = $('.g-header'); if(!h) return;
  /* background animation is always on (the old pause button and its saved state are gone) */
  root.classList.remove('calm'); try { localStorage.removeItem('gitaCalm'); } catch(_){}
  /* theme: circular reveal from the button (replaces glass.js's instant switch) */
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('#gTheme'); if(!t) return;
    e.stopImmediatePropagation(); e.preventDefault();
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    function apply(){
      root.setAttribute('data-theme', next);
      t.firstChild.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
      var m = $('meta[name="theme-color"]'); if(m) m.setAttribute('content', next === 'dark' ? '#070514' : '#fbf3e4');
      try { localStorage.setItem('gitaTheme', next); } catch(_){}
      Cosmos.readColors();
    }
    if(!document.startViewTransition || RM){ apply(); return; }
    var r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var rad = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy));
    document.startViewTransition(apply).ready.then(function(){
      root.animate({ clipPath: ['circle(0px at ' + cx + 'px ' + cy + 'px)', 'circle(' + rad + 'px at ' + cx + 'px ' + cy + 'px)'] },
        { duration: 850, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function(){});
  }, true);
  /* auto-hide on scroll down, show on scroll up */
  var last = scrollY;
  addEventListener('scroll', function(){
    var y = scrollY, menuOpen = $('#gNav.open');
    h.classList.toggle('hide', y > last + 2 && y > 320 && !menuOpen && !document.body.classList.contains('modal-open'));
    if(y < last - 2) h.classList.remove('hide');
    last = y;
  }, { passive: true });
}

var revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
  es.forEach(function(en){ if(!en.isIntersecting) return; en.target.classList.add('in'); revealIO.unobserve(en.target); if(en.target._onIn) en.target._onIn(); });
}, { threshold: .12, rootMargin: '0px 0px -6% 0px' }) : null;
function watchReveal(scope){
  $$('[data-reveal]', scope).forEach(function(el){
    if(el._rv) return; el._rv = 1;
    var sib = Array.prototype.filter.call(el.parentElement.children, function(c){ return c.hasAttribute('data-reveal'); });
    el.style.transitionDelay = (Math.min(sib.indexOf(el), 6) * 70) + 'ms';
    if(revealIO) revealIO.observe(el); else el.classList.add('in');
  });
}

/* segmented control with a sliding pill */
function seg(el, onChange){
  if(!el) return { place: function(){} };
  var pill = $('.d-pill', el), btns = $$('button', el);
  function place(){
    var on = $('button.on', el) || btns[0]; if(!on || !pill) return;
    pill.style.left = on.offsetLeft + 'px'; pill.style.width = on.offsetWidth + 'px';
    if(el.classList.contains('lang-bar')){ pill.style.top = on.offsetTop + 'px'; pill.style.height = on.offsetHeight + 'px'; }
  }
  el.addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b || !el.contains(b) || b.classList.contains('on')) return;
    btns = $$('button', el); btns.forEach(function(x){ x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    place(); buzz(6); if(onChange) onChange(b);
  });
  addEventListener('resize', place); requestAnimationFrame(place); setTimeout(place, 700);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  return { place: place, refresh: function(){ btns = $$('button', el); place(); } };
}

/* ════════ HOME (index.html) ════════ */
var Home = {};
function initHome(){
  var home = $('#home'); if(!home) return;

  /* hero title letters */
  var h1 = $('#heroTitle');
  if(h1){
    var i = 0;
    Array.prototype.slice.call(h1.childNodes).forEach(function(n){
      if(n.nodeType === 3){
        var frag = document.createDocumentFragment();
        Array.from(n.textContent).forEach(function(c){ var s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i++); s.setAttribute('aria-hidden', 'true'); s.textContent = c === ' ' ? ' ' : c; frag.appendChild(s); });
        n.parentNode.replaceChild(frag, n);
      } else if(n.nodeType === 1 && n.classList.contains('text-grad')){ n.classList.add('ch'); n.style.setProperty('--i', i); i += 6; n.setAttribute('aria-hidden', 'true'); }
    });
    var go = function(){ h1.classList.add('go'); };
    var ld = $('#appLoader');
    if(!ld) go(); else { var mo = new MutationObserver(function(){ if(!document.contains(ld) || ld.classList.contains('is-done')){ mo.disconnect(); setTimeout(go, 250); } }); mo.observe(ld, { attributes: true }); mo.observe(document.body, { childList: true }); setTimeout(go, 6000); }
  }
  /* mandalas */
  var mA = $('#mandalaA'), mB = $('#mandalaB'), s = '', k;
  if(mA){
    s = '<circle r="97" fill="none" stroke="currentColor" stroke-width=".5"/><circle r="90" fill="none" stroke="currentColor" stroke-width=".3"/><circle r="62" fill="none" stroke="currentColor" stroke-width=".4"/>';
    for(k = 0; k < 24; k++) s += '<ellipse cx="0" cy="-76" rx="7" ry="18" transform="rotate(' + k * 15 + ')" fill="none" stroke="currentColor" stroke-width=".45"/>';
    for(k = 0; k < 48; k++) s += '<circle cx="0" cy="-93.5" r="' + (k % 2 ? .7 : 1.4) + '" transform="rotate(' + k * 7.5 + ')" fill="currentColor"/>';
    mA.innerHTML = s;
  }
  if(mB){
    s = '<circle r="96" fill="none" stroke="currentColor" stroke-width=".5" stroke-dasharray="2 3"/><circle r="72" fill="none" stroke="currentColor" stroke-width=".5"/>';
    for(k = 0; k < 12; k++) s += '<path d="M0 -96 L7 -74 L0 -66 L-7 -74 Z" transform="rotate(' + k * 30 + ')" fill="none" stroke="currentColor" stroke-width=".55"/>';
    for(k = 0; k < 16; k++) s += '<path d="M0 -70 C 6 -60, 6 -52, 0 -46 C -6 -52, -6 -60, 0 -70 Z" transform="rotate(' + k * 22.5 + ')" fill="currentColor" opacity=".18"/>';
    mB.innerHTML = s;
  }
  var stage = $('#stage');
  if(stage && !RM){
    var tx = 0, ty = 0, sx = 0, sy = 0;
    addEventListener('pointermove', function(e){ tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    (function tick(){ if(!home.classList.contains('hidden')){ sx = lerp(sx, tx, .06); sy = lerp(sy, ty, .06); stage.style.setProperty('--mx', sx.toFixed(3)); stage.style.setProperty('--my', sy.toFixed(3)); } requestAnimationFrame(tick); })();
  }
  /* Gita 2.47 decoding through every script */
  var LD = G('languageData') || {}, order = ['te', 'hi', 'en', 'ta', 'kn', 'ml', 'gu', 'bn', 'or'].filter(function(l){ return LD[l] && LD[l][2] && LD[l][2].slokas[46]; });
  var NAMES = { te:'Telugu', hi:'Devanagari', en:'English', ta:'Tamil', kn:'Kannada', ml:'Malayalam', gu:'Gujarati', bn:'Bengali', or:'Odia' };
  var tn = 0;
  function ticker(){
    if(home.classList.contains('hidden') || !order.length) return;
    var l = order[tn++ % order.length];
    var lb = $('#tickerLang'); if(lb) lb.textContent = NAMES[l].toUpperCase();
    scramble($('#ticker'), LD[l][2].slokas[46].replace(/\n\s*/g, '\n').trim(), 1000);
  }
  if($('#ticker')){ ticker(); setInterval(ticker, 4800); }
  /* count-up */
  $$('[data-count]').forEach(function(el){
    el._onIn = function(){ var to = +el.getAttribute('data-count'), t0 = performance.now();
      (function st(t){ var p = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e); if(p < 1) requestAnimationFrame(st); })(t0); };
    if(revealIO) revealIO.observe(el); else el.textContent = el.getAttribute('data-count');
  });

  /* language pill (drives app.js's changeLanguage) */
  var sel = $('#langSelect'), bar = $('#langBar'), langSeg;
  if(sel && bar){
    Array.prototype.forEach.call(sel.options, function(o){
      var m = o.textContent.match(/^(.*?)\s*\((.*)\)\s*$/);
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.k = o.value;
      b.innerHTML = esc(m ? m[1] : o.textContent) + '<small>' + esc(m ? m[2] : o.value) + '</small>';
      if(o.value === lang()) b.classList.add('on');
      bar.appendChild(b);
    });
    langSeg = seg(bar, function(b){ if(typeof window.changeLanguage === 'function') window.changeLanguage(b.dataset.k); });
  }
  var origChange = window.changeLanguage;
  if(typeof origChange === 'function'){
    window.changeLanguage = function(l){
      origChange.apply(this, arguments);
      if(bar){ $$('button', bar).forEach(function(x){ x.classList.toggle('on', x.dataset.k === lang()); }); if(langSeg) langSeg.place(); }
      Wheel.refresh(); Deck.render(); VOTD.paint(true);
      var hs = $('#deckSwitch'); if(hs){ $$('button', hs).forEach(function(x){ x.textContent = window.getSpecialLabel ? getSpecialLabel(x.dataset.k) : x.dataset.k; }); if(deckSeg) deckSeg.place(); }
    };
  }

  /* chapter grid: rendered here (app.js calls renderChapterGrid by name) */
  window.renderChapterGrid = function(){
    var grid = $('#chapterGrid'); if(!grid) return;
    var data = (G('getLangData') || function(){ return G('gitaData'); })(), td = G('gitaData') || {};
    var names = (G('chapterNames') || {})[lang()] || (G('chapterNames') || {}).te || [];
    var html = '';
    for(var n = 1; n <= 18; n++){
      var nm = names[n - 1] || (data[n] && data[n].name) || (td[n] && td[n].name) || '';
      var pct = chTotal(n) ? Math.round(readCount(n) / chTotal(n) * 100) : 0;
      html += '<a href="#chapter-' + n + '" class="card" data-ch="' + n + '" style="--i:' + n + '"><span class="n">' + (n < 10 ? '0' : '') + n + '</span>' +
        '<span class="go" aria-hidden="true">Read<span class="material-symbols-outlined">arrow_forward</span></span>' +
        '<span><span class="nm">' + esc(nm) + '</span><span class="c">' + esc(slokaCount(chTotal(n))) + '</span><span class="bar"><i style="--w:' + pct + '%"></i></span></span></a>';
    }
    grid.innerHTML = html;
    grid.classList.remove('in'); void grid.offsetWidth; grid.classList.add('in');
  };
  seg($('#viewSwitch'), function(b){
    var g = b.dataset.view === 'grid';
    $('#wheelView').classList.toggle('hidden', g); $('#chapterGrid').classList.toggle('hidden', !g);
    if(g) window.renderChapterGrid();
    lsSet('gitaChapterView', b.dataset.view);
  });
  if(lsGet('gitaChapterView', 'wheel') === 'grid'){ var gb = $('#viewSwitch [data-view="grid"]'); if(gb) gb.click(); }

  var Wheel = initWheel();
  var Deck = initDeck();
  var deckSeg = seg($('#deckSwitch'), function(b){ Deck.kind = b.dataset.k; Deck.render(); });
  var VOTD = initVotd();
  Home.onRead = function(ch){ Wheel.ring(ch); var bi = $('#chapterGrid .card[data-ch="' + ch + '"] .bar i'); if(bi) bi.style.setProperty('--w', Math.round(readCount(ch) / chTotal(ch) * 100) + '%'); };
  Home.deck = Deck;
  window.renderChapterGrid();

  /* remember where you were on the home page; open readers at the top */
  var homeY = 0;
  addEventListener('hashchange', function(){
    var inView = location.hash.indexOf('#chapter-') === 0 || /^#(dyana|mahatyam)$/.test(location.hash);
    if(inView){ window.scrollTo(0, 0); }
    else setTimeout(function(){ window.scrollTo(0, homeY); }, 30);
  });
  addEventListener('scroll', function(){ if(!home.classList.contains('hidden')) homeY = scrollY; }, { passive: true });
}

function initWheel(){
  var el = $('#chakra'); if(!el) return { refresh: function(){}, ring: function(){} };
  var rotor = $('#rotor'), spokes = $('#spokes'), hub = $('#hub'), STEP = 20, rot = 0, vel = 0, target = null, dragging = false, sel = -1, nodes = [], moved = false;
  var s = '<circle r="99" fill="none" stroke="currentColor" stroke-width=".4"/><circle r="30" fill="none" stroke="currentColor" stroke-width=".5"/>';
  for(var k = 0; k < 18; k++) s += '<line x1="0" y1="-30" x2="0" y2="-99" transform="rotate(' + (k * 20 + 10) + ')" stroke="currentColor" stroke-width=".4"/><path d="M0 -99 L4 -92 L-4 -92Z" transform="rotate(' + (k * 20 + 10) + ')" fill="currentColor"/>';
  spokes.innerHTML = s;
  for(k = 0; k < 18; k++){
    var n = document.createElement('button');
    n.className = 'node'; n.type = 'button'; n.setAttribute('role', 'option'); n.setAttribute('aria-label', 'Chapter ' + (k + 1));
    n.innerHTML = '<span>' + (k + 1) + '</span><svg class="ring-prog" viewBox="0 0 74 74" aria-hidden="true"><circle cx="37" cy="37" r="34" stroke-dasharray="213.6" stroke-dashoffset="213.6"/></svg>';
    el.appendChild(n); nodes.push(n);
  }
  function name(ch){ var cn = (G('chapterNames') || {})[lang()]; var d = (G('getLangData') || function(){ return {}; })(); return (cn && cn[ch - 1]) || (d[ch] && d[ch].name) || ''; }
  function first(ch){ var d = (G('getLangData') || function(){ return {}; })(), td = G('gitaData') || {}; var c = (d[ch] && d[ch].slokas && d[ch].slokas.length ? d[ch] : td[ch]); return c ? String(c.slokas[0]).replace(/\n\s*/g, '\n').trim() : ''; }
  function layout(){
    var R = el.clientWidth * .42;
    nodes.forEach(function(n, k){ var a = (k * STEP + rot - 90) * Math.PI / 180; n.style.transform = 'translate(' + (Math.cos(a) * R).toFixed(1) + 'px,' + (Math.sin(a) * R).toFixed(1) + 'px)'; });
    rotor.style.transform = 'rotate(' + rot + 'deg)';
  }
  function nearest(){ return ((Math.round(-rot / STEP) % 18) + 18) % 18; }
  function goTo(k){ var cur = Math.round(-rot / STEP), d = k - (((cur % 18) + 18) % 18); if(d > 9) d -= 18; if(d < -9) d += 18; target = -(cur + d) * STEP; }
  function select(k, quiet){
    sel = k; nodes.forEach(function(n, j){ n.classList.toggle('on', j === k); n.setAttribute('aria-selected', j === k); });
    hub.classList.add('swap');
    setTimeout(function(){ $('#hubNum').textContent = k + 1; $('#hubName').textContent = name(k + 1); $('#hubCnt').textContent = chTotal(k + 1) + ' ' + slokaWord(); hub.classList.remove('swap'); }, quiet ? 0 : 180);
    $('#ccEyebrow').textContent = 'Chapter ' + (k + 1);
    if(quiet) $('#ccName').textContent = name(k + 1); else scramble($('#ccName'), name(k + 1), 450);
    $('#ccCount').textContent = chTotal(k + 1);
    $('#ccMins').textContent = '~' + Math.max(1, Math.round(chTotal(k + 1) * 14 / 60));
    $('#ccRead').textContent = Math.round(readCount(k + 1) / chTotal(k + 1) * 100) + '%';
    $('#ccFirst').textContent = first(k + 1);
    $('#ccOpen').setAttribute('href', '#chapter-' + (k + 1));
    if(!quiet) buzz(4);
  }
  function loop(){
    if(!dragging){
      if(target !== null){ var d = target - rot; rot += d * .14; if(Math.abs(d) < .05){ rot = target; target = null; } }
      else if(Math.abs(vel) > .02){ rot += vel; vel *= .94; if(Math.abs(vel) <= .3){ vel = 0; target = Math.round(rot / STEP) * STEP; } }
    }
    layout(); var n = nearest(); if(n !== sel) select(n);
    requestAnimationFrame(loop);
  }
  function ang(e){ var r = el.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; }
  var last = 0, lastT = 0, dx0 = 0, dy0 = 0;
  el.addEventListener('pointerdown', function(e){ dragging = true; moved = false; target = null; vel = 0; last = ang(e); lastT = performance.now(); dx0 = e.clientX; dy0 = e.clientY; try { el.setPointerCapture(e.pointerId); } catch(_){} });
  el.addEventListener('pointermove', function(e){
    if(!dragging) return;
    if(Math.hypot(e.clientX - dx0, e.clientY - dy0) > 6) moved = true;
    var a = ang(e), d = a - last; if(d > 180) d -= 360; if(d < -180) d += 360;
    var now = performance.now(); rot += d; vel = d / Math.max(1, now - lastT) * 16; last = a; lastT = now;
  });
  function up(e){
    if(!dragging) return; dragging = false;
    if(!moved){
      var hit = document.elementsFromPoint(e.clientX, e.clientY).filter(function(x){ return x.classList && x.classList.contains('node'); })[0];
      if(hit){ var idx = nodes.indexOf(hit); if(idx === sel) location.hash = '#chapter-' + (idx + 1); else goTo(idx); }
      el.focus({ preventScroll: true });
    } else if(Math.abs(vel) < .4) target = Math.round(rot / STEP) * STEP;
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', function(){ dragging = false; target = Math.round(rot / STEP) * STEP; });
  el.addEventListener('wheel', function(e){ if(document.activeElement !== el) return; e.preventDefault(); target = (target === null ? Math.round(rot / STEP) * STEP : target) + (e.deltaY > 0 ? -STEP : STEP); }, { passive: false });
  el.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); goTo((sel + 1) % 18); }
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); goTo((sel + 17) % 18); }
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); location.hash = '#chapter-' + (sel + 1); }
  });
  addEventListener('resize', layout);
  function ring(ch){ var c = nodes[ch - 1] && nodes[ch - 1].querySelector('circle'); if(c && chTotal(ch)) c.style.strokeDashoffset = 213.6 * (1 - readCount(ch) / chTotal(ch)); if(sel === ch - 1) $('#ccRead').textContent = Math.round(readCount(ch) / chTotal(ch) * 100) + '%'; }
  select(0, true); for(var c = 1; c <= 18; c++) ring(c);
  if('IntersectionObserver' in window){ var io = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io.disconnect(); if(!RM){ rot = 180; target = 0; } } }, { threshold: .4 }); io.observe(el); }
  loop();
  return { refresh: function(){ select(sel < 0 ? 0 : sel, true); }, ring: ring };
}

function initDeck(){
  var el = $('#deck'), dots = $('#deckDots');
  var D = { kind: 'dyana', render: function(){} };
  if(!el) return D;
  D.render = function(){
    var get = G('getSpecialData'); var data = get ? get(D.kind) : { slokas: [] }, label = window.getSpecialLabel ? getSpecialLabel(D.kind) : D.kind;
    el.innerHTML = (data.slokas || []).map(function(t, i){
      return '<article class="dcard glass" data-k="' + D.kind + '" data-i="' + i + '"><span class="k">' + (i + 1) + '</span><span class="tag">' + esc(label) + ' · ' + (i + 1) + '</span>' +
        '<div class="t">' + esc(String(t).replace(/\n\s*/g, '\n').trim()) + '</div><div class="row">' +
        '<button type="button" class="d-btn sm primary" data-act="play"><span class="material-symbols-outlined fill">play_arrow</span>Listen</button>' +
        '<a class="d-btn sm" href="#' + D.kind + '"><span class="material-symbols-outlined">menu_book</span>Open all</a></div></article>';
    }).join('');
    dots.innerHTML = (data.slokas || []).map(function(){ return '<i></i>'; }).join('');
    el.scrollLeft = 0; requestAnimationFrame(fx); syncDeck();
  };
  function fx(){
    var mid = innerWidth / 2, best = 0, bd = 1e9;
    $$('.dcard', el).forEach(function(c, k){
      var r = c.getBoundingClientRect(), d = (r.left + r.width / 2 - mid) / innerWidth, ad = Math.min(1, Math.abs(d) * 1.6);
      c.style.setProperty('--s', (1 - ad * .12).toFixed(3)); c.style.setProperty('--o', (1 - ad * .45).toFixed(3)); c.style.setProperty('--ry', (-d * 20).toFixed(1) + 'deg');
      if(Math.abs(d) < bd){ bd = Math.abs(d); best = k; }
    });
    $$('i', dots).forEach(function(d, k){ d.classList.toggle('on', k === best); });
  }
  el.addEventListener('scroll', function(){ requestAnimationFrame(fx); }, { passive: true });
  addEventListener('resize', fx);
  var down = null;
  el.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'mouse' || e.target.closest('button,a')) return; down = { x: e.clientX, s: el.scrollLeft }; el.classList.add('drag'); });
  addEventListener('pointermove', function(e){ if(down) el.scrollLeft = down.s - (e.clientX - down.x); });
  addEventListener('pointerup', function(){
    if(!down) return; down = null; el.classList.remove('drag');
    var cs = $$('.dcard', el), mid = el.scrollLeft + el.clientWidth / 2, t = cs[0];
    cs.forEach(function(c){ if(Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(t.offsetLeft + t.offsetWidth / 2 - mid)) t = c; });
    if(t) el.scrollTo({ left: t.offsetLeft + t.offsetWidth / 2 - el.clientWidth / 2, behavior: 'smooth' });
  });
  el.addEventListener('click', function(e){
    var b = e.target.closest('[data-act="play"]'); if(!b) return;
    var c = b.closest('.dcard'), k = c.dataset.k, i = +c.dataset.i, P = G('Player');
    if(P && P.mode !== 'idle' && P.num === k && P.idx === i){ if(P.status === 'playing') pauseSession(); else resumeSession(); return; }
    if(typeof window.startSingle === 'function') startSingle(k, i, false);
  });
  D.render();
  return D;
}
function syncDeck(){
  var P = G('Player'); if(!P) return;
  $$('.dcard').forEach(function(c){
    var on = P.mode !== 'idle' && P.num === c.dataset.k && P.idx === +c.dataset.i;
    c.classList.toggle('playing', on);
    var ic = c.querySelector('[data-act="play"] .material-symbols-outlined'); if(ic) ic.textContent = on && P.status === 'playing' ? 'pause' : 'play_arrow';
  });
  var vp = $('#vdPlay .material-symbols-outlined');
  if(vp && VOTD_CUR) vp.textContent = (P.mode !== 'idle' && P.num === VOTD_CUR[0] && P.idx === VOTD_CUR[1] && P.status === 'playing') ? 'pause' : 'play_arrow';
}

var VOTD_CUR = null;
function initVotd(){
  if(!$('#votdBox')) return { paint: function(){} };
  var flat = [], td = G('gitaData') || {};
  for(var c = 1; c <= 18; c++) for(var i = 0; i < chTotal(c); i++) flat.push([c, i]);
  var now = new Date(), doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  VOTD_CUR = flat[(doy * 37) % flat.length];
  $('#vdDay').textContent = now.getDate(); $('#vdMon').textContent = now.toLocaleString('en', { month: 'short' });
  function text(){ var d = (G('getLangData') || function(){ return td; })(), ch = VOTD_CUR[0], ci = VOTD_CUR[1]; var s = (d[ch] && d[ch].slokas[ci]) || td[ch].slokas[ci]; return String(s).replace(/\n\s*/g, '\n').trim(); }
  function paint(anim){
    var names = (G('chapterNames') || {})[lang()] || [];
    $('#vdRef').textContent = 'Gita ' + VOTD_CUR[0] + '.' + (VOTD_CUR[1] + 1) + (names[VOTD_CUR[0] - 1] ? ' · ' + names[VOTD_CUR[0] - 1] : '');
    if(anim) scramble($('#vdText'), text(), 800); else $('#vdText').textContent = text();
    var gm = G('getMeaning'), m = gm ? gm(VOTD_CUR[0], VOTD_CUR[1], lang()) : null;
    var tmp = document.createElement('div'); tmp.innerHTML = m || ''; $('#vdMeaning').textContent = m ? tmp.textContent : '';
  }
  function loadMeaning(){ var em = G('ensureMeaningData'); if(em) em().then(function(){ paint(false); }).catch(function(){}); }
  paint(false);
  var box = $('#votdBox'); box._onIn = loadMeaning; if(revealIO) revealIO.observe(box); else loadMeaning();
  $('#vdShuffle').addEventListener('click', function(){ VOTD_CUR = flat[(Math.random() * flat.length) | 0]; paint(true); loadMeaning(); });
  $('#vdCopy').addEventListener('click', function(){
    var t = $('#vdRef').textContent + '\n\n' + text();
    var done = function(){ toast('Verse copied', 'success'); };
    if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, function(){ toast('Copy not allowed here', 'error'); });
    else { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch(e){} ta.remove(); }
  });
  $('#vdPlay').addEventListener('click', function(){
    var P = G('Player');
    if(P && P.mode !== 'idle' && P.num === VOTD_CUR[0] && P.idx === VOTD_CUR[1]){ if(P.status === 'playing') pauseSession(); else resumeSession(); return; }
    if(typeof window.startSingle === 'function') startSingle(VOTD_CUR[0], VOTD_CUR[1], false);
  });
  return { paint: paint };
}

/* ════════ READER (#viewer) ════════ */
function initReader(){
  var box = $('#slokaContainer'); if(!box) return;
  var medal = '<svg viewBox="-50 -50 100 100" aria-hidden="true"><circle r="47" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 4"/>';
  for(var k = 0; k < 8; k++) medal += '<path d="M0 -47 L5 -38 L0 -33 L-5 -38Z" transform="rotate(' + k * 45 + ')" fill="currentColor"/>';
  medal += '</svg>';
  var readIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
    es.forEach(function(en){
      var c = en.target;
      if(en.isIntersecting) c._rt = setTimeout(function(){ markRead(c._num, c._idx); }, 1500); else clearTimeout(c._rt);
    });
  }, { threshold: .6 }) : null;

  function slokaText(num, i){
    var spec = window.isSpecialView && isSpecialView(num);
    if(spec){ var sd = getSpecialData(num); return sd && sd.slokas[i]; }
    var d = (G('getLangData') || function(){ return {}; })(), td = G('gitaData') || {};
    var c = d[num] && d[num].slokas && d[num].slokas.length ? d[num] : td[num];
    return c ? (c.slokas[i] || (td[num] && td[num].slokas[i])) : '';
  }
  function enhance(div){
    if(div._dv || !div.classList || !div.classList.contains('sloka-box')) return;
    div._dv = 1;
    var idx = Array.prototype.indexOf.call(box.children, div), num = viewNum();
    div._num = num; div._idx = idx;
    div.style.setProperty('--i', Math.min(idx, 8));
    div.setAttribute('data-no', idx + 1);
    var spec = window.isSpecialView && isSpecialView(num), cn = (G('chapterNames') || {})[lang()] || [];
    var sub = spec ? getSpecialLabel(num) : ('Chapter ' + num + (cn[num - 1] ? ' · ' + cn[num - 1] : ''));
    var head = document.createElement('div'); head.className = 'd-head';
    head.innerHTML = '<div class="d-no">' + medal + '<span>' + (idx + 1) + '</span></div>' +
      '<div class="d-meta"><span class="d-label">' + esc(slokaWord()) + ' ' + (idx + 1) + '</span><span class="d-sub">' + esc(sub) + '</span></div>';
    div.insertBefore(head, div.firstChild);
    ['tl', 'tr', 'bl', 'br'].forEach(function(c){ var k = document.createElement('span'); k.className = 'd-corner ' + c; k.setAttribute('aria-hidden', 'true'); div.appendChild(k); });
    var orn = document.createElement('div'); orn.className = 'd-orn'; orn.setAttribute('aria-hidden', 'true');
    orn.innerHTML = '<i></i><svg viewBox="0 0 40 20"><path d="M20 2C16 7 16 13 20 18C24 13 24 7 20 2Z"/><path d="M20 18C14 16 9 12 6 7C12 7 17 11 20 18Z"/><path d="M20 18C26 16 31 12 34 7C28 7 23 11 20 18Z"/></svg><i></i>';
    div.appendChild(orn);
    var txt = null;
    Array.prototype.forEach.call(div.children, function(c){ if(!txt && c.tagName === 'DIV' && !c.className) txt = c; });
    var raw = slokaText(num, idx);
    if(txt && raw){
      txt.className = 'd-sloka-text';
      var words = String(raw).replace(/\n\s*/g, '\n').trim().split('\n').map(function(line){
        return line.split(/(\s+)/).map(function(t){ return t.trim() ? '<span class="w">' + esc(t) + '</span>' : t; }).join('');
      }).join('\n');
      txt.innerHTML = '<span class="d-text">' + words + '</span>';
    }
    var viz = document.createElement('div'); viz.className = 'd-viz'; viz.setAttribute('aria-hidden', 'true');
    viz.innerHTML = new Array(17).join('<i></i>');
    div.appendChild(viz);
    if(readIO && typeof num === 'number') readIO.observe(div);
  }
  new MutationObserver(function(ms){
    ms.forEach(function(m){ Array.prototype.forEach.call(m.addedNodes, enhance); });
    var num = viewNum(), rp = $('#readProg');
    if(rp) rp.style.transform = 'scaleX(' + (typeof num === 'number' && chTotal(num) ? readCount(num) / chTotal(num) : 0) + ')';
  }).observe(box, { childList: true });
  $$('.sloka-box', box).forEach(enhance);
}

/* word-sync highlight + waveform + island progress (one rAF loop while audio plays) */
var Sync = (function(){
  var running = false, lastDiv = null;
  function bars(t){ var out = []; for(var k = 0; k < 16; k++) out.push(.25 + .6 * Math.abs(Math.sin(t * .006 + k * .7) * Math.cos(t * .0023 + k))); return out; }
  function clear(div){ if(!div) return; $$('.w.said,.w.now', div).forEach(function(w){ w.classList.remove('said', 'now'); }); $$('.d-viz i', div).forEach(function(i){ i.style.height = '20%'; }); }
  function frame(t){
    var P = G('Player');
    if(!P || P.status !== 'playing'){ running = false; return; }
    var a = P.audio, div = G('activeSlokaDiv'), frac = a && a.duration ? a.currentTime / a.duration : 0, v = bars(t);
    if(div !== lastDiv){ clear(lastDiv); lastDiv = div; }
    if(div){
      $$('.d-viz i', div).forEach(function(b, k){ b.style.height = (12 + v[k] * 88).toFixed(0) + '%'; });
      var ws = div._ws || (div._ws = $$('.d-text .w', div));
      if(ws.length){
        var wt = div._wt || (div._wt = ws.map(function(w){ return Math.max(2, Array.from(w.textContent).length); }));
        var tot = div._tot || (div._tot = wt.reduce(function(x, y){ return x + y; }, 0)), acc = 0, idx = ws.length - 1, lead = Math.min(1, frac * 1.04);
        for(var k = 0; k < wt.length; k++){ acc += wt[k]; if(acc / tot >= lead){ idx = k; break; } }
        ws.forEach(function(w, k){ w.classList.toggle('said', k < idx); w.classList.toggle('now', k === idx); });
      }
    }
    $$('#dIsland .mini i').forEach(function(b, k){ b.style.height = (20 + v[k * 2] * 80).toFixed(0) + '%'; });
    var pr = $('#dIsland .prog i'); if(pr) pr.style.transform = 'scaleX(' + frac + ')';
    requestAnimationFrame(frame);
  }
  return {
    kick: function(){ if(!running){ running = true; requestAnimationFrame(frame); } },
    reset: function(){ clear(lastDiv); lastDiv = null; }
  };
})();

/* floating dynamic-island player, bound to app.js's Player */
var Island = (function(){
  var el = null, wasActive = false;
  function build(){
    if(el || !G('Player')) return;
    el = document.createElement('div'); el.className = 'd-island'; el.id = 'dIsland'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Now playing');
    el.innerHTML = '<div class="art"><img src="Krishna.webp" alt=""></div><div class="mini" aria-hidden="true">' + new Array(9).join('<i></i>') + '</div>' +
      '<div class="meta"><b></b><small></small></div><div class="ctrl">' +
      '<button type="button" class="side" data-a="prev" aria-label="Previous sloka"><span class="material-symbols-outlined">skip_previous</span></button>' +
      '<button type="button" class="main" data-a="toggle" aria-label="Pause"><span class="material-symbols-outlined fill">pause</span></button>' +
      '<button type="button" class="side" data-a="next" aria-label="Next sloka"><span class="material-symbols-outlined">skip_next</span></button>' +
      '<button type="button" class="side" data-a="stop" aria-label="Stop"><span class="material-symbols-outlined">close</span></button></div><div class="prog"><i></i></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(e){
      var b = e.target.closest('button'), P = G('Player');
      if(!b){ el.classList.add('wide'); return; }
      var a = b.dataset.a;
      if(a === 'toggle'){ if(P.status === 'playing') pauseSession(); else resumeSession(); }
      if(a === 'prev') prevStep();
      if(a === 'next') nextStep();
      if(a === 'stop') stopAll();
    });
  }
  function sync(){
    build(); if(!el) return;
    var P = G('Player'), active = P.mode !== 'idle', playing = P.status === 'playing';
    if(!active){ el.classList.remove('wide', 'playing'); setTimeout(function(){ if(G('Player').mode === 'idle') el.classList.remove('show'); }, 250); wasActive = false; Sync.reset(); syncDeck(); return; }
    el.classList.add('show'); el.classList.toggle('playing', playing);
    if(!wasActive){ el.classList.remove('wide'); setTimeout(function(){ el.classList.add('wide'); }, RM ? 0 : 380); } else el.classList.add('wide');
    wasActive = true;
    var spec = window.isSpecialView && isSpecialView(P.num), names = (G('chapterNames') || {})[lang()] || [];
    $('.meta b', el).textContent = spec ? getSpecialLabel(P.num) + ' · ' + (P.idx + 1) : slokaWord() + ' ' + P.num + '.' + (P.idx + 1);
    var sub = P.mode === 'range' ? (P.from + '–' + P.to + ' · step ' + (P.pos + 1) + '/' + P.list.length) : (P.loop ? 'Repeating' : (spec ? '' : (names[P.num - 1] || '')));
    if(P.speed && P.speed !== 1) sub += ' · ' + P.speed + '×';
    $('.meta small', el).textContent = (playing ? '' : 'Paused · ') + sub;
    var gt = G('groupTarget');
    $('[data-a="prev"]', el).disabled = !(P.mode === 'range' && gt && gt(-1) >= 0);
    $('[data-a="next"]', el).disabled = !(P.mode === 'range' && gt && gt(1) >= 0);
    $('[data-a="toggle"] .material-symbols-outlined', el).textContent = playing ? 'pause' : 'play_arrow';
    $('[data-a="toggle"]', el).setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if(playing) Sync.kick();
    syncDeck();
  }
  return { sync: sync };
})();

function hookPlayer(){
  if(typeof window.syncUI !== 'function' || !G('Player')) return;
  var orig = window.syncUI;
  window.syncUI = function(){ orig.apply(this, arguments); try { Island.sync(); } catch(e){} };
  var P = G('Player');
  /* the audio element is created lazily; when it exists, re-sync on real playback events too */
  var hooked = null;
  setInterval(function(){ if(P.audio && P.audio !== hooked){ hooked = P.audio; ['playing', 'pause', 'ended'].forEach(function(ev){ hooked.addEventListener(ev, function(){ try { Island.sync(); } catch(e){} }); }); } }, 500);
}

/* range player sheet: steppers + live bead preview of both patterns */
function initRange(){
  var modal = $('#rangeModal'); if(!modal) return;
  var chase = null;
  function wrap(id){
    var inp = document.getElementById(id); if(!inp || inp.parentNode.classList.contains('d-stepper')) return;
    var w = document.createElement('div'); w.className = 'd-stepper';
    inp.parentNode.insertBefore(w, inp);
    var minus = document.createElement('button'), plus = document.createElement('button');
    [minus, plus].forEach(function(b, j){ b.type = 'button'; b.className = 'd-step'; b.setAttribute('aria-label', (j ? 'Increase ' : 'Decrease ') + id.replace('range', '').toLowerCase()); b.innerHTML = '<span class="material-symbols-outlined">' + (j ? 'add' : 'remove') + '</span>'; });
    w.appendChild(minus); w.appendChild(inp); w.appendChild(plus);
    function step(d){
      if(inp.readOnly) return;
      var min = +inp.min || 1, max = +inp.max || 999, v = parseInt(inp.value, 10); if(isNaN(v)) v = min;
      inp.value = clamp(v + d, min, max);
      inp.classList.remove('bump'); void inp.offsetWidth; inp.classList.add('bump');
      inp.dispatchEvent(new Event('input', { bubbles: true })); buzz(4);
    }
    minus.addEventListener('click', function(){ step(-1); }); plus.addEventListener('click', function(){ step(1); });
    inp.addEventListener('input', beads);
  }
  ['rangeFrom', 'rangeTo', 'rangeIterations'].forEach(wrap);
  var pa = null, pb = null;
  $$('.pattern-btn', modal).forEach(function(b){
    var oc = b.getAttribute('onclick') || '';
    var s = document.createElement('span'); s.className = 'd-beads'; s.setAttribute('aria-hidden', 'true'); b.appendChild(s);
    if(oc.indexOf("'A'") >= 0) pa = s; else pb = s;
  });
  function num(id, d){ var v = parseInt((document.getElementById(id) || {}).value, 10); return isNaN(v) ? d : v; }
  function beads(){
    var f = num('rangeFrom', 1), t = num('rangeTo', f), it = clamp(num('rangeIterations', 1), 1, 20); if(t < f) t = f;
    var A = [], B = [], i, r;
    for(i = f; i <= t && A.length < 14; i++) for(r = 0; r < it && A.length < 14; r++) A.push(i);
    for(r = 0; r < it && B.length < 14; r++) for(i = f; i <= t && B.length < 14; i++) B.push(i);
    var total = (t - f + 1) * it;
    function html(list){ return list.map(function(n, k){ return '<span class="d-bead" style="--i:' + k + '">' + n + '</span>'; }).join('') + (total > list.length ? '<span class="d-bead" style="--i:15;width:auto;padding:0 6px">…</span>' : ''); }
    if(pa) pa.innerHTML = html(A); if(pb) pb.innerHTML = html(B);
  }
  function startChase(){
    clearInterval(chase); var k = 0;
    chase = setInterval(function(){
      if(modal.style.display !== 'flex'){ clearInterval(chase); return; }
      [pa, pb].forEach(function(s){ if(!s) return; var bs = $$('.d-bead', s); bs.forEach(function(b, j){ b.classList.toggle('lit', j === k % Math.max(1, bs.length)); }); });
      k++;
    }, 380);
  }
  var origOpen = window.openRangeModal;
  if(typeof origOpen === 'function') window.openRangeModal = function(){ var r = origOpen.apply(this, arguments); beads(); startChase(); buzz(8); return r; };
  var origClose = window.closeRangeModal;
  if(typeof origClose === 'function') window.closeRangeModal = function(){ clearInterval(chase); return origClose.apply(this, arguments); };
  /* swipe the sheet down to close */
  var box = $('.range-modal-box', modal), y0 = null;
  if(box){
    box.addEventListener('touchstart', function(e){ if(box.scrollTop <= 0 && !e.target.closest('input,button')) y0 = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', function(e){ if(y0 !== null && e.changedTouches[0].clientY - y0 > 80) window.closeRangeModal(); y0 = null; }, { passive: true });
  }
  beads();
}

/* ════════ SLOKA TEST (GitaTest.html) ════════ */
function initTest(){
  var rs = $('#resultSection'); if(!rs) return;
  var empty = $('#testEmpty');
  if(empty) new MutationObserver(function(){ empty.classList.toggle('hidden', !rs.classList.contains('hidden') || !$('#resultsCard').classList.contains('hidden')); })
    .observe(rs, { attributes: true, attributeFilter: ['class'] });
  var rc = $('#resultsCard');
  if(empty && rc) new MutationObserver(function(){ empty.classList.toggle('hidden', !rs.classList.contains('hidden') || !rc.classList.contains('hidden')); }).observe(rc, { attributes: true, attributeFilter: ['class'] });
  /* streak ring in the session bar */
  var bar = $('#sessionBar .session-stats'), streak = 0;
  if(bar){
    var s = document.createElement('div'); s.className = 'd-streak'; s.title = 'Reveal streak';
    s.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" stroke="var(--line)"/><circle class="p" cx="20" cy="20" r="16"/></svg><span>0 / 5</span>';
    bar.appendChild(s);
  }
  function setStreak(n){ streak = n; var p = $('.d-streak .p'), t = $('.d-streak span'); if(p) p.style.strokeDashoffset = 100.5 * (1 - n / 5); if(t) t.textContent = n + ' / 5'; }
  document.addEventListener('gitatest:reveal', function(e){
    var d = e.detail || {}, src = d.from || $('#viewBtn');
    var r = src ? src.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    if(d.correct === false){
      setStreak(0); buzz(60);
      var card = $('#resultSection'); if(card){ card.classList.remove('d-shake'); void card.offsetWidth; card.classList.add('d-shake'); }
      return;
    }
    setStreak(Math.min(5, streak + 1));
    Petals.burst(r.left + r.width / 2, r.top + r.height / 2, d.correct === true || streak === 5 ? 120 : 60);
    buzz([10, 40, 10]);
    if(streak === 5){ toast('Five in a row — shubham!', 'success'); setTimeout(function(){ setStreak(0); }, 2200); }
  });
  ['resetBtn', 'newSessionBtn'].forEach(function(id){ var b = document.getElementById(id); if(b) b.addEventListener('click', function(){ setStreak(0); }); });
}

/* ════════ ABOUT / INSPIRATION timeline ════════ */
function initTimeline(){
  var tl = $('.tl'); if(!tl) return;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'line'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path class="bg" d="M2 0 V 10"/><path class="fg" d="M2 0 V 10"/>';
  tl.insertBefore(svg, tl.firstChild);
  $$('.tl-item', tl).forEach(function(it){ var k = document.createElement('span'); k.className = 'knot'; it.insertBefore(k, it.firstChild); });
  var fg = $('path.fg', svg), bg = $('path.bg', svg);
  function draw(){
    var r = tl.getBoundingClientRect(), H = Math.max(1, r.height);
    svg.setAttribute('viewBox', '0 0 4 ' + H); fg.setAttribute('d', 'M2 0 V ' + H); bg.setAttribute('d', 'M2 0 V ' + H);
    var p = clamp((innerHeight * .55 - r.top) / H, 0, 1);
    fg.style.strokeDasharray = H; fg.style.strokeDashoffset = H * (1 - p);
    $$('.tl-item', tl).forEach(function(it){ var ir = it.getBoundingClientRect(); it.classList.toggle('lit', ir.top + ir.height / 2 < innerHeight * .6); });
  }
  addEventListener('scroll', function(){ requestAnimationFrame(draw); }, { passive: true }); addEventListener('resize', draw); setTimeout(draw, 100); draw();
}

/* ════════ boot ════════ */
function boot(){
  ambient(); Cosmos.init(); header(); watchReveal(document);
  try { initHome(); } catch(e){ console.error('divya home', e); }
  try { initReader(); hookPlayer(); initRange(); } catch(e){ console.error('divya reader', e); }
  try { initTest(); } catch(e){ console.error('divya test', e); }
  try { initTimeline(); } catch(e){ console.error('divya timeline', e); }
}
/* glass.js (also deferred, earlier) builds the header on DOMContentLoaded; run after it */
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 0); });
else setTimeout(boot, 0);
})();
