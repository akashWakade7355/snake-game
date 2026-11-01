const Storage = (() => {
  const prefix = 'snakeGame';

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(`${prefix}:${key}`);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(`${prefix}:${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    getHighScore: () => read('highScore', 100),
    setHighScore: (value) => write('highScore', value),
    getSkin: () => read('skin', 'default'),
    setSkin: (value) => write('skin', value),
    getSpeed: () => read('speed', 5),
    setSpeed: (value) => write('speed', value),
    getMuted: () => read('muted', false),
    setMuted: (value) => write('muted', value),
    getScore: () => read('score', 100),
    setScore: (value) => write('score', value),
  };
})();
