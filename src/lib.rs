mod utils;

extern crate web_sys;
extern crate fixedbitset;
use fixedbitset::FixedBitSet;
use js_sys::Math;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;


// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
  ( $( $t:tt )* ) => {
    web_sys::console::log_1(&format!( $( $t )* ).into());
  }
}

pub struct Timer<'a> {
  name: &'a str
}

impl<'a> Timer<'a> {
  pub fn new(name: &'a str) -> Timer<'a> {
    web_sys::console::time_with_label(name);
    Timer { name }
  }
}

impl<'a> Drop for Timer<'a> {
  fn drop(&mut self) {
    web_sys::console::time_end_with_label(self.name);
  }
}

#[wasm_bindgen]
pub struct Universe {
  width: u32,
  height: u32,
  cells: FixedBitSet,
  prev_cells: FixedBitSet,
  diff_cells: Vec<u32>,
  num_changed: usize
}

#[wasm_bindgen]
impl Universe {
  pub fn new(width: u32, height: u32) -> Universe {
    utils::set_panic_hook();

    let size = (width * height) as usize;

    let mut cells = FixedBitSet::with_capacity(size);
    for i in 0..size { cells.set(i, Math::random() > 0.5); }

    let prev_cells = FixedBitSet::with_capacity(size);

    Universe {
      width,
      height,
      cells,
      prev_cells,
      diff_cells: (0..size as u32).collect(),
      num_changed: size
    }
  }

  pub fn tick(&mut self) {
    let _timer = Timer::new("Universe::tick");

    self.num_changed = 0;
    self.diff_cells.truncate(0);

    for row in 0..self.height {
      for col in 0..self.width {
        let idx = self.get_index(row, col);
        let cell = self.cells[idx];
        let live_neighbors = self.live_neighbor_count(row, col);

        // log!(
        //   "cell[{}, {}] is initially {:?} and has {} live neighbors",
        //   row,
        //   col,
        //   cell,
        //   live_neighbors
        // );

        let next_cell = match (cell, live_neighbors) {
          // Rule 1: Any live cell with fewer than two live neighbors
          // dies, as if caused by underpopulation.
          (true, x) if x < 2 => false,
          // Rule 2: Any live cell with two or three live neighbors
          // lives on to the next generation.
          (true, 2) | (true, 3) => true,
          // Rule 3: Any live cell with more than three live
          // neighbors dies, as if by overpopulation.
          (true, x) if x > 3 => false,
          // Rule 4: Any dead cell with exactly three live neighbors
          // becomes a live cell, as if by reproduction
          (false, 3) => true,
          // All other cells remain in the same state.
          (otherwise, _) => otherwise
        };

        // log!("    it becomes {:?}", next_cell);

        self.prev_cells.set(idx, next_cell);

        if cell != next_cell {
          self.num_changed += 1;
          self.diff_cells.push(idx as u32);
        }
      }
    }

    self.diff_cells.truncate(self.num_changed);
    std::mem::swap(&mut self.cells, &mut self.prev_cells);
  }

  pub fn width(&self) -> u32 {
    self.width
  }

  pub fn height(&self) -> u32 {
    self.height
  }

  pub fn set_width(&mut self, width: u32) {
    self.width = width;

    let size = (width * self.height) as usize;
    self.cells = FixedBitSet::with_capacity(size);
    self.prev_cells = FixedBitSet::with_capacity(size);

    self.reset();
  }

  pub fn set_height(&mut self, height: u32) {
    self.height = height;

    let size = (self.width * height) as usize;
    self.cells = FixedBitSet::with_capacity(size);
    self.prev_cells = FixedBitSet::with_capacity(size);

    self.reset();
  }

  pub fn resize(&mut self, width: u32, height: u32) {
    self.width = width;
    self.height = height;

    let size = (self.width * self.height) as usize;
    self.cells = FixedBitSet::with_capacity(size);
    self.prev_cells = FixedBitSet::with_capacity(size);

    self.reset();
  }

  pub fn reset(&mut self) {
    let size = (self.width * self.height) as usize;
    for i in 0..size {
      self.cells.set(i, Math::random() > 0.5);
    }

    self.num_changed = size;
    self.diff_cells = (0..size as u32).collect();
  }

  pub fn clear(&mut self) {
    self.cells.clear();
    let size = (self.width * self.height) as usize;
    self.num_changed = size;
    self.diff_cells = (0..size as u32).collect();
  }

  pub fn cells(&self) -> *const u32 {
    self.cells.as_slice().as_ptr()
  }

  pub fn num_changed(&self) -> usize {
    self.num_changed
  }

  pub fn diff_cells(&self) -> *const u32 {
    self.diff_cells.as_slice().as_ptr()
  }

  pub fn toggle_cell(&mut self, row: u32, column: u32) {
    self.num_changed = 0;
    self.diff_cells.truncate(0);

    let idx = self.get_index(row, column);
    if self.cells[idx] {
      self.cells.set(idx, false);
    } else {
      self.cells.set(idx, true);
    }

    self.num_changed = 1;
    self.diff_cells.push(idx as u32);
  }

  pub fn set_cell(&mut self, row: u32, column: u32, value: bool) {
    let idx = self.get_index(row, column);
    self.cells.set(idx, value);
    self.num_changed += 1;
    self.diff_cells.push(idx as u32);
  }

  fn insert_square_template(&mut self, row: u32, column: u32, dimension: i32, template: Vec<u8>) {
    let half = dimension / 2;
    let mut template_iterator = 0;
    for i in (-1 * half)..(half + 1) {
      for j in (-1 * half)..(half + 1) {
        let val = if template[template_iterator] == 1 { true } else { false };
        let row_shift: i32 = row as i32 + i;
        let col_shift: i32 = column as i32 + j;
        if row_shift * col_shift >= 0 {
          self.set_cell(row_shift as u32, col_shift as u32, val);
        }
        template_iterator += 1;
      }
    }
  }

  pub fn insert_glider(&mut self, row: u32, column: u32) {
    let glider: Vec<u8> = vec![
      0, 0, 0, 0, 0,
      0, 0, 1, 0, 0,
      1, 0, 1, 0, 0,
      0, 1, 1, 0, 0,
      0, 0, 0, 0, 0
    ];
    self.insert_square_template(row, column, 5, glider);
  }

  pub fn insert_pulsar(&mut self, row: u32, column: u32) {
    let pulsar: Vec<u8> = vec![
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
      0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
      0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
      0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
      0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
      0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
      0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    self.insert_square_template(row, column, 15, pulsar);
  }

  fn get_index(&self, row: u32, column: u32) -> usize {
    (row * self.width + column) as usize
  }

  fn live_neighbor_count(&self, row: u32, column: u32) -> u8 {
    let mut count = 0;

    let north = if row == 0 {
      self.height - 1
    } else {
      row - 1
    };

    let south = if row == self.height - 1 {
      0
    } else {
      row + 1
    };

    let west = if column == 0 {
      self.width - 1
    } else {
      column - 1
    };

    let east = if column == self.width - 1 {
      0
    } else {
      column + 1
    };

    let nw = self.get_index(north, west);
    count += self.cells[nw] as u8;

    let n = self.get_index(north, column);
    count += self.cells[n] as u8;

    let ne = self.get_index(north, east);
    count += self.cells[ne] as u8;

    let w = self.get_index(row, west);
    count += self.cells[w] as u8;

    let e = self.get_index(row, east);
    count += self.cells[e] as u8;

    let sw = self.get_index(south, west);
    count += self.cells[sw] as u8;

    let s = self.get_index(south, column);
    count += self.cells[s] as u8;

    let se = self.get_index(south, east);
    count += self.cells[se] as u8;

    count
  }
}

impl std::fmt::Display for Universe {
  fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
    for i in 0..((self.width * self.height) as usize) {
      let cell = self.cells[i];
      let symbol = if cell { '◼' } else { '◻' };
      if i % self.width as usize == 0 {
        write!(f, "\n")?;
      }
      write!(f, "{}", symbol)?;
    }

    Ok(())
  }
}
