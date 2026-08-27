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
      if (b.top < window.innerHeight * 0.98 && b.bottom > 0 && b.height) {
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
               '.proof figure', '.prof-ph', '.prof .nmbig', '.prof .bio',
               '.facts div', '.prof-figs figure', '.career li', '.dumb-rows li'];
  var X  = { '.career li': 1 };                                    /* 横から入る */
  var PH = { '.work': 1, '.proof figure': 1, '.prof-ph': 1, '.prof-figs figure': 1 };  /* 写真は少し寄って戻る */

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

  /* ④ ヒーローの数字を 0 から数え上げる（単位の小さい字はそのまま） */
  each(document.querySelectorAll('.hero .stat b.num'), function (b) {
    var tn = b.firstChild;
    if (!tn || tn.nodeType !== 3) return;
    var goal = parseInt(tn.nodeValue, 10);
    if (!(goal > 0)) return;
    var dur = 900, t0 = null;
    tn.nodeValue = '0';
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      tn.nodeValue = String(Math.round(goal * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    setTimeout(function () { requestAnimationFrame(step); }, 380);
  });
})();
