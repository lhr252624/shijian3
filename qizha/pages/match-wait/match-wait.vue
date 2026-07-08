<template>
  <view class="match-page">
    <view class="match-card">
      <view class="spinner"></view>
      <text class="match-title">正在寻找对手...</text>
      <text class="elapsed">等待时间: {{ elapsed }}s</text>
      <text v-if="elapsed > 10" class="hint">正在为您匹配AI对手</text>
      <button class="cancel-btn" @tap="cancelMatch">取消匹配</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated } from 'vue'
import { matchAPI } from '../../utils/api'
import wsClient from '../../utils/websocket'

const elapsed = ref(0)
let timer = null

// 强制横屏
function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  console.log('已设置横屏模式')
  // #endif
}

function onMatchFound(payload) {
  console.log('收到 MATCH_FOUND:', payload)
  if (timer) clearInterval(timer)
  const roomId = payload.room_id
  if (roomId) {
    // 使用 reLaunch 替代 redirectTo，确保清空页面栈，停止 lobby 的轮询
    uni.reLaunch({
      url: `/pages/game-room/game-room?id=${roomId}`
    })
  }
}

function onGameStarted(payload) {
  console.log('收到 GAME_STARTED:', payload)
  if (timer) clearInterval(timer)
}

onMounted(() => {
  setLandscape()

  timer = setInterval(() => {
    elapsed.value++
  }, 1000)

  // 直接注册监听器（WebSocket 客户端会缓存监听器）
  wsClient.on('MATCH_FOUND', onMatchFound)
  wsClient.on('GAME_STARTED', onGameStarted)

  console.log('匹配等待页面已加载，等待匹配结果...')
})

onActivated(() => {
  setLandscape()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  wsClient.off('MATCH_FOUND', onMatchFound)
  wsClient.off('GAME_STARTED', onGameStarted)
})

async function cancelMatch() {
  try {
    await matchAPI.cancel()
    if (timer) clearInterval(timer)
    uni.navigateBack()
  } catch (e) {
    console.error('Cancel failed:', e)
  }
}
</script>

<style scoped>
.match-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1a0f0a 0%, #2a1812 50%, #1f1208 100%);
  z-index: 9999;
}

.match-card {
  position: relative;
  text-align: center;
  padding: 50px 60px;
  background: rgba(30, 10, 10, 0.9);
  border: 2px solid #5c2e2e;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(139, 69, 19, 0.2);
  z-index: 10000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #3a2616;
  border-top-color: #d4a574;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.match-title {
  display: block;
  color: #d4a574;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.elapsed {
  display: block;
  color: #a08060;
  font-size: 16px;
  margin-bottom: 8px;
}

.hint {
  display: block;
  color: #d4a574;
  font-size: 14px;
  margin-bottom: 24px;
  opacity: 0.9;
}

.cancel-btn {
  background: linear-gradient(145deg, #5c2e2e 0%, #3a2616 100%);
  color: #d4a574;
  padding: 12px 32px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #5a3a1e;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
</style>
