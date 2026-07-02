/**
 * CzechMaster — Audio Controller (Google TTS + Web Speech fallback)
 * ===================================================================
 * Chex tilidagi matnlarni ovoz bilan o'qiydi.
 *
 * Strategiya:
 *  1. Google Translate TTS (onlayn) — sifatli chex ovozi, internet kerak
 *  2. Web Speech API (oflayn) — agar brauzer/WebView qo'llab-quvvatlasa
 *  3. Agar ikkalasi ham bo'lmasa — jim qoladi (xato bermaydi)
 *
 * Google TTS endpoint matnni bo'laklarga bo'lib yuboradi (200 belgidan
 * uzun matnlar uchun) va Audio elementi orqali ketma-ket ijro etadi.
 */
'use strict';

const AudioController = (() => {
  const LANG_CZECH = 'cs-CZ';
  const GOOGLE_TTS_LANG = 'cs';

  let voices = [];
  let czechVoice = null;
  let webSpeechSupported = false;
  let playingButtons = new Set();
  let currentAudio = null;
  let audioQueue = [];
  let isPlaying = false;

  /* Web Speech mavjudligini tekshirish (oflayn zaxira) */
  try {
    webSpeechSupported = typeof window.speechSynthesis !== 'undefined' &&
                         typeof window.SpeechSynthesisUtterance !== 'undefined' &&
                         typeof window.speechSynthesis.speak === 'function';
  } catch (e) {
    webSpeechSupported = false;
  }

  function loadVoices() {
    if (!webSpeechSupported) return;
    try {
      voices = window.speechSynthesis.getVoices() || [];
      czechVoice = voices.find(function(v) { return v.lang === LANG_CZECH; }) ||
                   voices.find(function(v) { return v.lang && v.lang.indexOf('cs') === 0; }) ||
                   null;
    } catch (e) {}
  }

  function init() {
    if (webSpeechSupported) {
      loadVoices();
      try {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
      } catch (e) {}
    }
    console.log('[Audio] Google TTS rejimi. WebSpeech zaxira:', webSpeechSupported);
  }

  /* Matnni Google TTS uchun ~190 belgilik bo'laklarga ajratadi */
  function splitText(text) {
    var chunks = [];
    var maxLen = 190;
    /* Gaplarni buzmaslik uchun bo'shliq bo'yicha bo'lamiz */
    var words = text.split(' ');
    var current = '';
    for (var i = 0; i < words.length; i++) {
      if ((current + ' ' + words[i]).length > maxLen) {
        if (current) chunks.push(current.trim());
        current = words[i];
      } else {
        current += (current ? ' ' : '') + words[i];
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text];
  }

  /* Google TTS URL yasaydi */
  function googleTtsUrl(text) {
    return 'https://translate.google.com/translate_tts?ie=UTF-8' +
           '&tl=' + GOOGLE_TTS_LANG +
           '&client=tw-ob' +
           '&q=' + encodeURIComponent(text);
  }

  /* Audio bo'laklarni ketma-ket ijro etadi */
  function playChunks(chunks, options) {
    options = options || {};
    audioQueue = chunks.slice();
    isPlaying = true;

    function playNext() {
      if (!isPlaying || audioQueue.length === 0) {
        finishPlayback(options);
        return;
      }
      var chunk = audioQueue.shift();
      var audio = new Audio();
      currentAudio = audio;
      audio.src = googleTtsUrl(chunk);

      /* Tezlik sozlash (0.7 = sekin) */
      audio.playbackRate = options.rate ? Math.max(0.5, Math.min(1.5, options.rate + 0.15)) : 1.0;

      audio.onended = function() { playNext(); };
      audio.onerror = function() {
        console.warn('[Audio] Google TTS xato, Web Speech zaxiraga o\'tamiz');
        /* Google ishlamasa, Web Speech bilan urinib ko'ramiz */
        isPlaying = false;
        if (webSpeechSupported) {
          speakViaWebSpeech(chunks.join(' '), options);
        } else {
          finishPlayback(options);
        }
      };

      var playPromise = audio.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(function(e) {
          console.warn('[Audio] play() rad etildi:', e);
          /* Avtomatik ijro bloklangan bo'lsa Web Speech zaxira */
          isPlaying = false;
          if (webSpeechSupported) speakViaWebSpeech(chunks.join(' '), options);
          else finishPlayback(options);
        });
      }
    }

    if (options.onStart) options.onStart();
    playNext();
  }

  function finishPlayback(options) {
    isPlaying = false;
    currentAudio = null;
    if (options.button) {
      options.button.classList.remove('playing');
      playingButtons.delete(options.button);
    }
    if (options.onEnd) options.onEnd();
  }

  /* Web Speech API orqali o'qish (oflayn zaxira) */
  function speakViaWebSpeech(text, options) {
    options = options || {};
    if (!webSpeechSupported) {
      if (options.onEnd) options.onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = LANG_CZECH;
      u.rate = options.rate || 0.85;
      u.pitch = 1;
      u.volume = 1;
      if (czechVoice) u.voice = czechVoice;
      u.onend = function() { finishPlayback(options); };
      u.onerror = function() { finishPlayback(options); };
      window.speechSynthesis.speak(u);
    } catch (e) {
      finishPlayback(options);
    }
  }

  /* Asosiy speak funksiyasi */
  function speak(text, options) {
    options = options || {};
    if (!text || !text.trim()) {
      if (options.onEnd) options.onEnd();
      return;
    }

    /* Avvalgi ovozni to'xtatamiz */
    stop();

    if (options.button) {
      options.button.classList.add('playing');
      playingButtons.add(options.button);
    }

    /* 1-USUL: Android native TTS (offline, eng ishonchli) */
    if (tryAndroidTts(text, options)) {
      return;
    }

    /* 2-USUL: Google TTS (onlayn, sifatli chex ovozi) */
    var chunks = splitText(text.trim());
    playChunks(chunks, options);
  }

  /* Android native TTS'ni sinab ko'radi. Muvaffaqiyatli bo'lsa true qaytaradi. */
  function tryAndroidTts(text, options) {
    try {
      if (window.Android &&
          typeof window.Android.speak === 'function' &&
          typeof window.Android.isCzechTtsAvailable === 'function' &&
          window.Android.isCzechTtsAvailable()) {

        if (options.onStart) options.onStart();
        var rate = options.rate || 0.9;
        window.Android.speak(text, rate);

        /* Android TTS tugashini bilish uchun taxminiy vaqt (har so'z ~0.4s) */
        var wordCount = text.split(/\s+/).length;
        var estMs = Math.max(800, wordCount * 450 / rate);
        setTimeout(function() {
          if (options.button) {
            options.button.classList.remove('playing');
            playingButtons.delete(options.button);
          }
          if (options.onEnd) options.onEnd();
        }, estMs);
        return true;
      }
    } catch (e) {
      console.warn('[Audio] Android TTS xato:', e);
    }
    return false;
  }

  function stop() {
    isPlaying = false;
    audioQueue = [];
    if (currentAudio) {
      try { currentAudio.pause(); currentAudio.src = ''; } catch (e) {}
      currentAudio = null;
    }
    if (webSpeechSupported) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    /* Android native TTS'ni ham to'xtatamiz */
    try {
      if (window.Android && typeof window.Android.stopSpeaking === 'function') {
        window.Android.stopSpeaking();
      }
    } catch (e) {}
    playingButtons.forEach(function(btn) { btn.classList.remove('playing'); });
    playingButtons.clear();
  }

  function hasCzechVoice() { return true; /* Google TTS doim chex beradi */ }
  function isAvailable() { return true; /* Onlayn Google TTS doim mavjud */ }

  function bindAudioButtons(root) {
    root = root || document;
    root.querySelectorAll('[data-audio-play]').forEach(function(btn) {
      if (btn.dataset.audioBound) return;
      btn.dataset.audioBound = 'true';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var text = btn.dataset.audioPlay || btn.dataset.audioText;
        if (text) speak(text, { button: btn });
      });
    });
  }

  return {
    init: init, speak: speak, stop: stop,
    hasCzechVoice: hasCzechVoice, isAvailable: isAvailable,
    bindAudioButtons: bindAudioButtons
  };
})();

document.addEventListener('DOMContentLoaded', function() { AudioController.init(); });
