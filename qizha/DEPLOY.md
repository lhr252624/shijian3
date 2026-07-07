# 部署指南

## 后端配置

在部署移动端前,需要确保后端已经正确配置并支持移动端访问。

### 1. CORS 配置

如果使用 H5 模式,需要在后端配置 CORS:

```python
# Python Flask 示例
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],  # 生产环境请限制具体域名
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

### 2. WebSocket 配置

确保 WebSocket 服务支持跨域连接:

```python
# Python websockets 示例
async def handler(websocket, path):
    # 获取 token 参数
    query = parse_qs(urlparse(path).query)
    token = query.get('token', [None])[0]
    
    # 验证 token
    # ...
```

### 3. API 地址

开发环境:
- H5 模式: 使用 Vite 代理,配置在 `vite.config.js`
- App 模式: 使用局域网 IP 地址,如 `http://192.168.1.100:8080`

生产环境:
- 使用域名: `https://api.yourdomain.com`
- WebSocket: `wss://api.yourdomain.com/ws`

## 前端部署

### H5 部署

1. 构建生产版本:
```bash
npm run build:h5
```

2. 生成的文件在 `dist/build/h5` 目录

3. 部署到静态服务器 (Nginx/Apache):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist/build/h5;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理 (可选)
    location /api {
        proxy_pass http://backend-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket 代理
    location /ws {
        proxy_pass http://backend-server:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### App 打包

#### Android 打包

1. 打开 HBuilderX
2. 选择项目根目录
3. 点击"发行" -> "原生 App-云打包"
4. 选择 Android 平台
5. 填写应用信息:
   - 应用名称
   - 应用包名 (如 com.yourcompany.liarsbar)
   - 应用版本号
6. 选择证书 (首次需要创建)
7. 点击打包

#### iOS 打包

1. 需要 Apple 开发者账号
2. 在 HBuilderX 中选择"发行" -> "原生 App-云打包"
3. 选择 iOS 平台
4. 上传证书和描述文件
5. 打包完成后下载 IPA 文件
6. 使用 Xcode 或第三方工具安装到设备

### 微信小程序

1. 构建:
```bash
npm run build:mp-weixin
```

2. 打开微信开发者工具
3. 导入项目,选择 `dist/build/mp-weixin` 目录
4. 配置 AppID
5. 上传代码
6. 在微信公众平台提交审核

## 环境变量配置

建议使用环境变量管理不同环境的配置:

创建 `.env.development` 和 `.env.production`:

```bash
# .env.development
VITE_API_BASE_URL=http://192.168.1.100:8080/api/v1
VITE_WS_URL=ws://192.168.1.100:8080/ws

# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=wss://api.yourdomain.com/ws
```

修改 `utils/api.js` 和 `utils/websocket.js` 使用环境变量:

```javascript
// utils/api.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// utils/websocket.js
this.url = `${import.meta.env.VITE_WS_URL}?token=${encodeURIComponent(token)}`
```

## 性能优化建议

1. **图片优化**
   - 压缩所有图片资源
   - 使用 WebP 格式
   - 启用懒加载

2. **代码优化**
   - 开启 Tree Shaking
   - 按需加载组件
   - 减少全局状态

3. **网络优化**
   - 启用 HTTP/2
   - 配置 CDN
   - 启用 Gzip 压缩

4. **缓存策略**
   - 静态资源长期缓存
   - API 数据适度缓存
   - WebSocket 消息去重

## 监控和日志

建议接入以下服务:

1. **错误监控**: Sentry
2. **性能监控**: Google Analytics / 友盟
3. **日志收集**: 后端日志系统

在 `App.vue` 中添加全局错误处理:

```javascript
import { onErrorCaptured } from 'vue'

onErrorCaptured((err, instance, info) => {
  console.error('Global error:', err, info)
  // 上报到监控平台
  return false
})
```

## 安全建议

1. **Token 存储**: 使用加密存储
2. **敏感信息**: 不要在前端暴露 API 密钥
3. **输入验证**: 所有用户输入都要验证
4. **HTTPS**: 生产环境必须使用 HTTPS
5. **代码混淆**: App 打包时开启代码混淆

## 更新策略

### App 热更新 (可选)

使用 uni-app 的 wgt 增量更新:

1. 在 manifest.json 中配置更新地址
2. 每次更新生成 wgt 包
3. 上传到服务器
4. App 启动时检查更新

### 强制更新

在 App 启动时检查版本号,如果版本过低则强制更新:

```javascript
// App.vue
onLaunch(async () => {
  const res = await checkVersion()
  if (res.needUpdate && res.forceUpdate) {
    uni.showModal({
      title: '版本更新',
      content: '发现新版本,请立即更新',
      showCancel: false,
      success: () => {
        // 跳转到应用商店
        plus.runtime.openURL(res.downloadUrl)
      }
    })
  }
})
```

## 常见问题

### Q: H5 模式下 WebSocket 连接失败
A: 检查是否配置了正确的代理,或者直接使用后端地址

### Q: App 打包后无法连接网络
A: 检查 manifest.json 中是否配置了网络权限

### Q: iOS 审核被拒
A: 检查是否符合 Apple 应用审核指南,特别是隐私政策和用户协议

### Q: 性能问题
A: 检查是否有内存泄漏,减少不必要的渲染,优化长列表

## 技术支持

如有问题,请查看:
- uni-app 官方文档: https://uniapp.dcloud.net.cn/
- 本项目 README.md
- 提交 Issue 到项目仓库
