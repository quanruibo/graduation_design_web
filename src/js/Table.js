import { select } from "d3-selection";

export class Table {
  constructor(opts) {
    this.tableContainer = opts.tableContainer;
  }

  drawTable() {
    select("#data-table").remove();

    this.columnNames = [
      "数据集",
      "特征",
      "猫正确数",
      "猫错误数",
      "狗正确数",
      "狗错误数",
      "准确率",
    ];

    this.table = select(this.tableContainer)
      .append("table")
      .attr("id", "data-table");

    this.thead = this.table.append("thead");

    this.thead
      .selectAll("th")
      .data(this.columnNames, (d) => d)
      .join(
        (enter) => enter.append("th").text((d) => d),
        (update) => {},
        (exit) => {}
      );

    this.startData = [];
  }

  updateTable(newRow) {
    const updatedRow = {
      "数据集": newRow["dataset"],
      "特征": newRow["feature"],
      "猫正确数": newRow["cat right"],
      "猫错误数": newRow["cat wrong"],
      "狗正确数": newRow["dog right"],
      "狗错误数": newRow["dog wrong"],
      "准确率": newRow["accuracy"],
    };

    this.startData.unshift(updatedRow);

    // 使用 Set 去重，保持数据唯一性
    this.startData = Array.from(
      new Set(this.startData.map(JSON.stringify))
    ).map(JSON.parse);

    let rows = this.table
      .selectAll("tr")
      .data(this.startData)
      .join((enter) => enter.append("tr"));

    rows
      .selectAll("td")
      .data((row) => Object.entries(row)) // 替换 d3-collection 的 entries 为 Object.entries
      .join(
        (enter) => enter.append("td").text((d) => d[1]), // d[1] 是 value
        (update) => update.text((d) => d[1])
      );
  }
}