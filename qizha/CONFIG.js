/**
 * 配置说明文档
 *
 * 在开发前,请务必修改以下配置:
 */

// 1. API 配置 - utils/api.js
// 修改第 2 行的 BASE_URL 为你的后端 API 地址
// 例如: const BASE_URL = 'http://192.168.1.100:8080/api/v1'

// 2. WebSocket 配置 - utils/websocket.js
// 修改第 20 行的 WebSocket 地址
// 例如: this.url = `ws://192.168.1.100:8080/ws?token=${encodeURIComponent(token)}`

// 3. 静态资源
// 需要在 static/images/ 目录下放置以下图片:
// - login-bg.jpg (登录注册页面背景图)

// 4. manifest.json 配置
// - 修改 appid (如需发布到应用市场)
// - 配置应用名称、版本号等信息

// 5. pages.json 配置
// - 首页默认是 login 页面
// - 可根据需要调整页面顺序

/**
 * 开发流程:
 *
 * 1. 安装依赖: npm install
 * 2. 修改上述配置
 * 3. 运行项目: npm run dev:h5 (H5模式) 或 在 HBuilderX 中运行
 * 4. 真机调试: 使用 HBuilderX 的真机调试功能
 * 5. 打包发布: npm run build:h5 或使用 HBuilderX 云打包
 */

/**
 * 注意事项:
 *
 * 1. H5 模式下 WebSocket 地址需要与页面同域,或配置 CORS
 * 2. App 模式下可以直接使用 IP 地址
 * 3. 横屏锁定功能仅在 App 模式下生效
 * 4. 震动反馈在 H5 模式下可能不生效
 */
