let bgVideo;
let exitVideo;
let bgVideoReady = false;
let exitVideoReady = false;

let figures = [];
let activeFigure = null;

// ===== 設計基準尺寸 =====
const DESIGN_W = 1280;
const DESIGN_H = 720;

// ===== 響應式設定 =====
// "contain" = 完整顯示 16:9 畫面，可能留黑
// "cover"   = 滿版鋪滿容器，可能裁切
const SCALE_MODE = "contain";

// 手機斷點
const MOBILE_BREAKPOINT = 768;

// ===== 實際顯示縮放 =====
let viewScale = 1;
let offsetX = 0;
let offsetY = 0;

// ===== 狀態機 =====
const APP_STATE = {
  IDLE: "idle",
  WINTER_SELECTED: "winterSelected",
  COLLAPSING: "collapsing",
  REVEALING: "revealing",
  DONE: "done",
};

let appState = APP_STATE.IDLE;
let stateStartTime = 0;
let collapseStartTime = 0;
let revealDuration = 1400;
let webflowRevealTriggered = false;

// ===== 影片路徑 =====
const BG_VIDEO_URL = "https://winteeeryan.github.io/entry/assets/entry.mp4";
const EXIT_VIDEO_URL = "https://winteeeryan.github.io/entry/assets/exit.mp4";

// Exit 視頻實際時長（毫秒）
let exitDurationMs = 4000;

// ===== 桌機配置（1280x720 基準） =====
const FIGURE_CONFIG_DESKTOP = [
  {
    name: "Researcher",
    figureFile: "https://winteeeryan.github.io/entry/assets/researcher.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/researcherframe.png",
    frameX: 35,
    frameY: 360,
    frameH: 330,
    innerOffsetX: 24,
    innerOffsetY: 30,
    innerW: 85,
    innerH: 320,
  },
  {
    name: "Observer",
    figureFile: "https://winteeeryan.github.io/entry/assets/observer.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/observerframe.png",
    frameX: 225,
    frameY: 320,
    frameH: 260,
    innerOffsetX: 18,
    innerOffsetY: 38,
    innerW: 70,
    innerH: 190,
  },
  {
    name: "Winter",
    figureFile: "https://winteeeryan.github.io/entry/assets/self_person.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/selfframe.png",
    frameX: 520,
    frameY: 300,
    frameH: 355,
    innerOffsetX: 16,
    innerOffsetY: 48,
    innerW: 95,
    innerH: 300,
  },
  {
    name: "Designer",
    figureFile: "https://winteeeryan.github.io/entry/assets/designer.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/designerframe.png",
    frameX: 785,
    frameY: 415,
    frameH: 300,
    innerOffsetX: 16,
    innerOffsetY: 50,
    innerW: 90,
    innerH: 250,
  },
  {
    name: "Reader",
    figureFile: "https://winteeeryan.github.io/entry/assets/reader.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/readerframe.png",
    frameX: 1070,
    frameY: 380,
    frameH: 335,
    innerOffsetX: 20,
    innerOffsetY: 40,
    innerW: 95,
    innerH: 255,
  },
];

// ===== 手機配置（仍然用 1280x720 座標系，但重新排版） =====
const FIGURE_CONFIG_MOBILE = [
  {
    name: "Researcher",
    figureFile: "https://winteeeryan.github.io/entry/assets/researcher.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/researcherframe.png",
    frameX: 80,
    frameY: 360,
    frameH: 250,
    innerOffsetX: 18,
    innerOffsetY: 28,
    innerW: 70,
    innerH: 220,
  },
  {
    name: "Observer",
    figureFile: "https://winteeeryan.github.io/entry/assets/observer.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/observerframe.png",
    frameX: 290,
    frameY: 300,
    frameH: 220,
    innerOffsetX: 16,
    innerOffsetY: 30,
    innerW: 65,
    innerH: 165,
  },
  {
    name: "Winter",
    figureFile: "https://winteeeryan.github.io/entry/assets/self_person.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/selfframe.png",
    frameX: 520,
    frameY: 220,
    frameH: 360,
    innerOffsetX: 16,
    innerOffsetY: 48,
    innerW: 95,
    innerH: 300,
  },
  {
    name: "Designer",
    figureFile: "https://winteeeryan.github.io/entry/assets/designer.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/designerframe.png",
    frameX: 820,
    frameY: 330,
    frameH: 240,
    innerOffsetX: 16,
    innerOffsetY: 40,
    innerW: 78,
    innerH: 200,
  },
  {
    name: "Reader",
    figureFile: "https://winteeeryan.github.io/entry/assets/reader.png",
    frameFile: "https://winteeeryan.github.io/entry/assets/readerframe.png",
    frameX: 1030,
    frameY: 355,
    frameH: 255,
    innerOffsetX: 18,
    innerOffsetY: 35,
    innerW: 78,
    innerH: 205,
  },
];

function isMobileView() {
  return width < MOBILE_BREAKPOINT;
}

function getFigureConfigs() {
  return isMobileView() ? FIGURE_CONFIG_MOBILE : FIGURE_CONFIG_DESKTOP;
}

function preload() {
  const merged = [...FIGURE_CONFIG_DESKTOP, ...FIGURE_CONFIG_MOBILE];
  const loaded = new Set();

  for (const cfg of merged) {
    if (!loaded.has(cfg.figureFile)) {
      cfg.figureImg = loadImage(cfg.figureFile);
      loaded.add(cfg.figureFile);
    }
    if (!loaded.has(cfg.frameFile)) {
      cfg.frameImg = loadImage(cfg.frameFile);
      loaded.add(cfg.frameFile);
    }
  }

  // 把 desktop 已載好的圖片同步給 mobile 配置
  syncConfigAssets();
}

function syncConfigAssets() {
  const assetMap = new Map();

  for (const cfg of FIGURE_CONFIG_DESKTOP) {
    assetMap.set(cfg.figureFile, cfg.figureImg);
    assetMap.set(cfg.frameFile, cfg.frameImg);
  }

  for (const cfg of FIGURE_CONFIG_MOBILE) {
    cfg.figureImg = assetMap.get(cfg.figureFile) || loadImage(cfg.figureFile);
    cfg.frameImg = assetMap.get(cfg.frameFile) || loadImage(cfg.frameFile);
  }
}

function setup() {
  const { cw, ch } = getMountSize();
  const cnv = createCanvas(cw, ch);

  const mountEl = document.getElementById("winter-entry-p5");
  if (mountEl) {
    cnv.parent("winter-entry-p5");
  } else {
    cnv.parent(document.body);
  }

  pixelDensity(1);
  updateViewTransform();

  setupVideos();
  rebuildFigures();

  window.addEventListener("pointerdown", unlockVideos, { passive: true });
  window.addEventListener("touchstart", unlockVideos, { passive: true });
}

function getMountSize() {
  const mountEl = document.getElementById("p5-entry");
  const cw = mountEl ? mountEl.clientWidth || windowWidth : windowWidth;
  const ch = mountEl ? mountEl.clientHeight || windowHeight : windowHeight;
  return { cw, ch };
}

function rebuildFigures() {
  const prevByName = new Map();
  for (const fig of figures) {
    prevByName.set(fig.name, fig);
  }

  const newFigures = [];
  const configs = getFigureConfigs();

  for (const cfg of configs) {
    const fig = new Figure(cfg);

    // 保留當前狀態，避免 resize 時整個動畫跳掉
    const old = prevByName.get(cfg.name);
    if (old) {
      fig.hovered = old.hovered;
      fig.dragging = old.dragging;
      fig.returning = old.returning;
      fig.dragOffsetX = old.dragOffsetX;
      fig.dragOffsetY = old.dragOffsetY;
      fig.glitchStrength = old.glitchStrength;
      fig.shadowStrength = old.shadowStrength;
      fig.frameStrength = old.frameStrength;

      if (old.dragging || old.returning) {
        fig.x = old.x;
        fig.y = old.y;
      }
    }

    if (activeFigure && activeFigure.name === fig.name) {
      activeFigure = fig;
    }

    newFigures.push(fig);
  }

  figures = newFigures;
}

function setupVideos() {
  bgVideo = createVideo([BG_VIDEO_URL]);
  configureVideo(bgVideo, {
    loop: true,
    onReady: () => {
      bgVideoReady = true;
      tryPlayVideo(bgVideo, true);
    },
  });

  exitVideo = createVideo([EXIT_VIDEO_URL]);
  configureVideo(exitVideo, {
    loop: false,
    onReady: () => {
      exitVideoReady = true;
      const d = exitVideo.elt.duration;
      if (isFinite(d) && d > 0) {
        exitDurationMs = d * 1000;
      }
    },
    onEnded: () => {
      if (appState === APP_STATE.COLLAPSING) {
        appState = APP_STATE.REVEALING;
        stateStartTime = millis();
      }
    },
  });
}

function configureVideo(video, { loop = false, onReady, onEnded } = {}) {
  video.size(DESIGN_W, DESIGN_H);
  video.volume(0);
  video.hide();

  const el = video.elt;
  el.muted = true;
  el.defaultMuted = true;
  el.playsInline = true;
  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
  el.setAttribute("preload", "auto");
  el.setAttribute("crossorigin", "anonymous");

  if (loop) {
    el.loop = true;
    el.setAttribute("loop", "");
  }

  const markReady = () => {
    if (typeof onReady === "function") onReady();
  };

  el.addEventListener("loadeddata", markReady, { once: true });
  el.addEventListener("canplay", markReady, { once: true });

  if (typeof onEnded === "function") {
    el.addEventListener("ended", onEnded);
  }

  el.addEventListener("error", () => {
    console.error("Video load error:", el.currentSrc || el.src);
  });
}

function tryPlayVideo(video, shouldLoop = false) {
  if (!video || !video.elt) return;

  const el = video.elt;
  el.muted = true;
  el.playsInline = true;

  const p = el.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      if (shouldLoop) el.loop = true;
    }).catch((err) => {
      console.warn("Video autoplay failed:", err);
    });
  }
}

function unlockVideos() {
  if (bgVideo && bgVideoReady) {
    tryPlayVideo(bgVideo, true);
  }
}

function windowResized() {
  const prevMobile = isMobileView();
  const { cw, ch } = getMountSize();

  resizeCanvas(cw, ch);
  updateViewTransform();

  const nextMobile = isMobileView();
  if (prevMobile !== nextMobile) {
    rebuildFigures();
  } else {
    // 同裝置模式下也更新定位
    for (const fig of figures) {
      fig.applyConfig(getConfigByName(fig.name));
    }
  }
}

function updateViewTransform() {
  if (SCALE_MODE === "cover") {
    viewScale = max(width / DESIGN_W, height / DESIGN_H);
  } else {
    viewScale = min(width / DESIGN_W, height / DESIGN_H);
  }

  offsetX = (width - DESIGN_W * viewScale) * 0.5;
  offsetY = (height - DESIGN_H * viewScale) * 0.5;
}

function getConfigByName(name) {
  return getFigureConfigs().find((cfg) => cfg.name === name);
}

function draw() {
  updateAppState();
  background(0);

  push();
  translate(offsetX, offsetY);
  scale(viewScale);

  drawBackgroundVideo();

  for (const fig of figures) {
    fig.updateFigurePlacement();
    fig.updateReturn();
    fig.hovered = false;
  }

  const mx = toDesignMouseX();
  const my = toDesignMouseY();

  if (appState === APP_STATE.IDLE || appState === APP_STATE.WINTER_SELECTED) {
    for (let i = figures.length - 1; i >= 0; i--) {
      const fig = figures[i];
      if (fig.dragging || fig.hitTest(mx, my)) {
        fig.hovered = true;
        break;
      }
    }
  } else if (activeFigure) {
    activeFigure.hovered = true;
  }

  for (const fig of figures) {
    fig.updateEffects();
  }

  for (const fig of figures) {
    fig.drawShadow();
  }

  for (const fig of figures) {
    fig.drawFrame();
  }

  for (const fig of figures) {
    if (fig !== activeFigure) {
      fig.drawFigure();
    }
  }

  if (activeFigure) {
    activeFigure.drawFigure();
  }

  if (appState === APP_STATE.REVEALING) {
    drawRevealDoorFade();
  }

  pop();

  if (appState === APP_STATE.DONE && !webflowRevealTriggered) {
  webflowRevealTriggered = true;
  document.body.classList.add("entry-done");

  const overlay = document.getElementById("opening-overlay");
  if (overlay) {
    setTimeout(() => {
      overlay.remove();
    }, 900);
  }
}

    const overlay = document.getElementById("opening-overlay");
    if (overlay) {
      overlay.classList.add("is-hidden");
    }
  }

function updateAppState() {
  if (appState === APP_STATE.COLLAPSING) {
    if (exitVideo && exitVideo.elt && exitVideoReady) {
      const dur = exitVideo.elt.duration;
      const cur = exitVideo.elt.currentTime;

      if (isFinite(dur) && dur > 0 && cur >= dur - 0.03) {
        appState = APP_STATE.REVEALING;
        stateStartTime = millis();
        exitVideo.pause();
      } else {
        const elapsed = millis() - collapseStartTime;
        if (elapsed >= exitDurationMs) {
          appState = APP_STATE.REVEALING;
          stateStartTime = millis();
          exitVideo.pause();
        }
      }
    }
  }

  if (appState === APP_STATE.REVEALING) {
    const elapsed = millis() - stateStartTime;
    if (elapsed >= revealDuration) {
      appState = APP_STATE.DONE;
    }
  }
}

function drawBackgroundVideo() {
  if (appState === APP_STATE.COLLAPSING) {
    if (exitVideoReady) {
      image(exitVideo, 0, 0, DESIGN_W, DESIGN_H);
    } else {
      background(0);
    }

    let t = 0;
    if (
      exitVideo &&
      exitVideo.elt &&
      isFinite(exitVideo.elt.duration) &&
      exitVideo.elt.duration > 0
    ) {
      t = constrain(exitVideo.elt.currentTime / exitVideo.elt.duration, 0, 1);
    } else {
      t = constrain((millis() - collapseStartTime) / exitDurationMs, 0, 1);
    }

    noStroke();
    fill(0, 120 * pow(t, 1.3));
    rect(0, 0, DESIGN_W, DESIGN_H);
    return;
  }

  if (appState === APP_STATE.REVEALING || appState === APP_STATE.DONE) {
    background(0);
    return;
  }

  if (bgVideoReady) {
    image(bgVideo, 0, 0, DESIGN_W, DESIGN_H);
  } else {
    background(0);
  }
}

function drawRevealDoorFade() {
  const t = constrain((millis() - stateStartTime) / revealDuration, 0, 1);
  noStroke();
  fill(0, 190 * t);
  rect(0, 0, DESIGN_W, DESIGN_H);
}

function getFigureAlpha(fig) {
  if (appState === APP_STATE.IDLE) return 1;

  if (
    appState === APP_STATE.WINTER_SELECTED ||
    appState === APP_STATE.COLLAPSING
  ) {
    if (fig.name === "Winter") return 1;
    const t = constrain((millis() - stateStartTime) / 900, 0, 1);
    return 1 - t;
  }

  if (appState === APP_STATE.REVEALING) {
    return fig.name === "Winter" ? 1 : 0;
  }

  if (appState === APP_STATE.DONE) {
    return 0;
  }

  return 1;
}

function getWinterCollapseAlpha() {
  if (appState !== APP_STATE.COLLAPSING && appState !== APP_STATE.REVEALING)
    return 1;

  if (appState === APP_STATE.COLLAPSING) {
    let t = 0;
    if (
      exitVideo &&
      exitVideo.elt &&
      isFinite(exitVideo.elt.duration) &&
      exitVideo.elt.duration > 0
    ) {
      t = constrain(exitVideo.elt.currentTime / exitVideo.elt.duration, 0, 1);
    } else {
      t = constrain((millis() - collapseStartTime) / exitDurationMs, 0, 1);
    }
    return 1 - t;
  }

  return 0;
}

function getWinterFrameDoorAlpha(fig) {
  if (fig.name !== "Winter") return 1;
  if (appState === APP_STATE.COLLAPSING) return 1;

  if (appState === APP_STATE.REVEALING) {
    const t = constrain((millis() - stateStartTime) / revealDuration, 0, 1);
    return 1 - t;
  }

  if (appState === APP_STATE.DONE) return 0;
  return 1;
}

function toDesignMouseX() {
  return (mouseX - offsetX) / viewScale;
}

function toDesignMouseY() {
  return (mouseY - offsetY) / viewScale;
}

function ensureBgVideoPlaying() {
  if (!bgVideo || !bgVideoReady || !bgVideo.elt) return;

  const v = bgVideo.elt;
  if (v.paused || v.currentTime === 0) {
    tryPlayVideo(bgVideo, true);
  }
}

function beginPointerInteraction(px, py) {
  ensureBgVideoPlaying();

  if (!(appState === APP_STATE.IDLE || appState === APP_STATE.WINTER_SELECTED))
    return;
  if (px < 0 || px > DESIGN_W || py < 0 || py > DESIGN_H) return;

  for (let i = figures.length - 1; i >= 0; i--) {
    const fig = figures[i];
    if (fig.hitTest(px, py)) {
      activeFigure = fig;
      fig.dragging = true;
      fig.returning = false;
      fig.shadowStrength = 0;
      fig.dragOffsetX = px - fig.x;
      fig.dragOffsetY = py - fig.y;

      for (const other of figures) {
        other.hovered = false;
      }
      fig.hovered = true;

      figures.splice(i, 1);
      figures.push(fig);
      break;
    }
  }
}

function movePointerInteraction(px, py) {
  if (!activeFigure) return;

  activeFigure.x = px - activeFigure.dragOffsetX;
  activeFigure.y = py - activeFigure.dragOffsetY;

  if (activeFigure.name === "Winter" && appState === APP_STATE.IDLE) {
    appState = APP_STATE.WINTER_SELECTED;
    stateStartTime = millis();
  }

  if (
    activeFigure.name === "Winter" &&
    appState === APP_STATE.WINTER_SELECTED
  ) {
    const d = dist(
      activeFigure.x,
      activeFigure.y,
      activeFigure.anchorX,
      activeFigure.anchorY
    );
    if (d > 40) {
      appState = APP_STATE.COLLAPSING;
      collapseStartTime = millis();

      if (exitVideo && exitVideoReady) {
        try {
          exitVideo.pause();
          exitVideo.time(0);
        } catch (e) {}

        tryPlayVideo(exitVideo, false);
      }

      activeFigure.dragging = false;
      activeFigure.returning = false;
      activeFigure.shadowStrength = 0;
      activeFigure = null;
    }
  }
}

function endPointerInteraction() {
  if (activeFigure) {
    activeFigure.dragging = false;
    activeFigure.returning = true;
    activeFigure = null;
  }
}

function mousePressed() {
  beginPointerInteraction(toDesignMouseX(), toDesignMouseY());
}

function mouseDragged() {
  movePointerInteraction(toDesignMouseX(), toDesignMouseY());
}

function mouseReleased() {
  endPointerInteraction();
}

function touchStarted() {
  beginPointerInteraction(toDesignMouseX(), toDesignMouseY());
  return false;
}

function touchMoved() {
  movePointerInteraction(toDesignMouseX(), toDesignMouseY());
  return false;
}

function touchEnded() {
  endPointerInteraction();
  return false;
}

class Figure {
  constructor(cfg) {
    this.hovered = false;
    this.dragging = false;
    this.returning = false;

    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.glitchStrength = 0;
    this.shadowStrength = 0;
    this.frameStrength = 0;

    this.alphaThreshold = 20;

    this.applyConfig(cfg);

    this.figureImg.loadPixels();

    this.updateFigurePlacement();
    this.anchorX = this.x;
    this.anchorY = this.y;
  }

  applyConfig(cfg) {
    this.name = cfg.name;
    this.figureImg = cfg.figureImg;
    this.frameImg = cfg.frameImg;

    this.frameX = cfg.frameX;
    this.frameY = cfg.frameY;
    this.frameH = cfg.frameH;

    const frameAspect = this.frameImg.width / this.frameImg.height;
    this.frameW = this.frameH * frameAspect;

    this.innerOffsetX = cfg.innerOffsetX;
    this.innerOffsetY = cfg.innerOffsetY;
    this.innerW = cfg.innerW;
    this.innerH = cfg.innerH;
  }

  updateFigurePlacement() {
    const areaX = this.frameX + this.innerOffsetX;
    const areaY = this.frameY + this.innerOffsetY;
    const areaW = this.innerW;
    const areaH = this.innerH;

    const imgAspect = this.figureImg.width / this.figureImg.height;
    const areaAspect = areaW / areaH;

    if (imgAspect > areaAspect) {
      this.figureW = areaW;
      this.figureH = areaW / imgAspect;
    } else {
      this.figureH = areaH;
      this.figureW = areaH * imgAspect;
    }

    this.centerX = areaX + areaW / 2;
    this.centerY = areaY + areaH / 2;

    if (!this.dragging && !this.returning) {
      this.x = this.centerX - this.figureW / 2;
      this.y = this.centerY - this.figureH / 2;
      this.anchorX = this.x;
      this.anchorY = this.y;
    }
  }

  updateReturn() {
    if (!this.dragging && this.returning) {
      const targetX = this.centerX - this.figureW / 2;
      const targetY = this.centerY - this.figureH / 2;

      this.x = lerp(this.x, targetX, 0.55);
      this.y = lerp(this.y, targetY, 0.55);

      const d = dist(this.x, this.y, targetX, targetY);

      if (d < 20) {
        this.glitchStrength *= 0.7;
      }

      if (d < 0.8) {
        this.x = targetX;
        this.y = targetY;
        this.returning = false;
        this.glitchStrength = 0;
      }
    }
  }

  updateEffects() {
    const targetX = this.centerX - this.figureW / 2;
    const targetY = this.centerY - this.figureH / 2;
    const d = dist(this.x, this.y, targetX, targetY);

    let targetGlitch = 0;
    if (this.hovered) targetGlitch += 0.18;
    if (this.dragging) targetGlitch += 0.95;
    if (this.returning) targetGlitch += 0.08;
    targetGlitch += constrain(map(d, 0, 220, 0, 0.35), 0, 0.35);

    let targetShadow = 0;
    if (this.dragging || this.returning) {
      targetShadow = constrain(map(d, 0, 220, 0.2, 1.0), 0.2, 1.0);
    }

    let targetFrame = 0.15;
    if (this.hovered) targetFrame = 1.2;
    if (this.dragging) targetFrame = 1.35;
    if (this.returning) targetFrame = 0.6;

    if (this.name === "Winter" && appState === APP_STATE.COLLAPSING) {
      targetFrame = 1.6;
      targetGlitch += 0.55;
    }

    if (this.name === "Winter" && appState === APP_STATE.REVEALING) {
      targetFrame = 1.1;
    }

    this.glitchStrength = lerp(this.glitchStrength, targetGlitch, 0.28);
    this.shadowStrength = lerp(this.shadowStrength, targetShadow, 0.2);
    this.frameStrength = lerp(this.frameStrength, targetFrame, 0.2);
  }

  hitTest(px, py) {
    if (
      px < this.x ||
      px > this.x + this.figureW ||
      py < this.y ||
      py > this.y + this.figureH
    ) {
      return false;
    }

    const ix = floor(
      map(px, this.x, this.x + this.figureW, 0, this.figureImg.width)
    );
    const iy = floor(
      map(py, this.y, this.y + this.figureH, 0, this.figureImg.height)
    );

    const cx = constrain(ix, 0, this.figureImg.width - 1);
    const cy = constrain(iy, 0, this.figureImg.height - 1);

    const idx = 4 * (cy * this.figureImg.width + cx);
    const alpha = this.figureImg.pixels[idx + 3];

    return alpha > this.alphaThreshold;
  }

  drawFigure() {
    const alphaMul = getFigureAlpha(this);
    if (alphaMul <= 0.01) return;

    const isWinter = this.name === "Winter";
    const isDesigner = this.name === "Designer";
    const g = this.glitchStrength;

    if (isWinter) {
      this.drawWinterPersonOnlyGlitch(alphaMul);
      return;
    }

    if (g < 0.06) {
      if (isDesigner) {
        this.drawDesignerWhiteSilhouette(alphaMul);
      } else {
        tint(255, 255 * alphaMul);
        image(this.figureImg, this.x, this.y, this.figureW, this.figureH);
        noTint();
      }
      return;
    }

    const slices = 24;
    const sliceH = this.figureImg.height / slices;
    const amp = 2 + g * 14;

    push();

    for (let i = 0; i < slices; i++) {
      const sy = i * sliceH;
      const dx = this.x + random(-amp, amp);
      const dy =
        this.y + sy * (this.figureH / this.figureImg.height) + random(-1, 1);

      if (isDesigner) {
        this.drawDesignerSliceWhiteSilhouette(dx, dy, sy, sliceH, alphaMul);
      } else {
        tint(255, 255 * alphaMul);
        image(
          this.figureImg,
          dx,
          dy,
          this.figureW,
          sliceH * (this.figureH / this.figureImg.height),
          0,
          sy,
          this.figureImg.width,
          sliceH
        );
        noTint();
      }
    }

    if (!isDesigner) {
      tint(255, 60, 60, 55 * alphaMul);
      image(this.figureImg, this.x - 2, this.y, this.figureW, this.figureH);

      tint(60, 180, 255, 55 * alphaMul);
      image(this.figureImg, this.x + 2, this.y, this.figureW, this.figureH);

      tint(255, 35 * alphaMul);
      image(
        this.figureImg,
        lerp(this.anchorX, this.x, 0.35),
        lerp(this.anchorY, this.y, 0.35),
        this.figureW,
        this.figureH
      );
    } else {
      blendMode(SCREEN);
      tint(255, 255, 255, 45 * alphaMul);
      image(this.figureImg, this.x - 1, this.y, this.figureW, this.figureH);

      blendMode(ADD);
      tint(220, 240, 255, 25 * alphaMul);
      image(this.figureImg, this.x + 1, this.y, this.figureW, this.figureH);

      blendMode(BLEND);
    }

    noTint();
    pop();
  }

  drawDesignerWhiteSilhouette(alphaMul = 1) {
    push();

    blendMode(BLEND);
    tint(255, 255, 255, 150 * alphaMul);
    image(this.figureImg, this.x, this.y, this.figureW, this.figureH);

    blendMode(SCREEN);
    tint(255, 255, 255, 90 * alphaMul);
    image(this.figureImg, this.x, this.y, this.figureW, this.figureH);

    tint(220, 240, 255, 55 * alphaMul);
    image(this.figureImg, this.x - 1.5, this.y - 1, this.figureW, this.figureH);

    blendMode(ADD);
    tint(255, 255, 255, 28 * alphaMul);
    image(this.figureImg, this.x + 1, this.y, this.figureW, this.figureH);

    blendMode(BLEND);
    noTint();
    pop();
  }

  drawDesignerSliceWhiteSilhouette(dx, dy, sy, sliceH, alphaMul = 1) {
    const dh = sliceH * (this.figureH / this.figureImg.height);

    push();

    blendMode(BLEND);
    tint(255, 255, 255, 145 * alphaMul);
    image(
      this.figureImg,
      dx,
      dy,
      this.figureW,
      dh,
      0,
      sy,
      this.figureImg.width,
      sliceH
    );

    blendMode(SCREEN);
    tint(255, 255, 255, 85 * alphaMul);
    image(
      this.figureImg,
      dx - 1,
      dy,
      this.figureW,
      dh,
      0,
      sy,
      this.figureImg.width,
      sliceH
    );

    tint(220, 240, 255, 45 * alphaMul);
    image(
      this.figureImg,
      dx + 1,
      dy,
      this.figureW,
      dh,
      0,
      sy,
      this.figureImg.width,
      sliceH
    );

    blendMode(BLEND);
    noTint();
    pop();
  }

  drawWinterPersonOnlyGlitch(alphaMul = 1) {
    let winterAlpha = alphaMul * getWinterCollapseAlpha();
    if (winterAlpha <= 0.01) return;

    const g = this.glitchStrength;

    if (g < 0.06) {
      tint(255, 255 * winterAlpha);
      image(this.figureImg, this.x, this.y, this.figureW, this.figureH);
      noTint();
      return;
    }

    const slices = 22;
    const sliceH = this.figureImg.height / slices;
    const amp = 1 + g * 12;

    push();

    for (let i = 0; i < slices; i++) {
      const sy = i * sliceH;
      const dx = this.x + random(-amp, amp);
      const dy =
        this.y +
        sy * (this.figureH / this.figureImg.height) +
        random(-1.1, 1.1);

      tint(255, 255 * winterAlpha);
      image(
        this.figureImg,
        dx,
        dy,
        this.figureW,
        sliceH * (this.figureH / this.figureImg.height),
        0,
        sy,
        this.figureImg.width,
        sliceH
      );
      noTint();
    }

    tint(255, 60, 80, 45 * winterAlpha);
    image(this.figureImg, this.x - 3, this.y, this.figureW, this.figureH);

    tint(60, 200, 255, 45 * winterAlpha);
    image(this.figureImg, this.x + 3, this.y, this.figureW, this.figureH);

    tint(255, 255, 255, 24 * winterAlpha);
    image(this.figureImg, this.x, this.y - 1, this.figureW, this.figureH);

    noTint();
    pop();
  }

  drawShadow() {
    const alphaMul = getFigureAlpha(this);
    if (alphaMul <= 0.01) return;
    if (this.shadowStrength < 0.03) return;

    const s = this.shadowStrength * alphaMul;

    push();

    tint(0, 235 * s);
    image(
      this.figureImg,
      this.anchorX,
      this.anchorY,
      this.figureW,
      this.figureH
    );

    tint(0, 120 * s);
    image(
      this.figureImg,
      this.anchorX + 0.5,
      this.anchorY + 0.5,
      this.figureW,
      this.figureH
    );

    noTint();
    pop();
  }

  drawFrame() {
    let alphaMul = getFigureAlpha(this);
    if (this.name === "Winter") {
      alphaMul *= getWinterFrameDoorAlpha(this);
    }
    if (alphaMul <= 0.01) return;

    push();

    tint(255, 210 * alphaMul);
    image(this.frameImg, this.frameX, this.frameY, this.frameW, this.frameH);

    const flicker = this.frameStrength;

    if (flicker > 0.02) {
      const n = noise(frameCount * 0.12 + this.frameX * 0.01);
      const flashAlpha = map(n, 0, 1, 170, 255) * flicker * alphaMul;

      for (let i = 0; i < 6; i++) {
        const spread = 2 + i * 2.2;
        const glowAlpha = max(8, 30 - i * 4) * flicker * alphaMul;

        tint(80, 220, 255, glowAlpha);
        image(
          this.frameImg,
          this.frameX - spread,
          this.frameY - spread,
          this.frameW + spread * 2,
          this.frameH + spread * 2
        );
      }

      for (let i = 0; i < 3; i++) {
        const jitterX = random(-1.8, 1.8) * flicker;
        const jitterY = random(-1.8, 1.8) * flicker;

        tint(110, 240, 255, flashAlpha);
        image(
          this.frameImg,
          this.frameX + jitterX,
          this.frameY + jitterY,
          this.frameW,
          this.frameH
        );
      }

      tint(200, 255, 255, 120 * flicker * alphaMul);
      image(this.frameImg, this.frameX, this.frameY, this.frameW, this.frameH);

      const scanY =
        this.frameY +
        (sin(frameCount * 0.12 + this.frameX * 0.02) * 0.5 + 0.5) * this.frameH;

      noStroke();
      fill(120, 240, 255, 50 * flicker * alphaMul);
      rect(this.frameX + 4, scanY, this.frameW - 8, 3);
    }

    noTint();
    pop();
  }
}
