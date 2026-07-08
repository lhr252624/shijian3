<template>
  <view class="register-container">
    <!-- 交互层 -->
    <view class="interactive-layer">
      <view class="content-wrapper">
        <!-- 标题区域 -->
        <view class="title-section">
          <text class="title-main">注册账号</text>
          <text class="title-sub">JOIN LIAR'S BAR</text>
        </view>

        <!-- 表单区域 -->
        <view class="form-section">
          <!-- 用户名输入框 -->
          <view class="input-group">
            <text class="input-label">用户名</text>
            <input class="input-field" type="text" v-model="username" placeholder="请输入用户名" />
          </view>

          <!-- 昵称输入框 -->
          <view class="input-group">
            <text class="input-label">昵称</text>
            <input class="input-field" type="text" v-model="nickname" placeholder="请输入昵称" />
          </view>

          <!-- 密码输入框 -->
          <view class="input-group">
            <text class="input-label">密码</text>
            <input class="input-field" type="password" v-model="password" placeholder="请输入密码（至少6位）" />
          </view>

          <!-- 确认密码输入框 -->
          <view class="input-group full-width">
            <text class="input-label">确认密码</text>
            <input class="input-field" type="password" v-model="confirmPassword" placeholder="请再次输入密码" />
          </view>

          <!-- 注册按钮 -->
          <view class="register-button full-width" @click="handleRegister" :class="{ disabled: loading }">
            {{ loading ? '注册中...' : '立即注册' }}
          </view>

          <!-- 返回登录 -->
          <view class="back-login full-width" @click="goLogin">
            <text class="back-text">已有账号？返回登录</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Toast 提示 -->
    <Toast v-model:visible="toast.show" :message="toast.msg" :type="toast.type" />
  </view>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, onActivated } from 'vue'
import { useAuthStore } from '../../stores/auth'
import Toast from '../../components/Toast.vue'

const authStore = useAuthStore()

// 强制横屏
function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  console.log('已设置横屏模式')
  // #endif
}

// 页面加载时设置横屏
onMounted(() => {
  console.log('=== 注册页面加载 ===')
  setLandscape()
})

// 页面显示时也设置横屏（防止其他页面解锁后无法恢复）
onActivated(() => {
  console.log('=== 注册页面显示 ===')
  setLandscape()
})

const username = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const toast = ref({ show: false, msg: '', type: 'error' })

function showToast(msg, type = 'error') {
  toast.value = { show: true, msg, type }
}

async function handleRegister() {
  // 防止重复请求
  if (loading.value) {
    console.warn('正在注册中，请勿重复点击')
    return
  }

  console.log('=== 开始注册流程 ===')
  console.log('表单数据:', {
    username: username.value,
    nickname: nickname.value,
    passwordLength: password.value.length,
    confirmPasswordLength: confirmPassword.value.length
  })

  // 验证：检查是否填写完整
  if (!username.value.trim() || !nickname.value.trim() || !password.value || !confirmPassword.value) {
    console.warn('验证失败: 信息不完整')
    showToast('请填写完整信息')
    return
  }

  // 验证：检查两次密码是否一致
  if (password.value !== confirmPassword.value) {
    console.warn('验证失败: 两次密码不一致')
    showToast('两次密码输入不一致')
    return
  }

  // 验证：检查密码长度
  if (password.value.length < 6) {
    console.warn('验证失败: 密码长度不足')
    showToast('密码长度至少6位')
    return
  }

  console.log('表单验证通过，准备调用API')
  loading.value = true

  // 显示加载提示
  uni.showLoading({
    title: '注册中...',
    mask: true
  })

  try {
    console.log('调用注册API...')
    const result = await authStore.register(username.value, password.value, nickname.value)
    console.log('注册API响应:', result)

    // 隐藏加载提示
    uni.hideLoading()

    showToast('注册成功，请登录', 'success')
    console.log('注册成功，1.5秒后跳转到登录页')

    // 延迟跳转到登录页
    setTimeout(() => {
      console.log('跳转到登录页')
      uni.navigateBack()
    }, 1500)
  } catch (e) {
    console.error('注册失败:', e)
    console.error('错误详情:', {
      response: e.response,
      message: e.message,
      stack: e.stack
    })

    // 隐藏加载提示
    uni.hideLoading()

    const msg = e.response?.data?.msg || e.message || '注册失败，请稍后重试'
    console.log('显示错误提示:', msg)
    showToast(msg)
  } finally {
    loading.value = false
    console.log('=== 注册流程结束 ===')
  }
}

function goLogin() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.register-container {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #1a0f0a 100%);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.interactive-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  // padding: 30px 50px;
}

.content-wrapper {
  display: flex;
  // flex-direction: column;
  align-items: center;
  max-height: calc(100vh - 120px);
}

.title-section {
  flex-shrink: 0;
  margin-bottom: 10px;
  text-align: center;
}

.title-main {
  display: block;
  font-size: 32px;
  font-weight: 600;
  color: rgba(220, 200, 180, 0.95);
  letter-spacing: 6px;
  margin-bottom: 4px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.title-sub {
  display: block;
  font-size: 12px;
  color: rgba(180, 140, 120, 0.75);
  letter-spacing: 2px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.form-section {
  flex-shrink: 0;
  width: 450px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.input-label {
  font-size: 11px;
  color: rgba(180, 140, 120, 0.85);
  letter-spacing: 0.5px;
  padding-left: 4px;
}

.input-field {
  width: 100%;
  height: 36px;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(100, 100, 100, 0.4);
  border-radius: 4px;
  outline: none;
  color: rgba(180, 180, 180, 0.9);
  font-size: 13px;
  padding: 0 14px;
  caret-color: #888;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
  box-sizing: border-box;

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

.register-button {
  width: 100%;
  height: 42px;
  margin-top: 8px;
  background: linear-gradient(180deg, rgba(120, 50, 40, 0.9) 0%, rgba(90, 35, 30, 0.95) 100%);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  line-height: 42px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(220, 200, 180, 0.95);
  letter-spacing: 3px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(180deg, rgba(140, 60, 50, 0.95) 0%, rgba(100, 40, 35, 1) 100%);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.4);
  }

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.back-login {
  text-align: center;
  margin-top: 6px;
  cursor: pointer;
}

.back-text {
  font-size: 12px;
  color: rgba(180, 140, 120, 0.75);
  transition: color 0.3s ease;

  &:hover {
    color: rgba(220, 180, 150, 0.95);
  }
}

// 适配不同屏幕尺寸
@media screen and (max-width: 1366px) {
  .interactive-layer {
    // padding: 30px 50px;
    padding: 0;
    margin: 0;
  }

  .content-wrapper {
    padding: 0;
    margin: 0;
  }

  .title-main {
    margin-right: 15px;
    font-size: 30px;
  }

  .title-sub {
    font-size: 11px;
  }

  .form-section {
    width: 450px;
    gap: 14px 18px;
  }

  .input-field {
    height: 38px;
    font-size: 13px;
  }

  .register-button {
    height: 44px;
    font-size: 15px;
  }
}

@media screen and (min-width: 1920px) {
  .title-main {
    font-size: 35px;
  }

  .title-sub {
    font-size: 16px;
  }

  .form-section {
    width: 600px;
    gap: 18px 24px;
  }

  .input-field {
    height: 46px;
    font-size: 15px;
  }

  .register-button {
    height: 52px;
    font-size: 17px;
  }
}
</style>
