/* planner-core.js — 여행 플래너의 계산과 저장. 화면 코드(planner.js)와 분리해 Node 에서도 시험한다(scripts/test_planner.mjs).
   - 날짜는 'YYYY-MM-DD'(현지 날짜), 시각은 'HH:MM' 문자열. 시간대 변환은 하지 않는다.
   - 환율은 "1 외화 단위당 기준 통화" 숫자. 환율표(fx.rates)는 원화 기준이라 기준 통화가 원이 아니면 교차 계산한다.
   - 기록마다 id · u(수정 시각) · del(삭제 표시)을 둔다. 나중에 서버 동기화가 기록 단위로 합칠 수 있게 하기 위해서다.
   - 저장은 IndexedDB(photo-map-planner). iOS 는 앱을 다시 켜면 localStorage 가 지워진 전례가 있어 쓰지 않는다. */
(function (root) {
'use strict';
const DATA = root.PLANNER_DATA;

// ---------- 기본 ----------
const uid = () => { try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (e) { /* ignore */ } return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };
const now = () => Date.now();
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseYmd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);   // b - a (일)
const live = (arr) => (arr || []).filter(x => x && !x.del);
const touch = (rec) => { rec.u = now(); return rec; };
const avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);

function newTrip(o) {
  const t = now();
  return Object.assign({ id: uid(), title: '', start: '', end: '', dests: [], cur: 'KRW', home: 'KRW', people: [], budget: {}, rateMode: 'auto', myRate: {},
    exchanges: [], items: [], bookings: [], expenses: [], diary: [], checklist: [], files: [], c: t, u: t }, o || {});
}
const tripDays = (t) => { const out = []; if (!t.start || !t.end || !parseYmd(t.start) || !parseYmd(t.end)) return out; const n = dayDiff(t.start, t.end); for (let i = 0; i <= n && i < 366; i++) out.push(addDays(t.start, i)); return out; };
const tripStatus = (t, td) => { td = td || today(); if (!t.start || !t.end) return 'upcoming'; if (td < t.start) return 'upcoming'; if (td > t.end) return 'past'; return 'ongoing'; };

// ---------- 정렬 키 ----------
// 두 키 사이에 들어갈 문자열을 만든다('0'~'z' 36진, a < 결과 < b). b 가 비면 맨 뒤, a 가 비면 맨 앞.
// 만들어지는 키는 '0'으로 끝나지 않으므로 어느 두 키 사이에도 항상 새 키를 끼울 수 있다.
const DIG = '0123456789abcdefghijklmnopqrstuvwxyz';
function midKey(a, b) {
  a = a || ''; b = b || '';
  let i = 0, out = '';
  for (;;) {
    const ca = i < a.length ? DIG.indexOf(a[i]) : 0;
    const cb = i < b.length ? DIG.indexOf(b[i]) : 36;
    if (cb - ca > 1) return out + DIG[(ca + cb) >> 1];
    out += DIG[ca]; i++;
    if (cb - ca === 1) {
      for (;;) { const c2 = i < a.length ? DIG.indexOf(a[i]) : 0; if (c2 < 35) return out + DIG[(c2 + 36) >> 1]; out += DIG[c2]; i++; }
    }
  }
}
// n 개를 고르게 벌려 새로 매긴다(동선 정리처럼 순서를 통째로 바꿀 때)
function seqKeys(n) { const out = []; const step = Math.floor(1296 / (n + 1)) || 1; for (let i = 0; i < n; i++) { const v = Math.min(1295, (i + 1) * step); out.push(DIG[Math.floor(v / 36)] + DIG[v % 36] + 'i'); } return out; }
const bySort = (a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0);

// ---------- 거리·이동 ----------
const hasLL = (x) => !!x && Number.isFinite(x.lat) && Number.isFinite(x.lon);
function hav(aLat, aLon, bLat, bLon) {
  const R = 6371, r = Math.PI / 180; const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
// 이동 어림: 직선거리에 우회 계수를 곱한다. 걸어서 1.5km 이하면 도보(시속 4.5km), 그보다 멀면 차·대중교통(평균 속도 + 대기 8분).
// 실제 길찾기가 아니라 일정이 빡빡한지 가늠하는 값이다.
// 이동 수단별 어림: [평균 속도(km/h), 직선거리 보정, 기다리거나 수속하는 시간(분)]
const MOVE = { walk: [4.5, 1.3, 0], subway: [32, 1.3, 8], bus: [18, 1.4, 8], train: [80, 1.2, 15], taxi: [26, 1.4, 4], car: [32, 1.4, 4], plane: [650, 1.05, 100], ferry: [35, 1.2, 25] };
function legEstimate(a, b, mode) {
  if (!hasLL(a) || !hasLL(b)) return null;
  const km = hav(a.lat, a.lon, b.lat, b.lon);
  if (mode && MOVE[mode]) { const m = MOVE[mode]; return { km, mode, min: Math.max(1, Math.round(km * m[1] / m[0] * 60 + m[2])) }; }   // 고른 수단으로 어림
  const walkKm = km * 1.3;
  if (walkKm <= 1.5) return { km, mode: 'walk', min: Math.max(1, Math.round(walkKm / 4.5 * 60)) };
  const speed = km > 60 ? 70 : km > 15 ? 35 : 22;   // 먼 거리는 철도·고속도로 기준
  return { km, mode: 'ride', min: Math.round(km * 1.4 / speed * 60 + 8) };
}
/** 이 항목에서 다음 항목으로 가는 이동 설정 { to, mode, min, cost, memo }. 순서가 바뀌어 다음 항목이 달라졌으면 쓰지 않는다. 예전 기록(legMin)은 시간만 */
function legOf(it, next) {
  const L = it && it.leg; if (L && (!L.to || !next || L.to === next.id)) return L;
  return it && !L && Number.isFinite(it.legMin) ? { min: it.legMin } : null;
}
const STAY_DEFAULT = 60;   // 머무는 시간 기본값(분)
const dayItems = (trip, day) => live(trip.items).filter(i => (i.day || null) === (day || null)).sort(bySort);
// 하루 일정: 순서대로의 항목, 항목 사이 이동(legs[i] = i → i+1), 이동·머무는 시간 합계
function dayPlan(trip, day) {
  const items = dayItems(trip, day); const legs = []; let moveMin = 0, stayMin = 0, km = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== 'note') stayMin += Number.isFinite(it.stay) ? it.stay : STAY_DEFAULT;
    if (i + 1 < items.length) {
      const nx = items[i + 1]; const L = legOf(it, nx); let leg = legEstimate(it, nx, L && L.mode);
      if (L) {   // 직접 정한 이동: 수단(chosen) · 시간(manual) · 요금 · 메모
        if (L.min > 0) leg = Object.assign(leg || { km: null }, { min: L.min, manual: true }); else if (!leg && (L.mode || L.cost || L.memo)) leg = { km: null, min: 0 };
        if (leg) { if (L.mode) { leg.mode = L.mode; leg.chosen = true; } else if (!leg.mode) leg.mode = 'ride'; if (L.cost && L.cost.amt > 0) leg.cost = L.cost; if (L.memo) leg.memo = L.memo; }
      }
      legs.push(leg); if (leg) { moveMin += leg.min || 0; if (leg.km) km += leg.km; }
    }
  }
  return { items, legs, moveMin, stayMin, totalMin: moveMin + stayMin, km };
}

// ---------- 동선 정리 ----------
function pathKm(seq) { let d = 0, prev = null; for (const p of seq) { if (!hasLL(p)) continue; if (prev) d += hav(prev.lat, prev.lon, p.lat, p.lon); prev = p; } return d; }
// 한 구간(양 끝 고정 가능)의 가장 짧은 순서. 8곳 이하는 모든 순서를 따져 정확히, 그보다 많으면 가까운 곳부터 잇고 2-opt 로 다듬는다.
function bestOrder(list, start, end) {
  const n = list.length; if (n <= 1) return list.slice();
  const cost = (seq) => pathKm([start].concat(seq, [end]).filter(Boolean));
  if (n <= 8) {
    let best = list.slice(), bestC = cost(best);
    const perm = list.slice(); const c = new Array(n).fill(0); let i = 0;   // Heap 순열
    while (i < n) {
      if (c[i] < i) { const k = i % 2 === 0 ? 0 : c[i]; const t = perm[k]; perm[k] = perm[i]; perm[i] = t; const cc = cost(perm); if (cc < bestC - 1e-9) { bestC = cc; best = perm.slice(); } c[i]++; i = 0; }
      else { c[i] = 0; i++; }
    }
    return best;
  }
  const rest = list.slice(); let seq = []; let cur = start;
  if (!cur) { cur = rest.shift(); seq.push(cur); }
  while (rest.length) { let bi = 0, bd = Infinity; for (let k = 0; k < rest.length; k++) { const d = hav(cur.lat, cur.lon, rest[k].lat, rest[k].lon); if (d < bd) { bd = d; bi = k; } } cur = rest.splice(bi, 1)[0]; seq.push(cur); }
  let improved = true, guard = 0;
  while (improved && guard++ < 60) {
    improved = false;
    for (let a = 0; a < seq.length - 1; a++) for (let b = a + 1; b < seq.length; b++) {
      const cand = seq.slice(0, a).concat(seq.slice(a, b + 1).reverse(), seq.slice(b + 1));
      if (cost(cand) < cost(seq) - 1e-9) { seq = cand; improved = true; }
    }
  }
  return seq;
}
// 하루 동선 정리: 시각이 정해졌거나 좌표가 없는 항목은 제자리에 두고, 그 사이 구간의 순서만 가장 짧게 바꾼다.
// opts.start / opts.end = 숙소처럼 하루의 출발·도착 지점({lat, lon}). 없으면 열린 경로로 계산한다.
function optimizeDay(items, opts) {
  opts = opts || {};
  const fixed = (it) => !!it.time || !hasLL(it) || it.kind === 'note' || !!it.stayId || !!it.wayId;   // 일정에 넣은 숙소·도착지·출발지는 그 자리에 둔다
  const out = []; let seg = [];
  const lastLL = () => { for (let i = out.length - 1; i >= 0; i--) if (hasLL(out[i])) return out[i]; return opts.start || null; };
  const flush = (next) => { if (seg.length) { out.push(...bestOrder(seg, lastLL(), next)); seg = []; } };
  for (const it of items) { if (fixed(it)) { flush(hasLL(it) ? it : null); out.push(it); } else seg.push(it); }
  flush(opts.end || null);
  const ends = (seq) => pathKm([opts.start].concat(seq, [opts.end]).filter(Boolean));
  const before = ends(items), after = ends(out);
  if (after >= before - 1e-6) return { order: items.slice(), before, after: before, changed: false };
  return { order: out, before, after, changed: true };
}

// ---------- 날짜에 자동 배분 ----------
// 가고 싶은 곳(날짜 미정)을 가까운 것끼리 묶어 날짜별로 나눈다. 하루 활동 시간(기본 8시간)을 넘기지 않으며, 넘치는 곳은 남겨 둔다.
function distribute(trip, opts) {
  opts = opts || {}; const capMin = (opts.hours || 8) * 60; const MOVE = 25;
  const days = (opts.days && opts.days.length) ? opts.days : tripDays(trip);
  const wish = dayItems(trip, null).filter(hasLL);
  if (!days.length || !wish.length) return { assign: {}, left: wish.map(w => w.id) };
  const cost = (it) => (Number.isFinite(it.stay) ? it.stay : STAY_DEFAULT) + MOVE;
  const base = {}, cen = {};
  for (const d of days) { const p = dayPlan(trip, d); base[d] = p.totalMin; const ll = p.items.filter(hasLL); cen[d] = ll.length ? { lat: avg(ll.map(x => x.lat)), lon: avg(ll.map(x => x.lon)) } : null; }
  // 빈 날의 중심: 이미 정해진 중심들과 가장 먼 곳부터 씨앗으로 고른다
  const seeds = Object.values(cen).filter(Boolean).slice();
  const empties = days.filter(d => !cen[d]); const picked = [];
  for (let k = 0; k < empties.length && picked.length < wish.length; k++) {
    let best = null, bestD = -1;
    for (const w of wish) { if (picked.includes(w)) continue; const all = seeds.concat(picked); const dmin = all.length ? Math.min(...all.map(s => hav(w.lat, w.lon, s.lat, s.lon))) : 0; if (dmin > bestD) { bestD = dmin; best = w; } }
    if (!best) break; picked.push(best);
  }
  // 빈 날에 씨앗을 이어지는 순서로 놓는다(바로 앞 날의 중심에서 가까운 것부터)
  let prev = null; const pool = picked.slice();
  for (const d of days) {
    if (cen[d]) { prev = cen[d]; continue; }
    if (!pool.length) continue;
    let bi = 0; if (prev) { let bd = Infinity; pool.forEach((s, i) => { const dd = hav(prev.lat, prev.lon, s.lat, s.lon); if (dd < bd) { bd = dd; bi = i; } }); }
    const s = pool.splice(bi, 1)[0]; cen[d] = { lat: s.lat, lon: s.lon }; prev = cen[d];
  }
  let assign = {}, left = [];
  for (let iter = 0; iter < 3; iter++) {
    assign = {}; left = []; const load = Object.assign({}, base); const act = days.filter(d => cen[d]);
    const order = wish.map(w => ({ w, d: Math.min(...act.map(d => hav(w.lat, w.lon, cen[d].lat, cen[d].lon))) })).sort((a, b) => a.d - b.d);
    for (const { w } of order) {
      const cands = act.map(d => ({ d, km: hav(w.lat, w.lon, cen[d].lat, cen[d].lon) })).sort((a, b) => a.km - b.km);
      const hit = cands.find(c => load[c.d] + cost(w) <= capMin);
      if (hit) { assign[w.id] = hit.d; load[hit.d] += cost(w); } else left.push(w.id);
    }
    for (const d of act) {   // 중심 다시 계산(이미 있던 일정 + 새로 담긴 곳)
      const ll = dayPlan(trip, d).items.filter(hasLL).concat(wish.filter(w => assign[w.id] === d));
      if (ll.length) cen[d] = { lat: avg(ll.map(x => x.lat)), lon: avg(ll.map(x => x.lon)) };
    }
  }
  return { assign, left };
}

// ---------- 환율·경비 ----------
function curInfo(cur) { const c = DATA.CUR[cur]; return { sym: c ? c[0] : cur, dec: c ? c[1] : 2, unit: c ? c[2] : 1 }; }
function fmtNum(n, dec, locale) { try { return Number(n).toLocaleString(locale || 'ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: dec == null ? 2 : dec }); } catch (e) { return String(n); } }
function fmtMoney(n, cur, locale) {
  if (n == null || !Number.isFinite(n)) return '–';
  const c = curInfo(cur); const v = c.dec === 0 ? Math.round(n) : n;
  return (v < 0 ? '-' : '') + c.sym + (/[\p{L}]$/u.test(c.sym) ? ' ' : '') + fmtNum(Math.abs(v), c.dec, locale);
}
// 환율표에서 cur → home (1 cur 당 home). 표에 없으면 null
function fxRate(fx, cur, home) { if (cur === home) return 1; const r = fx && fx.rates; if (!r || !(r[cur] > 0) || !(r[home] > 0)) return null; return r[cur] / r[home]; }
// "¥100 = ₩930" 처럼 고시 단위에 맞춘 환율 문구
function rateText(cur, rate, home, locale) { if (!(rate > 0)) return ''; const u = curInfo(cur).unit; const h = curInfo(home); const v = rate * u; const dec = h.dec === 0 ? (v < 100 ? 2 : v < 1000 ? 1 : 0) : 4; return fmtMoney(u, cur, locale) + ' = ' + h.sym + (/[\p{L}]$/u.test(h.sym) ? ' ' : '') + fmtNum(v, dec, locale); }
// 내 환전 환율: 환전 기록의 평균 단가(1 외화당 기준 통화). 기록이 없으면 직접 적은 값(trip.myRate[cur])
function myRate(trip, cur) {
  let f = 0, h = 0; for (const x of live(trip.exchanges)) if (x.cur === cur && x.foreign > 0 && x.home > 0) { f += x.foreign; h += x.home; }
  if (f > 0) return h / f;
  const m = trip.myRate && trip.myRate[cur]; return m > 0 ? m : null;
}
// 지출 한 건의 기준 통화 금액. basis: same(같은 통화) · billed(실제 청구액) · mine(내 환전 환율) · auto(적을 때의 고시환율) · none(환율 없음)
function expenseHome(trip, e, fx) {
  const home = trip.home || 'KRW';
  if (!Number.isFinite(e.amt)) return { home: null, rate: null, basis: 'none' };   // 금액이 깨진 기록 하나가 합계·정산을 전부 망가뜨리지 않게
  if (e.cur === home) return { home: e.amt, rate: 1, basis: 'same' };
  if (e.basis === 'billed' && e.home > 0 && e.amt > 0) return { home: e.home, rate: e.home / e.amt, basis: 'billed' };
  if (e.basis === 'mine' && (!e.payer || !trip.meId || e.payer === trip.meId)) { const r = myRate(trip, e.cur); if (r) return { home: e.amt * r, rate: r, basis: 'mine' }; }   // 내 환전 환율은 내가 낸 지출에만(남이 낸 것은 그 사람이 적을 때의 환율 rate 로)
  const r = e.rate > 0 ? e.rate : fxRate(fx, e.cur, home);
  return r ? { home: e.amt * r, rate: r, basis: 'auto', approx: e.rate > 0 ? !!e.approx : !!(fx && fx.approx) } : { home: null, rate: null, basis: 'none' };
}
function totals(trip, fx) {
  const byCat = {}, byDay = {}, byMethod = {}; let sum = 0, unknown = 0, approx = false, n = 0;
  for (const e of live(trip.expenses)) {
    const h = expenseHome(trip, e, fx); n++;
    if (h.home == null) { unknown++; continue; }
    if (h.approx) approx = true;
    sum += h.home; byCat[e.cat] = (byCat[e.cat] || 0) + h.home; byDay[e.day] = (byDay[e.day] || 0) + h.home; byMethod[e.method] = (byMethod[e.method] || 0) + h.home;
  }
  let prepaid = 0; for (const b of live(trip.bookings)) if (b.paid > 0) prepaid += b.paid;
  return { sum, prepaid, all: sum + prepaid, byCat, byDay, byMethod, unknown, approx, n };
}
// 환전 지갑: 산 외화, 쓴 외화(내 환전 환율로 적은 지출), 남은 외화, 평균 단가
function wallet(trip, cur) {
  let bought = 0, paid = 0; for (const x of live(trip.exchanges)) if (x.cur === cur) { bought += x.foreign || 0; paid += x.home || 0; }
  let spent = 0; for (const e of live(trip.expenses)) if (e.cur === cur && e.basis === 'mine') spent += e.amt || 0;
  return { bought, paid, spent, left: bought - spent, avg: bought > 0 ? paid / bought : null };
}
// 내가 쓴 돈(11-19 사용자: "지금까지 쓴 돈도 같이 가는 사람이랑 다를 수 있다"): 함께 쓴 돈 중 내 몫 + 내 개인 지출 + 미리 결제한 예약의 1인 몫.
// 혼자 가는 여행은 totals 와 같다. shared·solo: 그 둘, groupShared: 함께 쓴 돈 전체, prepaidAll: 미리 결제 전체(사람 수로 나눈 것이 prepaid)
function myTotals(trip, fx) {
  const ids = live(trip.people || []).map(p => p.id); const n = Math.max(1, ids.length); const me = ids.includes(trip.meId) ? trip.meId : null;
  const byCat = {}, byDay = {}, byMethod = {}; let sum = 0, shared = 0, solo = 0, groupShared = 0, unknown = 0, approx = false, cnt = 0;
  for (const e of live(trip.expenses)) {
    const h = expenseHome(trip, e, fx); cnt++;
    if (h.home == null) { unknown++; continue; }
    const s = shareOf(trip, e); if (s.shared) groupShared += h.home;
    const part = n <= 1 || me == null ? h.home : (s.among.includes(me) ? h.home / s.among.length : 0);   // 내가 누구인지 모르면(드묾) 전체로 본다
    if (!(part > 0)) continue;
    if (h.approx) approx = true;
    sum += part; if (s.shared) shared += part; else solo += part;
    byCat[e.cat] = (byCat[e.cat] || 0) + part; byDay[e.day] = (byDay[e.day] || 0) + part; byMethod[e.method] = (byMethod[e.method] || 0) + part;
  }
  let prepaidAll = 0; for (const b of live(trip.bookings)) if (b.paid > 0) prepaidAll += b.paid;
  const prepaid = prepaidAll / n;
  return { sum, shared, solo, groupShared, prepaid, prepaidAll, all: sum + prepaid, byCat, byDay, byMethod, unknown, approx, n: cnt, people: n };
}
// 예산은 1인 기준 · 사람마다 따로(나만 보는 부분의 myBudget). 예전 버전이 적어 둔 여행 전체 예산(trip.budget)만 있으면 사람 수로 나눠 쓴다
function budgetOf(trip) {
  const m = trip.myBudget; if (m && typeof m === 'object') return { total: m.total > 0 ? m.total : null, daily: m.daily > 0 ? m.daily : null, own: true };
  const b = trip.budget || {}; const n = Math.max(1, live(trip.people || []).length);
  return { total: b.total > 0 ? b.total / n : null, daily: b.daily > 0 ? b.daily / n : null, own: false };
}
// 예산: 내 예산, 하루 예산(직접 정하지 않았으면 (예산 - 미리 결제한 내 몫) ÷ 일수), 오늘 쓴 돈과 남은 돈 — 모두 '내가 쓴 돈' 기준
function budgetInfo(trip, fx, day) {
  const t = myTotals(trip, fx); const days = tripDays(trip).length || 1; const b = budgetOf(trip);
  const total = b.total;
  const daily = b.daily != null ? b.daily : (total != null ? Math.max(0, total - t.prepaid) / days : null);
  const todaySpent = day ? (t.byDay[day] || 0) : 0;
  return { total, daily, spent: t.all, left: total != null ? total - t.all : null, todaySpent, todayLeft: daily != null ? daily - todaySpent : null, totals: t };
}

// ---------- 가는 방법 · 오는 방법 · 숙소 ----------
// 예약 기록(bookings) 위에 얹는다: dir 이 'go'·'back' 인 것이 가는·오는 방법의 단계(mode·from·to·day), kind 가 'stay' 인 것이 숙소(lat·lon).
const dayPart = (s) => String(s || '').slice(0, 10);
const ways = (t, dir) => live(t.bookings || []).filter(b => b.dir === dir).sort((a, b) => ((a.sort || '') < (b.sort || '') ? -1 : (a.sort || '') > (b.sort || '') ? 1 : String(a.start || '').localeCompare(String(b.start || ''))));
/** 그 단계가 놓이는 날: 적어 둔 날짜 → 시각의 날짜 → 가는 길은 첫날, 오는 길은 마지막 날 */
const wayDay = (t, b) => b.day || dayPart(b.start) || dayPart(b.end) || (b.dir === 'back' ? t.end : t.start) || '';
const stays = (t) => live(t.bookings || []).filter(b => b.kind === 'stay').sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
/** 그 날 밤에 묵는 숙소(체크인 ≤ 날짜 < 체크아웃). 날짜를 안 적은 숙소는 여행 내내 묵는 것으로 본다 */
function stayOn(t, day) {
  if (!day) return null;
  for (const s of stays(t)) { const a = dayPart(s.start) || t.start || '', z = dayPart(s.end) || t.end || ''; if (a <= day && day < z) return s; }
  return null;
}

// ---------- 참여자 · 함께 쓴 돈 정산 ----------
const people = (t) => live(t.people || []);
/** 이 기기의 사용자에 해당하는 참여자(t.meId). 없으면 만들어 맨 앞에 넣는다 — 예전에 만든 여행도 열 때 채운다 */
function ensureMe(t, name) {
  t.people = t.people || [];
  let me = t.meId ? t.people.find(p => p.id === t.meId && !p.del) : null;
  if (!me) { me = { id: uid(), name: name || '', c: now(), u: now() }; t.people.unshift(me); t.meId = me.id; }
  return me;
}
/** 이 지출을 낸 사람과 나눠 내는 사람들. share.mode: all(모두) · some(고른 사람) · 그 밖(낸 사람만 = 개인) */
function shareOf(t, e) {
  const ids = people(t).map(p => p.id); const payer = ids.includes(e.payer) ? e.payer : (ids.includes(t.meId) ? t.meId : ids[0]);
  const sh = e.share || {}; let among = sh.mode === 'all' ? ids : sh.mode === 'some' ? (sh.ids || []).filter(i => ids.includes(i)) : [payer];
  if (!among.length) among = [payer];
  return { payer, among, shared: among.length > 1 || among[0] !== payer };
}
/** 개인 지출인가(낸 사람 혼자의 몫). 개인 지출은 본인만 적고 본인만 본다 — 서버가 다른 참여자에게 보내지 않는다(본인이 보이게 해 두었을 때만) */
const isPersonal = (t, e) => !shareOf(t, e).shared;
/** 서버(trips.py 의 _personal)와 같은 셈: 여행의 '나'와 상관없이 기록만 보고 가린다 */
const personalRec = (e, ids) => { const sh = (e && e.share) || {}; const among = sh.mode === 'all' ? ids : sh.mode === 'some' ? (sh.ids || []).filter(i => ids.includes(i)) : []; return !among.length || (among.length === 1 && among[0] === e.payer); };
/** 정산: 사람마다 낸 돈·자기 몫·차액, 그리고 덜 낸 사람이 더 낸 사람에게 줄 돈(기준 통화) */
function settle(t, fx) {
  const ps = people(t); const paid = {}, owe = {}; ps.forEach(p => { paid[p.id] = 0; owe[p.id] = 0; });
  // 주고받을 돈(bal·transfers)은 함께 쓴 지출 가운데 '나중에 정산'으로 둔 것만으로 셈한다. 그 자리에서 나눠 냈거나 이미 정산한 것(share.done)과 개인 지출은 주고받을 것이 없다.
  // paid·share 는 전체(개인·이미 나눈 것 포함)의 낸 돈과 자기 몫 — 한 사람이 여행에 쓴 돈을 보여 줄 때 쓴다.
  // sPaid·sShare 는 함께 쓴 지출만의 낸 돈과 몫 — 개인 지출은 본인에게만 보이므로, 사람끼리 견주거나 남에게 보내는 글에는 이것을 쓴다.
  let shared = 0, solo = 0, unknown = 0, pending = 0, done = 0, pendingN = 0, doneN = 0; const bp = {}, bo = {}, sp = {}, so = {}; ps.forEach(p => { bp[p.id] = 0; bo[p.id] = 0; sp[p.id] = 0; so[p.id] = 0; });
  for (const e of live(t.expenses)) {
    const h = expenseHome(t, e, fx); if (h.home == null) { unknown++; continue; }
    const s = shareOf(t, e); if (s.payer == null) continue;
    paid[s.payer] += h.home; const each = h.home / s.among.length; for (const i of s.among) owe[i] += each;
    if (!s.shared) { solo += h.home; continue; }
    shared += h.home; sp[s.payer] += h.home; for (const i of s.among) so[i] += each;
    if (e.share && e.share.done) { done += h.home; doneN++; continue; }
    pending += h.home; pendingN++; bp[s.payer] += h.home; for (const i of s.among) bo[i] += each;
  }
  const k = Math.pow(10, curInfo(t.home || 'KRW').dec); const r = (v) => Math.round(v * k) / k; const eps = 0.5 / k;
  const bal = ps.map(p => ({ id: p.id, paid: paid[p.id], share: owe[p.id], sPaid: sp[p.id], sShare: so[p.id], bal: r(bp[p.id] - bo[p.id]), pendPaid: bp[p.id], pendShare: bo[p.id] }));
  const debt = bal.filter(x => x.bal < -eps).map(x => ({ id: x.id, v: -x.bal })).sort((a, b) => b.v - a.v);
  const cred = bal.filter(x => x.bal > eps).map(x => ({ id: x.id, v: x.bal })).sort((a, b) => b.v - a.v);
  const transfers = []; let i = 0, j = 0;
  while (i < debt.length && j < cred.length) {
    const v = Math.min(debt[i].v, cred[j].v); if (v > eps) transfers.push({ from: debt[i].id, to: cred[j].id, amt: r(v) });
    debt[i].v -= v; cred[j].v -= v; if (debt[i].v <= eps) i++; if (cred[j].v <= eps) j++;
  }
  return { people: bal, transfers, shared, solo, unknown, pending, done, pendingN, doneN };
}

// ---------- 서버 저장: 함께 보는 부분 / 나만 보는 부분, 합치기 ----------
// 서버(server/trips.py)와 같은 규칙: 묶음 정보(제목·날짜·여행지·예산)는 mu 가 큰 쪽, 기록은 id 별로 u 가 큰 쪽(같으면 지운 쪽). 지운 기록은 del 표시로 남긴다.
const REC_KEYS = ['items', 'expenses', 'bookings', 'people'];
const META_KEYS = ['title', 'start', 'end', 'dests', 'cur', 'home', 'budget'];
const PRIV_KEYS = ['diary', 'exchanges', 'checklist'];
const PRIV_META = ['myRate', 'rateMode', 'soloOpen', 'myBudget'];   // soloOpen: 내 개인 지출을 함께 가는 사람에게 보일지 · myBudget: 내 예산(1인 기준)
const stampOf = (r) => (r && (r.u || r.c)) || 0;
function mergeRecs(a, b, mark) {
  const d = new Map(); for (const r of a || []) if (r && r.id) d.set(r.id, r);
  for (const r of b || []) {
    if (!r || !r.id) continue; const cur = d.get(r.id);
    if (!cur || stampOf(r) > stampOf(cur) || (stampOf(r) === stampOf(cur) && r.del && !cur.del)) { d.set(r.id, r); if (mark) mark.n++; }
  }
  return Array.from(d.values());
}
const pubDoc = (t) => { const o = { id: t.id, c: t.c || 0, u: t.u || 0, mu: t.mu || t.c || 0 }; for (const k of META_KEYS) if (t[k] !== undefined) o[k] = t[k]; for (const k of REC_KEYS) o[k] = t[k] || []; return o; };
const privDoc = (t) => { const o = { u: t.u || 0 }; for (const k of PRIV_META) if (t[k] !== undefined) o[k] = t[k]; for (const k of PRIV_KEYS) o[k] = t[k] || []; return o; };
/** 서버에서 온 여행 j = { doc, priv, members, rev, owner, mine, invite, inviteUrl } 을 기기의 여행 t 에 합친다. 서버 쪽에서 바뀐 것이 있었으면 true */
function applyRemote(t, j, myUid) {
  const d = j.doc || {}; const mark = { n: 0 };
  if ((d.mu || 0) > (t.mu || 0) || t.mu === undefined) { for (const k of META_KEYS) if (d[k] !== undefined && JSON.stringify(d[k]) !== JSON.stringify(t[k])) { t[k] = d[k]; mark.n++; } t.mu = d.mu || t.mu || 0; }
  for (const k of REC_KEYS) t[k] = mergeRecs(t[k], d[k], mark);
  if (j.priv) { if ((j.priv.u || 0) > (t.u || 0)) for (const k of PRIV_META) if (j.priv[k] !== undefined) t[k] = j.priv[k]; for (const k of PRIV_KEYS) t[k] = mergeRecs(t[k], j.priv[k], mark); }
  const me = (j.members || []).find(m => m.uid === myUid);
  if (me && me.pid && (t.people || []).some(p => p.id === me.pid && !p.del)) t.meId = me.pid;
  // 다른 사람의 개인 지출은 서버가 보내지 않는다. 폰에 남아 있던 것(예전 버전에서 받은 것, 그 사람이 '나만 보기'로 바꾼 것)은 내린다
  const linked = new Map((j.members || []).filter(m => m.pid).map(m => [m.pid, m.uid]));
  if (myUid != null && linked.size > 1 && Array.isArray(d.expenses)) {
    const got = new Set(d.expenses.map(e => e && e.id)); const ids = live(t.people || []).map(p => p.id); const n0 = (t.expenses || []).length;
    t.expenses = (t.expenses || []).filter(e => { if (!e || got.has(e.id)) return true; const own = linked.get(e.payer); return own == null || own === myUid || !personalRec(e, ids); });
    if (t.expenses.length !== n0) mark.n++;
  }
  const old = t.cloud || {};
  t.cloud = { rev: j.rev, owner: j.owner, mine: !!j.mine, members: j.members || [], invite: j.invite || null, inviteUrl: j.inviteUrl || null, pushedU: old.pushedU || 0, at: now(), acct: myUid != null ? myUid : (old.acct != null ? old.acct : null) };   // acct: 이 여행을 맞춘 계정(로그아웃·다른 계정이면 폰에서 내린다)
  t.c = t.c || d.c || now(); t.u = Math.max(t.u || 0, d.u || 0);
  return mark.n > 0 || JSON.stringify(old.members || []) !== JSON.stringify(t.cloud.members) || (old.invite || null) !== t.cloud.invite;
}

// ---------- 사진으로 방문 확인 ----------
// 여행 기간에 사진이 찍힌 자리(stops[].pts = [위도, 경도]) 가운데 일정 장소에서 400m 안에 있는 것이 있으면 다녀온 것으로 본다.
function autoVisited(trip, stops) {
  const out = []; if (!stops || !trip.start || !trip.end) return out;
  const pts = [];
  for (const s of stops) {
    const a = (s.dates && s.dates[0]) || String(s.start || '').slice(0, 10), b = (s.dates && s.dates[1]) || String(s.end || '').slice(0, 10);
    if (!a || !b || b < trip.start || a > trip.end) continue;
    for (const p of (s.pts || [])) pts.push(p);
  }
  if (!pts.length) return out;
  for (const it of live(trip.items)) { if (!hasLL(it) || it.done || !it.day) continue; for (const p of pts) { if (hav(it.lat, it.lon, p[0], p[1]) <= 0.4) { out.push(it.id); break; } } }
  return out;
}

// ---------- 저장 (IndexedDB) ----------
const Store = (() => {
  const NAME = 'photo-map-planner', VER = 2; let dbp = null;   // 2: files(붙인 표·확인서 파일. 기기에만 둔다)
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    let rq; try { rq = root.indexedDB.open(NAME, VER); } catch (e) { rej(e); return; }
    rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains('trips')) d.createObjectStore('trips', { keyPath: 'id' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' }); };
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); rq.onblocked = () => rej(new Error('blocked'));
    setTimeout(() => rej(new Error('timeout')), 5000);   // 열기가 끝나지 않으면 포기한다(한 번 실패했다고 계속 막히지 않게 아래에서 지운다)
  }).catch((e) => { dbp = null; throw e; }));
  const tx = (store, mode, fn) => open().then(d => new Promise((res, rej) => { const t = d.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r ? r.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }));
  return {
    all: () => tx('trips', 'readonly', s => s.getAll()),
    put: (trip) => tx('trips', 'readwrite', s => s.put(trip)),
    del: (id) => tx('trips', 'readwrite', s => s.delete(id)),
    getMeta: (k) => tx('meta', 'readonly', s => s.get(k)),
    putMeta: (k, v) => tx('meta', 'readwrite', s => s.put(v, k)),
    putFile: (f) => tx('files', 'readwrite', s => s.put(f)),   // { id, name, mime, buf(ArrayBuffer) }
    getFile: (id) => tx('files', 'readonly', s => s.get(id)),
    delFile: (id) => tx('files', 'readwrite', s => s.delete(id)),
    fileKeys: () => tx('files', 'readonly', s => s.getAllKeys()),
  };
})();

root.PlannerCore = { uid, now, ymd, parseYmd, today, addDays, dayDiff, live, touch, newTrip, tripDays, tripStatus, midKey, seqKeys, bySort, hasLL, hav, legEstimate, legOf, MOVE, dayPart, ways, wayDay, stays, stayOn,
  STAY_DEFAULT, dayItems, dayPlan, pathKm, bestOrder, optimizeDay, distribute, curInfo, fmtNum, fmtMoney, fxRate, rateText, myRate, expenseHome, totals, myTotals, wallet, budgetOf, budgetInfo, people, ensureMe, shareOf, isPersonal, personalRec, settle, mergeRecs, pubDoc, privDoc, applyRemote, autoVisited, Store };
})(typeof self !== 'undefined' ? self : globalThis);
