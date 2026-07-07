# ✅ API 配置和资源已完成

## 已完成的工作

### 1. API 接口配置 ✅

已根据源代码配置完成，所有 API 接口与原 Web 端保持一致。

**配置文件**: `utils/api.js`

```javascript
const BASE_URL = '/api/v1'  // 与原 Web 端完全一致
```

**包含的 API 接口**:

#### 认证接口 (authAPI)
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册

#### 用户接口 (userAPI)
- `GET /user/profile` - 获取用户资料
- `PUT /user/profile` - 更新用户资料

#### 匹配接口 (matchAPI)
- `POST /match/start` - 开始匹配
- `POST /match/cancel` - 取消匹配
- `GET /match/status` - 获取匹配状态

#### 房间接口 (roomAPI)
- `POST /rooms` - 创建房间
- `GET /rooms` - 获取房间列表
- `GET /rooms/:id` - 获取房间详情
- `POST /rooms/:id/join` - 加入房间
- `POST /rooms/:id/leave` - 离开房间

#### 大厅接口 (lobbyAPI)
- `GET /lobby` - 获取大厅信息

#### 历史记录接口 (historyAPI)
- `GET /history` - 获取历史记录列表
- `GET /history/:id` - 获取历史记录详情

---

### 2. WebSocket 配置 ✅

**配置文件**: `utils/websocket.js`

```javascript
// 开发环境默认配置
ws://localhost:8080/ws?token={token}

// 生产环境需要修改为:
wss://your-domain.com/ws?token={token}
```

**WebSocket 消息类型**:
- `PING` - 心跳包 (每 30 秒)
- `connected` - 连接成功事件
- `disconnected` - 断开连接事件
- `message` - 接收消息事件

**特性**:
- ✅ 自动重连 (3 秒后重试)
- ✅ 心跳保活 (30 秒间隔)
- ✅ 消息队列 (未连接时缓存消息)
- ✅ Token 认证

---

### 3. 图片资源 ✅

已从源代码复制所有图片到 `static/images/` 目录。

**图片清单**:
- ✅ `lobby.png` (2.5 MB) - 大厅背景图
- ✅ `login.png` (1.2 MB) - 登录/注册背景图

**使用位置**:
- `pages/login/login.vue` - 登录页背景
- `pages/register/register.vue` - 注册页背景
- `pages/lobby/lobby.vue` - 大厅背景

**图片引用方式** (uni-app):
```css
background: url('/static/images/login.png') center/cover no-repeat;
background: url('/static/images/lobby.png') center/cover no-repeat;
```

---

## 环境配置说明

### 开发环境 (H5 模式)

1. **API 代理配置** (已配置在 `manifest.json`):
```json
{
  "h5": {
    "devServer": {
      "proxy": {
        "/api": {
          "target": "http://localhost:8080",
          "changeOrigin": true
        }
      }
    }
  }
}
```

2. **WebSocket 地址**:
```javascript
ws://localhost:8080/ws
```

3. **运行命令**:
```bash
npm run dev:h5
```

访问: `http://localhost:8080` (由 uni-app 启动)

---

### 生产环境

#### 方式 1: 使用相对路径 (推荐)

**前提**: 前端和后端部署在同一域名下

```javascript
// utils/api.js
const BASE_URL = '/api/v1'

// utils/websocket.js
this.url = `wss://${window.location.host}/ws?token=${token}`
```

**Nginx 配置示例**:
```nginx
server {
  listen 443 ssl;
  server_name your-domain.com;

  # 前端静态文件
  location / {
    root /var/www/h5;
    try_files $uri $uri/ /index.html;
  }

  # API 代理
  location /api/ {
    proxy_pass http://backend:8080/api/;
    proxy_set_header Host $host;
  }

  # WebSocket 代理
  location /ws {
    proxy_pass http://backend:8080/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

#### 方式 2: 使用完整 URL

```javascript
// utils/api.js
const BASE_URL = 'https://api.your-domain.com/api/v1'

// utils/websocket.js
this.url = `wss://api.your-domain.com/ws?token=${token}`
```

**注意事项**:
- ⚠️ App 真机必须使用 `https://` 和 `wss://`
- ⚠️ 需要配置 CORS (后端需允许跨域)
- ⚠️ WebSocket 需要支持 wss:// 协议

---

## 后端 CORS 配置示例

### Go (使用 Gin 框架)

```go
import "github.com/gin-contrib/cors"

router := gin.Default()
router.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"https://your-domain.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    ExposeHeaders:    []string{"Content-Length"},
    AllowCredentials: true,
    MaxAge:           12 * time.Hour,
}))
```

### Node.js (Express)

```javascript
const cors = require('cors')

app.use(cors({
  origin: 'https://your-domain.com',
  credentials: true
}))
```

---

## 测试清单

### ✅ API 测试
- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] 获取用户资料
- [ ] 更新用户资料
- [ ] 创建房间
- [ ] 加入房间
- [ ] 获取房间列表
- [ ] 开始匹配
- [ ] 取消匹配
- [ ] 获取历史记录

### ✅ WebSocket 测试
- [ ] 连接成功
- [ ] 心跳保活
- [ ] 断线重连
- [ ] 消息收发
- [ ] Token 认证

### ✅ 图片资源测试
- [ ] 登录页背景图显示
- [ ] 注册页背景图显示
- [ ] 大厅页背景图显示

---

## 快速开始

1. **启动后端服务**
```bash
cd F:/shijian3/Liar-s-Bar/backend
# 启动你的后端服务 (假设端口 8080)
```

2. **启动前端项目**
```bash
cd F:/shijian3_frontend/qizha
npm install
npm run dev:h5
```

3. **访问测试**
```
打开浏览器访问: http://localhost:8080
```

4. **测试流程**
   - 注册新用户
   - 登录系统
   - 进入大厅
   - 创建房间或快速匹配
   - 开始游戏

---

## 常见问题

### Q: API 请求 404?
A: 检查后端服务是否启动，端口是否为 8080

### Q: WebSocket 连接失败?
A: 
- H5 模式: 检查 `ws://localhost:8080/ws` 是否可访问
- App 模式: 确保使用 `wss://` 协议

### Q: 图片不显示?
A: 
- H5 模式: 路径为 `/static/images/xxx.png`
- App 模式: 路径为 `/static/images/xxx.png`
- 确认图片文件存在

### Q: CORS 错误?
A: 后端需要配置 CORS，允许前端域名访问

### Q: Token 失效?
A: 
- 检查后端 Token 有效期
- 检查请求头 `Authorization: Bearer {token}` 格式是否正确

---

## 总结

✅ **所有配置已完成！**

- ✅ API 接口已从源代码提取并配置
- ✅ WebSocket 配置已完成 (开发环境默认 localhost:8080)
- ✅ 图片资源已复制到正确位置
- ✅ 所有 API 路径与原 Web 端保持一致

**现在可以开始测试了！** 🎉

---

## 相关文档

- `README.md` - 项目说明
- `CONFIG.js` - 基础配置说明
- `DEPLOY.md` - 部署指南
- `MIGRATION_SUMMARY.md` - 迁移总结
- `API_CONFIG_DONE.md` - 本文档 (API 配置完成说明)
