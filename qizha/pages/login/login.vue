<template>
  <view class="login-container" @tap="ensureLoginMusic">
    <image class="background-image" src="/static/images/login.png" mode="aspectFill"></image>
    <view class="background-vignette"></view>

    <!-- 交互层 -->
    <view class="interactive-layer">
      <view class="login-panel">
        <view class="panel-header">
          <text class="panel-title">骗子酒馆</text>
          <text class="panel-subtitle">LIAR'S BAR</text>
        </view>

        <!-- 账号输入框 -->
        <input class="input-field input-username" type="text" v-model="username" placeholder="请输入账号"
          @focus="ensureLoginMusic" />

        <!-- 密码输入框 -->
        <input class="input-field input-password" type="password" v-model="password" placeholder="请输入密码"
          @focus="ensureLoginMusic" />

        <!-- 登录按钮 -->
        <view class="login-button" @click="handleLogin">登录</view>

        <!-- 底部链接区域 -->
        <view class="footer-links">
          <view class="link-area link-register" @click="goToRegister">注册账号</view>
          <view class="link-divider"></view>
          <view class="link-area link-forget" @click="goToForgetPassword">忘记密码</view>
        </view>
      </view>
    </view>

    <!-- 自定义加载组件 -->
    <Loading :visible="loading" text="登录中..." />

    <!-- 自定义提示组件 -->
    <Toast v-model:visible="toast.show" :message="toast.msg" :type="toast.type" />

    <view v-if="showEntryFade" class="entry-fade-mask" :class="{ hiding: entryFadeHiding }"></view>
  </view>
</template>

<script>
import Loading from '../../components/Loading.vue'
import Toast from '../../components/Toast.vue'
import { playBgm, playSfx } from '../../utils/audio'

export default {
  components: {
    Loading,
    Toast
  },
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      showEntryFade: false,
      entryFadeHiding: false,
      entryFadeTimer: null,
      entryFadeRemoveTimer: null,
      toast: {
        show: false,
        msg: '',
        type: 'error'
      }
    }
  },
  onLoad(options = {}) {
    console.log('=== 登录页面加载 ===')
    this.setLandscape()
    this.ensureLoginMusic()
    if (options.fromSplash) {
      this.showEntryFade = true
      this.entryFadeTimer = setTimeout(() => {
        this.entryFadeHiding = true
      }, 80)
      this.entryFadeRemoveTimer = setTimeout(() => {
        this.showEntryFade = false
        this.entryFadeHiding = false
      }, 820)
    }
  },
  onShow() {
    console.log('=== 登录页面显示 ===')
    // 每次页面显示时都强制横屏，防止其他页面解锁后无法恢复
    this.setLandscape()
    this.ensureLoginMusic()
  },
  onUnload() {
    console.log('=== 登录页面卸载 ===')
    if (this.entryFadeTimer) clearTimeout(this.entryFadeTimer)
    if (this.entryFadeRemoveTimer) clearTimeout(this.entryFadeRemoveTimer)
    // 不要在这里解除横屏锁定，让下一个页面自己控制
  },
  methods: {
    ensureLoginMusic() {
      playBgm('login')
    },
    showToast(msg, type = 'error') {
      this.toast = { show: true, msg, type }
    },
    setLandscape() {
      // 强制横屏
      // #ifdef APP-PLUS
      plus.screen.lockOrientation('landscape-primary')
      console.log('已设置横屏模式')
      // #endif
    },
    async handleLogin() {
      this.ensureLoginMusic()
      playSfx('uiClick')
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
        this.showToast('请输入账号', 'error')
        return
      }

      // 验证：检查密码
      if (!this.password) {
        console.warn('验证失败: 密码为空')
        this.showToast('请输入密码', 'error')
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
        this.showToast('登录成功', 'success')

        // 延迟跳转到大厅页面
        setTimeout(() => {
          console.log('跳转到大厅页面')
          uni.reLaunch({
            url: '/pages/lobby/lobby'
          })
        }, 1200)
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
        this.showToast(errorMsg, 'error')
      } finally {
        this.loading = false
        console.log('=== 登录流程结束 ===')
      }
    },
    goToRegister() {
      this.ensureLoginMusic()
      playSfx('uiClick')
      console.log('跳转到注册页面')
      uni.navigateTo({
        url: '/pages/register/register'
      })
    },
    goToForgetPassword() {
      this.ensureLoginMusic()
      playSfx('uiClick')
      console.log('点击忘记密码')
      this.showToast('忘记密码功能开发中', 'info')
    }
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.background-image {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.background-vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 24% 50%, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.18) 38%, rgba(0, 0, 0, 0.58) 100%),
    linear-gradient(90deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.08) 46%, rgba(0, 0, 0, 0.58) 100%);
  z-index: 1;
}

.interactive-layer {
  position: absolute;
  top: 17%;
  left: -25%;
  width: 80%;
  height: 60%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: clamp(48px, 9vw, 132px);
  box-sizing: border-box;
}

.login-panel {
  width: 324px;
  padding: 19px 24px 18px;
  box-sizing: border-box;
  background: linear-gradient(155deg, rgba(23, 13, 9, 0.88) 0%, rgba(42, 24, 17, 0.78) 100%);
  border: 1px solid rgba(212, 165, 116, 0.34);
  border-radius: 8px;
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.72),
    inset 0 1px 0 rgba(255, 230, 188, 0.14),
    inset 0 0 28px rgba(120, 50, 40, 0.16);
  backdrop-filter: blur(8px);
}

.panel-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 17px;
}

.panel-title {
  color: #f1d5a8;
  font-size: 25px;
  font-weight: 800;
  line-height: 1.15;
  text-shadow: 0 3px 8px rgba(0, 0, 0, 0.8);
}

.panel-subtitle {
  margin-top: 4px;
  color: rgba(205, 157, 102, 0.8);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
}

.input-field {
  width: 100%;
  height: 40px;
  box-sizing: border-box;
  margin-bottom: 10px;
  background: rgba(8, 5, 4, 0.72);
  border: 1px solid rgba(164, 107, 68, 0.42);
  border-radius: 6px;
  outline: none;
  color: rgba(244, 226, 198, 0.95);
  font-size: 14px;
  padding: 0 13px;
  caret-color: #d4a574;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.55);

  &::placeholder {
    color: rgba(185, 143, 104, 0.55);
    font-weight: 300;
  }

  &:focus {
    border-color: rgba(222, 171, 112, 0.88);
    background: rgba(12, 7, 5, 0.88);
    box-shadow: 0 0 0 2px rgba(212, 165, 116, 0.12), inset 0 2px 8px rgba(0, 0, 0, 0.62);
  }
}

.input-username {
  margin-top: 0;
}

.input-password {
  margin-bottom: 14px;
}

.login-button {
  width: 100%;
  height: 42px;
  background: linear-gradient(180deg, rgba(158, 74, 54, 0.96) 0%, rgba(105, 38, 31, 0.98) 100%);
  border: 1px solid rgba(228, 157, 98, 0.5);
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  line-height: 42px;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 238, 210, 0.97);
  letter-spacing: 3px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 220, 180, 0.18);
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(180deg, rgba(178, 86, 61, 1) 0%, rgba(118, 44, 34, 1) 100%);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 220, 180, 0.22);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.4);
  }
}

.footer-links {
  width: 100%;
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 18px;
}

.link-area {
  min-width: 72px;
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

.link-divider {
  width: 1px;
  height: 14px;
  background: rgba(160, 128, 96, 0.36);
}

.entry-fade-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #000;
  opacity: 1;
  transition: opacity 700ms ease;
  pointer-events: none;
}

.entry-fade-mask.hiding {
  opacity: 0;
}

// 适配不同屏幕尺寸
@media screen and (min-width: 1920px) {
  .login-panel {
    width: 360px;
    padding: 24px 28px 22px;
  }

  .panel-title {
    font-size: 28px;
  }

  .input-field,
  .login-button {
    height: 46px;
    line-height: 46px;
    font-size: 15px;
  }
}

@media screen and (max-width: 1280px) {
  .interactive-layer {
    padding-right: 42px;
  }

  .login-panel {
    width: 318px;
    padding: 20px 22px 18px;
  }

  .panel-header {
    margin-bottom: 16px;
  }

  .panel-title {
    font-size: 24px;
  }

  .input-field {
    height: 40px;
    margin-bottom: 10px;
    font-size: 14px;
  }

  .input-password {
    margin-bottom: 14px;
  }

  .login-button {
    height: 42px;
    line-height: 42px;
    font-size: 16px;
  }

  .footer-links {
    margin-top: 12px;
  }
}
</style>
