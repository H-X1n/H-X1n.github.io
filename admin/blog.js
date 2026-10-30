/*
 * 博客编辑器（/admin/blog.html）
 * - 用 Markdown 写文章，右侧实时预览（KaTeX 公式、图片）；草稿自动存在当前浏览器
 * - 发布时把文章页、源文件、图片、文章列表和首页卡片合成一次提交（Git Data API），不强推
 * - token 与网站编辑器共用（localStorage / sessionStorage），只发给 api.github.com
 */
(function () {
  'use strict';

  var CFG = {
    repo: 'H-X1n/H-X1n.github.io',
    api: 'https://api.github.com',
    site: 'https://h-x1n.github.io',
    tokenKey: 'hx-editor-token',
    home: 'index.html',
    list: 'blog/posts.json',
    maxImage: 20 * 1024 * 1024,  // 原图大小上限
    maxEdge: 2000,               // 图片最长边超过它就缩小
    maxBytes: 1536 * 1024        // 图片超过这个大小就重新压缩
  };
  var LOCALHOST = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // 本地联调时可以把 API 指到模拟服务（只在 localhost 下生效，和网站编辑器共用这个设置）
  if (LOCALHOST && localStorage.getItem('hx-editor-api')) CFG.api = localStorage.getItem('hx-editor-api');
  var REPO = '/repos/' + CFG.repo;
  var DRAFT = 'hx-blog-draft:';
  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var IMG_TYPES = /^image\/(png|jpeg|gif|webp|avif)$/;  // 不收 SVG：它能带脚本，而文章和编辑器同源
  var COLORS = ['c-y', 'c-p', 'c-b', 'c-g', 'c-o'];
  var ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='3' y='3' width='58' height='58' fill='%23FFD23F' stroke='%230A0A0A' stroke-width='6'/%3E%3Ctext x='32' y='43' font-family='Arial,sans-serif' font-weight='700' font-size='28' text-anchor='middle' fill='%230A0A0A'%3EHX%3C/text%3E%3C/svg%3E";

  var $ = function (s) { return document.querySelector(s); };
  var ui = {
    status: $('#status'), toast: $('#toast'), file: $('#file-input'),
    back: $('#btn-back'), view: $('#btn-view'), site: $('#btn-site'), account: $('#btn-account'), publish: $('#btn-publish'),
    listView: $('#list-view'), list: $('#post-list'), listNote: $('#list-note'), newBtn: $('#btn-new'),
    editView: $('#edit-view'), title: $('#f-title'), date: $('#f-date'), slug: $('#f-slug'),
    cover: $('#btn-cover'), coverDel: $('#btn-cover-del'), coverThumb: $('#cover-thumb'),
    toolbar: $('#toolbar'), panes: $('#panes'), md: $('#md'), frame: $('#preview'), draftNote: $('#draft-note'), del: $('#btn-delete'),
    login: $('#login'), loginTitle: $('#login-title'), token: $('#token-input'), remember: $('#token-remember'),
    loginErr: $('#login-error'), loginOk: $('#login-ok'), loginSkip: $('#login-skip'), logout: $('#login-logout'),
    pub: $('#pub'), pubList: $('#pub-list'), pubMsg: $('#pub-msg'), pubErr: $('#pub-error'), pubOk: $('#pub-ok'),
    pubCancel: $('#pub-cancel'), pubBranch: $('#pub-branch')
  };
  var S = {
    token: localStorage.getItem(CFG.tokenKey) || sessionStorage.getItem(CFG.tokenKey) || '',
    user: '', branch: 'master', view: 'list',
    posts: [],     // 文章列表（blog/posts.json）
    post: null,    // 正在写的文章：{ slug, title, date, cover, coverW, coverH, isNew, sha }
    pending: {},   // 还没上传的图片：文章目录里的相对路径 → File
    urls: {},      // 预览用的图片地址：相对路径 → blob: URL
    baseline: '', dirty: false, busy: false
  };

  /* ---------- 小工具 ---------- */
  // 转义方式和浏览器序列化 DOM 时一致，网站编辑器读写首页时卡片才能逐字不变
  function escText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;'); }
  function escAttr(s) { return escText(s).replace(/"/g, '&quot;'); }
  function toast(msg, isHtml) {
    if (isHtml) ui.toast.innerHTML = msg; else ui.toast.textContent = msg;
    ui.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { ui.toast.classList.remove('show'); }, isHtml ? 12000 : 5000);
  }
  function setStatus(text, kind) { ui.status.textContent = text; ui.status.className = 'status' + (kind ? ' ' + kind : ''); }
  function idleStatus() {
    if (S.busy) return;
    if (S.view === 'edit' && S.dirty) setStatus('有未发布的修改', 'warn');
    else if (S.user) setStatus('已连接 ' + S.user + ' · ' + S.branch, 'ok');
    else setStatus('未登录 · 只能查看文章列表', 'warn');
  }
  function setBusy(b) {
    S.busy = b;
    document.body.classList.toggle('busy', b);
    ui.publish.disabled = b || !S.dirty;
    ui.pubOk.disabled = b;
    if (!b) idleStatus();
  }
  function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }
  function bytesToB64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    var bin = atob(String(b64 || '').replace(/\s/g, '')), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function stamp() {
    var d = new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  // 文章里引用的相对路径（如 images/xx.png）；http:、/、#、data: 开头的不算
  function isRel(src) { return !!src && !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(src); }
  function relPath(src) { return String(src || '').replace(/^\.\//, '').split('#')[0].split('?')[0]; }
  function mimeOf(path) {
    var ext = path.split('.').pop().toLowerCase();
    return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' }[ext] || 'application/octet-stream';
  }
  function firstChar(s) { return Array.from(String(s || '').trim() || '文')[0]; }
  function noop() {}

  /* ---------- GitHub API（和网站编辑器相同的调用方式） ---------- */
  function gh(method, path, body) {
    var headers = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + S.token, 'X-GitHub-Api-Version': '2022-11-28' };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(CFG.api + path, { method: method, cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) {
        return res.text().then(function (t) {
          var data = null;
          try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
          if (!res.ok) {
            var err = new Error(apiMessage(res.status, data));
            err.status = res.status;
            err.raw = data && data.message ? String(data.message) : '';
            throw err;
          }
          return data;
        });
      }, function () { throw new Error('网络错误：连不上 GitHub，请检查网络后重试。'); });
  }
  function apiMessage(status, data) {
    var raw = data && data.message ? String(data.message) : '';
    if (status === 401) return 'token 无效或已过期，请重新登录。';
    if (status === 403) return /rate limit/i.test(raw) ? 'GitHub API 调用次数超限，请稍后再试。' : 'token 权限不足：需要 H-X1n.github.io 仓库的 Contents「Read and write」权限。';
    if (status === 404) return '找不到仓库或文件：请确认 token 已授权 H-X1n.github.io。';
    if (status === 409 || (status === 422 && /fast.?forward/i.test(raw))) return '仓库刚好有新的提交，请再点一次发布。';
    return 'GitHub 返回错误 ' + status + (raw ? '：' + raw : '');
  }
  function connect(token) {
    S.token = token;
    return gh('GET', '/user').then(function (u) {
      S.user = u.login;
      return gh('GET', REPO);
    }).then(function (repo) {
      S.branch = repo.default_branch || 'master';
      ui.account.textContent = S.user;
    }, function (err) { S.user = ''; throw err; });
  }
  function headSha() { return gh('GET', REPO + '/git/ref/heads/' + encPath(S.branch)).then(function (r) { return r.object.sha; }); }
  // 读仓库里的文件，不存在时返回 null；超过 1 MB 的文件 contents 接口不带内容，改用 blobs 接口
  function getFile(path, ref) {
    return gh('GET', REPO + '/contents/' + encPath(path) + '?ref=' + encodeURIComponent(ref)).then(function (f) {
      if (!f || Array.isArray(f) || f.type !== 'file') return null;
      if (f.content || !f.size) return { sha: f.sha, bytes: b64ToBytes(f.content) };
      return gh('GET', REPO + '/git/blobs/' + f.sha).then(function (b) { return { sha: f.sha, bytes: b64ToBytes(b.content) }; });
    }, function (err) { if (err.status === 404) return null; throw err; });
  }
  function getText(path, ref) {
    return getFile(path, ref).then(function (f) { return f && { sha: f.sha, text: new TextDecoder().decode(f.bytes) }; });
  }

  /* ---------- Markdown → HTML ---------- */
  // 公式先换成占位符，等 DOMPurify 清理完正文里手写的 HTML 之后再填入 KaTeX 的输出（KaTeX 会自己转义）
  var MATH = null;
  var mathCache = new Map();
  function texHtml(src, display) {
    var key = (display ? 'D:' : 'I:') + src;
    if (mathCache.has(key)) return mathCache.get(key);
    var out;
    try {
      out = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
    } catch (e) {
      out = '<span class="math-error" title="' + escAttr(e.message || '') + '">' + escText(src) + '</span>';
    }
    if (mathCache.size > 800) mathCache.clear();
    mathCache.set(key, out);
    return out;
  }
  function mathSlot(src, display) {
    MATH.list.push([src, display]);
    return '<span data-hxm="' + MATH.id + '-' + (MATH.list.length - 1) + '"></span>';
  }
  var parser = new marked.Marked({ gfm: true, breaks: true });
  parser.use({ extensions: [{
    // 独立公式：$$ … $$ 或 \[ … \]，可以跨行
    name: 'mathBlock', level: 'block',
    start: function (src) { var m = /^ {0,3}(\$\$|\\\[)/m.exec(src); return m ? m.index : undefined; },
    tokenizer: function (src) {
      var m = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src) || /^ {0,3}\\\[([\s\S]+?)\\\][ \t]*(?:\n+|$)/.exec(src);
      if (m && m[1].trim()) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
    },
    renderer: function (t) { return '<div class="math-block">' + mathSlot(t.text, true) + '</div>\n'; }
  }, {
    // 行内公式：$ … $、\( … \)；段落里的 $$ … $$、\[ … \] 按独立公式排版
    name: 'mathInline', level: 'inline',
    start: function (src) { var m = /\$|\\\(|\\\[/.exec(src); return m ? m.index : undefined; },
    tokenizer: function (src) {
      var m = /^\$\$([^\n]+?)\$\$/.exec(src) || /^\\\[([\s\S]+?)\\\]/.exec(src);
      if (m) return { type: 'mathInline', raw: m[0], text: m[1].trim(), display: true };
      // 开头后、结尾前不能是空格，结尾后不能紧跟数字，避免把「$5 和 $10」当成公式
      m = /^\$(?![\s$])((?:\\.|[^\\\n$])+?)\$(?!\d)/.exec(src);
      if (m && !/\s$/.test(m[1])) return { type: 'mathInline', raw: m[0], text: m[1], display: false };
      m = /^\\\((.+?)\\\)/.exec(src);
      if (m) return { type: 'mathInline', raw: m[0], text: m[1].trim(), display: false };
    },
    renderer: function (t) { return mathSlot(t.text, t.display); }
  }] });

  // 正文里允许常见 HTML（如 <sub>、<details>），但去掉脚本、事件属性、<style> 和表单；外链新窗口打开，图片懒加载
  var PURIFY = { USE_PROFILES: { html: true }, ADD_ATTR: ['target'], FORBID_TAGS: ['style', 'form'] };
  DOMPurify.addHook('afterSanitizeAttributes', function (n) {
    var href = n.tagName === 'A' ? n.getAttribute('href') || '' : '';
    if (/^https?:\/\//i.test(href) && href.indexOf(CFG.site) !== 0) {
      n.setAttribute('target', '_blank');
      n.setAttribute('rel', 'noopener noreferrer');
    }
    if (n.tagName === 'IMG') { n.setAttribute('loading', 'lazy'); n.setAttribute('decoding', 'async'); }
  });
  // 返回 { html, math: 是否用到公式, excerpt: 摘要（页面描述用） }
  function renderPost(src) {
    MATH = { id: Math.random().toString(36).slice(2, 8), list: [] };
    var m = MATH, clean;
    try { clean = DOMPurify.sanitize(parser.parse(String(src || '')), PURIFY); } finally { MATH = null; }
    var doc = new DOMParser().parseFromString(clean, 'text/html');
    doc.querySelectorAll('pre').forEach(function (n) { n.remove(); });
    var text = doc.body.textContent.replace(/\s+/g, ' ').trim();
    var html = clean.replace(/<span data-hxm="([a-z0-9]+)-(\d+)"><\/span>/g, function (all, id, i) {
      var f = m.list[+i];
      return id === m.id && f ? texHtml(f[0], f[1]) : '';
    });
    return { html: html.replace(/\s+$/, ''), math: m.list.length > 0, excerpt: text.length > 120 ? text.slice(0, 118) + '…' : text };
  }

  /* ---------- 生成文件 ---------- */
  // 文章页 blog/<slug>/index.html；root 是站点根目录（预览时用 /），预览不带访客统计脚本。
  // 谷歌字体在国内可能连不上，文章页里改成不阻塞渲染的加载方式（先用系统字体显示，字体到了再替换）
  function pageHtml(p, r, opt) {
    opt = opt || {};
    var root = opt.root || '../../', url = CFG.site + '/blog/' + p.slug + '/', title = p.title || '未命名文章', desc = r.excerpt || title;
    var size = p.coverW ? ' width="' + p.coverW + '" height="' + p.coverH + '"' : '';
    var count = opt.preview ? '<span>阅读次数发布后显示</span>'
      : '<span id="vercount_container_page_pv" style="display:none">阅读 <b id="vercount_value_page_pv"></b> 次</span>';
    var font = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&amp;display=swap';
    return [
      '<!DOCTYPE html>', '<html lang="zh-CN">', '<head>', '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>' + escText(title) + ' | 黄鑫的博客</title>',
      '<meta name="description" content="' + escAttr(desc) + '">',
      '<meta property="og:type" content="article">',
      '<meta property="og:title" content="' + escAttr(title) + '">',
      '<meta property="og:description" content="' + escAttr(desc) + '">',
      '<meta property="og:url" content="' + url + '">',
      p.cover ? '<meta property="og:image" content="' + escAttr(url + p.cover) + '">' : '',
      '<link rel="canonical" href="' + url + '">',
      '<link rel="icon" href="' + ICON + '">',
      '<meta name="theme-color" content="#FFF6E5">',
      opt.preview ? '<link rel="stylesheet" href="' + font + '">'
        : '<link rel="stylesheet" href="' + font + '" media="print" onload="this.media=\'all\'">\n<noscript><link rel="stylesheet" href="' + font + '"></noscript>',
      r.math || opt.preview ? '<link rel="stylesheet" href="' + root + 'assets/vendor/katex/katex.min.css">' : '',
      '<link rel="stylesheet" href="' + root + 'blog/post.css">',
      '</head>', '<body>',
      '<header class="topbar"><div class="wrap topbar-in">',
      '<a class="brand" href="' + root + '"><span class="brand-mark" aria-hidden="true">HX</span><span class="brand-name">黄鑫<small>Blog</small></span></a>',
      '<a class="btn" href="' + root + '#blog">← 全部文章</a>',
      '</div></header>',
      '<main>', '<article class="post">', '<header class="post-head">',
      '<h1 class="post-title">' + escText(title) + '</h1>',
      '<p class="post-meta"><time datetime="' + escAttr(p.date) + '">' + escText(p.date) + '</time>' + count + '</p>',
      '</header>',
      p.cover ? '<figure class="post-cover"><img src="' + escAttr(p.cover) + '" alt=""' + size + '></figure>' : '',
      '<div class="post-body">', r.html, '</div>',
      '</article>', '</main>',
      '<footer class="foot"><div class="wrap foot-in"><p>© ' + new Date().getFullYear() + ' 黄鑫</p><a class="btn" href="' + root + '">返回主页</a></div></footer>',
      opt.preview ? '' : '<script defer src="https://events.vercount.one/js"></script>',
      '</body>', '</html>'
    ].filter(Boolean).join('\n') + '\n';
  }

  // 首页卡片：只显示封面和标题，路径相对于首页；没有封面时用标题第一个字做色块
  function cardHtml(p, i) {
    var dir = 'blog/' + p.slug + '/', size = p.coverW ? ' width="' + p.coverW + '" height="' + p.coverH + '"' : '';
    var cover = p.cover
      ? '<span class="bcard-cover"><img src="' + escAttr(dir + p.cover) + '" alt=""' + size + ' loading="lazy" decoding="async"></span>'
      : '<span class="bcard-cover ' + COLORS[i % COLORS.length] + '" aria-hidden="true"><span class="bcard-ph">' + escText(firstChar(p.title)) + '</span></span>';
    return '<li><a class="bcard" href="' + dir + '">' + cover + '<span class="bcard-title">' + escText(p.title) + '</span></a></li>';
  }
  // 只改首页博客区的卡片列表和显隐（没有文章时整块和导航入口都隐藏，联系板块的编号随之调整），其他内容逐字保留
  function homeHtml(html, posts) {
    var re = /(<!-- blog:start[^>]*-->)[\s\S]*?(<!-- blog:end -->)/, show = posts.length > 0;
    if (!re.test(html) || !/<section id="blog"/.test(html)) {
      throw new Error('首页 index.html 里找不到博客区（blog:start / blog:end 标记）。请不要在网站编辑器里删掉博客板块。');
    }
    var cards = posts.map(cardHtml).join('\n');
    function toggle(tag) {
      tag = tag.replace(/\s+hidden(="[^"]*")?(?=[\s>])/, '');
      return show ? tag : tag.replace(/>$/, ' hidden>');
    }
    return html
      .replace(re, function (all, a, b) { return a + '\n' + (cards ? cards + '\n' : '') + b; })
      .replace(/<section id="blog"[^>]*>/, toggle)
      .replace(/<li data-blog="nav"[^>]*>/, toggle)
      .replace(/(<p class="mega-k">)0[89]( \/ Contact<\/p>)/, function (all, a, b) { return a + (show ? '09' : '08') + b; });
  }
  function listJson(posts) { return JSON.stringify(posts, null, 2) + '\n'; }
  function parseList(text) {
    var a;
    try { a = JSON.parse(text || '[]'); } catch (e) { throw new Error('blog/posts.json 格式有误，请修好后再试。'); }
    return Array.isArray(a) ? a.filter(function (p) { return p && SLUG.test(p.slug || ''); }) : [];
  }
  function sortPosts(a) {
    return a.sort(function (x, y) { return String(y.date || '').localeCompare(String(x.date || '')) || String(x.title || '').localeCompare(String(y.title || '')); });
  }
  function entry(p) {
    var e = { slug: p.slug, title: p.title, date: p.date };
    if (p.cover) { e.cover = p.cover; if (p.coverW) { e.coverW = p.coverW; e.coverH = p.coverH; } }
    return e;
  }
  // 文章源文件 blog/<slug>/post.md：开头记标题、日期、封面，后面是 Markdown 正文
  function postMd(p, md) {
    var head = ['---', 'title: ' + JSON.stringify(p.title), 'date: ' + p.date];
    if (p.cover) head.push('cover: ' + p.cover);
    return head.concat(['---', '', '']).join('\n') + String(md).replace(/\s+$/, '') + '\n';
  }
  function parsePostMd(text) {
    var m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text), meta = {};
    if (!m) return { meta: meta, md: text };
    m[1].split(/\r?\n/).forEach(function (line) {
      var kv = /^([A-Za-z]+):\s*(.*)$/.exec(line);
      if (!kv) return;
      var v = kv[2].trim();
      if (v.charAt(0) === '"') { try { v = JSON.parse(v); } catch (e) { /* 保持原样 */ } }
      meta[kv[1]] = v;
    });
    return { meta: meta, md: text.slice(m[0].length).replace(/^\r?\n/, '') };
  }

  /* ---------- 图片 ---------- */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('图片无法读取：' + file.name)); };
      img.src = url;
    });
  }
  function toBlob(cv, type) { return new Promise(function (resolve) { cv.toBlob(resolve, type, 0.86); }); }
  // 长边超过 2000 像素或大于 1.5 MB 的图片缩小重压（PNG 截图保持 PNG，照片存 JPEG）；GIF 保留动图不处理
  function prepareImage(file) {
    if (!IMG_TYPES.test(file.type)) return Promise.reject(new Error('只支持 PNG / JPG / GIF / WebP / AVIF 图片：' + file.name));
    if (file.size > CFG.maxImage) return Promise.reject(new Error('图片超过 20 MB，请先压缩再上传：' + file.name));
    return loadImage(file).then(function (o) {
      var w = o.img.naturalWidth, h = o.img.naturalHeight, k = Math.min(1, CFG.maxEdge / Math.max(w, h));
      if (file.type === 'image/gif' || (k === 1 && file.size <= CFG.maxBytes)) { URL.revokeObjectURL(o.url); return { file: file, w: w, h: h }; }
      var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), png = file.type === 'image/png';
      cv.width = Math.max(1, Math.round(w * k));
      cv.height = Math.max(1, Math.round(h * k));
      if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(o.img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(o.url);
      return toBlob(cv, png ? 'image/png' : 'image/jpeg').then(function (b) {
        if (!png || !b || b.size <= CFG.maxBytes * 1.4) return b;
        // 照片存成的大 PNG 改存 JPEG（透明处垫白底）
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cv.width, cv.height);
        return toBlob(cv, 'image/jpeg');
      }).then(function (b) {
        if (!b || b.size >= file.size) return { file: file, w: w, h: h };  // 没有变小就用原图
        var name = file.name.replace(/\.[^.]+$/, '') + (b.type === 'image/png' ? '.png' : '.jpg');
        return { file: new File([b], name, { type: b.type }), w: cv.width, h: cv.height };
      });
    });
  }
  function extOf(f) {
    var m = /\.([a-z0-9]{2,5})$/i.exec(f.name || '');
    return (m ? m[1] : f.type.split('/')[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
  }
  // 存成待上传文件（文章目录下的 images/），返回相对路径
  function addPending(f, prefix) {
    var base = 'images/' + (prefix || '') + stamp(), ext = extOf(f), path = base + '.' + ext, n = 2;
    while (S.pending[path] || S.urls[path]) path = base + '-' + n++ + '.' + ext;
    S.pending[path] = f;
    S.urls[path] = URL.createObjectURL(f);
    saveFiles();
    return path;
  }
  function pickFiles(accept, multiple) {
    return new Promise(function (resolve) {
      ui.file.value = '';
      ui.file.accept = accept || '';
      ui.file.multiple = !!multiple;
      ui.file.onchange = function () { resolve(Array.prototype.slice.call(ui.file.files || [])); };
      ui.file.click();
    });
  }

  // 逐张压缩后在光标处插入 ![](images/xx.jpg)
  function insertImages(files) {
    files = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) return Promise.resolve();
    setStatus('正在处理图片…');
    var out = [], chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () { return prepareImage(f); }).then(function (r) {
        out.push('![](' + addPending(r.file) + ')');
      }, function (err) { toast(err.message); });
    });
    return chain.then(function () {
      if (out.length) insertBlock(out.join('\n\n'));
      idleStatus();
    });
  }
  function chooseCover() {
    pickFiles('image/*').then(function (fs) {
      if (!fs[0]) return;
      return prepareImage(fs[0]).then(function (r) {
        var p = S.post;
        p.cover = addPending(r.file, 'cover-');
        p.coverW = r.w;
        p.coverH = r.h;
        syncCover();
        changed();
      });
    }).catch(function (err) { toast(err.message); });
  }
  function removeCover() {
    var p = S.post;
    p.cover = '';
    p.coverW = p.coverH = 0;
    syncCover();
    changed();
  }
  function syncCover() {
    var p = S.post;
    ui.coverThumb.hidden = ui.coverDel.hidden = !p.cover;
    ui.cover.textContent = p.cover ? '更换封面' : '选择封面';
    if (p.cover) setImg(ui.coverThumb, p.cover);
  }
  // 预览里的图片：待上传的用本地 blob 地址；已发布的读网站上的文件，网站还没更新时改从 GitHub API 读
  var repoImg = {};
  function setImg(img, src) {
    var rel = relPath(src), slug = S.post && S.post.slug;
    if (S.urls[rel]) { img.src = S.urls[rel]; return; }
    img.addEventListener('error', function () {
      if (!S.user || !slug) return;
      fetchRepoImage('blog/' + slug + '/' + rel).then(function (url) { if (url) { S.urls[rel] = url; img.src = url; } }, noop);
    }, { once: true });
    img.src = '/blog/' + slug + '/' + rel;
  }
  function fetchRepoImage(path) {
    if (!repoImg[path]) {
      repoImg[path] = getFile(path, S.branch).then(function (f) {
        return f ? URL.createObjectURL(new Blob([f.bytes], { type: mimeOf(path) })) : '';
      });
    }
    return repoImg[path];
  }
  function revokeUrls() {
    Object.keys(S.urls).forEach(function (k) { URL.revokeObjectURL(S.urls[k]); });
    S.urls = {};
    repoImg = {};
  }

  /* ---------- 预览 ---------- */
  // iframe 只在打开文章时载入一次外壳（样式表、字体），之后每次只替换标题和正文，不闪、不丢滚动位置。
  // 不等 load 事件（谷歌字体在国内可能很慢），外壳一解析出来就开始预览。
  // iframe 加了 sandbox（不允许脚本），正文里即使混进脚本也不会执行
  function previewShell() {
    var p = S.post, nonce = Math.random().toString(36).slice(2);
    var shell = pageHtml({ slug: p.slug, title: '', date: '' }, { html: '', math: true, excerpt: '' }, { preview: true, root: '/' });
    ui.frame.srcdoc = shell.replace('<body>', '<body data-shell="' + nonce + '">');
    return new Promise(function (resolve) {
      var tries = 0;
      (function wait() {
        var d = ui.frame.contentDocument;
        if (d && d.body && d.body.getAttribute('data-shell') === nonce && d.querySelector('.post-body')) {
          // 预览里点链接不跳转
          d.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) e.preventDefault(); }, true);
          resolve();
        } else if (tries++ < 400) setTimeout(wait, 25);
        else resolve();
      })();
    });
  }
  var previewTimer = 0;
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(updatePreview, 160); }
  function updatePreview() {
    clearTimeout(previewTimer);
    var d = ui.frame.contentDocument, p = S.post, body = d && d.querySelector('.post-body');
    if (!p || !body) return;
    var r = renderPost(ui.md.value), title = p.title || '未命名文章', time = d.querySelector('.post-meta time');
    d.title = title;
    d.querySelector('.post-title').textContent = title;
    time.textContent = p.date;
    time.setAttribute('datetime', p.date);
    var fig = d.querySelector('.post-cover');
    if (p.cover) {
      if (!fig) {
        fig = d.createElement('figure');
        fig.className = 'post-cover';
        fig.appendChild(d.createElement('img')).alt = '';
        d.querySelector('.post-head').after(fig);
      }
      setImg(fig.querySelector('img'), p.cover);
    } else if (fig) fig.remove();
    body.innerHTML = r.html;
    body.querySelectorAll('img').forEach(function (img) {
      var src = img.getAttribute('src');
      if (isRel(src)) setImg(img, src);
    });
  }
  // 编辑区滚到哪，预览就按比例滚到哪
  function syncScroll() {
    var w = ui.frame.contentWindow, d = ui.frame.contentDocument, a = ui.md;
    if (!w || !d || !d.documentElement) return;
    var max = a.scrollHeight - a.clientHeight;
    w.scrollTo(0, (max > 0 ? a.scrollTop / max : 0) * (d.documentElement.scrollHeight - w.innerHeight));
  }

  /* ---------- 编辑正文 ---------- */
  // 用 insertText 插入，浏览器自带的撤销（Ctrl+Z）仍然有效；sel 是插入后要选中的范围（相对插入内容）
  function replaceSel(text, selFrom, selTo) {
    var a = ui.md;
    a.focus();
    if (!document.execCommand('insertText', false, text)) a.setRangeText(text, a.selectionStart, a.selectionEnd, 'end');
    if (selFrom != null) {
      var start = a.selectionEnd - text.length;
      a.setSelectionRange(start + selFrom, start + selTo);
    }
    changed();
  }
  function selected() { var a = ui.md; return a.value.slice(a.selectionStart, a.selectionEnd); }
  function wrapSel(before, after, placeholder) {
    var s = selected() || placeholder;
    replaceSel(before + s + after, before.length, before.length + s.length);
  }

  // 给选中的每一行加前缀（标题、引用、列表）；numbered 时依次编号
  function prefixLines(prefix, numbered) {
    var a = ui.md, v = a.value, start = v.lastIndexOf('\n', a.selectionStart - 1) + 1, end = v.indexOf('\n', a.selectionEnd);
    if (a.selectionEnd > a.selectionStart && v.charAt(a.selectionEnd - 1) === '\n') end = a.selectionEnd - 1;
    if (end < 0) end = v.length;
    a.setSelectionRange(start, end);
    replaceSel(v.slice(start, end).split('\n').map(function (l, i) { return (numbered ? (i + 1) + '. ' : prefix) + l; }).join('\n'));
  }
  // 插入独立的一块（图片、公式、代码），前后自动留空行
  function insertBlock(text, selFrom, selTo) {
    var a = ui.md, before = a.value.slice(0, a.selectionStart), after = a.value.slice(a.selectionEnd);
    var lead = !before || /\n\n$/.test(before) ? '' : /\n$/.test(before) ? '\n' : '\n\n';
    var tail = !after || /^\n\n/.test(after) ? '' : /^\n/.test(after) ? '\n' : '\n\n';
    replaceSel(lead + text + tail, selFrom == null ? null : lead.length + selFrom, selTo == null ? null : lead.length + selTo);
  }
  var MD = {
    h2: function () { prefixLines('## '); },
    bold: function () { wrapSel('**', '**', '粗体文字'); },
    italic: function () { wrapSel('*', '*', '斜体文字'); },
    link: function () { var s = selected() || '链接文字'; replaceSel('[' + s + '](https://)', s.length + 3, s.length + 11); },
    image: function () { pickFiles('image/*', true).then(insertImages); },
    'inline-math': function () { wrapSel('$', '$', 'E=mc^2'); },
    math: function () { insertBlock('$$\n\\sum_{i=1}^{n} x_i\n$$', 3, 21); },
    code: function () { insertBlock('```python\n\n```', 10, 10); },
    quote: function () { prefixLines('> '); },
    ul: function () { prefixLines('- '); },
    ol: function () { prefixLines('', true); },
    table: function () { insertBlock('| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |'); },
    hr: function () { insertBlock('---'); }
  };
  function imageFiles(list) {
    return Array.prototype.slice.call(list || []).filter(function (f) { return /^image\//.test(f.type); });
  }
  function onPaste(e) {
    var files = imageFiles(e.clipboardData && e.clipboardData.files);
    if (!files.length) return;
    e.preventDefault();  // 粘贴的是图片（截图等）：存成待上传文件并插入引用
    insertImages(files);
  }
  function onDrop(e) {
    ui.md.classList.remove('drop');
    var files = imageFiles(e.dataTransfer && e.dataTransfer.files);
    if (!files.length) return;
    e.preventDefault();
    var pos = document.caretPositionFromPoint ? document.caretPositionFromPoint(e.clientX, e.clientY) : null;
    if (pos && pos.offsetNode === ui.md) ui.md.setSelectionRange(pos.offset, pos.offset);
    insertImages(files);
  }
  function onMdKey(e) {
    if (e.isComposing || e.keyCode === 229) return;  // 中文输入法选词时不拦截
    var k = (e.key || '').toLowerCase(), mod = e.metaKey || e.ctrlKey;
    if (mod && !e.shiftKey && !e.altKey && (k === 'b' || k === 'i')) { e.preventDefault(); MD[k === 'b' ? 'bold' : 'italic'](); }
  }

  /* ---------- 修改状态与草稿 ---------- */
  function snapshot() { var p = S.post; return JSON.stringify([p.title, p.date, p.slug, p.cover, ui.md.value]); }
  function changed() {
    if (!S.post) return;
    S.dirty = snapshot() !== S.baseline;
    ui.publish.disabled = !S.dirty || S.busy;
    document.title = (S.post.title || '新文章') + ' · 博客编辑器';
    schedulePreview();
    scheduleDraft();
    idleStatus();
  }
  // 文字草稿存 localStorage；待上传的图片存 IndexedDB，刷新页面、手机切到别的应用再回来都不会丢
  var draftTimer = 0;
  function draftKey() { return DRAFT + (S.post.isNew ? '_new' : S.post.slug); }
  function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 800); }
  function saveDraft() {
    clearTimeout(draftTimer);
    if (!S.post) return;
    var p = S.post, key = draftKey();
    try {
      if (!S.dirty) { localStorage.removeItem(key); return; }
      localStorage.setItem(key, JSON.stringify({
        title: p.title, date: p.date, slug: p.slug, cover: p.cover, coverW: p.coverW, coverH: p.coverH, md: ui.md.value, at: Date.now()
      }));
      var d = new Date();
      ui.draftNote.textContent = '草稿已自动保存在这台设备上 · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) {
      ui.draftNote.textContent = '草稿保存失败（浏览器存储空间不足？），请尽快发布或复制正文备份';
    }
  }
  function readDraft(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function clearDraft(key) { localStorage.removeItem(key); idb('delete', key); }
  var dbOpen = null;
  function idb(op, key, value) {
    if (!dbOpen) {
      dbOpen = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error('IndexedDB 不可用')); return; }
        var r = indexedDB.open('hx-blog', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('files'); };
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    }
    return dbOpen.then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', op === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('files'), out = null;
        if (op === 'get') { var q = st.get(key); q.onsuccess = function () { out = q.result || null; }; }
        else if (op === 'put') st.put(value, key);
        else st.delete(key);
        tx.oncomplete = function () { resolve(out); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () { return null; });
  }
  function saveFiles() { if (S.post) idb('put', draftKey(), Object.assign({}, S.pending)); }

  /* ---------- 文章列表 ---------- */
  function showList() {
    if (S.busy) return;
    if (S.view === 'edit' && S.dirty && !confirm('有未发布的修改（草稿已自动保存在这台设备上，下次打开可以恢复）。确定回到列表吗？')) return;
    if (S.view === 'edit') saveDraft();
    S.view = 'list';
    S.post = null;
    S.dirty = false;
    ui.editView.hidden = true;
    ui.listView.hidden = false;
    ui.back.hidden = ui.view.hidden = ui.publish.hidden = true;
    ui.site.hidden = false;
    document.title = '博客编辑器 · 黄鑫';
    return loadList();
  }
  function loadList() {
    setStatus('正在读取文章列表…');
    var job = S.user
      ? getText(CFG.list, S.branch).then(function (f) { return parseList(f ? f.text : '[]'); })
      : fetch('/' + CFG.list, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : '[]'; }).then(parseList);
    return job.then(function (posts) {
      S.posts = sortPosts(posts);
      renderList();
      idleStatus();
    }, function (err) { setStatus('读取失败', 'err'); toast(err.message); });
  }
  function renderList() {
    ui.listNote.textContent = S.user
      ? '共 ' + S.posts.length + ' 篇。发布、修改或删除后，首页「博客」板块会自动更新；没有文章时首页不显示这个板块。'
      : '登录后才能写文章和发布。';
    ui.newBtn.disabled = !S.user;
    if (!S.posts.length) { ui.list.innerHTML = '<li class="empty">还没有文章，点「写新文章」开始。</li>'; return; }
    ui.list.innerHTML = S.posts.map(function (p, i) {
      var dir = '/blog/' + p.slug + '/';
      var thumb = p.cover ? '<img src="' + escAttr(dir + p.cover) + '" alt="" loading="lazy">' : escText(firstChar(p.title));
      return '<li class="post-row"><span class="post-thumb" aria-hidden="true">' + thumb + '</span>' +
        '<div><h2>' + escText(p.title) + '</h2><p class="note">' + escText(p.date) + ' · ' + escText(dir) + '</p></div>' +
        '<div class="post-acts"><button type="button" class="btn sm yellow" data-edit="' + i + '"' + (S.user ? '' : ' disabled') + '>编辑</button>' +
        '<a class="btn sm" href="' + escAttr(dir) + '" target="_blank" rel="noopener">查看</a>' +
        '<button type="button" class="btn sm danger" data-del="' + i + '"' + (S.user ? '' : ' disabled') + '>删除</button></div></li>';
    }).join('');
  }

  /* ---------- 打开文章 ---------- */
  function newSlug() {
    var d = today().replace(/-/g, ''), s = 'post-' + d, n = 2;
    var taken = S.posts.map(function (p) { return p.slug; });
    while (taken.indexOf(s) >= 0) s = 'post-' + d + '-' + n++;
    return s;
  }
  // i 为文章在列表里的序号；不传就是写新文章
  function openPost(i) {
    if (!S.user) { openLogin('写文章和发布前需要先连接 GitHub。'); return Promise.resolve(); }
    var meta = i == null ? null : S.posts[i];
    setStatus('正在打开…');
    var job = meta ? getText('blog/' + meta.slug + '/post.md', S.branch) : Promise.resolve(null);
    return job.then(function (f) {
      if (meta && !f) throw new Error('找不到这篇文章的源文件 blog/' + meta.slug + '/post.md');
      var src = f ? parsePostMd(f.text) : { meta: {}, md: '' };
      S.post = meta ? {
        isNew: false, sha: f.sha, slug: meta.slug,
        title: src.meta.title || meta.title || '', date: src.meta.date || meta.date || today(),
        cover: src.meta.cover || meta.cover || '', coverW: meta.coverW || 0, coverH: meta.coverH || 0
      } : { isNew: true, sha: null, slug: newSlug(), title: '', date: today(), cover: '', coverW: 0, coverH: 0 };
      S.pending = {};
      revokeUrls();
      fillForm(src.md);
      return restoreDraft();
    }).then(enterEdit).catch(function (err) { setStatus('打开失败', 'err'); toast(err.message); });
  }
  function fillForm(md) {
    var p = S.post;
    ui.title.value = p.title;
    ui.date.value = p.date;
    ui.slug.value = p.slug;
    ui.slug.disabled = !p.isNew;
    ui.slug.title = p.isNew ? '' : '发布后不能再改：会改变文章地址并清空阅读次数';
    ui.md.value = md;
    ui.draftNote.textContent = '草稿会自动保存在这台设备上';
    syncCover();
    S.baseline = snapshot();
    S.dirty = false;
  }
  function restoreDraft() {
    var key = draftKey(), d = readDraft(key), p = S.post;
    if (!d) return Promise.resolve();
    var when = new Date(d.at || Date.now());
    var same = JSON.stringify([d.title, d.date, d.slug, d.cover, d.md]) === S.baseline;
    if (same || !confirm('这台设备上有 ' + (when.getMonth() + 1) + ' 月 ' + when.getDate() + ' 日 ' + pad(when.getHours()) + ':' + pad(when.getMinutes()) +
      ' 自动保存的未发布草稿，要恢复吗？\n选「取消」会删除这份草稿。')) {
      clearDraft(key);
      return Promise.resolve();
    }
    return idb('get', key).then(function (files) {
      Object.keys(files || {}).forEach(function (path) { S.pending[path] = files[path]; S.urls[path] = URL.createObjectURL(files[path]); });
      p.title = d.title || '';
      p.date = d.date || p.date;
      p.cover = d.cover || '';
      p.coverW = d.coverW || 0;
      p.coverH = d.coverH || 0;
      if (p.isNew && d.slug) p.slug = d.slug;
      ui.title.value = p.title;
      ui.date.value = p.date;
      ui.slug.value = p.slug;
      ui.md.value = d.md || '';
      syncCover();
      S.dirty = snapshot() !== S.baseline;
      toast('已恢复草稿');
    });
  }

  function enterEdit() {
    var p = S.post;
    S.view = 'edit';
    ui.listView.hidden = true;
    ui.editView.hidden = false;
    ui.back.hidden = ui.publish.hidden = false;
    ui.site.hidden = true;
    syncPublished();
    ui.publish.disabled = !S.dirty;
    document.title = (p.title || '新文章') + ' · 博客编辑器';
    setTab('edit');
    return previewShell().then(function () {
      updatePreview();
      idleStatus();
      if (!p.title) ui.title.focus();
    });
  }
  // 已发布的文章：显示「查看文章」「删除」，链接名锁定
  function syncPublished() {
    var p = S.post;
    ui.view.hidden = ui.del.hidden = p.isNew;
    ui.view.href = '/blog/' + p.slug + '/';
    ui.slug.disabled = !p.isNew;
  }
  function onField(e) {
    var p = S.post, t = e.target;
    if (!p) return;
    if (t === ui.title) p.title = ui.title.value.trim();
    else if (t === ui.date) p.date = ui.date.value || today();
    else if (t === ui.slug) {
      // 链接名只用小写字母、数字和连字符，输入时自动整理
      var v = ui.slug.value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-');
      if (v !== ui.slug.value) ui.slug.value = v;
      p.slug = v;
    }
    changed();
  }
  function setTab(tab) {
    ui.panes.setAttribute('data-tab', tab);
    document.querySelectorAll('.tabs [data-tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === tab)); });
    if (tab === 'preview') updatePreview();
  }

  /* ---------- 发布与删除 ---------- */
  function validate() {
    var p = S.post;
    if (!p.title) return ['请先填写标题', ui.title];
    if (!SLUG.test(p.slug)) return ['链接名只能用小写字母、数字和连字符，例如 my-first-post', ui.slug];
    if (p.isNew && S.posts.some(function (x) { return x.slug === p.slug; })) return ['链接名「' + p.slug + '」已经被别的文章用了，请换一个', ui.slug];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return ['请填写日期', ui.date];
    if (!ui.md.value.trim()) return ['正文还是空的', ui.md];
    return null;
  }
  // 正文和封面实际用到的待上传图片（插入后又删掉的不会上传）
  function usedUploads() {
    var md = ui.md.value, cover = S.post.cover;
    return Object.keys(S.pending).filter(function (path) { return path === cover || md.indexOf(path) >= 0; });
  }
  function conflictError(reason) {
    var e = new Error(reason + '为避免覆盖，这次没有发布。请先复制正文备份，再回到列表重新打开这篇文章。');
    e.conflict = true;
    return e;
  }

  function openPublish() {
    if (S.view !== 'edit' || S.busy) return;
    if (!S.user) { openLogin('发布前需要先连接 GitHub。'); return; }
    var bad = validate();
    if (bad) { toast(bad[0]); setTab('edit'); bad[1].focus(); return; }
    var p = S.post, dir = 'blog/' + p.slug + '/';
    var rows = [[dir + 'index.html', '文章页'], [dir + 'post.md', fmtSize(new Blob([postMd(p, ui.md.value)]).size)]];
    usedUploads().forEach(function (path) { rows.push([dir + path, fmtSize(S.pending[path].size)]); });
    rows.push([CFG.list, '文章列表'], [CFG.home, '首页卡片']);
    ui.pubList.innerHTML = rows.map(function (r) { return '<li><span>' + escText(r[0]) + '</span><span>' + escText(r[1]) + '</span></li>'; }).join('');
    ui.pubMsg.value = (p.isNew ? '发布博客：' : '更新博客：') + p.title;
    ui.pubBranch.textContent = S.branch;
    ui.pubErr.hidden = true;
    ui.pubOk.disabled = false;
    ui.pub.hidden = false;
    ui.pubMsg.focus();
  }
  // 基于分支最新版本生成要提交的文件：首页和文章列表都以仓库里的最新内容为底，只改博客相关的部分
  function buildPost(head) {
    var p = S.post, dir = 'blog/' + p.slug + '/', md = ui.md.value;
    return Promise.all([getText(CFG.home, head), getText(CFG.list, head), getText(dir + 'post.md', head)]).then(function (r) {
      var home = r[0], list = r[1], cur = r[2];
      if (!home) throw new Error('仓库里找不到 index.html。');
      if (p.isNew && cur) throw new Error('链接名「' + p.slug + '」已被占用，请换一个。');
      if (!p.isNew && (cur ? cur.sha : null) !== p.sha) throw conflictError('这篇文章在你打开之后被改过（可能是在另一台设备上）。');
      var posts = parseList(list ? list.text : '[]').filter(function (x) { return x.slug !== p.slug; });
      posts.push(entry(p));
      sortPosts(posts);
      var files = [
        { path: dir + 'index.html', text: pageHtml(p, renderPost(md)) },
        { path: dir + 'post.md', text: postMd(p, md) }
      ];
      usedUploads().forEach(function (path) { files.push({ path: dir + path, blob: S.pending[path] }); });
      files.push({ path: CFG.list, text: listJson(posts) }, { path: CFG.home, text: homeHtml(home.text, posts) });
      return { files: files, posts: posts };
    });
  }
  function confirmPublish() {
    var p = S.post, msg = ui.pubMsg.value.trim() || '更新博客文章', oldKey = draftKey(), snap = snapshot();
    ui.pubOk.disabled = true;
    ui.pubErr.hidden = true;
    return commit(buildPost, msg).then(function (res) {
      p.isNew = false;
      p.sha = res.shas['blog/' + p.slug + '/post.md'];
      S.posts = res.posts;
      S.pending = {};  // 已经在仓库里了；预览继续用本地 blob 地址显示这些图片
      clearDraft(oldKey);
      S.baseline = snap;
      S.dirty = snapshot() !== snap;  // 发布过程中又改过的内容仍算未发布
      ui.pub.hidden = true;
      syncPublished();
      ui.publish.disabled = !S.dirty;
      idleStatus();
      toast('发布成功，网站一般 1 分钟内更新。<a href="/blog/' + p.slug + '/" target="_blank" rel="noopener">打开文章</a> · ' +
        '<a href="https://github.com/' + CFG.repo + '/commit/' + res.sha + '" target="_blank" rel="noopener">查看提交</a>', true);
    }, function (err) {
      ui.pubErr.textContent = err.message;
      ui.pubErr.hidden = false;
      ui.pubOk.disabled = !!err.conflict;
      idleStatus();
    });
  }

  function deletePost(slug) {
    var meta = S.posts.filter(function (x) { return x.slug === slug; })[0];
    if (!meta || S.busy) return Promise.resolve();
    if (!S.user) { openLogin('删除前需要先连接 GitHub。'); return Promise.resolve(); }
    if (!confirm('确定删除「' + meta.title + '」吗？\n文章页、图片和首页卡片都会从网站上删除（GitHub 的提交历史里仍能找回）。')) return Promise.resolve();
    var dir = 'blog/' + slug + '/';
    return commit(function (head, tree) {
      return Promise.all([getText(CFG.home, head), getText(CFG.list, head)]).then(function (r) {
        if (!r[0]) throw new Error('仓库里找不到 index.html。');
        var posts = parseList(r[1] ? r[1].text : '[]').filter(function (x) { return x.slug !== slug; });
        var deletes = tree.filter(function (e) { return e.type === 'blob' && e.path.indexOf(dir) === 0; }).map(function (e) { return e.path; });
        return { posts: posts, deletes: deletes, files: [{ path: CFG.list, text: listJson(posts) }, { path: CFG.home, text: homeHtml(r[0].text, posts) }] };
      });
    }, '删除博客：' + meta.title, true).then(function (res) {
      S.posts = res.posts;
      clearDraft(DRAFT + slug);
      toast('已删除「' + meta.title + '」，网站一般 1 分钟内更新');
      if (S.view === 'edit') { S.dirty = false; return showList(); }
      renderList();
    }, function (err) { toast(err.message); idleStatus(); });
  }
  // 一次提交：读分支最新版本 → build 生成文件 → 上传 → 只在分支没被推进时更新（不强推）；恰好有新提交时自动基于新版本重来一次
  function commit(build, message, needTree, retried) {
    var head, base, built, shas = {};
    setBusy(true);
    setStatus('正在检查线上版本…');
    return headSha().then(function (h) {
      head = h;
      return gh('GET', REPO + '/git/commits/' + head);
    }).then(function (c) {
      base = c.tree.sha;
      return needTree ? gh('GET', REPO + '/git/trees/' + base + '?recursive=1') : null;
    }).then(function (tree) {
      if (tree && tree.truncated) throw new Error('仓库文件太多，无法读取完整目录。');
      return build(head, tree ? tree.tree : []);
    }).then(function (b) {
      built = b;
      var entries = [], chain = Promise.resolve();
      b.files.forEach(function (f, i) {
        chain = chain.then(function () {
          setStatus('正在上传 ' + (i + 1) + '/' + b.files.length + '：' + f.path);
          var data = f.text != null ? Promise.resolve(bytesToB64(new TextEncoder().encode(f.text)))
            : f.blob.arrayBuffer().then(function (buf) { return bytesToB64(new Uint8Array(buf)); });
          return data.then(function (content) { return gh('POST', REPO + '/git/blobs', { content: content, encoding: 'base64' }); });
        }).then(function (blob) {
          shas[f.path] = blob.sha;
          entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
        });
      });
      (b.deletes || []).forEach(function (path) { entries.push({ path: path, mode: '100644', type: 'blob', sha: null }); });
      return chain.then(function () {
        setStatus('正在提交…');
        return gh('POST', REPO + '/git/trees', { base_tree: base, tree: entries });
      });
    }).then(function (t) {
      return gh('POST', REPO + '/git/commits', { message: message, tree: t.sha, parents: [head] });
    }).then(function (c) {
      return gh('PATCH', REPO + '/git/refs/heads/' + encPath(S.branch), { sha: c.sha, force: false }).then(function () {
        setBusy(false);
        return { sha: c.sha, shas: shas, posts: built.posts };
      });
    }).catch(function (err) {
      setBusy(false);
      if (!retried && !err.conflict && (err.status === 409 || (err.status === 422 && /fast.?forward/i.test(err.raw || '')))) {
        return commit(build, message, needTree, true);
      }
      throw err;
    });
  }

  /* ---------- 登录（和网站编辑器共用 token） ---------- */
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
      if (S.view === 'list') return loadList();
      idleStatus();
    }, function (err) {
      S.token = '';
      ui.loginErr.textContent = err.message;
      ui.loginErr.hidden = false;
    }).then(function () { ui.loginOk.disabled = false; });
  }
  function logout() {
    localStorage.removeItem(CFG.tokenKey);
    sessionStorage.removeItem(CFG.tokenKey);
    S.token = S.user = '';
    ui.account.textContent = '登录';
    ui.login.hidden = true;
    if (S.view === 'list') renderList();
    idleStatus();
    toast('已退出，这台设备上保存的 token 已删除');
  }

  /* ---------- 启动 ---------- */
  function init() {
    // 防止编辑器被别的网站嵌入后诱导点击
    if (window.top !== window.self && !LOCALHOST) { document.body.textContent = '出于安全考虑，编辑器不能被嵌入其他页面打开。'; return; }
    ui.newBtn.addEventListener('click', function () { openPost(null); });
    ui.list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-edit],[data-del]');
      if (!b || b.disabled) return;
      if (b.hasAttribute('data-edit')) openPost(+b.getAttribute('data-edit'));
      else deletePost(S.posts[+b.getAttribute('data-del')].slug);
    });
    ui.back.addEventListener('click', showList);
    [ui.title, ui.date, ui.slug].forEach(function (el) { el.addEventListener('input', onField); });
    ui.md.addEventListener('input', changed);
    ui.md.addEventListener('keydown', onMdKey);
    ui.md.addEventListener('paste', onPaste);
    ui.md.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); ui.md.classList.add('drop'); }
    });
    ui.md.addEventListener('dragleave', function () { ui.md.classList.remove('drop'); });
    ui.md.addEventListener('drop', onDrop);
    ui.md.addEventListener('scroll', syncScroll);
    // 点工具栏按钮时不让正文失去选区
    ui.toolbar.addEventListener('mousedown', function (e) { if (e.target.closest('[data-md]')) e.preventDefault(); });
    ui.toolbar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-md]'), fn = b && MD[b.getAttribute('data-md')];
      if (fn) { setTab('edit'); fn(); }
    });
    document.querySelectorAll('.tabs [data-tab]').forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); }); });
    ui.cover.addEventListener('click', chooseCover);
    ui.coverDel.addEventListener('click', removeCover);
    ui.del.addEventListener('click', function () { if (S.post && !S.post.isNew) deletePost(S.post.slug); });
    ui.publish.addEventListener('click', openPublish);
    ui.pubOk.addEventListener('click', confirmPublish);
    ui.pubCancel.addEventListener('click', function () { if (!S.busy) ui.pub.hidden = true; });
    ui.account.addEventListener('click', function () { openLogin(); });
    ui.loginOk.addEventListener('click', doLogin);
    ui.token.addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    ui.loginSkip.addEventListener('click', function () { ui.login.hidden = true; });
    ui.logout.addEventListener('click', logout);
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase(), mod = e.metaKey || e.ctrlKey;
      if (k === 'escape') {
        if (!ui.pub.hidden) { if (!S.busy) ui.pub.hidden = true; }
        else if (!ui.login.hidden) ui.login.hidden = true;
      } else if (mod && k === 's') { e.preventDefault(); openPublish(); }
    });
    window.addEventListener('beforeunload', function (e) {
      if (S.view === 'edit' && S.dirty) saveDraft();
      if ((S.view === 'edit' && S.dirty) || S.busy) { e.preventDefault(); e.returnValue = ''; }
    });
    // 手机上切到别的应用时页面可能被回收，先存一次草稿
    document.addEventListener('visibilitychange', function () { if (document.hidden && S.view === 'edit' && S.dirty) saveDraft(); });

    var boot = S.token ? connect(S.token).then(noop, function (err) {
      if (err.status === 401) { localStorage.removeItem(CFG.tokenKey); sessionStorage.removeItem(CFG.tokenKey); }
      S.token = '';
      return err;
    }) : Promise.resolve();
    boot.then(function (err) {
      return loadList().then(function () { if (!S.user) openLogin(err ? err.message : ''); });
    });
  }

  if (LOCALHOST) {
    // 本地测试用
    window.HXBlog = {
      state: S, renderPost: renderPost, pageHtml: pageHtml, cardHtml: cardHtml, homeHtml: homeHtml, postMd: postMd, parsePostMd: parsePostMd,
      prepareImage: prepareImage, insertImages: insertImages, openPost: openPost, showList: showList, loadList: loadList,
      openPublish: openPublish, confirmPublish: confirmPublish, deletePost: deletePost, updatePreview: updatePreview,
      saveDraft: saveDraft, changed: changed, MD: MD, addPending: addPending, syncCover: syncCover
    };
  }
  init();
})();
