/*
 * 网站可视化编辑器
 * - 从 GitHub 仓库读取 index.html，放进 iframe 里点哪改哪
 * - 发布时把 index.html 和新上传的文件合成一次提交（Git Data API）
 * - token 只存在当前浏览器（localStorage / sessionStorage），只发给 api.github.com
 */
(function () {
  'use strict';

  var CFG = {
    repo: 'H-X1n/H-X1n.github.io',
    path: 'index.html',
    api: 'https://api.github.com',
    tokenKey: 'hx-editor-token',
    maxImage: 20 * 1024 * 1024,
    maxFile: 50 * 1024 * 1024
  };
  var LOCALHOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // 本地联调时可以把 API 指到模拟服务（只在 localhost 下生效）
  if (LOCALHOST && localStorage.getItem('hx-editor-api')) {
    CFG.api = localStorage.getItem('hx-editor-api');
  }

  // 只含这些行内标签的元素，才允许直接在页面上改文字
  var INLINE = /^(A|STRONG|B|EM|I|SPAN|BR|WBR|SMALL|CODE|SUP|SUB|MARK|U|S|ABBR|TIME)$/;
  var MULTILINE = /^(P|LI|DD|BLOCKQUOTE)$/;
  // 可以复制 / 移动 / 删除的“区块”
  var BLOCK_SEL = 'li, article, details, .facts > div, a.btn';
  var DUP_MARQUEE = '.marquee-list[aria-hidden="true"]';
  // 卡片颜色：带 c-* 配色类的元素改 --c / --c2 / --c3；这些纸面卡片改背景色；板块改 --accent
  var BG_SEL = '.doc-head, .stamp, .doc, .acc-item, .intern-head, .intern, .comp, .mega';
  var PALETTE = [['黄', 'var(--yellow)', '#FFD23F'], ['粉', 'var(--pink)', '#FF7AB6'], ['蓝', 'var(--blue)', '#5B8CFF'],
    ['绿', 'var(--green)', '#4ADE80'], ['橙', 'var(--orange)', '#FF8A3D'], ['白', 'var(--paper)', '#FFFFFF'], ['米', 'var(--bg)', '#FFF6E5']];
  var TEXT_COLORS = [['黑', 'var(--ink)', '#0A0A0A'], ['白', '#FFFFFF', '#FFFFFF'], ['红', '#E5484D', '#E5484D'], ['蓝', '#2F5BEA', '#2F5BEA'],
    ['粉', '#D6337A', '#D6337A'], ['橙', '#E5641A', '#E5641A'], ['绿', '#15803D', '#15803D'], ['灰', '#6B6B6B', '#6B6B6B']];
  // 整段字号用 zoom 等比放大，不会破坏原有的响应式字号；选中局部文字时用相对父级的 em
  var ZOOMS = [0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
  // 文字高亮沿用站点标题里「经历」那种 .hl 荧光笔底色，颜色写在 --hl 上
  var HL_COLORS = [['黄', 'var(--yellow)', '#FFD23F'], ['粉', 'var(--pink)', '#FF7AB6'], ['蓝', 'var(--blue)', '#5B8CFF'],
    ['绿', 'var(--green)', '#4ADE80'], ['橙', 'var(--orange)', '#FF8A3D'], ['白', 'var(--paper)', '#FFFFFF']];
  var BOOL_ATTRS = /\s(open|download|hidden|defer|async|disabled|checked|selected|required|multiple|readonly|autofocus|novalidate|reversed|controls|loop|muted|playsinline)=""/g;
  var SVG_EMPTY = /<(path|use|circle|rect|line|polyline|polygon|ellipse|stop)(\s[^<>]*)?><\/\1>/g;
  var NAMES = {
    H1: '大标题', H2: '标题', H3: '小标题', H4: '小标题', P: '段落', LI: '列表项', DT: '标签', DD: '说明',
    A: '链接', IMG: '图片', SUMMARY: '折叠标题', ARTICLE: '卡片', DETAILS: '折叠块', DIV: '区块',
    SPAN: '文字', B: '文字', SMALL: '文字', STRONG: '加粗文字', FIGCAPTION: '图片说明', SECTION: '板块', UL: '列表'
  };
  // 注入 iframe 的编辑态样式，发布时会删掉
  var EDIT_CSS = [
    '.marquee-track,.spin-ring,.dot,.mega-arrow{animation-play-state:paused!important}',
    '.sticker:hover,.medal:hover{animation:none!important}',
    '.proj:hover,.skill:hover,.stat:hover,.ccard:hover,.btn:hover,.nav a:hover{transform:none!important}',
    '[data-hx-hover]{outline:2px dashed #5B8CFF!important;outline-offset:2px!important;cursor:text}',
    'img[data-hx-hover],a[data-hx-hover]{cursor:pointer}',
    '[data-hx-sel]{outline:3px solid #FF7AB6!important;outline-offset:5px!important}',
    '[contenteditable="true"]{outline:3px solid #0A0A0A!important;outline-offset:3px!important;background-color:rgba(255,210,63,.45)!important;cursor:text}',
    DUP_MARQUEE + '{opacity:.35}',
    'summary{cursor:text}'
  ].join('\n');

  var $ = function (s) { return document.querySelector(s); };
  var ui = {
    status: $('#status'), stage: $('#stage'), frame: $('#site'), file: $('#file-input'), toast: $('#toast'),
    undo: $('#btn-undo'), reload: $('#btn-reload'), exportBtn: $('#btn-export'), account: $('#btn-account'), publish: $('#btn-publish'),
    panel: $('#panel'), panelTitle: $('#panel-title'), panelBody: $('#panel-body'), panelClose: $('#panel-close'),
    login: $('#login'), loginTitle: $('#login-title'), token: $('#token-input'), remember: $('#token-remember'),
    loginErr: $('#login-error'), loginOk: $('#login-ok'), loginSkip: $('#login-skip'), logout: $('#login-logout'),
    pub: $('#pub'), pubList: $('#pub-list'), pubMsg: $('#pub-msg'), pubErr: $('#pub-error'), pubOk: $('#pub-ok'),
    pubCancel: $('#pub-cancel'), pubBranch: $('#pub-branch')
  };
  var cropUI = {
    el: $('#crop'), img: $('#crop-img'), box: $('#crop-box'), info: $('#crop-info'),
    ok: $('#crop-ok'), skip: $('#crop-skip'), cancel: $('#crop-cancel'), ratios: document.querySelectorAll('#crop [data-ratio]')
  };

  var S = {
    token: localStorage.getItem(CFG.tokenKey) || sessionStorage.getItem(CFG.tokenKey) || '',
    user: '', branch: 'master',
    fromRepo: false, loadedSha: null, scripts: [],
    doc: null, editing: null, editBefore: '', editSnap: '',
    sel: null, target: null, block: null, hover: null,
    undo: [], uploads: {}, dirty: false, busy: false
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg, isHtml) {
    if (isHtml) ui.toast.innerHTML = msg; else ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { ui.toast.classList.remove('show'); }, isHtml ? 12000 : 5000);
  }
  function setStatus(text, kind) { ui.status.textContent = text; ui.status.className = 'status' + (kind ? ' ' + kind : ''); }
  function idleStatus() {
    if (S.dirty) setStatus('有未发布的修改', 'warn');
    else if (S.fromRepo && S.user) setStatus('已连接 ' + S.user + ' · ' + S.branch, 'ok');
    else setStatus(S.user ? '已登录 · 当前显示的是线上网页' : '未登录 · 只能预览和导出', 'warn');
  }
  function setDirty(d) { S.dirty = d; ui.publish.disabled = !d || !S.doc || S.busy; idleStatus(); }
  function setBusy(b) { S.busy = b; document.body.classList.toggle('busy', b); ui.publish.disabled = b || !S.dirty; ui.reload.disabled = b; }
  function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  function bytesToB64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function textToB64(text) { return bytesToB64(new TextEncoder().encode(text)); }
  function b64ToText(b64) {
    var bin = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- GitHub API ---------- */
  function gh(method, path, body) {
    var headers = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + S.token, 'X-GitHub-Api-Version': '2022-11-28' };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(CFG.api + path, { method: method, cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) {
        return res.text().then(function (t) {
          var data = null;
          try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
          if (!res.ok) { var err = new Error(apiMessage(res.status, data)); err.status = res.status; throw err; }
          return data;
        });
      }, function () { throw new Error('网络错误：连不上 GitHub，请检查网络后重试。'); });
  }
  function apiMessage(status, data) {
    var raw = data && data.message ? String(data.message) : '';
    if (status === 401) return 'token 无效或已过期，请重新登录。';
    if (status === 403) return /rate limit/i.test(raw) ? 'GitHub API 调用次数超限，请稍后再试。' : 'token 权限不足：需要 H-X1n.github.io 仓库的 Contents「Read and write」权限。';
    if (status === 404) return '找不到仓库或文件：请确认 token 已授权 H-X1n.github.io。';
    if (status === 409 || (status === 422 && /fast.?forward/i.test(raw))) return '仓库在你编辑期间有新的提交。请先「导出 HTML」备份，再重新加载后修改。';
    return 'GitHub 返回错误 ' + status + (raw ? '：' + raw : '');
  }
  function connect(token) {
    S.token = token;
    return gh('GET', '/user').then(function (u) {
      S.user = u.login;
      return gh('GET', '/repos/' + CFG.repo);
    }).then(function (repo) {
      S.branch = repo.default_branch || 'master';
      ui.account.textContent = S.user;
    }, function (err) { S.user = ''; throw err; });
  }

  /* ---------- 载入页面 ---------- */
  function load(skipConfirm) {
    if (S.dirty && !skipConfirm && !confirm('有未发布的修改，重新加载会丢失。确定继续吗？')) return Promise.resolve();
    setStatus('正在加载…');
    var job, base = '/repos/' + CFG.repo;
    if (S.user) {
      job = gh('GET', base + '/git/ref/heads/' + S.branch).then(function (ref) {
        return gh('GET', base + '/contents/' + encPath(CFG.path) + '?ref=' + ref.object.sha);
      }).then(function (file) {
        S.fromRepo = true; S.loadedSha = file.sha;
        return b64ToText(file.content);
      });
    } else {
      job = fetch('/' + CFG.path, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('读取网页失败（' + r.status + '）');
        S.fromRepo = false; S.loadedSha = null;
        return r.text();
      });
    }
    return job.then(render).catch(function (err) { setStatus('加载失败', 'err'); toast(err.message); throw err; });
  }

  /* ---------- 渲染与序列化 ---------- */
  // 页面脚本换成空占位，编辑时不运行；发布时原样放回
  function render(html) {
    S.source = html;
    S.scripts = [];
    var m = /^\s*(<!doctype[^>]*>)/i.exec(html);
    S.doctype = m ? m[1] : '<!DOCTYPE html>';
    var safe = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, function (s) {
      S.scripts.push(s);
      return '<template data-hx-script="' + (S.scripts.length - 1) + '"></template>';
    }).replace(/<head(\s[^>]*)?>/i, function (h) { return h + '<base href="/" data-hx-ui>'; });
    clearSel();
    S.editing = null;
    return new Promise(function (resolve) {
      ui.frame.onload = function () { ui.frame.onload = null; setup(); resolve(); };
      ui.frame.srcdoc = safe;
    });
  }

  function setup() {
    var d = S.doc = ui.frame.contentDocument;
    var st = d.createElement('style');
    st.setAttribute('data-hx-ui', '');
    st.textContent = EDIT_CSS;
    d.head.appendChild(st);
    // 记下折叠块原来的开合状态（发布时恢复），编辑时全部展开
    d.querySelectorAll('details').forEach(function (x) { x.setAttribute('data-hx-open', x.open ? '1' : '0'); x.open = true; });
    S.baseline = serialize();
    if (S.baseline !== S.source) console.warn('[editor] 未修改时的序列化结果与源码不同，发布时会带上格式差异');
    S.undo = [];
    S.uploads = {};
    ui.undo.disabled = true;
    bindFrame(d);
    setDirty(false);
  }

  function serialize() {
    var root = S.doc.documentElement.cloneNode(true);
    root.querySelectorAll('[data-hx-ui]').forEach(function (n) { n.remove(); });
    root.querySelectorAll('[data-hx-src]').forEach(function (n) {
      n.setAttribute('src', n.getAttribute('data-hx-src'));
      n.removeAttribute('data-hx-src');
    });
    root.querySelectorAll('details[data-hx-open]').forEach(function (n) {
      if (n.getAttribute('data-hx-open') === '1') n.setAttribute('open', ''); else n.removeAttribute('open');
    });
    ['contenteditable', 'data-hx-open', 'data-hx-hover', 'data-hx-sel', 'data-hx-keep'].forEach(function (a) {
      root.querySelectorAll('[' + a + ']').forEach(function (n) { n.removeAttribute(a); });
    });
    // 跑马灯第二组是第一组的无障碍隐藏副本，保持同步
    root.querySelectorAll('.marquee-track').forEach(function (t) {
      var lists = t.querySelectorAll('.marquee-list');
      for (var i = 1; i < lists.length; i++) if (lists[i].getAttribute('aria-hidden') === 'true') lists[i].innerHTML = lists[0].innerHTML;
    });
    var html = root.outerHTML
      .replace(/<template data-hx-script="(\d+)"><\/template>/g, function (_, i) { return S.scripts[+i]; })
      .replace(BOOL_ATTRS, ' $1')
      .replace(SVG_EMPTY, '<$1$2/>')
      .replace(/^(<html[^>]*>)\s*<head>/, '$1\n<head>')
      .replace(/\s*<\/body>\s*<\/html>\s*$/, '\n</body>\n</html>\n');
    return S.doctype + '\n' + html;
  }

  /* ---------- 文字编辑 ---------- */
  function isTextBlock(el) {
    if (!el || el.nodeType !== 1 || !el.textContent.trim()) return false;
    if (el.closest('svg, script, style, [data-hx-ui], [data-blog="list"], ' + DUP_MARQUEE)) return false;
    var all = el.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) if (!INLINE.test(all[i].tagName)) return false;
    return true;
  }
  // 从点击位置往上找到第一个非行内元素，只要它里面全是文字就能直接编辑
  function pickEditable(node) {
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    var win = S.doc.defaultView;
    while (el && el.parentElement && el !== S.doc.body) {
      var d = win.getComputedStyle(el).display;
      if (d !== 'inline' && d !== 'contents') break;
      el = el.parentElement;
    }
    return el && el !== S.doc.body && isTextBlock(el) ? el : null;
  }
  function startEditing(el) {
    if (S.editing === el) return;
    finishEditing();
    S.editSnap = S.doc.body.innerHTML;
    S.editBefore = el.innerHTML;
    S.editNodes = new Map();
    [el].concat(Array.prototype.slice.call(el.querySelectorAll('*'))).forEach(function (n) { S.editNodes.set(n, n.getAttribute('style')); });
    el.setAttribute('contenteditable', 'true');
    S.editing = el;
  }
  // 浏览器编辑时会自动插入带 style 的 span / font、&nbsp; 等，结束编辑时清掉，只保留原有标签和换行
  function tidy(el) {
    Array.prototype.slice.call(el.querySelectorAll('*')).reverse().forEach(function (n) {
      if (n.hasAttribute('data-hx-keep')) { n.removeAttribute('data-hx-keep'); return; }  // 编辑器自己加的文字样式
      if (S.editNodes.has(n)) return;
      if (n.tagName === 'BR') { if (MULTILINE.test(el.tagName)) n.removeAttribute('style'); else n.remove(); return; }
      while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
      n.remove();
    });
    S.editNodes.forEach(function (style, n) {
      if (!n.isConnected || n.getAttribute('style') === style) return;
      if (style === null) n.removeAttribute('style'); else n.setAttribute('style', style);
    });
    if (S.editBefore.indexOf('&nbsp;') < 0) {
      var w = S.doc.createTreeWalker(el, 4), t;
      while ((t = w.nextNode())) if (t.data.indexOf('\u00a0') >= 0) t.data = t.data.replace(/\u00a0/g, ' ');
    }
    // 去掉没有文字的高亮；外层高亮只包着另一层高亮时只留里层（看到的就是里层的颜色）
    Array.prototype.slice.call(el.querySelectorAll('span.hl')).reverse().forEach(function (n) {
      if (!n.textContent.trim()) unwrap(n);
      else if (n.childNodes.length === 1 && n.firstChild.nodeType === 1 && n.firstChild.matches('span.hl')) unwrap(n);
    });
    while (el.lastChild && el.lastChild.nodeName === 'BR') el.lastChild.remove();
    if (!el.textContent.trim()) el.innerHTML = '';
  }
  function finishEditing() {
    var el = S.editing;
    if (!el) return;
    S.editing = null;
    el.removeAttribute('contenteditable');
    tidy(el);
    if (el.innerHTML !== S.editBefore) { pushUndo(S.editSnap); refreshDirty(); }
  }
  function focusAll(el, toEnd) {
    el.focus();
    var r = S.doc.createRange(), s = S.doc.getSelection();
    r.selectNodeContents(el);
    if (toEnd) r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  }
  function pushUndo(snap) {
    S.undo.push({ html: snap == null ? S.doc.body.innerHTML : snap, uploads: Object.assign({}, S.uploads) });
    if (S.undo.length > 80) S.undo.shift();
    ui.undo.disabled = false;
  }
  function undo() {
    if (!S.doc || !S.undo.length) return;
    finishEditing();
    var step = S.undo.pop();
    S.doc.body.innerHTML = step.html;
    S.uploads = step.uploads;
    S.doc.querySelectorAll('[contenteditable],[data-hx-sel],[data-hx-hover]').forEach(clearMarks);
    clearSel();
    ui.undo.disabled = !S.undo.length;
    refreshDirty();
  }
  function clearMarks(n) { n.removeAttribute('contenteditable'); n.removeAttribute('data-hx-sel'); n.removeAttribute('data-hx-hover'); }
  // 和刚载入时逐字比较，改回原样就不算有修改
  function refreshDirty() { setDirty(Object.keys(S.uploads).length > 0 || serialize() !== S.baseline); }

  /* ---------- iframe 里的事件 ---------- */
  function bindFrame(d) {
    d.addEventListener('pointerdown', onPointerDown, true);
    d.addEventListener('click', onClick, true);
    d.addEventListener('keydown', onKeyDown, true);
    d.addEventListener('paste', onPaste, true);
    d.addEventListener('input', function () { setDirty(true); }, true);
    // 不允许加粗、斜体等格式命令，也不允许拖拽插入内容
    d.addEventListener('beforeinput', function (e) {
      if (/^format|^insertFromDrop$|^insertParagraph$/.test(e.inputType || '')) e.preventDefault();
    }, true);
    d.addEventListener('mouseover', onHover, true);
    ['drop', 'dragstart', 'submit'].forEach(function (t) { d.addEventListener(t, function (e) { e.preventDefault(); }, true); });
  }
  function onPointerDown(e) {
    var t = e.target;
    if (S.editing && S.editing.contains(t)) {
      var before = currentLink(), hlBefore = hlAt();
      S.target = t.nodeType === 3 ? t.parentElement : t;
      if (currentLink() !== before || hlAt() !== hlBefore) renderPanel();  // 点到另一个链接 / 高亮时刷新面板
      return;
    }
    if (t.closest && t.closest(DUP_MARQUEE)) { e.preventDefault(); toast('这一组是自动生成的副本，请修改它前面那一组'); return; }
    // 博客卡片由博客编辑器根据文章列表生成，在这里改了也会在下次发布文章时被覆盖
    if (t.closest && t.closest('[data-blog="list"]')) { e.preventDefault(); finishEditing(); select(null); toast('博客卡片由「博客」编辑器自动生成，请到那里新增、修改或删除文章'); return; }
    finishEditing();
    var img = t.closest && t.closest('img');
    if (img) { e.preventDefault(); select(img); return; }
    var el = pickEditable(t);
    if (el) startEditing(el);
    select(el || t, t);
  }
  function onClick(e) {
    e.preventDefault();  // 编辑时不跳转链接、不开合折叠块
    if (S.editing && S.doc.activeElement !== S.editing) S.editing.focus();
  }
  function onKeyDown(e) {
    if (e.isComposing || e.keyCode === 229) return;  // 中文输入法选词时不拦截
    var k = (e.key || '').toLowerCase(), mod = e.metaKey || e.ctrlKey;
    if (mod && k === 's') { e.preventDefault(); openPublish(); return; }
    if (!S.editing) {
      if (mod && k === 'z') { e.preventDefault(); undo(); }
      else if (k === 'escape') select(null);
      return;
    }
    if (k === 'escape') { e.preventDefault(); finishEditing(); select(null); }
    else if (k === 'enter') {
      e.preventDefault();
      if (e.shiftKey && MULTILINE.test(S.editing.tagName)) {
        if (!S.doc.execCommand('insertLineBreak')) S.doc.execCommand('insertHTML', false, '<br>');
      } else { finishEditing(); renderPanel(); }
    }
  }
  function onPaste(e) {
    if (!S.editing) return;
    e.preventDefault();  // 只粘贴纯文本，不把别处的样式带进来
    var text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
    S.doc.execCommand('insertText', false, text.replace(/\s*[\r\n]+\s*/g, ' '));
  }
  function onHover(e) {
    var t = e.target;
    var el = t.closest ? (t.closest('img') || pickEditable(t) || t.closest('a')) : null;
    if (el && el.closest('[data-blog="list"]')) el = null;
    if (el === S.hover) return;
    if (S.hover) S.hover.removeAttribute('data-hx-hover');
    S.hover = el;
    if (el && el !== S.editing) el.setAttribute('data-hx-hover', '');
  }

  /* ---------- 选中与属性面板 ---------- */
  function select(node, target) {
    if (S.block) S.block.removeAttribute('data-hx-sel');
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    S.sel = el && S.doc && el !== S.doc.body && el !== S.doc.documentElement ? el : null;
    S.target = target ? (target.nodeType === 3 ? target.parentElement : target) : S.sel;
    S.block = S.sel ? nearestBlock(S.sel) : null;
    if (S.block) S.block.setAttribute('data-hx-sel', '');
    renderPanel();
  }
  function clearSel() {
    if (S.block) S.block.removeAttribute('data-hx-sel');
    S.sel = S.target = S.block = S.hover = null;
    closePanel();
  }
  function nearestBlock(el) {
    var b = el.closest(BLOCK_SEL);
    return b && !b.closest(DUP_MARQUEE) ? b : null;
  }
  function parentBlock(b) { return b.parentElement ? nearestBlock(b.parentElement) : null; }
  function siblings(b) {
    return Array.prototype.filter.call(b.parentElement.children, function (c) { return c.tagName === b.tagName; });
  }
  function currentLink() {
    var t = S.target && S.target.isConnected ? S.target : S.sel;
    return t && t.closest ? t.closest('a') : null;
  }
  function describe(el) { return NAMES[el.tagName] || '元素'; }
  function directTexts(el) {
    return Array.prototype.filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
  }
  function linkText(a) { return directTexts(a).map(function (n) { return n.textContent.trim(); }).join(' '); }
  function setLinkText(a, text) {
    var ns = directTexts(a);
    if (!ns.length) return;
    var t = ns[0].textContent;
    ns[0].textContent = t.match(/^\s*/)[0] + text + t.match(/\s*$/)[0];
    for (var i = 1; i < ns.length; i++) ns[i].textContent = ' ';
  }
  // 站内文件链接（如 files/简历.pdf）对应的仓库路径
  function repoPath(href) {
    if (!href || /^(#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(href)) return '';
    var p = href.split('#')[0].split('?')[0].replace(/^\.?\//, '');
    try { p = decodeURI(p); } catch (e) { /* 保持原样 */ }
    return /\.[a-z0-9]{2,5}$/i.test(p) && p !== CFG.path && p.indexOf('..') < 0 ? p : '';
  }
  function safeHref(v) {
    if (/^(https?:|mailto:|tel:)/i.test(v)) return true;
    if (/^[a-z][a-z0-9+.-]*:/i.test(v) || /^\/\//.test(v) || isLocalPath(v)) return false;
    return v.length > 0;
  }
  // 用户误把本机文件路径填进链接时识别出来（网站访问者打不开这些地址）
  function isLocalPath(v) {
    return /^file:/i.test(v) || /^[a-z]:[\\/]/i.test(v) || /^\\\\/.test(v) || /^~[\\/]/.test(v) ||
      /^\/(Users|home|private|var|tmp|Volumes|mnt|root)\//.test(v);
  }
  function closePanel() { ui.panel.hidden = true; ui.panelBody.innerHTML = ''; }

  function renderPanel() {
    if (!S.sel || !S.sel.isConnected) { closePanel(); return; }
    var el = S.sel, a = currentLink(), img = el.tagName === 'IMG' ? el : null, b = S.block, tt = textTarget(), ct = colorTarget(), h = [];
    ui.panelTitle.textContent = img ? '图片' : S.editing ? '正在编辑' + describe(el) : describe(b || el);
    if (tt) {
      var z = parseFloat(tt.style.getPropertyValue('zoom')) || 1;
      h.push('<div class="group"><h3>文字</h3>' + (S.editing
        ? '<p class="note">直接在页面上打字。Enter 完成，Esc 退出' + (MULTILINE.test(tt.tagName) ? '，Shift+Enter 换行' : '') + '。</p>'
        : '<div class="row"><button type="button" class="btn sm yellow" data-act="edit">编辑文字</button></div>') +
        '<div class="row size-row"><span class="note">字号</span>' +
        '<button type="button" class="btn sm" data-act="tsize" data-val="-1" aria-label="缩小字号">A−</button>' +
        '<button type="button" class="btn sm" data-act="tsize" data-val="1" aria-label="放大字号">A＋</button>' +
        '<button type="button" class="btn sm" data-act="tsize" data-val="0">默认</button><span class="note">整段 ×' + z + '</span></div>' +
        '<p class="note">文字颜色</p>' + swatches('tcolor', 'color', TEXT_COLORS, tt.style.getPropertyValue('color')) +
        '<p class="note">文字高亮（荧光笔底色）</p>' +
        swatches('thl', '--hl', HL_COLORS, hlAt() ? hlAt().style.getPropertyValue('--hl') : '', '去掉高亮') +
        '<p class="note">先在文字里拖选一部分再点，只改选中的字；不选则改整段。点在已有高亮上（如标题里的「经历」）可直接换色或去掉。</p></div>');
    }
    if (img) {
      h.push('<div class="group"><h3>图片</h3><img class="thumb" alt="" src="' + esc(img.currentSrc || img.src) + '">' +
        '<p class="note">' + esc(img.getAttribute('data-hx-src') || img.getAttribute('src') || '') + ' · ' + img.naturalWidth + '×' + img.naturalHeight +
        (img.hasAttribute('data-hx-src') ? ' <span class="badge">待发布</span>' : '') + '</p>' +
        '<div class="row"><button type="button" class="btn sm yellow" data-act="replace-img">选择本地图片替换（可裁剪）</button></div>' +
        '<p class="note">支持 PNG / JPG / GIF / WebP，发布时自动上传到仓库。</p>' +
        '<label class="field">替代文字（读屏和图片加载失败时显示）<input id="p-alt" value="' + esc(img.getAttribute('alt') || '') + '"></label>' +
        '<div class="row"><button type="button" class="btn sm" data-act="apply-alt">保存替代文字</button></div></div>');
    }
    if (a) {
      var href = a.getAttribute('href') || '', file = repoPath(href), lt = linkText(a);
      h.push('<div class="group"><h3>链接</h3>' +
        (lt && !isTextBlock(a) ? '<label class="field">按钮文字<input id="p-ltext" value="' + esc(lt) + '"></label>' : '') +
        '<label class="field">链接地址<input id="p-href" value="' + esc(href) + '" spellcheck="false" placeholder="https:// 或 #projects 或 files/xx.pdf"></label>' +
        '<div class="row"><button type="button" class="btn sm yellow" data-act="apply-link">保存链接</button>' +
        '<button type="button" class="btn sm" data-act="open-link">打开看看</button></div>' +
        '<div class="row"><button type="button" class="btn sm yellow" data-act="link-file">选择本地文件作为链接</button></div>' +
        '<p class="note">会存到仓库 files/ 下的新路径，发布时自动上传，不影响其他链接。' +
        (file && S.uploads[file] ? ' <span class="badge">待发布：' + esc(file) + '</span>' : '') + '</p>' +
        (file ? '<div class="row"><button type="button" class="btn sm" data-act="replace-file">用新文件覆盖原文件</button></div>' +
          '<p class="note">覆盖 ' + esc(file) + '，所有指向它的链接都会变成新文件。</p>' : '') + '</div>');
    }
    if (ct) {
      h.push('<div class="group"><h3>颜色 · ' + esc(colorLabel(ct.el)) + '</h3>' + ct.rows.map(function (r) {
        return '<p class="note">' + r[1] + '</p>' + swatches('ccolor', r[0], PALETTE, ct.el.style.getPropertyValue(r[0]));
      }).join('') + '</div>');
    }
    if (b) {
      var sib = siblings(b), i = sib.indexOf(b);
      h.push('<div class="group"><h3>' + esc(describe(b)) + '（第 ' + (i + 1) + ' / ' + sib.length + ' 个）</h3><div class="row">' +
        '<button type="button" class="btn sm" data-act="dup">复制一份</button>' +
        '<button type="button" class="btn sm" data-act="up"' + (i > 0 ? '' : ' disabled') + '>上移</button>' +
        '<button type="button" class="btn sm" data-act="down"' + (i < sib.length - 1 ? '' : ' disabled') + '>下移</button>' +
        '<button type="button" class="btn sm danger" data-act="del">删除</button></div>' +
        (parentBlock(b) ? '<div class="row"><button type="button" class="btn sm" data-act="outer">选中外层' + esc(describe(parentBlock(b))) + '</button></div>' : '') + '</div>');
    }
    if (!h.length) { closePanel(); return; }
    ui.panelBody.innerHTML = h.join('');
    ui.panel.hidden = false;
  }
  // 一排色块 + 自定义取色 + 恢复默认；current 为元素上现有的行内值
  function swatches(act, prop, list, current, resetLabel) {
    var cur = normColor(current), custom = toHex(current);
    return '<div class="swatches">' + list.map(function (c) {
      return '<button type="button" class="sw" data-act="' + act + '" data-prop="' + prop + '" data-val="' + esc(c[1]) + '" style="background:' + c[2] +
        '" title="' + c[0] + '" aria-label="' + c[0] + '" aria-pressed="' + String(!!cur && cur === normColor(c[1])) + '"></button>';
    }).join('') +
      '<label class="sw sw-custom" title="自定义颜色"><input type="color" data-act="' + act + '" data-prop="' + prop + '" value="' + custom + '" aria-label="自定义颜色"></label>' +
      '<button type="button" class="btn sm" data-act="' + act + '" data-prop="' + prop + '" data-val="">' + (resetLabel || '默认') + '</button></div>';
  }
  function normColor(v) {
    if (!v || !String(v).trim()) return '';
    var d = document.createElement('i');
    d.style.setProperty('color', String(v).trim());
    return d.style.getPropertyValue('color');
  }
  function toHex(v) {
    v = String(v || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    var named = PALETTE.concat(TEXT_COLORS).filter(function (c) { return normColor(c[1]) === normColor(v); })[0];
    if (named) return named[2].toLowerCase();
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(normColor(v));
    return m ? '#' + [m[1], m[2], m[3]].map(function (n) { return (+n < 16 ? '0' : '') + (+n).toString(16); }).join('') : '#888888';
  }

  /* ---------- 面板操作：链接、图片、文件、颜色、区块 ---------- */
  function onPanelClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled || btn.tagName === 'INPUT') return;
    var act = btn.getAttribute('data-act'), val = btn.getAttribute('data-val');
    if (act === 'edit') { startEditing(S.sel); focusAll(S.sel, true); renderPanel(); }
    else if (act === 'apply-link') applyLink();
    else if (act === 'open-link') openLink();
    else if (act === 'link-file') linkLocalFile();
    else if (act === 'replace-file') replaceRepoFile();
    else if (act === 'replace-img') replaceImage();
    else if (act === 'apply-alt') applyAlt();
    else if (act === 'tsize') applyTextStyle('size', +val);
    else if (act === 'tcolor') applyTextStyle('color', val);
    else if (act === 'thl') applyHighlight(val);
    else if (act === 'ccolor') applyCardColor(btn.getAttribute('data-prop'), val);
    else if (act === 'outer') select(parentBlock(S.block));
    else blockOp(act);
  }
  function onPanelChange(e) {
    var t = e.target;
    if (t.type !== 'color') return;
    if (t.getAttribute('data-act') === 'tcolor') applyTextStyle('color', t.value);
    else if (t.getAttribute('data-act') === 'thl') applyHighlight(t.value);
    else applyCardColor(t.getAttribute('data-prop'), t.value);
  }

  /* ---------- 文字样式与卡片颜色 ---------- */
  function textTarget() { return S.editing || (S.sel && isTextBlock(S.sel) ? S.sel : null); }
  function colorLabel(el) {
    if (el.tagName === 'SECTION') return '整个板块';
    if (el.matches('.doc-head')) return '论文卡片顶栏';
    if (el.matches('.stamp')) return '印章';
    if (el.matches('.chip')) return '标签';
    if (el.matches('.metric')) return '指标块';
    return describe(el);
  }
  function colorTarget() {
    for (var el = S.sel; el && S.doc && el !== S.doc.body; el = el.parentElement) {
      if (el.closest(DUP_MARQUEE)) return null;
      var cls = ' ' + (el.getAttribute('class') || '') + ' ', st = el.style;
      if (/ c-[a-z] /.test(cls) || (st && st.getPropertyValue('--c'))) {
        var rows = [['--c', '主色']];
        if (/ t-[a-z] /.test(cls) || st.getPropertyValue('--c2')) rows.push(['--c2', '辅色']);
        if (/ t3-[a-z] /.test(cls) || st.getPropertyValue('--c3')) rows.push(['--c3', '第三色']);
        return { el: el, rows: rows };
      }
      if (el.matches(BG_SEL)) return { el: el, rows: [['background-color', '背景色']] };
      if (el.tagName === 'SECTION' && el.id) return { el: el, rows: [['--accent', el.classList.contains('band') ? '整块背景色' : '标题高亮色']] };
    }
    return null;
  }
  function setInlineStyle(el, prop, val) {
    if (val) el.style.setProperty(prop, val); else el.style.removeProperty(prop);
    if (!el.getAttribute('style')) el.removeAttribute('style');
  }
  function applyCardColor(prop, val) {
    var ct = colorTarget();
    if (!ct || ct.el.style.getPropertyValue(prop).trim() === (val || '')) return;
    finishEditing();
    pushUndo();
    setInlineStyle(ct.el, prop, val);
    refreshDirty();
    renderPanel();
  }
  function editingRange() {
    if (!S.editing) return null;
    var s = S.doc.getSelection();
    if (!s || !s.rangeCount) return null;
    var r = s.getRangeAt(0);
    return !r.collapsed && S.editing.contains(r.commonAncestorContainer) ? r : null;
  }
  // 光标或点击位置所在的已有高亮（例如标题里的「经历」）
  function hlAt() {
    var tt = textTarget(), node = null;
    if (!tt) return null;
    if (S.editing) {
      var s = S.doc.getSelection();
      if (s && s.rangeCount && S.editing.contains(s.anchorNode)) node = s.anchorNode;
    }
    node = node || S.target;
    var el = node && (node.nodeType === 3 ? node.parentElement : node), hl = el && el.closest ? el.closest('.hl') : null;
    return hl && tt.contains(hl) ? hl : null;
  }
  function applyHighlight(val) {
    var r = editingRange();
    if (r) { highlightRange(r, val); return; }
    var el = textTarget();
    if (!el) return;
    var cur = hlAt(), spans = cur ? [cur] : Array.prototype.slice.call(el.querySelectorAll('.hl'));
    if (!val && !spans.length) { toast('这段文字没有高亮'); return; }
    var editing = S.editing === el;
    if (!editing) { finishEditing(); pushUndo(); }
    if (spans.length) {
      spans.forEach(function (n) {
        if (!val) { unwrap(n); return; }
        n.style.setProperty('--hl', val);
        if (editing) S.editNodes.set(n, n.getAttribute('style'));
      });
    } else {
      // 没有选中文字也没有现成高亮：给整段加一层
      var span = makeHl(val);
      while (el.firstChild) span.appendChild(el.firstChild);
      el.appendChild(span);
    }
    if (editing) setDirty(true); else refreshDirty();
    renderPanel();
  }
  function highlightRange(r, val) {
    var anc = r.commonAncestorContainer, inside = (anc.nodeType === 3 ? anc.parentElement : anc).closest('.hl');
    if (inside && !S.editing.contains(inside)) inside = null;
    if (!val) {
      Array.prototype.slice.call(S.editing.querySelectorAll('.hl')).forEach(function (n) { if (r.intersectsNode(n)) unwrap(n); });
      if (inside && inside.isConnected) unwrap(inside);
    } else if (!r.toString().trim()) {
      toast('请先选中文字');
      return;
    } else if (inside) {
      // 选区落在已有高亮里：直接给它换色，不再套一层
      inside.style.setProperty('--hl', val);
      S.editNodes.set(inside, inside.getAttribute('style'));
      if (inside.textContent.trim() !== r.toString().trim()) toast('已有高亮只能整体换色，已改整段高亮的颜色');
    } else {
      var span = makeHl(val);
      span.appendChild(r.extractContents());
      Array.prototype.slice.call(span.querySelectorAll('*')).forEach(function (n) {
        if (n.classList.contains('hl')) { unwrap(n); return; }  // 不嵌套高亮
        n.setAttribute('data-hx-keep', '');
        S.editNodes.set(n, n.getAttribute('style'));
      });
      r.insertNode(span);
      moveEdgeBreaks(span);
      var s = S.doc.getSelection(), nr = S.doc.createRange();
      nr.selectNodeContents(span);
      s.removeAllRanges(); s.addRange(nr);
    }
    setDirty(true);
    renderPanel();
  }
  // 选区首尾的换行不要包进样式 span（否则会留下一个看不见内容、只剩色块的 span）
  function moveEdgeBreaks(span) {
    while (span.lastChild && span.lastChild.nodeName === 'BR') span.parentNode.insertBefore(span.lastChild, span.nextSibling);
    while (span.firstChild && span.firstChild.nodeName === 'BR') span.parentNode.insertBefore(span.firstChild, span);
  }
  // 选区正好是某个已有样式 span 的全部文字时返回它，用来原地修改而不是再套一层
  function coveringSpan(r, test) {
    var n = r.commonAncestorContainer, want = r.toString().trim();
    for (var el = n.nodeType === 3 ? n.parentElement : n; el && el !== S.editing; el = el.parentElement) {
      if (test(el) && el.textContent.trim() === want) return el;
    }
    return null;
  }
  function makeHl(val) {
    var span = S.doc.createElement('span');
    span.className = 'hl';
    span.setAttribute('data-hx-keep', '');
    span.style.setProperty('--hl', val);
    return span;
  }
  function applyTextStyle(kind, val) {
    var r = editingRange();
    if (r) { styleRange(r, kind, val); return; }
    var el = textTarget();
    if (!el) return;
    finishEditing();
    pushUndo();
    if (kind === 'size') {
      var cur = parseFloat(el.style.getPropertyValue('zoom')) || 1, i = 0;
      ZOOMS.forEach(function (z, j) { if (Math.abs(z - cur) < Math.abs(ZOOMS[i] - cur)) i = j; });
      var next = val === 0 ? 1 : ZOOMS[clamp(i + val, 0, ZOOMS.length - 1)];
      setInlineStyle(el, 'zoom', next === 1 ? '' : String(next));
    } else setInlineStyle(el, 'color', val);
    refreshDirty();
    renderPanel();
  }
  // 选中局部文字时包一层 span；em 相对所在段落，字号仍跟随原有响应式规则
  function styleRange(r, kind, val) {
    var prop = kind === 'size' ? 'font-size' : 'color';
    if (kind === 'size' ? val === 0 : !val) {
      S.editing.querySelectorAll('span[style]').forEach(function (n) {
        if (!r.intersectsNode(n)) return;
        n.style.removeProperty(prop);
        if (!n.getAttribute('style')) unwrap(n); else S.editNodes.set(n, n.getAttribute('style'));
      });
    } else if (!r.toString().trim()) {
      toast('请先选中文字');
      return;
    } else {
      var hit = coveringSpan(r, function (el) { return el.tagName === 'SPAN' && !!el.style.getPropertyValue(prop); });
      if (hit) {
        // 已经单独设过样式的文字：原地修改；字号在原值上继续放大或缩小
        var size = Math.round((parseFloat(hit.style.getPropertyValue('font-size')) || 1) * (val > 0 ? 1.25 : 0.8) * 100) / 100;
        hit.style.setProperty(prop, kind === 'size' ? size + 'em' : val);
        S.editNodes.set(hit, hit.getAttribute('style'));
        setDirty(true);
        return;
      }
      var span = S.doc.createElement('span');
      span.setAttribute('data-hx-keep', '');
      span.style.setProperty(prop, kind === 'size' ? (val > 0 ? '1.25em' : '0.8em') : val);
      span.appendChild(r.extractContents());
      Array.prototype.slice.call(span.querySelectorAll('*')).forEach(function (n) {
        if (n.tagName === 'SPAN' && n.style.getPropertyValue(prop)) {
          n.style.removeProperty(prop);
          if (!n.getAttribute('style')) { unwrap(n); return; }
        }
        n.setAttribute('data-hx-keep', '');
        S.editNodes.set(n, n.getAttribute('style'));  // 以当前样式为准，结束编辑时不要还原
      });
      r.insertNode(span);
      moveEdgeBreaks(span);
      var s = S.doc.getSelection(), nr = S.doc.createRange();
      nr.selectNodeContents(span);
      s.removeAllRanges(); s.addRange(nr);
    }
    setDirty(true);
  }
  function unwrap(n) { while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n); n.remove(); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function applyLink() {
    var a = currentLink(), hrefIn = $('#p-href'), textIn = $('#p-ltext');
    if (!a || !hrefIn) return;
    var href = hrefIn.value.trim(), text = textIn ? textIn.value.trim() : '';
    if (isLocalPath(href)) { toast('这是你电脑上的路径，访问者打不开。请点「选择本地文件作为链接」，发布时会自动上传到仓库'); hrefIn.focus(); return; }
    if (!safeHref(href)) { toast('链接地址不合法：请用 https://、mailto:、tel:、#锚点 或站内路径'); hrefIn.focus(); return; }
    if (textIn && !text) { toast('按钮文字不能为空'); textIn.focus(); return; }
    if (href === (a.getAttribute('href') || '') && (!textIn || text === linkText(a))) return;
    finishEditing();
    pushUndo();
    a.setAttribute('href', href);
    if (textIn) setLinkText(a, text);
    refreshDirty();
    renderPanel();
    toast('链接已更新');
  }
  function openLink() {
    var a = currentLink(), href = a ? (a.getAttribute('href') || '') : '';
    if (!href || !safeHref(href)) return;
    if (href.charAt(0) === '#') {
      var t = S.doc.getElementById(decodeURIComponent(href.slice(1)));
      if (t) t.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.open(new URL(href, location.origin + '/').href, '_blank', 'noopener');
  }
  function applyAlt() {
    var img = S.sel, input = $('#p-alt');
    if (!img || img.tagName !== 'IMG' || !input) return;
    var v = input.value.trim();
    if (v === (img.getAttribute('alt') || '')) return;
    pushUndo();
    img.setAttribute('alt', v);
    refreshDirty();
    toast('替代文字已保存');
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      ui.file.value = '';
      ui.file.accept = accept || '';
      ui.file.onchange = function () { resolve(ui.file.files && ui.file.files[0]); };
      ui.file.click();
    });
  }
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }
  function replaceImage() {
    var img = S.sel;
    if (!img || img.tagName !== 'IMG') return;
    var w = img.naturalWidth || +img.getAttribute('width'), h = img.naturalHeight || +img.getAttribute('height');
    pickFile('image/*').then(function (f) {
      if (!f) return;
      if (!/^image\//.test(f.type)) { toast('请选择图片文件'); return; }
      if (f.size > CFG.maxImage) { toast('图片超过 20 MB，请先压缩再上传'); return; }
      return openCrop(f, w && h ? w / h : null).then(function (out) { if (out) applyImage(img, out); });
    });
  }
  function applyImage(img, f) {
    var m = /\.([a-z0-9]{2,5})$/i.exec(f.name);
    var ext = (m ? m[1] : f.type.split('/')[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
    var base = 'assets/uploads/' + stamp(), path = base + '.' + ext, n = 2;
    while (S.uploads[path]) path = base + '-' + n++ + '.' + ext;
    var url = URL.createObjectURL(f);
    finishEditing();
    pushUndo();
    S.uploads[path] = f;
    img.setAttribute('data-hx-src', path);
    img.setAttribute('src', url);
    var probe = new Image();
    probe.onload = function () { img.setAttribute('width', probe.naturalWidth); img.setAttribute('height', probe.naturalHeight); renderPanel(); };
    probe.src = url;
    refreshDirty();
    renderPanel();
    toast('图片已替换，发布时会自动上传到 ' + path);
  }
  // 链接到一个本地文件：存到 files/ 下不冲突的新路径，发布时一起上传
  function linkLocalFile() {
    var a = currentLink();
    if (!a) return;
    pickFile('').then(function (f) {
      if (!f) return;
      if (f.size > CFG.maxFile) { toast('文件超过 50 MB，请改用 git 上传'); return; }
      return freePath('files/', f.name).then(function (path) {
        finishEditing();
        pushUndo();
        S.uploads[path] = f;
        a.setAttribute('href', path);
        refreshDirty();
        renderPanel();
        toast('链接已指向 ' + path + '，发布时会自动上传');
      });
    });
  }
  function replaceRepoFile() {
    var a = currentLink(), path = a ? repoPath(a.getAttribute('href') || '') : '';
    if (!path) return;
    pickFile('').then(function (f) {
      if (!f) return;
      if (f.size > CFG.maxFile) { toast('文件超过 50 MB，请改用 git 上传'); return; }
      var oldExt = path.split('.').pop().toLowerCase(), newExt = (f.name.split('.').pop() || '').toLowerCase();
      if (!confirm('会用「' + f.name + '」覆盖 ' + path + '，所有指向它的链接都会变成新文件。' +
        (oldExt !== newExt ? '\n注意：新文件是 .' + newExt + '，原文件是 .' + oldExt + '。' : '') + '\n继续吗？')) return;
      finishEditing();
      pushUndo();
      f.hxReplace = true;  // 覆盖已有文件：即使页面里没有新引用也要上传
      S.uploads[path] = f;
      refreshDirty();
      renderPanel();
      toast('已替换 ' + path + '，发布后生效');
    });
  }
  // 找一个页面里没用过、这次也没上传过、仓库里也不存在的文件路径
  function freePath(dir, name) {
    var clean = name.replace(/[\\/:*?"<>|#%\s]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
    var m = /^(.*?)(\.[a-z0-9]{1,5})?$/i.exec(clean), stem = m[1] || 'file', ext = m[2] || '', html = serialize(), i = 1;
    function candidate() { return dir + (i === 1 ? stem + ext : stem + '-' + i + ext); }
    function taken(p) {
      if (S.uploads[p] || html.indexOf('"' + p + '"') >= 0) return Promise.resolve(true);
      if (!S.user) return Promise.resolve(false);
      return gh('GET', '/repos/' + CFG.repo + '/contents/' + encPath(p) + '?ref=' + encodeURIComponent(S.branch))
        .then(function () { return true; }, function () { return false; });
    }
    function next() {
      var p = candidate();
      return taken(p).then(function (t) { if (!t || i >= 50) return p; i++; return next(); });
    }
    return next();
  }

  /* ---------- 裁剪 ---------- */
  var CROP_MAX = 2400;  // 输出最长边，避免上传过大的图片
  var C = null;         // 当前裁剪会话
  function openCrop(file, slotRatio) {
    return new Promise(function (resolve) {
      var gif = file.type === 'image/gif';
      C = { file: file, url: URL.createObjectURL(file), slot: slotRatio, ratio: slotRatio || null, rect: null, drag: null, resolve: resolve };
      cropUI.ratios.forEach(function (b) {
        var r = b.getAttribute('data-ratio');
        b.hidden = r === 'slot' && !slotRatio;
        b.setAttribute('aria-pressed', String(r === (slotRatio ? 'slot' : 'free')));
      });
      cropUI.ok.textContent = gif ? '裁剪（会变成静态图）' : '裁剪并使用';
      cropUI.skip.textContent = gif ? '不裁剪，保留动图' : '不裁剪，直接使用';
      cropUI.img.onload = cropReset;
      cropUI.img.src = C.url;
      cropUI.el.hidden = false;
      (gif ? cropUI.skip : cropUI.ok).focus();
    });
  }
  function cropReset() {
    if (!C) return;
    var W = cropUI.img.naturalWidth, H = cropUI.img.naturalHeight, w = W, h = H;
    if (C.ratio) { if (w / h > C.ratio) w = h * C.ratio; else h = w / C.ratio; }
    C.rect = { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
    cropDraw();
  }
  function cropDraw() {
    if (!C || !C.rect || !cropUI.img.naturalWidth) return;
    var s = cropUI.img.clientWidth / cropUI.img.naturalWidth, r = C.rect, st = cropUI.box.style;
    st.left = (cropUI.img.offsetLeft + r.x * s) + 'px';
    st.top = (cropUI.img.offsetTop + r.y * s) + 'px';
    st.width = (r.w * s) + 'px';
    st.height = (r.h * s) + 'px';
    var k = Math.min(1, CROP_MAX / Math.max(r.w, r.h));
    cropUI.info.textContent = '输出 ' + Math.round(r.w * k) + ' × ' + Math.round(r.h * k) + ' 像素。拖动方框移动，拖四角调整大小。' +
      (C.file.type === 'image/gif' ? 'GIF 裁剪后会变成静态图片，想保留动画请选「不裁剪」。' : '');
  }
  function cropPointerDown(e) {
    if (!C || !C.rect) return;
    e.preventDefault();
    C.drag = { h: e.target.getAttribute('data-h') || 'move', x0: e.clientX, y0: e.clientY, r0: Object.assign({}, C.rect) };
    try { cropUI.box.setPointerCapture(e.pointerId); } catch (err) { /* 没有真实指针时忽略 */ }
  }
  function cropPointerMove(e) {
    var d = C && C.drag;
    if (!d) return;
    var W = cropUI.img.naturalWidth, H = cropUI.img.naturalHeight, s = cropUI.img.clientWidth / W, r0 = d.r0;
    var dx = (e.clientX - d.x0) / s, dy = (e.clientY - d.y0) / s, min = Math.max(8, Math.min(W, H) * 0.04);
    if (d.h === 'move') {
      C.rect = { x: clamp(r0.x + dx, 0, W - r0.w), y: clamp(r0.y + dy, 0, H - r0.h), w: r0.w, h: r0.h };
    } else {
      // 拖动一个角，对角固定
      var sx = d.h.indexOf('e') >= 0 ? 1 : -1, sy = d.h.indexOf('s') >= 0 ? 1 : -1;
      var ax = sx > 0 ? r0.x : r0.x + r0.w, ay = sy > 0 ? r0.y : r0.y + r0.h;
      var w = clamp(sx * ((sx > 0 ? r0.x + r0.w : r0.x) + dx - ax), min, sx > 0 ? W - ax : ax);
      var h = clamp(sy * ((sy > 0 ? r0.y + r0.h : r0.y) + dy - ay), min, sy > 0 ? H - ay : ay);
      if (C.ratio) { if (w / h > C.ratio) w = h * C.ratio; else h = w / C.ratio; }
      C.rect = { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w: w, h: h };
    }
    cropDraw();
  }
  function cropEnd(result) {
    if (!C) return;
    var c = C;
    C = null;
    cropUI.el.hidden = true;
    if (result !== 'crop' || !c.rect) { URL.revokeObjectURL(c.url); c.resolve(result === 'skip' ? c.file : null); return; }
    var r = c.rect, k = Math.min(1, CROP_MAX / Math.max(r.w, r.h)), cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(r.w * k));
    cv.height = Math.max(1, Math.round(r.h * k));
    var type = /png|gif/.test(c.file.type) ? 'image/png' : /webp/.test(c.file.type) ? 'image/webp' : 'image/jpeg', ctx = cv.getContext('2d');
    if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cropUI.img, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
    cv.toBlob(function (blob) {
      URL.revokeObjectURL(c.url);
      var name = c.file.name.replace(/\.[^.]+$/, '') + '.' + type.split('/')[1].replace('jpeg', 'jpg');
      c.resolve(blob ? new File([blob], name, { type: type }) : c.file);
    }, type, 0.92);
  }
  function cropRatio(b) {
    if (!C) return;
    var r = b.getAttribute('data-ratio');
    C.ratio = r === 'slot' ? C.slot : r === 'free' ? null : +r;
    cropUI.ratios.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    cropReset();
  }

  function blockOp(act) {
    var b = S.block;
    if (!b || !b.isConnected) return;
    var sib = siblings(b), i = sib.indexOf(b);
    if (act === 'up' && i < 1) return;
    if (act === 'down' && i >= sib.length - 1) return;
    if (act === 'del') {
      var big = /^(ARTICLE|DETAILS)$/.test(b.tagName) || b.textContent.trim().length > 80;
      if (big && !confirm('确定删除这个' + describe(b) + '吗？之后可以点「撤销」恢复。')) return;
      if (sib.length === 1 && !confirm('这是这一组里的最后一个，删掉后这一组就空了。继续吗？')) return;
    }
    finishEditing();
    pushUndo();
    if (act === 'dup') {
      var c = b.cloneNode(true);
      [c].concat(Array.prototype.slice.call(c.querySelectorAll('*'))).forEach(function (n) { clearMarks(n); n.removeAttribute('id'); });
      b.after(c);
      select(c);
      c.scrollIntoView({ block: 'nearest' });
      if (isTextBlock(c)) { startEditing(c); focusAll(c); renderPanel(); }  // 新标签 / 列表项直接进入编辑，打字即替换
      toast('已复制一份，修改新的那一项即可');
    } else if (act === 'up' || act === 'down') {
      if (act === 'up') sib[i - 1].before(b); else sib[i + 1].after(b);
      renderPanel();
      b.scrollIntoView({ block: 'nearest' });
    } else if (act === 'del') {
      b.remove();
      clearSel();
    }
    refreshDirty();
  }

  /* ---------- 导出与发布 ---------- */
  function exportHtml() {
    if (!S.doc) return;
    finishEditing();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([serialize()], { type: 'text/html;charset=utf-8' }));
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    toast('已下载 index.html（新上传的图片和文件不包含在内）');
  }
  function collectFiles(html) {
    var files = [{ path: CFG.path, text: html, size: new Blob([html]).size }];
    Object.keys(S.uploads).forEach(function (p) {
      if (!S.uploads[p].hxReplace && html.indexOf(p) < 0) return;  // 撤销或改链接后不再引用的文件不上传
      files.push({ path: p, blob: S.uploads[p], size: S.uploads[p].size });
    });
    return files;
  }
  function conflictError(reason) {
    var e = new Error(reason + '继续发布会覆盖线上版本，建议先「导出 HTML」备份。');
    e.conflict = true;
    return e;
  }

  // 把 index.html 和上传的文件合成一次提交，只在分支没被别人推进时才更新（不强推）
  function doPublish(files, message) {
    var base = '/repos/' + CFG.repo, branch = encPath(S.branch), head, tree = [], indexSha = null;
    setBusy(true);
    setStatus('正在检查线上版本…');
    return gh('GET', base + '/git/ref/heads/' + branch).then(function (ref) {
      head = ref.object.sha;
      return gh('GET', base + '/contents/' + encPath(CFG.path) + '?ref=' + head);
    }).then(function (cur) {
      if (S.fromRepo ? cur.sha !== S.loadedSha : b64ToText(cur.content) !== S.source) {
        throw conflictError(S.fromRepo ? '仓库里的 index.html 在你打开编辑器之后被改过。' : '你编辑的是网站上显示的版本，和仓库里的最新版本不一致。');
      }
      return gh('GET', base + '/git/commits/' + head);
    }).then(function (commit) {
      var chain = Promise.resolve();
      files.forEach(function (f, i) {
        chain = chain.then(function () {
          setStatus('正在上传 ' + (i + 1) + '/' + files.length + '：' + f.path);
          var b64 = f.text != null ? Promise.resolve(textToB64(f.text))
            : f.blob.arrayBuffer().then(function (buf) { return bytesToB64(new Uint8Array(buf)); });
          return b64.then(function (c) { return gh('POST', base + '/git/blobs', { content: c, encoding: 'base64' }); });
        }).then(function (blob) {
          tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
          if (f.path === CFG.path) indexSha = blob.sha;
        });
      });
      return chain.then(function () {
        setStatus('正在提交…');
        return gh('POST', base + '/git/trees', { base_tree: commit.tree.sha, tree: tree });
      });
    }).then(function (t) {
      return gh('POST', base + '/git/commits', { message: message, tree: t.sha, parents: [head] });
    }).then(function (c) {
      return gh('PATCH', base + '/git/refs/heads/' + branch, { sha: c.sha, force: false }).then(function () { return c.sha; });
    }).then(function (sha) {
      // 发布成功后以新版本为基准，接着改也不会误报冲突
      var idx = files.filter(function (f) { return f.path === CFG.path; })[0];
      if (idx) { S.source = idx.text; S.loadedSha = indexSha; }
      S.uploads = {};
      S.undo = [];
      ui.undo.disabled = true;
      S.baseline = serialize();
      setBusy(false);
      setDirty(false);
      return sha;
    }, function (err) { setBusy(false); throw err; });
  }

  function openPublish() {
    if (!S.doc || S.busy) return;
    finishEditing();
    if (!S.user) { openLogin('发布前需要先连接 GitHub。'); return; }
    var html = serialize(), files = collectFiles(html);
    if (html === S.baseline) files = files.filter(function (f) { return f.path !== CFG.path; });
    if (!files.length) { setDirty(false); toast('没有需要发布的修改'); return; }
    S.pending = files;
    ui.pubBranch.textContent = S.branch;
    ui.pubList.innerHTML = files.map(function (f) {
      return '<li><span>' + esc(f.path) + '</span><span>' + fmtSize(f.size) + '</span></li>';
    }).join('');
    ui.pubErr.hidden = true;
    ui.pubOk.disabled = false;
    ui.pub.hidden = false;
    ui.pubMsg.focus();
    ui.pubMsg.select();
  }

  function confirmPublish() {
    var msg = ui.pubMsg.value.trim() || '通过网站编辑器更新内容';
    ui.pubOk.disabled = true;
    ui.pubErr.hidden = true;
    doPublish(S.pending, msg).then(function (sha) {
      ui.pub.hidden = true;
      toast('发布成功，网站一般 1 分钟内更新。<a href="https://github.com/' + CFG.repo + '/commit/' + esc(sha) +
        '" target="_blank" rel="noopener">查看提交</a> · <a href="/" target="_blank" rel="noopener">打开网站</a>', true);
    }, function (err) {
      ui.pubErr.textContent = err.message;
      ui.pubErr.hidden = false;
      ui.pubOk.disabled = !!err.conflict;
      idleStatus();
    });
  }

  /* ---------- 登录 ---------- */
  function openLogin(msg) {
    ui.loginTitle.textContent = S.user ? '已连接 ' + S.user : '连接 GitHub';
    ui.logout.hidden = !S.user;
    ui.loginErr.textContent = msg || '';
    ui.loginErr.hidden = !msg;
    ui.token.value = '';
    ui.login.hidden = false;
    ui.token.focus();
  }
  function doLogin() {
    var t = ui.token.value.trim();
    if (!/^(github_pat_|ghp_)\w{20,}$/.test(t)) {
      ui.loginErr.textContent = '看起来不是 GitHub token，应以 github_pat_ 开头。';
      ui.loginErr.hidden = false;
      return;
    }
    ui.loginOk.disabled = true;
    connect(t).then(function () {
      var keep = ui.remember.checked;
      (keep ? localStorage : sessionStorage).setItem(CFG.tokenKey, t);
      (keep ? sessionStorage : localStorage).removeItem(CFG.tokenKey);
      ui.login.hidden = true;
      toast('已连接 ' + S.user);
      if (!S.dirty) return load(true);  // 没有修改就改为从仓库载入最新版本
      idleStatus();
    }, function (err) {
      S.token = '';
      ui.loginErr.textContent = err.message;
      ui.loginErr.hidden = false;
    }).then(function () { ui.loginOk.disabled = false; }, function () { ui.loginOk.disabled = false; });
  }
  function logout() {
    localStorage.removeItem(CFG.tokenKey);
    sessionStorage.removeItem(CFG.tokenKey);
    S.token = '';
    S.user = '';
    ui.account.textContent = '登录';
    ui.login.hidden = true;
    idleStatus();
    toast('已退出，这台设备上保存的 token 已删除');
  }
  function setView(v) {
    ui.stage.classList.toggle('mobile', v === 'mobile');
    document.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
  }

  /* ---------- 启动 ---------- */
  function noop() {}
  function init() {
    // 防止编辑器被别的网站嵌入后诱导点击
    if (window.top !== window.self && !LOCALHOST) { document.body.textContent = '出于安全考虑，编辑器不能被嵌入其他页面打开。'; return; }
    ui.panelBody.addEventListener('click', onPanelClick);
    ui.panelBody.addEventListener('change', onPanelChange);
    // 面板按钮不抢走 iframe 里的文字选区，这样才能只给选中的字改样式
    ui.panelBody.addEventListener('mousedown', function (e) { if (e.target.closest('[data-act="tsize"],[data-act="tcolor"],[data-act="thl"]')) e.preventDefault(); });
    ui.panelBody.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      e.preventDefault();
      if (e.target.id === 'p-alt') applyAlt(); else applyLink();
    });
    cropUI.box.addEventListener('pointerdown', cropPointerDown);
    cropUI.box.addEventListener('pointermove', cropPointerMove);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { cropUI.box.addEventListener(t, function () { if (C) C.drag = null; }); });
    cropUI.ok.addEventListener('click', function () { cropEnd('crop'); });
    cropUI.skip.addEventListener('click', function () { cropEnd('skip'); });
    cropUI.cancel.addEventListener('click', function () { cropEnd('cancel'); });
    Array.prototype.forEach.call(cropUI.ratios, function (b) { b.addEventListener('click', function () { cropRatio(b); }); });
    window.addEventListener('resize', cropDraw);
    ui.panelClose.addEventListener('click', function () { finishEditing(); select(null); });
    ui.undo.addEventListener('click', undo);
    ui.reload.addEventListener('click', function () { load(false).catch(noop); });
    ui.exportBtn.addEventListener('click', exportHtml);
    ui.publish.addEventListener('click', openPublish);
    ui.account.addEventListener('click', function () { openLogin(); });
    ui.loginOk.addEventListener('click', doLogin);
    ui.token.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    ui.loginSkip.addEventListener('click', function () { ui.login.hidden = true; });
    ui.logout.addEventListener('click', logout);
    ui.pubOk.addEventListener('click', confirmPublish);
    ui.pubCancel.addEventListener('click', function () { if (!S.busy) ui.pub.hidden = true; });
    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
    });
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase(), mod = e.metaKey || e.ctrlKey, inField = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (k === 'escape') {
        if (!cropUI.el.hidden) cropEnd('cancel');
        else if (!ui.pub.hidden) { if (!S.busy) ui.pub.hidden = true; }
        else if (!ui.login.hidden) ui.login.hidden = true;
        else { finishEditing(); select(null); }
      } else if (mod && k === 's') { e.preventDefault(); openPublish(); }
      else if (mod && k === 'z' && !inField) { e.preventDefault(); undo(); }
    });
    window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    if (window.matchMedia('(max-width: 760px)').matches) setView('mobile');

    var boot = S.token ? connect(S.token).then(noop, function (err) {
      if (err.status === 401) { localStorage.removeItem(CFG.tokenKey); sessionStorage.removeItem(CFG.tokenKey); }
      S.token = '';
      return err;
    }) : Promise.resolve();
    boot.then(function (err) {
      return load(true).catch(noop).then(function () { if (!S.user) openLogin(err ? err.message : ''); });
    });
  }

  if (LOCALHOST) {
    // 本地测试用
    window.HXEditor = {
      state: S, serialize: serialize, select: select, startEditing: startEditing, finishEditing: finishEditing,
      blockOp: blockOp, undo: undo, collectFiles: collectFiles, openPublish: openPublish, confirmPublish: confirmPublish,
      safeHref: safeHref, isLocalPath: isLocalPath, repoPath: repoPath, pickEditable: pickEditable, load: load, refreshDirty: refreshDirty,
      applyTextStyle: applyTextStyle, applyHighlight: applyHighlight, hlAt: hlAt, applyCardColor: applyCardColor, colorTarget: colorTarget, freePath: freePath,
      crop: function () { return C; }, cropEnd: cropEnd, cropDraw: cropDraw
    };
  }
  init();
})();
