<template>
  <view class="cg-page">
    <video
      id="introCg"
      class="cg-video"
      src="/static/videos/cg.mp4"
      autoplay
      :controls="false"
      :show-center-play-btn="false"
      :show-fullscreen-btn="false"
      :show-play-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      @ended="enterLobby"
      @error="handleVideoError"
    />

    <view class="cg-overlay">
      <button class="skip-btn" @tap="enterLobby(true)">跳过</button>
    </view>
  </view>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { playSfx, stopBgm } from '../../utils/audio'

let fallbackTimer = null
let leaving = false

function enterLobby(playSkipSound = false) {
  if (leaving) return
  leaving = true
  if (playSkipSound) playSfx('uiClick')

  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }

  uni.reLaunch({
    url: '/pages/lobby/lobby'
  })
}

function handleVideoError(err) {
  console.error('CG 视频播放失败:', err)
  enterLobby()
}

function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  // #endif
}

onMounted(() => {
  setLandscape()
  stopBgm()
  fallbackTimer = setTimeout(() => {
    enterLobby()
  }, 120000)
})

onUnmounted(() => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
    fallbackTimer = null
  }
})
</script>

<style lang="scss" scoped>
.cg-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #050302;
  overflow: hidden;
}

.cg-video {
  width: 100%;
  height: 100%;
}

.cg-overlay {
  position: absolute;
  top: 18px;
  right: 22px;
  z-index: 10;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-right: constant(safe-area-inset-right);
  padding-right: env(safe-area-inset-right);
}

.skip-btn {
  min-width: 86px;
  height: 36px;
  padding: 0 18px;
  border: 1px solid rgba(226, 204, 174, 0.45);
  border-radius: 4px;
  background: rgba(10, 7, 5, 0.58);
  color: rgba(244, 226, 198, 0.95);
  font-size: 14px;
  line-height: 34px;
  letter-spacing: 2px;
}

.skip-btn:active {
  background: rgba(88, 39, 28, 0.72);
}
</style>
