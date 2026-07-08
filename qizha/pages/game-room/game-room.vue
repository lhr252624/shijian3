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
              {{ seat.player ? (seat.player.is_ai ? 'AI' : (seat.player.is_ready ? '已准备' : '未准备')) : '空位' }}
            </text>
          </view>
        </view>

        <button class="ready-btn" :disabled="myRoomPlayer?.is_ready" @tap="setReady">
          {{ myRoomPlayer?.is_ready ? '已准备' : '准备' }}
        </button>
      </view>
    </view>

    <!-- 连接中提示 -->
    <view v-if="connecting" class="waiting-room">
      <view class="wait-card">
        <text class="wait-title">连接中...</text>
      </view>
    </view>

    <!-- 游戏区域 -->
    <view v-if="gameState && gameState.phase !== 'GAME_OVER'" class="game-area">
      <!-- 对手区域 -->
      <view class="opponents-row">
        <view v-for="player in opponents" :key="player.id" class="player-card"
          :class="{ active: gameState.current_player === player.seat_index, eliminated: !player.is_alive }">
          <!-- 玩家编号 -->
          <view class="player-number">P{{ player.seat_index + 1 }}</view>
          <view class="player-avatar">
            <text v-if="player.is_ai">🤖</text>
            <text v-else>👤</text>
          </view>
          <text class="player-name">{{ player.nickname }}</text>
          <view class="player-hp">
            <view v-for="i in 6" :key="i" class="hp-dot"
              :class="{ filled: i <= (player.bullets || player.punishment_count || 0) }">
            </view>
          </view>
          <text class="card-count">{{ player.hand_count }} 张牌</text>
          <!-- 显示最近出牌信息 -->
          <text v-if="gameState.last_play && gameState.last_play.player_id === player.id" class="last-played">
            刚出 {{ gameState.last_play.count }} 张 {{ gameState.last_play.claim }}
          </text>
          <view v-if="player.is_ai" class="ai-tag">AI</view>
          <view v-if="!player.is_alive" class="dead-tag">💀</view>
        </view>
      </view>

      <!-- 中心区域 - 上家出牌 -->
      <view class="center-area">
        <!-- 当前回合提示 -->
        <view class="current-turn-banner">
          <text v-if="gameState?.phase === 'CHALLENGE'" class="turn-text challenge-phase">
            ⚠️ 质疑阶段 - 可以质疑或放弃
          </text>
          <text v-else-if="canPlayCard" class="turn-text my-turn">👉 轮到你操作</text>
          <text v-else class="turn-text waiting">{{ currentPlayerName }} 操作中...</text>
        </view>

        <view v-if="gameState.last_play" class="last-play">
          <text class="last-play-label">上家出牌</text>
          <view class="last-play-cards">
            <view v-for="i in gameState.last_play.count" :key="i" class="play-card">
              <text class="card-text">{{ gameState.last_play.claim }}</text>
            </view>
          </view>
          <text class="last-play-player">{{ lastPlayPlayerName }}</text>
        </view>
        <view v-else class="no-play">
          <text>暂无出牌</text>
        </view>
      </view>

      <!-- 底部区域：手牌区（70%）+ 日志区（30%） -->
      <view class="bottom-container">
        <!-- 自己的手牌区域 -->
        <view class="my-area">
          <!-- 第一行：个人信息 + 操作按钮 -->
          <view class="top-info-row">
            <view class="my-info">
              <!-- 玩家编号 -->
              <view v-if="myPlayer" class="player-number my-number">P{{ myPlayer.seat_index + 1 }}</view>
              <view class="my-avatar">👤</view>
              <view class="my-details">
                <text class="my-name">{{ authStore.user?.nickname || '我' }}</text>
                <view class="my-hp">
                  <view v-for="i in 6" :key="i" class="hp-dot" :class="{ filled: i <= myPunishmentCount }"></view>
                </view>
              </view>
            </view>

            <!-- 操作按钮组 -->
            <view class="action-buttons-top">
              <!-- 出牌按钮 - 放在最前面 -->
              <button v-if="canPlayCard" class="top-btn play-btn" :disabled="selectedCards.length === 0" @tap="playCards">
                出牌({{ selectedCards.length }})
              </button>

              <!-- 质疑按钮 -->
              <button v-if="canChallenge" class="top-btn challenge-btn" @tap="challenge">
                质疑
              </button>

              <!-- 跳过按钮 - 只在质疑阶段显示 -->
              <button v-if="canPass && gameState?.phase === 'CHALLENGE'" class="top-btn pass-btn" @tap="passTurn">
                放弃
              </button>

              <!-- 状态提示 -->
              <text v-if="myPlayer && myPlayer.hand_count === 0 && gameState?.phase === 'PLAYING'" class="status-text">
                手牌已空
              </text>
              <text v-else-if="gameState?.phase === 'CHALLENGE' && !hasAnyAction" class="status-text">
                等待质疑...
              </text>
              <text v-else-if="!hasAnyAction && myPlayer && myPlayer.hand_count > 0" class="status-text">
                <template v-if="gameState?.phase === 'CHALLENGE'">等待质疑...</template>
                <template v-else-if="gameState?.phase === 'PLAYING'">等待操作...</template>
                <template v-else>等待中...</template>
              </text>
            </view>
          </view>

          <!-- 第二行：技能按钮（侧边栏）+ 手牌 -->
          <view class="cards-row">
            <!-- Foxy技能按钮 -->
            <button v-if="canUseSkill" class="skill-btn-sidebar" :disabled="skillUsed" @tap="showSkillTargetSelect">
              <view class="skill-icon">🔍</view>
              <text class="skill-label">{{ skillUsed ? '已用' : '偷看' }}</text>
            </button>

            <!-- 手牌区域 -->
            <view v-if="myHandCards.length > 0" class="hand-cards-container">
              <view v-for="(card, idx) in myHandCards" :key="idx" class="hand-card"
                :class="{ selected: selectedCards.includes(idx) }" @tap="toggleCard(idx)">
                <text class="card-face">{{ card }}</text>
              </view>
            </view>
            <view v-else class="no-cards">
              <text>手牌已出完</text>
            </view>
          </view>
        </view>

        <!-- 行动日志面板 -->
        <view class="action-log-panel">
          <view class="log-header">
            <text class="log-title">📋 行动日志</text>
            <button class="log-clear-btn" @tap="clearActionLog">清空</button>
          </view>
          <scroll-view class="log-content" scroll-y="true" :scroll-top="logScrollTop">
            <view v-for="(log, index) in actionLogs" :key="index" class="log-item" :class="log.type">
              <text class="log-time">{{ log.time }}</text>
              <text class="log-text">{{ log.message }}</text>
            </view>
            <view v-if="actionLogs.length === 0" class="log-empty">暂无行动记录</view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 规则弹窗 -->
    <RulesModal v-model:visible="showRules" />

    <!-- Foxy技能目标选择弹窗 -->
    <view v-if="showSkillTargets" class="skill-overlay" @tap.self="showSkillTargets = false">
      <view class="skill-modal">
        <text class="skill-modal-title">选择偷看目标</text>
        <view class="skill-targets">
          <view v-for="player in opponents" :key="player.id" class="skill-target"
            :class="{ disabled: !player.is_alive }" @tap="useSkillOnTarget(player.id)">
            <view class="target-avatar">{{ player.is_ai ? '🤖' : '👤' }}</view>
            <text class="target-name">{{ player.nickname }}</text>
            <text class="target-cards">{{ player.hand_count }} 张牌</text>
          </view>
        </view>
        <button class="skill-cancel" @tap="showSkillTargets = false">取消</button>
      </view>
    </view>

    <!-- Foxy技能偷看结果弹窗 -->
    <view v-if="skillPeekResult" class="skill-peek-overlay">
      <view class="skill-peek-modal">
        <text class="peek-title">🔍 {{ skillPeekResult.targetName }} 的手牌</text>
        <view class="peek-cards">
          <view v-for="(card, idx) in skillPeekResult.cards" :key="idx" class="peek-card">
            <text class="peek-card-face">{{ card }}</text>
          </view>
        </view>
        <text class="peek-timer">{{ skillPeekResult.remaining }}秒后自动关闭</text>
      </view>
    </view>

    <!-- Toast -->
    <Toast v-model:visible="toast.show" :message="toast.msg" :type="toast.type" />

    <!-- 自定义确认对话框 -->
    <ConfirmDialog v-model:visible="confirmDialog.visible" :title="confirmDialog.title" :content="confirmDialog.content"
      @confirm="confirmDialog.onConfirm" @cancel="confirmDialog.onCancel" />

    <!-- 自定义输入对话框 -->
    <InputDialog v-model:visible="inputDialog.visible" :title="inputDialog.title" :placeholder="inputDialog.placeholder"
      @confirm="inputDialog.onConfirm" @cancel="inputDialog.onCancel" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '../../stores/auth'
import { useGameStore } from '../../stores/game'
import { roomAPI } from '../../utils/api'
import wsClient from '../../utils/websocket'
import Toast from '../../components/Toast.vue'
import RulesModal from '../../components/RulesModal.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import InputDialog from '../../components/InputDialog.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()

const roomId = ref('')
const pageOptions = ref(null)
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

// Foxy技能相关
const skillUsed = ref(false)
const showSkillTargets = ref(false)
const skillPeekResult = ref(null)

// 行动日志
const actionLogs = ref([])
const logScrollTop = ref(0)

// 自定义对话框
const confirmDialog = ref({
  visible: false,
  title: '提示',
  content: '',
  onConfirm: () => { },
  onCancel: () => { }
})

const inputDialog = ref({
  visible: false,
  title: '请输入',
  placeholder: '',
  onConfirm: (value) => { },
  onCancel: () => { }
})

let challengeFxTimer = null
let eliminateFxTimer = null
let shakeTimer = null
let statePollingTimer = null

// 强制横屏
function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  console.log('已设置横屏模式')
  // #endif
}

// 计算属性
const myPlayerId = computed(() => {
  const userId = authStore.user?.id
  console.log('myPlayerId:', userId, 'authStore.user:', authStore.user)
  return userId
})

const myPlayer = computed(() => {
  if (!gameState.value?.players) return null
  return gameState.value.players.find(p => p.id === myPlayerId.value)
})

const opponents = computed(() => {
  if (!gameState.value?.players) return []
  return gameState.value.players.filter(p => p.id !== myPlayerId.value)
})

const myHandCards = computed(() => {
  // 从gameState中获取自己的手牌（GAME_STATE消息中的hand字段）
  if (gameState.value?.hand) {
    return gameState.value.hand
  }
  // 兼容旧格式
  return myPlayer.value?.hand || []
})

const myPunishmentCount = computed(() => {
  // 使用bullets字段
  return myPlayer.value?.bullets || myPlayer.value?.punishment_count || 0
})

const isMyTurn = computed(() => {
  if (!gameState.value || !myPlayer.value) return false
  return gameState.value.current_player === myPlayer.value.seat_index &&
    gameState.value.phase === 'PLAYING'
})

// 根据legal_actions判断能否执行各种操作
const legalActions = computed(() => {
  return gameState.value?.legal_actions || []
})

const canPlayCard = computed(() => {
  return legalActions.value.includes('PLAY_CARD')
})

const canChallenge = computed(() => {
  return legalActions.value.includes('CHALLENGE')
})

const canPass = computed(() => {
  return legalActions.value.includes('PASS')
})

// Foxy技能相关
const myCharacter = computed(() => {
  return myPlayer.value?.character_id || ''
})

const canUseSkill = computed(() => {
  // 只有Foxy有主动技能
  if (myCharacter.value !== 'foxy') return false
  // 游戏进行中且还没使用过
  if (gameState.value?.phase !== 'PLAYING' && gameState.value?.phase !== 'CHALLENGE') return false
  return true
})

const hasAnyAction = computed(() => {
  return canPlayCard.value || canChallenge.value || canPass.value || canUseSkill.value
})

const lastPlayPlayerName = computed(() => {
  if (!gameState.value?.last_play) return ''
  const playerId = gameState.value.last_play.player_id
  const player = gameState.value.players?.find(p => p.id === playerId)
  return player?.nickname || '玩家'
})

const currentPlayerName = computed(() => {
  if (!gameState.value) return ''
  const player = gameState.value.players?.find(p => p.seat_index === gameState.value.current_player)
  if (!player) return '未知玩家'
  return player.is_ai ? `${player.nickname} (AI)` : player.nickname
})

const winnerName = computed(() => {
  if (!gameState.value?.winner_id) return ''
  const winner = gameState.value.players?.find(p => p.id === gameState.value.winner_id)
  return winner?.nickname || '未知玩家'
})

// 等待房间相关
const roomPlayers = computed(() => {
  const players = roomState.value?.players || []
  console.log('计算roomPlayers:', players)
  return players
})

const myRoomPlayer = computed(() => {
  const player = roomPlayers.value.find(p => p.id === myPlayerId.value || p.user_id === myPlayerId.value)
  console.log('计算myRoomPlayer:', player, 'myPlayerId:', myPlayerId.value)
  return player
})
const waitingSeats = computed(() => {
  const maxPlayers = roomState.value?.max_players || 4
  const seats = []
  const playersBySeat = new Map()

  // 根据seat_index建立映射
  roomPlayers.value.forEach(p => {
    if (p.seat_index !== undefined) {
      playersBySeat.set(p.seat_index, p)
    }
  })

  console.log('waitingSeats - maxPlayers:', maxPlayers, 'playersBySeat:', playersBySeat)

  for (let i = 0; i < maxPlayers; i++) {
    seats.push({
      index: i,
      player: playersBySeat.get(i) || null
    })
  }
  return seats
})

// onLoad 钩子接收页面参数
onLoad((options) => {
  console.log('=== game-room onLoad 接收参数 ===')
  console.log('页面参数 options:', options)

  pageOptions.value = options
  roomId.value = options?.id || ''

  console.log('房间ID:', roomId.value)

  if (!roomId.value) {
    console.error('房间ID无效，参数:', options)
    showToast('房间ID无效')
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

onMounted(async () => {
  console.log('=== game-room onMounted 开始 ===')

  try {
    setLandscape()

    // 详细检查 authStore 状态
    console.log('authStore.isLoggedIn:', authStore.isLoggedIn)
    console.log('authStore.token:', authStore.token ? '已设置' : '未设置')
    console.log('authStore.user:', authStore.user)

    // 检查本地存储
    const storedToken = uni.getStorageSync('token')
    const storedUser = uni.getStorageSync('user')
    console.log('localStorage token:', storedToken ? '已存储' : '未存储')
    console.log('localStorage user:', storedUser)

    // 检查登录状态
    if (!authStore.isLoggedIn) {
      console.error('未登录，跳转到登录页')
      uni.reLaunch({
        url: '/pages/login/login'
      })
      return
    }

    // 确保user已加载
    if (!authStore.user || !authStore.user.id) {
      console.error('用户信息未加载，user:', authStore.user)

      // 尝试从本地存储恢复
      if (storedUser) {
        try {
          const parsedUser = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser
          console.log('尝试从本地存储恢复用户:', parsedUser)
          if (parsedUser && parsedUser.id) {
            authStore.updateUser(parsedUser)
            console.log('用户信息已恢复:', authStore.user)
          }
        } catch (e) {
          console.error('恢复用户信息失败:', e)
        }
      }

      // 再次检查
      if (!authStore.user || !authStore.user.id) {
        showToast('用户信息错误，请重新登录')
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/login/login'
          })
        }, 1500)
        return
      }
    }

    console.log('当前用户ID:', authStore.user.id)
    console.log('当前用户昵称:', authStore.user.nickname)

    // 再次检查房间ID（onLoad中已设置）
    if (!roomId.value) {
      console.error('房间ID无效')
      showToast('房间ID无效')
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }

    // 连接 WebSocket
    console.log('开始连接 WebSocket')
    wsClient.connect()

    // 等待WebSocket连接后，发送加入房间消息
    setTimeout(() => {
      console.log('发送 PLAYER_JOIN 消息，roomId:', roomId.value)
      wsClient.send('PLAYER_JOIN', {})
    }, 500)

    console.log('注册 WebSocket 事件监听器')
    // 监听游戏事件
    wsClient.on('ROOM_STATE', onRoomState)
    wsClient.on('GAME_STATE', onGameState)
    wsClient.on('GAME_STARTED', onGameStarted)
    wsClient.on('CHALLENGE_RESULT', onChallengeResult)
    wsClient.on('RUSSIAN_ROULETTE', onRoulette)
    wsClient.on('PLAYER_ELIMINATED', onPlayerEliminated)
    wsClient.on('GAME_OVER', onGameOver)
    wsClient.on('PLAYER_LEFT', onPlayerLeft)
    wsClient.on('PLAYER_JOINED', onPlayerJoined)
    wsClient.on('CHAT', onChat)
    wsClient.on('SKILL_RESULT', onSkillResult)

    console.log('开始加载房间数据')
    // 初始化房间数据
    await loadRoomData()

    // 启动状态轮询，防止游戏卡住
    startStatePolling()

    console.log('=== game-room onMounted 结束 ===')
  } catch (error) {
    console.error('=== onMounted 发生错误 ===')
    console.error('错误对象:', error)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    showToast('页面加载失败: ' + error.message)
  }
})

onActivated(() => {
  setLandscape()
})

onUnmounted(() => {
  // 清理定时器
  if (challengeFxTimer) clearTimeout(challengeFxTimer)
  if (eliminateFxTimer) clearTimeout(eliminateFxTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
  if (statePollingTimer) clearInterval(statePollingTimer)

  // 移除事件监听
  wsClient.off('ROOM_STATE', onRoomState)
  wsClient.off('GAME_STATE', onGameState)
  wsClient.off('GAME_STARTED', onGameStarted)
  wsClient.off('CHALLENGE_RESULT', onChallengeResult)
  wsClient.off('RUSSIAN_ROULETTE', onRoulette)
  wsClient.off('PLAYER_ELIMINATED', onPlayerEliminated)
  wsClient.off('GAME_OVER', onGameOver)
  wsClient.off('PLAYER_LEFT', onPlayerLeft)
  wsClient.off('PLAYER_JOINED', onPlayerJoined)
  wsClient.off('CHAT', onChat)
  wsClient.off('SKILL_RESULT', onSkillResult)
})

async function loadRoomData() {
  try {
    const res = await roomAPI.get(roomId.value)
    console.log('房间详情响应:', res)

    if (res.code === 0 && res.data) {
      // 新API返回格式: { room: {...}, players: [...] }
      if (res.data.room) {
        roomState.value = {
          id: res.data.room.id,
          name: res.data.room.room_name,
          status: res.data.room.status,
          max_players: res.data.room.max_players || 4,
          player_count: res.data.room.current_players || 0,
          players: res.data.players || [],
          ready_count: (res.data.players || []).filter(p => p.is_ready).length
        }
        console.log('房间状态已设置:', roomState.value)

        // 如果房间状态不是PLAYING，则显示等待界面
        if (res.data.room?.status !== 'PLAYING') {
          connecting.value = false
          console.log('房间状态为WAITING，显示等待界面')
        }
      }

      // 如果房间状态是PLAYING，请求游戏状态
      if (res.data.room?.status === 'PLAYING') {
        console.log('房间正在游戏中，等待GAME_STATE推送')
        // 通过WebSocket发送RECONNECT消息获取游戏状态
        wsClient.send('RECONNECT', {})
      }
    } else {
      // 如果请求失败，也要取消connecting状态
      connecting.value = false
    }
  } catch (e) {
    console.error('Load room error:', e)
    showToast('加载房间失败: ' + (e.msg || e.message || '未知错误'))
    connecting.value = false
  }
}

// 状态轮询：定期请求游戏状态，防止卡住
function startStatePolling() {
  // 每5秒轮询一次游戏状态
  statePollingTimer = setInterval(() => {
    if (gameState.value && gameState.value.phase === 'PLAYING') {
      console.log('轮询游戏状态...')
      wsClient.send('RECONNECT', {})
    }
  }, 5000)
}

function showToast(msg, type = 'error') {
  toast.value = { show: true, msg, type }
}

// 行动日志工具函数
function addActionLog(message, type = 'info') {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  actionLogs.value.push({
    time,
    message,
    type // 'info', 'play', 'challenge', 'punishment', 'eliminate', 'system'
  })

  // 限制日志数量，最多保留100条
  if (actionLogs.value.length > 100) {
    actionLogs.value.shift()
  }

  // 自动滚动到底部
  nextTick(() => {
    logScrollTop.value = 999999
  })
}

function clearActionLog() {
  actionLogs.value = []
}

// 获取玩家名称（带编号）
function getPlayerName(playerId) {
  const player = gameState.value?.players?.find(p => p.id === playerId)
  if (!player) return '未知玩家'
  return `P${player.seat_index + 1}-${player.nickname}${player.is_ai ? '(AI)' : ''}`
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
  // 只有能出牌时才能选牌
  if (!canPlayCard.value) return

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

  // 记录自己的出牌行动
  const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
  addActionLog(`${myName} 出了 ${selectedCards.value.length} 张 ${gameState.value.target_card}`, 'play')

  resetSelection()
}

function challenge() {
  const targetId = gameState.value?.last_play?.player_id
  if (!targetId) return

  wsClient.send('CHALLENGE', {
    target_player_id: targetId
  })

  // 记录质疑行动
  const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
  const targetName = getPlayerName(targetId)
  addActionLog(`${myName} 选择质疑 ${targetName}`, 'challenge')
}

function passTurn() {
  wsClient.send('PASS')

  // 记录放弃质疑
  const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
  addActionLog(`${myName} 选择不质疑，轮到下家`, 'info')

  resetSelection()
}

// Foxy技能相关函数
function showSkillTargetSelect() {
  if (skillUsed.value) {
    showToast('技能已使用', 'info')
    return
  }
  showSkillTargets.value = true
}

function useSkillOnTarget(targetPlayerId) {
  const target = gameState.value?.players?.find(p => p.id === targetPlayerId)
  if (!target || !target.is_alive) {
    showToast('无效的目标', 'error')
    return
  }

  // 发送技能使用请求
  wsClient.send('USE_SKILL', {
    target_player_id: targetPlayerId
  })

  showSkillTargets.value = false
  skillUsed.value = true
  console.log('使用Foxy技能，目标:', targetPlayerId)
}

function onSkillResult(payload) {
  console.log('收到技能结果:', payload)
  if (payload.skill === 'foxy_peek') {
    const target = gameState.value?.players?.find(p => p.id === payload.target_player_id)
    const targetName = target?.nickname || '玩家'
    const duration = Math.floor((payload.duration_ms || 3000) / 1000)

    skillPeekResult.value = {
      targetName,
      cards: payload.hand || [],
      remaining: duration
    }

    // 倒计时
    let remaining = duration
    const timer = setInterval(() => {
      remaining--
      if (skillPeekResult.value) {
        skillPeekResult.value.remaining = remaining
      }
      if (remaining <= 0) {
        clearInterval(timer)
        skillPeekResult.value = null
      }
    }, 1000)
  }
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
  confirmDialog.value = {
    visible: true,
    title: '提示',
    content: '确定要离开房间吗？',
    onConfirm: async () => {
      try {
        await roomAPI.leave(roomId.value)
      } catch (e) {
        console.error('Leave room error:', e)
      }
      uni.navigateBack()
    },
    onCancel: () => {
      confirmDialog.value.visible = false
    }
  }
}

// WebSocket 事件处理
function onRoomState(payload) {
  console.log('ROOM_STATE:', payload)
  // 更新房间状态（等待阶段）
  roomState.value = {
    id: payload.id,
    name: payload.name,
    status: payload.phase || 'WAITING',
    max_players: payload.max_players || 4,
    player_count: payload.player_count || 0,
    players: payload.players || [],
    ready_count: payload.ready_count || 0
  }
  connecting.value = false
  console.log('房间状态已更新，connecting设为false，roomState:', roomState.value)
}

function onGameState(payload) {
  console.log('========== GAME_STATE 接收 ==========')
  console.log('完整payload:', JSON.stringify(payload, null, 2))
  console.log('当前玩家座位:', payload.current_player)
  console.log('当前回合:', payload.turn)
  console.log('当前轮次:', payload.round)
  console.log('阶段:', payload.phase)

  // 更新游戏状态
  gameState.value = {
    phase: payload.phase,
    current_player: payload.current_player,
    current_turn: payload.turn || 0,
    current_round: payload.round || 1,
    target_card: payload.target_card,
    alive_count: payload.players?.filter(p => p.is_alive).length || 0,
    players: payload.players || [],
    legal_actions: payload.legal_actions || [],
    last_play: payload.last_play ? {
      player_id: payload.last_play.player_id,
      count: payload.last_play.count,
      claim: payload.last_play.claim
    } : null
  }

  // 记录上家出牌日志
  if (payload.last_play) {
    const playerName = getPlayerName(payload.last_play.player_id)
    addActionLog(`${playerName} 出了 ${payload.last_play.count} 张 ${payload.last_play.claim}`, 'play')
  }

  // 找到当前操作的玩家
  const currentPlayer = payload.players?.find(p => p.seat_index === payload.current_player)
  if (currentPlayer) {
    console.log('当前操作玩家:', {
      id: currentPlayer.id,
      nickname: currentPlayer.nickname,
      is_ai: currentPlayer.is_ai,
      seat_index: currentPlayer.seat_index,
      is_alive: currentPlayer.is_alive,
      hand_count: currentPlayer.hand_count
    })

    // 记录回合开始日志
    if (payload.phase === 'PLAYING') {
      const playerName = getPlayerName(currentPlayer.id)
      addActionLog(`轮到 ${playerName} 行动 (回合${payload.turn})`, 'info')
    } else if (payload.phase === 'CHALLENGE') {
      addActionLog(`进入质疑阶段，可以质疑或放弃`, 'challenge')
    }

    // 检测可能的卡住情况
    if (currentPlayer.hand_count === 0 && currentPlayer.is_alive) {
      console.warn('⚠️ 游戏可能卡住：当前玩家手牌为0但仍是操作者')
      console.warn('玩家信息:', currentPlayer.nickname, 'seat:', currentPlayer.seat_index)
    }
  } else {
    console.warn('找不到当前操作玩家，seat_index:', payload.current_player)
  }

  console.log('=====================================')

  gameStore.updateState(gameState.value)
  connecting.value = false
}

function onGameStarted(payload) {
  console.log('GAME_STARTED:', payload)
  // 游戏开始时设置初始游戏状态
  if (payload.phase) {
    gameState.value = {
      phase: payload.phase,
      current_player: payload.current_player,
      current_turn: 0,
      current_round: payload.round || 1,
      target_card: payload.target_card,
      alive_count: payload.players?.filter(p => p.is_alive).length || 0,
      players: payload.players || [],
      last_play: null
    }
  }
  addSystemMsg('游戏开始！')
  showToast('游戏开始！', 'success')
  addActionLog(`🎮 游戏开始！第 ${payload.round || 1} 轮，目标牌：${payload.target_card}`, 'system')
}

function onChallengeResult(payload) {
  console.log('CHALLENGE_RESULT:', payload)

  const success = payload.success
  const challengerId = payload.challenger_id
  const targetId = payload.target_id
  const loserId = payload.loser_id

  const challengerName = getPlayerName(challengerId)
  const targetName = getPlayerName(targetId)

  triggerChallengeFx(success)

  // 震动反馈
  // #ifdef APP-PLUS
  uni.vibrateShort()
  // #endif

  if (success) {
    addSystemMsg(`质疑成功！玩家说谎，实际牌为：${payload.actual_cards?.join(', ')}`)
    addActionLog(`${challengerName} 质疑 ${targetName}：质疑成功！对方在说谎`, 'challenge')
    addActionLog(`实际牌为：${payload.actual_cards?.join(', ')}`, 'challenge')
  } else {
    addSystemMsg(`质疑失败！对方说的是真话`)
    addActionLog(`${challengerName} 质疑 ${targetName}：质疑失败！对方说真话`, 'challenge')
  }
}

function onRoulette(payload) {
  console.log('RUSSIAN_ROULETTE:', payload)
  const playerId = payload.player_id
  const survived = payload.survived
  const bulletCount = payload.bullet_count

  const playerName = getPlayerName(playerId)

  if (survived) {
    addSystemMsg(`玩家${playerId}扣动扳机${bulletCount}次，幸存！`)
    addActionLog(`🎲 ${playerName} 进入惩罚阶段，扣动扳机 ${bulletCount} 次 → 幸存`, 'punishment')
  } else {
    addSystemMsg(`玩家${playerId}扣动扳机${bulletCount}次，被击中！`)
    addActionLog(`💥 ${playerName} 进入惩罚阶段，扣动扳机 ${bulletCount} 次 → 被击中！`, 'punishment')
  }
}

function onPlayerEliminated(payload) {
  console.log('PLAYER_ELIMINATED:', payload)
  const playerId = payload.player_id

  triggerEliminateFx(playerId)

  // #ifdef APP-PLUS
  uni.vibrateLong()
  // #endif

  const playerName = getPlayerName(playerId)
  addSystemMsg(`${playerName} 被淘汰`)
  addActionLog(`💀 ${playerName} 被淘汰出局`, 'eliminate')

  // 更新玩家存活状态
  if (gameState.value?.players) {
    const player = gameState.value.players.find(p => p.id === playerId)
    if (player) {
      player.is_alive = false
    }
    gameState.value.alive_count = gameState.value.players.filter(p => p.is_alive).length
  }
}

function onGameOver(payload) {
  console.log('GAME_OVER:', payload)
  gameState.value = {
    ...(gameState.value || {}),
    phase: 'GAME_OVER',
    winner_id: payload.winner_id
  }

  const winnerName = getPlayerName(payload.winner_id)
  addSystemMsg(`游戏结束！${winnerName} 获胜`)
  addActionLog(`🏆 游戏结束！${winnerName} 获得胜利`, 'system')
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
    addActionLog(`🚪 ${name} 退出游戏，本局结束`, 'system')
  } else {
    const name = payload.nickname || `玩家${payload.player_id}`
    addSystemMsg(`${name} 离开了房间`)
    addActionLog(`🚪 ${name} 离开了房间`, 'system')
  }
}

function onPlayerJoined(payload) {
  console.log('PLAYER_JOINED:', payload)
  const name = payload.nickname || `玩家${payload.player_id}`
  addSystemMsg(`${name} 加入了房间`)
  addActionLog(`👋 ${name} 加入了房间`, 'system')
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

/* 行动日志面板 */
.action-log-panel {
  flex: 3;
  background: linear-gradient(160deg, rgba(26, 15, 10, 0.95) 0%, rgba(42, 24, 18, 0.95) 100%);
  border: 2px solid #5a3a1e;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.log-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  border-bottom: 1px solid #5a3a1e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-title {
  color: #d4a574;
  font-size: 16px;
  font-weight: 600;
}

.log-clear-btn {
  padding: 4px 12px;
  background: rgba(60, 0, 0, 0.6);
  border: 1px solid #5a3a1e;
  border-radius: 4px;
  color: #a08060;
  font-size: 12px;
  cursor: pointer;
}

.log-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-content::-webkit-scrollbar {
  width: 6px;
}

.log-content::-webkit-scrollbar-track {
  background: rgba(42, 24, 18, 0.5);
  border-radius: 3px;
}

.log-content::-webkit-scrollbar-thumb {
  background: rgba(90, 58, 30, 0.8);
  border-radius: 3px;
}

.log-item {
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(42, 24, 18, 0.5);
  border-left: 3px solid #5a3a1e;
  font-size: 13px;
  line-height: 1.5;
  animation: log-appear 0.3s ease-out;
}

@keyframes log-appear {
  from {
    opacity: 0;
    transform: translateX(10px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.log-time {
  display: inline-block;
  color: #8a6a4a;
  font-size: 11px;
  margin-right: 8px;
  font-family: monospace;
}

.log-text {
  color: #c0b0a0;
}

.log-item.play {
  border-left-color: #d4a574;
  background: rgba(212, 165, 116, 0.1);
}

.log-item.play .log-text {
  color: #d4a574;
}

.log-item.challenge {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.log-item.challenge .log-text {
  color: #fbbf24;
}

.log-item.punishment {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.log-item.punishment .log-text {
  color: #f87171;
}

.log-item.eliminate {
  border-left-color: #991b1b;
  background: rgba(153, 27, 27, 0.15);
}

.log-item.eliminate .log-text {
  color: #dc2626;
  font-weight: 600;
}

.log-item.system {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

.log-item.system .log-text {
  color: #a78bfa;
}

.log-empty {
  text-align: center;
  color: #6b5a4a;
  font-size: 13px;
  padding: 20px;
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
  background-image: url('../../static/images/game.jpg');
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

/* 玩家编号标签 */
.player-number {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #5a3a1e 0%, #3a2616 100%);
  border: 2px solid #d4a574;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4a574;
  font-size: 11px;
  font-weight: 700;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.player-number.my-number {
  border-color: #f59e0b;
  color: #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.6);
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

.last-played {
  display: block;
  color: #f59e0b;
  font-size: 9px;
  text-align: center;
  margin-top: 2px;
  font-weight: 600;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  gap: 10px;
}

.current-turn-banner {
  padding: 8px 20px;
  border-radius: 20px;
  background: rgba(30, 10, 10, 0.95);
  border: 2px solid #5c2e2e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.turn-text {
  font-size: 14px;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.turn-text.my-turn {
  color: #10b981;
  animation: pulse 1.5s ease-in-out infinite;
}

.turn-text.challenge-phase {
  color: #f59e0b;
  animation: pulse 1.5s ease-in-out infinite;
}

.turn-text.waiting {
  color: #f59e0b;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
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

/* 底部容器：手牌区（70%）+ 日志区（30%） */
.bottom-container {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* 自己的手牌区域 - 高度控制在100px内 */

.my-info-row {
  display: flex;
}

.my-area {
  flex: 7;
  background: rgba(30, 10, 10, 0.9);
  border: 2px solid #5c2e2e;
  border-radius: 6px;
  padding: 8px 8px 20px 8px;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.my-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  /* height: 28px; */
}

.my-avatar {
  width: 28px;
  /* height: 28px; */
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

/* 第一行：个人信息 + 操作按钮 */
.top-info-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.action-buttons-top {
  display: flex;
  align-items: center;
  gap: 8px;
  /* flex: 1; */
}

.top-btn {
  width: 80px;
  height: 32px;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  line-height: 32px;
  text-align: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.top-btn.play-btn {
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
  color: #000;
  box-shadow: 0 3px 8px rgba(74, 222, 128, 0.4);
}

.top-btn.play-btn[disabled] {
  background: #333;
  color: #666;
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.6;
}

.top-btn.challenge-btn {
  background: linear-gradient(180deg, #e94560 0%, #dc2626 100%);
  color: #fff;
  box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
}

.top-btn.pass-btn {
  background: linear-gradient(180deg, #888 0%, #666 100%);
  color: #fff;
}

.status-text {
  color: #8a6a4a;
  font-size: 12px;
  margin-left: 8px;
}

/* 第二行：技能侧边栏 + 手牌 */
.cards-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-btn-sidebar {
  width: 80px;
  height: 66px;
  padding: 4px 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(180deg, #7a3e3e 0%, #5c2e2e 100%);
  border: 2px solid #8a4e4e;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
}

.skill-btn-sidebar[disabled] {
  background: #333;
  border-color: #555;
  cursor: not-allowed;
  opacity: 0.6;
}

.skill-btn-sidebar:active:not([disabled]) {
  transform: scale(0.95);
}

.skill-icon {
  font-size: 18px;
}

.skill-label {
  font-size: 12px;
  font-weight: 700;
  color: #d4a574;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
}

.skill-label {
  font-size: 11px;
  font-weight: 700;
  color: #d4a574;
  text-align: center;
  line-height: 1;
}

.skill-btn-sidebar[disabled] .skill-label {
  color: #666;
}

.hand-cards-container {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  flex: 1;
}

/* 手牌 */
.hand-cards {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #8a6a4a;
  padding: 16px;
  font-size: 12px;
  height: 66px;
}

/* 操作按钮 - 高度24px */
.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
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

/* 技能按钮样式 */
.skill-btn {
  background: linear-gradient(145deg, #8b5cf6 0%, #7c3aed 100%);
  color: #fff;
  border: 2px solid #a78bfa;
}

.skill-btn:disabled {
  background: linear-gradient(145deg, #4b5563 0%, #374151 100%);
  color: #9ca3af;
  border-color: #6b7280;
}

/* 技能目标选择弹窗 */
.skill-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.skill-modal {
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  border: 2px solid #8b5cf6;
  border-radius: 12px;
  padding: 24px;
  min-width: 400px;
  max-width: 90%;
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
}

.skill-modal-title {
  display: block;
  color: #a78bfa;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 20px;
}

.skill-targets {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.skill-target {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(139, 92, 246, 0.1);
  border: 2px solid #8b5cf6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skill-target:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #a78bfa;
  transform: translateX(4px);
}

.skill-target.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.target-avatar {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.target-name {
  flex: 1;
  color: #d4a574;
  font-size: 16px;
  font-weight: 600;
}

.target-cards {
  color: #a78bfa;
  font-size: 14px;
}

.skill-cancel {
  width: 100%;
  background: linear-gradient(145deg, #4b5563 0%, #374151 100%);
  color: #d4a574;
  padding: 10px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #6b7280;
}

/* Foxy偷看结果弹窗 */
.skill-peek-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
}

.skill-peek-modal {
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  border: 3px solid #a78bfa;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 12px 48px rgba(139, 92, 246, 0.5);
  animation: peek-appear 0.3s ease-out;
}

@keyframes peek-appear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.peek-title {
  display: block;
  color: #a78bfa;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
}

.peek-cards {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.peek-card {
  width: 80px;
  height: 110px;
  background: linear-gradient(145deg, #2a1c12 0%, #1f1610 100%);
  border: 2px solid #d4a574;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.peek-card-face {
  color: #d4a574;
  font-size: 32px;
  font-weight: 700;
}

.peek-timer {
  display: block;
  color: #f59e0b;
  font-size: 16px;
  font-weight: 600;
}
</style>
