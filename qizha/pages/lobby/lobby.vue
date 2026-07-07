<template>
  <view class="lobby">
    <!-- 左上角在线人数面板 -->
    <view class="online-panel">
      <text class="online-icon iconfont">&#xe6bb;</text>
      <text class="online-label">在线人数</text>
      <text class="online-count">{{ lobbyData.online_count || 0 }}</text>
    </view>

    <!-- 右上角功能按钮组 -->
    <view class="top-right-buttons">
      <view class="func-button" @click="goSettings">
        <text class="func-icon iconfont">&#xe643;</text>
        <text class="func-label">设置</text>
      </view>
      <view class="func-button" @click="goProfile">
        <text class="func-icon iconfont">&#xe60e;</text>
        <text class="func-label">用户中心</text>
      </view>
      <view class="func-button" @click="handleLogout">
        <text class="func-icon iconfont">&#xe622;</text>
        <text class="func-label">退出</text>
      </view>
    </view>

    <!-- 左侧游戏规则面板 -->
    <view class="rules-panel" @click="showRules = true">
      <text class="rules-title">游戏规则</text>
      <image src="../../static/images/puke.png" mode="scaleToFill" />
      <text class="rules-hint">点击查看</text>
    </view>

    <!-- 底部操作按钮区 -->
    <view class="bottom-actions">
      <!-- 左侧三个按钮：双层嵌套结构 -->
      <view class="action-button-outer" @click="startMatch">
        <view class="action-button-inner">
          <image class="action-icon-img" src="../../static/images/puke1.png" mode="aspectFit" />
          <view class="action-texts">
            <text class="action-title">快速匹配</text>
            <text class="action-subtitle">随机加入一场游戏</text>
          </view>
        </view>
      </view>

      <view class="action-button-outer" @click="createRoom">
        <view class="action-button-inner">
          <text class="action-icon iconfont">&#xe62e;</text>
          <view class="action-texts">
            <text class="action-title">创建房间</text>
            <text class="action-subtitle">创建私人房间</text>
          </view>
        </view>
      </view>

      <view class="action-button-outer">
        <view class="action-button-inner">
          <text class="action-icon iconfont">&#xe607;</text>
          <view class="action-texts">
            <text class="action-title">查看房间</text>
            <text class="action-subtitle">浏览可加入的房间</text>
          </view>
        </view>
      </view>

      <!-- 右侧开始游戏按钮：双层嵌套结构 -->
      <view class="start-button-outer" @click="startMatch">
        <view class="start-button-inner">
          <text class="start-title">开始游戏</text>
          <text class="start-subtitle"><span class="dash">——</span> 选择你的命运 <span class="dash">——</span></text>
        </view>
      </view>
    </view>

    <!-- 组件 -->
    <Toast v-if="toast.show" :msg="toast.msg" :type="toast.type" @close="toast.show = false" />
    <Loading v-if="loading" />

    <!-- 游戏规则模态框 -->
    <view v-if="showRules" class="rules-overlay" @click.self="showRules = false">
      <view class="rules-modal">
        <view class="rules-close" @click="showRules = false">×</view>
        <text class="rules-modal-title">📖 骗子酒馆 规则</text>
        <view class="rules-content">
          <view class="rule-section">
            <text class="rule-title">目标</text>
            <text class="rule-text">4 人对战，通过出牌、撒谎、质疑和心理博弈，成为最后存活的玩家。</text>
          </view>

          <view class="rule-section">
            <text class="rule-title">牌组</text>
            <text class="rule-text">A / K / Q / J 各 6 张，共 24 张。每人发 6 张。</text>
          </view>

          <view class="rule-section">
            <text class="rule-title">目标牌</text>
            <text class="rule-text">每一轮有指定目标牌（A→K→Q→J 循环）。出牌时必须声明打出的全部是当前目标牌。</text>
          </view>

          <view class="rule-section">
            <text class="rule-title">出牌</text>
            <text class="rule-text">当前回合玩家选 1~3 张手牌打出。可以真出（全是目标牌），也可以虚张声势（含非目标牌）。其他玩家只能看到声明，看不到真实牌面。</text>
          </view>

          <view class="rule-section">
            <text class="rule-title">质疑</text>
            <text class="rule-text">下一名玩家可选择质疑上家。系统翻开上家刚打出的牌：</text>
            <view class="rule-list">
              <text class="rule-item">• 含非目标牌（撒谎）→ 质疑成功，撒谎者受罚</text>
              <text class="rule-item">• 全是目标牌（说真话）→ 质疑失败，质疑者受罚</text>
            </view>
          </view>

          <view class="rule-section">
            <text class="rule-title">俄罗斯轮盘惩罚</text>
            <text class="rule-text">每次受罚累计子弹数：第 1 次 1 发，第 2 次 2 发……第 6 次必死。被击中即淘汰出局，存活则继续。</text>
          </view>

          <view class="rule-section">
            <text class="rule-title">手牌耗尽</text>
            <text class="rule-text">所有存活玩家手牌为空时，重新洗牌发牌，目标牌切换到下一种。</text>
          </view>

          <view class="rule-section">
            <text class="rule-title">操作</text>
            <view class="rule-list">
              <text class="rule-item"><text class="rule-highlight">出牌</text>：选 1~3 张牌，点击「出牌」</text>
              <text class="rule-item"><text class="rule-highlight">质疑上家</text>：仅当上家有出牌时可点</text>
              <text class="rule-item"><text class="rule-highlight">过</text>：不质疑，交由下家</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { lobbyAPI, roomAPI, matchAPI } from '../../utils/api'
import wsClient from '../../utils/websocket'
import Toast from '../../components/Toast.vue'
import Loading from '../../components/Loading.vue'
import RulesModal from '../../components/RulesModal.vue'

const authStore = useAuthStore()

const lobbyData = ref({ online_count: 0, active_rooms: [] })
const rooms = ref([])
const showRules = ref(false)
const loading = ref(false)
const toast = ref({ show: false, msg: '', type: 'error' })

let pollTimer = null

// 强制横屏
function setLandscape() {
  // #ifdef APP-PLUS
  plus.screen.lockOrientation('landscape-primary')
  console.log('已设置横屏模式')
  // #endif
}

onMounted(() => {
  console.log('=== 大厅页面加载 ===')
  setLandscape()

  // 检查登录状态
  if (!authStore.isLoggedIn) {
    uni.reLaunch({
      url: '/pages/login/login'
    })
    return
  }

  // 连接 WebSocket
  wsClient.connect()
  wsClient.on('connected', fetchLobby)

  // 初始化数据
  fetchLobby()

  // 定时轮询更新大厅数据
  pollTimer = setInterval(fetchLobby, 5000)
})

// 页面显示时也设置横屏（防止其他页面解锁后无法恢复）
onActivated(() => {
  console.log('=== 大厅页面显示 ===')
  setLandscape()
})

onUnmounted(() => {
  wsClient.off('connected', fetchLobby)
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

async function fetchLobby() {
  try {
    const res = await lobbyAPI.get()
    lobbyData.value = res.data || {}
    rooms.value = res.data?.active_rooms || []
  } catch (e) {
    console.error('Fetch lobby error:', e)
  }
}

function showToast(msg, type = 'error') {
  toast.value = { show: true, msg, type }
}

async function startMatch() {
  loading.value = true
  try {
    await matchAPI.start()
    // 跳转到匹配等待页
    uni.navigateTo({
      url: '/pages/match-wait/match-wait'
    })
  } catch (e) {
    showToast(e.response?.data?.msg || '匹配失败')
  } finally {
    loading.value = false
  }
}

async function createRoom() {
  uni.showModal({
    title: '创建房间',
    editable: true,
    placeholderText: '输入房间名称',
    success: async (res) => {
      if (res.confirm && res.content) {
        loading.value = true
        try {
          const result = await roomAPI.create(res.content)
          const roomId = result.data?.id || result.data?.room_id
          if (roomId) {
            uni.navigateTo({
              url: `/pages/game-room/game-room?id=${roomId}`
            })
          }
        } catch (e) {
          showToast(e.response?.data?.msg || '创建失败')
        } finally {
          loading.value = false
        }
      }
    }
  })
}

function goProfile() {
  uni.navigateTo({
    url: '/pages/profile/profile'
  })
}

function goSettings() {
  uni.showToast({
    title: '设置功能开发中',
    icon: 'none'
  })
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout()
        uni.reLaunch({
          url: '/pages/login/login'
        })
      }
    }
  })
}

function roomTitle(room) {
  return room.name || `房间 ${room.id}`
}

function roomPlayers(room) {
  return room.players?.length || 0
}

function roomPhase(room) {
  return room.phase || 'WAITING'
}

function roomCanJoin(room) {
  const players = room.players?.length || 0
  const maxPlayers = room.max_players || 4
  return players < maxPlayers && room.phase !== 'PLAYING'
}

async function handleJoinRoom(room) {
  if (!roomCanJoin(room)) return

  loading.value = true
  try {
    await roomAPI.join(room.id)
    uni.navigateTo({
      url: `/pages/game-room/game-room?id=${room.id}`
    })
  } catch (e) {
    showToast(e.response?.data?.msg || '加入失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@font-face {
  font-family: "iconfont";
  src: url('/static/font_5205346_azzi8l5rqld/iconfont.woff2') format('woff2'),
    url('/static/font_5205346_azzi8l5rqld/iconfont.woff') format('woff'),
    url('/static/font_5205346_azzi8l5rqld/iconfont.ttf') format('truetype');
}

.iconfont {
  font-family: "iconfont" !important;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.lobby {
  width: 100vw;
  height: 100vh;
  background: url('/static/images/lobby.png') center/cover no-repeat;
  position: relative;
}

/* 左上角在线人数面板 */
.online-panel {
  position: fixed;
  top: 24px;
  left: 24px;
  height: 30px;
  padding: 0 16px;
  background: #4a1a1a;
  border: 2px solid #5c2e2e;
  border-radius: 8px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4), 0 3px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
  opacity: 0.85;
}

.online-icon {
  font-family: 'iconfont';
  font-size: 16px;
  color: #c9a875;
}

.online-label {
  color: #c9a875;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.online-count {
  color: #d94f3d;
  font-size: 14px;
  font-weight: 600;
}

/* 右上角功能按钮组 */
.top-right-buttons {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 12px;
  z-index: 100;
}

.func-button {
  width: 56px;
  height: 56px;
  background: rgba(30, 10, 10, 0.75);
  border: 2px solid #5c2e2e;
  border-radius: 8px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
}

.func-button:active {
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.4);
  border-color: #8a4a4a;
}

.func-icon {
  font-size: 24px;
  color: rgb(137, 37, 26);
}

.func-label {
  color: #c9a875;
  font-size: 12px;
}

/* 左侧游戏规则面板 */
.rules-panel {
  position: fixed;
  left: 24px;
  top: 33%;
  width: 120px;
  height: 160px;
  background: linear-gradient(145deg, rgba(44, 9, 32, 0.95) 0%, rgba(30, 6, 22, 0.98) 100%);
  border: 3px solid transparent;
  border-radius: 12px;
  box-shadow:
    inset 0 0 0 1px rgba(139, 69, 19, 0.4),
    inset 2px 2px 4px rgba(180, 50, 50, 0.3),
    inset -2px -2px 4px rgba(60, 20, 20, 0.5),
    0 0 0 2px rgba(80, 25, 25, 0.8),
    0 0 0 3px rgba(139, 69, 19, 0.5),
    2px 2px 0 3px rgba(180, 60, 60, 0.4),
    -1px -1px 0 3px rgba(100, 30, 30, 0.6),
    0 6px 12px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 50;
  position: relative;
}

.rules-panel::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 12px;
  background: linear-gradient(135deg,
      rgba(180, 60, 60, 0.6) 0%,
      rgba(100, 30, 30, 0.5) 25%,
      rgba(160, 50, 50, 0.55) 50%,
      rgba(80, 25, 25, 0.7) 75%,
      rgba(120, 40, 40, 0.6) 100%);
  z-index: -1;
  filter: blur(0.5px);
}

.rules-panel::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, rgba(200, 80, 80, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.rules-title {
  color: #d4a574;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  position: relative;
  z-index: 1;
}

.rules-panel image {
  width: 120px;
  height: 70px;
  object-fit: contain;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.6));
  position: relative;
  z-index: 1;
}

.rules-hint {
  color: #b8956f;
  font-size: 12px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  position: relative;
  z-index: 1;
}

/* 底部操作按钮区 */
.bottom-actions {
  position: fixed;
  bottom: 2px;
  left: 24px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  z-index: 60;
}

/* 左侧三个按钮 - 外层容器（边框盒子） */
.action-button-outer {
  width: 180px;
  height: 70px;
  background: rgba(60, 0, 0, 0.6);
  padding: 4px;
  border-radius: 0;
  position: relative;
  clip-path: polygon(8px 0, calc(100% - 8px) 0,
      100% 8px, 100% calc(100% - 8px),
      calc(100% - 8px) 100%, 8px 100%,
      0 calc(100% - 8px), 0 8px);
  box-shadow:
    inset 1px 1px 0 rgba(140, 50, 40, 0.4),
    inset -1px -1px 0 rgba(80, 25, 20, 0.5),
    0 4px 8px rgba(0, 0, 0, 0.4);
  opacity: 0.8;
}

.action-button-outer::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
      rgba(120, 45, 35, 0.3) 0%,
      rgba(80, 30, 25, 0.4) 30%,
      rgba(100, 35, 30, 0.35) 60%,
      rgba(90, 30, 25, 0.45) 100%);
  clip-path: inherit;
  pointer-events: none;
}

/* 左侧三个按钮 - 内层内容盒子 */
.action-button-inner {
  width: 100%;
  height: 100%;
  background: linear-gradient(140deg,
      rgba(35, 8, 8, 0.85) 0%,
      rgba(28, 6, 6, 0.9) 50%,
      rgba(32, 7, 7, 0.88) 100%);
  clip-path: polygon(6px 0, calc(100% - 6px) 0,
      100% 6px, 100% calc(100% - 6px),
      calc(100% - 6px) 100%, 6px 100%,
      0 calc(100% - 6px), 0 6px);
  box-shadow:
    inset 0 0 0 1px rgba(100, 40, 35, 0.3),
    inset 1px 1px 3px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 16px;
  opacity: 0.9;
}

.action-icon {
  font-size: 42px;
  flex-shrink: 0;
  color: rgb(137, 37, 26);
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
}

.action-icon-img {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.action-texts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-title {
  color: #d4a574;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.action-subtitle {
  color: #a08060;
  font-size: 12px;
  opacity: 0.85;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

/* 右侧开始游戏按钮 - 外层边框容器 */
.start-button-outer {
  width: 220px;
  height: 75px;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  position: relative;
  margin-right: 25px;
  clip-path: polygon(10px 0, calc(100% - 10px) 0,
      100% 10px, 100% calc(100% - 10px),
      calc(100% - 10px) 100%, 10px 100%,
      0 calc(100% - 10px), 0 10px);
  box-shadow:
    inset 1px 1px 0 rgba(140, 50, 40, 0.4),
    inset -1px -1px 0 rgba(80, 25, 20, 0.5),
    0 4px 8px rgba(0, 0, 0, 0.4);
}

.start-button-outer::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
      rgba(140, 50, 45, 0.35) 0%,
      rgba(100, 35, 30, 0.4) 25%,
      rgba(120, 42, 38, 0.38) 50%,
      rgba(90, 30, 26, 0.45) 75%,
      rgba(110, 38, 34, 0.4) 100%);
  clip-path: inherit;
  pointer-events: none;
}

.dash {
  color: rgba(88, 25, 14);

}


/* 右侧开始游戏按钮 - 内层内容容器 */
.start-button-inner {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(ellipse at 20% 30%, rgba(80, 25, 22, 0.6) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(65, 20, 18, 0.5) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 50%, rgba(70, 22, 20, 0.4) 0%, transparent 60%),
    linear-gradient(155deg,
      rgba(75, 28, 25, 0.9) 0%,
      rgba(62, 22, 20, 0.95) 25%,
      rgba(68, 24, 22, 0.92) 50%,
      rgba(58, 20, 18, 0.96) 75%,
      rgba(52, 18, 16, 0.98) 100%);
  clip-path: polygon(8px 0, calc(100% - 8px) 0,
      100% 8px, 100% calc(100% - 8px),
      calc(100% - 8px) 100%, 8px 100%,
      0 calc(100% - 8px), 0 8px);
  box-shadow:
    inset 0 0 0 1px rgba(100, 40, 35, 0.3),
    inset 1px 1px 3px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
}

.start-button-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg,
      rgba(100, 35, 30, 0.2) 0%,
      transparent 30%,
      rgba(80, 28, 25, 0.15) 60%,
      rgba(60, 22, 20, 0.25) 100%);
  clip-path: inherit;
  pointer-events: none;
}

.start-button-inner::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 12px;
  width: 60px;
  height: 40px;
  background: radial-gradient(ellipse, rgba(140, 60, 50, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.start-title {
  color: rgb(138, 97, 61);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 6px;
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.8),
    0 0 8px rgba(100, 40, 30, 0.3);
  position: relative;
  z-index: 1;
}

.start-subtitle {
  color: #d4956f;
  font-size: 13px;
  letter-spacing: 2px;
  opacity: 0.75;
  font-weight: 400;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  position: relative;
  z-index: 1;
}

/* 游戏规则模态框 */
.rules-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.rules-modal {
  position: relative;
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  border: 2px solid #5a3a1e;
  border-radius: 14px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(203, 151, 103, 0.2), inset 0 1px 0 rgba(203, 151, 103, 0.1);
}

.rules-close {
  position: fixed;
  top: calc(10vh + 10px);
  right: calc(15% + 14px);
  background: none;
  border: none;
  color: #8a6a4a;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  z-index: 301;
}

.rules-modal-title {
  display: block;
  color: #cb9767;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 20px;
  text-align: center;
}

.rules-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid #3a2616;
}

.rule-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.rule-title {
  color: #f5a623;
  font-size: 16px;
  font-weight: 700;
}

.rule-text {
  color: #d0c8c0;
  font-size: 14px;
  line-height: 1.7;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.rule-item {
  color: #d0c8c0;
  font-size: 14px;
  line-height: 1.6;
  padding-left: 8px;
}

.rule-highlight {
  color: #e94560;
  font-weight: 700;
}
</style>
