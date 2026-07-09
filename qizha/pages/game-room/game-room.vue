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
      <view class="back-btn" @tap="leaveRoom">
        <text>← 返回大厅</text>
      </view>
      <view class="room-info">
        <text class="round-badge">第 {{ gameState?.current_round || 1 }} 轮</text>
        <text class="turn-badge">回合 {{ gameState?.current_turn || 0 }}</text>
        <text class="target-badge">目标牌: {{ gameState?.target_card || '-' }}</text>
      </view>
      <view class="alive-count">{{ gameState?.alive_count || 4 }} 人存活</view>
      <button class="top-icon-btn" @tap="goSettings">⚙</button>
      <button class="top-icon-btn rules-btn" @tap="showRules = true">📖</button>
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
            <view class="waiting-avatar">
              <image v-if="getCharacterHeadImage(seat.player?.character_id)" class="character-head"
                :src="getCharacterHeadImage(seat.player.character_id)" mode="aspectFill" />
              <text v-else>{{ seat.player ? (seat.player.is_ai ? '🤖' : '👤') : '-' }}</text>
            </view>
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
      <!-- 当前回合提示 - 移到右上角 -->
      <view class="current-turn-banner">
        <text v-if="gameState?.phase === 'CHALLENGE'" class="turn-text challenge-phase">
          ⚠️ 质疑阶段 - 可以质疑或放弃
        </text>
        <text v-else-if="canPlayCard" class="turn-text my-turn">👉 轮到你操作</text>
        <text v-else class="turn-text waiting">{{ currentPlayerName }} 操作中...</text>
      </view>

      <!-- 左侧对手 -->
      <view v-if="opponents[0]" class="left-opponent">
        <view class="player-card player-card-vertical"
          :class="{ active: gameState.current_player === opponents[0].seat_index, eliminated: !opponents[0].is_alive }">
          <!-- 玩家编号 -->
          <view class="player-number">P{{ opponents[0].seat_index + 1 }}</view>
          <view class="player-avatar">
            <image v-if="getCharacterHeadImage(opponents[0].character_id)" class="character-head"
              :src="getCharacterHeadImage(opponents[0].character_id)" mode="aspectFill" />
            <text v-else-if="opponents[0].is_ai">🤖</text>
            <text v-else>👤</text>
          </view>
          <view class="player-name-row">
            <text class="player-name">{{ opponents[0].nickname }}</text>
            <text v-if="opponents[0].character_id" class="character-badge">{{
              getCharacterName(opponents[0].character_id) }}</text>
          </view>
          <view class="player-hp">
            <view v-for="i in 6" :key="i" class="hp-dot"
              :class="{ filled: i <= (opponents[0].bullets || opponents[0].punishment_count || 0) }">
            </view>
          </view>
          <text class="card-count">{{ opponents[0].hand_count }} 张牌</text>
          <!-- 显示最近出牌信息 -->
          <text v-if="gameState.last_play && gameState.last_play.player_id === opponents[0].id" class="last-played">
            刚出 {{ gameState.last_play.count }} 张 {{ gameState.last_play.claim }}
          </text>
          <view v-if="opponents[0].is_ai" class="ai-tag">AI</view>
          <view v-if="!opponents[0].is_alive" class="dead-tag">💀</view>
        </view>
      </view>

      <!-- 对手区域（顶部只有一个） -->
      <view class="opponents-row">
        <view v-if="opponents[1]" class="player-card"
          :class="{ active: gameState.current_player === opponents[1].seat_index, eliminated: !opponents[1].is_alive }">
          <!-- 玩家编号 -->
          <view class="player-number">P{{ opponents[1].seat_index + 1 }}</view>
          <view class="player-avatar">
            <image v-if="getCharacterHeadImage(opponents[1].character_id)" class="character-head"
              :src="getCharacterHeadImage(opponents[1].character_id)" mode="aspectFill" />
            <text v-else-if="opponents[1].is_ai">🤖</text>
            <text v-else>👤</text>
          </view>
          <view class="player-name-row">
            <text class="player-name">{{ opponents[1].nickname }}</text>
            <text v-if="opponents[1].character_id" class="character-badge">{{
              getCharacterName(opponents[1].character_id) }}</text>
          </view>
          <view class="player-hp">
            <view v-for="i in 6" :key="i" class="hp-dot"
              :class="{ filled: i <= (opponents[1].bullets || opponents[1].punishment_count || 0) }">
            </view>
          </view>
          <text class="card-count">{{ opponents[1].hand_count }} 张牌</text>
          <!-- 显示最近出牌信息 -->
          <text v-if="gameState.last_play && gameState.last_play.player_id === opponents[1].id" class="last-played">
            刚出 {{ gameState.last_play.count }} 张 {{ gameState.last_play.claim }}
          </text>
          <view v-if="opponents[1].is_ai" class="ai-tag">AI</view>
          <view v-if="!opponents[1].is_alive" class="dead-tag">💀</view>
        </view>
      </view>

      <!-- 右侧对手 -->
      <view v-if="opponents[2]" class="right-opponent">
        <view class="player-card player-card-vertical"
          :class="{ active: gameState.current_player === opponents[2].seat_index, eliminated: !opponents[2].is_alive }">
          <!-- 玩家编号 -->
          <view class="player-number">P{{ opponents[2].seat_index + 1 }}</view>
          <view class="player-avatar">
            <image v-if="getCharacterHeadImage(opponents[2].character_id)" class="character-head"
              :src="getCharacterHeadImage(opponents[2].character_id)" mode="aspectFill" />
            <text v-else-if="opponents[2].is_ai">🤖</text>
            <text v-else>👤</text>
          </view>
          <view class="player-name-row">
            <text class="player-name">{{ opponents[2].nickname }}</text>
            <text v-if="opponents[2].character_id" class="character-badge">{{
              getCharacterName(opponents[2].character_id) }}</text>
          </view>
          <view class="player-hp">
            <view v-for="i in 6" :key="i" class="hp-dot"
              :class="{ filled: i <= (opponents[2].bullets || opponents[2].punishment_count || 0) }">
            </view>
          </view>
          <text class="card-count">{{ opponents[2].hand_count }} 张牌</text>
          <!-- 显示最近出牌信息 -->
          <text v-if="gameState.last_play && gameState.last_play.player_id === opponents[2].id" class="last-played">
            刚出 {{ gameState.last_play.count }} 张 {{ gameState.last_play.claim }}
          </text>
          <view v-if="opponents[2].is_ai" class="ai-tag">AI</view>
          <view v-if="!opponents[2].is_alive" class="dead-tag">💀</view>
        </view>
      </view>

      <!-- 中心区域 - 上家出牌 -->
      <view class="center-area">
        <view v-if="gameState.last_play" class="last-play">
          <text class="last-play-info">P{{ lastPlayPlayerSeatIndex + 1 }} 出牌</text>
          <view class="last-play-cards">
            <view v-for="i in gameState.last_play.count" :key="i" class="play-card">
              <text class="card-text">{{ gameState.last_play.claim }}</text>
            </view>
          </view>
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
              <view class="my-avatar">
                <image v-if="getCharacterHeadImage(myPlayer?.character_id)" class="character-head"
                  :src="getCharacterHeadImage(myPlayer.character_id)" mode="aspectFill" />
                <text v-else>👤</text>
              </view>
              <view class="my-details">
                <view class="player-name-row">
                  <text class="my-name">{{ authStore.user?.nickname || '我' }}</text>
                  <text v-if="myPlayer?.character_id" class="character-badge">{{ getCharacterName(myPlayer.character_id)
                  }}</text>
                </view>
                <view class="my-hp">
                  <view v-for="i in 6" :key="i" class="hp-dot" :class="{ filled: i <= myPunishmentCount }"></view>
                </view>
              </view>
            </view>

            <!-- 操作按钮组 -->
            <view class="action-buttons-top">
              <!-- 出牌按钮 - 放在最前面 -->
              <button v-if="canPlayCard" class="top-btn play-btn"
                :disabled="selectedCards.length === 0 || myHandCards.length === 0"
                @tap="playCards">
                出牌({{ selectedCards.length }})
              </button>

              <!-- 质疑按钮 - 手牌为0时禁用，已质疑后也禁用 -->
              <button v-if="canChallenge" class="top-btn challenge-btn"
                :disabled="hasChallenged"
                @tap="challenge">
                {{ hasChallenged ? '已质疑' : '质疑' }}
              </button>

              <!-- 跳过按钮 - 只在质疑阶段显示，且不能是刚出牌的玩家，已放弃后禁用 -->
              <!-- 当手牌为0且没有质疑权限时，不显示放弃按钮（会自动跳过） -->
              <button v-if="canPass && gameState?.phase === 'CHALLENGE' && !isLastPlayByMe && !(myHandCards.length === 0 && !canChallenge)"
                class="top-btn pass-btn"
                :disabled="hasPassedChallenge"
                @tap="passTurn">
                {{ hasPassedChallenge ? '已放弃' : '放弃' }}
              </button>

              <!-- 状态提示 -->
              <text v-if="myPlayer && myPlayer.hand_count === 0 && gameState?.phase === 'PLAYING'" class="status-text">
                手牌已空，自动跳过
              </text>
              <text v-else-if="myHandCards.length === 0 && gameState?.phase === 'CHALLENGE' && !canChallenge" class="status-text">
                手牌已空，自动放弃质疑
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
            <button v-if="showSkillButton" class="skill-btn-sidebar" :disabled="!canUseSkill"
              @tap="showSkillTargetSelect">
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

        <!-- 行动日志/聊天面板 -->

      </view>

      <!-- 消息和日志气泡图标 -->
      <view class="bubble-container">
        <!-- 聊天气泡图标 -->
        <view class="bubble-icon" @tap="toggleChatPanel">
          <text class="bubble-emoji">💬</text>
          <view v-if="chatMessages.length > 0" class="bubble-badge">{{ chatMessages.length }}</view>
        </view>

        <!-- 日志气泡图标 -->
        <view class="bubble-icon" @tap="toggleLogPanel">
          <text class="bubble-emoji">📋</text>
          <view v-if="gameLogs.length > 0" class="bubble-badge">{{ gameLogs.length }}</view>
        </view>
      </view>

      <!-- 聊天面板（绝对定位） -->
      <view v-if="chatExpanded" class="chat-panel-overlay">
        <view class="chat-panel">
          <view class="panel-header">
            <text class="panel-title">聊天消息</text>
            <text class="panel-close" @tap="chatExpanded = false">✕</text>
          </view>
          <scroll-view class="chat-messages-area" scroll-y :scroll-into-view="chatScrollIntoView" scroll-with-animation>
            <view v-if="chatMessages.length === 0" class="empty-hint">暂无消息</view>
            <view v-for="(msg, idx) in chatMessages" :key="idx" :id="msg.id" class="message-item">
              <text class="msg-sender">{{ msg.sender || msg.sender_name }}:</text>
              <text class="msg-text"> {{ msg.text || msg.content }}</text>
            </view>
          </scroll-view>
          <view class="chat-input-area">
            <input v-model="chatText" class="chat-input" placeholder="输入消息..." @confirm="sendChatMessage" />
            <button class="send-btn" @tap="sendChatMessage">发送</button>
          </view>
        </view>
      </view>

      <!-- 日志面板（绝对定位） -->
      <view v-if="logExpanded" class="log-panel-overlay">
        <view class="log-panel">
          <view class="panel-header">
            <text class="panel-title">游戏日志</text>
            <text class="panel-close" @tap="logExpanded = false">✕</text>
          </view>
          <scroll-view class="log-content-area" scroll-y :scroll-into-view="logScrollIntoView" scroll-with-animation>
            <view v-if="gameLogs.length === 0" class="empty-hint">暂无日志</view>
            <view v-for="(log, idx) in gameLogs" :key="idx" :id="log.id" class="log-item"
              :class="'log-type-' + log.type">
              <text class="log-text">{{ log.text }}</text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <!-- 设置模态框 -->
    <view v-if="showSettings" class="settings-overlay" @click.self="closeSettings">
      <view class="settings-modal">
        <view class="settings-header">
          <text class="settings-title">设置</text>
          <view class="settings-close" @click="closeSettings">×</view>
        </view>

        <view class="settings-content">
          <view class="volume-panel">
            <text class="settings-section-title">音量设置</text>
            <view v-for="item in volumeItems" :key="item.key" class="volume-row">
              <view class="volume-info">
                <text class="volume-label">{{ item.label }}</text>
                <text class="volume-value">{{ audioSettings[item.key] }}%</text>
              </view>
              <slider class="volume-slider" :value="audioSettings[item.key]" min="0" max="100" block-size="20"
                activeColor="#d4a574" backgroundColor="#3a2616" @changing="updateVolume(item.key, $event)"
                @change="updateVolume(item.key, $event)" />
            </view>
          </view>

          <view class="credits-panel">
            <text class="settings-section-title">制作人员名单</text>
            <view class="credits-viewport">
              <view class="credits-scroll">
                <text class="credits-main-title">《LIAR'S BAR》制作人员名单</text>
                <text class="credits-studio">武妖灵工作室</text>

                <text class="credits-group">项目统筹</text>
                <text class="credits-line">项目经理：李汶洋</text>
                <text class="credits-duty">工作职责：项目管理、游戏策划、服务端开发、美术制作、台词配音</text>

                <text class="credits-group">视频与文档组</text>
                <text class="credits-line">剪辑、文档管理：游翔宇</text>
                <text class="credits-line">文档管理：陆鑫涛</text>

                <text class="credits-group">音频制作</text>
                <text class="credits-line">BGM 作曲、音效制作：朱昱丞</text>

                <text class="credits-group">程序开发</text>
                <text class="credits-line">服务端开发：李汶洋、吴子轩</text>
                <text class="credits-line">客户端开发：李昊燃</text>

                <text class="credits-group">全体测试人员</text>
                <text class="credits-line">李汶洋、游翔宇、陆鑫涛、朱昱丞、吴子轩、李昊燃</text>

                <text class="credits-group">版权信息</text>
                <text class="credits-line">©2026 武妖灵工作室 保留所有权利</text>

                <view class="credits-spacer"></view>
                <text class="credits-main-title">《LIAR'S BAR》制作人员名单</text>
                <text class="credits-studio">武妖灵工作室</text>
              </view>
            </view>
          </view>
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
            <view class="target-avatar">
              <image v-if="getCharacterHeadImage(player.character_id)" class="character-head"
                :src="getCharacterHeadImage(player.character_id)" mode="aspectFill" />
              <text v-else>{{ player.is_ai ? '🤖' : '👤' }}</text>
            </view>
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
import { ref, computed, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAuthStore } from '../../stores/auth'
import { useGameStore } from '../../stores/game'
import { roomAPI } from '../../utils/api'
import { getAudioSettings, playBgm, playSfx, setAudioSetting } from '../../utils/audio'
import wsClient from '../../utils/websocket'
import Toast from '../../components/Toast.vue'
import RulesModal from '../../components/RulesModal.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import InputDialog from '../../components/InputDialog.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()

const roomId = ref('')
const selectedCharacterId = ref('')
const pageOptions = ref(null)
const gameState = ref(null)
const roomState = ref(null)
const showRules = ref(false)
const showSettings = ref(false)
const toast = ref({ show: false, msg: '', type: 'error' })
const selectedCards = ref([])
const shakeScreen = ref(false)
const challengeFx = ref({ show: false, success: false })
const eliminateFx = ref({ show: false, nickname: '' })
const leaveReason = ref('')
const leaveDetail = ref('')
const connecting = ref(true)
const chatMessages = ref([])
const gameLogs = ref([])
const chatExpanded = ref(false)
const logExpanded = ref(false)
const chatText = ref('')
const chatScrollIntoView = ref('')
const logScrollIntoView = ref('')
const audioSettings = ref(getAudioSettings())
const volumeItems = [
  { key: 'master', label: '主音量' },
  { key: 'bgm', label: '背景音乐' },
  { key: 'sfx', label: '音效' }
]

// 追踪上一次的游戏阶段，用于检测无人质疑
const previousPhase = ref(null)
const lastChallengePhase = ref(false)
const previousRound = ref(null)
const lastPlayRecord = ref(null) // 记录上一次出牌，用于去重

// 日志类型枚举
const LogType = {
  ROUND_START: 'round_start',      // 轮次开始
  PLAY_CARD: 'play_card',          // 玩家出牌
  CHALLENGE: 'challenge',          // 质疑动作
  NO_CHALLENGE: 'no_challenge',    // 无人质疑
  PUNISHMENT: 'punishment',        // 惩罚结果
  ELIMINATION: 'elimination',      // 玩家淘汰
  SKILL: 'skill',                  // 技能使用
  GAME_END: 'game_end'            // 游戏结束
}

// 添加日志的方法
const addGameLog = (text, type = LogType.PLAY_CARD) => {
  gameLogs.value.push({
    text,
    type,
    timestamp: Date.now(),
    id: `log${Date.now()}${Math.floor(Math.random() * 10000)}`
  })
}

// Foxy技能相关
const skillUsed = ref(false)
const showSkillTargets = ref(false)
const skillPeekResult = ref(null)

// 质疑阶段操作状态追踪
const hasPassedChallenge = ref(false)
const hasChallenged = ref(false)

// 行动日志
const actionLogs = ref([])
const logScrollTop = ref(0)

// 聊天切换栏
const currentTab = ref('chat') // 默认显示聊天
const chatScrollTop = ref(0)
const chatInput = ref('') // 聊天输入框内容

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

// 角色映射
const characterNames = {
  'scubby': 'Scubby',
  'foxy': 'Foxy',
  'bristle': 'Bristle',
  'tor': 'Tor'
}

const characterHeadImages = {
  'scubby': '../../static/tavern_characters_v01/assets/art/characters/scubby/scubby_head.png',
  'foxy': '../../static/tavern_characters_v01/assets/art/characters/foxy/foxy_head.png',
  'bristle': '../../static/tavern_characters_v01/assets/art/characters/bristle/bristle_head.png',
  'tor': '../../static/tavern_characters_v01/assets/art/characters/tor/tor_head.png'
}

// 获取角色名称
const getCharacterName = (characterId) => {
  return characterNames[characterId] || ''
}

const getCharacterHeadImage = (characterId) => {
  return characterHeadImages[characterId] || ''
}

// 是否显示技能按钮（只要是Foxy就显示）
const showSkillButton = computed(() => {
  return myCharacter.value === 'foxy'
})

// 技能是否可用（需要满足所有条件）
const canUseSkill = computed(() => {
  // 只有Foxy有主动技能
  if (myCharacter.value !== 'foxy') return false
  // 必须有手牌
  if (myHandCards.value.length === 0) return false
  // 必须是游戏进行中（PLAYING阶段）
  if (gameState.value?.phase !== 'PLAYING') return false
  // 必须是自己的出牌回合
  if (!isMyTurn.value) return false
  // 还没使用过
  if (skillUsed.value) return false
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

const lastPlayPlayerSeatIndex = computed(() => {
  if (!gameState.value?.last_play) return 0
  const playerId = gameState.value.last_play.player_id
  const player = gameState.value.players?.find(p => p.id === playerId)
  return player?.seat_index ?? 0
})

// 判断最后出牌的是否是自己
const isLastPlayByMe = computed(() => {
  if (!gameState.value?.last_play) return false
  return gameState.value.last_play.player_id === myPlayerId.value
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
  selectedCharacterId.value = options?.character_id || ''

  console.log('房间ID:', roomId.value)
  console.log('选择角色ID:', selectedCharacterId.value)

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
    playBgm('playing')

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
      wsClient.send('PLAYER_JOIN', {
        room_id: roomId.value,
        ...(selectedCharacterId.value ? { character_id: selectedCharacterId.value } : {})
      })
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
  playBgm('playing')
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

// 监听聊天消息数组变化，自动滚动到底部
watch(() => chatMessages.value.length, (newLength) => {
  console.log('聊天消息数量变化:', newLength)
  if (newLength > 0) {
    nextTick(() => {
      const lastMsg = chatMessages.value[newLength - 1]
      console.log('最后一条消息:', lastMsg)
      if (lastMsg && lastMsg.id) {
        console.log('设置滚动目标:', lastMsg.id)
        // 使用 setTimeout 确保 DOM 已更新
        setTimeout(() => {
          chatScrollIntoView.value = lastMsg.id
        }, 50)
      }
    })
  }
})

// 监听游戏日志数组变化，自动滚动到底部
watch(() => gameLogs.value.length, (newLength) => {
  console.log('游戏日志数量变化:', newLength)
  if (newLength > 0) {
    nextTick(() => {
      const lastLog = gameLogs.value[newLength - 1]
      console.log('最后一条日志:', lastLog)
      if (lastLog && lastLog.id) {
        console.log('设置日志滚动目标:', lastLog.id)
        // 使用 setTimeout 确保 DOM 已更新
        setTimeout(() => {
          logScrollIntoView.value = lastLog.id
        }, 50)
      }
    })
  }
})

// 添加防抖标记，避免重复触发
let autoPassTimer = null
let lastAutoPassKey = ''

// 监听游戏状态变化，自动跳过手牌为0的回合
watch(
  () => ({
    currentPlayer: gameState.value?.current_player,
    mySeatIndex: myPlayer.value?.seat_index,
    actualHandCount: myHandCards.value.length,
    phase: gameState.value?.phase,
    legalActions: gameState.value?.legal_actions || [],
    currentTurn: gameState.value?.current_turn || 0
  }),
  (newVal, oldVal) => {
    console.log('🔍 watch触发 - 游戏状态变化:', {
      currentPlayer: newVal.currentPlayer,
      mySeatIndex: newVal.mySeatIndex,
      actualHandCount: newVal.actualHandCount,
      phase: newVal.phase,
      legalActions: newVal.legalActions,
      currentTurn: newVal.currentTurn
    })

    // 当轮到自己、手牌为0时，自动跳过（不管legal_actions是否包含PASS）
    const isMyTurn = newVal.currentPlayer === newVal.mySeatIndex
    const canPass = newVal.legalActions.includes('PASS')

    console.log('🔍 条件检查:', {
      isMyTurn,
      canPass,
      '实际手牌为0': newVal.actualHandCount === 0
    })

    // 自动跳过逻辑：
    // 1. PLAYING阶段：轮到自己且实际手牌为0时，自动跳过
    // 2. PLAYING阶段防御：轮到自己但legal_actions为空时，强制跳过（防止死锁）
    // 3. CHALLENGE阶段：手牌为0且legal_actions中没有CHALLENGE时，自动跳过（不能质疑）
    // 使用 myHandCards.length 而不是 hand_count，确保数据一致性
    const canChallenge = newVal.legalActions.includes('CHALLENGE')
    const shouldAutoPass =
      (newVal.phase === 'PLAYING' && isMyTurn && newVal.actualHandCount === 0) ||
      (newVal.phase === 'PLAYING' && isMyTurn && newVal.legalActions.length === 0) ||
      (newVal.phase === 'CHALLENGE' && newVal.actualHandCount === 0 && !canChallenge)

    if (shouldAutoPass) {
      // 生成唯一key，避免同一回合重复触发
      const autoPassKey = `${newVal.currentTurn}-${newVal.mySeatIndex}-${newVal.phase}-${newVal.currentPlayer}`

      if (lastAutoPassKey === autoPassKey) {
        console.log('⏭️ 已经处理过这个回合的自动跳过，忽略')
        return
      }

      lastAutoPassKey = autoPassKey

      console.log('✅ 检测到手牌为0，准备自动跳过')
      console.log('当前阶段:', newVal.phase, '座位:', newVal.mySeatIndex, '手牌数:', newVal.handCount)
      console.log('isMyTurn:', isMyTurn, 'canPass:', canPass)

      // 清除之前的定时器
      if (autoPassTimer) {
        clearTimeout(autoPassTimer)
      }

      autoPassTimer = setTimeout(() => {
        console.log('🚀 执行自动跳过 - 强制发送PASS')
        // 直接发送PASS，不依赖passTurn函数
        wsClient.send('PASS')

        // 记录日志
        const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
        addActionLog(`${myName} 手牌为空，自动跳过`, 'info')

        autoPassTimer = null
      }, 500)
    }
  },
  { deep: true, immediate: false }
)

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

  playSfx('selectCard')
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

  playSfx('playCard')
  const cardIds = selectedCards.value.map(idx => idx)
  wsClient.send('PLAY_CARD', {
    card_ids: cardIds,
    claim: gameState.value.target_card
  })

  // 记录自己的出牌行动到 actionLog
  const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
  addActionLog(`${myName} 出了 ${selectedCards.value.length} 张 ${gameState.value.target_card}`, 'play')

  // 立即记录到游戏日志
  if (myPlayer.value) {
    addGameLog(`P${myPlayer.value.seat_index + 1} ${authStore.user?.nickname || '我'} 出了 ${selectedCards.value.length} 张 ${gameState.value.target_card}`, LogType.PLAY_CARD)
  }

  resetSelection()
}

function challenge() {
  const targetId = gameState.value?.last_play?.player_id
  if (!targetId) return

  // 防止重复点击
  if (hasChallenged.value) {
    showToast('已发起质疑，等待结果', 'info')
    return
  }

  // 标记已质疑
  hasChallenged.value = true
  playSfx('challenge')

  wsClient.send('CHALLENGE', {
    target_player_id: targetId
  })

  // 记录质疑行动
  const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
  const targetName = getPlayerName(targetId)
  addActionLog(`${myName} 选择质疑 ${targetName}`, 'challenge')

  // 显示反馈提示
  showToast('已发起质疑，等待结果揭晓', 'success')
}

function passTurn() {
  // 防止重复点击
  if (hasPassedChallenge.value) {
    showToast('已选择放弃，等待其他玩家', 'info')
    return
  }

  // 标记已放弃
  hasPassedChallenge.value = true
  playSfx('pass')

  wsClient.send('PASS')

  // 记录放弃质疑
  const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${authStore.user?.nickname || '我'}` : '我'
  addActionLog(`${myName} 选择不质疑，轮到下家`, 'info')

  // 显示反馈提示
  showToast('已放弃质疑，等待其他玩家决策', 'success')

  resetSelection()
}

// Foxy技能相关函数
function showSkillTargetSelect() {
  if (skillUsed.value) {
    showToast('技能已使用', 'info')
    return
  }
  playSfx('uiClick')
  showSkillTargets.value = true
}

function useSkillOnTarget(targetPlayerId) {
  const target = gameState.value?.players?.find(p => p.id === targetPlayerId)
  if (!target || !target.is_alive) {
    showToast('无效的目标', 'error')
    return
  }

  // 发送技能使用请求
  playSfx('skill')
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
    playSfx('skill')
    const target = gameState.value?.players?.find(p => p.id === payload.target_player_id)
    const targetName = target?.nickname || '玩家'
    const duration = Math.floor((payload.duration_ms || 3000) / 1000)

    // 添加日志：技能使用（使用者信息从payload中获取）
    const user = gameState.value?.players?.find(p => p.id === payload.user_id || myPlayerId.value)
    if (user && target) {
      addGameLog(`🔍 P${user.seat_index + 1} ${user.nickname} 使用Foxy技能偷看了 P${target.seat_index + 1} ${target.nickname} 的手牌`, LogType.SKILL)
    }

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
  playSfx('ready')
  wsClient.send('PLAYER_READY')
}

// 聊天
function sendChat() {
  const message = chatText.value.trim()
  if (!message) return

  playSfx('chat')
  wsClient.send('CHAT', {
    content: message
  })

  chatMessages.value.push({
    sender: '我',
    text: message,
    id: `chat${Date.now()}${Math.floor(Math.random() * 10000)}`
  })
  chatText.value = ''
}

function addSystemMsg(content) {
  chatMessages.value.push({
    sender_id: 0,
    sender_name: '[系统]',
    content,
    is_ai: false,
    id: `chat${Date.now()}${Math.floor(Math.random() * 10000)}`
  })
}

function leaveRoom() {
  playSfx('uiClick')
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
      // 返回游戏大厅
      uni.redirectTo({
        url: '/pages/lobby/lobby'
      })
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
  console.log('当前回合:', payload.current_round)
  console.log('当前轮次:', payload.current_turn)
  console.log('阶段:', payload.phase)

  // 检测轮次变化：如果轮次增加，说明进入新轮次
  if (previousRound.value !== null && payload.current_round > previousRound.value) {
    addGameLog(`🎯 第 ${payload.current_round} 轮开始 - 目标牌：${payload.target_card}`, LogType.ROUND_START)
    // 重置Foxy技能使用状态（每个大轮次可以使用一次）
    skillUsed.value = false
    console.log('新轮次开始，重置Foxy技能使用状态')
  }
  previousRound.value = payload.current_round

  // 检测阶段变化
  const phaseChanged = previousPhase.value !== payload.phase

  // 阶段变化时重置质疑相关状态
  if (phaseChanged) {
    // 离开质疑阶段时，重置质疑操作标记
    if (previousPhase.value === 'CHALLENGE' && payload.phase !== 'CHALLENGE') {
      hasPassedChallenge.value = false
      hasChallenged.value = false
      console.log('离开质疑阶段，重置质疑操作标记')
    }
    // 进入质疑阶段时，也重置标记（防止状态残留）
    if (payload.phase === 'CHALLENGE') {
      hasPassedChallenge.value = false
      hasChallenged.value = false
      console.log('进入质疑阶段，重置质疑操作标记')
    }
  }

  // 1. 从 PLAYING → CHALLENGE: 说明有人出牌了
  if (previousPhase.value === 'PLAYING' && payload.phase === 'CHALLENGE' && payload.last_play) {
    const player = payload.players?.find(p => p.id === payload.last_play.player_id)
    // 只记录他人出牌（自己的出牌已在 playCards() 中记录）
    if (player && player.id !== myPlayerId.value) {
      const playerName = getPlayerName(payload.last_play.player_id)
      addActionLog(`${playerName} 出了 ${payload.last_play.count} 张 ${payload.last_play.claim}`, 'play')
      addGameLog(`P${player.seat_index + 1} ${player.nickname} 出了 ${payload.last_play.count} 张 ${payload.last_play.claim}`, LogType.PLAY_CARD)
    }
    lastChallengePhase.value = true
  }

  // 2. 从 CHALLENGE → PLAYING: 说明无人质疑
  if (previousPhase.value === 'CHALLENGE' && payload.phase === 'PLAYING' && lastChallengePhase.value) {
    addGameLog(`✓ 无人质疑，游戏继续`, LogType.NO_CHALLENGE)
    lastChallengePhase.value = false
  }

  // 记录当前阶段
  previousPhase.value = payload.phase

  // 更新游戏状态
  gameState.value = {
    phase: payload.phase,
    current_player: payload.current_player,
    current_turn: payload.current_turn || 0,
    current_round: payload.current_round || 1,
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
      addActionLog(`轮到 ${playerName} 行动 (回合${payload.current_turn})`, 'info')
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
  playSfx('gameStart')
  // 游戏开始时设置初始游戏状态
  if (payload.phase) {
    gameState.value = {
      phase: payload.phase,
      current_player: payload.current_player,
      current_turn: payload.current_turn || 0,
      current_round: payload.current_round || 1,
      target_card: payload.target_card,
      alive_count: payload.players?.filter(p => p.is_alive).length || 0,
      players: payload.players || [],
      last_play: null
    }
  }
  // addSystemMsg('游戏开始！')
  showToast('游戏开始！', 'success')
  addActionLog(`🎮 游戏开始！第 ${payload.current_round || 1} 轮，目标牌：${payload.target_card}`, 'system')

  // 添加日志：轮次开始
  addGameLog(`🎯 第 ${payload.current_round || 1} 轮开始 - 目标牌：${payload.target_card}`, LogType.ROUND_START)
}

function onChallengeResult(payload) {
  console.log('========== CHALLENGE_RESULT 事件触发 ==========')
  console.log('CHALLENGE_RESULT:', payload)
  console.log('完整payload:', JSON.stringify(payload, null, 2))
  console.log('==============================================')

  // 标记已经发生质疑，不再触发"无人质疑"日志
  lastChallengePhase.value = false

  const success = payload.success
  const challengerId = payload.challenger_id
  const targetId = payload.liar_id || payload.loser_id // 修复：使用liar_id或loser_id作为被质疑者ID
  const loserId = payload.loser_id

  const challengerName = getPlayerName(challengerId)
  const targetName = getPlayerName(targetId)

  playSfx(success ? 'challengeSuccess' : 'challengeFail')
  triggerChallengeFx(success)

  // 震动反馈
  // #ifdef APP-PLUS
  uni.vibrateShort()
  // #endif

  if (success) {
    // addSystemMsg(`质疑成功！玩家说谎，实际牌为：${payload.actual_cards?.join(', ')}`)
    addActionLog(`${challengerName} 质疑 ${targetName}：质疑成功！对方在说谎`, 'challenge')
    addActionLog(`实际牌为：${payload.challenged_cards?.join(', ')}`, 'challenge')

    // 添加日志：质疑成功
    const challenger = gameState.value?.players?.find(p => p.id === challengerId)
    const target = gameState.value?.players?.find(p => p.id === targetId)
    console.log('质疑成功 - challenger:', challenger, 'target:', target)
    if (challenger && target) {
      addGameLog(`⚠️ P${challenger.seat_index + 1} ${challenger.nickname} 质疑成功！P${target.seat_index + 1} ${target.nickname} 在说谎`, LogType.CHALLENGE)
    } else {
      console.error('找不到玩家信息！challengerId:', challengerId, 'targetId:', targetId)
    }
  } else {
    // addSystemMsg(`质疑失败！对方说的是真话`)
    addActionLog(`${challengerName} 质疑 ${targetName}：质疑失败！对方说真话`, 'challenge')

    // 添加日志：质疑失败
    const challenger = gameState.value?.players?.find(p => p.id === challengerId)
    const target = gameState.value?.players?.find(p => p.id === targetId)
    console.log('质疑失败 - challenger:', challenger, 'target:', target)
    if (challenger && target) {
      addGameLog(`⚠️ P${challenger.seat_index + 1} ${challenger.nickname} 质疑失败！P${target.seat_index + 1} ${target.nickname} 说的是真话`, LogType.CHALLENGE)
    } else {
      console.error('找不到玩家信息！challengerId:', challengerId, 'targetId:', targetId)
    }
  }

  // 质疑结果出来后，重置质疑操作标记
  hasPassedChallenge.value = false
  hasChallenged.value = false
  console.log('质疑结果已处理，重置质疑操作标记')
}

function onRoulette(payload) {
  console.log('RUSSIAN_ROULETTE:', payload)
  console.log('RUSSIAN_ROULETTE完整payload:', JSON.stringify(payload, null, 2))
  const playerId = payload.player_id
  const survived = payload.survived
  const bulletCount = payload.bullet_count

  const playerName = getPlayerName(playerId)
  const player = gameState.value?.players?.find(p => p.id === playerId)

  if (survived) {
    playSfx('rouletteSurvive')
    // addSystemMsg(`玩家${playerId}扣动扳机${bulletCount}次，幸存！`)
    addActionLog(`🎲 ${playerName} 进入惩罚阶段，扣动扳机 ${bulletCount} 次 → 幸存`, 'punishment')

    // 添加日志：惩罚-存活
    if (player) {
      addGameLog(`🎲 P${player.seat_index + 1} ${player.nickname} 扣动扳机 ${bulletCount} 次 → 幸存`, LogType.PUNISHMENT)
    }
  } else {
    playSfx('rouletteHit')
    // addSystemMsg(`玩家${playerId}扣动扳机${bulletCount}次，被击中！`)
    addActionLog(`💥 ${playerName} 进入惩罚阶段，扣动扳机 ${bulletCount} 次 → 被击中！`, 'punishment')

    // 添加日志：惩罚-死亡
    if (player) {
      addGameLog(`💥 P${player.seat_index + 1} ${player.nickname} 扣动扳机 ${bulletCount} 次 → 被击中`, LogType.ELIMINATION)
    }
  }
}

function onPlayerEliminated(payload) {
  console.log('PLAYER_ELIMINATED:', payload)
  const playerId = payload.player_id

  playSfx('eliminated')
  triggerEliminateFx(playerId)

  // #ifdef APP-PLUS
  uni.vibrateLong()
  // #endif

  const playerName = getPlayerName(playerId)
  // addSystemMsg(`${playerName} 被淘汰`)
  addActionLog(`💀 ${playerName} 被淘汰出局`, 'eliminate')

  // 添加日志：玩家淘汰
  const player = gameState.value?.players?.find(p => p.id === playerId)
  if (player) {
    addGameLog(`💀 P${player.seat_index + 1} ${player.nickname} 被淘汰出局`, LogType.ELIMINATION)
  }

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
  playSfx('gameOver')
  gameState.value = {
    ...(gameState.value || {}),
    phase: 'GAME_OVER',
    winner_id: payload.winner_id
  }

  const winnerName = getPlayerName(payload.winner_id)
  // addSystemMsg(`游戏结束！${winnerName} 获胜`)
  addActionLog(`🏆 游戏结束！${winnerName} 获得胜利`, 'system')

  // 添加日志：游戏结束
  const winner = gameState.value?.players?.find(p => p.id === payload.winner_id)
  if (winner) {
    addGameLog(`🏆 游戏结束！P${winner.seat_index + 1} ${winner.nickname} 获得胜利`, LogType.GAME_END)
  }
}

function onPlayerLeft(payload) {
  console.log('PLAYER_LEFT:', payload)
  playSfx('playerLeave')
  const leftPlayerId = String(payload.player_id || '')
  const leftPlayer = gameState.value?.players?.find(p =>
    String(p.id) === leftPlayerId || String(p.user_id) === leftPlayerId
  )
  const payloadMarksDead =
    payload.is_alive === false ||
    payload.alive === false ||
    payload.dead === true ||
    payload.eliminated === true ||
    payload.status === 'dead' ||
    payload.status === 'eliminated'
  const leftPlayerWasDead = payloadMarksDead || (leftPlayer && leftPlayer.is_alive === false)

  if (payload.game_over && !leftPlayerWasDead) {
    // 游戏中途有人离开，游戏结束
    leaveReason.value = payload.reason || '玩家退出，游戏结束'
    const name = payload.nickname || `玩家${payload.player_id}`
    leaveDetail.value = `${name} 退出了对局，本局已结束`
    gameState.value = {
      ...(gameState.value || {}),
      phase: 'GAME_OVER',
      winner_id: payload.winner_id
    }
    // addSystemMsg(leaveDetail.value)
    addActionLog(`🚪 ${name} 退出游戏，本局结束`, 'system')
  } else {
    const name = payload.nickname || `玩家${payload.player_id}`
    // addSystemMsg(`${name} 离开了房间`)
    addActionLog(leftPlayerWasDead ? `🚪 ${name} 淘汰后离开观战，本局继续` : `🚪 ${name} 离开了房间`, 'system')
  }
}

function onPlayerJoined(payload) {
  console.log('PLAYER_JOINED:', payload)
  playSfx('playerJoin')
  const name = payload.nickname || `玩家${payload.player_id}`
  // addSystemMsg(`${name} 加入了房间`)
  addActionLog(`👋 ${name} 加入了房间`, 'system')
}

function onChat(payload) {
  console.log('CHAT:', payload)
  playSfx('chat')
  chatMessages.value.push({
    sender: payload.sender_name || `玩家${payload.sender_id}`,
    content: payload.content,
    isAi: payload.is_ai || false,
    id: `chat${Date.now()}${Math.floor(Math.random() * 10000)}`
  })
}

// 切换聊天面板
function toggleChatPanel() {
  playSfx('uiClick')
  console.log('点击聊天按钮，当前聊天消息:', chatMessages.value)
  console.log('聊天消息数量:', chatMessages.value.length)

  // 如果日志面板打开，先关闭
  if (logExpanded.value) {
    logExpanded.value = false
  }

  // 切换聊天面板
  chatExpanded.value = !chatExpanded.value
  console.log('聊天面板状态:', chatExpanded.value ? '打开' : '关闭')
}

// 切换日志面板
function toggleLogPanel() {
  playSfx('uiClick')
  console.log('点击日志按钮，当前日志:', gameLogs.value)
  console.log('日志数量:', gameLogs.value.length)

  // 如果聊天面板打开，先关闭
  if (chatExpanded.value) {
    chatExpanded.value = false
  }

  // 切换日志面板
  logExpanded.value = !logExpanded.value
  console.log('日志面板状态:', logExpanded.value ? '打开' : '关闭')
}

function goSettings() {
  playSfx('uiClick')
  audioSettings.value = getAudioSettings()
  showSettings.value = true
}

function closeSettings() {
  playSfx('uiClick')
  showSettings.value = false
}

function updateVolume(key, event) {
  const value = event.detail?.value ?? event.target?.value ?? 0
  audioSettings.value = setAudioSetting(key, value)
}

// 发送聊天消息（气泡面板使用）
function sendChatMessage() {
  sendChat()
}
</script>

<style scoped>
/* 页面容器 */
.game-room {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0604;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
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

/* 切换栏 */
.panel-tabs {
  display: flex;
  height: 20px;
  background: linear-gradient(135deg, #2a1812 0%, #1a0f0a 100%);
  border-bottom: 1px solid #5a3a1e;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  background: rgba(212, 165, 116, 0.1);
  border-bottom-color: #d4a574;
}

.tab-text {
  font-size: 11px;
  color: #a08060;
  font-weight: 600;
}

.tab-item.active .tab-text {
  color: #d4a574;
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

/* 聊天标签页布局 */
.chat-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-messages {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

/* 聊天消息样式 */
.chat-item {
  padding: 8px 10px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: rgba(42, 24, 18, 0.4);
  font-size: 13px;
  line-height: 1.5;
  animation: log-appear 0.3s ease-out;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-sender {
  color: #d4a574;
  font-size: 12px;
  font-weight: 600;
}

.chat-text {
  color: #c0b0a0;
  font-size: 13px;
}

/* 聊天输入框 */
.chat-input-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(135deg, #2a1812 0%, #1a0f0a 100%);
  border-top: 1px solid #5a3a1e;
}

.chat-input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  background: rgba(26, 15, 10, 0.6);
  border: 1px solid #5a3a1e;
  border-radius: 6px;
  color: #c0b0a0;
  font-size: 13px;
}

.chat-input::placeholder {
  color: #6b5a4a;
}

.chat-send-btn {
  height: 32px;
  padding: 0 16px;
  background: linear-gradient(135deg, #d4a574 0%, #c09060 100%);
  border: none;
  border-radius: 6px;
  color: #1a0f0a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-send-btn:active {
  transform: translateY(1px);
  opacity: 0.9;
}

.chat-send-btn text {
  color: #1a0f0a;
  font-size: 13px;
  font-weight: 600;
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
  margin-top: -60rpx;
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
  width: 150rpx;
  height: 150rpx;
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
  padding: 5rpx 0 5rpx 20rpx;
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8rpx;
  /* padding: 6rpx 12rpx; */
  background: rgba(30, 10, 10, 0.9);
  border-bottom: 2rpx solid #5c2e2e;
  /* height: 40px; */
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.5);
}

.back-btn {
  padding: 10rpx 25rpx;
  color: #d4a574;
  font-size: 15px;
  font-weight: 600;
  line-height: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:active {
  opacity: 0.7;
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
  padding: 10rpx 10rpx;
  background: rgba(60, 30, 30, 0.8);
  border: 1rpx solid #5c2e2e;
  border-radius: 4rpx;
  color: #d4a574;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  /* height: 22px; */
  line-height: 12px;
}

.alive-count {
  padding: 10rpx 10rpx;
  background: rgba(60, 30, 30, 0.8);
  border: 1rpx solid #5c2e2e;
  border-radius: 4rpx;
  color: #4ade80;
  font-size: 11px;
  font-weight: 600;
  /* height: 22px; */
  line-height: 12px;
}

.top-icon-btn {
  padding: 10rpx 10rpx;
  background: rgba(60, 30, 30, 0.8);
  border: 1rpx solid #5c2e2e;
  border-radius: 4rpx;
  color: #d4a574;
  font-size: 11px;
  /* height: 22px; */
  line-height: 12px;
  transition: all 0.2s;
}

.rules-btn {
  margin-right: 40rpx;
}

.top-icon-btn:active {
  background: rgba(80, 40, 40, 0.9);
  transform: scale(0.95);
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-modal {
  width: 760px;
  max-width: 88vw;
  max-height: 86vh;
  background: linear-gradient(160deg, #1f1610 0%, #2a1c12 100%);
  border: 3px solid #5a3a1e;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.88), inset 0 1px 0 rgba(212, 165, 116, 0.12);
  overflow: hidden;
}

.settings-header {
  height: 54px;
  padding: 0 18px 0 22px;
  border-bottom: 2px solid #3a2616;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-title {
  color: #d4a574;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.settings-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a6a4a;
  font-size: 32px;
  line-height: 1;
}

.settings-close:active {
  color: #d4a574;
  transform: scale(0.95);
}

.settings-content {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: row;
  gap: 24px;
}

.volume-panel,
.credits-panel {
  min-width: 0;
}

.volume-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.credits-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-section-title {
  color: #d4a574;
  font-size: 17px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.55);
}

.volume-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.volume-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.volume-label {
  color: #c9a875;
  font-size: 16px;
  font-weight: 600;
}

.volume-value {
  color: #d94f3d;
  font-size: 15px;
  font-weight: 700;
}

.volume-slider {
  margin: 0;
}

.credits-viewport {
  position: relative;
  height: 285px;
  overflow: hidden;
  background: rgba(10, 6, 4, 0.5);
  border: 1px solid rgba(90, 58, 30, 0.8);
  border-radius: 8px;
  box-shadow: inset 0 8px 18px rgba(0, 0, 0, 0.45);
}

.credits-viewport::before,
.credits-viewport::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 54px;
  z-index: 2;
  pointer-events: none;
}

.credits-viewport::before {
  top: 0;
  background: linear-gradient(180deg, rgba(10, 6, 4, 0.98) 0%, rgba(10, 6, 4, 0) 100%);
}

.credits-viewport::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(10, 6, 4, 0.98) 0%, rgba(10, 6, 4, 0) 100%);
}

.credits-scroll {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: credits-roll 28s linear infinite;
}

.credits-main-title {
  color: #f1d5a8;
  font-size: 17px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 4px;
}

.credits-studio {
  color: #d4a574;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 10px;
}

.credits-group {
  color: #d94f3d;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  margin-top: 10px;
}

.credits-line,
.credits-duty {
  color: #d8c0a0;
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
}

.credits-duty {
  max-width: 330px;
  color: #b89470;
}

.credits-spacer {
  height: 72px;
  flex-shrink: 0;
}

@keyframes credits-roll {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-660px);
  }
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
  padding: 10rpx 28rpx;
  background: linear-gradient(145deg, #8a4a4a 0%, #5c2e2e 100%);
  border: 1rpx solid #5a3a1e;
  border-radius: 6rpx;
  color: #d4a574;
  font-size: 13px;
  font-weight: 600;
}

/* 游戏区域 */
.game-area {
  position: relative;
  z-index: 10;
  height: calc(100vh - 40rpx);
  display: flex;
  flex-direction: column;
  padding: 8rpx;
  gap: 8rpx;
}

/* 对手区域 - 每个卡片高度约25px */
/* 左侧对手 */
.left-opponent {
  position: absolute;
  left: 20rpx;
  top: 50%;
  transform: translateY(-100%);
  z-index: 10;
}

/* 右侧对手 */
.right-opponent {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-100%);
  z-index: 10;
}

.player-card-vertical {
  width: 100rpx;
}

.opponents-row {
  display: flex;
  gap: 6rpx;
  justify-content: center;
  flex-shrink: 0;
}

.player-card {
  position: relative;
  width: 120rpx;
  padding: 6rpx;
  background: rgba(30, 10, 10, 0.85);
  border: 1rpx solid #5c2e2e;
  border-radius: 6rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
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
  top: 4rpx;
  left: 4rpx;
  width: 24rpx;
  height: 24rpx;
  background: linear-gradient(135deg, #5a3a1e 0%, #3a2616 100%);
  border: 2rpx solid #d4a574;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4a574;
  font-size: 11px;
  font-weight: 700;
  z-index: 10;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.6);
}

.player-number.my-number {
  top: 2rpx;
  left: 1rpx;
  border-color: #f59e0b;
  color: #f59e0b;
  box-shadow: 0 2rpx 8rpx rgba(245, 158, 11, 0.6);
}

.player-avatar {
  width: 24rpx;
  height: 24rpx;
  margin: 0 auto 4rpx;
  background: rgba(60, 30, 30, 0.6);
  border: 1rpx solid #5a3a1e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  overflow: hidden;
}

.character-head {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}

.player-name-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
  justify-content: center;
  margin-bottom: 4rpx;
}

.player-name {
  color: #d4a574;
  font-size: 11px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 11px;
}

.character-badge {
  padding: 2rpx 6px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: 8px;
  color: #1a0f0a;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.4);
}

.player-hp {
  display: flex;
  gap: 3rpx;
  justify-content: center;
  margin-bottom: 4rpx;
}

.hp-dot {
  width: 6rpx;
  height: 6rpx;
  background: #333;
  border: 1rpx solid #555;
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
  margin-top: 2rpx;
  font-weight: 600;
  line-height: 10px;
}

.ai-tag,
.dead-tag {
  position: absolute;
  top: 2rpx;
  right: 2rpx;
  padding: 1rpx 4rpx;
  background: rgba(60, 30, 30, 0.9);
  border: 1rpx solid #5c2e2e;
  border-radius: 3rpx;
  color: #d4a574;
  font-size: 9px;
  font-weight: 600;
  line-height: 9px;
}

.dead-tag {
  font-size: 12px;
  padding: 1rpx 3rpx;
}

/* 中心区域 */
.center-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* min-height: 80px; */
  gap: 10rpx;
  transform: translateY(-10px);
}

.current-turn-banner {
  position: absolute;
  top: 10rpx;
  right: 20rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(30, 10, 10, 0.95);
  border: 2rpx solid #5c2e2e;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.6);
  z-index: 50;
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
  padding: 3px 10px;
  background: rgba(30, 10, 10, 0.85);
  border: 2rpx solid #5c2e2e;
  border-radius: 6rpx;
  box-shadow: 0 3rpx 8rpx rgba(0, 0, 0, 0.5);
}

.last-play-info {
  display: block;
  color: #a08060;
  font-size: 11px;
  margin-bottom: 6rpx;
  line-height: 11px;
}

.last-play-cards {
  display: flex;
  gap: 6rpx;
  justify-content: center;
  margin-bottom: 6rpx;
}

.play-card {
  width: 24rpx;
  height: 32rpx;
  background: linear-gradient(160deg, #f5e6d3 0%, #d6c0a9 100%);
  border: 2rpx solid #8a6a4a;
  border-radius: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3rpx 6rpx rgba(0, 0, 0, 0.4);
}

.card-text {
  font-size: 14px;
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
  flex: 0.7;
  width: 60%;
  margin: 0 auto 20px;
}

/* 自己的手牌区域 - 高度控制在100px内 */

.my-info-row {
  display: flex;
}

.my-area {
  margin-top: 2rpx;
  flex: 7;
  background: rgba(30, 10, 10, 0.9);
  border: 2rpx solid #5c2e2e;
  border-radius: 6rpx;
  padding: 8rpx 8rpx 8rpx 8rpx;
  box-shadow: 0 -3rpx 10rpx rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.my-info {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  /* height: 28px; */
}

.my-avatar {
  margin-left: 28rpx;
  width: 28rpx;
  height: 28rpx;
  background: rgba(60, 30, 30, 0.6);
  border: 1rpx solid #5a3a1e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
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
  width: 80rpx;
  height: 28rpx;
  padding: 0;
  font-size: 13rpx;
  font-weight: 700;
  border-radius: 4rpx;
  border: none;
  cursor: pointer;
  line-height: 32rpx;
  text-align: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.top-btn.play-btn {
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 100%);
  color: #000;
  box-shadow: 0 3rpx 8rpx rgba(74, 222, 128, 0.4);
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
  box-shadow: 0 3rpx 8rpx rgba(233, 69, 96, 0.4);
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
  gap: 8rpx;
}

.skill-btn-sidebar {
  width: 80rpx;
  height: 40rpx;
  padding: 4rpx 8rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  background: linear-gradient(180deg, #7a3e3e 0%, #5c2e2e 100%);
  border: 2rpx solid #8a4e4e;
  border-radius: 6rpx;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 3rpx 6rpx rgba(0, 0, 0, 0.4);
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
  gap: 6rpx;
  overflow-x: auto;
  padding-bottom: 2rpx;
  flex: 1;
  justify-content: center;
}

/* 手牌 */
.hand-cards {
  display: flex;
  gap: 6rpx;
  margin-bottom: 2rpx;
  overflow-x: auto;
  padding-bottom: 2rpx;
}

.hand-card {
  width: 30rpx;
  height: 40rpx;
  background: linear-gradient(160deg, #f5e6d3 0%, #d6c0a9 100%);
  border: 2rpx solid #8a6a4a;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 3rpx 6rpx rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.hand-card.selected {
  transform: translateY(-8rpx);
  border-color: #4ade80;
  box-shadow: 0 5rpx 12rpx rgba(74, 222, 128, 0.5);
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
  /* height: 66px; */
}

/* 操作按钮 - 高度24px */
.action-buttons {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}

.action-btn {
  flex: 1;
  padding: 6rpx 10rpx;
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
  box-shadow: 0 3rpx 8rpx rgba(74, 222, 128, 0.4);
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
  box-shadow: 0 3rpx 8rpx rgba(233, 69, 96, 0.4);
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
  padding: 4px;
  min-width: 500px;
  max-width: 80vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.wait-title {
  display: block;
  color: #d4a574;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
}

.wait-count {
  display: block;
  color: #a08060;
  font-size: 14px;
  margin-bottom: 10px;
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
  width: 48px;
  height: 48px;
  font-size: 32px;
  margin-bottom: 8px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
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
  width: 50%;
  background: linear-gradient(145deg, #4ade80 0%, #22c55e 100%);
  color: #000;
  padding: 2px 6px;
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
  height: 40px;
  text-align: center;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* 气泡图标容器 */
.bubble-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: row;
  gap: 12px;
  z-index: 100;
}

/* 气泡图标 */
.bubble-icon {
  position: relative;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #5a3a1e 0%, #3a2616 100%);
  border: 2px solid #d4a574;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  transition: all 0.2s;
}

.bubble-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(212, 165, 116, 0.4);
}

.bubble-emoji {
  font-size: 24px;
}

.bubble-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #1a0f0a;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

/* 聊天面板覆盖层（绝对定位） */
.chat-panel-overlay {
  position: fixed;
  bottom: 10px;
  right: 20px;
  z-index: 300;
}

.chat-panel {
  width: 320px;
  height: 300px;
  background: rgba(26, 15, 10, 0.98);
  border: 2px solid #5a3a1e;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 日志面板覆盖层（绝对定位） */
.log-panel-overlay {
  position: fixed;
  bottom: 10px;
  right: 20px;
  z-index: 300;
}

.log-panel {
  width: 320px;
  max-height: calc(100vh - 140px);
  background: rgba(26, 15, 10, 0.98);
  border: 2px solid #5a3a1e;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 面板头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #3a2616 0%, #2a1812 100%);
  border-bottom: 1px solid #5a3a1e;
  flex-shrink: 0;
}

.panel-title {
  color: #d4a574;
  font-size: 15px;
  font-weight: 700;
}

.panel-close {
  color: #a08060;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0 4px;
}

.panel-close:hover {
  color: #d4a574;
}

/* 聊天消息区域 */
.chat-messages-area {
  height: 180px;
  padding: 12px;
}

.chat-messages-area::-webkit-scrollbar,
.log-content-area::-webkit-scrollbar {
  width: 6px;
}

.chat-messages-area::-webkit-scrollbar-track,
.log-content-area::-webkit-scrollbar-track {
  background: rgba(42, 24, 18, 0.5);
  border-radius: 3px;
}

.chat-messages-area::-webkit-scrollbar-thumb,
.log-content-area::-webkit-scrollbar-thumb {
  background: rgba(90, 58, 30, 0.8);
  border-radius: 3px;
}

/* 聊天输入区域 */
.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(42, 24, 18, 0.6);
  border-top: 1px solid #5a3a1e;
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  background: rgba(26, 15, 10, 0.8);
  border: 1px solid #5a3a1e;
  border-radius: 6px;
  color: #c0b0a0;
  font-size: 13px;
}

.chat-input::placeholder {
  color: #5a3a1e;
}

.send-btn {
  height: 36px;
  padding: 0 16px;
  background: linear-gradient(135deg, #7a3e3e 0%, #5c2e2e 100%);
  border: 1px solid #8a4e4e;
  border-radius: 6px;
  color: #d4a574;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover {
  background: linear-gradient(135deg, #8a4e4e 0%, #6c3e3e 100%);
  box-shadow: 0 2px 8px rgba(122, 62, 62, 0.4);
}

.send-btn:active {
  transform: translateY(1px);
}

/* 日志内容区域 */
.log-content-area {
  height: 200px;
  padding: 12px;
}

.empty-hint {
  color: #5a3a1e;
  font-size: 13px;
  text-align: center;
  margin-top: 40px;
}

/* 消息项 */
.message-item {
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(42, 24, 18, 0.6);
  border-radius: 6px;
  border-left: 3px solid #5a3a1e;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
}

.msg-sender {
  color: #d4a574;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.msg-text {
  color: #c0b0a0;
  font-size: 13px;
  line-height: 1.4;
  flex: 1;
  word-break: break-word;
}

/* 日志项 */
.log-item {
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 3px solid #7a3e3e;
}

/* 不同类型日志的样式 */
.log-type-round_start {
  background: rgba(90, 58, 30, 0.5);
  border-left-color: #d4a574;
}

.log-type-play_card {
  background: rgba(42, 24, 18, 0.4);
  border-left-color: #7a3e3e;
}

.log-type-challenge {
  background: rgba(122, 62, 62, 0.4);
  border-left-color: #f59e0b;
}

.log-type-no_challenge {
  background: rgba(58, 38, 22, 0.4);
  border-left-color: #5a3a1e;
}

.log-type-punishment {
  background: rgba(92, 46, 46, 0.5);
  border-left-color: #dc2626;
}

.log-type-elimination {
  background: rgba(40, 20, 20, 0.6);
  border-left-color: #991b1b;
}

.log-type-skill {
  background: rgba(88, 28, 135, 0.3);
  border-left-color: #a855f7;
}

.log-type-game_end {
  background: rgba(90, 58, 30, 0.6);
  border-left-color: #fbbf24;
}

.log-text {
  display: block;
  color: #a08060;
  font-size: 12px;
  line-height: 1.4;
}
</style>
