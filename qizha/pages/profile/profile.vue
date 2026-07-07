<template>
  <view class="profile-page">
    <view class="page-header safe-area-inset-top">
      <button class="back-btn" @tap="goBack">← 返回</button>
      <text class="page-title">个人中心</text>
      <view style="width: 100rpx;"></view>
    </view>

    <scroll-view v-if="profile" class="profile-content" scroll-y>
      <view class="avatar-section">
        <view class="avatar">{{ profile.nickname?.charAt(0) || '?' }}</view>
        <text class="nickname">{{ profile.nickname }}</text>
        <text class="username">@{{ profile.username }}</text>
      </view>

      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-num">{{ profile.elo_rating }}</text>
          <text class="stat-lbl">ELO 评分</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ profile.total_games }}</text>
          <text class="stat-lbl">总局数</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ winRate }}%</text>
          <text class="stat-lbl">胜率</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ profile.total_wins }}</text>
          <text class="stat-lbl">胜场</text>
        </view>
      </view>

      <view class="detail-stats">
        <text class="section-title">详细数据</text>
        <view class="detail-row">
          <text class="detail-label">总游戏</text>
          <text class="detail-value">{{ profile.total_games }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">胜利</text>
          <text class="detail-value">{{ profile.total_wins }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">失败</text>
          <text class="detail-value">{{ profile.total_losses }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">撒谎次数</text>
          <text class="detail-value">{{ profile.total_lies }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">质疑次数</text>
          <text class="detail-value">{{ profile.total_challenges }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">质疑成功</text>
          <text class="detail-value">{{ profile.total_successful_challenges }}</text>
        </view>
      </view>

      <view class="edit-section">
        <text class="section-title">修改资料</text>
        <input v-model="editNickname" class="edit-input" placeholder="新昵称" placeholder-class="input-placeholder" />
        <button class="save-btn" :disabled="!editNickname || editNickname === profile.nickname" @tap="updateProfile">
          保存
        </button>
        <text v-if="updateMsg" class="update-msg">{{ updateMsg }}</text>
      </view>
    </scroll-view>

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
  min-height: 100vh;
  background: linear-gradient(145deg, #1a0f0a 0%, #2a1812 50%, #1f1208 100%);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* padding: 12px 10px; */
  background: rgba(30, 10, 10, 0.85);
  border-bottom: 2px solid #5c2e2e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.back-btn {
  margin: 0;
  padding: 12px 20px;
  background: none;
  color: #a08060;
  /* padding: 0; */
  font-size: 14px;
  border: none;
}

.page-title {
  /* background-color: #4ade80; */
  transform: translateX(30%);
  color: #d4a574;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.profile-content {
  height: calc(100vh - 48px);
  padding: 20px;
}

.avatar-section {
  text-align: center;
  margin-bottom: 24px;
}

.avatar {
  width: 70px;
  height: 70px;
  background: linear-gradient(145deg, #8a4a4a 0%, #5c2e2e 100%);
  border: 2px solid #5a3a1e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #d4a574;
  margin: 0 auto 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.1);
}

.nickname {
  display: block;
  color: #d4a574;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.username {
  display: block;
  color: #8a6a4a;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.stat-item {
  background: rgba(30, 10, 10, 0.6);
  border: 1px solid #5c2e2e;
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.stat-num {
  display: block;
  color: #d4a574;
  font-size: 22px;
  font-weight: 700;
}

.stat-lbl {
  display: block;
  color: #8a6a4a;
  font-size: 11px;
  margin-top: 4px;
}

.detail-stats,
.edit-section {
  background: rgba(30, 10, 10, 0.7);
  border: 2px solid #5c2e2e;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(139, 69, 19, 0.2);
}

.section-title {
  display: block;
  color: #d4a574;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #3a2616;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: #a08060;
  font-size: 14px;
}

.detail-value {
  color: #d4a574;
  font-size: 14px;
  font-weight: 600;
}

.edit-input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(13, 8, 5, 0.8);
  border: 1px solid #5a3a1e;
  border-radius: 6px;
  color: #d6c0a9;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.input-placeholder {
  color: #5a4434;
}

.save-btn {
  width: 100%;
  background: linear-gradient(145deg, #8a4a4a 0%, #5c2e2e 100%);
  color: #d4a574;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #5a3a1e;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.save-btn[disabled] {
  opacity: 0.5;
}

.update-msg {
  display: block;
  color: #4ade80;
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
}
</style>
