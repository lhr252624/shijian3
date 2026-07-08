<template>
  <view class="profile-page">
    <view class="page-header safe-area-inset-top">
      <button class="back-btn" @tap="goBack">← 返回</button>
      <text class="page-title">个人中心</text>
      <view style="width: 100rpx;"></view>
    </view>

    <view v-if="profile" class="profile-content">
      <!-- 上半部分：左右布局 -->
      <view class="top-section">
        <!-- 左侧：头像和基本信息 -->
        <view class="left-panel">
          <!-- 头像和昵称行 -->
          <view class="user-header">
            <view class="avatar">{{ profile.nickname?.charAt(0) || '?' }}</view>
            <view class="user-info">
              <text class="nickname">{{ profile.nickname }}</text>
              <text class="username">@{{ profile.username }}</text>
            </view>
          </view>

          <!-- 关键数据横向排列 -->
          <view class="key-stats">
            <view class="key-stat-item">
              <text class="key-stat-label">ELO</text>
              <text class="key-stat-value">{{ profile.elo_rating }}</text>
            </view>
            <view class="key-stat-item">
              <text class="key-stat-label">胜率</text>
              <text class="key-stat-value">{{ winRate }}%</text>
            </view>
            <view class="key-stat-item">
              <text class="key-stat-label">总局</text>
              <text class="key-stat-value">{{ profile.total_games }}</text>
            </view>
            <view class="key-stat-item">
              <text class="key-stat-label">胜场</text>
              <text class="key-stat-value">{{ profile.total_wins }}</text>
            </view>
          </view>
        </view>

        <!-- 右侧：详细数据 -->
        <view class="right-panel">
          <text class="panel-title">详细数据</text>
          <view class="data-row">
            <text class="data-label">总游戏</text>
            <text class="data-value">{{ profile.total_games }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">胜利</text>
            <text class="data-value">{{ profile.total_wins }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">失败</text>
            <text class="data-value">{{ profile.total_losses }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">撒谎次数</text>
            <text class="data-value">{{ profile.total_lies }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">质疑次数</text>
            <text class="data-value">{{ profile.total_challenges }}</text>
          </view>
          <view class="data-row">
            <text class="data-label">质疑成功</text>
            <text class="data-value">{{ profile.total_successful_challenges }}</text>
          </view>
        </view>
      </view>

      <!-- 底部：修改资料 -->
      <view class="edit-section">
        <text class="section-title">修改资料</text>
        <view class="edit-form">
          <input v-model="editNickname" class="edit-input" placeholder="新昵称" placeholder-class="input-placeholder" />
          <button class="save-btn" :disabled="!editNickname || editNickname === profile.nickname" @tap="updateProfile">
            保存修改
          </button>
        </view>
      </view>
    </view>

    <Toast v-model:visible="toast.show" :message="toast.msg" :type="toast.type" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { userAPI } from '../../utils/api'
import Toast from '../../components/Toast.vue'

const profile = ref(null)
const editNickname = ref('')
const updateMsg = ref('')
const toast = ref({ show: false, msg: '', type: 'error' })

const winRate = computed(() => {
  if (!profile.value) return 0
  const total = profile.value.total_games
  if (total === 0) return 0
  return Math.round((profile.value.total_wins / total) * 100)
})

onMounted(async () => {
  try {
    const res = await userAPI.getProfile()
    profile.value = res.data
    editNickname.value = res.data?.nickname || ''
  } catch (e) {
    console.error('Failed to load profile:', e)
    showToast('加载失败')
  }
})

function showToast(msg, type = 'error') {
  toast.value = { show: true, msg, type }
}

async function updateProfile() {
  try {
    await userAPI.updateProfile({ nickname: editNickname.value })
    profile.value.nickname = editNickname.value
    showToast('保存成功', 'success')
  } catch (e) {
    showToast('保存失败')
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.profile-page {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(145deg, #1a0f0a 0%, #2a1812 50%, #1f1208 100%);
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background: rgba(30, 10, 10, 0.85);
  border-bottom: 2px solid #5c2e2e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.back-btn {
  margin: 0;
  padding: 12px 20px;
  background: none;
  color: #a08060;
  font-size: 14px;
  border: none;
}

.page-title {
  transform: translateX(30%);
  color: #d4a574;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.profile-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* 上半部分：左右布局 */
.top-section {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

/* 左侧面板 */
.left-panel {
  flex: 1;
  background: linear-gradient(160deg, rgba(30, 10, 10, 0.8) 0%, rgba(42, 24, 18, 0.8) 100%);
  border: 2px solid #5c2e2e;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(212, 165, 116, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 头像和昵称行 */
.user-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(145deg, #8a4a4a 0%, #5c2e2e 100%);
  border: 3px solid #5a3a1e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #d4a574;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nickname {
  color: #d4a574;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.username {
  color: #8a6a4a;
  font-size: 13px;
}

/* 关键数据横向排列 */
.key-stats {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin: 10px;
  padding: 2px 4px;
}

.key-stat-item {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid #5a3a1e;
  border-radius: 8px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
  min-width: 0;
}

.key-stat-label {
  color: #a08060;
  font-size: 12px;
  white-space: nowrap;
}

.key-stat-value {
  color: #d4a574;
  font-size: 16px;
  font-weight: 700;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  background: linear-gradient(160deg, rgba(30, 10, 10, 0.8) 0%, rgba(42, 24, 18, 0.8) 100%);
  border: 2px solid #5c2e2e;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(212, 165, 116, 0.1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-title {
  color: #d4a574;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  flex-shrink: 0;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(90, 58, 30, 0.3);
}

.data-row:last-child {
  border-bottom: none;
}

.data-label {
  color: #a08060;
  font-size: 14px;
}

.data-value {
  color: #d4a574;
  font-size: 14px;
  font-weight: 600;
}

/* 底部修改资料区 */
.edit-section {
  flex-shrink: 0;
  background: linear-gradient(160deg, rgba(30, 10, 10, 0.8) 0%, rgba(42, 24, 18, 0.8) 100%);
  border: 2px solid #5c2e2e;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(212, 165, 116, 0.1);
}

.section-title {
  display: block;
  color: #d4a574;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.edit-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.edit-input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #5a3a1e;
  border-radius: 6px;
  color: #d4a574;
  font-size: 14px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
}

.input-placeholder {
  color: rgba(160, 128, 96, 0.5);
}

.edit-input:focus {
  border-color: #8a4e4e;
  background: rgba(0, 0, 0, 0.65);
}

.save-btn {
  flex-shrink: 0;
  width: 120px;
  height: 36px;
  background: linear-gradient(135deg, #7a3e3e 0%, #5c2e2e 100%);
  border: 2px solid #8a4e4e;
  border-radius: 6px;
  color: #d4a574;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.save-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.save-btn[disabled] {
  opacity: 0.5;
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  border-color: #5a3a1e;
  color: #5a3a1e;
}
</style>
