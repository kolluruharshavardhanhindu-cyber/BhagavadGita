/* UI behaviour layer (single script for every page) —
   glass header + footer, light/dark theme (LIGHT by default), V6 ambient scene,
   V6 loading screen hand-off, toasts and scroll progress.
   Purely additive: it never touches app data or app logic.
   Exposes window.GitaUI = { toast, applyTheme }. */
(function(){
  'use strict';
  var root = document.documentElement;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* theme: light is the default; a choice saved via the toggle is respected */
  var theme = 'light';
  try { var saved = localStorage.getItem('gitaTheme'); if (saved === 'dark' || saved === 'light') theme = saved; } catch(e){}
  root.classList.add('js');
  root.setAttribute('data-theme', theme);
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  function setMeta(t){ if (metaTheme) metaTheme.setAttribute('content', t === 'dark' ? '#070b1f' : '#eef2ff'); }
  setMeta(theme);

  /* ─── V6 ambient scene: drifting light blobs + rising particles ─── */
  function initScene(){
    var scene = document.querySelector('.scene');
    if (!scene) {
      scene = document.createElement('div');
      scene.className = 'scene'; scene.setAttribute('aria-hidden','true');
      document.body.insertBefore(scene, document.body.firstChild);
    }
    if (scene.children.length) return;
    var html = '<span class="blob blob-1"></span><span class="blob blob-2"></span><span class="blob blob-3"></span><span class="blob blob-4"></span>';
    var count = window.innerWidth < 700 ? 9 : 16;
    for (var i = 0; i < count; i++) {
      var size = (1.5 + Math.random() * 2.5).toFixed(1);
      html += '<span class="particle" style="left:' + (Math.random()*100).toFixed(1) + '%;width:' + size + 'px;height:' + size +
              'px;animation-duration:' + (22 + Math.random()*22).toFixed(1) + 's;animation-delay:' + (-Math.random()*40).toFixed(1) +
              's;--drift:' + (Math.random()*60-30).toFixed(0) + 'px"></span>';
    }
    scene.innerHTML = html;
  }

  /* ─── V6 loading screen ─── */
  function hideLoader(){
    var loader = document.getElementById('appLoader');
    if (!loader) return;
    /* If the scripture data never arrived, say so instead of showing an empty page. */
    var dataMissing = document.body.hasAttribute('data-needs-data') && (typeof gitaData === 'undefined');
    if (dataMissing) {
      loader.classList.add('is-error');
      var t = loader.querySelector('[data-loader-title]'), p = loader.querySelector('[data-loader-text]'), r = loader.querySelector('[data-loader-retry]');
      if (t) t.textContent = 'Couldn\u2019t load the scriptures';
      if (p) p.textContent = 'Please check your connection and try again.';
      if (r) r.classList.remove('hidden');
      return;
    }
    loader.classList.add('is-done');
    setTimeout(function(){ if (loader.parentNode) loader.parentNode.removeChild(loader); }, 600);
  }
  window.addEventListener('load', function(){ setTimeout(hideLoader, 120); });
  /* failsafe: never keep the loader up forever */
  setTimeout(function(){ var l = document.getElementById('appLoader'); if (l && !l.classList.contains('is-error')) hideLoader(); }, 12000);

  /* ─── contact + working e-mail (mailto first, Gmail-web / copy fallback) ─── */
  var CONTACT = { email:'kolluruharshavardhanhindu@gmail.com', phone:'6302394175', subject:'భగవద్గీత వెబ్‌సైట్ సూచనలు' };
  var MAIL_HREF = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(CONTACT.subject);

  function copyText(text){
    function legacy(){
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly','');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch(e){}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function(){ return true; }, function(){ return legacy(); });
    }
    return Promise.resolve(legacy());
  }

  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-mail]');
    if (a) {
      /* Let the OS / WebView hand the mailto: link to the mail app. If the page is still
         in front a moment later, no mail app took it - so reveal the fallbacks. */
      e.preventDefault();
      var left = false;
      function mark(){ left = true; }
      window.addEventListener('blur', mark, {once:true});
      document.addEventListener('visibilitychange', mark, {once:true});
      window.location.href = a.getAttribute('href');
      setTimeout(function(){
        window.removeEventListener('blur', mark); document.removeEventListener('visibilitychange', mark);
        if (left) return;
        var card = a.closest('.contact-card'), fb = card && card.querySelector('.mail-fallback');
        if (fb) fb.hidden = false;
        else toast('No mail app found – address copied.', {type:'info'}), copyText(CONTACT.email);
      }, 1800);
      return;
    }
    var c = e.target.closest && e.target.closest('[data-copy]');
    if (c) {
      copyText(c.getAttribute('data-copy')).then(function(ok){
        toast(ok ? 'Email address copied' : 'Copy failed – please select it manually', {type: ok ? 'success' : 'error'});
      });
    }
  });

  /* ─── toasts ─── */
  function toast(message, opts){
    opts = opts || {};
    var region = document.getElementById('toastRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toastRegion'; region.className = 'toast-region';
      region.setAttribute('aria-live','polite'); region.setAttribute('aria-atomic','false');
      document.body.appendChild(region);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (opts.type ? ' toast-' + opts.type : '');
    var icon = document.createElement('span');
    icon.className = 'material-symbols-outlined'; icon.setAttribute('aria-hidden','true');
    icon.textContent = opts.type === 'error' ? 'error' : (opts.type === 'success' ? 'check_circle' : 'info');
    var text = document.createElement('span'); text.textContent = message;
    el.appendChild(icon); el.appendChild(text); region.appendChild(el);
    setTimeout(function(){ el.classList.add('is-leaving'); setTimeout(function(){ el.remove(); }, 350); }, opts.duration || 3600);
  }

  function build(){
    var body = document.body;
    if (!body || document.querySelector('.g-header')) return;

    initScene();

    /* floating glass header */
    var links = [
      ['index.html','Home','home'],
      ['inspiration.html','Inspiration','auto_awesome'],
      ['aboutus.html','About','info'],
      ['gita-app/index.html','Gita App','apps']
    ];
    var h = document.createElement('header');
    h.className = 'g-header'; h.setAttribute('role','banner');
    var nav = links.map(function(l){
      return '<a href="'+l[0]+'"'+(page===l[0].toLowerCase()?' aria-current="page"':'')+'>'+l[1]+'</a>';
    }).join('');
    h.innerHTML =
      '<a class="g-brand" href="index.html" aria-label="Bhagavad Gita – Home"><img src="Krishna.webp" alt="" width="34" height="34"><span>Bhagavad Gita</span></a>'+
      '<nav class="g-nav" id="gNav" aria-label="Main">'+nav+'</nav>'+
      '<button class="g-icon-btn" id="gTheme" type="button" aria-label="Toggle light/dark theme"><span class="material-symbols-outlined" aria-hidden="true">'+(theme==='dark'?'light_mode':'dark_mode')+'</span></button>'+
      '<button class="g-icon-btn g-burger" id="gBurger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="gNav"><span class="material-symbols-outlined" aria-hidden="true">menu</span></button>'+
      '<div class="g-progress" aria-hidden="true"><b></b></div>';
    body.insertBefore(h, body.firstChild);

    var navEl = h.querySelector('#gNav'), burger = h.querySelector('#gBurger');
    function closeMenu(){ navEl.classList.remove('open'); burger.setAttribute('aria-expanded','false'); burger.firstChild.textContent='menu'; }
    burger.addEventListener('click', function(){
      var open = navEl.classList.toggle('open');
      burger.setAttribute('aria-expanded', open); burger.firstChild.textContent = open ? 'close' : 'menu';
    });
    navEl.addEventListener('click', function(e){ if (e.target.tagName==='A') closeMenu(); });
    document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeMenu(); });
    document.addEventListener('click', function(e){ if (!h.contains(e.target)) closeMenu(); });

    h.querySelector('#gTheme').addEventListener('click', function(){
      theme = (root.getAttribute('data-theme')==='dark') ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      this.firstChild.textContent = theme==='dark' ? 'light_mode' : 'dark_mode';
      setMeta(theme);
      try { localStorage.setItem('gitaTheme', theme); } catch(e){}
    });

    /* scroll: header solidifies + progress bar (one rAF-throttled handler) */
    var bar = h.querySelector('.g-progress b'), ticking = false;
    function onScroll(){
      if (ticking) return; ticking = true;
      requestAnimationFrame(function(){
        var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
        h.classList.toggle('scrolled', y > 12);
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y/max) : 0) + ')';
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

    /* footer */
    var f = document.createElement('footer');
    f.className = 'g-footer';
    f.innerHTML =
      '<div><b>Bhagavad Gita</b><br>Read, listen and learn the sacred verses.'+
        '<div class="g-contact"><span>Kolluru HarshaVardhan</span>'+
        '<a href="tel:6302394175" aria-label="Call 6302394175"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>6302394175</a>'+
        '<a href="'+MAIL_HREF+'" data-mail data-to="'+CONTACT.email+'" data-subject="'+CONTACT.subject+'" aria-label="Email via Gmail"><svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75V40h7c1.66 0 3-1.34 3-3V16.2z"/><path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.66 0-3-1.34-3-3V16.2z"/><polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/><path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z"/><path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z"/></svg>Gmail</a>'+
        '</div></div>'+
      '<nav aria-label="Footer"><a href="index.html">Chapters</a><a href="inspiration.html">Inspiration</a><a href="aboutus.html">About</a><a href="gita-app/index.html">Gita App</a></nav>'+
      '<div class="g-sans">© '+new Date().getFullYear()+' Bhagavad Gita · ॐ श्रीकृष्णार्पणमस्तु</div>';
    body.appendChild(f);

    /* cursor-follow glow on cards (delegated, cheap) */
    document.addEventListener('pointermove', function(e){
      var c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, {passive:true});

    /* reveal-on-scroll for footer / static blocks */
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
      }, {threshold:.12});
      [f].concat([].slice.call(document.querySelectorAll('.wrapper .grid > .card, .contact-card'))).forEach(function(el){
        el.classList.add('g-reveal'); io.observe(el);
      });
    }
  }

  window.GitaUI = { toast: toast, applyTheme: function(t){ root.setAttribute('data-theme', t); setMeta(t); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
