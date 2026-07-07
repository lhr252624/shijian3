<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')

  // #ifdef APP-PLUS
  // 锁定为横屏模式
  plus.screen.lockOrientation('landscape-primary')
  // #endif
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
@import './styles/global.css';
</style>
