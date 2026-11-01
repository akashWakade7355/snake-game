const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const gameSource = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8');

const createGame = () => {
  let drawCalls = 0;
  let nextIntervalId = 1;
  const intervals = new Map();
  const handlers = {};
  const context = {
    clearRect() {},
    fillRect() { drawCalls += 1; },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
  };
  const controls = {
    canvas: { width: 760, height: 440, getContext: () => context },
    scoreValue: { textContent: '' },
    speedValue: { textContent: '' },
    skinSelect: { value: '' },
    muteBtn: { textContent: '' },
    pauseOverlay: { classList: { toggle() {} } },
    startOverlay: { classList: { toggle() {} } },
    gameOverOverlay: { classList: { toggle() {} } },
    finalScore: { textContent: '' },
    speedSlider: { value: '' },
  };
  const sandbox = {
    Controls: {
      all: controls,
      bind: (gameHandlers) => Object.assign(handlers, gameHandlers),
    },
    Storage: {
      getScore: () => 100,
      getHighScore: () => 100,
      getSpeed: () => 5,
      getMuted: () => false,
      getSkin: () => 'default',
      setScore() {},
      setHighScore() {},
      setSpeed() {},
      setMuted() {},
      setSkin() {},
    },
    Math,
    window: {},
    setTimeout() {},
    setInterval(callback) {
      const id = nextIntervalId++;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(gameSource, sandbox);

  return {
    handlers,
    intervals,
    run(source) {
      return vm.runInContext(source, sandbox);
    },
    get drawCalls() {
      return drawCalls;
    },
  };
};

test('waits for play, starts with keyboard input, and redraws after each tick', () => {
  const game = createGame();
  assert.equal(game.run('state.started'), false);
  assert.equal(game.intervals.size, 0);

  let prevented = false;
  game.handlers.handleKeyboard({
    key: 'ArrowUp',
    code: 'ArrowUp',
    preventDefault() { prevented = true; },
  });

  assert.equal(prevented, true);
  assert.equal(game.run('state.started'), true);
  assert.equal(game.run('state.direction.y'), -1);
  assert.equal(game.run('state.tickMs'), 180);
  assert.equal(game.intervals.size, 1);

  const initialDrawCalls = game.drawCalls;
  [...game.intervals.values()][0]();
  assert.equal(game.run('state.snake[0].y'), 8);
  assert.ok(game.drawCalls > initialDrawCalls);
});

test('starts centered and gives the player time to turn before a wall collision', () => {
  const game = createGame();
  game.handlers.startGame();
  assert.equal(game.run('state.snake[0].x'), 16);
  assert.equal(game.run('state.tickMs'), 180);

  const tick = [...game.intervals.values()][0];
  for (let move = 0; move < 15; move += 1) tick();
  assert.equal(game.run('state.gameOver'), false);
  tick();
  assert.equal(game.run('state.gameOver'), true);
});
