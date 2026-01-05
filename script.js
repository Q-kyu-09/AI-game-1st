// Breakout — Block breaker
// Simple, readable implementation (Keyboard / Mouse / Touch supported)
// Added BGM support: plays bgm.mp3 (loop) while the game is running.

(() => {
  // --- Canvas and hi-DPI resizing ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');

  // BGM element (must place bgm.mp3 in the same folder)
  const bgm = document.getElementById('bgm');
  if (bgm) {
    bgm.volume = 0.45; // default volume; adjust as needed
    bgm.loop = true;
  }

  async function tryPlayAudio(a) {
    if (!a) return;
    try {
      await a.play();
    } catch (err) {
      // Play might be blocked by autoplay policies; user interaction will usually allow subsequent plays.
      console.warn('BGM play was blocked or failed:', err);
    }
  }
  function tryPauseAudio(a) {
    if (!a) return;
    try {
      a.pause();
    } catch (err) {
      console.warn('BGM pause failed:', err);
    }
  }

  function syncBGMState() {
    // Play when gameplay is active (isPlaying && !isPaused), otherwise pause
    if (!bgm) return;
    if (state.isPlaying && !state.isPaused) {
      tryPlayAudio(bgm);
    } else {
      tryPauseAudio(bgm);
    }
  }

  function resizeCanvasForHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // preserve logical size in attributes
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initCanvasSize() {
    const logicalW = 800, logicalH = 600;
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';
    resizeCanvasForHiDPI();
  }
  initCanvasSize();
  window.addEventListener('resize', () => {
    setTimeout(resizeCanvasForHiDPI, 50);
  });

  // --- Game definition ---
  const GAME = {
    cols: 10,
    brickPadding: 6,
    brickOffsetTop: 40,
    brickOffsetLeft: 35,
    brickRowHeight: 20,
    brickHeights: 20,
    brickRowsBase: 4, // base rows at level 1 (increases with level)
    scorePerBrick: 10
  };

  let state = {
    score: 0,
    lives: 3,
    level: 1,
    bricks: [],
    isPlaying: false,
    isPaused: false
  };

  // Paddle
  const paddle = {
    w: 120,
    h: 12,
    x: 0,
    y: 0,
    speed: 8,
    moveLeft: false,
    moveRight: false
  };

  // Ball
  const ball = {
    r: 8,
    x: 0,
    y: 0,
    speed: 5,
    vx: 0,
    vy: 0
  };

  // --- Create bricks ---
  function createBricks() {
    const rows = GAME.brickRowsBase + (state.level - 1);
    const cols = GAME.cols;
    const padding = GAME.brickPadding;
    const offsetTop = GAME.brickOffsetTop;
    const offsetLeft = GAME.brickOffsetLeft;
    const totalPadding = padding * (cols - 1);
    const availableWidth = canvas.clientWidth - offsetLeft * 2;
    const brickWidth = Math.floor((availableWidth - totalPadding) / cols);
    const brickHeight = GAME.brickHeights;

    const bricks = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const bx = offsetLeft + c * (brickWidth + padding);
        const by = offsetTop + r * (brickHeight + padding);
        row.push({
          x: bx,
          y: by,
          w: brickWidth,
          h: brickHeight,
          alive: true,
          hits: 1 + Math.floor((state.level - 1) / 3) // durability increases with level
        });
      }
      bricks.push(row);
    }
    state.bricks = bricks;
  }

  // --- Initialize / reset positions ---
  function resetPositions() {
    paddle.x = (canvas.clientWidth - paddle.w) / 2;
    paddle.y = canvas.clientHeight - 36;
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 2;
    const angle = (Math.random() * Math.PI / 3) + (Math.PI / 6); // ~30–90 degrees
    ball.speed = 5 + (state.level - 1) * 0.6; // faster at higher levels
    ball.vx = ball.speed * Math.cos(angle);
    ball.vy = -Math.abs(ball.speed * Math.sin(angle));
  }

  function resetGame(full = false) {
    if (full) {
      state.score = 0;
      state.lives = 3;
      state.level = 1;
    }
    createBricks();
    resetPositions();
    updateHUD();
    // keep BGM paused unless the game is actively playing
    syncBGMState();
  }

  // --- HUD ---
  function updateHUD() {
    scoreEl.textContent = state.score;
    livesEl.textContent = state.lives;
    levelEl.textContent = state.level;
  }

  // --- Drawing utilities ---
  function clear() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  function drawRoundedRect(x, y, w, h, r = 4, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function draw() {
    clear();

    // Bricks
    for (let r = 0; r < state.bricks.length; r++) {
      for (let c = 0; c < state.bricks[r].length; c++) {
        const b = state.bricks[r][c];
        if (!b.alive) continue;
        const durability = b.hits;
        ctx.fillStyle = durability === 1 ? '#ff7a7a' : durability === 2 ? '#ffd36b' : '#9be37d';
        drawRoundedRect(b.x, b.y, b.w, b.h, 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Paddle
    ctx.fillStyle = '#4dd0e1';
    drawRoundedRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);

    // Ball
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    // small HUD area on canvas (decorative)
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(8, canvas.clientHeight - 28, 140, 20);
  }

  // --- Collision detection ---
  function rectCircleColliding(cx, cy, r, rx, ry, rw, rh) {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return (dx * dx + dy * dy) <= (r * r);
  }

  function updatePhysics() {
    // Paddle movement (keyboard)
    if (paddle.moveLeft) paddle.x -= paddle.speed;
    if (paddle.moveRight) paddle.x += paddle.speed;
    paddle.x = Math.max(6, Math.min(canvas.clientWidth - paddle.w - 6, paddle.x));

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Side walls
    if (ball.x - ball.r <= 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ball.r >= canvas.clientWidth) {
      ball.x = canvas.clientWidth - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    // Top wall
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    // Paddle collision
    if (rectCircleColliding(ball.x, ball.y, ball.r, paddle.x, paddle.y, paddle.w, paddle.h)) {
      const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const maxAngle = Math.PI / 3; // 60 degrees
      const angle = hitPos * maxAngle;
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx = speed * Math.sin(angle);
      ball.vy = -Math.abs(speed * Math.cos(angle));
      ball.y = paddle.y - ball.r - 1;
    }

    // Brick collisions
    let anyBrickHit = false;
    for (let r = 0; r < state.bricks.length; r++) {
      for (let c = 0; c < state.bricks[r].length; c++) {
        const b = state.bricks[r][c];
        if (!b.alive) continue;
        if (rectCircleColliding(ball.x, ball.y, ball.r, b.x, b.y, b.w, b.h)) {
          const prevX = ball.x - ball.vx;
          const prevY = ball.y - ball.vy;
          let collidedVertically = false;
          if (prevY + ball.r <= b.y || prevY - ball.r >= b.y + b.h) {
            ball.vy *= -1;
            collidedVertically = true;
          } else {
            ball.vx *= -1;
          }
          b.hits--;
          if (b.hits <= 0) {
            b.alive = false;
            state.score += GAME.scorePerBrick;
          } else {
            state.score += Math.floor(GAME.scorePerBrick / 2);
          }
          anyBrickHit = true;
          updateHUD();
          break;
        }
      }
      if (anyBrickHit) break;
    }

    // Ball fell below paddle
    if (ball.y - ball.r > canvas.clientHeight) {
      state.lives--;
      updateHUD();
      if (state.lives <= 0) {
        // Game over
        state.isPlaying = false;
        state.isPaused = false;
        overlayText.textContent = 'Game Over! Score: ' + state.score;
        overlay.style.pointerEvents = 'auto';
        overlay.style.display = 'flex';
        startBtn.textContent = 'Restart';
        // stop / pause bgm on game over
        syncBGMState();
      } else {
        // Respawn with pause
        resetPositions();
        state.isPaused = true;
        overlayText.textContent = 'Miss! Press Space to resume';
        overlay.style.pointerEvents = 'auto';
        overlay.style.display = 'flex';
        startBtn.textContent = 'Resume';
        // pause bgm while paused
        syncBGMState();
      }
    }

    // Level complete?
    let remaining = 0;
    for (let r = 0; r < state.bricks.length; r++) {
      for (let c = 0; c < state.bricks[r].length; c++) {
        if (state.bricks[r][c].alive) remaining++;
      }
    }
    if (remaining === 0) {
      state.level++;
      state.isPaused = true;
      overlay.style.pointerEvents = 'auto';
      overlay.style.display = 'flex';
      overlayText.textContent = 'Level ' + (state.level) + ' — Press Space to start';
      startBtn.textContent = 'Next Level';
      resetPositions();
      createBricks();
      updateHUD();
      // pause bgm until the user starts the next level
      syncBGMState();
    }
  }

  // --- Game loop ---
  let lastTime = 0;
  function loop(time) {
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;

    if (state.isPlaying && !state.isPaused) {
      updatePhysics();
    }
    draw();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // --- Input handlers ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      paddle.moveLeft = true;
    } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      paddle.moveRight = true;
    } else if (e.code === 'Space') {
      if (!state.isPlaying) {
        state.isPlaying = true;
        state.isPaused = false;
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'none';
        startBtn.textContent = 'Restart';
        // user interaction — attempt to play bgm
        syncBGMState();
      } else {
        state.isPaused = !state.isPaused;
        if (state.isPaused) {
          overlay.style.pointerEvents = 'auto';
          overlay.style.display = 'flex';
          overlayText.textContent = 'Paused — Press Space to resume';
        } else {
          overlay.style.pointerEvents = 'none';
          overlay.style.display = 'none';
        }
        // sync bgm play/pause with pause state
        syncBGMState();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      paddle.moveLeft = false;
    } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      paddle.moveRight = false;
    }
  });

  // Mouse / pointer moves paddle (convert clientX to canvas logical x)
  function pointerToCanvasX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    return rel * canvas.clientWidth;
  }
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === 'touch') {
      const cx = pointerToCanvasX(e.clientX);
      paddle.x = cx - paddle.w / 2;
      paddle.x = Math.max(6, Math.min(canvas.clientWidth - paddle.w - 6, paddle.x));
    }
  });

  // Start button
  startBtn.addEventListener('click', () => {
    if (!state.isPlaying) {
      state.isPlaying = true;
      state.isPaused = false;
      overlay.style.pointerEvents = 'none';
      overlay.style.display = 'none';
      startBtn.textContent = 'Restart';
      // start bgm on user click
      syncBGMState();
    } else {
      // Restart (full restart)
      resetGame(true);
      state.isPlaying = true;
      state.isPaused = false;
      overlay.style.pointerEvents = 'none';
      overlay.style.display = 'none';
      startBtn.textContent = 'Restart';
      // restart bgm from beginning
      if (bgm) {
        try {
          bgm.currentTime = 0;
        } catch (e) {}
      }
      syncBGMState();
    }
  });

  // --- Initial setup ---
  (function start() {
    resetGame(true);
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';
    overlayText.textContent = 'Press Space or the button to start';
    startBtn.textContent = 'Start';
    // BGM remains paused until the user starts the game (autoplay policies)
    syncBGMState();
  })();

})();