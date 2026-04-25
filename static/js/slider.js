// =========================
// REUSABLE VIDEO SLIDER SYSTEM
// =========================

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

  // play after load (important)
  v1.onloadeddata = () => {
    v1.currentTime = 0;
    v2.currentTime = 0;
    v1.play();
    v2.play();
  };

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

  v1.addEventListener("play", () => {
    if (v2.paused) {
      v2.currentTime = v1.currentTime;
      v2.play();
    }
  });

  v1.addEventListener("pause", () => {
    if (!v2.paused) v2.pause();
  });

  v1.addEventListener("timeupdate", () => {
    const diff = Math.abs(v1.currentTime - v2.currentTime);

    // prevent jitter
    if (diff > 0.05) {
      v2.currentTime = v1.currentTime;
    }
  });

  v1.addEventListener("seeked", () => {
    v2.currentTime = v1.currentTime;
  });
}


// -------------------------
// SLIDER DRAG LOGIC
// -------------------------
function initSlider(container) {
  const slider = container.querySelector(".slider");
  const sliderLine = container.querySelector(".slider-line");
  const rightVideo = container.querySelector(".video-right");

  if (!slider || !sliderLine || !rightVideo) return;

  let isDragging = false;

  function updateSlider(clientX) {
    const rect = slider.getBoundingClientRect();
    let x = clientX - rect.left;

    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;

    sliderLine.style.left = percent + "%";
    rightVideo.style.clipPath = `inset(0 0 0 ${percent}%)`;
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