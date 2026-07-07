<template>
  <view v-if="visible" class="input-overlay" @tap.self="handleCancel">
    <view class="input-modal">
      <text class="input-title">{{ title }}</text>
      <input
        class="input-field"
        type="text"
        v-model="inputValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        @confirm="handleConfirm"
      />
      <view class="input-buttons">
        <button class="input-btn cancel-btn" @tap="handleCancel">{{ cancelText }}</button>
        <button class="input-btn confirm-btn-primary" @tap="handleConfirm">{{ confirmText }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '请输入'
  },
  placeholder: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  maxlength: {
    type: Number,
    default: 50
  },
  defaultValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

const inputValue = ref('')

watch(() => props.visible, (newVal) => {
  if (newVal) {
    inputValue.value = props.defaultValue
  }
})

function handleConfirm() {
  if (!inputValue.value.trim()) {
    return
  }
  emit('confirm', inputValue.value.trim())
  emit('update:visible', false)
  inputValue.value = ''
}

function handleCancel() {
  emit('cancel')
  emit('update:visible', false)
  inputValue.value = ''
}
</script>

<style scoped>
.input-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.input-modal {
  width: 420px;
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  border: 3px solid #5a3a1e;
  border-radius: 16px;
  padding: 32px 28px 24px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.9),
    0 0 0 1px rgba(212, 165, 116, 0.2),
    inset 0 1px 0 rgba(212, 165, 116, 0.1);
  animation: modal-appear 0.3s ease-out;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.input-title {
  display: block;
  color: #d4a574;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 24px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.input-field {
  width: 100%;
  height: 48px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #5a3a1e;
  border-radius: 8px;
  color: #d4a574;
  font-size: 16px;
  padding: 0 16px;
  margin-bottom: 24px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.input-field::placeholder {
  color: rgba(160, 128, 96, 0.5);
}

.input-field:focus {
  border-color: #8a4e4e;
  background: rgba(0, 0, 0, 0.65);
  box-shadow:
    inset 0 2px 8px rgba(0, 0, 0, 0.6),
    0 0 0 3px rgba(138, 78, 78, 0.2);
}

.input-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.input-btn {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border: 2px solid transparent;
}

.cancel-btn {
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  border-color: #5a3a1e;
  color: #a08060;
}

.cancel-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.confirm-btn-primary {
  background: linear-gradient(135deg, #7a3e3e 0%, #5c2e2e 100%);
  border-color: #8a4e4e;
  color: #d4a574;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(122, 62, 62, 0.3);
}

.confirm-btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
</style>
