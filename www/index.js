import { Universe } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

const colorScheme = [
  '#301c2a',
  '#5b1036',
  '#7c3e4f',
  '#bb9564',
  '#8a5e4b'
];

const colorSchemeDiv = document.getElementById('color-scheme');
for (let i = 0, len = colorScheme.length; i < len; i++) {
  const colorBox = document.createElement('div');
  colorBox.style.backgroundColor = colorScheme[i];
  colorBox.style.width = `${100 / len}%`;
  colorSchemeDiv.appendChild(colorBox);
}

const CELL_SIZE = 10; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = colorScheme[0]; // "#FFFFFF";
const ALIVE_COLOR = colorScheme[4]; // "#000000";

document.getElementById('header').style.backgroundColor = colorScheme[2];

// Construct the universe, and get its width and height.
const universe = Universe.new(64, 64);
const width = universe.width();
const height = universe.height();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

let animationId = null;

const ctx = canvas.getContext('2d');

const playPauseButton = document.getElementById("play-pause");

const play = () => {
  playPauseButton.textContent = "⏸";
  renderLoop();
};

const pause = () => {
  playPauseButton.textContent = "▶";
  cancelAnimationFrame(animationId);
  animationId = null;
};

playPauseButton.addEventListener("click", evt => {
  if (isPaused()) {
    play();
  } else {
    pause();
  }
});

const tickRange = document.getElementById("tickRange");
let ticksPerAnimationStep = 1;

tickRange.addEventListener("change", evt => {
  ticksPerAnimationStep = parseInt(evt.target.value, 10);
  console.log('change', ticksPerAnimationStep);
});

const resetButton = document.getElementById("reset");

resetButton.addEventListener("click", evt => {
  universe.reset();
  drawGrid();
  drawCells();
});

const clearButton = document.getElementById("clear");

clearButton.addEventListener("click", evt => {
  universe.clear();
  drawGrid();
  drawCells();
});

canvas.addEventListener("click", evt => {
  const boundingRect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / boundingRect.width;
  const scaleY = canvas.height / boundingRect.height;

  const canvasLeft = (evt.clientX - boundingRect.left) * scaleX;
  const canvasTop = (evt.clientY - boundingRect.top) * scaleY;

  const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
  const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

  if (evt.metaKey) {
    universe.insert_glider(row, col);
  } else if (evt.shiftKey) {
    universe.insert_pulsar(row, col);
  } else {
    universe.toggle_cell(row, col);
  }

  drawGrid();
  drawCells();
});

const renderLoop = () => {
  fps.render();

  for (let i = 0; i < ticksPerAnimationStep; i++) {
    universe.tick();
  }

  drawGrid();
  drawCells();

  animationId = requestAnimationFrame(renderLoop);
};

const isPaused = () => {
  return animationId === null;
};

const drawGrid = () => {
  ctx.beginPath();
  ctx.strokeStyle = GRID_COLOR;

  // Vertical lines
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
    ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
  }

  // Horizontal lines
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (CELL_SIZE + 1) + 1);
    ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
  }
};

const getIndex = (row, column) => {
  return row * width + column;
};

const bitIsSet = (n, arr) => {
  const byte = Math.floor(n / 8);
  const mask = 1 << (n % 8);
  return (arr[byte] & mask) === mask;
};

const drawCells = () => {
  const cellsPtr = universe.cells();
  const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

  const diffCellsPtr = universe.diff_cells();
  const numDiffCells = universe.num_changed();
  const diffCells = new Uint32Array(memory.buffer, diffCellsPtr, numDiffCells);

  ctx.beginPath();

  ctx.fillStyle = ALIVE_COLOR;
  for (let i = 0; i < numDiffCells; i++) {
    const idx = diffCells[i];
    const row = Math.floor(idx / width);
    const col = idx % width;

    if (bitIsSet(idx, cells)) {
      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.fillStyle = DEAD_COLOR;
  for (let i = 0; i < numDiffCells; i++) {
    const idx = diffCells[i];
    const row = Math.floor(idx / width);
    const col = idx % width;

    if (!bitIsSet(idx, cells)) {
      ctx.fillRect(
        col * (CELL_SIZE + 1) + 1,
        row * (CELL_SIZE + 1) + 1,
        CELL_SIZE,
        CELL_SIZE
      );
    }
  }

  ctx.stroke();
};

const fps = new class {
  constructor() {
    this.fps = document.getElementById("fps");
    this.frames = [];
    this.lastFrameTimeStamp = performance.now();
  }

  render() {
    const now = performance.now();
    const delta = now - this.lastFrameTimeStamp;
    this.lastFrameTimeStamp = now;
    const fps = 1 / delta * 1000;

    this.frames.push(fps);
    if (this.frames.length > 100) {
      this.frames.shift();
    }

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (let i = 0; i < this.frames.length; i++) {
      sum += this.frames[i];
      min = Math.min(this.frames[i], min);
      max = Math.max(this.frames[i], max);
    }
    let mean = sum / this.frames.length;

    this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
  }
}

drawGrid();
drawCells();
pause();
