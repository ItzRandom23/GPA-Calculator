(() => {
'use strict';

const GRADES = [
  [90, 'O', 10, 'Outstanding'], [75, 'A+', 9, 'Excellent'], [65, 'A', 8, 'Very Good'],
  [55, 'B+', 7, 'Good'], [50, 'B', 6, 'Above Average'], [45, 'C', 5, 'Average'],
  [40, 'P', 4, 'Pass'], [0, 'F', 0, 'Fail']
];
const RANGES = ['90–100', '75–89.99', '65–74.99', '55–64.99', '50–54.99', '45–49.99', '40–44.99', 'Below 40'];

const MIN = 1, MAX = 20, DEFAULT = 8;
const KEY = 'ipu-gpa-v1', TKEY = 'ipu-theme';
const EMPTY_CELL = '—';

const DIVISIONS = [
  { key:'exemplary', min:10, label:'Exemplary Performance', conditional:true },
  { key:'first',     min:6.5, label:'First Division' },
  { key:'second',    min:5,   label:'Second Division' },
  { key:'third',     min:4,   label:'Third Division' },
  { key:'none',      min:0,   label:'No Division' }
];

const LEVELS = [
  { min:9,   key:'outstanding', label:'Outstanding' },
  { min:8,   key:'excellent',   label:'Excellent' },
  { min:7,   key:'verygood',    label:'Very Good' },
  { min:6,   key:'good',        label:'Good' },
  { min:5,   key:'average',     label:'Average' },
  { min:4,   key:'pass',        label:'Pass' },
  { min:0,   key:'below',       label:'Below Passing Threshold' }
];

const RING = 2 * Math.PI * 70;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cls = l => 'g-' + l.replace('+', 'p');
const fmt = n => String(Math.round(n * 100) / 100);

const fxTimers = new WeakMap();
function fx(el, name, ms = 600){
  if (!el || !name) return;
  el.classList.remove(name);
  void el.offsetWidth;
  el.classList.add(name);
  clearTimeout(fxTimers.get(el));
  fxTimers.set(el, setTimeout(() => { el.classList.remove(name); fxTimers.delete(el); }, ms));
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const mem = {};
const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
  del(k){ try { localStorage.removeItem(k); } catch { delete mem[k]; } }
};

const blank = () => ({ n:'', m:'', c:'' });

function loadState(){
  try {
    const d = JSON.parse(store.get(KEY));
    if (d && d.v === 1 && Array.isArray(d.rows) && d.rows.length) {
      return d.rows.slice(0, MAX).map(r => ({
        n: String(r.n ?? '').slice(0, 40),
        m: String(r.m ?? '').slice(0, 8),
        c: String(r.c ?? '').slice(0, 8)
      }));
    }
  } catch {  }
  return null;
}

function saveState(){
  store.set(KEY, JSON.stringify({ v: 1, rows }));
}

let saveT, saveToastT;
function queueSave(){
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    saveState();
    if (!hasData()) return;
    clearTimeout(saveToastT);
    saveToastT = setTimeout(() => toast('Changes saved'), 260);
  }, 900);
}

const parse = s => {
  s = String(s).trim();
  if (s === '') return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

function evalRow(r){
  const m = parse(r.m), c = parse(r.c);
  if (m === null && c === null) return { s:'empty' };
  const o = { s:'ok' };
  if (Number.isNaN(m) || m > 100) o.em = 'Marks 0–100';
  else if (m === null) o.hm = 'Add marks';
  if (Number.isNaN(c) || c <= 0 || c > 30) o.ec = 'Credits 1–30';
  else if (c === null) o.hc = 'Add credits';
  if (o.em || o.ec) o.s = 'invalid';
  else if (o.hm || o.hc) o.s = 'partial';
  else Object.assign(o, { m, c }, marksToGrade(m));
  return o;
}

const marksToGrade = m => { const g = GRADES.find(x => m >= x[0]); return { letter: g[1], gp: g[2] }; };

const validCount = n => Number.isInteger(n) && n >= MIN && n <= MAX;

function calculate(list){
  const valid = list.map((r, i) => ({ r, e: evalRow(r) })).filter(x => x.e.s === 'ok');
  const dist = Object.fromEntries(GRADES.map(g => [g[1], 0]));
  let cr = 0, pts = 0, failed = 0;
  valid.forEach(({ e }) => {
    cr += e.c;
    pts += e.c * e.gp;
    dist[e.letter]++;
    if (e.letter === 'F') failed++;
  });
  const raw = cr ? pts / cr : null;

  const clamped = raw === null ? null : Math.min(10, Math.max(0, raw));
  return {
    valid, dist, cr, pts, failed,
    passed: valid.length - failed,
    raw,
    gpa: clamped === null ? null : Math.round((clamped + 1e-9) * 100) / 100
  };
}

function classify(raw){
  if (raw === null || raw === undefined || Number.isNaN(raw)) return null;
  const r = Math.min(10, Math.max(0, raw));
  return DIVISIONS.find(d => r >= d.min) || DIVISIONS[DIVISIONS.length - 1];
}

function levelOf(raw){
  if (raw === null) return null;
  return LEVELS.find(l => raw >= l.min) || LEVELS[LEVELS.length - 1];
}

let rows = [];
let lastGpa = 0;
let lastBand = 'none';
let copyT, toastT;

const hasData = () => rows.some(r => r.n || r.m || r.c);

const DEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';

function rowHTML(i){
  const n = i + 1;
  return `<div class="subject" data-i="${i}">
  <span class="subject__n">${n}</span>
  <label class="subject__field subject__name"><span class="sr-only">Subject ${n} name</span>
    <input class="in" type="text" data-k="n" maxlength="40" placeholder="Subject ${n}" autocomplete="off"></label>
  <label class="subject__field subject__marks"><span class="sr-only">Subject ${n} marks</span>
    <input class="in in--num" type="text" inputmode="decimal" data-k="m" placeholder="0–100" autocomplete="off" aria-describedby="m${i}"><small class="subject__msg" id="m${i}"></small></label>
  <label class="subject__field subject__credits"><span class="sr-only">Subject ${n} credits</span>
    <input class="in in--num" type="text" inputmode="decimal" data-k="c" placeholder="Credits" autocomplete="off" aria-describedby="c${i}"><small class="subject__msg" id="c${i}"></small></label>
  <div class="subject__field subject__grade"><span class="chip"></span></div>
  <div class="subject__field subject__gpc"><span class="subject__gp"></span></div>
  <button class="subject__del" data-act="rm" type="button" aria-label="Remove subject ${n}">${DEL_ICON}</button>
</div>`;
}

function renderRows(newFrom){
  $('#rows').innerHTML = rows.map((_, i) => rowHTML(i)).join('');
  $$('.subject').forEach((el, i) => {
    el.querySelector('[data-k=n]').value = rows[i].n;
    el.querySelector('[data-k=m]').value = rows[i].m;
    el.querySelector('[data-k=c]').value = rows[i].c;
    if (newFrom !== undefined && i >= newFrom) {
      el.classList.add('is-in');
      el.addEventListener('animationend', () => el.classList.remove('is-in'), { once: true });
    }
    updateRow(i);
  });
  syncChrome();
}

function syncChrome(){
  const n = rows.length;
  const removeOk = n > MIN;
  $$('.subject__del').forEach(b => { b.disabled = !removeOk; });
  $('#minus').disabled = n <= MIN;
  $('#plus').disabled = n >= MAX;
  if (document.activeElement !== $('#countIn')) $('#countIn').value = n;
}

function updateRow(i){
  const el = $(`.subject[data-i="${i}"]`);
  if (!el) return;
  const d = rows[i];
  const e = evalRow(d);

  const msg = (which, text, hint) => {
    const node = el.querySelector('#' + which + i);
    const input = el.querySelector(`[data-k=${which === 'm' ? 'm' : 'c'}]`);
    node.textContent = text || hint || '';
    node.classList.toggle('is-hint', !text && !!hint);
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  };
  msg('m', e.em, e.hm);
  msg('c', e.ec, e.hc);
  el.classList.toggle('has-msg', !!(e.em || e.ec));

  const chip = el.querySelector('.chip');
  const prev = chip.textContent;

  const cleared = e.s === 'empty';
  const hasPrev = prev && prev !== EMPTY_CELL;
  const label = e.s === 'ok' ? e.letter : (cleared || !hasPrev ? EMPTY_CELL : prev);
  const placeholder = label === EMPTY_CELL;
  if (prev !== label) {
    chip.textContent = label;
    chip.className = 'chip' + (placeholder ? ' is-empty' : ' ' + cls(label));
    if (!placeholder && e.s === 'ok') fx(chip, 'is-pop', 380);
  } else if (!placeholder) {

    chip.className = 'chip ' + cls(label);
  } else {
    chip.className = 'chip is-empty';
  }

  chip.classList.toggle('is-stale', !!label && !placeholder && e.s !== 'ok');

  const gp = el.querySelector('.subject__gp');
  const prevGp = gp.textContent;
  const hasPrevGp = prevGp && prevGp !== EMPTY_CELL;
  const gpv = e.s === 'ok' ? String(e.gp) : (cleared || !hasPrevGp ? EMPTY_CELL : prevGp);
  if (prevGp !== gpv) {
    gp.textContent = gpv;
    if (e.s === 'ok') fx(gp, 'is-pop', 380);
  }
  gp.classList.toggle('is-empty', gpv === EMPTY_CELL);
}

function buildStatic(){
  $('#gradeTbl').innerHTML = GRADES.map((g, i) =>
    `<tr><td><span class="chip ${cls(g[1])}">${g[1]}</span></td><td>${RANGES[i]}</td><td class="r">${g[2]}</td><td>${g[3]}</td></tr>`
  ).join('');

  $('#chart').innerHTML = GRADES.map(g =>
    `<div class="drow ${cls(g[1])}" id="d-${cls(g[1])}"><span class="chip">${g[1]}</span><div class="dtrack"><div class="dfill"></div></div><span class="dcount">0</span></div>`
  ).join('');
}

function renderChart(dist){
  const max = Math.max(1, ...Object.values(dist));
  GRADES.forEach(g => {
    const row = $('#d-' + cls(g[1]));
    if (!row) return;
    row.querySelector('.dfill').style.width = (dist[g[1]] / max) * 100 + '%';
    row.querySelector('.dcount').textContent = dist[g[1]];
  });
  $('#chart').setAttribute('aria-label',
    'Grade distribution: ' + GRADES.map(g => `${g[1]} ${dist[g[1]]}`).join(', '));
}

function animateGpa(to){
  const el = $('#gpa');
  const from = lastGpa;
  if (animateGpa._raf) cancelAnimationFrame(animateGpa._raf);
  if (reduced()){
    el.textContent = to.toFixed(2);
    lastGpa = to;
    animateGpa._raf = 0;
    return;
  }
  const t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / 420);
    const v = Math.min(10, Math.max(0, from + (to - from) * p));
    el.textContent = v.toFixed(2);
    if (p < 1) animateGpa._raf = requestAnimationFrame(step);
    else { el.textContent = to.toFixed(2); lastGpa = to; animateGpa._raf = 0; }
  };
  animateGpa._raf = requestAnimationFrame(step);
}

function toneOf(raw){
  if (raw === null) return 'var(--text-3)';
  if (raw >= 8) return 'var(--ok)';
  if (raw >= 6.5) return 'var(--accent-ink)';
  if (raw >= 4) return 'var(--warn)';
  return 'var(--err)';
}

function highlightDivision(key){
  $$('#divisionTbl tr[data-div]').forEach(tr => {
    const on = tr.dataset.div === key;
    tr.classList.toggle('is-current', on);
    if (on) tr.setAttribute('aria-current', 'true');
    else tr.removeAttribute('aria-current');
  });
}

function renderResults(){
  const r = calculate(rows);

  const vals = [['#sCred', fmt(r.cr)], ['#sPts', fmt(r.pts)], ['#sSub', r.valid.length],
                ['#sPass', r.passed], ['#sFail', r.failed]];
  vals.forEach(([sel, v]) => {
    const el = $(sel);
    if (el.textContent !== String(v)) { el.textContent = v; fx(el, 'is-pop', 340); }
  });
  const failStat = $('#failStat');
  failStat.classList.toggle('is-bad', r.failed > 0);
  failStat.setAttribute('aria-label', `Failed: ${r.failed}`);

  renderChart(r.dist);
  $('#copyBtn').disabled = $('#csvBtn').disabled = r.valid.length === 0;

  const band = classify(r.raw);
  highlightDivision(band ? band.key : null);

  const level = $('#level');
  const div = $('#division');
  const note = $('#note');
  const arc = $('#gArc');

  if (r.gpa === null){
    if (animateGpa._raf) { cancelAnimationFrame(animateGpa._raf); animateGpa._raf = 0; }
    $('#gpa').textContent = '';
    $('#gpa').dataset.empty = 'true';
    lastGpa = 0;
    lastBand = 'none';
    arc.style.strokeDashoffset = RING;
    level.textContent = 'Add marks to begin';
    level.className = 'badge badge--muted';
    level.style.removeProperty('--tone');
    div.hidden = true;
    div.textContent = '';
    note.hidden = true;
    return;
  }

  const prevBand = lastBand;
  const first = prevBand === 'none';

  delete $('#gpa').dataset.empty;
  animateGpa(r.gpa);
  const ratio = Math.min(1, Math.max(0, r.raw / 10));
  arc.style.strokeDashoffset = RING * (1 - ratio);

  const lv = levelOf(r.raw);
  const tone = toneOf(r.raw);
  level.textContent = lv.label;
  level.className = 'badge badge--level';
  level.style.setProperty('--tone', tone);

  div.innerHTML = band.label + (band.conditional ? '<span class="star" aria-hidden="true">*</span>' : '');
  div.style.setProperty('--tone', tone);
  div.hidden = false;
  note.hidden = false;

  const tier = r.raw >= 8 ? 'top' : r.raw >= 6.5 ? 'good' : r.raw >= 4 ? 'warn' : 'bad';
  if (tier !== prevBand && !first) fx($('#gauge'), 'is-bump', 560);
  lastBand = tier;
}

function renderAll(newFrom){
  renderRows(newFrom);
  renderResults();
}

function setCountDirect(n){
  const target = Math.max(MIN, Math.min(MAX, n));
  if (target === rows.length) return;

  const grewFrom = rows.length;
  if (target > grewFrom) {
    while (rows.length < target) rows.push(blank());
  } else {
    rows = rows.slice(0, target);
  }

  renderRows(target > grewFrom ? grewFrom : undefined);
  renderResults();
  fx($('#countIn'), 'is-pop', 320);
  queueSave();
}

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('is-on'), 2200);
}

let lastFocus = null;

function openModal(html, { actions = [] } = {}){
  lastFocus = document.activeElement;
  const body = $('#mBody');
  body.innerHTML = html;
  if (actions.length) {
    const acts = document.createElement('div');
    acts.className = 'modal__acts';
    actions.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.cls || '');
      b.textContent = a.label;
      b.addEventListener('click', () => { closeModal(); a.fn && a.fn(); });
      acts.append(b);
    });
    body.append(acts);
  }
  const m = $('#modal');
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusable = m.querySelector('.modal__acts .btn--primary, .modal__acts .btn--danger, #mClose');
  focusable && focusable.focus();
}

function closeModal(){
  const m = $('#modal');
  if (m.hidden) return;
  m.hidden = true;
  document.body.style.overflow = '';
  if (lastFocus && lastFocus.isConnected) lastFocus.focus();
}

function confirmBox(title, msg, label, fn){
  openModal(
    `<h2>${title}</h2><p>${msg}</p>`,
    { actions: [{ label: 'Cancel' }, { label, cls: 'btn--danger', fn }] }
  );
}

function aboutHTML(){
  return `
  <h2>IPU Grade Calculator</h2>
  <p class="m-sub">A free SGPA calculator for GGSIPU students.</p>
  <h3>What it does</h3>
  <p>Calculate your credit-weighted SGPA on the GGSIPU 10-point scale, see grade points per subject, and view an indicative division.</p>
  <h3>Your data</h3>
  <p>Your entries are kept in your browser’s local storage so they are still there when you return. They never leave this device.</p>
  <h3>Unofficial</h3>
  <p class="modal__disc">This is an unofficial GPA calculator for GGSIPU students. It is not affiliated with or endorsed by Guru Gobind Singh Indraprastha University.</p>
  <p class="modal__disc" style="margin-top:8px;background:var(--surface-2);border-color:var(--border)">Division shown is indicative and based on this semester’s SGPA. Official division uses your overall CGPA at programme completion. The official university result prevails.</p>`;
}

function summary(){
  const r = calculate(rows);
  const band = classify(r.raw);
  const lines = [
    'GGSIPU GPA Result',
    '',
    'SGPA: ' + (r.gpa === null ? 'n/a' : r.gpa.toFixed(2)),
    'Total Credits: ' + fmt(r.cr),
    'Weighted Points: ' + fmt(r.pts),
    'Subjects Entered: ' + r.valid.length,
    'Passed: ' + r.passed,
    'Failed: ' + r.failed,
    ''
  ];
  if (band) lines.push('Level: ' + levelOf(r.raw).label, 'Indicative Division: ' + band.label + (band.conditional ? '*' : ''));
  if (band && band.conditional) lines.push('* Subject to GGSIPU eligibility conditions.');
  lines.push('Division is indicative; official division uses overall CGPA at programme completion.', '');
  r.valid.forEach(({ r: x, e }) => {
    const name = x.n.trim() || 'Subject ' + (rows.indexOf(x) + 1);
    lines.push(`${name} — ${fmt(e.m)} — ${e.letter} — ${e.gp} GP — ${fmt(e.c)} Credits`);
  });
  return { text: lines.join('\n'), r };
}

async function copyResult(){
  const { text } = summary();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {  }
    ta.remove();
  }
  const btn = $('#copyBtn');
  const label = $('#copyLabel');
  label.textContent = 'Copied';
  btn.classList.add('is-copied');
  clearTimeout(copyT);
  copyT = setTimeout(() => { label.textContent = 'Copy result'; btn.classList.remove('is-copied'); }, 1600);
  toast('Result copied');
}

function downloadCSV(){
  const { r } = summary();
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const head = ['Subject', 'Marks', 'Credits', 'Grade', 'Grade Points'];
  const body = r.valid.map(({ r: x, e }) =>
    [q(x.n.trim() || 'Subject ' + (rows.indexOf(x) + 1)), e.m, e.c, e.letter, e.gp].join(','));
  const tail = ['', `Summary,SGPA ${r.gpa === null ? '' : r.gpa.toFixed(2)},${fmt(r.cr)},,${fmt(r.pts)}`];
  const csv = [head.join(','), ...body, ...tail].join('\n');

  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.href = url;
  a.download = `ggsipu-sgpa-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  toast('CSV downloaded');
}

function resetAll(){
  rows = Array.from({ length: DEFAULT }, blank);
  store.del(KEY);
  renderAll();
  lastGpa = 0;
  lastBand = 'none';
  $('#gpa').textContent = '';
  $('#gpa').dataset.empty = 'true';
  $('#gArc').style.strokeDashoffset = RING;
  $('#countIn').value = DEFAULT;
  renderResults();
  toast('Calculator reset');
}

function applyTheme(t){
  const root = document.documentElement;
  root.dataset.theme = t;
  const b = $('#themeBtn');
  b.setAttribute('aria-pressed', String(t === 'dark'));
  b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = t === 'dark' ? '#0B0E18' : '#F7F8FC';
}

function initTheme(){
  applyTheme(store.get(TKEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
}

function toggleTheme(){
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  store.set(TKEY, next);
  if (!reduced()){
    root.classList.add('is-theming');
    clearTimeout(toggleTheme._t);
    toggleTheme._t = setTimeout(() => root.classList.remove('is-theming'), 400);
  }
  applyTheme(next);
}

function initHeaderShadow(){
  const hdr = $('#hdr');
  let ticking = false;
  const sync = () => { hdr.classList.toggle('is-stuck', window.scrollY > 4); ticking = false; };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }, { passive: true });
  sync();
}

function init(){
  document.documentElement.classList.add('js');
  initTheme();
  buildStatic();

  rows = loadState() || Array.from({ length: DEFAULT }, blank);
  renderAll();

  $('#themeBtn').addEventListener('click', toggleTheme);
  $('#aboutBtn').addEventListener('click', () => openModal(aboutHTML(), {
    actions: [{ label: 'Close', cls: 'btn--primary' }]
  }));
  $('#mClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.dataset.close !== undefined) closeModal(); });
  document.addEventListener('keydown', e => {
    const m = $('#modal');
    if (m.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); return closeModal(); }
    if (e.key === 'Tab'){
      const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', m)
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  $('#rows').addEventListener('input', e => {
    const input = e.target;
    const k = input.dataset.k;
    if (!k) return;
    const row = input.closest('.subject');
    const i = +row.dataset.i;
    rows[i][k] = input.value;
    updateRow(i);
    renderResults();
    queueSave();
  });

  $('#rows').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.dataset.k) return;
    e.preventDefault();
    const fields = $$('#rows input');
    const next = fields[fields.indexOf(e.target) + 1];
    if (next) next.focus();
  });

  $('#rows').addEventListener('click', e => {
    const btn = e.target.closest('[data-act=rm]');
    if (!btn || rows.length <= MIN) return;
    const i = +btn.closest('.subject').dataset.i;
    const r = rows[i];
    const remove = () => { rows.splice(i, 1); renderRows(); renderResults(); queueSave(); };
    if (r.n || r.m || r.c) confirmBox(`Remove subject ${i + 1}?`, 'This subject has data. Remove it?', 'Remove', remove);
    else remove();
  });

  const readCount = () => {
    const raw = $('#countIn').value.trim();
    const n = Number(raw);
    return raw !== '' && Number.isInteger(n) && n >= MIN && n <= MAX ? n : null;
  };

  const validateCount = () => {
    const n = readCount();
    const bad = n === null;
    $('#countIn').setAttribute('aria-invalid', String(bad));
    $('#countErr').textContent = bad ? `Enter a whole number from ${MIN} to ${MAX}` : '';
    return n;
  };

  $('#countIn').addEventListener('input', validateCount);
  $('#countIn').addEventListener('blur', () => {
    const n = readCount();
    if (n === null) {
      $('#countIn').value = rows.length;
      $('#countIn').setAttribute('aria-invalid', 'false');
      $('#countErr').textContent = '';
    } else if (n !== rows.length) {
      setCountDirect(n);
    }
  });
  $('#countIn').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }

    if (e.key === 'ArrowUp') { e.preventDefault(); setCountDirect(rows.length + 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCountDirect(rows.length - 1); }
  });

  $('#minus').addEventListener('click', () => setCountDirect(rows.length - 1));
  $('#plus').addEventListener('click', () => setCountDirect(rows.length + 1));

  $('#copyBtn').addEventListener('click', copyResult);
  $('#csvBtn').addEventListener('click', downloadCSV);
  $('#resetBtn').addEventListener('click', () => {
    if (hasData()) confirmBox('Reset calculator?', 'All subjects, marks and credits will be cleared, and saved data removed from this device.', 'Reset', resetAll);
    else resetAll();
  });

  $('#noteBtn').addEventListener('click', e => {
    const note = $('#note');
    const open = note.classList.toggle('is-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });

  initHeaderShadow();

  window.__ipuTests = () => {
    const marks = [
      [100, 'O'], [90, 'O'], [89.99, 'A+'], [89.5, 'A+'], [75, 'A+'], [74.99, 'A'],
      [70, 'A'], [65, 'A'], [64.99, 'B+'], [55, 'B+'], [54.99, 'B'], [50, 'B'],
      [49.99, 'C'], [45, 'C'], [44.99, 'P'], [40, 'P'], [39.99, 'F'], [39.9, 'F'], [0, 'F']
    ];
    const badMarks = marks.filter(([m, g]) => marksToGrade(m).letter !== g);

    const weighted = calculate([{ n:'', m:'85', c:'4' }, { n:'', m:'70', c:'3' }, { n:'', m:'92', c:'4' }]);

    const divs = [
      [10, 'exemplary'], [9.999, 'first'], [6.5, 'first'], [6.499, 'second'],
      [5, 'second'], [4.999, 'third'], [4, 'third'], [3.999, 'none'], [0, 'none']
    ];
    const badDiv = divs.filter(([v, k]) => classify(v).key !== k);

    const badLevel = [[10,'outstanding'],[9,'outstanding'],[8.99,'excellent'],[8,'excellent'],[7,'verygood'],[6,'good'],[5,'average'],[4,'pass'],[3.99,'below']]
      .filter(([v,k]) => levelOf(v).key !== k);
    const pass =
      !badMarks.length && !badDiv.length && !badLevel.length &&
      weighted.gpa === 9.09 && weighted.pts === 100 && weighted.cr === 11 &&
      calculate([]).gpa === null &&
      validCount(8) && !validCount(0) && !validCount(21) && !validCount(8.5);
    console.assert(pass, 'IPU self-tests failed', { badMarks, badDiv, badLevel, weighted });
    return pass;
  };
}

init();
})();
