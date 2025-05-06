import * as d3 from "d3";

const scatterData = [
  { Temperature: -5.33, Weather: 0 },
  { Temperature: -1.33, Weather: 0 },
  { Temperature: 2.00, Weather: 0 },
  { Temperature: 3.90, Weather: 0 },
  { Temperature: 5.39, Weather: 0 },
  { Temperature: 7.67, Weather: 0 },
  { Temperature: 9.26, Weather: 0 },
  { Temperature: 10.26, Weather: 0 },
  { Temperature: 11.81, Weather: 0 },
  { Temperature: 12.41, Weather: 0 },
  { Temperature: 13.40, Weather: 0 },
  { Temperature: 14.68, Weather: 0 },
  { Temperature: 15.56, Weather: 0 },
  { Temperature: 17.20, Weather: 1 },
  { Temperature: 18.36, Weather: 1 },
  { Temperature: 19.69, Weather: 1 },
  { Temperature: 21.14, Weather: 1 },
  { Temperature: 22.30, Weather: 1 },
  { Temperature: 23.38, Weather: 1 },
  { Temperature: 24.20, Weather: 1 },
  { Temperature: 25.05, Weather: 1 },
  { Temperature: 26.06, Weather: 1 },
  { Temperature: 27.11, Weather: 1 },
  { Temperature: 28.62, Weather: 1 },
  { Temperature: 30.00, Weather: 1 },
  { Temperature: 32.01, Weather: 1 },
  { Temperature: 35.34, Weather: 1 },
];

const width = 500;
const height = 300;
const margin = { top: 20, right: 40, bottom: 50, left: 70 };
const colors = ["#003181", "#ff9900"];
const labels = ["阴天", "晴天"];

const xScale = d3.scaleLinear().domain([-10, 40]).range([margin.left, width - margin.right]);
const yScale = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);
const colorScale = d3.scaleOrdinal().domain([0, 1]).range(colors);

const sigmoidPath = d3.line()
  .x((d) => xScale(d.x))
  .y((d) => yScale(d.y));

function generateSigmoidCurve(minTemp, maxTemp, step, x0 = 15, k = 0.5) {
  const curve = [];
  for (let x = minTemp; x <= maxTemp; x += step) {
    const y = 1 / (1 + Math.exp(-k * (x - x0)));
    curve.push({ x, y });
  }
  return curve;
}

let temperature = -10;
let decisionBoundary = 0.5;
let prediction = "阴天";

function drawScatterChart() {
  d3.select("#scatter-chart").selectAll("*").remove();

  const svg = d3.select("#scatter-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const xTicks = svg
    .selectAll(".x-tick")
    .data(xScale.ticks())
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${xScale(d)}, ${height - margin.bottom})`);

  xTicks
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", 0)
    .attr("y2", -height + margin.bottom + margin.top);

  xTicks
    .append("text")
    .attr("class", "axis-text")
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .attr("dy", "5")
    .text((d) => d);

  const yTicks = svg
    .selectAll(".y-tick")
    .data(yScale.ticks())
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${margin.left}, ${yScale(d)})`);

  yTicks
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", width - margin.left - margin.right)
    .attr("y1", 0)
    .attr("y2", 0);

  yTicks
    .append("text")
    .attr("class", "axis-text")
    .attr("text-anchor", "end")
    .attr("dx", "-5")
    .attr("dominant-baseline", "middle")
    .text((d) => d.toFixed(1));

  svg
    .append("line")
    .attr("class", "axis-line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", height - margin.bottom)
    .attr("y2", height - margin.bottom);

  svg
    .append("line")
    .attr("class", "axis-line")
    .attr("x1", margin.left)
    .attr("x2", margin.left)
    .attr("y1", height - margin.bottom)
    .attr("y2", margin.top);

  svg
    .selectAll(".scatter-circle")
    .data(scatterData)
    .enter()
    .append("circle")
    .attr("class", "scatter-circle")
    .attr("r", 5)
    .attr("cx", (d) => xScale(d.Temperature))
    .attr("cy", (d) => yScale(d.Weather))
    .attr("fill", (d) => colorScale(d.Weather));

  const sigmoidCurve = generateSigmoidCurve(-10, 40, 0.5);
  svg
    .append("path")
    .attr("class", "sigmoid-line")
    .attr("d", sigmoidPath(sigmoidCurve))
    .attr("stroke-width", 5);

  const example = svg
    .append("g")
    .append("circle")
    .attr("class", "example-circle")
    .attr("r", 13)
    .attr("cx", xScale(temperature))
    .attr("cy", yScale(1 / (1 + Math.exp(-0.5 * (temperature - 15)))))
    .attr("fill", colorScale(prediction === "阴天" ? 0 : 1))
    .attr("stroke", "#fff")
    .attr("stroke-width", 3);

  const boundaryGroup = svg
    .append("g")
    .attr("class", "boundary-group")
    .attr("transform", `translate(${margin.left}, ${yScale(decisionBoundary) - 5})`);

  boundaryGroup
    .append("rect")
    .attr("class", "boundary-line")
    .attr("stroke", "#333")
    .attr("stroke-width", 1.4)
    .attr("fill", "#fff")
    .attr("width", width - margin.right - margin.left)
    .attr("height", 10);

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("transform", `translate(${25},${yScale(0.5)}) rotate(-90)`)
    .text("概率");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "middle")
    .attr("x", xScale(15))
    .attr("y", height - 10)
    .text("温度 (摄氏度)");

  const legend = svg.append("g").attr("transform", `translate(${margin.left}, 10)`);

  labels.forEach((label, i) => {
    const g = legend.append("g").attr("transform", `translate(${i * 120} 0)`);

    g.append("circle")
      .attr("class", "legend-circle")
      .attr("r", 5)
      .attr("fill", colors[i]);

    g.append("text")
      .attr("class", "legend-text")
      .attr("dominant-baseline", "middle")
      .attr("x", 20)
      .attr("font-size", 16)
      .text(label);
  });

  function update() {
    const temp = +document.getElementById("tempSlider").value;
    const boundary = +document.getElementById("boundarySlider").value;

    temperature = temp;
    decisionBoundary = boundary;

    const prob = 1 / (1 + Math.exp(-0.5 * (temp - 15)));
    prediction = prob > boundary ? "晴天" : "阴天";

    document.getElementById("temp-value").textContent = temp;
    document.getElementById("boundary-value").textContent = boundary.toFixed(2);
    document.getElementById("prediction").textContent = prediction;

    example
      .attr("cx", xScale(temp))
      .attr("cy", yScale(prob))
      .attr("fill", colorScale(prediction === "阴天" ? 0 : 1));

    boundaryGroup.attr("transform", `translate(${margin.left}, ${yScale(boundary) - 5})`);
  }

  document.getElementById("tempSlider").addEventListener("input", update);
  document.getElementById("boundarySlider").addEventListener("input", update);

  update();
}

function drawTrainImpactChart() {
  // Placeholder for train impact chart
  d3.select("#train-impact-chart").selectAll("*").remove();
  const svg = d3.select("#train-impact-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .text("Train Impact Chart Placeholder");
}

export { drawScatterChart, drawTrainImpactChart };