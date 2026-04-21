let svg;
const width = 700;
const height = 450;

let points = [];
let delaunay, voronoi;
let selected = -1;
let colors = [];

// ----------------------
// INIT
// ----------------------
function initVoronoi() {
  svg = d3.select("#voronoi-svg");

  if (svg.empty()) {
    console.log("SVG not found");
    return;
  }

  const btn = document.getElementById("generateBtn");

  if (!btn) {
    console.log("Voronoi button not found");
    return;
  }

  // generate new random diagram
  btn.onclick = () => generate(points.length || 25);

  // first render
  generate();
}

// ----------------------
// GENERATE
// ----------------------
function generate(n = 25) {
  points = d3.range(n).map(() => [
    Math.random() * width,
    Math.random() * height
  ]);

  // stable colors per generation
  colors = d3.range(n).map(() => d3.interpolateRainbow(Math.random()));

  delaunay = d3.Delaunay.from(points);
  voronoi = delaunay.voronoi([0, 0, width, height]);

  // pick random selected cell
  selected = Math.floor(Math.random() * points.length);

  draw();
}

// ----------------------
// DRAW
// ----------------------
function draw() {
  if (!svg || svg.empty()) return;
  if (!voronoi || !points.length) return;

  svg.selectAll("*").remove();

  // arrow marker
  const defs = svg.append("defs");

  defs.append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "black");

  const neighborSet = selected !== -1
    ? new Set(delaunay.neighbors(selected))
    : new Set();

  const cellData = points.map((p, i) => ({ p, i }));

  // ----------------------
  // CELLS
  // ----------------------
  svg.append("g")
    .selectAll("path")
    .data(cellData)
    .join("path")
    .attr("d", d => voronoi.renderCell(d.i))
    .attr("fill", d => colors[d.i])
    .attr("opacity", d => {
      if (selected === -1) return 1;
      return (d.i === selected || neighborSet.has(d.i)) ? 1 : 0.2;
    })
    .attr("stroke", d => d.i === selected ? "black" : "#ddd")
    .attr("stroke-width", d => d.i === selected ? 3 : 1.5)
    .on("click", (event, d) => {
      selected = d.i;
      draw();
    });

  // edges
  svg.append("path")
    .attr("d", voronoi.render())
    .attr("fill", "none")
    .attr("stroke", "#aaa");

  if (selected === -1) return;

  const [cx, cy] = points[selected];
  const neighbors = Array.from(delaunay.neighbors(selected));

  // ----------------------
  // NEIGHBOR VISUALIZATION
  // ----------------------
  neighbors.forEach(j => {
    const [x2, y2] = points[j];

    svg.append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "#000")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    svg.append("circle")
      .attr("cx", x2)
      .attr("cy", y2)
      .attr("r", 5)
      .attr("fill", "#222");

    svg.append("text")
      .attr("x", x2 + 5)
      .attr("y", y2 - 5)
      .text("fⱼ");
  });

  // ----------------------
  // SELECTED CENTER
  // ----------------------
  svg.append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", 7)
    .attr("fill", "red");

  svg.append("text")
    .attr("x", cx + 6)
    .attr("y", cy - 6)
    .text("fᵢ");
}