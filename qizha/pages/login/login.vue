<template>
  <view class="login-container">
    <image class="background-image" src="/static/images/login.png" mode="aspectFill"></image>

    <!-- 交互层 -->
    <view class="interactive-layer">
      <!-- 账号输入框 -->
      <input class="input-field input-username" type="text" v-model="username" placeholder="请输入账号" />

      <!-- 密码输入框 -->
      <input class="input-field input-password" type="password" v-model="password" placeholder="请输入密码" />

      <!-- 登录按钮 -->
      <view class="login-button" @click="handleLogin">登录</view>

      <!-- 底部链接区域 -->
      <view class="footer-links">
        <view class="link-area link-register" @click="goToRegister">注册账号</view>
        <view class="link-area link-forget" @click="goToForgetPassword">忘记密码</view>
      </view>
    </view>

    <!-- 自定义加载组件 -->
    <Loading :visible="loading" text="登录中..." />
  </view>
</template>

<script>
import Loading from '../../components/Loading.vue'

export default {
  components: {
    Loading
  },
  data() {
    return {
      username: '111111',
      password: '111111',
      loading: false
    }
  },
  onLoad() {
    console.log('=== 登录页面加载 ===')
    this.setLandscape()
  },
  onShow() {
    console.log('=== 登录页面显示 ===')
    // 每次页面显示时都强制横屏，防止其他页面解锁后无法恢复
    this.setLandscape()
  },
  onUnload() {
    console.log('=== 登录页面卸载 ===')
    // 不要在这里解除横屏锁定，让下一个页面自己控制
  },
  methods: {
    setLandscape() {
      // 强制横屏
      // #ifdef APP-PLUS
      plus.screen.lockOrientation('landscape-primary')
      console.log('已设置横屏模式')
      // #endif
    },
    async handleLogin() {
      // 防止重复请求
      if (this.loading) {
        console.warn('正在登录中，请勿重复点击')
        return
      }

      console.log('=== 开始登录流程 ===')
      console.log('表单数据:', {
        username: this.username,
        passwordLength: this.password.length
      })

      // 验证：检查账号
      if (!this.username) {
        console.warn('验证失败: 账号为空')
        uni.showToast({
          title: '请输入账号',
          icon: 'none'
        })
        return
      }

      // 验证：检查密码
      if (!this.password) {
        console.warn('验证失败: 密码为空')
        uni.showToast({
          title: '请输入密码',
          icon: 'none'
        })
        return
      }

      console.log('表单验证通过，准备调用登录API')
      this.loading = true

      try {
        // 动态导入 auth store
        const { useAuthStore } = await import('../../stores/auth')
        const authStore = useAuthStore()

        console.log('调用登录API...')
        const result = await authStore.login(this.username, this.password)
        console.log('登录API响应:', result)
        console.log('登录成功，用户信息:', result.user)

        // 登录成功提示
        uni.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        })

        // 延迟跳转到大厅页面
        setTimeout(() => {
          console.log('跳转到大厅页面')
          uni.reLaunch({
            url: '/pages/lobby/lobby'
          })
        }, 1500)
      } catch (e) {
        console.error('登录失败:', e)
        console.error('错误详情:', {
          response: e.response,
          message: e.message,
          data: e.data
        })

        // 提取错误信息
        let errorMsg = '登录失败，请检查账号密码'
        if (e.data && e.data.msg) {
          errorMsg = e.data.msg
        } else if (e.message) {
          errorMsg = e.message
        }

        console.log('显示错误提示:', errorMsg)
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2500
        })
      } finally {
        this.loading = false
        console.log('=== 登录流程结束 ===')
      }
    },
    goToRegister() {
      console.log('跳转到注册页面')
      uni.navigateTo({
        url: '/pages/register/register'
      })
    },
    goToForgetPassword() {
      console.log('点击忘记密码')
      uni.showToast({
        title: '忘记密码功能开发中',
        icon: 'none'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.background-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.interactive-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}

.input-field {
  position: absolute;
  left: 50%;
  transform: translate(-50%, 370%);
  width: 350px;
  height: 48px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(100, 100, 100, 0.4);
  border-radius: 4px;
  outline: none;
  color: rgba(180, 180, 180, 0.9);
  font-size: 15px;
  padding: 0 40px;
  caret-color: #888;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);

  &::placeholder {
    color: rgba(120, 120, 120, 0.6);
    font-weight: 300;
  }

  &:focus {
    border-color: rgba(150, 150, 150, 0.6);
    background: rgba(0, 0, 0, 0.75);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
  }
}

.input-username {
  top: 35.8%;
}

.input-password {
  top: 44.2%;
}

.login-button {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 72.5%;
  width: 300px;
  height: 50px;
  background: linear-gradient(180deg, rgba(120, 50, 40, 0.9) 0%, rgba(90, 35, 30, 0.95) 100%);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  line-height: 50px;
  font-size: 18px;
  font-weight: 500;
  color: rgba(220, 200, 180, 0.95);
  letter-spacing: 3px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(180deg, rgba(140, 60, 50, 0.95) 0%, rgba(100, 40, 35, 1) 100%);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateX(-50%) translateY(-2px);
  }

  &:active {
    transform: translateX(-50%) translateY(0px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.4);
  }
}

.footer-links {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 83%;
  width: 370px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60px;
}

.link-area {
  width: 80px;
  height: 30px;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(180, 140, 120, 0.75);
  transition: all 0.3s ease;
  box-shadow: none;

  &:hover {
    background: transparent;
    border: none;
    color: rgba(220, 180, 150, 0.95);
    box-shadow: none;
    transform: none;
  }

  &:active {
    transform: none;
    box-shadow: none;
    background: transparent;
  }
}

.link-register {
  margin-right: 0;
}

.link-forget {
  margin-left: 0;
}

// 适配不同屏幕尺寸
@media screen and (min-width: 1920px) {
  .input-field {
    width: 300px;
    height: 60px;
    font-size: 18px;
  }

  .login-button {
    width: 470px;
    height: 62px;
  }

  .footer-links {
    width: 470px;
  }

  .link-register,
  .link-forget {
    width: 100px;
    height: 35px;
  }
}

@media screen and (max-width: 1280px) {
  .input-field {
    width: 200px;
    height: 20px;
    font-size: 14px;
  }

  .login-button {
    width: 200px;
    height: 42px;
  }

  .footer-links {
    width: 300px;
  }

  .link-register,
  .link-forget {
    width: 70px;
    height: 25px;
  }
}
</style>
