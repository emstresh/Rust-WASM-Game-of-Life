import { Universe } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";
import { drawGrid, updateCells, drawAllCells } from "./js/draw";
import { theme } from "./js/themes";
import { fps } from "./js/stats";

const CELL_SIZE = 15; // px

const calculateDimensions = () => {
  const board = document.getElementById('game-board');
  const width = board.clientWidth;
  const height = board.clientHeight;

  const universeWidth = Math.floor(width / (CELL_SIZE + 1));
  const universeHeight = Math.floor(height / (CELL_SIZE + 1));

  return [ universeWidth, universeHeight ];
};

const gameState = (function() {
  let self = {};

  // initialize a new universe
  let dimensions = calculateDimensions();
  const universe = Universe.new(dimensions[0], dimensions[1]);
  let width = universe.width();
  let height = universe.height();

  // get the canvas and its 2d context
  const canvas = document.getElementById('game-of-life-canvas');
  const ctx = canvas.getContext('2d');
  // set the canvas dimensions such that we have a 1px border around cells
  canvas.height = (CELL_SIZE + 1) * height + 1;
  canvas.width = (CELL_SIZE + 1) * width + 1;

  // button controls
  const playPauseButton = document.getElementById('play-pause');
  const resetButton = document.getElementById('reset');
  const clearButton = document.getElementById('clear');
  const themeButton = document.getElementById('change-theme');
  const tickRange = document.getElementById('tickRange');

  // if the user clicks the canvas, we want to either toggle a cell
  // or insert a shape
  const onCanvasClick = (evt) => {
    // figure out which cell was clicked
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (evt.clientX - boundingRect.left) * scaleX;
    const canvasTop = (evt.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

    if (evt.metaKey) { // cmd + click inserts a glider
      universe.insert_glider(row, col);
    } else if (evt.shiftKey) { // shift + click inserts a pulsar
      universe.insert_pulsar(row, col);
    } else { // regular click toggles the cell
      universe.toggle_cell(row, col);
    }

    render();
  };

  // play the simulation
  const play = () => {
    playPauseButton.textContent = '❙❙';
    playPauseButton.title = 'Pause';
    renderLoop();
  };

  // pause the simulation
  const pause = () => {
    playPauseButton.textContent = '▶';
    playPauseButton.title = 'Play';
    cancelAnimationFrame(animationId);
    animationId = null;
  };

  // play/pause toggle
  const toggle = () => {
    if (isPaused()) {
      play();
    } else {
      pause();
    }
  };

  // reset the universe to a new random layout
  const reset = () => {
    universe.reset();
    render();
  };

  // clear the board (set all cells to "dead")
  const clear = () => {
    universe.clear();
    render();
  };

  // check whether or not the simulation is paused
  const isPaused = () => (
    animationId === null
  );

  // resize the universe based on window resize
  const resizeUniverse = () => {
    if (!isPaused()) pause();
    dimensions = calculateDimensions();
    universe.resize(dimensions[0], dimensions[1]);
    width = universe.width();
    height = universe.height();
    canvas.height = (CELL_SIZE + 1) * height + 1;
    canvas.width = (CELL_SIZE + 1) * width + 1;
    render();
  };

  playPauseButton.addEventListener('click', toggle);
  resetButton.addEventListener('click', reset);
  clearButton.addEventListener('click', clear);
  themeButton.addEventListener('click', (evt) => {
    theme.cycleTheme();
    render(true);
  });

  tickRange.addEventListener('change', (evt) => {
    ticksPerAnimationStep = parseInt(evt.target.value, 10);
  });

  let resizeTimer;
  window.onresize = (evt) => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeUniverse, 100);
  };
  window.onkeyup = (evt) => {
    if (evt.key === 'f') {
      toggle();
    } else if (evt.key === 'r') {
      reset();
    } else if (evt.key === 'v') {
      clear();
    }
  };

  // render the game board by redrawing the cells that changed since the last frame
  const render = (redrawAll = false) => {
    const cellsPtr = universe.cells();
    const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);
    
    const numChanged = universe.num_changed();
    const diffCellsPtr = universe.diff_cells();
    const diffCells = new Uint32Array(memory.buffer, diffCellsPtr, numChanged);

    if (redrawAll) {
      drawAllCells(ctx, cells, CELL_SIZE, width);
    } else {
      updateCells(ctx, cells, numChanged, diffCells, CELL_SIZE, width);
    }
    drawGrid(ctx, CELL_SIZE, width, height);
  };

  let animationId = null;
  let ticksPerAnimationStep = 1;
  const renderLoop = () => {
    fps.render();

    for (let i = 0; i < ticksPerAnimationStep; i++) {
      universe.tick();
    }

    render();

    animationId = requestAnimationFrame(renderLoop);
  };

  canvas.addEventListener('click', onCanvasClick);
  render();

  return self;
})();
