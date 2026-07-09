<template>
  <view class="character-select-page">
    <!-- 背景 -->
    <view class="bg-layer"></view>

    <!-- 左侧标题区 -->
    <view class="left-panel">
      <view class="title-section">
        <text class="page-title">选择角色</text>
        <text class="page-subtitle">每个角色拥有独特技能</text>
        <view class="title-decoration">
          <view class="decoration-line"></view>
          <view class="decoration-diamond"></view>
          <view class="decoration-line"></view>
        </view>
      </view>

      <view class="bottom-actions">
        <button class="back-btn" @tap="goBack">
          <text class="btn-icon">←</text>
          <text class="btn-text">返回大厅</text>
        </button>
        <button class="confirm-btn" :disabled="!selectedCharacter" @tap="confirmAndMatch">
          <text class="btn-text">{{ selectedCharacter ? '确认并开始' : '请选择角色' }}</text>
          <text v-if="selectedCharacter" class="btn-icon">→</text>
        </button>
      </view>
    </view>

    <!-- 右侧角色卡片区 -->
    <view class="characters-container" :key="forceRenderKey">
      <view v-for="(char, index) in characters" :key="char.id" class="character-card-wrapper"
        :class="{ selected: selectedCharacter === char.id }" @tap="selectCharacter(char.id)">
        <!-- 三层边框容器 -->
        <view class="card-border-base">
          <!-- 旋转边框层 -->
          <view class="card-border-rotating" :class="{ 'animation-enabled': enableAnimations }"></view>
          <!-- 内层容器 -->
          <view class="card-border-inner">
            <view class="character-card">
              <!-- 角色图片 -->
              <view class="character-avatar">
                <image :src="char.image" mode="aspectFill" :lazy-load="false" :show-menu-by-longpress="false"
                  @error="handleImageError" @load="handleImageLoad" />
              </view>

              <!-- 角色信息 -->
              <view class="character-info">
                <text class="character-name">{{ char.name }}</text>
                <text class="character-desc">{{ char.description }}</text>
                <view class="skill-section">
                  <view class="skill-badge">技能</view>
                  <text class="skill-text">{{ char.skill }}</text>
                </view>
              </view>

              <!-- 选中标记 -->
              <view v-if="selectedCharacter === char.id" class="selected-badge">
                <text class="badge-icon">✓</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <Loading v-if="loading" text="正在匹配..." />
  </view>
</template>

<script setup>
import { ref, onMounted, onActivated, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { matchAPI, roomAPI } from '../../utils/api'
import { playBgm, playSfx } from '../../utils/audio'
import Loading from '../../components/Loading.vue'

const selectedCharacter = ref('')
const loading = ref(false)
const forceRenderKey = ref(0)
const enableAnimations = ref(false)
const pageMode = ref('match')
const pendingRoomName = ref('')
const pendingRoomId = ref('')

// 角色数据
const characters = ref([
  {
    id: 'scubby',
    name: 'Scubby',
    description: '起手多一张万能牌',
    skill: '开局额外获得1张WILD牌，可以代替任何牌型',
    image: '../../static/tavern_characters_v01/assets/art/characters/scubby/scubby_idle_tavern_v01.png'
  },
  {
    id: 'foxy',
    name: 'Foxy',
    description: '可以偷看其他玩家手牌',
    skill: '每个轮次可使用一次，在自己的出牌回合查看目标的所有手牌3秒',
    image: '../../static/tavern_characters_v01/assets/art/characters/foxy/foxy_idle_tavern_v01.png'
  },
  {
    id: 'bristle',
    name: 'Bristle',
    description: '每轮可以质疑两次',
    skill: '不受每轮一次质疑的限制，每轮可以质疑最多2次',
    image: '../../static/tavern_characters_v01/assets/art/characters/bristle/bristle_idle_tavern_v01.png'
  },
  {
    id: 'tor',
    name: 'Tor',
    description: '减少惩罚或免疫',
    skill: '失败惩罚时有50%概率减少1发子弹或完全免疫惩罚',
    image: '../../static/tavern_characters_v01/assets/art/characters/tor/tor_idle_tavern_v01.png'
  }
])

// 强制横屏
function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  console.log('已设置横屏模式')
  // #endif
}

onLoad((options = {}) => {
  pageMode.value = options.mode || 'match'
  pendingRoomName.value = decodeURIComponent(options.roomName || '')
  pendingRoomId.value = decodeURIComponent(options.roomId || '')
})

onMounted(() => {
  setLandscape()
  playBgm('lobby')
  // 多次延迟强制重绘，确保渲染稳定
  nextTick(() => {
    setTimeout(() => {
      forceRenderKey.value++
      console.log('第一次强制重绘')
    }, 50)

    setTimeout(() => {
      forceRenderKey.value++
      console.log('第二次强制重绘')
    }, 150)

    setTimeout(() => {
      forceRenderKey.value++
      console.log('第三次强制重绘')
    }, 300)

    // 延迟启用动画，确保所有内容已经渲染完成
    setTimeout(() => {
      enableAnimations.value = true
      console.log('启用旋转动画')
    }, 500)
  })
})

onActivated(() => {
  setLandscape()
  playBgm('lobby')
  // 页面激活时也强制重绘
  nextTick(() => {
    setTimeout(() => {
      forceRenderKey.value++
      console.log('页面激活，强制重绘')
    }, 50)

    setTimeout(() => {
      forceRenderKey.value++
      console.log('页面激活，第二次重绘')
    }, 150)
  })
})

function selectCharacter(charId) {
  playSfx('uiClick')
  selectedCharacter.value = charId
  console.log('选择角色:', charId)
}

function handleImageError(e) {
  console.error('图片加载失败:', e)
}

function handleImageLoad(e) {
  console.log('图片加载成功:', e)
}

async function confirmAndMatch() {
  playSfx('uiClick')
  if (!selectedCharacter.value) {
    uni.showToast({
      title: '请先选择角色',
      icon: 'none'
    })
    return
  }

  console.log('========== 确认角色 ==========')
  console.log('选中的角色ID:', selectedCharacter.value)
  console.log('页面模式:', pageMode.value)
  console.log('================================')

  loading.value = true
  try {
    if (pageMode.value === 'create-room') {
      const result = await roomAPI.create(pendingRoomName.value, selectedCharacter.value)
      const data = result?.data || result || {}
      const room = data.room || data
      const roomId = room.id || room.room_id

      if (!roomId) {
        throw new Error('创建房间成功但未返回房间ID')
      }

      uni.redirectTo({
        url: `/pages/game-room/game-room?id=${roomId}&character_id=${encodeURIComponent(selectedCharacter.value)}`
      })
      return
    }

    if (pageMode.value === 'join-room') {
      if (!pendingRoomId.value) {
        throw new Error('加入房间缺少房间ID')
      }

      await roomAPI.join(pendingRoomId.value, selectedCharacter.value)
      uni.redirectTo({
        url: `/pages/game-room/game-room?id=${encodeURIComponent(pendingRoomId.value)}&character_id=${encodeURIComponent(selectedCharacter.value)}`
      })
      return
    }

    const result = await matchAPI.start({ character_id: selectedCharacter.value })
    console.log('匹配API返回结果:', result)

    uni.redirectTo({
      url: '/pages/match-wait/match-wait'
    })
  } catch (e) {
    console.error('确认角色失败:', e)
    uni.showToast({
      title: pageMode.value === 'create-room'
        ? '创建房间失败，请重试'
        : pageMode.value === 'join-room'
          ? '加入房间失败，请重试'
          : '匹配失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

function goBack() {
  playSfx('uiClick')
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.character-select-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: row;
}

.bg-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, #1a0f0a 0%, #2a1812 50%, #1f1208 100%);
  z-index: 0;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 30%, rgba(212, 165, 116, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(138, 78, 78, 0.05) 0%, transparent 50%);
    animation: bgPulse 8s ease-in-out infinite;
  }
}

@keyframes bgPulse {

  0%,
  100% {
    opacity: 0.3;
  }

  50% {
    opacity: 0.6;
  }
}

/* 左侧面板 */
.left-panel {
  position: relative;
  z-index: 1;
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 30px;
  background: linear-gradient(to right, rgba(26, 15, 10, 0.8) 0%, rgba(26, 15, 10, 0) 100%);
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.page-title {
  font-size: 30px;
  font-weight: 800;
  color: #d4a574;
  text-shadow:
    2px 2px 4px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(212, 165, 116, 0.4);
  margin-bottom: 12px;
  letter-spacing: 2px;
  animation: titleGlow 3s ease-in-out infinite;
}

@keyframes titleGlow {

  0%,
  100% {
    text-shadow:
      2px 2px 4px rgba(0, 0, 0, 0.8),
      0 0 20px rgba(212, 165, 116, 0.4);
  }

  50% {
    text-shadow:
      2px 2px 4px rgba(0, 0, 0, 0.8),
      0 0 30px rgba(212, 165, 116, 0.6);
  }
}

.page-subtitle {
  font-size: 16px;
  color: #a08060;
  margin-bottom: 24px;
  letter-spacing: 1px;
}

.title-decoration {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.decoration-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #5a3a1e, transparent);
}

.decoration-diamond {
  width: 8px;
  height: 8px;
  background: #d4a574;
  transform: rotate(45deg);
  box-shadow: 0 0 8px rgba(212, 165, 116, 0.6);
}

.bottom-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-btn,
.confirm-btn {
  width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 12px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: 2px solid;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.back-btn {
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  border-color: #5a3a1e;
  color: #a08060;
}

.back-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.confirm-btn {
  background: linear-gradient(135deg, #7a3e3e 0%, #5c2e2e 100%);
  border-color: #8a4e4e;
  color: #d4a574;
}

.confirm-btn:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.confirm-btn:disabled {
  background: linear-gradient(135deg, #2a1812 0%, #1a0f0a 100%);
  border-color: #3a2616;
  color: #5a3a1e;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 20px;
  font-weight: 700;
}

.btn-text {
  font-size: 12px;
}

/* 右侧角色容器 */
.characters-container {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  padding: 40px 30px 40px 20px;
  overflow-x: auto;
  overflow-y: hidden;
}

.characters-container::-webkit-scrollbar {
  height: 6px;
}

.characters-container::-webkit-scrollbar-track {
  background: rgba(42, 24, 18, 0.5);
  border-radius: 3px;
}

.characters-container::-webkit-scrollbar-thumb {
  background: rgba(90, 58, 30, 0.8);
  border-radius: 3px;
}

.character-card-wrapper {
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.character-card-wrapper:hover {
  transform: translateY(-8px);
}

.character-card-wrapper.selected {
  transform: translateY(-12px) scale(1.02);
}

.character-card-wrapper:hover {
  transform: translateY(-8px);
}

.character-card-wrapper.selected {
  transform: translateY(-12px) scale(1.02);
}

/* 第一层：底层容器（外边框） */
.card-border-base {
  position: relative;
  width: 200px;
  height: 340px;
  padding: 4px;
  background: linear-gradient(135deg, #2a1812 0%, #1a0f0a 100%);
  overflow: hidden;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.8),
    inset 0 2px 4px rgba(0, 0, 0, 0.6);
  border: 2px solid transparent;
  background-clip: padding-box;
  isolation: isolate;
  /* 使用 clip-path 创建棱角效果 */
  clip-path: polygon(
    15px 0%, calc(100% - 15px) 0%,
    100% 15px, 100% calc(100% - 15px),
    calc(100% - 15px) 100%, 15px 100%,
    0% calc(100% - 15px), 0% 15px
  );
}

.character-card-wrapper.selected .card-border-base {
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(212, 165, 116, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

.character-card-wrapper.selected .card-border-base {
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(212, 165, 116, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.6);
}

/* 第二层：旋转容器（旋转边框效果） */
.card-border-rotating {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400%;
  height: 400%;
  transform: translate(-50%, -50%);
  background: conic-gradient(from 0deg,
      transparent 0%,
      transparent 10%,
      rgba(212, 165, 116, 0.9) 15%,
      rgba(255, 215, 0, 0.8) 20%,
      rgba(212, 165, 116, 0.9) 25%,
      transparent 30%,
      transparent 40%,
      rgba(138, 78, 78, 0.9) 45%,
      rgba(180, 100, 100, 0.8) 50%,
      rgba(138, 78, 78, 0.9) 55%,
      transparent 60%,
      transparent 100%);
  animation: none;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
}

/* 启用动画后才显示并旋转 */
.card-border-rotating.animation-enabled {
  animation: rotateInPlace 6s linear infinite;
  opacity: 1;
}

/* 禁用前两个卡片的动画，避免渲染问题 */
.card-border-rotating.no-animate {
  animation: none;
  display: none;
}

@keyframes rotateInPlace {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.character-card-wrapper.selected .card-border-rotating {
  background: conic-gradient(from 0deg,
      transparent 0%,
      transparent 5%,
      rgba(212, 165, 116, 1) 12%,
      rgba(255, 215, 0, 1) 18%,
      rgba(255, 200, 50, 1) 20%,
      rgba(255, 215, 0, 1) 22%,
      rgba(212, 165, 116, 1) 28%,
      transparent 35%,
      transparent 40%,
      rgba(245, 166, 35, 1) 47%,
      rgba(255, 180, 50, 1) 50%,
      rgba(245, 166, 35, 1) 53%,
      transparent 60%,
      transparent 100%);
  animation: rotateInPlace 3s linear infinite;
}

/* 第三层：展示容器（角色信息，层级最高） */
.card-border-inner {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 3px;
  background: linear-gradient(135deg, #5a3a1e 0%, #3a2616 100%);
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.8);
  z-index: 10;
  /* 使用 clip-path 创建棱角效果 */
  clip-path: polygon(
    12px 0%, calc(100% - 12px) 0%,
    100% 12px, 100% calc(100% - 12px),
    calc(100% - 12px) 100%, 12px 100%,
    0% calc(100% - 12px), 0% 12px
  );
}

.character-card-wrapper.selected .card-border-inner {
  background: linear-gradient(135deg, #d4a574 0%, #8a4e4e 100%);
  box-shadow:
    inset 0 0 8px rgba(0, 0, 0, 0.8),
    0 0 12px rgba(212, 165, 116, 0.6);
}

.character-card-wrapper.selected .card-border-inner {
  background: linear-gradient(135deg, #d4a574 0%, #8a4e4e 100%);
  box-shadow:
    inset 0 0 8px rgba(0, 0, 0, 0.8),
    0 0 12px rgba(212, 165, 116, 0.6);
}

/* 角色卡片内容 */
.character-card {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  clip-path: polygon(10px 0%, calc(100% - 10px) 0%,
      100% 10px, 100% calc(100% - 10px),
      calc(100% - 10px) 100%, 10px 100%,
      0% calc(100% - 10px), 0% 10px);
}

.character-card-wrapper.selected .character-card {
  background: linear-gradient(160deg, #2a1c12 0%, #3a2616 100%);
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* 角色头像 */
.character-avatar {
  width: 100%;
  height: 200px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(to bottom, rgba(26, 15, 10, 0) 0%, rgba(26, 15, 10, 0.6) 100%);
}

.character-avatar image {
  width: 100%;
  height: 100%;
  display: block;
}

/* 角色信息 */
.character-info {
  flex: 1;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-name {
  font-size: 22px;
  font-weight: 700;
  color: #d4a574;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  margin-bottom: 1px;
}

.character-desc {
  padding: 0;
  font-size: 13px;
  color: #c0b0a0;
  // line-height: 1.4;
}

.skill-section {
  // margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid rgba(90, 58, 30, 0.3);
}

.skill-badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #1a0f0a;
  background: linear-gradient(135deg, #d4a574 0%, #c09060 100%);
  border-radius: 4px;
  margin-bottom: 6px;
  text-shadow: none;
}

.skill-text {
  display: block;
  font-size: 11px;
  color: #a08060;
  line-height: 1.5;
}

/* 选中标记 */
.selected-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #f5a623 0%, #e69517 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(245, 166, 35, 0.6),
    0 0 20px rgba(245, 166, 35, 0.4);
  animation: badgePulse 2s ease-in-out infinite;
  z-index: 2;
}

@keyframes badgePulse {

  0%,
  100% {
    transform: scale(1);
    box-shadow:
      0 4px 12px rgba(245, 166, 35, 0.6),
      0 0 20px rgba(245, 166, 35, 0.4);
  }

  50% {
    transform: scale(1.1);
    box-shadow:
      0 6px 16px rgba(245, 166, 35, 0.8),
      0 0 30px rgba(245, 166, 35, 0.6);
  }
}

.badge-icon {
  font-size: 24px;
  font-weight: 700;
  color: #1a0f0a;
}
</style>
