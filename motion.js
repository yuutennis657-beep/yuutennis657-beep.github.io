/* 画面に入った要素を、ふわっと出すための処理。
   ・見た目だけの追加。文章も並びも変えない。
   ・「動きを減らす」設定（prefers-reduced-motion）のときは、何もしない。
   ・CSSは .rv が付いた要素にしか効かないので、このJSが動かないときも普通に見える。 */
(function () {
  if (!window.IntersectionObserver || !document.querySelectorAll) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  var obs = new IntersectionObserver(function (entries) {
    each(entries, function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });

  /* 画面に入っているのに、まだ出ていないものを念のため出す（タブ切りかえの直後など） */
  function rescue(root) {
    each((root || document).querySelectorAll('.rv'), function (el) {
      if (el.classList.contains('in')) return;
      var b = el.getBoundingClientRect();
      /* 高さ0でも助ける。写真がまだ読みこめていないときに消えたままにしない（2026-08-29） */
      if (b.top < window.innerHeight * 0.98 && b.bottom >= 0) {
        el.classList.add('in');
        obs.unobserve(el);
      }
    });
  }

  function mark(el, mode, d) {
    if (!el || el.nodeType !== 1) return;
    if (el.classList.contains('rv') || el.classList.contains('st')) return;
    if (el.closest('.hero')) return;                 /* ヒーローは既存の .st にまかせる */
    if (el.parentElement && el.parentElement.closest('.rv')) return;  /* 入れ子にはしない */
    el.classList.add('rv');
    if (mode) el.classList.add('rv-' + mode);
    if (d) el.style.setProperty('--d', d);
    obs.observe(el);
  }

  /* ① 並んでいるもの＝カード・年表・写真は、少しずつ時間をずらして出す */
  var ITEMS = ['.kata article', '.work', '.now div', '.offer article',
               '.proof figure', '.pcard', '.pbio .bio',
               '.pfacts li', '.axl li', '.prof-figs figure', '.career li', '.dumb-rows li'];
  var X  = { '.career li': 1 };                                    /* 横から入る */
  var PH = { '.work': 1, '.proof figure': 1, '.pcard': 1, '.prof-figs figure': 1 };  /* 写真は少し寄って戻る */

  each(ITEMS, function (sel) {
    var parents = [], counts = [];
    each(document.querySelectorAll(sel), function (el) {
      var p = el.parentNode, k = parents.indexOf(p);
      if (k < 0) { parents.push(p); counts.push(0); k = parents.length - 1; }
      var d = counts[k]++;
      if (d > 7) d = 7;
      mark(el, X[sel] ? 'x' : (PH[sel] ? 'ph' : ''), d);
    });
  });

  /* ② 節の中の大きなかたまり（見出し・図・引用など）は、そのまま1つずつ */
  each(document.querySelectorAll('section > .wrap'), function (w) {
    each(w.children, function (el) {
      if (el.querySelector('.rv')) return;   /* 中にもう動くものがあるなら、外側は動かさない */
      mark(el, '', 0);
    });
  });

  /* ③ タブを切りかえたとき、開いたパネルを軽くフェードさせる */
  var panels = document.querySelectorAll('.panel');
  function flash() {
    setTimeout(function () {
      each(panels, function (p) {
        if (p.hidden) return;
        p.classList.remove('pin');
        void p.offsetWidth;            /* いったんリセットして、もう一度動かす */
        p.classList.add('pin');
        rescue(p);
      });
    }, 0);
  }
  each(document.querySelectorAll('.tab'), function (t) {
    t.addEventListener('click', flash);
    t.addEventListener('keydown', function (e) {
      if (e.key && e.key.indexOf('Arrow') === 0) flash();
    });
  });

  setTimeout(function () { rescue(document); }, 1200);

  /* 背面のタブで開かれたときの保険。
     Chrome は見えていないタブで IntersectionObserver も rAF も止めるので、
     そのままだと「戻ってきたら何も出ていない」ことが起きる。表に出たら拾い直す。 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    setTimeout(function () { rescue(document); }, 60);
  });

  /* ④ ヒーローの数字を 0 から数え上げる（単位の小さい字はそのまま） */
  each(document.querySelectorAll('.hero .stat b.num'), function (b) {
    var tn = b.firstChild;
    if (!tn || tn.nodeType !== 3) return;
    var goal = parseInt(tn.nodeValue, 10);
    if (!(goal > 0)) return;
    var dur = 1100, t0 = null;
    tn.nodeValue = '0';
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      tn.nodeValue = String(Math.round(goal * (p < 1 ? 1 - Math.pow(2, -10 * p) : 1)));
      if (p < 1) requestAnimationFrame(step);
    }
    setTimeout(function () { requestAnimationFrame(step); }, 1120);  /* 数字パネルが出てくるのに合わせる */
  });
})();

/* ================================================================
   大胆モーション v2（2026-08-27）── 上の処理に足す「演出」の層
   ① 読み進みバー ② 写真のパララックス＋ホバーの寄り ③ 実践の数字が前回→今回へ動く
   ・「動きを減らす」設定のときは、ここも丸ごと動かない
   ・CSS側は style.css の「大胆モーション v2」ブロック
   ================================================================ */
(function () {
  if (!window.requestAnimationFrame || !document.querySelector) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  /* ---------- ① 読み進みバー ---------- */
  var prog = document.createElement('div');
  prog.className = 'prog';
  prog.setAttribute('aria-hidden', 'true');
  document.body.appendChild(prog);

  /* ---------- ② 写真のパララックス ---------- */
  /* 枠の中で写真だけがゆっくり流れる。はみ出さないよう、動く幅ぶんだけ拡大しておく */
  var items = [];
  each(document.querySelectorAll('.work .thumb img, .proof .ph img, .prof-figs .ph img, .prof-ph .ph img, .band .ph img'),
    function (img) {
      var box = img.parentElement;
      if (!box) return;
      var host = img.closest('.work') || img.closest('figure') || box;
      var it = { img: img, box: box, amp: 8, base: 1.1, hov: 0, want: 0 };
      items.push(it);
      host.addEventListener('mouseenter', function () { it.want = 1; kick(); });
      host.addEventListener('mouseleave', function () { it.want = 0; kick(); });
    });

  function measure() {
    each(items, function (it) {
      var h = it.box.getBoundingClientRect().height || 1;
      it.amp = Math.min(18, h * 0.055);   /* 写真を切る量を抑える（拡大は 1.1 倍前後） */
      it.base = 1 + (2 * it.amp) / h + 0.004;   /* 上下に動かしても地が出ない大きさ */
    });
  }

  var running = false, lastY = -1, vh = window.innerHeight || 800;

  function frame() {
    running = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var moving = (y !== lastY);
    lastY = y;
    var busy = false;

    var max = (document.documentElement.scrollHeight || 0) - vh;
    prog.style.transform = 'scaleX(' + (max > 4 ? Math.min(1, Math.max(0, y / max)) : 0) + ')';

    each(items, function (it) {
      var r = it.box.getBoundingClientRect();
      if (r.bottom < -120 || r.top > vh + 120 || !r.height) return;   /* 画面の外はさわらない */
      if (Math.abs(it.hov - it.want) > 0.004) { it.hov += (it.want - it.hov) * 0.14; busy = true; }
      else it.hov = it.want;
      var mid = r.top + r.height / 2;
      var p = (mid - vh / 2) / (vh / 2 + r.height / 2);            /* -1〜1 */
      p = p > 1 ? 1 : (p < -1 ? -1 : p);
      it.img.style.transform = 'translate3d(0,' + (-p * it.amp).toFixed(2) + 'px,0) scale('
        + (it.base + it.hov * 0.055).toFixed(4) + ')';
    });

    if (moving || busy) kick();
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  measure(); kick();
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { vh = window.innerHeight || vh; measure(); kick(); });
  addEventListener('load', function () { measure(); kick(); });
  each(document.querySelectorAll('.tab'), function (t) {
    t.addEventListener('click', function () { setTimeout(function () { measure(); kick(); }, 60); });
  });

  /* ---------- ③ 実践の数字は「前回の点数から」動かす ---------- */
  /* 75.4 → 82.4 なら、82.4 のほうが 75.4 から動いて着地する。0からではないので、
     どれだけ上がったのかが体で分かる。前回の数字はさわらない。 */
  function digits(s) { var m = String(s).match(/\.(\d+)/); return m ? m[1].length : 0; }

  function run(node, from, to, dec, dur) {
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = p < 1 ? 1 - Math.pow(2, -10 * p) : 1;
      node.nodeValue = (from + (to - from) * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (window.IntersectionObserver) {
    var fobs = new IntersectionObserver(function (es) {
      each(es, function (e) {
        if (!e.isIntersecting) return;
        fobs.unobserve(e.target);
        var nums = [];
        each(e.target.childNodes, function (n) {
          if (n.nodeType === 3 && /\d/.test(n.nodeValue)) nums.push(n);
        });
        if (!nums.length) return;
        var last = nums[nums.length - 1];
        var to = parseFloat(last.nodeValue);
        if (isNaN(to)) return;
        var from = (nums.length > 1) ? parseFloat(nums[0].nodeValue) : 0;
        if (isNaN(from)) from = 0;
        var dec = digits(last.nodeValue);
        last.nodeValue = from.toFixed(dec);
        setTimeout(function () { run(last, from, to, dec, 1100); }, 260);
      });
    }, { threshold: 0.4 });
    each(document.querySelectorAll('.figs .fig b.num'), function (b) { fobs.observe(b); });
  }
})();
