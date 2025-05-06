import * as d3 from "d3";

export default function precisionRecall() {
  // Define data
  const scatterData = [
    { outcome: "Negative", weight: "9" },
    { outcome: "Negative", weight: "9" },
    { outcome: "Negative", weight: "7.9" },
    { outcome: "Negative", weight: "8" },
    { outcome: "Negative", weight: "7" },
    { outcome: "Negative", weight: "7" },
    { outcome: "Negative", weight: "7" },
    { outcome: "Negative", weight: "7" },
    { outcome: "Negative", weight: "7" },
    { outcome: "Negative", weight: "7" },
    { outcome: "Negative", weight: "4" },
    { outcome: "Negative", weight: "4.1" },
    { outcome: "Negative", weight: "4" },
    { outcome: "Negative", weight: "4.1" },
    { outcome: "Negative", weight: "3.9" },
    { outcome: "Negative", weight: "4.2" },
    { outcome: "Negative", weight: "4" },
    { outcome: "Negative", weight: "12" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "3" },
    { outcome: "Negative", weight: "0.4" },
    { outcome: "Positive", weight: "14.5" },
    { outcome: "Positive", weight: "11.6" },
    { outcome: "Positive", weight: "9" },
    { outcome: "Positive", weight: "8" },
    { outcome: "Positive", weight: "8" },
    { outcome: "Positive", weight: "8.2" },
    { outcome: "Positive", weight: "6" },
    { outcome: "Positive", weight: "6" },
  ];

  // Chart initialization
  const svg = d3.select("#beeswarm-chart");
  const width = svg.attr("width");
  const height = svg.attr("height");

  const xScale = d3.scaleLinear().domain([0, 15]).range([50, width - 50]);
  // Updated colors to align with styles.css
  const zScale = d3.scaleOrdinal().domain(["Negative", "Positive"]).range(["#7e93ee", "#ffaa33"]);

  let TP = 0,
    FP = 0,
    TN = 0,
    FN = 0;
  let decisionBoundary = 7.5;

  const simulation = d3
    .forceSimulation(scatterData)
    .force("x", d3.forceX((d) => xScale(+d.weight)).strength(0.95))
    .force("y", d3.forceY(height / 2).strength(0.075))
    .force("collide", d3.forceCollide(11 + 2))
    .stop();

  for (let i = 0; i < 120; i++) simulation.tick();

  const nodes = svg
    .selectAll(".node")
    .data(scatterData)
    .enter()
    .append("g")
    .attr("class", "node");

  nodes
    .append("circle")
    .attr("r", 11)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("fill", (d) => zScale(d.outcome))
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  nodes
    .append("text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y + 4)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text((d) => (d.outcome === "Positive" ? "+" : "-"));

  const boundary = svg
    .append("g")
    .attr("class", "decision-boundary")
    .attr("transform", `translate(${xScale(decisionBoundary)}, 0)`);

  boundary
    .append("rect")
    .attr("height", height - 20)
    .attr("width", 12)
    .attr("fill", "#232f3e") // Use --squid-ink
    .attr("stroke", "whitesmoke");

  // Add prediction labels at the bottom
  boundary
    .append("text")
    .attr("x", 20)
    .attr("y", height - 10)
    .attr("text-anchor", "start")
    .text("预测阳性");

  boundary
    .append("text")
    .attr("x", -20)
    .attr("y", height - 10)
    .attr("text-anchor", "end")
    .text("预测阴性");

  function updateConfusionMatrix() {
    TP = scatterData.filter((d) => d.outcome === "Positive" && +d.weight >= decisionBoundary).length;
    FP = scatterData.filter((d) => d.outcome === "Negative" && +d.weight >= decisionBoundary).length;
    TN = scatterData.filter((d) => d.outcome === "Negative" && +d.weight < decisionBoundary).length;
    FN = scatterData.filter((d) => d.outcome === "Positive" && +d.weight < decisionBoundary).length;

    // Update confusion matrix
    d3.select("#tp").text(`TP: ${TP}`);
    d3.select("#fp").text(`FP: ${FP}`);
    d3.select("#tn").text(`TN: ${TN}`);
    d3.select("#fn").text(`FN: ${FN}`);

    // Update metrics
    const accuracy = ((TP + TN) / (TP + TN + FP + FN)) * 100;
    const precision = TP / (TP + FP) * 100;
    const recall = TP / (TP + FN) * 100;

    d3.select("#accuracy-value").text(`${isNaN(accuracy) ? 0 : accuracy.toFixed(0)}%`);
    d3.select("#precision-value").text(`${isNaN(precision) ? 0 : precision.toFixed(0)}%`);
    d3.select("#recall-value").text(`${isNaN(recall) ? 0 : recall.toFixed(0)}%`);
  }

  updateConfusionMatrix();

  boundary.call(
    d3
      .drag()
      .on("drag", (event) => {
        const x = Math.max(50, Math.min(width - 50, event.x));
        decisionBoundary = xScale.invert(x);
        boundary.attr("transform", `translate(${x}, 0)`);
        updateConfusionMatrix();
      })
  );
}