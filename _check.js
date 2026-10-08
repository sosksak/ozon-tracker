
// ====== SUPABASE INIT ======
let sb = null;
try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); } catch(e) { console.error('Supabase init failed:', e); }

// ====== CONSTANTS ======
// Уровни: раньше считались от заработанных РУБЛЕЙ (LVL10 = 5 000 000 ₽ ≈ 1000 смен,
// то есть годы — прогресс-бар стоял на месте и ничего не мотивировал).
// Теперь очки опыта = смены и часы: shifts*100 + hours*10.
// Одна смена (~9ч) ≈ 190 очков, LVL10 = 100 смен — достижимо и ощутимо.
const LEVEL_PER_SHIFT = 100;
const LEVEL_PER_HOUR = 10;
function calcGrindXP(shiftCount, totalHours) {
  return Math.round(shiftCount * LEVEL_PER_SHIFT + totalHours * LEVEL_PER_HOUR);
}

const LEVELS = [
  { lvl:1, name:'Новичок',        icon:'🐣', title:'Начало пути',         xp:0 },
  { lvl:2, name:'Кладовщик',      icon:'📦', title:'Освоился на складе',   xp:600 },
  { lvl:3, name:'Грузчик PRO',    icon:'💪', title:'Уже не новичок',       xp:1500 },
  { lvl:4, name:'Бригадир',       icon:'👷', title:'Опытный работяга',     xp:2900 },
  { lvl:5, name:'Золотые руки',   icon:'🤲', title:'Мастер своего дела',   xp:4800 },
  { lvl:6, name:'Менеджер склада',icon:'🏭', title:'Управляешь процессом', xp:7200 },
  { lvl:7, name:'Бизнесмен',      icon:'💼', title:'Думаешь масштабно',    xp:10000 },
  { lvl:8, name:'Миллионер',      icon:'🎩', title:'Первый миллион!',      xp:13300 },
  { lvl:9, name:'Магнат',         icon:'🏰', title:'Империя растёт',       xp:16000 },
  { lvl:10,name:'Скрудж МакДак',  icon:'🦆', title:'Купаешься в монетах!', xp:19000 },
];

const DIFFICULTIES = { easy:{goal:800}, normal:{goal:850}, hard:{goal:900} };

const ACHIEVEMENTS = [
  { id:'first',   icon:'⭐',  name:'Первая смена',   check:d=>d.shifts.length>=1 },
  { id:'five',    icon:'🖐️', name:'5 смен',         check:d=>d.shifts.length>=5 },
  { id:'ten',     icon:'🔟',  name:'10 смен',        check:d=>d.shifts.length>=10 },
  { id:'thirty',  icon:'📅',  name:'30 смен',        check:d=>d.shifts.length>=30 },
  { id:'earn10k', icon:'💵',  name:'10К за смену',   check:d=>d.shifts.some(s=>s.earned>=10000) },
  { id:'earn50k', icon:'💰',  name:'50К всего',      check:d=>d.totalEarned>=50000 },
  { id:'earn100k',icon:'🤑',  name:'100К всего',     check:d=>d.totalEarned>=100000 },
  { id:'earn500k',icon:'🏆',  name:'500К всего',     check:d=>d.totalEarned>=500000 },
  { id:'rate900', icon:'🚀',  name:'900₽/час',       check:d=>d.shifts.some(s=>s.rate>=900) },
  { id:'rate1000',icon:'👑',  name:'1000₽/час',      check:d=>d.shifts.some(s=>s.rate>=1000) },
  { id:'streak3', icon:'🔥',  name:'3 дня страйк',  check:d=>d.streak>=3 },
  { id:'streak7', icon:'⚡',  name:'7 дней страйк', check:d=>d.streak>=7 },
];

// ====== SHOP ITEMS ======
const SHOP_ITEMS = [
  // Бусты
  { id:'extra_reroll_1', icon:'🎲', name:'+1 реролл на день', desc:'Добавляет 1 лайф-реролл сегодня', price:40, cat:'boost', consumable:true },
  { id:'extra_reroll_3', icon:'🎰', name:'+3 реролла на день', desc:'Пак из 3 лайф-реролов на сегодня', price:100, cat:'boost', consumable:true },
  { id:'double_xp', icon:'⚡', name:'Двойной XP (1 день)', desc:'Все лайф-квесты дают x2 XP сегодня', price:200, cat:'boost', consumable:true },
  { id:'cat_choice', icon:'🎯', name:'Выбор категории', desc:'Выбери категорию квестов на завтра', price:150, cat:'boost', consumable:true },
  // Расходники: покупаются многократно, чтобы XP не обесценивался после
  // выкупа всех тем и титулов (весь остальной магазин — разовый).
  { id:'streak_shield', icon:'🛡', name:'Защита страйка', desc:'Страйк не сгорит за пропущенный день', price:250, cat:'boost', consumable:true },
  { id:'mystery_box', icon:'🎁', name:'Мистери-бокс', desc:'Случайный приз: XP, реролы или буст', price:120, cat:'boost', consumable:true },
  { id:'shift_reroll', icon:'🔄', name:'Реролл квеста смены', desc:'Заменить один квест смены сегодня', price:80, cat:'boost', consumable:true },
  // Косметика
  { id:'title_grinder', icon:'💎', name:'Титул: Грайндер', desc:'Отображается в заголовке', price:300, cat:'cosmetic', consumable:false },
  { id:'title_legend', icon:'👑', name:'Титул: Легенда', desc:'Отображается в заголовке', price:500, cat:'cosmetic', consumable:false },
  { id:'title_beast', icon:'🦁', name:'Титул: Зверюга', desc:'Отображается в заголовке', price:400, cat:'cosmetic', consumable:false },
  { id:'title_sigma', icon:'🐺', name:'Титул: Сигма', desc:'Отображается в заголовке', price:600, cat:'cosmetic', consumable:false },
  // Награды
  { id:'golden_border', icon:'✨', name:'Золотая рамка кошелька', desc:'Красивое свечение кошелька', price:250, cat:'reward', consumable:false },
  { id:'rain_upgrade', icon:'🌧️', name:'Усиленный дождь монет', desc:'Больше монет при сохранении смены', price:350, cat:'reward', consumable:false },
  { id:'custom_tip', icon:'📝', name:'Своя мотивация', desc:'Добавь свой совет в ротацию', price:200, cat:'reward', consumable:false },
  // Темы
  { id:'theme_neon', icon:'🌈', name:'Тема: Неон', desc:'Яркие неоновые акценты', price:150, cat:'theme', consumable:false },
  { id:'theme_ocean', icon:'🌊', name:'Тема: Океан', desc:'Глубокий синий с бирюзой', price:150, cat:'theme', consumable:false },
  { id:'theme_fire', icon:'🔥', name:'Тема: Пламя', desc:'Красно-оранжевые тона', price:150, cat:'theme', consumable:false },
  { id:'theme_forest', icon:'🌲', name:'Тема: Лес', desc:'Зелёные природные оттенки', price:150, cat:'theme', consumable:false },
  { id:'theme_sakura', icon:'🌸', name:'Тема: Сакура', desc:'Розовые тона и нежность', price:200, cat:'theme', consumable:false },
  { id:'theme_cyber', icon:'🤖', name:'Тема: Кибер', desc:'Матрица и кислотный зелёный', price:200, cat:'theme', consumable:false },
  { id:'theme_royal', icon:'👸', name:'Тема: Королевская', desc:'Фиолетово-золотая роскошь', price:250, cat:'theme', consumable:false },
  { id:'theme_midnight', icon:'🌙', name:'Тема: Полночь', desc:'Глубокий индиго с серебром', price:200, cat:'theme', consumable:false },
  { id:'theme_sunset', icon:'🌅', name:'Тема: Закат', desc:'От оранжевого к фиолетовому', price:200, cat:'theme', consumable:false },
  { id:'theme_hacker', icon:'💚', name:'Тема: Хакер', desc:'Зелёный терминал на чёрном', price:300, cat:'theme', consumable:false },
];

// ====== STATE ======
let shifts = [];
let difficulty = localStorage.getItem('ozon_difficulty') || 'normal';

// Active shift state (stored in localStorage)
let activeShift = JSON.parse(localStorage.getItem('ozon_active_shift') || 'null');
let pendingEndShift = null; // data for end-shift modal

let timerInterval = null;

// ====== TAB SWITCHING ======
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  document.getElementById('content' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  if (tab === 'shop') renderShop();
}

function openManualAdd() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  document.getElementById('inputDate').value = `${yyyy}-${mm}-${dd}`;
  document.getElementById('manualAddModal').classList.add('show');
}
function closeManualAdd() {
  document.getElementById('manualAddModal').classList.remove('show');
}

function toggleFab() {
  document.getElementById('fabContainer').classList.toggle('open');
}

function openCalendarModal() {
  calInit();
  document.getElementById('calendarModal').classList.add('show');
}
function closeCalendarModal() {
  document.getElementById('calendarModal').classList.remove('show');
}

// Close FAB when clicking outside
document.addEventListener('click', function(e) {
  const fab = document.getElementById('fabContainer');
  if (fab && fab.classList.contains('open') && !fab.contains(e.target)) {
    fab.classList.remove('open');
  }
});

// ====== TOAST ======
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
}

// ====== HELPERS ======
// FIX: локальная дата вместо toISOString() — тот давал UTC и с 00:00 до 03:00 (МСК)
// приложение считало, что ещё «вчера»: квесты/реролы/бусты не сбрасывались вовремя.
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr() { return localDateStr(); }

function parseLocalDate(str) {
  const p = String(str).split('-');
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

function enrichShift(s) {
  s.hours = parseFloat(s.hours) || 0;
  s.earned = parseFloat(s.earned) || 0;
  s.rate = s.hours > 0 ? Math.round(s.earned / s.hours) : 0;
  // Метаданные перерывов живут отдельно: в таблице Supabase нет под них колонок,
  // а DDL анонимным ключом не сделать. Ключ — дата+часы+заработок, т.к. id
  // локальной смены меняется после заливки в облако.
  const meta = getShiftMeta()[shiftMetaKey(s)];
  if (meta) {
    s.totalMs = meta.totalMs;
    s.breakMs = meta.breakMs;
    s.breakCount = meta.breakCount;
    s.breakSummary = meta.breakSummary;
  }
  return s;
}

// ====== МЕТАДАННЫЕ СМЕН (перерывы) ======
function shiftMetaKey(s) {
  return `${s.date}|${s.hours}|${s.earned}`;
}
function getShiftMeta() {
  try { return JSON.parse(localStorage.getItem('ozon_shift_meta') || '{}'); } catch (e) { return {}; }
}
function saveShiftMeta(map) {
  localStorage.setItem('ozon_shift_meta', JSON.stringify(map));
  markLocalChange();
  schedulePushProgress();
}
function putShiftMeta(shift, meta) {
  const all = getShiftMeta();
  all[shiftMetaKey(shift)] = meta;
  saveShiftMeta(all);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatShortDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + ' мин';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'ч ' + (m > 0 ? m + 'м' : '');
}

function saveActiveShift() {
  if (activeShift) {
    localStorage.setItem('ozon_active_shift', JSON.stringify(activeShift));
  } else {
    localStorage.removeItem('ozon_active_shift');
  }
  // Активная смена теперь тоже в облаке: начал смену на телефоне —
  // таймер виден и на сайте, а не «потерялся».
  schedulePushProgress();
}

// ====== ACTIVE SHIFT ======
function startShift() {
  activeShift = {
    startTime: Date.now(),
    breaks: [],
    currentBreak: null,
    status: 'working'
  };
  saveActiveShift();
  renderActiveShift();
  startTimer();
  showToast('🚀 Смена начата! Погнали!', 'success');
}

function startBreak() {
  document.getElementById('breakTypeSelector').style.display = 'block';
  document.getElementById('btnBreak').style.display = 'none';
}

function confirmBreak(type) {
  if (!activeShift) return;
  activeShift.currentBreak = { type, start: Date.now(), end: null };
  activeShift.status = 'break';
  saveActiveShift();
  document.getElementById('breakTypeSelector').style.display = 'none';
  renderActiveShift();
  showToast(`☕ Перерыв: ${type}`, 'warn');
}

function endBreak() {
  if (!activeShift || !activeShift.currentBreak) return;
  activeShift.currentBreak.end = Date.now();
  activeShift.breaks.push({...activeShift.currentBreak});
  activeShift.currentBreak = null;
  activeShift.status = 'working';
  saveActiveShift();
  renderActiveShift();
  showToast('💪 Снова в деле!', 'success');
}

function endShift() {
  if (!activeShift) return;
  // If on break, end it first
  if (activeShift.currentBreak) {
    activeShift.currentBreak.end = Date.now();
    activeShift.breaks.push({...activeShift.currentBreak});
    activeShift.currentBreak = null;
  }

  const endTime = Date.now();
  const totalMs = endTime - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + (b.end - b.start), 0);
  const workMs = totalMs - breakMs;
  const workHours = Math.round((workMs / 3600000) * 10) / 10;

  const breakSummary = activeShift.breaks.map(b => b.type + ' ' + formatShortDuration(b.end - b.start)).join(', ');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  // Store pending data for modal
  pendingEndShift = {
    date: `${yyyy}-${mm}-${dd}`,
    hours: workHours,
    totalMs: totalMs,
    breakMs: breakMs,
    breakSummary: breakSummary,
    breakCount: activeShift.breaks.length
  };

  // Show end-shift modal
  document.getElementById('endShiftInfo').innerHTML =
    `⏱ Чистая работа: <b>${workHours} ч</b><br>` +
    `🕐 Всего на смене: ${formatShortDuration(totalMs)}<br>` +
    (breakMs > 0 ? `☕ Перерывов: ${activeShift.breaks.length} (${formatShortDuration(breakMs)})` : '☕ Без перерывов');
  document.getElementById('endShiftEarned').value = '';
  document.getElementById('endShiftNote').value = breakSummary ? `Перерывы: ${breakSummary}` : '';
  document.getElementById('endShiftModal').classList.add('show');

  // Focus earned input
  setTimeout(() => document.getElementById('endShiftEarned').focus(), 300);
}

function cancelEndShift() {
  document.getElementById('endShiftModal').classList.remove('show');
  pendingEndShift = null;
  // Don't clear activeShift — shift continues
  showToast('Смена продолжается', 'warn');
}

async function saveEndShift() {
  if (!pendingEndShift) return;
  const earned = parseFloat(document.getElementById('endShiftEarned').value);
  if (!earned || earned <= 0) {
    showToast('Впиши заработок!', 'error');
    document.getElementById('endShiftEarned').focus();
    return;
  }

  const note = document.getElementById('endShiftNote').value.trim();
  const btn = document.getElementById('btnSaveEndShift');
  btn.disabled = true;
  btn.textContent = '⏳ Сохраняю...';

  const ok = await insertShift({
    date: pendingEndShift.date,
    hours: pendingEndShift.hours,
    earned: earned,
    note: note
  });

  // Перерывы считались в endShift() и раньше просто выбрасывались.
  if (ok) {
    putShiftMeta({ date: pendingEndShift.date, hours: pendingEndShift.hours, earned: earned }, {
      totalMs: pendingEndShift.totalMs,
      breakMs: pendingEndShift.breakMs,
      breakCount: pendingEndShift.breakCount,
      breakSummary: pendingEndShift.breakSummary
    });
    const t = shifts.find(s => s.date === pendingEndShift.date && s.earned === earned);
    if (t) enrichShift(t);
  }

  btn.disabled = false;
  btn.textContent = '💾 СОХРАНИТЬ';

  if (ok) {
    // Close modal
    document.getElementById('endShiftModal').classList.remove('show');

    // Clear active shift
    activeShift = null;
    saveActiveShift();
    clearInterval(timerInterval);
    pendingEndShift = null;

    renderActiveShift();
    const coinCount = getShopOwned('rain_upgrade') ? Math.min(Math.floor(earned / 300), 50) : Math.min(Math.floor(earned / 500), 30);
    rainCoins(coinCount);
    render();
    showToast(`✅ Смена сохранена! +${earned.toLocaleString('ru-RU')} ₽`, 'success');

    // Check for bonus rewards from shift quests
    setTimeout(() => checkAndGrantBonuses(), 800);
  }
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  if (!activeShift) return;
  const now = Date.now();
  const totalMs = now - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + ((b.end || now) - b.start), 0)
    + (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0);
  const workMs = totalMs - breakMs;

  document.getElementById('timerDisplay').textContent = formatDuration(workMs);

  if (activeShift.status === 'break') {
    const breakDur = now - activeShift.currentBreak.start;
    document.getElementById('timerSub').textContent = `☕ Перерыв: ${activeShift.currentBreak.type} (${formatShortDuration(breakDur)})`;
  } else {
    document.getElementById('timerSub').textContent = `🟢 Работаешь | Всего: ${formatDuration(totalMs)} | Перерывы: ${formatShortDuration(breakMs)}`;
  }
}

function renderActiveShift() {
  const panel = document.getElementById('activeShiftPanel');
  const titleEl = document.getElementById('shiftStatusTitle');
  const btnStart = document.getElementById('btnStart');
  const btnBreak = document.getElementById('btnBreak');
  const btnResume = document.getElementById('btnResume');
  const btnEnd = document.getElementById('btnEnd');
  const breakLog = document.getElementById('breakLog');
  const breakSelector = document.getElementById('breakTypeSelector');

  if (!activeShift) {
    panel.className = 'active-shift inactive';
    titleEl.textContent = '🏠 СМЕНА НЕ НАЧАТА';
    titleEl.className = 'off';
    document.getElementById('timerDisplay').textContent = '00:00:00';
    document.getElementById('timerSub').textContent = 'Нажми «Начать смену»';
    btnStart.style.display = '';
    btnBreak.style.display = 'none';
    btnResume.style.display = 'none';
    btnEnd.style.display = 'none';
    breakLog.style.display = 'none';
    breakSelector.style.display = 'none';
    return;
  }

  panel.className = 'active-shift';
  btnStart.style.display = 'none';
  btnEnd.style.display = '';

  if (activeShift.status === 'break') {
    titleEl.textContent = '☕ НА ПЕРЕРЫВЕ';
    titleEl.className = 'live';
    titleEl.style.color = 'var(--orange)';
    btnBreak.style.display = 'none';
    btnResume.style.display = '';
    document.getElementById('timerDisplay').style.color = 'var(--orange)';
  } else {
    titleEl.textContent = '🟢 СМЕНА ИДЁТ';
    titleEl.className = 'live';
    titleEl.style.color = '';
    btnBreak.style.display = '';
    btnResume.style.display = 'none';
    document.getElementById('timerDisplay').style.color = '';
  }

  // Break log
  if (activeShift.breaks.length > 0) {
    breakLog.style.display = '';
    const list = document.getElementById('breakList');
    const totalBreak = activeShift.breaks.reduce((sum, b) => sum + ((b.end || Date.now()) - b.start), 0);
    list.innerHTML = activeShift.breaks.map(b => {
      const dur = (b.end || Date.now()) - b.start;
      return `<div class="break-item"><span class="b-type">${escapeHtml(b.type)}</span><span class="b-dur">${formatShortDuration(dur)}</span></div>`;
    }).join('');
    document.getElementById('breakTotal').textContent = `Всего перерывов: ${formatShortDuration(totalBreak)}`;
  } else {
    breakLog.style.display = 'none';
  }
}

// ====== LIFE QUESTS ======
const LIFE_QUESTS = [
  // 💬 Знакомства и первый контакт
  { id: 'say_hi', icon: '👋', title: 'Поздороваться с незнакомкой', desc: 'Просто «привет» — уже победа', reward: '+15 XP', xp: 15, cat: 'social' },
  { id: 'ask_name', icon: '💫', title: 'Узнать чьё-то имя', desc: 'Спроси и запомни', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'start_convo', icon: '🗣', title: 'Завести разговор первым', desc: 'В очереди, в кафе, где угодно', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'ask_direction', icon: '🧭', title: 'Спросить дорогу у девушки', desc: 'Лёгкий заход без давления', reward: '+15 XP', xp: 15, cat: 'social' },
  { id: 'talk_queue', icon: '🧾', title: 'Поболтать в очереди', desc: 'Пара фраз пока стоите — и уже контакт', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'three_hellos', icon: '🙌', title: 'Поздороваться с 3 людьми', desc: 'Разогрев социальной мышцы', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'remember_detail', icon: '🧠', title: 'Запомнить деталь о новой знакомой', desc: 'Имя, работа, увлечение — пригодится', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'cold_approach', icon: '🔥', title: 'Подойти к незнакомой девушке', desc: 'Страшно? Значит нужно. Просто подойди', reward: '+30 XP', xp: 30, cat: 'approach' },
  { id: 'get_contact', icon: '📱', title: 'Взять номер / соцсеть', desc: 'Не бойся попросить контакт', reward: '+30 XP', xp: 30, cat: 'approach' },
  { id: 'invite_out', icon: '☕', title: 'Пригласить на кофе/прогулку', desc: 'Не откладывай — предложи встречу', reward: '+25 XP', xp: 25, cat: 'approach' },
  { id: 'approach_daytime', icon: '☀️', title: 'Подход днём на улице', desc: 'Без алкоголя и музыки — чистый скилл', reward: '+35 XP', xp: 35, cat: 'approach' },
  { id: 'two_approaches', icon: '⚡', title: 'Сделать 2 подхода за день', desc: 'Второй всегда легче первого', reward: '+40 XP', xp: 40, cat: 'approach' },
  { id: 'approach_after_no', icon: '🛡', title: 'Подойти снова после отказа', desc: 'Отказ — не стоп, а статистика', reward: '+40 XP', xp: 40, cat: 'approach' },
  { id: 'approach_group', icon: '👯', title: 'Подойти к девушке в компании', desc: 'Высшая сложность — максимум роста', reward: '+45 XP', xp: 45, cat: 'approach' },

  // 😎 Уверенность и харизма
  { id: 'eye_contact_girl', icon: '👀', title: 'Держать зрительный контакт 3 сек', desc: 'Смотри уверенно, не отводи первым', reward: '+15 XP', xp: 15, cat: 'confidence' },
  { id: 'smile_strangers', icon: '😊', title: 'Улыбнуться 5 незнакомым людям', desc: 'Улыбка открывает двери', reward: '+10 XP', xp: 10, cat: 'confidence' },
  { id: 'posture_day', icon: '🧍', title: 'Держать осанку весь день', desc: 'Расправь плечи — выгляди как босс', reward: '+15 XP', xp: 15, cat: 'confidence' },
  { id: 'loud_voice', icon: '📢', title: 'Говорить громко и чётко', desc: 'Тихий голос = неуверенность', reward: '+15 XP', xp: 15, cat: 'confidence' },
  { id: 'no_phone_social', icon: '📵', title: 'Убрать телефон при общении', desc: 'Полное внимание = уважение', reward: '+10 XP', xp: 10, cat: 'confidence' },
  { id: 'mirror_hype', icon: '🪞', title: 'Сказать себе «я красавчик»', desc: 'Аффирмация перед зеркалом', reward: '+10 XP', xp: 10, cat: 'confidence' },

  // 💬 Навыки общения
  { id: 'compliment_girl', icon: '💐', title: 'Сделать комплимент девушке', desc: 'Искренний, не шаблонный', reward: '+20 XP', xp: 20, cat: 'skills' },
  { id: 'make_laugh', icon: '😂', title: 'Рассмешить девушку', desc: 'Юмор — лучшее оружие', reward: '+20 XP', xp: 20, cat: 'skills' },
  { id: 'listen_deep', icon: '👂', title: 'Внимательно выслушать', desc: 'Без перебиваний, с вопросами', reward: '+15 XP', xp: 15, cat: 'skills' },
  { id: 'ask_deep_q', icon: '🤔', title: 'Задать интересный вопрос', desc: 'Не «как дела», а что-то цепляющее', reward: '+15 XP', xp: 15, cat: 'skills' },
  { id: 'storytell', icon: '📖', title: 'Рассказать историю из жизни', desc: 'Интересная история = внимание', reward: '+15 XP', xp: 15, cat: 'skills' },
  { id: 'tease_playful', icon: '😏', title: 'Легко подшутить / подразнить', desc: 'Игривый юмор, без обид', reward: '+20 XP', xp: 20, cat: 'skills' },

  // 📲 Переписка и соцсети
  { id: 'text_first', icon: '✉️', title: 'Написать первым', desc: 'Не жди — пиши сам', reward: '+15 XP', xp: 15, cat: 'digital' },
  { id: 'voice_msg', icon: '🎤', title: 'Отправить голосовое', desc: 'Голос создаёт связь сильнее текста', reward: '+10 XP', xp: 10, cat: 'digital' },
  { id: 'funny_meme', icon: '🖼', title: 'Отправить смешной мем', desc: 'Общий юмор сближает', reward: '+10 XP', xp: 10, cat: 'digital' },
  { id: 'react_story', icon: '📸', title: 'Ответить на сторис', desc: 'Естественный повод начать общение', reward: '+15 XP', xp: 15, cat: 'digital' },
  { id: 'plan_date', icon: '📅', title: 'Договориться о встрече', desc: 'Из переписки — в реал', reward: '+25 XP', xp: 25, cat: 'digital' },
  { id: 'call_not_text', icon: '📞', title: 'Позвонить вместо текста', desc: 'Звонок > 100 сообщений', reward: '+20 XP', xp: 20, cat: 'digital' },

  // 🌟 Внешность и стиль
  { id: 'dress_nice', icon: '👔', title: 'Одеться стильно', desc: 'Первое впечатление — одежда', reward: '+15 XP', xp: 15, cat: 'style' },
  { id: 'smell_good', icon: '✨', title: 'Парфюм / ухоженность', desc: 'Запах — мощный триггер', reward: '+10 XP', xp: 10, cat: 'style' },
  { id: 'haircut', icon: '💇', title: 'Привести причёску в порядок', desc: 'Аккуратность = привлекательность', reward: '+10 XP', xp: 10, cat: 'style' },
  { id: 'workout', icon: '🏋️', title: 'Потренироваться', desc: 'Тело — твоя визитка', reward: '+20 XP', xp: 20, cat: 'style' },
  { id: 'skincare', icon: '🧴', title: 'Уход за кожей', desc: 'Чистое лицо = уверенность', reward: '+10 XP', xp: 10, cat: 'style' },
  { id: 'new_look', icon: '🎨', title: 'Попробовать новый стиль', desc: 'Выйди из зоны комфорта во внешности', reward: '+15 XP', xp: 15, cat: 'style' },

  // 🎯 Челленджи и вызовы
  { id: 'reject_proof', icon: '🛡', title: 'Получить отказ и не расстроиться', desc: 'Каждый отказ = +1 к опыту', reward: '+25 XP', xp: 25, cat: 'challenge' },
  { id: 'talk_3girls', icon: '🎲', title: 'Поговорить с 3 девушками за день', desc: 'Количество → качество', reward: '+30 XP', xp: 30, cat: 'challenge' },
  { id: 'no_excuses', icon: '🚫', title: 'Не придумывать отговорки', desc: 'Увидел возможность — действуй', reward: '+20 XP', xp: 20, cat: 'challenge' },
  { id: 'comfort_zone', icon: '🌊', title: 'Выйти из зоны комфорта', desc: 'Сделай то, что обычно не делаешь', reward: '+25 XP', xp: 25, cat: 'challenge' },
  { id: 'ask_opinion', icon: '💭', title: 'Спросить мнение у девушки', desc: 'О чём угодно — заход в разговор', reward: '+15 XP', xp: 15, cat: 'challenge' },
  { id: 'dance_public', icon: '💃', title: 'Потанцевать / подвигаться на людях', desc: 'Не бойся быть заметным', reward: '+20 XP', xp: 20, cat: 'challenge' },

  // 💜 Отношения и забота
  { id: 'remember_detail', icon: '🧠', title: 'Запомнить деталь о человеке', desc: 'Имя кота, любимый цвет — это важно', reward: '+15 XP', xp: 15, cat: 'care' },
  { id: 'surprise_small', icon: '🎁', title: 'Сделать маленький сюрприз', desc: 'Кофе, шоколадка, записка', reward: '+20 XP', xp: 20, cat: 'care' },
  { id: 'be_gentleman', icon: '🚪', title: 'Придержать дверь / помочь', desc: 'Маленькие жесты = большое впечатление', reward: '+10 XP', xp: 10, cat: 'care' },
  { id: 'share_food_girl', icon: '🍕', title: 'Угостить чем-то вкусным', desc: 'Еда = путь к сердцу', reward: '+15 XP', xp: 15, cat: 'care' },
  { id: 'morning_msg', icon: '🌅', title: 'Написать «доброе утро»', desc: 'Первая мысль дня — о ней', reward: '+10 XP', xp: 10, cat: 'care' },
  { id: 'be_honest', icon: '💎', title: 'Быть честным и открытым', desc: 'Искренность > идеальный образ', reward: '+15 XP', xp: 15, cat: 'care' },

  // 🧘 Внутренняя прокачка
  { id: 'no_needy', icon: '🧊', title: 'Не быть навязчивым', desc: 'Дай пространство, не дави', reward: '+15 XP', xp: 15, cat: 'mindset' },
  { id: 'self_worth', icon: '👑', title: 'Напомнить себе свою ценность', desc: 'Ты — приз, а не проситель', reward: '+10 XP', xp: 10, cat: 'mindset' },
  { id: 'learn_social', icon: '📚', title: 'Изучить что-то про общение', desc: 'Видео, книга, статья про соц. навыки', reward: '+15 XP', xp: 15, cat: 'mindset' },
  { id: 'visualize', icon: '🎬', title: 'Визуализировать успех', desc: 'Представь идеальный разговор', reward: '+10 XP', xp: 10, cat: 'mindset' },
  { id: 'gratitude_social', icon: '🙏', title: 'Поблагодарить за общение', desc: 'Скажи спасибо тем, кто рядом', reward: '+10 XP', xp: 10, cat: 'mindset' },
  { id: 'journal_social', icon: '📓', title: 'Записать что узнал сегодня', desc: 'Рефлексия социального опыта', reward: '+15 XP', xp: 15, cat: 'mindset' },
];

// Life quest categories
const LQ_CATEGORIES = {
  social:     { name: 'Знакомства',  icon: '👋', color: '#ab47bc' },
  approach:   { name: 'Подходы',     icon: '🔥', color: '#ef5350' },
  confidence: { name: 'Уверенность', icon: '😎', color: '#42a5f5' },
  skills:     { name: 'Общение',     icon: '💬', color: '#66bb6a' },
  digital:    { name: 'Переписка',   icon: '📲', color: '#26c6da' },
  style:      { name: 'Стиль',       icon: '✨', color: '#ffa726' },
  challenge:  { name: 'Челленджи',   icon: '🎯', color: '#ec407a' },
  care:       { name: 'Забота',      icon: '💜', color: '#ce93d8' },
  mindset:    { name: 'Майндсет',    icon: '🧠', color: '#ffee58' },
};

// Life XP levels
const LQ_LEVELS = [
  { lvl: 1,  xp: 0,    name: 'Новичок',       icon: '🌱' },
  { lvl: 2,  xp: 100,  name: 'Практикант',     icon: '🌿' },
  { lvl: 3,  xp: 300,  name: 'Стабильный',     icon: '🌳' },
  { lvl: 4,  xp: 600,  name: 'Дисциплина',     icon: '⚡' },
  { lvl: 5,  xp: 1000, name: 'Привычка',       icon: '🔥' },
  { lvl: 6,  xp: 1500, name: 'Мастер рутины',  icon: '🏆' },
  { lvl: 7,  xp: 2200, name: 'Лайф-грайндер',  icon: '💎' },
  { lvl: 8,  xp: 3000, name: 'Сверхчеловек',   icon: '🦸' },
  { lvl: 9,  xp: 4000, name: 'Легенда',        icon: '👑' },
  { lvl: 10, xp: 5500, name: 'БОГ ЛАЙФА',      icon: '🌟' },
];

// Pick 7 random life quests for today (seeded by date, from pool of 48)
function getTodayLifeQuests() {
  const today = todayStr();
  const chosenCat = getChosenCategory();

  if (chosenCat) {
    const catQuests = LIFE_QUESTS.filter(q => q.cat === chosenCat);
    let hash = 0;
    for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
    const shuffledCat = [...catQuests].sort((a, b) => {
      let ha = hash, hb = hash;
      for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
      for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
      return (ha % 10000) - (hb % 10000);
    });
    const fromCat = shuffledCat.slice(0, 5);
    const otherQuests = LIFE_QUESTS.filter(q => q.cat !== chosenCat);
    const shuffledOther = [...otherQuests].sort((a, b) => {
      let ha = hash + 99, hb = hash + 99;
      for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
      for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
      return (ha % 10000) - (hb % 10000);
    });
    const fromOther = shuffledOther.slice(0, 7 - fromCat.length);
    return [...fromCat, ...fromOther];
  }

  // Default: random from full pool
  let hash = 0;
  for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const shuffled = [...LIFE_QUESTS].sort((a, b) => {
    let ha = hash, hb = hash;
    for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
    for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
    return (ha % 10000) - (hb % 10000);
  });
  return shuffled.slice(0, 7);
}

// ====== LIFE QUEST XP SYSTEM ======

// ВОССТАНОВЛЕНИЕ: реальный Life XP был ~200 (LVL 2), а 20400 — это рубли из
// кошелька, я их спутал. Накатываем один раз: только если XP ещё пустой,
// чтобы не затереть живой прогресс при повторных заходах.
const XP_RESTORE_VALUE = 200;
function restoreLostXPOnce() {
  try {
    if (localStorage.getItem('ozon_xp_restored_v42')) return;
    const raw = localStorage.getItem('ozon_life_xp');
    let cur = null;
    try { cur = raw ? JSON.parse(raw) : null; } catch (e) { cur = null; }
    if (!cur || !cur.total) {
      const seeded = cur || { total: 0, cats: {}, history: [], questsDone: 0, daysDone: 0, lastDay: '' };
      seeded.total = XP_RESTORE_VALUE;
      localStorage.setItem('ozon_life_xp', JSON.stringify(seeded));
    }
    localStorage.setItem('ozon_xp_restored_v42', '1');
  } catch (e) { console.warn('XP restore skipped:', e); }
}

function getLifeXP() {
  try {
    return JSON.parse(localStorage.getItem('ozon_life_xp') || '{"total":0,"cats":{},"history":[],"questsDone":0,"daysDone":0,"lastDay":""}');
  } catch(e) { return { total: 0, cats: {}, history: [], questsDone: 0, daysDone: 0, lastDay: '' }; }
}

function saveLifeXP(data) {
  localStorage.setItem('ozon_life_xp', JSON.stringify(data));
  schedulePushProgress();
}

function getXpMultiplier() {
  // Check if double XP is active
  const today = todayStr();
  try {
    const boosts = JSON.parse(localStorage.getItem('ozon_shop_boosts') || '{}');
    if (boosts.double_xp === today) return 2;
  } catch(e) {}
  return 1;
}

function addLifeXP(questId, xpAmount, category) {
  const data = getLifeXP();
  const today = todayStr();

  const todayKey = `${today}_${questId}`;
  if (!data.history) data.history = [];
  if (data.history.includes(todayKey)) return data;

  const multiplier = getXpMultiplier();
  const finalXP = xpAmount * multiplier;

  data.total = (data.total || 0) + finalXP;
  if (!data.cats) data.cats = {};
  data.cats[category] = (data.cats[category] || 0) + finalXP;
  data.questsDone = (data.questsDone || 0) + 1;
  data.history.push(todayKey);

  if (data.lastDay !== today) {
    data.daysDone = (data.daysDone || 0) + 1;
    data.lastDay = today;
  }

  if (data.history.length > 500) data.history = data.history.slice(-500);

  saveLifeXP(data);
  return data;
}

function removeLifeXP(questId, xpAmount, category) {
  const data = getLifeXP();
  const today = todayStr();
  const todayKey = `${today}_${questId}`;

  const idx = data.history.indexOf(todayKey);
  if (idx === -1) return data;

  const multiplier = getXpMultiplier();
  const finalXP = xpAmount * multiplier;

  data.total = Math.max(0, (data.total || 0) - finalXP);
  if (data.cats) data.cats[category] = Math.max(0, (data.cats[category] || 0) - finalXP);
  data.questsDone = Math.max(0, (data.questsDone || 0) - 1);
  data.history.splice(idx, 1);

  saveLifeXP(data);
  return data;
}

function getLQLevel(xp) {
  let current = LQ_LEVELS[0], next = LQ_LEVELS[1];
  for (let i = LQ_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LQ_LEVELS[i].xp) { current = LQ_LEVELS[i]; next = LQ_LEVELS[i + 1] || null; break; }
  }
  return { current, next };
}

// Храним последний показанный уровень, чтобы поймать момент level-up.
let _lastShownLvl = null;

function renderLifeStats() {
  const data = getLifeXP();
  const { current, next } = getLQLevel(data.total);
  const container = document.getElementById('lifeStatsPanel');
  if (!container) return;

  // прогресс внутри текущего уровня
  let progressPct = 100;
  let xpNow = data.total, xpNeed = null;
  if (next) {
    progressPct = ((data.total - current.xp) / (next.xp - current.xp)) * 100;
    xpNow = data.total - current.xp;
    xpNeed = next.xp - current.xp;
  }
  progressPct = Math.max(0, Math.min(progressPct, 100));

  // категории: сортируем по убыванию, топ подсвечиваем
  const catEntries = Object.entries(LQ_CATEGORIES).map(([key, cat]) => ({
    key, cat, xp: (data.cats && data.cats[key]) || 0
  })).sort((a, b) => b.xp - a.xp);
  const maxCatXP = Math.max(...catEntries.map(e => e.xp), 1);
  const catBars = catEntries.map((e, i) => {
    const pct = (e.xp / maxCatXP) * 100;
    const cls = e.xp === 0 ? 'is-zero' : (i === 0 ? 'is-top' : '');
    return `<div class="lq-stat-row ${cls}">
      <span class="lq-stat-icon">${e.cat.icon}</span>
      <span class="lq-stat-name">${e.cat.name}</span>
      <div class="lq-stat-bar"><div class="lq-stat-fill" data-target="${pct}" style="width:0%;background:${e.cat.color};color:${e.cat.color}"></div></div>
      <span class="lq-stat-val">${e.xp}</span>
    </div>`;
  }).join('');

  const multiplier = getXpMultiplier();
  const boostBadge = multiplier > 1 ? `<span class="lq-boost-badge">x${multiplier} XP</span>` : '';
  const nextLine = next
    ? `до <b>${next.name}</b> — ещё ${next.xp - data.total} XP`
    : 'максимальный ранг достигнут 🌟';
  const avgPerQuest = data.questsDone > 0 ? Math.round(data.total / data.questsDone) : 0;

  container.innerHTML = `
    <div class="lq-hero">
      <div class="lq-badge" id="lqBadge" style="--p:${(progressPct / 100).toFixed(3)}">
        <span class="lq-badge-inner">
          <span class="lq-badge-icon">${current.icon}</span>
          <span class="lq-badge-lvl">LVL ${current.lvl}</span>
        </span>
      </div>
      <div class="lq-hero-main">
        <div class="lq-rank-row">
          <span class="lq-rank-name">${current.name}</span>
          ${boostBadge}
        </div>
        <div class="lq-next-rank">${nextLine}</div>
        <div class="lq-xp-track">
          <div class="lq-xp-fill" data-target="${progressPct}" style="width:0%"></div>
          <div class="lq-xp-ticks"></div>
        </div>
        <div class="lq-xp-caption">
          <span><span class="lq-xp-now">${xpNow}</span>${xpNeed ? ' / ' + xpNeed + ' XP' : ' XP'}</span>
          <span class="lq-total-chip">✨ ${data.total}</span>
        </div>
      </div>
    </div>
    <div class="lq-stats-grid">
      <div class="lq-mini-stat">
        <span class="lq-ms-ico">⚔️</span>
        <span class="lq-ms-val">${data.questsDone || 0}</span>
        <span class="lq-ms-lbl">квестов</span>
      </div>
      <div class="lq-mini-stat">
        <span class="lq-ms-ico">🔥</span>
        <span class="lq-ms-val">${data.daysDone || 0}</span>
        <span class="lq-ms-lbl">дней</span>
      </div>
      <div class="lq-mini-stat">
        <span class="lq-ms-ico">📈</span>
        <span class="lq-ms-val">${avgPerQuest}</span>
        <span class="lq-ms-lbl">XP/квест</span>
      </div>
    </div>
    <div class="lq-cat-title"><span>Навыки</span></div>
    <div class="lq-cat-bars">${catBars}</div>
  `;

  // Полоски рисуем с нуля и доводим до цели в следующем кадре —
  // иначе inline-width применяется сразу и анимации не видно.
  requestAnimationFrame(() => {
    const xpFill = container.querySelector('.lq-xp-fill');
    if (xpFill) xpFill.style.width = xpFill.dataset.target + '%';
    container.querySelectorAll('.lq-stat-fill').forEach(el => {
      el.style.width = el.dataset.target + '%';
    });
  });

  // Поймали переход на новый уровень — празднуем.
  if (_lastShownLvl !== null && current.lvl > _lastShownLvl) {
    celebrateLevelUp(current);
  }
  _lastShownLvl = current.lvl;
}

// Тост + поп бейджа при новом уровне.
function celebrateLevelUp(level) {
  const badge = document.getElementById('lqBadge');
  if (badge) {
    badge.classList.remove('pop');
    void badge.offsetWidth; // перезапуск анимации
    badge.classList.add('pop');
  }
  let toast = document.getElementById('lqLevelUpToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lqLevelUpToast';
    toast.className = 'lq-levelup-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<div class="lq-lu-title">${level.icon} LEVEL UP!</div>
    <div class="lq-lu-sub">LVL ${level.lvl} — ${level.name}</div>`;
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function getLifeQuestState() {
  const today = todayStr();
  try {
    const saved = JSON.parse(localStorage.getItem('ozon_life_quests') || '{}');
    if (saved.date === today) return { checked: saved.checked || {}, rerolls: saved.rerolls || 0, replacements: saved.replacements || {} };
    return { checked: {}, rerolls: 0, replacements: {} };
  } catch(e) { return { checked: {}, rerolls: 0, replacements: {} }; }
}

function saveLifeQuestState(state) {
  const today = todayStr();
  localStorage.setItem('ozon_life_quests', JSON.stringify({ date: today, ...state }));
}

function toggleLifeQuest(id) {
  const state = getLifeQuestState();
  const quest = LIFE_QUESTS.find(q => q.id === id);
  state.checked[id] = !state.checked[id];
  saveLifeQuestState(state);

  if (state.checked[id] && quest) {
    const mult = getXpMultiplier();
    addLifeXP(id, quest.xp, quest.cat);
    const xpGained = quest.xp * mult;
    showToast(`✅ +${xpGained} XP! ${mult > 1 ? '(x' + mult + '!) ' : ''}Красавчик!`, 'success');
    rainCoins(3);
  } else if (!state.checked[id] && quest) {
    removeLifeXP(id, quest.xp, quest.cat);
  }

  renderLifeQuests();
  renderLifeStats();
}

const MAX_REROLLS = 3;

// ====== BONUS SYSTEM ======
function getShiftBonuses() {
  const today = todayStr();
  try {
    const saved = JSON.parse(localStorage.getItem('ozon_shift_bonuses') || '{}');
    if (saved.date === today) return saved;
    return { date: today, bonusRerolls: 0, categoryChoice: false, claimedQuests: [] };
  } catch(e) { return { date: today, bonusRerolls: 0, categoryChoice: false, claimedQuests: [] }; }
}

function saveShiftBonuses(data) {
  localStorage.setItem('ozon_shift_bonuses', JSON.stringify(data));
  schedulePushProgress();
}

function getChosenCategory() {
  try {
    const saved = JSON.parse(localStorage.getItem('ozon_chosen_category') || '{}');
    const today = todayStr();
    if (saved.forDate === today) return saved.category;
    return null;
  } catch(e) { return null; }
}

function saveChosenCategory(cat, forDate) {
  localStorage.setItem('ozon_chosen_category', JSON.stringify({ category: cat, forDate: forDate }));
  schedulePushProgress();
}

function checkAndGrantBonuses() {
  const quests = generateQuests();
  const bonuses = getShiftBonuses();
  let newRerolls = 0;
  let newCategoryChoice = false;
  const messages = [];

  for (const q of quests) {
    if (!q.bonus) continue;
    const done = (q.progress / q.target) >= 1;
    if (!done) continue;
    if (bonuses.claimedQuests.includes(q.id)) continue;

    bonuses.claimedQuests.push(q.id);

    if (q.bonus.type === 'reroll') {
      newRerolls += q.bonus.amount;
      messages.push(`🎲 +${q.bonus.amount} реролл за «${q.title}»`);
    } else if (q.bonus.type === 'category_choice') {
      newCategoryChoice = true;
      messages.push(`🎯 Выбор категории за «${q.title}»`);
    }
  }

  if (newRerolls > 0) {
    bonuses.bonusRerolls = (bonuses.bonusRerolls || 0) + newRerolls;
  }
  if (newCategoryChoice) {
    bonuses.categoryChoice = true;
  }

  saveShiftBonuses(bonuses);

  for (const msg of messages) {
    showToast(msg, 'success');
  }

  renderLifeQuests();

  if (newCategoryChoice) {
    setTimeout(() => openCategoryPicker(), 500);
  }

  return { newRerolls, newCategoryChoice, messages };
}

function openCategoryPicker(isWeeklyFree = false) {
  const container = document.getElementById('categoryPickerList');
  const source = isWeeklyFree ? 'weekly' : 'bonus';
  container.innerHTML = Object.entries(LQ_CATEGORIES).map(([key, cat]) =>
    `<button class="cat-pick-btn" onclick="pickCategory('${key}', '${source}')" style="background:rgba(255,255,255,0.04);border:2px solid ${cat.color};border-radius:12px;padding:12px 8px;cursor:pointer;text-align:center;transition:all 0.2s;color:var(--text);font-family:inherit">
      <div style="font-size:24px;margin-bottom:4px">${cat.icon}</div>
      <div style="font-size:12px;font-weight:700;color:${cat.color}">${cat.name}</div>
      <div style="font-size:10px;color:var(--text-dim)">${LIFE_QUESTS.filter(q => q.cat === key).length} квестов</div>
    </button>`
  ).join('');
  const modalTitle = document.querySelector('#categoryPickerModal h3');
  if (modalTitle) {
    modalTitle.textContent = isWeeklyFree ? '🎁 БЕСПЛАТНЫЙ ВЫБОР КАТЕГОРИИ' : '🎯 ВЫБЕРИ КАТЕГОРИЮ';
  }
  document.getElementById('categoryPickerModal').classList.add('show');
}

function closeCategoryPicker() {
  document.getElementById('categoryPickerModal').classList.remove('show');
}

function pickCategory(cat, source = 'bonus') {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const forDate = localDateStr(tomorrow);
  saveChosenCategory(cat, forDate);
  closeCategoryPicker();
  const catInfo = LQ_CATEGORIES[cat];

  if (source === 'weekly') {
    const wc = getWeeklyCategoryChoice();
    wc.used = true;
    saveWeeklyCategoryChoice(wc);
    showToast(`🎁 ${catInfo.icon} Завтра квесты из: ${catInfo.name}! (бесплатно)`, 'success');
  } else {
    showToast(`${catInfo.icon} Завтра квесты из: ${catInfo.name}!`, 'success');
  }
  rainCoins(5);
  renderLifeQuests();
}

function getTotalRerolls() {
  const bonuses = getShiftBonuses();
  const shopExtra = getShopExtraRerolls();
  return MAX_REROLLS + (bonuses.bonusRerolls || 0) + shopExtra;
}

// Weekly free category choice — 1 per week (resets Monday)
function getWeeklyCategoryChoice() {
  try {
    const saved = JSON.parse(localStorage.getItem('ozon_weekly_cat') || '{}');
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const weekKey = localDateStr(monday);
    if (saved.week === weekKey) return saved;
    return { week: weekKey, used: false };
  } catch(e) { return { week: '', used: false }; }
}

function saveWeeklyCategoryChoice(data) {
  localStorage.setItem('ozon_weekly_cat', JSON.stringify(data));
  schedulePushProgress();
}

function useWeeklyCategoryChoice() {
  const wc = getWeeklyCategoryChoice();
  if (wc.used) {
    showToast('🎯 Бесплатный выбор уже использован на этой неделе!', 'warn');
    return;
  }
  openCategoryPicker(true);
}

function rerollLifeQuest(oldId, event) {
  event.stopPropagation();
  const state = getLifeQuestState();
  const totalRerolls = getTotalRerolls();
  if (state.rerolls >= totalRerolls) {
    showToast('🎲 Реролы закончились на сегодня!', 'warn');
    return;
  }

  const baseQuests = getTodayLifeQuests();
  const currentIds = baseQuests.map(q => state.replacements[q.id] || q.id);

  const available = LIFE_QUESTS.filter(q => !currentIds.includes(q.id));
  if (available.length === 0) {
    showToast('Нет доступных квестов для замены', 'warn');
    return;
  }

  const newQuest = available[Math.floor(Math.random() * available.length)];

  const baseSlot = baseQuests.find(q => (state.replacements[q.id] || q.id) === oldId);
  if (baseSlot) {
    state.replacements[baseSlot.id] = newQuest.id;
  }

  delete state.checked[oldId];

  state.rerolls++;
  saveLifeQuestState(state);
  renderLifeQuests();
  showToast(`🔄 Квест заменён! (${totalRerolls - state.rerolls} реролов осталось)`, 'success');
}

function getResolvedLifeQuests() {
  const baseQuests = getTodayLifeQuests();
  const state = getLifeQuestState();
  return baseQuests.map(base => {
    const replacementId = state.replacements[base.id];
    if (replacementId) {
      const found = LIFE_QUESTS.find(q => q.id === replacementId);
      if (found) return found;
    }
    return base;
  });
}

function renderLifeQuests() {
  const quests = getResolvedLifeQuests();
  const state = getLifeQuestState();
  const checked = state.checked;
  const totalRerolls = getTotalRerolls();
  const rerollsLeft = totalRerolls - state.rerolls;
  const bonusRerolls = getShiftBonuses().bonusRerolls || 0;
  const shopExtra = getShopExtraRerolls();
  const chosenCat = getChosenCategory();
  const container = document.getElementById('lifeQuestList');
  const doneCount = quests.filter(q => checked[q.id]).length;

  let headerHtml = '';
  if (chosenCat && LQ_CATEGORIES[chosenCat]) {
    const ci = LQ_CATEGORIES[chosenCat];
    headerHtml = `<div style="text-align:center;padding:6px 10px;margin-bottom:8px;background:rgba(255,215,0,0.08);border-radius:10px;font-size:12px;color:var(--gold)">
      🎯 Категория дня: ${ci.icon} <b>${ci.name}</b>
    </div>`;
  }

  container.innerHTML = headerHtml + quests.map(q => {
    const isDone = !!checked[q.id];
    const canReroll = !isDone && rerollsLeft > 0;
    return `<div class="life-quest-item ${isDone ? 'checked' : ''}" onclick="toggleLifeQuest('${q.id}')">
      <div class="life-quest-check">${isDone ? '✅' : ''}</div>
      <div class="lq-content">
        <div class="lq-title">${q.icon} ${q.title}</div>
        <div class="lq-desc">${q.desc}</div>
      </div>
      <div class="lq-reward">${q.reward}</div>
      <button class="lq-reroll" onclick="rerollLifeQuest('${q.id}', event)" ${canReroll ? '' : 'disabled'} title="Заменить квест">🔄</button>
    </div>`;
  }).join('') +
    `<div class="lq-reroll-counter">🎲 Реролов: ${rerollsLeft}/${totalRerolls}${bonusRerolls > 0 ? ` <span style="color:var(--gold)">(+${bonusRerolls} бонус)</span>` : ''}${shopExtra > 0 ? ` <span style="color:var(--purple)">(+${shopExtra} магазин)</span>` : ''}</div>` +
    (() => {
      const wc = getWeeklyCategoryChoice();
      if (!wc.used) {
        return `<div style="text-align:center;margin:6px 0"><button onclick="useWeeklyCategoryChoice()" style="background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,165,0,0.06));border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:8px 16px;color:var(--gold);font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">🎁 Бесплатный выбор категории (1/нед)</button></div>`;
      }
      return `<div style="text-align:center;margin:4px 0;font-size:10px;color:var(--text-dim)">🎁 Бесплатный выбор категории использован до понедельника</div>`;
    })() +
    (doneCount === quests.length && quests.length > 0
    ? '<div style="text-align:center;padding:10px;font-size:14px;color:var(--green);font-weight:700">🏆 ВСЕ ЛАЙФ-КВЕСТЫ ВЫПОЛНЕНЫ! 🎉</div>'
    : `<div style="text-align:center;padding:6px;font-size:11px;color:var(--text-dim)">${doneCount}/${quests.length} выполнено · обновляются каждый день</div>`);
}

// ====== MOTIVATION TIPS ======
const TIPS = [
  { text: 'Дисциплина — это делать то, что нужно, когда не хочется.', author: '🦆 Скрудж МакДак' },
  { text: 'Маленькие шаги каждый день дают большие результаты.', author: '📈 Закон прогресса' },
  { text: 'Деньги любят тех, кто их уважает и считает.', author: '💰 Правило богатства' },
  { text: 'Лучший момент начать — вчера. Второй лучший — сейчас.', author: '⏰ Мудрость' },
  { text: 'Не сравнивай себя с другими. Сравнивай себя с собой вчерашним.', author: '🪞 Рост' },
  { text: 'Каждая смена — это кирпич в фундаменте твоего будущего.', author: '🏗 Строитель жизни' },
  { text: 'Усталость временна, результат — навсегда.', author: '💪 Гринд-философия' },
  { text: 'Пока другие спят — ты строишь своё будущее.', author: '🌙 Ночная смена' },
  { text: 'Тело — твой главный инструмент. Заботься о нём.', author: '❤️ Здоровье' },
  { text: '100 смен — и ты уже другой человек.', author: '🔄 Трансформация' },
  { text: 'Скрудж стал богатым не потому что ему повезло, а потому что он работал каждый день.', author: '🦆 DuckTales' },
  { text: 'Перерыв — не слабость, а стратегия.', author: '♟ Тактика' },
  { text: 'Твой rate сегодня — это твоя цена завтра.', author: '📊 Аналитика' },
  { text: 'Обед с собой = +300₽ в день = +9000₽ в месяц!', author: '🧮 Математика экономии' },
  { text: 'Главное — не останавливаться. Страйк не должен прерваться!', author: '🔥 Keep grinding' },
];

function renderMotivationTip() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  document.getElementById('tipText').textContent = `«${tip.text}»`;
  document.getElementById('tipAuthor').textContent = `— ${tip.author}`;
}

// ====== QUESTS ======
const SHIFT_QUEST_POOL = [
  // === ВРЕМЯ / ЧАСЫ ===
  {
    id: 'start_shift', icon: '🚀', title: 'Выйти на смену',
    desc: 'Начни свою смену сегодня',
    calc: (ctx) => ({ progress: (ctx.isOnShift || ctx.todayShifts.length > 0) ? 1 : 0, target: 1 }),
    reward: '🏅 Просто прийти — уже победа', bonus: null
  },
  {
    id: 'work_2h', icon: '⏳', title: 'Разогрев: 2 часа',
    desc: 'Набей 2 часа чистой работы',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 2), target: 2 }),
    reward: '🔥 +50 XP к мотивации', bonus: null
  },
  {
    id: 'work_4h', icon: '⏱', title: 'Отработать 4 часа',
    desc: 'Набей 4 часа чистой работы',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 4), target: 4 }),
    reward: '🎲 +1 реролл лайф-квеста', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'work_6h', icon: '⚡', title: 'Рабочий ритм: 6 часов',
    desc: '6 часов чистой продуктивности',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 6), target: 6 }),
    reward: '💪 Уровень дисциплины +1', bonus: null
  },
  {
    id: 'work_8h', icon: '💪', title: 'Марафон: 8 часов',
    desc: 'Полная смена — 8 часов работы',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 8), target: 8 }),
    reward: '🎲 +1 реролл лайф-квеста', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'work_10h', icon: '🦾', title: 'Железный человек: 10 часов',
    desc: 'Сверхсмена — 10 часов чистой работы!',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 10), target: 10 }),
    reward: '🎲 +2 реролла лайф-квестов', bonus: { type: 'reroll', amount: 2 }
  },

  // === ЗАРАБОТОК ===
  {
    id: 'earn_2k', icon: '💵', title: 'Первые 2000₽',
    desc: 'Заработай первые 2К за день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 2000), target: 2000 }),
    reward: '🪙 Копейка рубль бережёт', bonus: null
  },
  {
    id: 'earn_5k', icon: '💰', title: 'Заработать 5000₽',
    desc: 'Сегодняшний заработок ≥ 5000₽',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 5000), target: 5000 }),
    reward: '🎲 +1 реролл лайф-квеста', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'earn_8k', icon: '🤑', title: 'Заработать 8000₽',
    desc: 'Погнали на 8K сегодня!',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 8000), target: 8000 }),
    reward: '🎯 Выбор категории квестов!', bonus: { type: 'category_choice' }
  },
  {
    id: 'earn_10k', icon: '💎', title: 'Десятка! 10 000₽',
    desc: 'Пробей планку в 10К за день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 10000), target: 10000 }),
    reward: '🎲 +2 реролла + 🏆 ачивка', bonus: { type: 'reroll', amount: 2 }
  },
  {
    id: 'earn_12k', icon: '👑', title: 'Король дня: 12 000₽',
    desc: 'Элитный заработок — 12К за день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 12000), target: 12000 }),
    reward: '🎯 Выбор категории + 🎲 +1 реролл', bonus: { type: 'category_choice' }
  },

  // === RATE / ЭФФЕКТИВНОСТЬ ===
  {
    id: 'hit_goal', icon: '🎯', title: () => `Выбить ${DIFFICULTIES[difficulty].goal}₽/час`,
    desc: () => `Средний rate за день ≥ ${DIFFICULTIES[difficulty].goal}₽/час`,
    calc: (ctx) => ({ progress: ctx.todayRate >= ctx.goal ? 1 : 0, target: 1 }),
    reward: '🎲 +1 реролл лайф-квеста', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'rate_1200', icon: '🚀', title: 'Турборежим: 1200₽/час',
    desc: 'Средний rate за день ≥ 1200₽/час',
    calc: (ctx) => ({ progress: ctx.todayRate >= 1200 ? 1 : 0, target: 1 }),
    reward: '⚡ Скорость — твоя суперсила', bonus: null
  },
  {
    id: 'rate_1500', icon: '🔥', title: 'На максималках: 1500₽/час',
    desc: 'Средний rate за день ≥ 1500₽/час',
    calc: (ctx) => ({ progress: ctx.todayRate >= 1500 ? 1 : 0, target: 1 }),
    reward: '🎲 +2 реролла лайф-квестов', bonus: { type: 'reroll', amount: 2 }
  },

  // === ПЕРЕРЫВЫ / ДИСЦИПЛИНА ===
  {
    id: 'no_long_break', icon: '⚔️', title: 'Без длинных перерывов',
    desc: 'Ни один перерыв не длиннее 15 минут',
    calc: (ctx) => {
      if (!ctx.isOnShift && ctx.todayShifts.length === 0) return { progress: 0, target: 1 };
      const breaks = activeShift ? activeShift.breaks : [];
      const longBreak = breaks.some(b => ((b.end || Date.now()) - b.start) > 15 * 60000);
      return { progress: longBreak ? 0 : 1, target: 1 };
    },
    reward: '🧘 Мастер фокуса', bonus: null
  },
  {
    id: 'max_2_breaks', icon: '🎖️', title: 'Минимум перерывов',
    desc: 'Не более 2 перерывов за смену',
    calc: (ctx) => {
      if (!ctx.isOnShift && ctx.todayShifts.length === 0) return { progress: 0, target: 1 };
      const breakCount = activeShift ? activeShift.breaks.length + (activeShift.currentBreak ? 1 : 0) : 0;
      return { progress: breakCount <= 2 ? 1 : 0, target: 1 };
    },
    reward: '🏆 Железная воля', bonus: null
  },

  // === СМЕНЫ / СЕРИИ ===
  {
    id: 'two_shifts', icon: '🔄', title: 'Двойной удар',
    desc: 'Закрой 2 смены за один день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayShifts.length, 2), target: 2 }),
    reward: '🎲 +1 реролл лайф-квеста', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'early_bird', icon: '🌅', title: 'Ранняя пташка',
    desc: 'Начни смену до 9:00',
    calc: (ctx) => {
      const startedEarly = ctx.isOnShift && activeShift && new Date(activeShift.startTime).getHours() < 9;
      const hadEarly = ctx.todayShifts.some(s => s.note && s.note.includes('Начало:') && parseInt(s.note.split('Начало:')[1]) < 9);
      return { progress: (startedEarly || hadEarly) ? 1 : 0, target: 1 };
    },
    reward: '☀️ Утро вечера мудренее', bonus: null
  },
  {
    id: 'quick_start', icon: '⚡', title: 'Быстрый старт',
    desc: 'Заработай 1000₽ за первые 1.5 часа',
    calc: (ctx) => {
      if (ctx.totalHours <= 1.5 && ctx.todayEarned >= 1000) return { progress: 1, target: 1 };
      if (ctx.totalHours > 1.5 && ctx.todayEarned >= 1000) return { progress: 1, target: 1 };
      return { progress: Math.min(ctx.todayEarned, 1000), target: 1000 };
    },
    reward: '⚡ Разгон взят!', bonus: null
  },
  {
    id: 'consistent_rate', icon: '📊', title: 'Стабильность',
    desc: 'Все смены сегодня с rate ≥ 900₽/час',
    calc: (ctx) => {
      if (ctx.todayShifts.length === 0) return { progress: 0, target: 1 };
      const allGood = ctx.todayShifts.every(s => s.hours > 0 && (s.earned / s.hours) >= 900);
      return { progress: allGood ? 1 : 0, target: 1 };
    },
    reward: '🎲 +1 реролл лайф-квеста', bonus: { type: 'reroll', amount: 1 }
  },
];

function generateQuests() {
  const goal = DIFFICULTIES[difficulty].goal;
  const today = todayStr();
  const todayShifts = shifts.filter(s => s.date === today);
  const todayEarned = todayShifts.reduce((s, x) => s + x.earned, 0);
  const todayHours = todayShifts.reduce((s, x) => s + x.hours, 0);
  const todayRate = todayHours > 0 ? Math.round(todayEarned / todayHours) : 0;

  const isOnShift = !!activeShift;
  const workMs = isOnShift ? getWorkMs() : 0;
  const workHours = workMs / 3600000;
  const totalHours = todayHours + workHours;

  const ctx = { isOnShift, todayShifts, todayEarned, todayHours, todayRate, totalHours, goal, workHours };

  let hash = 0;
  for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const shuffled = [...SHIFT_QUEST_POOL].sort((a, b) => {
    let ha = hash, hb = hash;
    for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
    for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
    return (ha % 10000) - (hb % 10000);
  });

  const startQuest = SHIFT_QUEST_POOL.find(q => q.id === 'start_shift');
  const others = shuffled.filter(q => q.id !== 'start_shift').slice(0, 5);
  const selectedPool = [startQuest, ...others];

  return selectedPool.map(q => {
    const { progress, target } = q.calc(ctx);
    return {
      id: q.id,
      icon: q.icon,
      title: typeof q.title === 'function' ? q.title() : q.title,
      desc: typeof q.desc === 'function' ? q.desc() : q.desc,
      progress, target,
      reward: q.reward,
      bonus: q.bonus
    };
  });
}

function getWorkMs() {
  if (!activeShift) return 0;
  const now = Date.now();
  const totalMs = now - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + ((b.end || now) - b.start), 0)
    + (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0);
  return totalMs - breakMs;
}

function renderQuests() {
  const quests = generateQuests();
  const container = document.getElementById('questList');
  container.innerHTML = quests.map(q => {
    const pct = Math.min((q.progress / q.target) * 100, 100);
    const done = pct >= 100;
    const progressText = q.target <= 1
      ? (done ? '✅ Выполнено' : '⬜ Не выполнено')
      : (q.target >= 1000 ? `${Math.floor(q.progress).toLocaleString('ru-RU')} / ${q.target.toLocaleString('ru-RU')}` : `${q.progress.toFixed(1)} / ${q.target}`);
    return `<div class="quest-item ${done ? 'completed' : ''}">
      <div class="quest-header">
        <div class="quest-title">${q.icon} ${q.title}</div>
        <div class="quest-reward">${q.reward}</div>
      </div>
      <div class="quest-progress"><div class="quest-fill ${done ? 'done' : 'active'}" style="width:${pct}%"></div></div>
      <div class="quest-text">${q.desc} — ${progressText}</div>
    </div>`;
  }).join('');
}

// ====== SHOP SYSTEM ======
function getShopPurchases() {
  try { return JSON.parse(localStorage.getItem('ozon_shop_purchases') || '{}'); } catch(e) { return {}; }
}
function saveShopPurchases(data) {
  localStorage.setItem('ozon_shop_purchases', JSON.stringify(data));
  schedulePushProgress();
}

function getShopOwned(itemId) {
  const p = getShopPurchases();
  return !!p[itemId];
}

// Мистери-бокс: случайный приз. Записывает эффект прямо в boosts
// (вызывающий сам сохраняет объект в localStorage).
function rollMysteryBox(boosts, today) {
  const roll = Math.random();
  if (roll < 0.35) {
    const amount = Math.random() < 0.5 ? 1 : 2;
    if (boosts.extra_reroll_date !== today) { boosts.extra_reroll_date = today; boosts.extra_reroll_count = 0; }
    boosts.extra_reroll_count = (boosts.extra_reroll_count || 0) + amount;
    return `+${amount} реролл лайф-квестов!`;
  }
  if (roll < 0.60) {
    const bonus = [30, 50, 80][Math.floor(Math.random() * 3)];
    const xpData = getLifeXP();
    xpData.total += bonus;
    saveLifeXP(xpData);
    return `+${bonus} XP назад!`;
  }
  if (roll < 0.80) {
    boosts.double_xp = today;
    return 'Двойной XP на сегодня!';
  }
  if (roll < 0.95) {
    if (boosts.shift_reroll_date !== today) { boosts.shift_reroll_date = today; boosts.shift_reroll_count = 0; }
    boosts.shift_reroll_count = (boosts.shift_reroll_count || 0) + 1;
    return '+1 реролл квеста смены!';
  }
  const shields = Array.isArray(boosts.streak_shields) ? boosts.streak_shields : [];
  if (!shields.includes(today)) shields.push(today);
  boosts.streak_shields = shields;
  return 'ДЖЕКПОТ: защита страйка! 🛡';
}

function getShopExtraRerolls() {
  const today = todayStr();
  try {
    const boosts = JSON.parse(localStorage.getItem('ozon_shop_boosts') || '{}');
    if (boosts.extra_reroll_date === today) return boosts.extra_reroll_count || 0;
  } catch(e) {}
  return 0;
}

function shopBuyItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const xpData = getLifeXP();
  if (xpData.total < item.price) {
    showToast('❌ Недостаточно XP!', 'error');
    return;
  }

  // Non-consumable: check if already owned
  if (!item.consumable) {
    const purchases = getShopPurchases();
    if (purchases[itemId]) {
      showToast('Уже куплено!', 'warn');
      return;
    }
    purchases[itemId] = true;
    saveShopPurchases(purchases);
    // Apply theme if purchased
    if (item.cat === 'theme') {
      applyTheme(itemId);
      localStorage.setItem('ozon_active_theme', itemId);
      schedulePushProgress();
    }
  }

  // Deduct XP
  xpData.total -= item.price;
  saveLifeXP(xpData);

  // Apply consumable effects
  if (item.consumable) {
    const today = todayStr();
    const boosts = JSON.parse(localStorage.getItem('ozon_shop_boosts') || '{}');

    if (item.id === 'extra_reroll_1' || item.id === 'extra_reroll_3') {
      const amount = item.id === 'extra_reroll_1' ? 1 : 3;
      if (boosts.extra_reroll_date !== today) {
        boosts.extra_reroll_date = today;
        boosts.extra_reroll_count = 0;
      }
      boosts.extra_reroll_count = (boosts.extra_reroll_count || 0) + amount;
      showToast(`🎲 +${amount} реролл! Используй сегодня`, 'success');
    } else if (item.id === 'double_xp') {
      boosts.double_xp = today;
      showToast('⚡ Двойной XP активирован на сегодня!', 'success');
    } else if (item.id === 'cat_choice') {
      openCategoryPicker(false);
    } else if (item.id === 'streak_shield') {
      // Щит ставим на сегодня: calcStreak учитывает защищённые дни.
      const shields = Array.isArray(boosts.streak_shields) ? boosts.streak_shields : [];
      if (!shields.includes(today)) shields.push(today);
      boosts.streak_shields = shields;
      showToast('🛡 Страйк защищён — пропуск не сожжёт серию', 'success');
    } else if (item.id === 'shift_reroll') {
      if (boosts.shift_reroll_date !== today) {
        boosts.shift_reroll_date = today;
        boosts.shift_reroll_count = 0;
      }
      boosts.shift_reroll_count = (boosts.shift_reroll_count || 0) + 1;
      showToast('🔄 +1 реролл квеста смены на сегодня', 'success');
    } else if (item.id === 'mystery_box') {
      const prize = rollMysteryBox(boosts, today);
      showToast(`🎁 ${prize}`, 'success');
    }

    localStorage.setItem('ozon_shop_boosts', JSON.stringify(boosts));
  schedulePushProgress();
  } else {
    showToast(`✅ ${item.icon} ${item.name} куплено!`, 'success');
  }

  rainCoins(5);
  renderShop();
  renderLifeStats();
  renderLifeQuests();
  // Update wallet badge if title purchased
  render();
}

function getActiveTitle() {
  const purchases = getShopPurchases();
  if (purchases.title_sigma) return '🐺 Сигма';
  if (purchases.title_legend) return '👑 Легенда';
  if (purchases.title_beast) return '🦁 Зверюга';
  if (purchases.title_grinder) return '💎 Грайндер';
  return null;
}

// ====== THEME SYSTEM ======
function applyTheme(themeId) {
  const themes = {
    theme_neon: { gold:'#ff00ff', purple:'#00ffff', cyan:'#ff00ff', bgDark:'#0a0014', goldDark:'#cc00cc' },
    theme_ocean: { gold:'#00bcd4', purple:'#0288d1', cyan:'#4dd0e1', bgDark:'#0a1628', goldDark:'#00838f' },
    theme_fire: { gold:'#ff6d00', purple:'#ff3d00', cyan:'#ffab40', bgDark:'#1a0a00', goldDark:'#e65100' },
    theme_forest: { gold:'#66bb6a', purple:'#2e7d32', cyan:'#81c784', bgDark:'#0a1a0a', goldDark:'#388e3c' },
    theme_sakura: { gold:'#f48fb1', purple:'#ec407a', cyan:'#f8bbd0', bgDark:'#1a0a14', goldDark:'#c2185b' },
    theme_cyber: { gold:'#76ff03', purple:'#00e676', cyan:'#69f0ae', bgDark:'#001a00', goldDark:'#64dd17' },
    theme_royal: { gold:'#ce93d8', purple:'#9c27b0', cyan:'#e1bee7', bgDark:'#140a1a', goldDark:'#7b1fa2' },
    theme_midnight: { gold:'#90caf9', purple:'#5c6bc0', cyan:'#b3e5fc', bgDark:'#060818', goldDark:'#1565c0' },
    theme_sunset: { gold:'#ffab40', purple:'#ff7043', cyan:'#ffcc02', bgDark:'#1a0f05', goldDark:'#ef6c00' },
    theme_hacker: { gold:'#00ff41', purple:'#00cc33', cyan:'#33ff77', bgDark:'#000a00', goldDark:'#00b330' },
  };
  const t = themes[themeId];
  if (!t) return;
  const r = document.documentElement.style;
  r.setProperty('--gold', t.gold);
  r.setProperty('--gold-dark', t.goldDark);
  r.setProperty('--purple', t.purple);
  r.setProperty('--cyan', t.cyan);
  r.setProperty('--bg-dark', t.bgDark);
  document.body.style.background = t.bgDark;
}

function resetTheme() {
  const r = document.documentElement.style;
  r.removeProperty('--gold'); r.removeProperty('--gold-dark');
  r.removeProperty('--purple'); r.removeProperty('--cyan');
  r.removeProperty('--bg-dark');
  document.body.style.background = '';
  localStorage.removeItem('ozon_active_theme');
}

function loadSavedTheme() {
  const saved = localStorage.getItem('ozon_active_theme');
  if (saved) applyTheme(saved);
}

function renderShop() {
  const xpData = getLifeXP();
  const balance = xpData.total;
  const purchases = getShopPurchases();

  document.getElementById('shopXpBalance').textContent = balance;

  const container = document.getElementById('shopGrid');
  const categories = { boost: '⚡ Бусты', cosmetic: '🎨 Титулы', reward: '🎁 Награды', theme: '🎨 Темы' };
  let html = '';

  for (const [catKey, catName] of Object.entries(categories)) {
    const items = SHOP_ITEMS.filter(i => i.cat === catKey);
    html += `<div class="shop-category-title">${catName}</div>`;

    for (const item of items) {
      const owned = !item.consumable && purchases[item.id];
      const canAfford = balance >= item.price;
      const activeTheme = localStorage.getItem('ozon_active_theme');
      const isActiveTheme = item.cat === 'theme' && activeTheme === item.id;
      const itemClass = owned ? 'owned' : (!canAfford ? 'locked' : '');

      let btnHtml;
      if (item.cat === 'theme' && owned) {
        if (isActiveTheme) {
          btnHtml = `<button class="shop-item-price bought" onclick="resetTheme();renderShop()" style="font-size:11px">🔄 Сброс</button>`;
        } else {
          btnHtml = `<button class="shop-item-price buy" onclick="applyTheme('${item.id}');localStorage.setItem('ozon_active_theme','${item.id}');schedulePushProgress();renderShop()" style="font-size:11px">🎨 Надеть</button>`;
        }
      } else {
        const btnClass = owned ? 'bought' : (canAfford ? 'buy' : 'expensive');
        const btnText = owned ? '✅' : `${item.price} XP`;
        const btnDisabled = owned || !canAfford ? 'pointer-events:none' : '';
        btnHtml = `<button class="shop-item-price ${btnClass}" onclick="shopBuyItem('${item.id}')" style="${btnDisabled}">${btnText}</button>`;
      }

      html += `<div class="shop-item ${itemClass}">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
        </div>
        ${btnHtml}
      </div>`;
    }
  }

  container.innerHTML = html;
}

// ====== SUPABASE OPS ======
async function loadShifts() {
  setSyncStatus('syncing', '⏳ Загрузка...');
  if (sb) {
    try {
      const { data, error } = await sb.from('shifts').select('*').order('date', { ascending: false });
      if (error) throw error;
      shifts = data.filter(s => !isProgressRow(s)).map(enrichShift);
      mergePendingIntoShifts();
      backupToLocal();
      setSyncStatus('ok', '☁️ Синхронизировано');
      return;
    } catch (e) {
      console.error('Supabase load error:', e);
      setSyncStatus('error', '❌ Облако недоступно');
    }
  }
  try {
    const local = JSON.parse(localStorage.getItem('ozon_tracker'));
    if (local && Array.isArray(local.shifts)) {
      shifts = local.shifts.filter(s => !isProgressRow(s)).map(enrichShift);
      setSyncStatus('warn', '📱 Локальные данные');
      showToast('Загружены локальные данные', 'warn');
    }
  } catch(e2) { console.error('Local load error:', e2); }
}

// FIX: смены из офлайн-очереди раньше исчезали с экрана после перезагрузки страницы
function mergePendingIntoShifts() {
  const pending = getPendingShifts();
  for (const p of pending) {
    const { _queuedAt, ...payload } = p;
    const dup = shifts.some(s => s.date === payload.date && s.hours == payload.hours && s.earned == payload.earned);
    if (!dup) shifts.push(enrichShift({ ...payload, id: 'local_' + (_queuedAt || Date.now()), _pending: true }));
  }
  shifts.sort((a, b) => b.date.localeCompare(a.date));
}

async function insertShift(shift) {
  setSyncStatus('syncing', '⏳ Сохранение...');
  const payload = {
    date: shift.date, hours: shift.hours, earned: shift.earned,
    note: shift.note || '', difficulty: difficulty
  };
  if (sb) {
    try {
      const { data, error } = await sb.from('shifts').insert([payload]).select();
      if (error) throw error;
      const s = enrichShift(data[0]);
      shifts.unshift(s);
      shifts.sort((a, b) => b.date.localeCompare(a.date));
      backupToLocal();
      setSyncStatus('ok', '☁️ Сохранено ✓');
      return true;
    } catch (e) {
      console.error('Insert error:', e);
    }
  }
  // FIX: раньше смена просто ТЕРЯЛАСЬ, если облако недоступно.
  // Теперь кладём в локальную очередь и доливаем в Supabase при следующем запуске.
  queuePendingShift(payload);
  const localShift = enrichShift({ ...payload, id: 'local_' + Date.now(), _pending: true });
  shifts.unshift(localShift);
  shifts.sort((a, b) => b.date.localeCompare(a.date));
  backupToLocal();
  setSyncStatus('warn', '📱 Сохранено локально');
  showToast('Облако недоступно — смена сохранена на телефоне, зальётся позже', 'warn');
  return true;
}

// ====== OFFLINE QUEUE ======
function getPendingShifts() {
  try { return JSON.parse(localStorage.getItem('ozon_pending_shifts') || '[]'); } catch(e) { return []; }
}
function queuePendingShift(payload) {
  const q = getPendingShifts();
  q.push({ ...payload, _queuedAt: Date.now() });
  localStorage.setItem('ozon_pending_shifts', JSON.stringify(q));
}
async function flushPendingShifts() {
  const q = getPendingShifts();
  if (!q.length || !sb) return;
  const stillPending = [];
  let synced = 0;
  for (const item of q) {
    const { _queuedAt, ...payload } = item;
    try {
      // Защита от дублей: смена могла уйти в облако, а ответ потеряться
      // по дороге (обрыв сети) — тогда повторная заливка создала бы копию.
      const { data: exist } = await sb.from('shifts').select('id')
        .eq('date', payload.date).eq('hours', payload.hours).eq('earned', payload.earned).limit(1);
      if (exist && exist.length) { synced++; continue; }

      const { error } = await sb.from('shifts').insert([payload]);
      if (error) throw error;
      synced++;
    } catch (e) {
      console.error('Flush error:', e);
      stillPending.push(item);
    }
  }
  localStorage.setItem('ozon_pending_shifts', JSON.stringify(stillPending));
  if (synced > 0) {
    showToast(`☁️ Залито в облако: ${synced} ${synced === 1 ? 'смена' : 'смен'}`, 'success');
    await loadShifts();
    render();
  }
}


async function updateShift(id, updates) {
  if (typeof id === 'string' && id.startsWith('local_')) {
    showToast('Смена ещё не в облаке — дождись синхронизации', 'warn');
    return false;
  }
  setSyncStatus('syncing', '⏳ Обновление...');
  if (!sb) { setSyncStatus('error', '❌ Нет соединения'); showToast('Supabase недоступен', 'error'); return false; }
  try {
    const { data, error } = await sb.from('shifts').update(updates).eq('id', id).select();
    if (error) throw error;
    const idx = shifts.findIndex(s => s.id === id);
    if (idx >= 0) {
      shifts[idx] = enrichShift(data[0]);
    }
    shifts.sort((a, b) => b.date.localeCompare(a.date));
    backupToLocal();
    setSyncStatus('ok', '☁️ Обновлено ✓');
    return true;
  } catch (e) {
    console.error('Update error:', e);
    setSyncStatus('error', '❌ Ошибка обновления');
    showToast('Ошибка обновления', 'error');
    return false;
  }
}

async function removeShift(id) {
  if (!confirm('Удалить эту смену?')) return;
  // FIX: локальную (не синхронизированную) смену удаляем из очереди, а не из облака
  if (typeof id === 'string' && id.startsWith('local_')) {
    const target = shifts.find(s => s.id === id);
    if (target) {
      const q = getPendingShifts().filter(p =>
        !(p.date === target.date && p.hours == target.hours && p.earned == target.earned));
      localStorage.setItem('ozon_pending_shifts', JSON.stringify(q));
    }
    shifts = shifts.filter(s => s.id !== id);
    backupToLocal();
    showToast('Смена удалена', 'success');
    render();
    return;
  }
  setSyncStatus('syncing', '⏳ Удаление...');
  if (!sb) { setSyncStatus('error', '❌ Нет соединения'); return; }
  try {
    const { error } = await sb.from('shifts').delete().eq('id', id);
    if (error) throw error;
    shifts = shifts.filter(s => s.id !== id);
    backupToLocal();
    setSyncStatus('ok', '☁️ Удалено ✓');
    showToast('Смена удалена', 'success');
    render();
  } catch (e) {
    console.error('Delete error:', e);
    setSyncStatus('error', '❌ Ошибка удаления');
    showToast('Ошибка удаления', 'error');
  }
}

function backupToLocal() {
  try { localStorage.setItem('ozon_tracker', JSON.stringify({ shifts, difficulty })); } catch(e) {}
}

// ====== PROGRESS SYNC (v4.1) ======
// ПРИЧИНА БАГА: весь прогресс (лайф-XP, покупки, темы, планы) жил ТОЛЬКО в
// localStorage. localStorage привязан к конкретному браузеру/контейнеру, поэтому
// запуск как отдельное приложение (или другой браузер / переустановка) открывал
// ПУСТОЕ хранилище — XP и уровень выглядели «сброшенными».
// Лечение: прогресс уезжает в облако и подтягивается на любом устройстве.

const PROGRESS_KEYS = [
  'ozon_shift_meta',
  'ozon_month_goal',
  'ozon_life_xp',
  'ozon_shop_purchases',
  'ozon_shop_boosts',
  'ozon_active_theme',
  'ozon_calendar_plan',
  'ozon_shift_bonuses',
  'ozon_weekly_cat',
  'ozon_chosen_category',
  'ozon_difficulty',
  'ozon_active_shift',
  'ozon_life_quests'
];

// Ключи, где значение — накопительный набор: объединяем, а не перетираем.
// Покупки в магазине нельзя терять: купил тему на телефоне, зашёл с ноута —
// обе покупки должны остаться.
const PROGRESS_UNION_KEYS = ['ozon_shop_purchases', 'ozon_shift_meta'];

// Когда локальное значение последний раз менялось (на этом устройстве).
// Без этого облако умеет только «залить, если локально пусто», и любое
// изменение на втором устройстве молча терялось.
function markLocalChange() {
  try { localStorage.setItem('ozon_progress_ts', String(Date.now())); } catch (e) {}
}
function getLocalTs() {
  return parseInt(localStorage.getItem('ozon_progress_ts') || '0', 10) || 0;
}

// Где хранится прогресс в облаке:
//   1) таблица app_state — правильный вариант (нужен один раз применённый SQL);
//   2) если её нет — служебная строка в уже существующей таблице shifts.
// Второй путь нужен потому, что создать таблицу анонимным ключом нельзя, а
// прогресс обязан быть общим для установленного приложения и сайта: у PWA
// отдельный localStorage, и без облака XP расходится.
// Служебная строка: date = PROGRESS_ROW_DATE, note = JSON прогресса.
// Она отфильтрована из истории, статистики и календаря (см. isProgressRow).
const PROGRESS_ROW_DATE = '1970-01-01';
const PROGRESS_ROW_TAG = '__PROGRESS__';

let cloudStateOk = false;
let progressBackend = null;   // 'app_state' | 'shifts' | null
let progressRowId = null;

function isProgressRow(s) {
  return !!s && (s.date === PROGRESS_ROW_DATE ||
                 (typeof s.note === 'string' && s.note.startsWith(PROGRESS_ROW_TAG)));
}

function collectProgress() {
  const out = {};
  for (const k of PROGRESS_KEYS) {
    const v = localStorage.getItem(k);
    // null отправляем ЯВНО — это значит «ключ удалён». Иначе облако хранило бы
    // старое значение и, например, завершённая смена возвращалась бы из облака.
    out[k] = v;
  }
  out.__ts = getLocalTs();
  return out;
}

// Объединение словарей-наборов (покупки): true побеждает отсутствие.
function mergeUnion(localRaw, cloudRaw) {
  let a = {}, b = {};
  try { a = JSON.parse(localRaw || '{}'); } catch (e) {}
  try { b = JSON.parse(cloudRaw || '{}'); } catch (e) {}
  if (typeof a !== 'object' || a === null) a = {};
  if (typeof b !== 'object' || b === null) b = {};
  return JSON.stringify(Object.assign({}, b, a));
}

// Слияние XP. По умолчанию берём максимум — чтобы устройство с пустым
// localStorage не затёрло накопленный прогресс.
// НО если это устройство заведомо свежее облака (preferLocal), доверяем его
// total: иначе снятая галочка квеста возвращала бы XP назад из облака.
function mergeLifeXP(localRaw, cloudRaw, preferLocal = false) {
  let a = {}, b = {};
  try { a = JSON.parse(localRaw || '{}'); } catch(e) {}
  try { b = JSON.parse(cloudRaw || '{}'); } catch(e) {}

  const hist = Array.from(new Set([...(a.history || []), ...(b.history || [])]));
  const cats = {};
  for (const src of [a.cats || {}, b.cats || {}]) {
    for (const [k, v] of Object.entries(src)) cats[k] = Math.max(cats[k] || 0, v || 0);
  }

  const hasLocal = localRaw !== null && localRaw !== undefined && a && typeof a.total === 'number';
  const total = (preferLocal && hasLocal) ? a.total : Math.max(a.total || 0, b.total || 0);

  return JSON.stringify({
    total,
    cats: (preferLocal && hasLocal && a.cats) ? a.cats : cats,
    history: hist.slice(-500),
    questsDone: (preferLocal && hasLocal) ? (a.questsDone || 0) : Math.max(a.questsDone || 0, b.questsDone || 0),
    daysDone: Math.max(a.daysDone || 0, b.daysDone || 0),
    lastDay: (a.lastDay || '') > (b.lastDay || '') ? a.lastDay : b.lastDay
  });
}

function applyProgress(cloud) {
  if (!cloud || typeof cloud !== 'object') return false;
  let changed = false;

  // Кто свежее: это устройство или облако. PROGRESS_KEYS без своей стратегии
  // слияния разруливаются по времени последнего изменения.
  const cloudTs = parseInt(cloud.__ts || 0, 10) || 0;
  const cloudIsNewer = cloudTs > getLocalTs();

  for (const k of PROGRESS_KEYS) {
    const cloudVal = cloud[k];
    if (cloudVal === undefined) continue;
    const localVal = localStorage.getItem(k);

    // Облако говорит «удалено» и оно свежее — убираем и у себя.
    if (cloudVal === null) {
      if (cloudIsNewer && localVal !== null) { localStorage.removeItem(k); changed = true; }
      continue;
    }

    if (k === 'ozon_life_xp') {
      // Локальное свежее облака → доверяем ему (снятие галочки = минус XP).
      const merged = mergeLifeXP(localVal, cloudVal, !cloudIsNewer);
      if (merged !== localVal) { localStorage.setItem(k, merged); changed = true; }
      continue;
    }

    if (PROGRESS_UNION_KEYS.includes(k)) {
      const merged = mergeUnion(localVal, cloudVal);
      if (merged !== localVal) { localStorage.setItem(k, merged); changed = true; }
      continue;
    }

    // Пусто локально — всегда берём облако. Иначе — только если облако свежее.
    if (localVal === null || (cloudIsNewer && cloudVal !== localVal)) {
      localStorage.setItem(k, cloudVal);
      changed = true;
    }
  }

  if (cloudIsNewer && cloudTs) {
    try { localStorage.setItem('ozon_progress_ts', String(cloudTs)); } catch (e) {}
  }
  return changed;
}

async function pullProgress() {
  if (!sb) return false;

  // 1) штатный путь — таблица app_state
  try {
    const { data, error } = await sb.from('app_state').select('value').eq('key', 'progress').maybeSingle();
    if (error) throw error;
    cloudStateOk = true;
    progressBackend = 'app_state';
    if (data && data.value) return applyProgress(data.value);
    return false;
  } catch (e) {
    console.warn('app_state unavailable, using shifts row:', e.message || e);
  }

  // 2) фолбэк — служебная строка в shifts
  try {
    const { data, error } = await sb.from('shifts')
      .select('id,note').eq('date', PROGRESS_ROW_DATE)
      .order('id', { ascending: true });
    if (error) throw error;
    cloudStateOk = true;
    progressBackend = 'shifts';

    const rows = data || [];
    if (!rows.length) { progressRowId = null; return false; }

    // если из-за гонки записей строк несколько — оставляем первую, лишние убираем
    progressRowId = rows[0].id;
    if (rows.length > 1) {
      const extra = rows.slice(1).map(r => r.id);
      sb.from('shifts').delete().in('id', extra).then(() => {}, () => {});
    }

    const raw = String(rows[0].note || '');
    if (!raw.startsWith(PROGRESS_ROW_TAG)) return false;
    return applyProgress(JSON.parse(raw.slice(PROGRESS_ROW_TAG.length)));
  } catch (e) {
    cloudStateOk = false;
    progressBackend = null;
    console.warn('Progress pull skipped:', e.message || e);
    return false;
  }
}

let pushTimer = null;
function schedulePushProgress() {
  markLocalChange();   // штамп ставим всегда, даже если облака нет
  if (!sb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushProgress, 1200);
}

async function pushProgress() {
  if (!sb) return;
  const payload = collectProgress();

  // 1) штатный путь
  if (progressBackend !== 'shifts') {
    try {
      const { error } = await sb.from('app_state')
        .upsert({ key: 'progress', value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      cloudStateOk = true;
      progressBackend = 'app_state';
      renderCloudSyncTag();
      return;
    } catch (e) {
      console.warn('app_state push failed, using shifts row:', e.message || e);
    }
  }

  // 2) фолбэк в shifts
  try {
    const note = PROGRESS_ROW_TAG + JSON.stringify(payload);
    const row = { date: PROGRESS_ROW_DATE, hours: 0, earned: 0, note, difficulty: 'hard' };

    if (progressRowId == null) {
      // не затираем чужую строку: сначала ищем существующую
      const { data: found } = await sb.from('shifts').select('id').eq('date', PROGRESS_ROW_DATE).limit(1);
      if (found && found.length) progressRowId = found[0].id;
    }

    if (progressRowId != null) {
      const { error } = await sb.from('shifts').update({ note }).eq('id', progressRowId);
      if (error) throw error;
    } else {
      const { data, error } = await sb.from('shifts').insert(row).select('id').single();
      if (error) throw error;
      progressRowId = data.id;
    }
    cloudStateOk = true;
    progressBackend = 'shifts';
    renderCloudSyncTag();
  } catch (e) {
    cloudStateOk = false;
    console.warn('Progress push skipped:', e.message || e);
    renderCloudSyncTag();
  }
}

function setSyncStatus(type, text) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = 'sync-status ' + type;
  el.textContent = text;
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.style.display = 'none', 500); }
}

// ====== EDIT SHIFT MODAL ======
function openEditModal(id) {
  const shift = shifts.find(s => s.id === id);
  if (!shift) return;
  document.getElementById('editShiftId').value = id;
  document.getElementById('editDate').value = shift.date;
  document.getElementById('editHours').value = shift.hours;
  document.getElementById('editEarned').value = shift.earned;
  document.getElementById('editNote').value = shift.note || '';
  document.getElementById('editShiftModal').classList.add('show');
}

function closeEditModal() {
  document.getElementById('editShiftModal').classList.remove('show');
}

async function saveEditShift() {
  const id = parseInt(document.getElementById('editShiftId').value);
  const date = document.getElementById('editDate').value;
  const hours = parseFloat(document.getElementById('editHours').value);
  const earned = parseFloat(document.getElementById('editEarned').value);
  const note = document.getElementById('editNote').value.trim();

  if (!date || !hours || !earned || hours <= 0 || earned <= 0) {
    showToast('Заполни все поля!', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveEdit');
  btn.disabled = true;
  btn.textContent = '⏳...';

  const ok = await updateShift(id, { date, hours, earned, note });

  btn.disabled = false;
  btn.textContent = '💾 СОХРАНИТЬ';

  if (ok) {
    closeEditModal();
    showToast('✏️ Смена обновлена!', 'success');
    render();
  }
}

async function deleteFromEdit() {
  const id = parseInt(document.getElementById('editShiftId').value);
  closeEditModal();
  await removeShift(id);
}

// ====== CALENDAR ======
let calYear, calMonth, calSelectedDate = null;
const MONTH_NAMES_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function getCalendarPlan() {
  try { return JSON.parse(localStorage.getItem('ozon_calendar_plan') || '{}'); } catch(e) { return {}; }
}
function saveCalendarPlan(plan) {
  localStorage.setItem('ozon_calendar_plan', JSON.stringify(plan));
  schedulePushProgress();
}

function calInit() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

function calChangeMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  calSelectedDate = null;
  renderCalendar();
}

function calSelectDay(dateStr) {
  calSelectedDate = calSelectedDate === dateStr ? null : dateStr;
  renderCalendar();
}

function calMarkSelected(type) {
  if (!calSelectedDate) {
    showToast('Сначала выбери дату на календаре', 'warn');
    return;
  }
  const plan = getCalendarPlan();
  if (type === 'clear') {
    delete plan[calSelectedDate];
    showToast('✕ Отметка убрана', 'success');
  } else if (type === 'dayoff') {
    plan[calSelectedDate] = 'dayoff';
    showToast('🌴 Выходной поставлен!', 'success');
  } else if (type === 'planned') {
    plan[calSelectedDate] = 'planned';
    showToast('📋 Смена запланирована!', 'success');
  }
  saveCalendarPlan(plan);
  renderCalendar();
}

function renderCalendar() {
  const titleEl = document.getElementById('calMonthTitle');
  const gridEl = document.getElementById('calGrid');
  const summaryEl = document.getElementById('calSummary');
  const infoEl = document.getElementById('calSelectedInfo');
  if (!titleEl || !gridEl) return;

  titleEl.textContent = `${MONTH_NAMES_RU[calMonth]} ${calYear}`;

  const plan = getCalendarPlan();

  // FIX: Use local date for today comparison to avoid timezone issues
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Build shift map for this month
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  const monthShifts = {};
  for (const s of shifts) {
    if (s.date && s.date.startsWith(monthPrefix)) {
      if (!monthShifts[s.date]) monthShifts[s.date] = { earned: 0, hours: 0, count: 0 };
      monthShifts[s.date].earned += s.earned;
      monthShifts[s.date].hours += s.hours;
      monthShifts[s.date].count++;
    }
  }

  // First day of month (Monday = 0)
  const firstDay = new Date(calYear, calMonth, 1);
  let startDow = firstDay.getDay() - 1; // Mon=0
  if (startDow < 0) startDow = 6; // Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = '';
  // Empty cells before first day
  for (let i = 0; i < startDow; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const hasShift = !!monthShifts[dateStr];
    const planType = plan[dateStr];
    const isSelected = dateStr === calSelectedDate;

    let classes = 'cal-day';
    if (isToday) classes += ' today';
    if (hasShift) classes += ' has-shift';
    else if (planType === 'dayoff') classes += ' is-dayoff';
    else if (planType === 'planned') classes += ' is-planned';
    if (isSelected) classes += ' selected';

    let icon = '';
    if (hasShift) icon = '💰';
    else if (planType === 'dayoff') icon = '🌴';
    else if (planType === 'planned') icon = '📋';

    let earnedLabel = '';
    if (hasShift) {
      const k = Math.round(monthShifts[dateStr].earned / 1000);
      earnedLabel = `<div class="cal-day-earned">${k}K</div>`;
    }

    html += `<div class="${classes}" onclick="calSelectDay('${dateStr}')">
      <div class="cal-day-num">${d}</div>
      ${icon ? `<div class="cal-day-icon">${icon}</div>` : ''}
      ${earnedLabel}
    </div>`;
  }

  gridEl.innerHTML = html;

  // Selected info
  if (calSelectedDate && calSelectedDate.startsWith(monthPrefix)) {
    infoEl.style.display = '';
    const sd = monthShifts[calSelectedDate];
    const sp = plan[calSelectedDate];

    // FIX: Parse date parts manually to avoid timezone shift
    const parts = calSelectedDate.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dateLabel = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

    if (sd) {
      const rate = sd.hours > 0 ? Math.round(sd.earned / sd.hours) : 0;
      infoEl.innerHTML = `<b>${dateLabel}</b><br>💰 ${sd.earned.toLocaleString('ru-RU')} ₽ · ${sd.hours} ч · ${rate} ₽/час`;
    } else if (sp === 'dayoff') {
      infoEl.innerHTML = `<b>${dateLabel}</b><br>🌴 Выходной`;
    } else if (sp === 'planned') {
      infoEl.innerHTML = `<b>${dateLabel}</b><br>📋 Запланирована смена`;
    } else {
      infoEl.innerHTML = `<b>${dateLabel}</b><br>Пусто — отметь день ниже`;
    }
  } else {
    infoEl.style.display = 'none';
  }

  // Summary for month
  const monthShiftDates = Object.keys(monthShifts);
  const totalEarnedMonth = monthShiftDates.reduce((s, d) => s + monthShifts[d].earned, 0);
  const totalHoursMonth = monthShiftDates.reduce((s, d) => s + monthShifts[d].hours, 0);
  const plannedCount = Object.entries(plan).filter(([k, v]) => k.startsWith(monthPrefix) && v === 'planned').length;
  const dayoffCount = Object.entries(plan).filter(([k, v]) => k.startsWith(monthPrefix) && v === 'dayoff').length;
  const workedCount = monthShiftDates.length;

  summaryEl.innerHTML = `
    <div class="cal-sum-card"><div class="cal-sum-val">${workedCount}</div><div class="cal-sum-lbl">отработано</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${plannedCount}</div><div class="cal-sum-lbl">запланировано</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${dayoffCount}</div><div class="cal-sum-lbl">выходных 🌴</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${totalEarnedMonth > 0 ? Math.round(totalEarnedMonth / 1000) + 'K' : '0'}</div><div class="cal-sum-lbl">₽ за месяц</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${totalHoursMonth.toFixed(0)}</div><div class="cal-sum-lbl">часов</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${totalHoursMonth > 0 ? Math.round(totalEarnedMonth / totalHoursMonth) : 0}</div><div class="cal-sum-lbl">₽/час сред.</div></div>
  `;
}

// ====== INIT ======
async function init() {
  document.getElementById('inputDate').value = todayStr();
  setDifficulty(difficulty, false);

  // Сначала возвращаем потерянный XP локально, потом тянем облако —
  // mergeLifeXP берёт максимум, так что ни одна из сторон не затрётся.
  restoreLostXPOnce();

  try { await loadShifts(); } catch(e) { console.error('Init error:', e); setSyncStatus('error', '❌ Ошибка загрузки'); }

  // FIX: доливаем смены, которые не ушли в облако из-за обрыва связи
  try { await flushPendingShifts(); } catch(e) { console.error('Flush init error:', e); }

  // FIX: подтягиваем прогресс из облака ДО отрисовки — иначе новое
  // устройство/приложение показало бы пустой XP и уровень.
  try { await pullProgress(); } catch(e) { console.error('Progress pull error:', e); }

  // Переменные в памяти были прочитаны ДО синка — перечитываем, иначе
  // активная смена и сложность из облака не попадут на экран.
  try {
    activeShift = JSON.parse(localStorage.getItem('ozon_active_shift') || 'null');
    const d = localStorage.getItem('ozon_difficulty');
    if (d && d !== difficulty) setDifficulty(d, false);
  } catch (e) { console.warn('Re-read after sync failed:', e); }

  // Restore active shift if was running
  if (activeShift) {
    renderActiveShift();
    startTimer();
  } else {
    renderActiveShift();
  }

  render();
  renderLifeQuests();
  renderLifeStats();
  renderMotivationTip();
  calInit();
  checkAndGrantBonuses();
  loadSavedTheme();
  checkWeeklyFreeChoice();
  renderVersionTag();
  renderCloudSyncTag();
  hideLoading();
  // Без markLocalChange: простое открытие приложения не делает это устройство
  // «свежее» облака, иначе старый клиент затирал бы новые данные.
  if (sb) pushProgress();
}

// Честно говорим, работает ли облако. Если таблица app_state не создана,
// прогресс остаётся только на этом устройстве — и в установленной PWA
// (у неё отдельное хранилище) XP будет отличаться от браузера.
function renderCloudSyncTag() {
  const el = document.getElementById('cloudSyncTag');
  if (!el) return;
  if (cloudStateOk) {
    el.className = 'build-sync ok';
    el.textContent = progressBackend === 'shifts'
      ? '☁️ прогресс в облаке (shifts)'
      : '☁️ прогресс в облаке';
  } else {
    el.className = 'build-sync warn';
    el.textContent = '⚠️ только на устройстве';
  }
}

// FIX: бесплатный выбор категории раз в неделю никто не показывал — теперь напоминаем
function checkWeeklyFreeChoice() {
  const wc = getWeeklyCategoryChoice();
  if (!wc.used) {
    setTimeout(() => showToast('🎁 Доступен бесплатный выбор категории лайф-квестов!', 'success'), 1800);
  }
}

// FIX: возврат в приложение после сна телефона — досинхронизируем и обновляем экран
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    flushPendingShifts().catch(e => console.error(e));
    // Досинхронизируем прогресс: в установленной PWA страница живёт долго,
    // без этого XP, заработанный в браузере, тут бы не появился.
    pullProgress().then(changed => {
      if (changed) { renderLifeQuests(); renderLifeStats(); render(); }
      renderCloudSyncTag();
    }).catch(e => console.error(e));
    if (activeShift) { updateTimer(); renderQuests(); }
  }
});
window.addEventListener('online', () => {
  showToast('🌐 Сеть вернулась — синхронизирую', 'success');
  flushPendingShifts().catch(e => console.error(e));
});

// ====== DIFFICULTY ======
function setDifficulty(diff, doRender = true) {
  difficulty = diff;
  localStorage.setItem('ozon_difficulty', diff);
  schedulePushProgress();
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === diff));
  if (doRender) render();
}

// ====== ADD SHIFT ======
async function addShift() {
  const date = document.getElementById('inputDate').value;
  const hours = parseFloat(document.getElementById('inputHours').value);
  const earned = parseFloat(document.getElementById('inputEarned').value);
  const note = document.getElementById('inputNote').value.trim();

  if (!date || !hours || !earned || hours <= 0 || earned <= 0) {
    document.querySelector('.btn-add').style.animation = 'shake 0.4s ease';
    setTimeout(() => document.querySelector('.btn-add').style.animation = '', 400);
    showToast('Заполни дату, часы и заработок', 'error');
    return;
  }

  if (shifts.some(s => s.date === date)) {
    if (!confirm(`Смена на ${date} уже есть. Добавить ещё одну?`)) return;
  }

  const btn = document.getElementById('btnAdd');
  btn.disabled = true;
  btn.textContent = '⏳ Сохраняю...';

  const ok = await insertShift({ date, hours, earned, note });

  btn.disabled = false;
  btn.textContent = '🪙 ДОБАВИТЬ';

  if (ok) {
    document.getElementById('inputHours').value = '';
    document.getElementById('inputEarned').value = '';
    document.getElementById('inputNote').value = '';
    const coinCount = getShopOwned('rain_upgrade') ? Math.min(Math.floor(earned / 300), 50) : Math.min(Math.floor(earned / 500), 30);
    rainCoins(coinCount);
    render();
    closeManualAdd();
    switchTab('live');
    setTimeout(() => checkAndGrantBonuses(), 800);
  }
}

// ====== COIN RAIN ======
function rainCoins(count) {
  const container = document.getElementById('coinRain');
  const coins = ['🪙', '💰', '💵', '✨'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const coin = document.createElement('div');
      coin.className = 'coin';
      coin.textContent = coins[Math.floor(Math.random() * coins.length)];
      coin.style.left = Math.random() * 100 + '%';
      coin.style.animationDuration = (1 + Math.random() * 1.5) + 's';
      coin.style.fontSize = (20 + Math.random() * 20) + 'px';
      container.appendChild(coin);
      setTimeout(() => coin.remove(), 3000);
    }, i * 80);
  }
}

// ====== DATA EXPORT ======
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportDataCSV() {
  if (!shifts.length) { showToast('Нет смен для экспорта', 'warn'); return; }
  const rows = [['Дата', 'Часы', 'Заработок', 'Ставка', 'Заметка']];
  for (const s of [...shifts].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([s.date, s.hours, s.earned, s.rate, (s.note || '').replace(/"/g, '""')]);
  }
  const totalE = shifts.reduce((a, s) => a + s.earned, 0);
  const totalH = shifts.reduce((a, s) => a + s.hours, 0);
  rows.push(['ИТОГО', totalH.toFixed(1), totalE, totalH > 0 ? Math.round(totalE / totalH) : 0, '']);
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
  downloadFile(`ozon_smeny_${todayStr()}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('📤 CSV скачан', 'success');
}

function exportDataJSON() {
  const dump = {
    exportedAt: new Date().toISOString(),
    version: '4.1',
    shifts,
    pending: getPendingShifts(),
    difficulty,
    lifeXP: getLifeXP(),
    shopPurchases: getShopPurchases(),
    calendarPlan: getCalendarPlan(),
    activeTheme: localStorage.getItem('ozon_active_theme') || null
  };
  downloadFile(`ozon_backup_${todayStr()}.json`, JSON.stringify(dump, null, 2), 'application/json');
  showToast('💾 Полный бэкап скачан', 'success');
}

// FIX: бэкап можно было СКАЧАТЬ, но нельзя было ЗАГРУЗИТЬ обратно —
// при потере localStorage файл был бесполезен. Теперь есть импорт.
function openImportPicker() {
  const inp = document.getElementById('importFile');
  if (inp) { inp.value = ''; inp.click(); }
}

async function handleImportFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  try {
    const dump = JSON.parse(await file.text());

    if (dump.lifeXP) {
      const merged = mergeLifeXP(localStorage.getItem('ozon_life_xp'), JSON.stringify(dump.lifeXP));
      localStorage.setItem('ozon_life_xp', merged);
    }
    if (dump.shopPurchases) localStorage.setItem('ozon_shop_purchases', JSON.stringify(dump.shopPurchases));
    if (dump.calendarPlan) localStorage.setItem('ozon_calendar_plan', JSON.stringify(dump.calendarPlan));
    if (dump.activeTheme) localStorage.setItem('ozon_active_theme', dump.activeTheme);
    if (dump.difficulty) localStorage.setItem('ozon_difficulty', dump.difficulty);

    // смены доливаем в облако только те, которых ещё нет
    let added = 0;
    if (Array.isArray(dump.shifts)) {
      for (const s of dump.shifts) {
        const dup = shifts.some(x => x.date === s.date && x.hours == s.hours && x.earned == s.earned);
        if (!dup) { await insertShift(s); added++; }
      }
    }

    await pushProgress();
    loadSavedTheme();
    render();
    renderLifeQuests();
    renderLifeStats();
    renderChart();
    showToast(`✅ Восстановлено: XP ${getLifeXP().total}, смен +${added}`, 'success');
  } catch (e) {
    console.error('Import error:', e);
    showToast('❌ Не смог прочитать файл бэкапа', 'error');
  }
}

// Ручное восстановление XP было кнопкой в UI — убрал: в готовом приложении
// читерская «задать XP» ломает смысл прогресса. Оставляю функцию доступной
// из консоли на случай аварийного восстановления.
function manualRestoreXP(value) {
  const cur = getLifeXP();
  const val = (value !== undefined) ? value : prompt('Сколько всего Life XP должно быть?', String(cur.total || 0));
  if (val === null) return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) { showToast('Нужно число', 'warn'); return; }
  const data = getLifeXP();
  data.total = n;
  saveLifeXP(data);
  renderLifeStats();
  render();
  showToast(`✅ Life XP восстановлен: ${n}`, 'success');
}

// ====== RENDER ======
function render() {
  const goal = DIFFICULTIES[difficulty].goal;
  const totalEarned = shifts.reduce((s, x) => s + x.earned, 0);
  const totalHours = shifts.reduce((s, x) => s + x.hours, 0);
  const avgRate = totalHours > 0 ? Math.round(totalEarned / totalHours) : 0;

  document.getElementById('totalEarned').textContent = totalEarned.toLocaleString('ru-RU');
  document.getElementById('totalShifts').textContent = shifts.length;
  document.getElementById('totalHours').textContent = totalHours.toFixed(1);
  document.getElementById('avgRate').textContent = avgRate.toLocaleString('ru-RU');

  // Wallet badge — очки за смены и часы, а не за рубли (см. calcGrindXP).
  const xp = calcGrindXP(shifts.length, totalHours);
  let currentLevel = LEVELS[0], nextLevel = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { currentLevel = LEVELS[i]; nextLevel = LEVELS[i + 1] || null; break; }
  }

  const walletBadgeIcon = document.getElementById('walletBadgeIcon');
  const walletBadgeText = document.getElementById('walletBadgeText');
  if (walletBadgeIcon) walletBadgeIcon.textContent = currentLevel.icon;
  if (walletBadgeText) walletBadgeText.textContent = `LVL ${currentLevel.lvl}`;

  // Wallet trend
  const trendEl = document.getElementById('walletTrend');
  if (trendEl && shifts.length >= 2) {
    const lastShift = shifts[0];
    const prevShift = shifts[1];
    const diff = lastShift.rate - prevShift.rate;
    const trendClass = diff > 0 ? 'up' : (diff < 0 ? 'down' : 'neutral');
    const trendSymbol = diff > 0 ? '↑' : (diff < 0 ? '↓' : '→');
    trendEl.innerHTML = `
      <span class="wallet-trend-tag ${trendClass}">${trendSymbol} ${Math.abs(diff)} ₽/час</span>
      <span class="wallet-trend-text">vs прошлая смена</span>
    `;
  } else if (trendEl) {
    trendEl.innerHTML = '';
  }

  // Golden border effect
  const walletEl = document.getElementById('wallet');
  if (walletEl && getShopOwned('golden_border')) {
    walletEl.style.borderColor = 'rgba(255,215,0,0.4)';
    walletEl.style.boxShadow = '0 0 25px rgba(255,215,0,0.1)';
  }

  // Title
  const activeTitle = getActiveTitle();
  const subtitleEl = document.querySelector('.header .subtitle');
  if (subtitleEl && activeTitle) {
    subtitleEl.textContent = `${activeTitle} · Копим как Скрудж МакДак 🦆`;
  }

  // Level
  document.getElementById('levelIcon').textContent = currentLevel.icon;
  document.getElementById('levelName').textContent = `LVL ${currentLevel.lvl} — ${currentLevel.name}`;
  document.getElementById('levelTitle').textContent = currentLevel.title;
  if (nextLevel) {
    const progress = ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100;
    document.getElementById('xpFill').style.width = Math.min(progress, 100) + '%';
    document.getElementById('xpText').textContent = `${xp.toLocaleString('ru-RU')} / ${nextLevel.xp.toLocaleString('ru-RU')} XP`;
  } else {
    document.getElementById('xpFill').style.width = '100%';
    document.getElementById('xpText').textContent = 'MAX LEVEL! 🦆';
  }

  // Streak
  const streak = calcStreak(goal);
  const streakBar = document.getElementById('streakBar');
  if (streak > 0) { streakBar.style.display = 'flex'; document.getElementById('streakCount').textContent = streak; }
  else { streakBar.style.display = 'none'; }

  // Achievements
  const achData = { shifts, totalEarned, streak };
  document.getElementById('achGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const u = a.check(achData);
    return `<div class="ach-item ${u?'unlocked':'locked'}"><div class="ach-icon">${a.icon}</div><div class="ach-name">${a.name}</div></div>`;
  }).join('');

  // History
  const shiftList = document.getElementById('shiftList');
  if (shifts.length === 0) {
    shiftList.innerHTML = `<div class="empty-state"><div class="emoji">🦆</div><p>Пока пусто — добавь первую смену!</p></div>`;
  } else {
    shiftList.innerHTML = shifts.map(s => {
      const cls = s.rate >= goal ? 'goal-hit' : (s.rate >= goal * 0.9 ? 'goal-close' : 'goal-miss');
      const rateCls = s.rate >= goal ? 'good' : (s.rate >= goal * 0.9 ? 'ok' : 'bad');
      const icon = s.rate >= goal ? '✅' : (s.rate >= goal * 0.9 ? '🔸' : '❌');
      // FIX: Parse date without timezone issues
      const dp = s.date.split('-');
      const d = new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]));
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const noteHtml = s.note ? `<div class="shift-note">${escapeHtml(s.note)}</div>` : '';
      // FIX: id кладём в кавычках — у локальных (ещё не синхронизированных) смен он строковый
      // и без кавычек onclick падал с ошибкой.
      const idArg = JSON.stringify(s.id);
      const pendingBadge = s._pending ? `<span class="shift-pending" title="Ждёт загрузки в облако">📱</span>` : '';
      // Перерывы: раньше считались и терялись, теперь видны в истории.
      const breakHtml = (s.breakMs > 0)
        ? `<div class="shift-breaks" title="${escapeHtml(s.breakSummary || '')}">☕ ${s.breakCount} · ${formatShortDuration(s.breakMs)} · на складе ${formatShortDuration(s.totalMs)}</div>`
        : '';
      return `<div class="shift-card ${cls} slide-up">
        <div class="shift-actions">
          <button class="shift-action-btn edit" onclick='openEditModal(${idArg})' title="Редактировать">✏️</button>
          <button class="shift-action-btn delete" onclick='removeShift(${idArg})' title="Удалить">✕</button>
        </div>
        <div class="shift-left"><div class="shift-date">${dateStr} ${pendingBadge}</div><div class="shift-hours">${s.hours} ч</div>${breakHtml}${noteHtml}</div>
        <div class="shift-right"><div class="shift-earned">${s.earned.toLocaleString('ru-RU')} ₽</div><div class="shift-rate ${rateCls}">${icon} ${s.rate} ₽/час</div></div>
      </div>`;
    }).join('');
  }

  // Quests
  renderQuests();
  // Chart
  renderChart();
  // Month goal / forecast / dow / records
  renderMonthGoal();
  renderDowStats();
  renderRecords();
  // Calendar
  renderCalendar();
}

// ====== ЦЕЛЬ МЕСЯЦА / ПРОГНОЗ / ДНИ НЕДЕЛИ / РЕКОРДЫ ======
function getMonthGoal() {
  return parseInt(localStorage.getItem('ozon_month_goal') || '0', 10) || 0;
}
function openMonthGoalPrompt() {
  const cur = getMonthGoal();
  const v = prompt('Цель по заработку на этот месяц (₽):', cur || 80000);
  if (v === null) return;
  const n = parseInt(String(v).replace(/\D/g, ''), 10);
  if (!n || n <= 0) { showToast('❌ Введи число больше нуля', 'error'); return; }
  localStorage.setItem('ozon_month_goal', String(n));
  markLocalChange();
  schedulePushProgress();
  render();
  showToast(`🎯 Цель месяца: ${n.toLocaleString('ru-RU')} ₽`, 'success');
}

function renderMonthGoal() {
  const el = document.getElementById('monthGoalCard');
  if (!el) return;
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthShifts = shifts.filter(s => s.date && s.date.startsWith(prefix));
  const earned = monthShifts.reduce((a, s) => a + s.earned, 0);
  const hours = monthShifts.reduce((a, s) => a + s.hours, 0);

  // Средний заработок за смену: по этому месяцу, иначе по всей истории.
  const avgPerShift = monthShifts.length
    ? earned / monthShifts.length
    : (shifts.length ? shifts.reduce((a, s) => a + s.earned, 0) / shifts.length : 0);

  // Прогноз: уже заработано + запланированные в календаре будущие смены.
  const plan = getCalendarPlan();
  const todayS = todayStr();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let plannedAhead = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${prefix}-${String(d).padStart(2, '0')}`;
    if (key > todayS && plan[key] === 'shift') plannedAhead++;
  }
  const forecast = Math.round(earned + plannedAhead * avgPerShift);

  const goal = getMonthGoal();
  const pct = goal ? Math.min(100, (earned / goal) * 100) : 0;
  const left = goal ? Math.max(0, goal - earned) : 0;
  const shiftsLeft = (goal && avgPerShift > 0) ? Math.ceil(left / avgPerShift) : 0;

  const goalBlock = goal ? `
    <div class="chart-sub">
      <div><div class="big">${earned.toLocaleString('ru-RU')} ₽</div><div class="lbl">из ${goal.toLocaleString('ru-RU')} ₽</div></div>
      <div style="text-align:right;"><div class="big">${Math.round(pct)}%</div><div class="lbl">${left > 0 ? 'осталось ' + left.toLocaleString('ru-RU') + ' ₽' : 'цель взята! 🎉'}</div></div>
    </div>
    <div class="xp-bar" style="margin:4px 0 10px;"><div class="xp-fill" style="width:${pct}%"></div></div>
    ${left > 0 && shiftsLeft ? `<div class="mg-note">≈ ещё ${shiftsLeft} ${pluralShifts(shiftsLeft)} до цели</div>` : ''}
  ` : `<div class="mg-note">Цель не задана — нажми «Изменить», чтобы поставить план на месяц</div>`;

  el.innerHTML = `
    ${goalBlock}
    <div class="mg-forecast">
      <div class="mg-row"><span>📊 Прогноз к концу месяца</span><b>${forecast.toLocaleString('ru-RU')} ₽</b></div>
      <div class="mg-row"><span>📋 Отработано смен</span><b>${monthShifts.length} · ${hours.toFixed(1)} ч</b></div>
      <div class="mg-row"><span>📅 Запланировано впереди</span><b>${plannedAhead} ${pluralShifts(plannedAhead)}</b></div>
    </div>`;
}

function pluralShifts(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'смен';
  if (b === 1) return 'смена';
  if (b >= 2 && b <= 4) return 'смены';
  return 'смен';
}

function renderDowStats() {
  const el = document.getElementById('dowCard');
  if (!el) return;
  if (!shifts.length) { el.innerHTML = `<div class="mg-note">Нет данных — отработай первую смену</div>`; return; }
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const buckets = names.map(() => ({ earned: 0, hours: 0, count: 0 }));
  for (const s of shifts) {
    if (!s.date) continue;
    const p = s.date.split('-');
    let dow = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])).getDay() - 1;
    if (dow < 0) dow = 6;
    buckets[dow].earned += s.earned;
    buckets[dow].hours += s.hours;
    buckets[dow].count++;
  }
  const rates = buckets.map(b => b.hours > 0 ? Math.round(b.earned / b.hours) : 0);
  const maxRate = Math.max(...rates, 1);
  const bestRate = Math.max(...rates);
  el.innerHTML = names.map((n, i) => {
    const b = buckets[i], r = rates[i];
    const pct = (r / maxRate) * 100;
    const cls = r > 0 && r === bestRate ? 'is-top' : (r === 0 ? 'is-zero' : '');
    return `<div class="dow-row ${cls}">
      <span class="dow-name">${n}</span>
      <div class="dow-bar"><div class="dow-fill" style="width:${pct}%"></div></div>
      <span class="dow-val">${r ? r.toLocaleString('ru-RU') + ' ₽/ч' : '—'}</span>
      <span class="dow-cnt">${b.count || ''}</span>
    </div>`;
  }).join('');
}

function renderRecords() {
  const el = document.getElementById('recordsCard');
  if (!el) return;
  if (!shifts.length) { el.innerHTML = `<div class="mg-note">Рекорды появятся после первой смены</div>`; return; }
  const bestEarn = shifts.reduce((a, s) => s.earned > a.earned ? s : a, shifts[0]);
  const bestRate = shifts.reduce((a, s) => s.rate > a.rate ? s : a, shifts[0]);
  const longest = shifts.reduce((a, s) => s.hours > a.hours ? s : a, shifts[0]);
  const bestStreak = calcBestStreak(DIFFICULTIES[difficulty].goal);
  const fmtD = d => { const p = d.split('-'); return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); };
  el.innerHTML = `
    <div class="mg-row"><span>💰 Лучшая смена</span><b>${bestEarn.earned.toLocaleString('ru-RU')} ₽ <span class="rec-date">${fmtD(bestEarn.date)}</span></b></div>
    <div class="mg-row"><span>💎 Лучший rate</span><b>${bestRate.rate.toLocaleString('ru-RU')} ₽/ч <span class="rec-date">${fmtD(bestRate.date)}</span></b></div>
    <div class="mg-row"><span>⏱ Самая долгая смена</span><b>${longest.hours} ч <span class="rec-date">${fmtD(longest.date)}</span></b></div>
    <div class="mg-row"><span>🔥 Лучший страйк</span><b>${bestStreak} ${bestStreak === 1 ? 'день' : 'дней'}</b></div>`;
}

// Лучший страйк за всю историю (calcStreak считает только текущий).
function calcBestStreak(goal) {
  const dateMap = {};
  for (const s of shifts) {
    if (!dateMap[s.date] || s.rate > dateMap[s.date]) dateMap[s.date] = s.rate;
  }
  const dates = Object.keys(dateMap).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of dates) {
    const p = d.split('-');
    const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    const consecutive = prev && Math.round((dt - prev) / 86400000) === 1;
    if (dateMap[d] >= goal) {
      cur = consecutive ? cur + 1 : 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
    prev = dt;
  }
  return best;
}

// ====== STREAK ======
function getStreakShields() {
  try {
    const b = JSON.parse(localStorage.getItem('ozon_shop_boosts') || '{}');
    return Array.isArray(b.streak_shields) ? b.streak_shields : [];
  } catch (e) { return []; }
}

function calcStreak(goal) {
  const shields = getStreakShields();
  const dateMap = {};
  for (const s of shifts) {
    if (!dateMap[s.date] || s.rate > dateMap[s.date]) dateMap[s.date] = s.rate;
  }
  const dates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
  if (dates.length === 0) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < dates.length; i++) {
    const parts = dates[i].split('-');
    const shiftDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    // Купленная защита страйка закрывает дыру в серии.
    const gapCovered = (from, to) => {
      for (let d = new Date(from); d > to; d.setDate(d.getDate() - 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (d.getTime() !== from.getTime() && !shields.includes(key)) return false;
      }
      return true;
    };
    if (i === 0) {
      if (Math.floor((today - shiftDate) / 86400000) > 1 && !gapCovered(today, shiftDate)) return 0;
    }
    if (i > 0) {
      const prevParts = dates[i-1].split('-');
      const prevDate = new Date(parseInt(prevParts[0]), parseInt(prevParts[1]) - 1, parseInt(prevParts[2]));
      if (Math.floor((prevDate - shiftDate) / 86400000) !== 1 && !gapCovered(prevDate, shiftDate)) break;
    }
    if (dateMap[dates[i]] >= goal) streak++; else break;
  }
  return streak;
}

// ====== ГРАФИК ЗАРАБОТКА ======
// Сутки группируем по локальной дате (не UTC) — иначе ночные смены
// уезжали бы на соседний столбик.
let chartMode = parseInt(localStorage.getItem('ozon_chart_mode') || '7', 10);
if (![7, 14, 30].includes(chartMode)) chartMode = 7;

function setChartMode(days) {
  chartMode = days;
  localStorage.setItem('ozon_chart_mode', String(days));
  [7, 14, 30].forEach(d => {
    const b = document.getElementById('chartMode' + d);
    if (b) b.classList.toggle('active', d === days);
  });
  renderChart();
}

function renderChart() {
  const body = document.getElementById('chartBody');
  if (!body) return;

  // держим подсветку переключателя в соответствии с сохранённым режимом
  [7, 14, 30].forEach(d => {
    const b = document.getElementById('chartMode' + d);
    if (b) b.classList.toggle('active', d === chartMode);
  });

  const goal = DIFFICULTIES[difficulty].goal;
  const days = chartMode;

  // сумма заработка и часов по каждой локальной дате
  const byDate = {};
  for (const s of shifts) {
    if (!byDate[s.date]) byDate[s.date] = { earned: 0, hours: 0 };
    byDate[s.date].earned += s.earned;
    byDate[s.date].hours += s.hours;
  }

  // строим ось: последние N дней, включая сегодня
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    const rec = byDate[key] || { earned: 0, hours: 0 };
    buckets.push({
      date: d,
      key,
      earned: rec.earned,
      hours: rec.hours,
      rate: rec.hours > 0 ? Math.round(rec.earned / rec.hours) : 0,
      isToday: i === 0
    });
  }

  const total = buckets.reduce((s, b) => s + b.earned, 0);
  const workedDays = buckets.filter(b => b.earned > 0).length;
  const avg = workedDays > 0 ? Math.round(total / workedDays) : 0;

  document.getElementById('chartTotal').textContent = total.toLocaleString('ru-RU') + ' ₽';
  document.getElementById('chartAvg').textContent = avg.toLocaleString('ru-RU') + ' ₽';
  document.getElementById('chartPeriodLbl').textContent =
    `за ${days} дн. · смен: ${workedDays}`;

  if (total === 0) {
    body.innerHTML = `<div class="chart-empty">Нет смен за этот период 🦆<br>Выйди на смену — появится график</div>`;
    return;
  }

  const max = Math.max(...buckets.map(b => b.earned));
  // на 30 днях подписи над каждым столбиком не влезут — показываем только на 7
  const showVals = days <= 7;
  // подписи оси: на 14/30 днях прореживаем, иначе каша
  const labelEvery = days <= 7 ? 1 : (days <= 14 ? 2 : 5);

  const barsHtml = buckets.map(b => {
    const h = max > 0 ? Math.max((b.earned / max) * 100, b.earned > 0 ? 6 : 0) : 0;
    let cls = 'empty';
    if (b.earned > 0) cls = b.rate >= goal ? 'hit' : 'miss';
    const valTxt = b.earned > 0 ? Math.round(b.earned / 1000) + 'к' : '';
    const valHtml = (showVals && b.earned > 0)
      ? `<div class="chart-val">${valTxt}</div>` : '';
    const title = b.earned > 0
      ? `${b.key}: ${b.earned.toLocaleString('ru-RU')} ₽ / ${b.hours.toFixed(1)} ч / ${b.rate} ₽ в час`
      : `${b.key}: выходной`;
    return `<div class="chart-bar-wrap" title="${title}">
      ${valHtml}
      <div class="chart-bar ${cls}" style="height:${h}%"></div>
    </div>`;
  }).join('');

  const labelsHtml = buckets.map((b, i) => {
    const show = (i % labelEvery === 0) || b.isToday;
    const txt = show
      ? (days <= 7
          ? b.date.toLocaleDateString('ru-RU', { weekday: 'short' })
          : b.date.getDate())
      : '';
    return `<div class="chart-xlabel ${b.isToday ? 'today' : ''}">${txt}</div>`;
  }).join('');

  const dense = days > 7 ? ' dense' : '';
  body.innerHTML = `
    <div class="chart-bars${dense}">${barsHtml}</div>
    <div class="chart-xaxis${dense}">${labelsHtml}</div>
    <div class="chart-legend">
      <span><i style="background:#00e676"></i> цель взята</span>
      <span><i style="background:#4a4a5e"></i> ниже цели</span>
    </div>
  `;
}

// ====== PWA: SERVICE WORKER ======
// Регистрируем только по http/https — с file:// браузер ругается.
const APP_VERSION = 'v4.5.0';

// Страховка: кнопка баннера обязана работать даже если обработчик
// от service worker по какой-то причине не навесился.
document.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest && e.target.closest('#updateBtn');
  if (!btn || btn.dataset.swBound === '1') return;
  btn.disabled = true;
  btn.textContent = 'Обновляю…';
  location.reload();
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    // Перезагружаемся ТОЛЬКО после осознанного нажатия «Обновить».
    // Иначе любой controllerchange (в т.ч. первая установка) дёргал reload,
    // баннер исчезал и выглядело будто обновление не применяется.
    let userAskedUpdate = false;
    let reloaded = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!userAskedUpdate || reloaded) return;
      reloaded = true;
      location.reload();
    });

    navigator.serviceWorker.register('sw.js').then(reg => {
      // новая версия подъехала и ждёт активации — предлагаем обновиться
      function offerUpdate(worker) {
        if (!worker) return;
        const banner = document.getElementById('updateBanner');
        if (!banner) return;
        banner.classList.add('show');
        const btn = document.getElementById('updateBtn');
        if (!btn) return;
        btn.disabled = false;
        btn.textContent = 'Обновить';
        btn.dataset.swBound = '1';
        btn.onclick = () => {
          userAskedUpdate = true;
          btn.disabled = true;
          btn.textContent = 'Обновляю…';
          worker.postMessage('SKIP_WAITING');
          // Страховка: если воркер по какой-то причине не сменился
          // (бывает на iOS), перезагружаем сами.
          setTimeout(() => { if (!reloaded) { reloaded = true; location.reload(); } }, 2500);
        };
      }

      if (reg.waiting) offerUpdate(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          // controller есть => это обновление, а не первая установка
          if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw);
        });
      });

      // Проверяем обновления при старте, при возврате в приложение и раз в 15 мин.
      // В установленной PWA страница живёт долго, без этого новая версия
      // может не искаться сутками.
      const check = () => reg.update().catch(() => {});
      check();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      setInterval(check, 15 * 60 * 1000);
    }).catch(err => console.warn('SW register failed:', err));
  });
}

// Показываем версию в интерфейсе — чтобы было видно, какая сборка реально запущена.
function renderVersionTag() {
  const el = document.getElementById('versionTag');
  if (el) el.textContent = APP_VERSION;
}

// ====== START ======
init();

// Update quests every 30 seconds (for timer-based ones)
setInterval(() => { if (activeShift) renderQuests(); }, 30000);
