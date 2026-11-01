const SKINS = {
  default: { body: '#25ff5d', head: '#80ff9a', eye: '#031d0b' },
  blue: { body: '#4aa3ff', head: '#66d0ff', eye: '#03193d' },
  red: { body: '#ff5d5d', head: '#ff9d9d', eye: '#3d0909' },
  purple: { body: '#b86cff', head: '#d7adff', eye: '#1a0d2d' },
  golden: { body: '#ffce4e', head: '#ffe98a', eye: '#322204' },
};

const state = {
  snake: [],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: { x: 0, y: 0 },
  score: Storage.getScore(),
  highScore: Storage.getHighScore(),
  speed: Storage.getSpeed(),
  muted: Storage.getMuted(),
  skin: Storage.getSkin(),
  started: false,
  paused: false,
  gameOver: false,
  intervalId: null,
  tickMs: 140,
  audioContext: null,
};

const board = Controls.all.canvas;
const ctx = board.getContext('2d');
const rows = 19;
const cols = 32;
const cellSize = Math.min(board.width / cols, board.height / rows);

const setScoreDisplay = () => {
  Controls.all.scoreValue.textContent = state.score;
  Controls.all.speedValue.textContent = state.speed;
  Controls.all.skinSelect.value = state.skin;
  Controls.all.muteBtn.textContent = state.muted ? '🔇' : '🔊';
};

const setOverlayState = () => {
  Controls.all.pauseOverlay.classList.toggle('hidden', !state.paused || state.gameOver);
  Controls.all.gameOverOverlay.classList.toggle('hidden', !state.gameOver);
  Controls.all.startOverlay.classList.toggle('visible', !state.started && !state.gameOver && !state.paused);
  Controls.all.startOverlay.classList.toggle('hidden', state.started || state.gameOver || state.paused);
  if (state.gameOver) {
    Controls.all.finalScore.textContent = `Final Score: ${state.score}`;
  }
};

const unlockAudio = () => {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
};

const playTone = (frequency, duration, type = 'square', volume = 0.04) => {
  if (state.muted || !state.audioContext) return;

  const oscillator = state.audioContext.createOscillator();
  const gainNode = state.audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.value = volume;
  oscillator.connect(gainNode);
  gainNode.connect(state.audioContext.destination);

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + duration);
  oscillator.stop(state.audioContext.currentTime + duration);
};

const playEatSound = () => {
  unlockAudio();
  playTone(620, 0.08, 'triangle', 0.055);
  setTimeout(() => playTone(760, 0.08, 'triangle', 0.04), 45);
};

const playGameOverSound = () => {
  unlockAudio();
  playTone(185, 0.12, 'sawtooth', 0.05);
  setTimeout(() => playTone(120, 0.18, 'sawtooth', 0.045), 120);
};

const resetScore = () => {
  state.score = 100;
  Storage.setScore(state.score);
  Controls.all.scoreValue.textContent = state.score;
};

const generateFood = () => {
  let candidate = {
    x: Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows),
  };

  while (state.snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)) {
    candidate = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    };
  }

  state.food = candidate;
};

const resetSnake = (direction = { x: 1, y: 0 }) => {
  const startX = Math.floor(cols / 4);
  const startY = Math.floor(rows / 2);
  state.snake = Array.from({ length: 4 }, (_, index) => ({
    x: startX - direction.x * index,
    y: startY - direction.y * index,
  }));
  state.direction = { x: direction.x, y: direction.y };
  state.nextDirection = { x: direction.x, y: direction.y };
};

const savePersistedState = () => {
  Storage.setSkin(state.skin);
  Storage.setSpeed(state.speed);
  Storage.setMuted(state.muted);
  Storage.setHighScore(state.highScore);
  Storage.setScore(state.score);
};

const finishGame = () => {
  state.gameOver = true;
  state.started = false;
  clearInterval(state.intervalId);
  if (state.score > state.highScore) {
    state.highScore = state.score;
  }
  savePersistedState();
  setOverlayState();
  playGameOverSound();
};

const updateDifficulty = () => {
  const speedValue = Number(state.speed);
  const target = Math.max(100, 240 - speedValue * 12 - Math.floor((state.score - 100) / 20) * 4);
  state.tickMs = target;
  clearInterval(state.intervalId);
  state.intervalId = state.started && !state.paused && !state.gameOver
    ? setInterval(stepGame, state.tickMs)
    : null;
};

const stepGame = () => {
  if (!state.started || state.paused || state.gameOver) return;

  const nextDirection = state.nextDirection;
  const reverseCheck = nextDirection.x === -state.direction.x && nextDirection.y === -state.direction.y;
  if (!reverseCheck) {
    state.direction = nextDirection;
  }

  const head = {
    x: state.snake[0].x + state.direction.x,
    y: state.snake[0].y + state.direction.y,
  };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows;
  const ateFood = head.x === state.food.x && head.y === state.food.y;
  const hitSelf = state.snake.some((segment, index) => (
    segment.x === head.x
    && segment.y === head.y
    && (ateFood || index < state.snake.length - 1)
  ));

  if (hitWall || hitSelf) {
    finishGame();
    return;
  }

  state.snake.unshift(head);

  if (ateFood) {
    state.score += 10;
    Storage.setScore(state.score);
    if (state.score > state.highScore) {
      state.highScore = state.score;
      Storage.setHighScore(state.highScore);
    }
    Controls.all.scoreValue.textContent = state.score;
    playEatSound();
    generateFood();
    updateDifficulty();
  } else {
    state.snake.pop();
  }
  drawBoard();
};

const drawBoard = () => {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#0a0d0f';
  ctx.fillRect(0, 0, board.width, board.height);

  ctx.strokeStyle = 'rgba(37, 255, 93, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x += 1) {
    const drawX = x * cellSize;
    ctx.beginPath();
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, board.height);
    ctx.stroke();
  }

  for (let y = 0; y <= rows; y += 1) {
    const drawY = y * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, drawY);
    ctx.lineTo(board.width, drawY);
    ctx.stroke();
  }

  ctx.fillStyle = '#f1dc49';
  ctx.fillRect(state.food.x * cellSize + 2, state.food.y * cellSize + 2, cellSize - 4, cellSize - 4);

  const skin = SKINS[state.skin] || SKINS.default;

  state.snake.forEach((segment, index) => {
    const segmentX = segment.x * cellSize + 1;
    const segmentY = segment.y * cellSize + 1;
    const segmentWidth = cellSize - 2;
    const segmentHeight = cellSize - 2;

    ctx.fillStyle = index === 0 ? skin.head : skin.body;
    ctx.shadowColor = index === 0 ? 'rgba(37, 255, 93, 0.7)' : 'rgba(37, 255, 93, 0.4)';
    ctx.shadowBlur = index === 0 ? 14 : 8;
    ctx.fillRect(segmentX, segmentY, segmentWidth, segmentHeight);
    ctx.shadowBlur = 0;

    if (index === 0) {
      const eyeSize = Math.max(2, cellSize * 0.14);
      ctx.fillStyle = skin.eye;
      const leftEyeX = segmentX + cellSize * 0.28;
      const rightEyeX = segmentX + cellSize * 0.58;
      const eyeY = segmentY + cellSize * 0.25;
      ctx.fillRect(leftEyeX, eyeY, eyeSize, eyeSize);
      ctx.fillRect(rightEyeX, eyeY, eyeSize, eyeSize);
    }
  });
};

const startGame = (initialDirection = null) => {
  unlockAudio();
  state.started = true;
  state.paused = false;
  state.gameOver = false;
  resetSnake(initialDirection || undefined);
  resetScore();
  generateFood();
  updateDifficulty();
  setOverlayState();
  drawBoard();
};

const pauseGame = () => {
  if (!state.started || state.gameOver) return;
  state.paused = !state.paused;
  setOverlayState();
  if (state.paused) {
    clearInterval(state.intervalId);
  } else {
    state.intervalId = setInterval(stepGame, state.tickMs);
  }
};

const changeSkin = (event) => {
  state.skin = event.target.value;
  Storage.setSkin(state.skin);
  drawBoard();
};

const changeSpeed = (event) => {
  state.speed = Number(event.target.value);
  Storage.setSpeed(state.speed);
  Controls.all.speedValue.textContent = state.speed;
  updateDifficulty();
};

const toggleMute = () => {
  state.muted = !state.muted;
  Storage.setMuted(state.muted);
  Controls.all.muteBtn.textContent = state.muted ? '🔇' : '🔊';
};

const handleKeyboard = (event) => {
  const key = event.key.toLowerCase();
  const moveMap = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  if (Object.prototype.hasOwnProperty.call(moveMap, key)) {
    event.preventDefault();
    const direction = moveMap[key];
    if (!state.started) {
      startGame(direction);
      return;
    }
    const reverse = direction.x === -state.direction.x && direction.y === -state.direction.y;
    if (!reverse) {
      state.nextDirection = direction;
    }
  }

  if (key === ' ' || event.code === 'Space') {
    event.preventDefault();
    pauseGame();
  }
};

const setDirectionFromTouch = (direction) => {
  const map = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const next = map[direction];
  if (!next) return;
  if (!state.started) {
    startGame(next);
    return;
  }
  const reverse = next.x === -state.direction.x && next.y === -state.direction.y;
  if (!reverse) {
    state.nextDirection = next;
  }
};

Controls.bind({
  restart: () => {
    startGame();
  },
  changeSkin,
  changeSpeed,
  toggleMute,
  startGame,
  handleKeyboard,
  handleDirection: setDirectionFromTouch,
});

const initialize = () => {
  const validSkin = SKINS[state.skin] ? state.skin : 'default';
  state.skin = validSkin;
  Controls.all.speedSlider.value = String(state.speed);
  Controls.all.skinSelect.value = validSkin;
  setScoreDisplay();
  resetSnake();
  generateFood();
  setOverlayState();
  updateDifficulty();
  drawBoard();
  if (state.muted) {
    Controls.all.muteBtn.textContent = '🔇';
  }
};

initialize();
