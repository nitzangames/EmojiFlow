// Create initial game state from extracted board data and level config
function createGameState(board, palette, levelNumber, levelDef) {
  var rng = mulberry32(levelNumber * 7919);

  // Count cubes per color
  var cubeCounts = new Array(palette.length).fill(0);
  for (var i = 0; i < board.length; i++) {
    if (board[i] !== 255) {
      cubeCounts[board[i]]++;
    }
  }

  // Generate shooters: one per color, ammo = exact cube count
  var shooters = [];
  var totalAmmo = 0;
  for (var c = 0; c < palette.length; c++) {
    if (cubeCounts[c] === 0) continue;
    var ammo = cubeCounts[c];
    shooters.push({ colorIndex: c, ammo: ammo });
    totalAmmo += ammo;
  }

  // Shuffle shooters
  seededShuffle(shooters, rng);

  // Deal into 4 columns round-robin
  var columns = [[], [], [], []];
  for (var s = 0; s < shooters.length; s++) {
    columns[s % NUM_COLUMNS].push(shooters[s]);
  }

  return {
    levelNumber: levelNumber,
    palette: palette,
    board: new Uint8Array(board),
    columns: columns,
    waitSlots: [null, null, null, null, null],
    orbitingCount: 0, // number of shooters currently on the track
    totalAmmo: totalAmmo,
    ammoUsed: 0,
    status: 'playing',
  };
}

// Count how many shooters are currently "out" (orbiting + in wait slots)
function countOutShooters(state) {
  var count = state.orbitingCount;
  for (var s = 0; s < NUM_WAIT_SLOTS; s++) {
    if (state.waitSlots[s] !== null) count++;
  }
  return count;
}

// Compute all shots a shooter takes during one clockwise orbit
// Returns: array of { edge, pos, row, col } for each hit
function computeOrbit(board, colorIndex) {
  var size = GRID_SIZE;
  var hits = [];

  // Edge 0: Bottom — move L→R, fire UP each column
  for (var col = 0; col < size; col++) {
    for (var row = size - 1; row >= 0; row--) {
      var ci = board[row * size + col];
      if (ci === 255) continue; // empty, keep scanning
      if (ci === colorIndex) {
        hits.push({ edge: 0, pos: col, row: row, col: col });
      }
      break; // blocked by this cube whether it matches or not
    }
  }

  // Edge 1: Right — move B→T, fire LEFT each row
  for (var row = size - 1; row >= 0; row--) {
    for (var col = size - 1; col >= 0; col--) {
      var ci = board[row * size + col];
      if (ci === 255) continue;
      if (ci === colorIndex) {
        hits.push({ edge: 1, pos: size - 1 - row, row: row, col: col });
      }
      break;
    }
  }

  // Edge 2: Top — move R→L, fire DOWN each column
  for (var col = size - 1; col >= 0; col--) {
    for (var row = 0; row < size; row++) {
      var ci = board[row * size + col];
      if (ci === 255) continue;
      if (ci === colorIndex) {
        hits.push({ edge: 2, pos: size - 1 - col, row: row, col: col });
      }
      break;
    }
  }

  // Edge 3: Left — move T→B, fire RIGHT each row
  for (var row = 0; row < size; row++) {
    for (var col = 0; col < size; col++) {
      var ci = board[row * size + col];
      if (ci === 255) continue;
      if (ci === colorIndex) {
        hits.push({ edge: 3, pos: row, row: row, col: col });
      }
      break;
    }
  }

  return hits;
}

// Apply orbit hits to game state
function applyOrbit(state, hits, shooter) {
  var applied = [];
  for (var i = 0; i < hits.length; i++) {
    if (shooter.ammo <= 0) break;
    var h = hits[i];
    if (state.board[h.row * GRID_SIZE + h.col] === shooter.colorIndex) {
      state.board[h.row * GRID_SIZE + h.col] = 255;
      shooter.ammo--;
      state.ammoUsed++;
      applied.push({ row: h.row, col: h.col });
    }
  }

  state.orbitingCount--;

  var dest;
  if (shooter.ammo > 0) {
    var placed = false;
    for (var s = 0; s < NUM_WAIT_SLOTS; s++) {
      if (state.waitSlots[s] === null) {
        state.waitSlots[s] = shooter;
        placed = true;
        break;
      }
    }
    dest = placed ? 'wait' : 'removed';
  } else {
    dest = 'removed';
  }

  return { hitsApplied: applied, shooterDest: dest };
}

// Launch the top shooter from a column
function launchFromColumn(state, colIndex) {
  if (state.status !== 'playing') return null;
  if (countOutShooters(state) >= NUM_WAIT_SLOTS) return null;
  var col = state.columns[colIndex];
  if (col.length === 0) return null;

  var shooter = col.shift();
  state.orbitingCount++;
  var hits = computeOrbit(state.board, shooter.colorIndex);
  return { shooter: shooter, hits: hits };
}

// Launch a shooter from a wait slot
function launchFromWaitSlot(state, slotIndex) {
  if (state.status !== 'playing') return null;
  var shooter = state.waitSlots[slotIndex];
  if (shooter === null) return null;

  state.waitSlots[slotIndex] = null;
  state.orbitingCount++;
  var hits = computeOrbit(state.board, shooter.colorIndex);
  return { shooter: shooter, hits: hits };
}

// Check if the game is won or lost
function checkWinLose(state) {
  var cubesRemain = false;
  for (var i = 0; i < state.board.length; i++) {
    if (state.board[i] !== 255) {
      cubesRemain = true;
      break;
    }
  }
  if (!cubesRemain) {
    state.status = 'won';
    return;
  }

  // Can't declare loss while shooters are still orbiting
  if (state.orbitingCount > 0) return;

  var hasShooters = false;
  for (var c = 0; c < state.columns.length; c++) {
    if (state.columns[c].length > 0) { hasShooters = true; break; }
  }
  if (!hasShooters) {
    for (var s = 0; s < state.waitSlots.length; s++) {
      if (state.waitSlots[s] !== null) { hasShooters = true; break; }
    }
  }
  if (!hasShooters) {
    state.status = 'lost';
  }
}

// Calculate star rating
function calcStars(state) {
  if (state.status !== 'won') return 0;
  var ammoRemaining = state.totalAmmo - state.ammoUsed;
  var fraction = ammoRemaining / state.totalAmmo;
  if (fraction >= 0.20) return 3;
  if (ammoRemaining > 0) return 2;
  return 1;
}
