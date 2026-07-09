const AUDIO_SETTINGS_KEY = 'qizha_audio_settings'

const DEFAULT_SETTINGS = {
  master: 80,
  bgm: 70,
  sfx: 85
}

const BGM_TRACKS = {
  login: '/static/sounds/bgm/login_music.mp3',
  lobby: '/static/sounds/bgm/lobby_music.mp3',
  playing: '/static/sounds/bgm/playing_music.mp3'
}

const SFX_TRACKS = {
  uiClick: '/static/sounds/sound_effect/UI/button.mp3',
  selectCard: '/static/sounds/sound_effect/game/block.mp3',
  playCard: '/static/sounds/sound_effect/game/block.mp3',
  challenge: '/static/sounds/sound_effect/game/suspect.mp3',
  pass: '/static/sounds/sound_effect/UI/button.mp3',
  ready: '/static/sounds/sound_effect/UI/button.mp3',
  skill: '/static/sounds/sound_effect/game/skill.mp3',
  matchSuccess: '/static/sounds/sound_effect/room/match_success.mp3',
  gameStart: '/static/sounds/sound_effect/room/entry_game_2.mp3',
  challengeSuccess: '/static/sounds/sound_effect/game/suspect.mp3',
  challengeFail: '/static/sounds/sound_effect/game/suspect.mp3',
  rouletteSurvive: '/static/sounds/sound_effect/game/fire.mp3',
  rouletteHit: '/static/sounds/sound_effect/game/fire.mp3',
  eliminated: '/static/sounds/sound_effect/game/death.mp3',
  gameOver: '/static/sounds/sound_effect/game/win.mp3',
  playerJoin: '/static/sounds/sound_effect/room/entry_game_2.mp3',
  playerLeave: '/static/sounds/sound_effect/room/exit.mp3',
  chat: '/static/sounds/sound_effect/UI/button.mp3'
}

let currentBgm = null
let currentBgmName = ''

function clampVolume(value) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return 0
  return Math.max(0, Math.min(100, numeric))
}

function readSettings() {
  try {
    const stored = uni.getStorageSync(AUDIO_SETTINGS_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
    return {
      master: clampVolume(parsed.master ?? DEFAULT_SETTINGS.master),
      bgm: clampVolume(parsed.bgm ?? DEFAULT_SETTINGS.bgm),
      sfx: clampVolume(parsed.sfx ?? DEFAULT_SETTINGS.sfx)
    }
  } catch (error) {
    console.warn('读取音频设置失败，使用默认值:', error)
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings) {
  uni.setStorageSync(AUDIO_SETTINGS_KEY, settings)
}

function calculateVolume(kind) {
  const settings = readSettings()
  const channel = kind === 'bgm' ? settings.bgm : settings.sfx
  return (settings.master / 100) * (channel / 100)
}

function applyBgmVolume() {
  if (currentBgm) {
    currentBgm.volume = calculateVolume('bgm')
  }
}

export function getAudioSettings() {
  return readSettings()
}

export function setAudioSetting(key, value) {
  const settings = readSettings()
  if (!Object.prototype.hasOwnProperty.call(settings, key)) return settings

  const nextSettings = {
    ...settings,
    [key]: clampVolume(value)
  }
  saveSettings(nextSettings)
  applyBgmVolume()
  return nextSettings
}

export function setAudioSettings(partialSettings) {
  const settings = readSettings()
  const nextSettings = {
    ...settings,
    ...partialSettings
  }

  nextSettings.master = clampVolume(nextSettings.master)
  nextSettings.bgm = clampVolume(nextSettings.bgm)
  nextSettings.sfx = clampVolume(nextSettings.sfx)

  saveSettings(nextSettings)
  applyBgmVolume()
  return nextSettings
}

export function playBgm(name) {
  const src = BGM_TRACKS[name]
  if (!src) return

  if (currentBgm && currentBgmName === name) {
    applyBgmVolume()
    currentBgm.play()
    return
  }

  stopBgm()

  currentBgmName = name
  currentBgm = uni.createInnerAudioContext()
  currentBgm.src = src
  currentBgm.loop = true
  currentBgm.autoplay = false
  currentBgm.volume = calculateVolume('bgm')
  currentBgm.onError((error) => {
    console.warn(`播放背景音乐失败: ${name}`, error)
  })
  currentBgm.play()
}

export function stopBgm() {
  if (!currentBgm) return

  try {
    currentBgm.stop()
    currentBgm.destroy()
  } catch (error) {
    console.warn('停止背景音乐失败:', error)
  }

  currentBgm = null
  currentBgmName = ''
}

export function pauseBgm() {
  if (currentBgm) currentBgm.pause()
}

export function resumeBgm() {
  if (currentBgm) currentBgm.play()
}

export function playSfx(name) {
  const src = SFX_TRACKS[name]
  if (!src) return

  const audio = uni.createInnerAudioContext()
  audio.src = src
  audio.autoplay = false
  audio.volume = calculateVolume('sfx')

  const destroyAudio = () => {
    try {
      audio.destroy()
    } catch (error) {
      console.warn(`销毁音效失败: ${name}`, error)
    }
  }

  audio.onEnded(destroyAudio)
  audio.onError((error) => {
    console.warn(`播放音效失败: ${name}`, error)
    destroyAudio()
  })
  audio.play()
}

export function getSoundInventory() {
  return {
    bgm: { ...BGM_TRACKS },
    sfx: { ...SFX_TRACKS }
  }
}
