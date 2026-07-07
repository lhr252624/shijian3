<template>
  <view v-if="visible" class="toast-container" :class="type">
    <view class="toast-content">
      <text class="toast-icon">{{ icon }}</text>
      <text class="toast-msg">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'error' // error | success | info
  },
  duration: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['update:visible'])

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return '✓'
    case 'error':
      return '⚠️'
    case 'info':
      return 'ℹ️'
    default:
      return '⚠️'
  }
})

let timer = null

watch(() => props.visible, (val) => {
  if (val) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      emit('update:visible', false)
    }, props.duration)
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 40rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  animation: toast-in 0.3s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, -20rpx);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 28rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 400;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8rpx);
  max-width: 80vw;
}

.toast-container.error .toast-content {
  background: rgba(120, 30, 25, 0.92);
  border: 1px solid rgba(233, 69, 96, 0.6);
  color: rgba(255, 228, 224, 0.95);
}

.toast-container.success .toast-content {
  background: rgba(40, 90, 55, 0.92);
  border: 1px solid rgba(74, 222, 128, 0.6);
  color: rgba(216, 255, 228, 0.95);
}

.toast-container.info .toast-content {
  background: rgba(30, 70, 120, 0.92);
  border: 1px solid rgba(59, 130, 246, 0.6);
  color: rgba(219, 234, 254, 0.95);
}

.toast-icon {
  font-size: 26rpx;
  line-height: 1;
}

.toast-msg {
  flex: 1;
  line-height: 1.4;
}
</style>
