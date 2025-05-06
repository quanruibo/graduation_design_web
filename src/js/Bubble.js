import { select, selectAll } from "d3-selection";
import { transition } from "d3-transition";
import { LogisticRegression } from "./LogisticRegression.js";
import { animals } from "./data.js";
import { trainColor, testColor, validationColor } from "./colors.js";
import { extent, max } from "d3-array";
import {
  forceSimulation,
  forceCenter,
  forceX,
  forceY,
  forceManyBody,
  forceCollide,
} from "d3-force";
import { polygonCentroid, polygonHull } from "d3-polygon";
import { line } from "d3-shape";
import { drag } from "d3-drag";
import { easeBackInOut } from "d3-ease";
import { format } from "d3-format";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { catNose, catHead, catEar, dogNose, dogHead, dogEar } from "./animalShapes.js";

export class Bubble {
  constructor(opts) {
    this.chartContainer = opts.chartContainer;
    this.table = opts.table;

    let windowWidth = window.innerWidth;

    this.MARGIN = {
      TOP: window.innerHeight * 0,
      BOTTOM: window.innerHeight * 0,
      LEFT: window.innerWidth * 0,
      RIGHT: window.innerWidth * 0,
    };
    this.WIDTH = window.innerWidth < 950 ? windowWidth / 1.15 : windowWidth / 1.75;
    this.HEIGHT = window.innerWidth < 950 ? window.innerHeight / 1.8 : window.innerHeight / 1.95;

    this.mainGroups = ["train", "test", "validation"];
    this.showGroups = ["train"];
    this.currentGroup = "pretrain";
    this.current = "intro";
    this.yGroupHeight = this.HEIGHT / 4.6;
    this.yLabelHeight = 45;
    this.iconScale = window.innerWidth >= 950 ? 0.3 : 0.26;
    this.collideRadius = window.innerWidth >= 950 ? 16 : 12.5;
    this.radius = 7;
    this.padding = 9;
    this.cluster_padding = 10;
    this.strength = 0.2;

    this.svg = select(this.chartContainer)
      .append("svg")
      .attr("id", `bubble-svg`)
      .attr("width", this.WIDTH + this.MARGIN.LEFT + this.MARGIN.RIGHT)
      .attr("height", this.HEIGHT + this.MARGIN.TOP + this.MARGIN.BOTTOM);

    this.chartG = this.svg
      .append("g")
      .attr("id", `bubble-g`)
      .attr("transform", `translate(${this.MARGIN.LEFT}, ${this.MARGIN.TOP})`);

    this.data = animals;
    this.X = animals.map((d) => ({
      weight: d.weight,
      fluffiness: d.fluffiness,
    }));

    this.model = new LogisticRegression({
      iterations: 10000,
      learningRate: 0.00025,
      startFeature: "weight",
    });

    this.currentFeature = this.model.startFeature;

    this.featureMap = {
      weight: "体重",
      fluffiness: "蓬松度",
      both: "两者",
      neither: "无",
    };

    this.datasetMap = {
      train: "训练",
      test: "测试",
      validation: "验证",
      pretrain: "预训练",
    };

    this.fluffScaleX = scaleLinear()
      .domain(extent(this.data, (d) => +d.fluffiness))
      .range([50, this.WIDTH - 50]);

    this.weightScaleX = scaleLinear()
      .domain(extent(this.data, (d) => +d.weight))
      .range([50, this.WIDTH - 50]);

    this.fluffScaleY = scaleLinear()
      .domain(extent(this.data, (d) => +d.fluffiness))
      .range([50, this.HEIGHT - 100]);

    this.weightScaleY = scaleLinear()
      .domain(extent(this.data, (d) => +d.weight))
      .range([50, this.HEIGHT - 100]);

    this.colorScale = scaleOrdinal()
      .domain(["train", "test", "validation"])
      .range([trainColor, testColor, validationColor]);

    this.groups = {
      intro: { x: this.WIDTH / 2, y: this.HEIGHT / 2, fullname: "Intro" },
      test: { x: this.WIDTH / 5.5, y: this.yGroupHeight, fullname: "测试" },
      train: { x: this.WIDTH / 2, y: this.yGroupHeight, fullname: "训练" },
      validation: { x: this.WIDTH / 1.2, y: this.yGroupHeight, fullname: "验证" },
      offscreen: { x: this.WIDTH / 2, y: -400, fullname: "offscreen" },
    };

    this.lineSeparator = this.chartG
      .append("line")
      .attr("id", "line-x-dimension")
      .attr("stroke", "black")
      .style("stroke-width", 2)
      .style("pointer-events", "none")
      .attr("vector-effect", "non-scaling-stroke")
      .style("opacity", 0.4);

    this.formatData();
    this.addLabels();
  }

  formatData() {
    const self = this;
    this.nodes = this.data.map((d) => ({
      id: "node" + d.id,
      fluffiness: d.fluffiness,
      weight: d.weight,
      animal: d.animal,
      class: d.class,
      x: self.WIDTH / 2 + Math.random(),
      y: self.HEIGHT / 2 + Math.random(),
      r: self.radius,
      group: d.class,
      stages: d.class,
    }));

    // 替换 d3-collection 的 keys 方法
    this.labelData = Object.keys(this.groups).map((d) => ({ name: d }));
    this.addAnimals();
    this.runForce();
    this.drawHull();
  }

  moveCenter() {
    const self = this;
    this.simulation
      .force("center", null)
      .force("x", (d) => forceX(d.x))
      .force("y", (d) => forceY(d.y))
      .force("charge", forceManyBody())
      .force("collide", forceCollide(this.collideRadius))
      .alpha(0.02)
      .alphaDecay(0)
      .on("tick", ticked);

    const petDims = select("path.animal-head").node().getBBox();

    function ticked() {
      const l = 0.1 * self.strength;
      self.nodes.forEach((d, i) => {
        if (!self.showGroups.includes(d.group)) {
          d.vx -= (d.x - self.groups["offscreen"].x) * l;
          d.vy -= (d.y - self.groups["offscreen"].y) * l;
        } else {
          d.vx -= (d.x - self.groups["intro"].x) * l;
          d.vy -= (d.y - self.groups["intro"].y) * l;
        }
      });
      self.bubbles.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

      const padding = 20;
      const inverseIconScale = 0.25;
      let hullCentroid;
      let hullMinY;
      self.hullPath.attr("d", (g) => {
        let petCoords = [];
        self.nodes
          .filter((d) => self.showGroups.includes(d.group))
          .map((d) => {
            const centeredX = d.x + petDims.width * inverseIconScale;
            const centeredy = d.y + petDims.height * inverseIconScale;
            petCoords.push([centeredX - padding, centeredy - padding]);
            petCoords.push([centeredX - padding, centeredy + padding]);
            petCoords.push([centeredX + padding, centeredy - padding]);
            petCoords.push([centeredX + padding, centeredy + padding]);
          });

        self.convexHullData = polygonHull(petCoords);
        self.convexHullData.push(self.convexHullData[0]);
        hullMinY = max(self.convexHullData, (d) => d[1]);
        hullCentroid = polygonCentroid(self.convexHullData);
        return line()(self.convexHullData);
      });
      self.hullText
        .attr("opacity", 1)
        .attr("x", hullCentroid[0])
        .attr("y", hullMinY)
        .attr("dy", "1.5rem");
    }
  }

  runForce() {
    const self = this;

    this.simulation = forceSimulation(this.nodes)
      .force("x", (d) => forceX(d.x))
      .force("y", (d) => forceY(d.y))
      .force("charge", forceManyBody())
      .force("center", forceCenter(this.WIDTH / 2, this.HEIGHT / 2))
      .force("collide", forceCollide(this.collideRadius))
      .alpha(0.09)
      .alphaDecay(0);

    function ticked() {
      if (self.current === "intro") {
        const l = 0.1 * self.strength;
        self.nodes.forEach((d, i) => {
          d.vx -= (d.x - self.groups["intro"].x) * l;
          d.vy -= (d.y - self.groups["intro"].y) * l;
        });
      } else if (self.current === "groups") {
        const l = 0.1 * self.strength;
        self.nodes.forEach((d, i) => {
          d.vx -= (d.x - self.groups[d.group].x) * l;
          d.vy -= (d.y - self.groups[d.group].y) * l;
        });
      } else if (self.current === "bee") {
        const l = 0.1 * self.strength;
        self.nodes.forEach((d, i) => {
          d.vx -= self.fluffScaleX(d.fluffiness) * l;
          d.vy -= (d.y - self.HEIGHT / 2) * l;
        });
      }
      self.bubbles.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    }

    this.simulation.on("tick", ticked);

    this.drag = (simulation) => {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        if (self.currentGroup === "pretrain") {
          d.fx = null;
          d.fy = null;
        } else {
          let scale = self.currentFeature === "weight" ? self.weightScaleX : self.fluffScaleX;
          const currentNode = select(this)._groups[0][0].__data__;
          if (self.currentFeature === "both") {
            currentNode["fluffiness"] = self.fluffScaleX.invert(event.x);
            currentNode["weight"] = self.weightScaleY.invert(event.y);
          } else {
            currentNode[self.currentFeature] = scale.invert(event.x);
          }
          const moveBoundary = currentNode["group"] === "train";
          self.updateDecisionBoundary(self.currentFeature, moveBoundary);
          if (self.currentGroup === "train-impact") {
            self.updateTrainImpact(currentNode);
          }
        }
      }

      return drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    };
    self.bubbles.call(self.drag(self.simulation));
  }

  drawDecisionBoundary() {
    let scale = this.currentFeature === "weight" ? this.weightScaleX : this.fluffScaleX;

    this.decisionBoundaryLine
      .style("opacity", 1)
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", this.HEIGHT / 5)
      .attr("y2", this.HEIGHT / 2 + (this.HEIGHT / 2 - this.HEIGHT / 5))
      .transition()
      .duration(1200)
      .ease(easeBackInOut)
      .attr("x1", scale(this.model.decisionBoundary))
      .attr("x2", scale(this.model.decisionBoundary))
      .attr("y1", this.HEIGHT / 5)
      .attr("y2", this.HEIGHT / 2 + (this.HEIGHT / 2 - this.HEIGHT / 5));

    this.updateDecisionBoundary(this.currentFeature, true);
  }

  colorAnimals(display) {
    const colorApplication = display === "on" ? (d) => this.colorScale(d.group) : "black";
    const animalClasses = [
      ".animal-ear",
      ".animal-head",
      ".animal-nose",
      ".animal-eye1",
      ".animal-eye2",
      ".animal-eye3",
      ".animal-eye4",
    ];
    animalClasses.forEach((d) => {
      selectAll(d).attr("fill", colorApplication);
    });
  }

  addAnimals() {
    const self = this;
    this.bubbleG = this.svg.append("g").selectAll(".bubble-g").data(this.nodes);
    this.bubbles = this.bubbleG
      .enter()
      .append("g")
      .attr("class", "bubble-animal")
      .attr("group", (d) => d.class);

    selectAll(".bubble-animal").each(function (d, i) {
      const animal = d.animal;
      select(this)
        .append("path")
        .attr("d", animal === "cat" ? catEar : dogEar)
        .attr("class", "animal-ear")
        .attr("transform", `translate(-12,0) scale(${self.iconScale}, ${self.iconScale})`);
      select(this)
        .append("path")
        .attr("d", animal === "cat" ? catHead : dogHead)
        .attr("class", "animal-head")
        .attr("transform", `translate(-12,0) scale(${self.iconScale}, ${self.iconScale})`);
      select(this)
        .append("path")
        .attr("d", animal === "cat" ? catNose : dogNose)
        .attr("class", "animal-nose")
        .attr("transform", `translate(-12,0) scale(${self.iconScale}, ${self.iconScale})`);
      select(this)
        .append("circle")
        .attr("cx", 66.599)
        .attr("cy", 49.639)
        .attr("r", 4.397)
        .attr("class", (d) => eyeAnimations(i))
        .attr("transform", `translate(-12,0) scale(${self.iconScale}, ${self.iconScale})`);
      select(this)
        .append("circle")
        .attr("cx", 35.735)
        .attr("cy", 49.639)
        .attr("r", 4.397)
        .attr("class", (d) => eyeAnimations(i))
        .attr("transform", `translate(-12,0) scale(${self.iconScale}, ${self.iconScale})`);
    });
  }

  addLabels() {
    const borderMarginX = 12;
    const borderMarginY = 5;
    const self = this;

    this.labels = this.svg
      .selectAll(".bubble-label")
      .data(this.labelData.filter((d) => self.mainGroups.includes(d.name)))
      .join("text")
      .attr("class", "bubble-label")
      .attr("text-anchor", "middle")
      .attr("x", (d) => this.groups[d.name].x)
      .attr("y", (d) => this.yLabelHeight)
      .text((d) => this.groups[d.name].fullname)
      .attr("visibility", "hidden");

    this.svg
      .selectAll(".bubble-label")
      .join(this.labelData)
      .each(function (d) {
        d.bbox = this.getBBox();
      });

    this.labelsRect = this.svg
      .selectAll(".bubble-rect")
      .data(this.labelData.filter((d) => self.mainGroups.includes(d.name)))
      .join("rect")
      .attr("class", "bubble-rect")
      .attr("text-anchor", "middle")
      .attr("x", (d) => this.groups[d.name].x - d.bbox.width * 0.5)
      .attr("y", (d) => this.yLabelHeight)
      .attr("width", (d) => d.bbox.width + 2 * borderMarginX)
      .attr("height", (d) => d.bbox.height + 2 * borderMarginY)
      .attr("transform", (d) => `translate(-${borderMarginX}, -${d.bbox.height * 0.8 + borderMarginY})`)
      .attr("visibility", "hidden")
      .attr("stroke", (d) => self.colorScale(d.name));

    this.svg.selectAll(".bubble-label").raise();

    this.decisionBoundaryLine = this.chartG
      .append("line")
      .attr("id", "line-decision-boundary")
      .attr("stroke", "black")
      .style("stroke-width", 8)
      .style("pointer-events", "none")
      .attr("vector-effect", "non-scaling-stroke");
  }

  drawHull() {
    this.hullG = this.svg.append("g").attr("id", "hull-g");
    this.hullPath = this.hullG
      .append("path")
      .attr("id", "hull-path")
      .style("stroke", "black")
      .style("fill", "none")
      .style("stroke-width", 5)
      .style("pointer-events", "none")
      .style("stroke-linejoin", "round");
    this.hullText = this.hullG
      .append("text")
      .attr("id", "hull-text")
      .text("多数投票: 猫")
      .attr("text-anchor", "middle")
      .attr("opacity", 0);
    this.hullRect = this.hullG
      .append("rect")
      .attr("text-anchor", "middle")
      .attr("width", 50 + 2 * 12)
      .attr("height", 20 + 2 * 5)
      .attr("transform", `translate(-${12}, -${20 * 0.8 + 5})`)
      .attr("visibility", "hidden")
      .attr("stroke", "black");
  }

  drawAxesLabels(feature) {
    selectAll(".axes-text").remove();
    if (feature === "neither") return;
    if (feature === "both") {
      this.svg
        .append("text")
        .attr("class", "axes-text")
        .attr("id", "x-axis-text")
        .text("蓬松度")
        .attr("x", this.WIDTH / 2)
        .attr("y", this.HEIGHT * 0.95)
        .attr("text-anchor", "middle");
      this.svg
        .append("text")
        .attr("class", "axes-text")
        .attr("id", "y-axis-text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("x", -this.HEIGHT / 2)
        .attr("dy", "1rem")
        .style("text-anchor", "middle")
        .text("体重");
    } else {
      const upperCaseFeature = feature === "weight" ? "体重" : "蓬松度";
      this.svg
        .append("text")
        .attr("class", "axes-text")
        .text(upperCaseFeature)
        .attr("x", this.WIDTH / 2)
        .attr("y", this.HEIGHT * 0.95)
        .attr("text-anchor", "middle");
    }
  }

  updateDecisionBoundary(feature, move) {
    this.currentFeature = feature;
    if (move) {
      if (feature === "both") {
        select("#hull-g").style("opacity", 0);
        const decisionLine = (x, weights) => (-1 * (weights[1] / weights[2]) * x - weights[0] / weights[2]);
        this.model.fit(feature, this.nodes);
        this.moveScatter();
        const [dvX1, dvX2] = extent(this.data, (d) => +d.fluffiness);
        const y1 = decisionLine(dvX1, this.model.weights);
        const y2 = decisionLine(dvX2, this.model.weights);
        this.lineSeparator.style("opacity", 0);
        this.decisionBoundaryLine.style("opacity", 1);
        this.decisionBoundaryLine
          .transition()
          .duration(1200)
          .ease(easeBackInOut)
          .attr("x1", this.fluffScaleX(dvX1))
          .attr("x2", this.fluffScaleX(dvX2))
          .attr("y1", this.weightScaleY(y1))
          .attr("y2", this.weightScaleY(y2));
      } else if (feature === "neither") {
        select("#hull-g").style("opacity", 1);
        this.hideLines();
        this.moveCenter();
      } else {
        select("#hull-g").style("opacity", 0);
        this.showLines();
        this.model.fit(feature, this.nodes);
        let scale = feature === "weight" ? this.weightScaleX : this.fluffScaleX;
        this.moveBee();
        this.decisionBoundaryLine
          .attr("opacity", 1)
          .transition()
          .duration(1200)
          .ease(easeBackInOut)
          .attr("x1", scale(this.model.decisionBoundary))
          .attr("x2", scale(this.model.decisionBoundary))
          .attr("y1", this.HEIGHT / 5)
          .attr("y2", this.HEIGHT / 2 + (this.HEIGHT / 2 - this.HEIGHT / 5));
        this.lineSeparator.style("opacity", 1);
      }
    } else {
      if (feature === "both") {
        select("#hull-g").style("opacity", 0);
        this.moveScatter();
      } else if (feature === "neither") {
        this.hideLines();
        this.moveCenter();
      } else {
        select("#hull-g").style("opacity", 0);
        this.moveBee();
      }
    }
    this.calculatePerformance();
  }

  calculatePerformance() {
    const self = this;
    const performance = {
      dataset: "",
      accuracy: 0,
      "cat right": 0,
      "cat wrong": 0,
      "dog right": 0,
      "dog wrong": 0,
    };
    performance["dataset"] = this.datasetMap[this.currentGroup];
    performance["feature"] = this.featureMap[this.currentFeature];

    const modelWeights = this.model.weights;
    let z;
    if (this.currentFeature === "both") {
      z = (d) => modelWeights[0] + modelWeights[1] * d["fluffiness"] + modelWeights[2] * d["weight"];
    } else if (this.currentFeature === "neither") {
      z = () => -1;
    } else {
      z = (d) => modelWeights[0] + modelWeights[1] * d[self.currentFeature];
    }

    const filteredNodes = this.nodes.filter((d) => d.class === this.currentGroup);

    filteredNodes.forEach((d) => {
      const zOutput = z(d);
      const pred = zOutput <= 0 ? "cat" : "dog";
      d.pred = pred;
      if (d.pred === d.animal) {
        performance["accuracy"] += 1;
        if (d.animal === "cat") performance["cat right"] += 1;
        else performance["dog right"] += 1;
      } else {
        if (d.animal === "cat") performance["cat wrong"] += 1;
        else performance["dog wrong"] += 1;
      }
    });

    performance["accuracy"] /= filteredNodes.length;
    performance["accuracy"] = format(".1%")(performance["accuracy"]);

    if (this.currentGroup === "test") {
      select("#accuracy-value").text(performance["accuracy"]);
    }

    if (["test", "validation"].includes(this.currentGroup)) {
      this.table.updateTable(performance);
    }

    return performance;
  }

  moveNodes() {
    const self = this;
    this.simulation
      .force("center", null)
      .force("x", (d) => forceX(d.x))
      .force("y", (d) => forceY(d.y))
      .force("charge", forceManyBody())
      .force("collide", forceCollide(this.collideRadius))
      .alpha(0.09)
      .alphaDecay(0);

    self.current = "groups";

    function ticked() {
      if (self.current === "intro") {
        const l = 0.1 * self.strength;
        self.nodes.forEach((d, i) => {
          d.vx -= (d.x - self.groups["intro"].x) * l;
          d.vy -= (d.y - self.groups["intro"].y) * l;
        });
      } else if (self.current === "groups") {
        const l = 0.1 * self.strength;
        self.nodes.forEach((d, i) => {
          d.vx -= (d.x - self.groups[d.group].x) * l;
          d.vy -= (d.y - self.groups[d.group].y) * l;
        });
      }
      self.bubbles.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    }

    this.simulation.on("tick", ticked);
  }

  hideNonTrainAnimals() {
    const trans = transition().duration(1200);
    this.bubbles
      .filter((d) => d.group !== "train")
      .selectAll("path")
      .transition(trans)
      .attr("transform", "scale(0,0)");
    this.bubbles
      .filter((d) => d.group !== "train")
      .selectAll("circle")
      .transition(trans)
      .attr("transform", "scale(0,0)");
  }

  hideNonValidationAnimals() {
    const trans = transition();
    this.bubbles
      .filter((d) => d.group !== "validation")
      .selectAll("path")
      .transition(trans)
      .attr("transform", "scale(0,0)");
    this.bubbles
      .filter((d) => d.group !== "validation")
      .selectAll("circle")
      .transition(trans)
      .attr("transform", "scale(0,0)");
    this.labels
      .filter((d, i) => [0, 1].includes(i))
      .transition(trans)
      .attr("y", -this.HEIGHT / 5);
    this.labelsRect
      .filter((d, i) => [0, 1].includes(i))
      .transition(trans)
      .attr("y", -this.HEIGHT / 5);
  }

  hideLines() {
    this.lineSeparator.transition().attr("x2", 0);
    this.lineSeparator.lower();
    this.decisionBoundaryLine.style("opacity", 0);
  }

  showLines() {
    this.lineSeparator.transition().attr("x2", this.WIDTH);
    this.lineSeparator.lower();
    this.decisionBoundaryLine.style("opacity", 1);
  }

  drawHorizontalLine() {
    if (this.currentFeature === "weight" || this.currentFeature === "fluffiness") {
      if (this.lineSeparator.attr("x2") < this.WIDTH) {
        this.lineSeparator
          .attr("x1", 0)
          .attr("y1", 10 + this.HEIGHT / 2)
          .attr("x2", 0)
          .attr("y2", 10 + this.HEIGHT / 2)
          .transition()
          .attr("x2", this.WIDTH);
        this.lineSeparator.lower();
      }
    }
  }

  addValidationData() {
    this.bubbles
      .filter((d) => d.group !== "test")
      .selectAll("path")
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
    this.bubbles
      .filter((d) => d.group !== "test")
      .selectAll("circle")
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
    this.labels
      .filter((d, i) => [0, 2].includes(i))
      .transition()
      .attr("y", (d) => this.yLabelHeight);
    this.labelsRect
      .filter((d, i) => [0, 2].includes(i))
      .transition()
      .attr("y", (d) => this.yLabelHeight);
  }

  showAnimals() {
    const self = this;
    this.nonShowGroups = this.mainGroups.filter((x) => !this.showGroups.includes(x));
    this.bubbles
      .filter((d) => self.showGroups.includes(d.group))
      .selectAll("path")
      .attr("opacity", 1)
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
    this.bubbles
      .filter((d) => self.showGroups.includes(d.group))
      .selectAll("circle")
      .attr("opacity", 1)
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
    this.bubbles
      .filter((d) => self.nonShowGroups.includes(d.group))
      .selectAll("path")
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
    this.bubbles
      .filter((d) => self.nonShowGroups.includes(d.group))
      .selectAll("circle")
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
  }

  showNonTrainAnimals() {
    const nonTrainSelector = (d) => d.group !== "train";
    this.bubbles
      .filter(nonTrainSelector)
      .selectAll("path")
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
    this.bubbles
      .filter(nonTrainSelector)
      .selectAll("circle")
      .transition()
      .attr("transform", `scale(${this.iconScale}, ${this.iconScale})`);
  }

  showLabels(subset) {
    const labelSubset = subset === "all" ? [0, 1, 2] : [1];
    const trans = transition().duration(1200);
    this.labels
      .filter((d, i) => labelSubset.includes(i))
      .transition(trans)
      .attr("visibility", "visible")
      .attr("y", (d) => this.yLabelHeight);
    this.labelsRect
      .filter((d, i) => labelSubset.includes(i))
      .transition(trans)
      .attr("visibility", "visible")
      .attr("y", (d) => this.yLabelHeight);
  }

  hideLabels(subset) {
    const labelSubset = subset === "all" ? [0, 1, 2] : [0, 2];
    const trans = transition().duration(1200);
    this.labels
      .filter((d, i) => labelSubset.includes(i))
      .transition(trans)
      .attr("y", -this.HEIGHT / 5);
    this.labelsRect
      .filter((d, i) => labelSubset.includes(i))
      .transition(trans)
      .attr("y", -this.HEIGHT / 5);
  }

  updateDataPosition() {
    if (this.currentFeature === "both") {
      this.moveScatter();
    } else if (this.currentFeature === "neither") {
      this.moveCenter();
    } else {
      this.moveBee();
    }
    this.updateDecisionBoundary(this.currentFeature, true);
  }

  trackCurrentGroups(group) {
    this.currentGroup = group;
    if (group === "train") {
      this.showGroups = ["train"];
    } else if (group === "validation") {
      this.showGroups = ["train", "validation"];
    } else if (group === "test") {
      this.showGroups = ["train", "test", "validation"];
    }
    this.nonShowGroups = this.mainGroups.filter((x) => !this.showGroups.includes(x));
  }

  moveScatter() {
    const self = this;
    this.simulation
      .alpha(0.012)
      .force("center", null)
      .force("collide", forceCollide(self.collideRadius))
      .force(
        "x",
        forceX((d) => (self.showGroups.includes(d.group) ? self.fluffScaleX(d["fluffiness"]) : d.x)).strength(2)
      )
      .force(
        "y",
        forceY((d) => (self.showGroups.includes(d.group) ? self.weightScaleY(d["weight"]) : d.y)).strength(4)
      )
      .on("tick", changeNetwork);

    function changeNetwork() {
      self.bubbles
        .filter((d) => self.showGroups.includes(d.group))
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`);
      self.bubbles
        .filter((d) => self.nonShowGroups.includes(d.group))
        .attr("transform", function (d) {
          const l = 0.01 * self.strength;
          self.nodes
            .filter((d) => self.nonShowGroups.includes(d.group))
            .forEach((d, i) => {
              d.vx -= (d.x - self.groups["offscreen"].x) * l;
              d.vy -= (d.y - self.groups["offscreen"].y) * l;
            });
          return `translate(${d.x}, ${d.y})`;
        });
    }
  }

  moveBee() {
    const self = this;
    if (this.currentFeature === "neither") this.currentFeature = "weight";
    let scale = this.currentFeature === "weight" ? this.weightScaleX : this.fluffScaleX;

    this.simulation
      .alpha(0.012)
      .force("center", null)
      .force("collide", forceCollide(14))
      .force(
        "x",
        forceX((d) => (self.showGroups.includes(d.group) ? scale(d[this.currentFeature]) : d.x)).strength(2)
      )
      .force("y", forceY(self.HEIGHT / 2).strength(4))
      .on("tick", changeNetwork);

    function changeNetwork() {
      self.bubbles
        .filter((d) => self.showGroups.includes(d.group))
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`);
      self.bubbles
        .filter((d) => self.nonShowGroups.includes(d.group))
        .attr("transform", function (d) {
          const l = 0.01 * self.strength;
          self.nodes
            .filter((d) => self.nonShowGroups.includes(d.group))
            .forEach((d, i) => {
              d.vx -= (d.x - self.groups["offscreen"].x) * l;
              d.vy -= (d.y - self.groups["offscreen"].y) * l;
            });
          return `translate(${d.x}, ${d.y})`;
        });
    }
  }

  moveBack() {
    this.current = "intro";
    this.labels.attr("visibility", "hidden");
    this.labelsRect.attr("visibility", "hidden");
  }

  updateTrainImpact(node) {
    if (this.onTrainImpactUpdate) {
      this.onTrainImpactUpdate(this.nodes, this.currentFeature);
    }
    this.calculatePerformance();
  }

  redraw() {
    const windowWidth = window.innerWidth;
    const self = this;
    this.MARGIN = {
      TOP: window.innerHeight * 0,
      BOTTOM: window.innerHeight * 0,
      LEFT: window.innerWidth * 0,
      RIGHT: window.innerWidth * 0,
    };
    this.WIDTH = window.innerWidth < 950 ? windowWidth / 1.15 : windowWidth / 1.75;
    this.HEIGHT = window.innerWidth < 950 ? window.innerHeight / 1.8 : window.innerHeight / 1.95;

    this.svg
      .attr("width", this.WIDTH + this.MARGIN.LEFT + this.MARGIN.RIGHT)
      .attr("height", this.HEIGHT + this.MARGIN.TOP + this.MARGIN.BOTTOM);

    this.groups = {
      intro: { x: this.WIDTH / 2, y: this.HEIGHT / 2, fullname: "Intro" },
      test: { x: this.WIDTH / 5.5, y: this.yGroupHeight, fullname: "测试" },
      train: { x: this.WIDTH / 2, y: this.yGroupHeight, fullname: "训练" },
      validation: { x: this.WIDTH / 1.2, y: this.yGroupHeight, fullname: "验证" },
      offscreen: { x: this.WIDTH / 2, y: -window.innerHeight * 0.8, fullname: "offscreen" },
    };

    this.fluffScaleX.range([50, this.WIDTH - 50]);
    this.weightScaleX.range([50, this.WIDTH - 50]);
    this.fluffScaleY.range([50, this.HEIGHT - 100]);
    this.weightScaleY.range([50, this.HEIGHT - 100]);

    if (this.currentGroup !== "pretrain") {
      self.updateDecisionBoundary(self.currentFeature, true);
      select("#x-axis-text")
        .transition()
        .attr("x", this.WIDTH / 2)
        .attr("y", this.HEIGHT * 0.95);
      select("#y-axis-text")
        .transition()
        .attr("x", -this.HEIGHT / 2);
    }
    this.labels.transition().attr("x", (d) => this.groups[d.name].x);
    this.labelsRect.transition().attr("x", (d) => this.groups[d.name].x - d.bbox.width * 0.5);
  }
}

function eyeAnimations(i) {
  if (i % 5 === 0) return "animal-eye1";
  else if (i % 3 === 0) return "animal-eye2";
  else if (i % 2 === 0) return "animal-eye3";
  else return "animal-eye4";
}