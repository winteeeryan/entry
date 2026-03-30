let bgVideo;
let exitVideo;
let figures = [];
let activeFigure = null;

// ===== 設計基準尺寸 =====
const DESIGN_W = 1280;
const DESIGN_H = 720;

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

// Exit 視頻實際時長（毫秒）
let exitDurationMs = 4000;
let exitVideoReady = false;

// ===== 配置（全部基於 1280x720） =====
const FIGURE_CONFIG = [
  {
    name: "Researcher",
    figureFile: "assets/researcher.png",
    frameFile: "assets/researcherframe.png",
    frameX: 35,
    frameY: 470,
    frameH: 330,
    innerOffsetX: 24,
    innerOffsetY: 40,
    innerW: 85,
    innerH: 250,
  },
  {
    name: "Observer",
    figureFile: "assets/observer.png",
    frameFile: "assets/observerframe.png",
    frameX: 225,
    frameY: 435,
    frameH: 260,
    innerOffsetX: 18,
    innerOffsetY: 36,
    innerW: 70,
    innerH: 190,
  },
  {
    name: "Winter",
    figureFile: "assets/self_person.png",
    frameFile: "assets/selfframe.png",
    frameX: 545,
    frameY: 320,
    frameH: 355,
    innerOffsetX: 16,
    innerOffsetY: 48,
    innerW: 95,
    innerH: 255,
  },
  {
    name: "Designer",
    figureFile: "assets/designer.png",
    frameFile: "assets/designerframe.png",
    frameX: 785,
    frameY: 485,
    frameH: 300,
    innerOffsetX: 16,
    innerOffsetY: 40,
    innerW: 90,
    innerH: 225,
  },
  {
    name: "Reader",
    figureFile: "assets/reader.png",
    frameFile: "assets/readerframe.png",
    frameX: 1070,
    frameY: 380,
    frameH: 335,
    innerOffsetX: 20,
    innerOffsetY: 40,
    innerW: 95,
    innerH: 245,
  },
];

function preload() {
  for (const cfg of FIGURE_CONFIG) {
    cfg.figureImg = loadImage(cfg.figureFile);
    cfg.frameImg = loadImage(cfg.frameFile);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  updateViewTransform();

  bgVideo = createVideo(["assets/Entry.mp4"], onBgLoaded);
  bgVideo.size(DESIGN_W, DESIGN_H);
  bgVideo.volume(0);
  bgVideo.hide();

  exitVideo = createVideo(["assets/Exit.mp4"], onExitLoaded);
  exitVideo.size(DESIGN_W, DESIGN_H);
  exitVideo.volume(0);
  exitVideo.hide();

  for (const cfg of FIGURE_CONFIG) {
    figures.push(new Figure(cfg));
  }
}

function onBgLoaded() {
  bgVideo.loop();
}

function onExitLoaded() {
  // 读取实际时长
  try {
    const d = exitVideo.elt.duration;
    if (isFinite(d) && d > 0) {
      exitDurationMs = d * 1000;
      exitVideoReady = true;
    }
  } catch (e) {
    exitDurationMs = 4000;
  }

  // 某些浏览器 metadata 到得更晚，这里再监听一次
  exitVideo.elt.onloadedmetadata = () => {
    const d = exitVideo.elt.duration;
    if (isFinite(d) && d > 0) {
      exitDurationMs = d * 1000;
      exitVideoReady = true;
    }
  };

  // 播放结束时兜底进入 REVEALING
  exitVideo.elt.onended = () => {
    if (appState === APP_STATE.COLLAPSING) {
      appState = APP_STATE.REVEALING;
      stateStartTime = millis();
    }
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateViewTransform();
}

function updateViewTransform() {
  viewScale = min(width / DESIGN_W, height / DESIGN_H);
  offsetX = (width - DESIGN_W * viewScale) * 0.5;
  offsetY = (height - DESIGN_H * viewScale) * 0.5;
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
  }
}

function updateAppState() {
  if (appState === APP_STATE.COLLAPSING) {
    // 优先按视频播放状态判断
    if (exitVideo && exitVideo.elt) {
      const dur = exitVideo.elt.duration;
      const cur = exitVideo.elt.currentTime;

      if (isFinite(dur) && dur > 0 && cur >= dur - 0.03) {
        appState = APP_STATE.REVEALING;
        stateStartTime = millis();
        exitVideo.pause();
      } else {
        // 兜底：按实际时长判断
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
    if (exitVideo) {
      image(exitVideo, 0, 0, DESIGN_W, DESIGN_H);
    } else {
      background(0);
    }

    // 根据实际视频时长决定后段收黑速度
    let t = 0;
    if (exitVideo && exitVideo.elt && isFinite(exitVideo.elt.duration) && exitVideo.elt.duration > 0) {
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

  if (bgVideo) {
    image(bgVideo, 0, 0, DESIGN_W, DESIGN_H);
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

  if (appState === APP_STATE.WINTER_SELECTED || appState === APP_STATE.COLLAPSING) {
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
  if (appState !== APP_STATE.COLLAPSING && appState !== APP_STATE.REVEALING) return 1;

  if (appState === APP_STATE.COLLAPSING) {
    let t = 0;
    if (exitVideo && exitVideo.elt && isFinite(exitVideo.elt.duration) && exitVideo.elt.duration > 0) {
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

function mousePressed() {
  if (!(appState === APP_STATE.IDLE || appState === APP_STATE.WINTER_SELECTED)) return;

  const mx = toDesignMouseX();
  const my = toDesignMouseY();

  if (mx < 0 || mx > DESIGN_W || my < 0 || my > DESIGN_H) return;

  for (let i = figures.length - 1; i >= 0; i--) {
    const fig = figures[i];
    if (fig.hitTest(mx, my)) {
      activeFigure = fig;
      fig.dragging = true;
      fig.returning = false;
      fig.shadowStrength = 0;
      fig.dragOffsetX = mx - fig.x;
      fig.dragOffsetY = my - fig.y;

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

function mouseDragged() {
  if (!activeFigure) return;

  const mx = toDesignMouseX();
  const my = toDesignMouseY();

  activeFigure.x = mx - activeFigure.dragOffsetX;
  activeFigure.y = my - activeFigure.dragOffsetY;

  if (activeFigure.name === "Winter" && appState === APP_STATE.IDLE) {
    appState = APP_STATE.WINTER_SELECTED;
    stateStartTime = millis();
  }

  if (activeFigure.name === "Winter" && appState === APP_STATE.WINTER_SELECTED) {
    const d = dist(activeFigure.x, activeFigure.y, activeFigure.anchorX, activeFigure.anchorY);
    if (d > 40) {
      appState = APP_STATE.COLLAPSING;
      collapseStartTime = millis();

      if (exitVideo) {
        try {
          exitVideo.pause();
          exitVideo.time(0);
        } catch (e) {}

        exitVideo.play();
      }

      activeFigure.dragging = false;
      activeFigure.returning = false;
      activeFigure.shadowStrength = 0;
      activeFigure = null;
    }
  }
}

function mouseReleased() {
  if (activeFigure) {
    activeFigure.dragging = false;
    activeFigure.returning = true;
    activeFigure = null;
  }
}

class Figure {
  constructor(cfg) {
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

    this.hovered = false;
    this.dragging = false;
    this.returning = false;

    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.glitchStrength = 0;
    this.shadowStrength = 0;
    this.frameStrength = 0;

    this.alphaThreshold = 20;

    this.figureImg.loadPixels();

    this.updateFigurePlacement();
    this.anchorX = this.x;
    this.anchorY = this.y;
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

    const ix = floor(map(px, this.x, this.x + this.figureW, 0, this.figureImg.width));
    const iy = floor(map(py, this.y, this.y + this.figureH, 0, this.figureImg.height));

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
      const dy = this.y + sy * (this.figureH / this.figureImg.height) + random(-1, 1);

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
    image(this.figureImg, dx, dy, this.figureW, dh, 0, sy, this.figureImg.width, sliceH);

    blendMode(SCREEN);
    tint(255, 255, 255, 85 * alphaMul);
    image(this.figureImg, dx - 1, dy, this.figureW, dh, 0, sy, this.figureImg.width, sliceH);

    tint(220, 240, 255, 45 * alphaMul);
    image(this.figureImg, dx + 1, dy, this.figureW, dh, 0, sy, this.figureImg.width, sliceH);

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
      const dy = this.y + sy * (this.figureH / this.figureImg.height) + random(-1.1, 1.1);

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
    image(this.figureImg, this.anchorX, this.anchorY, this.figureW, this.figureH);

    tint(0, 120 * s);
    image(this.figureImg, this.anchorX + 0.5, this.anchorY + 0.5, this.figureW, this.figureH);

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
