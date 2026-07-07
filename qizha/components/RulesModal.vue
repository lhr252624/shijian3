<template>
  <Modal :visible="visible" title="📖 骗子酒馆 规则" :show-footer="false" :show-close="true" width="90%"
    @update:visible="$emit('update:visible', $event)">
    <view class="rules-body">
      <view class="rules-section">
        <text class="rules-title">目标</text>
        <text class="rules-text">4 人对战，通过出牌、撒谎、质疑和心理博弈，成为最后存活的玩家。</text>
      </view>

      <view class="rules-section">
        <text class="rules-title">牌组</text>
        <text class="rules-text">A / K / Q / J 各 6 张，共 24 张。每人发 6 张。</text>
      </view>

      <view class="rules-section">
        <text class="rules-title">目标牌</text>
        <text class="rules-text">每一轮有指定目标牌（A→K→Q→J 循环）。出牌时必须声明打出的全部是当前目标牌。</text>
      </view>

      <view class="rules-section">
        <text class="rules-title">出牌</text>
        <text class="rules-text">当前回合玩家选 1~3 张手牌打出。可以真出（全是目标牌），也可以虚张声势（含非目标牌）。其他玩家只能看到声明，看不到真实牌面。</text>
      </view>

      <view class="rules-section">
        <text class="rules-title">质疑</text>
        <text class="rules-text">下一名玩家可选择质疑上家。系统翻开上家刚打出的牌：</text>
        <view class="rules-list">
          <text class="rules-item">• 含非目标牌（撒谎）→ 质疑成功，撒谎者受罚</text>
          <text class="rules-item">• 全是目标牌（说真话）→ 质疑失败，质疑者受罚</text>
        </view>
      </view>

      <view class="rules-section">
        <text class="rules-title">俄罗斯轮盘惩罚</text>
        <text class="rules-text">每次受罚累计子弹数：第 1 次 1 发，第 2 次 2 发……第 6 次必死。被击中即淘汰出局，存活则继续。</text>
      </view>

      <view class="rules-section">
        <text class="rules-title">手牌耗尽</text>
        <text class="rules-text">所有存活玩家手牌为空时，重新洗牌发牌，目标牌切换到下一种。</text>
      </view>

      <view class="rules-section">
        <text class="rules-title">操作</text>
        <view class="rules-list">
          <text class="rules-item"><text class="highlight">出牌</text>：选 1~3 张牌，点击「出牌」</text>
          <text class="rules-item"><text class="highlight">质疑上家</text>：仅当上家有出牌时可点</text>
          <text class="rules-item"><text class="highlight">过</text>：不质疑，交由下家</text>
        </view>
      </view>
    </view>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:visible'])
</script>

<style scoped>
.rules-body {
  color: #d0c8c0;
  font-size: 20px;
  line-height: 1.6;
}

.rules-section {
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 1px solid #3a2616;
}

.rules-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.rules-title {
  display: block;
  color: #f5a623;
  font-size: 14rpx;
  font-weight: 700;
  margin-bottom: 5px;
}

.rules-text {
  display: block;
  /* line-height: 1.8; */
  font-size: 12rpx;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 4px;
}

.rules-item {
  display: block;
  padding-left: 8rpx;
  font-size: 12rpx;
}

.highlight {
  color: #e94560;
  font-weight: 700;
}
</style>
