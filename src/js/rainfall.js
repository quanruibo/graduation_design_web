import * as d3 from "d3"; // 导入完整D3模块

export default function rainfall() {
  // 初始数据：北京的温度（摄氏度）和降雨量（毫米）
  let mseData = [
    { temp: 0, rain: 1.0, temp1: 0, rain1: 1.0, temp2: 1, rain2: 1.2, temp3: -1, rain3: 0.8 },
    { temp: 10, rain: 2.0, temp1: 10, rain1: 2.0, temp2: 11, rain2: 2.3, temp3: 9, rain3: 1.7 },
    { temp: 20, rain: 4.0, temp1: 20, rain1: 4.0, temp2: 22, rain2: 4.5, temp3: 18, rain3: 3.5 },
    { temp: 25, rain: 5.0, temp1: 25, rain1: 5.0, temp2: 27, rain2: 5.5, temp3: 23, rain3: 4.5 },
    { temp: 30, rain: 6.0, temp1: 30, rain1: 6.0, temp2: 32, rain2: 6.5, temp3: 28, rain3: 5.5 },
  ];

  // 状态
  let gdBias = 0.1;
  let gdWeight = 0.1;
  let gdIteration = 0;
  let gdError = 0;
  let gdErrors = [{ iteration: 0, error: 0 }];
  let shuffleIteration = 1;
  let autoRunInterval = null;

  // 图表配置
  const width = 500;
  const height = 300;
  const margin = { top: 12, bottom: 18, left: 40, right: 30 };

  // 比例尺
  const xScaleScatter = d3.scaleLinear().range([margin.left, width - margin.right]);
  const yScaleScatter = d3.scaleLinear().range([height - margin.bottom, margin.top]);
  const xScaleError = d3.scaleLinear().range([margin.left, width - margin.right]);
  const yScaleError = d3.scaleLinear().range([height - margin.bottom, margin.top]);

  const regressionPath = d3.line()
    .x((d) => xScaleScatter(d.temp))
    .y((d) => yScaleScatter(d.y));

  const errorPath = d3.line()
    .x((d) => xScaleError(d.iteration))
    .y((d) => yScaleError(d.error));

  // 初始化散点图
  const scatterSvg = d3
    .select("#scatter-chart")
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("width", width)
    .attr("height", height + margin.top + margin.bottom);

  // 初始化误差图
  const errorSvg = d3
    .select("#error-chart")
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("width", width)
    .attr("height", height + margin.top + margin.bottom);

  // 添加坐标轴和网格线
  function setupAxes(svg, xScale, yScale, xLabel, yLabel) {
    svg.selectAll(".grid-line").remove();
    svg.selectAll(".axis-line").remove();
    svg.selectAll(".axis-text").remove();
    svg.selectAll(".axis-label").remove();

    svg
      .selectAll(".x-tick")
      .data(xScale.ticks())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${xScale(d)}, ${height - margin.bottom})`)
      .append("line")
      .attr("class", "grid-line")
      .attr("y2", -height + margin.bottom + margin.top);

    svg
      .selectAll(".y-tick")
      .data(yScale.ticks())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${margin.left}, ${yScale(d)})`)
      .append("line")
      .attr("class", "grid-line")
      .attr("x2", width - margin.left - margin.right);

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
      .append("text")
      .attr("class", "axis-label")
      .attr("x", (width + margin.left) / 2)
      .attr("y", height + margin.bottom - 5)
      .attr("text-anchor", "middle")
      .text(xLabel);

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", -height / 2)
      .attr("y", margin.left / 4.8)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .text(yLabel);
  }

  // 显示反馈提示
  function showFeedback(message) {
    const feedbackDiv = document.getElementById("feedback");
    if (feedbackDiv) {
      feedbackDiv.innerHTML = `<p class="feedback">${message}</p>`;
      setTimeout(() => (feedbackDiv.innerHTML = ""), 2000);
    } else {
      console.warn("Feedback element not found");
    }
  }

  // 更新图表
  function updateCharts() {
    if (!scatterSvg.node() || !errorSvg.node()) {
      console.error("SVG elements not found for scatter or error chart");
      return;
    }

    const dataset = mseData.map((d) => {
      const temp = d[`temp${shuffleIteration}`] !== undefined ? d[`temp${shuffleIteration}`] : d.temp;
      const rain = d[`rain${shuffleIteration}`] !== undefined ? d[`rain${shuffleIteration}`] : d.rain;
      return {
        temp: temp,
        y: gdBias + gdWeight * temp,
        rain: rain,
      };
    });

    // 更新误差
    const errors = dataset.map((d) => (d.rain - (gdWeight * d.temp + gdBias)) ** 2);
    gdError = errors.reduce((a, b) => a + b, 0) / errors.length;
    gdErrors.push({ iteration: gdIteration, error: gdError });

    // 更新散点图
    xScaleScatter.domain([d3.min(dataset, (d) => d.temp) - 5, d3.max(dataset, (d) => d.temp) + 5]);
    yScaleScatter.domain([d3.min(dataset, (d) => d.rain) - 2, d3.max(dataset, (d) => d.rain) + 2]);
    setupAxes(scatterSvg, xScaleScatter, yScaleScatter, "温度 (摄氏度)", "雨量 (毫米)");

    scatterSvg.selectAll(".regression-line").remove();
    scatterSvg
      .append("path")
      .attr("class", "regression-line")
      .attr("d", regressionPath(dataset));

    scatterSvg
      .selectAll(".regression-circle")
      .data(dataset)
      .join("circle")
      .attr("class", "regression-circle")
      .attr("r", 4.5)
      .attr("cx", (d) => xScaleScatter(d.temp))
      .attr("cy", (d) => yScaleScatter(d.rain));

    // 更新误差图
    xScaleError.domain([0, d3.max(gdErrors, (d) => d.iteration) * 1.6]);
    yScaleError.domain([0, gdError < 200 ? 300 : gdError * 1.3]);
    setupAxes(errorSvg, xScaleError, yScaleError, "步数", "猜错的程度");

    errorSvg.selectAll(".error-line").remove();
    errorSvg.append("path").attr("class", "error-line").attr("d", errorPath(gdErrors));

    errorSvg
      .selectAll(".regression-circle")
      .data([gdErrors[gdErrors.length - 1]])
      .join("circle")
      .attr("class", "regression-circle")
      .attr("r", 4.5)
      .attr("cx", (d) => xScaleError(d.iteration))
      .attr("cy", (d) => yScaleError(d.error));

    errorSvg
      .selectAll(".error-text")
      .data([gdErrors[gdErrors.length - 1]])
      .join("text")
      .attr("class", "error-text")
      .attr("x", (d) => xScaleError(d.iteration))
      .attr("y", (d) => yScaleError(d.error))
      .text((d) => d3.format(".3f")(d.error));

    // 更新显示
    const biasElement = document.getElementById("bias-value");
    const weightElement = document.getElementById("weight-value");
    const biasSlider = document.getElementById("bias-slider");
    const weightSlider = document.getElementById("weight-slider");
    const equationDisplay = document.getElementById("equation-display");

    if (biasElement) biasElement.textContent = gdBias.toFixed(3);
    if (weightElement) weightElement.textContent = gdWeight.toFixed(3);
    if (biasSlider) biasSlider.value = gdBias;
    if (weightSlider) weightSlider.value = gdWeight;
    if (equationDisplay) {
      equationDisplay.innerHTML = `魔法线公式：雨量 = ${gdWeight.toFixed(3)} × 温度 ${gdBias < 0 ? "" : "+"}${gdBias.toFixed(3)}`;
    }
  }

  // 梯度下降算法
  function runGradientDescent(iterations) {
    const N = mseData.length;
    const learning_rate = 0.001;
    gdIteration += iterations;

    for (let i = 0; i < iterations; i++) {
      let weightDiff = mseData.map((d) => {
        const temp = d[`temp${shuffleIteration}`] !== undefined ? d[`temp${shuffleIteration}`] : d.temp;
        const rain = d[`rain${shuffleIteration}`] !== undefined ? d[`rain${shuffleIteration}`] : d.rain;
        let yPred = gdWeight * temp + gdBias;
        return temp * (rain - yPred);
      });
      let biasDiff = mseData.map((d) => {
        const temp = d[`temp${shuffleIteration}`] !== undefined ? d[`temp${shuffleIteration}`] : d.temp;
        const rain = d[`rain${shuffleIteration}`] !== undefined ? d[`rain${shuffleIteration}`] : d.rain;
        let yPred = gdWeight * temp + gdBias;
        return rain - yPred;
      });

      gdWeight -= (learning_rate * (-2 / N) * weightDiff.reduce((a, b) => a + b, 0));
      gdBias -= (learning_rate * (-2 / N) * biasDiff.reduce((a, b) => a + b, 0));
    }
    updateCharts();
    showFeedback(`又走了${iterations}步，猜得更准了！`);
  }

  // 添加数据点
  function addDataPoint(event) {
    const rect = scatterSvg.node()?.getBoundingClientRect();
    if (!rect) {
      console.error("Scatter SVG not found for adding data point");
      return;
    }
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x >= margin.left && x <= width - margin.right && y >= margin.top && y <= height - margin.bottom) {
      const newTemp = xScaleScatter.invert(x);
      const newRain = yScaleScatter.invert(y);

      const newPoint = { temp: newTemp, rain: newRain };
      for (let i = 1; i <= 3; i++) {
        newPoint[`temp${i}`] = newTemp;
        newPoint[`rain${i}`] = newRain;
      }
      mseData.push(newPoint);
      gdIteration++;
      updateCharts();
      showFeedback("加了一天的雨量，魔法线要重新学啦！");
    }
  }

  // 重置数据和权重
  function resetData() {
    mseData = [
      { temp: 0, rain: 1.0, temp1: 0, rain1: 1.0, temp2: 1, rain2: 1.2, temp3: -1, rain3: 0.8 },
      { temp: 10, rain: 2.0, temp1: 10, rain1: 2.0, temp2: 11, rain2: 2.3, temp3: 9, rain3: 1.7 },
      { temp: 20, rain: 4.0, temp1: 20, rain1: 4.0, temp2: 22, rain2: 4.5, temp3: 18, rain3: 3.5 },
      { temp: 25, rain: 5.0, temp1: 25, rain1: 5.0, temp2: 27, rain2: 5.5, temp3: 23, rain3: 4.5 },
      { temp: 30, rain: 6.0, temp1: 30, rain1: 6.0, temp2: 32, rain2: 6.5, temp3: 28, rain3: 5.5 },
    ];
    gdBias = 0.1;
    gdWeight = 0.1;
    gdIteration = 0;
    gdError = 0;
    gdErrors = [{ iteration: 0, error: 0 }];
    shuffleIteration = 1;
    updateCharts();
    showFeedback("一切都重置啦！再来试试吧！");
  }

  // 自动运行控制
  function toggleAutoRun() {
    const autoButton = document.getElementById("run-auto");
    if (!autoButton) {
      console.warn("Auto run button not found");
      return;
    }
    if (autoRunInterval) {
      clearInterval(autoRunInterval);
      autoRunInterval = null;
      autoButton.textContent = "自动运行";
      showFeedback("暂停啦！可以继续点其他按钮哦！");
    } else {
      autoButton.textContent = "停止运行";
      autoRunInterval = setInterval(() => {
        runGradientDescent(1);
        if (gdError < 0.01 || gdIteration > 1000) {
          clearInterval(autoRunInterval);
          autoRunInterval = null;
          autoButton.textContent = "自动运行";
          showFeedback("宝藏找到啦！魔法线超级准了！");
        }
      }, 500);
    }
  }

  // 初始化数学公式
  function initMathFormulas() {
    try {
      katex.render("\\begin{aligned} \\hat{y}=\\hat{\\beta_0} + \\hat{\\beta_1}x \\end{aligned}", 
        document.getElementById("math-equation1"), { displayMode: true });
      katex.render("\\begin{aligned} MSE(\\hat{\\beta_0}, \\hat{\\beta_1}) = \\frac{1}{n} \\sum^{n}_{i=1}(y_i - \\hat{y_i})^2 \\\\ = \\frac{1}{n} \\sum^{n}_{i=1}(y_i - (\\hat{\\beta_0} + \\hat{\\beta_1}x ))^2 \\end{aligned}", 
        document.getElementById("math-equation2"), { displayMode: true });
      katex.render("\\frac{\\delta}{\\delta\\beta_i}MSE = \\begin{cases} -\\frac{2}{n} \\sum^{n}_{i=1}(y_i - \\hat{y_i}) \\text{for i = 0} \\\\ -\\frac{2}{n} \\sum^{n}_{i=1}x_i(y_i - \\hat{y_i}) \\text{for i = 1} \\end{cases}", 
        document.getElementById("math-equation3"), { displayMode: true });
      katex.render("\\text{repeat until converge:} = \\begin{cases} \\beta_0 = \\beta_0 - \\alpha (-\\frac{2}{n} \\sum^{n}_{i=1}(y_i - \\hat{y_i})) \\\\ \\beta_1 = \\beta_1 - \\alpha (-\\frac{2}{n} x_i\\sum^{n}_{i=1}(y_i - \\hat{y_i})) \\end{cases}", 
        document.getElementById("math-equation4"), { displayMode: true });
    } catch (error) {
      console.error("Failed to render KaTeX formulas:", error);
    }
  }

  // 事件监听
  const step1Button = document.getElementById("step-1");
  const step25Button = document.getElementById("step-25");
  const step100Button = document.getElementById("step-100");
  const runAutoButton = document.getElementById("run-auto");
  const biasSlider = document.getElementById("bias-slider");
  const weightSlider = document.getElementById("weight-slider");
  const addPointButton = document.getElementById("add-point-btn");
  const resetButton = document.getElementById("reset-btn");
  const toggleMathButton = document.getElementById("toggle-math");

  if (step1Button) step1Button.addEventListener("click", () => runGradientDescent(1));
  if (step25Button) step25Button.addEventListener("click", () => runGradientDescent(25));
  if (step100Button) step100Button.addEventListener("click", () => runGradientDescent(100));
  if (runAutoButton) runAutoButton.addEventListener("click", toggleAutoRun);
  if (biasSlider) {
    biasSlider.addEventListener("input", (e) => {
      gdBias = +e.target.value;
      gdIteration++;
      updateCharts();
      showFeedback("你调整了基础雨量，魔法线变了！");
    });
  }
  if (weightSlider) {
    weightSlider.addEventListener("input", (e) => {
      gdWeight = +e.target.value;
      gdIteration++;
      updateCharts();
      showFeedback("你调整了温度的影响，魔法线变了！");
    });
  }
  if (addPointButton) {
    addPointButton.addEventListener("click", () => {
      scatterSvg.node()?.addEventListener("click", addDataPoint, { once: true });
    });
  }
  if (resetButton) resetButton.addEventListener("click", resetData);
  if (toggleMathButton) {
    toggleMathButton.addEventListener("click", () => {
      const section = document.getElementById("math-section");
      if (section) {
        section.style.display = section.style.display === "block" ? "none" : "block";
        toggleMathButton.textContent = section.style.display === "block" ? "隐藏数学公式" : "显示数学公式";
      } else {
        console.warn("Math section element not found");
      }
    });
  }

  // 初始渲染
  try {
    initMathFormulas();
    updateCharts();
  } catch (error) {
    console.error("Failed to initialize rainfall component:", error);
  }
}