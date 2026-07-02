/**
 * CzechMaster — Certificate Generator (WebView Compatible)
 * Canvas asosida sertifikat chizadi, PNG sifatida yuklab oladi.
 */
'use strict';

const CertificateEngine = (() => {
  const TOTAL_LESSONS_REQUIRED = 50;
  const CANVAS_WIDTH = 1200, CANVAS_HEIGHT = 850;

  const UZBEK_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  function formatUzbekDate(date) {
    return date.getDate() + ' ' + UZBEK_MONTHS[date.getMonth()] + ' ' + date.getFullYear();
  }

  function isEligible() {
    if (typeof ProgressManager === 'undefined') return false;
    return ProgressManager.getStats().completedLessons >= TOTAL_LESSONS_REQUIRED;
  }

  function lessonsRemaining() {
    if (typeof ProgressManager === 'undefined') return TOTAL_LESSONS_REQUIRED;
    return Math.max(0, TOTAL_LESSONS_REQUIRED - ProgressManager.getStats().completedLessons);
  }

  function openNameModal() {
    if (!isEligible()) {
      if (typeof ToastManager !== 'undefined') ToastManager.warning('Sertifikat olish uchun yana ' + lessonsRemaining() + ' ta dars qoldi.');
      return;
    }
    var savedName = '';
    try { savedName = localStorage.getItem('czechmaster_certificate_name') || ''; } catch(e) {}

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" style="max-width:440px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">&#127891; Sertifikat</h3>' +
          '<button class="modal-close" data-cert-close aria-label="Yopish">' +
            '<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p class="text-secondary text-sm mb-4">Tabriklaymiz! Siz barcha ' + TOTAL_LESSONS_REQUIRED + ' ta darsni tugatdingiz. To\'liq ismingizni kiriting:</p>' +
          '<div class="input-group">' +
            '<label class="input-label" for="cert-name-input">To\'liq ism</label>' +
            '<input type="text" id="cert-name-input" class="input" placeholder="Masalan: Alisher Navoiy" maxlength="60" autocomplete="off" value="' + escapeAttr(savedName) + '">' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" data-cert-close>Bekor qilish</button>' +
          '<button class="btn btn-primary" data-cert-generate>Sertifikat yaratish</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    requestAnimationFrame(function() { backdrop.classList.add('visible'); });

    var nameInput = backdrop.querySelector('#cert-name-input');
    if (nameInput) nameInput.focus();

    function closeModal() {
      backdrop.classList.remove('visible');
      setTimeout(function() { if (backdrop.parentNode) backdrop.remove(); }, 250);
    }

    backdrop.querySelectorAll('[data-cert-close]').forEach(function(btn) { btn.addEventListener('click', closeModal); });
    backdrop.addEventListener('click', function(e) { if (e.target === backdrop) closeModal(); });

    if (nameInput) {
      nameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') generateAndShow(nameInput.value, closeModal);
      });
    }

    var generateBtn = backdrop.querySelector('[data-cert-generate]');
    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
        if (nameInput) generateAndShow(nameInput.value, closeModal);
      });
    }
  }

  function escapeAttr(str) { return String(str).replace(/"/g, '&quot;'); }

  function generateAndShow(name, closeNameModal) {
    var trimmed = name.trim();
    if (!trimmed) {
      if (typeof ToastManager !== 'undefined') ToastManager.error('Iltimos, ismingizni kiriting.');
      return;
    }
    try { localStorage.setItem('czechmaster_certificate_name', trimmed); } catch(e) {}
    closeNameModal();
    var canvas = drawCertificate(trimmed);
    showPreviewModal(canvas);
    if (typeof AchievementsManager !== 'undefined') {
      var state = ProgressManager.getState();
      if (state.achievements.indexOf('certificate_earned') === -1) AchievementsManager.unlock('certificate_earned');
    }
  }

  function drawCzechFlag(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = '#D7141A'; ctx.fillRect(x, y + h / 2, w, h / 2);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillStyle = '#11457E';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.42, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function drawCertificate(name) {
    var canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH; canvas.height = CANVAS_HEIGHT;
    var ctx = canvas.getContext('2d');

    var bgGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#0F172A'); bgGradient.addColorStop(0.5, '#1E293B'); bgGradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(59,130,246,0.08)';
    ctx.beginPath(); ctx.arc(0, 0, 260, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH, CANVAS_HEIGHT, 260, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(225,29,72,0.06)';
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH, 0, 200, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, CANVAS_WIDTH-80, CANVAS_HEIGHT-80);
    ctx.strokeStyle = 'rgba(96,165,250,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(54, 54, CANVAS_WIDTH-108, CANVAS_HEIGHT-108);

    ctx.textAlign = 'center';
    drawCzechFlag(ctx, CANVAS_WIDTH/2 - 45, 100, 90, 56);

    ctx.fillStyle = '#F1F5F9'; ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('C Z E C H M A S T E R', CANVAS_WIDTH/2, 200);
    ctx.fillStyle = '#60A5FA'; ctx.font = '18px Georgia, serif';
    ctx.fillText('Chex tili o\'quv platformasi', CANVAS_WIDTH/2, 228);

    ctx.fillStyle = '#F1F5F9'; ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText('TUGATISH SERTIFIKATI', CANVAS_WIDTH/2, 310);

    ctx.strokeStyle = '#E11D48'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2-100, 335); ctx.lineTo(CANVAS_WIDTH/2+100, 335); ctx.stroke();

    ctx.fillStyle = '#94A3B8'; ctx.font = '20px Georgia, serif';
    ctx.fillText('Ushbu sertifikat quyidagi shaxsga beriladi:', CANVAS_WIDTH/2, 398);

    ctx.fillStyle = '#FFFFFF';
    var fontSize = 52;
    ctx.font = 'bold ' + fontSize + 'px Georgia, serif';
    while (ctx.measureText(name).width > CANVAS_WIDTH - 200 && fontSize > 24) {
      fontSize -= 2; ctx.font = 'bold ' + fontSize + 'px Georgia, serif';
    }
    ctx.fillText(name, CANVAS_WIDTH/2, 468);

    var nameWidth = Math.min(ctx.measureText(name).width + 80, CANVAS_WIDTH - 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2 - nameWidth/2, 494); ctx.lineTo(CANVAS_WIDTH/2 + nameWidth/2, 494); ctx.stroke();

    ctx.fillStyle = '#CBD5E1'; ctx.font = '19px Georgia, serif';
    ctx.fillText("Chex tilini A1 darajasidan C1 darajasigacha bo'lgan barcha", CANVAS_WIDTH/2, 544);
    ctx.fillText(TOTAL_LESSONS_REQUIRED + ' ta darsni muvaffaqiyatli tugatgani uchun beriladi.', CANVAS_WIDTH/2, 572);

    var stats = typeof ProgressManager !== 'undefined' ? ProgressManager.getStats() : { totalXp:0, longestStreak:0, achievementsCount:0 };
    ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#60A5FA';
    ctx.fillText('\u2B50 ' + stats.totalXp + " XP yig'ildi   \u2022   \uD83D\uDD25 " + stats.longestStreak + ' kunlik streak   \u2022   \uD83C\uDFC6 ' + stats.achievementsCount + ' ta yutuq', CANVAS_WIDTH/2, 634);

    ctx.fillStyle = '#94A3B8'; ctx.font = '16px Georgia, serif';
    ctx.fillText(formatUzbekDate(new Date()), CANVAS_WIDTH/2, 694);

    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(140, 734); ctx.lineTo(380, 734); ctx.stroke();
    ctx.fillStyle = '#94A3B8'; ctx.font = '14px Arial';
    ctx.fillText('CzechMaster jamoasi', 140, 756);

    ctx.textAlign = 'right';
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH-380, 734); ctx.lineTo(CANVAS_WIDTH-140, 734); ctx.stroke();
    ctx.fillText('A1 \u2192 C1 daraja', CANVAS_WIDTH-140, 756);

    return canvas;
  }

  function showPreviewModal(canvas) {
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" style="max-width:760px;">' +
        '<div class="modal-header">' +
          '<h3 class="modal-title">&#127881; Sertifikatingiz tayyor!</h3>' +
          '<button class="modal-close" data-cert-preview-close aria-label="Yopish">' +
            '<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body" style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4);">' +
          '<div data-cert-canvas-holder style="width:100%;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg);"></div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" data-cert-preview-close>Yopish</button>' +
          '<button class="btn btn-primary" data-cert-download>&#8595; PNG yuklab olish</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(backdrop);
    requestAnimationFrame(function() { backdrop.classList.add('visible'); });

    var holder = backdrop.querySelector('[data-cert-canvas-holder]');
    if (holder) { canvas.style.width = '100%'; canvas.style.height = 'auto'; canvas.style.display = 'block'; holder.appendChild(canvas); }

    function closeModal() {
      backdrop.classList.remove('visible');
      setTimeout(function() { if (backdrop.parentNode) backdrop.remove(); }, 250);
    }

    backdrop.querySelectorAll('[data-cert-preview-close]').forEach(function(btn) { btn.addEventListener('click', closeModal); });
    backdrop.addEventListener('click', function(e) { if (e.target === backdrop) closeModal(); });

    var downloadBtn = backdrop.querySelector('[data-cert-download]');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function() {
        try {
          var link = document.createElement('a');
          link.download = 'CzechMaster-sertifikat.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
          if (typeof ToastManager !== 'undefined') ToastManager.success('Sertifikat yuklab olindi!');
        } catch(e) {
          console.error('[Certificate] Yuklab olishda xatolik:', e);
          if (typeof ToastManager !== 'undefined') ToastManager.error('Yuklab olishda xatolik.');
        }
      });
    }
  }

  return {
    isEligible: isEligible,
    lessonsRemaining: lessonsRemaining,
    openNameModal: openNameModal,
    TOTAL_LESSONS_REQUIRED: TOTAL_LESSONS_REQUIRED
  };
})();
