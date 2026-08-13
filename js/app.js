/* =====================================================================
 *  app.js  —  渲染、设置与「网站后台编辑」逻辑（Vercel 全栈版）
 *  · 内容来自后端 /api（首次自动用 js/content.js 初始化）
 *  · 想在线改内容 → 点左下角 ✎ 管理，登录后改动实时保存到服务器
 *  · 想换默认样式 → css/style.css 或点右下角⚙设置
 * ===================================================================== */

/* ---------- 背景预设（设置面板里的色板） ---------- */
const BG_PRESETS = {
  "晨雾": "linear-gradient(120deg, #a8c0ff 0%, #c2e9fb 100%)",
  "晚霞": "linear-gradient(120deg, #fbc2eb 0%, #fda085 100%)",
  "薄荷": "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)",
  "极光": "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
  "紫梦": "linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)",
  "暗夜": "radial-gradient(circle at 30% 20%, #2a2a55 0%, #0f1024 60%, #06070f 100%)",
};

/* ---------- 默认设置 ---------- */
const DEFAULTS = {
  accent: "#6c8cff", blur: 16, glass: 0.45, bgPreset: "晨雾", bgImage: "", dark: false,
};
const STORE_KEY = "yfmyzj-blog-settings";
const LAYOUT_KEY = "yfmyzj-blog-layout";
const TOKEN_KEY = "yfmyzj-blog-token";

let settings = loadSettings();
let current = "all";        // 当前板块
let editMode = false;       // 是否处于编辑模式
let loggedIn = false;       // 是否已登录管理员
let token = "";              // 登录令牌（用于写接口授权）

/* ---------- 内容（初始用 content.js 兜底，加载后由后端覆盖） ---------- */
let site = (typeof SITE !== "undefined") ? Object.assign({}, SITE) : {
  name: "一分没有真君", handle: "yfmyzj", tagline: "", avatar: "", bio: "", socials: [], sections: []
};
let posts = (typeof POSTS !== "undefined") ? POSTS.slice() : [];

/* ---------- 自由布局（自定义大小 / 位置） ---------- */
const LAYOUT_IDS = ["nav", "hero", "about", "settings", "gear", "adminBtn", "adminBar"];
let layoutData = loadLayout();
let layoutMode = false;
function loadLayout() { try { const r = localStorage.getItem(LAYOUT_KEY); return r ? JSON.parse(r) : {}; } catch (e) { return {}; } }
function saveLayout() { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layoutData)); } catch (e) {} }

/* ---------- 工具：读取/保存本地偏好（设置与布局只存本机） ---------- */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (e) {}
  return Object.assign({}, DEFAULTS);
}
function saveSettings() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
  // 登录后把样式同步到后端 site.settings，让其他访客也能看到
  if (token && site && site.name) {
    clearTimeout(window._syncSettingsTimer);
    window._syncSettingsTimer = setTimeout(async () => {
      site.settings = { ...settings };
      await apiSaveSite();
    }, 600);
  }
}
function loadToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
}
function saveToken(t) {
  token = t || "";
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

/* ---------- 后端交互 ---------- */
async function apiGetState() {
  try {
    const [s, p] = await Promise.all([
      fetch("/api/site").then((r) => r.json()),
      fetch("/api/posts").then((r) => r.json()),
    ]);
    return { site: s, posts: Array.isArray(p) ? p : [] };
  } catch (e) { return null; }
}
async function apiLogin(user, pass) {
  const r = await fetch("/api/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, pass }),
  });
  if (r.ok) { const j = await r.json(); saveToken(j.token); return true; }
  return false;
}
async function apiSavePost(data, isEdit) {
  const headers = { "Content-Type": "application/json", "x-auth-token": token };
  let r;
  if (isEdit) r = await fetch("/api/post?id=" + data.id, { method: "PUT", headers, body: JSON.stringify(data) });
  else r = await fetch("/api/posts", { method: "POST", headers, body: JSON.stringify(data) });
  if (!r.ok) { await handleAuthFail(r); return false; }
  const np = await r.json();
  if (isEdit) { const i = posts.findIndex((x) => x.id === data.id); if (i >= 0) posts[i] = data; }
  else posts.unshift(np);
  return true;
}
async function apiDeletePost(id) {
  const r = await fetch("/api/post?id=" + id, { method: "DELETE", headers: { "x-auth-token": token } });
  if (!r.ok) { await handleAuthFail(r); return; }
  posts = posts.filter((x) => x.id !== id);
}
async function apiSaveSite() {
  const r = await fetch("/api/site", {
    method: "PUT", headers: { "Content-Type": "application/json", "x-auth-token": token },
    body: JSON.stringify(site),
  });
  if (!r.ok) { await handleAuthFail(r); return false; }
  return true;
}
async function handleAuthFail(res) {
  if (res && res.status === 401) {
    saveToken(""); loggedIn = false; editMode = false;
    updateGear(); renderHero(); renderAdminBar(); renderContent();
    alert("登录已失效，请重新登录。");
  }
}

function updateGear() {
  const g = document.getElementById("gear");
  if (g) g.style.display = loggedIn ? "" : "none";
}

/* ---------- 应用设置到页面 ---------- */
function applySettings() {
  const root = document.documentElement;
  const body = document.body;
  root.style.setProperty("--accent", settings.accent);
  root.style.setProperty("--glass-blur", settings.blur + "px");
  const g = settings.dark ? `rgba(18,22,38,${settings.glass})` : `rgba(255,255,255,${settings.glass})`;
  body.style.setProperty("--glass-bg", g);
  body.classList.toggle("dark", settings.dark);
  if (settings.bgImage && settings.bgImage.trim()) {
    body.style.backgroundImage = `url("${settings.bgImage.trim()}")`;
    body.setAttribute("data-bg", "image");
  } else {
    body.style.backgroundImage = BG_PRESETS[settings.bgPreset] || BG_PRESETS["晨雾"];
    body.setAttribute("data-bg", "gradient");
  }
}

/* ---------- 工具：转义 / 日期 ---------- */
const escAttr = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escHtml = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function today() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function download(name, text, type) {
  const blob = new Blob([text], { type: type || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- 轻量 Markdown → HTML ---------- */
function mdToHtml(md) {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inList = null;
  const closeList = () => { if (inList) { html += `</${inList}>`; inList = null; } };
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (t) => esc(t)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  for (let line of lines) {
    if (/^\s*$/.test(line)) { closeList(); continue; }
    let h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { closeList(); const lv = h[1].length; html += `<h${lv}>${inline(h[2])}</h${lv}>`; continue; }
    if (/^\s*---\s*$/.test(line)) { closeList(); html += "<hr>"; continue; }
    let bq = line.match(/^>\s?(.*)$/);
    if (bq) { closeList(); html += `<blockquote>${inline(bq[1])}</blockquote>`; continue; }
    let ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) { if (inList !== "ul") { closeList(); html += "<ul>"; inList = "ul"; } html += `<li>${inline(ul[1])}</li>`; continue; }
    let ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) { if (inList !== "ol") { closeList(); html += "<ol>"; inList = "ol"; } html += `<li>${inline(ol[1])}</li>`; continue; }
    closeList();
    html += `<p>${inline(line)}</p>`;
  }
  closeList();
  return html;
}

/* ---------- 板块名映射 ---------- */
const sectionName = (id) => { const s = (site.sections || []).find((x) => x.id === id); return s ? s.name : id; };

/* ---------- 渲染导航 ---------- */
function renderNav() {
  const tabs = [{ id: "all", name: "全部", icon: "✦" }].concat(site.sections || []);
  const nav = document.getElementById("nav");
  nav.innerHTML =
    `<div class="brand">${site.name}<span class="handle">@${site.handle}</span></div>` +
    `<div class="tabs">` +
    tabs.map((t) => `<button class="tab gbtn ${t.id === current ? "active" : ""}" data-id="${t.id}">${t.icon} ${t.name}</button>`).join("") +
    `</div>`;
  nav.querySelectorAll(".tab").forEach((b) =>
    b.addEventListener("click", () => { current = b.dataset.id; renderNav(); renderContent(); })
  );
}

/* ---------- 渲染英雄区 ---------- */
function renderHero() {
  const h = document.getElementById("hero");
  h.innerHTML =
    `<img class="avatar" src="${site.avatar}" alt="${site.name}">` +
    `<h1>${site.name}</h1>` +
    `<div class="tagline">${site.tagline}</div>` +
    (loggedIn ? `<div style="font-size:12px;color:var(--muted);margin-top:8px;">点击头像即可更换</div>` : "");
  if (loggedIn) {
    const av = h.querySelector(".avatar");
    if (av) {
      av.style.cursor = "pointer";
      av.title = "点击更换头像 / 站点信息";
      av.addEventListener("click", openSiteForm);
    }
  }
}

/* ---------- 渲染关于页 ---------- */
function renderAbout() {
  const a = document.getElementById("about");
  const socials = (site.socials || [])
    .map((s) => `<a class="glass" href="${s.url}" target="_blank" rel="noopener">${s.icon} ${s.name}</a>`)
    .join("");
  a.innerHTML =
    `<h2>关于我</h2>` +
    `<div class="bio">${site.bio}</div>` +
    (socials ? `<div class="socials">${socials}</div>` : "");
}

/* ---------- 渲染内容（网格 / 关于） ---------- */
function renderContent() {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const about = document.getElementById("about");

  if (current === "about") {
    grid.style.display = "none"; empty.style.display = "none"; about.style.display = "block"; return;
  }
  about.style.display = "none"; grid.style.display = "grid";

  let list = posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (current !== "all") list = list.filter((p) => p.section === current);

  if (!list.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  grid.innerHTML = list.map((p) => {
    const excerpt = p.excerpt || p.content.replace(/[#>*`\-\[\]!]/g, "").slice(0, 50) + "…";
    const actions = editMode
      ? `<div class="card-actions">
           <button class="ca edit" data-edit="${p.id}" title="编辑">✎</button>
           <button class="ca del" data-del="${p.id}" title="删除">🗑</button>
         </div>`
      : "";
    return (
      `<article class="card glass" data-id="${p.id}">` +
      (p.cover ? `<img class="cover" src="${p.cover}" alt="${p.title}" loading="lazy">` : "") +
      `<div class="body">` +
      `<div class="meta"><span class="tag">${sectionName(p.section)}</span><span>${p.date}</span></div>` +
      `<h3>${p.title}</h3>` +
      `<p class="excerpt">${excerpt}</p>` +
      `</div>${actions}</article>`
    );
  }).join("");

  grid.querySelectorAll(".card").forEach((c) =>
    c.addEventListener("click", () => {
      const post = posts.find((p) => p.id === Number(c.dataset.id));
      if (post) openModal(post);
    })
  );
  grid.querySelectorAll(".ca.edit").forEach((b) =>
    b.addEventListener("click", (e) => { e.stopPropagation(); openPostForm(Number(b.dataset.edit)); })
  );
  grid.querySelectorAll(".ca.del").forEach((b) =>
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm("确定删除这篇内容？")) { await apiDeletePost(Number(b.dataset.del)); renderContent(); }
    })
  );

  if (layoutMode) applyCardsFree();
}

/* ---------- 详情弹窗 ---------- */
function openModal(post) {
  const root = document.getElementById("modalRoot");
  root.innerHTML =
    `<div class="modal-backdrop" id="backdrop">` +
    `<div class="modal glass">` +
    `<button class="close" id="closeModal" title="关闭">×</button>` +
    (post.cover ? `<img class="cover-full" src="${post.cover}" alt="${post.title}">` : "") +
    `<div class="meta"><span class="tag">${sectionName(post.section)}</span><span>${post.date}</span></div>` +
    `<h1>${post.title}</h1>` +
    `<div class="content">${mdToHtml(post.content)}</div>` +
    `</div></div>`;
  const close = () => (root.innerHTML = "");
  document.getElementById("closeModal").addEventListener("click", close);
  document.getElementById("backdrop").addEventListener("click", (e) => { if (e.target.id === "backdrop") close(); });
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
  const modalEl = document.querySelector("#modalRoot .modal");
  if (modalEl) enableModalFree(modalEl, "modal-view");
}

/* ---------- 表单弹窗（新建/编辑内容 或 站点信息） ---------- */
function openForm(html, bind, key) {
  const root = document.getElementById("formRoot");
  root.innerHTML = `<div class="modal-backdrop" id="formBackdrop"><div class="modal glass">${html}</div></div>`;
  const modalEl = root.querySelector(".modal");
  if (modalEl) enableModalFree(modalEl, key || "modal");
  const close = () => (root.innerHTML = "");
  const backdrop = document.getElementById("formBackdrop");
  backdrop.addEventListener("click", (e) => { if (e.target.id === "formBackdrop") close(); });
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
  bind(close);
}

/* 把本地图片文件读成 data URL */
function fileToDataURL(file, cb) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

/* ---------- 内容表单 ---------- */
function openPostForm(id) {
  const isEdit = id != null;
  const p = isEdit ? posts.find((x) => x.id === id) : null;
  const draft = p || {
    section: (current !== "all" && current !== "about") ? current : ((site.sections || []).find((s) => s.id !== "about") || {}).id || "writing",
    title: "", date: today(), cover: "", excerpt: "", content: "",
  };
  const sectionOpts = (site.sections || [])
    .filter((s) => s.id !== "about")
    .map((s) => `<option value="${s.id}" ${s.id === draft.section ? "selected" : ""}>${s.name}</option>`)
    .join("");

  const html =
    `<button class="close" id="fClose">×</button>` +
    `<h1>${isEdit ? "编辑内容" : "新建内容"}</h1>` +
    `<div class="field"><label>板块</label><select id="f_section">${sectionOpts}</select></div>` +
    `<div class="field"><label>标题</label><input id="f_title" value="${escAttr(draft.title)}" placeholder="给这篇起个名字"></div>` +
    `<div class="field"><label>日期</label><input type="date" id="f_date" value="${escAttr(draft.date)}"></div>` +
    `<div class="field"><label>封面图（路径或网址，可上传）</label>` +
      `<input id="f_cover" value="${escAttr(draft.cover)}" placeholder="images/xxx.jpg 或 网络地址">` +
      `<input type="file" id="f_coverFile" accept="image/*"></div>` +
    `<div class="field"><label>摘要（可空，留空自动截取）</label><input id="f_excerpt" value="${escAttr(draft.excerpt)}"></div>` +
    `<div class="field"><label>正文（支持 Markdown，可上传图片）</label>` +
      `<textarea id="f_content" rows="10">${escHtml(draft.content)}</textarea>` +
      `<input type="file" id="f_imgFile" accept="image/*"></div>` +
    `<div class="row" style="margin-top:16px; gap:10px;">` +
      `<button class="btn reset" id="f_save">保存</button>` +
      `<button class="btn" id="f_cancel" style="background:rgba(127,127,127,0.25)">取消</button>` +
    `</div>`;

  openForm(html, (close) => {
    const $ = (s) => document.getElementById(s);
    $("fClose").addEventListener("click", close);
    $("f_cancel").addEventListener("click", close);
    $("f_coverFile").addEventListener("change", (e) => fileToDataURL(e.target.files[0], (u) => ($("f_cover").value = u)));
    $("f_imgFile").addEventListener("change", (e) => fileToDataURL(e.target.files[0], (u) => {
      const ta = $("f_content"); ta.value += (ta.value && !ta.value.endsWith("\n") ? "\n" : "") + `![图片](${u})` + "\n";
    }));
    $("f_save").addEventListener("click", async () => {
      const data = {
        section: $("f_section").value,
        title: $("f_title").value.trim() || "无标题",
        date: $("f_date").value || today(),
        cover: $("f_cover").value.trim(),
        excerpt: $("f_excerpt").value.trim(),
        content: $("f_content").value,
      };
      if (isEdit) data.id = id;
      const ok = await apiSavePost(data, isEdit);
      if (ok) { close(); renderContent(); }
      else alert("保存失败，请检查登录状态或网络。");
    });
  }, "modal-post");
}

/* ---------- 站点信息表单 ---------- */
function openSiteForm() {
  const html =
    `<button class="close" id="sClose">×</button>` +
    `<h1>站点信息</h1>` +
    `<div class="field"><label>站点名</label><input id="s_name" value="${escAttr(site.name)}"></div>` +
    `<div class="field"><label>简称 / 后缀</label><input id="s_handle" value="${escAttr(site.handle)}"></div>` +
    `<div class="field"><label>签名</label><input id="s_tagline" value="${escAttr(site.tagline)}"></div>` +
    `<div class="field"><label>头像（路径或网址，可上传）</label>` +
      `<input id="s_avatar" value="${escAttr(site.avatar)}"><input type="file" id="s_avatarFile" accept="image/*"></div>` +
    `<div class="field"><label>关于我（简介，支持换行）</label><textarea id="s_bio" rows="5">${escHtml(site.bio)}</textarea></div>` +
    `<div class="row" style="margin-top:16px; gap:10px;">` +
      `<button class="btn reset" id="s_save">保存</button>` +
      `<button class="btn" id="s_cancel" style="background:rgba(127,127,127,0.25)">取消</button>` +
    `</div>`;
  openForm(html, (close) => {
    const $ = (s) => document.getElementById(s);
    $("sClose").addEventListener("click", close);
    $("s_cancel").addEventListener("click", close);
    $("s_avatarFile").addEventListener("change", (e) => fileToDataURL(e.target.files[0], (u) => ($("s_avatar").value = u)));
    $("s_save").addEventListener("click", async () => {
      site.name = $("s_name").value.trim() || site.name;
      site.handle = $("s_handle").value.trim() || site.handle;
      site.tagline = $("s_tagline").value.trim();
      site.avatar = $("s_avatar").value.trim() || site.avatar;
      site.bio = $("s_bio").value;
      const ok = await apiSaveSite();
      if (ok) { close(); renderNav(); renderHero(); renderAbout(); }
      else alert("保存失败，请检查登录状态或网络。");
    });
  }, "modal-site");
}

/* ---------- 备份（下载当前数据，作为个人离线备份） ---------- */
function exportBackup() {
  download("blog-backup.json", JSON.stringify({ site, posts }, null, 2), "application/json");
}

/* ---------- 编辑模式工具条 ---------- */
function renderAdminBar() {
  const bar = document.getElementById("adminBar");
  if (!editMode) { bar.style.display = "none"; bar.innerHTML = ""; return; }
  bar.style.display = "flex";
  bar.innerHTML =
    `<span class="ab-tip">✎ 编辑模式 · 改动已实时保存到服务器，所有人立即可见</span>` +
    `<button class="btn" id="ab_new">＋ 新建</button>` +
    `<button class="btn" id="ab_site">站点信息</button>` +
    `<button class="btn" id="ab_layout">${layoutMode ? "🧩 完成布局" : "🧩 布局"}</button>` +
    `<button class="btn" id="ab_resetLayout">重置布局</button>` +
    `<button class="btn" id="ab_backup">备份JSON</button>` +
    `<button class="btn" id="ab_exit">退出登录</button>`;
  document.getElementById("ab_new").addEventListener("click", () => openPostForm(null));
  document.getElementById("ab_site").addEventListener("click", openSiteForm);
  document.getElementById("ab_backup").addEventListener("click", exportBackup);
  document.getElementById("ab_exit").addEventListener("click", () => {
    saveToken(""); loggedIn = false; editMode = false;
    updateGear(); renderHero(); renderAdminBar(); renderContent();
  });
  document.getElementById("ab_layout").addEventListener("click", () => {
    if (layoutMode) exitLayoutMode(); else enterLayoutMode();
    renderAdminBar();
  });
  document.getElementById("ab_resetLayout").addEventListener("click", resetLayout);
}

/* ==================== 自由布局：拖拽 / 缩放 ==================== */
function applyFree(el, L, mode) {
  el.classList.add("free");
  if (mode === "abs") el.classList.add("free-abs");
  el.style.position = mode === "abs" ? "absolute" : "fixed";
  if (L.left != null) el.style.left = L.left + "px";
  if (L.top != null) el.style.top = L.top + "px";
  if (L.width != null) el.style.width = L.width + "px";
  if (L.height != null) el.style.height = L.height + "px";
}
function removeFree(el) {
  el.classList.remove("free", "free-abs");
  el.style.position = ""; el.style.left = ""; el.style.top = "";
  el.style.width = ""; el.style.height = "";
  clearHandles(el);
}
function clearHandles(el) {
  el.querySelectorAll(".free-bar, .free-resize").forEach((n) => n.remove());
}
function makeHandles(el, key) {
  clearHandles(el);
  const bar = document.createElement("div");
  bar.className = "free-bar"; bar.textContent = "⠿ 拖动";
  bar.addEventListener("click", (e) => e.stopPropagation());
  const rz = document.createElement("div");
  rz.className = "free-resize";
  rz.addEventListener("click", (e) => e.stopPropagation());
  el.appendChild(bar); el.appendChild(rz);
  bar.addEventListener("pointerdown", (e) => startMove(e, el, key));
  rz.addEventListener("pointerdown", (e) => startResize(e, el, key));
}
function startMove(e, el, key) {
  e.preventDefault();
  const L = layoutData[key] || (layoutData[key] = {});
  const abs = el.classList.contains("free-abs");
  const rect = el.getBoundingClientRect();
  const parentRect = abs ? el.parentElement.getBoundingClientRect() : null;
  const startX = e.clientX, startY = e.clientY;
  const ox = rect.left, oy = rect.top;
  function move(ev) {
    let nx = ox + (ev.clientX - startX);
    let ny = oy + (ev.clientY - startY);
    if (abs) { nx -= parentRect.left; ny -= parentRect.top; }
    L.left = Math.round(nx); L.top = Math.round(ny);
    applyFree(el, L, abs ? "abs" : "fixed");
  }
  function up() {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    saveLayout();
  }
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}
function startResize(e, el, key) {
  e.preventDefault(); e.stopPropagation();
  const L = layoutData[key] || (layoutData[key] = {});
  const rect = el.getBoundingClientRect();
  const startX = e.clientX, startY = e.clientY;
  const ow = rect.width, oh = rect.height;
  const abs = el.classList.contains("free-abs");
  function move(ev) {
    L.width = Math.max(120, Math.round(ow + (ev.clientX - startX)));
    L.height = Math.max(60, Math.round(oh + (ev.clientY - startY)));
    applyFree(el, L, abs ? "abs" : "fixed");
  }
  function up() {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    saveLayout();
  }
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
}
function captureCardObj(c) {
  const r = c.getBoundingClientRect();
  const pr = c.parentElement.getBoundingClientRect();
  return { left: r.left - pr.left, top: r.top - pr.top, width: r.width, height: r.height };
}
function applyCardsFree() {
  document.querySelectorAll(".grid .card").forEach((c) => {
    const key = "card-" + c.dataset.id;
    if (!layoutData[key]) layoutData[key] = captureCardObj(c);
    applyFree(c, layoutData[key], "abs");
    makeHandles(c, key);
  });
}
function enterLayoutMode() {
  layoutMode = true;
  document.body.classList.add("layout-mode");
  LAYOUT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || (id === "about" && el.style.display === "none")) return;
    if (!layoutData[id]) {
      const r = el.getBoundingClientRect();
      layoutData[id] = { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    }
    applyFree(el, layoutData[id], "fixed");
    makeHandles(el, id);
  });
  applyCardsFree();
}
function exitLayoutMode() {
  layoutMode = false;
  document.body.classList.remove("layout-mode");
  LAYOUT_IDS.forEach((id) => { const el = document.getElementById(id); if (el) removeFree(el); });
  document.querySelectorAll(".grid .card").forEach((c) => removeFree(c));
  renderContent();
}
function resetLayout() {
  layoutData = {};
  saveLayout();
  if (layoutMode) exitLayoutMode();
  else {
    LAYOUT_IDS.forEach((id) => { const el = document.getElementById(id); if (el) removeFree(el); });
    document.querySelectorAll(".grid .card").forEach((c) => removeFree(c));
  }
  renderNav(); renderHero(); renderAbout(); renderContent(); renderSettings(); renderAdminBar();
}
function enableModalFree(modalEl, key) {
  const L = layoutData[key] || {};
  if (L.left == null) {
    const r = modalEl.getBoundingClientRect();
    L.left = Math.round(r.left); L.top = Math.round(r.top);
    L.width = Math.round(r.width); L.height = Math.round(r.height);
    layoutData[key] = L;
  }
  applyFree(modalEl, L, "fixed");
  makeHandles(modalEl, key);
}

/* ---------- 管理员登录弹窗 ---------- */
function openLogin() {
  const html =
    `<button class="close" id="lClose">×</button>` +
    `<h1>管理员登录</h1>` +
    `<div class="field"><label>账户</label><input id="l_user" placeholder="admin" autocomplete="username"></div>` +
    `<div class="field"><label>密码</label><input id="l_pass" type="password" placeholder="••••••••" autocomplete="current-password"></div>` +
    `<div id="l_err" style="color:#e2574c;font-size:13px;min-height:18px;"></div>` +
    `<div class="row" style="margin-top:8px;gap:10px;">` +
      `<button class="btn reset" id="l_ok">登录</button>` +
      `<button class="btn" id="l_cancel" style="background:rgba(127,127,127,0.25)">取消</button>` +
    `</div>`;
  openForm(html, (close) => {
    const $ = (s) => document.getElementById(s);
    const tryLogin = async () => {
      const ok = await apiLogin($("l_user").value.trim(), $("l_pass").value);
      if (ok) {
        loggedIn = true;
        close(); updateGear(); editMode = true; renderHero(); renderAdminBar(); renderContent();
      } else {
        $("l_err").textContent = "账户或密码错误";
      }
    };
    $("lClose").addEventListener("click", close);
    $("l_cancel").addEventListener("click", close);
    $("l_ok").addEventListener("click", tryLogin);
    $("l_pass").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
  }, "modal-login");
}

/* ---------- 设置面板 ---------- */
function renderSettings() {
  const panel = document.getElementById("settings");
  const swatches = Object.keys(BG_PRESETS)
    .map((name) => `<div class="swatch ${name === settings.bgPreset && !settings.bgImage ? "sel" : ""}" data-bg="${name}" title="${name}" style="background:${BG_PRESETS[name]}"></div>`)
    .join("");
  panel.innerHTML =
    `<h4>背景</h4><div class="swatches">${swatches}</div>` +
    `<div class="row" style="margin-top:10px;"><input type="text" id="bgImg" placeholder="粘贴图片网址作背景" value="${settings.bgImage || ""}"></div>` +
    `<button class="btn" id="applyImg">应用背景图</button>` +
    `<h4>主题色</h4><div class="row"><label>强调色</label><input type="color" id="accent" value="${settings.accent}"></div>` +
    `<h4>玻璃效果</h4>` +
    `<div class="row"><label>模糊</label><input type="range" id="blur" min="0" max="30" step="1" value="${settings.blur}"></div>` +
    `<div class="row"><label>透明度</label><input type="range" id="glass" min="0.1" max="0.9" step="0.05" value="${settings.glass}"></div>` +
    `<h4>外观</h4><div class="row"><label>深色模式</label><div class="toggle ${settings.dark ? "on" : ""}" id="darkToggle"></div></div>` +
    `<button class="btn reset" id="resetBtn">恢复默认</button>`;

  panel.querySelectorAll(".swatch").forEach((s) => s.addEventListener("click", () => {
    settings.bgImage = ""; settings.bgPreset = s.dataset.bg; saveSettings(); applySettings(); renderSettings();
  }));
  panel.querySelector("#applyImg").addEventListener("click", () => { settings.bgImage = panel.querySelector("#bgImg").value.trim(); saveSettings(); applySettings(); renderSettings(); });
  panel.querySelector("#accent").addEventListener("input", (e) => { settings.accent = e.target.value; saveSettings(); applySettings(); });
  panel.querySelector("#blur").addEventListener("input", (e) => { settings.blur = Number(e.target.value); saveSettings(); applySettings(); });
  panel.querySelector("#glass").addEventListener("input", (e) => { settings.glass = Number(e.target.value); saveSettings(); applySettings(); });
  panel.querySelector("#darkToggle").addEventListener("click", () => { settings.dark = !settings.dark; saveSettings(); applySettings(); renderSettings(); });
  panel.querySelector("#resetBtn").addEventListener("click", () => { settings = Object.assign({}, DEFAULTS); saveSettings(); applySettings(); renderSettings(); });
}

/* ---------- 初始化 ---------- */
async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  token = loadToken();
  loggedIn = !!token;
  applySettings();

  // 从后端加载内容（失败则用 content.js 兜底，便于本地直接打开预览）
  const st = await apiGetState();
  if (st && st.site && (st.site.name || st.site.sections)) {
    site = st.site;
    posts = st.posts || [];
    // 如果服务端保存了样式设置，用它覆盖本地，让所有访客/换设备后都能一致
    if (site.settings) {
      settings = Object.assign({}, DEFAULTS, site.settings);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
      applySettings();
    }
  }
  renderNav(); renderHero(); renderAbout(); renderContent(); renderSettings(); renderAdminBar();
  updateGear();

  const gear = document.getElementById("gear");
  const panel = document.getElementById("settings");
  gear.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.toggle("open"); });
  document.addEventListener("click", (e) => {
    if (panel.classList.contains("open") && !panel.contains(e.target) && e.target !== gear) panel.classList.remove("open");
  });

  document.getElementById("adminBtn").addEventListener("click", () => {
    if (!loggedIn) { openLogin(); return; }
    editMode = !editMode; renderAdminBar(); renderContent();
  });
}

init();
