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

  /* ── ヒーローのアプリ画面を入れ替える ─────── */
  /* 1枚のマスに画像を2枚重ね、上の1枚を薄く出して下と入れかえる＝画面が暗く光らない。
     ・動きを減らす設定の人には何も起きない
     ・画面から外れたら止める（電池と発熱のため）
     ・このブロックが落ちても、元の1枚だけがそのまま出る */
  (function(){
    var mo = document.querySelector('.hero .mosaic');
    if(!mo || reduce || !('IntersectionObserver' in window)) return;
    var base = [].slice.call(mo.children).filter(function(n){ return n.tagName === 'IMG'; });
    if(base.length < 2) return;
    var pool = [];
    base.forEach(function(t){ var v = t.getAttribute('src'); if(pool.indexOf(v) < 0) pool.push(v); });
    if(pool.length < 2) return;
    pool.forEach(function(v){ var i = new Image(); i.src = v; });     // 先読み

    var cells = base.map(function(t){                                  // 2枚重ねに組みかえる
      var w = document.createElement('span');
      w.className = 'cell';
      mo.insertBefore(w, t); w.appendChild(t);
      var top = document.createElement('img');
      top.className = 'b'; top.alt = ''; top.decoding = 'async';
      w.appendChild(top);
      return {lo:t, hi:top, busy:false};
    });

    var timer = null;
    function step(){
      var c = cells[(Math.random() * cells.length) | 0];
      if(c.busy) return;
      var cur = c.lo.getAttribute('src');
      var cnt = {};                                                   // いま何回出ているかを数えて
      pool.forEach(function(v){ cnt[v] = 0; });
      cells.forEach(function(x){ var v = x.lo.getAttribute('src'); cnt[v] = (cnt[v] || 0) + 1; });
      var cand = pool.filter(function(v){ return v !== cur; });        // いちばん少ないものから選ぶ
      var min = Math.min.apply(null, cand.map(function(v){ return cnt[v]; }));
      cand = cand.filter(function(v){ return cnt[v] === min; });       // ＝同じ画面が固まらない
      var next = cand[(Math.random() * cand.length) | 0];
      c.busy = true;
      c.hi.src = next;
      var show = function(){
        c.hi.classList.add('on');
        setTimeout(function(){                                          // 出しきってから下を差しかえる
          c.lo.src = next;
          c.hi.style.transition = 'none';
          c.hi.classList.remove('on');
          void c.hi.offsetWidth;
          c.hi.style.transition = '';
          c.busy = false;
        }, 760);
      };
      if(c.hi.complete) show(); else c.hi.onload = show;
    }
    function start(){ if(!timer) timer = setInterval(step, 2600); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    /* 見えているかの判定は自前で持つ（IntersectionObserver が返らない環境でも動くように） */
    function seen(){ var r = mo.getBoundingClientRect(); return r.bottom > 0 && r.top < (window.innerHeight || 0); }
    var inView = seen();
    function sync(){ (inView && !document.hidden) ? start() : stop(); }
    new IntersectionObserver(function(es){
      inView = es[es.length - 1].isIntersecting; sync();
    }, {threshold:0}).observe(mo);
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
