const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  gravity: 0.42,
  friction: 0.86,
  trunkX: canvas.width / 2 - 40,
  trunkWidth: 80,
};
const START_PLAYER_Y = WORLD.height - 90;

const state = {
  keys: {},
  cameraY: 0,
  bestHeight: 0,
  gameOver: false,
  particles: [],
  platforms: [],
};

const player = {
  x: WORLD.width / 2 - 8,
  y: START_PLAYER_Y,
  w: 16,
  h: 20,
  vx: 0,
  vy: 0,
  onGround: false,
  jumpsUsed: 0,
  maxJumps: 2,
  facing: 1,
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resetGame() {
  state.cameraY = 0;
  state.bestHeight = 0;
  state.gameOver = false;
  state.particles = [];
  state.platforms = [];

  player.x = WORLD.width / 2 - player.w / 2;
  player.y = START_PLAYER_Y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.jumpsUsed = 0;
  player.facing = 1;

  let y = WORLD.height - 48;
  for (let i = 0; i < 26; i += 1) {
    const nearTrunk = Math.random() > 0.42;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = nearTrunk
      ? WORLD.width / 2 + side * rand(24, 64)
      : rand(20, WORLD.width - 90);

    state.platforms.push({
      x: clamp(x, 10, WORLD.width - 76),
      y,
      w: rand(42, 76),
      h: 10,
    });
    y -= rand(28, 44);
  }
}

function pushParticle(x, y, color) {
  state.particles.push({
    x,
    y,
    vx: rand(-0.8, 0.8),
    vy: rand(-1.8, -0.3),
    life: rand(18, 34),
    color,
  });
}

function spawnLandingDust(px, py) {
  for (let i = 0; i < 8; i += 1) {
    pushParticle(px + rand(-7, 7), py + rand(-2, 2), "#f1eecb");
  }
}

function spawnJumpSpark(px, py) {
  for (let i = 0; i < 5; i += 1) {
    pushParticle(px + rand(-3, 3), py, "#ffd15e");
  }
}

function handleInput() {
  const left = state.keys.ArrowLeft || state.keys.a || state.keys.A;
  const right = state.keys.ArrowRight || state.keys.d || state.keys.D;

  if (left) {
    player.vx -= 0.55;
    player.facing = -1;
  }
  if (right) {
    player.vx += 0.55;
    player.facing = 1;
  }
}

function jump() {
  if (state.gameOver) return;
  if (player.jumpsUsed >= player.maxJumps) return;
  player.vy = player.jumpsUsed === 0 ? -9.2 : -8.2;
  player.jumpsUsed += 1;
  spawnJumpSpark(player.x + player.w / 2, player.y + player.h);
}

function updatePlayer() {
  handleInput();

  player.vy += WORLD.gravity;
  player.vx *= WORLD.friction;
  player.vx = clamp(player.vx, -4.4, 4.4);

  let nextX = player.x + player.vx;
  let nextY = player.y + player.vy;

  if (nextX < 0) {
    nextX = 0;
    player.vx = 0;
  }
  if (nextX + player.w > WORLD.width) {
    nextX = WORLD.width - player.w;
    player.vx = 0;
  }

  player.onGround = false;
  for (const p of state.platforms) {
    const wasAbove = player.y + player.h <= p.y + 2;
    const passesDown = nextY + player.h >= p.y;
    const overlapX = nextX + player.w > p.x && nextX < p.x + p.w;
    if (wasAbove && passesDown && overlapX && player.vy >= 0) {
      nextY = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.jumpsUsed = 0;
      spawnLandingDust(player.x + player.w / 2, p.y);
      break;
    }
  }

  player.x = nextX;
  player.y = nextY;

  const climbHeight = Math.max(0, START_PLAYER_Y - player.y);
  if (climbHeight > state.bestHeight) {
    state.bestHeight = climbHeight;
  }

  // Keep camera moving upward with progress; do not track downward falls.
  const targetCameraY = -Math.max(0, state.bestHeight - 190);
  state.cameraY += (targetCameraY - state.cameraY) * 0.08;

  // Move platform set upward endlessly as player climbs.
  const worldTopY = state.cameraY - 70;
  const highest = state.platforms.reduce((m, p) => Math.min(m, p.y), Number.POSITIVE_INFINITY);
  while (highest > worldTopY) {
    const baseY = highest - rand(30, 46);
    const nearTrunk = Math.random() > 0.38;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = nearTrunk
      ? WORLD.width / 2 + side * rand(20, 70)
      : rand(12, WORLD.width - 82);
    state.platforms.push({
      x: clamp(x, 8, WORLD.width - 80),
      y: baseY,
      w: rand(40, 78),
      h: 10,
    });
    state.platforms.sort((a, b) => a.y - b.y);
    if (state.platforms.length > 42) {
      state.platforms.pop();
    }
    break;
  }

  if (player.y - state.cameraY > WORLD.height + 110) {
    state.gameOver = true;
  }
}

function updateParticles() {
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 1;
  }
}

function drawSky() {
  const yShift = Math.floor(-state.cameraY * 0.2) % WORLD.height;
  for (let i = -1; i <= 2; i += 1) {
    const y = i * WORLD.height + yShift;
    ctx.fillStyle = "#78aee2";
    ctx.fillRect(0, y, WORLD.width, WORLD.height);

    ctx.fillStyle = "#96c5ee";
    for (let k = 0; k < 8; k += 1) {
      const cloudX = (k * 56 + i * 23) % (WORLD.width + 60) - 30;
      const cloudY = y + 24 + ((k * 31 + i * 13) % 220);
      ctx.fillRect(cloudX, cloudY, 26, 8);
      ctx.fillRect(cloudX + 4, cloudY - 4, 16, 8);
    }
  }
}

function drawTrunk() {
  const trunkY = -2000;
  const trunkH = 5000;
  ctx.fillStyle = "#5b3a28";
  ctx.fillRect(WORLD.trunkX, trunkY - state.cameraY, WORLD.trunkWidth, trunkH);

  ctx.fillStyle = "#70452f";
  for (let y = trunkY; y < trunkY + trunkH; y += 20) {
    ctx.fillRect(WORLD.trunkX + 10, y - state.cameraY, WORLD.trunkWidth - 20, 2);
  }
}

function drawPlatforms() {
  for (const p of state.platforms) {
    const sy = p.y - state.cameraY;
    if (sy > WORLD.height + 30 || sy < -30) continue;

    ctx.fillStyle = "#4e8a2e";
    ctx.fillRect(p.x, sy, p.w, p.h);
    ctx.fillStyle = "#6da83f";
    ctx.fillRect(p.x + 2, sy + 2, p.w - 4, 3);
  }
}

function drawPlayer() {
  const sx = player.x;
  const sy = player.y - state.cameraY;

  ctx.fillStyle = "#2b2f46";
  ctx.fillRect(sx + 4, sy + 2, 8, 6);
  ctx.fillStyle = "#f8d39d";
  ctx.fillRect(sx + 4, sy + 8, 8, 6);

  ctx.fillStyle = "#cc4a4a";
  ctx.fillRect(sx + 2, sy + 14, 12, 4);

  ctx.fillStyle = "#2d2230";
  ctx.fillRect(sx + 3, sy + 18, 4, 2);
  ctx.fillRect(sx + 9, sy + 18, 4, 2);

  ctx.fillStyle = "#0f1221";
  if (player.facing === 1) {
    ctx.fillRect(sx + 9, sy + 10, 2, 2);
  } else {
    ctx.fillRect(sx + 5, sy + 10, 2, 2);
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const alpha = clamp(p.life / 34, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y - state.cameraY, 2, 2);
    ctx.globalAlpha = 1;
  }
}

function drawUI() {
  const h = Math.floor(state.bestHeight / 10);
  ctx.fillStyle = "#171926";
  ctx.fillRect(10, 10, 180, 52);
  ctx.fillStyle = "#f1eecb";
  ctx.font = '16px "Courier New", monospace';
  ctx.fillText(`高度: ${h} m`, 18, 33);
  ctx.fillText(`二段跳: ${player.maxJumps - player.jumpsUsed}`, 18, 52);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(32, WORLD.height / 2 - 70, WORLD.width - 64, 140);
    ctx.fillStyle = "#f1eecb";
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText("你掉下去了!", 112, WORLD.height / 2 - 22);
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`最终高度: ${h} m`, 130, WORLD.height / 2 + 8);
    ctx.fillText("按 R 重新开始", 130, WORLD.height / 2 + 36);
  }
}

function render() {
  drawSky();
  drawTrunk();
  drawPlatforms();
  drawPlayer();
  drawParticles();
  drawUI();
}

function frame() {
  if (!state.gameOver) {
    updatePlayer();
    updateParticles();
  } else {
    updateParticles();
  }
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (e) => {
  state.keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    e.preventDefault();
    jump();
  }
  if (e.key === "r" || e.key === "R") {
    resetGame();
  }
});

window.addEventListener("keyup", (e) => {
  state.keys[e.key] = false;
});

resetGame();
frame();
