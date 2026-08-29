/* 伊藤 優 個人サイト（新デザイン）／ new/app.js
   ・ヘッダーの縮小 ・ドロワー ・出現アニメ だけ。タブは無い
   ・このJSが落ちても本文は全部読める（.rise の初期値は「見える」。JSが .in を足す） */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  document.documentElement.classList.add('js');   // ← これが付いて初めて隠れる

  /* ── ヘッダーの縮小 ───────────────────── */
  var hd = document.querySelector('.hd'), ticking = false;
  function onScroll(){
    if(ticking) return; ticking = true;
    (window.requestAnimationFrame || setTimeout)(function(){
      ticking = false;
      if(hd) hd.classList.toggle('min', window.pageYOffset > 120);
    });
  }
  if(hd){ window.addEventListener('scroll', onScroll, {passive:true}); onScroll(); }

  /* ── ドロワー ────────────────────────── */
  var hb = document.querySelector('.hb'), dw = document.querySelector('.dw');
  if(hb && dw){
    var close = dw.querySelector('.dw-close');
    var open = function(){
      dw.hidden = false; dw.removeAttribute('inert');
      document.body.style.overflow = 'hidden';
      hb.setAttribute('aria-expanded','true');
      if(close) close.focus();
    };
    var shut = function(){
      dw.hidden = true; dw.setAttribute('inert','');
      document.body.style.overflow = '';
      hb.setAttribute('aria-expanded','false'); hb.focus();
    };
    dw.setAttribute('inert','');
    hb.addEventListener('click', open);
    if(close) close.addEventListener('click', shut);
    dw.addEventListener('click', function(e){ if(e.target.closest('a')) shut(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !dw.hidden) shut(); });
  }

  /* ── 出現（1要素1回だけ）──────────────── */
  var rise = [].slice.call(document.querySelectorAll('.rise'));
  if(!rise.length) return;
  if(reduce || !('IntersectionObserver' in window)){
    rise.forEach(function(el){ el.classList.add('in'); });
    return;
  }
  rise.forEach(function(el){                       // 兄弟の順番を --i で渡す（上限6番目）
    if(el.style.getPropertyValue('--i')) return;
    var i = 0, p = el.previousElementSibling;
    while(p && p.classList.contains('rise')){ i++; p = p.previousElementSibling; }
    el.style.setProperty('--i', Math.min(i, 6));
  });
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
    });
  }, {threshold:.15, rootMargin:'0px 0px -5% 0px'});
  rise.forEach(function(el){ io.observe(el); });
})();
