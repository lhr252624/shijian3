<template>
  <view class="studio-splash" :class="{ fading: isFading }">
    <image class="studio-image" src="/static/images/studio_splash_wuyaoling_510.png" mode="aspectFit" />
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { stopBgm } from '../../utils/audio'

let enterTimer = null
let fadeTimer = null
const isFading = ref(false)

function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  // #endif
}

function enterLogin() {
  if (enterTimer) {
    clearTimeout(enterTimer)
    enterTimer = null
  }

  uni.reLaunch({
    url: '/pages/login/login?fromSplash=1'
  })
}

onMounted(() => {
  setLandscape()
  stopBgm()
  fadeTimer = setTimeout(() => {
    isFading.value = true
  }, 2200)
  enterTimer = setTimeout(enterLogin, 3000)
})

onUnmounted(() => {
  if (fadeTimer) {
    clearTimeout(fadeTimer)
    fadeTimer = null
  }
  if (enterTimer) {
    clearTimeout(enterTimer)
    enterTimer = null
  }
})
</script>

<style lang="scss" scoped>
.studio-splash {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.studio-image {
  width: 100%;
  height: 100%;
  opacity: 1;
  transition: opacity 800ms ease;
}

.studio-splash.fading .studio-image {
  opacity: 0;
}
</style>
