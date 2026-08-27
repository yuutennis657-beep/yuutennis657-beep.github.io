/* 日本語の改行を語の途中で切らないための保険。
   Chrome/Edge は CSS の word-break:auto-phrase で足りるが、
   Safari など未対応のブラウザ用に、カタカナのかたまりと「数字＋単位」を
   途中で切れないようにする。表示だけの処理で、文章そのものは変えない。 */
(function () {
  if (!document.body) return;
  var RE = /([ァ-ヶ][ァ-ヶー]{2,9}|[0-9０-９][0-9０-９,，.．]{0,9}\s?[A-Za-zぁ-んァ-ヶ一-龥%％]{1,3})/g;
  var SKIP = { SCRIPT:1, STYLE:1, TEXTAREA:1, CODE:1, PRE:1, NOSCRIPT:1, BUTTON:1 };
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  var targets = [], n;
  while ((n = walker.nextNode())) {
    var p = n.parentElement;
    if (!p || SKIP[p.tagName] || p.closest('svg')) continue;
    RE.lastIndex = 0;
    if (RE.test(n.nodeValue)) targets.push(n);
  }
  targets.forEach(function (node) {
    var t = node.nodeValue, frag = document.createDocumentFragment(), last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      var s = document.createElement('span');
      s.style.whiteSpace = 'nowrap';
      s.textContent = m[0];
      frag.appendChild(s);
      last = m.index + m[0].length;
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    node.parentNode.replaceChild(frag, node);
  });
})();
