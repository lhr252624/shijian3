# 骗子酒馆 - 移动端 (uni-app)

这是《骗子酒馆》游戏的移动端实现,使用 uni-app 框架开发,支持 Android、iOS 和 H5。

## 项目特点

- ✅ **完整迁移** - 从 Web 端完整迁移所有功能
- ✅ **风格一致** - 保持与 Web 端完全一致的视觉风格和配色
- ✅ **自定义组件** - 所有 UI 组件自行封装,不依赖 uni-ui
- ✅ **横屏游戏** - 游戏房间页面支持横屏模式
- ✅ **实时通信** - WebSocket 实时同步游戏状态
- ✅ **动画特效** - 质疑结果、淘汰动画、屏幕震动等特效

## 技术栈

- **框架**: uni-app (Vue 3 + Composition API)
- **状态管理**: Pinia
- **网络请求**: uni.request (封装)
- **实时通信**: WebSocket
- **样式**: CSS3 + 动画

## 项目结构

```
qizha/
├── pages/                  # 页面
│   ├── login/             # 登录页
│   ├── register/          # 注册页
│   ├── lobby/             # 大厅页
│   ├── match-wait/        # 匹配等待页
│   ├── game-room/         # 游戏房间页 (核心)
│   ├── profile/           # 个人中心
│   └── history/           # 历史战绩
├── components/            # 自定义组件
│   ├── Toast.vue         # 提示框组件
│   ├── Modal.vue         # 弹窗组件
│   ├── Loading.vue       # 加载组件
│   └── RulesModal.vue    # 规则弹窗组件
├── stores/               # 状态管理
│   ├── auth.js          # 认证状态
│   └── game.js          # 游戏状态
├── utils/               # 工具类
│   ├── api.js          # API 请求封装
│   └── websocket.js    # WebSocket 客户端
├── styles/             # 全局样式
│   └── global.css
├── static/             # 静态资源
│   └── images/
├── App.vue
├── main.js
├── pages.json          # 页面配置
├── manifest.json       # 应用配置
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端地址

修改 `utils/api.js` 和 `utils/websocket.js` 中的 API 地址:

```javascript
// utils/api.js
const BASE_URL = 'http://your-api-domain.com/api/v1'

// utils/websocket.js
this.url = `ws://your-api-domain.com/ws?token=${encodeURIComponent(token)}`
```

### 3. 运行项目

#### H5 开发模式
```bash
npm run dev:h5
```

#### 微信小程序
```bash
npm run dev:mp-weixin
```

#### App (需要 HBuilderX)
```bash
npm run dev:app
```

### 4. 打包发布

#### H5 打包
```bash
npm run build:h5
```

#### App 打包
使用 HBuilderX 打开项目,选择"发行" -> "原生 App-云打包"

## 核心功能说明

### 1. 登录注册系统
- JWT Token 认证
- 自动持久化登录状态
- 友好的错误提示

### 2. 大厅系统
- 实时显示在线人数、活跃房间
- 快速匹配功能
- 创建/加入房间
- 5秒轮询刷新数据

### 3. 游戏房间 (最复杂)
- **横屏模式** - 游戏时自动切换横屏
- **实时同步** - WebSocket 实时同步游戏状态
- **游戏逻辑**:
  - 手牌选择 (1-3张)
  - 出牌、质疑、过牌操作
  - 俄罗斯轮盘惩罚机制
- **动画特效**:
  - 质疑成功/失败特效
  - 玩家淘汰动画
  - 屏幕震动反馈
  - 卡牌翻转动画
- **UI 元素**:
  - 对手状态卡片
  - 回合指示器
  - 手牌展示
  - 操作按钮

### 4. 其他功能
- 个人中心 (查看战绩、修改昵称)
- 历史记录
- 规则说明

## 自定义组件

所有 UI 组件都是自行封装,不依赖第三方库:

### Toast (提示框)
```vue
<Toast
  v-model:visible="toast.show"
  :message="toast.msg"
  :type="toast.type"  // error | success | info
  :duration="3000"
/>
```

### Modal (弹窗)
```vue
<Modal
  v-model:visible="showModal"
  title="标题"
  :show-footer="true"
  @confirm="handleConfirm"
  @cancel="handleCancel"
>
  <view>弹窗内容</view>
</Modal>
```

### Loading (加载)
```vue
<Loading :visible="loading" text="加载中..." />
```

### RulesModal (规则说明)
```vue
<RulesModal v-model:visible="showRules" />
```

## 适配说明

### 横屏适配
游戏房间页面在 `pages.json` 中配置了横屏:
```json
{
  "path": "pages/game-room/game-room",
  "style": {
    "pageOrientation": "landscape"
  }
}
```

在页面中通过 App Plus API 锁定横屏:
```javascript
// 锁定横屏
plus.screen.lockOrientation('landscape-primary')

// 解除锁定
plus.screen.lockOrientation('portrait-primary')
```

### 安全区域适配
已添加安全区域适配类:
```css
.safe-area-inset-top { padding-top: env(safe-area-inset-top); }
.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-inset-left { padding-left: env(safe-area-inset-left); }
.safe-area-inset-right { padding-right: env(safe-area-inset-right); }
```

### rpx 单位
所有尺寸使用 rpx 单位,自动适配不同屏幕尺寸。

## 注意事项

1. **API 地址配置**
   - 开发时需要配置正确的后端 API 地址
   - H5 模式可以使用 Vite 代理
   - App 模式需要使用实际的 IP 或域名

2. **WebSocket 连接**
   - Android 真机需要使用 `ws://` 或 `wss://` 协议
   - 确保后端支持 WebSocket 连接
   - 已实现自动重连机制

3. **权限配置**
   - `manifest.json` 中已配置必要的权限
   - 震动权限 (VIBRATE)
   - 网络权限 (INTERNET, ACCESS_NETWORK_STATE)

4. **横屏锁定**
   - 仅在游戏房间页面启用横屏
   - 离开页面时自动恢复竖屏
   - H5 模式下横屏锁定不生效,仅 App 有效

5. **性能优化**
   - 聊天记录限制最多保留 100 条
   - 轮询数据使用 5 秒间隔
   - WebSocket 心跳保持连接

## 与 Web 端的区别

| 功能 | Web 端 | 移动端 |
|------|--------|--------|
| 路由 | vue-router | uni-app 页面跳转 |
| HTTP | axios | uni.request |
| WebSocket | 原生 WebSocket | uni.connectSocket |
| 存储 | localStorage | uni.getStorageSync |
| 弹窗 | 自定义组件 | uni.showModal + 自定义组件 |
| 屏幕方向 | 浏览器控制 | plus.screen API |
| 震动反馈 | navigator.vibrate | uni.vibrateShort/Long |

## 待完善功能

- [ ] 聊天功能 (已保留接口,UI 未实现)
- [ ] 背景音乐和音效
- [ ] 更多动画细节优化
- [ ] 离线模式支持
- [ ] 多语言支持

## 常见问题

### Q: 运行报错 "pinia is not defined"
A: 确保已安装 pinia: `npm install pinia`

### Q: WebSocket 连接失败
A: 检查后端 WebSocket 地址是否正确,Android 真机需要使用实际 IP 地址

### Q: 横屏不生效
A: 横屏锁定仅在 App 模式下有效,H5 模式不支持

### Q: 样式显示异常
A: 检查是否正确使用 rpx 单位,避免使用 px

## 开发建议

1. 使用 HBuilderX 开发体验更好
2. 真机调试使用 `console.log` 配合 HBuilderX 控制台
3. 频繁修改建议使用 H5 模式开发,速度更快
4. 最终测试务必在真机上进行

## 许可证

本项目仅供学习交流使用。
