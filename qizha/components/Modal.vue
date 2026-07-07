<template>
  <view v-if="visible" class="modal-overlay" @tap="handleOverlayClick">
    <view class="modal-container" :style="{ width: width }" @tap.stop>
      <view v-if="title" class="modal-header">
        <text class="modal-title">{{ title }}</text>
        <text v-if="showClose" class="modal-close" @tap="handleClose">×</text>
      </view>
      <view class="modal-body">
        <slot></slot>
      </view>
      <view v-if="showFooter" class="modal-footer">
        <slot name="footer">
          <button v-if="showCancel" class="modal-btn cancel-btn" @tap="handleCancel">
            {{ cancelText }}
          </button>
          <button class="modal-btn confirm-btn" @tap="handleConfirm">
            {{ confirmText }}
          </button>
        </slot>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: '600rpx'
  },
  showClose: {
    type: Boolean,
    default: true
  },
  showFooter: {
    type: Boolean,
    default: true
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  closeOnClickOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel', 'close'])

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function handleOverlayClick() {
  if (props.closeOnClickOverlay) {
    handleClose()
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  border: 2px solid #5a3a1e;
  border-radius: 14px;
  max-width: 1000px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(203, 151, 103, 0.2), inset 0 1px 0 rgba(203, 151, 103, 0.1);
  animation: modal-in 0.3s ease;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  position: relative;
  padding: 20px 28px 16px;
  border-bottom: 1px solid #3a2616;
}

.modal-title {
  color: #cb9767;
  font-size: 24px;
  font-weight: 700;
  display: block;
  text-align: center;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 14px;
  color: #8a6a4a;
  font-size: 32px;
  line-height: 1;
  padding: 5px;
  cursor: pointer;
}

.modal-body {
  padding: 20px 28px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px 28px 20px;
  border-top: 1px solid #3a2616;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: none;
}

.cancel-btn {
  background: #2a1a10;
  color: #8a6a4a;
  border: 1px solid #3a2616;
}

.confirm-btn {
  background: linear-gradient(180deg, #9a3827 0%, #7a2a1d 100%);
  color: #f5e6d3;
  border: 1px solid #b04a36;
  box-shadow: 0 8rpx 28rpx rgba(154, 56, 39, 0.35);
}
</style>
