export function initCarousel() {
  bulmaCarousel.attach('#results-carousel', {
    slidesToScroll: 1,
    slidesToShow: 3,
    infinite: true
  });
}