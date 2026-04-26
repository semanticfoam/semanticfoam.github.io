let svg;
const width = 700;
const height = 450;

let points = [];
let delaunay, voronoi;
let selected = -1;
let baseColors = [];

let tvLambda = 0.0;

// pastel arrow color (basil vibe)
const pastelArrow = "#7cc6a6";

// ----------------------
// INIT
// ----------------------
function initVoronoi() {
  svg = d3.select("#voronoi-svg");
  if (svg.empty()) return;

  const btn = document.getElementById("generateBtn");
  if (btn) btn.onclick = () => generate(points.length || 25);

  const slider = document.getElementById("tvSlider");
  const value = document.getElementById("tvValue");

  if (slider) {
    slider.oninput = () => {
      tvLambda = parseFloat(slider.value);
      if (value) value.innerText = tvLambda.toFixed(2);
      draw();
    };
  }

  generate();
}

// ----------------------
// GENERATE
// ----------------------
function generate(n = 25) {
  points = d3.range(n).map(() => [
    30 + Math.random() * (width - 60),
    30 + Math.random() * (height - 60)
  ]);

  baseColors = d3.range(n).map(() =>
    d3.interpolateRainbow(Math.random())
  );

  delaunay = d3.Delaunay.from(points);
  voronoi = delaunay.voronoi([0, 0, width, height]);

  selected = Math.floor(Math.random() * points.length);

  draw();
}

// ----------------------
// CENTROID (FIX)
// ----------------------
function getCellCentroid(i) {
  const poly = voronoi.cellPolygon(i);
  if (!poly || poly.length === 0) return points[i];

  let x = 0, y = 0, area = 0;

  for (let j = 0; j < poly.length - 1; j++) {
    const [x1, y1] = poly[j];
    const [x2, y2] = poly[j + 1];

    const cross = x1 * y2 - x2 * y1;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
    area += cross;
  }

  area *= 0.5;
  if (Math.abs(area) < 1e-6) return points[i];

  x /= (6 * area);
  y /= (6 * area);

  return [x, y];
}

// ----------------------
// TRUE NEIGHBORS
// ----------------------
function getNeighbors(i) {
  const polyI = voronoi.cellPolygon(i);
  if (!polyI) return [];

  const neighbors = [];

  for (let j = 0; j < points.length; j++) {
    if (j === i) continue;

    const polyJ = voronoi.cellPolygon(j);
    if (!polyJ) continue;

    const edge = getSharedEdge(polyI, polyJ);
    if (edge) {
      neighbors.push({ index: j, edge });
    }
  }

  return neighbors;
}

function getSharedEdge(polyA, polyB) {
  const eps = 1e-6;

  for (let a = 0; a < polyA.length - 1; a++) {
    const a1 = polyA[a];
    const a2 = polyA[a + 1];

    for (let b = 0; b < polyB.length - 1; b++) {
      const b1 = polyB[b];
      const b2 = polyB[b + 1];

      const reversed =
        dist(a1, b2) < eps && dist(a2, b1) < eps;

      const same =
        dist(a1, b1) < eps && dist(a2, b2) < eps;

      if (reversed || same) return [a1, a2];
    }
  }

  return null;
}

function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

// ----------------------
// COLOR (TV SMOOTHING)
// ----------------------
function getDisplayColor(i, neighborSet) {
  if (selected === -1) return baseColors[i];

  if (i === selected) return baseColors[i];

  if (neighborSet.has(i)) {
    return d3.interpolateRgb(
      baseColors[i],
      baseColors[selected]
    )(tvLambda);
  }

  return baseColors[i];
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
    .attr("refX", 16)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", pastelArrow);

  const neighbors = selected !== -1 ? getNeighbors(selected) : [];
  const neighborSet = new Set(neighbors.map(n => n.index));

  const cellData = points.map((p, i) => ({ p, i }));

  // ----------------------
  // CELLS
  // ----------------------
  svg.append("g")
    .selectAll("path")
    .data(cellData)
    .join("path")
    .attr("d", d => voronoi.renderCell(d.i))
    .attr("fill", d => getDisplayColor(d.i, neighborSet))
    .attr("opacity", d => {
      if (selected === -1) return 1;
      return (d.i === selected || neighborSet.has(d.i)) ? 1 : 0.18;
    })
    .attr("stroke", d => d.i === selected ? "#111" : "#ccc")
    .attr("stroke-width", d => d.i === selected ? 3 : 1)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      selected = d.i;
      draw();
    });

  // ----------------------
  // GLOBAL EDGES
  // ----------------------
  svg.append("path")
    .attr("d", voronoi.render())
    .attr("fill", "none")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 0.8);

  if (selected === -1) return;

  const [cx, cy] = getCellCentroid(selected);

  // ----------------------
  // EDGE HIGHLIGHT
  // ----------------------
  neighbors.forEach(n => {
    const [[x1, y1], [x2, y2]] = n.edge;

    svg.append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "#000")
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round");

    svg.append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round");
  });

  // ----------------------
  // ARROWS (centroid → centroid)
  // ----------------------
  neighbors.forEach(n => {
    const [x2, y2] = getCellCentroid(n.index);

    svg.append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", pastelArrow)
      .attr("stroke-width", 2.5)
      .attr("marker-end", "url(#arrowhead)")
      .attr("opacity", 0.9);
  });

  // ----------------------
  // NEIGHBOR NODES
  // ----------------------
  neighbors.forEach(n => {
    const [x, y] = getCellCentroid(n.index);

    svg.append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 5)
      .attr("fill", "#333");

    svg.append("text")
      .attr("x", x + 6)
      .attr("y", y - 6)
      .text("fⱼ");
  });

  // ----------------------
  // SELECTED NODE
  // ----------------------
  svg.append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", 7)
    .attr("fill", "#ff4d4d");

  svg.append("text")
    .attr("x", cx + 6)
    .attr("y", cy - 6)
    .text("fᵢ");
}

// ----------------------
initVoronoi();