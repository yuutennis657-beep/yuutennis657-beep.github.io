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

  /* ── ヒーローのスライドショー ─────────────── */
  /* アプリ画面を1枚ずつ。次の1枚がゆっくり寄りながら上に溶け出す＝画面が暗く落ちない。
     ・動きを減らす設定の人には何も起きない（先頭の1枚のまま）
     ・画面から外れたら止める（電池と発熱のため）
     ・このブロックが落ちても、HTMLに .on がある先頭の1枚がそのまま出る */
  (function(){
    var box = document.querySelector('.hero .shots');
    if(!box || reduce) return;
    var sl = [].slice.call(box.children).filter(function(n){ return n.tagName === 'IMG'; });
    if(sl.length < 2) return;

    var HOLD = 5200, FADE = 1100;
    var cur = Math.max(0, sl.indexOf(box.querySelector('img.on')));
    var timer = null, moving = false;

    /* 2枚目からは data-src。出す直前に src を入れる＝最初に9枚まとめて落とさない */
    function preload(i){
      var n = sl[i % sl.length];
      if(n.getAttribute('src')) return;
      var v = n.getAttribute('data-src');
      if(v) n.setAttribute('src', v);
    }
    preload(cur + 1);                                      // 次の1枚だけ先に読んでおく

    function step(){
      if(moving) return;
      var old = sl[cur], nx = sl[(cur + 1) % sl.length];
      preload(cur + 2);                 // 次の次を読んでおく＝切りかわりで白く待たない
      moving = true;
      old.classList.add('prev');        // 下に残す（＝すきまが黒くならない）
      old.classList.remove('on');
      nx.classList.add('on');           // 上に薄く出しながら寄る
      cur = (cur + 1) % sl.length;
      setTimeout(function(){ old.classList.remove('prev'); moving = false; }, FADE + 60);
    }
    function start(){ if(!timer) timer = setInterval(step, HOLD); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    /* 見えているかの判定は自前で持つ（IntersectionObserver が返らない環境でも動くように） */
    function seen(){ var r = box.getBoundingClientRect(); return r.bottom > 0 && r.top < (window.innerHeight || 0); }
    var inView = seen();
    function sync(){ (inView && !document.hidden) ? start() : stop(); }
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        inView = es[es.length - 1].isIntersecting; sync();
      }, {threshold:0}).observe(box);
    }
    window.addEventListener('scroll', function(){ inView = seen(); sync(); }, {passive:true});
    document.addEventListener('visibilitychange', sync);   // 別タブから戻ってきたら動かす
    sync();
  })();

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
