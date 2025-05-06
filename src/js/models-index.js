import { select, selectAll } from 'd3-selection';
import rainfall from './rainfall.js';
import precisionRecall from './precision-recall.js';
import teachableMachine from './teachable-machine.js';
import rainfallHtml from '../components/rainfall.html?raw';
import precisionRecallHtml from '../components/precision-recall.html?raw';
import teachableHtml from '../components/teachable.html?raw';
import * as tf from '@tensorflow/tfjs';

// 确保这些模块在打包时被引用
export { rainfall, precisionRecall, teachableMachine };

// 全局模型缓存和预加载 Promise
let cachedModel = null;
let preloadPromise = null;

// 预加载 MobileNet 模型
async function preloadModel() {
  if (cachedModel) {
    console.log('MobileNet model already cached');
    return cachedModel;
  }

  console.log('Preloading MobileNet model...');
  try {
    const model = await tf.loadGraphModel('/models/mobilenet/model.json', {
      requestOption: {
        cache: 'force-cache',
        credentials: 'same-origin',
        headers: {
          'Cache-Control': 'max-age=31536000',
        },
      },
    });
    cachedModel = model;
    console.log('MobileNet model preloaded and cached successfully');
    return model;
  } catch (error) {
    console.error('Failed to preload MobileNet model:', error);
    throw error;
  }
}

// 初始化预加载 Promise
document.addEventListener('DOMContentLoaded', () => {
  preloadPromise = preloadModel().catch((error) => {
    console.error('Preload failed:', error);
    const loadingNotice = document.getElementById('model-loading-notice');
    if (loadingNotice) {
      loadingNotice.textContent = '模型加载失败，请检查网络连接或刷新页面。混淆矩阵功能仍可使用。';
    }
    return null; // 返回 null 表示加载失败
  });
});

const sections = selectAll('section').nodes();

const options = {
  threshold: 0.7,
};

let initialized = {
  rainfall: false,
  precisionRecall: false,
  teachable: false,
};

async function loadComponent(containerId, htmlContent, componentInitializer, modelPromise) {
  console.log(`Loading component: ${containerId}`);
  const container = select(`#${containerId}`);
  container.html(htmlContent);
  try {
    // 等待模型预加载完成
    const model = await modelPromise;
    componentInitializer(model);
    console.log(`Component ${containerId} initialized successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to initialize component ${containerId}:`, error);
    return false;
  }
}

const target2event = {
  0: () => {
    console.log('引言：介绍模型如何模仿数据');
    selectAll('.component-container').style('display', 'none');
    select('#rainfall-predictor')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    if (!initialized.rainfall) {
      initialized.rainfall = loadComponent('rainfall-predictor', rainfallHtml, rainfall, Promise.resolve(null));
    }
  },
  1: () => {
    console.log('活动1：展示线性回归图表');
    selectAll('.component-container').style('display', 'none');
    select('#rainfall-predictor')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    if (!initialized.rainfall) {
      initialized.rainfall = loadComponent('rainfall-predictor', rainfallHtml, rainfall, Promise.resolve(null));
    }
  },
  2: () => {
    console.log('活动2：展示精确度与召回率图表');
    selectAll('.component-container').style('display', 'none');
    select('#precision-recall-chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    if (!initialized.precisionRecall) {
      initialized.precisionRecall = loadComponent('precision-recall-chart', precisionRecallHtml, precisionRecall, Promise.resolve(null));
    }
  },
  3: () => {
    console.log('活动3：展示 Teachable Machine 和混淆矩阵');
    selectAll('.component-container').style('display', 'none');
    select('#teachable-chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    if (!initialized.teachable) {
      console.log('Initializing teachable-machine, waiting for cached model...');
      initialized.teachable = loadComponent('teachable-chart', teachableHtml, (model) => teachableMachine(model), preloadPromise);
    }
  },
  4: () => {
    console.log('活动4：展示数据不平衡实验');
    selectAll('.component-container').style('display', 'none');
    select('#teachable-chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    if (!initialized.teachable) {
      console.log('Initializing teachable-machine, waiting for cached model...');
      initialized.teachable = loadComponent('teachable-chart', teachableHtml, (model) => teachableMachine(model), preloadPromise);
    }
  },
  5: () => {
    console.log('总结：展示模型的力量与责任');
    selectAll('.component-container').style('display', 'none');
    select('#teachable-chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    if (!initialized.teachable) {
      console.log('Initializing teachable-machine, waiting for cached model...');
      initialized.teachable = loadComponent('teachable-chart', teachableHtml, (model) => teachableMachine(model), preloadPromise);
    }
  },
};

let observer = new IntersectionObserver(navCheck, options);
let previousY = 0;
let previousRatio = 0;

function navCheck(entries) {
  entries.forEach((entry) => {
    const currentRatio = entry.intersectionRatio;
    const isScrollingUp = entry.boundingClientRect.y < previousY && currentRatio > previousRatio;
    previousY = entry.boundingClientRect.y;
    previousRatio = currentRatio;
    const className = entry.target.className;
    const activeAnchor = select(`[data-page=${className}]`);
    if (entry.isIntersecting) {
      const entryIndex = entry.target.getAttribute('data-index');
      if (entryIndex in target2event) {
        target2event[entryIndex]();
      }
      selectAll('a').classed('selected', false);
      activeAnchor.classed('selected', true);
    }
  });
}

sections.forEach((section) => {
  observer.observe(section);
});

function redraw() {
  console.log('窗口大小调整：重新绘制图表');
  if (initialized.rainfall) rainfall();
  if (initialized.precisionRecall) precisionRecall();
  // 不重新调用 teachableMachine，依赖缓存
}

redraw();

window.addEventListener('resize', redraw);