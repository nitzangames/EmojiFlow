(function() {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');

  var VERSION = 'v20';
  var gameState = 'title'; // title | loading | playing | overlay
  var overlayType = null;  // 'won' | 'lost'
  var state = null;        // GameState from game-logic.js
  var levelNum = 1;
  var levelDef = null;
  var emojiImage = null;
  var hitRects = [];
  var overlayBtnRect = null;
  var titleBtnRect = null;

  // Orbit animation state
  var orbitRunners = []; // active orbit animations
  var clearingCells = []; // cells being animated out

  var lastTime = 0;

  // --- Image Loading ---
  function loadLevel(num) {
    levelNum = num;
    levelDef = LEVELS[num - 1];
    gameState = 'loading';
    emojiImage = new Image();
    emojiImage.onload = function() {
      var extracted = extractBoard(emojiImage, levelDef.quantizeThreshold);
      state = createGameState(extracted.board, extracted.palette, levelNum, levelDef);
      orbitRunners = [];
      clearingCells = [];
      clearTweens();
      gameState = 'playing';
    };
    emojiImage.src = 'emoji/' + levelDef.emoji + '.png';
  }

  // --- Input ---
  function hitTest(gx, gy, rect) {
    return gx >= rect.x && gx <= rect.x + rect.w && gy >= rect.y && gy <= rect.y + rect.h;
  }

  canvas.addEventListener('pointerdown', function(e) {
    var rect = canvas.getBoundingClientRect();
    var gx = (e.clientX - rect.left) * (1080 / rect.width);
    var gy = (e.clientY - rect.top) * (1920 / rect.height);

    if (gameState === 'title') {
      if (titleBtnRect && hitTest(gx, gy, titleBtnRect)) {
        var current = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
        loadLevel(current);
      }
      return;
    }

    if (gameState === 'overlay') {
      if (overlayBtnRect && hitTest(gx, gy, overlayBtnRect)) {
        if (overlayType === 'won') {
          var next = levelNum + 1;
          if (next > LEVELS.length) next = 1;
          loadLevel(next);
        } else {
          loadLevel(levelNum);
        }
      }
      return;
    }

    if (gameState === 'playing') {
      for (var i = 0; i < hitRects.length; i++) {
        var hr = hitRects[i];
        if (hitTest(gx, gy, hr)) {
          if (hr.type === 'column') {
            onColumnTap(hr.index);
          } else if (hr.type === 'wait') {
            onWaitSlotTap(hr.index);
          }
          return;
        }
      }
    }
  });

  // --- Game Actions ---
  function onColumnTap(colIndex) {
    var result = launchFromColumn(state, colIndex);
    if (!result) return;
    runOrbit(result.shooter, result.hits);
  }

  function onWaitSlotTap(slotIndex) {
    var result = launchFromWaitSlot(state, slotIndex);
    if (!result) return;
    runOrbit(result.shooter, result.hits);
  }

  // --- Orbit Animation ---
  function getOrbitPosition(edge, pos) {
    var bx = BOARD_X, by = BOARD_Y, bw = BOARD_PX, bh = BOARD_PX;
    var step = CELL_SIZE, margin = TRACK_MARGIN;
    switch (edge) {
      case 0: return { x: bx + pos * step + step / 2, y: by + bh + margin };
      case 1: return { x: bx + bw + margin, y: by + bh - pos * step - step / 2 };
      case 2: return { x: bx + bw - pos * step - step / 2, y: by - margin };
      case 3: return { x: bx - margin, y: by + pos * step + step / 2 };
    }
  }

  function getOrbitCorner(cornerIndex) {
    var bx = BOARD_X, by = BOARD_Y, bw = BOARD_PX, bh = BOARD_PX;
    var margin = TRACK_MARGIN;
    switch (cornerIndex) {
      case 0: return { x: bx - margin, y: by + bh + margin };
      case 1: return { x: bx + bw + margin, y: by + bh + margin };
      case 2: return { x: bx + bw + margin, y: by - margin };
      case 3: return { x: bx - margin, y: by - margin };
    }
  }

  function runOrbit(shooter, hits) {
    var color = state.palette[shooter.colorIndex];
    var startPos = getOrbitCorner(0);

    var runner = {
      shooter: shooter,
      hits: hits,
      colorHex: color.hex,
      x: startPos.x,
      y: startPos.y,
      ammo: shooter.ammo,
      clearedDuringAnim: {},
      path: [],
      stepIndex: 0,
      moving: false,
    };

    // Build path
    for (var edge = 0; edge < 4; edge++) {
      var corner = getOrbitCorner(edge);
      runner.path.push({ pos: corner, hit: null });

      var edgeHits = hits.filter(function(h) { return h.edge === edge; });
      for (var p = 0; p < GRID_SIZE; p++) {
        var wp = getOrbitPosition(edge, p);
        var hitHere = null;
        for (var eh = 0; eh < edgeHits.length; eh++) {
          if (edgeHits[eh].pos === p) { hitHere = edgeHits[eh]; break; }
        }
        runner.path.push({ pos: wp, hit: hitHere });
      }
    }
    runner.path.push({ pos: getOrbitCorner(0), hit: null });

    orbitRunners.push(runner);
    advanceOrbit(runner);
  }

  function advanceOrbit(runner) {
    if (runner.stepIndex >= runner.path.length) {
      // Orbit complete
      applyOrbit(state, runner.hits, runner.shooter);
      var idx = orbitRunners.indexOf(runner);
      if (idx >= 0) orbitRunners.splice(idx, 1);
      checkWinLose(state);
      checkEndState();
      return;
    }

    var wp = runner.path[runner.stepIndex];
    runner.stepIndex++;
    runner.moving = true;

    tweenTo(runner, { x: wp.pos.x, y: wp.pos.y }, 30, 'linear', function() {
      runner.moving = false;
      if (wp.hit && runner.ammo > 0) {
        var cellKey = wp.hit.row + ',' + wp.hit.col;
        var cellIdx = wp.hit.row * GRID_SIZE + wp.hit.col;
        if (state.board[cellIdx] === runner.shooter.colorIndex && !runner.clearedDuringAnim[cellKey]) {
          // Clear this cube with animation
          var color = state.palette[state.board[cellIdx]];
          clearingCells.push({
            row: wp.hit.row,
            col: wp.hit.col,
            colorHex: color.hex,
            scale: 1,
            alpha: 1,
            flashAlpha: 1,
            elapsed: 0,
          });
          state.board[cellIdx] = 255;
          runner.clearedDuringAnim[cellKey] = true;
          runner.ammo--;
          // Pause 80ms then continue
          setTimeout(function() { advanceOrbit(runner); }, 80);
          return;
        }
      }
      advanceOrbit(runner);
    });
  }

  function checkEndState() {
    if (state.status === 'won') {
      var stars = calcStars(state);
      var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
      if (state.levelNumber >= currentLevel) {
        localStorage.setItem('emoji-flow:currentLevel', (state.levelNumber + 1).toString());
      }
      var allStars = JSON.parse(localStorage.getItem('emoji-flow:stars') || '{}');
      var prev = allStars[state.levelNumber] || 0;
      if (stars > prev) {
        allStars[state.levelNumber] = stars;
        localStorage.setItem('emoji-flow:stars', JSON.stringify(allStars));
      }
      overlayType = 'won';
      gameState = 'overlay';
    } else if (state.status === 'lost') {
      overlayType = 'lost';
      gameState = 'overlay';
    }
  }

  // --- Update ---
  function update(dt) {
    updateTweens(dt);

    // Update clearing cell animations
    for (var i = clearingCells.length - 1; i >= 0; i--) {
      var cell = clearingCells[i];
      cell.elapsed += dt;
      cell.flashAlpha = Math.max(0, 1 - cell.elapsed / 150);
      var t = Math.min(cell.elapsed / 200, 1);
      var eased = easingBackIn(t);
      cell.scale = 1 - eased;
      cell.alpha = 1 - t;
      if (cell.elapsed >= 200) {
        clearingCells.splice(i, 1);
      }
    }
  }

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, 1080, 1920);

    if (gameState === 'title') {
      var currentLevel = parseInt(localStorage.getItem('emoji-flow:currentLevel') || '1');
      titleBtnRect = drawTitleScreen(ctx, currentLevel, VERSION);
      return;
    }

    if (gameState === 'loading') {
      drawBackground(ctx);
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Loading...', 540, 960);
      return;
    }

    // playing or overlay — draw the game board
    var totalStars = 0;
    var allStars = JSON.parse(localStorage.getItem('emoji-flow:stars') || '{}');
    for (var k in allStars) totalStars += allStars[k];

    hitRects = [];
    drawBackground(ctx);
    drawHUD(ctx, levelNum, levelDef, totalStars);
    drawTrack(ctx);
    drawBoard(ctx, state, clearingCells);
    drawClearingCells(ctx, state, clearingCells);
    drawWaitSlots(ctx, state, hitRects);
    drawColumns(ctx, state, hitRects);

    // Draw orbit shooters
    for (var i = 0; i < orbitRunners.length; i++) {
      var runner = orbitRunners[i];
      drawOrbitShooter(ctx, runner.x, runner.y, runner.colorHex, runner.ammo);
    }

    // Overlay
    if (gameState === 'overlay') {
      if (overlayType === 'won') {
        var stars = calcStars(state);
        overlayBtnRect = drawWinOverlay(ctx, stars, levelDef, emojiImage);
      } else {
        overlayBtnRect = drawLoseOverlay(ctx);
      }
    }
  }

  // --- Game Loop ---
  function gameLoop(timestamp) {
    var dt = lastTime ? timestamp - lastTime : 16;
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  // --- Start ---
  requestAnimationFrame(gameLoop);
})();
