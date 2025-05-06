## 本地部署说明

本项目是一个面向初中学习者的可视化人工智能教学工具，基于 **Vite、D3.js、TensorFlow.js 和 MobileNet** 开发，支持低资源环境下的静态网站部署。以下是在本地运行项目的详细步骤。

### 前提条件
- **Node.js**：版本 16.x 或更高（推荐使用 LTS 版本）。
- **npm**：随 Node.js 安装，通常为 8.x 或更高。
- **操作系统**：Windows、macOS 或 Linux。
- **浏览器**：支持现代 JavaScript 和 WebRTC 的浏览器（如 Chrome、Edge、Firefox）。

### 部署步骤

1. **克隆项目并进入目录**
   或直接解压项目文件夹。

2. **安装依赖**
   在项目根目录运行以下命令，安装所需 npm 包（包括 Vite、D3.js、TensorFlow.js 等）：
   ```bash
   npm install
   ```
   确保 `package.json` 和 `package-lock.json` 存在，依赖将安装到 `node_modules/`（已忽略在 `.gitignore` 中）。

3. **构建项目**
   使用 Vite 构建静态文件，生成优化后的 `dist/` 目录：
   ```bash
   npm run build
   ```
   构建完成后，`dist/` 包含 `datasets.html`、`models.html`、压缩的 JS/CSS 文件（如 `datasets-index-DCIs3d3F.js`）、字体文件（`fonts/`）和 MobileNet 模型文件（`models/mobilenet/`）。

4. **本地预览**
   运行以下命令，通过 Vite 的本地服务器预览生产环境效果：
   ```bash
   npm run preview
   ```
   浏览器访问 `http://localhost:4173/datasets.html` 查看项目。注意：此步骤模拟生产环境，但需保持终端运行。

5. **使用 Nginx 部署静态网站**
   - **安装 Nginx**：从 [Nginx 官网](https://nginx.org/) 下载并安装，或通过包管理器（如 `apt install nginx` 或 `brew install nginx`）。
   - **配置 Nginx**：
     1. 复制项目根目录的 `nginx.conf` 到 Nginx 配置文件目录.
   - **启动 Nginx**：
    在 Nginx 安装目录运行 `nginx`（确保配置文件已加载）。
   - **访问项目**：在浏览器打开 `http://服务器IP或者域名/datasets.html`，即可体验交互式 AI 教学功能（如散点图、图像分类）。

### 注意事项
- **HTTPS 配置**：项目使用 WebRTC（摄像头）需 HTTPS。本地测试可暂时忽略，但生产环境需配置 SSL（参考 `nginx.conf` 中的 HTTPS 设置）。
- **路径调整**：Windows 用户确保路径格式正确（如 `e:/` 而非 `e:\`），Linux/macOS 用户调整 `nginx.conf` 中的 `root` 路径。
- **内存管理**：TensorFlow.js 已通过 `tf.tidy` 和 `tf.dispose` 优化内存，运行时监控浏览器内存占用。
- **调试**：若构建失败，检查 `vite.config.js` 或运行 `npm run build -- --debug` 查看详细日志。

### 项目结构说明
- `dist/`：Vite 构建的静态文件，用于部署。
- `public/`：字体和 MobileNet 模型文件，构建时复制到 `dist/`。
- `src/`：源代码，包含交互组件（`Bubble.js`、`teachable-machine.js` 等）和页面（`datasets.html`、`models.html`）。
- `nginx.conf`：Nginx 配置文件，优化静态资源缓存。
- `vite.config.js`：Vite 配置，支持代码分割和低资源优化。

### 运行效果
访问，体验：
- **数据作用模块**：拖动散点图调整数据集，实时更新决策边界和模型指标。
- **模型与道德模块**：交互式线性回归、混淆矩阵计算，及摄像头实时图像分类，探索 AI 伦理问题。

---

## 许可
本项目由 **全瑞博** 基于 Jared Wilber 的原始作品二次开发，采用 **CC BY-SA 4.0** 协议。

---