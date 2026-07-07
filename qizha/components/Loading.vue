<template>
  <view v-if="visible" class="loading-overlay">
    <view class="loading-container">
      <view class="spinner"></view>
      <text v-if="text" class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.loading-container {
  background: linear-gradient(160deg, rgba(40, 25, 18, 0.9) 0%, rgba(28, 18, 12, 0.9) 100%);
  border: 1px solid rgba(120, 80, 50, 0.4);
  border-radius: 12rpx;
  padding: 30rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.5);
}

.spinner {
  width: 50rpx;
  height: 50rpx;
  border: 4rpx solid rgba(100, 60, 40, 0.3);
  border-top-color: rgba(220, 200, 180, 0.9);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: rgba(220, 200, 180, 0.95);
  font-size: 24rpx;
  letter-spacing: 1rpx;
}
</style>
