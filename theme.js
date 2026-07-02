/**
 * CzechMaster — Progress System (WebView Compatible)
 */
'use strict';

const ProgressManager = (() => {
  const STORAGE_KEY = 'czechmaster_progress';
  const XP_PER_LEVEL = 100;

  const DEFAULT_STATE = {
    xp: 0, totalXp: 0, streak: 0, longestStreak: 0, lastActiveDate: null,
    completedLessons: {}, unlockedLessons: ['a1-01'], favorites: [],
    bookmarks: [], vocabulary: {}, achievements: [], quizHistory: [],
    dailyGoal: { lessonsTarget: 1, xpTarget: 50, lessonsToday: 0, xpToday: 0, date: null },
    settings: { soundEnabled: true, autoPlayAudio: false, fontSize: 'normal' },
    weekActivity: {}, createdAt: null
  };

  let state = null;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state = Object.assign({}, DEFAULT_STATE, parsed);
      } else {
        state = Object.assign({}, DEFAULT_STATE, { createdAt: Date.now() });
      }
    } catch(e) {
      console.error('[Progress] Yuklashda xatolik:', e);
      state = Object.assign({}, DEFAULT_STATE, { createdAt: Date.now() });
    }
    checkStreak();
    resetDailyGoalIfNeeded();
    save();
    return state;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      try {
        document.dispatchEvent(new CustomEvent('progresschange', { detail: { state: state } }));
      } catch(e) {}
    } catch(e) {
      console.error('[Progress] Saqlashda xatolik:', e);
    }
  }

  function todayKey() { return new Date().toISOString().split('T')[0]; }

  function resetDailyGoalIfNeeded() {
    var today = todayKey();
    if (state.dailyGoal.date !== today) {
      state.dailyGoal.date = today;
      state.dailyGoal.lessonsToday = 0;
      state.dailyGoal.xpToday = 0;
    }
  }

  function checkStreak() {
    var today = todayKey();
    if (!state.lastActiveDate) return;
    var last = new Date(state.lastActiveDate);
    var now  = new Date(today);
    var diffDays = Math.round((now - last) / 86400000);
    if (diffDays > 1) state.streak = 0;
  }

  function markActive() {
    var today = todayKey();
    if (state.lastActiveDate === today) return;
    var wasYesterday = state.lastActiveDate &&
      Math.round((new Date(today) - new Date(state.lastActiveDate)) / 86400000) === 1;
    state.streak = wasYesterday ? state.streak + 1 : 1;
    state.longestStreak = Math.max(state.longestStreak, state.streak);
    state.lastActiveDate = today;
    state.weekActivity[today] = true;
    save();
    if (typeof AchievementsManager !== 'undefined') AchievementsManager.checkStreakAchievements(state.streak);
  }

  function addXp(amount) {
    state.xp += amount;
    state.totalXp += amount;
    state.dailyGoal.xpToday += amount;
    markActive();
    save();
    return getLevelInfo();
  }

  function getLevelInfo() {
    var level = Math.floor(state.totalXp / XP_PER_LEVEL) + 1;
    var xpInCurrentLevel = state.totalXp % XP_PER_LEVEL;
    var xpForNextLevel = XP_PER_LEVEL;
    var progressPercent = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);
    return { level: level, xpInCurrentLevel: xpInCurrentLevel, xpForNextLevel: xpForNextLevel, progressPercent: progressPercent, totalXp: state.totalXp };
  }

  function completeLesson(lessonId, opts) {
    opts = opts || {};
    var isFirst = !state.completedLessons[lessonId];
    var prev = state.completedLessons[lessonId] ? state.completedLessons[lessonId].attempts : 0;
    state.completedLessons[lessonId] = {
      score: opts.score !== undefined ? opts.score : null,
      total: opts.total !== undefined ? opts.total : null,
      stars: opts.stars !== undefined ? opts.stars : 3,
      completedAt: Date.now(),
      attempts: prev + 1
    };
    if (opts.nextLessonId && state.unlockedLessons.indexOf(opts.nextLessonId) === -1) {
      state.unlockedLessons.push(opts.nextLessonId);
    }
    if (isFirst) { state.dailyGoal.lessonsToday += 1; addXp(20); }
    markActive();
    save();
    if (typeof AchievementsManager !== 'undefined') AchievementsManager.checkLessonAchievements(state.completedLessons);
    return isFirst;
  }

  function isLessonUnlocked(lessonId) { return state.unlockedLessons.indexOf(lessonId) !== -1; }
  function isLessonCompleted(lessonId) { return !!state.completedLessons[lessonId]; }

  function unlockLesson(lessonId) {
    if (state.unlockedLessons.indexOf(lessonId) === -1) { state.unlockedLessons.push(lessonId); save(); }
  }

  function toggleFavorite(lessonId) {
    var idx = state.favorites.indexOf(lessonId);
    if (idx === -1) state.favorites.push(lessonId);
    else state.favorites.splice(idx, 1);
    save();
    return idx === -1;
  }

  function isFavorite(lessonId) { return state.favorites.indexOf(lessonId) !== -1; }

  function addBookmark(lessonId, sectionId, note) {
    state.bookmarks.push({ id: 'bm_' + Date.now(), lessonId: lessonId, sectionId: sectionId, note: note || '', createdAt: Date.now() });
    save();
  }

  function removeBookmark(bookmarkId) {
    state.bookmarks = state.bookmarks.filter(function(b) { return b.id !== bookmarkId; });
    save();
  }

  function updateVocabWord(wordId, knewIt) {
    var word = state.vocabulary[wordId] || { status: 'new', reviewCount: 0, lastReview: null, correctStreak: 0 };
    word.reviewCount += 1;
    word.lastReview = Date.now();
    word.correctStreak = knewIt ? word.correctStreak + 1 : 0;
    word.status = word.correctStreak >= 3 ? 'mastered' : (word.reviewCount > 1 ? 'learning' : 'new');
    state.vocabulary[wordId] = word;
    save();
  }

  function recordQuizResult(lessonId, score, total) {
    state.quizHistory.push({ lessonId: lessonId, score: score, total: total, date: Date.now() });
    if (state.quizHistory.length > 100) state.quizHistory.shift();
    save();
  }

  function getStats() {
    var completedCount = Object.keys(state.completedLessons).length;
    var wordsTotal = Object.keys(state.vocabulary).length;
    var wordsMastered = Object.values(state.vocabulary).filter(function(w) { return w.status === 'mastered'; }).length;
    var avgScore = 0;
    if (state.quizHistory.length) {
      var sum = state.quizHistory.reduce(function(s, q) { return s + (q.score / q.total) * 100; }, 0);
      avgScore = Math.round(sum / state.quizHistory.length);
    }
    return {
      completedLessons: completedCount, streak: state.streak, longestStreak: state.longestStreak,
      totalXp: state.totalXp, wordsTotal: wordsTotal, wordsMastered: wordsMastered,
      avgScore: avgScore, achievementsCount: state.achievements.length
    };
  }

  function getLevelProgress(levelId, totalLessonsInLevel) {
    if (!totalLessonsInLevel) return 0;
    var completed = Object.keys(state.completedLessons).filter(function(id) { return id.startsWith(levelId); }).length;
    return Math.round((completed / totalLessonsInLevel) * 100);
  }

  function getWeekActivity() {
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = d.toISOString().split('T')[0];
      days.push({ date: key, active: !!state.weekActivity[key], isToday: i === 0 });
    }
    return days;
  }

  function resetAll() {
    if (!confirm('Barcha progress o\'chiriladi. Davom etasizmi?')) return false;
    state = Object.assign({}, DEFAULT_STATE, { createdAt: Date.now() });
    save();
    return true;
  }

  function exportData()       { return JSON.stringify(state, null, 2); }
  function importData(json)   {
    try { state = Object.assign({}, DEFAULT_STATE, JSON.parse(json)); save(); return true; }
    catch(e) { return false; }
  }
  function getState()         { return state; }

  return {
    load: load, save: save, addXp: addXp, getLevelInfo: getLevelInfo,
    completeLesson: completeLesson, isLessonUnlocked: isLessonUnlocked,
    isLessonCompleted: isLessonCompleted, unlockLesson: unlockLesson,
    toggleFavorite: toggleFavorite, isFavorite: isFavorite,
    addBookmark: addBookmark, removeBookmark: removeBookmark,
    updateVocabWord: updateVocabWord, recordQuizResult: recordQuizResult,
    getStats: getStats, getLevelProgress: getLevelProgress,
    getWeekActivity: getWeekActivity, markActive: markActive,
    resetAll: resetAll, exportData: exportData, importData: importData, getState: getState
  };
})();
