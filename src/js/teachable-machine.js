import * as tf from "@tensorflow/tfjs";

const IMAGE_SIZE = 224;
const TOPK = 10;
const MAX_SAMPLES = 100; // 每个类别的最大样本数，防止内存溢出

// 全局模型缓存
let cachedModel = null;
let instance = null;

export default function teachableMachine(preloadedModel = null) {
  // 如果实例已存在，直接返回
  if (instance) {
    console.log("Using existing TeachableMachine instance");
    return instance;
  }

  class TeachableMachine {
    constructor() {
      this.infoTexts = [];
      this.confidenceBars = [];
      this.training = -1;
      this.videoPlaying = false;
      this.numClasses = 2;
      this.classNames = ["笑脸", "哭脸"];
      this.confusionMatrix = [[0, 0], [0, 0]];
      this.biasSamples = { 0: [], 1: [] };
      this.trainingButtons = [];
      this.examples = { 0: [], 1: [] };

      this.video = document.querySelector("#teachable-chart .teachable-container video");
      this.controls = document.getElementById("teachable-controls");

      if (!this.video || !this.controls) {
        console.error("Video or controls element not found");
        alert("无法找到视频或控制元素，请检查页面结构。");
        return;
      }

      // 显示加载提示
      this.showLoadingMessage();

      document.getElementById("reset-matrix")?.addEventListener("click", () => this.resetConfusionMatrix());
      document.getElementById("sample-p")?.addEventListener("click", () => this.sampleClass(0, 20));
      document.getElementById("sample-n")?.addEventListener("click", () => this.sampleClass(1, 5));
      document.getElementById("run-bias-experiment")?.addEventListener("click", () => this.runBiasExperiment());

      this.setupUI();
      this.setupWebcam();
      this.loadModel(preloadedModel);
    }

    showLoadingMessage() {
      const videoContainer = document.querySelector("#teachable-chart .teachable-container .video-container");
      if (videoContainer) {
        const loadingDiv = document.createElement("div");
        loadingDiv.id = "model-loading-message";
        loadingDiv.style.cssText = "position: absolute; top: 10px; left: 10px; color: white; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;";
        loadingDiv.textContent = "正在等待 MobileNet 模型加载...";
        videoContainer.appendChild(loadingDiv);
      }
    }

    hideLoadingMessage() {
      const loadingDiv = document.getElementById("model-loading-message");
      if (loadingDiv) loadingDiv.remove();
    }

    async loadModel(preloadedModel) {
      console.log('Checking model cache: preloadedModel=', !!preloadedModel, 'cachedModel=', !!cachedModel);

      // 如果提供了预加载模型，直接使用
      if (preloadedModel) {
        console.log("Using preloaded MobileNet model");
        this.model = preloadedModel;
        cachedModel = preloadedModel;
        this.hideLoadingMessage();
        // 等待用户交互或自动播放
        this.start();
        return;
      }

      // 检查全局缓存
      if (cachedModel) {
        console.log("Using cached MobileNet model");
        this.model = cachedModel;
        this.hideLoadingMessage();
        this.start();
        return;
      }

      // 如果没有模型，显示提示但保留组件
      console.warn("No model available, waiting for preload to complete");
      this.hideLoadingMessage();
      this.disableWebcamFeatures();
    }

    async infer(image, embedding = false) {
      if (!this.model) {
        console.warn("Cannot infer: model not loaded");
        return null;
      }
      return tf.tidy(() => {
        try {
          let img = tf.image.resizeBilinear(image, [IMAGE_SIZE, IMAGE_SIZE]);
          img = img.div(255.0);
          img = img.sub(0.5).mul(2.0);
          const processedImage = img.expandDims(0);

          if (embedding) {
            const result = this.model.execute(
              processedImage,
              "module_apply_default/MobilenetV1/MobilenetV1/Conv2d_13_pointwise/Relu6"
            );
            console.log("Inference completed for embedding");
            return result;
          } else {
            const result = this.model.predict(processedImage);
            console.log("Inference completed for prediction");
            return result;
          }
        } catch (error) {
          console.error("推理失败:", error);
          return null;
        }
      });
    }

    async sampleClass(classIndex, sampleCount = 1) {
      if (!this.videoPlaying) {
        alert("请先点击页面或按住训练按钮以启用摄像头！");
        return;
      }

      console.log(`Starting sample collection for class ${classIndex} (${this.classNames[classIndex]}), count: ${sampleCount}`);

      let image = null;
      let logits = null;

      try {
        image = tf.browser.fromPixels(this.video);
        logits = await this.infer(image, true);
        if (!logits) {
          console.error("Failed to collect samples: inference returned null");
          alert("模型未加载或推理失败，无法采集样本。");
          return;
        }

        while (this.examples[classIndex].length + sampleCount > MAX_SAMPLES) {
          const oldTensor = this.examples[classIndex].shift();
          if (oldTensor) tf.dispose(oldTensor);
        }
        while (this.biasSamples[classIndex].length + sampleCount > MAX_SAMPLES) {
          const oldTensor = this.biasSamples[classIndex].shift();
          if (oldTensor) tf.dispose(oldTensor);
        }

        for (let i = 0; i < sampleCount; i++) {
          const clonedLogits = logits.clone();
          this.examples[classIndex].push(clonedLogits);
          this.biasSamples[classIndex].push(clonedLogits.clone());
        }

        const exampleCount = this.examples[classIndex].length;
        if (this.infoTexts[classIndex] && this.confidenceBars[classIndex]) {
          this.infoTexts[classIndex].innerText = ` ${exampleCount} 个样本`;
        }

        console.log(`Sampled ${sampleCount} frames for class ${classIndex} (${this.classNames[classIndex]}), total: ${exampleCount}`);
        alert(
          `已为 ${classIndex === 0 ? "P" : "N"}: ${this.classNames[classIndex]} 采集 ${sampleCount} 帧样本！当前样本数：${exampleCount}`
        );
      } finally {
        if (image) tf.dispose(image);
        if (logits) tf.dispose(logits);
        console.log(`Active tensors after sampleClass: ${tf.memory().numTensors}`);
      }
    }

    async runBiasExperiment() {
      console.log("Running bias experiment...");
      this.examples[0].forEach((tensor) => tf.dispose(tensor));
      this.examples[1].forEach((tensor) => tf.dispose(tensor));
      this.examples = { 0: [], 1: [] };

      const pSamples = this.biasSamples[0].slice(0, 50);
      const nSamples = this.biasSamples[1].slice(0, 5);
      pSamples.forEach((logits) => this.examples[0].push(logits.clone()));
      nSamples.forEach((logits) => this.examples[1].push(logits.clone()));

      const exampleCount = { 0: this.examples[0].length, 1: this.examples[1].length };
      if (!exampleCount[0] && !exampleCount[1]) {
        console.warn("No samples available for bias experiment");
        alert("请先为 P 类或 N 类采集样本！");
        return;
      }

      let image = null;
      let logits = null;

      try {
        image = tf.browser.fromPixels(this.video);
        logits = await this.infer(image, true);
        if (!logits) {
          console.error("Bias experiment failed: inference returned null");
          alert("模型未加载或推理失败，无法运行实验。");
          return;
        }
        const res = await this.predictClass(logits);

        for (let i = 0; i < this.numClasses; i++) {
          if (this.infoTexts[i] && this.confidenceBars[i]) {
            if (res.classIndex === i) {
              this.infoTexts[i].classList.add("bold");
            } else {
              this.infoTexts[i].classList.remove("bold");
            }
            if (exampleCount[i] > 0) {
              const confidence = Math.round(res.confidences[i] * 100);
              this.infoTexts[i].innerText = ` ${exampleCount[i]} 个样本 - 置信度：${confidence}%`;
              this.confidenceBars[i].style.width = `${confidence}%`;
            } else {
              this.infoTexts[i].innerText = " 无样本";
              this.confidenceBars[i].style.width = "0%";
            }
          }
        }

        const output = `实验结果：预测为 ${res.classIndex === 0 ? "P" : "N"}: ${this.classNames[res.classIndex]}，置信度 ${Math.round(
          res.confidences[res.classIndex] * 100
        )}%。P 类样本数：${exampleCount[0] || 0}，N 类样本数：${exampleCount[1] || 0}。由于“N: ${
          this.classNames[1]
        }”样本较少，模型可能偏向“P: ${this.classNames[0]}”。`;
        document.getElementById("bias-output").textContent = output;
        document.getElementById("bias-result").style.display = "block";
        console.log("Bias experiment completed successfully");
      } finally {
        if (image) tf.dispose(image);
        if (logits) tf.dispose(logits);
        this.biasSamples[0].forEach((tensor) => tf.dispose(tensor));
        this.biasSamples[1].forEach((tensor) => tf.dispose(tensor));
        this.biasSamples = { 0: [], 1: [] };
        console.log(`Active tensors after runBiasExperiment: ${tf.memory().numTensors}`);
      }
    }

    updateConfidenceOverlay(res) {
      const overlay = document.querySelector("#teachable-chart .teachable-container .confidence-overlay");
      if (!overlay) return;

      overlay.innerHTML = "";
      for (let i = 0; i < this.numClasses; i++) {
        const confidenceText = document.createElement("div");
        confidenceText.style.cssText = "color: white; background: rgba(0,0,0,0.7); padding: 5px; margin: 5px; border-radius: 3px;";
        const confidence = res && res.confidences[i] ? Math.round(res.confidences[i] * 100) : 0;
        confidenceText.textContent = `${this.classNames[i]}: ${confidence}%`;
        if (res && res.classIndex === i) {
          confidenceText.style.fontWeight = "bold";
        }
        overlay.appendChild(confidenceText);
      }
    }

    updateConfusionMatrixUI() {
      console.log("Updating confusion matrix UI...");
      const wrapper = document.getElementById("confusion-matrix-wrapper");
      wrapper.innerHTML = "";

      const table = document.createElement("table");
      table.id = "confusion-matrix";

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headerRow.appendChild(document.createElement("th"));
      this.classNames.forEach((name, predIndex) => {
        const th = document.createElement("th");
        th.textContent = `预测${predIndex === 0 ? "P" : "N"}: ${name}`;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      this.classNames.forEach((actualName, actualIndex) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        labelCell.textContent = `实际${actualIndex === 0 ? "P" : "N"}: ${actualName}`;
        row.appendChild(labelCell);

        this.classNames.forEach((_, predIndex) => {
          const cell = document.createElement("td");
          const countSpan = document.createElement("span");
          countSpan.id = `count-${actualIndex}-${predIndex}`;
          countSpan.textContent = this.confusionMatrix[actualIndex][predIndex];

          const incButton = document.createElement("button");
          incButton.textContent = "+";
          incButton.addEventListener("click", () => this.incrementCell(actualIndex, predIndex));

          const decButton = document.createElement("button");
          decButton.textContent = "-";
          decButton.addEventListener("click", () => this.decrementCell(actualIndex, predIndex));

          cell.appendChild(countSpan);
          cell.appendChild(incButton);
          cell.appendChild(decButton);
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      wrapper.appendChild(table);

      this.updateMetrics();
      console.log("Confusion matrix UI updated successfully");
    }

    incrementCell(actualIndex, predIndex) {
      this.confusionMatrix[actualIndex][predIndex]++;
      this.updateConfusionMatrixUI();
    }

    decrementCell(actualIndex, predIndex) {
      if (this.confusionMatrix[actualIndex][predIndex] > 0) {
        this.confusionMatrix[actualIndex][predIndex]--;
        this.updateConfusionMatrixUI();
      }
    }

    resetConfusionMatrix() {
      this.confusionMatrix = [[0, 0], [0, 0]];
      this.updateConfusionMatrixUI();
    }

    updateMetrics() {
      const tp = this.confusionMatrix[0][0];
      const fn = this.confusionMatrix[0][1];
      const fp = this.confusionMatrix[1][0];
      const tn = this.confusionMatrix[1][1];
      const total = tp + tn + fp + fn;

      const accuracy = total > 0 ? ((tp + tn) / total).toFixed(3) : 0;
      const precision = tp + fp > 0 ? (tp / (tp + fp)).toFixed(3) : 0;
      const recall = tp + fn > 0 ? (tp / (tp + fn)).toFixed(3) : 0;
      const f1 = precision && recall ? (2 * precision * recall) / (parseFloat(precision) + parseFloat(recall)).toFixed(3) : 0;

      const exampleElement = document.getElementById("example");
      if (total === 0) {
        exampleElement.innerHTML = "<strong>示例</strong>：当前无数据，请输入 TP、TN、FP、FN。";
      } else {
        exampleElement.innerHTML = `
          <strong>当前 TP=${tp}, TN=${tn}, FP=${fp}, FN=${fn}</strong>: <br>
          准确度=(${tp}+${tn})/(${tp}+${tn}+${fp}+${fn})=${accuracy}<br>
          精确度=${tp}/(${tp}+${fp})=${precision}<br>
          召回率=${tp}/(${tp}+${fn})=${recall}<br>
          F1=2*(${precision}*${recall})/(${precision}+${recall})=${f1}
        `;
      }
    }

    createClassControl(index) {
      const controlGroup = document.createElement("div");
      controlGroup.className = "control-group";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = this.classNames[index];
      nameInput.addEventListener("input", () => {
        this.classNames[index] = nameInput.value || (index === 0 ? "笑脸" : "哭脸");
        this.trainingButtons[index].innerText = `训练 ${index === 0 ? "P" : "N"}: ${this.classNames[index]}`;
        this.updateConfusionMatrixUI();
      });

      const button = document.createElement("button");
      button.innerText = `训练 ${index === 0 ? "P" : "N"}: ${this.classNames[index]}`;
      this.trainingButtons[index] = button;

      const infoText = document.createElement("span");
      infoText.className = "info-text";
      infoText.innerText = " 无样本";

      const barContainer = document.createElement("div");
      barContainer.className = "confidence-bar-container";
      const bar = document.createElement("div");
      bar.className = "confidence-bar";
      barContainer.appendChild(bar);

      controlGroup.appendChild(nameInput);
      controlGroup.appendChild(button);
      controlGroup.appendChild(infoText);
      controlGroup.appendChild(barContainer);

      // 按住训练按钮采集 1 个样本
      button.addEventListener("mousedown", () => {
        console.log(`mousedown event for class ${index} (${this.classNames[index]})`);
        this.training = index;
        if (!this.videoPlaying && this.model) {
          this.video.play().then(() => {
            console.log("Video playback started");
            this.sampleClass(index, 1);
          }).catch((error) => {
            console.error("Video playback failed:", error);
            alert("请先点击页面以启用摄像头！");
          });
        } else if (this.model) {
          this.sampleClass(index, 1);
        } else {
          console.warn("Model not loaded, cannot collect samples");
          alert("模型未加载，无法采集样本。");
        }
      });
      button.addEventListener("mouseup", () => {
        console.log(`mouseup event for class ${index} (${this.classNames[index]})`);
        this.training = -1;
      });

      this.infoTexts[index] = infoText;
      this.confidenceBars[index] = bar;
      return controlGroup;
    }

    reset() {
      this.examples[0].forEach((tensor) => tf.dispose(tensor));
      this.examples[1].forEach((tensor) => tf.dispose(tensor));
      this.biasSamples[0].forEach((tensor) => tf.dispose(tensor));
      this.biasSamples[1].forEach((tensor) => tf.dispose(tensor));
      this.examples = { 0: [], 1: [] };
      this.biasSamples = { 0: [], 1: [] };
      this.training = -1;
      this.infoTexts.forEach((infoText, i) => {
        if (infoText) {
          infoText.innerText = " 无样本";
          infoText.classList.remove("bold");
          this.confidenceBars[i].style.width = "0%";
        }
      });
      this.updateConfidenceOverlay(null);
      this.resetConfusionMatrix();
      console.log(`Active tensors after reset: ${tf.memory().numTensors}`);
    }

    setupUI() {
      this.controls.innerHTML = "";
      this.confusionMatrix = [[0, 0], [0, 0]];
      this.trainingButtons = [];

      // 添加置信度显示区域
      const videoContainer = document.querySelector("#teachable-chart .teachable-container .video-container");
      if (videoContainer) {
        const overlay = document.createElement("div");
        overlay.className = "confidence-overlay";
        overlay.style.cssText = "position: absolute; top: 10px; left: 10px; z-index: 10;";
        videoContainer.appendChild(overlay);
      }

      for (let i = 0; i < this.numClasses; i++) {
        this.controls.appendChild(this.createClassControl(i));
      }

      const controlsContainer = document.createElement("div");
      controlsContainer.className = "controls-container";

      const resetButton = document.createElement("button");
      resetButton.innerText = "重置模型";
      resetButton.className = "reset-button";
      resetButton.addEventListener("click", () => this.reset());

      controlsContainer.appendChild(resetButton);
      this.controls.appendChild(controlsContainer);

      this.updateConfusionMatrixUI();
    }

    setupWebcam() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("浏览器不支持 navigator.mediaDevices 或 getUserMedia");
        alert("您的浏览器不支持摄像头访问，请使用支持 WebRTC 的现代浏览器（如 Chrome、Firefox）并确保通过 HTTPS 访问网站。");
        this.disableWebcamFeatures();
        return;
      }

      const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isSecure) {
        console.error("getUserMedia 要求 HTTPS 环境");
        alert("摄像头访问需要通过 HTTPS 加载页面。请确保网站使用 HTTPS 协议。");
        this.disableWebcamFeatures();
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          this.video.srcObject = stream;
          this.video.width = IMAGE_SIZE;
          this.video.height = IMAGE_SIZE;
          this.video.addEventListener("playing", () => {
            this.videoPlaying = true;
            console.log("Webcam stream started");
          });
          this.video.addEventListener("paused", () => {
            this.videoPlaying = false;
            console.log("Webcam stream paused");
          });
        })
        .catch((error) => {
          console.error("无法访问摄像头:", error);
          alert("无法访问摄像头，请检查摄像头权限、硬件设置，或确保网站通过 HTTPS 访问。");
          this.disableWebcamFeatures();
        });
    }

    disableWebcamFeatures() {
      const videoContainer = document.querySelector("#teachable-chart .teachable-container .video-container");
      if (videoContainer) {
        videoContainer.innerHTML = `
          <p style="color: white; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px;">
            摄像头功能不可用，请检查模型加载状态或浏览器支持。混淆矩阵功能仍可使用。
          </p>
        `;
      }
      this.videoPlaying = false;
      console.log("Webcam features disabled");
    }

    start() {
      if (!this.model) {
        console.warn("Model not loaded, cannot start animation");
        return;
      }
      if (this.timer) this.stop();
      // 依赖 <video autoplay> 或用户交互
      this.timer = requestAnimationFrame(this.animate.bind(this));
    }

    stop() {
      this.video.pause();
      cancelAnimationFrame(this.timer);
    }

    async predictClass(logits) {
      if (!logits) {
        console.warn("Cannot predict: logits not available");
        return { classIndex: 0, confidences: {} };
      }
      return tf.tidy(() => {
        const confidences = {};
        let maxConfidence = -Infinity;
        let classIndex = 0;

        for (let i = 0; i < this.numClasses; i++) {
          if (this.examples[i].length === 0) {
            confidences[i] = 0;
            continue;
          }
          const distances = this.examples[i].map((example) => {
            const diff = logits.sub(example);
            return diff.square().sum();
          });
          const avgDistance = tf.mean(tf.stack(distances)).dataSync()[0];
          confidences[i] = 1 / (1 + avgDistance);
          if (confidences[i] > maxConfidence) {
            maxConfidence = confidences[i];
            classIndex = i;
          }
        }

        const total = Object.values(confidences).reduce((sum, c) => sum + c, 0);
        if (total > 0) {
          for (const i in confidences) {
            confidences[i] /= total;
          }
        }

        console.log("Prediction completed:", { classIndex, confidences });
        return { classIndex, confidences };
      });
    }

    async animate() {
      if (!this.videoPlaying || !this.model) {
        console.log("Animation skipped: video not playing or model not loaded");
        this.timer = requestAnimationFrame(this.animate.bind(this));
        return;
      }

      let image = null;
      let logits = null;

      try {
        image = tf.browser.fromPixels(this.video);
        logits = await this.infer(image, true);
        if (!logits) {
          console.warn("Inference failed in animate");
          this.updateConfidenceOverlay(null);
          return;
        }

        // 实时置信度更新
        const res = await this.predictClass(logits);
        this.updateConfidenceOverlay(res);

        // 更新控制面板置信度
        for (let i = 0; i < this.numClasses; i++) {
          const exampleCount = this.examples[i].length;
          if (this.infoTexts[i] && this.confidenceBars[i]) {
            if (res.classIndex === i) {
              this.infoTexts[i].classList.add("bold");
            } else {
              this.infoTexts[i].classList.remove("bold");
            }
            const confidence = Math.round(res.confidences[i] * 100);
            this.infoTexts[i].innerText = ` ${exampleCount} 个样本 - 置信度：${confidence}%`;
            this.confidenceBars[i].style.width = `${confidence}%`;
          }
        }
      } catch (error) {
        console.error("Animation frame error:", error);
        this.updateConfidenceOverlay(null);
      } finally {
        if (image) tf.dispose(image);
        if (logits) tf.dispose(logits);
        console.log(`Active tensors after animate: ${tf.memory().numTensors}`);
        this.timer = requestAnimationFrame(this.animate.bind(this));
      }
    }
  }

  instance = new TeachableMachine();
  return instance;
}