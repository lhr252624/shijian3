# LIAR'S BAR 移动端

《LIAR'S BAR》移动端基于 uni-app / Vue 3 开发，支持 H5 预览和 App 打包。项目包含登录注册、大厅、角色选择、匹配等待、房间加入、实时对局、开场 CG、背景音乐/音效、启动页和制作人员名单等功能。安装包在tree/frontend/qizha/unpackage/release/apk/liar-1.0.4.apk

## 当前状态

- 启动页展示武妖灵工作室 Logo，并淡出到登录页
- 登录页支持横屏、美化登录面板和登录 BGM
- 首次注册成功后自动登录，播放 CG，可跳过，结束后进入大厅
- 大厅支持在线人数、创建房间、查看并加入房间、规则弹窗、设置弹窗
- 设置弹窗包含主音量、背景音乐、音效三个音量控制，以及滚动制作人员名单，并可在大厅和游戏房间内打开
- 角色选择支持 Scubby、Foxy、Bristle、Tor
- 游戏房间支持角色头像、准备、出牌、质疑音效、过牌、技能、轮盘惩罚、淘汰、结算、聊天、行动日志和房间内设置
- 个人中心支持本地资料兜底和接口响应兼容，首次打开不会因接口慢或响应结构差异导致面板空白
- BGM 和音效使用 App 端混音会话，播放按钮音效、质疑音效等短音效时不会主动打断背景音乐
- WebSocket 同步游戏状态，并带断线/重连相关处理

## 技术栈

- uni-app
- Vue 3
- Pinia
- WebSocket
- Sass
- HBuilderX / DCloud App 打包

## 快速开始

安装依赖：

```bash
npm install
```

H5 开发：

```bash
npm run dev:h5
```

H5 构建：

```bash
npm run build:h5
```

App 构建：

```bash
npm run build:app
```

App 真机运行或云打包建议使用 HBuilderX 打开项目。

## 项目结构

```text
qizha/
├── App.vue
├── main.js
├── manifest.json
├── pages.json
├── package.json
├── components/
│   ├── ConfirmDialog.vue
│   ├── InputDialog.vue
│   ├── Loading.vue
│   ├── Modal.vue
│   ├── RulesModal.vue
│   └── Toast.vue
├── pages/
│   ├── studio-splash/      # 游戏启动展示页
│   ├── login/              # 登录页
│   ├── register/           # 注册页
│   ├── cg/                 # 注册后的开场 CG
│   ├── lobby/              # 大厅、规则、设置、房间列表
│   ├── character-select/   # 角色选择
│   ├── match-wait/         # 匹配等待
│   ├── game-room/          # 游戏房间
│   ├── profile/            # 个人中心
│   └── history/            # 历史战绩
├── stores/
│   ├── auth.js
│   └── game.js
├── utils/
│   ├── api.js
│   ├── audio.js
│   └── websocket.js
└── static/
    ├── images/
    ├── sounds/
    ├── tavern_characters_v01/
    └── videos/
```

## 页面流程

1. `pages/studio-splash/studio-splash`
   展示 `static/images/studio_splash_wuyaoling_510.png`，淡出黑场后进入登录页。

2. `pages/login/login`
   登录入口，进入页面播放 `login_music.mp3`。H5 首次进入时可能受浏览器自动播放策略影响，页面交互后会再次触发播放。

3. `pages/register/register`
   注册成功后自动登录，并进入开场 CG。

4. `pages/cg/cg`
   播放 `static/videos/cg.mp4`，支持跳过，播放结束进入大厅。

5. `pages/lobby/lobby`
   游戏大厅，包含创建房间、查看房间、规则、设置、用户中心、退出登录。

6. `pages/character-select/character-select`
   选择角色后进入匹配。

7. `pages/match-wait/match-wait`
   等待匹配结果，匹配成功进入游戏房间。

8. `pages/game-room/game-room`
   核心对局页面，负责等待房间、准备、游戏状态渲染、玩家操作、质疑音效、房间内设置和 WebSocket 事件处理。

9. `pages/profile/profile`
   个人中心页面，优先展示本地登录资料，再异步刷新服务端统计数据。

## 静态资源

### 图片

- `static/images/icon_demo.png`：应用图标原图
- `static/images/app-icons/`：由图标原图生成的多尺寸 App 图标
- `static/images/studio_splash_wuyaoling_510.png`：启动页展示图
- `static/images/login.png`：登录背景
- `static/images/register.png`：注册背景
- `static/tavern_characters_v01/assets/art/characters/*/*_head.png`：角色头像

### 视频

- `static/videos/cg.mp4`：首次注册成功后的开场 CG

### 音频

BGM：

- `static/sounds/bgm/login_music.mp3`
- `static/sounds/bgm/lobby_music.mp3`
- `static/sounds/bgm/playing_music.mp3`

音效：

- `static/sounds/sound_effect/UI/button.mp3`
- `static/sounds/sound_effect/game/block.mp3`
- `static/sounds/sound_effect/game/death.mp3`
- `static/sounds/sound_effect/game/fire.mp3`
- `static/sounds/sound_effect/game/skill.mp3`
- `static/sounds/sound_effect/game/suspect.mp3`
- `static/sounds/sound_effect/game/win.mp3`
- `static/sounds/sound_effect/room/entry_game_2.mp3`
- `static/sounds/sound_effect/room/exit.mp3`
- `static/sounds/sound_effect/room/match_success.mp3`

音频播放、音量存储和音效映射集中在 `utils/audio.js`。App 端音频上下文使用 `ambient` 会话模式，音效播放不会主动中断正在播放的 BGM；质疑相关音效映射到 `suspect.mp3`。

## 配置说明

### 后端地址

API 和 WebSocket 地址在以下文件中维护：

- `utils/api.js`
- `utils/websocket.js`

服务端代码仓库：

- [even-young-leaf/Liar-s-Bar](https://github.com/even-young-leaf/Liar-s-Bar)

开发或部署到不同环境时，需要确认后端 HTTP 和 WebSocket 地址可访问。

### 页面配置

页面路由和横屏配置位于 `pages.json`。当前启动页排在第一位，因此 App/H5 启动后会先展示工作室启动页。

### App 配置

`manifest.json` 中配置了：

- App 基础信息
- 横屏和全屏相关配置
- App 图标
- Android 权限
- App Plus splashscreen

## 音量设置

设置入口在大厅右上角和游戏房间顶部栏。设置项包括：

- 主音量
- 背景音乐
- 音效

设置通过 `uni.setStorageSync` 持久化，下次进入仍然生效。

## 制作人员名单

大厅设置弹窗内包含滚动制作人员名单：

- 武妖灵工作室
- 项目统筹
- 视频与文档组
- 音频制作
- 程序开发
- 全体测试人员
- 版权信息

## 构建验证

最近一次验证命令：

```bash
npm run build:h5
npm run build:app
```

两项均可通过。构建时可能出现 Sass deprecation warning，这是依赖链的弃用提示，不影响当前功能。

## Git 注意事项

仓库已通过 `.gitignore` 排除：

- `node_modules/`
- `dist/`
- `unpackage/`
- `.DS_Store`

提交时应只提交源码、配置和必要的静态资源，不要提交本地依赖目录或构建产物。

## 版权

©2026 武妖灵工作室 保留所有权利。
