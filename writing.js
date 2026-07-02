/**
 * CzechMaster — Speaking Practice Engine (WebView Compatible)
 */
'use strict';

const SpeakingEngine = (() => {
  let exercises = [], currentIndex = 0, score = 0;
  let rootEl = null, onComplete = null, recognition = null, isRecording = false;

  let SpeechRecognitionAPI = null;
  try {
    SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  } catch(e) { SpeechRecognitionAPI = null; }

  const isRecognitionSupported = !!SpeechRecognitionAPI;

  function start(opts) {
    rootEl = opts.container;
    exercises = shuffle([].concat(opts.exerciseList));
    currentIndex = 0; score = 0;
    onComplete = opts.onCompleteCallback;
    if (!exercises.length) {
      rootEl.innerHTML = '<div class="empty-state"><div class="empty-state-title">Mashqlar mavjud emas</div></div>';
      return;
    }
    renderExercise();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function stripDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function normalize(str) {
    return stripDiacritics(str.toLowerCase().trim()).replace(/[.,!?]+$/, '');
  }

  function levenshtein(a, b) {
    const matrix = Array.from({length: b.length + 1}, (_, i) => [i, ...Array(a.length).fill(0)]);
    matrix[0] = Array.from({length: a.length + 1}, (_, i) => i);
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i-1] === a[j-1]
          ? matrix[i-1][j-1]
          : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
      }
    }
    return matrix[b.length][a.length];
  }

  function similarity(a, b) {
    const s1 = normalize(a), s2 = normalize(b);
    if (s1 === s2) return 1;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (!longer.length) return 1;
    return (longer.length - levenshtein(longer, shorter)) / longer.length;
  }

  function renderExercise() {
    const ex = exercises[currentIndex];
    const progress = Math.round((currentIndex / exercises.length) * 100);
    rootEl.innerHTML =
      '<div class="speaking-exercise fade-in">' +
        '<div class="quiz-header" style="margin:calc(-1*var(--space-6)) calc(-1*var(--space-6)) var(--space-5);border-radius:var(--radius-card) var(--radius-card) 0 0;">' +
          '<span class="quiz-question-counter">' + (currentIndex+1) + ' / ' + exercises.length + '</span>' +
          '<div class="quiz-progress"><div class="progress-bar md"><div class="progress-bar-fill" style="width:' + progress + '%"></div></div></div>' +
          '<span class="level-badge ' + ex.level + '"><span class="level-dot"></span>' + ex.level.toUpperCase() + '</span>' +
        '</div>' +
        '<div class="speaking-prompt czech-text">' + ex.czech + '</div>' +
        '<div class="speaking-phonetic">' + ex.phonetic + '</div>' +
        '<div class="text-sm text-secondary mb-4">' + ex.translation + '</div>' +
        '<div class="flex justify-center mb-4">' +
          '<button class="example-audio-btn" data-speaking-listen aria-label="Namunani tinglash" style="width:40px;height:40px;">' +
            '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.6L5.7 7H3a1 1 0 00-1 1v4a1 1 0 001 1h2.7l4.3 3.4a.8.8 0 001.3-.6V4.2a.8.8 0 00-1.3-.6z"/></svg>' +
          '</button>' +
        '</div>' +
        (isRecognitionSupported ? renderRecognitionUI() : renderUnsupportedUI()) +
        '<div class="writing-feedback" data-speaking-feedback style="margin-top:var(--space-5);"></div>' +
        '<div class="quiz-actions" data-speaking-actions style="display:none;background:transparent;border:none;padding-top:var(--space-4);justify-content:flex-end;"></div>' +
      '</div>';
    bindExerciseEvents(ex);
  }

  function renderRecognitionUI() {
    return '<button class="microphone-btn" data-speaking-record aria-label="Yozib olishni boshlash">' +
      '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 9a1 1 0 10-2 0 7 7 0 006 6.93V18H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0017 9a1 1 0 10-2 0 5 5 0 01-10 0z"/></svg>' +
      '</button>' +
      '<div class="speaking-waveform" data-speaking-waveform>' +
        Array.from({length:8}).map(function(){return '<div class="waveform-bar" style="height:8px;"></div>';}).join('') +
      '</div>' +
      '<div class="speaking-status" data-speaking-status>Tugmani bosib, jumlani talaffuz qiling</div>';
  }

  function renderUnsupportedUI() {
    return '<div class="alert alert-warning" style="text-align:left;">' +
      '<span class="alert-icon">&#9888;&#65039;</span>' +
      '<div class="alert-content">' +
        '<div class="alert-title">Mikrofon orqali tekshirish mavjud emas</div>' +
        '<div>Bu qurilma yoki brauzer ovozni tanib olishni qo\'llab-quvvatlamaydi. Namunani tinglab mashq qilishingiz mumkin.</div>' +
      '</div></div>' +
      '<div class="quiz-actions" style="background:transparent;border:none;padding-top:var(--space-4);justify-content:center;">' +
        '<button class="btn btn-primary" data-speaking-skip>Keyingisiga o\'tish</button>' +
      '</div>';
  }

  function bindExerciseEvents(ex) {
    const listenBtn = rootEl.querySelector('[data-speaking-listen]');
    if (listenBtn) {
      listenBtn.addEventListener('click', function() {
        AudioController.speak(ex.czech, { rate: 0.8, button: listenBtn });
      });
    }
    if (isRecognitionSupported) {
      const recordBtn = rootEl.querySelector('[data-speaking-record]');
      if (recordBtn) recordBtn.addEventListener('click', function() { toggleRecording(ex); });
    } else {
      const skipBtn = rootEl.querySelector('[data-speaking-skip]');
      if (skipBtn) skipBtn.addEventListener('click', function() { nextExercise(); });
    }
  }

  function toggleRecording(ex) {
    if (isRecording) { try { recognition.stop(); } catch(e) {} return; }
    const recordBtn = rootEl.querySelector('[data-speaking-record]');
    const waveform  = rootEl.querySelector('[data-speaking-waveform]');
    const statusEl  = rootEl.querySelector('[data-speaking-status]');

    try {
      recognition = new SpeechRecognitionAPI();
      recognition.lang = 'cs-CZ';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = function() {
        isRecording = true;
        if (recordBtn) recordBtn.classList.add('recording');
        if (waveform)  waveform.classList.add('active');
        if (statusEl)  statusEl.textContent = 'Tinglanmoqda... gapiring';
      };

      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        evaluateAttempt(ex, transcript);
      };

      recognition.onerror = function(event) {
        isRecording = false;
        if (recordBtn) recordBtn.classList.remove('recording');
        if (waveform)  waveform.classList.remove('active');
        const msg = event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Mikrofonga ruxsat berilmadi.'
          : event.error === 'no-speech'
            ? 'Ovoz eshitilmadi. Qaytadan urinib ko\'ring.'
            : 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.';
        if (statusEl) statusEl.textContent = msg;
      };

      recognition.onend = function() {
        isRecording = false;
        if (recordBtn) recordBtn.classList.remove('recording');
        if (waveform)  waveform.classList.remove('active');
      };

      recognition.start();
    } catch(e) {
      console.warn('[Speaking] recognition.start xatolik:', e);
      if (statusEl) statusEl.textContent = 'Ovoz yozishni boshlab bo\'lmadi.';
    }
  }

  function evaluateAttempt(ex, transcript) {
    const ratio   = similarity(transcript, ex.czech);
    const percent = Math.round(ratio * 100);
    const result  = percent >= 80 ? 'correct' : percent >= 50 ? 'partial' : 'wrong';
    if (result === 'correct') score++;
    else if (result === 'partial') score += 0.5;
    renderFeedback(ex, result, transcript, percent);
  }

  function renderFeedback(ex, result, transcript, percent) {
    const feedback = rootEl.querySelector('[data-speaking-feedback]');
    if (!feedback) return;
    feedback.classList.add('show');
    const msgs = {
      correct: { icon: '&#9989;', title: 'Ajoyib talaffuz!', cls: 'alert-success' },
      partial:  { icon: '&#128993;', title: 'Yaxshi, lekin yaxshilash mumkin', cls: 'alert-warning' },
      wrong:    { icon: '&#10060;', title: 'Qaytadan urinib ko\'ring', cls: 'alert-error' }
    };
    const msg = msgs[result];
    feedback.innerHTML =
      '<div class="alert ' + msg.cls + '">' +
        '<span class="alert-icon">' + msg.icon + '</span>' +
        '<div class="alert-content">' +
          '<div class="alert-title">' + msg.title + ' (' + percent + '% mos)</div>' +
          '<div>Tizim eshitgani: <em>"' + transcript + '"</em></div>' +
          '<div style="margin-top:var(--space-1);">Kutilgan: <span class="czech-text">' + ex.czech + '</span></div>' +
        '</div>' +
      '</div>';

    const isLast = currentIndex === exercises.length - 1;
    const actions = rootEl.querySelector('[data-speaking-actions]');
    if (!actions) return;
    actions.style.display = 'flex';
    actions.innerHTML =
      '<button class="btn btn-ghost" data-speaking-retry>Qayta urinish</button>' +
      '<button class="btn btn-primary" data-speaking-next>' + (isLast ? 'Natijani ko\'rish' : 'Keyingi mashq') + '</button>';

    actions.querySelector('[data-speaking-retry]').addEventListener('click', function() {
      feedback.innerHTML = ''; feedback.classList.remove('show');
      actions.style.display = 'none';
      const statusEl = rootEl.querySelector('[data-speaking-status]');
      if (statusEl) statusEl.textContent = 'Tugmani bosib, jumlani talaffuz qiling';
    });
    actions.querySelector('[data-speaking-next]').addEventListener('click', function() { nextExercise(); });
  }

  function nextExercise() {
    AudioController.stop();
    if (recognition && isRecording) { try { recognition.stop(); } catch(e) {} }
    currentIndex++;
    if (currentIndex >= exercises.length) renderResults();
    else renderExercise();
  }

  function renderResults() {
    const total = exercises.length;
    const percent = Math.round((score / total) * 100);
    const xpEarned = Math.round(score * 6);
    rootEl.innerHTML =
      '<div class="completion-screen">' +
        '<div class="completion-animation">&#128483;&#65039;</div>' +
        '<h2 class="completion-title">Talaffuz mashqi tugadi!</h2>' +
        '<p class="completion-subtitle">Siz ' + total + ' ta jumlani ' + (isRecognitionSupported ? 'talaffuz qildingiz' : 'ko\'rib chiqdingiz') + '</p>' +
        (isRecognitionSupported ?
          '<div class="completion-stats">' +
            '<div class="completion-stat"><span class="completion-stat-value">' + score + '/' + total + '</span><span class="completion-stat-label">Ball</span></div>' +
            '<div class="completion-stat"><span class="completion-stat-value">' + percent + '%</span><span class="completion-stat-label">Natija</span></div>' +
          '</div>' +
          (xpEarned > 0 ? '<div class="completion-xp-badge">&#9889; +' + xpEarned + ' XP</div>' : '')
        : '') +
        '<div class="completion-actions">' +
          '<button class="btn btn-secondary btn-lg" data-speaking-restart>Qayta boshlash</button>' +
          '<button class="btn btn-primary btn-lg" data-speaking-finish>Tugatish</button>' +
        '</div>' +
      '</div>';

    if (xpEarned > 0) ProgressManager.addXp(xpEarned);
    ProgressManager.markActive();

    rootEl.querySelector('[data-speaking-restart]').addEventListener('click', function() {
      start({ container: rootEl, exerciseList: exercises, onCompleteCallback: onComplete });
    });
    rootEl.querySelector('[data-speaking-finish]').addEventListener('click', function() {
      if (onComplete) onComplete({ score: score, total: total, percent: percent });
    });
  }

  return { start: start, isSupported: function() { return isRecognitionSupported; } };
})();
