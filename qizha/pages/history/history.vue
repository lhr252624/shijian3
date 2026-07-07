<template>
  <view class="history-page">
    <view class="page-header safe-area-inset-top">
      <button class="back-btn" @tap="goBack">← 返回</button>
      <text class="page-title">历史战绩</text>
      <view style="width: 100rpx;"></view>
    </view>

    <scroll-view class="history-content" scroll-y>
      <view v-if="historyList.length === 0" class="empty">暂无历史记录</view>

      <view
        v-for="record in historyList"
        :key="record.id"
        class="history-card"
        :class="{ win: record.is_win, lose: !record.is_win }"
      >
        <view class="history-header">
          <view class="result-badge" :class="{ win: record.is_win }">
            {{ record.is_win ? '胜利' : '失败' }}
          </view>
          <text class="history-date">{{ formatDate(record.created_at) }}</text>
        </view>

        <view class="history-stats">
          <view class="stat-item">
            <text class="stat-label">回合数</text>
            <text class="stat-value">{{ record.total_turns || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">出牌次数</text>
            <text class="stat-value">{{ record.plays_count || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">质疑次数</text>
            <text class="stat-value">{{ record.challenges_count || 0 }}</text>
          </view>
        </view>

        <view v-if="record.elo_change" class="elo-change" :class="{ positive: record.elo_change > 0 }">
          ELO {{ record.elo_change > 0 ? '+' : '' }}{{ record.elo_change }}
        </view>
      </view>
    </scroll-view>

    <Toast
      v-model:visible="toast.show"
      :message="toast.msg"
      :type="toast.type"
    />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { historyAPI } from '../../utils/api'
import Toast from '../../components/Toast.vue'

const historyList = ref([])
const toast = ref({ show: false, msg: '', type: 'error' })

onMounted(async () => {
  try {
    const res = await historyAPI.list()
    historyList.value = res.data || []
  } catch (e) {
    console.error('Failed to load history:', e)
    showToast('加载失败')
  }
})

function showToast(msg, type = 'error') {
  toast.value = { show: true, msg, type }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 40rpx;
  background: rgba(22, 33, 62, 0.8);
  border-bottom: 1px solid #333;
}

.back-btn {
  background: none;
  color: #888;
  padding: 0;
  font-size: 28rpx;
}

.page-title {
  color: #e94560;
  font-size: 36rpx;
  font-weight: 700;
}

.history-content {
  height: calc(100vh - 120rpx);
  padding: 40rpx;
}

.empty {
  text-align: center;
  color: #666;
  padding: 120rpx 0;
  font-size: 28rpx;
}

.history-card {
  background: rgba(22, 33, 62, 0.8);
  border: 1px solid #333;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.history-card.win {
  border-color: #4ade80;
  box-shadow: 0 0 20rpx rgba(74, 222, 128, 0.2);
}

.history-card.lose {
  border-color: #e94560;
  box-shadow: 0 0 20rpx rgba(233, 69, 96, 0.2);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.result-badge {
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  background: rgba(233, 69, 96, 0.2);
  color: #e94560;
}

.result-badge.win {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.history-date {
  color: #888;
  font-size: 24rpx;
}

.history-stats {
  display: flex;
  gap: 32rpx;
  margin-bottom: 20rpx;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  display: block;
  color: #888;
  font-size: 22rpx;
  margin-bottom: 8rpx;
}

.stat-value {
  display: block;
  color: #e0e0e0;
  font-size: 32rpx;
  font-weight: 700;
}

.elo-change {
  text-align: center;
  padding: 12rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  background: rgba(233, 69, 96, 0.2);
  color: #e94560;
}

.elo-change.positive {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}
</style>
