const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const highScoreEl = document.querySelector("#highScore");
const currentScoreEl = document.querySelector("#currentScore");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");

const BRICK_SCORE = 5;
const SPEEDUP_INTERVAL_MS = 25000;
const SPEEDUP_FACTOR = 1.12;
const MAX_BALL_SPEED = 13;
const STORAGE_KEY = "brick-breaker-high-score";

let highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
let score = 0;
let gameState = "ready";
let animationId = 0;
let firebaseStore = null;
let lastSpeedUpAt = 0;

const game = {
  width: 960,
  height: 640,
  paddle: {
    width: 132,
    height: 16,
    x: 414,
    y: 590,
    targetX: 414,
    speed: 0.28,
  },
  ball: {
    x: 480,
    y: 470,
    radius: 9,
    dx: 5,
    dy: -6,
  },
  bricks: [],
};

const brickLayout = {
  rows: 6,
  cols: 10,
  width: 76,
  height: 26,
  gap: 12,
  offsetTop: 74,
};

const brickColors = ["#b84f32", "#c45a37", "#a9462e", "#d06a3d", "#b65335", "#ca6138"];

function updateScoreboard() {
  highScoreEl.textContent = highScore.toString();
  currentScoreEl.textContent = score.toString();
}

function createBricks(previousBricks = []) {
  const totalWidth =
    brickLayout.cols * brickLayout.width + (brickLayout.cols - 1) * brickLayout.gap;
  const offsetLeft = (game.width - totalWidth) / 2;

  game.bricks = [];
  for (let row = 0; row < brickLayout.rows; row += 1) {
    for (let col = 0; col < brickLayout.cols; col += 1) {
      game.bricks.push({
        x: offsetLeft + col * (brickLayout.width + brickLayout.gap),
        y: brickLayout.offsetTop + row * (brickLayout.height + brickLayout.gap),
        width: brickLayout.width,
        height: brickLayout.height,
        color: brickColors[row % brickColors.length],
        alive: previousBricks[row * brickLayout.cols + col]?.alive ?? true,
      });
    }
  }
}

function resetGame() {
  score = 0;
  gameState = "playing";
  lastSpeedUpAt = performance.now();
  game.paddle.x = (game.width - game.paddle.width) / 2;
  game.paddle.targetX = game.paddle.x;
  game.ball.x = game.width / 2;
  game.ball.y = game.height - 154;
  game.ball.dx = Math.random() > 0.5 ? 5 : -5;
  game.ball.dy = -6;
  createBricks();
  updateScoreboard();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  game.width = rect.width;
  game.height = rect.height;

  brickLayout.width = Math.max(42, Math.min(76, (game.width - 140) / brickLayout.cols));
  brickLayout.height = Math.max(20, Math.min(28, game.height * 0.042));
  brickLayout.gap = Math.max(7, Math.min(12, game.width * 0.012));
  brickLayout.offsetTop = Math.max(46, game.height * 0.1);

  game.paddle.width = Math.max(86, Math.min(140, game.width * 0.14));
  game.paddle.height = Math.max(13, Math.min(18, game.height * 0.026));
  game.paddle.y = game.height - Math.max(42, game.height * 0.07);
  game.ball.radius = Math.max(7, Math.min(10, game.width * 0.011));

  if (gameState !== "playing") {
    game.paddle.x = (game.width - game.paddle.width) / 2;
    game.paddle.targetX = game.paddle.x;
    game.ball.x = game.width / 2;
    game.ball.y = game.paddle.y - 42;
  }

  createBricks(game.bricks);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setPaddleFromPointer(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left - game.paddle.width / 2;
  game.paddle.targetX = clamp(x, 0, game.width - game.paddle.width);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, game.width, game.height);
  gradient.addColorStop(0, "#79cfff");
  gradient.addColorStop(0.62, "#bce9ff");
  gradient.addColorStop(1, "#eefbff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.width, game.height);

  drawCloud(game.width * 0.18, game.height * 0.16, game.width * 0.1);
  drawCloud(game.width * 0.58, game.height * 0.12, game.width * 0.12);
  drawCloud(game.width * 0.83, game.height * 0.24, game.width * 0.09);
}

function drawCloud(x, y, size) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.32, Math.PI, 0);
  ctx.arc(x + size * 0.28, y - size * 0.12, size * 0.42, Math.PI, 0);
  ctx.arc(x + size * 0.68, y, size * 0.34, Math.PI, 0);
  ctx.lineTo(x + size * 0.92, y + size * 0.22);
  ctx.lineTo(x - size * 0.18, y + size * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawBricks() {
  for (const brick of game.bricks) {
    if (!brick.alive) continue;

    ctx.fillStyle = brick.color;
    ctx.shadowColor = "rgba(107, 49, 31, 0.22)";
    ctx.shadowBlur = 5;
    roundRect(brick.x, brick.y, brick.width, brick.height, 3);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(98, 44, 28, 0.45)";
    ctx.lineWidth = 1;
    roundRect(brick.x + 0.5, brick.y + 0.5, brick.width - 1, brick.height - 1, 3);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 207, 170, 0.28)";
    ctx.fillRect(brick.x + 5, brick.y + 4, brick.width - 10, 3);
    ctx.fillStyle = "rgba(96, 38, 26, 0.25)";
    ctx.fillRect(brick.x + brick.width * 0.5 - 1, brick.y + 3, 2, brick.height - 6);
  }
  ctx.shadowBlur = 0;
}

function drawPaddle() {
  const paddle = game.paddle;
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  gradient.addColorStop(0, "#31b7e6");
  gradient.addColorStop(0.5, "#3dd3bd");
  gradient.addColorStop(1, "#ffcf5a");
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(61, 211, 189, 0.55)";
  ctx.shadowBlur = 18;
  roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawBall() {
  const ball = game.ball;
  const gradient = ctx.createRadialGradient(
    ball.x - ball.radius / 3,
    ball.y - ball.radius / 3,
    2,
    ball.x,
    ball.y,
    ball.radius,
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.4, "#fffcdf");
  gradient.addColorStop(1, "#ffcf5a");
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(255, 207, 90, 0.7)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function update() {
  const { paddle, ball } = game;
  maybeSpeedUpBall();

  paddle.x += (paddle.targetX - paddle.x) * paddle.speed;
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.radius > game.width || ball.x - ball.radius < 0) {
    ball.dx *= -1;
    ball.x = clamp(ball.x, ball.radius, game.width - ball.radius);
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
    ball.y = ball.radius;
  }

  const hitsPaddle =
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.height + Math.abs(ball.dy) &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy > 0;

  if (hitsPaddle) {
    const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.dx = hitPoint * 7.2;
    ball.dy = -Math.max(5.5, Math.abs(ball.dy) + 0.12);
    ball.y = paddle.y - ball.radius;
  }

  for (const brick of game.bricks) {
    if (!brick.alive) continue;

    const hitsBrick =
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height;

    if (hitsBrick) {
      brick.alive = false;
      score += BRICK_SCORE;
      highScore = Math.max(highScore, score);
      localStorage.setItem(STORAGE_KEY, highScore.toString());
      updateScoreboard();
      ball.dy *= -1;
      break;
    }
  }

  if (game.bricks.every((brick) => !brick.alive)) {
    createBricks();
    speedUpBall(1.06);
  }

  if (ball.y - ball.radius > game.height) {
    endGame();
  }
}

function maybeSpeedUpBall() {
  const now = performance.now();
  if (now - lastSpeedUpAt < SPEEDUP_INTERVAL_MS) return;

  lastSpeedUpAt = now;
  speedUpBall(SPEEDUP_FACTOR);
}

function speedUpBall(factor) {
  const { ball } = game;
  const speed = Math.hypot(ball.dx, ball.dy);
  if (speed >= MAX_BALL_SPEED) return;

  const nextSpeed = Math.min(speed * factor, MAX_BALL_SPEED);
  const scale = nextSpeed / speed;
  ball.dx *= scale;
  ball.dy *= scale;
}

function render() {
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
}

function loop() {
  if (gameState === "playing") {
    update();
  }
  render();
  animationId = requestAnimationFrame(loop);
}

async function endGame() {
  gameState = "gameover";
  highScore = Math.max(highScore, score);
  localStorage.setItem(STORAGE_KEY, highScore.toString());
  updateScoreboard();
  await saveHighScore(score);

  overlayKicker.textContent = "Game Over";
  overlayTitle.textContent = `최종 점수 ${score}`;
  overlayText.textContent = `벽돌 하나당 ${BRICK_SCORE}점입니다. 최고 점수는 ${highScore}점이에요.`;
  startButton.textContent = "다시 시작";
  overlay.classList.remove("is-hidden");
}

async function loadFirebaseHighScore() {
  try {
    const { firebaseConfig } = await import("./firebase-config.js");
    if (!firebaseConfig?.apiKey) return;

    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const databaseModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js");

    const app = appModule.initializeApp(firebaseConfig);
    const db = databaseModule.getDatabase(app);
    const scoreRef = databaseModule.ref(db, "scores/brick-breaker/highScore");
    const snapshot = await databaseModule.get(scoreRef);

    firebaseStore = { databaseModule, scoreRef };
    if (snapshot.exists()) {
      highScore = Math.max(highScore, Number(snapshot.val() || 0));
      localStorage.setItem(STORAGE_KEY, highScore.toString());
      updateScoreboard();
    }
  } catch {
    firebaseStore = null;
  }
}

async function saveHighScore(finalScore) {
  if (!firebaseStore || finalScore < highScore) return;

  const { databaseModule, scoreRef } = firebaseStore;
  try {
    const result = await databaseModule.runTransaction(scoreRef, (currentValue) => {
      const remoteHighScore = Number(currentValue || 0);
      return Math.max(remoteHighScore, finalScore);
    });

    if (result.snapshot.exists()) {
      highScore = Math.max(highScore, Number(result.snapshot.val() || 0));
    }

    localStorage.setItem(STORAGE_KEY, highScore.toString());
    updateScoreboard();
  } catch {
    localStorage.setItem(STORAGE_KEY, highScore.toString());
  }
}

canvas.addEventListener("mousemove", (event) => setPaddleFromPointer(event.clientX));
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  setPaddleFromPointer(event.touches[0].clientX);
});

startButton.addEventListener("click", () => {
  overlay.classList.add("is-hidden");
  resetGame();
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateScoreboard();
loadFirebaseHighScore();
cancelAnimationFrame(animationId);
loop();
