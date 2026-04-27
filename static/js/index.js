// =========================
// SCENE DATA (GLOBAL)
// =========================

// Segmentation
const segScenes = [
  { left: "static/videos/garden/rgb.mp4", right: "static/videos/garden/seg.mp4" },
  { left: "static/videos/horns/rgb.mp4", right: "static/videos/horns/seg.mp4" },
  { left: "static/videos/kitchen/rgb.mp4", right: "static/videos/kitchen/seg.mp4" },
  { left: "static/videos/fern/rgb.mp4", right: "static/videos/fern/seg.mp4" }
];

// Insertion
const insertionScenes = [
  {
    gt: "static/videos/insertion/garden/gt.jpg",
    objectThumb: "static/videos/insertion/garden/thumb.jpg",
    ours: "static/videos/insertion/garden/ours.mp4",
    gaussian: "static/videos/insertion/garden/gaussian.mp4"
  },
  {
    gt: "static/videos/insertion/kitchen/gt.jpg",
    objectThumb: "static/videos/insertion/kitchen/thumb.jpg",
    ours: "static/videos/insertion/kitchen/ours.mp4",
    gaussian: "static/videos/insertion/kitchen/gaussian.mp4"
  },
  {
    gt: "static/videos/insertion/fortress/gt.jpg",
    objectThumb: "static/videos/insertion/fortress/thumb.jpg",
    ours: "static/videos/insertion/fortress/ours.mp4",
    gaussian: "static/videos/insertion/fortress/gaussian.mp4"
  }
];

// Removal
const removalScenes = [
  {
    gt: "static/videos/removal/garden/gt.jpg",
    ours: "static/videos/removal/garden/ours.mp4",
    gaussian: "static/videos/removal/garden/gaussian.mp4"
  },
  {
    gt: "static/videos/removal/kitchen/gt.jpg",
    ours: "static/videos/removal/kitchen/ours.mp4",
    gaussian: "static/videos/removal/kitchen/gaussian.mp4"
  },
  {
    gt: "static/videos/removal/fern/gt.jpg",
    ours: "static/videos/removal/fern/ours.mp4",
    gaussian: "static/videos/removal/fern/gaussian.mp4"
  }
];


// =========================
// LOAD HTML SECTIONS
// =========================
async function loadSection(id, file) {
  const res = await fetch(file);
  const html = await res.text();
  document.getElementById(id).innerHTML = html;
}

async function loadAllSections() {
  await loadSection("hero", "sections/hero.html");
  await loadSection("method", "sections/method.html");
  await loadSection("results", "sections/results.html");
}


// =========================
// NAVBAR
// =========================
function initNavbar() {
  $(".navbar-burger").click(function() {
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });
}


// =========================
// CAROUSEL
// =========================
function initCarousel() {
  const options = {
    slidesToScroll: 1,
    slidesToShow: 3,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  };

  bulmaCarousel.attach('.carousel', options);
}


// =========================
// GENERIC IMAGE + VIDEO SECTION
// =========================
function initImageVideoSection(sectionId, scenes) {
  const container = document.getElementById(sectionId);
  if (!container) return;

  const gtImg = container.querySelector(".gt-image");
  const objectThumb = container.querySelector(".inserted-object-thumb");
  const objectCard = container.querySelector(".inserted-object-card");
  const v1 = container.querySelector(".video-left");
  const v2 = container.querySelector(".video-right");
  const thumbs = container.querySelectorAll(".scene-thumb");

  function setScene(i) {
    const scene = scenes[i];
    if (!scene) return;

    // update content
    gtImg.src = scene.gt;

    if (objectThumb && objectCard) {
      objectThumb.src = scene.objectThumb || "";
      objectCard.hidden = !scene.objectThumb;
    }

    v1.src = scene.ours;
    v2.src = scene.gaussian;

    v1.load();
    v2.load();

    v1.currentTime = 0;
    v2.currentTime = 0;

    v1.play();
    v2.play();

    // active thumbnail
    thumbs.forEach((t, idx) => {
      t.classList.toggle("active", idx === i);
    });
  }

  // click events
  thumbs.forEach((thumb) => {
    const i = parseInt(thumb.dataset.idx);
    thumb.addEventListener("click", () => setScene(i));
  });

  // slider + sync
  initSlider(container);
  //syncVideos(container);

  // initial load
  setScene(0);
}


// =========================
// SEGMENTATION SECTION
// =========================
function initSegmentationSection() {
  const container = document.getElementById("seg-section");
  if (!container) return;

  initVideoComparison(container, segScenes);
}


// =========================
// SECTION NAVIGATION
// =========================
function initSectionNav() {
  const navItems = Array.from(document.querySelectorAll(".section-nav-item"));
  if (!navItems.length) return;

  const sections = navItems
    .map(item => document.getElementById(item.dataset.sectionTarget))
    .filter(Boolean);

  function setActive(id) {
    navItems.forEach(item => {
      item.classList.toggle("active", item.dataset.sectionTarget === id);
    });
  }

  navItems.forEach(item => {
    item.addEventListener("click", event => {
      const target = document.getElementById(item.dataset.sectionTarget);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(item.dataset.sectionTarget);
    });
  });

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) setActive(visible.target.id);
  }, {
    rootMargin: "-35% 0px -45% 0px",
    threshold: [0.05, 0.2, 0.5, 0.8]
  });

  sections.forEach(section => observer.observe(section));
}


// =========================
// INIT EVERYTHING
// =========================
$(document).ready(async function() {

  await loadAllSections();

  initNavbar();
  initCarousel();
  initSegmentationSection();

  // ✅ THIS is the only Voronoi init you need
  initVoronoi();


  initImageVideoSection("insertion-section", insertionScenes);
  initImageVideoSection("removal-section", removalScenes);
  initSectionNav();


});
