import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '../utils/api'
import wsClient from '../utils/websocket'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const user = ref(null)

  // 初始化时从本地存储读取用户信息
  const userStr = uni.getStorageSync('user')
  if (userStr && typeof userStr === 'string') {
    try {
      user.value = JSON.parse(userStr)
    } catch (e) {
      console.error('Parse user error:', e)
      // 清除无效数据
      uni.removeStorageSync('user')
    }
  } else if (userStr && typeof userStr === 'object') {
    // 如果已经是对象，直接使用
    user.value = userStr
  }

  const isLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    const res = await authAPI.login(username.trim(), password)
    token.value = res.token
    user.value = res.user

    uni.setStorageSync('token', res.token)
    uni.setStorageSync('user', JSON.stringify(res.user))

    // 登录成功后连接 WebSocket
    wsClient.connect()

    return res
  }

  async function register(username, password, nickname) {
    return await authAPI.register(username.trim(), password, nickname.trim())
  }

  function logout() {
    token.value = ''
    user.value = null

    uni.removeStorageSync('token')
    uni.removeStorageSync('user')

    // 断开 WebSocket 连接
    wsClient.disconnect()
  }

  function updateUser(userData) {
    user.value = { ...user.value, ...userData }
    uni.setStorageSync('user', JSON.stringify(user.value))
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    register,
    logout,
    updateUser
  }
})
