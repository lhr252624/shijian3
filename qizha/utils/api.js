// API 请求配置 - 适配 uni-app
// 与原 Web 端保持一致: baseURL 为 '/api/v1'
// 生产环境需配置 manifest.json 的 h5.devServer.proxy 或使用完整 URL
const BASE_URL = "http://118.196.37.32:8081/api/v1";

// 请求拦截器
function request(options) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync("token");
    const fullUrl = BASE_URL + options.url;

    // 打印详细的请求信息
    console.log("========== API请求详情 ==========");
    console.log("完整URL:", fullUrl);
    console.log("请求方法:", options.method || "GET");
    console.log("请求数据:", JSON.stringify(options.data || {}, null, 2));
    console.log("请求头:", {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "无Token",
      ...options.header,
    });
    console.log("超时时间:", 10000, "ms");
    console.log("==================================");

    uni.request({
      url: fullUrl,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.header,
      },
      timeout: 10000,
      success: (res) => {
        console.log("========== API响应详情 ==========");
        console.log("请求URL:", fullUrl);
        console.log("状态码:", res.statusCode);
        console.log("响应数据:", JSON.stringify(res.data, null, 2));
        console.log("==================================");

        if (res.statusCode === 401) {
          // Token 失效,清除登录信息
          console.warn("Token失效，清除登录信息");
          uni.removeStorageSync("token");
          uni.removeStorageSync("user");
          uni.reLaunch({
            url: "/pages/login/login",
          });
          reject(new Error("未授权"));
          return;
        }

        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          console.error("请求失败，状态码:", res.statusCode);
          reject(res.data || new Error("请求失败"));
        }
      },
      fail: (err) => {
        console.error("========== API请求失败 ==========");
        console.error("请求URL:", fullUrl);
        console.error("错误信息:", err);
        console.error("错误详情:", JSON.stringify(err, null, 2));
        console.error("==================================");
        reject(err);
      },
    });
  });
}

// 认证相关API
export const authAPI = {
  login: (username, password) =>
    request({
      url: "/auth/login",
      method: "POST",
      data: { username, password },
    }),

  register: (username, password, nickname) =>
    request({
      url: "/auth/register",
      method: "POST",
      data: { username, password, nickname },
    }),
};

// 用户相关API
export const userAPI = {
  getProfile: () =>
    request({
      url: "/user/profile",
      method: "GET",
    }),

  updateProfile: (data) =>
    request({
      url: "/user/profile",
      method: "PUT",
      data,
    }),
};

// 匹配相关API
export const matchAPI = {
  start: (data) =>
    request({
      url: "/match/start",
      method: "POST",
      data,
    }),

  cancel: () =>
    request({
      url: "/match/cancel",
      method: "POST",
    }),

  status: () =>
    request({
      url: "/match/status",
      method: "GET",
    }),
};

// 房间相关API
export const roomAPI = {
  create: (name) =>
    request({
      url: "/rooms",
      method: "POST",
      data: { name },
    }),

  list: () =>
    request({
      url: "/rooms",
      method: "GET",
    }),

  get: (id) =>
    request({
      url: `/rooms/${id}`,
      method: "GET",
    }),

  join: (id) =>
    request({
      url: `/rooms/${id}/join`,
      method: "POST",
    }),

  leave: (id) =>
    request({
      url: `/rooms/${id}/leave`,
      method: "POST",
    }),
};

// 大厅相关API
export const lobbyAPI = {
  get: () =>
    request({
      url: "/lobby",
      method: "GET",
    }),
};

// 历史记录API
export const historyAPI = {
  list: () =>
    request({
      url: "/history",
      method: "GET",
    }),

  get: (id) =>
    request({
      url: `/history/${id}`,
      method: "GET",
    }),
};

export default request;
