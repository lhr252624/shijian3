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
  top: 50rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, -30rpx) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 24rpx;
  border-radius: 6rpx;
  font-size: 14px;
  font-weight: 500;
  max-width: 80vw;
  position: relative;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.5),
    0 8px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.toast-container.error .toast-content {
  background: linear-gradient(135deg,
    rgba(60, 25, 20, 0.95) 0%,
    rgba(45, 20, 18, 0.95) 100%);
  border: 1.5px solid rgba(180, 60, 50, 0.6);
  color: #f5d4a0;
}

.toast-container.success .toast-content {
  background: linear-gradient(135deg,
    rgba(35, 55, 30, 0.95) 0%,
    rgba(25, 40, 22, 0.95) 100%);
  border: 1.5px solid rgba(100, 150, 80, 0.6);
  color: #d4e8a0;
}

.toast-container.info .toast-content {
  background: linear-gradient(135deg,
    rgba(40, 35, 30, 0.95) 0%,
    rgba(30, 25, 20, 0.95) 100%);
  border: 1.5px solid rgba(120, 100, 70, 0.6);
  color: #e8d4a0;
}

.toast-icon {
  font-size: 16px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.toast-msg {
  flex: 1;
  line-height: 1.5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  letter-spacing: 0.3px;
}
</style>
