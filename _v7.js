
// ============================================================
//  v7.0 LIFE TRACKER — work types, theming, wheel v2, smart FAB,
//  productivity score, login reward, pomodoro, wheel of life,
//  evening journal, weekly review
// ============================================================
(function () {
'use strict';

// ------------------------------------------------------------
//  1. WORK TYPES — catalogue, terminology, themes
// ------------------------------------------------------------
const NOUNS = {
  shift:   { one: 'смена',      acc: 'смену',      plural: 'смен',       active: 'СМЕНА АКТИВНА',      inactive: 'СМЕНА НЕ АКТИВНА',      tasks: 'ЗАДАЧИ СМЕНЫ',       start: 'Начать смену',       end: 'Завершить смену',       add: 'Добавить смену',       tab: 'РАБОТА' },
  session: { one: 'сессия',     acc: 'сессию',     plural: 'сессий',     active: 'СЕССИЯ АКТИВНА',     inactive: 'СЕССИЯ НЕ АКТИВНА',     tasks: 'ЗАДАЧИ СЕССИИ',      start: 'Начать сессию',      end: 'Завершить сессию',      add: 'Добавить сессию',      tab: 'РАБОТА' },
  day:     { one: 'день',       acc: 'день',       plural: 'дней',       active: 'РАБОЧИЙ ДЕНЬ ИДЁТ',  inactive: 'ДЕНЬ НЕ НАЧАТ',         tasks: 'ЗАДАЧИ ДНЯ',         start: 'Начать день',        end: 'Завершить день',        add: 'Добавить день',        tab: 'РАБОТА' },
  workout: { one: 'тренировка', acc: 'тренировку', plural: 'тренировок', active: 'ТРЕНИРОВКА ИДЁТ',    inactive: 'ТРЕНИРОВКА НЕ НАЧАТА',  tasks: 'ЗАДАЧИ ТРЕНИРОВКИ',  start: 'Начать тренировку',  end: 'Завершить тренировку',  add: 'Добавить тренировку',  tab: 'СПОРТ' },
  lesson:  { one: 'занятие',    acc: 'занятие',    plural: 'занятий',    active: 'ЗАНЯТИЕ ИДЁТ',       inactive: 'ЗАНЯТИЕ НЕ НАЧАТО',     tasks: 'ЗАДАЧИ ЗАНЯТИЯ',     start: 'Начать занятие',     end: 'Завершить занятие',     add: 'Добавить занятие',     tab: 'УЧЁБА' },
};
const NOUN_LABELS = { shift: 'Смена', session: 'Сессия', day: 'Рабочий день', workout: 'Тренировка', lesson: 'Занятие' };

const THEMES = {
  blue:    { primary: '#1B3A5C', light: '#2C5282', dark: '#0F2440', accent: '#3182CE', soft: '#EBF4FF', soft2: '#DBEAFE' },
  amber:   { primary: '#92400E', light: '#B45309', dark: '#78350F', accent: '#F59E0B', soft: '#FFFBEB', soft2: '#FEF3C7' },
  slate:   { primary: '#334155', light: '#475569', dark: '#1E293B', accent: '#0EA5E9', soft: '#F0F9FF', soft2: '#E0F2FE' },
  indigo:  { primary: '#312E81', light: '#4338CA', dark: '#1E1B4B', accent: '#6366F1', soft: '#EEF2FF', soft2: '#E0E7FF' },
  teal:    { primary: '#134E4A', light: '#0F766E', dark: '#042F2E', accent: '#14B8A6', soft: '#F0FDFA', soft2: '#CCFBF1' },
  purple:  { primary: '#4C1D95', light: '#6D28D9', dark: '#2E1065', accent: '#8B5CF6', soft: '#F5F3FF', soft2: '#EDE9FE' },
  emerald: { primary: '#064E3B', light: '#047857', dark: '#022C22', accent: '#10B981', soft: '#ECFDF5', soft2: '#D1FAE5' },
  rose:    { primary: '#831843', light: '#BE185D', dark: '#500724', accent: '#EC4899', soft: '#FDF2F8', soft2: '#FCE7F3' },
  red:     { primary: '#7F1D1D', light: '#B91C1C', dark: '#450A0A', accent: '#EF4444', soft: '#FEF2F2', soft2: '#FEE2E2' },
  graphite:{ primary: '#1F2937', light: '#374151', dark: '#111827', accent: '#9CA3AF', soft: '#F9FAFB', soft2: '#F3F4F6' },
};

const WORK_TYPES = [
  { id: 'delivery',  name: 'Доставка',     sub: 'курьер, Ozon, Яндекс',   icon: '📦', noun: 'shift',   theme: 'blue',    goal: 850 },
  { id: 'taxi',      name: 'Такси',        sub: 'водитель, рейсы',        icon: '🚌', noun: 'shift',   theme: 'amber',   goal: 900 },
  { id: 'warehouse', name: 'Склад',        sub: 'логистика, сборка',      icon: '🏗', noun: 'shift',   theme: 'slate',   goal: 400 },
  { id: 'office',    name: 'Офис',         sub: 'найм, график 5/2',       icon: '🏢', noun: 'day',     theme: 'indigo',  goal: 600 },
  { id: 'freelance', name: 'Фриланс',      sub: 'проекты, удалёнка',      icon: '💻', noun: 'session', theme: 'teal',    goal: 1200 },
  { id: 'business',  name: 'Бизнес',       sub: 'своё дело, продажи',     icon: '💼', noun: 'day',     theme: 'emerald', goal: 1500 },
  { id: 'study',     name: 'Учёба',        sub: 'курсы, универ',          icon: '📚', noun: 'lesson',  theme: 'purple',  goal: 0 },
  { id: 'creative',  name: 'Творчество',   sub: 'музыка, дизайн, контент',icon: '🎨', noun: 'session', theme: 'rose',    goal: 800 },
  { id: 'fitness',   name: 'Спорт',        sub: 'тренер, тренировки',     icon: '🏋', noun: 'workout', theme: 'red',     goal: 0 },
  { id: 'custom',    name: 'Своё',         sub: 'настроить вручную',      icon: '🛠', noun: 'session', theme: 'graphite',goal: 500 },
];

function getWorkType() {
  const saved = uGet('v7_work_type', null);
  if (saved && saved.id) {
    const base = WORK_TYPES.find(w => w.id === saved.id) || WORK_TYPES[0];
    return Object.assign({}, base, saved);
  }
  return Object.assign({}, WORK_TYPES[0]);
}
function saveWorkType(wt) {
  uSet('v7_work_type', wt);
  if (typeof markLocalChange === 'function') markLocalChange();
  if (typeof schedulePushProgress === 'function') schedulePushProgress();
}
function wtNoun() { return NOUNS[getWorkType().noun] || NOUNS.shift; }

// --- Theme application ---
function applyWorkTheme(wt) {
  const t = THEMES[wt.theme] || THEMES.blue;
  const r = document.documentElement.style;
  document.documentElement.classList.add('v7-theming');
  r.setProperty('--primary', t.primary);
  r.setProperty('--primary-light', t.light);
  r.setProperty('--primary-dark', t.dark);
  r.setProperty('--bg-sidebar', t.primary);
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-hover', t.light);
  r.setProperty('--accent-soft', t.soft);
  r.setProperty('--accent-soft-2', t.soft2);
  r.setProperty('--hero', 'linear-gradient(135deg, ' + t.primary + ' 0%, ' + t.light + ' 100%)');
  r.setProperty('--wt-c', t.accent);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.primary);
  document.body.dataset.worktype = wt.id;
  setTimeout(() => document.documentElement.classList.remove('v7-theming'), 450);
}

// --- Terminology: text replacement scoped to work containers ---
const LOCALIZE_ROOTS = ['contentLive', 'dashboardContent', 'tabLive', 'fabMenu', 'endShiftModal', 'manualAddModal', 'focusOverlay', 'summaryOverlay'];
let _localizeRules = [];
function buildLocalizeRules() {
  const n = wtNoun(), b = NOUNS.shift;
  if (n === b) { _localizeRules = []; return; }
  const pairs = [
    [b.start.toUpperCase(), n.start.toUpperCase()],
    [b.end.toUpperCase(), n.end.toUpperCase()],
    [b.start, n.start], [b.end, n.end], [b.add, n.add],
    ['СМЕНА НЕ АКТИВНА', n.inactive], ['СМЕНА НЕ НАЧАТА', n.inactive], ['СМЕНА АКТИВНА', n.active],
    ['ЗАДАЧИ СМЕНЫ', n.tasks], ['Задачи смены', n.tasks.charAt(0) + n.tasks.slice(1).toLowerCase()],
    ['Завершить смену', n.end], ['Текущая смена', 'Текущая ' + n.one], ['текущая смена', 'текущая ' + n.one],
    ['смену', n.acc], ['Смена', n.one.charAt(0).toUpperCase() + n.one.slice(1)], ['смена', n.one],
    ['смены', n.plural], ['смен', n.plural],
  ];
  _localizeRules = pairs.map(([a, c]) => [new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), c]);
}
function localizeNode(root) {
  if (!_localizeRules.length || !root) return;
  if (root.nodeType === 3) { applyRules(root); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const list = [];
  while (w.nextNode()) list.push(w.currentNode);
  for (const t of list) applyRules(t);
}
function applyRules(t) {
  const p = t.parentNode;
  if (!p || p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'TEXTAREA') return;
  let v = t.nodeValue, o = v;
  for (const [re, rep] of _localizeRules) v = v.replace(re, rep);
  if (v !== o) t.nodeValue = v;
}
let _locObserver = null;
function installLocalizer() {
  buildLocalizeRules();
  if (_locObserver) { _locObserver.disconnect(); _locObserver = null; }
  if (!_localizeRules.length) return;
  for (const id of LOCALIZE_ROOTS) localizeNode(document.getElementById(id));
  _locObserver = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') localizeNode(m.target);
      else for (const n of m.addedNodes) localizeNode(n);
    }
  });
  for (const id of LOCALIZE_ROOTS) {
    const el = document.getElementById(id);
    if (el) _locObserver.observe(el, { childList: true, subtree: true, characterData: true });
  }
}

// --- Header chip ---
function renderWorkChip() {
  const wt = getWorkType();
  let chip = document.getElementById('wtChip');
  const ident = document.getElementById('headerIdent');
  if (!ident) return;
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'wtChip'; chip.className = 'wt-chip';
    chip.onclick = openWorkTypePicker;
    ident.appendChild(chip);
  }
  chip.innerHTML = '<span>' + wt.icon + '</span><span>' + escapeHtml(wt.name) + '</span>';
  const tab = document.querySelector('#tabLive .tab-lbl');
  if (tab) tab.textContent = wtNoun().tab;
}

// --- Picker modal ---
let _wtDraft = null;
function openWorkTypePicker() {
  const cur = getWorkType();
  _wtDraft = Object.assign({}, cur);
  let m = document.getElementById('wtModal');
  if (!m) {
    m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'wtModal';
    m.innerHTML = '<div class="modal-content" style="max-width:380px"><div class="modal-title">💼 Тип работы</div>' +
      '<div class="modal-info">Выбери, чем занимаешься — интерфейс, цвета и термины подстроятся под тебя.</div>' +
      '<div class="wt-grid" id="wtGrid"></div>' +
      '<div class="wt-custom" id="wtCustom">' +
        '<div class="form-group"><label>Название</label><input id="wtName" maxlength="20" placeholder="Например: Бариста"></div>' +
        '<label style="font-size:12px;color:var(--text-dim);font-weight:600">Цвет</label><div class="wt-colors" id="wtColors"></div>' +
        '<div class="form-group" style="margin-top:8px"><label>Как называть сессию</label><select id="wtNoun" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:inherit;font-weight:600;background:var(--bg-main)"></select></div>' +
      '</div>' +
      '<div class="wt-goal-row"><label>Целевая ставка, ₽/час <span style="font-weight:400">(0 — без цели)</span></label><input type="number" id="wtGoal" min="0" step="50"></div>' +
      '<div class="modal-buttons" style="margin-top:14px"><button class="modal-btn secondary" onclick="closeWorkTypePicker()">Отмена</button><button class="modal-btn primary" onclick="saveWorkTypePicker()">Применить</button></div></div>';
    document.body.appendChild(m);
    const sel = m.querySelector('#wtNoun');
    sel.innerHTML = Object.keys(NOUNS).map(k => '<option value="' + k + '">' + NOUN_LABELS[k] + '</option>').join('');
    m.querySelector('#wtColors').innerHTML = Object.keys(THEMES).map(k => '<div class="wt-color" data-th="' + k + '" style="background:' + THEMES[k].accent + '" onclick="window.V7.pickColor(\'' + k + '\')"></div>').join('');
  }
  renderWtGrid();
  m.querySelector('#wtGoal').value = cur.goal || 0;
  m.querySelector('#wtName').value = cur.id === 'custom' ? (cur.name === 'Своё' ? '' : cur.name) : '';
  m.querySelector('#wtNoun').value = cur.noun;
  m.classList.add('show'); document.body.classList.add('modal-open');
}
function renderWtGrid() {
  const g = document.getElementById('wtGrid');
  g.innerHTML = WORK_TYPES.map(w => {
    const t = THEMES[w.id === 'custom' ? _wtDraft.theme : w.theme] || THEMES.blue;
    return '<button class="wt-card ' + (_wtDraft.id === w.id ? 'sel' : '') + '" style="--wt-c:' + t.accent + '" onclick="window.V7.pickType(\'' + w.id + '\')">' +
      '<div class="wt-ico" style="background:' + t.primary + '">' + w.icon + '</div>' +
      '<div class="wt-name">' + w.name + '</div><div class="wt-sub">' + w.sub + '</div></button>';
  }).join('');
  document.getElementById('wtCustom').classList.toggle('show', _wtDraft.id === 'custom');
  document.querySelectorAll('#wtColors .wt-color').forEach(c => c.classList.toggle('sel', c.dataset.th === _wtDraft.theme));
}
function pickType(id) {
  const base = WORK_TYPES.find(w => w.id === id);
  const keepTheme = id === 'custom' && _wtDraft.id === 'custom' ? _wtDraft.theme : base.theme;
  _wtDraft = Object.assign({}, base, { theme: keepTheme });
  document.getElementById('wtGoal').value = base.goal;
  document.getElementById('wtNoun').value = base.noun;
  renderWtGrid();
  if (typeof haptic === 'function') haptic('light');
}
function pickColor(th) { _wtDraft.theme = th; renderWtGrid(); }
function closeWorkTypePicker() {
  const m = document.getElementById('wtModal');
  if (m) m.classList.remove('show');
  document.body.classList.remove('modal-open');
}
function saveWorkTypePicker() {
  const wt = Object.assign({}, _wtDraft);
  wt.goal = Math.max(0, parseInt(document.getElementById('wtGoal').value) || 0);
  if (wt.id === 'custom') {
    const nm = document.getElementById('wtName').value.trim();
    wt.name = nm || 'Своё';
    wt.noun = document.getElementById('wtNoun').value || 'session';
  }
  saveWorkType(wt);
  closeWorkTypePicker();
  applyWorkType(wt);
  showToast(wt.icon + ' Режим «' + wt.name + '» применён', 'success');
}
function applyWorkType(wt) {
  wt = wt || getWorkType();
  applyWorkTheme(wt);
  installLocalizer();
  renderWorkChip();
  // Goal rate → DIFFICULTIES (quest «выбить целевой rate» uses it)
  try { if (wt.goal > 0 && typeof DIFFICULTIES !== 'undefined') DIFFICULTIES.normal.goal = wt.goal; } catch (e) {}
  try { if (typeof renderActiveShift === 'function') renderActiveShift(); } catch (e) {}
  try { if (typeof render === 'function') render(); } catch (e) {}
  try { if (typeof DASHBOARD !== 'undefined' && document.getElementById('dashboardContent')?.offsetParent) DASHBOARD.render(); } catch (e) {}
}

// ------------------------------------------------------------
//  2. FORTUNE WHEEL v2 — honest, weighted, free daily spin, history
// ------------------------------------------------------------
const SPIN_COST = 120;
const PRIZES = [
  { id: 'xp50',    label: '+50 XP',     color: '#38A169', w: 22, apply: () => { addLifeXP('wheel_' + Date.now(), 50, 'wheel');  return '+50 Life XP'; } },
  { id: 'xp100',   label: '+100 XP',    color: '#3182CE', w: 18, apply: () => { addLifeXP('wheel_' + Date.now(), 100, 'wheel'); return '+100 Life XP'; } },
  { id: 'reroll1', label: '+1 замена',  color: '#805AD5', w: 16, apply: () => { addShopRerolls(1); return '+1 замена задания'; } },
  { id: 'x2',      label: 'x2 XP день', color: '#DD6B20', w: 10, apply: () => { const b = uGet('ozon_shop_boosts', {}); b.double_xp = todayStr(); uSet('ozon_shop_boosts', b); return 'Двойной XP на сегодня'; } },
  { id: 'xp200',   label: '+200 XP',    color: '#E53E3E', w: 8,  apply: () => { addLifeXP('wheel_' + Date.now(), 200, 'wheel'); return '+200 Life XP'; } },
  { id: 'nothing', label: 'Пусто',      color: '#718096', w: 14, apply: () => 'Пусто — но спин вернётся завтра' },
  { id: 'reroll3', label: '+3 замены',  color: '#D53F8C', w: 7,  apply: () => { addShopRerolls(3); return '+3 замены заданий'; } },
  { id: 'shield',  label: 'Щит серии',  color: '#2C7A7B', w: 5,  apply: () => { const b = uGet('ozon_shop_boosts', {}); const s = Array.isArray(b.streak_shields) ? b.streak_shields : []; if (!s.includes(todayStr())) s.push(todayStr()); b.streak_shields = s; uSet('ozon_shop_boosts', b); return 'Защита серии на сегодня'; } },
];
function addShopRerolls(n) {
  const today = todayStr();
  const b = uGet('ozon_shop_boosts', {});
  if (b.extra_reroll_date !== today) { b.extra_reroll_date = today; b.extra_reroll_count = 0; }
  b.extra_reroll_count = (b.extra_reroll_count || 0) + n;
  uSet('ozon_shop_boosts', b);
  try { renderLifeQuests(); } catch (e) {}
}
function getWheelState() { return uGet('v7_wheel', { freeDate: '', history: [], lastId: '' }); }
function saveWheelState(s) { uSet('v7_wheel', s); if (typeof schedulePushProgress === 'function') schedulePushProgress(); }
function hasFreeSpin() { return getWheelState().freeDate !== todayStr(); }

function pickPrize(lastId) {
  // «Пусто» не выпадает два раза подряд — защита от обидных серий
  const pool = PRIZES.filter(p => !(p.id === 'nothing' && lastId === 'nothing'));
  const total = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pool) { r -= p.w; if (r <= 0) return PRIZES.indexOf(p); }
  return 0;
}
let _spinning = false, _angle = 0;
function drawWheel(rot) {
  const c = document.getElementById('wheelCanvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, cx = W / 2, cy = W / 2, r = cx - 6;
  ctx.clearRect(0, 0, W, W);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  const s = 2 * Math.PI / PRIZES.length;
  PRIZES.forEach((p, i) => {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * s, (i + 1) * s); ctx.closePath();
    ctx.fillStyle = p.color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.rotate(i * s + s / 2); ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
    ctx.font = '700 12px Inter, sans-serif'; ctx.fillText(p.label, r - 14, 4); ctx.restore();
  });
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
}
function renderWheelUI() {
  const btn = document.getElementById('wheelSpinBtn');
  const free = document.getElementById('wheelFree');
  const hist = document.getElementById('wheelHist');
  const st = getWheelState();
  if (btn) {
    btn.textContent = hasFreeSpin() ? '🎰 КРУТИТЬ — БЕСПЛАТНО' : '🎰 КРУТИТЬ (' + SPIN_COST + ' XP)';
    btn.disabled = _spinning;
  }
  if (free) free.textContent = hasFreeSpin() ? 'Ежедневный бесплатный спин доступен' : 'Бесплатный спин вернётся завтра · XP: ' + (getLifeXP().total || 0);
  if (hist) {
    const h = (st.history || []).slice(-5).reverse();
    hist.innerHTML = h.length ? '<div class="wheel-hist-t">Последние выигрыши</div>' + h.map(x =>
      '<div class="wheel-hist-row"><span>' + escapeHtml(x.label) + '</span><span>' + x.date.slice(5) + '</span></div>').join('') : '';
  }
}
function openWheelModal() {
  const m = document.getElementById('wheelModal'); if (!m) return;
  if (!document.getElementById('wheelHub')) {
    const wrap = m.querySelector('.wheel-canvas-wrap');
    const hub = document.createElement('div'); hub.className = 'wheel-hub'; hub.id = 'wheelHub'; hub.textContent = 'SPIN';
    wrap.appendChild(hub);
    const res = document.getElementById('wheelResult');
    const free = document.createElement('div'); free.className = 'wheel-free'; free.id = 'wheelFree';
    res.parentNode.insertBefore(free, res);
    const hist = document.createElement('div'); hist.className = 'wheel-hist'; hist.id = 'wheelHist';
    res.parentNode.appendChild(hist);
    const info = m.querySelector('.modal-title');
    if (info) info.insertAdjacentHTML('afterend', '<div class="modal-info">Куда укажет стрелка — то и получишь. Шансы честные: редкие призы выпадают реже, «Пусто» не бывает дважды подряд.</div>');
  }
  m.classList.add('show'); document.body.classList.add('modal-open');
  const res = document.getElementById('wheelResult'); res.textContent = ''; res.classList.remove('pop');
  drawWheel(_angle); renderWheelUI();
}
function closeWheelModal() {
  if (_spinning) return;
  document.getElementById('wheelModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}
function spinWheel() {
  if (_spinning) return;
  const free = hasFreeSpin();
  const st = getWheelState();
  if (!free) {
    const xp = getLifeXP();
    if ((xp.total || 0) < SPIN_COST) { showToast('❌ Нужно ' + SPIN_COST + ' XP или дождись бесплатного спина', 'error'); return; }
    xp.total -= SPIN_COST; saveLifeXP(xp);
  } else { st.freeDate = todayStr(); }
  try { renderLifeStats(); } catch (e) {}
  _spinning = true; renderWheelUI();
  haptic('medium');

  const win = pickPrize(st.lastId);
  const s = 2 * Math.PI / PRIZES.length;
  // Стрелка сверху = угол 3π/2 в системе canvas. Центр сектора win должен оказаться там.
  const jitter = (Math.random() - 0.5) * s * 0.7;
  const base = ((_angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let target = (3 * Math.PI / 2) - win * s - s / 2 + jitter;
  target = ((target % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let delta = target - base; if (delta < 0) delta += 2 * Math.PI;
  const total = 2 * Math.PI * 6 + delta;
  const from = _angle, t0 = performance.now(), dur = 4200;
  const tick = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 4);
    _angle = from + total * e;
    drawWheel(_angle);
    if (p < 1) requestAnimationFrame(tick);
    else {
      _spinning = false;
      const prize = PRIZES[win];
      const txt = prize.apply();
      st.lastId = prize.id;
      st.history = (st.history || []).concat([{ id: prize.id, label: prize.label, date: todayStr() }]).slice(-30);
      saveWheelState(st);
      const res = document.getElementById('wheelResult');
      res.textContent = (prize.id === 'nothing' ? '😅 ' : '🎉 ') + txt;
      res.classList.remove('pop'); void res.offsetWidth; res.classList.add('pop');
      haptic(prize.id === 'nothing' ? 'light' : 'success');
      try { renderLifeStats(); } catch (e) {}
      renderWheelUI();
    }
  };
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------
//  3. SMART FAB + AUTO-HIDING NAV
// ------------------------------------------------------------
function installScrollBehaviour() {
  const fab = document.getElementById('fabContainer');
  const nav = document.querySelector('.tab-nav');
  if (!fab) return;
  let lastY = window.scrollY, idle = null, lastDir = 0;
  fab.classList.add('fab-peek');
  const dock = () => { if (!fab.classList.contains('open')) fab.classList.add('fab-peek'); };
  const reveal = () => { fab.classList.remove('fab-peek'); };
  const navShow = () => { if (nav) nav.classList.remove('nav-hidden'); document.body.classList.remove('v7-nav-hidden'); };
  const navHide = () => { if (nav) nav.classList.add('nav-hidden'); document.body.classList.add('v7-nav-hidden'); };
  window.addEventListener('scroll', () => {
    if (document.body.classList.contains('modal-open')) return;
    const y = window.scrollY, d = y - lastY;
    if (Math.abs(d) < 6) return;
    const dir = d > 0 ? 1 : -1;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    if (dir === 1 && y > 60) { reveal(); if (y < maxY - 40) navHide(); }
    else if (dir === -1) { navShow(); if (y < 40) dock(); }
    lastDir = dir; lastY = y;
    clearTimeout(idle);
    idle = setTimeout(() => { navShow(); dock(); }, 2200);
  }, { passive: true });
  // Свайп влево по «ушку» — вытащить; свайп вправо — убрать
  let tx = 0;
  fab.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  fab.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (dx < -24) reveal(); else if (dx > 24 && !fab.classList.contains('open')) dock();
  }, { passive: true });
  // Тап по спрятанной кнопке — сначала вытаскиваем
  const toggle = document.getElementById('fabToggle');
  if (toggle) toggle.addEventListener('click', () => { reveal(); clearTimeout(idle); idle = setTimeout(() => { if (!fab.classList.contains('open')) dock(); }, 4000); }, true);
  // Закрытие меню → через 4с обратно
  const obs = new MutationObserver(() => { if (!fab.classList.contains('open')) { clearTimeout(idle); idle = setTimeout(dock, 4000); } });
  obs.observe(fab, { attributes: true, attributeFilter: ['class'] });
}

// ------------------------------------------------------------
//  4. PRODUCTIVITY SCORE (dashboard)
// ------------------------------------------------------------
function computeScore() {
  const today = todayStr();
  const parts = [];
  // Работа: часы сегодня к цели 6ч
  let hrs = 0;
  try { hrs = (shifts || []).filter(s => s.date === today).reduce((a, s) => a + (s.hours || 0), 0); if (activeShift) hrs += (Date.now() - activeShift.startTime) / 3600000; } catch (e) {}
  parts.push({ l: 'Работа', v: Math.min(1, hrs / 6), w: 25 });
  // Задания: личные + рабочие
  let qd = 0, qt = 0;
  try { const st = getLifeQuestState(); const qs = getResolvedLifeQuests(); qt += qs.length; qd += qs.filter(q => st.checked[q.id]).length; } catch (e) {}
  parts.push({ l: 'Задания', v: qt ? qd / qt : 0, w: 25 });
  // Привычки
  let hp = { done: 0, total: 0 };
  try { hp = HABITS.getTodayProgress(); } catch (e) {}
  parts.push({ l: 'Привычки', v: hp.total ? hp.done / hp.total : 0, w: 20 });
  // Здоровье: вода/8, сон записан, настроение
  let hv = 0;
  try { const h = HEALTH.getTodayData(); hv = Math.min(1, (h.water || 0) / 8) * 0.5 + (h.sleep > 0 ? 0.25 : 0) + (h.mood ? 0.25 : 0); } catch (e) {}
  parts.push({ l: 'Здоровье', v: hv, w: 15 });
  // Рефлексия: дневник вечера / фокус-сессии
  let rv = 0;
  try { const j = uGet('v7_journal', {}); if (j[today]) rv += 0.6; const p = uGet('v7_pomo', {}); if ((p.log || {})[today] > 0) rv += 0.4; } catch (e) {}
  parts.push({ l: 'Фокус', v: Math.min(1, rv), w: 15 });
  const score = Math.round(parts.reduce((s, p) => s + p.v * p.w, 0));
  return { score, parts };
}
function scoreHtml() {
  const { score, parts } = computeScore();
  const C = 2 * Math.PI * 31, off = C * (1 - score / 100);
  const mood = score >= 80 ? 'Отличный день — так держать' : score >= 55 ? 'Хороший темп, можно дожать' : score >= 30 ? 'День только набирает обороты' : 'Начни с одного маленького шага';
  return '<div class="v7-score"><div class="v7-ring"><svg viewBox="0 0 74 74"><circle class="trk" cx="37" cy="37" r="31"/><circle class="val" cx="37" cy="37" r="31" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><div class="num">' + score + '</div></div>' +
    '<div class="v7-score-body"><div class="v7-score-title">Индекс дня</div><div class="v7-score-sub">' + mood + '</div>' +
    '<div class="v7-score-bars">' + parts.map(p => '<div><div class="v7-sb"><i style="width:' + Math.round(p.v * 100) + '%"></i></div><div class="v7-sb-lbl">' + p.l + '</div></div>').join('') + '</div></div></div>';
}

// ------------------------------------------------------------
//  5. DAILY LOGIN REWARD (7-day cycle)
// ------------------------------------------------------------
const LR = [{ xp: 20 }, { xp: 30 }, { xp: 40 }, { xp: 50 }, { xp: 60 }, { xp: 80 }, { xp: 150, reroll: 1 }];
function getLR() { return uGet('v7_login_reward', { last: '', day: 0 }); }
function lrStatus() {
  const s = getLR(), today = todayStr();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yStr = typeof localDateStr === 'function' ? localDateStr(y) : y.toISOString().slice(0, 10);
  const claimedToday = s.last === today;
  const streakAlive = s.last === yStr || claimedToday;
  const day = claimedToday ? s.day : (streakAlive ? (s.day % 7) + 1 : 1);
  return { claimedToday, day, s };
}
function claimLR() {
  const { claimedToday, day, s } = lrStatus();
  if (claimedToday) return;
  const r = LR[day - 1];
  addLifeXP('login_' + todayStr(), r.xp, 'reward');
  if (r.reroll) addShopRerolls(r.reroll);
  uSet('v7_login_reward', { last: todayStr(), day });
  if (typeof schedulePushProgress === 'function') schedulePushProgress();
  haptic('success');
  showToast('🎁 День ' + day + ': +' + r.xp + ' XP' + (r.reroll ? ' и +1 замена' : ''), 'success');
  try { renderLifeStats(); } catch (e) {}
  try { DASHBOARD.render(); } catch (e) {}
}
function lrHtml() {
  const { claimedToday, day } = lrStatus();
  const r = LR[day - 1];
  const days = LR.map((x, i) => {
    const n = i + 1, done = n < day || (n === day && claimedToday);
    return '<div class="lr-day ' + (done ? 'done' : '') + (n === day && !claimedToday ? ' today' : '') + '"><div class="d">ДЕНЬ ' + n + '</div><div class="v">' + (done ? '✓' : '+' + x.xp + (x.reroll ? '<br>+🎲' : '')) + '</div></div>';
  }).join('');
  return '<div class="v7-reward-strip ' + (claimedToday ? 'claimed' : '') + '" onclick="' + (claimedToday ? '' : 'window.V7.claimLR()') + '">' +
    '<span style="font-size:22px">🎁</span><div class="t">' + (claimedToday ? 'Награда дня получена' : 'Ежедневная награда — день ' + day) + '<span class="s">' + (claimedToday ? 'Возвращайся завтра, серия ' + day + '/7' : '+' + r.xp + ' XP' + (r.reroll ? ' и +1 замена задания' : '') + ' · заходи каждый день') + '</span></div>' +
    (claimedToday ? '' : '<button class="b">Забрать</button>') + '</div>' +
    '<div class="lr-days" style="margin:0 var(--sp-3) var(--sp-3)">' + days + '</div>';
}

// ------------------------------------------------------------
//  6. POMODORO / DEEP WORK
// ------------------------------------------------------------
const POMO_MODES = { p25: { f: 25, b: 5, l: '25 / 5' }, p50: { f: 50, b: 10, l: '50 / 10' }, p90: { f: 90, b: 15, l: '90 / 15' } };
function getPomo() { return uGet('v7_pomo', { mode: 'p25', phase: 'idle', endAt: 0, log: {} }); }
function savePomo(p) { uSet('v7_pomo', p); }
let _pomoTimer = null;
function pomoStart(phase) {
  const p = getPomo(); const m = POMO_MODES[p.mode] || POMO_MODES.p25;
  p.phase = phase; p.endAt = Date.now() + (phase === 'focus' ? m.f : m.b) * 60000; savePomo(p);
  pomoTick(); haptic('medium');
}
function pomoStop() { const p = getPomo(); p.phase = 'idle'; p.endAt = 0; savePomo(p); pomoRender(); }
function pomoSetMode(k) { const p = getPomo(); if (p.phase !== 'idle') return; p.mode = k; savePomo(p); pomoRender(); }
function pomoTick() {
  clearInterval(_pomoTimer);
  _pomoTimer = setInterval(() => {
    const p = getPomo();
    if (p.phase === 'idle') { clearInterval(_pomoTimer); return; }
    if (Date.now() >= p.endAt) {
      if (p.phase === 'focus') {
        const t = todayStr(); p.log[t] = (p.log[t] || 0) + 1;
        addLifeXP('pomo_' + t + '_' + p.log[t], 15, 'focus');
        showToast('🎯 Фокус-блок завершён: +15 XP. Время перерыва', 'success'); haptic('success');
        p.phase = 'idle'; p.endAt = 0; savePomo(p);
        if (typeof schedulePushProgress === 'function') schedulePushProgress();
        try { renderLifeStats(); } catch (e) {}
        pomoStart('break'); return;
      } else { p.phase = 'idle'; p.endAt = 0; savePomo(p); showToast('☕ Перерыв окончен — поехали дальше', 'success'); haptic('medium'); }
    }
    pomoRender();
  }, 1000);
  pomoRender();
}
function pomoRender() {
  const el = document.getElementById('v7Pomo'); if (!el) return;
  const p = getPomo(); const m = POMO_MODES[p.mode] || POMO_MODES.p25;
  const today = (p.log || {})[todayStr()] || 0;
  const totalMs = (p.phase === 'focus' ? m.f : m.b) * 60000;
  const left = p.phase === 'idle' ? m.f * 60000 : Math.max(0, p.endAt - Date.now());
  const mm = String(Math.floor(left / 60000)).padStart(2, '0'), ss = String(Math.floor(left % 60000 / 1000)).padStart(2, '0');
  const pct = p.phase === 'idle' ? 0 : Math.round((1 - left / totalMs) * 100);
  el.className = 'pomo-wrap' + (p.phase === 'break' ? ' break' : '');
  el.innerHTML = '<div class="pomo-modes">' + Object.keys(POMO_MODES).map(k => '<button class="pomo-mode ' + (p.mode === k ? 'on' : '') + '" onclick="window.V7.pomoSetMode(\'' + k + '\')">' + POMO_MODES[k].l + '</button>').join('') + '</div>' +
    '<div class="pomo-time">' + mm + ':' + ss + '</div><div class="pomo-sub">' + (p.phase === 'focus' ? '🎯 Глубокая работа — не отвлекайся' : p.phase === 'break' ? '☕ Перерыв — отойди от экрана' : 'Готов к фокус-сессии · +15 XP за блок') + '</div>' +
    '<div class="pomo-track"><i style="width:' + pct + '%"></i></div>' +
    '<div class="pomo-ctrls">' + (p.phase === 'idle' ? '<button class="v7-btn pri" onclick="window.V7.pomoStart(\'focus\')">▶ Старт</button>' : '<button class="v7-btn" onclick="window.V7.pomoStop()">⏹ Стоп</button>') + '</div>' +
    '<div class="pomo-dots">' + Array.from({ length: Math.max(4, today) }, (_, i) => '<div class="pomo-dot ' + (i < today ? 'on' : '') + '"></div>').join('') + '</div>' +
    '<div class="pomo-sub" style="margin-top:6px">Сегодня блоков: <b>' + today + '</b></div>';
}

// ------------------------------------------------------------
//  7. WHEEL OF LIFE (8 spheres, monthly)
// ------------------------------------------------------------
const SPHERES = [['health', '🌿 Здоровье'], ['career', '🎯 Карьера'], ['money', '💰 Деньги'], ['love', '💛 Отношения'], ['joy', '✨ Радость'], ['growth', '🌱 Рост'], ['people', '🤝 Люди'], ['impact', '🌍 Вклад']];
function monthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function getLW() { return uGet('v7_life_wheel', {}); }
function lwDraw(canvas, cur, prev) {
  const ctx = canvas.getContext('2d'); const W = canvas.width, c = W / 2, R = c - 14, n = SPHERES.length;
  ctx.clearRect(0, 0, W, W);
  for (let ring = 1; ring <= 5; ring++) { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; const r = R * ring / 5; ctx.lineTo(c + r * Math.cos(a), c + r * Math.sin(a)); } ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1; ctx.stroke(); }
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + R * Math.cos(a), c + R * Math.sin(a)); ctx.strokeStyle = '#E2E8F0'; ctx.stroke(); }
  const poly = (vals, fill, stroke) => { ctx.beginPath(); SPHERES.forEach(([k], i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; const r = R * ((vals[k] || 0) / 10); ctx.lineTo(c + r * Math.cos(a), c + r * Math.sin(a)); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); };
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3182CE';
  if (prev) poly(prev, 'rgba(160,174,192,.18)', '#A0AEC0');
  if (cur) poly(cur, acc + '33', acc);
}
function lwHtml() {
  const all = getLW(), mk = monthKey(); const cur = all[mk];
  const pd = new Date(); pd.setMonth(pd.getMonth() - 1); const prev = all[monthKey(pd)];
  if (!cur) return '<div class="v7-empty">Оцени 8 сфер жизни от 1 до 10 — увидишь форму своего «колеса» и слабое место, на которое стоит направить задания.</div><button class="v7-btn pri" style="width:100%" onclick="window.V7.openLW()">Оценить месяц</button>';
  const list = SPHERES.map(([k, l]) => { const d = prev ? (cur[k] || 0) - (prev[k] || 0) : 0; return '<div class="lw-row"><span>' + l + '</span>' + (d ? '<span class="dlt ' + (d > 0 ? 'up' : 'dn') + '">' + (d > 0 ? '+' : '') + d + '</span>' : '') + '<b>' + (cur[k] || 0) + '</b></div>'; }).join('');
  const weak = SPHERES.reduce((m, s) => (cur[s[0]] || 0) < (cur[m[0]] || 0) ? s : m, SPHERES[0]);
  const avg = (SPHERES.reduce((a, s) => a + (cur[s[0]] || 0), 0) / SPHERES.length).toFixed(1);
  return '<div class="lw-wrap"><canvas id="lwCanvas" width="300" height="300"></canvas><div class="lw-list">' + list + '</div></div>' +
    '<div class="lw-weak">Средний балл <b>' + avg + '</b>. Слабее всего — <b>' + weak[1] + '</b>: добавь одно маленькое ежедневное действие в эту сферу.</div>' +
    '<button class="v7-btn" style="width:100%;margin-top:10px" onclick="window.V7.openLW()">Переоценить</button>';
}
function openLW() {
  const all = getLW(), cur = all[monthKey()] || {};
  let m = document.getElementById('lwModal');
  if (!m) {
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'lwModal';
    m.innerHTML = '<div class="modal-content"><div class="modal-title">🧭 Колесо жизни</div><div class="modal-info">Насколько ты доволен каждой сферой прямо сейчас? Честно, от 1 до 10.</div><div class="lw-sliders" id="lwSliders"></div>' +
      '<div class="modal-buttons"><button class="modal-btn secondary" onclick="window.V7.closeLW()">Отмена</button><button class="modal-btn primary" onclick="window.V7.saveLW()">Сохранить</button></div></div>';
    document.body.appendChild(m);
  }
  m.querySelector('#lwSliders').innerHTML = SPHERES.map(([k, l]) => '<div class="lw-sl"><label>' + l + '</label><b id="lwv_' + k + '">' + (cur[k] || 5) + '</b><input type="range" min="1" max="10" value="' + (cur[k] || 5) + '" data-k="' + k + '" oninput="document.getElementById(\'lwv_' + k + '\').textContent=this.value"></div>').join('');
  m.classList.add('show'); document.body.classList.add('modal-open');
}
function closeLW() { const m = document.getElementById('lwModal'); if (m) m.classList.remove('show'); document.body.classList.remove('modal-open'); }
function saveLW() {
  const all = getLW(), v = {};
  document.querySelectorAll('#lwSliders input').forEach(i => { v[i.dataset.k] = parseInt(i.value); });
  const first = !all[monthKey()];
  all[monthKey()] = v; uSet('v7_life_wheel', all);
  if (typeof schedulePushProgress === 'function') schedulePushProgress();
  if (first) { addLifeXP('lifewheel_' + monthKey(), 40, 'reflect'); showToast('🧭 Колесо жизни сохранено: +40 XP', 'success'); }
  closeLW(); renderLifeExtras();
}

// ------------------------------------------------------------
//  8. EVENING JOURNAL (3 questions + gratitude)
// ------------------------------------------------------------
function getJournal() { return uGet('v7_journal', {}); }
function jrHtml() {
  const j = getJournal(), t = todayStr(), e = j[t];
  const strip = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = typeof localDateStr === 'function' ? localDateStr(d) : d.toISOString().slice(0, 10); return '<div class="jr-hd ' + (j[k] ? 'on' : '') + '">' + ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'][d.getDay()] + '</div>'; }).join('');
  if (e) return '<div class="jr-done"><b>Сегодня записано ✓</b>Получилось: ' + escapeHtml(e.win) + '<br>Улучшить: ' + escapeHtml(e.fix) + '<br>Благодарен: ' + escapeHtml(e.thanks) + '</div><div class="jr-hist">' + strip + '</div>';
  return '<div class="jr-q"><label>1. Что сегодня получилось?</label><textarea id="jrWin" placeholder="Одна победа, даже маленькая"></textarea></div>' +
    '<div class="jr-q"><label>2. Что завтра сделаю лучше?</label><textarea id="jrFix" placeholder="Конкретный шаг"></textarea></div>' +
    '<div class="jr-q"><label>3. За что благодарен?</label><textarea id="jrThanks" placeholder="Человек, событие, мелочь"></textarea></div>' +
    '<button class="v7-btn pri" style="width:100%" onclick="window.V7.saveJournal()">Сохранить · +25 XP</button><div class="jr-hist">' + strip + '</div>';
}
function saveJournal() {
  const win = (document.getElementById('jrWin')?.value || '').trim(), fix = (document.getElementById('jrFix')?.value || '').trim(), thanks = (document.getElementById('jrThanks')?.value || '').trim();
  if (!win && !fix && !thanks) { showToast('Заполни хотя бы один ответ', 'error'); return; }
  const j = getJournal(); j[todayStr()] = { win, fix, thanks, ts: Date.now() };
  const keys = Object.keys(j).sort(); while (keys.length > 120) delete j[keys.shift()];
  uSet('v7_journal', j);
  if (typeof schedulePushProgress === 'function') schedulePushProgress();
  addLifeXP('journal_' + todayStr(), 25, 'reflect');
  haptic('success'); showToast('📓 Дневник сохранён: +25 XP', 'success');
  try { renderLifeStats(); } catch (e) {}
  renderLifeExtras();
}

// ------------------------------------------------------------
//  9. WEEKLY REVIEW (analytics)
// ------------------------------------------------------------
function weekRange(offset) {
  const d = new Date(); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day - offset * 7);
  const e = new Date(d); e.setDate(d.getDate() + 7);
  return [d, e];
}
function inRange(ds, a, b) { const d = new Date(ds + 'T00:00:00'); return d >= a && d < b; }
function weekStats(offset) {
  const [a, b] = weekRange(offset);
  const sh = (shifts || []).filter(s => inRange(s.date, a, b));
  const earned = sh.reduce((s, x) => s + (x.earned || 0), 0), hours = sh.reduce((s, x) => s + (x.hours || 0), 0);
  let habits = 0, hd = 0, ht = 0;
  try { const hs = HABITS.getHabits().filter(h => h.active); for (let i = 0; i < 7; i++) { const d = new Date(a); d.setDate(a.getDate() + i); if (d > new Date()) break; const k = typeof localDateStr === 'function' ? localDateStr(d) : d.toISOString().slice(0, 10); for (const h of hs) { ht++; if (HABITS.isChecked(h.id, k)) hd++; } } habits = ht ? Math.round(hd / ht * 100) : 0; } catch (e) {}
  let xp = 0; try { const h = getLifeXP().history || []; xp = h.filter(k => inRange(k.slice(0, 10), a, b)).length; } catch (e) {}
  let mood = 0, mc = 0; try { for (let i = 0; i < 7; i++) { const d = new Date(a); d.setDate(a.getDate() + i); const k = localDateStr(d); const h = HEALTH.getDayData(k); if (h && h.mood) { const m = (HEALTH.MOODS || []).find(x => x.id === h.mood); if (m) { mood += m.value; mc++; } } } } catch (e) {}
  return { earned, hours, shifts: sh.length, habits, quests: xp, mood: mc ? (mood / mc).toFixed(1) : null };
}
function wrHtml() {
  const c = weekStats(0), p = weekStats(1), n = wtNoun();
  const cell = (v, l, pv, fmt) => { const d = pv ? Math.round((v - pv) / pv * 100) : 0; return '<div class="wr-cell"><div class="v">' + (fmt ? fmt(v) : v) + '</div><div class="l">' + l + '</div>' + (pv && d ? '<div class="d ' + (d > 0 ? 'up' : 'dn') + '">' + (d > 0 ? '+' : '') + d + '%</div>' : '<div class="d" style="color:var(--text-dim)">—</div>') + '</div>'; };
  const ins = [];
  if (c.earned > p.earned && p.earned) ins.push('Доход вырос на ' + Math.round((c.earned - p.earned) / p.earned * 100) + '% к прошлой неделе.');
  if (c.hours && c.earned / c.hours > (p.hours ? p.earned / p.hours : 0)) ins.push('Ставка в час выше, чем неделей раньше — работаешь эффективнее.');
  if (c.habits < 50 && c.habits > 0) ins.push('Привычки выполнены на ' + c.habits + '% — попробуй оставить 3 самые важные.');
  if (c.quests >= 20) ins.push('Больше 20 заданий за неделю — серьёзный ритм.');
  if (!ins.length) ins.push('Собираю данные. Чем больше отмечаешь — тем точнее будет разбор недели.');
  return '<div class="wr-grid">' + cell(c.earned, '₽ доход', p.earned, v => v.toLocaleString('ru-RU')) + cell(c.hours, 'часов', p.hours, v => v.toFixed(1)) + cell(c.shifts, n.plural, p.shifts) +
    cell(c.habits, '% привычек', p.habits) + cell(c.quests, 'заданий', p.quests) + '<div class="wr-cell"><div class="v">' + (c.mood || '—') + '</div><div class="l">настроение</div><div class="d" style="color:var(--text-dim)">из 5</div></div></div>' +
    '<div class="wr-insight">' + ins.join(' ') + '</div>';
}

// ------------------------------------------------------------
//  10. RENDER HOOKS & LAYOUT
// ------------------------------------------------------------
function renderDashExtras() {
  const root = document.getElementById('dashboardContent'); if (!root) return;
  const greet = root.querySelector('.dash-greeting'); if (!greet) return;
  let box = document.getElementById('v7DashExtra');
  if (!box) { box = document.createElement('div'); box.id = 'v7DashExtra'; }
  greet.insertAdjacentElement('afterend', box);
  const h = new Date().getHours();
  const jrDone = !!getJournal()[todayStr()];
  const cta = (h >= 18 && !jrDone) ? '<div class="jr-cta" onclick="switchTab(\'life\');setTimeout(()=>document.getElementById(\'v7Journal\')?.scrollIntoView({behavior:\'smooth\',block:\'center\'}),200)"><span style="font-size:22px">📓</span><div class="t">Вечерний дневник<span class="s">3 вопроса, 1 минута, +25 XP</span></div><span>›</span></div>' : '';
  let streak = 0; try { streak = calcStreak(DIFFICULTIES[difficulty].goal); } catch (e) {}
  let hab = { done: 0, total: 0 }; try { hab = HABITS.getTodayProgress(); } catch (e) {}
  let xp = 0; try { xp = getLifeXP().total || 0; } catch (e) {}
  const brief = '<div class="v7-brief"><div class="c"><div class="v">🔥 ' + streak + '</div><div class="l">серия дней</div></div><div class="c"><div class="v">' + hab.done + '/' + hab.total + '</div><div class="l">привычки</div></div><div class="c"><div class="v">' + xp.toLocaleString('ru-RU') + '</div><div class="l">Life XP</div></div></div>';
  box.innerHTML = lrHtml() + scoreHtml() + brief + cta;
}
function renderLifeExtras() {
  const root = document.getElementById('lifeContent'); if (!root) return;
  let box = document.getElementById('v7LifeExtra');
  if (!box) { box = document.createElement('div'); box.id = 'v7LifeExtra'; root.appendChild(box); }
  box.innerHTML =
    '<div class="v7-sec"><div class="v7-sec-head"><div class="v7-sec-title">🎯 Фокус-сессии</div></div><div id="v7Pomo" class="pomo-wrap"></div></div>' +
    '<div class="v7-sec"><div class="v7-sec-head"><div class="v7-sec-title">🧭 Колесо жизни</div><span style="font-size:11px;color:var(--text-dim)">' + monthKey() + '</span></div>' + lwHtml() + '</div>' +
    '<div class="v7-sec" id="v7Journal"><div class="v7-sec-head"><div class="v7-sec-title">📓 Вечерний дневник</div></div>' + jrHtml() + '</div>';
  pomoRender();
  const cv = document.getElementById('lwCanvas');
  if (cv) { const all = getLW(); const pd = new Date(); pd.setMonth(pd.getMonth() - 1); lwDraw(cv, all[monthKey()], all[monthKey(pd)]); }
}
function renderStatsExtras() {
  const root = document.getElementById('contentStats'); if (!root) return;
  let box = document.getElementById('v7StatsExtra');
  if (!box) { box = document.createElement('div'); box.id = 'v7StatsExtra'; root.insertBefore(box, root.firstChild); }
  box.innerHTML = '<div class="v7-sec" style="margin-top:var(--sp-3)"><div class="v7-sec-head"><div class="v7-sec-title">📅 Итоги недели</div><span style="font-size:11px;color:var(--text-dim)">vs прошлая</span></div>' + wrHtml() + '</div>';
}
function moveLifePanels() {
  const life = document.getElementById('lifeContent'); if (!life) return;
  const lq = document.getElementById('lifeQuestsPanel'), tip = document.getElementById('motivationTip');
  if (lq && lq.parentNode !== life) life.insertBefore(lq, life.firstChild);
  if (tip && tip.parentNode !== life) life.appendChild(tip);
}

function hookRenders() {
  if (typeof DASHBOARD !== 'undefined' && DASHBOARD.render && !DASHBOARD._v7) {
    const o = DASHBOARD.render; DASHBOARD.render = function () { const r = o.apply(this, arguments); try { renderDashExtras(); } catch (e) { console.error('[v7] dash', e); } return r; }; DASHBOARD._v7 = 1;
  }
  if (typeof HABITS !== 'undefined' && HABITS.render && !HABITS._v7) {
    const o = HABITS.render; HABITS.render = function () { const r = o.apply(this, arguments); try { moveLifePanels(); renderLifeExtras(); } catch (e) { console.error('[v7] life', e); } return r; }; HABITS._v7 = 1;
  }
  const oSwitch = window.switchTab;
  if (oSwitch && !oSwitch._v7) {
    window.switchTab = function (tab) { const r = oSwitch.apply(this, arguments); try { if (tab === 'stats') renderStatsExtras(); if (tab === 'life') { renderLifeQuests(); renderLifeStats(); } } catch (e) {} return r; };
    window.switchTab._v7 = 1;
  }
  // Account modal: work type row
  if (typeof applyRoleToUI === 'function' && !window._v7RoleHooked) {
    const o = applyRoleToUI;
    window.applyRoleToUI = function () {
      const r = o.apply(this, arguments);
      try {
        if (currentUser) {
          applyWorkType();
          if (!uGet('v7_work_type', null) && !document.querySelector('#wtModal.show')) setTimeout(() => { if (!uGet('v7_work_type', null)) openWorkTypePicker(); }, 1500);
        }
      } catch (e) { console.error('[v7] role hook', e); }
      return r;
    };
    window._v7RoleHooked = 1;
  }
  if (typeof renderAccountModal === 'function' && !window._v7AccHooked) {
    const o = renderAccountModal;
    window.renderAccountModal = function () { const r = o.apply(this, arguments); try { const el = document.getElementById('accountBody'); const wt = getWorkType(); if (el && !el.querySelector('.v7-set-row')) el.insertAdjacentHTML('afterbegin', '<div class="acc-sec"><h4>Режим приложения</h4><div class="v7-set-row"><span style="font-size:20px">' + wt.icon + '</span><div class="t">' + escapeHtml(wt.name) + '<span class="s">' + NOUN_LABELS[wt.noun] + ' · цель ' + (wt.goal || '—') + ' ₽/ч</span></div><button class="acc-mini go" onclick="closeAccountModal&&closeAccountModal();window.V7.openWorkTypePicker()">Изменить</button></div></div>'); } catch (e) {} return r; };
    window._v7AccHooked = 1;
  }
}

function extendKeys() {
  try { for (const k of ['v7_work_type', 'v7_wheel', 'v7_login_reward', 'v7_pomo', 'v7_life_wheel', 'v7_journal']) if (!PROGRESS_KEYS.includes(k)) PROGRESS_KEYS.push(k); } catch (e) {}
}
function addFabItem() {
  const fab = document.getElementById('fabMenu'); if (!fab || fab.querySelector('[data-v7wt]')) return;
  const b = document.createElement('button'); b.className = 'fab-item'; b.dataset.v7wt = '1';
  b.innerHTML = '<span class="fab-icon">💼</span><span class="fab-label">Тип работы</span>';
  b.onclick = () => { toggleFab(); openWorkTypePicker(); };
  fab.insertBefore(b, fab.firstChild);
}

let _booted = false;
function boot() {
  if (_booted) return; _booted = true;
  try {
    extendKeys();
    hookRenders();
    addFabItem();
    moveLifePanels();
    applyWorkType();
    installScrollBehaviour();
    const p = getPomo(); if (p.phase !== 'idle') pomoTick();
    // Первый запуск без выбранного типа — предложить выбрать
    if (!uGet('v7_work_type', null) && currentUser) setTimeout(openWorkTypePicker, 900);
    try { DASHBOARD.render(); } catch (e) {}
    // Обновляем индекс дня раз в минуту, если дашборд открыт
    setInterval(() => { if (document.getElementById('dashboardContent')?.classList.contains('active')) { try { renderDashExtras(); } catch (e) {} } }, 60000);
    console.log('[v7] Life Tracker ready');
  } catch (e) { console.error('[v7] boot error', e); _booted = false; }
}
(function hook() {
  const ob = window.bootV6;
  if (typeof ob === 'function') { window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 150); return r; }; }
  setTimeout(() => { if (!_booted && typeof currentUser !== 'undefined' && currentUser) boot(); }, 6000);
  // При входе после boot v6 (если v6 уже отработал)
  document.addEventListener('v7:login', boot);
})();

// Replace legacy wheel globals
window.openWheelModal = openWheelModal;
window.closeWheelModal = closeWheelModal;
window.spinWheel = spinWheel;
window.drawWheel = drawWheel;
window.openWorkTypePicker = openWorkTypePicker;
window.closeWorkTypePicker = closeWorkTypePicker;
window.saveWorkTypePicker = saveWorkTypePicker;
window.V7 = { boot, getWorkType, applyWorkType, openWorkTypePicker, pickType, pickColor, claimLR, pomoStart, pomoStop, pomoSetMode, openLW, closeLW, saveLW, saveJournal, computeScore, renderDashExtras, renderLifeExtras, renderStatsExtras, PRIZES, WORK_TYPES, THEMES };
})();
