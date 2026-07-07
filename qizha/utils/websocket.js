// WebSocket 客户端 - 适配 uni-app
class WebSocketClient {
  constructor() {
    this.ws = null;
    this.url = "";
    this.listeners = {};
    this.reconnectTimer = null;
    this.connected = false;
    this.pendingMessages = [];
    this.manualClose = false;
    this.heartbeatTimer = null;
  }

  connect() {
    const token = uni.getStorageSync("token");
    if (!token) {
      console.log("No token, skip WebSocket connection");
      return;
    }

    if (this.ws && this.connected) {
      console.log("WebSocket already connected");
      return;
    }

    this.manualClose = false;

    // WebSocket 地址配置
    // 开发环境: 使用本地地址 ws://localhost:8080/ws
    // 生产环境: 需要替换为实际的 WebSocket 地址 (wss://your-domain.com/ws)
    // 注意: Android/iOS 真机必须使用 wss:// 协议 (HTTPS)
    this.url = `ws://118.196.37.32:8081/ws?token=${encodeURIComponent(token)}`;

    this.ws = uni.connectSocket({
      url: this.url,
      success: () => {
        console.log("WebSocket connecting...");
      },
    });

    this.ws.onOpen(() => {
      console.log("WebSocket connected");
      this.connected = true;
      this.flushPendingMessages();
      this.startHeartbeat();
      this.emit("connected");
    });

    this.ws.onMessage((res) => {
      try {
        const msg = JSON.parse(res.data);
        console.log("WebSocket 收到消息:", msg.type, msg);
        this.emit(msg.type, msg.payload, msg);
        this.emit("message", msg);
      } catch (e) {
        console.error("WS parse error:", e);
      }
    });

    this.ws.onClose(() => {
      console.log("WebSocket closed");
      this.connected = false;
      this.stopHeartbeat();
      this.emit("disconnected");

      if (!this.manualClose && uni.getStorageSync("token")) {
        this.scheduleReconnect();
      }
    });

    this.ws.onError((err) => {
      console.error("WebSocket error:", err);
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;

    console.log("Schedule reconnect in 3s...");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  send(type, payload = {}) {
    const message = JSON.stringify({ type, payload });

    if (this.connected && this.ws) {
      uni.sendSocketMessage({
        data: message,
        success: () => {
          console.log("Message sent:", type);
        },
        fail: (err) => {
          console.error("Send message failed:", err);
          this.pendingMessages.push(message);
        },
      });
    } else {
      console.log("Not connected, queue message:", type);
      this.pendingMessages.push(message);
      this.connect();
    }
  }

  flushPendingMessages() {
    console.log("Flush pending messages:", this.pendingMessages.length);
    while (this.pendingMessages.length > 0 && this.connected) {
      const message = this.pendingMessages.shift();
      uni.sendSocketMessage({
        data: message,
      });
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error("Listener error:", e);
      }
    });
  }

  disconnect() {
    console.log("Manual disconnect");
    this.manualClose = true;
    this.pendingMessages = [];
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      uni.closeSocket();
      this.ws = null;
    }

    this.connected = false;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.send("PING", {});
      }
    }, 30000); // 每30秒发送一次心跳
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
