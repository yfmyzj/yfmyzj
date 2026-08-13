# 一分没有真君 · 个人博客（液态玻璃）

一套液态玻璃（glassmorphism）风格的个人博客，**两套运行模式**：

- **Vercel 全栈版（推荐，编辑实时可见）**：内容存在服务器（免费 Upstash Redis），你登录后改动**立刻对所有人可见**，不用再导出。
- **纯静态版（零依赖）**：双击 `index.html` 即可看，部署到任意静态托管；在线编辑的内容存在本机浏览器，需「导出部署文件」才能让访客看到。

> 目录默认就是你的真实内容（`js/content.js`），首次部署会自动导入。

## 目录结构

```
index.html        页面骨架（一般不用动）
css/style.css     液态玻璃主题样式
js/content.js     ★初始/兜底内容（SITE 站点信息 + POSTS 文章）★
js/app.js         前端渲染与交互（全栈 fetch 版）
api/              Vercel serverless 函数：登录 / 内容增删改 / 站点信息
lib/              后端工具：KV 存储、JWT 鉴权、状态读取
server.js         本地开发服务器（node server.js）
package.json      Node 项目描述（零 npm 依赖）
vercel.json       Vercel 部署配置
images/           头像、封面等图片
README.md         本说明
```

## 一、在线编辑（实时保存，推荐 Vercel 全栈版）

1. 打开网站，点左下角 **✎ 管理**，用管理员账户登录：
   - 账户 `admin`
   - 密码 `yfmyzjnb666`（部署到 Vercel 后可用环境变量 `ADMIN_PASS` 改成你自己的）
2. **未登录的访客只能观看，不能编辑**；样式设置（⚙）也仅登录后可见。
3. **＋ 新建**：填板块、标题、日期、封面（可点「选择图片」直接上传）、摘要、正文（支持 Markdown），保存即生效——**改动实时写到服务器，所有人立即可见**。
4. 每张卡片有 **✎ 编辑 / 🗑 删除**；**站点信息** 可改网名、签名、头像、简介。
5. **自由布局**：点工具条 **🧩 布局** 进入——导航、头像区、设置面板、浮动按钮、每张卡片都可拖到任意位置、拉大拉小。点 **🧩 完成布局** 保存，**重置布局** 复原。所有弹窗也都可拖动缩放。
6. 点 **备份JSON** 可把当前数据下载成文件，作为离线备份。

> 密码在前端只做登录、真正校验在服务器（环境变量 `ADMIN_PASS`），比纯前端明文安全得多；若要更高安全，把 `AUTH_SECRET` 设成随机长串。

## 二、纯静态模式（可选，零服务器）

- 直接双击 `index.html` 可看默认内容（只读，编辑功能需连后端，本地用 `node server.js` 体验）。
- 若把静态文件部署到 CloudStudio / GitHub Pages / Netlify，访客只读；想改内容就改 `js/content.js` 重新部署。

## 三、怎么发新内容（改 `js/content.js`）

`js/content.js` 是**初始内容**，也是纯静态模式的真实数据源；全栈版首次运行会自动把它导入服务器。想批量改默认内容就编辑它：

```js
{
  id: 7,                       // 不重复的数字
  section: "writing",         // 板块：writing / photo / notes / about
  title: "文章标题",
  date: "2026-08-13",         // YYYY-MM-DD，越新排越前
  cover: "images/我的图.jpg",  // 封面；不配图写 "" 
  excerpt: "一句话摘要",        // 可留空，自动截取
  content: `正文支持 Markdown…`,
}
```

- **图片**：放进 `images/`，写 `images/文件名`；或填网络地址。
- **板块**：编辑 `SITE.sections`（注意 `id:"about"` 是「关于」页，别改它的 id）。
- **站点信息**：改 `SITE.name / handle / tagline / bio / socials / avatar`。

## 四、换样式（背景 / 主题色 / 玻璃）

- **网页里实时调**：点右下角 ⚙ → 选背景色板、粘贴背景图、调主题色、调毛玻璃模糊/透明度、切深色模式（存在本地浏览器）。
- **改默认值**：编辑 `js/app.js` 顶部的 `DEFAULTS` 或 `css/style.css` 的 `:root`。

## 五、上线部署（GitHub → Vercel 全栈，编辑实时可见）

代码已 `git init` 并提交（`.workbuddy/` 等隐私目录已被 `.gitignore` 排除）。

### 第 1 步：在 GitHub 建空仓库（已建可跳过）
1. 打开 https://github.com/new → 填仓库名（如 `yfmyzj`）→ 选 **Public** → **不要**勾选 "Add a README"，直接 Create repository。

### 第 2 步：把本地代码推上去（已推可跳过）
在本项目目录（`D:\ai\2026-08-13-23-11-11`）打开终端，执行：
```bash
git branch -M main
git remote add origin https://github.com/<你的用户名>/yfmyzj.git
git push -u origin main
```
> 推送时若要求账号密码：用户名填 GitHub 账号，**密码用 Personal Access Token**（GitHub 设置 → Developer settings → Tokens 生成，勾 repo 权限），不能用网页登录密码。

### 第 3 步：Vercel 导入并配置数据库（推荐免费 Upstash Redis）
1. 打开 https://vercel.com → 用 GitHub 登录 → **Add New → Project** → 选 `yfmyzj` 仓库 → Import。
2. Framework 选 **Other**，其余默认 → Deploy（先让它跑通；此时因没配数据库会报错，属正常）。
3. **建免费数据库（Upstash Redis，无需信用卡）**：
   - 打开 https://upstash.com → 用 GitHub 登录（免费注册）→ **Create Database → Redis** → 起名（如 `yfmyzj-kv`）→ Region 选离你近的（如 Singapore / Tokyo）→ Create。
   - 建好后进入数据库详情，找到 **REST API** 区，复制两项：
     - `UPSTASH_REDIS_REST_URL`（形如 `https://xxx.upstash.io`）
     - `UPSTASH_REDIS_REST_TOKEN`（一长串）
4. 回 Vercel 项目 **Settings → Environment Variables** 添加 4 项（建议 Production / Preview / Development 全勾）：
   - `KV_REST_API_URL` = 上面复制的 `UPSTASH_REDIS_REST_URL` 值
   - `KV_REST_API_TOKEN` = 上面复制的 `UPSTASH_REDIS_REST_TOKEN` 值
   - `ADMIN_PASS` = 你的登录密码（建议改掉默认 `yfmyzjnb666`）
   - `AUTH_SECRET` = 任意一串随机长字符（用于登录令牌签名）
5. 回到 **Deployments** → 最新一次 → ⋯ → **Redeploy**，让环境变量生效。

> 代码已兼容 `KV_REST_API_URL` 与 `UPSTASH_REDIS_REST_URL` 两种变量名。用 Vercel 自带 KV 也行（变量名同为 `KV_REST_API_URL`/`KV_REST_API_TOKEN`），但 Vercel KV 可能需付费；Upstash 免费层对个人博客足够（每月约 1 万命令额度）。

### 第 4 步：完成
- 打开 Vercel 给你的域名（如 `yfmyzj.vercel.app`），首次访问会自动把 `js/content.js` 导入数据库作为初始内容。
- 之后登录 `admin` 改内容（含图片），**立刻对所有人可见**，无需再导出。

> 内容按文章分键存入 KV，已避开单值 ~512KB 上限；但**单篇文章**（含内嵌 base64 图片）若超过约 500KB 仍可能失败——超大图建议用外链或 Vercel Blob。

### 方式 B：纯静态托管（只读 / 导出式，可选）
若只想托管静态版：把 `index.html` + `css/` + `js/`（不含 `api/`、`lib/`、`server.js`）部署到 GitHub Pages / Netlify / CloudStudio。访客只读；要改内容就改 `js/content.js` 重新部署（或用线上「导出部署文件」）。

## 六、本地开发

```bash
node server.js      # 启动后访问 http://localhost:3000
```

本地无 KV 时自动用 `data/state.json` 文件存储，方便你先在本机验证编辑流程。

---
由 WorkBuddy 为你打造 · 网名：一分没有真君 (yfmyzj)
