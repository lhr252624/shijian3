if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_HIDE = "onHide";
  const ON_LAUNCH = "onLaunch";
  const ON_LOAD = "onLoad";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createLifeCycleHook = (lifecycle, flag = 0) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createLifeCycleHook(
    ON_SHOW,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onHide = /* @__PURE__ */ createLifeCycleHook(
    ON_HIDE,
    1 | 2
    /* HookFlags.PAGE */
  );
  const onLaunch = /* @__PURE__ */ createLifeCycleHook(
    ON_LAUNCH,
    1
    /* HookFlags.APP */
  );
  const onLoad = /* @__PURE__ */ createLifeCycleHook(
    ON_LOAD,
    2
    /* HookFlags.PAGE */
  );
  const AUDIO_SETTINGS_KEY = "qizha_audio_settings";
  const DEFAULT_SETTINGS = {
    master: 80,
    bgm: 70,
    sfx: 85
  };
  const BGM_TRACKS = {
    login: "/static/sounds/bgm/login_music.mp3",
    lobby: "/static/sounds/bgm/lobby_music.mp3",
    playing: "/static/sounds/bgm/playing_music.mp3"
  };
  const SFX_TRACKS = {
    uiClick: "/static/sounds/sound_effect/UI/button.mp3",
    selectCard: "/static/sounds/sound_effect/game/block.mp3",
    playCard: "/static/sounds/sound_effect/game/block.mp3",
    challenge: "/static/sounds/sound_effect/game/suspect.mp3",
    pass: "/static/sounds/sound_effect/UI/button.mp3",
    ready: "/static/sounds/sound_effect/UI/button.mp3",
    skill: "/static/sounds/sound_effect/game/skill.mp3",
    matchSuccess: "/static/sounds/sound_effect/room/match_success.mp3",
    gameStart: "/static/sounds/sound_effect/room/entry_game_2.mp3",
    challengeSuccess: "/static/sounds/sound_effect/game/suspect.mp3",
    challengeFail: "/static/sounds/sound_effect/game/suspect.mp3",
    rouletteSurvive: "/static/sounds/sound_effect/game/fire.mp3",
    rouletteHit: "/static/sounds/sound_effect/game/fire.mp3",
    eliminated: "/static/sounds/sound_effect/game/death.mp3",
    gameOver: "/static/sounds/sound_effect/game/win.mp3",
    playerJoin: "/static/sounds/sound_effect/room/entry_game_2.mp3",
    playerLeave: "/static/sounds/sound_effect/room/exit.mp3",
    chat: "/static/sounds/sound_effect/UI/button.mp3"
  };
  const SFX_GAIN = {
    challenge: 1.35,
    challengeSuccess: 1.35,
    challengeFail: 1.35
  };
  let currentBgm = null;
  let currentBgmName = "";
  const activeSfxContexts = /* @__PURE__ */ new Set();
  function clampVolume(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric))
      return 0;
    return Math.max(0, Math.min(100, numeric));
  }
  function readSettings() {
    try {
      const stored = uni.getStorageSync(AUDIO_SETTINGS_KEY);
      if (!stored)
        return { ...DEFAULT_SETTINGS };
      const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
      return {
        master: clampVolume(parsed.master ?? DEFAULT_SETTINGS.master),
        bgm: clampVolume(parsed.bgm ?? DEFAULT_SETTINGS.bgm),
        sfx: clampVolume(parsed.sfx ?? DEFAULT_SETTINGS.sfx)
      };
    } catch (error) {
      formatAppLog("warn", "at utils/audio.js:64", "读取音频设置失败，使用默认值:", error);
      return { ...DEFAULT_SETTINGS };
    }
  }
  function saveSettings(settings) {
    uni.setStorageSync(AUDIO_SETTINGS_KEY, settings);
  }
  function calculateVolume(kind) {
    const settings = readSettings();
    const channel = kind === "bgm" ? settings.bgm : settings.sfx;
    return settings.master / 100 * (channel / 100);
  }
  function calculateSfxVolume(name) {
    return Math.min(1, calculateVolume("sfx") * (SFX_GAIN[name] || 1));
  }
  function applyBgmVolume() {
    if (currentBgm) {
      currentBgm.volume = calculateVolume("bgm");
    }
  }
  function applyAudioContextDefaults(audio) {
    try {
      audio.autoplay = false;
    } catch (error) {
      formatAppLog("warn", "at utils/audio.js:93", "设置音频 autoplay 失败:", error);
    }
    try {
      audio.sessionCategory = "ambient";
    } catch (error) {
    }
    try {
      audio.obeyMuteSwitch = false;
    } catch (error) {
    }
  }
  function stopBgmContext(clearDesired = true) {
    if (!currentBgm) {
      return;
    }
    try {
      currentBgm.stop();
      currentBgm.destroy();
    } catch (error) {
      formatAppLog("warn", "at utils/audio.js:119", "停止背景音乐失败:", error);
    }
    currentBgm = null;
    currentBgmName = "";
  }
  function getAudioSettings() {
    return readSettings();
  }
  function setAudioSetting(key, value) {
    const settings = readSettings();
    if (!Object.prototype.hasOwnProperty.call(settings, key))
      return settings;
    const nextSettings = {
      ...settings,
      [key]: clampVolume(value)
    };
    saveSettings(nextSettings);
    applyBgmVolume();
    return nextSettings;
  }
  function playBgm(name) {
    const src = BGM_TRACKS[name];
    if (!src)
      return;
    if (currentBgm && currentBgmName === name) {
      applyBgmVolume();
      currentBgm.play();
      return;
    }
    stopBgmContext(false);
    currentBgmName = name;
    currentBgm = uni.createInnerAudioContext();
    applyAudioContextDefaults(currentBgm);
    currentBgm.loop = true;
    currentBgm.src = src;
    currentBgm.volume = calculateVolume("bgm");
    currentBgm.onError((error) => {
      formatAppLog("warn", "at utils/audio.js:181", `播放背景音乐失败: ${name}`, error);
    });
    currentBgm.play();
  }
  function stopBgm() {
    stopBgmContext(true);
  }
  function playSfx(name) {
    const src = SFX_TRACKS[name];
    if (!src)
      return;
    const audio = uni.createInnerAudioContext();
    activeSfxContexts.add(audio);
    applyAudioContextDefaults(audio);
    audio.src = src;
    audio.volume = calculateSfxVolume(name);
    const destroyAudio = () => {
      activeSfxContexts.delete(audio);
      try {
        audio.destroy();
      } catch (error) {
        formatAppLog("warn", "at utils/audio.js:213", `销毁音效失败: ${name}`, error);
      }
    };
    audio.onEnded(() => {
      destroyAudio();
    });
    audio.onError((error) => {
      formatAppLog("warn", "at utils/audio.js:221", `播放音效失败: ${name}`, error);
      destroyAudio();
    });
    audio.play();
  }
  function stopAllAudio() {
    stopBgmContext(true);
    activeSfxContexts.forEach((audio) => {
      try {
        audio.stop();
        audio.destroy();
      } catch (error) {
        formatAppLog("warn", "at utils/audio.js:235", "停止音效失败:", error);
      }
    });
    activeSfxContexts.clear();
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$g = {
    __name: "studio-splash",
    setup(__props) {
      let enterTimer = null;
      let fadeTimer = null;
      const isFading = vue.ref(false);
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
      }
      function enterLogin() {
        if (enterTimer) {
          clearTimeout(enterTimer);
          enterTimer = null;
        }
        uni.reLaunch({
          url: "/pages/login/login?fromSplash=1"
        });
      }
      vue.onMounted(() => {
        setLandscape();
        stopBgm();
        fadeTimer = setTimeout(() => {
          isFading.value = true;
        }, 2200);
        enterTimer = setTimeout(enterLogin, 3e3);
      });
      vue.onUnmounted(() => {
        if (fadeTimer) {
          clearTimeout(fadeTimer);
          fadeTimer = null;
        }
        if (enterTimer) {
          clearTimeout(enterTimer);
          enterTimer = null;
        }
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock(
          "view",
          {
            class: vue.normalizeClass(["studio-splash", { fading: isFading.value }])
          },
          [
            vue.createElementVNode("image", {
              class: "studio-image",
              src: "/static/images/studio_splash_wuyaoling_510.png",
              mode: "aspectFit"
            })
          ],
          2
          /* CLASS */
        );
      };
    }
  };
  const PagesStudioSplashStudioSplash = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["__scopeId", "data-v-234a3a0f"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/studio-splash/studio-splash.vue"]]);
  const scriptRel = "modulepreload";
  const assetsURL = function(dep) {
    return "/" + dep;
  };
  const seen = {};
  const __vitePreload = function preload(baseModule, deps, importerUrl) {
    let promise = Promise.resolve();
    if (false) {
      const links = document.getElementsByTagName("link");
      const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
      const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
      promise = Promise.all(deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen)
          return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        const isBaseRelative = !!importerUrl;
        if (isBaseRelative) {
          for (let i = links.length - 1; i >= 0; i--) {
            const link2 = links[i];
            if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
              return;
            }
          }
        } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
          link.crossOrigin = "";
        }
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener("error", () => rej(new Error(`Unable to preload CSS for ${dep}`)));
          });
        }
      }));
    }
    return promise.then(() => baseModule()).catch((err) => {
      const e = new Event("vite:preloadError", { cancelable: true });
      e.payload = err;
      window.dispatchEvent(e);
      if (!e.defaultPrevented) {
        throw err;
      }
    });
  };
  const _sfc_main$f = {
    __name: "Loading",
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      text: {
        type: String,
        default: ""
      }
    },
    setup(__props) {
      return (_ctx, _cache) => {
        return __props.visible ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "loading-overlay"
        }, [
          vue.createElementVNode("view", { class: "loading-container" }, [
            vue.createElementVNode("view", { class: "spinner" }),
            __props.text ? (vue.openBlock(), vue.createElementBlock(
              "text",
              {
                key: 0,
                class: "loading-text"
              },
              vue.toDisplayString(__props.text),
              1
              /* TEXT */
            )) : vue.createCommentVNode("v-if", true)
          ])
        ])) : vue.createCommentVNode("v-if", true);
      };
    }
  };
  const Loading = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["__scopeId", "data-v-65e10ca8"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/components/Loading.vue"]]);
  const _sfc_main$e = {
    __name: "Toast",
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      message: {
        type: String,
        default: ""
      },
      type: {
        type: String,
        default: "error"
        // error | success | info
      },
      duration: {
        type: Number,
        default: 3e3
      }
    },
    emits: ["update:visible"],
    setup(__props, { emit: __emit }) {
      const props = __props;
      const emit = __emit;
      const icon = vue.computed(() => {
        switch (props.type) {
          case "success":
            return "✓";
          case "error":
            return "⚠️";
          case "info":
            return "ℹ️";
          default:
            return "⚠️";
        }
      });
      let timer = null;
      vue.watch(() => props.visible, (val) => {
        if (val) {
          if (timer)
            clearTimeout(timer);
          timer = setTimeout(() => {
            emit("update:visible", false);
          }, props.duration);
        }
      });
      return (_ctx, _cache) => {
        return __props.visible ? (vue.openBlock(), vue.createElementBlock(
          "view",
          {
            key: 0,
            class: vue.normalizeClass(["toast-container", __props.type])
          },
          [
            vue.createElementVNode("view", { class: "toast-content" }, [
              vue.createElementVNode(
                "text",
                { class: "toast-icon" },
                vue.toDisplayString(icon.value),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "toast-msg" },
                vue.toDisplayString(__props.message),
                1
                /* TEXT */
              )
            ])
          ],
          2
          /* CLASS */
        )) : vue.createCommentVNode("v-if", true);
      };
    }
  };
  const Toast = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["__scopeId", "data-v-3fc632e9"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/components/Toast.vue"]]);
  const _sfc_main$d = {
    components: {
      Loading,
      Toast
    },
    data() {
      return {
        username: "",
        password: "",
        loading: false,
        showEntryFade: false,
        entryFadeHiding: false,
        entryFadeTimer: null,
        entryFadeRemoveTimer: null,
        toast: {
          show: false,
          msg: "",
          type: "error"
        }
      };
    },
    onLoad(options = {}) {
      formatAppLog("log", "at pages/login/login.vue:71", "=== 登录页面加载 ===");
      this.setLandscape();
      this.ensureLoginMusic();
      if (options.fromSplash) {
        this.showEntryFade = true;
        this.entryFadeTimer = setTimeout(() => {
          this.entryFadeHiding = true;
        }, 80);
        this.entryFadeRemoveTimer = setTimeout(() => {
          this.showEntryFade = false;
          this.entryFadeHiding = false;
        }, 820);
      }
    },
    onShow() {
      formatAppLog("log", "at pages/login/login.vue:86", "=== 登录页面显示 ===");
      this.setLandscape();
      this.ensureLoginMusic();
    },
    onUnload() {
      formatAppLog("log", "at pages/login/login.vue:92", "=== 登录页面卸载 ===");
      if (this.entryFadeTimer)
        clearTimeout(this.entryFadeTimer);
      if (this.entryFadeRemoveTimer)
        clearTimeout(this.entryFadeRemoveTimer);
    },
    methods: {
      ensureLoginMusic() {
        playBgm("login");
      },
      showToast(msg, type = "error") {
        this.toast = { show: true, msg, type };
      },
      setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
        formatAppLog("log", "at pages/login/login.vue:108", "已设置横屏模式");
      },
      async handleLogin() {
        this.ensureLoginMusic();
        playSfx("uiClick");
        if (this.loading) {
          formatAppLog("warn", "at pages/login/login.vue:116", "正在登录中，请勿重复点击");
          return;
        }
        formatAppLog("log", "at pages/login/login.vue:120", "=== 开始登录流程 ===");
        formatAppLog("log", "at pages/login/login.vue:121", "表单数据:", {
          username: this.username,
          passwordLength: this.password.length
        });
        if (!this.username) {
          formatAppLog("warn", "at pages/login/login.vue:128", "验证失败: 账号为空");
          this.showToast("请输入账号", "error");
          return;
        }
        if (!this.password) {
          formatAppLog("warn", "at pages/login/login.vue:135", "验证失败: 密码为空");
          this.showToast("请输入密码", "error");
          return;
        }
        formatAppLog("log", "at pages/login/login.vue:140", "表单验证通过，准备调用登录API");
        this.loading = true;
        try {
          const { useAuthStore: useAuthStore2 } = await __vitePreload(() => Promise.resolve().then(() => auth), false ? "__VITE_PRELOAD__" : void 0);
          const authStore = useAuthStore2();
          formatAppLog("log", "at pages/login/login.vue:148", "调用登录API...");
          const result = await authStore.login(this.username, this.password);
          formatAppLog("log", "at pages/login/login.vue:150", "登录API响应:", result);
          formatAppLog("log", "at pages/login/login.vue:151", "登录成功，用户信息:", result.user);
          this.showToast("登录成功", "success");
          setTimeout(() => {
            formatAppLog("log", "at pages/login/login.vue:158", "跳转到大厅页面");
            uni.reLaunch({
              url: "/pages/lobby/lobby"
            });
          }, 1200);
        } catch (e) {
          formatAppLog("error", "at pages/login/login.vue:164", "登录失败:", e);
          formatAppLog("error", "at pages/login/login.vue:165", "错误详情:", {
            response: e.response,
            message: e.message,
            data: e.data
          });
          let errorMsg = "登录失败，请检查账号密码";
          if (e.data && e.data.msg) {
            errorMsg = e.data.msg;
          } else if (e.message) {
            errorMsg = e.message;
          }
          formatAppLog("log", "at pages/login/login.vue:179", "显示错误提示:", errorMsg);
          this.showToast(errorMsg, "error");
        } finally {
          this.loading = false;
          formatAppLog("log", "at pages/login/login.vue:183", "=== 登录流程结束 ===");
        }
      },
      goToRegister() {
        this.ensureLoginMusic();
        playSfx("uiClick");
        formatAppLog("log", "at pages/login/login.vue:189", "跳转到注册页面");
        uni.navigateTo({
          url: "/pages/register/register"
        });
      },
      goToForgetPassword() {
        this.ensureLoginMusic();
        playSfx("uiClick");
        formatAppLog("log", "at pages/login/login.vue:197", "点击忘记密码");
        this.showToast("忘记密码功能开发中", "info");
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Loading = vue.resolveComponent("Loading");
    const _component_Toast = vue.resolveComponent("Toast");
    return vue.openBlock(), vue.createElementBlock("view", {
      class: "login-container",
      onClick: _cache[8] || (_cache[8] = (...args) => $options.ensureLoginMusic && $options.ensureLoginMusic(...args))
    }, [
      vue.createElementVNode("image", {
        class: "background-image",
        src: "/static/images/login.png",
        mode: "aspectFill"
      }),
      vue.createElementVNode("view", { class: "background-vignette" }),
      vue.createCommentVNode(" 交互层 "),
      vue.createElementVNode("view", { class: "interactive-layer" }, [
        vue.createElementVNode("view", { class: "login-panel" }, [
          vue.createElementVNode("view", { class: "panel-header" }, [
            vue.createElementVNode("text", { class: "panel-title" }, "骗子酒馆"),
            vue.createElementVNode("text", { class: "panel-subtitle" }, "LIAR'S BAR")
          ]),
          vue.createCommentVNode(" 账号输入框 "),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input-field input-username",
              type: "text",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.username = $event),
              placeholder: "请输入账号",
              onFocus: _cache[1] || (_cache[1] = (...args) => $options.ensureLoginMusic && $options.ensureLoginMusic(...args))
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $data.username]
          ]),
          vue.createCommentVNode(" 密码输入框 "),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "input-field input-password",
              type: "password",
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.password = $event),
              placeholder: "请输入密码",
              onFocus: _cache[3] || (_cache[3] = (...args) => $options.ensureLoginMusic && $options.ensureLoginMusic(...args))
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $data.password]
          ]),
          vue.createCommentVNode(" 登录按钮 "),
          vue.createElementVNode("view", {
            class: "login-button",
            onClick: _cache[4] || (_cache[4] = (...args) => $options.handleLogin && $options.handleLogin(...args))
          }, "登录"),
          vue.createCommentVNode(" 底部链接区域 "),
          vue.createElementVNode("view", { class: "footer-links" }, [
            vue.createElementVNode("view", {
              class: "link-area link-register",
              onClick: _cache[5] || (_cache[5] = (...args) => $options.goToRegister && $options.goToRegister(...args))
            }, "注册账号"),
            vue.createElementVNode("view", { class: "link-divider" }),
            vue.createElementVNode("view", {
              class: "link-area link-forget",
              onClick: _cache[6] || (_cache[6] = (...args) => $options.goToForgetPassword && $options.goToForgetPassword(...args))
            }, "忘记密码")
          ])
        ])
      ]),
      vue.createCommentVNode(" 自定义加载组件 "),
      vue.createVNode(_component_Loading, {
        visible: $data.loading,
        text: "登录中..."
      }, null, 8, ["visible"]),
      vue.createCommentVNode(" 自定义提示组件 "),
      vue.createVNode(_component_Toast, {
        visible: $data.toast.show,
        "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => $data.toast.show = $event),
        message: $data.toast.msg,
        type: $data.toast.type
      }, null, 8, ["visible", "message", "type"]),
      $data.showEntryFade ? (vue.openBlock(), vue.createElementBlock(
        "view",
        {
          key: 0,
          class: vue.normalizeClass(["entry-fade-mask", { hiding: $data.entryFadeHiding }])
        },
        null,
        2
        /* CLASS */
      )) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesLoginLogin = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render], ["__scopeId", "data-v-e4e4508d"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/login/login.vue"]]);
  var isVue2 = false;
  function set$1(target, key, val) {
    if (Array.isArray(target)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val;
    }
    target[key] = val;
    return val;
  }
  function del(target, key) {
    if (Array.isArray(target)) {
      target.splice(key, 1);
      return;
    }
    delete target[key];
  }
  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    return typeof navigator !== "undefined" && typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {};
  }
  const isProxyAvailable = typeof Proxy === "function";
  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";
  let supported;
  let perf;
  function isPerformanceSupported() {
    var _a;
    if (supported !== void 0) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (typeof global !== "undefined" && ((_a = global.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
      supported = true;
      perf = global.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }
  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
          }
          currentSettings = value;
        },
        now() {
          return now();
        }
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target.on[prop];
          } else {
            return (...args) => {
              this.onQueue.push({
                method: prop,
                args
              });
            };
          }
        }
      });
      this.proxiedTarget = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target[prop];
          } else if (prop === "on") {
            return this.proxiedOn;
          } else if (Object.keys(this.fallbacks).includes(prop)) {
            return (...args) => {
              this.targetQueue.push({
                method: prop,
                args,
                resolve: () => {
                }
              });
              return this.fallbacks[prop](...args);
            };
          } else {
            return (...args) => {
              return new Promise((resolve) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve
                });
              });
            };
          }
        }
      });
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }
  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy
      });
      if (proxy)
        setupFn(proxy.proxiedTarget);
    }
  }
  /*!
   * pinia v2.1.7
   * (c) 2023 Eduardo San Martin Morote
   * @license MIT
   */
  let activePinia;
  const setActivePinia = (pinia) => activePinia = pinia;
  const piniaSymbol = Symbol("pinia");
  function isPlainObject(o) {
    return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
  }
  var MutationType;
  (function(MutationType2) {
    MutationType2["direct"] = "direct";
    MutationType2["patchObject"] = "patch object";
    MutationType2["patchFunction"] = "patch function";
  })(MutationType || (MutationType = {}));
  const IS_CLIENT = typeof window !== "undefined";
  const USE_DEVTOOLS = IS_CLIENT;
  const _global = /* @__PURE__ */ (() => typeof window === "object" && window.window === window ? window : typeof self === "object" && self.self === self ? self : typeof global === "object" && global.global === global ? global : typeof globalThis === "object" ? globalThis : { HTMLElement: null })();
  function bom(blob, { autoBom = false } = {}) {
    if (autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
      return new Blob([String.fromCharCode(65279), blob], { type: blob.type });
    }
    return blob;
  }
  function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = function() {
      saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function() {
      console.error("could not download file");
    };
    xhr.send();
  }
  function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false);
    try {
      xhr.send();
    } catch (e) {
    }
    return xhr.status >= 200 && xhr.status <= 299;
  }
  function click(node) {
    try {
      node.dispatchEvent(new MouseEvent("click"));
    } catch (e) {
      const evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
      node.dispatchEvent(evt);
    }
  }
  const _navigator = typeof navigator === "object" ? navigator : { userAgent: "" };
  const isMacOSWebView = /* @__PURE__ */ (() => /Macintosh/.test(_navigator.userAgent) && /AppleWebKit/.test(_navigator.userAgent) && !/Safari/.test(_navigator.userAgent))();
  const saveAs = !IS_CLIENT ? () => {
  } : (
    // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
    typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype && !isMacOSWebView ? downloadSaveAs : (
      // Use msSaveOrOpenBlob as a second approach
      "msSaveOrOpenBlob" in _navigator ? msSaveAs : (
        // Fallback to using FileReader and a popup
        fileSaverSaveAs
      )
    )
  );
  function downloadSaveAs(blob, name = "download", opts) {
    const a = document.createElement("a");
    a.download = name;
    a.rel = "noopener";
    if (typeof blob === "string") {
      a.href = blob;
      if (a.origin !== location.origin) {
        if (corsEnabled(a.href)) {
          download(blob, name, opts);
        } else {
          a.target = "_blank";
          click(a);
        }
      } else {
        click(a);
      }
    } else {
      a.href = URL.createObjectURL(blob);
      setTimeout(function() {
        URL.revokeObjectURL(a.href);
      }, 4e4);
      setTimeout(function() {
        click(a);
      }, 0);
    }
  }
  function msSaveAs(blob, name = "download", opts) {
    if (typeof blob === "string") {
      if (corsEnabled(blob)) {
        download(blob, name, opts);
      } else {
        const a = document.createElement("a");
        a.href = blob;
        a.target = "_blank";
        setTimeout(function() {
          click(a);
        });
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
  }
  function fileSaverSaveAs(blob, name, opts, popup) {
    popup = popup || open("", "_blank");
    if (popup) {
      popup.document.title = popup.document.body.innerText = "downloading...";
    }
    if (typeof blob === "string")
      return download(blob, name, opts);
    const force = blob.type === "application/octet-stream";
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || "safari" in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== "undefined") {
      const reader = new FileReader();
      reader.onloadend = function() {
        let url = reader.result;
        if (typeof url !== "string") {
          popup = null;
          throw new Error("Wrong reader.result type");
        }
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, "data:attachment/file;");
        if (popup) {
          popup.location.href = url;
        } else {
          location.assign(url);
        }
        popup = null;
      };
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      if (popup)
        popup.location.assign(url);
      else
        location.href = url;
      popup = null;
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 4e4);
    }
  }
  function toastMessage(message, type) {
    const piniaMessage = "🍍 " + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === "function") {
      __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    } else if (type === "error") {
      console.error(piniaMessage);
    } else if (type === "warn") {
      console.warn(piniaMessage);
    } else {
      console.log(piniaMessage);
    }
  }
  function isPinia(o) {
    return "_a" in o && "install" in o;
  }
  function checkClipboardAccess() {
    if (!("clipboard" in navigator)) {
      toastMessage(`Your browser doesn't support the Clipboard API`, "error");
      return true;
    }
  }
  function checkNotFocusedError(error) {
    if (error instanceof Error && error.message.toLowerCase().includes("document is not focused")) {
      toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn");
      return true;
    }
    return false;
  }
  async function actionGlobalCopyState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(pinia.state.value));
      toastMessage("Global state copied to clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to serialize the state. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalPasteState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      loadStoresState(pinia, JSON.parse(await navigator.clipboard.readText()));
      toastMessage("Global state pasted from clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalSaveState(pinia) {
    try {
      saveAs(new Blob([JSON.stringify(pinia.state.value)], {
        type: "text/plain;charset=utf-8"
      }), "pinia-state.json");
    } catch (error) {
      toastMessage(`Failed to export the state as JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  let fileInput;
  function getFileOpener() {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
    }
    function openFile() {
      return new Promise((resolve, reject) => {
        fileInput.onchange = async () => {
          const files = fileInput.files;
          if (!files)
            return resolve(null);
          const file = files.item(0);
          if (!file)
            return resolve(null);
          return resolve({ text: await file.text(), file });
        };
        fileInput.oncancel = () => resolve(null);
        fileInput.onerror = reject;
        fileInput.click();
      });
    }
    return openFile;
  }
  async function actionGlobalOpenStateFile(pinia) {
    try {
      const open2 = getFileOpener();
      const result = await open2();
      if (!result)
        return;
      const { text, file } = result;
      loadStoresState(pinia, JSON.parse(text));
      toastMessage(`Global state imported from "${file.name}".`);
    } catch (error) {
      toastMessage(`Failed to import the state from JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  function loadStoresState(pinia, state2) {
    for (const key in state2) {
      const storeState = pinia.state.value[key];
      if (storeState) {
        Object.assign(storeState, state2[key]);
      } else {
        pinia.state.value[key] = state2[key];
      }
    }
  }
  function formatDisplay(display) {
    return {
      _custom: {
        display
      }
    };
  }
  const PINIA_ROOT_LABEL = "🍍 Pinia (root)";
  const PINIA_ROOT_ID = "_root";
  function formatStoreForInspectorTree(store) {
    return isPinia(store) ? {
      id: PINIA_ROOT_ID,
      label: PINIA_ROOT_LABEL
    } : {
      id: store.$id,
      label: store.$id
    };
  }
  function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
      const storeNames = Array.from(store._s.keys());
      const storeMap = store._s;
      const state22 = {
        state: storeNames.map((storeId) => ({
          editable: true,
          key: storeId,
          value: store.state.value[storeId]
        })),
        getters: storeNames.filter((id) => storeMap.get(id)._getters).map((id) => {
          const store2 = storeMap.get(id);
          return {
            editable: false,
            key: id,
            value: store2._getters.reduce((getters, key) => {
              getters[key] = store2[key];
              return getters;
            }, {})
          };
        })
      };
      return state22;
    }
    const state2 = {
      state: Object.keys(store.$state).map((key) => ({
        editable: true,
        key,
        value: store.$state[key]
      }))
    };
    if (store._getters && store._getters.length) {
      state2.getters = store._getters.map((getterName) => ({
        editable: false,
        key: getterName,
        value: store[getterName]
      }));
    }
    if (store._customProperties.size) {
      state2.customProperties = Array.from(store._customProperties).map((key) => ({
        editable: true,
        key,
        value: store[key]
      }));
    }
    return state2;
  }
  function formatEventData(events) {
    if (!events)
      return {};
    if (Array.isArray(events)) {
      return events.reduce((data, event) => {
        data.keys.push(event.key);
        data.operations.push(event.type);
        data.oldValue[event.key] = event.oldValue;
        data.newValue[event.key] = event.newValue;
        return data;
      }, {
        oldValue: {},
        keys: [],
        operations: [],
        newValue: {}
      });
    } else {
      return {
        operation: formatDisplay(events.type),
        key: formatDisplay(events.key),
        oldValue: events.oldValue,
        newValue: events.newValue
      };
    }
  }
  function formatMutationType(type) {
    switch (type) {
      case MutationType.direct:
        return "mutation";
      case MutationType.patchFunction:
        return "$patch";
      case MutationType.patchObject:
        return "$patch";
      default:
        return "unknown";
    }
  }
  let isTimelineActive = true;
  const componentStateTypes = [];
  const MUTATIONS_LAYER_ID = "pinia:mutations";
  const INSPECTOR_ID = "pinia";
  const { assign: assign$1 } = Object;
  const getStoreType = (id) => "🍍 " + id;
  function registerPiniaDevtools(app, pinia) {
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app
    }, (api) => {
      if (typeof api.now !== "function") {
        toastMessage("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.");
      }
      api.addTimelineLayer({
        id: MUTATIONS_LAYER_ID,
        label: `Pinia 🍍`,
        color: 15064968
      });
      api.addInspector({
        id: INSPECTOR_ID,
        label: "Pinia 🍍",
        icon: "storage",
        treeFilterPlaceholder: "Search stores",
        actions: [
          {
            icon: "content_copy",
            action: () => {
              actionGlobalCopyState(pinia);
            },
            tooltip: "Serialize and copy the state"
          },
          {
            icon: "content_paste",
            action: async () => {
              await actionGlobalPasteState(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Replace the state with the content of your clipboard"
          },
          {
            icon: "save",
            action: () => {
              actionGlobalSaveState(pinia);
            },
            tooltip: "Save the state as a JSON file"
          },
          {
            icon: "folder_open",
            action: async () => {
              await actionGlobalOpenStateFile(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Import the state from a JSON file"
          }
        ],
        nodeActions: [
          {
            icon: "restore",
            tooltip: 'Reset the state (with "$reset")',
            action: (nodeId) => {
              const store = pinia._s.get(nodeId);
              if (!store) {
                toastMessage(`Cannot reset "${nodeId}" store because it wasn't found.`, "warn");
              } else if (typeof store.$reset !== "function") {
                toastMessage(`Cannot reset "${nodeId}" store because it doesn't have a "$reset" method implemented.`, "warn");
              } else {
                store.$reset();
                toastMessage(`Store "${nodeId}" reset.`);
              }
            }
          }
        ]
      });
      api.on.inspectComponent((payload, ctx) => {
        const proxy = payload.componentInstance && payload.componentInstance.proxy;
        if (proxy && proxy._pStores) {
          const piniaStores = payload.componentInstance.proxy._pStores;
          Object.values(piniaStores).forEach((store) => {
            payload.instanceData.state.push({
              type: getStoreType(store.$id),
              key: "state",
              editable: true,
              value: store._isOptionsAPI ? {
                _custom: {
                  value: vue.toRaw(store.$state),
                  actions: [
                    {
                      icon: "restore",
                      tooltip: "Reset the state of this store",
                      action: () => store.$reset()
                    }
                  ]
                }
              } : (
                // NOTE: workaround to unwrap transferred refs
                Object.keys(store.$state).reduce((state2, key) => {
                  state2[key] = store.$state[key];
                  return state2;
                }, {})
              )
            });
            if (store._getters && store._getters.length) {
              payload.instanceData.state.push({
                type: getStoreType(store.$id),
                key: "getters",
                editable: false,
                value: store._getters.reduce((getters, key) => {
                  try {
                    getters[key] = store[key];
                  } catch (error) {
                    getters[key] = error;
                  }
                  return getters;
                }, {})
              });
            }
          });
        }
      });
      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          let stores = [pinia];
          stores = stores.concat(Array.from(pinia._s.values()));
          payload.rootNodes = (payload.filter ? stores.filter((store) => "$id" in store ? store.$id.toLowerCase().includes(payload.filter.toLowerCase()) : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase())) : stores).map(formatStoreForInspectorTree);
        }
      });
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return;
          }
          if (inspectedStore) {
            payload.state = formatStoreForInspectorState(inspectedStore);
          }
        }
      });
      api.on.editInspectorState((payload, ctx) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return toastMessage(`store "${payload.nodeId}" not found`, "error");
          }
          const { path } = payload;
          if (!isPinia(inspectedStore)) {
            if (path.length !== 1 || !inspectedStore._customProperties.has(path[0]) || path[0] in inspectedStore.$state) {
              path.unshift("$state");
            }
          } else {
            path.unshift("state");
          }
          isTimelineActive = false;
          payload.set(inspectedStore, path, payload.state.value);
          isTimelineActive = true;
        }
      });
      api.on.editComponentState((payload) => {
        if (payload.type.startsWith("🍍")) {
          const storeId = payload.type.replace(/^🍍\s*/, "");
          const store = pinia._s.get(storeId);
          if (!store) {
            return toastMessage(`store "${storeId}" not found`, "error");
          }
          const { path } = payload;
          if (path[0] !== "state") {
            return toastMessage(`Invalid path for store "${storeId}":
${path}
Only state can be modified.`);
          }
          path[0] = "$state";
          isTimelineActive = false;
          payload.set(store, path, payload.state.value);
          isTimelineActive = true;
        }
      });
    });
  }
  function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
      componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app,
      settings: {
        logStoreChanges: {
          label: "Notify about new/deleted stores",
          type: "boolean",
          defaultValue: true
        }
        // useEmojis: {
        //   label: 'Use emojis in messages ⚡️',
        //   type: 'boolean',
        //   defaultValue: true,
        // },
      }
    }, (api) => {
      const now2 = typeof api.now === "function" ? api.now.bind(api) : Date.now;
      store.$onAction(({ after, onError, name, args }) => {
        const groupId = runningActionId++;
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🛫 " + name,
            subtitle: "start",
            data: {
              store: formatDisplay(store.$id),
              action: formatDisplay(name),
              args
            },
            groupId
          }
        });
        after((result) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              title: "🛬 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                result
              },
              groupId
            }
          });
        });
        onError((error) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              logType: "error",
              title: "💥 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                error
              },
              groupId
            }
          });
        });
      }, true);
      store._customProperties.forEach((name) => {
        vue.watch(() => vue.unref(store[name]), (newValue, oldValue) => {
          api.notifyComponentUpdate();
          api.sendInspectorState(INSPECTOR_ID);
          if (isTimelineActive) {
            api.addTimelineEvent({
              layerId: MUTATIONS_LAYER_ID,
              event: {
                time: now2(),
                title: "Change",
                subtitle: name,
                data: {
                  newValue,
                  oldValue
                },
                groupId: activeAction
              }
            });
          }
        }, { deep: true });
      });
      store.$subscribe(({ events, type }, state2) => {
        api.notifyComponentUpdate();
        api.sendInspectorState(INSPECTOR_ID);
        if (!isTimelineActive)
          return;
        const eventData = {
          time: now2(),
          title: formatMutationType(type),
          data: assign$1({ store: formatDisplay(store.$id) }, formatEventData(events)),
          groupId: activeAction
        };
        if (type === MutationType.patchFunction) {
          eventData.subtitle = "⤵️";
        } else if (type === MutationType.patchObject) {
          eventData.subtitle = "🧩";
        } else if (events && !Array.isArray(events)) {
          eventData.subtitle = events.type;
        }
        if (events) {
          eventData.data["rawEvent(s)"] = {
            _custom: {
              display: "DebuggerEvent",
              type: "object",
              tooltip: "raw DebuggerEvent[]",
              value: events
            }
          };
        }
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: eventData
        });
      }, { detached: true, flush: "sync" });
      const hotUpdate = store._hotUpdate;
      store._hotUpdate = vue.markRaw((newStore) => {
        hotUpdate(newStore);
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🔥 " + store.$id,
            subtitle: "HMR update",
            data: {
              store: formatDisplay(store.$id),
              info: formatDisplay(`HMR update`)
            }
          }
        });
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
      });
      const { $dispose } = store;
      store.$dispose = () => {
        $dispose();
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.getSettings().logStoreChanges && toastMessage(`Disposed "${store.$id}" store 🗑`);
      };
      api.notifyComponentUpdate();
      api.sendInspectorTree(INSPECTOR_ID);
      api.sendInspectorState(INSPECTOR_ID);
      api.getSettings().logStoreChanges && toastMessage(`"${store.$id}" store installed 🆕`);
    });
  }
  let runningActionId = 0;
  let activeAction;
  function patchActionForGrouping(store, actionNames, wrapWithProxy) {
    const actions = actionNames.reduce((storeActions, actionName) => {
      storeActions[actionName] = vue.toRaw(store)[actionName];
      return storeActions;
    }, {});
    for (const actionName in actions) {
      store[actionName] = function() {
        const _actionId = runningActionId;
        const trackedStore = wrapWithProxy ? new Proxy(store, {
          get(...args) {
            activeAction = _actionId;
            return Reflect.get(...args);
          },
          set(...args) {
            activeAction = _actionId;
            return Reflect.set(...args);
          }
        }) : store;
        activeAction = _actionId;
        const retValue = actions[actionName].apply(trackedStore, arguments);
        activeAction = void 0;
        return retValue;
      };
    }
  }
  function devtoolsPlugin({ app, store, options }) {
    if (store.$id.startsWith("__hot:")) {
      return;
    }
    store._isOptionsAPI = !!options.state;
    patchActionForGrouping(store, Object.keys(options.actions), store._isOptionsAPI);
    const originalHotUpdate = store._hotUpdate;
    vue.toRaw(store)._hotUpdate = function(newStore) {
      originalHotUpdate.apply(this, arguments);
      patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions), !!store._isOptionsAPI);
    };
    addStoreToDevtools(
      app,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      store
    );
  }
  function createPinia() {
    const scope = vue.effectScope(true);
    const state2 = scope.run(() => vue.ref({}));
    let _p = [];
    let toBeInstalled = [];
    const pinia = vue.markRaw({
      install(app) {
        setActivePinia(pinia);
        {
          pinia._a = app;
          app.provide(piniaSymbol, pinia);
          app.config.globalProperties.$pinia = pinia;
          if (USE_DEVTOOLS) {
            registerPiniaDevtools(app, pinia);
          }
          toBeInstalled.forEach((plugin) => _p.push(plugin));
          toBeInstalled = [];
        }
      },
      use(plugin) {
        if (!this._a && !isVue2) {
          toBeInstalled.push(plugin);
        } else {
          _p.push(plugin);
        }
        return this;
      },
      _p,
      // it's actually undefined here
      // @ts-expect-error
      _a: null,
      _e: scope,
      _s: /* @__PURE__ */ new Map(),
      state: state2
    });
    if (USE_DEVTOOLS && typeof Proxy !== "undefined") {
      pinia.use(devtoolsPlugin);
    }
    return pinia;
  }
  function patchObject(newState, oldState) {
    for (const key in oldState) {
      const subPatch = oldState[key];
      if (!(key in newState)) {
        continue;
      }
      const targetValue = newState[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        newState[key] = patchObject(targetValue, subPatch);
      } else {
        {
          newState[key] = subPatch;
        }
      }
    }
    return newState;
  }
  const noop = () => {
  };
  function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
      const idx = subscriptions.indexOf(callback);
      if (idx > -1) {
        subscriptions.splice(idx, 1);
        onCleanup();
      }
    };
    if (!detached && vue.getCurrentScope()) {
      vue.onScopeDispose(removeSubscription);
    }
    return removeSubscription;
  }
  function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
      callback(...args);
    });
  }
  const fallbackRunWithContext = (fn) => fn();
  function mergeReactiveObjects(target, patchToApply) {
    if (target instanceof Map && patchToApply instanceof Map) {
      patchToApply.forEach((value, key) => target.set(key, value));
    }
    if (target instanceof Set && patchToApply instanceof Set) {
      patchToApply.forEach(target.add, target);
    }
    for (const key in patchToApply) {
      if (!patchToApply.hasOwnProperty(key))
        continue;
      const subPatch = patchToApply[key];
      const targetValue = target[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && target.hasOwnProperty(key) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        target[key] = mergeReactiveObjects(targetValue, subPatch);
      } else {
        target[key] = subPatch;
      }
    }
    return target;
  }
  const skipHydrateSymbol = Symbol("pinia:skipHydration");
  function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
  }
  const { assign } = Object;
  function isComputed(o) {
    return !!(vue.isRef(o) && o.effect);
  }
  function createOptionsStore(id, options, pinia, hot) {
    const { state: state2, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
      if (!initialState && !hot) {
        {
          pinia.state.value[id] = state2 ? state2() : {};
        }
      }
      const localState = hot ? (
        // use ref() to unwrap refs inside state TODO: check if this is still necessary
        vue.toRefs(vue.ref(state2 ? state2() : {}).value)
      ) : vue.toRefs(pinia.state.value[id]);
      return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
        if (name in localState) {
          console.warn(`[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`);
        }
        computedGetters[name] = vue.markRaw(vue.computed(() => {
          setActivePinia(pinia);
          const store2 = pinia._s.get(id);
          return getters[name].call(store2, store2);
        }));
        return computedGetters;
      }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
  }
  function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    if (!pinia._e.active) {
      throw new Error("Pinia destroyed");
    }
    const $subscribeOptions = {
      deep: true
      // flush: 'post',
    };
    {
      $subscribeOptions.onTrigger = (event) => {
        if (isListening) {
          debuggerEvents = event;
        } else if (isListening == false && !store._hotUpdating) {
          if (Array.isArray(debuggerEvents)) {
            debuggerEvents.push(event);
          } else {
            console.error("🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug.");
          }
        }
      };
    }
    let isListening;
    let isSyncListening;
    let subscriptions = [];
    let actionSubscriptions = [];
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    if (!isOptionsStore && !initialState && !hot) {
      {
        pinia.state.value[$id] = {};
      }
    }
    const hotState = vue.ref({});
    let activeListener;
    function $patch(partialStateOrMutator) {
      let subscriptionMutation;
      isListening = isSyncListening = false;
      {
        debuggerEvents = [];
      }
      if (typeof partialStateOrMutator === "function") {
        partialStateOrMutator(pinia.state.value[$id]);
        subscriptionMutation = {
          type: MutationType.patchFunction,
          storeId: $id,
          events: debuggerEvents
        };
      } else {
        mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
        subscriptionMutation = {
          type: MutationType.patchObject,
          payload: partialStateOrMutator,
          storeId: $id,
          events: debuggerEvents
        };
      }
      const myListenerId = activeListener = Symbol();
      vue.nextTick().then(() => {
        if (activeListener === myListenerId) {
          isListening = true;
        }
      });
      isSyncListening = true;
      triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore ? function $reset2() {
      const { state: state2 } = options;
      const newState = state2 ? state2() : {};
      this.$patch(($state) => {
        assign($state, newState);
      });
    } : (
      /* istanbul ignore next */
      () => {
        throw new Error(`🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`);
      }
    );
    function $dispose() {
      scope.stop();
      subscriptions = [];
      actionSubscriptions = [];
      pinia._s.delete($id);
    }
    function wrapAction(name, action) {
      return function() {
        setActivePinia(pinia);
        const args = Array.from(arguments);
        const afterCallbackList = [];
        const onErrorCallbackList = [];
        function after(callback) {
          afterCallbackList.push(callback);
        }
        function onError(callback) {
          onErrorCallbackList.push(callback);
        }
        triggerSubscriptions(actionSubscriptions, {
          args,
          name,
          store,
          after,
          onError
        });
        let ret;
        try {
          ret = action.apply(this && this.$id === $id ? this : store, args);
        } catch (error) {
          triggerSubscriptions(onErrorCallbackList, error);
          throw error;
        }
        if (ret instanceof Promise) {
          return ret.then((value) => {
            triggerSubscriptions(afterCallbackList, value);
            return value;
          }).catch((error) => {
            triggerSubscriptions(onErrorCallbackList, error);
            return Promise.reject(error);
          });
        }
        triggerSubscriptions(afterCallbackList, ret);
        return ret;
      };
    }
    const _hmrPayload = /* @__PURE__ */ vue.markRaw({
      actions: {},
      getters: {},
      state: [],
      hotState
    });
    const partialStore = {
      _p: pinia,
      // _s: scope,
      $id,
      $onAction: addSubscription.bind(null, actionSubscriptions),
      $patch,
      $reset,
      $subscribe(callback, options2 = {}) {
        const removeSubscription = addSubscription(subscriptions, callback, options2.detached, () => stopWatcher());
        const stopWatcher = scope.run(() => vue.watch(() => pinia.state.value[$id], (state2) => {
          if (options2.flush === "sync" ? isSyncListening : isListening) {
            callback({
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents
            }, state2);
          }
        }, assign({}, $subscribeOptions, options2)));
        return removeSubscription;
      },
      $dispose
    };
    const store = vue.reactive(assign(
      {
        _hmrPayload,
        _customProperties: vue.markRaw(/* @__PURE__ */ new Set())
        // devtools custom properties
      },
      partialStore
      // must be added later
      // setupStore
    ));
    pinia._s.set($id, store);
    const runWithContext = pinia._a && pinia._a.runWithContext || fallbackRunWithContext;
    const setupStore = runWithContext(() => pinia._e.run(() => (scope = vue.effectScope()).run(setup)));
    for (const key in setupStore) {
      const prop = setupStore[key];
      if (vue.isRef(prop) && !isComputed(prop) || vue.isReactive(prop)) {
        if (hot) {
          set$1(hotState.value, key, vue.toRef(setupStore, key));
        } else if (!isOptionsStore) {
          if (initialState && shouldHydrate(prop)) {
            if (vue.isRef(prop)) {
              prop.value = initialState[key];
            } else {
              mergeReactiveObjects(prop, initialState[key]);
            }
          }
          {
            pinia.state.value[$id][key] = prop;
          }
        }
        {
          _hmrPayload.state.push(key);
        }
      } else if (typeof prop === "function") {
        const actionValue = hot ? prop : wrapAction(key, prop);
        {
          setupStore[key] = actionValue;
        }
        {
          _hmrPayload.actions[key] = prop;
        }
        optionsForPlugin.actions[key] = prop;
      } else {
        if (isComputed(prop)) {
          _hmrPayload.getters[key] = isOptionsStore ? (
            // @ts-expect-error
            options.getters[key]
          ) : prop;
          if (IS_CLIENT) {
            const getters = setupStore._getters || // @ts-expect-error: same
            (setupStore._getters = vue.markRaw([]));
            getters.push(key);
          }
        }
      }
    }
    {
      assign(store, setupStore);
      assign(vue.toRaw(store), setupStore);
    }
    Object.defineProperty(store, "$state", {
      get: () => hot ? hotState.value : pinia.state.value[$id],
      set: (state2) => {
        if (hot) {
          throw new Error("cannot set hotState");
        }
        $patch(($state) => {
          assign($state, state2);
        });
      }
    });
    {
      store._hotUpdate = vue.markRaw((newStore) => {
        store._hotUpdating = true;
        newStore._hmrPayload.state.forEach((stateKey) => {
          if (stateKey in store.$state) {
            const newStateTarget = newStore.$state[stateKey];
            const oldStateSource = store.$state[stateKey];
            if (typeof newStateTarget === "object" && isPlainObject(newStateTarget) && isPlainObject(oldStateSource)) {
              patchObject(newStateTarget, oldStateSource);
            } else {
              newStore.$state[stateKey] = oldStateSource;
            }
          }
          set$1(store, stateKey, vue.toRef(newStore.$state, stateKey));
        });
        Object.keys(store.$state).forEach((stateKey) => {
          if (!(stateKey in newStore.$state)) {
            del(store, stateKey);
          }
        });
        isListening = false;
        isSyncListening = false;
        pinia.state.value[$id] = vue.toRef(newStore._hmrPayload, "hotState");
        isSyncListening = true;
        vue.nextTick().then(() => {
          isListening = true;
        });
        for (const actionName in newStore._hmrPayload.actions) {
          const action = newStore[actionName];
          set$1(store, actionName, wrapAction(actionName, action));
        }
        for (const getterName in newStore._hmrPayload.getters) {
          const getter = newStore._hmrPayload.getters[getterName];
          const getterValue = isOptionsStore ? (
            // special handling of options api
            vue.computed(() => {
              setActivePinia(pinia);
              return getter.call(store, store);
            })
          ) : getter;
          set$1(store, getterName, getterValue);
        }
        Object.keys(store._hmrPayload.getters).forEach((key) => {
          if (!(key in newStore._hmrPayload.getters)) {
            del(store, key);
          }
        });
        Object.keys(store._hmrPayload.actions).forEach((key) => {
          if (!(key in newStore._hmrPayload.actions)) {
            del(store, key);
          }
        });
        store._hmrPayload = newStore._hmrPayload;
        store._getters = newStore._getters;
        store._hotUpdating = false;
      });
    }
    if (USE_DEVTOOLS) {
      const nonEnumerable = {
        writable: true,
        configurable: true,
        // avoid warning on devtools trying to display this property
        enumerable: false
      };
      ["_p", "_hmrPayload", "_getters", "_customProperties"].forEach((p) => {
        Object.defineProperty(store, p, assign({ value: store[p] }, nonEnumerable));
      });
    }
    pinia._p.forEach((extender) => {
      if (USE_DEVTOOLS) {
        const extensions = scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        }));
        Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
        assign(store, extensions);
      } else {
        assign(store, scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        })));
      }
    });
    if (store.$state && typeof store.$state === "object" && typeof store.$state.constructor === "function" && !store.$state.constructor.toString().includes("[native code]")) {
      console.warn(`[🍍]: The "state" must be a plain object. It cannot be
	state: () => new MyClass()
Found in store "${store.$id}".`);
    }
    if (initialState && isOptionsStore && options.hydrate) {
      options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
  }
  function defineStore(idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === "function";
    if (typeof idOrOptions === "string") {
      id = idOrOptions;
      options = isSetupStore ? setupOptions : setup;
    } else {
      options = idOrOptions;
      id = idOrOptions.id;
      if (typeof id !== "string") {
        throw new Error(`[🍍]: "defineStore()" must be passed a store id as its first argument.`);
      }
    }
    function useStore(pinia, hot) {
      const hasContext = vue.hasInjectionContext();
      pinia = // in test mode, ignore the argument provided as we can always retrieve a
      // pinia instance with getActivePinia()
      pinia || (hasContext ? vue.inject(piniaSymbol, null) : null);
      if (pinia)
        setActivePinia(pinia);
      if (!activePinia) {
        throw new Error(`[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?
See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.
This will fail in production.`);
      }
      pinia = activePinia;
      if (!pinia._s.has(id)) {
        if (isSetupStore) {
          createSetupStore(id, setup, options, pinia);
        } else {
          createOptionsStore(id, options, pinia);
        }
        {
          useStore._pinia = pinia;
        }
      }
      const store = pinia._s.get(id);
      if (hot) {
        const hotId = "__hot:" + id;
        const newStore = isSetupStore ? createSetupStore(hotId, setup, options, pinia, true) : createOptionsStore(hotId, assign({}, options), pinia, true);
        hot._hotUpdate(newStore);
        delete pinia.state.value[hotId];
        pinia._s.delete(hotId);
      }
      if (IS_CLIENT) {
        const currentInstance = vue.getCurrentInstance();
        if (currentInstance && currentInstance.proxy && // avoid adding stores that are just built for hot module replacement
        !hot) {
          const vm = currentInstance.proxy;
          const cache2 = "_pStores" in vm ? vm._pStores : vm._pStores = {};
          cache2[id] = store;
        }
      }
      return store;
    }
    useStore.$id = id;
    return useStore;
  }
  const BASE_URL = "http://118.196.37.32:8081/api/v1";
  function request(options) {
    return new Promise((resolve, reject) => {
      const token = uni.getStorageSync("token");
      const fullUrl = BASE_URL + options.url;
      formatAppLog("log", "at utils/api.js:13", "========== API请求详情 ==========");
      formatAppLog("log", "at utils/api.js:14", "完整URL:", fullUrl);
      formatAppLog("log", "at utils/api.js:15", "请求方法:", options.method || "GET");
      formatAppLog("log", "at utils/api.js:16", "请求数据:", JSON.stringify(options.data || {}, null, 2));
      formatAppLog("log", "at utils/api.js:17", "请求头:", {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "无Token",
        ...options.header
      });
      formatAppLog("log", "at utils/api.js:22", "超时时间:", 1e4, "ms");
      formatAppLog("log", "at utils/api.js:23", "==================================");
      uni.request({
        url: fullUrl,
        method: options.method || "GET",
        data: options.data || {},
        header: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          ...options.header
        },
        timeout: 1e4,
        success: (res) => {
          formatAppLog("log", "at utils/api.js:36", "========== API响应详情 ==========");
          formatAppLog("log", "at utils/api.js:37", "请求URL:", fullUrl);
          formatAppLog("log", "at utils/api.js:38", "状态码:", res.statusCode);
          formatAppLog("log", "at utils/api.js:39", "响应数据:", JSON.stringify(res.data, null, 2));
          formatAppLog("log", "at utils/api.js:40", "==================================");
          if (res.statusCode === 401) {
            formatAppLog("warn", "at utils/api.js:44", "Token失效，清除登录信息");
            uni.removeStorageSync("token");
            uni.removeStorageSync("user");
            uni.reLaunch({
              url: "/pages/login/login"
            });
            reject(new Error("未授权"));
            return;
          }
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            formatAppLog("error", "at utils/api.js:57", "请求失败，状态码:", res.statusCode);
            reject(res.data || new Error("请求失败"));
          }
        },
        fail: (err) => {
          formatAppLog("error", "at utils/api.js:62", "========== API请求失败 ==========");
          formatAppLog("error", "at utils/api.js:63", "请求URL:", fullUrl);
          formatAppLog("error", "at utils/api.js:64", "错误信息:", err);
          formatAppLog("error", "at utils/api.js:65", "错误详情:", JSON.stringify(err, null, 2));
          formatAppLog("error", "at utils/api.js:66", "==================================");
          reject(err);
        }
      });
    });
  }
  const authAPI = {
    login: (username, password) => request({
      url: "/auth/login",
      method: "POST",
      data: { username, password }
    }),
    register: (username, password, nickname) => request({
      url: "/auth/register",
      method: "POST",
      data: { username, password, nickname }
    })
  };
  const userAPI = {
    getProfile: () => request({
      url: "/user/profile",
      method: "GET"
    }),
    updateProfile: (data) => request({
      url: "/user/profile",
      method: "PUT",
      data
    })
  };
  const matchAPI = {
    start: (data) => request({
      url: "/match/start",
      method: "POST",
      data
    }),
    cancel: () => request({
      url: "/match/cancel",
      method: "POST"
    }),
    status: () => request({
      url: "/match/status",
      method: "GET"
    })
  };
  const roomAPI = {
    create: (name) => request({
      url: "/rooms",
      method: "POST",
      data: { name }
    }),
    list: () => request({
      url: "/rooms",
      method: "GET"
    }),
    get: (id) => request({
      url: `/rooms/${id}`,
      method: "GET"
    }),
    join: (id) => request({
      url: `/rooms/${id}/join`,
      method: "POST"
    }),
    leave: (id) => request({
      url: `/rooms/${id}/leave`,
      method: "POST"
    })
  };
  const lobbyAPI = {
    get: () => request({
      url: "/lobby",
      method: "GET"
    })
  };
  const historyAPI = {
    list: () => request({
      url: "/history",
      method: "GET"
    }),
    get: (id) => request({
      url: `/history/${id}`,
      method: "GET"
    })
  };
  class WebSocketClient {
    constructor() {
      this.ws = null;
      this.url = "";
      this.listeners = {};
      this.reconnectTimer = null;
      this.connected = false;
      this.pendingMessages = [];
      this.manualClose = false;
      this.heartbeatTimer = null;
    }
    connect() {
      const token = uni.getStorageSync("token");
      if (!token) {
        formatAppLog("log", "at utils/websocket.js:17", "No token, skip WebSocket connection");
        return;
      }
      if (this.ws && this.connected) {
        formatAppLog("log", "at utils/websocket.js:22", "WebSocket already connected");
        return;
      }
      this.manualClose = false;
      this.url = `ws://118.196.37.32:8081/ws?token=${encodeURIComponent(token)}`;
      this.ws = uni.connectSocket({
        url: this.url,
        success: () => {
          formatAppLog("log", "at utils/websocket.js:37", "WebSocket connecting...");
        }
      });
      this.ws.onOpen(() => {
        formatAppLog("log", "at utils/websocket.js:42", "WebSocket connected");
        this.connected = true;
        this.flushPendingMessages();
        this.startHeartbeat();
        this.emit("connected");
      });
      this.ws.onMessage((res) => {
        try {
          const msg = JSON.parse(res.data);
          formatAppLog("log", "at utils/websocket.js:52", "WebSocket 收到消息:", msg.type, msg);
          this.emit(msg.type, msg.payload, msg);
          this.emit("message", msg);
        } catch (e) {
          formatAppLog("error", "at utils/websocket.js:56", "WS parse error:", e);
        }
      });
      this.ws.onClose(() => {
        formatAppLog("log", "at utils/websocket.js:61", "WebSocket closed");
        this.connected = false;
        this.stopHeartbeat();
        this.emit("disconnected");
        if (!this.manualClose && uni.getStorageSync("token")) {
          this.scheduleReconnect();
        }
      });
      this.ws.onError((err) => {
        formatAppLog("error", "at utils/websocket.js:72", "WebSocket error:", err);
      });
    }
    scheduleReconnect() {
      if (this.reconnectTimer)
        return;
      formatAppLog("log", "at utils/websocket.js:79", "Schedule reconnect in 3s...");
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3e3);
    }
    send(type, payload = {}) {
      const message = JSON.stringify({ type, payload });
      if (this.connected && this.ws) {
        uni.sendSocketMessage({
          data: message,
          success: () => {
            formatAppLog("log", "at utils/websocket.js:93", "Message sent:", type);
          },
          fail: (err) => {
            formatAppLog("error", "at utils/websocket.js:96", "Send message failed:", err);
            this.pendingMessages.push(message);
          }
        });
      } else {
        formatAppLog("log", "at utils/websocket.js:101", "Not connected, queue message:", type);
        this.pendingMessages.push(message);
        this.connect();
      }
    }
    flushPendingMessages() {
      formatAppLog("log", "at utils/websocket.js:108", "Flush pending messages:", this.pendingMessages.length);
      while (this.pendingMessages.length > 0 && this.connected) {
        const message = this.pendingMessages.shift();
        uni.sendSocketMessage({
          data: message
        });
      }
    }
    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    }
    off(event, callback) {
      if (!this.listeners[event])
        return;
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    }
    emit(event, ...args) {
      if (!this.listeners[event])
        return;
      this.listeners[event].forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          formatAppLog("error", "at utils/websocket.js:137", "Listener error:", e);
        }
      });
    }
    disconnect() {
      formatAppLog("log", "at utils/websocket.js:143", "Manual disconnect");
      this.manualClose = true;
      this.pendingMessages = [];
      this.stopHeartbeat();
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.ws) {
        uni.closeSocket();
        this.ws = null;
      }
      this.connected = false;
    }
    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.connected) {
          this.send("PING", {});
        }
      }, 3e4);
    }
    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }
  }
  const wsClient = new WebSocketClient();
  const useAuthStore = defineStore("auth", () => {
    const token = vue.ref(uni.getStorageSync("token") || "");
    const user = vue.ref(null);
    const userStr = uni.getStorageSync("user");
    if (userStr && typeof userStr === "string") {
      try {
        user.value = JSON.parse(userStr);
      } catch (e) {
        formatAppLog("error", "at stores/auth.js:16", "Parse user error:", e);
        uni.removeStorageSync("user");
      }
    } else if (userStr && typeof userStr === "object") {
      user.value = userStr;
    }
    const isLoggedIn = vue.computed(() => !!token.value);
    async function login(username, password) {
      const res = await authAPI.login(username.trim(), password);
      token.value = res.token;
      user.value = res.user;
      uni.setStorageSync("token", res.token);
      uni.setStorageSync("user", JSON.stringify(res.user));
      wsClient.connect();
      return res;
    }
    async function register(username, password, nickname) {
      return await authAPI.register(username.trim(), password, nickname.trim());
    }
    function logout() {
      token.value = "";
      user.value = null;
      uni.removeStorageSync("token");
      uni.removeStorageSync("user");
      wsClient.disconnect();
    }
    function updateUser(userData) {
      user.value = { ...user.value, ...userData };
      uni.setStorageSync("user", JSON.stringify(user.value));
    }
    return {
      token,
      user,
      isLoggedIn,
      login,
      register,
      logout,
      updateUser
    };
  });
  const auth = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    useAuthStore
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$c = {
    __name: "register",
    setup(__props) {
      const authStore = useAuthStore();
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
        formatAppLog("log", "at pages/register/register.vue:69", "已设置横屏模式");
      }
      vue.onMounted(() => {
        formatAppLog("log", "at pages/register/register.vue:75", "=== 注册页面加载 ===");
        setLandscape();
        playBgm("login");
      });
      vue.onActivated(() => {
        formatAppLog("log", "at pages/register/register.vue:82", "=== 注册页面显示 ===");
        setLandscape();
        playBgm("login");
      });
      const username = vue.ref("");
      const nickname = vue.ref("");
      const password = vue.ref("");
      const confirmPassword = vue.ref("");
      const loading = vue.ref(false);
      const toast = vue.ref({ show: false, msg: "", type: "error" });
      function showToast(msg, type = "error") {
        toast.value = { show: true, msg, type };
      }
      async function handleRegister() {
        var _a, _b;
        playSfx("uiClick");
        if (loading.value) {
          formatAppLog("warn", "at pages/register/register.vue:102", "正在注册中，请勿重复点击");
          return;
        }
        formatAppLog("log", "at pages/register/register.vue:106", "=== 开始注册流程 ===");
        formatAppLog("log", "at pages/register/register.vue:107", "表单数据:", {
          username: username.value,
          nickname: nickname.value,
          passwordLength: password.value.length,
          confirmPasswordLength: confirmPassword.value.length
        });
        if (!username.value.trim() || !nickname.value.trim() || !password.value || !confirmPassword.value) {
          formatAppLog("warn", "at pages/register/register.vue:116", "验证失败: 信息不完整");
          showToast("请填写完整信息");
          return;
        }
        if (password.value !== confirmPassword.value) {
          formatAppLog("warn", "at pages/register/register.vue:123", "验证失败: 两次密码不一致");
          showToast("两次密码输入不一致");
          return;
        }
        if (password.value.length < 6) {
          formatAppLog("warn", "at pages/register/register.vue:130", "验证失败: 密码长度不足");
          showToast("密码长度至少6位");
          return;
        }
        formatAppLog("log", "at pages/register/register.vue:135", "表单验证通过，准备调用API");
        loading.value = true;
        uni.showLoading({
          title: "注册中...",
          mask: true
        });
        try {
          formatAppLog("log", "at pages/register/register.vue:145", "调用注册API...");
          const result = await authStore.register(username.value, password.value, nickname.value);
          formatAppLog("log", "at pages/register/register.vue:147", "注册API响应:", result);
          uni.hideLoading();
          formatAppLog("log", "at pages/register/register.vue:152", "注册成功，准备自动登录");
          await authStore.login(username.value, password.value);
          showToast("注册成功", "success");
          formatAppLog("log", "at pages/register/register.vue:156", "注册成功，1秒后播放开场动画");
          setTimeout(() => {
            formatAppLog("log", "at pages/register/register.vue:159", "跳转到开场动画");
            uni.reLaunch({
              url: "/pages/cg/cg"
            });
          }, 1e3);
        } catch (e) {
          formatAppLog("error", "at pages/register/register.vue:165", "注册失败:", e);
          formatAppLog("error", "at pages/register/register.vue:166", "错误详情:", {
            response: e.response,
            message: e.message,
            stack: e.stack
          });
          uni.hideLoading();
          const msg = ((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.msg) || e.message || "注册失败，请稍后重试";
          formatAppLog("log", "at pages/register/register.vue:176", "显示错误提示:", msg);
          showToast(msg);
        } finally {
          loading.value = false;
          formatAppLog("log", "at pages/register/register.vue:180", "=== 注册流程结束 ===");
        }
      }
      function goLogin() {
        playSfx("uiClick");
        uni.navigateBack();
      }
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "register-container" }, [
          vue.createElementVNode("image", {
            class: "background-image",
            src: "/static/images/register.png",
            mode: "aspectFill"
          }),
          vue.createCommentVNode(" 交互层 "),
          vue.createElementVNode("view", { class: "interactive-layer" }, [
            vue.createElementVNode("view", { class: "content-wrapper" }, [
              vue.createCommentVNode(" 标题区域 "),
              vue.createElementVNode("view", { class: "title-section" }, [
                vue.createElementVNode("text", { class: "title-main" }, "注册账号"),
                vue.createElementVNode("text", { class: "title-sub" }, "JOIN LIAR'S BAR")
              ]),
              vue.createCommentVNode(" 表单区域 "),
              vue.createElementVNode("view", { class: "form-section" }, [
                vue.createCommentVNode(" 用户名输入框 "),
                vue.createElementVNode("view", { class: "input-group" }, [
                  vue.createElementVNode("text", { class: "input-label" }, "用户名"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "input-field",
                      type: "text",
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => username.value = $event),
                      placeholder: "请输入用户名"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, username.value]
                  ])
                ]),
                vue.createCommentVNode(" 昵称输入框 "),
                vue.createElementVNode("view", { class: "input-group" }, [
                  vue.createElementVNode("text", { class: "input-label" }, "昵称"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "input-field",
                      type: "text",
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => nickname.value = $event),
                      placeholder: "请输入昵称"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, nickname.value]
                  ])
                ]),
                vue.createCommentVNode(" 密码输入框 "),
                vue.createElementVNode("view", { class: "input-group" }, [
                  vue.createElementVNode("text", { class: "input-label" }, "密码"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "input-field",
                      type: "password",
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => password.value = $event),
                      placeholder: "请输入密码（至少6位）"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, password.value]
                  ])
                ]),
                vue.createCommentVNode(" 确认密码输入框 "),
                vue.createElementVNode("view", { class: "input-group full-width" }, [
                  vue.createElementVNode("text", { class: "input-label" }, "确认密码"),
                  vue.withDirectives(vue.createElementVNode(
                    "input",
                    {
                      class: "input-field",
                      type: "password",
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => confirmPassword.value = $event),
                      placeholder: "请再次输入密码"
                    },
                    null,
                    512
                    /* NEED_PATCH */
                  ), [
                    [vue.vModelText, confirmPassword.value]
                  ])
                ]),
                vue.createCommentVNode(" 注册按钮 "),
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["register-button full-width", { disabled: loading.value }]),
                    onClick: handleRegister
                  },
                  vue.toDisplayString(loading.value ? "注册中..." : "立即注册"),
                  3
                  /* TEXT, CLASS */
                ),
                vue.createCommentVNode(" 返回登录 "),
                vue.createElementVNode("view", {
                  class: "back-login full-width",
                  onClick: goLogin
                }, [
                  vue.createElementVNode("text", { class: "back-text" }, "已有账号？返回登录")
                ])
              ])
            ])
          ]),
          vue.createCommentVNode(" Toast 提示 "),
          vue.createVNode(Toast, {
            visible: toast.value.show,
            "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => toast.value.show = $event),
            message: toast.value.msg,
            type: toast.value.type
          }, null, 8, ["visible", "message", "type"])
        ]);
      };
    }
  };
  const PagesRegisterRegister = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["__scopeId", "data-v-bac4a35d"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/register/register.vue"]]);
  const _sfc_main$b = {
    __name: "cg",
    setup(__props) {
      let fallbackTimer = null;
      let leaving = false;
      function enterLobby(playSkipSound = false) {
        if (leaving)
          return;
        leaving = true;
        if (playSkipSound)
          playSfx("uiClick");
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        uni.reLaunch({
          url: "/pages/lobby/lobby"
        });
      }
      function handleVideoError(err) {
        formatAppLog("error", "at pages/cg/cg.vue:47", "CG 视频播放失败:", err);
        enterLobby();
      }
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
      }
      vue.onMounted(() => {
        setLandscape();
        stopBgm();
        fallbackTimer = setTimeout(() => {
          enterLobby();
        }, 12e4);
      });
      vue.onUnmounted(() => {
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
      });
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "cg-page" }, [
          vue.createElementVNode(
            "video",
            {
              id: "introCg",
              class: "cg-video",
              src: "/static/videos/cg.mp4",
              autoplay: "",
              controls: false,
              "show-center-play-btn": false,
              "show-fullscreen-btn": false,
              "show-play-btn": false,
              "enable-progress-gesture": false,
              "object-fit": "cover",
              onEnded: enterLobby,
              onError: handleVideoError
            },
            null,
            32
            /* NEED_HYDRATION */
          ),
          vue.createElementVNode("view", { class: "cg-overlay" }, [
            vue.createElementVNode("button", {
              class: "skip-btn",
              onClick: _cache[0] || (_cache[0] = ($event) => enterLobby(true))
            }, "跳过")
          ])
        ]);
      };
    }
  };
  const PagesCgCg = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["__scopeId", "data-v-374e0a6a"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/cg/cg.vue"]]);
  const _sfc_main$a = {
    __name: "Modal",
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      title: {
        type: String,
        default: ""
      },
      width: {
        type: String,
        default: "600rpx"
      },
      showClose: {
        type: Boolean,
        default: true
      },
      showFooter: {
        type: Boolean,
        default: true
      },
      showCancel: {
        type: Boolean,
        default: true
      },
      confirmText: {
        type: String,
        default: "确定"
      },
      cancelText: {
        type: String,
        default: "取消"
      },
      closeOnClickOverlay: {
        type: Boolean,
        default: true
      }
    },
    emits: ["update:visible", "confirm", "cancel", "close"],
    setup(__props, { emit: __emit }) {
      const props = __props;
      const emit = __emit;
      function handleClose() {
        emit("update:visible", false);
        emit("close");
      }
      function handleConfirm() {
        emit("confirm");
      }
      function handleCancel() {
        emit("update:visible", false);
        emit("cancel");
      }
      function handleOverlayClick() {
        if (props.closeOnClickOverlay) {
          handleClose();
        }
      }
      return (_ctx, _cache) => {
        return __props.visible ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "modal-overlay",
          onClick: handleOverlayClick
        }, [
          vue.createElementVNode(
            "view",
            {
              class: "modal-container",
              style: vue.normalizeStyle({ width: __props.width }),
              onClick: _cache[0] || (_cache[0] = vue.withModifiers(() => {
              }, ["stop"]))
            },
            [
              __props.title ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "modal-header"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "modal-title" },
                  vue.toDisplayString(__props.title),
                  1
                  /* TEXT */
                ),
                __props.showClose ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 0,
                  class: "modal-close",
                  onClick: handleClose
                }, "×")) : vue.createCommentVNode("v-if", true)
              ])) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("view", { class: "modal-body" }, [
                vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
              ]),
              __props.showFooter ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "modal-footer"
              }, [
                vue.renderSlot(_ctx.$slots, "footer", {}, () => [
                  __props.showCancel ? (vue.openBlock(), vue.createElementBlock(
                    "button",
                    {
                      key: 0,
                      class: "modal-btn cancel-btn",
                      onClick: handleCancel
                    },
                    vue.toDisplayString(__props.cancelText),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true),
                  vue.createElementVNode(
                    "button",
                    {
                      class: "modal-btn confirm-btn",
                      onClick: handleConfirm
                    },
                    vue.toDisplayString(__props.confirmText),
                    1
                    /* TEXT */
                  )
                ], true)
              ])) : vue.createCommentVNode("v-if", true)
            ],
            4
            /* STYLE */
          )
        ])) : vue.createCommentVNode("v-if", true);
      };
    }
  };
  const Modal = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["__scopeId", "data-v-0b5a066a"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/components/Modal.vue"]]);
  const _sfc_main$9 = {
    __name: "RulesModal",
    props: {
      visible: {
        type: Boolean,
        default: false
      }
    },
    emits: ["update:visible"],
    setup(__props) {
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createBlock(Modal, {
          visible: __props.visible,
          title: "📖 骗子酒馆 规则",
          "show-footer": false,
          "show-close": true,
          width: "90%",
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => _ctx.$emit("update:visible", $event))
        }, {
          default: vue.withCtx(() => [
            vue.createElementVNode("view", { class: "rules-body" }, [
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "目标"),
                vue.createElementVNode("text", { class: "rules-text" }, "4 人对战，通过出牌、撒谎、质疑和心理博弈，成为最后存活的玩家。")
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "牌组"),
                vue.createElementVNode("text", { class: "rules-text" }, "A / K / Q / J 各 6 张，共 24 张。每人发 6 张。")
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "目标牌"),
                vue.createElementVNode("text", { class: "rules-text" }, "每一轮有指定目标牌（A→K→Q→J 循环）。出牌时必须声明打出的全部是当前目标牌。")
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "出牌"),
                vue.createElementVNode("text", { class: "rules-text" }, "当前回合玩家选 1~3 张手牌打出。可以真出（全是目标牌），也可以虚张声势（含非目标牌）。其他玩家只能看到声明，看不到真实牌面。")
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "质疑"),
                vue.createElementVNode("text", { class: "rules-text" }, "下一名玩家可选择质疑上家。系统翻开上家刚打出的牌："),
                vue.createElementVNode("view", { class: "rules-list" }, [
                  vue.createElementVNode("text", { class: "rules-item" }, "• 含非目标牌（撒谎）→ 质疑成功，撒谎者受罚"),
                  vue.createElementVNode("text", { class: "rules-item" }, "• 全是目标牌（说真话）→ 质疑失败，质疑者受罚")
                ])
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "俄罗斯轮盘惩罚"),
                vue.createElementVNode("text", { class: "rules-text" }, "每次受罚累计子弹数：第 1 次 1 发，第 2 次 2 发……第 6 次必死。被击中即淘汰出局，存活则继续。")
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "手牌耗尽"),
                vue.createElementVNode("text", { class: "rules-text" }, "所有存活玩家手牌为空时，重新洗牌发牌，目标牌切换到下一种。")
              ]),
              vue.createElementVNode("view", { class: "rules-section" }, [
                vue.createElementVNode("text", { class: "rules-title" }, "操作"),
                vue.createElementVNode("view", { class: "rules-list" }, [
                  vue.createElementVNode("text", { class: "rules-item" }, [
                    vue.createElementVNode("text", { class: "highlight" }, "出牌"),
                    vue.createTextVNode("：选 1~3 张牌，点击「出牌」")
                  ]),
                  vue.createElementVNode("text", { class: "rules-item" }, [
                    vue.createElementVNode("text", { class: "highlight" }, "质疑上家"),
                    vue.createTextVNode("：仅当上家有出牌时可点")
                  ]),
                  vue.createElementVNode("text", { class: "rules-item" }, [
                    vue.createElementVNode("text", { class: "highlight" }, "过"),
                    vue.createTextVNode("：不质疑，交由下家")
                  ])
                ])
              ])
            ])
          ]),
          _: 1
          /* STABLE */
        }, 8, ["visible"]);
      };
    }
  };
  const RulesModal = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["__scopeId", "data-v-e3a2cddd"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/components/RulesModal.vue"]]);
  const _sfc_main$8 = {
    __name: "InputDialog",
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      title: {
        type: String,
        default: "请输入"
      },
      placeholder: {
        type: String,
        default: ""
      },
      confirmText: {
        type: String,
        default: "确定"
      },
      cancelText: {
        type: String,
        default: "取消"
      },
      maxlength: {
        type: Number,
        default: 50
      },
      defaultValue: {
        type: String,
        default: ""
      }
    },
    emits: ["confirm", "cancel", "update:visible"],
    setup(__props, { emit: __emit }) {
      const props = __props;
      const emit = __emit;
      const inputValue = vue.ref("");
      vue.watch(() => props.visible, (newVal) => {
        if (newVal) {
          inputValue.value = props.defaultValue;
        }
      });
      function handleConfirm() {
        if (!inputValue.value.trim()) {
          return;
        }
        emit("confirm", inputValue.value.trim());
        emit("update:visible", false);
        inputValue.value = "";
      }
      function handleCancel() {
        emit("cancel");
        emit("update:visible", false);
        inputValue.value = "";
      }
      return (_ctx, _cache) => {
        return __props.visible ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "input-overlay",
          onClick: vue.withModifiers(handleCancel, ["self"])
        }, [
          vue.createElementVNode("view", { class: "input-modal" }, [
            vue.createElementVNode(
              "text",
              { class: "input-title" },
              vue.toDisplayString(__props.title),
              1
              /* TEXT */
            ),
            vue.withDirectives(vue.createElementVNode("input", {
              class: "input-field",
              type: "text",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => inputValue.value = $event),
              placeholder: __props.placeholder,
              maxlength: __props.maxlength,
              onConfirm: handleConfirm
            }, null, 40, ["placeholder", "maxlength"]), [
              [vue.vModelText, inputValue.value]
            ]),
            vue.createElementVNode("view", { class: "input-buttons" }, [
              vue.createElementVNode(
                "button",
                {
                  class: "input-btn cancel-btn",
                  onClick: handleCancel
                },
                vue.toDisplayString(__props.cancelText),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "button",
                {
                  class: "input-btn confirm-btn-primary",
                  onClick: handleConfirm
                },
                vue.toDisplayString(__props.confirmText),
                1
                /* TEXT */
              )
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true);
      };
    }
  };
  const InputDialog = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["__scopeId", "data-v-5e7c36ea"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/components/InputDialog.vue"]]);
  const _sfc_main$7 = {
    __name: "ConfirmDialog",
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      title: {
        type: String,
        default: "提示"
      },
      content: {
        type: String,
        default: ""
      },
      confirmText: {
        type: String,
        default: "确定"
      },
      cancelText: {
        type: String,
        default: "取消"
      }
    },
    emits: ["confirm", "cancel", "update:visible"],
    setup(__props, { emit: __emit }) {
      const emit = __emit;
      function handleConfirm() {
        emit("confirm");
        emit("update:visible", false);
      }
      function handleCancel() {
        emit("cancel");
        emit("update:visible", false);
      }
      return (_ctx, _cache) => {
        return __props.visible ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "confirm-overlay",
          onClick: vue.withModifiers(handleCancel, ["self"])
        }, [
          vue.createElementVNode("view", { class: "confirm-modal" }, [
            vue.createElementVNode(
              "text",
              { class: "confirm-title" },
              vue.toDisplayString(__props.title),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              { class: "confirm-content" },
              vue.toDisplayString(__props.content),
              1
              /* TEXT */
            ),
            vue.createElementVNode("view", { class: "confirm-buttons" }, [
              vue.createElementVNode(
                "button",
                {
                  class: "confirm-btn cancel-btn",
                  onClick: handleCancel
                },
                vue.toDisplayString(__props.cancelText),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "button",
                {
                  class: "confirm-btn confirm-btn-primary",
                  onClick: handleConfirm
                },
                vue.toDisplayString(__props.confirmText),
                1
                /* TEXT */
              )
            ])
          ])
        ])) : vue.createCommentVNode("v-if", true);
      };
    }
  };
  const ConfirmDialog = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-a8d7f3de"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/components/ConfirmDialog.vue"]]);
  const _sfc_main$6 = {
    __name: "lobby",
    setup(__props) {
      const authStore = useAuthStore();
      const lobbyData = vue.ref({ online_count: 0, active_rooms: [] });
      const rooms = vue.ref([]);
      const showRules = vue.ref(false);
      const showRoomList = vue.ref(false);
      const showSettings = vue.ref(false);
      const loading = vue.ref(false);
      const toast = vue.ref({ show: false, msg: "", type: "error" });
      const audioSettings = vue.ref(getAudioSettings());
      const volumeItems = [
        { key: "master", label: "主音量" },
        { key: "bgm", label: "背景音乐" },
        { key: "sfx", label: "音效" }
      ];
      const createRoomDialog = vue.ref({
        show: false,
        title: "创建房间",
        placeholder: "请输入房间名称"
      });
      const logoutDialog = vue.ref({
        show: false,
        title: "退出登录",
        content: "确定要退出吗？"
      });
      let pollTimer = null;
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
        formatAppLog("log", "at pages/lobby/lobby.vue:308", "已设置横屏模式");
      }
      vue.onMounted(() => {
        formatAppLog("log", "at pages/lobby/lobby.vue:313", "=== 大厅页面加载 ===");
        setLandscape();
        playBgm("lobby");
        if (!authStore.isLoggedIn) {
          uni.reLaunch({
            url: "/pages/login/login"
          });
          return;
        }
        wsClient.connect();
        fetchLobby();
      });
      vue.onActivated(() => {
        formatAppLog("log", "at pages/lobby/lobby.vue:334", "=== 大厅页面显示 ===");
        setLandscape();
        playBgm("lobby");
      });
      onShow(() => {
        formatAppLog("log", "at pages/lobby/lobby.vue:341", "=== 大厅页面 onShow ===");
        playBgm("lobby");
        if (!wsClient.connected) {
          formatAppLog("log", "at pages/lobby/lobby.vue:346", "WebSocket 未连接,尝试重连...");
          wsClient.connect();
        }
        fetchLobby();
        if (showRoomList.value) {
          fetchRooms();
        }
      });
      onHide(() => {
        formatAppLog("log", "at pages/lobby/lobby.vue:359", "=== 大厅页面 onHide ===");
        stopRoomPolling();
      });
      vue.onUnmounted(() => {
        formatAppLog("log", "at pages/lobby/lobby.vue:364", "=== 大厅页面卸载 ===");
        stopRoomPolling();
      });
      async function fetchLobby() {
        try {
          const res = await lobbyAPI.get();
          lobbyData.value = res.data || {};
        } catch (e) {
          formatAppLog("error", "at pages/lobby/lobby.vue:373", "Fetch lobby error:", e);
        }
      }
      async function fetchRooms() {
        var _a, _b;
        try {
          const res = await roomAPI.list();
          rooms.value = ((_a = res.data) == null ? void 0 : _a.rooms) || ((_b = res.data) == null ? void 0 : _b.active_rooms) || res.data || [];
          formatAppLog("log", "at pages/lobby/lobby.vue:381", "房间列表:", rooms.value);
        } catch (e) {
          formatAppLog("error", "at pages/lobby/lobby.vue:383", "获取房间列表失败:", e);
          showToast("获取房间列表失败", "error");
        }
      }
      function showToast(msg, type = "error") {
        toast.value = { show: true, msg, type };
      }
      function startGameWithCharacter() {
        playSfx("uiClick");
        uni.navigateTo({
          url: "/pages/character-select/character-select"
        });
      }
      function showCreateRoomDialog() {
        playSfx("uiClick");
        createRoomDialog.value.show = true;
      }
      async function handleCreateRoom(roomName) {
        var _a, _b, _c, _d;
        loading.value = true;
        try {
          const result = await roomAPI.create(roomName);
          const roomId = ((_a = result.data) == null ? void 0 : _a.id) || ((_b = result.data) == null ? void 0 : _b.room_id);
          if (roomId) {
            showToast("房间创建成功", "success");
            stopRoomPolling();
            uni.navigateTo({
              url: `/pages/game-room/game-room?id=${roomId}`
            });
          }
        } catch (e) {
          showToast(((_d = (_c = e.response) == null ? void 0 : _c.data) == null ? void 0 : _d.msg) || "创建房间失败", "error");
        } finally {
          loading.value = false;
        }
      }
      function showRoomListView() {
        playSfx("uiClick");
        showRoomList.value = true;
        fetchRooms();
        startRoomPolling();
      }
      function closeRoomList() {
        playSfx("uiClick");
        showRoomList.value = false;
        stopRoomPolling();
      }
      function startRoomPolling() {
        stopRoomPolling();
        pollTimer = setInterval(() => {
          if (showRoomList.value) {
            fetchRooms();
          }
        }, 3e3);
      }
      function stopRoomPolling() {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
      function canJoinRoom(room) {
        if (typeof room.can_join === "boolean") {
          return room.can_join;
        }
        return getRoomPhase(room) === "WAITING" && getRoomPlayerCount(room) < getRoomMaxPlayers(room);
      }
      function getRoomStatusClass(room) {
        switch (getRoomPhase(room)) {
          case "WAITING":
            return "status-waiting";
          case "PLAYING":
          case "CHALLENGE":
            return "status-playing";
          case "FINISHED":
          case "GAME_OVER":
            return "status-finished";
          default:
            return "";
        }
      }
      function getRoomStatusText(room) {
        switch (getRoomPhase(room)) {
          case "WAITING":
            return "等待中";
          case "PLAYING":
            return "游戏中";
          case "CHALLENGE":
            return "质疑中";
          case "FINISHED":
          case "GAME_OVER":
            return "已结束";
          default:
            return "未知";
        }
      }
      function getJoinDisabledReason(room) {
        const phase = getRoomPhase(room);
        if (phase === "PLAYING" || phase === "CHALLENGE") {
          return "游戏进行中";
        }
        if (phase === "FINISHED" || phase === "GAME_OVER") {
          return "游戏已结束";
        }
        if (getRoomPlayerCount(room) >= getRoomMaxPlayers(room)) {
          return "房间已满";
        }
        return "无法加入";
      }
      function getRoomName(room) {
        return room.room_name || room.name || `房间 ${room.id || room.room_id}`;
      }
      function getRoomPhase(room) {
        return room.status || room.phase || "WAITING";
      }
      function getRoomPlayerCount(room) {
        if (typeof room.current_players === "number")
          return room.current_players;
        if (typeof room.players === "number")
          return room.players;
        if (Array.isArray(room.players))
          return room.players.length;
        if (typeof room.player_count === "number")
          return room.player_count;
        return 0;
      }
      function getRoomMaxPlayers(room) {
        return room.max_players || 4;
      }
      function getRoomOwnerText(room) {
        if (room.creator_id)
          return `ID ${room.creator_id}`;
        if (room.owner_id)
          return `ID ${room.owner_id}`;
        if (room.human_count !== void 0)
          return `${room.human_count} 人`;
        return "-";
      }
      function goProfile() {
        playSfx("uiClick");
        uni.navigateTo({
          url: "/pages/profile/profile"
        });
      }
      function goSettings() {
        playSfx("uiClick");
        audioSettings.value = getAudioSettings();
        showSettings.value = true;
      }
      function closeSettings() {
        playSfx("uiClick");
        showSettings.value = false;
      }
      function updateVolume(key, event) {
        var _a, _b;
        const value = ((_a = event.detail) == null ? void 0 : _a.value) ?? ((_b = event.target) == null ? void 0 : _b.value) ?? 0;
        audioSettings.value = setAudioSetting(key, value);
      }
      function handleLogout() {
        playSfx("uiClick");
        logoutDialog.value.show = true;
      }
      function confirmLogout() {
        authStore.logout();
        uni.reLaunch({
          url: "/pages/login/login"
        });
      }
      async function handleJoinRoom(room) {
        var _a, _b;
        playSfx("uiClick");
        if (!canJoinRoom(room))
          return;
        loading.value = true;
        try {
          const roomId = room.id || room.room_id;
          await roomAPI.join(roomId);
          showToast("加入房间成功", "success");
          stopRoomPolling();
          uni.navigateTo({
            url: `/pages/game-room/game-room?id=${roomId}`
          });
        } catch (e) {
          showToast(((_b = (_a = e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.msg) || "加入房间失败", "error");
        } finally {
          loading.value = false;
        }
      }
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "lobby" }, [
          vue.createCommentVNode(" 左上角在线人数面板 "),
          vue.createElementVNode("view", { class: "online-panel" }, [
            vue.createElementVNode("text", { class: "online-icon iconfont" }, ""),
            vue.createElementVNode("text", { class: "online-label" }, "在线人数"),
            vue.createElementVNode(
              "text",
              { class: "online-count" },
              vue.toDisplayString(lobbyData.value.online_count || 0),
              1
              /* TEXT */
            )
          ]),
          vue.createCommentVNode(" 右上角功能按钮组 "),
          vue.createElementVNode("view", { class: "top-right-buttons" }, [
            vue.createElementVNode("view", {
              class: "func-button",
              onClick: goSettings
            }, [
              vue.createElementVNode("text", { class: "func-icon iconfont" }, ""),
              vue.createElementVNode("text", { class: "func-label" }, "设置")
            ]),
            vue.createElementVNode("view", {
              class: "func-button",
              onClick: goProfile
            }, [
              vue.createElementVNode("text", { class: "func-icon iconfont" }, ""),
              vue.createElementVNode("text", { class: "func-label" }, "用户中心")
            ]),
            vue.createElementVNode("view", {
              class: "func-button",
              onClick: handleLogout
            }, [
              vue.createElementVNode("text", { class: "func-icon iconfont" }, ""),
              vue.createElementVNode("text", { class: "func-label" }, "退出")
            ])
          ]),
          vue.createCommentVNode(" 左侧游戏规则面板 "),
          vue.createElementVNode("view", {
            class: "rules-panel",
            onClick: _cache[0] || (_cache[0] = ($event) => showRules.value = true)
          }, [
            vue.createElementVNode("text", { class: "rules-title" }, "游戏规则"),
            vue.createElementVNode("image", {
              src: "/static/images/puke.png",
              mode: "scaleToFill"
            }),
            vue.createElementVNode("text", { class: "rules-hint" }, "点击查看")
          ]),
          vue.createCommentVNode(" 底部操作按钮区 "),
          vue.createElementVNode("view", { class: "bottom-actions" }, [
            vue.createCommentVNode(" 左侧三个按钮：双层嵌套结构 "),
            vue.createElementVNode("view", {
              class: "action-button-outer",
              onClick: showCreateRoomDialog
            }, [
              vue.createElementVNode("view", { class: "action-button-inner" }, [
                vue.createElementVNode("text", { class: "action-icon iconfont" }, ""),
                vue.createElementVNode("view", { class: "action-texts" }, [
                  vue.createElementVNode("text", { class: "action-title" }, "创建房间"),
                  vue.createElementVNode("text", { class: "action-subtitle" }, "创建私人房间")
                ])
              ])
            ]),
            vue.createElementVNode("view", {
              class: "action-button-outer",
              onClick: showRoomListView
            }, [
              vue.createElementVNode("view", { class: "action-button-inner" }, [
                vue.createElementVNode("text", { class: "action-icon iconfont" }, ""),
                vue.createElementVNode("view", { class: "action-texts" }, [
                  vue.createElementVNode("text", { class: "action-title" }, "查看房间"),
                  vue.createElementVNode("text", { class: "action-subtitle" }, "浏览可加入的房间")
                ])
              ])
            ]),
            vue.createElementVNode("view", { style: { "width": "180px" } }),
            vue.createCommentVNode(' <view class="action-button-inner">\n          <image class="action-icon-img" src="../../static/images/puke1.png" mode="aspectFit" />\n          <view class="action-texts">\n            <text class="action-title">快速匹配</text>\n            <text class="action-subtitle">随机加入一场游戏</text>\n          </view>\n        </view> '),
            vue.createCommentVNode(" 右侧开始游戏按钮：双层嵌套结构 "),
            vue.createElementVNode("view", {
              class: "start-button-outer",
              onClick: startGameWithCharacter
            }, [
              vue.createElementVNode("view", { class: "start-button-inner" }, [
                vue.createElementVNode("text", { class: "start-title" }, "开始游戏"),
                vue.createElementVNode("text", { class: "start-subtitle" }, [
                  vue.createElementVNode("span", { class: "dash" }, "——"),
                  vue.createTextVNode(" 选择你的命运 "),
                  vue.createElementVNode("span", { class: "dash" }, "——")
                ])
              ])
            ])
          ]),
          vue.createCommentVNode(" 组件 "),
          vue.createVNode(Toast, {
            visible: toast.value.show,
            message: toast.value.msg,
            type: toast.value.type,
            "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => toast.value.show = false)
          }, null, 8, ["visible", "message", "type"]),
          loading.value ? (vue.openBlock(), vue.createBlock(Loading, { key: 0 })) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 退出登录确认对话框 "),
          vue.createVNode(ConfirmDialog, {
            visible: logoutDialog.value.show,
            "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => logoutDialog.value.show = $event),
            title: logoutDialog.value.title,
            content: logoutDialog.value.content,
            onConfirm: confirmLogout
          }, null, 8, ["visible", "title", "content"]),
          vue.createCommentVNode(" 创建房间输入对话框 "),
          vue.createVNode(InputDialog, {
            visible: createRoomDialog.value.show,
            "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => createRoomDialog.value.show = $event),
            title: createRoomDialog.value.title,
            placeholder: createRoomDialog.value.placeholder,
            onConfirm: handleCreateRoom
          }, null, 8, ["visible", "title", "placeholder"]),
          vue.createCommentVNode(" 房间列表查看界面 "),
          showRoomList.value ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "room-list-overlay",
            onClick: vue.withModifiers(closeRoomList, ["self"])
          }, [
            vue.createElementVNode("view", { class: "room-list-modal" }, [
              vue.createElementVNode("view", { class: "room-list-header" }, [
                vue.createElementVNode("text", { class: "room-list-title" }, "🏠 可用房间"),
                vue.createElementVNode("view", {
                  class: "room-list-close",
                  onClick: closeRoomList
                }, "×")
              ]),
              vue.createElementVNode("scroll-view", {
                class: "room-list-content",
                "scroll-y": "true"
              }, [
                rooms.value.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "room-empty"
                }, [
                  vue.createElementVNode("text", { class: "empty-icon" }, "🚫"),
                  vue.createElementVNode("text", { class: "empty-text" }, "暂无可用房间"),
                  vue.createElementVNode("text", { class: "empty-hint" }, "创建一个新房间开始游戏吧！")
                ])) : (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "room-grid"
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(rooms.value, (room) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: room.id,
                        class: vue.normalizeClass(["room-item", { disabled: !canJoinRoom(room) }]),
                        onClick: ($event) => handleJoinRoom(room)
                      }, [
                        vue.createElementVNode("view", { class: "room-item-header" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "room-name" },
                            vue.toDisplayString(getRoomName(room)),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "view",
                            {
                              class: vue.normalizeClass(["room-status-badge", getRoomStatusClass(room)])
                            },
                            vue.toDisplayString(getRoomStatusText(room)),
                            3
                            /* TEXT, CLASS */
                          )
                        ]),
                        vue.createElementVNode("view", { class: "room-item-body" }, [
                          vue.createElementVNode("view", { class: "room-info-row" }, [
                            vue.createElementVNode("text", { class: "room-info-label" }, "👥 玩家"),
                            vue.createElementVNode(
                              "text",
                              { class: "room-info-value" },
                              vue.toDisplayString(getRoomPlayerCount(room)) + "/" + vue.toDisplayString(getRoomMaxPlayers(room)),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "room-info-row" }, [
                            vue.createElementVNode("text", { class: "room-info-label" }, "👤 房主"),
                            vue.createElementVNode(
                              "text",
                              { class: "room-info-value" },
                              vue.toDisplayString(getRoomOwnerText(room)),
                              1
                              /* TEXT */
                            )
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "room-item-footer" }, [
                          canJoinRoom(room) ? (vue.openBlock(), vue.createElementBlock("text", {
                            key: 0,
                            class: "join-hint"
                          }, "点击加入")) : (vue.openBlock(), vue.createElementBlock(
                            "text",
                            {
                              key: 1,
                              class: "join-disabled"
                            },
                            vue.toDisplayString(getJoinDisabledReason(room)),
                            1
                            /* TEXT */
                          ))
                        ])
                      ], 10, ["onClick"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]))
              ]),
              vue.createCommentVNode(" 底部创建房间按钮 "),
              vue.createElementVNode("view", { class: "room-list-footer" }, [
                vue.createElementVNode("button", {
                  class: "room-list-create-btn",
                  onClick: showCreateRoomDialog
                }, [
                  vue.createElementVNode("text", { class: "create-btn-icon" }, "+"),
                  vue.createElementVNode("text", { class: "create-btn-text" }, "创建新房间")
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 设置模态框 "),
          showSettings.value ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 2,
            class: "settings-overlay",
            onClick: vue.withModifiers(closeSettings, ["self"])
          }, [
            vue.createElementVNode("view", { class: "settings-modal" }, [
              vue.createElementVNode("view", { class: "settings-header" }, [
                vue.createElementVNode("text", { class: "settings-title" }, "设置"),
                vue.createElementVNode("view", {
                  class: "settings-close",
                  onClick: closeSettings
                }, "×")
              ]),
              vue.createElementVNode("view", { class: "settings-content" }, [
                vue.createElementVNode("view", { class: "volume-panel" }, [
                  vue.createElementVNode("text", { class: "settings-section-title" }, "音量设置"),
                  (vue.openBlock(), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(volumeItems, (item) => {
                      return vue.createElementVNode("view", {
                        key: item.key,
                        class: "volume-row"
                      }, [
                        vue.createElementVNode("view", { class: "volume-info" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "volume-label" },
                            vue.toDisplayString(item.label),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "volume-value" },
                            vue.toDisplayString(audioSettings.value[item.key]) + "%",
                            1
                            /* TEXT */
                          )
                        ]),
                        vue.createElementVNode("slider", {
                          class: "volume-slider",
                          value: audioSettings.value[item.key],
                          min: "0",
                          max: "100",
                          "block-size": "20",
                          activeColor: "#d4a574",
                          backgroundColor: "#3a2616",
                          onChanging: ($event) => updateVolume(item.key, $event),
                          onChange: ($event) => updateVolume(item.key, $event)
                        }, null, 40, ["value", "onChanging", "onChange"])
                      ]);
                    }),
                    64
                    /* STABLE_FRAGMENT */
                  ))
                ]),
                vue.createElementVNode("view", { class: "credits-panel" }, [
                  vue.createElementVNode("text", { class: "settings-section-title" }, "制作人员名单"),
                  vue.createElementVNode("view", { class: "credits-viewport" }, [
                    vue.createElementVNode("view", { class: "credits-scroll" }, [
                      vue.createElementVNode("text", { class: "credits-main-title" }, "《LIAR'S BAR》制作人员名单"),
                      vue.createElementVNode("text", { class: "credits-studio" }, "武妖灵工作室"),
                      vue.createElementVNode("text", { class: "credits-group" }, "项目统筹"),
                      vue.createElementVNode("text", { class: "credits-line" }, "项目经理：李汶洋"),
                      vue.createElementVNode("text", { class: "credits-duty" }, "工作职责：项目管理、游戏策划、服务端开发、美术制作、台词配音"),
                      vue.createElementVNode("text", { class: "credits-group" }, "视频与文档组"),
                      vue.createElementVNode("text", { class: "credits-line" }, "剪辑、文档管理：游翔宇"),
                      vue.createElementVNode("text", { class: "credits-line" }, "文档管理：陆鑫涛"),
                      vue.createElementVNode("text", { class: "credits-group" }, "音频制作"),
                      vue.createElementVNode("text", { class: "credits-line" }, "BGM 作曲、音效制作：朱昱丞"),
                      vue.createElementVNode("text", { class: "credits-group" }, "程序开发"),
                      vue.createElementVNode("text", { class: "credits-line" }, "服务端开发：李汶洋、吴子轩"),
                      vue.createElementVNode("text", { class: "credits-line" }, "客户端开发：李昊燃"),
                      vue.createElementVNode("text", { class: "credits-group" }, "全体测试人员"),
                      vue.createElementVNode("text", { class: "credits-line" }, "李汶洋、游翔宇、陆鑫涛、朱昱丞、吴子轩、李昊燃"),
                      vue.createElementVNode("text", { class: "credits-group" }, "版权信息"),
                      vue.createElementVNode("text", { class: "credits-line" }, "©2026 武妖灵工作室 保留所有权利"),
                      vue.createElementVNode("view", { class: "credits-spacer" }),
                      vue.createElementVNode("text", { class: "credits-main-title" }, "《LIAR'S BAR》制作人员名单"),
                      vue.createElementVNode("text", { class: "credits-studio" }, "武妖灵工作室")
                    ])
                  ])
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 游戏规则模态框 "),
          showRules.value ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 3,
            class: "rules-overlay",
            onClick: _cache[5] || (_cache[5] = vue.withModifiers(($event) => showRules.value = false, ["self"]))
          }, [
            vue.createElementVNode("view", { class: "rules-modal" }, [
              vue.createElementVNode("view", {
                class: "rules-close",
                onClick: _cache[4] || (_cache[4] = ($event) => showRules.value = false)
              }, "×"),
              vue.createElementVNode("text", { class: "rules-modal-title" }, "📖 骗子酒馆 规则"),
              vue.createElementVNode("view", { class: "rules-content" }, [
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "目标"),
                  vue.createElementVNode("text", { class: "rule-text" }, "4 人对战，通过出牌、撒谎、质疑和心理博弈，成为最后存活的玩家。")
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "牌组"),
                  vue.createElementVNode("text", { class: "rule-text" }, "A / K / Q / J 各 6 张，共 24 张。每人发 6 张。")
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "目标牌"),
                  vue.createElementVNode("text", { class: "rule-text" }, "每一轮有指定目标牌（A→K→Q→J 循环）。出牌时必须声明打出的全部是当前目标牌。")
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "出牌"),
                  vue.createElementVNode("text", { class: "rule-text" }, "当前回合玩家选 1~3 张手牌打出。可以真出（全是目标牌），也可以虚张声势（含非目标牌）。其他玩家只能看到声明，看不到真实牌面。")
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "质疑"),
                  vue.createElementVNode("text", { class: "rule-text" }, "下一名玩家可选择质疑上家。系统翻开上家刚打出的牌："),
                  vue.createElementVNode("view", { class: "rule-list" }, [
                    vue.createElementVNode("text", { class: "rule-item" }, "• 含非目标牌（撒谎）→ 质疑成功，撒谎者受罚"),
                    vue.createElementVNode("text", { class: "rule-item" }, "• 全是目标牌（说真话）→ 质疑失败，质疑者受罚")
                  ])
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "俄罗斯轮盘惩罚"),
                  vue.createElementVNode("text", { class: "rule-text" }, "每次受罚累计子弹数：第 1 次 1 发，第 2 次 2 发……第 6 次必死。被击中即淘汰出局，存活则继续。")
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "手牌耗尽"),
                  vue.createElementVNode("text", { class: "rule-text" }, "所有存活玩家手牌为空时，重新洗牌发牌，目标牌切换到下一种。")
                ]),
                vue.createElementVNode("view", { class: "rule-section" }, [
                  vue.createElementVNode("text", { class: "rule-title" }, "操作"),
                  vue.createElementVNode("view", { class: "rule-list" }, [
                    vue.createElementVNode("text", { class: "rule-item" }, [
                      vue.createElementVNode("text", { class: "rule-highlight" }, "出牌"),
                      vue.createTextVNode("：选 1~3 张牌，点击「出牌」")
                    ]),
                    vue.createElementVNode("text", { class: "rule-item" }, [
                      vue.createElementVNode("text", { class: "rule-highlight" }, "质疑上家"),
                      vue.createTextVNode("：仅当上家有出牌时可点")
                    ]),
                    vue.createElementVNode("text", { class: "rule-item" }, [
                      vue.createElementVNode("text", { class: "rule-highlight" }, "过"),
                      vue.createTextVNode("：不质疑，交由下家")
                    ])
                  ])
                ])
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ]);
      };
    }
  };
  const PagesLobbyLobby = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-83a641c2"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/lobby/lobby.vue"]]);
  const _sfc_main$5 = {
    __name: "character-select",
    setup(__props) {
      const selectedCharacter = vue.ref("");
      const loading = vue.ref(false);
      const forceRenderKey = vue.ref(0);
      const enableAnimations = vue.ref(false);
      const characters = vue.ref([
        {
          id: "scubby",
          name: "Scubby",
          description: "起手多一张万能牌",
          skill: "开局额外获得1张WILD牌，可以代替任何牌型",
          image: "../../static/tavern_characters_v01/assets/art/characters/scubby/scubby_idle_tavern_v01.png"
        },
        {
          id: "foxy",
          name: "Foxy",
          description: "可以偷看其他玩家手牌",
          skill: "每个轮次可使用一次，在自己的出牌回合查看目标的所有手牌3秒",
          image: "../../static/tavern_characters_v01/assets/art/characters/foxy/foxy_idle_tavern_v01.png"
        },
        {
          id: "bristle",
          name: "Bristle",
          description: "每轮可以质疑两次",
          skill: "不受每轮一次质疑的限制，每轮可以质疑最多2次",
          image: "../../static/tavern_characters_v01/assets/art/characters/bristle/bristle_idle_tavern_v01.png"
        },
        {
          id: "tor",
          name: "Tor",
          description: "减少惩罚或免疫",
          skill: "失败惩罚时有50%概率减少1发子弹或完全免疫惩罚",
          image: "../../static/tavern_characters_v01/assets/art/characters/tor/tor_idle_tavern_v01.png"
        }
      ]);
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
        formatAppLog("log", "at pages/character-select/character-select.vue:118", "已设置横屏模式");
      }
      vue.onMounted(() => {
        setLandscape();
        playBgm("lobby");
        vue.nextTick(() => {
          setTimeout(() => {
            forceRenderKey.value++;
            formatAppLog("log", "at pages/character-select/character-select.vue:129", "第一次强制重绘");
          }, 50);
          setTimeout(() => {
            forceRenderKey.value++;
            formatAppLog("log", "at pages/character-select/character-select.vue:134", "第二次强制重绘");
          }, 150);
          setTimeout(() => {
            forceRenderKey.value++;
            formatAppLog("log", "at pages/character-select/character-select.vue:139", "第三次强制重绘");
          }, 300);
          setTimeout(() => {
            enableAnimations.value = true;
            formatAppLog("log", "at pages/character-select/character-select.vue:145", "启用旋转动画");
          }, 500);
        });
      });
      vue.onActivated(() => {
        setLandscape();
        playBgm("lobby");
        vue.nextTick(() => {
          setTimeout(() => {
            forceRenderKey.value++;
            formatAppLog("log", "at pages/character-select/character-select.vue:157", "页面激活，强制重绘");
          }, 50);
          setTimeout(() => {
            forceRenderKey.value++;
            formatAppLog("log", "at pages/character-select/character-select.vue:162", "页面激活，第二次重绘");
          }, 150);
        });
      });
      function selectCharacter(charId) {
        playSfx("uiClick");
        selectedCharacter.value = charId;
        formatAppLog("log", "at pages/character-select/character-select.vue:170", "选择角色:", charId);
      }
      function handleImageError(e) {
        formatAppLog("error", "at pages/character-select/character-select.vue:174", "图片加载失败:", e);
      }
      function handleImageLoad(e) {
        formatAppLog("log", "at pages/character-select/character-select.vue:178", "图片加载成功:", e);
      }
      async function confirmAndMatch() {
        playSfx("uiClick");
        if (!selectedCharacter.value) {
          uni.showToast({
            title: "请先选择角色",
            icon: "none"
          });
          return;
        }
        formatAppLog("log", "at pages/character-select/character-select.vue:191", "========== 开始匹配 ==========");
        formatAppLog("log", "at pages/character-select/character-select.vue:192", "选中的角色ID:", selectedCharacter.value);
        formatAppLog("log", "at pages/character-select/character-select.vue:193", "发送的数据:", { character_id: selectedCharacter.value });
        formatAppLog("log", "at pages/character-select/character-select.vue:194", "================================");
        loading.value = true;
        try {
          const result = await matchAPI.start({ character_id: selectedCharacter.value });
          formatAppLog("log", "at pages/character-select/character-select.vue:200", "匹配API返回结果:", result);
          uni.redirectTo({
            url: "/pages/match-wait/match-wait"
          });
        } catch (e) {
          formatAppLog("error", "at pages/character-select/character-select.vue:207", "匹配失败:", e);
          uni.showToast({
            title: "匹配失败，请重试",
            icon: "none"
          });
        } finally {
          loading.value = false;
        }
      }
      function goBack() {
        playSfx("uiClick");
        uni.navigateBack();
      }
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "character-select-page" }, [
          vue.createCommentVNode(" 背景 "),
          vue.createElementVNode("view", { class: "bg-layer" }),
          vue.createCommentVNode(" 左侧标题区 "),
          vue.createElementVNode("view", { class: "left-panel" }, [
            vue.createElementVNode("view", { class: "title-section" }, [
              vue.createElementVNode("text", { class: "page-title" }, "选择角色"),
              vue.createElementVNode("text", { class: "page-subtitle" }, "每个角色拥有独特技能"),
              vue.createElementVNode("view", { class: "title-decoration" }, [
                vue.createElementVNode("view", { class: "decoration-line" }),
                vue.createElementVNode("view", { class: "decoration-diamond" }),
                vue.createElementVNode("view", { class: "decoration-line" })
              ])
            ]),
            vue.createElementVNode("view", { class: "bottom-actions" }, [
              vue.createElementVNode("button", {
                class: "back-btn",
                onClick: goBack
              }, [
                vue.createElementVNode("text", { class: "btn-icon" }, "←"),
                vue.createElementVNode("text", { class: "btn-text" }, "返回大厅")
              ]),
              vue.createElementVNode("button", {
                class: "confirm-btn",
                disabled: !selectedCharacter.value,
                onClick: confirmAndMatch
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "btn-text" },
                  vue.toDisplayString(selectedCharacter.value ? "确认并开始" : "请选择角色"),
                  1
                  /* TEXT */
                ),
                selectedCharacter.value ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 0,
                  class: "btn-icon"
                }, "→")) : vue.createCommentVNode("v-if", true)
              ], 8, ["disabled"])
            ])
          ]),
          vue.createCommentVNode(" 右侧角色卡片区 "),
          (vue.openBlock(), vue.createElementBlock("view", {
            class: "characters-container",
            key: forceRenderKey.value
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList(characters.value, (char, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: char.id,
                  class: vue.normalizeClass(["character-card-wrapper", { selected: selectedCharacter.value === char.id }]),
                  onClick: ($event) => selectCharacter(char.id)
                }, [
                  vue.createCommentVNode(" 三层边框容器 "),
                  vue.createElementVNode("view", { class: "card-border-base" }, [
                    vue.createCommentVNode(" 旋转边框层 "),
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["card-border-rotating", { "animation-enabled": enableAnimations.value }])
                      },
                      null,
                      2
                      /* CLASS */
                    ),
                    vue.createCommentVNode(" 内层容器 "),
                    vue.createElementVNode("view", { class: "card-border-inner" }, [
                      vue.createElementVNode("view", { class: "character-card" }, [
                        vue.createCommentVNode(" 角色图片 "),
                        vue.createElementVNode("view", { class: "character-avatar" }, [
                          vue.createElementVNode("image", {
                            src: char.image,
                            mode: "aspectFill",
                            "lazy-load": false,
                            "show-menu-by-longpress": false,
                            onError: handleImageError,
                            onLoad: handleImageLoad
                          }, null, 40, ["src"])
                        ]),
                        vue.createCommentVNode(" 角色信息 "),
                        vue.createElementVNode("view", { class: "character-info" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "character-name" },
                            vue.toDisplayString(char.name),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "character-desc" },
                            vue.toDisplayString(char.description),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode("view", { class: "skill-section" }, [
                            vue.createElementVNode("view", { class: "skill-badge" }, "技能"),
                            vue.createElementVNode(
                              "text",
                              { class: "skill-text" },
                              vue.toDisplayString(char.skill),
                              1
                              /* TEXT */
                            )
                          ])
                        ]),
                        vue.createCommentVNode(" 选中标记 "),
                        selectedCharacter.value === char.id ? (vue.openBlock(), vue.createElementBlock("view", {
                          key: 0,
                          class: "selected-badge"
                        }, [
                          vue.createElementVNode("text", { class: "badge-icon" }, "✓")
                        ])) : vue.createCommentVNode("v-if", true)
                      ])
                    ])
                  ])
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])),
          loading.value ? (vue.openBlock(), vue.createBlock(Loading, {
            key: 0,
            text: "正在匹配..."
          })) : vue.createCommentVNode("v-if", true)
        ]);
      };
    }
  };
  const PagesCharacterSelectCharacterSelect = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-b8ccb88a"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/character-select/character-select.vue"]]);
  const _sfc_main$4 = {
    __name: "match-wait",
    setup(__props) {
      const elapsed = vue.ref(0);
      let timer = null;
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
        formatAppLog("log", "at pages/match-wait/match-wait.vue:27", "已设置横屏模式");
      }
      function onMatchFound(payload) {
        formatAppLog("log", "at pages/match-wait/match-wait.vue:32", "收到 MATCH_FOUND:", payload);
        playSfx("matchSuccess");
        if (timer)
          clearInterval(timer);
        const roomId = payload.room_id;
        if (roomId) {
          uni.reLaunch({
            url: `/pages/game-room/game-room?id=${roomId}`
          });
        }
      }
      function onGameStarted(payload) {
        formatAppLog("log", "at pages/match-wait/match-wait.vue:45", "收到 GAME_STARTED:", payload);
        if (timer)
          clearInterval(timer);
      }
      vue.onMounted(() => {
        setLandscape();
        playBgm("lobby");
        timer = setInterval(() => {
          elapsed.value++;
        }, 1e3);
        wsClient.on("MATCH_FOUND", onMatchFound);
        wsClient.on("GAME_STARTED", onGameStarted);
        formatAppLog("log", "at pages/match-wait/match-wait.vue:61", "匹配等待页面已加载，等待匹配结果...");
      });
      vue.onActivated(() => {
        setLandscape();
        playBgm("lobby");
      });
      onShow(() => {
        formatAppLog("log", "at pages/match-wait/match-wait.vue:71", "=== 匹配等待页面 onShow ===");
        if (!wsClient.connected) {
          formatAppLog("log", "at pages/match-wait/match-wait.vue:75", "WebSocket 未连接,尝试重连...");
          wsClient.connect();
        }
      });
      vue.onUnmounted(() => {
        if (timer)
          clearInterval(timer);
        wsClient.off("MATCH_FOUND", onMatchFound);
        wsClient.off("GAME_STARTED", onGameStarted);
      });
      async function cancelMatch() {
        playSfx("uiClick");
        try {
          await matchAPI.cancel();
          if (timer)
            clearInterval(timer);
          uni.navigateBack();
        } catch (e) {
          formatAppLog("error", "at pages/match-wait/match-wait.vue:93", "Cancel failed:", e);
        }
      }
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "match-page" }, [
          vue.createElementVNode("view", { class: "match-card" }, [
            vue.createElementVNode("view", { class: "spinner" }),
            vue.createElementVNode("text", { class: "match-title" }, "正在寻找对手..."),
            vue.createElementVNode(
              "text",
              { class: "elapsed" },
              "等待时间: " + vue.toDisplayString(elapsed.value) + "s",
              1
              /* TEXT */
            ),
            elapsed.value > 10 ? (vue.openBlock(), vue.createElementBlock("text", {
              key: 0,
              class: "hint"
            }, "正在为您匹配AI对手")) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("button", {
              class: "cancel-btn",
              onClick: cancelMatch
            }, "取消匹配")
          ])
        ]);
      };
    }
  };
  const PagesMatchWaitMatchWait = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-6169c3cf"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/match-wait/match-wait.vue"]]);
  const useGameStore = defineStore("game", () => {
    const gameState = vue.ref(null);
    const chatMessages = vue.ref([]);
    const roomId = vue.ref(null);
    const isConnected = vue.ref(false);
    const isMatching = vue.ref(false);
    function updateState(state2) {
      gameState.value = state2;
    }
    function addChat(msg) {
      chatMessages.value.push(msg);
      if (chatMessages.value.length > 100) {
        chatMessages.value.shift();
      }
    }
    function clearChat() {
      chatMessages.value = [];
    }
    function reset() {
      gameState.value = null;
      chatMessages.value = [];
      roomId.value = null;
      isConnected.value = false;
    }
    function setRoomId(id) {
      roomId.value = id;
    }
    function setMatching(status) {
      isMatching.value = status;
    }
    return {
      gameState,
      chatMessages,
      roomId,
      isConnected,
      isMatching,
      updateState,
      addChat,
      clearChat,
      reset,
      setRoomId,
      setMatching
    };
  });
  const _sfc_main$3 = {
    __name: "game-room",
    setup(__props) {
      const authStore = useAuthStore();
      const gameStore = useGameStore();
      const roomId = vue.ref("");
      const pageOptions = vue.ref(null);
      const gameState = vue.ref(null);
      const roomState = vue.ref(null);
      const showRules = vue.ref(false);
      const showSettings = vue.ref(false);
      const toast = vue.ref({ show: false, msg: "", type: "error" });
      const selectedCards = vue.ref([]);
      const shakeScreen = vue.ref(false);
      const challengeFx = vue.ref({ show: false, success: false });
      const eliminateFx = vue.ref({ show: false, nickname: "" });
      const leaveReason = vue.ref("");
      const leaveDetail = vue.ref("");
      const connecting = vue.ref(true);
      const chatMessages = vue.ref([]);
      const gameLogs = vue.ref([]);
      const chatExpanded = vue.ref(false);
      const logExpanded = vue.ref(false);
      const chatText = vue.ref("");
      const chatScrollIntoView = vue.ref("");
      const logScrollIntoView = vue.ref("");
      const audioSettings = vue.ref(getAudioSettings());
      const volumeItems = [
        { key: "master", label: "主音量" },
        { key: "bgm", label: "背景音乐" },
        { key: "sfx", label: "音效" }
      ];
      const previousPhase = vue.ref(null);
      const lastChallengePhase = vue.ref(false);
      const previousRound = vue.ref(null);
      vue.ref(null);
      const LogType = {
        ROUND_START: "round_start",
        // 轮次开始
        PLAY_CARD: "play_card",
        // 玩家出牌
        CHALLENGE: "challenge",
        // 质疑动作
        NO_CHALLENGE: "no_challenge",
        // 无人质疑
        PUNISHMENT: "punishment",
        // 惩罚结果
        ELIMINATION: "elimination",
        // 玩家淘汰
        SKILL: "skill",
        // 技能使用
        GAME_END: "game_end"
        // 游戏结束
      };
      const addGameLog = (text, type = LogType.PLAY_CARD) => {
        gameLogs.value.push({
          text,
          type,
          timestamp: Date.now(),
          id: `log${Date.now()}${Math.floor(Math.random() * 1e4)}`
        });
      };
      const skillUsed = vue.ref(false);
      const showSkillTargets = vue.ref(false);
      const skillPeekResult = vue.ref(null);
      const hasPassedChallenge = vue.ref(false);
      const hasChallenged = vue.ref(false);
      const actionLogs = vue.ref([]);
      const logScrollTop = vue.ref(0);
      vue.ref("chat");
      vue.ref(0);
      vue.ref("");
      const confirmDialog = vue.ref({
        visible: false,
        title: "提示",
        content: "",
        onConfirm: () => {
        },
        onCancel: () => {
        }
      });
      const inputDialog = vue.ref({
        visible: false,
        title: "请输入",
        placeholder: "",
        onConfirm: (value) => {
        },
        onCancel: () => {
        }
      });
      let challengeFxTimer = null;
      let eliminateFxTimer = null;
      let shakeTimer = null;
      let statePollingTimer = null;
      function setLandscape() {
        plus.screen.lockOrientation("landscape-primary");
        formatAppLog("log", "at pages/game-room/game-room.vue:583", "已设置横屏模式");
      }
      const myPlayerId = vue.computed(() => {
        var _a;
        const userId = (_a = authStore.user) == null ? void 0 : _a.id;
        formatAppLog("log", "at pages/game-room/game-room.vue:590", "myPlayerId:", userId, "authStore.user:", authStore.user);
        return userId;
      });
      const myPlayer = vue.computed(() => {
        var _a;
        if (!((_a = gameState.value) == null ? void 0 : _a.players))
          return null;
        return gameState.value.players.find((p) => p.id === myPlayerId.value);
      });
      const opponents = vue.computed(() => {
        var _a;
        if (!((_a = gameState.value) == null ? void 0 : _a.players))
          return [];
        return gameState.value.players.filter((p) => p.id !== myPlayerId.value);
      });
      const myHandCards = vue.computed(() => {
        var _a, _b;
        if ((_a = gameState.value) == null ? void 0 : _a.hand) {
          return gameState.value.hand;
        }
        return ((_b = myPlayer.value) == null ? void 0 : _b.hand) || [];
      });
      const myPunishmentCount = vue.computed(() => {
        var _a, _b;
        return ((_a = myPlayer.value) == null ? void 0 : _a.bullets) || ((_b = myPlayer.value) == null ? void 0 : _b.punishment_count) || 0;
      });
      const isMyTurn = vue.computed(() => {
        if (!gameState.value || !myPlayer.value)
          return false;
        return gameState.value.current_player === myPlayer.value.seat_index && gameState.value.phase === "PLAYING";
      });
      const legalActions = vue.computed(() => {
        var _a;
        return ((_a = gameState.value) == null ? void 0 : _a.legal_actions) || [];
      });
      const canPlayCard = vue.computed(() => {
        return legalActions.value.includes("PLAY_CARD");
      });
      const canChallenge = vue.computed(() => {
        return legalActions.value.includes("CHALLENGE");
      });
      const canPass = vue.computed(() => {
        return legalActions.value.includes("PASS");
      });
      const myCharacter = vue.computed(() => {
        var _a;
        return ((_a = myPlayer.value) == null ? void 0 : _a.character_id) || "";
      });
      const characterNames = {
        "scubby": "Scubby",
        "foxy": "Foxy",
        "bristle": "Bristle",
        "tor": "Tor"
      };
      const characterHeadImages = {
        "scubby": "../../static/tavern_characters_v01/assets/art/characters/scubby/scubby_head.png",
        "foxy": "../../static/tavern_characters_v01/assets/art/characters/foxy/foxy_head.png",
        "bristle": "../../static/tavern_characters_v01/assets/art/characters/bristle/bristle_head.png",
        "tor": "../../static/tavern_characters_v01/assets/art/characters/tor/tor_head.png"
      };
      const getCharacterName = (characterId) => {
        return characterNames[characterId] || "";
      };
      const getCharacterHeadImage = (characterId) => {
        return characterHeadImages[characterId] || "";
      };
      const showSkillButton = vue.computed(() => {
        return myCharacter.value === "foxy";
      });
      const canUseSkill = vue.computed(() => {
        var _a;
        if (myCharacter.value !== "foxy")
          return false;
        if (myHandCards.value.length === 0)
          return false;
        if (((_a = gameState.value) == null ? void 0 : _a.phase) !== "PLAYING")
          return false;
        if (!isMyTurn.value)
          return false;
        if (skillUsed.value)
          return false;
        return true;
      });
      const hasAnyAction = vue.computed(() => {
        return canPlayCard.value || canChallenge.value || canPass.value || canUseSkill.value;
      });
      vue.computed(() => {
        var _a, _b;
        if (!((_a = gameState.value) == null ? void 0 : _a.last_play))
          return "";
        const playerId = gameState.value.last_play.player_id;
        const player = (_b = gameState.value.players) == null ? void 0 : _b.find((p) => p.id === playerId);
        return (player == null ? void 0 : player.nickname) || "玩家";
      });
      const lastPlayPlayerSeatIndex = vue.computed(() => {
        var _a, _b;
        if (!((_a = gameState.value) == null ? void 0 : _a.last_play))
          return 0;
        const playerId = gameState.value.last_play.player_id;
        const player = (_b = gameState.value.players) == null ? void 0 : _b.find((p) => p.id === playerId);
        return (player == null ? void 0 : player.seat_index) ?? 0;
      });
      const isLastPlayByMe = vue.computed(() => {
        var _a;
        if (!((_a = gameState.value) == null ? void 0 : _a.last_play))
          return false;
        return gameState.value.last_play.player_id === myPlayerId.value;
      });
      const currentPlayerName = vue.computed(() => {
        var _a;
        if (!gameState.value)
          return "";
        const player = (_a = gameState.value.players) == null ? void 0 : _a.find((p) => p.seat_index === gameState.value.current_player);
        if (!player)
          return "未知玩家";
        return player.is_ai ? `${player.nickname} (AI)` : player.nickname;
      });
      const winnerName = vue.computed(() => {
        var _a, _b;
        if (!((_a = gameState.value) == null ? void 0 : _a.winner_id))
          return "";
        const winner = (_b = gameState.value.players) == null ? void 0 : _b.find((p) => p.id === gameState.value.winner_id);
        return (winner == null ? void 0 : winner.nickname) || "未知玩家";
      });
      const roomPlayers = vue.computed(() => {
        var _a;
        const players = ((_a = roomState.value) == null ? void 0 : _a.players) || [];
        formatAppLog("log", "at pages/game-room/game-room.vue:730", "计算roomPlayers:", players);
        return players;
      });
      const myRoomPlayer = vue.computed(() => {
        const player = roomPlayers.value.find((p) => p.id === myPlayerId.value || p.user_id === myPlayerId.value);
        formatAppLog("log", "at pages/game-room/game-room.vue:736", "计算myRoomPlayer:", player, "myPlayerId:", myPlayerId.value);
        return player;
      });
      const waitingSeats = vue.computed(() => {
        var _a;
        const maxPlayers = ((_a = roomState.value) == null ? void 0 : _a.max_players) || 4;
        const seats = [];
        const playersBySeat = /* @__PURE__ */ new Map();
        roomPlayers.value.forEach((p) => {
          if (p.seat_index !== void 0) {
            playersBySeat.set(p.seat_index, p);
          }
        });
        formatAppLog("log", "at pages/game-room/game-room.vue:751", "waitingSeats - maxPlayers:", maxPlayers, "playersBySeat:", playersBySeat);
        for (let i = 0; i < maxPlayers; i++) {
          seats.push({
            index: i,
            player: playersBySeat.get(i) || null
          });
        }
        return seats;
      });
      onLoad((options) => {
        formatAppLog("log", "at pages/game-room/game-room.vue:764", "=== game-room onLoad 接收参数 ===");
        formatAppLog("log", "at pages/game-room/game-room.vue:765", "页面参数 options:", options);
        pageOptions.value = options;
        roomId.value = (options == null ? void 0 : options.id) || "";
        formatAppLog("log", "at pages/game-room/game-room.vue:770", "房间ID:", roomId.value);
        if (!roomId.value) {
          formatAppLog("error", "at pages/game-room/game-room.vue:773", "房间ID无效，参数:", options);
          showToast("房间ID无效");
          setTimeout(() => uni.navigateBack(), 1500);
        }
      });
      vue.onMounted(async () => {
        formatAppLog("log", "at pages/game-room/game-room.vue:780", "=== game-room onMounted 开始 ===");
        try {
          setLandscape();
          playBgm("playing");
          formatAppLog("log", "at pages/game-room/game-room.vue:787", "authStore.isLoggedIn:", authStore.isLoggedIn);
          formatAppLog("log", "at pages/game-room/game-room.vue:788", "authStore.token:", authStore.token ? "已设置" : "未设置");
          formatAppLog("log", "at pages/game-room/game-room.vue:789", "authStore.user:", authStore.user);
          const storedToken = uni.getStorageSync("token");
          const storedUser = uni.getStorageSync("user");
          formatAppLog("log", "at pages/game-room/game-room.vue:794", "localStorage token:", storedToken ? "已存储" : "未存储");
          formatAppLog("log", "at pages/game-room/game-room.vue:795", "localStorage user:", storedUser);
          if (!authStore.isLoggedIn) {
            formatAppLog("error", "at pages/game-room/game-room.vue:799", "未登录，跳转到登录页");
            uni.reLaunch({
              url: "/pages/login/login"
            });
            return;
          }
          if (!authStore.user || !authStore.user.id) {
            formatAppLog("error", "at pages/game-room/game-room.vue:808", "用户信息未加载，user:", authStore.user);
            if (storedUser) {
              try {
                const parsedUser = typeof storedUser === "string" ? JSON.parse(storedUser) : storedUser;
                formatAppLog("log", "at pages/game-room/game-room.vue:814", "尝试从本地存储恢复用户:", parsedUser);
                if (parsedUser && parsedUser.id) {
                  authStore.updateUser(parsedUser);
                  formatAppLog("log", "at pages/game-room/game-room.vue:817", "用户信息已恢复:", authStore.user);
                }
              } catch (e) {
                formatAppLog("error", "at pages/game-room/game-room.vue:820", "恢复用户信息失败:", e);
              }
            }
            if (!authStore.user || !authStore.user.id) {
              showToast("用户信息错误，请重新登录");
              setTimeout(() => {
                uni.reLaunch({
                  url: "/pages/login/login"
                });
              }, 1500);
              return;
            }
          }
          formatAppLog("log", "at pages/game-room/game-room.vue:836", "当前用户ID:", authStore.user.id);
          formatAppLog("log", "at pages/game-room/game-room.vue:837", "当前用户昵称:", authStore.user.nickname);
          if (!roomId.value) {
            formatAppLog("error", "at pages/game-room/game-room.vue:841", "房间ID无效");
            showToast("房间ID无效");
            setTimeout(() => uni.navigateBack(), 1500);
            return;
          }
          formatAppLog("log", "at pages/game-room/game-room.vue:848", "开始连接 WebSocket");
          wsClient.connect();
          setTimeout(() => {
            formatAppLog("log", "at pages/game-room/game-room.vue:853", "发送 PLAYER_JOIN 消息，roomId:", roomId.value);
            wsClient.send("PLAYER_JOIN", { room_id: roomId.value });
          }, 500);
          formatAppLog("log", "at pages/game-room/game-room.vue:857", "注册 WebSocket 事件监听器");
          wsClient.on("ROOM_STATE", onRoomState);
          wsClient.on("GAME_STATE", onGameState);
          wsClient.on("GAME_STARTED", onGameStarted);
          wsClient.on("CHALLENGE_RESULT", onChallengeResult);
          wsClient.on("RUSSIAN_ROULETTE", onRoulette);
          wsClient.on("PLAYER_ELIMINATED", onPlayerEliminated);
          wsClient.on("GAME_OVER", onGameOver);
          wsClient.on("PLAYER_LEFT", onPlayerLeft);
          wsClient.on("PLAYER_JOINED", onPlayerJoined);
          wsClient.on("CHAT", onChat);
          wsClient.on("SKILL_RESULT", onSkillResult);
          formatAppLog("log", "at pages/game-room/game-room.vue:871", "开始加载房间数据");
          await loadRoomData();
          startStatePolling();
          formatAppLog("log", "at pages/game-room/game-room.vue:878", "=== game-room onMounted 结束 ===");
        } catch (error) {
          formatAppLog("error", "at pages/game-room/game-room.vue:880", "=== onMounted 发生错误 ===");
          formatAppLog("error", "at pages/game-room/game-room.vue:881", "错误对象:", error);
          formatAppLog("error", "at pages/game-room/game-room.vue:882", "错误消息:", error.message);
          formatAppLog("error", "at pages/game-room/game-room.vue:883", "错误堆栈:", error.stack);
          showToast("页面加载失败: " + error.message);
        }
      });
      vue.onActivated(() => {
        setLandscape();
        playBgm("playing");
      });
      vue.onUnmounted(() => {
        if (challengeFxTimer)
          clearTimeout(challengeFxTimer);
        if (eliminateFxTimer)
          clearTimeout(eliminateFxTimer);
        if (shakeTimer)
          clearTimeout(shakeTimer);
        if (statePollingTimer)
          clearInterval(statePollingTimer);
        wsClient.off("ROOM_STATE", onRoomState);
        wsClient.off("GAME_STATE", onGameState);
        wsClient.off("GAME_STARTED", onGameStarted);
        wsClient.off("CHALLENGE_RESULT", onChallengeResult);
        wsClient.off("RUSSIAN_ROULETTE", onRoulette);
        wsClient.off("PLAYER_ELIMINATED", onPlayerEliminated);
        wsClient.off("GAME_OVER", onGameOver);
        wsClient.off("PLAYER_LEFT", onPlayerLeft);
        wsClient.off("PLAYER_JOINED", onPlayerJoined);
        wsClient.off("CHAT", onChat);
        wsClient.off("SKILL_RESULT", onSkillResult);
      });
      vue.watch(() => chatMessages.value.length, (newLength) => {
        formatAppLog("log", "at pages/game-room/game-room.vue:916", "聊天消息数量变化:", newLength);
        if (newLength > 0) {
          vue.nextTick(() => {
            const lastMsg = chatMessages.value[newLength - 1];
            formatAppLog("log", "at pages/game-room/game-room.vue:920", "最后一条消息:", lastMsg);
            if (lastMsg && lastMsg.id) {
              formatAppLog("log", "at pages/game-room/game-room.vue:922", "设置滚动目标:", lastMsg.id);
              setTimeout(() => {
                chatScrollIntoView.value = lastMsg.id;
              }, 50);
            }
          });
        }
      });
      vue.watch(() => gameLogs.value.length, (newLength) => {
        formatAppLog("log", "at pages/game-room/game-room.vue:934", "游戏日志数量变化:", newLength);
        if (newLength > 0) {
          vue.nextTick(() => {
            const lastLog = gameLogs.value[newLength - 1];
            formatAppLog("log", "at pages/game-room/game-room.vue:938", "最后一条日志:", lastLog);
            if (lastLog && lastLog.id) {
              formatAppLog("log", "at pages/game-room/game-room.vue:940", "设置日志滚动目标:", lastLog.id);
              setTimeout(() => {
                logScrollIntoView.value = lastLog.id;
              }, 50);
            }
          });
        }
      });
      let autoPassTimer = null;
      let lastAutoPassKey = "";
      vue.watch(
        () => {
          var _a, _b, _c, _d, _e;
          return {
            currentPlayer: (_a = gameState.value) == null ? void 0 : _a.current_player,
            mySeatIndex: (_b = myPlayer.value) == null ? void 0 : _b.seat_index,
            actualHandCount: myHandCards.value.length,
            phase: (_c = gameState.value) == null ? void 0 : _c.phase,
            legalActions: ((_d = gameState.value) == null ? void 0 : _d.legal_actions) || [],
            currentTurn: ((_e = gameState.value) == null ? void 0 : _e.current_turn) || 0
          };
        },
        (newVal, oldVal) => {
          formatAppLog("log", "at pages/game-room/game-room.vue:965", "🔍 watch触发 - 游戏状态变化:", {
            currentPlayer: newVal.currentPlayer,
            mySeatIndex: newVal.mySeatIndex,
            actualHandCount: newVal.actualHandCount,
            phase: newVal.phase,
            legalActions: newVal.legalActions,
            currentTurn: newVal.currentTurn
          });
          const isMyTurn2 = newVal.currentPlayer === newVal.mySeatIndex;
          const canPass2 = newVal.legalActions.includes("PASS");
          formatAppLog("log", "at pages/game-room/game-room.vue:978", "🔍 条件检查:", {
            isMyTurn: isMyTurn2,
            canPass: canPass2,
            "实际手牌为0": newVal.actualHandCount === 0
          });
          const canChallenge2 = newVal.legalActions.includes("CHALLENGE");
          const shouldAutoPass = newVal.phase === "PLAYING" && isMyTurn2 && newVal.actualHandCount === 0 || newVal.phase === "PLAYING" && isMyTurn2 && newVal.legalActions.length === 0 || newVal.phase === "CHALLENGE" && newVal.actualHandCount === 0 && !canChallenge2;
          if (shouldAutoPass) {
            const autoPassKey = `${newVal.currentTurn}-${newVal.mySeatIndex}-${newVal.phase}-${newVal.currentPlayer}`;
            if (lastAutoPassKey === autoPassKey) {
              formatAppLog("log", "at pages/game-room/game-room.vue:1000", "⏭️ 已经处理过这个回合的自动跳过，忽略");
              return;
            }
            lastAutoPassKey = autoPassKey;
            formatAppLog("log", "at pages/game-room/game-room.vue:1006", "✅ 检测到手牌为0，准备自动跳过");
            formatAppLog("log", "at pages/game-room/game-room.vue:1007", "当前阶段:", newVal.phase, "座位:", newVal.mySeatIndex, "手牌数:", newVal.handCount);
            formatAppLog("log", "at pages/game-room/game-room.vue:1008", "isMyTurn:", isMyTurn2, "canPass:", canPass2);
            if (autoPassTimer) {
              clearTimeout(autoPassTimer);
            }
            autoPassTimer = setTimeout(() => {
              var _a;
              formatAppLog("log", "at pages/game-room/game-room.vue:1016", "🚀 执行自动跳过 - 强制发送PASS");
              wsClient.send("PASS");
              const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${((_a = authStore.user) == null ? void 0 : _a.nickname) || "我"}` : "我";
              addActionLog(`${myName} 手牌为空，自动跳过`, "info");
              autoPassTimer = null;
            }, 500);
          }
        },
        { deep: true, immediate: false }
      );
      async function loadRoomData() {
        var _a, _b;
        try {
          const res = await roomAPI.get(roomId.value);
          formatAppLog("log", "at pages/game-room/game-room.vue:1034", "房间详情响应:", res);
          if (res.code === 0 && res.data) {
            if (res.data.room) {
              roomState.value = {
                id: res.data.room.id,
                name: res.data.room.room_name,
                status: res.data.room.status,
                max_players: res.data.room.max_players || 4,
                player_count: res.data.room.current_players || 0,
                players: res.data.players || [],
                ready_count: (res.data.players || []).filter((p) => p.is_ready).length
              };
              formatAppLog("log", "at pages/game-room/game-room.vue:1048", "房间状态已设置:", roomState.value);
              if (((_a = res.data.room) == null ? void 0 : _a.status) !== "PLAYING") {
                connecting.value = false;
                formatAppLog("log", "at pages/game-room/game-room.vue:1053", "房间状态为WAITING，显示等待界面");
              }
            }
            if (((_b = res.data.room) == null ? void 0 : _b.status) === "PLAYING") {
              formatAppLog("log", "at pages/game-room/game-room.vue:1059", "房间正在游戏中，等待GAME_STATE推送");
              wsClient.send("RECONNECT", {});
            }
          } else {
            connecting.value = false;
          }
        } catch (e) {
          formatAppLog("error", "at pages/game-room/game-room.vue:1068", "Load room error:", e);
          showToast("加载房间失败: " + (e.msg || e.message || "未知错误"));
          connecting.value = false;
        }
      }
      function startStatePolling() {
        statePollingTimer = setInterval(() => {
          if (gameState.value && gameState.value.phase === "PLAYING") {
            formatAppLog("log", "at pages/game-room/game-room.vue:1079", "轮询游戏状态...");
            wsClient.send("RECONNECT", {});
          }
        }, 5e3);
      }
      function showToast(msg, type = "error") {
        toast.value = { show: true, msg, type };
      }
      function addActionLog(message, type = "info") {
        const now2 = /* @__PURE__ */ new Date();
        const time = `${now2.getHours().toString().padStart(2, "0")}:${now2.getMinutes().toString().padStart(2, "0")}:${now2.getSeconds().toString().padStart(2, "0")}`;
        actionLogs.value.push({
          time,
          message,
          type
          // 'info', 'play', 'challenge', 'punishment', 'eliminate', 'system'
        });
        if (actionLogs.value.length > 100) {
          actionLogs.value.shift();
        }
        vue.nextTick(() => {
          logScrollTop.value = 999999;
        });
      }
      function getPlayerName(playerId) {
        var _a, _b;
        const player = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === playerId);
        if (!player)
          return "未知玩家";
        return `P${player.seat_index + 1}-${player.nickname}${player.is_ai ? "(AI)" : ""}`;
      }
      function triggerChallengeFx(success) {
        challengeFx.value = { show: true, success };
        if (challengeFxTimer)
          clearTimeout(challengeFxTimer);
        challengeFxTimer = setTimeout(() => {
          challengeFx.value.show = false;
        }, 1600);
      }
      function triggerEliminateFx(playerId) {
        var _a, _b;
        const player = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === playerId);
        eliminateFx.value = { show: true, nickname: (player == null ? void 0 : player.nickname) || `玩家${playerId}` };
        if (eliminateFxTimer)
          clearTimeout(eliminateFxTimer);
        eliminateFxTimer = setTimeout(() => {
          eliminateFx.value.show = false;
        }, 1800);
        shakeScreen.value = true;
        if (shakeTimer)
          clearTimeout(shakeTimer);
        shakeTimer = setTimeout(() => {
          shakeScreen.value = false;
        }, 500);
      }
      function toggleCard(index) {
        if (!canPlayCard.value)
          return;
        playSfx("selectCard");
        const idx = selectedCards.value.indexOf(index);
        if (idx > -1) {
          selectedCards.value.splice(idx, 1);
        } else {
          if (selectedCards.value.length < 3) {
            selectedCards.value.push(index);
          } else {
            showToast("最多选择3张牌", "error");
          }
        }
      }
      function resetSelection() {
        selectedCards.value = [];
      }
      function playCards() {
        var _a, _b;
        if (selectedCards.value.length === 0)
          return;
        playSfx("playCard");
        const cardIds = selectedCards.value.map((idx) => idx);
        wsClient.send("PLAY_CARD", {
          card_ids: cardIds,
          claim: gameState.value.target_card
        });
        const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${((_a = authStore.user) == null ? void 0 : _a.nickname) || "我"}` : "我";
        addActionLog(`${myName} 出了 ${selectedCards.value.length} 张 ${gameState.value.target_card}`, "play");
        if (myPlayer.value) {
          addGameLog(`P${myPlayer.value.seat_index + 1} ${((_b = authStore.user) == null ? void 0 : _b.nickname) || "我"} 出了 ${selectedCards.value.length} 张 ${gameState.value.target_card}`, LogType.PLAY_CARD);
        }
        resetSelection();
      }
      function challenge() {
        var _a, _b, _c;
        const targetId = (_b = (_a = gameState.value) == null ? void 0 : _a.last_play) == null ? void 0 : _b.player_id;
        if (!targetId)
          return;
        if (hasChallenged.value) {
          showToast("已发起质疑，等待结果", "info");
          return;
        }
        hasChallenged.value = true;
        playSfx("challenge");
        wsClient.send("CHALLENGE", {
          target_player_id: targetId
        });
        const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${((_c = authStore.user) == null ? void 0 : _c.nickname) || "我"}` : "我";
        const targetName = getPlayerName(targetId);
        addActionLog(`${myName} 选择质疑 ${targetName}`, "challenge");
        showToast("已发起质疑，等待结果揭晓", "success");
      }
      function passTurn() {
        var _a;
        if (hasPassedChallenge.value) {
          showToast("已选择放弃，等待其他玩家", "info");
          return;
        }
        hasPassedChallenge.value = true;
        playSfx("pass");
        wsClient.send("PASS");
        const myName = myPlayer.value ? `P${myPlayer.value.seat_index + 1}-${((_a = authStore.user) == null ? void 0 : _a.nickname) || "我"}` : "我";
        addActionLog(`${myName} 选择不质疑，轮到下家`, "info");
        showToast("已放弃质疑，等待其他玩家决策", "success");
        resetSelection();
      }
      function showSkillTargetSelect() {
        if (skillUsed.value) {
          showToast("技能已使用", "info");
          return;
        }
        playSfx("uiClick");
        showSkillTargets.value = true;
      }
      function useSkillOnTarget(targetPlayerId) {
        var _a, _b;
        const target = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === targetPlayerId);
        if (!target || !target.is_alive) {
          showToast("无效的目标", "error");
          return;
        }
        playSfx("skill");
        wsClient.send("USE_SKILL", {
          target_player_id: targetPlayerId
        });
        showSkillTargets.value = false;
        skillUsed.value = true;
        formatAppLog("log", "at pages/game-room/game-room.vue:1267", "使用Foxy技能，目标:", targetPlayerId);
      }
      function onSkillResult(payload) {
        var _a, _b, _c, _d;
        formatAppLog("log", "at pages/game-room/game-room.vue:1271", "收到技能结果:", payload);
        if (payload.skill === "foxy_peek") {
          playSfx("skill");
          const target = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === payload.target_player_id);
          const targetName = (target == null ? void 0 : target.nickname) || "玩家";
          const duration = Math.floor((payload.duration_ms || 3e3) / 1e3);
          const user = (_d = (_c = gameState.value) == null ? void 0 : _c.players) == null ? void 0 : _d.find((p) => p.id === payload.user_id || myPlayerId.value);
          if (user && target) {
            addGameLog(`🔍 P${user.seat_index + 1} ${user.nickname} 使用Foxy技能偷看了 P${target.seat_index + 1} ${target.nickname} 的手牌`, LogType.SKILL);
          }
          skillPeekResult.value = {
            targetName,
            cards: payload.hand || [],
            remaining: duration
          };
          let remaining = duration;
          const timer = setInterval(() => {
            remaining--;
            if (skillPeekResult.value) {
              skillPeekResult.value.remaining = remaining;
            }
            if (remaining <= 0) {
              clearInterval(timer);
              skillPeekResult.value = null;
            }
          }, 1e3);
        }
      }
      function setReady() {
        playSfx("ready");
        wsClient.send("PLAYER_READY");
      }
      function leaveRoom() {
        playSfx("uiClick");
        confirmDialog.value = {
          visible: true,
          title: "提示",
          content: "确定要离开房间吗？",
          onConfirm: async () => {
            try {
              await roomAPI.leave(roomId.value);
            } catch (e) {
              formatAppLog("error", "at pages/game-room/game-room.vue:1340", "Leave room error:", e);
            }
            uni.redirectTo({
              url: "/pages/lobby/lobby"
            });
          },
          onCancel: () => {
            confirmDialog.value.visible = false;
          }
        };
      }
      function onRoomState(payload) {
        formatAppLog("log", "at pages/game-room/game-room.vue:1355", "ROOM_STATE:", payload);
        roomState.value = {
          id: payload.id,
          name: payload.name,
          status: payload.phase || "WAITING",
          max_players: payload.max_players || 4,
          player_count: payload.player_count || 0,
          players: payload.players || [],
          ready_count: payload.ready_count || 0
        };
        connecting.value = false;
        formatAppLog("log", "at pages/game-room/game-room.vue:1367", "房间状态已更新，connecting设为false，roomState:", roomState.value);
      }
      function onGameState(payload) {
        var _a, _b, _c;
        formatAppLog("log", "at pages/game-room/game-room.vue:1371", "========== GAME_STATE 接收 ==========");
        formatAppLog("log", "at pages/game-room/game-room.vue:1372", "完整payload:", JSON.stringify(payload, null, 2));
        formatAppLog("log", "at pages/game-room/game-room.vue:1373", "当前玩家座位:", payload.current_player);
        formatAppLog("log", "at pages/game-room/game-room.vue:1374", "当前回合:", payload.current_round);
        formatAppLog("log", "at pages/game-room/game-room.vue:1375", "当前轮次:", payload.current_turn);
        formatAppLog("log", "at pages/game-room/game-room.vue:1376", "阶段:", payload.phase);
        if (previousRound.value !== null && payload.current_round > previousRound.value) {
          addGameLog(`🎯 第 ${payload.current_round} 轮开始 - 目标牌：${payload.target_card}`, LogType.ROUND_START);
          skillUsed.value = false;
          formatAppLog("log", "at pages/game-room/game-room.vue:1383", "新轮次开始，重置Foxy技能使用状态");
        }
        previousRound.value = payload.current_round;
        const phaseChanged = previousPhase.value !== payload.phase;
        if (phaseChanged) {
          if (previousPhase.value === "CHALLENGE" && payload.phase !== "CHALLENGE") {
            hasPassedChallenge.value = false;
            hasChallenged.value = false;
            formatAppLog("log", "at pages/game-room/game-room.vue:1396", "离开质疑阶段，重置质疑操作标记");
          }
          if (payload.phase === "CHALLENGE") {
            hasPassedChallenge.value = false;
            hasChallenged.value = false;
            formatAppLog("log", "at pages/game-room/game-room.vue:1402", "进入质疑阶段，重置质疑操作标记");
          }
        }
        if (previousPhase.value === "PLAYING" && payload.phase === "CHALLENGE" && payload.last_play) {
          const player = (_a = payload.players) == null ? void 0 : _a.find((p) => p.id === payload.last_play.player_id);
          if (player && player.id !== myPlayerId.value) {
            const playerName = getPlayerName(payload.last_play.player_id);
            addActionLog(`${playerName} 出了 ${payload.last_play.count} 张 ${payload.last_play.claim}`, "play");
            addGameLog(`P${player.seat_index + 1} ${player.nickname} 出了 ${payload.last_play.count} 张 ${payload.last_play.claim}`, LogType.PLAY_CARD);
          }
          lastChallengePhase.value = true;
        }
        if (previousPhase.value === "CHALLENGE" && payload.phase === "PLAYING" && lastChallengePhase.value) {
          addGameLog(`✓ 无人质疑，游戏继续`, LogType.NO_CHALLENGE);
          lastChallengePhase.value = false;
        }
        previousPhase.value = payload.phase;
        gameState.value = {
          phase: payload.phase,
          current_player: payload.current_player,
          current_turn: payload.current_turn || 0,
          current_round: payload.current_round || 1,
          target_card: payload.target_card,
          alive_count: ((_b = payload.players) == null ? void 0 : _b.filter((p) => p.is_alive).length) || 0,
          players: payload.players || [],
          legal_actions: payload.legal_actions || [],
          last_play: payload.last_play ? {
            player_id: payload.last_play.player_id,
            count: payload.last_play.count,
            claim: payload.last_play.claim
          } : null
        };
        const currentPlayer = (_c = payload.players) == null ? void 0 : _c.find((p) => p.seat_index === payload.current_player);
        if (currentPlayer) {
          formatAppLog("log", "at pages/game-room/game-room.vue:1447", "当前操作玩家:", {
            id: currentPlayer.id,
            nickname: currentPlayer.nickname,
            is_ai: currentPlayer.is_ai,
            seat_index: currentPlayer.seat_index,
            is_alive: currentPlayer.is_alive,
            hand_count: currentPlayer.hand_count
          });
          if (payload.phase === "PLAYING") {
            const playerName = getPlayerName(currentPlayer.id);
            addActionLog(`轮到 ${playerName} 行动 (回合${payload.current_turn})`, "info");
          } else if (payload.phase === "CHALLENGE") {
            addActionLog(`进入质疑阶段，可以质疑或放弃`, "challenge");
          }
          if (currentPlayer.hand_count === 0 && currentPlayer.is_alive) {
            formatAppLog("warn", "at pages/game-room/game-room.vue:1466", "⚠️ 游戏可能卡住：当前玩家手牌为0但仍是操作者");
            formatAppLog("warn", "at pages/game-room/game-room.vue:1467", "玩家信息:", currentPlayer.nickname, "seat:", currentPlayer.seat_index);
          }
        } else {
          formatAppLog("warn", "at pages/game-room/game-room.vue:1470", "找不到当前操作玩家，seat_index:", payload.current_player);
        }
        formatAppLog("log", "at pages/game-room/game-room.vue:1473", "=====================================");
        gameStore.updateState(gameState.value);
        connecting.value = false;
      }
      function onGameStarted(payload) {
        var _a;
        formatAppLog("log", "at pages/game-room/game-room.vue:1480", "GAME_STARTED:", payload);
        playSfx("gameStart");
        if (payload.phase) {
          gameState.value = {
            phase: payload.phase,
            current_player: payload.current_player,
            current_turn: payload.current_turn || 0,
            current_round: payload.current_round || 1,
            target_card: payload.target_card,
            alive_count: ((_a = payload.players) == null ? void 0 : _a.filter((p) => p.is_alive).length) || 0,
            players: payload.players || [],
            last_play: null
          };
        }
        showToast("游戏开始！", "success");
        addActionLog(`🎮 游戏开始！第 ${payload.current_round || 1} 轮，目标牌：${payload.target_card}`, "system");
        addGameLog(`🎯 第 ${payload.current_round || 1} 轮开始 - 目标牌：${payload.target_card}`, LogType.ROUND_START);
      }
      function onChallengeResult(payload) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i;
        formatAppLog("log", "at pages/game-room/game-room.vue:1504", "========== CHALLENGE_RESULT 事件触发 ==========");
        formatAppLog("log", "at pages/game-room/game-room.vue:1505", "CHALLENGE_RESULT:", payload);
        formatAppLog("log", "at pages/game-room/game-room.vue:1506", "完整payload:", JSON.stringify(payload, null, 2));
        formatAppLog("log", "at pages/game-room/game-room.vue:1507", "==============================================");
        lastChallengePhase.value = false;
        const success = payload.success;
        const challengerId = payload.challenger_id;
        const targetId = payload.liar_id || payload.loser_id;
        payload.loser_id;
        const challengerName = getPlayerName(challengerId);
        const targetName = getPlayerName(targetId);
        playSfx(success ? "challengeSuccess" : "challengeFail");
        triggerChallengeFx(success);
        uni.vibrateShort();
        if (success) {
          addActionLog(`${challengerName} 质疑 ${targetName}：质疑成功！对方在说谎`, "challenge");
          addActionLog(`实际牌为：${(_a = payload.challenged_cards) == null ? void 0 : _a.join(", ")}`, "challenge");
          const challenger = (_c = (_b = gameState.value) == null ? void 0 : _b.players) == null ? void 0 : _c.find((p) => p.id === challengerId);
          const target = (_e = (_d = gameState.value) == null ? void 0 : _d.players) == null ? void 0 : _e.find((p) => p.id === targetId);
          formatAppLog("log", "at pages/game-room/game-room.vue:1536", "质疑成功 - challenger:", challenger, "target:", target);
          if (challenger && target) {
            addGameLog(`⚠️ P${challenger.seat_index + 1} ${challenger.nickname} 质疑成功！P${target.seat_index + 1} ${target.nickname} 在说谎`, LogType.CHALLENGE);
          } else {
            formatAppLog("error", "at pages/game-room/game-room.vue:1540", "找不到玩家信息！challengerId:", challengerId, "targetId:", targetId);
          }
        } else {
          addActionLog(`${challengerName} 质疑 ${targetName}：质疑失败！对方说真话`, "challenge");
          const challenger = (_g = (_f = gameState.value) == null ? void 0 : _f.players) == null ? void 0 : _g.find((p) => p.id === challengerId);
          const target = (_i = (_h = gameState.value) == null ? void 0 : _h.players) == null ? void 0 : _i.find((p) => p.id === targetId);
          formatAppLog("log", "at pages/game-room/game-room.vue:1549", "质疑失败 - challenger:", challenger, "target:", target);
          if (challenger && target) {
            addGameLog(`⚠️ P${challenger.seat_index + 1} ${challenger.nickname} 质疑失败！P${target.seat_index + 1} ${target.nickname} 说的是真话`, LogType.CHALLENGE);
          } else {
            formatAppLog("error", "at pages/game-room/game-room.vue:1553", "找不到玩家信息！challengerId:", challengerId, "targetId:", targetId);
          }
        }
        hasPassedChallenge.value = false;
        hasChallenged.value = false;
        formatAppLog("log", "at pages/game-room/game-room.vue:1560", "质疑结果已处理，重置质疑操作标记");
      }
      function onRoulette(payload) {
        var _a, _b;
        formatAppLog("log", "at pages/game-room/game-room.vue:1564", "RUSSIAN_ROULETTE:", payload);
        formatAppLog("log", "at pages/game-room/game-room.vue:1565", "RUSSIAN_ROULETTE完整payload:", JSON.stringify(payload, null, 2));
        const playerId = payload.player_id;
        const survived = payload.survived;
        const bulletCount = payload.bullet_count;
        const playerName = getPlayerName(playerId);
        const player = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === playerId);
        if (survived) {
          playSfx("rouletteSurvive");
          addActionLog(`🎲 ${playerName} 进入惩罚阶段，扣动扳机 ${bulletCount} 次 → 幸存`, "punishment");
          if (player) {
            addGameLog(`🎲 P${player.seat_index + 1} ${player.nickname} 扣动扳机 ${bulletCount} 次 → 幸存`, LogType.PUNISHMENT);
          }
        } else {
          playSfx("rouletteHit");
          addActionLog(`💥 ${playerName} 进入惩罚阶段，扣动扳机 ${bulletCount} 次 → 被击中！`, "punishment");
          if (player) {
            addGameLog(`💥 P${player.seat_index + 1} ${player.nickname} 扣动扳机 ${bulletCount} 次 → 被击中`, LogType.ELIMINATION);
          }
        }
      }
      function onPlayerEliminated(payload) {
        var _a, _b, _c;
        formatAppLog("log", "at pages/game-room/game-room.vue:1595", "PLAYER_ELIMINATED:", payload);
        const playerId = payload.player_id;
        playSfx("eliminated");
        triggerEliminateFx(playerId);
        uni.vibrateLong();
        const playerName = getPlayerName(playerId);
        addActionLog(`💀 ${playerName} 被淘汰出局`, "eliminate");
        const player = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === playerId);
        if (player) {
          addGameLog(`💀 P${player.seat_index + 1} ${player.nickname} 被淘汰出局`, LogType.ELIMINATION);
        }
        if ((_c = gameState.value) == null ? void 0 : _c.players) {
          const player2 = gameState.value.players.find((p) => p.id === playerId);
          if (player2) {
            player2.is_alive = false;
          }
          gameState.value.alive_count = gameState.value.players.filter((p) => p.is_alive).length;
        }
      }
      function onGameOver(payload) {
        var _a, _b;
        formatAppLog("log", "at pages/game-room/game-room.vue:1626", "GAME_OVER:", payload);
        playSfx("gameOver");
        gameState.value = {
          ...gameState.value || {},
          phase: "GAME_OVER",
          winner_id: payload.winner_id
        };
        const winnerName2 = getPlayerName(payload.winner_id);
        addActionLog(`🏆 游戏结束！${winnerName2} 获得胜利`, "system");
        const winner = (_b = (_a = gameState.value) == null ? void 0 : _a.players) == null ? void 0 : _b.find((p) => p.id === payload.winner_id);
        if (winner) {
          addGameLog(`🏆 游戏结束！P${winner.seat_index + 1} ${winner.nickname} 获得胜利`, LogType.GAME_END);
        }
      }
      function onPlayerLeft(payload) {
        formatAppLog("log", "at pages/game-room/game-room.vue:1646", "PLAYER_LEFT:", payload);
        playSfx("playerLeave");
        if (payload.game_over) {
          leaveReason.value = payload.reason || "玩家退出，游戏结束";
          const name = payload.nickname || `玩家${payload.player_id}`;
          leaveDetail.value = `${name} 退出了对局，本局已结束`;
          gameState.value = {
            ...gameState.value || {},
            phase: "GAME_OVER",
            winner_id: payload.winner_id
          };
          addActionLog(`🚪 ${name} 退出游戏，本局结束`, "system");
        } else {
          const name = payload.nickname || `玩家${payload.player_id}`;
          addActionLog(`🚪 ${name} 离开了房间`, "system");
        }
      }
      function onPlayerJoined(payload) {
        formatAppLog("log", "at pages/game-room/game-room.vue:1669", "PLAYER_JOINED:", payload);
        playSfx("playerJoin");
        const name = payload.nickname || `玩家${payload.player_id}`;
        addActionLog(`👋 ${name} 加入了房间`, "system");
      }
      function onChat(payload) {
        formatAppLog("log", "at pages/game-room/game-room.vue:1677", "CHAT:", payload);
        playSfx("chat");
        chatMessages.value.push({
          sender: payload.sender_name || `玩家${payload.sender_id}`,
          content: payload.content,
          isAi: payload.is_ai || false,
          id: `chat${Date.now()}${Math.floor(Math.random() * 1e4)}`
        });
      }
      function toggleChatPanel() {
        playSfx("uiClick");
        formatAppLog("log", "at pages/game-room/game-room.vue:1690", "点击聊天按钮，当前聊天消息:", chatMessages.value);
        formatAppLog("log", "at pages/game-room/game-room.vue:1691", "聊天消息数量:", chatMessages.value.length);
        if (logExpanded.value) {
          logExpanded.value = false;
        }
        chatExpanded.value = !chatExpanded.value;
        formatAppLog("log", "at pages/game-room/game-room.vue:1700", "聊天面板状态:", chatExpanded.value ? "打开" : "关闭");
      }
      function toggleLogPanel() {
        playSfx("uiClick");
        formatAppLog("log", "at pages/game-room/game-room.vue:1706", "点击日志按钮，当前日志:", gameLogs.value);
        formatAppLog("log", "at pages/game-room/game-room.vue:1707", "日志数量:", gameLogs.value.length);
        if (chatExpanded.value) {
          chatExpanded.value = false;
        }
        logExpanded.value = !logExpanded.value;
        formatAppLog("log", "at pages/game-room/game-room.vue:1716", "日志面板状态:", logExpanded.value ? "打开" : "关闭");
      }
      function goSettings() {
        playSfx("uiClick");
        audioSettings.value = getAudioSettings();
        showSettings.value = true;
      }
      function closeSettings() {
        playSfx("uiClick");
        showSettings.value = false;
      }
      function updateVolume(key, event) {
        var _a, _b;
        const value = ((_a = event.detail) == null ? void 0 : _a.value) ?? ((_b = event.target) == null ? void 0 : _b.value) ?? 0;
        audioSettings.value = setAudioSetting(key, value);
      }
      function sendChatMessage() {
        if (!chatText.value.trim()) {
          formatAppLog("log", "at pages/game-room/game-room.vue:1738", "消息为空，不发送");
          return;
        }
        const message = chatText.value.trim();
        playSfx("chat");
        formatAppLog("log", "at pages/game-room/game-room.vue:1744", "准备发送消息:", message);
        wsClient.send({
          type: "CHAT",
          payload: {
            content: message
          }
        });
        chatMessages.value.push({
          sender: "我",
          text: message,
          id: `chat${Date.now()}${Math.floor(Math.random() * 1e4)}`
        });
        chatText.value = "";
        formatAppLog("log", "at pages/game-room/game-room.vue:1764", "消息已发送，当前聊天列表:", chatMessages.value);
      }
      return (_ctx, _cache) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v;
        return vue.openBlock(), vue.createElementBlock(
          "view",
          {
            class: vue.normalizeClass(["game-room", { "screen-shake": shakeScreen.value }])
          },
          [
            vue.createCommentVNode(" 背景层 "),
            vue.createElementVNode("view", { class: "bar-bg" }, [
              vue.createElementVNode("view", { class: "bar-bg__wall" }),
              vue.createElementVNode("view", { class: "bar-bg__vignette" })
            ]),
            vue.createCommentVNode(" 特效层 - 质疑结果 "),
            challengeFx.value.show ? (vue.openBlock(), vue.createElementBlock(
              "view",
              {
                key: 0,
                class: vue.normalizeClass(["fx-overlay fx-challenge", challengeFx.value.success ? "fx-success" : "fx-fail"])
              },
              [
                vue.createElementVNode("view", { class: "fx-burst" }),
                vue.createElementVNode(
                  "text",
                  { class: "fx-title" },
                  vue.toDisplayString(challengeFx.value.success ? "质疑成功!" : "质疑失败"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "fx-sub" },
                  vue.toDisplayString(challengeFx.value.success ? "对方在撒谎" : "对方说真话"),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            )) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 特效层 - 淘汰 "),
            eliminateFx.value.show ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "fx-overlay fx-eliminate"
            }, [
              vue.createElementVNode("text", { class: "fx-skull" }, "💀"),
              vue.createElementVNode("text", { class: "fx-title" }, "玩家淘汰"),
              vue.createElementVNode(
                "text",
                { class: "fx-sub" },
                vue.toDisplayString(eliminateFx.value.nickname) + " 被击杀",
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 顶部栏 "),
            vue.createElementVNode("view", { class: "top-bar safe-area-inset-top safe-area-inset-left safe-area-inset-right" }, [
              vue.createElementVNode("view", {
                class: "back-btn",
                onClick: leaveRoom
              }, [
                vue.createElementVNode("text", null, "← 返回大厅")
              ]),
              vue.createElementVNode("view", { class: "room-info" }, [
                vue.createElementVNode(
                  "text",
                  { class: "round-badge" },
                  "第 " + vue.toDisplayString(((_a = gameState.value) == null ? void 0 : _a.current_round) || 1) + " 轮",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "turn-badge" },
                  "回合 " + vue.toDisplayString(((_b = gameState.value) == null ? void 0 : _b.current_turn) || 0),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "target-badge" },
                  "目标牌: " + vue.toDisplayString(((_c = gameState.value) == null ? void 0 : _c.target_card) || "-"),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode(
                "view",
                { class: "alive-count" },
                vue.toDisplayString(((_d = gameState.value) == null ? void 0 : _d.alive_count) || 4) + " 人存活",
                1
                /* TEXT */
              ),
              vue.createElementVNode("button", {
                class: "top-icon-btn",
                onClick: goSettings
              }, "⚙"),
              vue.createElementVNode("button", {
                class: "top-icon-btn rules-btn",
                onClick: _cache[0] || (_cache[0] = ($event) => showRules.value = true)
              }, "📖")
            ]),
            vue.createCommentVNode(" 游戏结束遮罩 "),
            ((_e = gameState.value) == null ? void 0 : _e.phase) === "GAME_OVER" ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 2,
              class: "game-over-overlay"
            }, [
              vue.createElementVNode("view", { class: "game-over-card" }, [
                leaveReason.value ? (vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    key: 0,
                    class: "game-over-title"
                  },
                  "🚪 " + vue.toDisplayString(leaveReason.value),
                  1
                  /* TEXT */
                )) : (vue.openBlock(), vue.createElementBlock("text", {
                  key: 1,
                  class: "game-over-title"
                }, "🏆 游戏结束")),
                leaveReason.value ? (vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    key: 2,
                    class: "lose-text"
                  },
                  vue.toDisplayString(leaveDetail.value),
                  1
                  /* TEXT */
                )) : ((_f = gameState.value) == null ? void 0 : _f.winner_id) === ((_g = vue.unref(authStore).user) == null ? void 0 : _g.id) ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 3,
                  class: "win-text"
                }, "你赢了！")) : (vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    key: 4,
                    class: "lose-text"
                  },
                  "玩家 " + vue.toDisplayString(winnerName.value) + " 获得了胜利",
                  1
                  /* TEXT */
                )),
                vue.createElementVNode("button", {
                  class: "game-over-btn",
                  onClick: leaveRoom
                }, "返回大厅")
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 等待房间 "),
            !gameState.value && !connecting.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 3,
              class: "waiting-room"
            }, [
              vue.createElementVNode("view", { class: "wait-card" }, [
                vue.createElementVNode(
                  "text",
                  { class: "wait-title" },
                  vue.toDisplayString(((_h = roomState.value) == null ? void 0 : _h.name) || "游戏房间"),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "wait-count" },
                  vue.toDisplayString(roomPlayers.value.length) + "/" + vue.toDisplayString(((_i = roomState.value) == null ? void 0 : _i.max_players) || 4) + " 玩家 · " + vue.toDisplayString(((_j = roomState.value) == null ? void 0 : _j.ready_count) || 0) + " 已准备 ",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "waiting-players" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(waitingSeats.value, (seat) => {
                      var _a2, _b2, _c2;
                      return vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: seat.index,
                          class: vue.normalizeClass(["waiting-player", { empty: !seat.player, ready: (_a2 = seat.player) == null ? void 0 : _a2.is_ready }])
                        },
                        [
                          vue.createElementVNode("view", { class: "waiting-avatar" }, [
                            getCharacterHeadImage((_b2 = seat.player) == null ? void 0 : _b2.character_id) ? (vue.openBlock(), vue.createElementBlock("image", {
                              key: 0,
                              class: "character-head",
                              src: getCharacterHeadImage(seat.player.character_id),
                              mode: "aspectFill"
                            }, null, 8, ["src"])) : (vue.openBlock(), vue.createElementBlock(
                              "text",
                              { key: 1 },
                              vue.toDisplayString(seat.player ? seat.player.is_ai ? "🤖" : "👤" : "-"),
                              1
                              /* TEXT */
                            ))
                          ]),
                          vue.createElementVNode(
                            "text",
                            { class: "waiting-name" },
                            vue.toDisplayString(((_c2 = seat.player) == null ? void 0 : _c2.nickname) || "等待加入"),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "waiting-status" },
                            vue.toDisplayString(seat.player ? seat.player.is_ai ? "AI" : seat.player.is_ready ? "已准备" : "未准备" : "空位"),
                            1
                            /* TEXT */
                          )
                        ],
                        2
                        /* CLASS */
                      );
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                vue.createElementVNode("button", {
                  class: "ready-btn",
                  disabled: (_k = myRoomPlayer.value) == null ? void 0 : _k.is_ready,
                  onClick: setReady
                }, vue.toDisplayString(((_l = myRoomPlayer.value) == null ? void 0 : _l.is_ready) ? "已准备" : "准备"), 9, ["disabled"])
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 连接中提示 "),
            connecting.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 4,
              class: "waiting-room"
            }, [
              vue.createElementVNode("view", { class: "wait-card" }, [
                vue.createElementVNode("text", { class: "wait-title" }, "连接中...")
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 游戏区域 "),
            gameState.value && gameState.value.phase !== "GAME_OVER" ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 5,
              class: "game-area"
            }, [
              vue.createCommentVNode(" 当前回合提示 - 移到右上角 "),
              vue.createElementVNode("view", { class: "current-turn-banner" }, [
                ((_m = gameState.value) == null ? void 0 : _m.phase) === "CHALLENGE" ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 0,
                  class: "turn-text challenge-phase"
                }, " ⚠️ 质疑阶段 - 可以质疑或放弃 ")) : canPlayCard.value ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 1,
                  class: "turn-text my-turn"
                }, "👉 轮到你操作")) : (vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    key: 2,
                    class: "turn-text waiting"
                  },
                  vue.toDisplayString(currentPlayerName.value) + " 操作中...",
                  1
                  /* TEXT */
                ))
              ]),
              vue.createCommentVNode(" 左侧对手 "),
              opponents.value[0] ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "left-opponent"
              }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["player-card player-card-vertical", { active: gameState.value.current_player === opponents.value[0].seat_index, eliminated: !opponents.value[0].is_alive }])
                  },
                  [
                    vue.createCommentVNode(" 玩家编号 "),
                    vue.createElementVNode(
                      "view",
                      { class: "player-number" },
                      "P" + vue.toDisplayString(opponents.value[0].seat_index + 1),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("view", { class: "player-avatar" }, [
                      getCharacterHeadImage(opponents.value[0].character_id) ? (vue.openBlock(), vue.createElementBlock("image", {
                        key: 0,
                        class: "character-head",
                        src: getCharacterHeadImage(opponents.value[0].character_id),
                        mode: "aspectFill"
                      }, null, 8, ["src"])) : opponents.value[0].is_ai ? (vue.openBlock(), vue.createElementBlock("text", { key: 1 }, "🤖")) : (vue.openBlock(), vue.createElementBlock("text", { key: 2 }, "👤"))
                    ]),
                    vue.createElementVNode("view", { class: "player-name-row" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "player-name" },
                        vue.toDisplayString(opponents.value[0].nickname),
                        1
                        /* TEXT */
                      ),
                      opponents.value[0].character_id ? (vue.openBlock(), vue.createElementBlock(
                        "text",
                        {
                          key: 0,
                          class: "character-badge"
                        },
                        vue.toDisplayString(getCharacterName(opponents.value[0].character_id)),
                        1
                        /* TEXT */
                      )) : vue.createCommentVNode("v-if", true)
                    ]),
                    vue.createElementVNode("view", { class: "player-hp" }, [
                      (vue.openBlock(), vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(6, (i) => {
                          return vue.createElementVNode(
                            "view",
                            {
                              key: i,
                              class: vue.normalizeClass(["hp-dot", { filled: i <= (opponents.value[0].bullets || opponents.value[0].punishment_count || 0) }])
                            },
                            null,
                            2
                            /* CLASS */
                          );
                        }),
                        64
                        /* STABLE_FRAGMENT */
                      ))
                    ]),
                    vue.createElementVNode(
                      "text",
                      { class: "card-count" },
                      vue.toDisplayString(opponents.value[0].hand_count) + " 张牌",
                      1
                      /* TEXT */
                    ),
                    vue.createCommentVNode(" 显示最近出牌信息 "),
                    gameState.value.last_play && gameState.value.last_play.player_id === opponents.value[0].id ? (vue.openBlock(), vue.createElementBlock(
                      "text",
                      {
                        key: 0,
                        class: "last-played"
                      },
                      " 刚出 " + vue.toDisplayString(gameState.value.last_play.count) + " 张 " + vue.toDisplayString(gameState.value.last_play.claim),
                      1
                      /* TEXT */
                    )) : vue.createCommentVNode("v-if", true),
                    opponents.value[0].is_ai ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 1,
                      class: "ai-tag"
                    }, "AI")) : vue.createCommentVNode("v-if", true),
                    !opponents.value[0].is_alive ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 2,
                      class: "dead-tag"
                    }, "💀")) : vue.createCommentVNode("v-if", true)
                  ],
                  2
                  /* CLASS */
                )
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 对手区域（顶部只有一个） "),
              vue.createElementVNode("view", { class: "opponents-row" }, [
                opponents.value[1] ? (vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: 0,
                    class: vue.normalizeClass(["player-card", { active: gameState.value.current_player === opponents.value[1].seat_index, eliminated: !opponents.value[1].is_alive }])
                  },
                  [
                    vue.createCommentVNode(" 玩家编号 "),
                    vue.createElementVNode(
                      "view",
                      { class: "player-number" },
                      "P" + vue.toDisplayString(opponents.value[1].seat_index + 1),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("view", { class: "player-avatar" }, [
                      getCharacterHeadImage(opponents.value[1].character_id) ? (vue.openBlock(), vue.createElementBlock("image", {
                        key: 0,
                        class: "character-head",
                        src: getCharacterHeadImage(opponents.value[1].character_id),
                        mode: "aspectFill"
                      }, null, 8, ["src"])) : opponents.value[1].is_ai ? (vue.openBlock(), vue.createElementBlock("text", { key: 1 }, "🤖")) : (vue.openBlock(), vue.createElementBlock("text", { key: 2 }, "👤"))
                    ]),
                    vue.createElementVNode("view", { class: "player-name-row" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "player-name" },
                        vue.toDisplayString(opponents.value[1].nickname),
                        1
                        /* TEXT */
                      ),
                      opponents.value[1].character_id ? (vue.openBlock(), vue.createElementBlock(
                        "text",
                        {
                          key: 0,
                          class: "character-badge"
                        },
                        vue.toDisplayString(getCharacterName(opponents.value[1].character_id)),
                        1
                        /* TEXT */
                      )) : vue.createCommentVNode("v-if", true)
                    ]),
                    vue.createElementVNode("view", { class: "player-hp" }, [
                      (vue.openBlock(), vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(6, (i) => {
                          return vue.createElementVNode(
                            "view",
                            {
                              key: i,
                              class: vue.normalizeClass(["hp-dot", { filled: i <= (opponents.value[1].bullets || opponents.value[1].punishment_count || 0) }])
                            },
                            null,
                            2
                            /* CLASS */
                          );
                        }),
                        64
                        /* STABLE_FRAGMENT */
                      ))
                    ]),
                    vue.createElementVNode(
                      "text",
                      { class: "card-count" },
                      vue.toDisplayString(opponents.value[1].hand_count) + " 张牌",
                      1
                      /* TEXT */
                    ),
                    vue.createCommentVNode(" 显示最近出牌信息 "),
                    gameState.value.last_play && gameState.value.last_play.player_id === opponents.value[1].id ? (vue.openBlock(), vue.createElementBlock(
                      "text",
                      {
                        key: 0,
                        class: "last-played"
                      },
                      " 刚出 " + vue.toDisplayString(gameState.value.last_play.count) + " 张 " + vue.toDisplayString(gameState.value.last_play.claim),
                      1
                      /* TEXT */
                    )) : vue.createCommentVNode("v-if", true),
                    opponents.value[1].is_ai ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 1,
                      class: "ai-tag"
                    }, "AI")) : vue.createCommentVNode("v-if", true),
                    !opponents.value[1].is_alive ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 2,
                      class: "dead-tag"
                    }, "💀")) : vue.createCommentVNode("v-if", true)
                  ],
                  2
                  /* CLASS */
                )) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createCommentVNode(" 右侧对手 "),
              opponents.value[2] ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 1,
                class: "right-opponent"
              }, [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["player-card player-card-vertical", { active: gameState.value.current_player === opponents.value[2].seat_index, eliminated: !opponents.value[2].is_alive }])
                  },
                  [
                    vue.createCommentVNode(" 玩家编号 "),
                    vue.createElementVNode(
                      "view",
                      { class: "player-number" },
                      "P" + vue.toDisplayString(opponents.value[2].seat_index + 1),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("view", { class: "player-avatar" }, [
                      getCharacterHeadImage(opponents.value[2].character_id) ? (vue.openBlock(), vue.createElementBlock("image", {
                        key: 0,
                        class: "character-head",
                        src: getCharacterHeadImage(opponents.value[2].character_id),
                        mode: "aspectFill"
                      }, null, 8, ["src"])) : opponents.value[2].is_ai ? (vue.openBlock(), vue.createElementBlock("text", { key: 1 }, "🤖")) : (vue.openBlock(), vue.createElementBlock("text", { key: 2 }, "👤"))
                    ]),
                    vue.createElementVNode("view", { class: "player-name-row" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "player-name" },
                        vue.toDisplayString(opponents.value[2].nickname),
                        1
                        /* TEXT */
                      ),
                      opponents.value[2].character_id ? (vue.openBlock(), vue.createElementBlock(
                        "text",
                        {
                          key: 0,
                          class: "character-badge"
                        },
                        vue.toDisplayString(getCharacterName(opponents.value[2].character_id)),
                        1
                        /* TEXT */
                      )) : vue.createCommentVNode("v-if", true)
                    ]),
                    vue.createElementVNode("view", { class: "player-hp" }, [
                      (vue.openBlock(), vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(6, (i) => {
                          return vue.createElementVNode(
                            "view",
                            {
                              key: i,
                              class: vue.normalizeClass(["hp-dot", { filled: i <= (opponents.value[2].bullets || opponents.value[2].punishment_count || 0) }])
                            },
                            null,
                            2
                            /* CLASS */
                          );
                        }),
                        64
                        /* STABLE_FRAGMENT */
                      ))
                    ]),
                    vue.createElementVNode(
                      "text",
                      { class: "card-count" },
                      vue.toDisplayString(opponents.value[2].hand_count) + " 张牌",
                      1
                      /* TEXT */
                    ),
                    vue.createCommentVNode(" 显示最近出牌信息 "),
                    gameState.value.last_play && gameState.value.last_play.player_id === opponents.value[2].id ? (vue.openBlock(), vue.createElementBlock(
                      "text",
                      {
                        key: 0,
                        class: "last-played"
                      },
                      " 刚出 " + vue.toDisplayString(gameState.value.last_play.count) + " 张 " + vue.toDisplayString(gameState.value.last_play.claim),
                      1
                      /* TEXT */
                    )) : vue.createCommentVNode("v-if", true),
                    opponents.value[2].is_ai ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 1,
                      class: "ai-tag"
                    }, "AI")) : vue.createCommentVNode("v-if", true),
                    !opponents.value[2].is_alive ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 2,
                      class: "dead-tag"
                    }, "💀")) : vue.createCommentVNode("v-if", true)
                  ],
                  2
                  /* CLASS */
                )
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 中心区域 - 上家出牌 "),
              vue.createElementVNode("view", { class: "center-area" }, [
                gameState.value.last_play ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "last-play"
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "last-play-info" },
                    "P" + vue.toDisplayString(lastPlayPlayerSeatIndex.value + 1) + " 出牌",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "last-play-cards" }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(gameState.value.last_play.count, (i) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          key: i,
                          class: "play-card"
                        }, [
                          vue.createElementVNode(
                            "text",
                            { class: "card-text" },
                            vue.toDisplayString(gameState.value.last_play.claim),
                            1
                            /* TEXT */
                          )
                        ]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ])) : (vue.openBlock(), vue.createElementBlock("view", {
                  key: 1,
                  class: "no-play"
                }, [
                  vue.createElementVNode("text", null, "暂无出牌")
                ]))
              ]),
              vue.createCommentVNode(" 底部区域：手牌区（70%）+ 日志区（30%） "),
              vue.createElementVNode("view", { class: "bottom-container" }, [
                vue.createCommentVNode(" 自己的手牌区域 "),
                vue.createElementVNode("view", { class: "my-area" }, [
                  vue.createCommentVNode(" 第一行：个人信息 + 操作按钮 "),
                  vue.createElementVNode("view", { class: "top-info-row" }, [
                    vue.createElementVNode("view", { class: "my-info" }, [
                      vue.createCommentVNode(" 玩家编号 "),
                      myPlayer.value ? (vue.openBlock(), vue.createElementBlock(
                        "view",
                        {
                          key: 0,
                          class: "player-number my-number"
                        },
                        "P" + vue.toDisplayString(myPlayer.value.seat_index + 1),
                        1
                        /* TEXT */
                      )) : vue.createCommentVNode("v-if", true),
                      vue.createElementVNode("view", { class: "my-avatar" }, [
                        getCharacterHeadImage((_n = myPlayer.value) == null ? void 0 : _n.character_id) ? (vue.openBlock(), vue.createElementBlock("image", {
                          key: 0,
                          class: "character-head",
                          src: getCharacterHeadImage(myPlayer.value.character_id),
                          mode: "aspectFill"
                        }, null, 8, ["src"])) : (vue.openBlock(), vue.createElementBlock("text", { key: 1 }, "👤"))
                      ]),
                      vue.createElementVNode("view", { class: "my-details" }, [
                        vue.createElementVNode("view", { class: "player-name-row" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "my-name" },
                            vue.toDisplayString(((_o = vue.unref(authStore).user) == null ? void 0 : _o.nickname) || "我"),
                            1
                            /* TEXT */
                          ),
                          ((_p = myPlayer.value) == null ? void 0 : _p.character_id) ? (vue.openBlock(), vue.createElementBlock(
                            "text",
                            {
                              key: 0,
                              class: "character-badge"
                            },
                            vue.toDisplayString(getCharacterName(myPlayer.value.character_id)),
                            1
                            /* TEXT */
                          )) : vue.createCommentVNode("v-if", true)
                        ]),
                        vue.createElementVNode("view", { class: "my-hp" }, [
                          (vue.openBlock(), vue.createElementBlock(
                            vue.Fragment,
                            null,
                            vue.renderList(6, (i) => {
                              return vue.createElementVNode(
                                "view",
                                {
                                  key: i,
                                  class: vue.normalizeClass(["hp-dot", { filled: i <= myPunishmentCount.value }])
                                },
                                null,
                                2
                                /* CLASS */
                              );
                            }),
                            64
                            /* STABLE_FRAGMENT */
                          ))
                        ])
                      ])
                    ]),
                    vue.createCommentVNode(" 操作按钮组 "),
                    vue.createElementVNode("view", { class: "action-buttons-top" }, [
                      vue.createCommentVNode(" 出牌按钮 - 放在最前面 "),
                      canPlayCard.value ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 0,
                        class: "top-btn play-btn",
                        disabled: selectedCards.value.length === 0 || myHandCards.value.length === 0,
                        onClick: playCards
                      }, " 出牌(" + vue.toDisplayString(selectedCards.value.length) + ") ", 9, ["disabled"])) : vue.createCommentVNode("v-if", true),
                      vue.createCommentVNode(" 质疑按钮 - 手牌为0时禁用，已质疑后也禁用 "),
                      canChallenge.value ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 1,
                        class: "top-btn challenge-btn",
                        disabled: hasChallenged.value,
                        onClick: challenge
                      }, vue.toDisplayString(hasChallenged.value ? "已质疑" : "质疑"), 9, ["disabled"])) : vue.createCommentVNode("v-if", true),
                      vue.createCommentVNode(" 跳过按钮 - 只在质疑阶段显示，且不能是刚出牌的玩家，已放弃后禁用 "),
                      vue.createCommentVNode(" 当手牌为0且没有质疑权限时，不显示放弃按钮（会自动跳过） "),
                      canPass.value && ((_q = gameState.value) == null ? void 0 : _q.phase) === "CHALLENGE" && !isLastPlayByMe.value && !(myHandCards.value.length === 0 && !canChallenge.value) ? (vue.openBlock(), vue.createElementBlock("button", {
                        key: 2,
                        class: "top-btn pass-btn",
                        disabled: hasPassedChallenge.value,
                        onClick: passTurn
                      }, vue.toDisplayString(hasPassedChallenge.value ? "已放弃" : "放弃"), 9, ["disabled"])) : vue.createCommentVNode("v-if", true),
                      vue.createCommentVNode(" 状态提示 "),
                      myPlayer.value && myPlayer.value.hand_count === 0 && ((_r = gameState.value) == null ? void 0 : _r.phase) === "PLAYING" ? (vue.openBlock(), vue.createElementBlock("text", {
                        key: 3,
                        class: "status-text"
                      }, " 手牌已空，自动跳过 ")) : myHandCards.value.length === 0 && ((_s = gameState.value) == null ? void 0 : _s.phase) === "CHALLENGE" && !canChallenge.value ? (vue.openBlock(), vue.createElementBlock("text", {
                        key: 4,
                        class: "status-text"
                      }, " 手牌已空，自动放弃质疑 ")) : ((_t = gameState.value) == null ? void 0 : _t.phase) === "CHALLENGE" && !hasAnyAction.value ? (vue.openBlock(), vue.createElementBlock("text", {
                        key: 5,
                        class: "status-text"
                      }, " 等待质疑... ")) : !hasAnyAction.value && myPlayer.value && myPlayer.value.hand_count > 0 ? (vue.openBlock(), vue.createElementBlock("text", {
                        key: 6,
                        class: "status-text"
                      }, [
                        ((_u = gameState.value) == null ? void 0 : _u.phase) === "CHALLENGE" ? (vue.openBlock(), vue.createElementBlock(
                          vue.Fragment,
                          { key: 0 },
                          [
                            vue.createTextVNode("等待质疑...")
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        )) : ((_v = gameState.value) == null ? void 0 : _v.phase) === "PLAYING" ? (vue.openBlock(), vue.createElementBlock(
                          vue.Fragment,
                          { key: 1 },
                          [
                            vue.createTextVNode("等待操作...")
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        )) : (vue.openBlock(), vue.createElementBlock(
                          vue.Fragment,
                          { key: 2 },
                          [
                            vue.createTextVNode("等待中...")
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        ))
                      ])) : vue.createCommentVNode("v-if", true)
                    ])
                  ]),
                  vue.createCommentVNode(" 第二行：技能按钮（侧边栏）+ 手牌 "),
                  vue.createElementVNode("view", { class: "cards-row" }, [
                    vue.createCommentVNode(" Foxy技能按钮 "),
                    showSkillButton.value ? (vue.openBlock(), vue.createElementBlock("button", {
                      key: 0,
                      class: "skill-btn-sidebar",
                      disabled: !canUseSkill.value,
                      onClick: showSkillTargetSelect
                    }, [
                      vue.createElementVNode("view", { class: "skill-icon" }, "🔍"),
                      vue.createElementVNode(
                        "text",
                        { class: "skill-label" },
                        vue.toDisplayString(skillUsed.value ? "已用" : "偷看"),
                        1
                        /* TEXT */
                      )
                    ], 8, ["disabled"])) : vue.createCommentVNode("v-if", true),
                    vue.createCommentVNode(" 手牌区域 "),
                    myHandCards.value.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 1,
                      class: "hand-cards-container"
                    }, [
                      (vue.openBlock(true), vue.createElementBlock(
                        vue.Fragment,
                        null,
                        vue.renderList(myHandCards.value, (card, idx) => {
                          return vue.openBlock(), vue.createElementBlock("view", {
                            key: idx,
                            class: vue.normalizeClass(["hand-card", { selected: selectedCards.value.includes(idx) }]),
                            onClick: ($event) => toggleCard(idx)
                          }, [
                            vue.createElementVNode(
                              "text",
                              { class: "card-face" },
                              vue.toDisplayString(card),
                              1
                              /* TEXT */
                            )
                          ], 10, ["onClick"]);
                        }),
                        128
                        /* KEYED_FRAGMENT */
                      ))
                    ])) : (vue.openBlock(), vue.createElementBlock("view", {
                      key: 2,
                      class: "no-cards"
                    }, [
                      vue.createElementVNode("text", null, "手牌已出完")
                    ]))
                  ])
                ]),
                vue.createCommentVNode(" 行动日志/聊天面板 ")
              ]),
              vue.createCommentVNode(" 消息和日志气泡图标 "),
              vue.createElementVNode("view", { class: "bubble-container" }, [
                vue.createCommentVNode(" 聊天气泡图标 "),
                vue.createElementVNode("view", {
                  class: "bubble-icon",
                  onClick: toggleChatPanel
                }, [
                  vue.createElementVNode("text", { class: "bubble-emoji" }, "💬"),
                  chatMessages.value.length > 0 ? (vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: 0,
                      class: "bubble-badge"
                    },
                    vue.toDisplayString(chatMessages.value.length),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true)
                ]),
                vue.createCommentVNode(" 日志气泡图标 "),
                vue.createElementVNode("view", {
                  class: "bubble-icon",
                  onClick: toggleLogPanel
                }, [
                  vue.createElementVNode("text", { class: "bubble-emoji" }, "📋"),
                  gameLogs.value.length > 0 ? (vue.openBlock(), vue.createElementBlock(
                    "view",
                    {
                      key: 0,
                      class: "bubble-badge"
                    },
                    vue.toDisplayString(gameLogs.value.length),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true)
                ])
              ]),
              vue.createCommentVNode(" 聊天面板（绝对定位） "),
              chatExpanded.value ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 2,
                class: "chat-panel-overlay"
              }, [
                vue.createElementVNode("view", { class: "chat-panel" }, [
                  vue.createElementVNode("view", { class: "panel-header" }, [
                    vue.createElementVNode("text", { class: "panel-title" }, "聊天消息"),
                    vue.createElementVNode("text", {
                      class: "panel-close",
                      onClick: _cache[1] || (_cache[1] = ($event) => chatExpanded.value = false)
                    }, "✕")
                  ]),
                  vue.createElementVNode("scroll-view", {
                    class: "chat-messages-area",
                    "scroll-y": "",
                    "scroll-into-view": chatScrollIntoView.value,
                    "scroll-with-animation": ""
                  }, [
                    chatMessages.value.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "empty-hint"
                    }, "暂无消息")) : vue.createCommentVNode("v-if", true),
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(chatMessages.value, (msg, idx) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          key: idx,
                          id: msg.id,
                          class: "message-item"
                        }, [
                          vue.createElementVNode(
                            "text",
                            { class: "msg-sender" },
                            vue.toDisplayString(msg.sender || msg.sender_name) + ":",
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "msg-text" },
                            vue.toDisplayString(msg.text || msg.content),
                            1
                            /* TEXT */
                          )
                        ], 8, ["id"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ], 8, ["scroll-into-view"]),
                  vue.createElementVNode("view", { class: "chat-input-area" }, [
                    vue.withDirectives(vue.createElementVNode(
                      "input",
                      {
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => chatText.value = $event),
                        class: "chat-input",
                        placeholder: "输入消息...",
                        onConfirm: sendChatMessage
                      },
                      null,
                      544
                      /* NEED_HYDRATION, NEED_PATCH */
                    ), [
                      [vue.vModelText, chatText.value]
                    ]),
                    vue.createElementVNode("button", {
                      class: "send-btn",
                      onClick: sendChatMessage
                    }, "发送")
                  ])
                ])
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 日志面板（绝对定位） "),
              logExpanded.value ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 3,
                class: "log-panel-overlay"
              }, [
                vue.createElementVNode("view", { class: "log-panel" }, [
                  vue.createElementVNode("view", { class: "panel-header" }, [
                    vue.createElementVNode("text", { class: "panel-title" }, "游戏日志"),
                    vue.createElementVNode("text", {
                      class: "panel-close",
                      onClick: _cache[3] || (_cache[3] = ($event) => logExpanded.value = false)
                    }, "✕")
                  ]),
                  vue.createElementVNode("scroll-view", {
                    class: "log-content-area",
                    "scroll-y": "",
                    "scroll-into-view": logScrollIntoView.value,
                    "scroll-with-animation": ""
                  }, [
                    gameLogs.value.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "empty-hint"
                    }, "暂无日志")) : vue.createCommentVNode("v-if", true),
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(gameLogs.value, (log, idx) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          key: idx,
                          id: log.id,
                          class: vue.normalizeClass(["log-item", "log-type-" + log.type])
                        }, [
                          vue.createElementVNode(
                            "text",
                            { class: "log-text" },
                            vue.toDisplayString(log.text),
                            1
                            /* TEXT */
                          )
                        ], 10, ["id"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ], 8, ["scroll-into-view"])
                ])
              ])) : vue.createCommentVNode("v-if", true)
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 设置模态框 "),
            showSettings.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 6,
              class: "settings-overlay",
              onClick: vue.withModifiers(closeSettings, ["self"])
            }, [
              vue.createElementVNode("view", { class: "settings-modal" }, [
                vue.createElementVNode("view", { class: "settings-header" }, [
                  vue.createElementVNode("text", { class: "settings-title" }, "设置"),
                  vue.createElementVNode("view", {
                    class: "settings-close",
                    onClick: closeSettings
                  }, "×")
                ]),
                vue.createElementVNode("view", { class: "settings-content" }, [
                  vue.createElementVNode("view", { class: "volume-panel" }, [
                    vue.createElementVNode("text", { class: "settings-section-title" }, "音量设置"),
                    (vue.openBlock(), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList(volumeItems, (item) => {
                        return vue.createElementVNode("view", {
                          key: item.key,
                          class: "volume-row"
                        }, [
                          vue.createElementVNode("view", { class: "volume-info" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "volume-label" },
                              vue.toDisplayString(item.label),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "volume-value" },
                              vue.toDisplayString(audioSettings.value[item.key]) + "%",
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("slider", {
                            class: "volume-slider",
                            value: audioSettings.value[item.key],
                            min: "0",
                            max: "100",
                            "block-size": "20",
                            activeColor: "#d4a574",
                            backgroundColor: "#3a2616",
                            onChanging: ($event) => updateVolume(item.key, $event),
                            onChange: ($event) => updateVolume(item.key, $event)
                          }, null, 40, ["value", "onChanging", "onChange"])
                        ]);
                      }),
                      64
                      /* STABLE_FRAGMENT */
                    ))
                  ]),
                  vue.createElementVNode("view", { class: "credits-panel" }, [
                    vue.createElementVNode("text", { class: "settings-section-title" }, "制作人员名单"),
                    vue.createElementVNode("view", { class: "credits-viewport" }, [
                      vue.createElementVNode("view", { class: "credits-scroll" }, [
                        vue.createElementVNode("text", { class: "credits-main-title" }, "《LIAR'S BAR》制作人员名单"),
                        vue.createElementVNode("text", { class: "credits-studio" }, "武妖灵工作室"),
                        vue.createElementVNode("text", { class: "credits-group" }, "项目统筹"),
                        vue.createElementVNode("text", { class: "credits-line" }, "项目经理：李汶洋"),
                        vue.createElementVNode("text", { class: "credits-duty" }, "工作职责：项目管理、游戏策划、服务端开发、美术制作、台词配音"),
                        vue.createElementVNode("text", { class: "credits-group" }, "视频与文档组"),
                        vue.createElementVNode("text", { class: "credits-line" }, "剪辑、文档管理：游翔宇"),
                        vue.createElementVNode("text", { class: "credits-line" }, "文档管理：陆鑫涛"),
                        vue.createElementVNode("text", { class: "credits-group" }, "音频制作"),
                        vue.createElementVNode("text", { class: "credits-line" }, "BGM 作曲、音效制作：朱昱丞"),
                        vue.createElementVNode("text", { class: "credits-group" }, "程序开发"),
                        vue.createElementVNode("text", { class: "credits-line" }, "服务端开发：李汶洋、吴子轩"),
                        vue.createElementVNode("text", { class: "credits-line" }, "客户端开发：李昊燃"),
                        vue.createElementVNode("text", { class: "credits-group" }, "全体测试人员"),
                        vue.createElementVNode("text", { class: "credits-line" }, "李汶洋、游翔宇、陆鑫涛、朱昱丞、吴子轩、李昊燃"),
                        vue.createElementVNode("text", { class: "credits-group" }, "版权信息"),
                        vue.createElementVNode("text", { class: "credits-line" }, "©2026 武妖灵工作室 保留所有权利"),
                        vue.createElementVNode("view", { class: "credits-spacer" }),
                        vue.createElementVNode("text", { class: "credits-main-title" }, "《LIAR'S BAR》制作人员名单"),
                        vue.createElementVNode("text", { class: "credits-studio" }, "武妖灵工作室")
                      ])
                    ])
                  ])
                ])
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 规则弹窗 "),
            vue.createVNode(RulesModal, {
              visible: showRules.value,
              "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => showRules.value = $event)
            }, null, 8, ["visible"]),
            vue.createCommentVNode(" Foxy技能目标选择弹窗 "),
            showSkillTargets.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 7,
              class: "skill-overlay",
              onClick: _cache[6] || (_cache[6] = vue.withModifiers(($event) => showSkillTargets.value = false, ["self"]))
            }, [
              vue.createElementVNode("view", { class: "skill-modal" }, [
                vue.createElementVNode("text", { class: "skill-modal-title" }, "选择偷看目标"),
                vue.createElementVNode("view", { class: "skill-targets" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(opponents.value, (player) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: player.id,
                        class: vue.normalizeClass(["skill-target", { disabled: !player.is_alive }]),
                        onClick: ($event) => useSkillOnTarget(player.id)
                      }, [
                        vue.createElementVNode("view", { class: "target-avatar" }, [
                          getCharacterHeadImage(player.character_id) ? (vue.openBlock(), vue.createElementBlock("image", {
                            key: 0,
                            class: "character-head",
                            src: getCharacterHeadImage(player.character_id),
                            mode: "aspectFill"
                          }, null, 8, ["src"])) : (vue.openBlock(), vue.createElementBlock(
                            "text",
                            { key: 1 },
                            vue.toDisplayString(player.is_ai ? "🤖" : "👤"),
                            1
                            /* TEXT */
                          ))
                        ]),
                        vue.createElementVNode(
                          "text",
                          { class: "target-name" },
                          vue.toDisplayString(player.nickname),
                          1
                          /* TEXT */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "target-cards" },
                          vue.toDisplayString(player.hand_count) + " 张牌",
                          1
                          /* TEXT */
                        )
                      ], 10, ["onClick"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                vue.createElementVNode("button", {
                  class: "skill-cancel",
                  onClick: _cache[5] || (_cache[5] = ($event) => showSkillTargets.value = false)
                }, "取消")
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" Foxy技能偷看结果弹窗 "),
            skillPeekResult.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 8,
              class: "skill-peek-overlay"
            }, [
              vue.createElementVNode("view", { class: "skill-peek-modal" }, [
                vue.createElementVNode(
                  "text",
                  { class: "peek-title" },
                  "🔍 " + vue.toDisplayString(skillPeekResult.value.targetName) + " 的手牌",
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "peek-cards" }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(skillPeekResult.value.cards, (card, idx) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: idx,
                        class: "peek-card"
                      }, [
                        vue.createElementVNode(
                          "text",
                          { class: "peek-card-face" },
                          vue.toDisplayString(card),
                          1
                          /* TEXT */
                        )
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                vue.createElementVNode(
                  "text",
                  { class: "peek-timer" },
                  vue.toDisplayString(skillPeekResult.value.remaining) + "秒后自动关闭",
                  1
                  /* TEXT */
                )
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" Toast "),
            vue.createVNode(Toast, {
              visible: toast.value.show,
              "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => toast.value.show = $event),
              message: toast.value.msg,
              type: toast.value.type
            }, null, 8, ["visible", "message", "type"]),
            vue.createCommentVNode(" 自定义确认对话框 "),
            vue.createVNode(ConfirmDialog, {
              visible: confirmDialog.value.visible,
              "onUpdate:visible": _cache[8] || (_cache[8] = ($event) => confirmDialog.value.visible = $event),
              title: confirmDialog.value.title,
              content: confirmDialog.value.content,
              onConfirm: confirmDialog.value.onConfirm,
              onCancel: confirmDialog.value.onCancel
            }, null, 8, ["visible", "title", "content", "onConfirm", "onCancel"]),
            vue.createCommentVNode(" 自定义输入对话框 "),
            vue.createVNode(InputDialog, {
              visible: inputDialog.value.visible,
              "onUpdate:visible": _cache[9] || (_cache[9] = ($event) => inputDialog.value.visible = $event),
              title: inputDialog.value.title,
              placeholder: inputDialog.value.placeholder,
              onConfirm: inputDialog.value.onConfirm,
              onCancel: inputDialog.value.onCancel
            }, null, 8, ["visible", "title", "placeholder", "onConfirm", "onCancel"])
          ],
          2
          /* CLASS */
        );
      };
    }
  };
  const PagesGameRoomGameRoom = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-1578de9f"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/game-room/game-room.vue"]]);
  const _sfc_main$2 = {
    __name: "profile",
    setup(__props) {
      const authStore = useAuthStore();
      const DEFAULT_PROFILE = {
        id: null,
        username: "",
        nickname: "玩家",
        avatar_url: "",
        email: "",
        elo_rating: 1200,
        total_games: 0,
        total_wins: 0,
        total_losses: 0,
        total_lies: 0,
        total_challenges: 0,
        total_successful_challenges: 0
      };
      const profile = vue.ref(createProfile());
      const editNickname = vue.ref("");
      const loading = vue.ref(false);
      const toast = vue.ref({ show: false, msg: "", type: "error" });
      const winRate = vue.computed(() => {
        const total = Number(profile.value.total_games) || 0;
        if (total === 0)
          return 0;
        return Math.round((Number(profile.value.total_wins) || 0) / total * 100);
      });
      vue.onMounted(() => {
        loadProfile();
      });
      function normalizeProfileResponse(res) {
        if ((res == null ? void 0 : res.data) && typeof res.data === "object")
          return res.data;
        if (res && typeof res === "object")
          return res;
        return {};
      }
      function createProfile(data = {}) {
        const storedUser = authStore.user || {};
        return {
          ...DEFAULT_PROFILE,
          ...storedUser,
          ...data,
          nickname: data.nickname || storedUser.nickname || DEFAULT_PROFILE.nickname,
          username: data.username || storedUser.username || DEFAULT_PROFILE.username
        };
      }
      async function loadProfile() {
        loading.value = true;
        try {
          const res = await userAPI.getProfile();
          const nextProfile = createProfile(normalizeProfileResponse(res));
          profile.value = nextProfile;
          editNickname.value = nextProfile.nickname || "";
        } catch (e) {
          formatAppLog("error", "at pages/profile/profile.vue:157", "Failed to load profile:", e);
          profile.value = createProfile(profile.value);
          editNickname.value = profile.value.nickname || "";
          showToast("加载失败，已显示本地资料");
        } finally {
          loading.value = false;
        }
      }
      function showToast(msg, type = "error") {
        toast.value = { show: true, msg, type };
      }
      async function updateProfile() {
        try {
          const res = await userAPI.updateProfile({ nickname: editNickname.value });
          const nextProfile = createProfile({
            ...profile.value,
            ...normalizeProfileResponse(res),
            nickname: editNickname.value
          });
          profile.value = nextProfile;
          authStore.updateUser({
            nickname: nextProfile.nickname
          });
          showToast("保存成功", "success");
        } catch (e) {
          showToast("保存失败");
        }
      }
      function goBack() {
        uni.navigateBack();
      }
      return (_ctx, _cache) => {
        var _a;
        return vue.openBlock(), vue.createElementBlock("view", { class: "profile-page" }, [
          vue.createElementVNode("view", { class: "page-header safe-area-inset-top" }, [
            vue.createElementVNode("button", {
              class: "back-btn",
              onClick: goBack
            }, "← 返回"),
            vue.createElementVNode("text", { class: "page-title" }, "个人中心"),
            vue.createElementVNode("view", { style: { "width": "100rpx" } })
          ]),
          vue.createElementVNode("view", { class: "profile-content" }, [
            vue.createCommentVNode(" 上半部分：左右布局 "),
            vue.createElementVNode("view", { class: "top-section" }, [
              vue.createCommentVNode(" 左侧：头像和基本信息 "),
              vue.createElementVNode("view", { class: "left-panel" }, [
                vue.createCommentVNode(" 头像和昵称行 "),
                vue.createElementVNode("view", { class: "user-header" }, [
                  vue.createElementVNode(
                    "view",
                    { class: "avatar" },
                    vue.toDisplayString(((_a = profile.value.nickname) == null ? void 0 : _a.charAt(0)) || "?"),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("view", { class: "user-info" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "nickname" },
                      vue.toDisplayString(profile.value.nickname),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "text",
                      { class: "username" },
                      "@" + vue.toDisplayString(profile.value.username),
                      1
                      /* TEXT */
                    )
                  ])
                ]),
                vue.createCommentVNode(" 关键数据横向排列 "),
                vue.createElementVNode("view", { class: "key-stats" }, [
                  vue.createElementVNode("view", { class: "key-stat-item" }, [
                    vue.createElementVNode("text", { class: "key-stat-label" }, "ELO"),
                    vue.createElementVNode(
                      "text",
                      { class: "key-stat-value" },
                      vue.toDisplayString(profile.value.elo_rating),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "key-stat-item" }, [
                    vue.createElementVNode("text", { class: "key-stat-label" }, "胜率"),
                    vue.createElementVNode(
                      "text",
                      { class: "key-stat-value" },
                      vue.toDisplayString(winRate.value) + "%",
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "key-stat-item" }, [
                    vue.createElementVNode("text", { class: "key-stat-label" }, "总局"),
                    vue.createElementVNode(
                      "text",
                      { class: "key-stat-value" },
                      vue.toDisplayString(profile.value.total_games),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "key-stat-item" }, [
                    vue.createElementVNode("text", { class: "key-stat-label" }, "胜场"),
                    vue.createElementVNode(
                      "text",
                      { class: "key-stat-value" },
                      vue.toDisplayString(profile.value.total_wins),
                      1
                      /* TEXT */
                    )
                  ])
                ])
              ]),
              vue.createCommentVNode(" 右侧：详细数据 "),
              vue.createElementVNode("view", { class: "right-panel" }, [
                vue.createElementVNode("text", { class: "panel-title" }, "详细数据"),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createElementVNode("text", { class: "data-label" }, "总游戏"),
                  vue.createElementVNode(
                    "text",
                    { class: "data-value" },
                    vue.toDisplayString(profile.value.total_games),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createElementVNode("text", { class: "data-label" }, "胜利"),
                  vue.createElementVNode(
                    "text",
                    { class: "data-value" },
                    vue.toDisplayString(profile.value.total_wins),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createElementVNode("text", { class: "data-label" }, "失败"),
                  vue.createElementVNode(
                    "text",
                    { class: "data-value" },
                    vue.toDisplayString(profile.value.total_losses),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createElementVNode("text", { class: "data-label" }, "撒谎次数"),
                  vue.createElementVNode(
                    "text",
                    { class: "data-value" },
                    vue.toDisplayString(profile.value.total_lies),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createElementVNode("text", { class: "data-label" }, "质疑次数"),
                  vue.createElementVNode(
                    "text",
                    { class: "data-value" },
                    vue.toDisplayString(profile.value.total_challenges),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("view", { class: "data-row" }, [
                  vue.createElementVNode("text", { class: "data-label" }, "质疑成功"),
                  vue.createElementVNode(
                    "text",
                    { class: "data-value" },
                    vue.toDisplayString(profile.value.total_successful_challenges),
                    1
                    /* TEXT */
                  )
                ])
              ])
            ]),
            vue.createCommentVNode(" 底部：修改资料 "),
            vue.createElementVNode("view", { class: "edit-section" }, [
              vue.createElementVNode("text", { class: "section-title" }, "修改资料"),
              vue.createElementVNode("view", { class: "edit-form" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => editNickname.value = $event),
                    class: "edit-input",
                    placeholder: "新昵称",
                    "placeholder-class": "input-placeholder"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, editNickname.value]
                ]),
                vue.createElementVNode("button", {
                  class: "save-btn",
                  disabled: !editNickname.value || editNickname.value === profile.value.nickname,
                  onClick: updateProfile
                }, " 保存修改 ", 8, ["disabled"])
              ])
            ]),
            loading.value ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "loading-mask"
            }, [
              vue.createElementVNode("text", { class: "loading-text" }, "加载中...")
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          vue.createVNode(Toast, {
            visible: toast.value.show,
            "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => toast.value.show = $event),
            message: toast.value.msg,
            type: toast.value.type
          }, null, 8, ["visible", "message", "type"])
        ]);
      };
    }
  };
  const PagesProfileProfile = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-dd383ca2"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/profile/profile.vue"]]);
  const _sfc_main$1 = {
    __name: "history",
    setup(__props) {
      const historyList = vue.ref([]);
      const toast = vue.ref({ show: false, msg: "", type: "error" });
      vue.onMounted(async () => {
        try {
          const res = await historyAPI.list();
          historyList.value = res.data || [];
        } catch (e) {
          formatAppLog("error", "at pages/history/history.vue:67", "Failed to load history:", e);
          showToast("加载失败");
        }
      });
      function showToast(msg, type = "error") {
        toast.value = { show: true, msg, type };
      }
      function formatDate(dateStr) {
        if (!dateStr)
          return "";
        const date = new Date(dateStr);
        const now2 = /* @__PURE__ */ new Date();
        const diff = now2 - date;
        const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
        if (days === 0)
          return "今天";
        if (days === 1)
          return "昨天";
        if (days < 7)
          return `${days}天前`;
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }
      function goBack() {
        uni.navigateBack();
      }
      return (_ctx, _cache) => {
        return vue.openBlock(), vue.createElementBlock("view", { class: "history-page" }, [
          vue.createElementVNode("view", { class: "page-header safe-area-inset-top" }, [
            vue.createElementVNode("button", {
              class: "back-btn",
              onClick: goBack
            }, "← 返回"),
            vue.createElementVNode("text", { class: "page-title" }, "历史战绩"),
            vue.createElementVNode("view", { style: { "width": "100rpx" } })
          ]),
          vue.createElementVNode("scroll-view", {
            class: "history-content",
            "scroll-y": ""
          }, [
            historyList.value.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty"
            }, "暂无历史记录")) : vue.createCommentVNode("v-if", true),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList(historyList.value, (record) => {
                return vue.openBlock(), vue.createElementBlock(
                  "view",
                  {
                    key: record.id,
                    class: vue.normalizeClass(["history-card", { win: record.is_win, lose: !record.is_win }])
                  },
                  [
                    vue.createElementVNode("view", { class: "history-header" }, [
                      vue.createElementVNode(
                        "view",
                        {
                          class: vue.normalizeClass(["result-badge", { win: record.is_win }])
                        },
                        vue.toDisplayString(record.is_win ? "胜利" : "失败"),
                        3
                        /* TEXT, CLASS */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "history-date" },
                        vue.toDisplayString(formatDate(record.created_at)),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "history-stats" }, [
                      vue.createElementVNode("view", { class: "stat-item" }, [
                        vue.createElementVNode("text", { class: "stat-label" }, "回合数"),
                        vue.createElementVNode(
                          "text",
                          { class: "stat-value" },
                          vue.toDisplayString(record.total_turns || 0),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "stat-item" }, [
                        vue.createElementVNode("text", { class: "stat-label" }, "出牌次数"),
                        vue.createElementVNode(
                          "text",
                          { class: "stat-value" },
                          vue.toDisplayString(record.plays_count || 0),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "stat-item" }, [
                        vue.createElementVNode("text", { class: "stat-label" }, "质疑次数"),
                        vue.createElementVNode(
                          "text",
                          { class: "stat-value" },
                          vue.toDisplayString(record.challenges_count || 0),
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    record.elo_change ? (vue.openBlock(), vue.createElementBlock(
                      "view",
                      {
                        key: 0,
                        class: vue.normalizeClass(["elo-change", { positive: record.elo_change > 0 }])
                      },
                      " ELO " + vue.toDisplayString(record.elo_change > 0 ? "+" : "") + vue.toDisplayString(record.elo_change),
                      3
                      /* TEXT, CLASS */
                    )) : vue.createCommentVNode("v-if", true)
                  ],
                  2
                  /* CLASS */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]),
          vue.createVNode(Toast, {
            visible: toast.value.show,
            "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => toast.value.show = $event),
            message: toast.value.msg,
            type: toast.value.type
          }, null, 8, ["visible", "message", "type"])
        ]);
      };
    }
  };
  const PagesHistoryHistory = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-b2d018fa"], ["__file", "/Users/evenyoung/Desktop/shijian3/qizha/pages/history/history.vue"]]);
  __definePage("pages/studio-splash/studio-splash", PagesStudioSplashStudioSplash);
  __definePage("pages/login/login", PagesLoginLogin);
  __definePage("pages/register/register", PagesRegisterRegister);
  __definePage("pages/cg/cg", PagesCgCg);
  __definePage("pages/lobby/lobby", PagesLobbyLobby);
  __definePage("pages/character-select/character-select", PagesCharacterSelectCharacterSelect);
  __definePage("pages/match-wait/match-wait", PagesMatchWaitMatchWait);
  __definePage("pages/game-room/game-room", PagesGameRoomGameRoom);
  __definePage("pages/profile/profile", PagesProfileProfile);
  __definePage("pages/history/history", PagesHistoryHistory);
  const _sfc_main = {
    __name: "App",
    setup(__props) {
      function lockLandscape() {
        plus.screen.lockOrientation("landscape-primary");
      }
      function applyAppFullscreen() {
        lockLandscape();
        plus.navigator.setFullscreen(true);
        plus.navigator.hideSystemNavigation();
        plus.navigator.setStatusBarStyle("dark");
      }
      onLaunch(() => {
        formatAppLog("log", "at App.vue:28", "App Launch");
        if (typeof plus !== "undefined") {
          applyAppFullscreen();
        } else if (typeof document !== "undefined") {
          document.addEventListener("plusready", applyAppFullscreen, false);
        }
      });
      onShow(() => {
        formatAppLog("log", "at App.vue:46", "App Show");
        lockLandscape();
      });
      onHide(() => {
        formatAppLog("log", "at App.vue:51", "App Hide");
        stopAllAudio();
      });
      return () => {
      };
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/Users/evenyoung/Desktop/shijian3/qizha/App.vue"]]);
  const LT = {
    Launch: "1",
    Hide: "3",
    Page: "11",
    Event: "21",
    Error: "31",
    Push: "101"
  };
  const CST = {
    ColdLaunch: 1,
    BackgroundTimeout: 2,
    PageInactiveTimeout: 3
  };
  const IEY = {
    No: 0,
    Yes: 1
  };
  function toIey(input) {
    if (input === true || input === 1 || input === "1")
      return IEY.Yes;
    return IEY.No;
  }
  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
  };
  const DEFAULT_MAX_LENGTH = 4096;
  const TRUNCATED_SUFFIX = "…[truncated]";
  function safeStringify(value, max = DEFAULT_MAX_LENGTH) {
    var _a;
    if (value === void 0)
      return "";
    let raw;
    if (typeof value === "string") {
      raw = value;
    } else {
      const seen2 = /* @__PURE__ */ new WeakSet();
      try {
        raw = (_a = JSON.stringify(value, (_key, val) => {
          if (typeof val === "object" && val !== null) {
            if (seen2.has(val))
              return "[Circular]";
            seen2.add(val);
          }
          if (typeof val === "bigint")
            return val.toString();
          if (typeof val === "function")
            return `[Function ${val.name || "anonymous"}]`;
          return val;
        })) !== null && _a !== void 0 ? _a : "";
      } catch (e) {
        raw = `[Unserializable: ${e.message}]`;
      }
    }
    if (raw.length > max) {
      return raw.slice(0, Math.max(0, max - TRUNCATED_SUFFIX.length)) + TRUNCATED_SUFFIX;
    }
    return raw;
  }
  function tryRun(fn, fallback) {
    try {
      return fn();
    } catch (_a) {
      return fallback;
    }
  }
  function withRetry(fn, opts) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a;
      const total = Math.max(1, Math.floor(opts.times));
      const sleep = (_a = opts.sleep) !== null && _a !== void 0 ? _a : defaultSleep;
      let lastErr;
      for (let attempt = 1; attempt <= total; attempt++) {
        try {
          return yield fn();
        } catch (e) {
          lastErr = e;
          if (attempt >= total)
            break;
          yield sleep(opts.baseDelayMs * Math.pow(2, attempt - 1));
        }
      }
      throw lastErr;
    });
  }
  function defaultSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function isUsableUniRuntime(candidate) {
    if (candidate == null || typeof candidate !== "object")
      return false;
    const u = candidate;
    return typeof u.getStorageSync === "function" || typeof u.onCreateVueApp === "function" || typeof u.request === "function" || typeof u.onAppShow === "function";
  }
  function getModuleUniCandidate() {
    if (typeof uni === "undefined" || uni == null || typeof uni !== "object") {
      return void 0;
    }
    return uni;
  }
  function getWindowObject() {
    try {
      const w = Function('return typeof window !== "undefined" ? window : undefined')();
      return w != null ? w : void 0;
    } catch (_a) {
      return void 0;
    }
  }
  function getGlobalObject() {
    if (typeof globalThis !== "undefined" && globalThis != null) {
      return globalThis;
    }
    if (typeof global !== "undefined" && global != null) {
      return global;
    }
    if (typeof self !== "undefined" && self != null) {
      return self;
    }
    const win = getWindowObject();
    if (win)
      return win;
    return {};
  }
  function buildInjectedUniRuntime() {
    try {
      const out = {};
      const pick = (name, fn) => {
        if (typeof fn === "function")
          out[name] = fn;
      };
      pick("getStorageSync", uni.getStorageSync);
      pick("setStorageSync", uni.setStorageSync);
      pick("removeStorageSync", uni.removeStorageSync);
      pick("getSystemInfoSync", uni.getSystemInfoSync);
      pick("getDeviceInfo", uni.getDeviceInfo);
      pick("getAppBaseInfo", uni.getAppBaseInfo);
      pick("getWindowInfo", uni.getWindowInfo);
      pick("getNetworkType", uni.getNetworkType);
      pick("request", uni.request);
      pick("onAppShow", uni.onAppShow);
      pick("offAppShow", uni.offAppShow);
      pick("onAppHide", uni.onAppHide);
      pick("offAppHide", uni.offAppHide);
      pick("onAppLaunch", uni.onAppLaunch);
      pick("offAppLaunch", uni.offAppLaunch);
      pick("getLaunchOptionsSync", uni.getLaunchOptionsSync);
      pick("addInterceptor", uni.addInterceptor);
      pick("removeInterceptor", uni.removeInterceptor);
      pick("getPushClientId", uni.getPushClientId);
      pick("getAccountInfoSync", uni.getAccountInfoSync);
      pick("onCreateVueApp", uni.onCreateVueApp);
      return Object.keys(out).length > 0 ? out : void 0;
    } catch (_e) {
      return void 0;
    }
  }
  function probeUniRuntime() {
    const globalThisAvailable = typeof globalThis !== "undefined";
    const g = getGlobalObject();
    const globalUni = g.uni;
    const globalThisHasUni = globalUni != null && typeof globalUni === "object";
    const globalThisUniStub = globalThisHasUni && !isUsableUniRuntime(globalUni);
    const moduleUni = getModuleUniCandidate();
    const moduleUniDefined = moduleUni != null;
    if (isUsableUniRuntime(globalUni)) {
      return {
        resolved: true,
        source: "globalThis",
        globalThisHasUni: true,
        globalThisUniStub: false,
        moduleUniDefined,
        globalThisAvailable,
        uni: globalUni
      };
    }
    if (isUsableUniRuntime(moduleUni)) {
      return {
        resolved: true,
        source: "module",
        globalThisHasUni,
        globalThisUniStub,
        moduleUniDefined: true,
        globalThisAvailable,
        uni: moduleUni
      };
    }
    const injectedUni = buildInjectedUniRuntime();
    if (isUsableUniRuntime(injectedUni)) {
      return {
        resolved: true,
        source: "injected",
        globalThisHasUni,
        globalThisUniStub,
        moduleUniDefined,
        globalThisAvailable,
        uni: injectedUni
      };
    }
    return {
      resolved: false,
      source: "none",
      globalThisHasUni,
      globalThisUniStub,
      moduleUniDefined,
      globalThisAvailable,
      uni: void 0
    };
  }
  function resolveUniRuntime() {
    const probe = probeUniRuntime();
    return probe.resolved ? probe.uni : void 0;
  }
  const TAG = "[uni统计 2.0]";
  let runtimeDebug;
  let muteNonDebug;
  function preferSingleLineConsole() {
    return isAndroidOrIosRuntime();
  }
  function isAndroidOrIosRuntime() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const raw = (_a = "app") !== null && _a !== void 0 ? _a : "";
    const g = getGlobalObject();
    if (raw === "app" || raw === "app-plus" || raw === "app-harmony") {
      const n2 = (_d = (_c = (_b = g.plus) === null || _b === void 0 ? void 0 : _b.os) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.toLowerCase();
      if (!n2)
        return false;
      if (n2.includes("android"))
        return true;
      if (n2 === "ios" || n2.includes("iphone"))
        return true;
      return false;
    }
    if (raw.startsWith("mp-")) {
      try {
        const p = (_h = (_g = (_f = (_e = g.uni) === null || _e === void 0 ? void 0 : _e.getSystemInfoSync) === null || _f === void 0 ? void 0 : _f.call(_e)) === null || _g === void 0 ? void 0 : _g.platform) === null || _h === void 0 ? void 0 : _h.toLowerCase();
        return p === "android" || p === "ios";
      } catch (_j) {
        return false;
      }
    }
    return false;
  }
  function stringifyObjectArgForNative(value) {
    if (value === null || value === void 0)
      return value;
    if (typeof value !== "object")
      return value;
    if (value instanceof Error)
      return `${value.name}: ${value.message}`;
    return safeStringify(value);
  }
  function formatLogArgForNativeConsole(value) {
    if (value === null)
      return "null";
    if (value === void 0)
      return "undefined";
    if (typeof value === "string")
      return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (typeof value === "bigint")
      return String(value);
    if (typeof value === "symbol") {
      try {
        return value.toString();
      } catch (_a) {
        return "?";
      }
    }
    if (typeof value === "function") {
      const fn = value;
      return `[Function ${fn.name || "anonymous"}]`;
    }
    if (typeof value === "object") {
      if (value instanceof Error)
        return `${value.name}: ${value.message}`;
      return safeStringify(value);
    }
    return String(value);
  }
  function isNonDebugMuted() {
    if (muteNonDebug !== void 0)
      return muteNonDebug;
    return false;
  }
  function setMuteNonDebug(value) {
    muteNonDebug = value;
  }
  function emitConsole(method, args) {
    if (method !== "log" && isNonDebugMuted())
      return;
    const fn = console[method];
    if (!preferSingleLineConsole()) {
      fn.call(console, TAG, ...args);
      return;
    }
    const mapped = isAndroidOrIosRuntime() ? args.map(stringifyObjectArgForNative) : args;
    if (mapped.length === 0) {
      fn.call(console, TAG);
      return;
    }
    const body = mapped.map(formatLogArgForNativeConsole).join(" ");
    fn.call(console, `${TAG} ${body}`);
  }
  function isDebug() {
    if (runtimeDebug !== void 0)
      return runtimeDebug;
    const v = "false";
    return v === true;
  }
  function setDebug(value) {
    runtimeDebug = value;
  }
  const logger = {
    debug(...args) {
      if (!isDebug())
        return;
      emitConsole("log", args);
    },
    info(...args) {
      emitConsole("info", args);
    },
    warn(...args) {
      emitConsole("warn", args);
    },
    error(...args) {
      emitConsole("error", args);
    },
    setDebug,
    isDebug,
    setMuteNonDebug
  };
  const NAMESPACE_ROOT = "UNI_STAT_DATA";
  const LEGACY_NAMESPACE_ROOT = "$$STAT__DBDATA";
  const cache = /* @__PURE__ */ new Map();
  const knownKeys = /* @__PURE__ */ new Set();
  function fullKey(key) {
    const appid = "__UNI__8078FF1";
    return `${NAMESPACE_ROOT}:${appid}:${key}`;
  }
  function getUni$9() {
    const raw = resolveUniRuntime();
    const u = raw != null && typeof raw === "object" ? raw : void 0;
    if (!u || typeof u.getStorageSync !== "function") {
      throw new Error("[uni统计 2.0] uni storage API is not available");
    }
    return u;
  }
  function get(key) {
    const fk = fullKey(key);
    if (cache.has(fk))
      return cache.get(fk);
    try {
      const raw = getUni$9().getStorageSync(fk);
      if (raw === "" || raw === null || raw === void 0) {
        cache.set(fk, void 0);
        return void 0;
      }
      cache.set(fk, raw);
      knownKeys.add(fk);
      return raw;
    } catch (_a) {
      return void 0;
    }
  }
  function safeRead(key) {
    const fk = fullKey(key);
    if (cache.has(fk))
      return { ok: true, value: cache.get(fk) };
    try {
      const raw = getUni$9().getStorageSync(fk);
      if (raw === "" || raw === null || raw === void 0) {
        cache.set(fk, void 0);
        return { ok: true, value: void 0 };
      }
      cache.set(fk, raw);
      knownKeys.add(fk);
      return { ok: true, value: raw };
    } catch (_a) {
      return { ok: false, value: void 0 };
    }
  }
  function set(key, value) {
    const fk = fullKey(key);
    if (value === void 0) {
      remove(key);
      return;
    }
    cache.set(fk, value);
    knownKeys.add(fk);
    try {
      getUni$9().setStorageSync(fk, value);
    } catch (_a) {
    }
  }
  function remove(key) {
    const fk = fullKey(key);
    cache.set(fk, void 0);
    try {
      getUni$9().removeStorageSync(fk);
    } catch (_a) {
    }
  }
  function batchGet(keys) {
    const out = {};
    for (const k of keys)
      out[k] = get(k);
    return out;
  }
  function batchSet(entries) {
    for (const k of Object.keys(entries))
      set(k, entries[k]);
  }
  function clearNamespace() {
    let uni2;
    try {
      uni2 = getUni$9();
    } catch (_a) {
    }
    for (const fk of Array.from(knownKeys)) {
      try {
        uni2 === null || uni2 === void 0 ? void 0 : uni2.removeStorageSync(fk);
      } catch (_b) {
      }
      cache.set(fk, void 0);
    }
    knownKeys.clear();
  }
  function __resetCache() {
    cache.clear();
    knownKeys.clear();
  }
  const storage = {
    get,
    set,
    remove,
    safeRead,
    batchGet,
    batchSet,
    clearNamespace,
    __resetCache
  };
  const KEY_FVTS = "visit:fvts";
  const KEY_LVTS = "visit:lvts";
  const KEY_TVC = "visit:tvc";
  const EMPTY_SNAPSHOT = {
    fvts: 0,
    lvts: 0,
    tvc: 0,
    isNewUser: true,
    degraded: false
  };
  let loaded = null;
  let pending = null;
  let pendingRenewal = null;
  let committed = null;
  let lastBuilt = null;
  let buildCalledInProcess = false;
  function toNum(v) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0)
      return v;
    if (typeof v === "string" && v.length > 0) {
      const n2 = Number(v);
      if (Number.isFinite(n2) && n2 >= 0)
        return n2;
    }
    return 0;
  }
  function isLikelyFreshDevice(snap) {
    return snap.fvts === 0 && snap.lvts === 0 && snap.tvc === 0;
  }
  function isTrustworthyNewUser(snap) {
    if (!snap.isNewUser)
      return false;
    return !snap.degraded || isLikelyFreshDevice(snap);
  }
  function loadVisitSnapshot() {
    const fvtsR = storage.safeRead(KEY_FVTS);
    const lvtsR = storage.safeRead(KEY_LVTS);
    const tvcR = storage.safeRead(KEY_TVC);
    const degraded = !fvtsR.ok || !lvtsR.ok || !tvcR.ok;
    const fvts = toNum(fvtsR.value);
    const lvts = toNum(lvtsR.value);
    const tvc = toNum(tvcR.value);
    const snapshot = {
      fvts,
      lvts,
      tvc,
      isNewUser: lvts === 0,
      degraded
    };
    if (degraded) {
      const likelyFresh = fvts === 0 && lvts === 0 && tvc === 0 && snapshot.isNewUser;
      if (!likelyFresh) {
        logger.warn("[uni统计 2.0] visit snapshot degraded; some storage keys read failed");
      }
    }
    loaded = snapshot;
    return snapshot;
  }
  function ensureLoaded() {
    if (!loaded)
      loaded = EMPTY_SNAPSHOT;
    return loaded;
  }
  function persistNewUserBaseline(now2) {
    storage.set(KEY_FVTS, now2);
    storage.set(KEY_LVTS, now2);
    storage.set(KEY_TVC, 1);
    const baseline = {
      fvts: now2,
      lvts: now2,
      tvc: 1,
      isNewUser: false,
      degraded: false
    };
    loaded = baseline;
    committed = baseline;
  }
  function buildVisitFields(now2) {
    const snap = ensureLoaded();
    if (buildCalledInProcess && lastBuilt) {
      logger.warn("[uni统计 2.0] buildVisitFields() called twice in same process; returning cached fields");
      return Object.assign({}, lastBuilt);
    }
    buildCalledInProcess = true;
    if (isTrustworthyNewUser(snap)) {
      pending = { fvts: now2, lvts: 0, tvc: 1, now: now2 };
      persistNewUserBaseline(now2);
    } else if (snap.isNewUser) {
      logger.warn("[uni统计 2.0] visit degraded: lvts 读取失败但检测到历史数据，按老用户处理以避免新增虚高");
      const fvts = snap.fvts > 0 ? snap.fvts : now2;
      pending = { fvts, lvts: fvts, tvc: snap.tvc + 1, now: now2 };
    } else {
      pending = {
        fvts: snap.fvts,
        lvts: snap.lvts,
        tvc: snap.tvc + 1,
        now: now2
      };
    }
    lastBuilt = { fvts: pending.fvts, lvts: pending.lvts, tvc: pending.tvc };
    return Object.assign({}, lastBuilt);
  }
  function buildVisitFieldsForSessionRenewal(now2) {
    let fvts;
    let lvts;
    let tvc;
    if (committed) {
      fvts = committed.fvts;
      lvts = committed.lvts;
      tvc = committed.tvc + 1;
    } else if (lastBuilt) {
      fvts = lastBuilt.fvts;
      lvts = lastBuilt.lvts !== 0 ? lastBuilt.lvts : lastBuilt.fvts;
      tvc = lastBuilt.tvc;
    } else {
      const snap = ensureLoaded();
      if (isTrustworthyNewUser(snap)) {
        fvts = now2;
        lvts = 0;
        tvc = 1;
        persistNewUserBaseline(now2);
      } else if (snap.isNewUser) {
        fvts = snap.fvts > 0 ? snap.fvts : now2;
        lvts = fvts;
        tvc = snap.tvc + 1;
      } else {
        fvts = snap.fvts;
        lvts = snap.lvts;
        tvc = snap.tvc + 1;
      }
    }
    pendingRenewal = { fvts, lvts, tvc, now: now2 };
    return { fvts, lvts, tvc };
  }
  function commitVisitOnAck(now2) {
    if (pending) {
      const snap = ensureLoaded();
      const newFvts2 = snap.fvts === 0 ? now2 : snap.fvts;
      const newLvts2 = now2;
      const newTvc2 = pending.tvc;
      storage.set(KEY_FVTS, newFvts2);
      storage.set(KEY_LVTS, newLvts2);
      storage.set(KEY_TVC, newTvc2);
      committed = {
        fvts: newFvts2,
        lvts: newLvts2,
        tvc: newTvc2,
        isNewUser: false,
        degraded: false
      };
      loaded = committed;
      pending = null;
      return;
    }
    if (!pendingRenewal)
      return;
    const newFvts = pendingRenewal.fvts;
    const newLvts = now2;
    const newTvc = pendingRenewal.tvc;
    storage.set(KEY_FVTS, newFvts);
    storage.set(KEY_LVTS, newLvts);
    storage.set(KEY_TVC, newTvc);
    committed = {
      fvts: newFvts,
      lvts: newLvts,
      tvc: newTvc,
      isNewUser: false,
      degraded: false
    };
    loaded = committed;
    pendingRenewal = null;
  }
  function rollbackPendingVisit() {
    pending = null;
    pendingRenewal = null;
  }
  const KEY_ENTRY = "session:entryRoute";
  let cached$3;
  let entryDeparted = false;
  function markEntryPage(route) {
    if (!route)
      return;
    const existing = getEntryRoute();
    if (existing)
      return;
    storage.set(KEY_ENTRY, route);
    cached$3 = route;
  }
  function getEntryRoute() {
    if (cached$3 !== void 0)
      return cached$3 || void 0;
    const r = storage.safeRead(KEY_ENTRY);
    if (!r.ok)
      return void 0;
    if (typeof r.value === "string" && r.value.length > 0) {
      cached$3 = r.value;
      return r.value;
    }
    cached$3 = "";
    return void 0;
  }
  function isEntry(route) {
    if (!route)
      return false;
    const entry = getEntryRoute();
    return entry === route;
  }
  function isEntryForIey(route) {
    if (entryDeparted)
      return false;
    return isEntry(route);
  }
  function markEntryDeparted() {
    entryDeparted = true;
  }
  function clearEntry() {
    cached$3 = "";
    entryDeparted = false;
    storage.remove(KEY_ENTRY);
  }
  let titleMapCache;
  function getVue3TitleMap() {
    if (titleMapCache)
      return titleMapCache;
    titleMapCache = {};
    try {
      const raw = '{"pages/studio-splash/studio-splash":"启动","pages/login/login":"登录","pages/register/register":"注册","pages/cg/cg":"开场动画","pages/lobby/lobby":"大厅","pages/character-select/character-select":"选择角色","pages/match-wait/match-wait":"匹配中","pages/game-room/game-room":"游戏房间","pages/profile/profile":"个人中心","pages/history/history":"历史战绩"}';
      if (typeof raw !== "string" || !raw)
        ;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        titleMapCache = parsed;
      }
    } catch (_a) {
      titleMapCache = {};
    }
    return titleMapCache;
  }
  function getTitleMap() {
    let map = {};
    map = getVue3TitleMap();
    return map;
  }
  function getPagesJsonNavigationTitle(routePath) {
    if (!routePath || typeof routePath !== "string")
      return "";
    const pathOnly = routePath.split("?")[0].trim();
    if (!pathOnly)
      return "";
    const map = getTitleMap();
    let result = "";
    const keys = [pathOnly];
    if (pathOnly.startsWith("/")) {
      keys.push(pathOnly.slice(1));
    } else {
      keys.push(`/${pathOnly}`);
    }
    for (const k of keys) {
      const v = map[k];
      if (typeof v === "string" && v.length > 0) {
        result = v;
        break;
      }
    }
    return result;
  }
  const state$2 = { page: "", config: "", report: "" };
  function setPageTitle(title) {
    state$2.page = typeof title === "string" ? title : "";
  }
  function setConfigTitle(title) {
    state$2.config = typeof title === "string" ? title : "";
  }
  function setReportTitle(title) {
    state$2.report = typeof title === "string" ? title : "";
  }
  function getCurrentTitle() {
    return { ttn: state$2.page, ttpj: state$2.config, ttc: state$2.report };
  }
  function clearPageTitle() {
    state$2.page = "";
  }
  function nowMs() {
    return Date.now();
  }
  function nowSec() {
    return Math.floor(Date.now() / 1e3);
  }
  function clampUrlrefStaySec(deltaSec) {
    const d = deltaSec > 0 ? deltaSec : 0;
    return d < 1 ? 1 : d;
  }
  function normalizeStatOsP(info) {
    var _a, _b, _c, _d, _e;
    const fromToken = (raw) => {
      const s2 = raw.toLowerCase().trim();
      if (!s2)
        return "";
      if (s2 === "devtools")
        return "";
      if (s2 === "android")
        return "android";
      if (s2 === "ios" || s2 === "iphone")
        return "ios";
      if (s2.includes("android"))
        return "android";
      if (s2.includes("iphone") || s2 === "iphone os" || /\bios\b/.test(s2))
        return "ios";
      if (s2.includes("harmony") || s2 === "ohos" || s2 === "openharmony")
        return "harmonyos";
      if (s2.includes("windows") || s2 === "windows_nt")
        return "windows";
      if (s2 === "mac" || s2 === "darwin" || s2.includes("mac os") || s2 === "macos")
        return "macos";
      if (s2.includes("linux") && !s2.includes("android"))
        return "linux";
      return "";
    };
    const p0 = fromToken((_a = info.platform) !== null && _a !== void 0 ? _a : "");
    if (p0)
      return p0;
    const p1 = fromToken((_b = info.osName) !== null && _b !== void 0 ? _b : "");
    if (p1)
      return p1;
    const sys = ((_c = info.system) !== null && _c !== void 0 ? _c : "").toLowerCase();
    if (sys.includes("android"))
      return "android";
    if (sys.includes("iphone") || /\bios\b/.test(sys))
      return "ios";
    if (sys.includes("harmony") || sys.includes("ohos"))
      return "harmonyos";
    if (sys.includes("windows"))
      return "windows";
    if (sys.includes("mac os") || sys.includes("darwin"))
      return "macos";
    if (sys.includes("linux"))
      return "linux";
    const plus2 = getGlobalObject().plus;
    const p2 = fromToken((_e = (_d = plus2 === null || plus2 === void 0 ? void 0 : plus2.os) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : "");
    if (p2)
      return p2;
    return "";
  }
  function uniPlatformMpAliRaw() {
    const parts = ["y", "a", "p", "mp-ali"];
    return [...parts].reverse().join("");
  }
  const PLATFORM_MAP = {
    app: "n",
    "app-plus": "n",
    "app-harmony": "n",
    "mp-harmony": "mhm",
    h5: "h5",
    "mp-weixin": "wx",
    [uniPlatformMpAliRaw()]: "ali",
    "mp-baidu": "bd",
    "mp-toutiao": "tt",
    "mp-qq": "qq",
    "mp-kuaishou": "ks",
    "mp-lark": "lark",
    "mp-xhs": "xhs",
    "mp-jd": "jd",
    "quickapp-native": "qn",
    "quickapp-webview": "qw"
  };
  function getRawPlatform() {
    var _a;
    return (_a = "app") !== null && _a !== void 0 ? _a : "";
  }
  function getPlatform() {
    var _a;
    const raw = getRawPlatform();
    const mapped = PLATFORM_MAP[raw];
    if (!mapped)
      return "unknown";
    if (mapped === "ali") {
      const my = getGlobalObject().my;
      if (((_a = my === null || my === void 0 ? void 0 : my.env) === null || _a === void 0 ? void 0 : _a.clientName) === "dingtalk")
        return "dt";
      return "ali";
    }
    return mapped;
  }
  function isApp() {
    const raw = getRawPlatform();
    return raw === "app" || raw === "app-plus" || raw === "app-harmony";
  }
  function isMp() {
    return getRawPlatform().startsWith("mp-");
  }
  function isH5() {
    return getRawPlatform() === "h5";
  }
  function isNvue() {
    return Boolean(getGlobalObject().__NVUE__);
  }
  const STORAGE_KEY_UUID = "device:uuid";
  const WEB_UUID_KEY = "__DC_STAT_UUID";
  let cachedUuid = null;
  function preferGetDeviceInfoDeviceIdFirst() {
    if (isApp() || isH5())
      return true;
    return getRawPlatform() === "mp-weixin";
  }
  function readSysDeviceId() {
    const root = resolveUniRuntime();
    const u = root != null && typeof root === "object" ? root : void 0;
    if (!u || typeof u.getSystemInfoSync !== "function")
      return "";
    return tryRun(() => {
      var _a;
      return (_a = u.getSystemInfoSync().deviceId) !== null && _a !== void 0 ? _a : "";
    }, "");
  }
  function readGetDeviceInfoDeviceId() {
    const root = resolveUniRuntime();
    const u = root != null && typeof root === "object" ? root : void 0;
    if (!u || typeof u.getDeviceInfo !== "function")
      return "";
    return tryRun(() => {
      var _a;
      return (_a = u.getDeviceInfo().deviceId) !== null && _a !== void 0 ? _a : "";
    }, "");
  }
  function generateAnonUuid() {
    const ms = nowMs();
    const rnd = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
    return `${ms}${rnd}`;
  }
  function persistUuid(uuid) {
    tryRun(() => storage.set(STORAGE_KEY_UUID, uuid), void 0);
  }
  function getWebLocalStorage() {
    return tryRun(() => {
      const g = getGlobalObject();
      if (g.navigator && g.navigator.cookieEnabled === false)
        return void 0;
      const ls = g.localStorage;
      if (ls && typeof ls.getItem === "function" && typeof ls.setItem === "function") {
        return ls;
      }
      return void 0;
    }, void 0);
  }
  function readWebDeviceId() {
    const ls = getWebLocalStorage();
    if (!ls)
      return "";
    return tryRun(() => {
      const v = ls.getItem(WEB_UUID_KEY);
      return typeof v === "string" ? v : "";
    }, "");
  }
  function writeWebDeviceId(uuid) {
    const ls = getWebLocalStorage();
    if (!ls)
      return;
    tryRun(() => ls.setItem(WEB_UUID_KEY, uuid), void 0);
  }
  function resolveDeviceIdFromUni() {
    if (preferGetDeviceInfoDeviceIdFirst()) {
      const fromDeviceInfo = readGetDeviceInfoDeviceId();
      if (fromDeviceInfo)
        return fromDeviceInfo;
    }
    return readSysDeviceId();
  }
  function getUuid() {
    if (cachedUuid)
      return cachedUuid;
    if (isH5()) {
      const fromWeb = readWebDeviceId();
      if (fromWeb) {
        cachedUuid = fromWeb;
        return cachedUuid;
      }
    }
    const fromDevice = resolveDeviceIdFromUni();
    if (fromDevice) {
      persistUuid(fromDevice);
      if (isH5())
        writeWebDeviceId(fromDevice);
      cachedUuid = fromDevice;
      return cachedUuid;
    }
    const storedRead = storage.safeRead(STORAGE_KEY_UUID);
    if (storedRead.ok) {
      const stored = storedRead.value;
      if (typeof stored === "string" && stored.length > 0) {
        if (stored.startsWith("device-anon-")) {
          const upgraded = generateAnonUuid();
          persistUuid(upgraded);
          if (isH5())
            writeWebDeviceId(upgraded);
          cachedUuid = upgraded;
          return cachedUuid;
        }
        cachedUuid = stored;
        return cachedUuid;
      }
      const generated = generateAnonUuid();
      persistUuid(generated);
      if (isH5())
        writeWebDeviceId(generated);
      cachedUuid = generated;
      return cachedUuid;
    }
    const ephemeral = generateAnonUuid();
    if (isH5()) {
      writeWebDeviceId(ephemeral);
      cachedUuid = ephemeral;
      return cachedUuid;
    }
    return ephemeral;
  }
  const SUFFIX_HEAD_LEN = 8;
  const SUFFIX_TAIL_LEN = 4;
  function randomPart(len) {
    const r = Math.random().toString(36).slice(2, 2 + len);
    return r.length >= len ? r : r.padEnd(len, "0");
  }
  function sessionInstanceSuffix() {
    return `${randomPart(SUFFIX_HEAD_LEN)}-${randomPart(SUFFIX_TAIL_LEN)}`;
  }
  function anonNumericBody() {
    const ms = nowMs();
    const rnd = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
    return `${ms}${rnd}`;
  }
  function genSid(uuid) {
    if (uuid && uuid.length > 0) {
      return `${uuid}-${sessionInstanceSuffix()}`;
    }
    return `${anonNumericBody()}-${sessionInstanceSuffix()}`;
  }
  const KEY_SID = "session:id";
  const KEY_SST = "session:start";
  const KEY_SCT = "session:sct";
  const KEY_SEQ = "session:seq";
  const KEY_LAST_ACTIVE = "session:lastActive";
  const KEY_BG_TS = "session:bgTs";
  const KEY_LAST_SCENE = "session:lastScene";
  const DEFAULT_CONFIG = {
    backgroundTimeoutSec: 300,
    pageInactiveTimeoutSec: 1800
  };
  let config$1 = Object.assign({}, DEFAULT_CONFIG);
  let cached$2 = null;
  function configure$1(c) {
    config$1 = Object.assign({}, DEFAULT_CONFIG, c);
  }
  function readNum(key) {
    const r = storage.safeRead(key);
    if (!r.ok)
      return 0;
    const v = r.value;
    if (typeof v === "number" && Number.isFinite(v) && v >= 0)
      return v;
    if (typeof v === "string" && v.length > 0) {
      const n2 = Number(v);
      if (Number.isFinite(n2) && n2 >= 0)
        return n2;
    }
    return 0;
  }
  function readStr(key) {
    const r = storage.safeRead(key);
    if (!r.ok)
      return "";
    return typeof r.value === "string" ? r.value : "";
  }
  function elapsedNonNeg(now2, from) {
    const diff = now2 - from;
    return diff > 0 ? diff : 0;
  }
  function loadFromStorage() {
    const sid = readStr(KEY_SID);
    if (!sid)
      return null;
    return {
      sid,
      sst: readNum(KEY_SST),
      sct: readNum(KEY_SCT) || CST.ColdLaunch,
      seq: readNum(KEY_SEQ),
      lastActive: readNum(KEY_LAST_ACTIVE),
      bgTs: readNum(KEY_BG_TS),
      lastScene: readStr(KEY_LAST_SCENE)
    };
  }
  function ensureCache() {
    if (cached$2 !== null)
      return cached$2;
    cached$2 = loadFromStorage();
    return cached$2;
  }
  function createNew(now2, sct, scene) {
    const sid = genSid(getUuid());
    const next = {
      sid,
      sst: now2,
      sct,
      seq: 0,
      lastActive: now2,
      bgTs: 0,
      lastScene: scene
    };
    storage.set(KEY_SID, sid);
    storage.set(KEY_SST, now2);
    storage.set(KEY_SCT, sct);
    storage.set(KEY_SEQ, 0);
    storage.set(KEY_LAST_ACTIVE, now2);
    storage.set(KEY_BG_TS, 0);
    storage.set(KEY_LAST_SCENE, scene);
    cached$2 = next;
    return next;
  }
  function ensureSession(t, ctx) {
    const { now: now2, scene = "" } = ctx;
    const snap = ensureCache();
    if (t === "cold_launch") {
      const created = createNew(now2, CST.ColdLaunch, scene);
      return { snapshot: created, isNew: true, cst: CST.ColdLaunch };
    }
    if (!snap) {
      const created = createNew(now2, CST.ColdLaunch, scene);
      return { snapshot: created, isNew: true, cst: CST.ColdLaunch };
    }
    if (t === "app_show") {
      const enterCandidates = [];
      if (ctx.backgroundEnteredAt && ctx.backgroundEnteredAt > 0) {
        enterCandidates.push(ctx.backgroundEnteredAt);
      }
      if (snap.bgTs > 0) {
        enterCandidates.push(snap.bgTs);
      }
      const enterTs = enterCandidates.length > 0 ? Math.min(...enterCandidates) : 0;
      const elapsed2 = enterTs > 0 ? elapsedNonNeg(now2, enterTs) : elapsedNonNeg(now2, snap.lastActive);
      const sceneChanged = !!scene && !!snap.lastScene && scene !== snap.lastScene;
      const fromBackground = enterTs > 0;
      if (sceneChanged || fromBackground && elapsed2 >= config$1.backgroundTimeoutSec) {
        const created = createNew(now2, CST.BackgroundTimeout, scene);
        return { snapshot: created, isNew: true, cst: CST.BackgroundTimeout };
      }
      touch(now2);
      storage.set(KEY_BG_TS, 0);
      if (cached$2)
        cached$2.bgTs = 0;
      return { snapshot: cached$2, isNew: false, cst: 0 };
    }
    if (t === "wx_scene_changed") {
      if (scene && scene !== snap.lastScene) {
        const created = createNew(now2, CST.BackgroundTimeout, scene);
        return { snapshot: created, isNew: true, cst: CST.BackgroundTimeout };
      }
      return { snapshot: snap, isNew: false, cst: 0 };
    }
    const elapsed = elapsedNonNeg(now2, snap.lastActive);
    if (elapsed >= config$1.pageInactiveTimeoutSec) {
      const created = createNew(now2, CST.PageInactiveTimeout, scene || snap.lastScene);
      return { snapshot: created, isNew: true, cst: CST.PageInactiveTimeout };
    }
    touch(now2);
    return { snapshot: cached$2, isNew: false, cst: 0 };
  }
  function markBackground(now2) {
    if (!cached$2)
      cached$2 = loadFromStorage();
    if (!cached$2)
      return;
    storage.set(KEY_BG_TS, now2);
    cached$2.bgTs = now2;
  }
  function touch(now2) {
    if (!cached$2)
      cached$2 = loadFromStorage();
    if (!cached$2)
      return;
    storage.set(KEY_LAST_ACTIVE, now2);
    cached$2.lastActive = now2;
  }
  function nextSeq() {
    if (!cached$2)
      cached$2 = loadFromStorage();
    if (!cached$2)
      return 0;
    const next = cached$2.seq + 1;
    cached$2.seq = next;
    storage.set(KEY_SEQ, next);
    return next;
  }
  function getSnapshot() {
    return ensureCache();
  }
  function syncLastScene(scene) {
    if (!scene)
      return;
    if (!cached$2)
      cached$2 = loadFromStorage();
    if (!cached$2)
      return;
    storage.set(KEY_LAST_SCENE, scene);
    cached$2.lastScene = scene;
  }
  function getPageVmType(vm) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!vm)
      return null;
    const internalMpType = (_c = (_b = (_a = vm.$) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.mpType) !== null && _c !== void 0 ? _c : (_d = vm.type) === null || _d === void 0 ? void 0 : _d.mpType;
    if (vm.mpType === "page" || vm.$mpType === "page" || ((_e = vm.$mp) === null || _e === void 0 ? void 0 : _e.mpType) === "page" || ((_f = vm.$options) === null || _f === void 0 ? void 0 : _f.mpType) === "page" || internalMpType === "page") {
      return "page";
    }
    if (vm.mpType === "app" || vm.$mpType === "app" || ((_g = vm.$mp) === null || _g === void 0 ? void 0 : _g.mpType) === "app" || ((_h = vm.$options) === null || _h === void 0 ? void 0 : _h.mpType) === "app" || internalMpType === "app") {
      return "app";
    }
    return null;
  }
  function getTopPageVm() {
    var _a;
    const fn = getGlobalObject().getCurrentPages;
    if (typeof fn !== "function")
      return void 0;
    const pages = tryRun(() => fn(), []) || [];
    if (!Array.isArray(pages) || pages.length === 0)
      return void 0;
    const top = pages[pages.length - 1];
    return (_a = top === null || top === void 0 ? void 0 : top.$vm) !== null && _a !== void 0 ? _a : top;
  }
  function getCurrentRoute(pageVm) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const vm = pageVm !== null && pageVm !== void 0 ? pageVm : getTopPageVm();
    if (!vm)
      return "";
    if (getPlatform() === "bd") {
      const r = (_e = (_c = (_b = (_a = vm.$mp) === null || _a === void 0 ? void 0 : _a.page) === null || _b === void 0 ? void 0 : _b.is) !== null && _c !== void 0 ? _c : (_d = vm.$scope) === null || _d === void 0 ? void 0 : _d.is) !== null && _e !== void 0 ? _e : "";
      if (r)
        return r;
    }
    return (_l = (_h = (_f = vm.route) !== null && _f !== void 0 ? _f : (_g = vm.$scope) === null || _g === void 0 ? void 0 : _g.route) !== null && _h !== void 0 ? _h : (_k = (_j = vm.$mp) === null || _j === void 0 ? void 0 : _j.page) === null || _k === void 0 ? void 0 : _k.route) !== null && _l !== void 0 ? _l : "";
  }
  function getCurrentRouteWithQuery(pageVm) {
    var _a, _b;
    const vm = pageVm !== null && pageVm !== void 0 ? pageVm : getTopPageVm();
    if (!vm)
      return "";
    const page = (_a = vm.$page) !== null && _a !== void 0 ? _a : (_b = vm.$scope) === null || _b === void 0 ? void 0 : _b.$page;
    if (page) {
      if (page.fullPath && page.fullPath !== "/")
        return page.fullPath;
      if (page.route)
        return page.route;
    }
    return getCurrentRoute(vm);
  }
  function getUni$8() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  function getLaunchScene(override) {
    if (override !== void 0 && override !== null && override !== "") {
      return String(override);
    }
    const u = getUni$8();
    if (typeof (u === null || u === void 0 ? void 0 : u.getLaunchOptionsSync) !== "function")
      return "";
    if (!isMp())
      return "";
    return tryRun(() => {
      const opts = u.getLaunchOptionsSync();
      const scene = opts === null || opts === void 0 ? void 0 : opts.scene;
      return scene === void 0 || scene === null ? "" : String(scene);
    }, "");
  }
  function getUni$7() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  function getPushClientId(opts = {}) {
    const { enabled = false, timeoutMs = 3e3 } = opts;
    return new Promise((resolve) => {
      if (!enabled) {
        resolve({ ok: false, cid: "", reason: "disabled" });
        return;
      }
      const u = getUni$7();
      if (!u || typeof u.getPushClientId !== "function") {
        resolve({ ok: false, cid: "", reason: "unsupported" });
        return;
      }
      let settled = false;
      const finish = (r) => {
        if (settled)
          return;
        settled = true;
        resolve(r);
      };
      const timer = setTimeout(() => finish({ ok: false, cid: "", reason: "timeout" }), timeoutMs);
      tryRun(() => u.getPushClientId({
        success: (res) => {
          clearTimeout(timer);
          const cid = typeof (res === null || res === void 0 ? void 0 : res.cid) === "string" ? res.cid : "";
          if (!cid) {
            finish({ ok: false, cid: "", reason: "fail" });
            return;
          }
          finish({ ok: true, cid });
        },
        fail: () => {
          clearTimeout(timer);
          finish({ ok: false, cid: "", reason: "fail" });
        }
      }), void 0);
    });
  }
  const EMPTY_TITLE_SNAP = { ttn: "", ttpj: "", ttc: "" };
  const state$1 = {
    lastRoute: "",
    lastRouteFull: "",
    beforeLastRoute: "",
    beforeLastRouteFull: "",
    lastRouteEnterTime: 0,
    lastPageTitleSnap: Object.assign({}, EMPTY_TITLE_SNAP),
    lastIey: false,
    prevIey: false,
    isHide: false,
    wasBackgrounded: false,
    pendingBackgroundResume: false,
    backgroundEnteredAt: 0,
    suppressNextPageLogAfterResume: false,
    backgroundResumeLt1At: 0
  };
  const BACKGROUND_RESUME_DEBOUNCE_SEC = 1;
  const BACKGROUND_RESUME_LT1_DEDUP_SEC = 3;
  const PAGE_APP_HIDE_DEFER_MS = 120;
  let pageAppHideDeferTimer;
  function shouldEarlyConsumeBackgroundResumeInMixin() {
    return !shouldBindUniAppLifecycle();
  }
  function markBackgroundResumeLt1Emitted(now2) {
    state$1.backgroundResumeLt1At = now2;
  }
  function shouldSkipDuplicateBackgroundResumeLt1(now2) {
    return state$1.backgroundResumeLt1At > 0 && now2 - state$1.backgroundResumeLt1At <= BACKGROUND_RESUME_LT1_DEDUP_SEC;
  }
  function cancelPageAppHideDefer() {
    if (pageAppHideDeferTimer !== void 0) {
      clearTimeout(pageAppHideDeferTimer);
      pageAppHideDeferTimer = void 0;
    }
  }
  function tryAppHideFromPageOnHideWhenH5Hidden(app, opts) {
    var _a;
    if (!isH5())
      return;
    if (state$1.pendingBackgroundResume)
      return;
    const vis = (_a = globalThis.document) === null || _a === void 0 ? void 0 : _a.visibilityState;
    if (vis === "hidden") {
      handleAppHide(app, opts);
    }
  }
  function tryAppHideFromPageOnHideWhenMpDefer(app, opts) {
    if (isH5())
      return;
    if (state$1.pendingBackgroundResume)
      return;
    cancelPageAppHideDefer();
    pageAppHideDeferTimer = setTimeout(() => {
      pageAppHideDeferTimer = void 0;
      if (state$1.pendingBackgroundResume)
        return;
      handleAppHide(app, opts);
    }, PAGE_APP_HIDE_DEFER_MS);
  }
  function tryVue3AppHideFromPageOnHide(app, opts) {
    if (state$1.pendingBackgroundResume)
      return;
    if (isH5()) {
      tryAppHideFromPageOnHideWhenH5Hidden(app, opts);
      return;
    }
    tryAppHideFromPageOnHideWhenMpDefer(app, opts);
  }
  function safeCollector(app) {
    return app.getCollector();
  }
  function normalizePathForEntryMark(raw) {
    var _a;
    if (!raw || typeof raw !== "string")
      return "";
    const noQuery = (_a = raw.split("?")[0]) !== null && _a !== void 0 ? _a : "";
    return noQuery.startsWith("/") ? noQuery.slice(1) : noQuery;
  }
  function reportNewSession(c, _cst, scene, now2, attachVisit, url = "") {
    let visit;
    if (attachVisit && !firstVisitEmittedInProcess) {
      firstVisitEmittedInProcess = true;
      visit = tryRun(() => buildVisitFields(now2), void 0);
    } else {
      visit = tryRun(() => buildVisitFieldsForSessionRenewal(now2), void 0);
    }
    const payload = {
      lt: LT.Launch,
      t: now2,
      sc: scene,
      visit
    };
    if (url)
      payload.url = url;
    c.report(payload);
  }
  let firstVisitEmittedInProcess = false;
  let titleSnapGeneration = 0;
  function scheduleDeferredTitleSnapshot() {
    const gen = titleSnapGeneration;
    const run = typeof queueMicrotask === "function" ? queueMicrotask : (fn) => {
      void Promise.resolve().then(fn);
    };
    run(() => {
      tryRun(() => {
        if (gen !== titleSnapGeneration)
          return;
        state$1.lastPageTitleSnap = Object.assign({}, getCurrentTitle());
      }, void 0);
    });
  }
  function handleLaunch(app, options = {}, opts = {}) {
    const c = safeCollector(app);
    if (!c)
      return;
    const now2 = nowSec();
    const scene = tryRun(() => getLaunchScene(options.scene), "");
    const result = tryRun(() => ensureSession("cold_launch", { now: now2, scene }), null);
    if (!result)
      return;
    tryRun(() => clearEntry(), void 0);
    const url = options.path || "";
    const entryKey = normalizePathForEntryMark(url);
    if (entryKey) {
      tryRun(() => markEntryPage(entryKey), void 0);
    }
    reportNewSession(c, result.cst || CST.ColdLaunch, scene, now2, true, url);
    if (opts.enablePush) {
      void getPushClientId({ enabled: true, timeoutMs: opts.pushTimeoutMs }).then((r) => {
        if (!r.ok || !r.cid)
          return;
        const c2 = safeCollector(app);
        if (!c2)
          return;
        c2.report({ lt: LT.Push, cid: r.cid, t: nowSec() });
      }).catch((e) => logger.warn("[uni统计 2.0] push cid fetch failed", e));
    }
  }
  function tryConsumeBackgroundResume(app, options = {}, _opts = {}, _from = "unknown") {
    if (!state$1.pendingBackgroundResume) {
      return false;
    }
    const bgEnterAt = state$1.backgroundEnteredAt;
    if (bgEnterAt <= 0) {
      return false;
    }
    const c = safeCollector(app);
    if (!c) {
      return false;
    }
    const now2 = nowSec();
    const elapsed = now2 - bgEnterAt;
    if (elapsed < BACKGROUND_RESUME_DEBOUNCE_SEC) {
      state$1.suppressNextPageLogAfterResume = true;
      return true;
    }
    state$1.wasBackgrounded = false;
    state$1.suppressNextPageLogAfterResume = true;
    state$1.lastRouteEnterTime = now2;
    const scene = tryRun(() => getLaunchScene(options.scene), "");
    const result = tryRun(() => ensureSession("app_show", {
      now: now2,
      scene,
      backgroundEnteredAt: bgEnterAt
    }), null);
    state$1.pendingBackgroundResume = false;
    state$1.backgroundEnteredAt = 0;
    if (!result || !result.isNew) {
      return true;
    }
    tryRun(() => clearEntry(), void 0);
    const url = options.path || state$1.lastRoute || "";
    const entryKey = normalizePathForEntryMark(url);
    if (entryKey) {
      tryRun(() => markEntryPage(entryKey), void 0);
    }
    reportNewSession(c, result.cst || CST.BackgroundTimeout, scene, now2, false, url);
    markBackgroundResumeLt1Emitted(now2);
    void c.flush(true).catch((e) => logger.warn("[uni统计 2.0] flush after new session (app_show) failed", e));
    return true;
  }
  function handleAppShow(app, options = {}, opts = {}) {
    if (tryConsumeBackgroundResume(app, options, opts, "handleAppShow"))
      return;
    const c = safeCollector(app);
    if (!c)
      return;
    const now2 = nowSec();
    const scene = tryRun(() => getLaunchScene(options.scene), "");
    if (shouldSkipDuplicateBackgroundResumeLt1(now2)) {
      tryRun(() => syncLastScene(scene), void 0);
      return;
    }
    const result = tryRun(() => ensureSession("app_show", { now: now2, scene }), null);
    if (!result || !result.isNew) {
      return;
    }
    tryRun(() => clearEntry(), void 0);
    const url = options.path || state$1.lastRoute || "";
    const entryKey = normalizePathForEntryMark(url);
    if (entryKey) {
      tryRun(() => markEntryPage(entryKey), void 0);
    }
    reportNewSession(c, result.cst || CST.BackgroundTimeout, scene, now2, false, url);
    markBackgroundResumeLt1Emitted(now2);
    void c.flush(true).catch((e) => logger.warn("[uni统计 2.0] flush after new session (app_show) failed", e));
  }
  function handleAppHide(app, opts = {}) {
    if (state$1.pendingBackgroundResume)
      return;
    const c = safeCollector(app);
    if (!c)
      return;
    const now2 = nowSec();
    state$1.wasBackgrounded = true;
    state$1.pendingBackgroundResume = true;
    state$1.backgroundEnteredAt = now2;
    tryRun(() => markBackground(now2), void 0);
    const deltaStay = state$1.lastRouteEnterTime > 0 ? now2 - state$1.lastRouteEnterTime : 0;
    const stayed = clampUrlrefStaySec(deltaStay);
    if (state$1.lastRoute && opts.enablePageLog !== false) {
      const exitedUrl = state$1.lastRouteFull || state$1.lastRoute;
      const ref = state$1.beforeLastRouteFull || state$1.beforeLastRoute || "";
      const snap = state$1.lastPageTitleSnap;
      const payload = {
        lt: LT.Page,
        t: now2,
        url: exitedUrl,
        urlref_ts: stayed,
        iey: state$1.lastIey,
        ppiey: state$1.prevIey,
        ttn: snap.ttn,
        ttpj: snap.ttpj,
        ttc: snap.ttc
      };
      if (ref)
        payload.urlref = ref;
      c.report(payload);
      if (state$1.lastIey) {
        tryRun(() => markEntryDeparted(), void 0);
        state$1.lastIey = false;
      }
    }
    c.report({
      lt: LT.Hide,
      t: now2,
      urlref: state$1.lastRoute,
      urlref_ts: stayed
    });
    void c.flush(true).catch((e) => logger.warn("[uni统计 2.0] flush on hide failed", e));
  }
  function handlePageShow(app, vm, opts = {}) {
    const c = safeCollector(app);
    if (!c)
      return;
    if (state$1.pendingBackgroundResume && shouldEarlyConsumeBackgroundResumeInMixin()) {
      tryConsumeBackgroundResume(app, {}, opts, "handlePageShow");
    }
    const now2 = nowSec();
    const route = tryRun(() => getCurrentRoute(vm), "");
    const url = tryRun(() => getCurrentRouteWithQuery(vm), "") || route;
    if (!route && !url)
      return;
    const result = tryRun(() => ensureSession("page_show", { now: now2 }), null);
    if (!result)
      return;
    tryRun(() => setReportTitle(""), void 0);
    tryRun(() => setConfigTitle(getPagesJsonNavigationTitle(route)), void 0);
    if (result.isNew) {
      tryRun(() => clearEntry(), void 0);
    }
    if (route) {
      tryRun(() => markEntryPage(route), void 0);
    }
    if (result.isNew) {
      reportNewSession(c, result.cst || CST.PageInactiveTimeout, "", now2, false, url);
    }
    const shouldSuppressPageLog = state$1.suppressNextPageLogAfterResume;
    if (state$1.lastRoute && opts.enablePageLog !== false && !shouldSuppressPageLog) {
      const deltaStay = state$1.lastRouteEnterTime > 0 ? now2 - state$1.lastRouteEnterTime : 0;
      const stayed = clampUrlrefStaySec(deltaStay);
      const exitedUrl = state$1.lastRouteFull || state$1.lastRoute;
      const ref = state$1.beforeLastRouteFull || state$1.beforeLastRoute || "";
      const snap = state$1.lastPageTitleSnap;
      const payload = {
        lt: LT.Page,
        t: now2,
        url: exitedUrl,
        urlref_ts: stayed,
        // 离开页是否入口页 / urlref 指向页是否入口页（进入新页前状态尚未被本轮覆盖）。
        iey: state$1.lastIey,
        ppiey: state$1.prevIey
      };
      if (ref)
        payload.urlref = ref;
      payload.ttn = snap.ttn;
      payload.ttpj = snap.ttpj;
      payload.ttc = snap.ttc;
      c.report(payload);
      if (state$1.lastIey) {
        tryRun(() => markEntryDeparted(), void 0);
      }
    }
    state$1.beforeLastRoute = state$1.lastRoute;
    state$1.beforeLastRouteFull = state$1.lastRouteFull;
    state$1.prevIey = state$1.lastIey;
    state$1.lastIey = !!route && tryRun(() => isEntryForIey(route), false);
    state$1.lastRoute = route;
    state$1.lastRouteFull = url;
    state$1.lastRouteEnterTime = now2;
    state$1.suppressNextPageLogAfterResume = false;
    scheduleDeferredTitleSnapshot();
    state$1.isHide = false;
    if (result.isNew) {
      void c.flush(true).catch((e) => logger.warn("[uni统计 2.0] flush after new session (page_show) failed", e));
    }
  }
  function handlePageHide(app, _vm) {
    const c = safeCollector(app);
    if (!c)
      return;
    state$1.isHide = true;
    titleSnapGeneration++;
    state$1.lastPageTitleSnap = Object.assign({}, getCurrentTitle());
    tryRun(() => clearPageTitle(), void 0);
  }
  const rethrownErrors = typeof WeakSet === "function" ? /* @__PURE__ */ new WeakSet() : (
    // 极端环境降级：has=false 永不命中，add=noop；本模块只用 has/add 两个方法，
    // 其它方法（delete / [Symbol.toStringTag]）调用方不依赖，类型断言即可。
    {
      has: () => false,
      add: () => rethrownErrors
    }
  );
  function handleError(app, e) {
    const isObj = typeof e === "object" && e !== null;
    if (isObj && rethrownErrors.has(e))
      return;
    if (isObj)
      rethrownErrors.add(e);
    try {
      app.reportError(e);
    } catch (err) {
      logger.warn("[uni统计 2.0] handleError failed", err);
    }
    if (isMp()) {
      return;
    }
    tryRun(() => {
      setTimeout(() => {
        throw e;
      }, 0);
    }, void 0);
  }
  function getUni$6() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  function shouldMixinDispatchAppLifecycle() {
    let result = isH5() || getPlatform() === "n" || isNvue();
    result = isH5() || getPlatform() === "n" || isNvue();
    return result;
  }
  function shouldBindUniAppLifecycle() {
    let result = !isH5() && getPlatform() !== "n" && !isNvue();
    result = !isH5() && getPlatform() !== "n" && !isNvue();
    return result;
  }
  const uniAppHookRegistry = {
    showBound: false,
    hideBound: false,
    appShowCb: void 0,
    appHideCb: void 0
  };
  function tryBindUniAppLifecycle(app, opts = {}) {
    if (!shouldBindUniAppLifecycle())
      return false;
    const u = getUni$6();
    if (!u)
      return false;
    if (!uniAppHookRegistry.showBound && typeof u.onAppShow === "function") {
      uniAppHookRegistry.appShowCb = (e) => handleAppShow(app, e !== null && e !== void 0 ? e : {}, opts);
      tryRun(() => u.onAppShow(uniAppHookRegistry.appShowCb), void 0);
      uniAppHookRegistry.showBound = true;
    }
    if (!uniAppHookRegistry.hideBound && typeof u.onAppHide === "function") {
      uniAppHookRegistry.appHideCb = () => handleAppHide(app, opts);
      tryRun(() => u.onAppHide(uniAppHookRegistry.appHideCb), void 0);
      uniAppHookRegistry.hideBound = true;
    }
    return uniAppHookRegistry.showBound && uniAppHookRegistry.hideBound;
  }
  function unbindUniAppLifecycle() {
    if (!uniAppHookRegistry.showBound && !uniAppHookRegistry.hideBound)
      return;
    const cur = getUni$6();
    if (uniAppHookRegistry.showBound && uniAppHookRegistry.appShowCb && (cur === null || cur === void 0 ? void 0 : cur.offAppShow)) {
      tryRun(() => cur.offAppShow(uniAppHookRegistry.appShowCb), void 0);
    }
    if (uniAppHookRegistry.hideBound && uniAppHookRegistry.appHideCb && (cur === null || cur === void 0 ? void 0 : cur.offAppHide)) {
      tryRun(() => cur.offAppHide(uniAppHookRegistry.appHideCb), void 0);
    }
    uniAppHookRegistry.showBound = false;
    uniAppHookRegistry.hideBound = false;
    uniAppHookRegistry.appShowCb = void 0;
    uniAppHookRegistry.appHideCb = void 0;
  }
  function bindLifecycle(app, opts = {}) {
    let bound = true;
    const mixin = {
      onLaunch(options = {}) {
        handleLaunch(app, options, opts);
      },
      onLoad() {
      },
      onShow() {
        const vmType = getPageVmType(this);
        cancelPageAppHideDefer();
        if (state$1.pendingBackgroundResume && shouldEarlyConsumeBackgroundResumeInMixin()) {
          tryConsumeBackgroundResume(app, {}, opts, "mixin.onShow");
        }
        state$1.isHide = false;
        if (vmType === "page") {
          handlePageShow(app, this, opts);
        }
        if (shouldMixinDispatchAppLifecycle() && vmType === "app") {
          handleAppShow(app, {}, opts);
        }
      },
      onHide() {
        state$1.isHide = true;
        if (getPageVmType(this) === "page") {
          handlePageHide(app);
          tryVue3AppHideFromPageOnHide(app, opts);
        }
        if (shouldMixinDispatchAppLifecycle() && getPageVmType(this) === "app" && !state$1.pendingBackgroundResume) {
          handleAppHide(app, opts);
        }
      },
      onUnload() {
        if (state$1.isHide) {
          state$1.isHide = false;
          return;
        }
        handlePageHide(app);
      },
      onError(e) {
        handleError(app, e);
      }
    };
    if (shouldBindUniAppLifecycle()) {
      tryBindUniAppLifecycle(app, opts);
    }
    return {
      mixin,
      tryBindUniAppHooks: () => shouldBindUniAppLifecycle() && tryBindUniAppLifecycle(app, opts),
      unbind() {
        if (!bound)
          return;
        bound = false;
        unbindUniAppLifecycle();
      }
    };
  }
  const STAT_VERSION_PUBLIC = "5.14";
  const STAT_URL = "https://tongji.dcloud.io/uni/stat";
  const STAT_H5_URL = "https://tongji.dcloud.io/uni/stat.gif";
  const REPORT_INTERVAL_SEC = 10;
  const HTTP_MAX_RETRIES = 3;
  const CLOUD_MAX_RETRIES = 2;
  const IMAGE_MAX_RETRIES = 2;
  const RETRY_BASE_DELAY_MS = 1e3;
  const MP_WEIXIN_USE_PRELOAD_ASSETS_REPORT = true;
  const MP_WEIXIN_PRELOAD_TIMEOUT_MS = 3e4;
  const MP_WEIXIN_PRELOAD_FIRST_FLUSH_DELAY_MS = 2e3;
  const SINGLE_EVENT_MAX_BYTES = 4 * 1024;
  const BATCH_REQUESTS_MAX_BYTES = 4 * 1024;
  const BATCH_MAX_EVENTS = 30;
  const QUEUE_MAX_EVENTS = 1e3;
  const RETRY_MAX_ATTEMPTS = 5;
  const IMAGE_REPORT_DEFAULTS = {
    host: "https://tongji-collector.dcloud.net.cn",
    /** 正式环境 */
    projectId: "964f0397-af5d-45bf-99d6-8fb3500d7849",
    topicId: "8563e231-f4cd-4ab0-8870-917e4b04e810"
    // 以下为历史测试环境（已停用，勿删便于回切排查）
    // projectId: '9fad19a2-b7f1-47f5-87ff-8621f545ab61',
    // topicId: '99b55c91-ed80-406e-b205-e9d18aca744d',
  };
  function getAppId$1() {
    var _a;
    return (_a = "__UNI__8078FF1") !== null && _a !== void 0 ? _a : "";
  }
  function assertCloudResultOk(res) {
    if (!res || typeof res !== "object")
      return;
    const r = res;
    if (r.success === false) {
      throw new Error("cloud receiver reported success=false");
    }
    if (typeof r.errCode === "number" && r.errCode !== 0) {
      throw new Error("cloud receiver reported errCode=" + String(r.errCode));
    }
  }
  function resolveSpace(injected) {
    if (injected)
      return injected;
    const raw = resolveUniRuntime();
    const u = raw != null && typeof raw === "object" ? raw : void 0;
    return u === null || u === void 0 ? void 0 : u.__stat_uniCloud_space;
  }
  function createCloudChannel(opts = {}) {
    var _a, _b;
    const receiverName = (_a = opts.receiverName) !== null && _a !== void 0 ? _a : "uni-stat-receiver";
    const maxRetries = (_b = opts.maxRetries) !== null && _b !== void 0 ? _b : CLOUD_MAX_RETRIES;
    function getReceiver() {
      const space = resolveSpace(opts.uniCloudSpace);
      if (!space || typeof space.importObject !== "function")
        return void 0;
      try {
        return space.importObject(receiverName, { customUI: true });
      } catch (e) {
        logger.warn("[uni统计 2.0] cloud importObject threw", e);
        return void 0;
      }
    }
    function once(payload) {
      const receiver = getReceiver();
      if (!receiver || typeof receiver.report !== "function") {
        return Promise.reject(new Error("uniCloud space unavailable"));
      }
      return Promise.resolve(receiver.report(payload)).then((res) => {
        assertCloudResultOk(res);
      });
    }
    return {
      name: "2.0",
      available() {
        const space = resolveSpace(opts.uniCloudSpace);
        return !!(space && typeof space.importObject === "function");
      },
      send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
          try {
            yield withRetry(() => once(payload), {
              times: maxRetries,
              baseDelayMs: RETRY_BASE_DELAY_MS,
              sleep: opts.sleep
            });
          } catch (e) {
            logger.warn("[uni统计 2.0] 统计上报失败（云函数已重试）", e);
            throw e;
          }
        });
      }
    };
  }
  function getActionLabel(lt) {
    switch (lt) {
      case LT.Launch:
        return "应用启动";
      case LT.Hide:
        return "应用进入后台";
      case LT.Page:
        return "页面切换";
      case LT.Event:
        return "事件触发";
      case LT.Error:
        return "应用错误";
      case LT.Push:
        return "PUSH 设备标识";
      default:
        return `未知事件 (lt=${String(lt !== null && lt !== void 0 ? lt : "?")})`;
    }
  }
  function bucketSize(bucket) {
    let n2 = 0;
    for (const lt of Object.keys(bucket)) {
      const arr = bucket[lt];
      if (Array.isArray(arr))
        n2 += arr.length;
    }
    return n2;
  }
  function bucketSummary(bucket) {
    const parts = [];
    for (const lt of Object.keys(bucket)) {
      const arr = bucket[lt];
      if (Array.isArray(arr) && arr.length > 0) {
        parts.push(`lt=${lt}×${arr.length}`);
      }
    }
    return parts.join(", ") || "<空>";
  }
  function logCollect(data) {
    if (!logger.isDebug())
      return;
    const lt = data.lt;
    const label = getActionLabel(lt);
    logger.debug(`=== 统计数据采集：${label} (lt=${String(lt !== null && lt !== void 0 ? lt : "?")}) ===`);
    logger.debug(data);
    logger.debug("=== 采集结束 ===");
  }
  function logBoot(info) {
    if (!logger.isDebug())
      return;
    const timeoutParts = [];
    if (info.backgroundTimeoutSec != null) {
      timeoutParts.push(`后台超时(新会话): ${info.backgroundTimeoutSec}s`);
    }
    if (info.pageInactiveTimeoutSec != null) {
      timeoutParts.push(`前台无操作超时: ${info.pageInactiveTimeoutSec}s`);
    }
    const timeoutSeg = timeoutParts.length > 0 ? ` | ${timeoutParts.join(" | ")}` : "";
    const lines = [
      "=== uni统计 2.0 已启用 ===",
      `上报间隔: ${info.reportIntervalSec}s${timeoutSeg} | 应用APPID: ${info.ak || "<未注入>"}${info.appName ? ` | 应用名: ${info.appName}` : ""}${info.vueMode ? ` | ${info.vueMode}` : ""}`
    ];
    if (info.debugFromManifest) {
      lines.push("调试模式：已从 manifest.uniStatistics.debug 自动开启");
    }
    lines.push("=== 后续将在每次采集 / 上报时输出过程日志 ===");
    logger.debug(lines.join("\n"));
  }
  function logReportStart(info) {
    if (!logger.isDebug())
      return;
    const total = bucketSize(info.bucket);
    const summary = bucketSummary(info.bucket);
    logger.debug(`=== 准备上报：共 ${total} 条事件 (${summary}) ===`);
  }
  function logReportFailureReason(info) {
    if (!logger.isDebug())
      return;
    logger.debug(`原因: ${describeError(info.error)}`);
    if (info.persistedId) {
      logger.debug(`已暂存重试队列 [retryId=${info.persistedId}]，下次启动自动续传`);
    } else {
      logger.debug("未能写入重试队列：本批数据已丢弃");
    }
  }
  function logReportSummary(info) {
    if (!logger.isDebug())
      return;
    if (info.failedCount === 0) {
      logger.debug(`=== 上报成功： ${info.okCount} 条事件已送达, 用时 ${info.elapsedMs}ms ===`);
    } else if (info.okCount === 0) {
      logger.debug(`=== 上报失败： ${info.failedCount} 条事件未送达, 用时 ${info.elapsedMs}ms ===`);
    } else {
      logger.debug(`=== 上报完成：成功 ${info.okCount} 条，失败 ${info.failedCount} 条，用时 ${info.elapsedMs}ms ===`);
    }
  }
  function logNoChannel(info) {
    if (!logger.isDebug())
      return;
    logger.debug(`=== 上报跳过：当前无可用通道，已回滚 ${bucketSize(info.bucket)} 条事件入队 ===`);
  }
  function logRecoverStart(count) {
    if (!logger.isDebug())
      return;
    logger.debug(`=== 冷启续传：发现 ${count} 条历史 payload，开始逐条重发 ===`);
  }
  function logRecoverItem(info) {
    if (!logger.isDebug())
      return;
    if (info.ok) {
      logger.debug(`续传成功 (${info.index}/${info.total})`);
    } else {
      logger.debug(`续传失败 (${info.index}/${info.total})：${describeError(info.error)}`);
    }
  }
  function describeError(e) {
    if (!e)
      return "<无错误对象>";
    if (e instanceof Error) {
      return `${e.name}: ${e.message}`;
    }
    if (typeof e === "string")
      return e;
    return safeStringify(e) || String(e);
  }
  function omitEmptyStringFieldsForUpload(data) {
    const out = {};
    for (const key of Object.keys(data)) {
      const v = data[key];
      if (v === "")
        continue;
      out[key] = v;
    }
    return out;
  }
  const LT_ORDER = {
    "1": 1,
    "11": 2,
    "21": 3,
    "31": 4,
    "101": 5,
    "3": 100
  };
  const UNKNOWN_LT_WEIGHT = 50;
  function handleData(buckets) {
    return JSON.stringify(flatten(buckets));
  }
  function flatten(buckets) {
    const ltKeys = Object.keys(buckets);
    ltKeys.sort((a, b) => weightOf(a) - weightOf(b));
    const out = [];
    for (let i = 0; i < ltKeys.length; i++) {
      const lt = ltKeys[i];
      const list = buckets[lt];
      if (!list || list.length === 0)
        continue;
      for (let j = 0; j < list.length; j++)
        out.push(list[j]);
    }
    return out;
  }
  function weightOf(lt) {
    const w = LT_ORDER[lt];
    return typeof w === "number" ? w : UNKNOWN_LT_WEIGHT;
  }
  function chunkEvents(events, opts = {}) {
    var _a, _b;
    const maxEvents2 = (_a = opts.maxEvents) !== null && _a !== void 0 ? _a : Infinity;
    const maxBytes = (_b = opts.maxBytes) !== null && _b !== void 0 ? _b : Infinity;
    const out = [];
    if (!Array.isArray(events) || events.length === 0)
      return out;
    const safeMaxEvents = maxEvents2 > 0 ? maxEvents2 : Infinity;
    const safeMaxBytes = maxBytes > 0 ? maxBytes : Infinity;
    let cur = [];
    let curBytes = 2;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      let s2 = "";
      try {
        s2 = JSON.stringify(e);
      } catch (_c) {
        continue;
      }
      const inc = cur.length === 0 ? s2.length : s2.length + 1;
      const wouldExceed = cur.length >= safeMaxEvents || cur.length > 0 && curBytes + inc > safeMaxBytes;
      if (wouldExceed) {
        out.push(cur);
        cur = [];
        curBytes = 2;
      }
      cur.push(e);
      curBytes += cur.length === 1 ? s2.length : s2.length + 1;
    }
    if (cur.length > 0)
      out.push(cur);
    return out;
  }
  function handleDataChunked(buckets, opts = {}) {
    const events = flatten(buckets);
    if (events.length === 0)
      return [];
    const chunks = chunkEvents(events, opts);
    const out = [];
    for (let i = 0; i < chunks.length; i++) {
      out.push(JSON.stringify(chunks[i]));
    }
    return out;
  }
  class PermanentChannelError extends Error {
    constructor(message) {
      super(message);
      this.permanent = true;
      this.name = "PermanentChannelError";
      Object.setPrototypeOf(this, PermanentChannelError.prototype);
    }
  }
  function isPermanentChannelError(err) {
    if (!err || typeof err !== "object")
      return false;
    if (err instanceof PermanentChannelError)
      return true;
    const e = err;
    if (e.name === "PermanentChannelError")
      return true;
    if (e.permanent === true)
      return true;
    return false;
  }
  function defaultGenPayloadId(nowMs2) {
    return "p-" + nowMs2.toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function createCollector(deps) {
    let firstFlushDone = false;
    let deferredFlushTimer = null;
    function cancelDeferredFlush() {
      if (deferredFlushTimer == null)
        return;
      clearTimeout(deferredFlushTimer);
      deferredFlushTimer = null;
    }
    function triggerAutoFlush() {
      var _a;
      const deferMs = Math.max(0, Math.floor((_a = deps.firstFlushDeferMs) !== null && _a !== void 0 ? _a : 0));
      if (!firstFlushDone && deferMs > 0) {
        if (deferredFlushTimer != null)
          return;
        deferredFlushTimer = setTimeout(() => {
          deferredFlushTimer = null;
          firstFlushDone = true;
          void flushImpl(false).catch((e) => logger.warn("[uni统计 2.0] auto-flush failed", e));
        }, deferMs);
        return;
      }
      firstFlushDone = true;
      void flushImpl(false).catch((e) => logger.warn("[uni统计 2.0] auto-flush failed", e));
    }
    function report(input) {
      tryRun(() => {
        const t = typeof input.t === "number" ? input.t : deps.nowSec();
        const snap = deps.session.getSnapshot();
        let sessionForCtx;
        if (snap) {
          const seq = deps.session.nextSeq();
          sessionForCtx = Object.assign({}, snap, { seq });
        }
        if (snap && input.lt === LT.Event && deps.session.touch) {
          deps.session.touch(t);
        }
        const ctx = Object.assign({}, input, {
          t,
          session: sessionForCtx
        });
        const data = deps.builder.build(ctx);
        logCollect(data);
        deps.queue.enqueue(omitEmptyStringFieldsForUpload(data));
        if (deps.queue.shouldFlush()) {
          triggerAutoFlush();
        }
      }, void 0);
    }
    function flushImpl() {
      return __awaiter(this, arguments, void 0, function* (force = false) {
        var _a, _b, _c, _d, _e;
        if (!deps.queue.shouldFlush(force))
          return;
        const snapshot = deps.queue.flush();
        if (!snapshot)
          return;
        const channel = deps.selectChannel();
        if (!channel) {
          logger.warn("[uni统计 2.0] 无可用上报线路，本批已回滚队列");
          logNoChannel({ bucket: snapshot });
          deps.queue.rollback(snapshot);
          return;
        }
        const globalMaxBytes = (_b = (_a = deps.batchLimits) === null || _a === void 0 ? void 0 : _a.maxBytes) !== null && _b !== void 0 ? _b : BATCH_REQUESTS_MAX_BYTES;
        const channelMaxBytes = typeof channel.maxRequestBytes === "function" ? channel.maxRequestBytes() : Number.POSITIVE_INFINITY;
        const limits = {
          maxEvents: (_d = (_c = deps.batchLimits) === null || _c === void 0 ? void 0 : _c.maxEvents) !== null && _d !== void 0 ? _d : BATCH_MAX_EVENTS,
          maxBytes: Math.min(globalMaxBytes, channelMaxBytes)
        };
        const chunks = handleDataChunked(snapshot, limits);
        if (chunks.length === 0) {
          logger.warn("[uni统计 2.0] flush 切片结果为空，已回滚队列", snapshot);
          deps.queue.rollback(snapshot);
          return;
        }
        const startMs = deps.nowMs();
        let totalCount = 0;
        for (const lt of Object.keys(snapshot)) {
          const arr = snapshot[lt];
          if (Array.isArray(arr))
            totalCount += arr.length;
        }
        logReportStart({ channel: channel.name, bucket: snapshot });
        const hasLaunch = Array.isArray(snapshot["1"]) && snapshot["1"].length > 0;
        let okEvents = 0;
        let failedEvents = 0;
        let allOk = true;
        let firstChunkOk = true;
        for (let i = 0; i < chunks.length; i++) {
          const requests = chunks[i];
          const payload = {
            usv: deps.config.usv,
            t: deps.nowSec(),
            requests,
            _id: ((_e = deps.genPayloadId) !== null && _e !== void 0 ? _e : () => defaultGenPayloadId(deps.nowMs()))()
          };
          const sliceEvents = countEvents(requests);
          try {
            yield channel.send(payload);
            okEvents += sliceEvents;
          } catch (e) {
            allOk = false;
            if (i === 0)
              firstChunkOk = false;
            failedEvents += sliceEvents;
            if (isPermanentChannelError(e)) {
              logger.warn("[uni统计 2.0] 统计上报失败（本批已丢弃，不可重试）", e, "sliceBytes=" + requests.length);
              logReportFailureReason({ error: e, persistedId: void 0 });
              continue;
            }
            logger.warn("[uni统计 2.0] 统计上报失败（已暂存，下次启动自动重试）", e);
            const id = deps.retry.persist(payload);
            if (!id) {
              logger.warn("[uni统计 2.0] 统计暂存重试失败（无 retryId），本批已丢弃");
            }
            logReportFailureReason({ error: e, persistedId: id });
          }
        }
        const visitAccepted = hasLaunch ? firstChunkOk : allOk;
        if (visitAccepted) {
          tryRun(() => deps.visit.commitVisitOnAck(deps.nowSec()), void 0);
        } else {
          tryRun(() => deps.visit.rollbackPendingVisit(), void 0);
        }
        logReportSummary({
          channel: channel.name,
          okCount: okEvents,
          failedCount: failedEvents,
          elapsedMs: deps.nowMs() - startMs
        });
      });
    }
    function countEvents(requests) {
      try {
        const arr = JSON.parse(requests);
        return Array.isArray(arr) ? arr.length : 0;
      } catch (_a) {
        return 0;
      }
    }
    function recoverRetry() {
      return __awaiter(this, void 0, void 0, function* () {
        const items = deps.retry.loadAll();
        if (items.length === 0)
          return;
        const channel = deps.selectChannel();
        if (!channel) {
          logger.warn("[uni统计 2.0] 续传重试跳过：当前无可用上报线路");
          return;
        }
        logRecoverStart(items.length);
        let i = 0;
        for (const payload of items) {
          i++;
          try {
            yield channel.send(payload);
            if (payload._id)
              deps.retry.ack(payload._id);
            logRecoverItem({
              index: i,
              total: items.length,
              payloadId: payload._id,
              ok: true
            });
          } catch (e) {
            if (isPermanentChannelError(e)) {
              if (payload._id)
                deps.retry.ack(payload._id);
              logger.warn("[uni统计 2.0] 续传重试失败（不可重试，已从队列移除）", e, "id=" + payload._id);
              logRecoverItem({
                index: i,
                total: items.length,
                payloadId: payload._id,
                ok: false,
                error: e
              });
              continue;
            }
            if (payload._id && deps.retry.markAttempt) {
              deps.retry.markAttempt(payload._id);
            }
            logger.warn("[uni统计 2.0] 续传重试失败（保留队列，下次启动再试）", e);
            logRecoverItem({
              index: i,
              total: items.length,
              payloadId: payload._id,
              ok: false,
              error: e
            });
          }
        }
      });
    }
    function flush2() {
      return __awaiter(this, arguments, void 0, function* (force = false) {
        cancelDeferredFlush();
        firstFlushDone = true;
        return flushImpl(force);
      });
    }
    function destroy() {
      cancelDeferredFlush();
      firstFlushDone = true;
    }
    return { report, flush: flush2, recoverRetry, destroy };
  }
  function getUni$5() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  function toQuery(payload) {
    const out = [];
    out.push("usv=" + encodeURIComponent(String(payload.usv)));
    out.push("t=" + encodeURIComponent(String(payload.t)));
    out.push("requests=" + encodeURIComponent(payload.requests));
    return out.join("&");
  }
  function tryImageRequest(payload, h5Url = STAT_H5_URL) {
    const ImageCtor = getGlobalObject().Image;
    if (typeof ImageCtor !== "function")
      return false;
    return tryRun(() => {
      const img = new ImageCtor();
      img.src = h5Url + "?" + toQuery(payload);
      return true;
    }, false);
  }
  function createHttpChannel(opts = {}) {
    var _a, _b, _c, _d, _e;
    const url = (_a = opts.url) !== null && _a !== void 0 ? _a : STAT_URL;
    const h5Url = (_b = opts.h5Url) !== null && _b !== void 0 ? _b : STAT_H5_URL;
    const ut = (_c = opts.ut) !== null && _c !== void 0 ? _c : "";
    const timeoutMs = (_d = opts.timeoutMs) !== null && _d !== void 0 ? _d : 1e4;
    const maxRetries = (_e = opts.maxRetries) !== null && _e !== void 0 ? _e : HTTP_MAX_RETRIES;
    function once(payload) {
      if (ut === "h5" && opts.preferImageOnH5 !== false) {
        if (tryImageRequest(payload, h5Url))
          return Promise.resolve();
      }
      const u = getUni$5();
      if (!u || typeof u.request !== "function") {
        return Promise.reject(new Error("uni.request unavailable"));
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled)
            return;
          settled = true;
          reject(new Error("http timeout"));
        }, timeoutMs);
        u.request({
          url,
          method: "POST",
          data: payload,
          timeout: timeoutMs,
          success: (res) => {
            var _a2;
            if (settled)
              return;
            settled = true;
            clearTimeout(timer);
            const code = (_a2 = res === null || res === void 0 ? void 0 : res.statusCode) !== null && _a2 !== void 0 ? _a2 : 0;
            if (code >= 200 && code < 300)
              resolve();
            else
              reject(new Error("http status " + code));
          },
          fail: (e) => {
            if (settled)
              return;
            settled = true;
            clearTimeout(timer);
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
      });
    }
    return {
      name: "1.0",
      available() {
        const u = getUni$5();
        return !!(u && typeof u.request === "function");
      },
      send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
          try {
            yield withRetry(() => once(payload), {
              times: maxRetries,
              baseDelayMs: RETRY_BASE_DELAY_MS,
              sleep: opts.sleep
            });
          } catch (e) {
            logger.warn("[uni统计 2.0] 统计上报失败（HTTP 已重试）", e);
            throw e;
          }
        });
      }
    };
  }
  const WEBTRACK_API_PATH = "/WebTrack";
  const WEBTRACK_BEACON_PATH = "/WebTrack.gif";
  function getUni$4() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  const REPORT_URL_BASE_OVERHEAD = 256;
  const REPORT_ENCODE_RATIO = 3;
  function buildStatReportUrl(payload, opts) {
    var _a;
    const t = ((_a = opts.nowMs) !== null && _a !== void 0 ? _a : () => Date.now())();
    const logs = encodeURIComponent(payload.requests);
    const host = opts.host.replace(/\/+$/, "");
    return host + opts.path + "?ProjectId=" + encodeURIComponent(opts.projectId) + "&TopicId=" + encodeURIComponent(opts.topicId) + "&Logs=" + logs + "&Source=webImg&Time=" + t;
  }
  function summarizeHttpErrorBody(data, maxLen = 320) {
    if (data == null)
      return "";
    if (typeof data === "string") {
      return data.length <= maxLen ? data : data.slice(0, maxLen) + "…";
    }
    try {
      const s2 = JSON.stringify(data);
      return s2.length <= maxLen ? s2 : s2.slice(0, maxLen) + "…";
    } catch (_a) {
      return String(data).slice(0, maxLen);
    }
  }
  function imageBeaconAwait(url, ms) {
    const ImageCtor = getGlobalObject().Image;
    if (typeof ImageCtor !== "function") {
      return Promise.reject(new PermanentChannelError("当前环境无法完成统计上报"));
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled)
          return;
        settled = true;
        reject(new Error("统计上报超时"));
      }, ms);
      const img = new ImageCtor();
      img.onload = () => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      img.src = url;
    });
  }
  function fetchBeaconAwait(url, ms) {
    const g = getGlobalObject();
    const fetchFn = g.fetch;
    if (typeof fetchFn !== "function") {
      return Promise.reject(new Error("fetch unavailable"));
    }
    const controller = typeof g.AbortController === "function" ? new g.AbortController() : void 0;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled)
          return;
        settled = true;
        if (controller)
          tryRun(() => controller.abort(), void 0);
        reject(new Error("统计上报超时"));
      }, ms);
      fetchFn(url, {
        method: "GET",
        keepalive: true,
        credentials: "omit",
        signal: controller ? controller.signal : void 0
      }).then((res) => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        if (res && res.ok) {
          resolve();
          return;
        }
        reject(new Error("统计上报 HTTP " + (res ? res.status : 0)));
      }, (e) => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      });
    });
  }
  function getWxPreloadAssets() {
    const wx = getGlobalObject().wx;
    return typeof (wx === null || wx === void 0 ? void 0 : wx.preloadAssets) === "function" ? wx.preloadAssets : void 0;
  }
  function formatWxPreloadFail(err) {
    if (err instanceof Error)
      return err;
    if (err != null && typeof err === "object" && "errMsg" in err) {
      const msg = err.errMsg;
      if (typeof msg === "string" && msg.length > 0)
        return new Error(msg);
    }
    if (err == null)
      return new Error("preloadAssets fail (empty err)");
    return new Error(String(err));
  }
  function mpWeixinPreloadAssetsBeaconAwait(url, ms, preload) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled)
          return;
        settled = true;
        reject(new Error("统计上报超时(preloadAssets)"));
      }, ms);
      try {
        preload({
          data: [{ type: "image", src: url }],
          success: () => {
            if (settled)
              return;
            settled = true;
            clearTimeout(timer);
            resolve();
          },
          fail: (err) => {
            if (settled)
              return;
            settled = true;
            clearTimeout(timer);
            reject(formatWxPreloadFail(err));
          }
        });
      } catch (e) {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }
  function isMpWeixinPreloadEnabled(opts) {
    var _a, _b;
    const enabled = (_a = opts.mpWeixinPreloadReport) !== null && _a !== void 0 ? _a : MP_WEIXIN_USE_PRELOAD_ASSETS_REPORT;
    if (!enabled)
      return false;
    const raw = (_b = opts.rawPlatform) !== null && _b !== void 0 ? _b : getRawPlatform();
    return raw === "mp-weixin";
  }
  function createImageChannel(opts = {}) {
    var _a, _b, _c, _d, _e, _f, _g;
    const host = (_a = opts.host) !== null && _a !== void 0 ? _a : IMAGE_REPORT_DEFAULTS.host;
    const projectId = (_b = opts.projectId) !== null && _b !== void 0 ? _b : IMAGE_REPORT_DEFAULTS.projectId;
    const topicId = (_c = opts.topicId) !== null && _c !== void 0 ? _c : IMAGE_REPORT_DEFAULTS.topicId;
    const timeoutMs = (_d = opts.timeoutMs) !== null && _d !== void 0 ? _d : 1e4;
    const maxRetries = (_e = opts.maxRetries) !== null && _e !== void 0 ? _e : IMAGE_MAX_RETRIES;
    const maxUrlLength = (_f = opts.maxUrlLength) !== null && _f !== void 0 ? _f : 6 * 1024;
    const preferBeacon = opts.preferImageBeacon !== false;
    const nowMs2 = opts.nowMs;
    const ut = (_g = opts.ut) !== null && _g !== void 0 ? _g : "";
    const isH52 = ut === "h5";
    const mpWeixinPreload = isMpWeixinPreloadEnabled(opts);
    function configured() {
      return !!(host && projectId && topicId);
    }
    const reportOpts = { host, projectId, topicId, nowMs: nowMs2 };
    function preflightUrl(payload, path) {
      if (!configured()) {
        throw new PermanentChannelError("统计上报未配置：请设置 TLS host、projectId、topicId");
      }
      const url = buildStatReportUrl(payload, {
        host: reportOpts.host,
        projectId: reportOpts.projectId,
        topicId: reportOpts.topicId,
        nowMs: reportOpts.nowMs,
        path
      });
      if (url.length > maxUrlLength) {
        throw new PermanentChannelError("统计上报 URL 过长: " + url.length + " > " + maxUrlLength);
      }
      return url;
    }
    function webTrackGetViaRequest(url) {
      const u = getUni$4();
      if (!u || typeof u.request !== "function") {
        return Promise.reject(new PermanentChannelError("当前环境无法完成统计上报"));
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled)
            return;
          settled = true;
          reject(new Error("统计上报超时"));
        }, timeoutMs);
        u.request({
          url,
          method: "GET",
          timeout: timeoutMs,
          success: (res) => {
            var _a2;
            if (settled)
              return;
            settled = true;
            clearTimeout(timer);
            const code = (_a2 = res === null || res === void 0 ? void 0 : res.statusCode) !== null && _a2 !== void 0 ? _a2 : 0;
            if (code >= 200 && code < 300) {
              resolve();
              return;
            }
            const hint = summarizeHttpErrorBody(res === null || res === void 0 ? void 0 : res.data);
            reject(new Error(hint ? `统计上报 HTTP ${code}: ${hint}` : `统计上报 HTTP ${code}`));
          },
          fail: (e) => {
            if (settled)
              return;
            settled = true;
            clearTimeout(timer);
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
      });
    }
    function onceH5(payload) {
      const g = getGlobalObject();
      const u = getUni$4();
      const hasRequest = !!(u && typeof u.request === "function");
      if (preferBeacon && typeof g.fetch === "function") {
        return fetchBeaconAwait(preflightUrl(payload, WEBTRACK_BEACON_PATH), timeoutMs);
      }
      if (hasRequest) {
        return webTrackGetViaRequest(preflightUrl(payload, WEBTRACK_API_PATH));
      }
      if (preferBeacon && typeof g.Image === "function") {
        return imageBeaconAwait(preflightUrl(payload, WEBTRACK_BEACON_PATH), timeoutMs);
      }
      return Promise.reject(new PermanentChannelError("当前环境无法完成统计上报"));
    }
    function onceMpWeixin(payload) {
      const preloadFn = getWxPreloadAssets();
      if (preloadFn) {
        return mpWeixinPreloadAssetsBeaconAwait(preflightUrl(payload, WEBTRACK_BEACON_PATH), MP_WEIXIN_PRELOAD_TIMEOUT_MS, preloadFn);
      }
      logger.warn("[uni统计 2.0] wx.preloadAssets 不可用，回退 uni.request GET /WebTrack");
      return webTrackGetViaRequest(preflightUrl(payload, WEBTRACK_API_PATH));
    }
    function dispatchReport(payload) {
      if (isH52)
        return onceH5(payload);
      if (mpWeixinPreload)
        return onceMpWeixin(payload);
      return webTrackGetViaRequest(preflightUrl(payload, WEBTRACK_API_PATH));
    }
    return {
      name: "image",
      available() {
        return configured();
      },
      maxRequestBytes() {
        const raw = (maxUrlLength - REPORT_URL_BASE_OVERHEAD) / REPORT_ENCODE_RATIO;
        return Math.max(512, Math.floor(raw));
      },
      send(payload) {
        return __awaiter(this, void 0, void 0, function* () {
          try {
            yield withRetry(() => dispatchReport(payload), {
              times: maxRetries,
              baseDelayMs: RETRY_BASE_DELAY_MS,
              sleep: opts.sleep
            });
          } catch (e) {
            if (isPermanentChannelError(e)) {
              logger.warn("[uni统计 2.0] 统计上报失败（不可重试）", e);
            } else {
              logger.warn("[uni统计 2.0] 统计上报失败（已重试）", e);
            }
            throw e;
          }
        });
      }
    };
  }
  function s(v, def = "") {
    if (typeof v === "string")
      return v;
    if (typeof v === "number" && Number.isFinite(v))
      return String(v);
    return def;
  }
  function n(v, def = 0) {
    if (typeof v === "number" && Number.isFinite(v))
      return v;
    if (typeof v === "string" && v.length > 0) {
      const x = Number(v);
      if (Number.isFinite(x))
        return x;
    }
    return def;
  }
  function createStatDataBuilder(deps) {
    function baseFields() {
      var _a, _b, _c;
      const { config: config2, platform, system, locale, device, net, location: location2, pkg, legacy, web } = deps;
      return {
        ak: s(config2.ak),
        usv: s(config2.usv),
        v: s((_a = config2.v) !== null && _a !== void 0 ? _a : system.appVersion),
        ch: s(config2.ch),
        ut: s(platform.ut),
        p: s((_b = platform.p) !== null && _b !== void 0 ? _b : system.osP),
        on: s(system.on),
        did: s(device.uuid),
        brand: s(system.brand),
        md: s(system.md),
        sv: s(system.sv),
        mpsdk: s(system.sdkVersion),
        mpv: s(system.mpvHostVersion),
        pr: n(locale.pr, 1),
        ww: n(locale.ww),
        wh: n(locale.wh),
        sw: n(locale.sw),
        sh: n(locale.sh),
        lang: s(locale.lang),
        net: s(net.net, "unknown"),
        lat: s(location2.lat),
        lng: s(location2.lng),
        mpn: s((_c = legacy === null || legacy === void 0 ? void 0 : legacy.mpn) !== null && _c !== void 0 ? _c : pkg.mpn),
        tdaid: s(pkg.tdaid),
        pkn: s(pkg.pkn),
        an: s(pkg.an),
        domain: s(web.domain)
      };
    }
    function sessionFields(ctx) {
      if (!ctx.session)
        return {};
      return {
        sid: ctx.session.sid,
        cst: ctx.session.sct
      };
    }
    function pageFields(ctx) {
      const out = {};
      if (ctx.url !== void 0)
        out.url = s(ctx.url);
      if (ctx.urlref !== void 0)
        out.urlref = s(ctx.urlref);
      if (ctx.urlref_ts !== void 0)
        out.urlref_ts = n(ctx.urlref_ts);
      if (ctx.ttn !== void 0)
        out.ttn = s(ctx.ttn);
      if (ctx.ttpj !== void 0)
        out.ttpj = s(ctx.ttpj);
      if (ctx.ttc !== void 0)
        out.ttc = s(ctx.ttc);
      return out;
    }
    function entryFields(ctx) {
      if (ctx.lt === "11") {
        return {
          iey: toIey(ctx.iey !== void 0 ? ctx.iey : false),
          ppiey: toIey(ctx.ppiey !== void 0 ? ctx.ppiey : false)
        };
      }
      return {};
    }
    function visitFields(ctx) {
      if (ctx.lt !== "1")
        return {};
      if (!ctx.visit)
        return {};
      return {
        fvts: ctx.visit.fvts,
        lvts: ctx.visit.lvts,
        tvc: ctx.visit.tvc
      };
    }
    function launchFields(ctx) {
      if (ctx.lt !== "1")
        return {};
      if (ctx.sc === void 0)
        return {};
      return { sc: s(ctx.sc) };
    }
    function errorFields(ctx) {
      if (ctx.lt !== "31" || !ctx.errMsg)
        return {};
      const ERR_MSG_MAX = 3 * 1024;
      const TRUNC_SUFFIX = "…[truncated]";
      let em = s(ctx.errMsg);
      if (em.length > ERR_MSG_MAX) {
        em = em.slice(0, ERR_MSG_MAX - TRUNC_SUFFIX.length) + TRUNC_SUFFIX;
      }
      return { em };
    }
    function pushFields(ctx) {
      if (ctx.lt !== "101" || !ctx.cid)
        return {};
      return { cid: s(ctx.cid) };
    }
    function build(ctx) {
      const safeCustom = {};
      if (ctx.custom) {
        const reserved = /* @__PURE__ */ new Set([
          "lt",
          "t",
          "sid",
          "cst",
          "did",
          "p",
          "on",
          "mpv",
          "domain",
          "fvts",
          "lvts",
          "tvc",
          "sc"
        ]);
        for (const k of Object.keys(ctx.custom)) {
          if (!reserved.has(k))
            safeCustom[k] = ctx.custom[k];
        }
      }
      const out = { lt: ctx.lt, t: n(ctx.t) };
      Object.assign(out, baseFields(), sessionFields(ctx), pageFields(ctx), entryFields(ctx), visitFields(ctx), launchFields(ctx), errorFields(ctx), pushFields(ctx), safeCustom);
      return out;
    }
    return { build };
  }
  let cachedStatic = null;
  function getUni$3() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  function mergeWxHostSnapshots() {
    const raw = getRawPlatform();
    if (raw !== "mp-weixin" && raw !== "mp-qq")
      return null;
    const wxHost = getGlobalObject().wx;
    if (!wxHost)
      return null;
    const sync = typeof wxHost.getSystemInfoSync === "function" ? tryRun(() => wxHost.getSystemInfoSync(), null) : null;
    const device = typeof wxHost.getDeviceInfo === "function" ? tryRun(() => wxHost.getDeviceInfo(), null) : null;
    const appBase = typeof wxHost.getAppBaseInfo === "function" ? tryRun(() => wxHost.getAppBaseInfo(), null) : null;
    const windowInfo = typeof wxHost.getWindowInfo === "function" ? tryRun(() => wxHost.getWindowInfo(), null) : null;
    return mergeSystemSnapshots(sync, device, appBase, windowInfo);
  }
  function mergeSystemSnapshots(...parts) {
    const out = {};
    for (const p of parts) {
      if (!p)
        continue;
      for (const k of Object.keys(p)) {
        const v = p[k];
        if (v !== void 0 && v !== null)
          out[k] = v;
      }
    }
    return out;
  }
  function mergedSystemInfo() {
    const u = getUni$3();
    const sync = u && typeof u.getSystemInfoSync === "function" ? tryRun(() => u.getSystemInfoSync(), null) : null;
    const device = u && typeof u.getDeviceInfo === "function" ? tryRun(() => u.getDeviceInfo(), null) : null;
    const appBase = u && typeof u.getAppBaseInfo === "function" ? tryRun(() => u.getAppBaseInfo(), null) : null;
    const windowInfo = u && typeof u.getWindowInfo === "function" ? tryRun(() => u.getWindowInfo(), null) : null;
    const fromUni = mergeSystemSnapshots(sync, device, appBase, windowInfo);
    const fromWx = mergeWxHostSnapshots();
    const merged = fromWx ? mergeSystemSnapshots(fromUni, fromWx) : fromUni;
    return merged;
  }
  function resolveUniConfigAppVersion() {
    return tryRun(() => {
      const cfg = getGlobalObject().__uniConfig;
      return typeof (cfg === null || cfg === void 0 ? void 0 : cfg.appVersion) === "string" ? cfg.appVersion : "";
    }, "");
  }
  function resolveBuildTimeAppVersion() {
    const raw = "1.0.0";
    return typeof raw === "string" ? raw : "";
  }
  function resolveAppVersionForStat(plus2, sys) {
    var _a;
    const fromPlus = (_a = plus2 === null || plus2 === void 0 ? void 0 : plus2.runtime) === null || _a === void 0 ? void 0 : _a.version;
    if (typeof fromPlus === "string" && fromPlus)
      return fromPlus;
    const fromSys = sys.appVersion;
    if (typeof fromSys === "string" && fromSys)
      return fromSys;
    const fromUniConfig = resolveUniConfigAppVersion();
    if (fromUniConfig)
      return fromUniConfig;
    return resolveBuildTimeAppVersion();
  }
  function buildOnForStat(sys) {
    const rom = typeof sys.romName === "string" ? sys.romName.trim() : "";
    if (rom) {
      const romVer = typeof sys.romVersion === "string" ? sys.romVersion.trim() : "";
      return romVer ? `${rom} ${romVer}`.trim() : rom;
    }
    return typeof sys.osName === "string" ? sys.osName.trim() : "";
  }
  function getSystemInfo() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    if (cachedStatic)
      return cachedStatic;
    const sys = mergedSystemInfo();
    const plus2 = getGlobalObject().plus;
    const appVersion = resolveAppVersionForStat(plus2, sys);
    cachedStatic = {
      brand: (_b = (_a = sys.deviceBrand) !== null && _a !== void 0 ? _a : sys.brand) !== null && _b !== void 0 ? _b : "",
      md: (_d = (_c = sys.deviceModel) !== null && _c !== void 0 ? _c : sys.model) !== null && _d !== void 0 ? _d : "",
      sv: (_f = (_e = sys.osVersion) !== null && _e !== void 0 ? _e : sys.system) !== null && _f !== void 0 ? _f : "",
      v: (_h = (_g = sys.hostVersion) !== null && _g !== void 0 ? _g : sys.version) !== null && _h !== void 0 ? _h : "",
      ut: (_j = sys.deviceType) !== null && _j !== void 0 ? _j : "unknown",
      appVersion,
      appWgtVersion: (_p = (_o = (_l = (_k = plus2 === null || plus2 === void 0 ? void 0 : plus2.runtime) === null || _k === void 0 ? void 0 : _k.appWgtVersion) !== null && _l !== void 0 ? _l : (_m = plus2 === null || plus2 === void 0 ? void 0 : plus2.runtime) === null || _m === void 0 ? void 0 : _m.appWgtRevision) !== null && _o !== void 0 ? _o : sys.appWgtVersion) !== null && _p !== void 0 ? _p : "",
      mpvHostVersion: ((_r = (_q = sys.hostVersion) !== null && _q !== void 0 ? _q : sys.version) !== null && _r !== void 0 ? _r : "").trim(),
      on: buildOnForStat(sys),
      sdkVersion: (_t = (_s = sys.hostSDKVersion) !== null && _s !== void 0 ? _s : sys.SDKVersion) !== null && _t !== void 0 ? _t : "",
      statusBarHeight: typeof sys.statusBarHeight === "number" ? sys.statusBarHeight : 0,
      osP: normalizeStatOsP({
        platform: sys.platform,
        osName: sys.osName,
        system: sys.system
      })
    };
    return cachedStatic;
  }
  function getLocaleAndScreen() {
    var _a, _b;
    const sys = mergedSystemInfo();
    const prRaw = typeof sys.pixelRatio === "number" ? sys.pixelRatio : typeof sys.devicePixelRatio === "number" ? sys.devicePixelRatio : 1;
    return {
      lang: ((_b = (_a = sys.hostLanguage) !== null && _a !== void 0 ? _a : sys.language) !== null && _b !== void 0 ? _b : "").replace(/_/g, "-"),
      ww: typeof sys.windowWidth === "number" ? sys.windowWidth : 0,
      wh: typeof sys.windowHeight === "number" ? sys.windowHeight : 0,
      sw: typeof sys.screenWidth === "number" ? sys.screenWidth : 0,
      sh: typeof sys.screenHeight === "number" ? sys.screenHeight : 0,
      pr: prRaw > 0 ? prRaw : 1
    };
  }
  let cached$1 = null;
  function getUni$2() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  function getPlus() {
    return getGlobalObject().plus;
  }
  function getMpTdaid(platform) {
    const u = getUni$2();
    switch (platform) {
      case "wx":
      case "qq": {
        if (typeof (u === null || u === void 0 ? void 0 : u.getAccountInfoSync) === "function") {
          const id = tryRun(() => {
            var _a, _b;
            return (_b = (_a = u.getAccountInfoSync().miniProgram) === null || _a === void 0 ? void 0 : _a.appId) !== null && _b !== void 0 ? _b : "";
          }, "");
          if (id)
            return id;
        }
        const wxHost = getGlobalObject().wx;
        if (typeof (wxHost === null || wxHost === void 0 ? void 0 : wxHost.getAccountInfoSync) === "function") {
          const id2 = tryRun(() => {
            var _a, _b;
            return (_b = (_a = wxHost.getAccountInfoSync().miniProgram) === null || _a === void 0 ? void 0 : _a.appId) !== null && _b !== void 0 ? _b : "";
          }, "");
          if (id2)
            return id2;
        }
        const envId = "__UNI__8078FF1";
        return typeof envId === "string" ? envId : "";
      }
      case "ali":
      case "dt": {
        const my = getGlobalObject().my;
        if (!my)
          return "";
        const v1 = tryRun(() => {
          var _a, _b;
          return (_b = (_a = my.getAppIdSync) === null || _a === void 0 ? void 0 : _a.call(my)) !== null && _b !== void 0 ? _b : "";
        }, "");
        if (v1)
          return v1;
        return tryRun(() => {
          var _a, _b, _c;
          return (_c = (_b = (_a = my.getAccountInfoSync) === null || _a === void 0 ? void 0 : _a.call(my).miniProgram) === null || _b === void 0 ? void 0 : _b.appId) !== null && _c !== void 0 ? _c : "";
        }, "");
      }
      case "tt":
      case "lark": {
        const tt = getGlobalObject().tt;
        return tryRun(() => {
          var _a, _b, _c;
          return (_c = (_b = (_a = tt === null || tt === void 0 ? void 0 : tt.getEnvInfoSync) === null || _a === void 0 ? void 0 : _a.call(tt).microapp) === null || _b === void 0 ? void 0 : _b.appId) !== null && _c !== void 0 ? _c : "";
        }, "");
      }
      case "bd": {
        const swan = getGlobalObject().swan;
        return tryRun(() => {
          var _a, _b, _c;
          return (_c = (_b = (_a = swan === null || swan === void 0 ? void 0 : swan.getEnvInfoSync) === null || _a === void 0 ? void 0 : _a.call(swan).common) === null || _b === void 0 ? void 0 : _b.appKey) !== null && _c !== void 0 ? _c : "";
        }, "");
      }
      default:
        return "";
    }
  }
  function getAppPkn() {
    var _a, _b, _c;
    const plus2 = getPlus();
    if (!plus2)
      return "";
    const osName = (_c = (_b = (_a = plus2.os) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== null && _c !== void 0 ? _c : "";
    if (osName.includes("android")) {
      return tryRun(() => {
        var _a2, _b2, _c2, _d, _e;
        return (_e = (_d = (_c2 = (_b2 = (_a2 = plus2.android) === null || _a2 === void 0 ? void 0 : _a2.runtimeMainActivity) === null || _b2 === void 0 ? void 0 : _b2.call(_a2)) === null || _c2 === void 0 ? void 0 : _c2.getPackageName) === null || _d === void 0 ? void 0 : _d.call(_c2)) !== null && _e !== void 0 ? _e : "";
      }, "");
    }
    if (osName === "ios" || osName === "iphone os") {
      const v = tryRun(() => {
        var _a2, _b2;
        return (_b2 = (_a2 = plus2.ios) === null || _a2 === void 0 ? void 0 : _a2.bundleId) !== null && _b2 !== void 0 ? _b2 : "";
      }, "");
      return v || tryRun(() => {
        var _a2, _b2;
        return (_b2 = (_a2 = plus2.runtime) === null || _a2 === void 0 ? void 0 : _a2.appid) !== null && _b2 !== void 0 ? _b2 : "";
      }, "");
    }
    return tryRun(() => {
      var _a2, _b2;
      return (_b2 = (_a2 = plus2.runtime) === null || _a2 === void 0 ? void 0 : _a2.appid) !== null && _b2 !== void 0 ? _b2 : "";
    }, "");
  }
  function getAppName() {
    const plus2 = getPlus();
    if (!plus2)
      return "";
    return tryRun(() => {
      var _a, _b;
      return (_b = (_a = plus2.runtime) === null || _a === void 0 ? void 0 : _a.appname) !== null && _b !== void 0 ? _b : "";
    }, "") || tryRun(() => {
      var _a, _b;
      return (_b = (_a = plus2.runtime) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "";
    }, "");
  }
  function getEnvAppName() {
    var _a;
    return (_a = "qizha") !== null && _a !== void 0 ? _a : "";
  }
  function getH5AppName() {
    const env = getEnvAppName();
    if (env)
      return env;
    return tryRun(() => {
      var _a, _b;
      return (_b = (_a = getGlobalObject().document) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : "";
    }, "");
  }
  function getPackageInfo() {
    if (cached$1)
      return cached$1;
    const platform = getPlatform();
    let mpn = "";
    let tdaid = "";
    let pkn = "";
    let an = "";
    if (isApp()) {
      tdaid = tryRun(() => {
        var _a, _b, _c;
        return (_c = (_b = (_a = getPlus()) === null || _a === void 0 ? void 0 : _a.runtime) === null || _b === void 0 ? void 0 : _b.appid) !== null && _c !== void 0 ? _c : "";
      }, "");
      pkn = getAppPkn() || tdaid;
      an = getAppName() || getEnvAppName();
      mpn = pkn || tdaid;
    } else if (isMp()) {
      tdaid = getMpTdaid(platform);
      pkn = "";
      an = getEnvAppName();
      mpn = tdaid || "__UNI__8078FF1";
    } else if (isH5()) {
      tdaid = "";
      pkn = "";
      an = getH5AppName();
      mpn = "";
    } else {
      tdaid = "";
      pkn = "";
      an = getEnvAppName();
      mpn = "";
    }
    cached$1 = { mpn, tdaid, pkn, an };
    return cached$1;
  }
  const EMPTY_WEB_INFO = { domain: "" };
  let cached = null;
  function readWebDomainFromLocation(loc) {
    const protocol = typeof loc.protocol === "string" ? loc.protocol.toLowerCase() : "";
    if (protocol !== "http:" && protocol !== "https:")
      return "";
    if (typeof loc.origin === "string" && loc.origin.trim()) {
      return loc.origin.trim();
    }
    const host = typeof loc.host === "string" && loc.host.trim() ? loc.host.trim() : typeof loc.hostname === "string" ? loc.hostname.trim() : "";
    if (!host)
      return "";
    return `${protocol}//${host}`;
  }
  function getWebInfo() {
    if (!isH5())
      return EMPTY_WEB_INFO;
    if (cached !== null)
      return cached;
    cached = tryRun(() => {
      const win = getGlobalObject();
      const loc = win.location;
      if (!loc)
        return EMPTY_WEB_INFO;
      return { domain: readWebDomainFromLocation(loc) };
    }, EMPTY_WEB_INFO);
    return cached;
  }
  const registry = /* @__PURE__ */ new Map();
  const installedFanout = /* @__PURE__ */ new Map();
  function add(api, handlers) {
    var _a;
    const set2 = (_a = registry.get(api)) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Set();
    set2.add(handlers);
    registry.set(api, set2);
    reinstall(api);
    return () => {
      const cur = registry.get(api);
      if (!cur)
        return;
      cur.delete(handlers);
      if (cur.size === 0) {
        registry.delete(api);
        const prev = installedFanout.get(api);
        installedFanout.delete(api);
        if (prev) {
          try {
            getUni$1().removeInterceptor(api, prev);
          } catch (_a2) {
          }
        }
      } else {
        reinstall(api);
      }
    };
  }
  function buildFanout(set2) {
    return {
      invoke(args) {
        let blocked = false;
        for (const h of set2) {
          if (!h.invoke)
            continue;
          const r = h.invoke(args);
          if (r === false)
            blocked = true;
        }
        return blocked ? false : void 0;
      },
      success(res) {
        var _a;
        for (const h of set2)
          (_a = h.success) === null || _a === void 0 ? void 0 : _a.call(h, res);
      },
      fail(err) {
        var _a;
        for (const h of set2)
          (_a = h.fail) === null || _a === void 0 ? void 0 : _a.call(h, err);
      },
      complete(res) {
        var _a;
        for (const h of set2)
          (_a = h.complete) === null || _a === void 0 ? void 0 : _a.call(h, res);
      },
      returnValue(res) {
        let v = res;
        for (const h of set2) {
          if (!h.returnValue)
            continue;
          v = h.returnValue(v);
        }
        return v;
      }
    };
  }
  function reinstall(api) {
    const set2 = registry.get(api);
    if (!set2 || set2.size === 0)
      return;
    const fanout = buildFanout(set2);
    try {
      const uni2 = getUni$1();
      const prev = installedFanout.get(api);
      if (prev) {
        try {
          uni2.removeInterceptor(api, prev);
        } catch (_a) {
        }
      }
      uni2.addInterceptor(api, fanout);
      installedFanout.set(api, fanout);
    } catch (_b) {
    }
  }
  function getUni$1() {
    const raw = resolveUniRuntime();
    const u = raw != null && typeof raw === "object" ? raw : void 0;
    if (!u)
      throw new Error("[uni统计 2.0] uni interceptor API is not available");
    return u;
  }
  function __reset() {
    registry.clear();
    installedFanout.clear();
  }
  const interceptor = { add, __reset };
  function registerLoginInterceptor(reporter) {
    return interceptor.add("login", {
      complete() {
        reporter.report({ lt: LT.Event, custom: { e_n: "login" } });
      }
    });
  }
  function registerNavigationBarInterceptor() {
    return interceptor.add("setNavigationBarTitle", {
      invoke(args) {
        const a = args;
        if (a && "title" in a)
          setPageTitle(a.title);
      }
    });
  }
  function registerPaymentInterceptor(reporter) {
    return interceptor.add("requestPayment", {
      success() {
        reporter.report({ lt: LT.Event, custom: { e_n: "pay_success" } });
      },
      fail() {
        reporter.report({ lt: LT.Event, custom: { e_n: "pay_fail" } });
      }
    });
  }
  function registerShareInterceptor(reporter) {
    const fire = () => reporter.report({ lt: LT.Event, custom: { e_n: "share" } });
    return interceptor.add("share", {
      success() {
        fire();
      },
      fail() {
        fire();
      }
    });
  }
  function installAllInterceptors(reporter) {
    const unbinders = [
      registerLoginInterceptor(reporter),
      registerShareInterceptor(reporter),
      registerPaymentInterceptor(reporter),
      registerNavigationBarInterceptor()
    ];
    return () => {
      for (const u of unbinders) {
        try {
          u();
        } catch (_a) {
        }
      }
    };
  }
  const KEY_DONE = "migration:done";
  const KEY_MAP = [
    ["__first__visit__time", "visit:fvts"],
    ["__last__visit__time", "visit:lvts"],
    ["__total__visit__count", "visit:tvc"]
  ];
  function getAppId() {
    const id = "__UNI__8078FF1";
    if (id.length > 0)
      return id;
    return "default";
  }
  function readLegacyAggregate() {
    const u = resolveUniRuntime();
    if (!u || typeof u.getStorageSync !== "function")
      return null;
    const key = `${LEGACY_NAMESPACE_ROOT}:${getAppId()}`;
    const raw = tryRun(() => u.getStorageSync(key), null);
    if (raw && typeof raw === "object")
      return raw;
    return null;
  }
  let ran = false;
  function migrateLegacyData() {
    if (ran)
      return false;
    ran = true;
    const doneR = storage.safeRead(KEY_DONE);
    if (doneR.ok && doneR.value)
      return false;
    const legacy = readLegacyAggregate();
    if (!legacy) {
      storage.set(KEY_DONE, 1);
      return false;
    }
    let migrated = 0;
    for (let i = 0; i < KEY_MAP.length; i++) {
      const [oldKey, newKey] = KEY_MAP[i];
      if (!(oldKey in legacy))
        continue;
      const value = legacy[oldKey];
      const existing = storage.safeRead(newKey);
      if (existing.ok && existing.value !== void 0)
        continue;
      storage.set(newKey, value);
      migrated++;
    }
    storage.set(KEY_DONE, 1);
    if (migrated > 0) {
      logger.info("[uni统计 2.0] migrated legacy keys", migrated);
    }
    return migrated > 0;
  }
  function selectChannel(opts) {
    var _a;
    const version = (_a = opts.version) !== null && _a !== void 0 ? _a : "image";
    const fallback = opts.fallbackToHttp !== false;
    if (version === "1") {
      if (opts.http && opts.http.available())
        return opts.http;
      return void 0;
    }
    if (version === "2") {
      if (opts.cloud && opts.cloud.available())
        return opts.cloud;
      if (!fallback) {
        logger.warn("[uni统计 2.0] 云函数上报不可用且已关闭 HTTP 兜底，本批已丢弃");
        return void 0;
      }
      if (opts.http && opts.http.available()) {
        logger.warn("[uni统计 2.0] 云函数上报不可用，已降级为 HTTP 上报");
        return opts.http;
      }
      logger.warn("[uni统计 2.0] 无可用上报线路");
      return void 0;
    }
    if (opts.image && opts.image.available())
      return opts.image;
    if (!fallback) {
      if (opts.image) {
        logger.warn("[uni统计 2.0] 统计上报线路不可用且已关闭 HTTP 兜底，本批已丢弃");
      }
      return void 0;
    }
    if (opts.http && opts.http.available()) {
      if (opts.image) {
        logger.warn("[uni统计 2.0] 统计上报线路不可用，已降级为 HTTP 上报");
      }
      return opts.http;
    }
    logger.warn("[uni统计 2.0] 无可用上报线路");
    return void 0;
  }
  const STORAGE_KEY$1 = "queue";
  const DEFAULT_SINGLE_EVENT_MAX_BYTES = SINGLE_EVENT_MAX_BYTES;
  const state = {
    bucket: {},
    lastFlushAt: 0
  };
  let intervalSec = REPORT_INTERVAL_SEC;
  let singleEventMaxBytes = DEFAULT_SINGLE_EVENT_MAX_BYTES;
  let maxEvents = QUEUE_MAX_EVENTS;
  let restored = false;
  let capacityWarned = false;
  function configure(opts) {
    if (typeof opts.intervalSec === "number" && opts.intervalSec >= 0) {
      intervalSec = Math.floor(opts.intervalSec);
    }
    if (typeof opts.singleEventMaxBytes === "number" && opts.singleEventMaxBytes > 0) {
      singleEventMaxBytes = Math.floor(opts.singleEventMaxBytes);
    }
    if (typeof opts.maxEvents === "number" && opts.maxEvents > 0) {
      maxEvents = Math.floor(opts.maxEvents);
    }
  }
  function enforceCapacity() {
    let total = size();
    if (total <= maxEvents) {
      capacityWarned = false;
      return;
    }
    const dropped = total - maxEvents;
    while (total > maxEvents) {
      let largestLt = "";
      let largestLen = 0;
      for (const lt of Object.keys(state.bucket)) {
        const len = state.bucket[lt].length;
        if (len > largestLen) {
          largestLen = len;
          largestLt = lt;
        }
      }
      if (!largestLt || largestLen === 0)
        break;
      state.bucket[largestLt].shift();
      if (state.bucket[largestLt].length === 0)
        delete state.bucket[largestLt];
      total--;
    }
    if (!capacityWarned) {
      capacityWarned = true;
      logger.warn("[uni统计 2.0] 上报队列超过容量上限，已丢弃最旧事件", "dropped=" + dropped, "limit=" + maxEvents);
    }
  }
  function persistBucket() {
    if (Object.keys(state.bucket).length === 0) {
      storage.remove(STORAGE_KEY$1);
      return;
    }
    try {
      storage.set(STORAGE_KEY$1, state.bucket);
    } catch (e) {
      logger.warn("[uni统计 2.0] queue persist failed", e);
    }
  }
  function restoreOnce() {
    if (restored)
      return;
    restored = true;
    const raw = storage.safeRead(STORAGE_KEY$1);
    if (!raw.ok || !raw.value || typeof raw.value !== "object")
      return;
    const persisted = raw.value;
    for (const lt of Object.keys(persisted)) {
      const arr = persisted[lt];
      if (!Array.isArray(arr) || arr.length === 0)
        continue;
      if (!state.bucket[lt])
        state.bucket[lt] = [];
      state.bucket[lt].push(...arr);
    }
  }
  function enqueue(data) {
    var _a;
    if (!data || typeof data !== "object")
      return;
    const lt = String((_a = data.lt) !== null && _a !== void 0 ? _a : "");
    if (!lt) {
      logger.warn("[uni统计 2.0] enqueue dropped: missing lt", data);
      return;
    }
    let serialized = "";
    try {
      serialized = JSON.stringify(data);
    } catch (e) {
      logger.warn("[uni统计 2.0] enqueue dropped: stringify failed", e);
      return;
    }
    if (serialized.length > singleEventMaxBytes) {
      logger.warn("[uni统计 2.0] enqueue dropped: single event too large", "lt=" + lt, "bytes=" + serialized.length, "limit=" + singleEventMaxBytes);
      return;
    }
    restoreOnce();
    if (!state.bucket[lt])
      state.bucket[lt] = [];
    state.bucket[lt].push(data);
    enforceCapacity();
    persistBucket();
  }
  function shouldFlush(force = false) {
    if (force)
      return true;
    if (intervalSec <= 0)
      return true;
    const elapsedSec = (nowMs() - state.lastFlushAt) / 1e3;
    return elapsedSec >= intervalSec;
  }
  function flush() {
    restoreOnce();
    const lts = Object.keys(state.bucket);
    if (lts.length === 0)
      return void 0;
    const snapshot = state.bucket;
    state.bucket = {};
    state.lastFlushAt = nowMs();
    storage.remove(STORAGE_KEY$1);
    return snapshot;
  }
  function rollback(snapshot) {
    if (!snapshot)
      return;
    for (const lt of Object.keys(snapshot)) {
      const arr = snapshot[lt];
      if (!Array.isArray(arr) || arr.length === 0)
        continue;
      if (!state.bucket[lt])
        state.bucket[lt] = [];
      state.bucket[lt] = arr.concat(state.bucket[lt]);
    }
    enforceCapacity();
    persistBucket();
  }
  function size() {
    let n2 = 0;
    for (const lt of Object.keys(state.bucket)) {
      n2 += state.bucket[lt].length;
    }
    return n2;
  }
  const STORAGE_KEY = "retry:queue";
  const DEFAULT_MAX_ITEMS = 50;
  const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
  const DEFAULT_MAX_ATTEMPTS = RETRY_MAX_ATTEMPTS;
  const config = {
    maxItems: DEFAULT_MAX_ITEMS,
    maxAgeMs: DEFAULT_MAX_AGE_MS,
    maxAttempts: DEFAULT_MAX_ATTEMPTS
  };
  function readQueue() {
    const raw = storage.safeRead(STORAGE_KEY);
    if (!raw.ok || !Array.isArray(raw.value))
      return [];
    return raw.value.filter((it) => it && typeof it.id === "string" && it.payload && typeof it.payload === "object");
  }
  function writeQueue(items) {
    if (items.length === 0) {
      storage.remove(STORAGE_KEY);
      return;
    }
    storage.set(STORAGE_KEY, items);
  }
  function genId(payload) {
    if (payload._id)
      return payload._id;
    return "r-" + nowMs().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function persist(payload) {
    if (!payload)
      return void 0;
    const id = genId(payload);
    const items = readQueue();
    if (items.some((it) => it.id === id)) {
      return id;
    }
    const item = {
      id,
      payload: Object.assign({}, payload, { _id: id }),
      createdAt: nowMs(),
      attempts: 0
    };
    items.push(item);
    while (items.length > config.maxItems) {
      const dropped = items.shift();
      logger.warn("[uni统计 2.0] retry queue overflow, drop oldest", dropped === null || dropped === void 0 ? void 0 : dropped.id);
    }
    writeQueue(items);
    return id;
  }
  function loadAll() {
    const items = readQueue();
    if (items.length === 0)
      return [];
    const cutoff = nowMs() - config.maxAgeMs;
    const alive = [];
    for (const it of items) {
      if (it.createdAt < cutoff) {
        logger.warn("[uni统计 2.0] retry item expired, drop", it.id);
        continue;
      }
      alive.push(it);
    }
    if (alive.length !== items.length)
      writeQueue(alive);
    return alive.map((it) => it.payload);
  }
  function ack(id) {
    if (!id)
      return;
    const items = readQueue();
    const next = items.filter((it) => it.id !== id);
    if (next.length === items.length)
      return;
    writeQueue(next);
  }
  function markAttempt(id) {
    if (!id)
      return;
    const items = readQueue();
    let nextItems = null;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.id !== id)
        continue;
      it.attempts++;
      if (it.attempts >= config.maxAttempts) {
        logger.warn("[uni统计 2.0] retry item exceeded maxAttempts, drop as dead letter", id, "attempts=" + it.attempts);
        nextItems = items.slice(0, i).concat(items.slice(i + 1));
      } else {
        nextItems = items;
      }
      break;
    }
    if (nextItems)
      writeQueue(nextItems);
  }
  let instance = null;
  class StatApp {
    constructor() {
      this.installed = false;
      this.statVersion = "image";
    }
    static getInstance() {
      if (!instance)
        instance = new StatApp();
      return instance;
    }
    /**
     * 一次性装配。重复调用直接返回。
     *
     * @param config 业务配置；缺省值兼容私有版默认行为。
     * @param overrides 测试钩子。
     */
    install(config2 = {}, overrides = {}) {
      var _a, _b, _c, _d, _e;
      if (this.installed)
        return;
      const cfg = this.normalizeConfig(config2);
      this.config = cfg;
      this.statVersion = cfg.version;
      tryRun(() => configure$1({
        backgroundTimeoutSec: cfg.backgroundTimeoutSec,
        pageInactiveTimeoutSec: cfg.pageInactiveTimeoutSec
      }), void 0);
      tryRun(() => configure({ intervalSec: cfg.reportIntervalSec }), void 0);
      if (!overrides.skipMigration) {
        tryRun(() => migrateLegacyData(), false);
      }
      tryRun(() => loadVisitSnapshot(), void 0);
      this.httpChannel = (_b = (_a = overrides.channels) === null || _a === void 0 ? void 0 : _a.http) !== null && _b !== void 0 ? _b : createHttpChannel({ ut: getPlatform(), maxRetries: HTTP_MAX_RETRIES });
      if (overrides.channels && "cloud" in overrides.channels) {
        this.cloudChannel = (_c = overrides.channels.cloud) !== null && _c !== void 0 ? _c : void 0;
      } else if (this.statVersion === "2") {
        this.cloudChannel = createCloudChannel({ maxRetries: CLOUD_MAX_RETRIES });
      } else {
        this.cloudChannel = void 0;
      }
      if (overrides.channels && "image" in overrides.channels) {
        this.imageChannel = (_d = overrides.channels.image) !== null && _d !== void 0 ? _d : void 0;
      } else if (this.statVersion === "image") {
        this.imageChannel = createImageChannel({
          host: IMAGE_REPORT_DEFAULTS.host,
          projectId: IMAGE_REPORT_DEFAULTS.projectId,
          topicId: IMAGE_REPORT_DEFAULTS.topicId,
          maxRetries: IMAGE_MAX_RETRIES,
          ut: getPlatform(),
          rawPlatform: getRawPlatform()
        });
      } else {
        this.imageChannel = void 0;
      }
      this.collectorDeps = this.buildCollectorDeps(cfg, (_e = overrides.collectorDepsPatch) !== null && _e !== void 0 ? _e : {});
      this.collector = createCollector(this.collectorDeps);
      if (!overrides.skipInterceptors) {
        const c = this.collector;
        this.uninstallInterceptors = tryRun(() => installAllInterceptors({ report: (i) => c.report(i) }), void 0);
      }
      if (!overrides.skipRecoverRetry) {
        void this.collector.recoverRetry().catch((e) => logger.warn("[uni统计 2.0] recoverRetry failed", e));
      }
      this.installed = true;
    }
    /**
     * 业务侧 `uni.report(type, value)` 入口。
     *
     * 兼容私有版语义：
     *   - `type === 'title'` → 写 reportTitle，不发事件；下次 lt=11 / lt=3 携带 `ttc`。
     *   - 其他 type → 自定义事件 lt=21，custom `{ e_n: type, e_v: value }`。
     */
    report(type, value) {
      if (!this.installed || !this.collector)
        return;
      if (type === "title") {
        setReportTitle(value);
        return;
      }
      const ev = typeof value === "object" && value !== null ? tryRun(() => JSON.stringify(value), "") : value === void 0 ? "" : String(value);
      this.collector.report({
        lt: LT.Event,
        custom: { e_n: type, e_v: ev }
      });
    }
    /** 上报 onError 捕获的错误。 */
    reportError(err) {
      var _a;
      if (!this.installed || !this.collector)
        return;
      const errMsg = err instanceof Error ? `${err.name}: ${err.message}
${(_a = err.stack) !== null && _a !== void 0 ? _a : ""}` : typeof err === "string" ? err : tryRun(() => JSON.stringify(err), "");
      this.collector.report({ lt: LT.Error, errMsg });
    }
    /** 取 collector，供 lifecycleHooks 调度生命周期事件。 */
    getCollector() {
      return this.collector;
    }
    /** 取 deps（测试用）。 */
    getDeps() {
      return this.collectorDeps;
    }
    /** 是否已 install。 */
    isInstalled() {
      return this.installed;
    }
    /** 当前协议版本。 */
    getStatVersion() {
      return this.statVersion;
    }
    /** 当前生效配置（含默认值合并），测试用。 */
    getConfig() {
      return this.config;
    }
    /**
     * 卸载（测试 / hot reload）。
     *
     * 解绑全部拦截器、清空内部句柄。**不**清外部模块（queue/visit/session）状态，
     * 那些由各自的 `__reset*` 在测试 setup 中处理。
     */
    uninstall() {
      if (this.uninstallInterceptors) {
        tryRun(() => this.uninstallInterceptors(), void 0);
      }
      this.uninstallInterceptors = void 0;
      if (this.collector) {
        tryRun(() => this.collector.destroy(), void 0);
      }
      this.collector = void 0;
      this.collectorDeps = void 0;
      this.httpChannel = void 0;
      this.cloudChannel = void 0;
      this.imageChannel = void 0;
      this.config = void 0;
      this.installed = false;
    }
    normalizeConfig(c) {
      var _a, _b, _c, _d, _e;
      return {
        ak: (_a = c.ak) !== null && _a !== void 0 ? _a : getAppId$1(),
        v: c.v,
        ch: (_b = c.ch) !== null && _b !== void 0 ? _b : "",
        version: (_c = c.version) !== null && _c !== void 0 ? _c : "image",
        backgroundTimeoutSec: (_d = c.backgroundTimeoutSec) !== null && _d !== void 0 ? _d : 300,
        pageInactiveTimeoutSec: (_e = c.pageInactiveTimeoutSec) !== null && _e !== void 0 ? _e : 1800,
        reportIntervalSec: typeof c.reportIntervalSec === "number" ? c.reportIntervalSec : REPORT_INTERVAL_SEC,
        // collectItems 默认值与私有版严格对齐：push 默认关闭、页面日志默认开启
        enablePush: c.enablePush === true,
        enablePageLog: c.enablePageLog !== false
      };
    }
    /**
     * 构建 collector 依赖。所有 adapter 调用都包了 `tryRun`，避免单端缺失 API 导致
     * install 失败。
     */
    buildCollectorDeps(cfg, patch) {
      const platformShort = getPlatform();
      const builder = createStatDataBuilder({
        config: { ak: cfg.ak, usv: STAT_VERSION_PUBLIC, v: cfg.v, ch: cfg.ch },
        platform: {
          ut: platformShort
        },
        system: tryRun(() => getSystemInfo(), {
          brand: "",
          md: "",
          sv: "",
          v: "",
          ut: "unknown",
          appVersion: "",
          appWgtVersion: "",
          mpvHostVersion: "",
          on: "",
          sdkVersion: "",
          statusBarHeight: 0,
          osP: ""
        }),
        locale: tryRun(() => getLocaleAndScreen(), {
          lang: "",
          ww: 0,
          wh: 0,
          sw: 0,
          sh: 0,
          pr: 1
        }),
        device: {
          // 惰性解析：每次 build 时再调 getUuid()，避免 install 过早（uni 运行时未就绪）冻结临时值。
          get uuid() {
            return tryRun(() => getUuid(), "");
          }
        },
        net: { net: "unknown", raw: "" },
        location: { lat: "", lng: "", ok: false },
        pkg: tryRun(() => getPackageInfo(), {
          mpn: "",
          tdaid: "",
          pkn: "",
          an: ""
        }),
        web: tryRun(() => getWebInfo(), { domain: "" })
      });
      const base = {
        builder,
        queue: {
          enqueue,
          flush,
          rollback,
          shouldFlush
        },
        serializer: { handleData },
        selectChannel: () => selectChannel({
          version: this.statVersion,
          http: this.httpChannel,
          cloud: this.cloudChannel,
          image: this.imageChannel
        }),
        retry: {
          persist,
          loadAll,
          ack,
          markAttempt
        },
        visit: {
          commitVisitOnAck,
          rollbackPendingVisit
        },
        session: {
          getSnapshot,
          nextSeq,
          touch
        },
        config: { usv: STAT_VERSION_PUBLIC },
        nowMs,
        nowSec,
        firstFlushDeferMs: getRawPlatform() === "mp-weixin" && MP_WEIXIN_USE_PRELOAD_ASSETS_REPORT ? MP_WEIXIN_PRELOAD_FIRST_FLUSH_DELAY_MS : 0
      };
      return Object.assign(base, patch);
    }
  }
  function getStatApp() {
    return StatApp.getInstance();
  }
  function parseInjectedUniStatistics() {
    const raw = "{}";
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "undefined")
      return void 0;
    try {
      const obj = JSON.parse(trimmed);
      if (!obj || typeof obj !== "object" || Array.isArray(obj))
        return void 0;
      return obj;
    } catch (_e) {
      return void 0;
    }
  }
  function readManifestStatConfig() {
    try {
      const obj = parseInjectedUniStatistics();
      if (!obj)
        return void 0;
      const cfg = {};
      if (obj.channelVersion != null) {
        const v = String(obj.channelVersion);
        if (v === "1" || v === "2" || v === "image")
          cfg.version = v;
      }
      const bg = pickPositiveNumber(obj.backgroundTimeout, obj.backgroundTimeoutSec);
      if (bg !== void 0)
        cfg.backgroundTimeoutSec = bg;
      const pi = pickPositiveNumber(obj.pageInactiveTimeout, obj.pageInactiveTimeoutSec);
      if (pi !== void 0)
        cfg.pageInactiveTimeoutSec = pi;
      const ri = pickNonNegativeNumber(obj.reportInterval, obj.reportIntervalSec);
      if (ri !== void 0)
        cfg.reportIntervalSec = ri;
      if (obj.collectItems && typeof obj.collectItems === "object") {
        const items = obj.collectItems;
        if (typeof items.uniPushClientID === "boolean") {
          cfg.enablePush = items.uniPushClientID;
        }
        if (typeof items.uniStatPageLog === "boolean") {
          cfg.enablePageLog = items.uniStatPageLog;
        }
      }
      if (typeof obj.ak === "string" && obj.ak)
        cfg.ak = obj.ak;
      if (typeof obj.v === "string")
        cfg.v = obj.v;
      if (typeof obj.ch === "string")
        cfg.ch = obj.ch;
      return Object.keys(cfg).length > 0 ? cfg : void 0;
    } catch (e) {
      logger.warn("[uni统计 2.0] readManifestStatConfig failed", e);
      return void 0;
    }
  }
  function normalizePositiveNumber(value) {
    if (typeof value === "number") {
      return value > 0 ? value : void 0;
    }
    if (typeof value === "string") {
      const t = value.trim();
      if (t === "")
        return void 0;
      const n2 = Number(t);
      if (Number.isFinite(n2) && n2 > 0)
        return n2;
    }
    return void 0;
  }
  function normalizeNonNegativeNumber(value) {
    if (typeof value === "number") {
      return value >= 0 ? value : void 0;
    }
    if (typeof value === "string") {
      const t = value.trim();
      if (t === "")
        return void 0;
      const n2 = Number(t);
      if (Number.isFinite(n2) && n2 >= 0)
        return n2;
    }
    return void 0;
  }
  function pickPositiveNumber(...candidates) {
    for (const c of candidates) {
      const n2 = normalizePositiveNumber(c);
      if (n2 !== void 0)
        return n2;
    }
    return void 0;
  }
  function pickNonNegativeNumber(...candidates) {
    for (const c of candidates) {
      const n2 = normalizeNonNegativeNumber(c);
      if (n2 !== void 0)
        return n2;
    }
    return void 0;
  }
  function getUni() {
    const u = resolveUniRuntime();
    return u != null && typeof u === "object" ? u : void 0;
  }
  const UNI_HOOK_RETRY_MAX = 20;
  const UNI_HOOK_RETRY_MS = 50;
  let vueMixinMounted = false;
  let vueMixinRetryTimer;
  let bootstrapped = false;
  let uniHookRetryTimer;
  function installPublicStat(opts = {}) {
    if (bootstrapped)
      return;
    bootstrapped = true;
    const fromManifest = readManifestStatConfig();
    const finalConfig = Object.assign({}, fromManifest, opts.config);
    const app = getStatApp();
    tryRun(() => app.install(finalConfig, opts.overrides), void 0);
    tryRun(() => {
      var _a, _b, _c;
      const cfgBoot = app.getConfig();
      const appName = "qizha";
      const injected = parseInjectedUniStatistics();
      const bootBase = {
        channel: (_a = cfgBoot === null || cfgBoot === void 0 ? void 0 : cfgBoot.version) !== null && _a !== void 0 ? _a : "image",
        reportIntervalSec: (_b = cfgBoot === null || cfgBoot === void 0 ? void 0 : cfgBoot.reportIntervalSec) !== null && _b !== void 0 ? _b : 0,
        ak: (_c = cfgBoot === null || cfgBoot === void 0 ? void 0 : cfgBoot.ak) !== null && _c !== void 0 ? _c : "",
        appName,
        debugFromManifest: "false" === true
      };
      if (injected != null) {
        if (injected.backgroundTimeout != null || injected.backgroundTimeoutSec != null) {
          bootBase.backgroundTimeoutSec = cfgBoot === null || cfgBoot === void 0 ? void 0 : cfgBoot.backgroundTimeoutSec;
        }
        if (injected.pageInactiveTimeout != null || injected.pageInactiveTimeoutSec != null) {
          bootBase.pageInactiveTimeoutSec = cfgBoot === null || cfgBoot === void 0 ? void 0 : cfgBoot.pageInactiveTimeoutSec;
        }
      }
      logBoot(Object.assign({}, bootBase, { vueMode: "Vue3" }));
    }, void 0);
    const finishLifecycleInstall = () => {
      var _a, _b;
      const cfg = app.getConfig();
      const lifecycleOpts = Object.assign({}, {
        enablePush: (_a = cfg === null || cfg === void 0 ? void 0 : cfg.enablePush) !== null && _a !== void 0 ? _a : false,
        enablePageLog: (_b = cfg === null || cfg === void 0 ? void 0 : cfg.enablePageLog) !== null && _b !== void 0 ? _b : true
      }, opts.lifecycle);
      const { mixin, unbind } = bindLifecycle(app, lifecycleOpts);
      if (!opts.skipVueMixin) {
        tryRun(() => mountVueMixin(mixin), void 0);
      }
      if (!opts.skipUniReport) {
        tryRun(() => mountUniReport(app), void 0);
      }
      if (shouldBindUniAppLifecycle() && !tryBindUniAppLifecycle(app, lifecycleOpts)) {
        scheduleUniAppHookRetry(() => tryBindUniAppLifecycle(app, lifecycleOpts));
      }
    };
    finishLifecycleInstall();
  }
  function scheduleUniAppHookRetry(tryBind) {
    if (uniHookRetryTimer) {
      clearTimeout(uniHookRetryTimer);
      uniHookRetryTimer = void 0;
    }
    let attempts = 0;
    const tick = () => {
      if (tryBind())
        return;
      if (++attempts >= UNI_HOOK_RETRY_MAX) {
        logger.warn("[uni统计 2.0] Vue3 小程序：uni.onAppShow 暂不可用，应用前后台统计可能缺失");
        return;
      }
      uniHookRetryTimer = setTimeout(tick, UNI_HOOK_RETRY_MS);
    };
    uniHookRetryTimer = setTimeout(tick, UNI_HOOK_RETRY_MS);
  }
  function tryRegisterVueAppMixin(mixin) {
    try {
      ;
      uni.onCreateVueApp((vueApp) => {
        tryRun(() => vueApp.mixin(mixin), void 0);
      });
      return true;
    } catch (_e) {
    }
    const u = getUni();
    if (u && typeof u.onCreateVueApp === "function") {
      u.onCreateVueApp((vueApp) => {
        tryRun(() => vueApp.mixin(mixin), void 0);
      });
      return true;
    }
    return false;
  }
  function mountVueMixin(mixin) {
    if (vueMixinMounted)
      return;
    if (tryRegisterVueAppMixin(mixin)) {
      vueMixinMounted = true;
      return;
    }
    scheduleVueAppMixinRetry(mixin);
  }
  function scheduleVueAppMixinRetry(mixin) {
    if (vueMixinMounted)
      return;
    if (vueMixinRetryTimer)
      return;
    let attempts = 0;
    const tick = () => {
      vueMixinRetryTimer = void 0;
      if (vueMixinMounted)
        return;
      if (tryRegisterVueAppMixin(mixin)) {
        vueMixinMounted = true;
        return;
      }
      if (++attempts >= UNI_HOOK_RETRY_MAX) {
        if (!vueMixinMounted) {
          logger.warn("[uni统计 2.0] Vue3: onCreateVueApp 在重试后仍不可用，页面级 mixin 未注入");
        }
        return;
      }
      vueMixinRetryTimer = setTimeout(tick, UNI_HOOK_RETRY_MS);
    };
    vueMixinRetryTimer = setTimeout(tick, UNI_HOOK_RETRY_MS);
  }
  function mountUniReport(app) {
    var _a;
    const g = getGlobalObject();
    const u = (_a = getUni()) !== null && _a !== void 0 ? _a : g.uni;
    if (!u || typeof u !== "object")
      return;
    u.report = (type, value) => {
      app.report(type, value);
    };
  }
  installPublicStat();
  function createApp() {
    const app = vue.createVueApp(App);
    const pinia = createPinia();
    app.use(pinia);
    return {
      app,
      pinia
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
