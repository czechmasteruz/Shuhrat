/**
 * CzechMaster — Achievements Manager (WebView Compatible)
 */
'use strict';

const AchievementsManager = (() => {
  let definitions = [];

  function loadDefinitions() {
    if (definitions.length) return Promise.resolve(definitions);
    return fetch('data/achievements.json')
      .then(function(res) { return res.json(); })
      .then(function(data) { definitions = data.achievements || []; return definitions; })
      .catch(function(e) { console.error('[Achievements] Yuklashda xatolik:', e); definitions = []; return []; });
  }

  function unlock(achievementId) {
    if (typeof ProgressManager === 'undefined') return false;
    var state = ProgressManager.getState();
    if (state.achievements.indexOf(achievementId) !== -1) return false;
    state.achievements.push(achievementId);
    ProgressManager.save();
    var def = definitions.filter(function(a) { return a.id === achievementId; })[0];
    if (def) showUnlockToast(def);
    return true;
  }

  function showUnlockToast(def) {
    if (typeof ToastManager !== 'undefined') {
      ToastManager.show({ type: 'success', title: '\uD83C\uDFC6 Yangi yutuq!', message: def.icon + ' ' + def.name + ' \u2014 ' + def.description, duration: 5000 });
    }
    try {
      document.dispatchEvent(new CustomEvent('achievementunlocked', { detail: { achievement: def } }));
    } catch(e) {}
  }

  function checkStreakAchievements(streak) {
    var map = { 3: 'streak_3', 7: 'streak_7', 14: 'streak_14', 30: 'streak_30', 100: 'streak_100' };
    if (map[streak]) unlock(map[streak]);
  }

  function checkLessonAchievements(completedLessons) {
    var count = Object.keys(completedLessons).length;
    var countMap = { 1: 'first_lesson', 10: 'lessons_10', 25: 'lessons_25', 50: 'lessons_50', 100: 'lessons_100' };
    if (countMap[count]) unlock(countMap[count]);
  }

  function checkLevelCompletion(level, completedCount, totalCount) {
    if (completedCount >= totalCount && totalCount > 0) unlock('level_' + level + '_complete');
  }

  function checkPerfectScore(score, total) {
    if (score === total && total > 0) unlock('perfect_score');
  }

  function checkVocabAchievements(masteredCount) {
    var map = { 10: 'vocab_10', 50: 'vocab_50', 100: 'vocab_100', 250: 'vocab_250' };
    if (map[masteredCount]) unlock(map[masteredCount]);
  }

  function getAllWithStatus() {
    if (typeof ProgressManager === 'undefined') return definitions;
    var state = ProgressManager.getState();
    return definitions.map(function(def) {
      return Object.assign({}, def, {
        unlocked: state.achievements.indexOf(def.id) !== -1,
        unlockedAt: state.achievements.indexOf(def.id) !== -1 ? Date.now() : null
      });
    });
  }

  function getUnlockedCount() {
    if (typeof ProgressManager === 'undefined') return 0;
    return ProgressManager.getState().achievements.length;
  }

  function getTotalCount() { return definitions.length; }

  return {
    loadDefinitions: loadDefinitions,
    unlock: unlock,
    checkStreakAchievements: checkStreakAchievements,
    checkLessonAchievements: checkLessonAchievements,
    checkLevelCompletion: checkLevelCompletion,
    checkPerfectScore: checkPerfectScore,
    checkVocabAchievements: checkVocabAchievements,
    getAllWithStatus: getAllWithStatus,
    getUnlockedCount: getUnlockedCount,
    getTotalCount: getTotalCount
  };
})();
