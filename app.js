/* eslint-disable no-undef */
(function () {
  'use strict';

  /* ===== PASSWORD GATE ===== */
  const LOCK_KEY = 'site_unlocked_v1';
  const LOCK_PASSWORD = 'raivispapucis';
  (function lockGate() {
    const lock = document.getElementById('lockScreen');
    if (!lock) return;
    if (localStorage.getItem(LOCK_KEY) === '1') {
      lock.style.display = 'none';
      document.body.classList.remove('locked');
      return;
    }
    document.body.classList.add('locked');
    const form = document.getElementById('lockForm');
    const pwd = document.getElementById('lockPassword');
    const err = document.getElementById('lockError');
    const card = document.getElementById('lockCard');
    const goodboy = document.getElementById('lockGoodboy');
    setTimeout(() => { if (pwd) pwd.focus(); }, 50);
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (pwd.value === LOCK_PASSWORD) {
        if (card) card.style.display = 'none';
        if (goodboy) {
          goodboy.hidden = false;
        }
        setTimeout(() => {
          try { localStorage.setItem(LOCK_KEY, '1'); } catch (_) {}
          lock.style.display = 'none';
          document.body.classList.remove('locked');
        }, 2400);
      } else {
        err.textContent = 'Nepareiza parole. Mēģini vēlreiz.';
        pwd.value = '';
        pwd.focus();
        lock.classList.add('shake');
        setTimeout(() => lock.classList.remove('shake'), 500);
      }
    });
  })();

  const TESTS = window.QUIZ_DATA || [];
  const STORAGE_VERSION = 1;
  const LETTERS = ['a', 'b', 'c', 'd', 'e'];
  const DOOM = 'doomscroll';
  const EXAM = 'exam';
  const EXAM_SIZE = 85;

  const app = document.getElementById('app');
  const backBtn = document.getElementById('backBtn');
  const brandSubtitle = document.getElementById('brandSubtitle');

  backBtn.addEventListener('click', () => {
    if (currentScreen === 'quiz') {
      askConfirm({
        title: 'Pārtraukt testu?',
        body: 'Tava progress tiks saglabāta — pēc atgriešanās varēsi turpināt no šī jautājuma.',
        okText: 'Iziet',
        cancelText: 'Palikt',
        onOk: () => goHome(),
      });
    } else if (currentScreen === 'exam' && runtime && !runtime.submitted) {
      askConfirm({
        title: 'Iziet no mēģinājuma?',
        body: 'Tavas atbildes tiks saglabātas — varēsi turpināt vēlāk no tā paša jautājuma.',
        okText: 'Iziet',
        cancelText: 'Palikt',
        onOk: () => goHome(),
      });
    } else {
      goHome();
    }
  });

  /* ---------- storage ---------- */

  function stateKey(slug) {
    return `quiz_state_v${STORAGE_VERSION}_${slug}`;
  }
  function loadState(slug) {
    try {
      const raw = localStorage.getItem(stateKey(slug));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    } catch (_) { return null; }
  }
  function saveState(slug, state) {
    try {
      localStorage.setItem(stateKey(slug), JSON.stringify(state));
    } catch (_) {}
  }
  function clearState(slug) {
    try { localStorage.removeItem(stateKey(slug)); } catch (_) {}
  }

  /* ---------- utils ---------- */

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getTest(slug) {
    return TESTS.find((t) => t.slug === slug);
  }

  // Resolve an order item to its question object.
  // For DOOM/EXAM modes the order item is {testSlug, qIdx}; for regular tests it's a numeric index.
  function getQuestionAt(slug, orderItem) {
    if (slug === DOOM || slug === EXAM) {
      const t = getTest(orderItem.testSlug);
      return t ? t.questions[orderItem.qIdx] : null;
    }
    const t = getTest(slug);
    return t ? t.questions[orderItem] : null;
  }

  function buildExamOrder() {
    const flat = [];
    TESTS.forEach((t) => {
      t.questions.forEach((_, qIdx) => flat.push({ testSlug: t.slug, qIdx }));
    });
    return shuffle(flat).slice(0, Math.min(EXAM_SIZE, flat.length));
  }

  function buildDoomOrder() {
    const flat = [];
    TESTS.forEach((t) => {
      t.questions.forEach((_, qIdx) => flat.push({ testSlug: t.slug, qIdx }));
    });
    return shuffle(flat);
  }

  function totalQuestionCount() {
    return TESTS.reduce((sum, t) => sum + t.questions.length, 0);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- routing ---------- */

  let currentScreen = 'home';
  let runtime = null; // { slug, order, idx, answers, locked }

  function goHome() {
    runtime = null;
    currentScreen = 'home';
    backBtn.hidden = true;
    brandSubtitle.textContent = 'Izvēlies testu, lai sāktu';
    document.body.classList.remove('exam-active');
    renderHome();
  }

  function startTest(slug, resume = false) {
    if (slug === DOOM) return startDoomscroll(resume);
    if (slug === EXAM) return startExam(resume);
    const test = getTest(slug);
    if (!test) return;
    let state;
    if (resume) {
      state = loadState(slug);
    }
    if (!state) {
      const order = shuffle(test.questions.map((_, i) => i));
      state = {
        slug,
        order,
        idx: 0,
        answers: {}, // questionIndex -> 'a'|'b'|... (user's choice)
        startedAt: Date.now(),
      };
      saveState(slug, state);
    }
    runtime = state;
    currentScreen = 'quiz';
    backBtn.hidden = false;
    brandSubtitle.textContent = test.title;
    renderQuiz();
  }

  function startExam(resume = false) {
    let state;
    if (resume) state = loadState(EXAM);
    if (!state) {
      const order = buildExamOrder();
      state = {
        slug: EXAM,
        order,
        answers: {}, // posIndex -> letter
        currentPage: 0,
        submitted: false,
        submittedAt: null,
        result: null,
        startedAt: Date.now(),
      };
      saveState(EXAM, state);
    }
    runtime = state;
    currentScreen = 'exam';
    backBtn.hidden = false;
    brandSubtitle.textContent = 'Īstā testa mēģinājums';
    document.body.classList.add('exam-active');
    renderExam();
  }

  function startDoomscroll(resume = false) {
    let state;
    if (resume) state = loadState(DOOM);
    if (!state) {
      state = {
        slug: DOOM,
        order: buildDoomOrder(),
        idx: 0,
        answers: {}, // positionInOrder -> letter (per round)
        round: 1,
        totalCorrect: 0,
        totalAnswered: 0,
        startedAt: Date.now(),
        showRoundToast: false,
      };
      saveState(DOOM, state);
    }
    runtime = state;
    currentScreen = 'quiz';
    backBtn.hidden = false;
    brandSubtitle.textContent = 'DOOMSCROLL · visi 7 testi';
    renderQuiz();
  }

  function showResult(slug) {
    const state = loadState(slug);
    if (!state) { goHome(); return; }
    runtime = state;
    currentScreen = 'result';
    backBtn.hidden = false;
    brandSubtitle.textContent = getTest(slug).title + ' — rezultāts';
    renderResult();
  }

  /* ---------- screens ---------- */

  function renderHome() {
    const parts = ['<section class="test-list">'];

    // DOOMSCROLL card on top
    const dsState = loadState(DOOM);
    const totalQs = totalQuestionCount();
    const dsRound = dsState ? dsState.round : 1;
    const dsAnsweredOverall = dsState ? (dsState.totalAnswered + Object.keys(dsState.answers).length) : 0;
    const dsCorrectOverall = dsState ? (dsState.totalCorrect + currentRoundCorrect(dsState)) : 0;
    const dsPct = dsAnsweredOverall ? Math.round((dsCorrectOverall / dsAnsweredOverall) * 100) : 0;
    const dsCta = dsState ? 'TURPINĀT →' : 'SĀKT →';
    parts.push(`
      <article class="doomscroll-card" data-slug="${DOOM}" tabindex="0" role="button" aria-label="Doomscroll režīms">
        <div class="ds-inner"></div>
        <span class="ds-cta">${dsCta}</span>
        <h2 class="ds-title">DOOMSCROLL</h2>
        <p class="ds-sub">${totalQs} jautājumi · visi 7 testi sajaukti · bezgalīgs cikls</p>
        <div class="ds-stats">
          <div class="ds-stat"><div class="v">${dsRound}</div><div class="l">Rounds</div></div>
          <div class="ds-stat"><div class="v">${dsAnsweredOverall}</div><div class="l">Atbildēti</div></div>
          <div class="ds-stat"><div class="v">${dsPct}%</div><div class="l">Pareizi</div></div>
        </div>
      </article>
    `);

    // ÍSTĀ TESTA MĒĢINĀJUMS card (Moodle-themed, stands out)
    const examState = loadState(EXAM);
    let examMeta = '';
    let examCta = 'SĀKT →';
    if (examState) {
      if (examState.submitted) {
        const r = examState.result || { correct: 0, total: examState.order.length };
        examMeta = `<span class="exam-status">Pabeigts: ${r.correct}/${r.total}</span>`;
      } else {
        const answered = Object.keys(examState.answers).length;
        examMeta = `<span class="exam-status">Turpināt: ${answered}/${examState.order.length}</span>`;
        examCta = 'TURPINĀT →';
      }
    }
    parts.push(`
      <article class="exam-card test-card" data-slug="${EXAM}" tabindex="0" role="button" aria-label="Īstā testa mēģinājums">
        <div class="exam-card-icon" aria-hidden="true">Q</div>
        <div class="exam-card-body">
          <h2 class="exam-card-title">Īstā testa mēģinājums</h2>
          <p class="exam-card-sub">${EXAM_SIZE} nejauši jautājumi · bez tūlītējām atbildēm · rezultāts beigās</p>
          ${examMeta ? `<div class="exam-card-meta">${examMeta}</div>` : ''}
        </div>
        <span class="exam-card-cta">${examCta}</span>
      </article>
    `);

    TESTS.forEach((t) => {
      const state = loadState(t.slug);
      let metaResume = '';
      if (state) {
        if (state.idx >= state.order.length) {
          // Completed but not cleared yet → show result option
          const correct = countCorrect(t, state);
          metaResume = `<span class="resume">Pabeigts: ${correct}/${state.order.length}</span>`;
        } else {
          metaResume = `<span class="resume">Turpināt ${state.idx + 1}/${state.order.length}</span>`;
        }
      }
      parts.push(`
        <article class="test-card" data-slug="${escapeHtml(t.slug)}" tabindex="0" role="button" aria-label="${escapeHtml(t.title)}">
          <h2 class="test-title">${escapeHtml(t.title)}</h2>
          <div class="test-meta">
            <span>${t.questions.length} jautājumi</span>
            ${metaResume}
          </div>
        </article>
      `);
    });
    parts.push('</section>');
    app.innerHTML = parts.join('');

    // Doomscroll click
    const dsCard = app.querySelector('.doomscroll-card');
    if (dsCard) {
      const activate = () => {
        const st = loadState(DOOM);
        if (st && (st.idx > 0 || st.round > 1)) {
          askConfirm({
            title: 'Doomscroll',
            body: `Tev jau ir aktīva sesija (round ${st.round}, ${st.totalAnswered + Object.keys(st.answers).length} atbildēti).`,
            okText: 'Turpināt',
            cancelText: 'Sākt no jauna',
            onOk: () => startDoomscroll(true),
            onCancel: () => { clearState(DOOM); startDoomscroll(false); },
          });
        } else {
          startDoomscroll(false);
        }
      };
      dsCard.addEventListener('click', activate);
      dsCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    }

    const activateExam = () => {
      const st = loadState(EXAM);
      if (st && st.submitted) {
        askConfirm({
          title: 'Iepriekšējais mēģinājums',
          body: `Tu jau pabeidzi mēģinājumu ar rezultātu ${st.result.correct}/${st.result.total}. Vai apskatīt vai sākt jaunu?`,
          okText: 'Sākt jaunu',
          cancelText: 'Apskatīt rezultātu',
          onOk: () => { clearState(EXAM); startExam(false); },
          onCancel: () => { runtime = st; currentScreen = 'exam'; backBtn.hidden = false; brandSubtitle.textContent = 'Īstā testa mēģinājums'; document.body.classList.add('exam-active'); renderExamResult(); },
        });
      } else if (st) {
        askConfirm({
          title: 'Turpināt mēģinājumu?',
          body: `Tev jau ir nepabeigts mēģinājums (${Object.keys(st.answers).length}/${st.order.length} atbildēts).`,
          okText: 'Turpināt',
          cancelText: 'Sākt no jauna',
          onOk: () => startExam(true),
          onCancel: () => { clearState(EXAM); startExam(false); },
        });
      } else {
        startExam(false);
      }
    };

    app.querySelectorAll('.test-card').forEach((el) => {
      const slug = el.getAttribute('data-slug');
      const onActivate = () => {
        if (slug === EXAM) { activateExam(); return; }
        const state = loadState(slug);
        if (state && state.idx >= state.order.length) {
          // Completed
          askConfirm({
            title: 'Tests pabeigts',
            body: 'Vai apskatīt rezultātu, vai sākt no jauna?',
            okText: 'Sākt no jauna',
            cancelText: 'Apskatīt',
            onOk: () => { clearState(slug); startTest(slug); },
            onCancel: () => showResult(slug),
          });
          return;
        }
        if (state) {
          askConfirm({
            title: 'Turpināt vai sākt no jauna?',
            body: `Tev ir saglabāts progress (${state.idx}/${state.order.length}).`,
            okText: 'Turpināt',
            cancelText: 'Sākt no jauna',
            onOk: () => startTest(slug, true),
            onCancel: () => { clearState(slug); startTest(slug); },
          });
        } else {
          startTest(slug);
        }
      };
      el.addEventListener('click', onActivate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      });
    });
  }

  function renderQuiz() {
    if (!runtime) return goHome();
    const isDoom = runtime.slug === DOOM;
    const test = isDoom ? null : getTest(runtime.slug);
    if (!isDoom && !test) return goHome();

    if (!isDoom && runtime.idx >= runtime.order.length) {
      // Regular test → result
      currentScreen = 'result';
      brandSubtitle.textContent = test.title + ' — rezultāts';
      renderResult();
      return;
    }

    if (isDoom && runtime.idx >= runtime.order.length) {
      // Round complete → roll into next round
      runtime.totalCorrect += currentRoundCorrect(runtime);
      runtime.totalAnswered += runtime.order.length;
      runtime.round += 1;
      runtime.order = buildDoomOrder();
      runtime.idx = 0;
      runtime.answers = {};
      runtime.showRoundToast = true;
      saveState(DOOM, runtime);
    }

    let question, qKey, sourceLabel;
    if (isDoom) {
      const item = runtime.order[runtime.idx];
      question = getQuestionAt(DOOM, item);
      qKey = String(runtime.idx); // per-round, by position
      const srcTest = getTest(item.testSlug);
      sourceLabel = srcTest ? srcTest.title : '';
    } else {
      const qIndex = runtime.order[runtime.idx];
      question = test.questions[qIndex];
      qKey = qIndex;
      sourceLabel = '';
    }
    const total = runtime.order.length;
    const done = runtime.idx;
    const progressPct = total ? Math.round((done / total) * 100) : 0;
    const userAnswer = runtime.answers[qKey];

    const orderedLetters = LETTERS.filter((l) => question.options[l] !== undefined);

    let topBar;
    if (isDoom) {
      const overallAns = runtime.totalAnswered + Object.keys(runtime.answers).length;
      const overallCorrect = runtime.totalCorrect + currentRoundCorrect(runtime);
      const overallPct = overallAns ? Math.round((overallCorrect / overallAns) * 100) : 0;
      topBar = `
        ${runtime.showRoundToast ? `<div class="round-toast">ROUND ${runtime.round} — uz priekšu, brāli!</div>` : ''}
        <div class="ds-runbar">
          <div class="group">
            <span><span class="l">round</span><span class="v accent">${runtime.round}</span></span>
            <span><span class="l">pos</span><span class="v">${done + 1}/${total}</span></span>
            <span><span class="l">kopā</span><span class="v">${overallCorrect}/${overallAns} · ${overallPct}%</span></span>
          </div>
          ${sourceLabel ? `<span class="src">${escapeHtml(sourceLabel)}</span>` : ''}
        </div>
        <div class="progress-bar"><div class="fill" style="width:${progressPct}%"></div></div>
      `;
    } else {
      topBar = `
        <div class="quiz-progress">
          <span>Jautājums <strong>${done + 1}</strong> no <strong>${total}</strong></span>
          <span>${progressPct}%</span>
        </div>
        <div class="progress-bar"><div class="fill" style="width:${progressPct}%"></div></div>
      `;
    }

    const html = `
      ${topBar}
      <article class="question-card">
        <h2 class="question-text">${escapeHtml(question.text)}</h2>
        <div class="options" id="options">
          ${orderedLetters.map((letter) => `
            <button type="button" class="option" data-letter="${letter}">
              <span class="letter">${letter.toUpperCase()}</span>
              <span class="label">${escapeHtml(question.options[letter])}</span>
            </button>
          `).join('')}
        </div>
        <div class="feedback" id="feedback" aria-live="polite"></div>
        <div class="next-row" style="${isDoom ? 'justify-content:space-between' : ''}">
          ${isDoom && done > 0 ? '<button id="prevDoomBtn" class="btn ghost">← Iepriekšējais</button>' : '<span></span>'}
          <button id="nextBtn" class="btn" hidden>Tālāk →</button>
        </div>
      </article>
    `;
    app.innerHTML = html;

    // Clear the round-toast flag after we've shown it once
    if (isDoom && runtime.showRoundToast) {
      runtime.showRoundToast = false;
      saveState(DOOM, runtime);
    }

    const optionsEl = document.getElementById('options');
    const feedbackEl = document.getElementById('feedback');
    const nextBtn = document.getElementById('nextBtn');

    function lock(chosen) {
      const correct = question.correct;
      const buttons = optionsEl.querySelectorAll('.option');
      buttons.forEach((b) => {
        b.disabled = true;
        const letter = b.getAttribute('data-letter');
        if (letter === correct) b.classList.add('correct');
        if (letter === chosen && chosen !== correct) b.classList.add('wrong');
      });
      if (chosen === correct) {
        feedbackEl.className = 'feedback show ok';
        feedbackEl.textContent = 'Pareizi!';
      } else {
        feedbackEl.className = 'feedback show bad';
        const corrText = question.options[correct] || '';
        feedbackEl.innerHTML = `Nepareizi. Pareizā atbilde: <strong>${correct.toUpperCase()}.</strong> ${escapeHtml(corrText)}`;
      }
      nextBtn.hidden = false;
      nextBtn.focus();
    }

    optionsEl.querySelectorAll('.option').forEach((b) => {
      b.addEventListener('click', () => {
        if (runtime.answers[qKey] !== undefined) return;
        const letter = b.getAttribute('data-letter');
        runtime.answers[qKey] = letter;
        saveState(runtime.slug, runtime);
        lock(letter);
      });
    });

    if (userAnswer !== undefined) {
      lock(userAnswer);
    }

    nextBtn.addEventListener('click', () => {
      runtime.idx += 1;
      saveState(runtime.slug, runtime);
      renderQuiz();
    });

    const prevDoomBtn = document.getElementById('prevDoomBtn');
    if (prevDoomBtn) {
      prevDoomBtn.addEventListener('click', () => {
        runtime.idx = Math.max(0, runtime.idx - 1);
        saveState(runtime.slug, runtime);
        renderQuiz();
      });
    }
  }

  /* ---------- EXAM mode (Moodle 1:1 question card only) ---------- */

  function backToTopOfExam() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderExam() {
    if (!runtime || runtime.slug !== EXAM) return goHome();

    if (runtime.submitted) {
      renderExamResult();
      return;
    }

    const total = runtime.order.length;
    if (runtime.currentPage < 0) runtime.currentPage = 0;
    if (runtime.currentPage >= total) runtime.currentPage = total - 1;

    const pos = runtime.currentPage;
    const item = runtime.order[pos];
    const question = getQuestionAt(EXAM, item);
    if (!question) { goHome(); return; }
    const letters = LETTERS.filter((l) => question.options[l] !== undefined);
    const userAnswer = runtime.answers[pos];
    const stateLabel = userAnswer ? 'Atbildēts' : 'Nav vēl atbildēts';
    const stateClass = userAnswer ? 'answersaved' : 'notyetanswered';
    const isLast = pos === total - 1;

    app.innerHTML = `
      <div class="exam-toolbar">
        <button type="button" class="moodle-back-btn" id="examBack">Atpakaļ</button>
      </div>
      <form id="examForm" autocomplete="off" onsubmit="return false">
        <div class="que multichoice deferredfeedback ${stateClass}">
          <div class="info">
            <h3 class="no">Jautājums <span class="qno">${pos + 1}</span></h3>
            <div class="state">${stateLabel}</div>
            <div class="grade">Maksimālais punktu skaits 1,00</div>
          </div>
          <div class="content">
            <div class="formulation clearfix">
              <h4 style="position:absolute;width:1px;height:1px;clip:rect(0 0 0 0);overflow:hidden">Jautājuma teksts</h4>
              <div class="qtext"><p>${escapeHtml(question.text)}</p></div>
              <fieldset class="ablock">
                <legend style="position:absolute;width:1px;height:1px;clip:rect(0 0 0 0);overflow:hidden"><span>Jautājums ${pos + 1}</span> Atbilde</legend>
                <div class="answer" id="examOptions">
                  ${letters.map((letter, i) => `
                    <div class="${i % 2 === 0 ? 'r0' : 'r1'}" data-letter="${letter}">
                      <input type="radio" name="examAnswer" value="${letter}" id="examAns-${letter}" ${userAnswer === letter ? 'checked' : ''}>
                      <label for="examAns-${letter}" class="ans-label">
                        <span class="answernumber">${letter}. </span>
                        <span class="ans-text">${escapeHtml(question.options[letter])}</span>
                      </label>
                    </div>
                  `).join('')}
                </div>
                <div class="qtype_multichoice_clearchoice" ${userAnswer ? '' : 'style="display:none"'}>
                  <a href="#" id="clearChoice" tabindex="0">Dzēst manu izvēli</a>
                </div>
              </fieldset>
            </div>
          </div>
        </div>
        <div class="submitbtns">
          ${pos > 0 ? `<button type="button" class="mod_quiz-prev-nav" id="prevBtn">Iepriekšējā lapa</button>` : ''}
          <button type="button" class="mod_quiz-next-nav ${isLast ? 'finish' : ''}" id="nextBtn">${isLast ? 'Pabeigt mēģinājumu...' : 'Nākamā lapa'}</button>
        </div>
      </form>
    `;

    const examBack = document.getElementById('examBack');
    if (examBack) examBack.addEventListener('click', () => {
      askConfirm({
        title: 'Iziet no mēģinājuma?',
        body: 'Tavas atbildes tiks saglabātas — varēsi atgriezties un turpināt vēlāk.',
        okText: 'Iziet',
        cancelText: 'Palikt',
        onOk: () => goHome(),
      });
    });

    function setAnswered(letter) {
      runtime.answers[pos] = letter;
      saveState(EXAM, runtime);
      const que = document.querySelector('.que');
      que.classList.remove('notyetanswered');
      que.classList.add('answersaved');
      const stateEl = que.querySelector('.state');
      if (stateEl) stateEl.textContent = 'Atbildēts';
      const clear = document.querySelector('.qtype_multichoice_clearchoice');
      if (clear) clear.style.display = '';
    }

    const optionsEl = document.getElementById('examOptions');
    optionsEl.querySelectorAll('div[data-letter]').forEach((row) => {
      row.addEventListener('click', (e) => {
        const letter = row.getAttribute('data-letter');
        const radio = row.querySelector('input');
        if (e.target.tagName !== 'INPUT') {
          radio.checked = true;
        }
        setAnswered(letter);
      });
    });
    optionsEl.querySelectorAll('input[name="examAnswer"]').forEach((rad) => {
      rad.addEventListener('change', () => setAnswered(rad.value));
    });

    const clearChoiceLink = document.getElementById('clearChoice');
    if (clearChoiceLink) clearChoiceLink.addEventListener('click', (e) => {
      e.preventDefault();
      delete runtime.answers[pos];
      saveState(EXAM, runtime);
      const que = document.querySelector('.que');
      que.classList.remove('answersaved');
      que.classList.add('notyetanswered');
      const stateEl = que.querySelector('.state');
      if (stateEl) stateEl.textContent = 'Nav vēl atbildēts';
      optionsEl.querySelectorAll('input[name="examAnswer"]').forEach((r) => { r.checked = false; });
      const clear = document.querySelector('.qtype_multichoice_clearchoice');
      if (clear) clear.style.display = 'none';
    });

    const prev = document.getElementById('prevBtn');
    if (prev) prev.addEventListener('click', () => {
      runtime.currentPage = Math.max(0, runtime.currentPage - 1);
      saveState(EXAM, runtime);
      renderExam();
      backToTopOfExam();
    });
    const next = document.getElementById('nextBtn');
    if (next) next.addEventListener('click', () => {
      if (isLast) {
        promptFinishExam();
        return;
      }
      runtime.currentPage = Math.min(total - 1, runtime.currentPage + 1);
      saveState(EXAM, runtime);
      renderExam();
      backToTopOfExam();
    });
  }

  function promptFinishExam() {
    const total = runtime.order.length;
    const answered = Object.keys(runtime.answers).length;
    const unanswered = total - answered;
    let body = unanswered > 0
      ? `Tev nav atbildēts uz ${unanswered} jautājumu(iem). Vai tiešām vēlies iesniegt mēģinājumu?`
      : 'Visi jautājumi ir atbildēti. Iesniegt mēģinājumu?';
    askConfirm({
      title: 'Pabeigt mēģinājumu?',
      body,
      okText: 'Iesniegt',
      cancelText: 'Atcelt',
      onOk: () => submitExam(),
    });
  }

  function submitExam() {
    if (!runtime || runtime.slug !== EXAM) return;
    const perQuestion = runtime.order.map((item, i) => {
      const q = getQuestionAt(EXAM, item);
      const user = runtime.answers[i];
      return {
        testSlug: item.testSlug,
        qIdx: item.qIdx,
        userAnswer: user || null,
        correctAnswer: q.correct,
        isCorrect: user === q.correct,
      };
    });
    const correct = perQuestion.filter((p) => p.isCorrect).length;
    runtime.submitted = true;
    runtime.submittedAt = Date.now();
    runtime.result = { correct, total: runtime.order.length, perQuestion };
    saveState(EXAM, runtime);
    renderExamResult();
  }

  function renderExamResult() {
    if (!runtime || runtime.slug !== EXAM) return goHome();
    const r = runtime.result || { correct: 0, total: runtime.order.length, perQuestion: [] };
    const pct = r.total ? Math.round((r.correct / r.total) * 1000) / 10 : 0;

    const rows = r.perQuestion.map((p, i) => {
      const t = getTest(p.testSlug);
      const q = t ? t.questions[p.qIdx] : null;
      const userLetter = p.userAnswer ? p.userAnswer.toUpperCase() : '—';
      const correctLetter = p.correctAnswer ? p.correctAnswer.toUpperCase() : '—';
      const sourceTitle = t ? t.title : '';
      const userText = q && p.userAnswer ? escapeHtml(q.options[p.userAnswer] || '') : '<em>Nav atbildēts</em>';
      const correctText = q ? escapeHtml(q.options[p.correctAnswer] || '') : '';
      return `
        <div class="overview-item ${p.isCorrect ? '' : 'wrong'}">
          <p class="q">
            <span class="badge">${i + 1}</span>
            <span>${escapeHtml(q ? q.text : '')}</span>
          </p>
          <div style="font-size:0.78rem;color:#6c757d;margin-bottom:6px">Avots: ${escapeHtml(sourceTitle)}</div>
          <div style="font-size:0.9rem;line-height:1.5">
            <div><strong>Tava atbilde:</strong> ${userLetter}. ${userText}</div>
            <div style="margin-top:4px"><strong>Pareizā atbilde:</strong> ${correctLetter}. ${correctText}</div>
          </div>
        </div>
      `;
    }).join('');

    app.innerHTML = `
      <div class="exam-toolbar">
        <button type="button" class="moodle-back-btn" id="examHomeTopBtn">Atpakaļ</button>
      </div>
      <section class="result-card">
        <div>Tavs rezultāts</div>
        <div class="result-score" style="color:#23a455">${r.correct} / ${r.total}</div>
        <div class="result-detail">${pct}% pareizi</div>
        <div class="result-actions">
          <button class="mod_quiz-next-nav" id="examAgainBtn">Sākt jaunu mēģinājumu</button>
          <button class="mod_quiz-prev-nav" id="examHomeBtn">Atpakaļ uz sākumu</button>
        </div>
      </section>
      <h2 style="font-size:1.1rem;margin:18px 4px 12px">Visi jautājumi</h2>
      ${rows}
    `;
    document.getElementById('examHomeTopBtn').addEventListener('click', goHome);
    document.getElementById('examAgainBtn').addEventListener('click', () => { clearState(EXAM); startExam(false); });
    document.getElementById('examHomeBtn').addEventListener('click', goHome);
  }

  function currentRoundCorrect(state) {
    if (state.slug !== DOOM) return 0;
    let n = 0;
    Object.keys(state.answers).forEach((pos) => {
      const item = state.order[Number(pos)];
      if (!item) return;
      const q = getQuestionAt(DOOM, item);
      if (q && state.answers[pos] === q.correct) n += 1;
    });
    return n;
  }

  function countCorrect(test, state) {
    let n = 0;
    Object.keys(state.answers).forEach((qIdx) => {
      const q = test.questions[qIdx];
      if (q && state.answers[qIdx] === q.correct) n += 1;
    });
    return n;
  }

  function renderResult() {
    if (!runtime) return goHome();
    const test = getTest(runtime.slug);
    if (!test) return goHome();
    const total = runtime.order.length;
    const correct = countCorrect(test, runtime);
    const pct = total ? Math.round((correct / total) * 1000) / 10 : 0;

    const overviewItems = runtime.order.map((qIdx, i) => {
      const q = test.questions[qIdx];
      const user = runtime.answers[qIdx];
      const isCorrect = user === q.correct;
      const letters = LETTERS.filter((l) => q.options[l] !== undefined);
      return `
        <div class="overview-item ${isCorrect ? '' : 'wrong'}">
          <p class="q">
            <span class="badge">${i + 1}</span>
            <span>${escapeHtml(q.text)}</span>
          </p>
          <ul>
            ${letters.map((l) => {
              const isUser = user === l;
              const isAnswer = q.correct === l;
              let cls = '';
              let tag = '';
              if (isAnswer && isUser) { cls = 'you-correct'; tag = '<span class="tag">tava + pareiza</span>'; }
              else if (isAnswer) { cls = 'right-answer'; tag = '<span class="tag">pareizā</span>'; }
              else if (isUser) { cls = 'you-wrong'; tag = '<span class="tag">tava</span>'; }
              return `<li class="${cls}"><span class="ol">${l.toUpperCase()}.</span><span>${escapeHtml(q.options[l])}</span>${tag}</li>`;
            }).join('')}
          </ul>
        </div>
      `;
    }).join('');

    app.innerHTML = `
      <section class="result-card">
        <div>Tavs rezultāts</div>
        <div class="result-score">${correct} / ${total}</div>
        <div class="result-detail">${pct}% pareizi</div>
        <div class="result-actions">
          <button class="btn" id="againBtn">Pildīt vēlreiz</button>
          <button class="btn secondary" id="homeBtn">Uz testu sarakstu</button>
        </div>
      </section>
      <section class="overview">
        <h2>Visi jautājumi</h2>
        ${overviewItems}
      </section>
    `;

    document.getElementById('againBtn').addEventListener('click', () => {
      clearState(runtime.slug);
      startTest(runtime.slug);
    });
    document.getElementById('homeBtn').addEventListener('click', goHome);
  }

  /* ---------- modal ---------- */

  function askConfirm({ title, body, okText = 'Labi', cancelText = 'Atcelt', onOk, onCancel }) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <div class="modal-actions">
          <button class="btn ghost" data-act="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn" data-act="ok">${escapeHtml(okText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelector('[data-act=ok]').addEventListener('click', () => { close(); if (onOk) onOk(); });
    back.querySelector('[data-act=cancel]').addEventListener('click', () => { close(); if (onCancel) onCancel(); });
    back.addEventListener('click', (e) => {
      if (e.target === back) { close(); if (onCancel) onCancel(); }
    });
    back.querySelector('[data-act=ok]').focus();
  }

  /* ---------- boot ---------- */

  if (!TESTS.length) {
    app.innerHTML = `<p style="text-align:center;color:#c83232;padding:24px">Neizdevās ielādēt jautājumus. Pārliecinies, ka <code>data/questions.js</code> ir vietā.</p>`;
    return;
  }
  goHome();
})();
