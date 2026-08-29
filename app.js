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

  /* ── ヒーローのスライド（右から左へ流れる）────────────
     ・横一列に並べた rail を translate でずらす。次の1枚は右から入る
     ・自動で5秒ごとに1枚。手で動かしたあとは7秒たってから自動に戻る
     ・カードをタップ＝次へ／指で横に払う＝その向きへ／矢印・下の点でも動く
     ・キャラ（.chars）も同じ番号のものに入れかわる＝画面と一緒に動く
     ・画面の外／別タブ／マウスを乗せている間は止める
     ・動きを減らす設定の人には、自動では動かさない（手で動かすことはできる）
     ・このブロックが落ちても、rail は 0 のまま＝先頭の1枚がそのまま出る */
  (function(){
    var frame = document.querySelector('.hero .frame');
    if(!frame) return;
    var deck = frame.querySelector('.deck'), rail = frame.querySelector('.rail');
    var charbox = frame.querySelector('.chars');
    if(!deck || !rail) return;
    var sl = [].slice.call(rail.children);
    var chars = charbox ? [].slice.call(charbox.querySelectorAll('img')) : [];
    var N = sl.length;
    if(N < 2) return;

    var HOLD = 5000, WAIT = 7000, MOVE = 600;   /* 自動の間かく／自動に戻るまで／CSSの .6s */
    var pos = 0;                                /* 0〜N。N は末尾に足した「先頭の複製」 */
    var timer = null, back = null, unlock = null;
    var locked = false, paused = false, inView = true;

    /* 末尾に先頭の複製を1枚。これで「最後→最初」も右から左のまま流れる（逆走しない） */
    var clone = sl[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    rail.appendChild(clone);

    /* 出す直前に src を入れる＝最初に9枚＋9体をまとめて落とさない */
    function load(i){
      var k = ((i % N) + N) % N;
      [sl[k].querySelector('img'), chars[k]].forEach(function(n){
        if(!n || n.getAttribute('src')) return;
        var v = n.getAttribute('data-src');
        if(v) n.setAttribute('src', v);
      });
    }

    function at(px){                            /* 指で持っている間＝アニメ無しでその場に置く */
      rail.style.transform = 'translate3d(calc(' + (-100 * pos) + '% + ' + px + 'px),0,0)';
    }
    function paint(anim){
      if(anim && !reduce) rail.classList.add('mv'); else rail.classList.remove('mv');
      rail.style.transform = 'translate3d(' + (-100 * pos) + '%,0,0)';
      var k = pos % N;
      chars.forEach(function(n, j){ n.classList.toggle('on', j === k); });
      dots.forEach(function(b, j){ b.setAttribute('aria-current', j === k ? 'true' : 'false'); });
      load(k); load(k + 1); load(k - 1);
    }
    function release(){                         /* 複製に着いていたら、見た目そのままで先頭へ戻す */
      if(unlock){ clearTimeout(unlock); unlock = null; }
      if(pos === N){
        rail.classList.remove('mv');
        pos = 0;
        rail.style.transform = 'translate3d(0,0,0)';
      }
      locked = false;
    }
    rail.addEventListener('transitionend', function(e){
      if(e.propertyName === 'transform') release();
    });

    function go(d){
      if(locked) return;
      if(charbox) charbox.classList.toggle('bk', d < 0);
      if(d < 0 && pos === 0){                   /* 先頭で「前へ」＝複製へ飛んでから左へ戻す */
        rail.classList.remove('mv');
        pos = N;
        rail.style.transform = 'translate3d(' + (-100 * N) + '%,0,0)';
        void rail.offsetWidth;                  /* ここで一度描かせないと、1回の動きにまとめられる */
      }
      pos += d;
      if(reduce){ if(pos === N) pos = 0; if(pos < 0) pos = N - 1; paint(false); return; }
      paint(true);
      locked = true;
      unlock = setTimeout(release, MOVE + 160); /* transitionend が来ない時の保険 */
    }
    function jump(j){
      if(locked || j === pos % N) return;
      if(charbox) charbox.classList.toggle('bk', j < (pos % N));
      pos = j;
      if(reduce){ paint(false); return; }
      paint(true);
      locked = true;
      unlock = setTimeout(release, MOVE + 160);
    }

    /* ── 自動でめくる ── */
    function play(){
      if(timer || reduce || paused || !inView || document.hidden) return;
      timer = setInterval(function(){ go(1); }, HOLD);
    }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    function hold(){ paused = true; stop(); if(back){ clearTimeout(back); back = null; } }
    function later(){ if(back) clearTimeout(back);
      back = setTimeout(function(){ paused = false; play(); }, WAIT); }

    /* ── 矢印と点（JSが動いたときだけ作る＝押せないボタンを見せない）── */
    function arrow(cls, label, d){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'arw ' + cls;
      b.innerHTML = '<span class="sr">' + label + '</span>';
      b.addEventListener('click', function(e){ e.stopPropagation(); hold(); go(d); later(); });
      deck.appendChild(b);
    }
    arrow('p', '前の画面へ', -1);
    arrow('n', '次の画面へ', 1);

    var dbox = document.createElement('div');
    dbox.className = 'dots';
    var dots = sl.map(function(s, j){
      var nm = s.querySelector('.cap b');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (j + 1) + '枚目' + (nm ? '　' + nm.textContent : ''));
      b.addEventListener('click', function(){ hold(); jump(j); later(); });
      dbox.appendChild(b);
      return b;
    });
    frame.parentNode.appendChild(dbox);

    /* ── 指とマウス（タップ＝次へ／横に払う＝その向きへ）── */
    var x0 = 0, y0 = 0, dx = 0, t0 = 0, dragging = false, dir = 0;
    deck.addEventListener('pointerdown', function(e){
      if(e.button || locked) return;
      if(e.target.closest && e.target.closest('.arw')) return;
      dragging = true; dir = 0; dx = 0;
      x0 = e.clientX; y0 = e.clientY; t0 = new Date().getTime();
      rail.classList.remove('mv');
      if(deck.setPointerCapture) try{ deck.setPointerCapture(e.pointerId); }catch(err){}
      hold();
    });
    deck.addEventListener('pointermove', function(e){
      if(!dragging) return;
      var mx = e.clientX - x0, my = e.clientY - y0;
      if(!dir){
        if(Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        dir = Math.abs(mx) > Math.abs(my) ? 1 : -1;
        if(dir < 0){ dragging = false; paint(true); later(); return; }  /* たて＝ページのスクロール */
        deck.classList.add('drag');
      }
      dx = mx;
      at(dx);
    });
    function up(){
      if(!dragging) return;
      dragging = false;
      deck.classList.remove('drag');
      var w = deck.clientWidth || 1, quick = (new Date().getTime() - t0) < 300;
      if(dir > 0 && Math.abs(dx) > (quick ? 34 : w * 0.16)) go(dx < 0 ? 1 : -1);
      else if(!dir && Math.abs(dx) < 6) go(1);            /* ＝タップ */
      else paint(true);                                    /* 半端に払ったら元に戻す */
      dx = 0; dir = 0;
      later();
    }
    deck.addEventListener('pointerup', up);
    deck.addEventListener('pointercancel', up);
    deck.addEventListener('dragstart', function(e){ e.preventDefault(); });

    /* マウスを乗せている間・中のボタンを選んでいる間は止める（読ませたいので） */
    deck.addEventListener('mouseenter', hold);
    deck.addEventListener('mouseleave', later);
    dbox.addEventListener('mouseenter', hold);
    dbox.addEventListener('mouseleave', later);
    frame.addEventListener('focusin', hold);
    frame.addEventListener('focusout', later);

    /* 見えているか（IntersectionObserver が返らない環境でも動くように自前でも見る） */
    function seen(){
      var r = deck.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || 0);
    }
    inView = seen();
    function sync(){ (inView && !document.hidden && !paused) ? play() : stop(); }
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        inView = es[es.length - 1].isIntersecting; sync();
      }, {threshold:0}).observe(deck);
    }
    window.addEventListener('scroll', function(){ inView = seen(); sync(); }, {passive:true});
    document.addEventListener('visibilitychange', sync);

    paint(false);
    sync();
  })();

  /* ── 数字パネル（2026-08-29）──────────────────────────
     ・数字を押すと内訳が浮かび上がる。開くのは1枚だけ。外を押す／Escで閉じる
     ・<b class="num"> をJSでボタンに格上げする＝JSが落ちている端末では
       「押せないボタン」を見せずに、内訳をそのまま出したままにできる
     ・画面に入ったら 0 から数え上げる（動きを減らす設定の人には出さない） */
  (function(){
    var box = document.querySelector('.stats');
    if(!box) return;
    var stats = [].slice.call(box.querySelectorAll('.stat'));
    if(!stats.length) return;

    /* ---- 押して開く ---- */
    function shutAll(except){
      stats.forEach(function(st){
        if(st === except) return;
        if(!st.classList.contains('open')) return;
        st.classList.remove('open');
        var b = st.querySelector('.num');
        if(b) b.setAttribute('aria-expanded','false');
      });
    }
    stats.forEach(function(st, i){
      var num = st.querySelector('.num'), d = st.querySelector('.d');
      if(!num || !d) return;
      if(!d.id) d.id = 'statd' + (i + 1);
      num.setAttribute('role','button');
      num.setAttribute('tabindex','0');
      num.setAttribute('aria-expanded','false');
      num.setAttribute('aria-controls', d.id);
      var lb = st.querySelector('.lb');
      num.setAttribute('aria-label', (lb ? lb.textContent + '　' : '') +
        num.textContent.trim() + '　くわしい内訳を開く');
      function toggle(e){
        e.preventDefault(); e.stopPropagation();
        var on = !st.classList.contains('open');
        shutAll(st);
        st.classList.toggle('open', on);
        num.setAttribute('aria-expanded', on ? 'true' : 'false');
      }
      num.addEventListener('click', toggle);
      num.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') toggle(e);
      });
    });
    document.addEventListener('click', function(e){
      if(!e.target.closest || !e.target.closest('.stat')) shutAll(null);
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') shutAll(null); });

    /* ---- 0から数え上げる ---- */
    function count(st){
      var v = st.querySelector('.num .v');
      var to = parseFloat(st.getAttribute('data-num'));
      var dec = parseInt(st.getAttribute('data-dec') || '0', 10);
      if(!v || isNaN(to)) return;
      if(reduce || !window.requestAnimationFrame){ v.textContent = to.toFixed(dec); return; }
      st.classList.add('count');
      var DUR = 1150, t0 = null;
      var delay = parseFloat(st.style.getPropertyValue('--sd')) * 1000 || 0;
      v.textContent = (0).toFixed(dec);
      setTimeout(function(){
        (function step(t){
          if(t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / DUR);
          var e = 1 - Math.pow(1 - k, 3);              /* 最後にゆっくり止まる */
          v.textContent = (to * e).toFixed(dec);
          if(k < 1) requestAnimationFrame(step);
          else { v.textContent = to.toFixed(dec); st.classList.remove('count'); }
        })(performance && performance.now ? performance.now() : new Date().getTime());
      }, delay);
    }

    stats.forEach(function(st, i){ st.style.setProperty('--sd', (i * 0.11) + 's'); });
    function run(){ stats.forEach(function(st){ st.classList.add('seen'); count(st); }); }
    if(!('IntersectionObserver' in window)){ run(); return; }
    var sio = new IntersectionObserver(function(es){
      if(!es.some(function(e){ return e.isIntersecting; })) return;
      sio.disconnect(); run();
    }, {threshold:.3});
    sio.observe(box);
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
