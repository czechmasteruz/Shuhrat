/**
 * CzechMaster — Quiz Engine (WebView Compatible)
 */
'use strict';

const QuizEngine = (() => {
  let questions = [], currentIndex = 0, score = 0, answers = [];
  let lessonId = null, onComplete = null, rootEl = null, startTime = null;

  function start(opts) {
    rootEl       = opts.container;
    questions    = opts.quizQuestions || [];
    lessonId     = opts.lessonIdParam;
    onComplete   = opts.onCompleteCallback;
    currentIndex = 0; score = 0; answers = [];
    startTime    = Date.now();

    if (!questions.length) {
      rootEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128221;</div><div class="empty-state-title">Test mavjud emas</div></div>';
      return;
    }
    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    const progress = Math.round((currentIndex / questions.length) * 100);
    rootEl.innerHTML =
      '<div class="quiz-container fade-in">' +
        '<div class="quiz-header">' +
          '<span class="quiz-question-counter">' + (currentIndex+1) + ' / ' + questions.length + '</span>' +
          '<div class="quiz-progress"><div class="progress-bar md"><div class="progress-bar-fill" style="width:' + progress + '%"></div></div></div>' +
        '</div>' +
        '<div class="quiz-question-area">' +
          '<h3 class="quiz-question-text">' + q.question + '</h3>' +
          (q.subtext ? '<p class="quiz-question-sub">' + q.subtext + '</p>' : '') +
          '<div class="quiz-options" data-quiz-options>' + renderOptionsForType(q) + '</div>' +
        '</div>' +
        '<div class="quiz-feedback" data-quiz-feedback></div>' +
        '<div class="quiz-actions" data-quiz-actions>' +
          '<button class="btn btn-primary" data-quiz-check disabled>Tekshirish</button>' +
        '</div>' +
      '</div>';
    bindQuestionEvents(q);
  }

  function renderOptionsForType(q) {
    if (q.type === 'truefalse') {
      return '<div class="quiz-tf-options">' +
        '<button class="quiz-option quiz-tf-option" data-option="true"><span>&#10003;</span><span>To\'g\'ri</span></button>' +
        '<button class="quiz-option quiz-tf-option" data-option="false"><span>&#10007;</span><span>Noto\'g\'ri</span></button>' +
        '</div>';
    }
    if (q.type === 'fillblank') {
      return '<div class="fill-blank-question">' +
        q.question.replace('___', '<input type="text" class="fill-blank-input" data-fill-input autocomplete="off" spellcheck="false">') +
        '</div>';
    }
    return (q.options || []).map(function(opt, i) {
      return '<button class="quiz-option" data-option="' + i + '">' +
        '<span class="quiz-option-letter">' + String.fromCharCode(65 + i) + '</span>' +
        '<span class="quiz-option-text">' + opt + '</span>' +
        '</button>';
    }).join('');
  }

  function bindQuestionEvents(q) {
    const checkBtn = rootEl.querySelector('[data-quiz-check]');
    let selectedOptions = {};
    let fillValue = '';

    if (q.type === 'fillblank') {
      const input = rootEl.querySelector('[data-fill-input]');
      if (input) {
        input.addEventListener('input', function() {
          fillValue = input.value.trim();
          if (checkBtn) checkBtn.disabled = fillValue.length === 0;
        });
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && checkBtn && !checkBtn.disabled) checkAnswer(q, selectedOptions, fillValue);
        });
        input.focus();
      }
    } else {
      rootEl.querySelectorAll('[data-option]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (q.type !== 'multiple') {
            rootEl.querySelectorAll('[data-option]').forEach(function(b) { b.classList.remove('selected'); });
            selectedOptions = {};
          }
          const val = btn.dataset.option;
          if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            delete selectedOptions[val];
          } else {
            btn.classList.add('selected');
            selectedOptions[val] = true;
          }
          if (checkBtn) checkBtn.disabled = Object.keys(selectedOptions).length === 0;
        });
      });
    }

    if (checkBtn) {
      checkBtn.addEventListener('click', function() { checkAnswer(q, selectedOptions, fillValue); });
    }
  }

  function checkAnswer(q, selectedOptions, fillValue) {
    let userAnswer, isCorrect;
    if (q.type === 'fillblank') {
      userAnswer = fillValue;
      const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      isCorrect = correctAnswers.some(function(ans) {
        return ans.toLowerCase().trim() === userAnswer.toLowerCase().trim();
      });
    } else if (q.type === 'multiple') {
      userAnswer = Object.keys(selectedOptions).map(Number).sort();
      const correct = [].concat(q.correctAnswer).sort();
      isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correct);
    } else if (q.type === 'truefalse') {
      userAnswer = Object.keys(selectedOptions)[0] === 'true';
      isCorrect = userAnswer === q.correctAnswer;
    } else {
      userAnswer = Number(Object.keys(selectedOptions)[0]);
      isCorrect = userAnswer === q.correctAnswer;
    }

    answers.push({ questionId: q.id, userAnswer: userAnswer, isCorrect: isCorrect });
    if (isCorrect) score++;

    if (q.type !== 'fillblank') {
      rootEl.querySelectorAll('[data-option]').forEach(function(btn) {
        btn.disabled = true;
        const optVal = q.type === 'truefalse' ? (btn.dataset.option === 'true') : Number(btn.dataset.option);
        const isThisCorrect = q.type === 'multiple'
          ? q.correctAnswer.indexOf(Number(btn.dataset.option)) !== -1
          : optVal === q.correctAnswer;
        if (isThisCorrect) btn.classList.add('correct');
        else if (btn.classList.contains('selected')) btn.classList.add('wrong');
      });
    } else {
      const input = rootEl.querySelector('[data-fill-input]');
      if (input) { input.disabled = true; input.classList.add(isCorrect ? 'correct' : 'wrong'); }
    }

    const feedback = rootEl.querySelector('[data-quiz-feedback]');
    if (feedback) {
      feedback.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'wrong');
      feedback.innerHTML =
        '<span class="quiz-feedback-icon">' + (isCorrect ? '&#9989;' : '&#10060;') + '</span>' +
        '<div class="quiz-feedback-content">' +
          '<div class="quiz-feedback-title">' + (isCorrect ? 'To\'g\'ri javob!' : 'Noto\'g\'ri javob') + '</div>' +
          '<div class="quiz-feedback-text">' + (q.explanation || (isCorrect ? 'Zo\'r! Davom eting.' : 'To\'g\'ri javob: ' + formatCorrectAnswer(q))) + '</div>' +
        '</div>';
    }

    const isLast = currentIndex === questions.length - 1;
    const actions = rootEl.querySelector('[data-quiz-actions]');
    if (actions) {
      actions.innerHTML = '<button class="btn btn-primary" data-quiz-next>' + (isLast ? 'Natijani ko\'rish' : 'Keyingi savol') + '</button>';
      actions.querySelector('[data-quiz-next]').addEventListener('click', nextQuestion);
    }
  }

  function formatCorrectAnswer(q) {
    if (q.type === 'fillblank') return Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
    if (q.type === 'truefalse') return q.correctAnswer ? "To'g'ri" : "Noto'g'ri";
    if (q.type === 'multiple') return q.correctAnswer.map(function(i) { return q.options[i]; }).join(', ');
    return q.options[q.correctAnswer];
  }

  function nextQuestion() {
    currentIndex++;
    if (currentIndex >= questions.length) renderResults();
    else renderQuestion();
  }

  function renderResults() {
    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 50 ? 1 : 0;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const passed = percent >= 60;
    const m = Math.floor(timeSpent / 60), s = timeSpent % 60;
    const timeStr = m + ':' + (s < 10 ? '0' : '') + s;

    let starsHtml = '';
    for (let i = 1; i <= 3; i++) {
      starsHtml += '<span class="star ' + (i <= stars ? 'filled' : '') + '">&#11088;</span>';
    }

    rootEl.innerHTML =
      '<div class="quiz-container">' +
        '<div class="completion-screen">' +
          '<div class="completion-animation">' + (passed ? '&#127881;' : '&#128170;') + '</div>' +
          '<h2 class="completion-title">' + (passed ? 'Tabriklaymiz!' : 'Yana urinib ko\'ring!') + '</h2>' +
          '<p class="completion-subtitle">' + (passed ? 'Siz testni ' + percent + '% natija bilan muvaffaqiyatli tugatdingiz' : 'Sizning natijangiz ' + percent + '%. O\'tish balli — 60%') + '</p>' +
          '<div class="stars-container">' + starsHtml + '</div>' +
          '<div class="completion-stats">' +
            '<div class="completion-stat"><span class="completion-stat-value">' + score + '/' + total + '</span><span class="completion-stat-label">To\'g\'ri javob</span></div>' +
            '<div class="completion-stat"><span class="completion-stat-value">' + percent + '%</span><span class="completion-stat-label">Natija</span></div>' +
            '<div class="completion-stat"><span class="completion-stat-value">' + timeStr + '</span><span class="completion-stat-label">Vaqt</span></div>' +
          '</div>' +
          (passed ? '<div class="completion-xp-badge">&#9889; +' + (20 + score * 5) + ' XP</div>' : '') +
          '<div class="completion-actions">' +
            (!passed ? '<button class="btn btn-primary btn-lg" data-quiz-retry>Qayta urinish</button>' : '') +
            '<button class="btn ' + (passed ? 'btn-primary' : 'btn-secondary') + ' btn-lg" data-quiz-continue>' + (passed ? 'Davom etish' : 'Darsga qaytish') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    if (passed) {
      if (typeof ProgressManager !== 'undefined') ProgressManager.addXp(score * 5);
      if (typeof AchievementsManager !== 'undefined') AchievementsManager.checkPerfectScore(score, total);
    }
    if (typeof ProgressManager !== 'undefined') ProgressManager.recordQuizResult(lessonId, score, total);

    const retryBtn = rootEl.querySelector('[data-quiz-retry]');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        start({ container: rootEl, quizQuestions: questions, lessonIdParam: lessonId, onCompleteCallback: onComplete });
      });
    }
    const contBtn = rootEl.querySelector('[data-quiz-continue]');
    if (contBtn) {
      contBtn.addEventListener('click', function() {
        if (onComplete) onComplete({ score: score, total: total, percent: percent, stars: stars, passed: passed });
      });
    }
  }

  return { start: start };
})();
