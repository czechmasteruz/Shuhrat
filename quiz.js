/**
 * CzechMaster — Flashcard Engine (WebView Compatible)
 */
'use strict';

const FlashcardEngine = (() => {
  let words = [], currentIndex = 0, rootEl = null, onComplete = null;
  let isFlipped = false;
  let sessionStats = { known: 0, hard: 0, unknown: 0 };

  function start(opts) {
    rootEl = opts.container;
    words = shuffle([].concat(opts.wordList));
    currentIndex = 0; isFlipped = false;
    sessionStats = { known: 0, hard: 0, unknown: 0 };
    onComplete = opts.onComplete;
    if (!words.length) {
      rootEl.innerHTML = '<div class="empty-state"><div class="empty-state-title">So\'zlar mavjud emas</div></div>';
      return;
    }
    renderCard();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function renderCard() {
    if (currentIndex >= words.length) { renderSessionComplete(); return; }
    const word = words[currentIndex];
    isFlipped = false;

    rootEl.innerHTML =
      '<div class="flashcard-wrapper">' +
        '<span class="flashcard-counter">' + (currentIndex+1) + ' / ' + words.length + '</span>' +
        '<div class="flashcard-scene" data-flashcard-scene tabindex="0" role="button" aria-label="Kartani aylantirish">' +
          '<div class="flashcard" data-flashcard>' +
            '<div class="flashcard-face flashcard-front">' +
              '<span class="flashcard-label">Chexcha</span>' +
              '<span class="flashcard-word czech-text">' + (word.czech || '') + '</span>' +
              (word.pronunciation ? '<span class="flashcard-pronunciation">[' + word.pronunciation + ']</span>' : '') +
              '<span class="flashcard-hint" style="position:absolute;bottom:var(--space-4);font-size:var(--text-sm);opacity:0.7;">+ Tarjimani ko\'rish</span>' +
            '</div>' +
            '<div class="flashcard-face flashcard-back">' +
              '<span class="flashcard-label">Tarjima</span>' +
              '<span class="flashcard-word">' + (word.translation || '') + '</span>' +
              (word.example ? '<span class="flashcard-pronunciation">' + word.example + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flashcard-actions">' +
          '<button class="flashcard-action-btn wrong-btn" data-flashcard-rate="unknown"><span class="flashcard-action-icon">&#128533;</span><span>Bilmadim</span></button>' +
          '<button class="flashcard-action-btn hard-btn" data-flashcard-rate="hard"><span class="flashcard-action-icon">&#129300;</span><span>Qiyin</span></button>' +
          '<button class="flashcard-action-btn correct-btn" data-flashcard-rate="known"><span class="flashcard-action-icon">&#128522;</span><span>Bilaman</span></button>' +
        '</div>' +
      '</div>';

    bindCardEvents(word);
  }

  function bindCardEvents(word) {
    const scene = rootEl.querySelector('[data-flashcard-scene]');
    const card  = rootEl.querySelector('[data-flashcard]');

    function flip() {
      isFlipped = !isFlipped;
      if (card) card.classList.toggle('flipped', isFlipped);
    }

    if (scene) {
      scene.addEventListener('click', flip);
      scene.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
    }

    rootEl.querySelectorAll('[data-flashcard-rate]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        rateCard(word, btn.dataset.flashcardRate);
      });
    });
  }

  function rateCard(word, rating) {
    const knewIt = rating === 'known';
    if (typeof ProgressManager !== 'undefined') ProgressManager.updateVocabWord(word.id, knewIt);
    if (rating === 'known') sessionStats.known++;
    else if (rating === 'hard') sessionStats.hard++;
    else sessionStats.unknown++;
    currentIndex++;
    renderCard();
  }

  function renderSessionComplete() {
    const total = sessionStats.known + sessionStats.hard + sessionStats.unknown;
    const xpEarned = sessionStats.known * 2 + sessionStats.hard;
    rootEl.innerHTML =
      '<div class="completion-screen">' +
        '<div class="completion-animation">&#127924;</div>' +
        '<h2 class="completion-title">Sessiya tugadi!</h2>' +
        '<p class="completion-subtitle">Siz ' + total + ' ta so\'zni qayta ko\'rib chiqdingiz</p>' +
        '<div class="completion-stats">' +
          '<div class="completion-stat"><span class="completion-stat-value" style="color:var(--color-success-600)">' + sessionStats.known + '</span><span class="completion-stat-label">Bilaman</span></div>' +
          '<div class="completion-stat"><span class="completion-stat-value" style="color:var(--color-warning-600)">' + sessionStats.hard + '</span><span class="completion-stat-label">Qiyin</span></div>' +
          '<div class="completion-stat"><span class="completion-stat-value" style="color:var(--color-error-600)">' + sessionStats.unknown + '</span><span class="completion-stat-label">Bilmadim</span></div>' +
        '</div>' +
        (xpEarned > 0 ? '<div class="completion-xp-badge">&#9889; +' + xpEarned + ' XP</div>' : '') +
        '<div class="completion-actions">' +
          '<button class="btn btn-secondary btn-lg" data-flashcard-restart>Qayta boshlash</button>' +
          '<button class="btn btn-primary btn-lg" data-flashcard-finish>Tugatish</button>' +
        '</div>' +
      '</div>';

    if (xpEarned > 0 && typeof ProgressManager !== 'undefined') ProgressManager.addXp(xpEarned);
    if (typeof AchievementsManager !== 'undefined') {
      const masteredCount = Object.values(ProgressManager.getState().vocabulary).filter(function(w) { return w.status === 'mastered'; }).length;
      AchievementsManager.checkVocabAchievements(masteredCount);
    }

    rootEl.querySelector('[data-flashcard-restart]').addEventListener('click', function() {
      start({ container: rootEl, wordList: words, onComplete: onComplete });
    });
    rootEl.querySelector('[data-flashcard-finish]').addEventListener('click', function() {
      if (onComplete) onComplete(sessionStats);
    });
  }

  return { start: start };
})();
