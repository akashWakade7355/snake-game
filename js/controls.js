const Controls = (() => {
  const all = {
    canvas: document.getElementById('gameCanvas'),
    restartBtn: document.getElementById('restartBtn'),
    scoreValue: document.getElementById('scoreValue'),
    skinSelect: document.getElementById('skinSelect'),
    speedSlider: document.getElementById('speedSlider'),
    speedValue: document.getElementById('speedValue'),
    muteBtn: document.getElementById('muteBtn'),
    pauseOverlay: document.getElementById('pauseOverlay'),
    startOverlay: document.getElementById('startOverlay'),
    gameOverOverlay: document.getElementById('gameOverOverlay'),
    finalScore: document.getElementById('finalScore'),
    playBtn: document.getElementById('playBtn'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    touchButtons: document.querySelectorAll('.touch-btn'),
  };

  const bind = (handlers) => {
    all.restartBtn.addEventListener('click', handlers.restart);
    all.skinSelect.addEventListener('change', handlers.changeSkin);
    all.speedSlider.addEventListener('input', handlers.changeSpeed);
    all.muteBtn.addEventListener('click', handlers.toggleMute);
    all.playBtn.addEventListener('click', () => handlers.startGame());
    all.playAgainBtn.addEventListener('click', handlers.restart);

    document.addEventListener('keydown', handlers.handleKeyboard);

    all.touchButtons.forEach((button) => {
      button.addEventListener('click', () => handlers.handleDirection(button.dataset.dir));
    });
  };

  return { all, bind };
})();
