/**
 * CzechMaster — Search Engine (WebView Compatible)
 */
'use strict';

const SearchManager = (() => {
  let curriculum = null, vocabulary = null, searchIndex = [];
  let debounceTimer = null;

  function init(curriculumData, vocabularyData) {
    curriculum = curriculumData;
    vocabulary = vocabularyData;
    buildIndex();
    bindEvents();
  }

  function buildIndex() {
    searchIndex = [];
    var levels = (curriculum && curriculum.levels) || [];
    levels.forEach(function(level) {
      (level.lessons || []).forEach(function(lesson) {
        searchIndex.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          subtitle: level.name + ' \u2022 ' + (lesson.category || 'Dars'),
          searchText: (lesson.title + ' ' + (lesson.description || '') + ' ' + level.name).toLowerCase(),
          icon: lesson.icon || '\uD83D\uDCD8',
          url: 'lesson.html?id=' + lesson.id
        });
      });
    });
    var words = (vocabulary && vocabulary.words) || [];
    words.forEach(function(word) {
      searchIndex.push({
        type: 'word',
        id: word.id,
        title: word.czech,
        subtitle: word.translation,
        searchText: (word.czech + ' ' + word.translation + ' ' + ((word.tags || []).join(' '))).toLowerCase(),
        icon: '\uD83D\uDD24',
        url: 'index.html#vocabulary?word=' + word.id
      });
    });
  }

  function matches(item, query) {
    var terms = query.toLowerCase().trim().split(/\s+/);
    return terms.every(function(term) { return item.searchText.indexOf(term) !== -1; });
  }

  function search(query) {
    if (!query || query.trim().length < 1) return { lessons: [], words: [] };
    var results = searchIndex.filter(function(item) { return matches(item, query); });
    return {
      lessons: results.filter(function(r) { return r.type === 'lesson'; }).slice(0, 6),
      words:   results.filter(function(r) { return r.type === 'word'; }).slice(0, 6)
    };
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
    if (!terms.length) return escaped;
    var pattern = new RegExp('(' + terms.join('|') + ')', 'gi');
    return escaped.replace(pattern, '<span class="search-highlight">$1</span>');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function renderResults(query, resultsContainer) {
    var res = search(query);
    var total = res.lessons.length + res.words.length;
    if (total === 0) {
      resultsContainer.innerHTML = '<div class="search-empty">"' + escapeHtml(query) + '" bo\'yicha hech narsa topilmadi</div>';
      resultsContainer.classList.add('open');
      return;
    }
    var html = '';
    if (res.lessons.length) {
      html += '<div class="search-result-section"><div class="search-result-title">Darslar</div>';
      res.lessons.forEach(function(item) {
        html += '<a href="' + item.url + '" class="search-result-item">' +
          '<span class="search-result-icon">' + item.icon + '</span>' +
          '<span class="search-result-info">' +
            '<span class="search-result-name">' + highlight(item.title, query) + '</span>' +
            '<span class="search-result-meta">' + escapeHtml(item.subtitle) + '</span>' +
          '</span></a>';
      });
      html += '</div>';
    }
    if (res.words.length) {
      html += '<div class="search-result-section"><div class="search-result-title">Lug\'at</div>';
      res.words.forEach(function(item) {
        html += '<a href="' + item.url + '" class="search-result-item">' +
          '<span class="search-result-icon">' + item.icon + '</span>' +
          '<span class="search-result-info">' +
            '<span class="search-result-name">' + highlight(item.title, query) + '</span>' +
            '<span class="search-result-meta">' + escapeHtml(item.subtitle) + '</span>' +
          '</span></a>';
      });
      html += '</div>';
    }
    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('open');
  }

  function bindEvents() {
    var input = document.querySelector('[data-search-input]');
    var resultsContainer = document.querySelector('[data-search-results]');
    if (!input || !resultsContainer) return;

    input.addEventListener('input', function(e) {
      clearTimeout(debounceTimer);
      var query = e.target.value;
      debounceTimer = setTimeout(function() {
        if (query.trim()) renderResults(query, resultsContainer);
        else { resultsContainer.classList.remove('open'); resultsContainer.innerHTML = ''; }
      }, 150);
    });

    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.classList.remove('open');
      }
    });

    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); input.focus(); input.select();
      }
      if (e.key === 'Escape') {
        resultsContainer.classList.remove('open'); input.blur();
      }
    });
  }

  return { init: init, search: search, renderResults: renderResults };
})();
