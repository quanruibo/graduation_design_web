import { select, selectAll } from 'd3';
import { Bubble } from './Bubble.js';
import { Table } from './Table.js';
import { drawScatterChart } from './sigmoidPredict.js';

// 确保这些模块在打包时被引用
export { Bubble, Table, drawScatterChart };

const sections = selectAll('section').nodes();

const table = new Table({
  tableContainer: '#table',
});

const bubbleChart = new Bubble({
  chartContainer: '#chart',
  table: table,
});

const options = {
  threshold: 0.7,
};

const target2event = {
  0: () => {
    selectAll('.axes-text').remove();
    bubbleChart.showGroups = ['train', 'test', 'validation'];
    bubbleChart.nonShowGroups = [];
    bubbleChart.showAnimals();
    bubbleChart.currentGroup = 'pretrain';
    bubbleChart.currentFeature = 'weight';
    bubbleChart.moveBack();
    bubbleChart.colorAnimals('off');
    bubbleChart.hideLabels('all');
    select('#chart').style('display', 'block');
    select('#table').style('display', 'block');
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container').style('opacity', 0);
  },
  1: () => {
    selectAll('.axes-text').remove();
    bubbleChart.currentGroup = 'pretrain';
    bubbleChart.currentFeature = 'weight';
    bubbleChart.moveNodes();
    bubbleChart.colorAnimals('on');
    bubbleChart.nonShowGroups = ['train', 'test', 'validation'];
    bubbleChart.showGroups = [];
    bubbleChart.showAnimals();
    bubbleChart.showLabels('all');
    select('#chart').style('display', 'block');
    select('#table').style('display', 'block');
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container').style('opacity', 0);
  },
  2: () => {
    bubbleChart.colorAnimals('on');
    selectAll('.axes-text').remove();
    bubbleChart.nonShowGroups = ['test', 'validation'];
    bubbleChart.showGroups = ['train'];
    selectAll('button.button').classed('active', false);
    select(`button[value="weight"]`).classed('active', true);
    bubbleChart.currentFeature = 'weight';
    bubbleChart.trackCurrentGroups('train');
    bubbleChart.showAnimals();
    bubbleChart.moveNodes();
    bubbleChart.hideNonTrainAnimals();
    bubbleChart.hideLines();
    bubbleChart.hideLabels('all');
    bubbleChart.showLabels('train');
    bubbleChart.currentGroup = 'pretrain';
    select('#hull-g').style('opacity', 0);
    select('#chart').style('display', 'block');
    select('#table').style('display', 'block');
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container').style('opacity', 0);
  },
  3: () => {
    drawScatterChart();
    select('#chart').style('display', 'none');
    select('#table').style('display', 'none');
    select('#scatter-chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    select('#scatter-controls')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    select('.button-container').style('opacity', 0);
    select('article').style('position', 'sticky').style('top', '0');
  },
  '3.5': () => {
    bubbleChart.nonShowGroups = ['test', 'validation'];
    bubbleChart.showGroups = ['train'];
    bubbleChart.colorAnimals('on');
    selectAll('.axes-text').remove();
    selectAll('button.button').classed('active', false);
    select(`button[value="weight"]`).classed('active', true);
    select('#hull-g').style('opacity', 0);
    bubbleChart.showAnimals();
    bubbleChart.currentGroup = 'train';
    bubbleChart.currentFeature = 'weight';
    bubbleChart.trackCurrentGroups('train');
    bubbleChart.hideNonTrainAnimals();
    bubbleChart.moveBee();
    bubbleChart.drawHorizontalLine();
    bubbleChart.drawDecisionBoundary();
    bubbleChart.hideLabels('all');
    bubbleChart.drawAxesLabels('weight');

    select('#scatter-chart')
      .transition()
      .duration(500)
      .style('opacity', 0)
      .on('end', () => select('#scatter-chart').style('display', 'none'));
    select('#scatter-controls')
      .transition()
      .duration(500)
      .style('opacity', 0)
      .on('end', () => select('#scatter-controls').style('display', 'none'));
    select('#chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    select('#table')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    select('.button-container')
      .transition()
      .duration(500)
      .style('opacity', 1);

    select('article')
      .transition()
      .duration(500)
      .on('end', () => select('article').style('position', 'relative').style('top', 'auto'));
  },
  4: () => {
    bubbleChart.nonShowGroups = ['test', 'validation'];
    bubbleChart.showGroups = ['train'];
    bubbleChart.colorAnimals('on');
    selectAll('.axes-text').remove();
    selectAll('button.button').classed('active', false);
    select(`button[value="weight"]`).classed('active', true);
    select('#hull-g').style('opacity', 0);
    bubbleChart.showAnimals();
    bubbleChart.currentGroup = 'train';
    bubbleChart.currentFeature = 'weight';
    bubbleChart.trackCurrentGroups('train');
    bubbleChart.hideNonTrainAnimals();
    bubbleChart.moveBee();
    bubbleChart.drawHorizontalLine();
    bubbleChart.drawDecisionBoundary();
    bubbleChart.hideLabels('all');
    bubbleChart.drawAxesLabels('weight');

    select('#chart')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    select('#table')
      .style('display', 'block')
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container')
      .transition()
      .duration(500)
      .style('opacity', 1);
  },
  5: () => {
    bubbleChart.nonShowGroups = ['test'];
    bubbleChart.showGroups = ['train', 'validation'];
    bubbleChart.drawHorizontalLine();
    bubbleChart.trackCurrentGroups('validation');
    bubbleChart.colorAnimals('on');
    bubbleChart.showAnimals();
    bubbleChart.table.drawTable();
    bubbleChart.updateDataPosition();
    bubbleChart.calculatePerformance();
    select('#chart').style('display', 'block');
    select('#table').style('display', 'block');
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container').style('opacity', 1);
  },
  6: () => {
    bubbleChart.nonShowGroups = [];
    bubbleChart.showGroups = ['train', 'test', 'validation'];
    bubbleChart.colorAnimals('on');
    bubbleChart.drawHorizontalLine();
    bubbleChart.trackCurrentGroups('test');
    bubbleChart.showAnimals();
    if (!document.getElementById('data-table')) {
      bubbleChart.table.drawTable();
    }
    bubbleChart.updateDataPosition();
    bubbleChart.calculatePerformance();
    select('#chart').style('display', 'block');
    select('#table').style('display', 'block');
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container').style('opacity', 1);
  },
  7: () => {
    bubbleChart.nonShowGroups = [];
    bubbleChart.showGroups = ['train', 'test', 'validation'];
    bubbleChart.colorAnimals('on');
    bubbleChart.drawHorizontalLine();
    bubbleChart.trackCurrentGroups('test');
    bubbleChart.showAnimals();
    if (!document.getElementById('data-table')) {
      bubbleChart.table.drawTable();
    }
    bubbleChart.updateDataPosition();
    bubbleChart.calculatePerformance();
    select('#chart').style('display', 'block');
    select('#table').style('display', 'block');
    select('#scatter-chart').style('display', 'none');
    select('#scatter-controls').style('display', 'none');
    select('.button-container').style('opacity', 1);
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
  bubbleChart.redraw();
}

redraw();

window.addEventListener('resize', redraw);

selectAll('button.button').on('click', function () {
  let currentFeature;
  selectAll('button.button').classed('active', false);
  select(this).classed('active', true);
  currentFeature = select(this).attr('value');
  bubbleChart.currentFeature = currentFeature;
  bubbleChart.drawAxesLabels(currentFeature);
  bubbleChart.updateDecisionBoundary(currentFeature, true);
});