// =========================
// REUSABLE VIDEO SLIDER SYSTEM
// =========================

function playVideo(video) {
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function waitForVideoReady(video) {
  if (video.readyState >= 2) return Promise.resolve();

  return new Promise(resolve => {
    video.addEventListener("loadeddata", resolve, { once: true });
  });
}

function restartComparisonVideos(v1, v2, startTime = 0) {
  if (!v1 || !v2) return;

  v1.pause();
  v2.pause();

  Promise.all([waitForVideoReady(v1), waitForVideoReady(v2)]).then(() => {
    v1.currentTime = startTime;
    v2.currentTime = startTime;
    playVideo(v1);
    playVideo(v2);
  });
}

// -------------------------
// INIT EVERYTHING FOR ONE CONTAINER
// -------------------------
function initVideoComparison(container, scenes, defaultIndex = 0) {
  if (!container) return;

  initSlider(container);
  attachSceneButtons(container, scenes);
  syncVideos(container);

  // load first scene
  setScene(container, scenes, defaultIndex);
}


// -------------------------
// SCENE SWITCHING (LOCAL)
// -------------------------
function setScene(container, scenes, i) {
  const v1 = container.querySelector(".video-left");
  const v2 = container.querySelector(".video-right");

  if (!v1 || !v2 || !scenes[i]) return;

  // pause before switching (prevents glitch)
  v1.pause();
  v2.pause();

  v1.src = scenes[i].left;
  v2.src = scenes[i].right;

  v1.load();
  v2.load();

  restartComparisonVideos(v1, v2);

  // update active buttons
  container.querySelectorAll(".scene-thumb").forEach((btn, idx) => {
    btn.classList.toggle("active", idx === i);
  });
}


// -------------------------
// BUTTON HANDLING
// -------------------------
function attachSceneButtons(container, scenes) {
  const thumbs = container.querySelectorAll(".scene-thumb");

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      setScene(container, scenes, i);
    });
  });
}


// -------------------------
// VIDEO SYNC (MASTER = LEFT)
// -------------------------
function syncVideos(container) {
  const v1 = container.querySelector(".video-left");   // RGB
  const v2 = container.querySelector(".video-right");  // SEG

  if (!v1 || !v2) return;
  if (container.dataset.videoSyncReady === "true") return;
  container.dataset.videoSyncReady = "true";

  function correctDrift(threshold = 0.08) {
    if (v1.paused || v2.paused) return;

    const diff = Math.abs(v1.currentTime - v2.currentTime);
    if (diff > threshold) {
      v2.currentTime = v1.currentTime;
    }
  }

  v1.addEventListener("play", () => {
    if (v2.paused) {
      v2.currentTime = v1.currentTime;
      playVideo(v2);
    }
  });

  v1.addEventListener("pause", () => {
    if (!v2.paused) v2.pause();
  });

  v1.addEventListener("timeupdate", () => {
    correctDrift();
  });

  v1.addEventListener("seeked", () => {
    v2.currentTime = v1.currentTime;
  });

  setInterval(() => correctDrift(0.12), 500);
}


// -------------------------
// SLIDER DRAG LOGIC
// -------------------------
function initSlider(container) {
  const slider = container.querySelector(".slider");
  const sliderLine = container.querySelector(".slider-line");
  const rightVideo = container.querySelector(".video-right");
  const leftVideo = container.querySelector(".video-left");

  if (!slider || !sliderLine || !rightVideo) return;
  if (slider.dataset.sliderReady === "true") return;
  slider.dataset.sliderReady = "true";

  let isDragging = false;
  let isAutoPlaying = true;
  let sliderPercent = 50;
  let direction = 1;
  let lastFrameTime = null;

  const controls = document.createElement("div");
  controls.className = "slider-controls";

  const pauseButton = document.createElement("button");
  pauseButton.type = "button";
  pauseButton.className = "slider-control-button";
  pauseButton.textContent = "Pause";
  pauseButton.setAttribute("aria-label", "Pause comparison slider animation");

  const resyncButton = document.createElement("button");
  resyncButton.type = "button";
  resyncButton.className = "slider-control-button";
  resyncButton.textContent = "Resync";
  resyncButton.setAttribute("aria-label", "Resynchronize comparison videos");

  controls.append(pauseButton, resyncButton);

  const comparisonContainer = slider.closest(".comparison-container");
  if (comparisonContainer && !comparisonContainer.querySelector(".slider-controls")) {
    comparisonContainer.appendChild(controls);
  }

  function setSliderPercent(percent) {
    sliderPercent = Math.max(0, Math.min(percent, 100));
    sliderLine.style.left = sliderPercent + "%";
    rightVideo.style.clipPath = `inset(0 0 0 ${sliderPercent}%)`;
  }

  function updateSlider(clientX) {
    const rect = slider.getBoundingClientRect();
    let x = clientX - rect.left;

    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;

    setSliderPercent(percent);
  }

  function resyncVideos() {
    if (!leftVideo || !rightVideo) return;
    restartComparisonVideos(leftVideo, rightVideo);
  }

  function updatePauseButton() {
    pauseButton.textContent = isAutoPlaying ? "Pause" : "Play";
    pauseButton.setAttribute(
      "aria-label",
      isAutoPlaying ? "Pause comparison slider animation" : "Play comparison slider animation"
    );
  }

  function animateSlider(timestamp) {
    if (lastFrameTime === null) lastFrameTime = timestamp;
    const delta = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (isAutoPlaying && !isDragging) {
      const nextPercent = sliderPercent + direction * 14 * delta;

      if (nextPercent >= 100) {
        direction = -1;
        setSliderPercent(100);
      } else if (nextPercent <= 0) {
        direction = 1;
        setSliderPercent(0);
      } else {
        setSliderPercent(nextPercent);
      }
    }

    requestAnimationFrame(animateSlider);
  }

  // Mouse events
  slider.addEventListener("mousedown", () => {
    isDragging = true;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updateSlider(e.clientX);
  });

  slider.addEventListener("click", (e) => {
    updateSlider(e.clientX);
  });

  pauseButton.addEventListener("click", () => {
    isAutoPlaying = !isAutoPlaying;
    updatePauseButton();
  });

  resyncButton.addEventListener("click", resyncVideos);

  // Touch events
  slider.addEventListener("touchstart", (e) => {
    isDragging = true;
    e.preventDefault();
  });

  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateSlider(touch.clientX);
  });

  setSliderPercent(50);
  updatePauseButton();
  requestAnimationFrame(animateSlider);
}


// -------------------------
// AUTO INIT (OPTIONAL)
// -------------------------
function initAllSliders(configs) {
  configs.forEach(cfg => {
    const container = document.querySelector(cfg.selector);
    if (!container) return;

    initVideoComparison(container, cfg.scenes, cfg.defaultIndex || 0);
  });
}


// -------------------------
// EXPORT GLOBALS
// -------------------------
window.initVideoComparison = initVideoComparison;
window.initAllSliders = initAllSliders;
