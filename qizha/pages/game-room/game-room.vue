<template>
  <view class="game-room" :class="{ 'screen-shake': shakeScreen }">
    <!-- 背景层 -->
    <view class="bar-bg">
      <view class="bar-bg__wall"></view>
      <view class="bar-bg__vignette"></view>
    </view>

    <!-- 特效层 - 质疑结果 -->
    <view v-if="challengeFx.show" class="fx-overlay fx-challenge"
      :class="challengeFx.success ? 'fx-success' : 'fx-fail'">
      <view class="fx-burst"></view>
      <text class="fx-title">{{ challengeFx.success ? '质疑成功!' : '质疑失败' }}</text>
      <text class="fx-sub">{{ challengeFx.success ? '对方在撒谎' : '对方说真话' }}</text>
    </view>

    <!-- 特效层 - 淘汰 -->
    <view v-if="eliminateFx.show" class="fx-overlay fx-eliminate">
      <text class="fx-skull">💀</text>
      <text class="fx-title">玩家淘汰</text>
      <text class="fx-sub">{{ eliminateFx.nickname }} 被击杀</text>
    </view>

    <!-- 顶部栏 -->
    <view class="top-bar safe-area-inset-top safe-area-inset-left safe-area-inset-right">
      <button class="back-btn" @tap="leaveRoom">← 返回大厅</button>
      <view class="room-info">
        <text class="round-badge">第 {{ gameState?.current_round || 1 }} 轮</text>
        <text class="turn-badge">回合 {{ gameState?.current_turn || 0 }}</text>
        <text class="target-badge">目标牌: {{ gameState?.target_card || '-' }}</text>
      </view>
      <view class="alive-count">{{ gameState?.alive_count || 4 }} 人存活</view>
      <button class="rules-btn" @tap="showRules = true">📖</button>
    </view>

    <!-- 游戏结束遮罩 -->
    <view v-if="gameState?.phase === 'GAME_OVER'" class="game-over-overlay">
      <view class="game-over-card">
        <text class="game-over-title" v-if="leaveReason">🚪 {{ leaveReason }}</text>
        <text class="game-over-title" v-else>🏆 游戏结束</text>
        <text v-if="leaveReason" class="lose-text">{{ leaveDetail }}</text>
        <text v-else-if="gameState?.winner_id === authStore.user?.id" class="win-text">你赢了！</text>
        <text v-else class="lose-text">玩家 {{ winnerName }} 获得了胜利</text>
        <button class="game-over-btn" @tap="leaveRoom">返回大厅</button>
      </view>
    </view>

    <!-- 等待房间 -->
    <view v-if="!gameState && !connecting" class="waiting-room">
      <view class="wait-card">
        <text class="wait-title">{{ roomState?.name || '游戏房间' }}</text>
        <text class="wait-count">
          {{ roomPlayers.length }}/{{ roomState?.max_players || 4 }} 玩家 · {{ roomState?.ready_count || 0 }} 已准备
        </text>

        <view class="waiting-players">
          <view v-for="seat in waitingSeats" :key="seat.index" class="waiting-player"
            :class="{ empty: !seat.player, ready: seat.player?.is_ready }">
            <view class="waiting-avatar">{{ seat.player ? (seat.player.is_ai ? '🤖' : '👤') : '-' }}</view>
            <text class="waiting-name">{{ seat.player?.nickname || '等待加入' }}</text>
            <text class="waiting-status">
              {{ seat.player ? (seat.player.is_ready ? '已准备' : '未准备') : '空位' }}
            </text>
          </view>
        </view>

        <button class="ready-btn" :disabled="myRoomPlayer?.is_ready" @tap="setReady">
          {{ myRoomPlayer?.is_ready ? '已准备' : '准备' }}
        </button>
      </view>
    </view>

    <!-- 游戏区域 -->
    <view v-if="gameState && gameState.phase !== 'GAME_OVER'" class="game-area">
      <!-- 对手区域 -->
      <view class="opponents-row">
        <view v-for="player in opponents" :key="player.id" class="player-card"
          :class="{ active: gameState.current_player === player.seat_index, eliminated: !player.is_alive }">
          <view class="player-avatar">
            <text v-if="player.is_ai">🤖</text>
            <text v-else>👤</text>
          </view>
          <text class="player-name">{{ player.nickname }}</text>
          <view class="player-hp">
            <view v-for="i in 6" :key="i" class="hp-dot" :class="{ filled: i <= (player.punishment_count || 0) }">
            </view>
          </view>
          <text class="card-count">{{ player.hand_count }} 张牌</text>
          <view v-if="player.is_ai" class="ai-tag">AI</view>
          <view v-if="!player.is_alive" class="dead-tag">💀</view>
        </view>
      </view>

      <!-- 中心区域 - 上家出牌 -->
      <view class="center-area">
        <view v-if="gameState.last_play" class="last-play">
          <text class="last-play-label">上家出牌</text>
          <view class="last-play-cards">
            <view v-for="i in gameState.last_play.count" :key="i" class="play-card">
              <text class="card-text">{{ gameState.last_play.claimed_card }}</text>
            </view>
          </view>
          <text class="last-play-player">{{ lastPlayPlayerName }}</text>
        </view>
        <view v-else class="no-play">
          <text>暂无出牌</text>
        </view>
      </view>

      <!-- 自己的手牌区域 -->
      <view class="my-area">
        <view class="my-info">
          <view class="my-avatar">👤</view>
          <view class="my-details">
            <text class="my-name">{{ authStore.user?.nickname || '我' }}</text>
            <view class="my-hp">
              <view v-for="i in 6" :key="i" class="hp-dot" :class="{ filled: i <= myPunishmentCount }"></view>
            </view>
          </view>
        </view>

        <!-- 手牌 -->
        <view v-if="myHandCards.length > 0" class="hand-cards">
          <view v-for="(card, idx) in myHandCards" :key="idx" class="hand-card"
            :class="{ selected: selectedCards.includes(idx) }" @tap="toggleCard(idx)">
            <text class="card-face">{{ card }}</text>
          </view>
        </view>
        <view v-else class="no-cards">
          <text>手牌已出完</text>
        </view>

        <!-- 操作按钮 -->
        <view class="action-buttons">
          <button v-if="isMyTurn" class="action-btn play-btn" :disabled="selectedCards.length === 0" @tap="playCards">
            出牌 ({{ selectedCards.length }})
          </button>
          <button v-if="canChallenge" class="action-btn challenge-btn" @tap="challenge">
            质疑上家
          </button>
          <button v-if="isMyTurn" class="action-btn pass-btn" @tap="passTurn">
            过
          </button>
          <view v-if="!isMyTurn" class="waiting-turn">
            <text>等待其他玩家操作...</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 规则弹窗 -->
    <RulesModal v-model:visible="showRules" />

    <!-- Toast -->
    <Toast v-model:visible="toast.show" :message="toast.msg" :type="toast.type" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, nextTick } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useGameStore } from '../../stores/game'
import { roomAPI } from '../../utils/api'
import wsClient from '../../utils/websocket'
import Toast from '../../components/Toast.vue'
import RulesModal from '../../components/RulesModal.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()

const roomId = ref('')
const gameState = ref(null)
const roomState = ref(null)
const showRules = ref(false)
const toast = ref({ show: false, msg: '', type: 'error' })
const selectedCards = ref([])
const shakeScreen = ref(false)
const challengeFx = ref({ show: false, success: false })
const eliminateFx = ref({ show: false, nickname: '' })
const leaveReason = ref('')
const leaveDetail = ref('')
const connecting = ref(true)
const chatMessages = ref([])
const chatText = ref('')

let challengeFxTimer = null
let eliminateFxTimer = null
let shakeTimer = null

// 强制横屏
function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  console.log('已设置横屏模式')
  // #endif
}

// 计算属性
const myPlayerId = computed(() => authStore.user?.id)

const myPlayer = computed(() => {
  if (!gameState.value?.players) return null
  return gameState.value.players.find(p => p.id === myPlayerId.value)
})

const opponents = computed(() => {
  if (!gameState.value?.players) return []
  return gameState.value.players.filter(p => p.id !== myPlayerId.value)
})

const myHandCards = computed(() => {
  return myPlayer.value?.hand || []
})

const myPunishmentCount = computed(() => {
  return myPlayer.value?.punishment_count || 0
})

const isMyTurn = computed(() => {
  if (!gameState.value || !myPlayer.value) return false
  return gameState.value.current_player === myPlayer.value.seat_index &&
    gameState.value.phase === 'PLAYING'
})

const canChallenge = computed(() => {
  if (!isMyTurn.value || !gameState.value?.last_play) return false
  return gameState.value.last_play.player_id !== myPlayerId.value
})

const lastPlayPlayerName = computed(() => {
  if (!gameState.value?.last_play) return ''
  const playerId = gameState.value.last_play.player_id
  const player = gameState.value.players?.find(p => p.id === playerId)
  return player?.nickname || '玩家'
})

const winnerName = computed(() => {
  if (!gameState.value?.winner_id) return ''
  const winner = gameState.value.players?.find(p => p.id === gameState.value.winner_id)
  return winner?.nickname || '未知玩家'
})

// 等待房间相关
const roomPlayers = computed(() => roomState.value?.players || [])
const myRoomPlayer = computed(() => roomPlayers.value.find(p => p.id === myPlayerId.value))
const waitingSeats = computed(() => {
  const maxPlayers = roomState.value?.max_players || 4
  const seats = []
  const playersBySeat = new Map(roomPlayers.value.map(p => [p.seat_index, p]))

  for (let i = 0; i < maxPlayers; i++) {
    seats.push({
      index: i,
      player: playersBySeat.get(i) || null
    })
  }
  return seats
})

onMounted(() => {
  setLandscape()

  // 检查登录状态
  if (!authStore.isLoggedIn || !authStore.user) {
    uni.reLaunch({
      url: '/pages/login/login'
    })
    return
  }

  // 获取房间ID
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  roomId.value = currentPage.options.id || ''

  if (!roomId.value) {
    showToast('房间ID无效')
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  // 连接 WebSocket
  wsClient.connect()

  // 监听游戏事件
  wsClient.on('GAME_STATE', onGameState)
  wsClient.on('GAME_STARTED', onGameStarted)
  wsClient.on('CHALLENGE_RESULT', onChallengeResult)
  wsClient.on('RUSSIAN_ROULETTE', onRoulette)
  wsClient.on('PLAYER_ELIMINATED', onPlayerEliminated)
  wsClient.on('GAME_OVER', onGameOver)
  wsClient.on('PLAYER_LEFT', onPlayerLeft)
  wsClient.on('PLAYER_JOINED', onPlayerJoined)
  wsClient.on('CHAT', onChat)

  // 初始化房间数据
  loadRoomData()
})

onActivated(() => {
  setLandscape()
})

onUnmounted(() => {
  // 清理定时器
  if (challengeFxTimer) clearTimeout(challengeFxTimer)
  if (eliminateFxTimer) clearTimeout(eliminateFxTimer)
  if (shakeTimer) clearTimeout(shakeTimer)

  // 移除事件监听
  wsClient.off('GAME_STATE', onGameState)
  wsClient.off('GAME_STARTED', onGameStarted)
  wsClient.off('CHALLENGE_RESULT', onChallengeResult)
  wsClient.off('RUSSIAN_ROULETTE', onRoulette)
  wsClient.off('PLAYER_ELIMINATED', onPlayerEliminated)
  wsClient.off('GAME_OVER', onGameOver)
  wsClient.off('PLAYER_LEFT', onPlayerLeft)
  wsClient.off('PLAYER_JOINED', onPlayerJoined)
  wsClient.off('CHAT', onChat)
})

async function loadRoomData() {
  try {
    const res = await roomAPI.get(roomId.value)
    if (res.data) {
      if (res.data.game_state) {
        gameState.value = res.data.game_state
        gameStore.updateState(res.data.game_state)
      }
      roomState.value = res.data
    }
    connecting.value = false
  } catch (e) {
    console.error('Load room error:', e)
    showToast('加载房间失败')
    connecting.value = false
  }
}

function showToast(msg, type = 'error') {
  toast.value = { show: true, msg, type }
}

// 特效触发函数
function triggerChallengeFx(success) {
  challengeFx.value = { show: true, success }
  if (challengeFxTimer) clearTimeout(challengeFxTimer)
  challengeFxTimer = setTimeout(() => {
    challengeFx.value.show = false
  }, 1600)
}

function triggerEliminateFx(playerId) {
  const player = gameState.value?.players?.find(p => p.id === playerId)
  eliminateFx.value = { show: true, nickname: player?.nickname || `玩家${playerId}` }
  if (eliminateFxTimer) clearTimeout(eliminateFxTimer)
  eliminateFxTimer = setTimeout(() => {
    eliminateFx.value.show = false
  }, 1800)

  // 屏幕震动
  shakeScreen.value = true
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => {
    shakeScreen.value = false
  }, 500)
}

// 卡牌操作
function toggleCard(index) {
  if (!isMyTurn.value) return

  const idx = selectedCards.value.indexOf(index)
  if (idx > -1) {
    selectedCards.value.splice(idx, 1)
  } else {
    if (selectedCards.value.length < 3) {
      selectedCards.value.push(index)
    } else {
      showToast('最多选择3张牌', 'error')
    }
  }
}

function resetSelection() {
  selectedCards.value = []
}

// 游戏操作
function playCards() {
  if (selectedCards.value.length === 0) return

  const cardIds = selectedCards.value.map(idx => idx)
  wsClient.send('PLAY_CARD', {
    card_ids: cardIds,
    claim: gameState.value.target_card
  })

  resetSelection()
}

function challenge() {
  const targetId = gameState.value?.last_play?.player_id
  if (!targetId) return

  wsClient.send('CHALLENGE', {
    target_player_id: targetId
  })
}

function passTurn() {
  wsClient.send('PASS')
  resetSelection()
}

function setReady() {
  wsClient.send('PLAYER_READY')
}

// 聊天
function sendChat() {
  if (!chatText.value.trim()) return
  wsClient.send('CHAT', {
    content: chatText.value.trim()
  })
  chatText.value = ''
}

function addSystemMsg(content) {
  chatMessages.value.push({
    sender_id: 0,
    sender_name: '[系统]',
    content,
    is_ai: false
  })
}

function leaveRoom() {
  uni.showModal({
    title: '提示',
    content: '确定要离开房间吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await roomAPI.leave(roomId.value)
        } catch (e) {
          console.error('Leave room error:', e)
        }
        uni.navigateBack()
      }
    }
  })
}

// WebSocket 事件处理
function onGameState(payload) {
  console.log('GAME_STATE:', payload)
  gameState.value = payload
  gameStore.updateState(payload)
  connecting.value = false
}

function onGameStarted(payload) {
  console.log('GAME_STARTED:', payload)
  addSystemMsg('游戏开始！')
  showToast('游戏开始！', 'success')
}

function onChallengeResult(payload) {
  console.log('CHALLENGE_RESULT:', payload)

  const success = payload.success
  const truthful = payload.truthful
  const challengerId = payload.challenger_id
  const liarId = payload.liar_id
  const loserId = payload.loser_id

  triggerChallengeFx(success)

  // 震动反馈
  // #ifdef APP-PLUS
  uni.vibrateShort()
  // #endif

  if (success) {
    addSystemMsg(`质疑成功！玩家${liarId}在撒谎，实际牌为：${payload.challenged_cards?.join(', ')}`)
  } else {
    addSystemMsg(`质疑失败！对方说的是真话`)
  }
}

function onRoulette(payload) {
  console.log('RUSSIAN_ROULETTE:', payload)
  const playerId = payload.player_id
  const survived = payload.survived
  const bulletCount = payload.bullet_count

  if (survived) {
    addSystemMsg(`玩家${playerId}扣动扳机${bulletCount}次，幸存！`)
  } else {
    addSystemMsg(`玩家${playerId}扣动扳机${bulletCount}次，被击中！`)
  }
}

function onPlayerEliminated(payload) {
  console.log('PLAYER_ELIMINATED:', payload)
  const playerId = payload.player_id

  triggerEliminateFx(playerId)

  // #ifdef APP-PLUS
  uni.vibrateLong()
  // #endif

  addSystemMsg(`玩家已被淘汰`)
}

function onGameOver(payload) {
  console.log('GAME_OVER:', payload)
  gameState.value = {
    ...(gameState.value || {}),
    phase: 'GAME_OVER',
    winner_id: payload.winner_id
  }
  addSystemMsg(`游戏结束！`)
}

function onPlayerLeft(payload) {
  console.log('PLAYER_LEFT:', payload)

  if (payload.game_over) {
    // 游戏中途有人离开，游戏结束
    leaveReason.value = payload.reason || '玩家退出，游戏结束'
    const name = payload.nickname || `玩家${payload.player_id}`
    leaveDetail.value = `${name} 退出了对局，本局已结束`
    gameState.value = {
      ...(gameState.value || {}),
      phase: 'GAME_OVER',
      winner_id: payload.winner_id
    }
    addSystemMsg(leaveDetail.value)
  } else {
    addSystemMsg(`玩家 ${payload.nickname || payload.player_id} 离开了房间`)
  }
}

function onPlayerJoined(payload) {
  console.log('PLAYER_JOINED:', payload)
  addSystemMsg(`玩家 ${payload.nickname || payload.player_id} 加入了房间`)
}

function onChat(payload) {
  console.log('CHAT:', payload)
  chatMessages.value.push({
    sender_id: payload.sender_id,
    sender_name: payload.sender_name || `玩家${payload.sender_id}`,
    content: payload.content,
    is_ai: payload.is_ai || false
  })

  nextTick(() => {
    // 滚动到底部（如果有聊天窗口）
  })
}
</script>

<style scoped>
/* 页面容器 */
.game-room {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0604;
}

.screen-shake {
  animation: shake 0.5s;
}

@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-4px);
  }

  20%,
  40%,
  60%,
  80% {
    transform: translateX(4px);
  }
}

/* 背景层 */
.bar-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bar-bg__wall {
  position: absolute;
  inset: 0;
  margin-top: -60px;
  background-image: url('../../static/images/game.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.6;
}

.bar-bg__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
}

/* 特效层 */
.fx-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.fx-burst {
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  animation: burst 0.8s ease-out;
}

.fx-challenge.fx-success .fx-burst {
  background: radial-gradient(circle, rgba(74, 222, 128, 0.5) 0%, transparent 70%);
}

.fx-challenge.fx-fail .fx-burst {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%);
}

@keyframes burst {
  from {
    transform: scale(0);
    opacity: 1;
  }

  to {
    transform: scale(3);
    opacity: 0;
  }
}

.fx-title {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.9);
  margin-bottom: 6px;
  z-index: 1;
}

.fx-sub {
  color: #d4a574;
  font-size: 16px;
  z-index: 1;
}

.fx-skull {
  font-size: 60px;
  margin-bottom: 12px;
}

/* 顶部栏 - 最大高度30px */
.top-bar {
  padding: 5px 0 5px 20px;
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  /* padding: 6px 12px; */
  background: rgba(30, 10, 10, 0.9);
  border-bottom: 2px solid #5c2e2e;
  /* height: 40px; */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.back-btn {
  padding: 15px 25px;
  background: rgba(60, 30, 30, 0.8);
  /* border: 1px solid #5c2e2e; */
  /* border-radius: 4px; */
  color: #d4a574;
  font-size: 15px;
  font-weight: 600;
  /* height: 25px; */
  line-height: 8px;
  transition: all 0.2s;
}

.back-btn:active {
  background: rgba(80, 40, 40, 0.9);
  transform: scale(0.95);
}

.room-info {
  display: flex;
  gap: 6px;
  flex: 1;
}

.round-badge,
.turn-badge,
.target-badge {
  padding: 15px 10px;
  background: rgba(60, 30, 30, 0.8);
  border: 1px solid #5c2e2e;
  border-radius: 4px;
  color: #d4a574;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  /* height: 22px; */
  line-height: 12px;
}

.alive-count {
  padding: 15px 10px;
  background: rgba(60, 30, 30, 0.8);
  border: 1px solid #5c2e2e;
  border-radius: 4px;
  color: #4ade80;
  font-size: 11px;
  font-weight: 600;
  /* height: 22px; */
  line-height: 12px;
}

.rules-btn {
  margin-right: 40px;
  padding: 15px 10px;
  background: rgba(60, 30, 30, 0.8);
  border: 1px solid #5c2e2e;
  border-radius: 4px;
  color: #d4a574;
  font-size: 11px;
  /* height: 22px; */
  line-height: 12px;
  transition: all 0.2s;
}

.rules-btn:active {
  background: rgba(80, 40, 40, 0.9);
  transform: scale(0.95);
}

/* 游戏结束遮罩 */
.game-over-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
}

.game-over-card {
  text-align: center;
  padding: 30px 40px;
  background: rgba(30, 10, 10, 0.95);
  border: 2px solid #5c2e2e;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.7);
}

.game-over-title {
  display: block;
  color: #d4a574;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.win-text {
  display: block;
  color: #4ade80;
  font-size: 16px;
  margin-bottom: 20px;
}

.lose-text {
  display: block;
  color: #e94560;
  font-size: 16px;
  margin-bottom: 20px;
}

.game-over-btn {
  padding: 10px 28px;
  background: linear-gradient(145deg, #8a4a4a 0%, #5c2e2e 100%);
  border: 1px solid #5a3a1e;
  border-radius: 6px;
  color: #d4a574;
  font-size: 13px;
  font-weight: 600;
}

/* 游戏区域 */
.game-area {
  position: relative;
  z-index: 10;
  height: calc(100vh - 30px);
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 8px;
}

/* 对手区域 - 每个卡片高度约25px */
.opponents-row {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-shrink: 0;
}

.player-card {
  position: relative;
  width: 90px;
  padding: 6px;
  background: rgba(30, 10, 10, 0.85);
  border: 1px solid #5c2e2e;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  transition: all 0.2s;
}

.player-card.active {
  border-color: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

.player-card.eliminated {
  opacity: 0.4;
  filter: grayscale(1);
}

.player-avatar {
  width: 24px;
  height: 24px;
  margin: 0 auto 4px;
  background: rgba(60, 30, 30, 0.6);
  border: 1px solid #5a3a1e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.player-name {
  display: block;
  color: #d4a574;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 11px;
}

.player-hp {
  display: flex;
  gap: 3px;
  justify-content: center;
  margin-bottom: 4px;
}

.hp-dot {
  width: 6px;
  height: 6px;
  background: #333;
  border: 1px solid #555;
  border-radius: 50%;
}

.hp-dot.filled {
  background: #e94560;
  border-color: #dc2626;
  box-shadow: 0 0 3px rgba(233, 69, 96, 0.6);
}

.card-count {
  display: block;
  color: #a08060;
  font-size: 10px;
  text-align: center;
  line-height: 10px;
}

.ai-tag,
.dead-tag {
  position: absolute;
  top: 2px;
  right: 2px;
  padding: 1px 4px;
  background: rgba(60, 30, 30, 0.9);
  border: 1px solid #5c2e2e;
  border-radius: 3px;
  color: #d4a574;
  font-size: 9px;
  font-weight: 600;
  line-height: 9px;
}

.dead-tag {
  font-size: 12px;
  padding: 1px 3px;
}

/* 中心区域 */
.center-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.last-play {
  text-align: center;
  padding: 10px;
  background: rgba(30, 10, 10, 0.85);
  border: 2px solid #5c2e2e;
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5);
}

.last-play-label {
  display: block;
  color: #a08060;
  font-size: 11px;
  margin-bottom: 6px;
  line-height: 11px;
}

.last-play-cards {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-bottom: 6px;
}

.play-card {
  width: 40px;
  height: 56px;
  background: linear-gradient(160deg, #f5e6d3 0%, #d6c0a9 100%);
  border: 2px solid #8a6a4a;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
}

.card-text {
  font-size: 20px;
  font-weight: 800;
  color: #2d1f14;
}

.last-play-player {
  display: block;
  color: #d4a574;
  font-size: 11px;
  font-weight: 600;
  line-height: 11px;
}

.no-play {
  color: #8a6a4a;
  font-size: 12px;
  padding: 16px;
}

/* 自己的手牌区域 - 高度控制在100px内 */
.my-area {
  background: rgba(30, 10, 10, 0.9);
  border: 2px solid #5c2e2e;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.my-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  height: 28px;
}

.my-avatar {
  width: 28px;
  height: 28px;
  background: rgba(60, 30, 30, 0.6);
  border: 1px solid #5a3a1e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.my-details {
  flex: 1;
}

.my-name {
  display: block;
  color: #d4a574;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 3px;
  line-height: 12px;
}

.my-hp {
  display: flex;
  gap: 3px;
}

/* 手牌 */
.hand-cards {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.hand-card {
  width: 48px;
  height: 66px;
  background: linear-gradient(160deg, #f5e6d3 0%, #d6c0a9 100%);
  border: 2px solid #8a6a4a;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.hand-card.selected {
  transform: translateY(-8px);
  border-color: #4ade80;
  box-shadow: 0 5px 12px rgba(74, 222, 128, 0.5);
}

.card-face {
  font-size: 26px;
  font-weight: 800;
  color: #2d1f14;
}

.no-cards {
  text-align: center;
  color: #8a6a4a;
  padding: 16px;
  font-size: 12px;
}

/* 操作按钮 - 高度24px */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  height: 24px;
  line-height: 12px;
}

.play-btn {
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
  color: #000;
  box-shadow: 0 3px 8px rgba(74, 222, 128, 0.4);
}

.play-btn[disabled] {
  background: #333;
  color: #666;
  box-shadow: none;
  cursor: not-allowed;
}

.challenge-btn {
  background: linear-gradient(180deg, #e94560 0%, #dc2626 100%);
  color: #fff;
  box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
}

.pass-btn {
  background: linear-gradient(180deg, #888 0%, #666 100%);
  color: #fff;
}

.waiting-turn {
  text-align: center;
  color: #8a6a4a;
  font-size: 12px;
  padding: 8px;
}

/* 等待房间 */
.waiting-room {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.wait-card {
  background: rgba(30, 10, 10, 0.95);
  border: 2px solid #5c2e2e;
  border-radius: 12px;
  padding: 24px;
  min-width: 500px;
  max-width: 80vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.wait-title {
  display: block;
  color: #d4a574;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
}

.wait-count {
  display: block;
  color: #a08060;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.waiting-players {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.waiting-player {
  background: rgba(22, 17, 15, 0.8);
  border: 2px solid #5c2e2e;
  border-radius: 8px;
  padding: 16px 10px;
  text-align: center;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.waiting-player.ready {
  border-color: #4ade80;
}

.waiting-player.empty {
  opacity: 0.5;
}

.waiting-avatar {
  font-size: 32px;
  margin-bottom: 8px;
}

.waiting-name {
  display: block;
  color: #d4a574;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.waiting-status {
  display: block;
  color: #8a6a4a;
  font-size: 12px;
}

.ready-btn {
  width: 100%;
  background: linear-gradient(145deg, #4ade80 0%, #22c55e 100%);
  color: #000;
  padding: 12px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  box-shadow: 0 3px 8px rgba(74, 222, 128, 0.4);
}

.ready-btn[disabled] {
  background: #333;
  color: #666;
  box-shadow: none;
  cursor: not-allowed;
}

/* 游戏结束 */
.game-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.game-over-card {
  background: rgba(30, 10, 10, 0.95);
  border: 2px solid #5c2e2e;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  min-width: 300px;
}

.game-over-title {
  display: block;
  color: #d4a574;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
}

.win-text {
  display: block;
  color: #4ade80;
  font-size: 20px;
  margin-bottom: 24px;
}

.lose-text {
  display: block;
  color: #f59e0b;
  font-size: 18px;
  margin-bottom: 24px;
}

.game-over-btn {
  background: linear-gradient(145deg, #e94560 0%, #dc2626 100%);
  color: #fff;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
}
</style>
