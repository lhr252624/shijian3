<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { stopAllAudio } from './utils/audio'

function lockLandscape() {
  // #ifdef APP-PLUS
  // 锁定为横屏模式
  plus.screen.lockOrientation('landscape-primary')
  // #endif
}

function applyAppFullscreen() {
  // #ifdef APP-PLUS
  lockLandscape()

  // 隐藏状态栏和导航栏，实现真正的全屏
  plus.navigator.setFullscreen(true)

  // 隐藏系统导航栏（虚拟按键）
  plus.navigator.hideSystemNavigation()

  // 设置沉浸式模式
  plus.navigator.setStatusBarStyle('dark')
  // #endif
}

onLaunch(() => {
  console.log('App Launch')

  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined') {
    applyAppFullscreen()
  } else if (typeof document !== 'undefined') {
    document.addEventListener('plusready', applyAppFullscreen, false)
  }
  // #endif

  // #ifdef H5
  // H5端尝试全屏
  document.documentElement.style.height = '100%'
  document.body.style.height = '100%'
  // #endif
})

onShow(() => {
  console.log('App Show')
  lockLandscape()
})

onHide(() => {
  console.log('App Hide')
  stopAllAudio()
})
</script>

<style>
@import './styles/global.css';
</style>
