import { theme } from "./themes";

const bitIsSet = (n, arr) => {
  const byte = Math.floor(n / 8);
  const mask = 1 << (n % 8);
  return (arr[byte] & mask) === mask;
};

export function drawGrid (ctx, cellSize, width, height) {
  ctx.beginPath();
  ctx.strokeStyle = theme.getValue('--tertiary-color');

  // Vertical lines
  for (let i = 0; i <= width; i++) {
    ctx.moveTo(i * (cellSize + 1) + 1, 0);
    ctx.lineTo(i * (cellSize + 1) + 1, (cellSize + 1) * height + 1);
  }

  // Horizontal lines
  for (let j = 0; j <= height; j++) {
    ctx.moveTo(0, j * (cellSize + 1) + 1);
    ctx.lineTo((cellSize + 1) * width + 1, j * (cellSize + 1) + 1);
  }

  ctx.stroke();
}

export function updateCells(ctx, cells, numChanged, diffCells, cellSize, width) {
  ctx.beginPath();

  ctx.fillStyle = theme.getValue('--alive-color');
  for (let i = 0; i < numChanged; i++) {
    const idx = diffCells[i];
    const row = Math.floor(idx / width);
    const col = idx % width;

    if (bitIsSet(idx, cells)) {
      ctx.fillRect(
        col * (cellSize + 1) + 1,
        row * (cellSize + 1) + 1,
        cellSize,
        cellSize
      );
    }
  }

  ctx.fillStyle = theme.getValue('--dead-color');
  for (let i = 0; i < numChanged; i++) {
    const idx = diffCells[i];
    const row = Math.floor(idx / width);
    const col = idx % width;

    if (!bitIsSet(idx, cells)) {
      ctx.fillRect(
        col * (cellSize + 1) + 1,
        row * (cellSize + 1) + 1,
        cellSize,
        cellSize
      );
    }
  }

  ctx.stroke();
}

export function drawAllCells(ctx, cells, cellSize, width) {
  ctx.beginPath();

  ctx.fillStyle = theme.getValue('--alive-color');
  for (let i = 0; i < cells.length; i++) {
    const row = Math.floor(i / width);
    const col = i % width;

    if (bitIsSet(i, cells)) {
      ctx.fillRect(
        col * (cellSize + 1) + 1,
        row * (cellSize + 1) + 1,
        cellSize,
        cellSize
      );
    }
  }

  ctx.fillStyle = theme.getValue('--dead-color');
  for (let i = 0; i < cells.length; i++) {
    const row = Math.floor(i / width);
    const col = i % width;

    if (!bitIsSet(i, cells)) {
      ctx.fillRect(
        col * (cellSize + 1) + 1,
        row * (cellSize + 1) + 1,
        cellSize,
        cellSize
      );
    }
  }

  ctx.stroke();
}
