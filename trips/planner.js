/* planner.js — 여행 탭: 여행 목록(탑승권 카드) · 여행 만들기 · 일정과 루트 · 경비와 환율 · 한 줄 일기 · 준비.
   계산·저장은 planner-core.js, 지도는 planner-map.js, 정적 데이터는 planner-data.js.
   app.js 가 boot 안에서 Planner.init(host) 를 부른다. host = { tr, askConfirm, openExternal, shareText, login, nlog, api, setBusy, DATA, demo, platform }.
   화면 구조: 탭 본문(#pl-list) → 하위 화면(#pl-screen, 스택) → 바텀시트(#pl-sheet). 모든 버튼은 data-act 로 한 곳(ACT)에서 처리한다.
   새 문구를 넣으면 i18n.js 의 en/ja 사전에도 같은 키를 넣는다(한국어 원문이 키). */
(function (root) {
'use strict';
const C = root.PlannerCore, PD = root.PLANNER_DATA;
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let H = null;
const tr = (k, p) => (H ? H.tr(k, p) : k);
const I18 = () => root.I18N || { lang: 'ko', locale: 'ko-KR' };
const LANG = () => I18().lang, LOCALE = () => I18().locale;
const money = (n, cur) => C.fmtMoney(n, cur, LOCALE());
const log = (t) => { try { if (H && H.nlog) H.nlog('[planner] ' + t); } catch (e) { /* ignore */ } };

const BACK_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const MORE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLOSE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const SEARCH_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const PLUS_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const PIN_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.500" r="2.500" stroke="currentColor" stroke-width="2"/></svg>';
const CITY_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 20V9l5-3v14M9 20V4l6 3v13M15 20v-8l5 2v6M3 20h18" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const PEN_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9l-4-4L4 16v4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13.500 6.500l4 4" stroke="currentColor" stroke-width="2"/></svg>';
const SHARE_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 15V4M12 4L8 8M12 4l4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const LINK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const TEXT_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 6h14M5 11h14M5 16h9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const SEC_ICON = {   // 맨 아래 탭(일정·경비·일기·준비)
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M15.5 14.5h2"/></svg>',
  diary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h11a1.5 1.5 0 011.5 1.500v14A1.500 1.500 0 0117 20.500H6a2 2 0 01-2-2v-13a2 2 0 012-2z"/><path d="M8 3.5v17M11.5 8.500h4M11.500 12h4"/></svg>',
  prep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></svg>',
};
SEC_ICON.comm = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h10.500a2 2 0 012 2v5.500a2 2 0 01-2 2H9.500L6 17.500v-3H4a2 2 0 01-2-2V7a2 2 0 012-2z"/><path d="M19.500 10H20a2 2 0 012 2v4a2 2 0 01-2 2v2.500L17.500 18H13"/></svg>';
SEC_ICON.home = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.500 11.500L12 4l8.500 7.500"/><path d="M5.500 10v9a1 1 0 001 1H10v-5.500h4V20h3.500a1 1 0 001-1v-9"/></svg>';
const PEOPLE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="2"/><path d="M3 19c.6-3 3-4.600 6-4.600s5.400 1.600 6 4.600" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="9" r="2.400" stroke="currentColor" stroke-width="2"/><path d="M17.500 14.600c2 .300 3.300 1.600 3.700 3.600" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const CLOUD_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 18a4 4 0 0 1-.600-7.950A5.500 5.500 0 0 1 17 8.500a4.750 4.750 0 0 1 .500 9.500H7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const SPARK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M19 15l.800 2.200L22 18l-2.200.800L19 21l-.800-2.200L16 18l2.200-.800L19 15z" stroke="currentColor" stroke-width="1.600" stroke-linejoin="round"/></svg>';
const MOVE_ICON = {
  walk: '<svg viewBox="0 0 24 24" fill="none"><circle cx="13.500" cy="4.500" r="1.900" fill="currentColor"/><path d="M12.500 8.500L9 11v3.500M12.500 8.500l2.800 3.300 3.200.900M12.500 8.500L11 14l3 3v4.500M11 14l-1.800 3.200L6.500 20" stroke="currentColor" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  subway: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="14" rx="3" stroke="currentColor" stroke-width="1.900"/><path d="M6 11h12M9 20.500l1.500-3.500M15 20.500L13.500 17" stroke="currentColor" stroke-width="1.900" stroke-linecap="round"/><circle cx="9.500" cy="14" r="1" fill="currentColor"/><circle cx="14.500" cy="14" r="1" fill="currentColor"/></svg>',
  bus: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="13" rx="2.500" stroke="currentColor" stroke-width="1.900"/><path d="M4 11h16" stroke="currentColor" stroke-width="1.900"/><circle cx="8" cy="19.500" r="1.600" fill="currentColor"/><circle cx="16" cy="19.500" r="1.600" fill="currentColor"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7c3 0 5 3 5 7v4a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.900"/><path d="M5 10h14M9 20.500l1-3.500M15 20.500L14 17" stroke="currentColor" stroke-width="1.900" stroke-linecap="round"/></svg>',
  taxi: '<svg viewBox="0 0 24 24" fill="none"><path d="M9.500 6V4h5v2M5 12l1.500-4.500A2 2 0 0 1 8.400 6h7.200a2 2 0 0 1 1.900 1.500L19 12M4 12h16v5H4z" stroke="currentColor" stroke-width="1.900" stroke-linejoin="round"/><circle cx="8" cy="18.500" r="1.500" fill="currentColor"/><circle cx="16" cy="18.500" r="1.500" fill="currentColor"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l1.500-4.500A2 2 0 0 1 8.400 6h7.200a2 2 0 0 1 1.900 1.500L19 12M4 12h16v5H4z" stroke="currentColor" stroke-width="1.900" stroke-linejoin="round"/><circle cx="8" cy="18.500" r="1.500" fill="currentColor"/><circle cx="16" cy="18.500" r="1.500" fill="currentColor"/></svg>',
  plane: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500l8 2.500z"/></svg>',
  ferry: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.500 15l1.500 4h12l1.500-4L12 12l-7.500 3zM7 13V8h10v5M12 8V4.500" stroke="currentColor" stroke-width="1.900" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 21.500c1.500 0 1.500-.900 3-.900s1.500.900 3 .900 1.500-.900 3-.900 1.500.900 3 .900 1.500-.900 3-.900 1.500.900 3 .900" stroke="currentColor" stroke-width="1.500" stroke-linecap="round"/></svg>',
  auto: '<svg viewBox="0 0 24 24" fill="none"><circle cx="6" cy="18" r="2" stroke="currentColor" stroke-width="1.900"/><circle cx="18" cy="6" r="2" stroke="currentColor" stroke-width="1.900"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" stroke="currentColor" stroke-width="1.900" stroke-linecap="round"/></svg>',
};
const WAY_COLOR = '#6B7684';   // 도착지·출발지(이동 수단 아이콘) 핀의 색
const BED_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M3 18v-6.500a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V18M3 15h18M3 18v2M21 18v2M7 9.500V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2.500" stroke="currentColor" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// 일정의 줄·지도 핀: 목적지만 번호를 달고, 숙소는 침대, 가는 방법·오는 방법에서 온 도착지·출발지는 그 이동 수단 아이콘으로 보인다(번호를 세지 않는다)
function itemIcon(t, it) { if (it.stayId) return BED_SVG; if (it.wayId) { const b = (t.bookings || []).find(x => x.id === it.wayId); return MOVE_ICON[b && b.mode] || MOVE_ICON.auto; } return ''; }
const LEAVE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';   // 함께 보는 여행의 손님: 나가기
const TRASH_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1zM6.500 7l.800 11.200A2 2 0 0 0 9.300 20h5.400a2 2 0 0 0 2-1.800L17.500 7M10 11v5.500M14 11v5.500" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLIP_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 11.500l-8.200 8.200a5 5 0 0 1-7.100-7.100l8.500-8.500a3.400 3.400 0 0 1 4.800 4.800l-8.500 8.500a1.700 1.700 0 0 1-2.400-2.400l7.800-7.800" stroke="currentColor" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STAY_COLOR = '#7A4FE0';   // 일정에 넣은 숙소의 번호·핀 색
// 이동 수단 [id, 한국어 이름]: 구간(장소 → 장소)에서 고르는 순서 / 가는·오는 방법에서 고르는 순서
const MOVES = [['walk', '걷기'], ['subway', '지하철'], ['bus', '버스'], ['train', '기차'], ['taxi', '택시'], ['car', '자동차'], ['plane', '비행기'], ['ferry', '배']];
const WAYS = [['plane', '비행기'], ['train', '기차'], ['bus', '버스'], ['subway', '지하철'], ['ferry', '배'], ['taxi', '택시'], ['car', '자동차'], ['walk', '걷기']];
const moveName = (k) => tr((MOVES.find(m => m[0] === k) || ['', '이동'])[1]);
const DAY_COLORS = ['#3182F6', '#F5A623', '#03B26C', '#7A4FE0', '#F04452', '#0F7C8C', '#B26A00'];
const dayColor = (i) => DAY_COLORS[((i % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
const OVER_MIN = 11 * 60;   // 이동까지 합쳐 이 시간을 넘으면 '빡빡한 날'로 알린다

const newSearch = () => ({ q: '', state: 'idle', items: [], local: [], more: null, added: {}, attr: '', seq: 0, count: 0 });
const ST = { ready: false, trips: [], fx: null, prefs: {}, stack: [], tripId: null, sec: 'plan', day: undefined, edit: false, draft: null, search: newSearch() };
let map = null, pickMap = null, toastT = 0, EX = null, CALC = null, OPT = null, DIST = null, IMPORT = null, INVITE = null, LEG = null, WAY = null, STAY = null, pendingShared = null, pendingInvite = null, typeT = 0, pickT = 0;

// ---------- 표기 ----------
const dOf = (s) => C.parseYmd(s);
const wdShort = (s) => { try { return new Intl.DateTimeFormat(LOCALE(), { weekday: 'short' }).format(dOf(s)); } catch (e) { return ''; } };
const shortDay = (s) => { const d = dOf(s); if (!d) return ''; const a = root.I18N && root.I18N.fmtShort ? root.I18N.fmtShort(d.getTime()) : (d.getMonth() + 1) + '.' + d.getDate(); return a + ' (' + wdShort(s) + ')'; };
const longDay = (s) => { const d = dOf(s); if (!d) return ''; try { return new Intl.DateTimeFormat(LOCALE(), { month: 'short', day: 'numeric', weekday: 'short' }).format(d); } catch (e) { return s; } };
const rangeText = (t) => { const a = dOf(t.start), b = dOf(t.end); if (!a || !b) return tr('날짜 미정'); try { return new Intl.DateTimeFormat(LOCALE(), { year: 'numeric', month: 'short', day: 'numeric' }).formatRange(a, b); } catch (e) { return t.start + ' – ' + t.end; } };
const shortRange = (t) => {   // 맨 위에 적는 짧은 날짜: 11.12 ~ 11.16 (올해가 아니면 '27 을 앞에)
  const a = dOf(t.start), b = dOf(t.end); if (!a || !b) return tr('날짜 미정'); const f = (d) => (root.I18N && root.I18N.fmtShort ? root.I18N.fmtShort(d.getTime()) : (d.getMonth() + 1) + '.' + d.getDate());
  const fa = f(a), fb = f(b); const i = fa.lastIndexOf(' ');   // 'Dec 23' 과 'Dec 25' 처럼 달 이름이 같으면 뒤쪽은 날짜만
  const range = t.start === t.end ? fa : (i > 0 && fb.slice(0, i + 1) === fa.slice(0, i + 1) ? fa + '–' + fb.slice(i + 1) : fa + ' ~ ' + fb);
  return (a.getFullYear() !== new Date().getFullYear() ? "'" + String(a.getFullYear()).slice(2) + ' ' : '') + range;
};
const nightsText = (t) => { const n = C.tripDays(t).length; return n <= 1 ? tr('당일') : tr('{n}박 {d}일', { n: n - 1, d: n }); };
const ddayText = (t) => { const td = C.today(); const s = C.tripStatus(t, td); if (s === 'past') return tr('다녀옴'); if (s === 'ongoing') return tr('{n}일차', { n: C.dayDiff(t.start, td) + 1 }); return t.start ? 'D-' + C.dayDiff(td, t.start) : ''; };
const durText = (m) => { m = Math.round(m); if (m < 60) return tr('{n}분', { n: m }); const h = Math.floor(m / 60), r = m % 60; return r ? tr('{h}시간 {m}분', { h, m: r }) : tr('{h}시간', { h }); };
const kmText = (km) => (km < 1 ? Math.max(10, Math.round(km * 100) * 10) + 'm' : (km < 10 ? km.toFixed(1) : Math.round(km)) + 'km');
const regionName = (cc) => { try { return new Intl.DisplayNames([LOCALE()], { type: 'region' }).of(cc) || cc; } catch (e) { return cc || ''; } };
const curLabel = (cur) => C.curInfo(cur).sym + ' ' + cur;
const rateTxt = (cur, r, home) => C.rateText(cur, r, home, LOCALE());
const dtText = (s) => { if (!s) return ''; const d = new Date(s); if (isNaN(d)) return s; try { return new Intl.DateTimeFormat(LOCALE(), s.length > 10 ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' }).format(d); } catch (e) { return s; } };
// 시작–끝: 같은 날이면 날짜를 한 번만 적는다("11월 11일 오전 9:10 – 11:00")
const dtRange = (a, b) => { if (!a) return ''; if (!b) return dtText(a); const d1 = new Date(a), d2 = new Date(b); if (isNaN(d1) || isNaN(d2) || d2 < d1) return dtText(a) + ' – ' + dtText(b); try { return new Intl.DateTimeFormat(LOCALE(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).formatRange(d1, d2); } catch (e) { return dtText(a) + ' – ' + dtText(b); } };
const fxNow = () => (ST.fx && ST.fx.rates ? ST.fx : PD.REF_FX);
const trip = () => ST.trips.find(t => t.id === ST.tripId) || null;
const dayNo = (t, d) => C.tripDays(t).indexOf(d) + 1;
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : NaN; };
const homeCur = () => ST.prefs.home || PD.HOME_BY_LANG[LANG()] || 'USD';
const myName = () => (root.Account && root.Account.session && root.Account.session.name) || '';
const pname = (t, p) => (p && t && p.id === t.meId ? tr('나') : (p && p.name) || '');   // 참여자 이름(나는 '나')
const personOf = (t, id) => C.people(t).find(p => p.id === id) || null;

function persist(t) { fixEnds(t); C.touch(t); if (t.sample) return; C.Store.put(t).catch(e => log('save failed: ' + (e && e.message))); if (t.share && t.share.code) queueShareSync(t); queueSync(t); picSoon(); notifSync(); }
function savePrefs() { C.Store.putMeta('prefs', ST.prefs).catch(() => { /* ignore */ }); }
function toast(text) { const el = $('#pl-toast'); if (!el) return; el.textContent = text; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2200); }

// ---------- 시트 ----------
const sheetEl = () => $('#pl-sheet');
function sheet(html, after) {
  $('#pl-sheet-body').innerHTML = html; const el = sheetEl(); el.hidden = false; const sh = $('.sheet', el); if (sh) sh.scrollTop = 0;
  document.body.style.overflow = 'hidden'; if (after) after($('#pl-sheet-body'));
}
function closeSheet() { const el = sheetEl(); if (!el || el.hidden) return; el.hidden = true; $('#pl-sheet-body').innerHTML = ''; EX = null; CALC = null; if ($('#pl-screen').hidden) document.body.style.overflow = ''; if (AIPAY) { const f = AIPAY; AIPAY = null; f(null); } }   // AI 결제 고르기 시트를 닫으면 '안 씀'
function chipGroup(sel, onChange) {
  const box = $(sel); if (!box) return;
  box.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b || !box.contains(b)) return; $$('.chip', box).forEach(c => c.classList.toggle('active', c === b)); if (onChange) onChange(b.dataset.v); });
}
const chipVal = (sel) => { const b = $(sel + ' .chip.active'); return b ? b.dataset.v : null; };

// ---------- 하위 화면 ----------
const SCREENS = {}, ACT = {};
function destroyMaps() { if (map) { map.destroy(); map = null; } if (pickMap) { pickMap.destroy(); pickMap = null; } }
function show(name, p, replace) { if (replace) ST.stack.pop(); ST.stack.push({ name, p: p || {} }); renderScreen(true); }
function closeScreens() {
  ST.stack.length = 0; destroyMaps(); const el = $('#pl-screen'); el.hidden = true; el.innerHTML = '';
  document.body.style.overflow = ''; if (H && H.setBusy) H.setBusy(false); renderList();
}
function renderScreen(toTop) {
  const el = $('#pl-screen'); const top = ST.stack[ST.stack.length - 1]; if (!top) { closeScreens(); return; }
  const y = el.scrollTop; destroyMaps();
  const v = SCREENS[top.name](top.p) || {};
  el.innerHTML = v.full ? v.html : `<header class="sd-top"><button type="button" class="top-btn" data-act="back" aria-label="${esc(tr('뒤로'))}">${BACK_SVG}</button><div class="sd-top-title">${esc(v.title || '')}</div><span class="top-spacer"></span>${v.right || ''}${v.progress != null ? `<div class="progress"><i style="width:${v.progress}%"></i></div>` : ''}</header><div class="sd-body">${v.html || ''}</div><div class="pl-cta">${v.cta || ''}</div>`;
  el.hidden = false; document.body.style.overflow = 'hidden'; if (H && H.setBusy) H.setBusy(true);
  el.scrollTop = toTop ? 0 : y;
  if (v.after) v.after(el);
}
function back() {
  const pv = $('#pl-photo-view'); if (pv && !pv.hidden) { pv.hidden = true; return true; }   // 크게 본 사진부터 닫는다(안드로이드 뒤로 버튼)
  const taxi = $('#pl-taxi'); if (taxi) { taxi.remove(); return true; }
  if (sheetEl() && !sheetEl().hidden) { closeSheet(); return true; }
  if (!ST.stack.length) return false;
  const top = ST.stack[ST.stack.length - 1];
  if (top.name === 'new' && ST.draft && ST.draft.step > 1) { readWay(); ST.draft.step--; renderScreen(true); return true; }
  ST.stack.pop(); if (ST.stack.length) renderScreen(true); else closeScreens();
  return true;
}
ACT.back = () => back();
ACT['sheet-close'] = () => closeSheet();

// ---------- 여행 목록 ----------
function passHtml(t, kind, withToday) {
  const n = C.live(t.items).filter(i => i.day && i.kind !== 'note').length;
  const foot = [tr('일정 {n}곳', { n })];
  const mates = C.people(t).filter(p => p.id !== t.meId).length; if (mates) foot.push(tr('동행 {n}명', { n: mates }));
  if (kind === 'past') { const tot = C.myTotals(t, fxNow()); if (tot.all > 0) foot.push(tr('경비 {m}', { m: money(tot.all, t.home) })); }   // 내가 쓴 돈(함께 쓴 돈 중 내 몫 + 개인)
  else { const bt = C.budgetOf(t).total; if (bt > 0) foot.push(tr('예산 {m}', { m: money(bt, t.home) })); }
  const isMain = (mainTrip() || {}).id === t.id;   // 메인 여행 카드는 테두리 + '메인 여행 해제', 정할 수 있는 다른 카드에는 '메인 여행으로 설정'
  const mainBtn = isMain ? `<button type="button" class="pl-setmain off" data-act="unset-main">${esc(tr('메인 여행 해제'))}</button>` : canMain(t) ? `<button type="button" class="pl-setmain" data-act="set-main" data-id="${esc(t.id)}">${esc(tr('메인 여행으로 설정'))}</button>` : '';
  return `<div class="pl-pass ${kind}${isMain ? ' main' : ''}" role="button" tabindex="0" data-act="open" data-id="${esc(t.id)}">
    <div class="pl-pass-main"><div class="pl-pass-kicker"><span>${esc(tr(t.sample ? '샘플 여행' : kind === 'past' ? '다녀온 여행' : '탑승권'))}</span><span class="pl-dday">${esc(ddayText(t))}</span></div>
    <div class="pl-pass-title">${esc(t.title || tr('이름 없는 여행'))}</div><div class="pl-pass-date">${esc(rangeText(t))} · ${esc(nightsText(t))}</div>${withToday ? todayHtml(t) : ''}</div>
    <div class="pl-pass-foot">${foot.map(x => `<span>${esc(x)}</span>`).join('')}${mainBtn}<button type="button" class="pl-pass-del" data-act="list-del" data-id="${esc(t.id)}" aria-label="${esc(t.cloud && !t.cloud.mine ? tr('이 여행에서 나가기') : tr('여행 지우기'))}">${t.cloud && !t.cloud.mine ? LEAVE_SVG : TRASH_SVG}</button></div></div>`;
}
function todayHtml(t) {
  const td = C.today(); const p = C.dayPlan(t, td); const b = C.budgetInfo(t, fxNow(), td);
  let h = `<div class="pl-today"><div class="pl-today-head">${esc(tr('오늘 · {d}', { d: longDay(td) }))}</div>`;
  if (b.daily != null) h += `<div class="pl-today-budget">${esc(tr('하루 예산 {a} 중 {b} 사용', { a: money(b.daily, t.home), b: money(b.todaySpent, t.home) }))}</div>`;
  else if (b.todaySpent > 0) h += `<div class="pl-today-budget">${esc(tr('오늘 쓴 돈 {m}', { m: money(b.todaySpent, t.home) }))}</div>`;
  const items = p.items.filter(i => i.kind !== 'note').slice(0, 5);
  h += items.length ? `<ol class="pl-today-list">${items.map(i => `<li class="${i.done ? 'done' : ''}"><span class="t">${esc(i.time || '')}</span><span>${esc(i.name)}</span></li>`).join('')}</ol>` : `<div class="pl-today-none">${esc(tr('오늘 일정이 비어 있어요.'))}</div>`;
  h += `<div class="pl-quick"><button type="button" data-act="q-exp" data-id="${esc(t.id)}">${esc(tr('지출 추가'))}</button><button type="button" data-act="q-diary" data-id="${esc(t.id)}">${esc(tr('한 줄 일기'))}</button>${t.cur !== t.home ? `<button type="button" data-act="q-calc" data-id="${esc(t.id)}">${esc(tr('환율 계산기'))}</button>` : ''}</div></div>`;
  return h;
}
function renderList() {
  const box = $('#pl-list'); if (!box) return;
  if (!ST.ready) { box.innerHTML = `<p class="pl-hint">${esc(tr('불러오는 중…'))}</p>`; return; }
  const td = C.today(); const all = ST.trips.filter(t => !t.del); const byStart = (a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
  if (!all.length) {
    box.innerHTML = `<div class="pl-empty"><h2 class="title">${esc(tr('다음 여행을 계획해 볼까요?'))}</h2><p class="desc">${esc(tr('가고 싶은 곳을 담아 동선을 짜고, 여행 중에는 경비와 하루 한 줄을 남겨요.'))}</p><button type="button" class="btn primary" data-act="new">${esc(tr('새 여행 만들기'))}</button>${root.Account && !loggedIn() ? `<button type="button" class="pl-link" data-act="cloud-login">${esc(tr('로그인하고 저장해 둔 여행 불러오기'))}</button>` : ''}</div>`;
    return;
  }
  const main = mainTrip(); const rest = main ? all.filter(t => t.id !== main.id) : all;   // 메인 여행은 날짜와 상관없이(아직 떠나지 않았어도) 맨 위에 따로
  const on = rest.filter(t => C.tripStatus(t, td) === 'ongoing').sort(byStart), up = rest.filter(t => C.tripStatus(t, td) === 'upcoming').sort(byStart), past = rest.filter(t => C.tripStatus(t, td) === 'past').sort((a, b) => byStart(b, a));
  const sec = (s) => `<div class="pl-sub-title">${esc(s)}</div>`;
  let h = cloudHtml();
  if (ST.listView === 'past') {   // 끝난 여행만
    h += past.length ? past.map(t => passHtml(t, 'past')).join('') : `<p class="pl-hint">${esc(tr('아직 끝난 여행이 없어요.'))}</p>`;
    box.innerHTML = h; return;
  }
  if (main) { const now = C.tripStatus(main, td) === 'ongoing'; h += sec(tr('메인 여행')) + passHtml(main, now ? 'now' : 'up', now); }
  if (on.length) h += sec(tr('지금 여행 중')) + on.map(t => passHtml(t, 'now', true)).join('');
  if (up.length) h += sec(tr('예정된 여행')) + up.map(t => passHtml(t, 'up')).join('');
  if (!main && !on.length && !up.length) h += `<p class="pl-hint">${esc(past.length ? tr('예정된 여행이 없어요. 끝난 여행은 위의 ‘끝난 여행’에서 볼 수 있어요.') : tr('아직 일정이 없어요.'))}</p>`;
  h += `<button type="button" class="btn weak pl-list-new" data-act="new">${esc(tr('새 여행 만들기'))}</button>`;
  box.innerHTML = h;
}
function openTrip(id, sec) { const t0 = ST.trips.find(x => x.id === id); if (t0 && fixEnds(t0)) persist(t0); if (t0) findEnds(t0); if (t0 && !C.people(t0).some(p => p.id === t0.meId)) { C.ensureMe(t0, myName()); persist(t0); } ST.expFilter = 'all'; ST.tripId = id; ST.sec = sec || 'plan'; ST.day = undefined; ST.edit = false; ST.search = newSearch(); ST.stack.length = 0; show('trip'); }
ACT.open = (d) => openTrip(d.id);
// 여행 탭의 카드에서 바로 지우기(여행 안의 '더 보기 → 지우기'와 같은 규칙: 함께 보는 여행의 손님이면 나만 나간다)
ACT['list-del'] = async (d) => {
  const t = ST.trips.find(x => x.id === d.id && !x.del); if (!t) return; const guest = !!(t.cloud && !t.cloud.mine); const together = !!(t.cloud && (t.cloud.members || []).length > 1);
  if (guest) { leaveSheet(t); return; }   // 함께 보는 여행에 들어온 사람은 지울 수 없고 나가기만(내 여행으로 복사하고 나갈 수 있다)
  const ok = await H.askConfirm(tr('‘{t}’ 여행을 지울까요?', { t: t.title || tr('이름 없는 여행') }), together ? tr('함께 보는 사람들에게서도 사라지고 되돌릴 수 없어요.') : tr('일정, 경비, 일기가 모두 지워지고 되돌릴 수 없어요.'), tr('지우기'), true);
  if (!ok) return;
  if ((mainTrip() || {}).id === t.id) setMain(null);
  if (t.sample) ST.trips = ST.trips.filter(x => x !== t); else { t.del = true; persist(t); if (t.cloud) dropRemote(t).catch(() => { /* 다음에 맞출 때 다시 */ }); }
  renderList(); toast(guest ? tr('여행에서 나왔어요.') : tr('여행을 지웠어요.'));
};
// ---------- 메인 여행(여행 모드) ----------
// 메인 여행을 정하면 앱을 열자마자 그 여행이 뜬다(아래 탭이 일정·경비·일기·준비). 목록에서는 날짜와 상관없이 맨 위. 여행이 끝나면(오는 날이 지나면) 저절로 풀려 원래 화면으로 돌아간다
const canMain = (t) => !!t && !t.del && !t.sample && C.tripStatus(t, C.today()) !== 'past';
function mainTrip() { const id = ST.prefs && ST.prefs.mainId; const t = id ? ST.trips.find(x => x.id === id) : null; return canMain(t) ? t : null; }
const mainFlag = (on) => { try { if (on) localStorage.setItem('pl-main', '1'); else localStorage.removeItem('pl-main'); } catch (e) { /* ignore */ } };   // 앱을 켜는 순간(여행을 읽기 전)에 알 수 있게 따로 적어 둔다
function setMain(id) { ST.prefs.mainId = id || null; savePrefs(); mainFlag(!!id); }
SCREENS.wait = () => ({ full: true, html: '<div class="pl-wait"></div>' });   // 메인 여행을 읽는 동안의 빈 덮개
function mainTick(quiet) {   // 메인 여행이 끝났거나 지워졌으면 푼다. 끝난 여행을 보고 있었으면 닫고 알린다
  const id = ST.prefs && ST.prefs.mainId; if (!id || !ST.ready || mainTrip()) return false;
  const t = ST.trips.find(x => x.id === id); setMain(null);
  const ended = !!t && !t.del && C.tripStatus(t, C.today()) === 'past';
  if (ended && ST.tripId === id && ST.stack.length === 1 && ST.stack[0].name === 'trip' && sheetEl().hidden) closeScreens(); else if (!ST.stack.length) renderList();
  if (ended && !quiet) toast(tr('여행이 끝나서 원래 화면으로 돌아왔어요.'));
  return ended;
}
ACT['set-main'] = (d) => {   // 여행 탭 카드·여행의 더 보기: 이 여행을 메인 여행으로 → 바로 그 여행으로 들어간다
  const t = ST.trips.find(x => x.id === d.id); if (!canMain(t)) return; setMain(t.id); closeSheet(); renderList();
  if (!(ST.tripId === t.id && ST.stack.length)) openTrip(t.id);
  toast(tr('메인 여행으로 정했어요. 앱을 열면 이 여행부터 보여요.'));
};
ACT['unset-main'] = () => { setMain(null); closeSheet(); renderList(); toast(tr('메인 여행을 풀었어요.')); };
const mainRow = (t) => ((mainTrip() || {}).id === t.id
  ? `<li class="row tap" data-act="unset-main"><div class="row-body"><div class="row-title">${esc(tr('메인 여행 해제'))}</div><div class="row-desc">${esc(tr('앱을 열 때 원래 화면부터 보여요'))}</div></div></li>`
  : canMain(t) ? `<li class="row tap" data-act="set-main" data-id="${esc(t.id)}"><div class="row-body"><div class="row-title">${esc(tr('메인 여행으로 설정'))}</div><div class="row-desc">${esc(tr('앱을 열면 이 여행이 바로 보여요'))}</div></div></li>` : '');

// ---------- 일정의 시작과 끝 ----------
// 저장해 둔 가는 방법의 마지막 도착지(공항·터미널·정류장…)를 그 날 일정의 맨 앞에, 오는 방법의 첫 출발지를 그 날 일정의 맨 뒤에 자동으로 둔다.
// 항목의 식별자를 단계에서 만들어(같은 단계 = 같은 항목) 기기마다 따로 넣어도 하나로 합쳐진다. 사용자가 일정에서 빼면(단계의 noEnd) 다시 넣지 않고 '도착지·출발지 추가하기'로 되살린다. 샘플 여행은 건드리지 않는다
function fixEnds(t) {
  if (!t || t.sample || !Array.isArray(t.items) || !Array.isArray(t.bookings)) return false;
  let changed = false; const days = C.tripDays(t); const endOf = (it) => (it.wayEnd === 'from' ? 'from' : 'to');
  const go = C.ways(t, 'go'), back = C.ways(t, 'back'); const A = go[go.length - 1], Z = back[0];   // 일정의 시작 = 가는 방법의 마지막 단계, 끝 = 오는 방법의 첫 단계
  for (const it of t.items) {   // 단계가 지워졌으면 같이 빼고, 단계의 장소·날짜가 바뀌었으면 따라간다
    if (!it || it.del || !it.wayId) continue; const b = t.bookings.find(x => x.id === it.wayId);
    if (!b || b.del) { it.del = true; C.touch(it); changed = true; continue; }
    const end = endOf(it); const name = (end === 'to' ? b.to : b.from) || ''; const day = C.wayDay(t, b);
    if (it.auto && b !== (end === 'to' ? A : Z)) { it.del = true; C.touch(it); changed = true; continue; }   // 단계를 더 이어 붙여 이제 중간 지점이 된 자동 항목은 치운다(직접 넣은 것은 둔다)
    if (name && it.name !== name) { it.name = name; const k = end === 'to' ? b.toPt : b.fromPt; if (k && C.hasLL(k)) { it.lat = +k.lat; it.lon = +k.lon; } else { delete it.lat; delete it.lon; } it.addr = ''; delete it.img; delete it.tried; C.touch(it); changed = true; }
    if (it.auto && day && days.includes(day) && it.day !== day) { it.day = day; C.touch(it); changed = true; }
  }
  const one = (b, end) => {
    if (!b || (b.noEnd && b.noEnd[end])) return; const name = (end === 'to' ? b.to : b.from) || ''; const day = C.wayDay(t, b); if (!name || !day || !days.includes(day)) return;
    let it = t.items.find(x => x && !x.del && x.wayId === b.id && endOf(x) === end);
    if (!it) {
      const id = b.id + (end === 'to' ? '-to' : '-fr'); const when = String((end === 'to' ? b.end : b.start) || '').slice(11, 16); const k = end === 'to' ? b.toPt : b.fromPt;
      const rec = { day, kind: 'place', name, addr: '', src: 'way', wayId: b.id, wayEnd: end, auto: 1, sort: '', memo: when ? (end === 'to' ? tr('{t} 도착', { t: when }) : tr('{t} 출발', { t: when })) : '' };
      it = t.items.find(x => x && x.id === id);
      if (it) { Object.assign(it, rec); delete it.del; delete it.lat; delete it.lon; delete it.done; } else { it = Object.assign({ id, c: C.now() }, rec); t.items.push(it); }
      if (k && C.hasLL(k)) { it.lat = +k.lat; it.lon = +k.lon; }
      C.touch(it); changed = true;
    }
    if (it.day !== day) return;
    const rest = C.dayItems(t, day).filter(x => x.id !== it.id);   // 제자리: 도착지는 그 날 맨 앞, 출발지는 맨 뒤
    if (end === 'to') { const first = rest[0]; if (!it.sort || (first && !(it.sort < first.sort))) { it.sort = C.midKey('', first ? first.sort : ''); C.touch(it); changed = true; } }
    else { const last = rest[rest.length - 1]; if (!it.sort || (last && !(it.sort > last.sort))) { it.sort = C.midKey(last ? last.sort : '', ''); C.touch(it); changed = true; } }
  };
  one(A, 'to'); one(Z, 'from');
  return changed;
}
// 위치를 모르는 시작·끝(이름만 적은 터미널·정류장)은 한 번씩 찾아본다. 터미널 표시(T1, I)는 떼고 찾고, 이름이 통하는 첫 결과만 쓴다
async function findWayPlace(name) {
  const q = String(name || '').replace(/\s+(?:T\d|[A-Z]|[Il|]|터미널\s*\d+|Terminal\s*\d+)$/i, '').trim(); if (!q) return null;
  try { const j = await H.api('GET', '/places/suggest?' + placeQs(q)); const key = q.replace(/\s+/g, '').slice(0, 2).toLowerCase(); const cand = ((j && j.items) || []).find(x => String(x.name || '').replace(/\s+/g, '').toLowerCase().includes(key)) || null; return cand && (await resolvePlace(cand)) ? cand : null; } catch (e) { return null; }
}
const ENDS_TRIED = new Set();
async function findEnds(t) {
  if (!t || t.sample || !H || !H.api) return;
  for (const it of C.live(t.items).filter(x => x.wayId && x.auto && !C.hasLL(x) && !ENDS_TRIED.has(x.id + '|' + x.name))) {
    ENDS_TRIED.add(it.id + '|' + it.name); const hit = await findWayPlace(it.name); const cur = t.items.find(x => x.id === it.id && !x.del);
    if (cur && hit && cur.name === it.name && !C.hasLL(cur)) { cur.lat = +hit.lat; cur.lon = +hit.lon; if (hit.addr) cur.addr = hit.addr; if (hasImg(hit)) cur.img = hit.img; C.touch(cur); persist(t); if (ST.tripId === t.id && ST.stack.length === 1 && ST.stack[0].name === 'trip' && sheetEl().hidden && !ST.edit) renderScreen(); }
  }
}
ACT['q-exp'] = (d) => { openTrip(d.id, 'money'); expSheet(null); };
ACT['q-diary'] = (d) => { openTrip(d.id, 'diary'); diarySheet(C.today()); };
ACT['q-calc'] = (d) => { openTrip(d.id, 'money'); calcSheet(); };

// ---------- 여행 만들기: 어디로 → 언제 → 누구와 ----------
const destName = (d) => d.name[LANG()] || d.name.en || d.name.ko;
function popularDests() {
  const all = (root.DESTINATIONS || []).slice().sort((a, b) => b.pop - a.pop);
  return all.filter(d => d.cc !== 'KR').slice(0, 10).concat(all.filter(d => d.cc === 'KR').slice(0, 6)).map(d => ({ name: destName(d), cc: d.cc, lat: d.lat, lon: d.lon }));
}
// 기기 안의 목록(추천 여행지 + 도시 목록)에서 찾는다. 서버 없이 된다
function destSearch(q) {
  q = String(q || '').trim().toLowerCase(); if (!q) return [];
  const out = [], seen = new Set(); const ko = LANG() === 'ko';
  const push = (o) => { const k = o.name + '|' + o.cc; if (seen.has(k)) return; seen.add(k); out.push(o); };
  for (const d of (root.DESTINATIONS || [])) if ([d.name.ko, d.name.en, d.name.ja].some(n => n && n.toLowerCase().includes(q))) push({ name: destName(d), cc: d.cc, lat: d.lat, lon: d.lon, pop: 1e9 + d.pop });
  const CT = root.CITIES || [];
  for (let i = 0; i < CT.length && out.length < 40; i++) {
    const c = CT[i], en = String(c[0] || ''), k = String(c[1] || '').replace(/ ?(시|군)$/, '');
    if (en.toLowerCase().startsWith(q) || (k && k.startsWith(q))) push({ name: ko && k ? k : en, cc: c[4], lat: c[2], lon: c[3], pop: c[5] || 0 });
  }
  return out.sort((a, b) => b.pop - a.pop).slice(0, 12);
}
function destResHtml() {
  const d = ST.draft; const q = d.q.trim(); d.res = q ? destSearch(q) : popularDests();
  if (!q) return `<div class="pl-sub-title">${esc(tr('많이 찾는 여행지'))}</div><div class="chips">${d.res.map((x, i) => `<button type="button" class="chip" data-act="dest-add" data-i="${i}">${esc(x.name)}</button>`).join('')}</div>`;
  return `<ul class="rows pl-res">${d.res.map((x, i) => `<li class="row tap" data-act="dest-add" data-i="${i}"><div class="row-body"><div class="row-title">${esc(x.name)}</div><div class="row-desc">${esc(regionName(x.cc))}</div></div></li>`).join('')}
    <li class="row tap" data-act="dest-custom"><div class="row-body"><div class="row-title">${esc(tr('‘{q}’ 그대로 넣기', { q }))}</div><div class="row-desc">${esc(tr('목록에 없는 곳은 이름만으로 넣을 수 있어요.'))}</div></div></li></ul>`;
}
function tripTitle(dests) {
  if (!dests.length) return tr('새 여행');
  if (dests.length === 1) return tr('{a} 여행', { a: dests[0].name });
  if (dests.length === 2) return tr('{a}·{b} 여행', { a: dests[0].name, b: dests[1].name });
  return tr('{a} 외 {n}곳 여행', { a: dests[0].name, n: dests.length - 1 });
}
function startNew() { ST.draft = { step: 1, dests: [], start: '', end: '', people: [], q: '', res: [] }; ST.stack.length = 0; show('new'); }
ACT.new = () => startNew();
// 날짜 고르기: 달력에서 가는 날 → 오는 날을 차례로 누른다. 기본 날짜 입력창은 쓰지 않는다 — iOS 는 그 창을 여는 순간 오늘 날짜를 넣고
// change 를 내서, 화면을 다시 그리면 고르는 창이 닫히고 오늘 날짜로 잡혔다(2026-11-13 사용자 제보).
function calHtml(start, end) {
  const td = C.today(); const base = C.parseYmd(td); const wd = [];
  for (let i = 0; i < 7; i++) { try { wd.push(new Intl.DateTimeFormat(LOCALE(), { weekday: 'narrow' }).format(new Date(2023, 0, 1 + i))); } catch (e) { wd.push(String(i)); } }   // 2023-01-01 = 일요일
  let h = '';
  for (let m = 0; m < 14; m++) {   // 이번 달부터 14달(질문 제목이 보이도록 지난 달은 넣지 않는다 — 지난 날짜는 만든 뒤 '여행 정보 고치기'에서)
    const d0 = new Date(base.getFullYear(), base.getMonth() + m, 1); const y = d0.getFullYear(), mo = d0.getMonth(); const n = new Date(y, mo + 1, 0).getDate();
    let title; try { title = new Intl.DateTimeFormat(LOCALE(), { year: 'numeric', month: 'long' }).format(d0); } catch (e) { title = y + '-' + (mo + 1); }
    h += `<div class="pl-cal-m" data-m="${y}-${String(mo + 1).padStart(2, '0')}"><div class="pl-cal-title">${esc(title)}</div><div class="pl-cal-wd">${wd.map((w, i) => `<span class="${i === 0 ? 'sun' : ''}">${esc(w)}</span>`).join('')}</div><div class="pl-cal-grid">`;
    for (let i = 0; i < d0.getDay(); i++) h += '<span></span>';
    for (let day = 1; day <= n; day++) {
      const dt = new Date(y, mo, day); const v = C.ymd(dt); const cls = [];
      if (v === td) cls.push('today'); if (dt.getDay() === 0) cls.push('sun');
      if (v === start) cls.push('start'); if (end && v === end) cls.push('end'); if (v === start && (!end || end === start)) cls.push('solo');
      if (start && end && v > start && v < end) cls.push('in');
      h += `<button type="button" class="${cls.join(' ')}" data-act="cal" data-d="${v}">${day}</button>`;
    }
    h += '</div></div>';
  }
  return h;
}
ACT.cal = (ds) => {
  const d = ST.draft; if (!d || !dOf(ds.d)) return;
  if (!d.start || d.end) { d.start = ds.d; d.end = ''; }   // 처음 누르거나, 다 고른 뒤 다시 누르면 가는 날부터
  else if (ds.d < d.start) d.start = ds.d;
  else d.end = ds.d;
  renderScreen();
};
SCREENS.new = () => {
  const d = ST.draft; let html = '', cta = '', after = null;
  const picked = (list, act) => (list.length ? `<div class="pl-picked">${list.map((x, i) => `<button type="button" class="chip" data-act="${act}" data-i="${i}">${esc(x.name)} <i>×</i></button>`).join('')}</div>` : '');
  if (d.step === 1) {
    html = `<h1 class="pl-step-title">${esc(tr('어디로 떠나나요?'))}</h1><p class="pl-step-desc">${esc(tr('여러 곳을 들른다면 모두 골라 주세요.'))}</p>${picked(d.dests, 'dest-del')}
      <div class="field"><input id="pl-dq" type="search" autocomplete="off" enterkeyhint="search" placeholder="${esc(tr('도시나 나라 이름'))}" value="${esc(d.q)}"></div><div id="pl-dres">${destResHtml()}</div>`
      + (!d.dests.length ? '' : d.titleOn
        ? `<div class="field pl-titlebox"><label for="pl-nt">${esc(tr('여행 이름'))}</label><input id="pl-nt" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="${esc(tripTitle(d.dests))}" value="${esc(d.title || '')}"></div>`
        : `<div class="pl-titleask"><div><b>${esc(tr('여행 이름을 따로 정할까요?'))}</b><span>${esc(tr('정하지 않으면 ‘{t}’이 돼요.', { t: tripTitle(d.dests) }))}</span></div><button type="button" data-act="title-on">${esc(tr('이름 정하기'))}</button></div>`);
    cta = `<button type="button" class="btn primary" data-act="new-next" ${d.dests.length ? '' : 'disabled'}>${esc(tr('다음'))}</button>`;
    after = () => { const inp = $('#pl-dq'); inp.addEventListener('input', () => { d.q = inp.value; $('#pl-dres').innerHTML = destResHtml(); }); const ti = $('#pl-nt'); if (ti) ti.addEventListener('input', () => { d.title = ti.value; }); };
  } else if (d.step === 2) {
    const ok = !!(dOf(d.start) && dOf(d.end) && d.start <= d.end);
    const sum = ok ? rangeText(d) + ' · ' + nightsText(d) : d.start ? tr('{d} 출발 · 오는 날을 눌러 주세요. 당일이면 같은 날을 한 번 더 눌러요.', { d: longDay(d.start) }) : tr('가는 날을 눌러 주세요.');
    html = `<h1 class="pl-step-title">${esc(tr('언제 떠나나요?'))}</h1><p class="pl-step-desc">${esc(tr('가는 날과 오는 날을 차례로 눌러 주세요. 날짜는 나중에 바꿀 수 있어요.'))}</p><div class="pl-cal">${calHtml(d.start, d.end)}</div>`;
    cta = `<div class="pl-cal-sum">${esc(sum)}</div><button type="button" class="btn primary" data-act="new-next" ${ok ? '' : 'disabled'}>${esc(tr('다음'))}</button>`;
    after = () => { if (d.calShown || !d.start || d.start.slice(0, 7) === C.today().slice(0, 7)) { d.calShown = true; return; } d.calShown = true; const m = $('.pl-cal-m[data-m="' + d.start.slice(0, 7) + '"]'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'start' }); };   // 고른 달이 아래에 있으면 거기로
  } else if (d.step === 3) {
    html = `<h1 class="pl-step-title">${esc(tr('누구와 가나요?'))}</h1><p class="pl-step-desc">${esc(tr('같이 가는 사람을 적어 두면 함께 쓴 돈을 나눠 계산해 드려요. 혼자라면 그냥 넘어가도 돼요.'))}</p>
      <div class="pl-picked"><span class="chip me">${esc(tr('나'))}</span>${d.people.map((x, i) => `<button type="button" class="chip" data-act="ppl-del" data-i="${i}">${esc(x.name)} <i>×</i></button>`).join('')}</div>
      <div class="pl-addrow"><input id="pl-pname" maxlength="20" autocomplete="off" enterkeyhint="done" placeholder="${esc(tr('같이 가는 사람 이름'))}"><button type="button" data-act="ppl-add">${esc(tr('추가'))}</button></div>`;
    cta = `<button type="button" class="btn primary" data-act="new-next">${esc(tr('다음'))}</button>`;
    after = () => { $('#pl-pname').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACT['ppl-add'](); } }); };
  } else if (d.step === 4) {
    const W = draftWay(d);
    const form = (k, title) => { const v = W[k] || {}; const more = (W[k + 'More'] || []).length;
      return `<div class="pl-wayform" data-k="${k}"><div class="pl-wayform-h">${esc(title)}${more ? `<small>${esc(tr('갈아타는 구간 {n}개도 같이 저장돼요', { n: more }))}</small>` : ''}</div>
        <div class="pl-date-row"><div class="field"><label>${esc(tr('출발하는 곳'))}</label><input data-f="from" maxlength="40" autocomplete="off" placeholder="${esc(k === 'go' ? tr('예: 김포공항') : tr('예: 간사이공항'))}" value="${esc(v.from || '')}"></div><div class="field"><label>${esc(tr('도착하는 곳'))}</label><input data-f="to" maxlength="40" autocomplete="off" placeholder="${esc(k === 'go' ? tr('예: 간사이공항') : tr('예: 김포공항'))}" value="${esc(v.to || '')}"></div></div>
        <div class="field"><label>${esc(tr('날짜'))}</label><input data-f="date" type="date" value="${esc(v.date || (k === 'back' ? d.end : d.start) || '')}"></div>
        <div class="pl-date-row"><div class="field"><label>${esc(tr('출발 시각'))}</label><input data-f="dep" type="time" value="${esc(v.dep || '')}"></div><div class="field"><label>${esc(tr('도착 시각'))}</label><input data-f="arr" type="time" value="${esc(v.arr || '')}"></div></div>
        <div class="field"><label>${esc(tr('편명·예약 번호'))}</label><input data-f="code" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(v.code || '')}"></div></div>`; };
    const off = W.fromTicket && ((W.go.date && W.go.date !== d.start) || (d.backSame !== false && W.back.date && W.back.date !== d.end));
    html = `<h1 class="pl-step-title">${esc(tr('어떻게 가나요?'))}</h1><p class="pl-step-desc">${esc(tr('가는 방법을 고르고 아는 만큼 적어 주세요. 항공권이나 승차권 파일을 올리면 알아서 채워 드려요.'))}</p>
      <div class="pl-modes big">${WAYS.slice(0, 5).concat([WAYS[6]]).map(([k, n]) => `<button type="button" class="pl-mode ${d.go === k ? 'active' : ''}" data-act="draft-go" data-v="${k}">${MOVE_ICON[k]}<span>${esc(tr(n))}</span></button>`).join('')}</div>
      ${d.go ? `${ticketBtn('draft', d.go)}${filesHtml(W.files, 'draft')}
        ${off ? `<div class="pl-warn">${esc(tr('표의 날짜가 여행 날짜와 달라요.'))} <button type="button" class="pl-inline" data-act="draft-dates">${esc(tr('여행 날짜를 표에 맞추기'))}</button></div>` : ''}
        ${form('go', tr('가는 편'))}
        <div class="chips" style="margin:14px 0 4px"><button type="button" class="chip ${d.backSame !== false ? 'active' : ''}" data-act="draft-back">${esc(tr('오는 길도 같은 방법이에요'))}</button></div>
        ${d.backSame !== false ? form('back', tr('오는 편')) : ''}` : ''}`;
    cta = `<button type="button" class="btn ${d.go ? 'primary' : 'secondary'}" data-act="new-next">${esc(d.go ? tr('다음') : tr('나중에 정할게요'))}</button>`;
  } else {
    const sInfo = [d.stayIn && d.stayOut ? tr('숙박 {r}', { r: rangeText({ start: d.stayIn, end: d.stayOut }) }) : '', d.stayCode ? tr('예약 번호 {c}', { c: d.stayCode }) : ''].filter(Boolean).join(' · ');
    html = `<h1 class="pl-step-title">${esc(tr('어디서 묵나요?'))}</h1><p class="pl-step-desc">${esc(tr('숙소를 저장해 두면 일정 맨 밑의 ‘숙소 추가하기’로 바로 불러올 수 있어요.'))}</p>
      ${ticketBtn('dstay', 'stay')}${filesHtml(d.stayFiles || [], 'dstay')}${sInfo ? `<p class="pl-conv">${esc(sInfo)}</p>` : ''}
      ${d.stay ? `<div class="pl-picked"><button type="button" class="chip" data-act="draft-stay-del">${esc(d.stay.name)} <i>×</i></button></div>${C.hasLL(d.stay) ? `<p class="pl-conv">${esc(d.addrMsg || tr('지도 위치가 정해져 있어요.'))}</p>` : `${d.sq ? `<p class="pl-conv">${esc(tr('아래에서 맞는 곳을 고르면 지도 위치까지 저장해요.'))}</p>` : ''}<div class="field pl-saddr"><label for="pl-saddr">${esc(tr('주소로 지도 위치 찾기'))}</label><div class="pl-addrow"><input id="pl-saddr" maxlength="160" autocomplete="off" placeholder="${esc(tr('구글 지도나 예약 확인서의 주소를 붙여 넣어요'))}" value="${esc(d.stay.addr || '')}"><button type="button" data-act="draft-stay-addr">${esc(tr('주소로 찾기'))}</button></div>${d.addrMsg ? `<p class="pl-conv">${esc(d.addrMsg)}</p>` : ''}</div>`}` : ''}
      <div class="pl-search"><span class="pl-search-ic">${SEARCH_SVG}</span><input id="pl-sq" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${esc(tr('숙소 이름'))}" value="${esc(d.sq || '')}"></div><div id="pl-sres">${draftStayHtml()}</div>`;
    cta = `<button type="button" class="btn primary" data-act="new-done">${esc(d.stay || (d.stayFiles || []).length ? tr('여행 만들기') : tr('숙소는 나중에 · 여행 만들기'))}</button>`;
    after = () => {
      const inp = $('#pl-sq'); inp.addEventListener('input', () => { d.sq = inp.value; const q = d.sq.trim(); d.sres = []; d.smore = null; d.sseq = (d.sseq || 0) + 1; clearTimeout(pickT); $('#pl-sres').innerHTML = draftStayHtml(); if (q.length >= 2 && !jamoTail(q)) pickT = setTimeout(() => draftStaySearch(q, false), 260); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); ACT['draft-stay-more'](); } });
    };
  }
  return { title: tr('새 여행'), progress: d.step / 5 * 100, html, cta, after };
};
ACT['dest-add'] = (ds) => { const d = ST.draft, x = d.res[+ds.i]; if (!x) return; if (!d.dests.some(y => y.name === x.name && y.cc === x.cc)) d.dests.push({ name: x.name, cc: x.cc, lat: x.lat, lon: x.lon }); d.q = ''; renderScreen(); };
ACT['dest-custom'] = () => { const d = ST.draft, q = d.q.trim(); if (!q) return; if (!d.dests.some(y => y.name === q)) d.dests.push({ name: q, cc: '' }); d.q = ''; renderScreen(); };
ACT['dest-del'] = (ds) => { ST.draft.dests.splice(+ds.i, 1); renderScreen(); };
ACT['title-on'] = () => { ST.draft.titleOn = true; renderScreen(); const i = $('#pl-nt'); if (i) { try { i.focus(); } catch (e) { /* ignore */ } } };   // 여행 이름을 직접 적는다
ACT['ppl-add'] = () => { const inp = $('#pl-pname'); const v = inp ? inp.value.trim() : ''; if (!v) return; ST.draft.people.push({ id: C.uid(), name: v }); renderScreen(); const again = $('#pl-pname'); if (again) again.focus(); };
ACT['ppl-del'] = (ds) => { ST.draft.people.splice(+ds.i, 1); renderScreen(); };
ACT['new-next'] = () => { readWay(); ST.draft.step++; renderScreen(true); };
ACT['draft-go'] = (ds) => { const d = ST.draft; readWay(); d.go = d.go === ds.v ? '' : ds.v; if (d.go === 'plane') loadAirports(); renderScreen(); };
ACT['draft-back'] = () => { const d = ST.draft; readWay(); d.backSame = d.backSame === false; renderScreen(); };
// 4단계에서 적는 가는 편·오는 편(go·back = 화면의 칸, goMore·backMore = 표에서 읽은 갈아타는 구간, files = 올린 표)
function draftWay(d) { return d.way || (d.way = { go: {}, back: {}, goMore: [], backMore: [], files: [], fromTicket: false }); }
function readWay() {   // 화면을 다시 그리거나 넘어가기 전에 칸의 값을 초안에 옮긴다
  const d = ST.draft; if (!d) return;
  for (const box of $$('#pl-screen .pl-wayform')) {
    const o = draftWay(d)[box.dataset.k]; if (!o) continue;
    for (const inp of $$('input[data-f]', box)) { const k = inp.dataset.f, v = inp.value.trim(); if ((k === 'date' || k === 'arr' || k === 'dep') && v !== (o[k] || '')) o.arrDate = ''; o[k] = v; }
  }
}
ACT['draft-dates'] = () => {   // 여행 날짜를 표의 날짜에 맞춘다
  const d = ST.draft; if (!d) return; readWay(); const W = draftWay(d); if (!W.go.date) return;
  d.start = W.go.date; const back = d.backSame !== false && W.back.date && W.back.date >= d.start ? W.back.date : ''; if (back) d.end = back; else if (!d.end || d.end < d.start) d.end = d.start;
  renderScreen(); toast(tr('여행 날짜를 표에 맞췄어요.'));
};
// 만들기 5단계의 숙소 찾기(아직 여행이 없어 고른 여행지를 기준으로 찾는다)
function draftQs(q) { const d = ST.draft; const c = (d.dests || []).find(C.hasLL); const cc = ((d.dests || []).find(x => x.cc) || {}).cc || ''; const qs = new URLSearchParams({ q, lang: LANG() }); if (c) { qs.set('lat', (+c.lat).toFixed(4)); qs.set('lon', (+c.lon).toFixed(4)); } if (cc) qs.set('cc', cc); qs.set('st', gsess()); return qs.toString(); }
function draftStayHtml() {
  const d = ST.draft; const q = (d.sq || '').trim(); if (q.length < 2) return ''; const list = (d.sres || []).concat(d.smore && d.smore.items ? d.smore.items : []);
  let h = '<ul class="rows pl-res">' + list.map((x, i) => `<li class="row tap pl-rrow" data-act="draft-stay-pick" data-i="${i}">${thumb(x)}<div class="row-body"><div class="row-title">${esc(x.name)}</div>${x.addr ? `<div class="row-desc">${esc(x.addr)}</div>` : ''}</div></li>`).join('') + '</ul><ul class="rows pl-ways">';
  if (!d.smore) h += `<li class="row tap" data-act="draft-stay-more"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-title">${esc(tr('‘{q}’ 더 찾아보기', { q }))}</div><div class="row-desc">${esc(tr('가게나 주소까지 넓혀서 찾아요.'))}</div></div></li>`;
  else if (d.smore.state === 'loading') h += `<li class="row"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-desc">${esc(tr('찾는 중…'))}</div></div></li>`;
  else if (!d.smore.items.length) h += `<li class="row"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-desc">${esc(tr('더 찾은 곳이 없어요.'))}</div></div></li>`;
  return h + `<li class="row tap" data-act="draft-stay-name"><span class="pl-thumb ic">${PEN_SVG}</span><div class="row-body"><div class="row-title">${esc(tr('‘{q}’ 이름만 적어 두기', { q }))}</div><div class="row-desc">${esc(tr('위치는 이어서 주소로 찾거나 나중에 숙소에서 정할 수 있어요.'))}</div></div></li></ul>`;
}
async function draftStaySearch(q, full) {
  const d = ST.draft; if (!d) return; const seq = d.sseq; let items = [];
  try { const j = await H.api('GET', (full ? '/places/search?' : '/places/suggest?') + draftQs(q)); items = ((j && j.items) || []).slice(0, 6); } catch (e) { log('stay search failed: ' + (e && (e.code || e.message))); }
  if (ST.draft !== d || seq !== d.sseq) return;
  if (full) { const have = new Set((d.sres || []).map(llKey)); d.smore = { state: 'done', items: items.filter(x => !have.has(llKey(x))) }; } else d.sres = items;
  const box = $('#pl-sres'); if (box) box.innerHTML = draftStayHtml();
  if (full && d.autoAddr && !items.length && !(d.sres || []).length && d.stay && !C.hasLL(d.stay) && (d.stay.addr || '').length >= 4) { d.autoAddr = false; ACT['draft-stay-addr'](); }   // 확인서의 숙소 이름으로 못 찾음 → 확인서의 주소로
}
ACT['draft-stay-more'] = () => { const d = ST.draft; const q = (d.sq || '').trim(); if (q.length < 2 || (d.smore && d.smore.state === 'loading')) return; clearTimeout(pickT); d.smore = { state: 'loading', items: [] }; const box = $('#pl-sres'); if (box) box.innerHTML = draftStayHtml(); draftStaySearch(q, true); };
ACT['draft-stay-pick'] = async (ds) => {
  const d = ST.draft; const x = (d.sres || []).concat(d.smore && d.smore.items ? d.smore.items : [])[+ds.i]; if (!x) return;
  const ok = await resolvePlace(x); if (ST.draft !== d) return;
  const keepAddr = d.stay && d.stay.addr && (d.stayFiles || []).length ? d.stay.addr : '';   // 확인서에서 읽은 주소(현지 글자일 때가 많다)를 남긴다
  d.stay = ok ? { name: x.name, addr: keepAddr || x.addr || '', lat: +x.lat, lon: +x.lon, img: hasImg(x) ? x.img : '' } : { name: x.name, addr: keepAddr || x.addr || '' };
  d.sq = ''; d.sres = []; d.smore = null; d.addrMsg = ''; d.autoAddr = false; renderScreen();
};
ACT['draft-stay-name'] = () => { const d = ST.draft; const q = (d.sq || '').trim().slice(0, 60); if (!q) return; d.stay = { name: q, addr: (d.stay && d.stay.addr) || '' }; d.addrMsg = ''; d.sq = ''; d.sres = []; d.smore = null; renderScreen(); };
ACT['draft-stay-del'] = () => { ST.draft.stay = null; ST.draft.addrMsg = ''; renderScreen(); };
ACT['draft-stay-addr'] = async () => {   // 이름만 정한 숙소: 주소로 지도 위치(AI 없이 — 서버가 주소를 다듬고, 안 되면 우편번호 근처)
  const d = ST.draft; const inp = $('#pl-saddr'); const q = inp ? inp.value.trim() : ''; if (!d || !d.stay) return;
  if (q.length < 4) { toast(tr('주소를 적어 주세요.')); return; }
  d.stay.addr = q.slice(0, 160); d.addrMsg = tr('주소로 찾는 중…'); renderScreen(); const st = d.stay;
  let it = null; try { const j = await H.api('GET', '/places/geocode?' + draftQs(q)); it = ((j && j.items) || [])[0] || null; } catch (e) { log('draft geocode failed: ' + (e && (e.code || e.message))); }
  if (ST.draft !== d || d.stay !== st) return;
  if (it) { st.lat = +it.lat; st.lon = +it.lon; d.sq = ''; d.sres = []; d.smore = null; d.addrMsg = it.approx === 'post' ? tr('우편번호 근처로 지도 위치를 정했어요.') : tr('주소로 지도 위치를 정했어요 · {p}', { p: [it.name, it.addr].filter(Boolean).join(', ').slice(0, 60) }); }
  else d.addrMsg = tr('이 주소로는 위치를 찾지 못했어요. 영어나 현지 글자로 된 주소(구글 지도·예약 확인서)를 넣어 보세요. 위치 없이 만들어도 돼요.');
  renderScreen();
};
ACT['new-done'] = () => {
  const d = ST.draft; const home = homeCur(); const first = d.dests.find(x => x.cc) || {};
  const t = C.newTrip({ title: (d.titleOn && String(d.title || '').trim().slice(0, 40)) || tripTitle(d.dests), start: d.start, end: d.end, dests: d.dests.slice(), people: d.people.map(p => ({ id: p.id, name: p.name, c: C.now(), u: C.now() })), home, cur: PD.CC_CUR[first.cc] || home });
  C.ensureMe(t, myName()); t.mu = t.c;
  if (d.go) {   // 4단계: 가는 편(과 갈아타는 구간), 오는 길도 같으면 오는 편. 적은 것만 들어가고 나머지는 나중에 고친다
    const W = draftWay(d); const mk = (dir, v) => { const o = wayFields(t, dir, Object.assign({ mode: d.go }, v, { mode: v.mode || d.go })); return wayRecord(t, dir, o.mode, o); };
    const made = [W.go].concat(W.goMore).map(v => mk('go', v));
    if (d.backSame !== false) {
      const b0 = Object.assign({}, W.back); if (!b0.from && !b0.to) { b0.from = W.go.to || ''; b0.to = W.go.from || ''; if (W.go.toPt) b0.fromPt = W.go.toPt; if (W.go.fromPt) b0.toPt = W.go.fromPt; }   // 안 적었으면 가는 편을 거꾸로
      [b0].concat(W.backMore).forEach(v => made.push(mk('back', v)));
    }
    for (const rec of W.files) saveFile(t, rec, made.map(b => b.id));   // 올린 표는 이 단계들에 붙인다
  }
  const sf = d.stayFiles || [];
  if ((d.stay && d.stay.name) || sf.length) {
    const st0 = d.stay || {}; const din = d.stayIn || t.start, dout = d.stayOut || t.end;
    const b = { id: C.uid(), c: C.now(), u: C.now(), kind: 'stay', title: st0.name || tr('숙소'), start: din ? din + 'T15:00' : '', end: dout ? dout + 'T11:00' : '', addr: st0.addr || '', code: d.stayCode || '', paid: 0, memo: '' };
    if (C.hasLL(st0)) { b.lat = st0.lat; b.lon = st0.lon; } if (st0.img) b.img = st0.img; t.bookings.push(b);
    for (const rec of sf) saveFile(t, rec, [b.id]);   // 올린 확인서(언어별 판)는 이 숙소에
  }
  ST.trips.push(t); persist(t); ST.draft = null; ST.tripId = t.id; ST.sec = 'plan'; ST.day = undefined; ST.edit = false;
  show('trip', {}, true); toast(tr('여행을 만들었어요. 가고 싶은 곳을 담아 보세요.'));
};

// ---------- 여행 상세 ----------
SCREENS.trip = () => {
  const t = trip(); if (!t) return { title: '', html: '' };
  const secs = [['plan', '일정'], ['money', '경비'], ['diary', '일기'], ['prep', '준비']];
  const ps = C.people(t); const when = [shortRange(t), nightsText(t)].concat(ddayText(t) ? [ddayText(t)] : []).join(' · ');
  const S = ({ plan: planSec, money: moneySec, diary: diarySec, prep: prepSec }[ST.sec] || planSec)(t);
  // 맨 위: 짧은 날짜 한 줄 + 이름(누르면 이름·날짜 고치기). 오른쪽에 인원수(자세한 것은 공유 창) · 공유 · 더 보기. 일정·경비·일기·준비는 맨 아래 탭으로
  const top = `<header class="sd-top pl-top">`
    + `<button type="button" class="pl-top-main" data-act="title-edit" aria-label="${esc(tr('여행 정보 고치기'))}"><span class="pl-top-when">${esc(when)}</span><span class="pl-top-title"><b class="sd-top-title">${esc(t.title || tr('이름 없는 여행'))}</b>${PEN_SVG}</span></button>`
    + `<button type="button" class="pl-top-ppl" data-act="who" aria-label="${esc(tr('참여자 {n}명', { n: ps.length }))}">${PEOPLE_SVG}<b>${ps.length}</b></button><button type="button" class="top-btn" data-act="share" aria-label="${esc(tr('공유'))}">${SHARE_SVG}</button><button type="button" class="top-btn" data-act="trip-menu" aria-label="${esc(tr('더 보기'))}">${MORE_SVG}</button></header>`;
  const tabs = `<nav class="pl-seg pl-tabs">${secs.map(([k, n]) => `<button type="button" data-act="sec" data-v="${k}" class="${ST.sec === k ? 'active' : ''}">${SEC_ICON[k]}<span>${esc(tr(n))}</span></button>`).join('')}<button type="button" data-act="go-comm">${SEC_ICON.comm}<span>${esc(tr('커뮤니티'))}</span></button><button type="button" data-act="go-home">${SEC_ICON.home}<span>${esc(tr('홈으로'))}</span></button></nav>`;
  return { full: true, html: `${top}<div class="sd-body pl-tripbody${S.cta ? ' has-cta' : ''}">${S.html}</div>${tabs}<div class="pl-cta">${S.cta || ''}</div>`, after: S.after };
};
ACT.sec = (d) => { ST.sec = d.v; ST.edit = false; ST.mapOn = false; renderScreen(true); };
// 여행 안에서 커뮤니티로 가면 아래 탭(일정·경비·일기·준비·커뮤니티·홈으로)을 그대로 둔다 — 앱의 아래 탭 위에 같은 모양의 줄을 얹는다
function tripBar(on) {
  let el = document.getElementById('pl-tripbar');
  if (!on) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('nav'); el.id = 'pl-tripbar'; el.className = 'pl-tabs'; document.body.appendChild(el); }
  el.innerHTML = [['plan', '일정'], ['money', '경비'], ['diary', '일기'], ['prep', '준비']].map(([k, n]) => `<button type="button" data-act="bar-sec" data-v="${k}">${SEC_ICON[k]}<span>${esc(tr(n))}</span></button>`).join('')
    + `<button type="button" class="active" data-act="bar-comm">${SEC_ICON.comm}<span>${esc(tr('커뮤니티'))}</span></button><button type="button" data-act="go-home">${SEC_ICON.home}<span>${esc(tr('홈으로'))}</span></button>`;
  el.hidden = false; const tb = document.getElementById('tabbar'); if (tb && tb.offsetHeight) el.style.minHeight = tb.offsetHeight + 'px';   // 앱의 아래 탭을 빈틈없이 덮는다
}
ACT['go-comm'] = () => { const id = ST.tripId; closeSheet(); closeScreens(); ST.navTrip = id; H.showTab('comm'); tripBar(true); };
ACT['go-home'] = () => { const left = ST.navTrip || ST.tripId; const m = mainTrip(); if (m && m.id === left) { setMain(null); renderList(); toast(tr('메인 여행을 풀었어요.')); }   // 메인 여행에서 '홈으로' = 여행 모드에서 나가기: 다음에 앱을 열면 원래 첫 화면
  ST.navTrip = null; tripBar(false); closeSheet(); if (ST.stack.length) closeScreens(); H.showTab('home'); };   // 맨 오른쪽 '홈으로': 여행에서 나가 앱의 첫 화면으로
ACT['bar-sec'] = (d) => { const id = ST.navTrip; tripBar(false); if (!id || !ST.trips.some(x => x.id === id && !x.del)) { ACT['go-home'](); return; } openTrip(id, d.v); };
ACT['bar-comm'] = () => {};
ACT['title-edit'] = () => { ACT['trip-edit'](); const i = $('#pl-t-title'); if (i) { try { i.focus(); i.select(); } catch (e) { /* ignore */ } } };   // 맨 위의 이름을 누르면 바로 고친다
// 함께 가는 사람: 여행을 만든 뒤에도 보고 고친다. 경비를 누가 냈고 누구 몫인지 나누는 데 쓴다
function peopleSheet() {
  const t = trip(); if (!t) return; const ps = C.people(t);
  sheet(`<div class="sheet-title">${esc(tr('함께 가는 사람'))}</div><p class="desc">${esc(tr('여기 있는 사람끼리 함께 쓴 돈을 나눠 계산해요.'))}</p>
    <ul class="rows pl-ppl">${ps.map(p => `<li class="row"><span class="pl-avatar">${esc((pname(t, p) || '?').slice(0, 1))}</span><div class="row-body"><div class="row-title">${esc(p.id === t.meId ? (p.name || tr('나')) : p.name)}</div><div class="row-desc">${esc(p.id === t.meId ? tr('나') : p.uid ? tr('앱으로 함께 보는 중') : tr('이름만 적어 둠'))}</div></div>${p.id === t.meId ? '' : `<button type="button" class="pl-check-del" data-act="ppl-rm" data-id="${esc(p.id)}" aria-label="${esc(tr('삭제'))}">×</button>`}</li>`).join('')}</ul>
    <div class="pl-addrow"><input id="pl-pp-name" maxlength="20" autocomplete="off" enterkeyhint="done" placeholder="${esc(tr('같이 가는 사람 이름'))}"><button type="button" data-act="ppl-new">${esc(tr('추가'))}</button></div>
    <button type="button" class="btn secondary" data-act="sheet-close" style="margin-top:14px">${esc(tr('닫기'))}</button>`,
  () => { const i = $('#pl-pp-name'); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACT['ppl-new'](); } }); });
}
ACT.people = () => peopleSheet();
ACT['ppl-new'] = () => {
  const t = trip(); const inp = $('#pl-pp-name'); const v = inp ? inp.value.trim() : ''; if (!t || !v) return;
  if (C.people(t).some(p => p.name === v)) { toast(tr('같은 이름이 이미 있어요.')); return; }
  t.people.push({ id: C.uid(), name: v, c: C.now(), u: C.now() }); persist(t); renderScreen(); peopleSheet(); const again = $('#pl-pp-name'); if (again) again.focus();
};
ACT['ppl-rm'] = async (d) => {
  const t = trip(); const p = t && t.people.find(x => x.id === d.id); if (!p || p.id === t.meId) return;
  if (p.uid) {   // 앱으로 함께 보는 사람: 여행을 만든 사람만 내보낼 수 있다
    if (!t.cloud || !t.cloud.mine) { toast(tr('여행을 만든 사람만 내보낼 수 있어요.')); return; }
    closeSheet(); const yes = await H.askConfirm(tr('{name} 님을 내보낼까요?', { name: p.name }), tr('그 사람의 앱에서 이 여행이 사라져요.'), tr('내보내기'), true); document.body.style.overflow = 'hidden';
    if (!yes) { peopleSheet(); return; }
    try { const j = await H.api('DELETE', '/trips/' + encodeURIComponent(t.id) + '/members/' + p.uid); if (j && j.doc) { C.applyRemote(t, j, myUid()); } }
    catch (e) { toast(tr('내보내지 못했어요. 잠시 뒤에 다시 해 주세요.')); peopleSheet(); return; }
  }
  const used = C.live(t.expenses).filter(e => e.payer === p.id || (e.share && e.share.mode === 'some' && (e.share.ids || []).includes(p.id))).length;
  if (used) { closeSheet(); const ok = await H.askConfirm(tr('{name} 님을 뺄까요?', { name: p.name }), tr('이 사람이 낸 지출 {n}건은 내가 낸 것으로 계산돼요.', { n: used }), tr('빼기'), true); document.body.style.overflow = 'hidden'; if (!ok) { peopleSheet(); return; } }
  p.del = true; C.touch(p); persist(t); renderScreen(); peopleSheet();
};
ACT['trip-menu'] = () => {
  sheet(`<div class="sheet-title">${esc(trip().title)}</div><ul class="rows"><li class="row tap" data-act="share"><div class="row-body"><div class="row-title">${esc(tr('일정 공유'))}</div><div class="row-desc">${esc(tr('링크나 글로 일정을 보내요'))}</div></div><span class="chev"></span></li>${aiOn() && !trip().sample ? `<li class="row tap" data-act="ai"><div class="row-body"><div class="row-title">${esc(tr('AI 일정 도우미'))}</div><div class="row-desc">${esc(tr('일정을 자동으로 짜거나 말로 고쳐요'))}</div></div><span class="chev"></span></li>` : ''}<li class="row tap" data-act="trip-edit"><div class="row-body"><div class="row-title">${esc(tr('여행 정보 고치기'))}</div><div class="row-desc">${esc(tr('이름과 날짜를 바꿔요'))}</div></div><span class="chev"></span></li>${mainRow(trip())}<li class="row tap" data-act="day-apps"><div class="row-body"><div class="row-title">${esc(tr('지도 앱으로 보기'))}</div><div class="row-desc">${esc(tr('일정의 장소를 지도 앱에서 하나씩 열어요'))}</div></div><span class="chev"></span></li>
    ${trip().cloud && !trip().cloud.mine ? `<li class="row tap" data-act="trip-copy"><div class="row-body"><div class="row-title">${esc(tr('내 여행으로 복사'))}</div><div class="row-desc">${esc(tr('나가지 않고 내 여행으로 따로 남겨요'))}</div></div></li>` : ''}
    <li class="row tap" data-act="trip-del"><div class="row-body"><div class="row-title" style="color:var(--red500)">${esc(trip().cloud && !trip().cloud.mine ? tr('이 여행에서 나가기') : tr('여행 지우기'))}</div></div></li></ul><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['trip-edit'] = () => {
  const t = trip();
  sheet(`<div class="sheet-title">${esc(tr('여행 정보 고치기'))}</div><div class="field"><label for="pl-t-title">${esc(tr('여행 이름'))}</label><input id="pl-t-title" maxlength="40" value="${esc(t.title)}"></div>
    <div class="pl-date-row"><div class="field"><label for="pl-t-d1">${esc(tr('가는 날'))}</label><input id="pl-t-d1" type="date" value="${esc(t.start)}"></div><div class="field"><label for="pl-t-d2">${esc(tr('오는 날'))}</label><input id="pl-t-d2" type="date" value="${esc(t.end)}"></div></div>
    <button type="button" class="btn primary" data-act="trip-save">${esc(tr('저장'))}</button>`);
};
ACT['trip-save'] = () => {
  const t = trip(); const title = $('#pl-t-title').value.trim(), a = $('#pl-t-d1').value, b = $('#pl-t-d2').value;
  if (!title) { toast(tr('여행 이름을 적어 주세요.')); return; }
  if (!dOf(a) || !dOf(b) || a > b) { toast(tr('날짜를 확인해 주세요.')); return; }
  t.title = title; t.start = a; t.end = b; t.mu = C.now();
  const days = C.tripDays(t); let moved = 0;   // 기간 밖으로 나간 일정은 '가고 싶은 곳'으로 옮긴다
  for (const it of C.live(t.items)) if (it.day && !days.includes(it.day)) { it.day = null; C.touch(it); moved++; }
  persist(t); closeSheet(); ST.day = undefined; renderScreen();
  toast(moved ? tr('기간 밖의 일정 {n}곳은 가고 싶은 곳으로 옮겼어요.', { n: moved }) : tr('저장했어요.'));
};
ACT['trip-del'] = async () => {
  const t = trip(); closeSheet(); const guest = !!(t.cloud && !t.cloud.mine); const together = !!(t.cloud && (t.cloud.members || []).length > 1);
  if (guest) { leaveSheet(t); return; }
  const ok = await H.askConfirm(tr('이 여행을 지울까요?'), together ? tr('함께 보는 사람들에게서도 사라지고 되돌릴 수 없어요.') : tr('일정, 경비, 일기가 모두 지워지고 되돌릴 수 없어요.'), tr('지우기'), true);
  if (!ok) { document.body.style.overflow = 'hidden'; return; }   // 확인 시트가 닫히며 풀어 둔 바탕 스크롤 잠금을 되돌린다
  if (t.sample) ST.trips = ST.trips.filter(x => x !== t); else { t.del = true; persist(t); if (t.cloud) dropRemote(t).catch(() => { /* 다음에 맞출 때 다시 */ }); }
  closeScreens(); toast(guest ? tr('여행에서 나왔어요.') : tr('여행을 지웠어요.'));
};

// 함께 보는 여행에 들어온 사람(손님)은 여행을 지울 수 없고 나가기만 한다(11-19 사용자) — 나가기 전에 내 여행으로 복사해 기록을 남길 수 있다
let LEAVE = null;
function cloneTrip(t) {   // 일정·숙소·이동·경비·일기·준비물·올린 표까지 그대로, 함께 보기·공유 링크·메인 표시는 없이 새 여행으로(표·사진 파일은 폰에 있는 것을 같이 쓴다)
  const c = JSON.parse(JSON.stringify(t)); const at = C.now();
  delete c.cloud; delete c.share; delete c.del; delete c.sample; delete c.from;
  c.id = C.uid(); c.c = at; c.u = at; c.mu = at; c.copyOf = { id: t.id, at };
  ST.trips.push(c); persist(c); return c;
}
function leaveSheet(t) {
  LEAVE = t.id;
  sheet(`<div class="sheet-title">${esc(tr('이 여행에서 나갈까요?'))}</div>
    <p class="desc">${esc(tr('내 앱에서만 사라지고, 다른 사람들은 계속 볼 수 있어요. 기록을 남기고 싶으면 내 여행으로 복사해 두고 나가세요.'))}</p>
    <button type="button" class="btn primary" data-act="trip-leave" data-copy="1">${esc(tr('내 여행으로 복사하고 나가기'))}</button>
    <button type="button" class="btn weak" data-act="trip-leave" data-copy="0" style="margin-top:8px">${esc(tr('그냥 나가기'))}</button>
    <button type="button" class="btn secondary" data-act="sheet-close" style="margin-top:8px">${esc(tr('취소'))}</button>`);
}
ACT['trip-leave'] = async (d) => {
  const t = ST.trips.find(x => x.id === LEAVE && !x.del); LEAVE = null; closeSheet(); if (!t) return;
  if (d.copy === '1') await fetchTripPhotos(t).catch(() => { /* 받은 것만 */ });   // 나가면 함께 보는 사람이 올린 영수증을 받을 수 없으니 먼저
  const copy = d.copy === '1' ? cloneTrip(t) : null;
  if ((mainTrip() || {}).id === t.id) setMain(null);
  t.del = true; persist(t); if (t.cloud) dropRemote(t).catch(() => { /* 다음에 맞출 때 다시 */ });
  closeScreens(); renderList(); toast(copy ? tr('내 여행으로 복사하고 나왔어요.') : tr('여행에서 나왔어요.'));
};
ACT['trip-copy'] = async () => { const t = trip(); closeSheet(); if (!t) return; await fetchTripPhotos(t).catch(() => { /* 받은 것만 */ }); cloneTrip(t); toast(tr('내 여행으로 복사했어요. 여행 목록에서 볼 수 있어요.')); };

// ---------- 일정 ----------
const hasImg = (x) => !!x && typeof x.img === 'string' && x.img.startsWith('https://');
// ---------- 장소 사진을 폰에 저장(인터넷이 없어도 보이게) ----------
// 일정·숙소·숙소 후보에 담은 사진은 주소만 갖고 있어 인터넷이 끊기면 안 보였다. 받을 수 있을 때 작게(긴 변 480px JPEG) 줄여 폰(IndexedDB files 의 'img:<주소>')에 저장하고,
// 그릴 때 저장한 것이 있으면 그것을 쓴다(그 화면에 보이는 것만 메모리에 올린다). 다른 사이트의 사진이라 앱에서는 네이티브가 받는다(cloud.js NativeHttp — CORS 를 피한다).
// 대상: 지우지 않았고 끝난 지 PIC_DAYS 일이 안 된 여행, 최대 PIC_MAX 장. 더는 담겨 있지 않은 사진은 지운다.
const PIC_DAYS = 30, PIC_MAX = 400, PIC_SIDE = 480;
const PIC = { urls: new Map(), keys: null, busy: false, again: false, t: 0, loading: new Set() };   // urls: 사진 주소 → 폰에 저장한 사진의 blob: 주소, keys: 저장해 둔 'img:…' 키
const picKey = (u) => 'img:' + u;
/** <img> 의 사진 속성: 폰에 있으면 그것을, 저장해 뒀지만 아직 안 읽었으면 비워 두고 곧 채우고, 없으면 원래 주소 */
function picAttrs(u) {
  const b = PIC.urls.get(u); if (b) return `src="${esc(b)}" data-pic="${esc(u)}"`;
  if (PIC.keys && PIC.keys.has(picKey(u))) { picLoad(u); return `data-pic="${esc(u)}"`; }
  return `src="${esc(u)}" data-pic="${esc(u)}"`;
}
async function picLoad(u) {
  if (PIC.urls.has(u) || PIC.loading.has(u)) return; PIC.loading.add(u);
  try { const r = await C.Store.getFile(picKey(u)); if (r && r.buf) { const b = URL.createObjectURL(new Blob([r.buf], { type: r.mime || 'image/jpeg' })); PIC.urls.set(u, b); picPaint(u); } }
  catch (e) { /* 원래 주소로 남는다 */ }
  PIC.loading.delete(u);
}
function picPaint(u) {   // 이미 그려 둔 <img> 에 폰의 사진을 넣는다
  const b = PIC.urls.get(u); if (!b) return;
  document.querySelectorAll('img[data-pic]').forEach(im => { if (im.getAttribute('data-pic') === u && im.getAttribute('src') !== b) im.src = b; });
}
function picWanted() {
  const td = C.today(); const out = new Set(); const add = (x) => { if (hasImg(x) && out.size < PIC_MAX) out.add(x.img); };
  for (const t of ST.trips) {
    if (!t || t.del || t.sample) continue;
    if (t.end && C.dayDiff(t.end, td) > PIC_DAYS) continue;   // 끝난 지 오래된 여행은 빼기
    for (const it of C.live(t.items)) add(it);
    for (const b of C.live(t.bookings || [])) add(b);   // 숙소 · 숙소 후보
  }
  return out;
}
async function picFetch(u) {
  const http = root.NativeHttp; if (!http) return null;
  const r = await http.request(u, { binary: true, timeout: 20000 });
  if (!r || r.status !== 200 || !r.base64 || r.base64.length > 11e6) return null;
  try {
    const bin = atob(r.base64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([arr], { type: (r.headers && r.headers['content-type']) || 'image/jpeg' }));
    const k = Math.min(1, PIC_SIDE / Math.max(bmp.width, bmp.height)); const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height); if (bmp.close) bmp.close();
    const out = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.8)); return out ? await out.arrayBuffer() : null;
  } catch (e) { return null; }   // 그림으로 읽지 못하는 것(지원하지 않는 형식 등)은 건너뛴다
}
/** 담긴 사진을 폰에 받아 두고, 더는 담겨 있지 않은 것은 지운다. 인터넷이 없으면 다음에(online) */
async function picSync() {
  if (PIC.busy) { PIC.again = true; return; }
  if (!ST.ready || !ST.storeOk) return;
  PIC.busy = true;
  try {
    if (!PIC.keys) PIC.keys = new Set(((await C.Store.fileKeys()) || []).filter(k => typeof k === 'string' && k.startsWith('img:')));
    const want = picWanted();
    for (const u of want) {
      if (offline()) break;
      if (PIC.keys.has(picKey(u))) continue;
      const buf = await picFetch(u); if (!buf) continue;
      await C.Store.putFile({ id: picKey(u), name: 'place.jpg', mime: 'image/jpeg', buf }); PIC.keys.add(picKey(u));
    }
    for (const k of [...PIC.keys]) {
      const u = k.slice(4); if (want.has(u)) continue;
      await C.Store.delFile(k).catch(() => { /* 다음에 */ }); PIC.keys.delete(k);
      const b = PIC.urls.get(u); if (b) { URL.revokeObjectURL(b); PIC.urls.delete(u); }
    }
  } catch (e) { log('pic sync failed: ' + (e && e.message)); }
  PIC.busy = false;
  if (PIC.again) { PIC.again = false; picSoon(); }
}
const picSoon = (ms) => { clearTimeout(PIC.t); PIC.t = setTimeout(picSync, ms == null ? 4000 : ms); };
const photo = (x) => (hasImg(x) ? `<img class="pl-thumb sm" ${picAttrs(x.img)} alt="" loading="lazy">` : '');   // 일정 줄: 사진이 있을 때만(폰에 저장해 둔 사진이 먼저)
const thumb = (x) => (hasImg(x) ? `<img class="pl-thumb" src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="pl-thumb ic">${x && x.src === 'city' ? CITY_SVG : PIN_SVG}</span>`);   // 검색 결과 줄: 없으면 아이콘
function itemSub(it, noTime) {   // noTime: 시각을 왼쪽 열에 따로 적는 날(dayBlock 의 timed)
  const a = [];
  if (it.stayId) a.push(esc(tr('숙소')));
  if (it.wayId) a.push(esc(it.wayEnd === 'from' ? tr('출발지') : tr('도착지')));
  if (it.time && !noTime) a.push(`<span class="t">${esc(it.time)}</span>`);
  if (Number.isFinite(it.stay) && it.stay !== C.STAY_DEFAULT) a.push(esc(tr('{t} 머묾', { t: durText(it.stay) })));
  if (it.done) a.push(`<span class="ok">${esc(tr('방문 완료'))}</span>`);
  if (it.est && it.est.amt > 0) a.push(esc(tr('약 {m}', { m: money(it.est.amt, it.est.cur || 'KRW') })));   // AI 가 어림한 비용
  if (it.memo) a.push(esc(it.memo)); else if (it.addr && !a.length) a.push(esc(it.addr));
  return a.join(' · ');
}
const legText = (leg) => {
  const t = leg.min > 0 ? durText(leg.min) : '';
  const head = leg.chosen ? (!t ? moveName(leg.mode) : leg.manual ? tr('{m} {t}', { m: moveName(leg.mode), t }) : tr('{m} 약 {t}', { m: moveName(leg.mode), t }))
    : !t ? tr('이동|leg') : leg.manual ? tr('이동 {t}', { t }) : leg.mode === 'walk' ? tr('걸어서 약 {t}', { t }) : tr('차·대중교통 약 {t}', { t });
  return head + (leg.km ? ' · ' + kmText(leg.km) : '') + (leg.cost ? ' · ' + money(leg.cost.amt, leg.cost.cur) : '') + (leg.memo ? ' · ' + leg.memo : '');
};
const legIcon = (leg) => MOVE_ICON[leg && leg.chosen ? leg.mode : leg && leg.mode === 'walk' ? 'walk' : 'auto'] || MOVE_ICON.auto;
function dayBlock(t, d, idx, overview) {
  const p = C.dayPlan(t, d); const color = dayColor(idx); const places = p.items.filter(i => i.kind !== 'note');
  const meta = places.length ? [tr('{n}곳', { n: places.length })].concat(p.moveMin ? [tr('이동 {t}', { t: durText(p.moveMin) })] : []).concat(p.km >= 0.1 ? [kmText(p.km)] : []).join(' · ') : '';
  let h = `<div class="pl-dayhead" ${overview ? `data-act="day" data-v="${d}"` : ''}><b>${esc(tr('{n}일차', { n: idx + 1 }))} · ${esc(longDay(d))}</b><span>${esc(meta)}</span></div>`;
  if (!overview && p.totalMin > OVER_MIN) h += `<div class="pl-warn">${esc(tr('이동까지 합쳐 약 {t}이에요. 하루에 담기엔 빡빡할 수 있어요.', { t: durText(p.totalMin) }))}</div>`;
  // 그 날의 뼈대: 가는 방법의 단계(첫날 맨 위) → [장소들] → 오는 방법의 단계(마지막 날 맨 아래). 숙소는 아래 '숙소 추가하기'로 불러와 장소로 넣는다
  const go = overview ? [] : C.ways(t, 'go').filter(b => C.wayDay(t, b) === d), back = overview ? [] : C.ways(t, 'back').filter(b => C.wayDay(t, b) === d);
  // 시각을 적어 둔 날은 왼쪽에 시각 열을 둔다(시간표처럼 위에서 아래로 읽힌다). 가는 · 오는 편의 줄에는 그 날 떠나는 시각
  const timed = p.items.some(i => i.time); const tcell = (v) => (timed ? `<span class="pl-time">${esc(v || '')}</span>` : '');
  const wayTime = (b) => { const v = String(b.start || ''); return v.length > 10 && v.slice(0, 10) === d ? v.slice(11, 16) : ''; };
  const itemTime = (it) => {   // 자동으로 든 도착지 · 출발지는 그 편의 도착 · 출발 시각
    if (it.time || !it.wayId) return it.time || ''; const b = (t.bookings || []).find(x => x.id === it.wayId && !x.del); const v = b ? String((it.wayEnd === 'from' ? b.start : b.end) || '') : ''; return v.length > 10 ? v.slice(11, 16) : '';
  };
  const wayRow = (b) => `<li class="pl-way" data-act="way-edit" data-id="${esc(b.id)}">${tcell(wayTime(b))}<span class="pl-way-ic">${MOVE_ICON[b.mode] || MOVE_ICON.auto}</span><div class="pl-way-body"><div class="pl-way-title">${esc(wayTitle(b))}</div><div class="pl-way-sub">${esc(waySub(t, b))}</div></div><span class="chev"></span></li>`;
  const pre = go.map(wayRow).join('') + (overview ? '' : wayAddHtml(t, go[go.length - 1], 'to', p.items)), post = (overview ? '' : wayAddHtml(t, back[0], 'from', p.items)) + back.map(wayRow).join('');
  const ol = `<ol class="pl-tl${timed ? ' timed' : ''}">`;
  if (!p.items.length) h += (pre || post ? `${ol}${pre}${post}</ol>` : '') + `<p class="pl-hint">${esc(overview ? tr('아직 일정이 없어요.') : tr('아직 일정이 없어요. 아래 버튼으로 가고 싶은 곳을 담아 보세요.'))}</p>`;
  else {
    let no = 0; const N = p.items.length;   // 자동으로 둔 시작(도착지)·끝(출발지)은 순서를 바꾸지 않는다
    const pinA = !t.sample && !!p.items[0].wayId && p.items[0].wayEnd !== 'from', pinZ = !t.sample && !!p.items[N - 1].wayId && p.items[N - 1].wayEnd === 'from';
    const noUp = (i) => i === 0 || (pinA && i === 1) || (pinZ && i === N - 1), noDown = (i) => i === N - 1 || (pinZ && i === N - 2) || (pinA && i === 0);
    h += ol + pre + p.items.map((it, i) => {
      const note = it.kind === 'note'; const ic = note ? '' : itemIcon(t, it); if (!note && !ic) no++; const sub = itemSub(it, timed);
      let row = `<li class="pl-item" data-act="item" data-id="${esc(it.id)}">${tcell(itemTime(it))}<span class="pl-num ${it.done ? 'done' : ''} ${note ? 'note' : ''} ${ic ? 'ic' : ''}" ${!it.done && !note ? `style="background:${it.stayId ? STAY_COLOR : it.wayId ? WAY_COLOR : color}"` : ''}>${note ? '' : (ic || no)}</span><div class="pl-item-body"><div class="pl-item-title">${esc(it.name)}</div>${sub ? `<div class="pl-item-sub">${sub}</div>` : ''}</div>${photo(it)}`;
      row += (ST.edit && !overview) ? `<span class="pl-ord"><button type="button" data-act="up" data-id="${esc(it.id)}" ${noUp(i) ? 'disabled' : ''} aria-label="${esc(tr('위로'))}">▲</button><button type="button" data-act="down" data-id="${esc(it.id)}" ${noDown(i) ? 'disabled' : ''} aria-label="${esc(tr('아래로'))}">▼</button></span>` : '<span class="chev"></span>';
      row += '</li>';
      if (i < p.items.length - 1 && !overview) {
        const leg = p.legs[i];   // 정해 둔 것도, 어림할 거리도 없는 구간은 줄을 두지 않는다(줄마다 '이동 수단 정하기'가 끼어 일정이 안 읽혔다). 그런 구간은 일정 한 건의 시트에서 정한다
        if (leg) row += `<li class="pl-leg ${leg.chosen ? 'set' : ''}" data-act="leg" data-id="${esc(it.id)}"><i class="pl-leg-ic">${legIcon(leg)}</i><span>${esc(legText(leg))}</span>${C.hasLL(it) && C.hasLL(p.items[i + 1]) ? `<button type="button" data-act="route" data-id="${esc(it.id)}">${esc(tr('길찾기'))}</button>` : ''}</li>`;
      }
      return row;
    }).join('') + post + '</ol>';
  }
  if (!overview) {
    h += stayAddHtml(t, d, p.items);
    const acts = [];
    if (places.filter(C.hasLL).length >= 3) acts.push(`<button type="button" class="chip" data-act="optimize">${esc(tr('동선 정리'))}</button>`);
    if (p.items.length >= 2) acts.push(`<button type="button" class="chip" data-act="edit">${esc(ST.edit ? tr('순서 바꾸기 끝') : tr('순서 바꾸기'))}</button>`);
    if (acts.length) h += `<div class="pl-acts">${acts.join('')}</div>`;
  }
  return h;
}
function wishBlock(t, overview) {
  const items = C.dayItems(t, null);
  let h = `<div class="pl-dayhead" ${overview ? 'data-act="day" data-v="wish"' : ''}><b>${esc(tr('가고 싶은 곳'))}</b><span>${esc(items.length ? tr('{n}곳', { n: items.length }) : '')}</span></div>`;
  if (!overview) h += `<p class="pl-sum">${esc(tr('아직 날짜를 정하지 않은 곳이에요. 하나씩 날짜를 고르거나 한 번에 나눠 담을 수 있어요.'))}</p>`;
  h += items.length ? '<ol class="pl-tl">' + items.map(it => { const sub = itemSub(it); return `<li class="pl-item" data-act="item" data-id="${esc(it.id)}"><span class="pl-num wish"></span><div class="pl-item-body"><div class="pl-item-title">${esc(it.name)}</div>${sub ? `<div class="pl-item-sub">${sub}</div>` : ''}</div>${photo(it)}<span class="chev"></span></li>`; }).join('') + '</ol>'
    : `<p class="pl-hint">${esc(tr('가고 싶은 곳을 먼저 모아 두고, 날짜는 나중에 정해도 돼요.'))}</p>`;
  if (!overview && items.some(C.hasLL) && C.tripDays(t).length) h += `<div class="pl-acts"><button type="button" class="chip" data-act="distribute">${esc(tr('날짜에 나눠 담기'))}</button></div>`;
  return h;
}
function planSec(t) {
  const days = C.tripDays(t); const wishN = C.dayItems(t, null).length; const td = C.today();
  if (ST.day === undefined) ST.day = days.includes(td) ? td : (days[0] || 'all');
  if (ST.day !== 'all' && ST.day !== null && !days.includes(ST.day)) ST.day = days[0] || 'all';
  const chips = [`<button type="button" class="chip ${ST.day === 'all' ? 'active' : ''}" data-act="day" data-v="all">${esc(tr('전체|plan'))}</button>`]
    .concat(days.map((d, i) => `<button type="button" class="chip ${ST.day === d ? 'active' : ''}" data-act="day" data-v="${d}">${esc(tr('{n}일차', { n: i + 1 }))}<small>${esc(shortDay(d))}</small></button>`))
    .concat([`<button type="button" class="chip ${ST.day === null ? 'active' : ''}" data-act="day" data-v="wish">${esc(tr('가고 싶은 곳'))}${wishN ? ' ' + wishN : ''}</button>`]);
  let h = `${baseHtml(t)}<div class="pl-days">${chips.join('')}</div><div class="pl-mapbox"><canvas id="pl-map"></canvas><button type="button" class="pl-mapguard" data-act="map-on" ${ST.mapOn ? 'hidden' : ''}><span>${esc(tr('지도를 누르면 움직일 수 있어요'))}</span></button><div class="pl-mapbtns"><button type="button" class="pl-mapbtn" data-act="map-zoom" data-v="1" aria-label="${esc(tr('확대'))}">+</button><button type="button" class="pl-mapbtn" data-act="map-zoom" data-v="-1" aria-label="${esc(tr('축소'))}">−</button></div></div>`;
  if (aiOn() && !userPlaces(t).length && days.length && !t.sample) h += `<button type="button" class="pl-aicard" data-act="ai"><span class="pl-aicard-ic">${SPARK_SVG}</span><span class="pl-aicard-body"><b>${esc(tr('AI가 일정을 짜 드려요'))}</b><span>${esc(tr('{t} 일정과 동선, 예상 경비까지 한 번에 받아 보세요.', { t: nightsText(t) }))}</span></span><span class="chev"></span></button>`;
  if (ST.day === 'all') h += days.map((d, i) => dayBlock(t, d, i, true)).join('') + (wishN ? wishBlock(t, true) : '');
  else if (ST.day === null) h += wishBlock(t, false);
  else h += dayBlock(t, ST.day, days.indexOf(ST.day), false);
  // 떠 있는 버튼이 아니라 일정 맨 아래에 둔다. 옆에 'AI 도움받기'
  h += `<div class="pl-addrow"><button type="button" class="btn primary pl-addbtn" data-act="add">${esc(tr('장소 추가'))}</button>${aiOn() && !t.sample ? `<button type="button" class="btn weak pl-aibtn" data-act="ai">${SPARK_SVG}<span>${esc(tr('AI 도움받기'))}</span></button>` : ''}</div>`;
  return { html: h, after: () => { mountPlanMap(t); const on = $('.pl-days .chip.active'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' }); } };
}
function tileStyle() {
  const E = root.PhotoMapEngine; const s = E && E.TILE_STYLES && E.TILE_STYLES.esri;
  return s ? { layers: s.layers('light'), under: s.under('light'), maxZoom: s.maxZoom, attr: s.attr } : { layers: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], under: '#aad3df', maxZoom: 19, attr: '© OpenStreetMap contributors' };
}
function tripCenter(t) { const d = (t.dests || []).find(C.hasLL); return d ? [d.lat, d.lon] : null; }
function mountPlanMap(t) {
  const cv = $('#pl-map'); if (!cv || !root.PlannerMap) return;
  const days = C.tripDays(t); const markers = [], lines = [], pts = [];
  const addDay = (d, idx) => {
    let no = 0; const line = [];
    for (const it of C.dayItems(t, d)) {
      if (it.kind === 'note') continue; const ic = itemIcon(t, it); if (!ic) no++; if (!C.hasLL(it)) continue;
      markers.push({ id: it.id, lat: it.lat, lon: it.lon, label: d == null || ic ? '' : no, svg: d == null ? '' : ic, color: d == null ? '#8B95A1' : it.stayId ? STAY_COLOR : it.wayId ? WAY_COLOR : dayColor(idx), done: it.done }); line.push([it.lat, it.lon]); pts.push([it.lat, it.lon]);
    }
    if (d != null && line.length > 1) lines.push({ pts: line, color: dayColor(idx) });
  };
  if (ST.day === 'all') { days.forEach(addDay); addDay(null, 0); } else if (ST.day === null) addDay(null, 0); else addDay(ST.day, days.indexOf(ST.day));
  const inns = ST.day === 'all' || ST.day === null ? C.stays(t) : [C.stayOn(t, C.addDays(ST.day, -1)), C.stayOn(t, ST.day)].filter((x, i, a) => x && a.indexOf(x) === i);
  const inPlan = new Set(viewPlaces(t).map(i => i.stayId).filter(Boolean));   // 일정에 넣은 숙소는 번호 핀으로 이미 있다
  const own = pts.length;   // 그날 장소가 둘 이상이면 지도 범위는 그 장소들에 맞춘다(멀리 있는 숙소 때문에 장소들이 겹쳐 보이지 않게)
  for (const x of inns) if (C.hasLL(x) && !inPlan.has(x.id)) { markers.push({ id: 'stay:' + x.id, lat: x.lat, lon: x.lon, label: '', svg: BED_SVG, color: STAY_COLOR }); if (own < 2) pts.push([x.lat, x.lon]); }   // 저장해 둔 숙소
  makeMap(cv, (m) => {
    m.setData({ markers, lines });
    if (pts.length) m.fit(pts, 40); else { const c = tripCenter(t); if (c) m.setView(c[0], c[1], 11); }
    m.on('marker', (mk) => (String(mk.id).indexOf('stay:') === 0 ? staySheet(String(mk.id).slice(5)) : itemSheet(mk.id)));
  }, { get: () => map, set: (m) => { map = m; } });
}
ACT.day = (d) => {
  const el = $('#pl-screen'); const y = el ? el.scrollTop : 0;
  ST.day = d.v === 'all' ? 'all' : d.v === 'wish' ? null : d.v; ST.edit = false; ST.mapOn = false; renderScreen(true);
  // 날짜 줄(.pl-days)은 화면을 내려도 위에 붙어 있다. 내려 둔 채로 날짜를 바꾸면 그 날의 처음(날짜 줄 바로 아래)부터 보이게 한다
  const ch = $('#pl-screen .pl-days'), top = $('#pl-screen .sd-top'); if (el && ch && y > 0) el.scrollTop = Math.min(y, Math.max(0, ch.offsetTop - (top ? top.offsetHeight : 0)));
};
// 지도는 한 번 눌러야 움직인다(화면을 내리려다 지도가 잡히는 일을 막는다). 화면을 다시 내리면 잠긴다
ACT['map-on'] = (d, el) => { ST.mapOn = true; el.hidden = true; };
ACT['day-apps'] = () => {   // 더 보기의 '지도 앱으로 보기': 앱을 고르면 일정의 장소를 하나씩 여는 목록
  const t = trip(); if (!t) return; const apps = dayApps(t); ST.dayApps = apps; if (!apps.length) { closeSheet(); toast(tr('지도 앱으로 볼 장소가 아직 없어요.')); return; }
  sheet(`<div class="sheet-title">${esc(tr('지도 앱으로 보기'))}</div><div class="pl-mapapps">${apps.map((x, i) => `<button type="button" class="chip" data-act="day-app" data-i="${i}">${esc(tr(x[0]))}</button>`).join('')}</div><button type="button" class="btn secondary" data-act="sheet-close" style="margin-top:14px">${esc(tr('닫기'))}</button>`);
};
ACT.edit = () => { ST.edit = !ST.edit; renderScreen(); };
ACT['map-zoom'] = (d) => { const m = map || pickMap; if (m) m.zoomBy(+d.v); };
function swapItem(id, dir) {
  const t = trip(); const items = C.dayItems(t, ST.day); const i = items.findIndex(x => x.id === id), j = i + dir; if (i < 0 || j < 0 || j >= items.length) return;
  const a = items[i], b = items[j]; const s = a.sort; a.sort = b.sort; b.sort = s; C.touch(a); C.touch(b); persist(t); renderScreen();
}
ACT.up = (d) => swapItem(d.id, -1);
ACT.down = (d) => swapItem(d.id, 1);
function addItem(t, day, o) {
  const last = C.dayItems(t, day).pop();
  const it = Object.assign({ id: C.uid(), day: day || null, sort: C.midKey(last ? last.sort : '', ''), kind: 'place', name: '', c: C.now(), u: C.now() }, o);
  t.items.push(it); persist(t); return it;
}
ACT.optimize = () => {
  const t = trip(); const r = C.optimizeDay(C.dayItems(t, ST.day));
  if (!r.changed) { toast(tr('지금 순서가 가장 짧아요.')); return; }
  OPT = r;
  sheet(`<div class="sheet-title">${esc(tr('동선을 정리할까요?'))}</div><p class="desc">${esc(tr('시각을 정한 일정은 그대로 두고, 나머지 순서를 이동이 가장 짧게 바꿔요.'))}</p>
    <div class="pl-calc-out"><div class="r"><span>${esc(tr('지금 순서'))}</span><b>${esc(kmText(r.before))}</b></div><div class="r"><span>${esc(tr('정리한 순서'))}</span><b>${esc(kmText(r.after))}</b></div></div>
    <ol class="pl-tl">${r.order.filter(i => i.kind !== 'note').map((it, i) => `<li class="pl-item"><span class="pl-num">${i + 1}</span><div class="pl-item-body"><div class="pl-item-title">${esc(it.name)}</div></div></li>`).join('')}</ol>
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('그대로 두기'))}</button><button type="button" class="btn primary" data-act="optimize-ok">${esc(tr('이 순서로 바꾸기'))}</button></div>`);
};
const rekey = (order) => { const keys = C.seqKeys(order.length); order.forEach((it, i) => { it.sort = keys[i]; C.touch(it); }); };
ACT['optimize-ok'] = () => { const t = trip(); if (!OPT) return; rekey(OPT.order); OPT = null; persist(t); closeSheet(); renderScreen(); toast(tr('동선을 정리했어요.')); };
ACT.distribute = () => {
  const t = trip(); const r = C.distribute(t); const ids = Object.keys(r.assign);
  if (!ids.length) { toast(tr('나눠 담을 수 있는 곳이 없어요.')); return; }
  DIST = r; const byDay = {}; for (const id of ids) (byDay[r.assign[id]] = byDay[r.assign[id]] || []).push(t.items.find(x => x.id === id));
  sheet(`<div class="sheet-title">${esc(tr('날짜에 나눠 담을까요?'))}</div><p class="desc">${esc(tr('가까운 곳끼리 묶어서, 하루 8시간을 넘지 않게 나눴어요.'))}</p>
    ${C.tripDays(t).filter(d => byDay[d]).map(d => `<div class="pl-dayhead"><b>${esc(tr('{n}일차', { n: dayNo(t, d) }))}</b><span>${esc(shortDay(d))}</span></div><p class="pl-sum">${esc(byDay[d].map(x => x.name).join(' · '))}</p>`).join('')}
    ${r.left.length ? `<div class="pl-note">${esc(tr('{n}곳은 시간이 모자라 가고 싶은 곳에 남겨 뒀어요.', { n: r.left.length }))}</div>` : ''}
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('그대로 두기'))}</button><button type="button" class="btn primary" data-act="distribute-ok">${esc(tr('이대로 담기'))}</button></div>`);
};
ACT['distribute-ok'] = () => {
  const t = trip(); if (!DIST) return; const touched = new Set();
  for (const id of Object.keys(DIST.assign)) { const it = t.items.find(x => x.id === id); if (!it) continue; const d = DIST.assign[id]; const last = C.dayItems(t, d).pop(); it.day = d; it.sort = C.midKey(last ? last.sort : '', ''); C.touch(it); touched.add(d); }
  for (const d of touched) { const r = C.optimizeDay(C.dayItems(t, d)); if (r.changed) rekey(r.order); }
  DIST = null; persist(t); closeSheet(); ST.day = 'all'; renderScreen(true); toast(tr('날짜에 나눠 담았어요.'));
};

// 일정 한 건
function itemSheet(id) {
  const t = trip(); const it = t.items.find(x => x.id === id); if (!it) return; const days = C.tripDays(t);
  const pr = legPair(id); let lg = null; if (pr) { const dp = C.dayPlan(t, it.day); lg = dp.legs[dp.items.findIndex(x => x.id === id)] || null; }   // 다음 일정까지 이동(같은 날의 다음 줄이 있을 때)
  sheet(`<div class="pl-place">${hasImg(it) ? `<img class="pl-thumb lg" ${picAttrs(it.img)} alt="">` : ''}<div class="pl-place-body"><div class="sheet-title">${esc(it.name)}</div>${it.addr ? `<p class="desc">${esc(it.addr)}</p>` : ''}</div></div>
    ${C.hasLL(it) ? `<div class="pl-place-acts">${(ST.apps = mapApps(it, null)).map((x, i) => `<button type="button" class="chip" data-act="map-app" data-i="${i}">${esc(tr(x[0]))}</button>`).join('')}</div>` : ''}
    <div class="field"><label for="pl-i-name">${esc(tr('이름'))}</label><input id="pl-i-name" maxlength="60" value="${esc(it.name)}"></div>
    <div class="pl-flabel">${esc(tr('날짜'))}</div><div class="chips small" id="pl-i-day">${days.map((d, i) => `<button type="button" class="chip ${it.day === d ? 'active' : ''}" data-v="${d}">${esc(tr('{n}일차', { n: i + 1 }))}</button>`).join('')}<button type="button" class="chip ${!it.day ? 'active' : ''}" data-v="">${esc(tr('가고 싶은 곳'))}</button></div>
    <div class="pl-flabel">${esc(tr('도착 시각(정해졌을 때만)'))}</div><div class="field"><input id="pl-i-time" type="time" value="${esc(it.time || '')}"></div>
    <div class="pl-flabel">${esc(tr('머무는 시간'))}</div><div class="chips small" id="pl-i-stay">${[30, 60, 90, 120, 180, 240].map(m => `<button type="button" class="chip ${(Number.isFinite(it.stay) ? it.stay : C.STAY_DEFAULT) === m ? 'active' : ''}" data-v="${m}">${esc(durText(m))}</button>`).join('')}</div>
    <div class="pl-flabel">${esc(tr('메모'))}</div><div class="field"><textarea id="pl-i-memo" rows="2" maxlength="300">${esc(it.memo || '')}</textarea></div>
    ${pr ? `<div class="pl-flabel">${esc(tr('다음 일정까지 이동'))}</div><button type="button" class="pl-legrow ${lg && lg.chosen ? 'set' : ''}" data-act="item-leg" data-id="${esc(id)}"><i class="pl-leg-ic">${legIcon(lg)}</i><span class="pl-legrow-t">${esc(lg ? legText(lg) : tr('이동 수단 정하기'))}</span><span class="pl-legrow-s">→ ${esc(pr[1].name)}</span><span class="chev"></span></button>` : ''}
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="item-done" data-id="${esc(id)}">${esc(it.done ? tr('방문 취소') : tr('방문 완료'))}</button><button type="button" class="btn primary" data-act="item-save" data-id="${esc(id)}">${esc(tr('저장'))}</button></div>
    <button type="button" class="pl-link-danger" data-act="item-del" data-id="${esc(id)}">${esc(tr('일정에서 빼기'))}</button>`, () => { chipGroup('#pl-i-day'); chipGroup('#pl-i-stay'); });
}
ACT.item = (d) => itemSheet(d.id);
/** 시트에 적은 것을 일정에 옮긴다. 이름이 비면 false. quiet: 바뀐 것이 없으면 건드리지 않는다(쓸데없이 서버에 올리지 않게) → 바뀌었으면 'changed' */
function readItemForm(t, it, quiet) {
  const name = $('#pl-i-name').value.trim(); if (!name) { toast(tr('이름을 적어 주세요.')); return false; }
  const day = chipVal('#pl-i-day') || null; const stay = +chipVal('#pl-i-stay') || (Number.isFinite(it.stay) ? it.stay : C.STAY_DEFAULT);   // 고르는 칸에 없는 시간(예: 70분)은 누르지 않으면 그대로 둔다(전에는 저장할 때 1시간으로 바뀌었다)
  const time = $('#pl-i-time').value || '', memo = $('#pl-i-memo').value.trim();
  if (quiet && name === it.name && day === (it.day || null) && time === (it.time || '') && stay === (Number.isFinite(it.stay) ? it.stay : C.STAY_DEFAULT) && memo === (it.memo || '')) return true;
  if ((it.day || null) !== day) { const last = C.dayItems(t, day).pop(); it.day = day; it.sort = C.midKey(last ? last.sort : '', ''); }
  it.name = name; it.time = time; it.stay = stay; it.memo = memo;
  C.touch(it); return 'changed';
}
ACT['item-save'] = (d) => {
  const t = trip(); const it = t.items.find(x => x.id === d.id); if (!it || !readItemForm(t, it)) return;
  persist(t); closeSheet(); renderScreen();
};
ACT['item-leg'] = (d) => {   // 시트의 '다음 일정까지 이동': 적던 것은 저장해 두고 구간 시트로 넘어간다
  const t = trip(); const it = t.items.find(x => x.id === d.id); if (!it) return; const r = readItemForm(t, it, true); if (!r) return;
  if (r === 'changed') { persist(t); renderScreen(); }
  if (legPair(d.id)) ACT.leg(d); else closeSheet();   // 날짜를 옮겨 다음 일정이 없어졌으면 닫는다
};
ACT['item-done'] = (d) => { const t = trip(); const it = t.items.find(x => x.id === d.id); if (!it) return; it.done = !it.done; it.auto = false; C.touch(it); persist(t); closeSheet(); renderScreen(); };
ACT['item-del'] = (d) => { const t = trip(); const it = t.items.find(x => x.id === d.id); if (!it) return; it.del = true; C.touch(it);
  if (it.wayId) { const b = t.bookings.find(x => x.id === it.wayId); if (b) { b.noEnd = Object.assign({}, b.noEnd, { [it.wayEnd === 'from' ? 'from' : 'to']: 1 }); C.touch(b); } }   // 직접 뺀 시작·끝은 다시 넣지 않는다
  persist(t); closeSheet(); renderScreen(); toast(tr('일정에서 뺐어요.')); };
ACT['item-map'] = (d) => { const it = trip().items.find(x => x.id === d.id); if (it) mapAppSheet(it, null); };

// 이동 한 구간
function legPair(id) { const t = trip(); const it = t && t.items.find(x => x.id === id && !x.del); if (!it || !it.day) return null; const items = C.dayItems(t, it.day); const i = items.findIndex(x => x.id === id); return i >= 0 && i + 1 < items.length ? [items[i], items[i + 1]] : null; }   // 그 일정과 같은 날의 다음 일정
// 구간(장소 → 다음 장소): 이동 수단 · 걸리는 시간 · 요금 · 메모를 고른다. 수단을 고르면 그 수단으로 시간을 어림한다
ACT.leg = (d) => {
  const t = trip(); const pr = legPair(d.id); if (!pr) return; const [a, b] = pr; const L = C.legOf(a, b) || {};
  LEG = { id: a.id, to: b.id, mode: L.mode || '' };
  sheet(`<div class="sheet-title">${esc(a.name)} → ${esc(b.name)}</div>
    <div class="pl-flabel">${esc(tr('어떻게 이동하나요?'))}</div>
    <div class="chips small pl-moves" id="pl-leg-mode"><button type="button" class="chip ${!LEG.mode ? 'active' : ''}" data-v="">${esc(tr('정하지 않음'))}</button>${MOVES.map(([k, n]) => `<button type="button" class="chip ${LEG.mode === k ? 'active' : ''}" data-v="${k}">${MOVE_ICON[k]}${esc(tr(n))}</button>`).join('')}</div>
    <p class="pl-conv" id="pl-leg-est"></p>
    <div class="pl-date-row"><div class="field"><label for="pl-leg-min">${esc(tr('걸리는 시간(분)'))}</label><input id="pl-leg-min" inputmode="numeric" autocomplete="off" value="${L.min > 0 ? L.min : ''}"></div>
      <div class="field"><label for="pl-leg-cost">${esc(tr('요금 ({c})', { c: t.cur }))}</label><input id="pl-leg-cost" inputmode="decimal" autocomplete="off" value="${L.cost && L.cost.amt > 0 ? L.cost.amt : ''}"></div></div>
    <div class="field"><input id="pl-leg-memo" maxlength="80" autocomplete="off" placeholder="${esc(tr('메모(예: 3번 승강장, 30분마다)'))}" value="${esc(L.memo || '')}"></div>
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="leg-clear">${esc(tr('지우기'))}</button><button type="button" class="btn primary" data-act="leg-save">${esc(tr('저장'))}</button></div>
    ${C.hasLL(a) && C.hasLL(b) ? `<button type="button" class="pl-link" data-act="route" data-id="${esc(a.id)}">${esc(tr('지도 앱에서 길찾기'))}</button>` : ''}
    <button type="button" class="pl-link" data-act="leg-exp">${esc(tr('이 요금을 경비에 적기'))}</button>`, () => {
    const paint = () => {
      const e = C.legEstimate(a, b, LEG.mode || undefined); $('#pl-leg-min').placeholder = e ? e.min : '';
      $('#pl-leg-est').textContent = e ? tr('직선거리 {d} 기준으로 약 {t}이에요. 실제 시간을 알면 아래에 적어 주세요.', { d: kmText(e.km), t: durText(e.min) }) : tr('위치를 모르는 곳이 있어 시간을 어림하지 못했어요. 아래에 직접 적을 수 있어요.');
      LEG.gmin = 0; const mode = LEG.mode;   // 고른 수단의 실제 이동 시간(구글 경로)이 있으면 그것으로 바꿔 보여 준다
      if (e && ROUTE_OK.has(mode)) routeTime(a, b, mode).then((r) => {
        if (!r || !LEG || LEG.id !== a.id || LEG.mode !== mode || sheetEl().hidden || !$('#pl-leg-est')) return;
        LEG.gmin = r.min; $('#pl-leg-min').placeholder = r.min;
        $('#pl-leg-est').textContent = tr('구글 지도 기준 약 {t}({d})이에요. 다르면 아래에 고쳐 적어 주세요.', { t: durText(r.min), d: kmText(r.km || e.km) });
      });
    };
    chipGroup('#pl-leg-mode', (v) => { LEG.mode = v || ''; paint(); }); paint();
  });
};
function legRead() {
  const t = trip(); const it = t && LEG ? t.items.find(x => x.id === LEG.id) : null; if (!it) return null;
  const min = num($('#pl-leg-min').value), cost = num($('#pl-leg-cost').value), memo = $('#pl-leg-memo').value.trim(); const L = { to: LEG.to };
  if (LEG.mode) L.mode = LEG.mode; if (min > 0) L.min = Math.round(min); else if (LEG.mode && LEG.gmin > 0) { L.min = LEG.gmin; L.g = 1; }   // 시간을 안 적었으면 구글 경로의 시간을 저장한다
  if (cost > 0) L.cost = { amt: cost, cur: t.cur }; if (memo) L.memo = memo;
  return { t, it, L, any: !!(L.mode || L.min || L.cost || L.memo) };
}
function legWrite(r) { if (r.any) r.it.leg = r.L; else delete r.it.leg; delete r.it.legMin; C.touch(r.it); persist(r.t); }
ACT['leg-save'] = () => { const r = legRead(); if (!r) return; legWrite(r); closeSheet(); renderScreen(); };
ACT['leg-clear'] = () => { const t = trip(); const it = t && LEG ? t.items.find(x => x.id === LEG.id) : null; if (!it) return; delete it.leg; delete it.legMin; C.touch(it); persist(t); closeSheet(); renderScreen(); };
ACT['leg-exp'] = () => {   // 구간 요금을 지출로: 구간을 저장하고 지출 시트를 금액·분류(교통)·메모를 채워 연다
  const r = legRead(); if (!r) return; if (!(r.L.cost && r.L.cost.amt > 0)) { toast(tr('요금을 먼저 적어 주세요.')); return; }
  legWrite(r); const nx = r.t.items.find(x => x.id === LEG.to); renderScreen();
  const preset = { amt: String(r.L.cost.amt), cat: 'move', memo: (r.it.name + ' → ' + (nx ? nx.name : '')).slice(0, 60) }; if (r.it.day) preset.day = r.it.day;
  expSheet(null, preset);
};
ACT.route = (d) => { const pr = legPair(d.id); if (!pr) return; const L = C.legOf(pr[0], pr[1]); mapAppSheet(pr[0], pr[1], LEG && LEG.id === pr[0].id && !sheetEl().hidden ? LEG.mode : (L && L.mode) || ''); };
// 길찾기는 지도 앱에 넘긴다. 나라에 따라 여는 앱이 다르다(한국: 카카오맵, 중국 본토: 가오더 지도)
// 지도 앱: 나라에 맞는 앱을 앞에 둔다(한국 카카오맵·네이버 지도, 중국 가오더 지도, 그 밖 구글 지도. 아이폰이면 애플 지도도). 누르면 그 앱이 바로 열린다
const tripCC = () => { const t = trip(); return (t && t.dests && (t.dests.find(x => x.cc) || {}).cc) || ''; };
const encName = (v) => encodeURIComponent(String(v || '').replace(/[,/]/g, ' '));
function mapApps(a, b, mode) {
  const cc = tripCC(); const enc = encName; const ios = H && H.platform === 'ios';
  const gm = { walk: 'walking', taxi: 'driving', car: 'driving' }[mode] || 'transit', am = { walk: 'w', taxi: 'd', car: 'd' }[mode] || 'r';   // 고른 이동 수단에 맞춘 길찾기
  const G = ['구글 지도', b ? `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}&travelmode=${gm}` : `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lon}`];
  const A = ['애플 지도', b ? `https://maps.apple.com/?saddr=${a.lat},${a.lon}&daddr=${b.lat},${b.lon}&dirflg=${am}` : `https://maps.apple.com/?ll=${a.lat},${a.lon}&q=${enc(a.name)}`];
  const K = ['카카오맵', b ? `https://map.kakao.com/link/from/${enc(a.name)},${a.lat},${a.lon}/to/${enc(b.name)},${b.lat},${b.lon}` : `https://map.kakao.com/link/map/${enc(a.name)},${a.lat},${a.lon}`];
  const N = ['네이버 지도', `https://map.naver.com/p/search/${enc(b ? b.name : a.name)}`];
  const M = ['가오더 지도', b ? `https://uri.amap.com/navigation?from=${a.lon},${a.lat},${enc(a.name)}&to=${b.lon},${b.lat},${enc(b.name)}&mode=bus&coordinate=wgs84&callnative=1` : `https://uri.amap.com/marker?position=${a.lon},${a.lat}&name=${enc(a.name)}&coordinate=wgs84&callnative=1`];
  const list = cc === 'KR' ? [K, N, G] : cc === 'CN' ? [M, G] : [G];
  if (ios) list.splice(cc === 'CN' ? 0 : cc === 'KR' ? 2 : 1, 0, A);
  return list;
}
// 고른 날의 장소들을 지도 앱에서 한 번에: 구글은 들르는 곳을 모두 넣은 길찾기(최대 9곳 경유), 나머지는 첫 곳 → 마지막 곳. 장소가 하나면 그곳, 없으면 여행지
// 이름으로 찾기(좌표를 모르는 곳 · 여행지 자체): 나라에 맞는 지도 앱 목록
function nameApps(name, ll) {
  const q = encName(name); const cc = tripCC(); const ios = H && H.platform === 'ios';
  const G = ['구글 지도', ll ? `https://www.google.com/maps/search/?api=1&query=${ll.lat},${ll.lon}` : `https://www.google.com/maps/search/?api=1&query=${q}`];
  const list = cc === 'KR' ? [['카카오맵', `https://map.kakao.com/link/search/${q}`], ['네이버 지도', `https://map.naver.com/p/search/${q}`], G] : cc === 'CN' ? [['가오더 지도', `https://uri.amap.com/search?keyword=${q}&callnative=1`], G] : [G];
  if (ios) list.splice(cc === 'CN' ? 0 : cc === 'KR' ? 2 : 1, 0, ['애플 지도', ll ? `https://maps.apple.com/?ll=${ll.lat},${ll.lon}&q=${q}` : `https://maps.apple.com/?q=${q}`]);
  return list;
}
const appUrl = (list, name) => (list.find(x => x[0] === name) || list[0] || [])[1] || '';
// 지금 보는 날(또는 전체 · 가고 싶은 곳)의 장소
function viewPlaces(t) {
  const days = ST.day === 'all' ? C.tripDays(t) : [ST.day === undefined ? null : ST.day];
  return days.reduce((a, d) => a.concat(C.dayItems(t, d)), []).filter(i => i.kind !== 'note');
}
function dayApps(t) {   // 지도 아래 '지도 앱으로 보기'에 놓을 앱
  const dest = (t.dests || []).find(C.hasLL) || (t.dests || [])[0] || null; const first = viewPlaces(t)[0];
  return first ? nameApps(first.name, null) : dest ? nameApps(dest.name, C.hasLL(dest) ? dest : null) : [];
}
function dayAppsHtml(t) {
  const apps = dayApps(t); ST.dayApps = apps; if (!apps.length) return '';
  return `<div class="pl-mapapps"><span>${esc(tr('지도 앱으로 보기'))}</span>${apps.map((x, i) => `<button type="button" class="chip" data-act="day-app" data-i="${i}">${esc(tr(x[0]))}</button>`).join('')}</div>`;
}
// 한 길에 경유지로 묶지 않는다. 일정에 있는 장소를 하나씩, 장소 사이의 길찾기도 하나씩 연다
ACT['day-app'] = (d) => {
  const t = trip(); const x = ST.dayApps && ST.dayApps[+d.i]; if (!t || !x) return;
  const places = viewPlaces(t); if (!places.length) { if (H.openExternal) H.openExternal(x[1], true); return; }   // 일정이 비어 있으면 여행지를 연다
  const app = x[0]; const links = []; const link = (u) => { links.push(u); return links.length - 1; };
  const days = C.tripDays(t); const oneDay = ST.day !== 'all' && ST.day != null; let h = '', no = 0, prev;
  places.forEach((it, i) => {
    if (ST.day === 'all' && it.day !== prev) { prev = it.day; no = 0; h += `<li class="pl-applist-day">${esc(tr('{n}일차', { n: days.indexOf(it.day) + 1 }))} · ${esc(longDay(it.day))}</li>`; }
    const ic = itemIcon(t, it); if (!ic) no++;
    const num = ST.day == null ? '<span class="pl-num wish"></span>' : `<span class="pl-num ${ic ? 'ic' : ''}" style="background:${it.stayId ? STAY_COLOR : it.wayId ? WAY_COLOR : dayColor(Math.max(0, days.indexOf(it.day)))}">${ic || no}</span>`;
    const u = C.hasLL(it) ? appUrl(mapApps(it, null), app) : appUrl(nameApps(it.name, null), app);
    h += `<li class="row tap" data-act="app-open" data-i="${link(u)}">${num}<div class="row-body"><div class="row-title">${esc(it.name)}</div>${it.addr ? `<div class="row-desc">${esc(it.addr)}</div>` : ''}</div><span class="chev"></span></li>`;
    const nx = places[i + 1];
    if (oneDay && nx && C.hasLL(it) && C.hasLL(nx)) {
      const L = C.legOf(it, nx); const mode = (L && L.mode) || '';
      h += `<li class="row tap pl-applist-leg" data-act="app-open" data-i="${link(appUrl(mapApps(it, nx, mode), app))}"><span class="pl-leg-ic">${MOVE_ICON[mode] || MOVE_ICON.auto}</span><div class="row-body"><div class="row-desc">${esc(tr('다음 장소까지 길찾기'))}${mode ? ' · ' + esc(moveName(mode)) : ''}</div></div><span class="chev"></span></li>`;
    }
  });
  ST.appLinks = links;
  sheet(`<div class="sheet-title">${esc(tr('{app}에서 하나씩 열기', { app: tr(app) }))}</div><p class="desc">${esc(tr('장소를 누르면 그 장소가, 사이의 줄을 누르면 두 곳 사이 길찾기가 지도 앱에서 열려요.'))}</p>
    <ul class="rows pl-applist">${h}</ul><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['app-open'] = (d) => { const u = ST.appLinks && ST.appLinks[+d.i]; if (u && H.openExternal) H.openExternal(u, true); };   // 시트는 그대로 둔다(돌아와서 다음 곳을 이어서 연다)
function mapAppSheet(a, b, mode) {
  const apps = mapApps(a, b, mode); ST.apps = apps;
  sheet(`<div class="sheet-title">${esc(b ? tr('어느 지도 앱으로 길을 찾을까요?') : tr('어느 지도 앱으로 볼까요?'))}</div><p class="desc">${esc(b ? a.name + ' → ' + b.name : a.name)}</p>
    <ul class="rows">${apps.map((x, i) => `<li class="row tap" data-act="map-app" data-i="${i}"><div class="row-body"><div class="row-title">${esc(tr(x[0]))}</div></div><span class="chev"></span></li>`).join('')}</ul><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
}
ACT['map-app'] = (d) => { const x = ST.apps && ST.apps[+d.i]; closeSheet(); if (x && H.openExternal) H.openExternal(x[1], true); };   // 지도 앱으로 바로 넘긴다

// ---------- 장소 추가 ----------
// 입력하는 동안 바로 찾는다: 기기 안의 도시 목록(즉시) + 서버 /places/suggest(국내 카카오, 해외 위키백과 — 사진이 같이 온다).
// 가게·주소처럼 거기 없는 곳은 '더 찾아보기'(/places/search, 오픈스트리트맵)로 넓힌다. 그래도 없으면 이름만 적거나 지도에서 찍는다.
ACT.add = () => { ST.search = newSearch(); show('add', { day: ST.day === 'all' ? null : ST.day }); loadReco(trip()); };
// 국내 여행은 입력하기 전에 그 여행지의 가볼 만한 곳(서버 /places/spots, 한국관광공사)을 사진과 함께 보여 준다
const RECO = new Map();
const recoDest = (t) => (t && (t.dests || []).find(x => x.cc === 'KR' && x.name)) || null;
const recoOf = (t) => { const d = recoDest(t); return (d && RECO.get(d.name)) || []; };
async function loadReco(t) {
  const d = recoDest(t); if (!d || RECO.has(d.name) || !H || !H.api) return;
  RECO.set(d.name, []);
  try {
    const j = await H.api('GET', '/places/spots?cc=KR&lang=' + encodeURIComponent(LANG()) + '&q=' + encodeURIComponent(d.name)); const ssl = (u) => String(u || '').replace(/^http:/, 'https:');
    RECO.set(d.name, ((j && j.items) || []).filter(x => x && x.title && C.hasLL(x)).map(x => ({ name: x.title, addr: x.addr || '', lat: x.lat, lon: x.lon, img: ssl(x.thumb || x.image), src: 'tour' })));
    const top = ST.stack[ST.stack.length - 1]; if (top && top.name === 'add' && !ST.search.q.trim() && recoOf(trip()).length) paintResults();
  } catch (e) { RECO.delete(d.name); }
}
const topDay = () => { const top = ST.stack[ST.stack.length - 1]; return top && top.p ? top.p.day || null : null; };
function placeQs(q) {
  const t = trip(); const ctr = tripCenter(t); const cc = ((t.dests || []).find(x => x.cc) || {}).cc || '';
  const qs = new URLSearchParams({ q, lang: LANG() });
  if (ctr) { qs.set('lat', ctr[0].toFixed(4)); qs.set('lon', ctr[1].toFixed(4)); }
  if (cc) qs.set('cc', cc);
  qs.set('st', gsess());
  return qs.toString();
}
const cityRows = (q) => destSearch(q).slice(0, 3).map(x => ({ name: x.name, addr: regionName(x.cc), lat: x.lat, lon: x.lon, src: 'city' }));
const jamoTail = (q) => /[ㄱ-ㆎ]$/.test(q);   // 한글을 치는 중(낱자만 있는 상태)에는 서버를 부르지 않는다
const llKey = (x) => x.name + '|' + (x.pid || (+x.lat).toFixed(3) + ',' + (+x.lon).toFixed(3));
// 구글 후보는 좌표 없이 장소 번호(pid)만 온다 → 고른 뒤 서버에서 위치·주소(명소면 사진도)를 받는다. 검색 한 묶음(세션)은 위치를 받으면 끝난다
const gsess = () => ST.gsess || (ST.gsess = String(C.uid()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'session0');
async function resolvePlace(x) {
  if (C.hasLL(x)) return true; if (!x || !x.pid) return false;
  try {
    const j = await H.api('GET', '/places/detail?' + new URLSearchParams({ id: x.pid, st: gsess(), lang: LANG(), name: x.name || '', kind: x.kind || '' }).toString()); ST.gsess = null;
    if (!j || !Number.isFinite(+j.lat) || !Number.isFinite(+j.lon)) return false;
    x.lat = +j.lat; x.lon = +j.lon; if (j.addr) x.addr = j.addr; if (hasImg(j)) x.img = j.img; return true;
  } catch (e) { log('place detail failed: ' + (e && (e.code || e.message))); return false; }
}
// 두 곳 사이의 실제 이동 시간(서버가 구글 경로로 잰다). 없으면 null → 어림값을 그대로 쓴다
const ROUTE_OK = new Set(['walk', 'subway', 'bus', 'train', 'taxi', 'car']), ROUTES = new Map();
async function routeTime(a, b, mode) {
  const p5 = (v) => (+v).toFixed(5); const k = [mode, p5(a.lat), p5(a.lon), p5(b.lat), p5(b.lon)].join(',');
  if (ROUTES.has(k)) return ROUTES.get(k);
  try {
    const j = await H.api('GET', '/routes/time?' + new URLSearchParams({ from: p5(a.lat) + ',' + p5(a.lon), to: p5(b.lat) + ',' + p5(b.lon), mode }).toString());
    const out = j && j.ok && j.min > 0 ? { min: Math.round(j.min), km: +j.km || 0 } : null; ROUTES.set(k, out); return out;
  } catch (e) { return null; }
}
// 지도 만들기: 구글 지도를 쓸 수 있으면 구글 지도, 아니면(키 없음·오프라인·불러오는 중·인증 실패) 자체 지도. 구글 지도가 늦게 준비되면 그때 바꿔 끼운다
function makeMap(cv, setup, slot) {
  const G = root.PlannerGMap; const canG = !!(G && G.on());
  const build = (useG) => {
    const m = useG ? G.create(cv) : root.PlannerMap(cv, tileStyle()); setup(m); log('map: ' + (useG ? 'google' : 'canvas') + ' (' + cv.id + ')');
    if (useG) m.on('fail', () => { log('map: google failed → canvas'); if (slot.get() === m) { m.destroy(); slot.set(build(false)); } });
    return m;
  };
  const first = build(canG && G.loaded()); slot.set(first);
  if (canG && !G.loaded()) G.ready().then((ok) => { if (ok && slot.get() === first && cv.isConnected) { first.destroy(); slot.set(build(true)); } });
}
function resRow(x, k, i) {
  const s = ST.search; const on = !!s.added[k + i]; const c = tripCenter(trip()); const km = c && C.hasLL(x) ? C.hav(c[0], c[1], +x.lat, +x.lon) : null;
  const sub = [x.addr, km != null && km >= 0.1 && x.src !== 'city' ? kmText(km) : ''].filter(Boolean).join(' · ');
  return `<li class="row tap pl-rrow ${on ? 'on' : ''}" data-act="add-result" data-k="${k}" data-i="${i}">${thumb(x)}<div class="row-body"><div class="row-title">${esc(x.name)}</div>${sub ? `<div class="row-desc">${esc(sub)}</div>` : ''}</div><span class="pl-plus" aria-label="${esc(on ? tr('담음') : tr('담기'))}">${on ? CHECK_SVG : PLUS_SVG}</span></li>`;
}
function waysHtml(q) {
  const m = ST.search.more; let h = '<ul class="rows pl-ways">';
  if (q) {
    if (!m) h += `<li class="row tap" data-act="search-more"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-title">${esc(tr('‘{q}’ 더 찾아보기', { q }))}</div><div class="row-desc">${esc(tr('가게나 주소까지 넓혀서 찾아요.'))}</div></div></li>`;
    else if (m.state === 'loading') h += `<li class="row"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-desc">${esc(tr('찾는 중…'))}</div></div></li>`;
    else if (m.state === 'error') h += `<li class="row"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-desc">${esc(tr('검색 서버에 연결하지 못했어요. 지도에서 직접 찍거나 이름만 적어 둘 수 있어요.'))}</div></div></li>`;
    else if (!m.items.length) h += `<li class="row"><span class="pl-thumb ic">${SEARCH_SVG}</span><div class="row-body"><div class="row-desc">${esc(tr('더 찾은 곳이 없어요.'))}</div></div></li>`;
    h += `<li class="row tap" data-act="add-name"><span class="pl-thumb ic">${PEN_SVG}</span><div class="row-body"><div class="row-title">${esc(tr('‘{q}’ 이름만 적어 두기', { q }))}</div><div class="row-desc">${esc(tr('위치는 정하지 않고 할 일처럼 적어 둬요.'))}</div></div></li>`;
  }
  return h + `<li class="row tap" data-act="pick"><span class="pl-thumb ic">${PIN_SVG}</span><div class="row-body"><div class="row-title">${esc(tr('지도에서 직접 찍기'))}</div><div class="row-desc">${esc(tr('검색에 없는 곳도 지도에서 자리를 골라 담을 수 있어요.'))}</div></div><span class="chev"></span></li></ul>`;
}
function resultsHtml() {
  const s = ST.search; const t = trip(); const q = s.q.trim(); const day = topDay(); let h = '';
  if (!q) {   // 입력 전: 가고 싶은 곳에 모아 둔 것을 이 날로 가져올 수 있다
    const wish = day ? C.dayItems(t, null).filter(i => i.kind !== 'note') : [];
    if (wish.length) h += `<div class="pl-sub-title">${esc(tr('가고 싶은 곳에서 가져오기'))}</div><ul class="rows pl-res">${wish.slice(0, 12).map(it => `<li class="row tap pl-rrow" data-act="wish-move" data-id="${esc(it.id)}">${thumb(it)}<div class="row-body"><div class="row-title">${esc(it.name)}</div>${it.addr ? `<div class="row-desc">${esc(it.addr)}</div>` : ''}</div><span class="pl-plus">${PLUS_SVG}</span></li>`).join('')}</ul>`;
    const reco = recoOf(t);
    if (reco.length) h += `<div class="pl-sub-title">${esc(tr('{d} 가볼 만한 곳', { d: recoDest(t).name }))}</div><ul class="rows pl-res">${reco.map((x, i) => resRow(x, 'r', i)).join('')}</ul><p class="caption">${esc(tr('한국관광공사'))}</p>`;
    if (!wish.length && !reco.length) h += `<p class="pl-hint">${esc(tr('이름을 입력하면 바로 찾아 드려요.'))}</p>`;
    return h + waysHtml('');
  }
  const more = s.more && s.more.items.length ? s.more.items : [];
  const list = s.items.map((x, i) => resRow(x, 's', i)).join('') + more.map((x, i) => resRow(x, 'm', i)).join('') + s.local.map((x, i) => resRow(x, 'l', i)).join('');
  if (list) h += `<ul class="rows pl-res">${list}</ul>`;
  else if (s.state === 'loading') h += `<p class="pl-hint">${esc(tr('찾는 중…'))}</p>`;
  else if (s.state === 'done' && !(s.more && s.more.state === 'done')) h += `<p class="pl-hint">${esc(tr('바로 나오는 곳이 없어요. 아래에서 더 찾아보세요.'))}</p>`;
  const attr = [s.items.length ? s.attr : '', more.length ? s.more.attr : ''].filter(Boolean).join(' · ');
  if (attr) h += `<p class="caption">${esc(attr)}</p>`;
  return h + waysHtml(q);
}
const addCta = () => (ST.search.count > 0 ? `<button type="button" class="btn primary" data-act="back">${esc(tr('{n}곳 담았어요 · 일정 보기', { n: ST.search.count }))}</button>` : '');
function paintResults() { const box = $('#pl-results'); if (box) box.innerHTML = resultsHtml(); const cta = $('#pl-screen .pl-cta'); if (cta) cta.innerHTML = addCta(); }
SCREENS.add = (p) => {
  const t = trip(); const where = p.day ? tr('{n}일차', { n: dayNo(t, p.day) }) : tr('가고 싶은 곳'); const s = ST.search;
  const html = `<div class="pl-search"><span class="pl-search-ic">${SEARCH_SVG}</span><input id="pl-q" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${esc(tr('어디에 가고 싶으세요?'))}" value="${esc(s.q)}"><button type="button" class="pl-search-x" data-act="q-clear" aria-label="${esc(tr('입력 지우기'))}" ${s.q ? '' : 'hidden'}>${CLOSE_SVG}</button></div>
    <p class="pl-sum pl-add-where">${esc(tr('{d}에 담아요.', { d: where }))}</p><div id="pl-results">${resultsHtml()}</div>`;
  return { title: tr('장소 추가'), html, cta: addCta(), after: () => {
    const inp = $('#pl-q'); inp.addEventListener('input', onType);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); ACT['search-more'](); } });
    if (!s.q) { try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  } };
};
function onType() {
  const inp = $('#pl-q'); const s = ST.search; if (!inp) return;
  s.q = inp.value; s.more = null; const x = $('.pl-search-x'); if (x) x.hidden = !s.q;
  const q = s.q.trim(); clearTimeout(typeT); s.seq++;
  if (q.length < 2) { s.items = []; s.local = []; s.added = {}; s.attr = ''; s.state = 'idle'; paintResults(); return; }
  const local = cityRows(q); if (local.map(llKey).join() !== s.local.map(llKey).join()) { s.local = local; for (const k of Object.keys(s.added)) if (k[0] === 'l') delete s.added[k]; }
  if (jamoTail(q)) { paintResults(); return; }
  s.state = 'loading'; paintResults();
  typeT = setTimeout(() => suggest(q), 260);
}
async function suggest(q) {
  const s = ST.search; const seq = s.seq; let items = [], attr = '', state = 'done';
  try { const j = await H.api('GET', '/places/suggest?' + placeQs(q)); items = (j && j.items) || []; attr = (j && j.attribution) || ''; }
  catch (e) { state = 'error'; log('suggest failed: ' + (e && (e.code || e.message))); }
  if (seq !== s.seq) return;   // 그사이 더 입력했다
  for (const k of Object.keys(s.added)) if (k[0] !== 'l') delete s.added[k];
  s.items = items; s.attr = attr; s.state = state; paintResults();
}
ACT['q-clear'] = () => { const inp = $('#pl-q'); if (!inp) return; inp.value = ''; onType(); try { inp.focus(); } catch (e) { /* ignore */ } };
ACT['search-more'] = async () => {
  const s = ST.search; const q = s.q.trim(); if (q.length < 2 || (s.more && s.more.state === 'loading')) return;
  clearTimeout(typeT); const seq = s.seq; s.more = { state: 'loading', items: [], attr: '' }; if (s.state === 'loading') s.state = 'done'; paintResults();
  let next;
  try { const j = await H.api('GET', '/places/search?' + placeQs(q)); const have = new Set(s.items.map(llKey)); next = { state: 'done', items: ((j && j.items) || []).filter(x => !have.has(llKey(x))), attr: (j && j.attribution) || '' }; }
  catch (e) { next = { state: 'error', items: [], attr: '' }; log('search failed: ' + (e && (e.code || e.message))); }
  if (seq !== s.seq || !s.more) return;
  s.more = next; paintResults();
};
ACT['add-result'] = async (d) => {
  const s = ST.search; const x = ({ s: s.items, m: s.more ? s.more.items : [], l: s.local, r: recoOf(trip()) }[d.k] || [])[+d.i]; const key = d.k + d.i; if (!x) return;
  const t = trip();
  if (s.added[key]) {   // 한 번 더 누르면 방금 담은 것을 뺀다
    const it = t.items.find(i => i.id === s.added[key]); if (it) { it.del = true; C.touch(it); persist(t); }
    delete s.added[key]; s.count = Math.max(0, s.count - 1); toast(tr('‘{n}’ 뺐어요.', { n: x.name }));
  } else {
    if (s.busy && s.busy[key]) return;   // 위치를 받는 중에 한 번 더 누름
    let ok = true;
    if (!C.hasLL(x) && x.pid) { (s.busy || (s.busy = {}))[key] = 1; ok = await resolvePlace(x); delete s.busy[key]; if (ST.search !== s || trip() !== t) return; }
    const o = { name: x.name, addr: x.addr || '', src: x.src || '' }; if (C.hasLL(x)) { o.lat = +x.lat; o.lon = +x.lon; } if (hasImg(x)) o.img = x.img;
    s.added[key] = addItem(t, topDay(), o).id; s.count++; toast(ok ? tr('‘{n}’ 담았어요.', { n: x.name }) : tr('‘{n}’ 이름만 담았어요. 위치는 불러오지 못했어요.', { n: x.name }));
  }
  paintResults();
};
ACT['wish-move'] = (d) => {
  const t = trip(); const day = topDay(); const it = t.items.find(x => x.id === d.id); if (!it || !day) return;
  const last = C.dayItems(t, day).pop(); it.day = day; it.sort = C.midKey(last ? last.sort : '', ''); C.touch(it); persist(t);
  ST.search.count++; paintResults(); toast(tr('‘{n}’ 담았어요.', { n: it.name }));
};
ACT['add-name'] = () => {
  const s = ST.search; const v = s.q.trim().slice(0, 60); if (!v) return;
  addItem(trip(), topDay(), { name: v }); const n = s.count + 1;
  ST.search = Object.assign(newSearch(), { count: n, seq: s.seq + 1 }); clearTimeout(typeT);
  const inp = $('#pl-q'); if (inp) inp.value = ''; const x = $('.pl-search-x'); if (x) x.hidden = true;
  paintResults(); toast(tr('‘{n}’ 담았어요.', { n: v }));
};
// 지도에서 직접 찍기: 위 검색창으로 지도를 옮긴 뒤 핀 끝을 맞춘다
const PK = { seq: 0, items: [] };
ACT.pick = () => show('pick', { day: topDay() });
SCREENS.pick = (p) => ({ full: true,
  html: `<div class="pl-pick"><header class="sd-top"><button type="button" class="top-btn" data-act="back" aria-label="${esc(tr('뒤로'))}">${BACK_SVG}</button><div class="sd-top-title">${esc(tr('지도에서 자리 고르기'))}</div></header>
    <div class="pl-pick-map"><canvas id="pl-pickmap"></canvas><div class="pl-pin"></div>
      <div class="pl-pick-search"><div class="pl-search"><span class="pl-search-ic">${SEARCH_SVG}</span><input id="pl-pick-q" type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${esc(tr('장소나 도시 이름으로 지도 옮기기'))}"></div><ul class="rows pl-pick-res" id="pl-pick-res" hidden></ul></div>
      <div class="pl-mapbtns"><button type="button" class="pl-mapbtn" data-act="map-zoom" data-v="1" aria-label="${esc(tr('확대'))}">+</button><button type="button" class="pl-mapbtn" data-act="map-zoom" data-v="-1" aria-label="${esc(tr('축소'))}">−</button></div></div>
    <div class="pl-pick-panel"><p class="caption">${esc(tr('지도를 움직여 핀 끝을 원하는 자리에 맞춰 주세요.'))}</p><div class="field"><input id="pl-pick-name" maxlength="60" autocomplete="off" placeholder="${esc(tr('장소 이름'))}"></div><button type="button" class="btn primary" data-act="pick-ok">${esc(tr('여기로 정하기'))}</button></div></div>`,
  after: () => {
    const t = trip(); const cv = $('#pl-pickmap'); if (!cv || !root.PlannerMap) return;
    const near = C.dayItems(t, p.day).filter(C.hasLL).pop() || C.live(t.items).filter(C.hasLL).pop(); const c = near ? [near.lat, near.lon] : tripCenter(t);
    makeMap(cv, (m) => {
      if (c) m.setView(c[0], c[1], near ? 14 : 12);
      m.setData({ markers: C.live(t.items).filter(C.hasLL).map(i => ({ lat: i.lat, lon: i.lon, label: '', color: '#8B95A1' })) });
    }, { get: () => pickMap, set: (m) => { pickMap = m; } });
    PK.items = []; const q = $('#pl-pick-q');
    q.addEventListener('input', () => { const v = q.value.trim(); clearTimeout(pickT); PK.seq++; if (v.length < 2) { paintPick([]); return; } paintPick(cityRows(v)); if (!jamoTail(v)) pickT = setTimeout(() => pickSearch(v, false), 260); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(pickT); PK.seq++; pickSearch(q.value.trim(), true); } });
  } });
async function pickSearch(q, full) {
  if (q.length < 2) return; const seq = PK.seq; const cities = cityRows(q); let items = [];
  try { const j = await H.api('GET', (full ? '/places/search?' : '/places/suggest?') + placeQs(q)); items = ((j && j.items) || []).slice(0, 5); } catch (e) { log('pick search failed: ' + (e && (e.code || e.message))); }
  if (seq !== PK.seq) return;
  paintPick(items.concat(cities));
}
function paintPick(items) {
  PK.items = items; const box = $('#pl-pick-res'); if (!box) return; box.hidden = !items.length;
  box.innerHTML = items.map((x, i) => `<li class="row tap" data-act="pick-go" data-i="${i}">${thumb(x)}<div class="row-body"><div class="row-title">${esc(x.name)}</div>${x.addr ? `<div class="row-desc">${esc(x.addr)}</div>` : ''}</div></li>`).join('');
}
ACT['pick-go'] = async (d) => {
  const x = PK.items[+d.i]; if (!x || !pickMap) return;
  if (!C.hasLL(x) && (!(await resolvePlace(x)) || !pickMap)) { toast(tr('위치를 불러오지 못했어요.')); return; }
  pickMap.setView(+x.lat, +x.lon, x.src === 'city' ? 12 : 16);
  const n = $('#pl-pick-name'); if (n && !n.value.trim() && x.src !== 'city') n.value = x.name;
  const q = $('#pl-pick-q'); if (q) { q.value = ''; q.blur(); } PK.seq++; clearTimeout(pickT); paintPick([]);
};
ACT['pick-ok'] = () => {
  const name = $('#pl-pick-name').value.trim(); if (!name) { toast(tr('장소 이름을 적어 주세요.')); $('#pl-pick-name').focus(); return; }
  if (!pickMap) return; const v = pickMap.view; const top = ST.stack[ST.stack.length - 1];
  addItem(trip(), top.p.day, { name, lat: +v.lat.toFixed(6), lon: +v.lon.toFixed(6), src: 'pin' });
  ST.stack.pop(); ST.stack.pop(); if (ST.stack.length) renderScreen(); else closeScreens();   // 고르기 → 추가 화면을 닫고 일정으로
  toast(tr('‘{n}’ 담았어요.', { n: name }));
};

// ---------- 공유 ----------
// 링크: 서버에 일정만(장소·날짜·시각·메모) 올리고 웹 주소를 보낸다. 받은 사람은 앱 없이 보거나, 앱에서 '내 여행에 담기'로 가져간다. 경비·일기·예약은 올리지 않는다.
function shareDoc(t) {
  const items = [];
  for (const d of C.tripDays(t).concat([null])) { const list = C.dayItems(t, d); for (let i = 0; i < list.length; i++) {
    const it = list[i]; const x = { name: it.name, day: d }; if (C.hasLL(it)) { x.lat = it.lat; x.lon = it.lon; }
    for (const k of ['time', 'memo', 'addr']) if (it[k]) x[k] = it[k];
    if (Number.isFinite(it.stay) && it.stay !== C.STAY_DEFAULT) x.stay = it.stay; if (it.kind === 'note') x.kind = 'note'; if (hasImg(it)) x.img = it.img;
    const L = d && list[i + 1] ? C.legOf(it, list[i + 1]) : null; if (L && (L.mode || L.min > 0)) { x.leg = {}; if (L.mode) x.leg.mode = L.mode; if (L.min > 0) x.leg.min = L.min; }   // 직접 정한 이동
    items.push(x);
  } }
  return { id: t.id, title: t.title || tr('이름 없는 여행'), start: t.start, end: t.end, dests: (t.dests || []).map(d => Object.assign({ name: d.name, cc: d.cc || '' }, C.hasLL(d) ? { lat: d.lat, lon: d.lon } : {})), items };
}
function planText(t) {
  const out = [t.title || tr('이름 없는 여행'), rangeText(t) + ' · ' + nightsText(t)];
  C.tripDays(t).forEach((d, i) => {
    const p = C.dayPlan(t, d); const items = p.items; if (!items.length) return; let no = 0;
    out.push('', tr('{n}일차', { n: i + 1 }) + ' · ' + longDay(d));
    items.forEach((it, k) => {
      const note = it.kind === 'note'; if (!note) no++; out.push((note ? '- ' : no + '. ') + (it.time ? it.time + ' ' : '') + it.name + (it.memo ? ' (' + it.memo + ')' : ''));
      const leg = p.legs[k]; if (leg && (leg.chosen || leg.manual)) out.push('   ↓ ' + legText(leg));   // 직접 정한 이동만 적는다
    });
  });
  const wish = C.dayItems(t, null); if (wish.length) { out.push('', tr('가고 싶은 곳')); for (const it of wish) out.push('- ' + it.name); }
  return out.join('\n');
}
const placeCount = (t) => C.live(t.items).filter(i => i.kind !== 'note').length;
// 공유 시트: 참여자 목록 → 친구 공유(초대 링크로 들어온 친구는 자기 앱에서 같이 보고 고친다) → 링크 공유(앱 없이 웹에서 일정만 보기) → 글로 보내기
function shareSheet(msg) {
  const t = trip(); if (!t) return; const ps = C.people(t); const link = t.share && t.share.code ? t.share : null; const cl = t.cloud || null; const inv = cl && cl.inviteUrl ? cl.inviteUrl : '';
  const role = (p) => (p.id === t.meId ? (cl && !cl.mine ? tr('나') : tr('나 · 여행을 만든 사람')) : p.uid ? (cl && p.uid === cl.owner ? tr('여행을 만든 사람') : tr('앱으로 함께 보는 중')) : tr('이름만 적어 둠'));
  const linkRow = (url, act) => `<div class="pl-linkrow"><span class="pl-linktext">${esc(url)}</span><button type="button" data-act="${act}">${esc(tr('복사'))}</button></div>`;
  sheet(`<div class="sheet-title">${esc(tr('공유'))}</div>
    <div class="section-head"><div class="pl-flabel" style="margin:0">${esc(tr('참여자 {n}명', { n: ps.length }))}</div><button type="button" class="section-more" data-act="people">${esc(tr('고치기'))}</button></div>
    <ul class="rows pl-ppl">${ps.map(p => `<li class="row"><span class="pl-avatar">${esc((pname(t, p) || '?').slice(0, 1))}</span><div class="row-body"><div class="row-title">${esc(p.id === t.meId ? (p.name || tr('나')) : p.name)}</div><div class="row-desc">${esc(role(p))}</div></div></li>`).join('')}</ul>
    <div class="pl-sharebox"><div class="pl-share-title">${esc(tr('친구 공유'))}</div><p class="pl-share-desc">${esc(tr('초대받은 친구는 자기 앱에서 이 여행을 같이 보고 고칠 수 있어요.'))}</p>
      ${inv ? linkRow(inv, 'invite-copy') : ''}<button type="button" class="btn primary" data-act="share-friend">${esc(tr('초대 링크 보내기'))}</button></div>
    <div class="pl-sharebox"><div class="pl-share-title">${esc(tr('링크 공유'))}</div>
      ${link ? `<p class="pl-share-on">${esc(tr('링크 공유가 되어 있습니다.'))}</p>${linkRow(link.url, 'share-copy')}<div class="pl-sheet-acts" style="margin-top:10px"><button type="button" class="btn secondary" data-act="share-off">${esc(tr('링크 끄기'))}</button><button type="button" class="btn primary" data-act="share-send">${esc(tr('보내기'))}</button></div>`
        : `<p class="pl-share-desc">${esc(tr('앱이 없어도 웹에서 일정만 볼 수 있는 링크예요. 경비와 일기는 보이지 않아요.'))}</p><button type="button" class="btn secondary" data-act="share-link">${esc(tr('링크 만들기'))}</button>`}</div>
    <button type="button" class="pl-link" data-act="share-text">${esc(tr('일정을 글로 보내기'))}</button>
    <p class="caption" id="pl-share-msg" style="min-height:18px">${esc(msg || '')}</p><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
}
ACT.share = () => shareSheet();
ACT.who = () => shareSheet();   // 맨 위의 인원수: 누가 함께 가는지는 공유 창에서 본다
const shareMsg = (text) => { const el = $('#pl-share-msg'); if (el) el.textContent = text; else if (text) toast(text); };
async function copyText(v) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(v); return true; } } catch (e) { /* 아래 방법으로 */ }
  try { const ta = document.createElement('textarea'); ta.value = v; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, v.length); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
}
const copyAct = (get) => async () => { const t = trip(); const v = t && get(t); if (!v) return; const ok = await copyText(v); shareMsg(ok ? tr('링크를 복사했어요.') : tr('복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.')); };
ACT['share-copy'] = copyAct(t => t.share && t.share.url);
ACT['invite-copy'] = copyAct(t => t.cloud && t.cloud.inviteUrl);
ACT['share-text'] = () => { const t = trip(); if (!t) return; closeSheet(); if (H.shareText) H.shareText(planText(t), (t.share && t.share.url) || '', t.title); };
ACT['share-send'] = () => { const t = trip(); if (!t || !t.share) return; closeSheet(); if (H.shareText) H.shareText(t.title + '\n' + rangeText(t) + ' · ' + tr('{n}곳', { n: placeCount(t) }), t.share.url, t.title); };
ACT['share-link'] = async () => {
  const t = trip(); if (!t) return;
  if (t.sample) { shareMsg(tr('샘플 여행은 공유할 수 없어요.')); return; }
  if (!loggedIn()) { loginSheet('link'); return; }
  shareMsg(tr('링크를 만드는 중…'));
  try {
    const doc = shareDoc(t); const j = await H.api('POST', '/trips/share', { trip: doc });
    t.share = { code: j.code, url: j.url, sig: JSON.stringify(doc) }; saveQuiet(t); shareSheet();
  } catch (e) {
    log('share failed: ' + (e && (e.code || e.message)));
    if (e && e.status === 401) { loginSheet('link'); return; }
    shareMsg(tr('링크를 만들지 못했어요. 잠시 뒤에 다시 해 주세요.'));
  }
};
ACT['share-off'] = async () => {
  const t = trip(); if (!t || !t.share) return; shareMsg(tr('끄는 중…'));
  try { await H.api('DELETE', '/trips/share/' + encodeURIComponent(t.share.code)); }
  catch (e) { if (!(e && e.status === 404)) { shareMsg(tr('끄지 못했어요. 잠시 뒤에 다시 해 주세요.')); return; } }
  delete t.share; saveQuiet(t); shareSheet(tr('링크 공유를 껐어요.'));
};
// 링크를 켜 둔 여행은 일정을 고치면 잠시 뒤 링크 내용도 새로 올린다(바뀐 게 없으면 올리지 않는다)
const shareTimers = {};
function queueShareSync(t) {
  if (!loggedIn()) return; clearTimeout(shareTimers[t.id]);
  shareTimers[t.id] = setTimeout(async () => {
    if (!t.share || !t.share.code || t.del) return; const doc = shareDoc(t); const sig = JSON.stringify(doc); if (sig === t.share.sig) return;
    try { await H.api('POST', '/trips/share', { trip: doc }); t.share.sig = sig; saveQuiet(t); } catch (e) { log('share sync failed: ' + (e && (e.code || e.message))); }
  }, 4000);
}
// 친구 공유: 여행을 서버에 올리고 초대 링크를 만들어 보낸다
ACT['share-friend'] = async () => {
  const t = trip(); if (!t) return;
  if (t.sample) { shareMsg(tr('샘플 여행은 공유할 수 없어요.')); return; }
  if (!loggedIn()) { loginSheet('friend'); return; }
  shareMsg(tr('초대 링크를 만드는 중…'));
  try {
    await pushTrip(t); const j = await H.api('POST', '/trips/' + encodeURIComponent(t.id) + '/invite');
    t.cloud.invite = j.code; t.cloud.inviteUrl = j.url; saveQuiet(t); closeSheet();
    if (H.shareText) H.shareText(tr('‘{t}’ 여행을 같이 봐요. 링크를 누르면 앱에서 함께 보고 고칠 수 있어요.', { t: t.title }), j.url, t.title);
  } catch (e) {
    log('invite failed: ' + (e && (e.code || e.message)));
    if (e && e.status === 401) { loginSheet('friend'); return; }
    shareMsg(tr('초대 링크를 만들지 못했어요. 잠시 뒤에 다시 해 주세요.'));
  }
};
function loginSheet(next) {
  ST.afterLogin = next || null; const src = $('#battle-out .login-btns');
  sheet(`<div class="sheet-title">${esc(tr('로그인이 필요해요'))}</div><p class="desc">${esc(next === 'link' ? tr('보낸 링크를 나중에 끌 수 있게 계정에 연결해 둬요. 일정만 올라가고 사진과 경비는 올라가지 않아요.') : tr('여행을 서버에 저장하고 친구와 함께 보려면 로그인이 필요해요. 사진은 올라가지 않아요.'))}</p>
    <div class="login-btns" id="pl-login">${src ? src.innerHTML : ''}</div><p class="caption" id="pl-login-msg" style="min-height:18px"></p><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`,
  (body) => { $$('#pl-login .login', body).forEach(b => { b.dataset.act = 'pl-login'; }); });
}
ACT['cloud-login'] = () => loginSheet('sync');
ACT['pl-login'] = async (d) => {
  const msg = $('#pl-login-msg'); if (msg) msg.textContent = tr('로그인 창을 여는 중…');
  const r = H.login ? await H.login(d.provider) : null;
  if (!r || !r.ok) { if (msg) msg.textContent = (r && r.error) || tr('로그인에 실패했어요.'); return; }
  const next = ST.afterLogin; ST.afterLogin = null; closeSheet(); syncAll(true);
  if (next === 'link') { shareSheet(); ACT['share-link'](); } else if (next === 'friend') { shareSheet(); ACT['share-friend'](); } else if (next === 'join') ACT['join-ok'](); else if (next === 'ai') { refreshAi(); } else renderList();
};

// ---------- 서버 저장 · 함께 보기 ----------
// 로그인하면 여행을 서버(/trips)에 저장한다. 기기에 먼저 저장하고 잠시 뒤 올리며, 서버가 기록 단위로 합쳐 돌려준 것을 다시 기기에 반영한다.
// 함께 보는 부분: 제목·날짜·여행지·예산·참여자·일정·예약·경비. 나만 보는 부분: 일기·환전 기록·준비물.
const loggedIn = () => !!(root.Account && root.Account.loggedIn);
const myUid = () => (loggedIn() && root.Account.session ? root.Account.session.uid : null);
const SY = { busy: false, last: 0, timers: {}, err: '' };
const isDirty = (t) => !t.cloud || (t.u || 0) > (t.cloud.pushedU || 0);
function saveQuiet(t) { if (!t.sample) C.Store.put(t).catch(e => log('save failed: ' + (e && e.message))); }
function refreshView() { const top = ST.stack[ST.stack.length - 1]; if (!top) renderList(); else if (top.name === 'trip' && sheetEl().hidden && !ST.edit) renderScreen(); }
let ACCT = null;   // 지금 로그인한 계정 — 로그아웃하거나 다른 계정으로 바뀌면 앞 계정의 여행을 폰에서 내린다(11-19 사용자: "로그아웃해도 여행 일정이 안 사라진다")
function parkTrips(acct, list) {   // 그 계정의 여행(서버에 있는 것)을 화면·폰 목록에서 내린다. 폰에만 있는 파일(일기·지출 사진, 올린 표)은 그 계정 몫으로 남겨 다시 로그인하면 그대로 돌아온다
  const out = list || ST.trips.filter(t => !t.sample && t.cloud && !t.cloud.gone && !t.del);
  if (!out.length) return 0;
  try { const k = KEEP_PRE + acct; const s = new Set(JSON.parse(localStorage.getItem(k) || '[]')); for (const t of out) for (const id of tripFileIds(t)) s.add(id); localStorage.setItem(k, JSON.stringify([...s])); } catch (e) { /* ignore */ }
  if (out.some(t => t.id === (ST.prefs && ST.prefs.mainId))) setMain(null);
  for (const t of out) {   // 서버에 다 올라가 있는 여행은 폰에서 지운다(다시 로그인하면 서버에서 온다). 아직 못 올린 변경이 있으면 지우지 않고 가려만 둔다(park) — 같은 계정으로 다시 로그인하면 돌아와서 올라간다
    clearTimeout(SY.timers[t.id]);
    if (isDirty(t)) { t.park = String(acct); saveQuiet(t); } else C.Store.del(t.id).catch(() => { /* ignore */ });
  }
  ST.trips = ST.trips.filter(t => !out.includes(t)); if (ST.tripId && !ST.trips.some(t => t.id === ST.tripId)) { closeSheet(); closeScreens(); }
  if (!ST.stack.length) renderList(); notifSync(0); return out.length;
}
// 서버 여행의 '지운(나간) 표시'를 폰에서 치운다. 그 표시는 그것을 만든 계정의 것이다 — 다른 계정으로 로그인했는데 같은 여행(예: 손님으로 나갔던 여행의 주인 계정)이
// 서버 목록에 있으면 보여야 한다(11-19 사용자: "구글 로그인 되어 있는데 왜 여행 일정이 사라졌냐", "아이폰에는 있는데 갤럭시에는 없어"). keep: 그 계정이 아직 서버에 못 알린 지우기만 남긴다
function dropTombs(keep) {
  const dead = ST.trips.filter(t => !t.sample && t.del && t.cloud && !(keep != null && !t.cloud.gone && t.cloud.acct != null && String(t.cloud.acct) === String(keep)));
  if (!dead.length) return 0;
  for (const t of dead) { clearTimeout(SY.timers[t.id]); C.Store.del(t.id).catch(() => { /* ignore */ }); }
  ST.trips = ST.trips.filter(t => !dead.includes(t)); return dead.length;
}
// 서버가 보내 준 여행을 폰에 들인다. 폰에 '지운(나간) 표시'로 남아 있던 것이면 그 표시를 버리고 새로 받는다(표시에 남은 예전 계정의 나만 보던 기록을 섞지 않는다)
function takeRemote(r, uid) {
  let t = ST.trips.find(x => x.id === r.id); if (t && t.del) { ST.trips.splice(ST.trips.indexOf(t), 1); t = null; }
  const fresh = !t; if (!t) { t = C.newTrip({ id: r.id }); ST.trips.push(t); }
  const ch = C.applyRemote(t, r, uid); t.cloud.pushedU = t.u; saveQuiet(t); return { t, changed: fresh || ch };
}
function parkForeign() {   // 앱을 켰을 때: 로그아웃 상태인데 서버 여행이 남아 있거나(예전 버전), 다른 계정의 여행이 있으면 내린다
  const uid = myUid(); const by = new Map(); dropTombs(uid);
  for (const t of ST.trips) { if (t.sample || t.del || !t.cloud || t.cloud.gone) continue; const a = t.cloud.acct != null ? String(t.cloud.acct) : (uid == null ? 'old' : null); if (a == null || (uid != null && a === String(uid)) || (a === 'old' && isDirty(t))) continue; if (!by.has(a)) by.set(a, []); by.get(a).push(t); }
  for (const [a, list] of by) parkTrips(a, list);
}
async function beforeLogout() {   // 로그아웃 전에: 못 올린 변경을 올려 보고, 그래도 남은 여행 수를 알려 준다
  if (!loggedIn()) return { dirty: 0 };
  try { await syncAll(true); } catch (e) { /* 아래에서 센다 */ }
  return { dirty: ST.trips.filter(t => !t.sample && !t.del && isDirty(t)).length };
}
// 가려 둔 여행(그 계정이 서버에 못 올린 변경이 있어 폰에 남겨 둔 것)을 되찾는다 — 같은 계정으로 다시 로그인했을 때
async function unpark(uid) {
  if (uid == null) return 0; let all = []; try { all = (await C.Store.all()) || []; } catch (e) { return 0; }
  let n = 0; for (const t of all) { if (t.park == null || String(t.park) !== String(uid) || ST.trips.some(x => x.id === t.id)) continue; delete t.park; ST.trips.push(t); saveQuiet(t); n++; }
  if (n && !ST.stack.length) renderList(); return n;
}
function forgetAccount(acct) {   // 탈퇴: 그 계정 몫으로 남겨 둔 파일과 가려 둔 여행도 지운다
  try { localStorage.removeItem(KEEP_PRE + acct); } catch (e) { /* ignore */ }
  C.Store.all().then((all) => { for (const t of all || []) if (t.park != null && String(t.park) === String(acct)) C.Store.del(t.id).catch(() => { /* ignore */ }); }).catch(() => { /* ignore */ });
  setTimeout(sweepFiles, 500);
}
function gone(t, text) {   // 서버에서 사라진 여행(만든 사람이 지웠거나 내보내졌다): 기기에서도 내린다
  t.del = true; t.cloud = Object.assign(t.cloud || {}, { gone: true }); saveQuiet(t);
  if (ST.tripId === t.id && ST.stack.length) { closeSheet(); closeScreens(); } else if (!ST.stack.length) renderList();
  if (text) toast(text);
}
async function pushTrip(t) {
  if (!loggedIn() || t.sample || t.del) return false;
  const me = personOf(t, t.meId); if (me && !me.name && myName()) { me.name = myName(); C.touch(me); }   // 함께 보는 사람에게 보일 내 이름
  const sentU = t.u || 0; let j;
  try { j = await H.api('PUT', '/trips/' + encodeURIComponent(t.id), { doc: C.pubDoc(t), priv: C.privDoc(t), me: t.meId || null }); }
  catch (e) { if (e && (e.status === 410 || e.status === 403)) { gone(t, e.status === 410 ? tr('이 여행은 만든 사람이 지웠어요.') : tr('이 여행에서 나오게 됐어요.')); return false; } throw e; }
  const again = (t.u || 0) > sentU;   // 올리는 사이에 또 고쳤으면 한 번 더 올린다
  const changed = C.applyRemote(t, j, myUid()); t.cloud.pushedU = again ? sentU : t.u; saveQuiet(t);
  if (again) queueSync(t);
  uploadPhotos(t).catch(() => { /* 다음에 */ });   // 함께 보는 여행이면 아직 안 올린 지출 사진을 올린다
  return changed;
}
function queueSync(t) {
  if (!loggedIn() || t.sample || t.del) return; clearTimeout(SY.timers[t.id]);
  SY.timers[t.id] = setTimeout(() => { pushTrip(t).then((changed) => { SY.err = ''; paintCloud(); if (changed) refreshView(); }).catch(syncFail); }, 2500);
}
function syncFail(e) {
  SY.err = (e && (e.code || e.message)) || 'error'; log('sync failed: ' + SY.err); paintCloud();
  clearTimeout(SY.retry); SY.retry = setTimeout(() => { if (!offline()) syncAll(true); }, 60000);   // 잊지 않고 다시(오프라인이면 'online' 이 올 때)
}
// 이 계정이 이 폰에서 지우고(나가고) 아직 서버에 못 알린 여행인가 — 계정을 모르는 예전 표시나 다른 계정의 표시로는 서버의 여행을 지우지 않는다
const myDelete = (t, uid) => !!(t && t.del && t.cloud && !t.cloud.gone && t.cloud.acct != null && uid != null && String(t.cloud.acct) === String(uid));
async function dropRemote(t) {
  if (!loggedIn() || !t.cloud || t.cloud.gone) return;
  try { await H.api('DELETE', '/trips/' + encodeURIComponent(t.id)); } catch (e) { if (!(e && (e.status === 404 || e.status === 410))) throw e; }
  t.cloud.gone = true; saveQuiet(t);
}
/** 서버와 맞춘다: 서버에만 있는 여행은 받고, 기기에만 있거나 기기에서 고친 여행은 올린다 */
async function syncAll(force) {
  if (!loggedIn() || SY.busy || !ST.ready) return; if (!force && Date.now() - SY.last < 30000) return;
  SY.busy = true; SY.last = Date.now(); paintCloud(); let changed = false;
  try {
    const j = await H.api('GET', '/trips'); const uid = j.uid; const seen = new Set(); const dead = new Set(j.deleted || []);
    for (const r of j.trips || []) {
      seen.add(r.id); let t = ST.trips.find(x => x.id === r.id);
      if (t && t.del) {
        // 폰에는 지운(나간) 표시인데 서버 목록에 있다. 같은 계정으로 방금 지우고 아직 서버에 못 알린 것만 서버에도 지운다(나간다).
        // 그 밖(예전에 나갔거나 내보내졌던 여행에 다시 들어왔다 · 다른 계정으로 나갔던 여행의 주인 계정으로 로그인했다)은 서버가 맞다 → 표시를 버리고 다시 받는다
        if (myDelete(t, uid)) { await dropRemote(t).catch(() => { /* 다음에 */ }); continue; }
        takeRemote(r, uid); changed = true; continue;
      }
      if (!t) { takeRemote(r, uid); changed = true; continue; }
      if (isDirty(t)) { if (await pushTrip(t)) changed = true; }
      else if (t.cloud.rev !== r.rev || JSON.stringify(t.cloud.members || []) !== JSON.stringify(r.members || []) || (t.cloud.invite || null) !== (r.invite || null)) { if (C.applyRemote(t, r, uid)) changed = true; t.cloud.pushedU = t.u; saveQuiet(t); }
    }
    for (const t of ST.trips.slice()) {
      if (t.sample || seen.has(t.id)) continue;
      if (t.del) { if (myDelete(t, uid) && !dead.has(t.id)) await dropRemote(t).catch(() => { /* 다음에 */ }); continue; }   // 다른 계정의 지운 표시로는 서버에 아무것도 하지 않는다
      if (dead.has(t.id)) { gone(t, tr('‘{t}’ 여행은 만든 사람이 지웠어요.', { t: t.title })); changed = true; }
      else if (!t.cloud) { if (await pushTrip(t)) changed = true; changed = true; }
      else { gone(t, tr('‘{t}’ 여행에서 나오게 됐어요.', { t: t.title })); changed = true; }   // 예전에 올렸는데 내 목록에 없다 = 내보내졌다
    }
    SY.err = ''; const me = myUid(); if (me != null) { try { localStorage.removeItem(KEEP_PRE + me); } catch (e) { /* ignore */ } }
    for (const t of ST.trips) if (onCloud(t) && !t.del) uploadPhotos(t).catch(() => { /* 다음에 */ });   // 새로 함께 보게 된 여행에 붙여 둔 사진도
  } catch (e) { SY.err = (e && (e.code || e.message)) || 'error'; log('sync failed: ' + SY.err); }
  SY.busy = false; paintCloud(); if (changed) { refreshView(); notifSync(); }
}
async function pullTrip(t) {   // 함께 보는 여행을 열어 둔 동안 가끔 서버 것을 확인한다
  if (!loggedIn() || !t || !t.cloud || t.del || SY.busy) return;
  try {
    if (isDirty(t)) { if (await pushTrip(t)) refreshView(); return; }
    const j = await H.api('GET', '/trips/' + encodeURIComponent(t.id));
    if (j.rev !== t.cloud.rev || JSON.stringify(j.members || []) !== JSON.stringify(t.cloud.members || [])) { const ch = C.applyRemote(t, j, myUid()); t.cloud.pushedU = t.u; saveQuiet(t); if (ch) refreshView(); }
  } catch (e) { if (e && (e.status === 404 || e.status === 410)) gone(t, e.status === 410 ? tr('이 여행은 만든 사람이 지웠어요.') : tr('이 여행에서 나오게 됐어요.')); }
}
// 여행은 언제나 이 폰에 먼저 저장된다(인터넷이 없어도 만들고 고치고 다시 열 수 있다). 서버에 올리는 것은 연결됐을 때 뒤에서 한다.
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const cloudText = () => (offline() ? tr('오프라인이에요. 이 폰에 저장했고, 연결되면 서버에 올려요.') : SY.err ? tr('이 폰에 저장했어요. 서버에는 연결되면 다시 올려요.') : SY.busy ? tr('서버와 맞추는 중…') : tr('여행이 서버에 저장돼요.'));
function cloudHtml() {
  if (!root.Account) return '';
  if (!loggedIn()) return `<button type="button" class="pl-cloud" data-act="cloud-login"><span class="pl-cloud-ic">${CLOUD_SVG}</span><span class="pl-cloud-txt">${esc(tr('로그인하면 여행이 서버에 저장되고 친구와 함께 볼 수 있어요.'))}</span><span class="pl-people-more">${esc(tr('로그인'))}</span></button>`;
  if (!ST.trips.some(t => !t.del && !t.sample)) return '';
  return `<div class="pl-cloud on" id="pl-cloud"><span class="pl-cloud-ic">${CLOUD_SVG}</span><span class="pl-cloud-txt">${esc(cloudText())}</span></div>`;
}
function paintCloud() { const el = $('#pl-cloud'); if (!el || !loggedIn()) return; const x = $('.pl-cloud-txt', el); if (x) x.textContent = cloudText(); }
// 받은 초대(phototravelmap://join/<코드>): 요약을 보여 주고, 참여자 표에서 내가 누구인지 고른 뒤 들어간다
async function openInvite(code) {
  code = String(code || '').toUpperCase(); if (!code) return;
  if (!ST.ready) { pendingInvite = code; return; }
  try {
    const j = await H.api('GET', '/trips/invite/' + encodeURIComponent(code)); const mine = ST.trips.find(t => t.id === j.id && !t.del && t.cloud && !t.cloud.gone);
    if (mine) { openTrip(mine.id); toast(tr('이미 함께 보고 있는 여행이에요.')); return; }
    // 이 폰에는 없지만 내 계정이 이미 들어 있는 여행(내가 만든 여행의 초대를 다른 폰에서 열었다 등)이면 초대 화면 없이 바로 받아서 연다(11-19 사용자: "같은 계정끼리 초대가 되네?")
    if (loggedIn()) { try { const r = await H.api('GET', '/trips/' + encodeURIComponent(j.id)); const { t } = takeRemote(r, myUid()); openTrip(t.id); toast(tr('이미 함께 보고 있는 여행이에요.')); return; } catch (e) { /* 아직 참여자가 아니다(404) → 아래 초대 화면 */ } }
    INVITE = { code, info: j, pid: '' }; const free = (j.people || []).filter(p => !p.taken && p.name);
    sheet(`<div class="sheet-title">${esc(j.title || tr('이름 없는 여행'))}</div><p class="desc">${esc(j.owner ? tr('{name} 님이 함께 보자고 초대했어요.', { name: j.owner }) : tr('함께 보자는 초대를 받았어요.'))}</p>
      <div class="pl-calc-out"><div class="r"><span>${esc(tr('기간'))}</span><b>${esc(rangeText(j))}</b></div><div class="r"><span>${esc(tr('장소'))}</span><b>${esc(tr('{n}곳', { n: j.places || 0 }))}</b></div><div class="r"><span>${esc(tr('함께 가는 사람'))}</span><b>${esc(tr('{n}명', { n: (j.people || []).length }))}</b></div></div>
      ${free.length ? `<div class="pl-flabel">${esc(tr('이 중에 내가 있나요?'))}</div><div class="chips small" id="pl-join-who">${free.map(p => `<button type="button" class="chip" data-v="${esc(p.id)}">${esc(p.name)}</button>`).join('')}<button type="button" class="chip active" data-v="">${esc(tr('없어요, 새로 들어갈게요'))}</button></div>` : ''}
      <p class="caption" id="pl-join-msg" style="min-height:18px"></p>
      <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="join-ok">${esc(tr('함께 보기'))}</button></div>`,
    () => { chipGroup('#pl-join-who', (v) => { if (INVITE) INVITE.pid = v || ''; }); });
  } catch (e) { log('open invite failed: ' + (e && (e.code || e.message))); toast(e && e.status === 404 ? tr('초대가 꺼졌거나 없는 링크예요.') : tr('초대를 불러오지 못했어요.')); }
}
ACT['join-ok'] = async () => {
  const x = INVITE; if (!x) return;
  if (!loggedIn()) { loginSheet('join'); return; }
  const msg = $('#pl-join-msg'); if (msg) msg.textContent = tr('들어가는 중…');
  try {
    const j = await H.api('POST', '/trips/join/' + encodeURIComponent(x.code), { pid: x.pid || null, name: myName() });
    const { t } = takeRemote(j, myUid()); INVITE = null; closeSheet(); openTrip(t.id); toast(tr('함께 보는 여행에 들어왔어요.'));
  } catch (e) {
    log('join failed: ' + (e && (e.code || e.message)));
    const text = e && e.status === 409 && e.code === 'taken' ? tr('다른 사람이 이미 그 이름으로 들어왔어요. 다른 이름을 골라 주세요.') : e && e.status === 404 ? tr('초대가 꺼졌거나 없는 링크예요.') : e && e.status === 401 ? '' : tr('들어가지 못했어요. 잠시 뒤에 다시 해 주세요.');
    if (e && e.status === 401) { loginSheet('join'); return; }
    if ($('#pl-join-msg')) $('#pl-join-msg').textContent = text; else toast(text);
  }
};
// 받은 링크(phototravelmap://trip/<코드>): 일정을 보여 주고 내 여행으로 가져온다
async function openShared(code) {
  code = String(code || '').toUpperCase(); if (!code) return;
  if (!ST.ready) { pendingShared = code; return; }
  try {
    const j = await H.api('GET', '/trips/share/' + encodeURIComponent(code)); const d = j && j.trip; if (!d) throw new Error('empty');
    IMPORT = { code, doc: d, owner: j.owner || '' }; const n = (d.items || []).filter(x => x.kind !== 'note').length;
    const mine = ST.trips.find(t => !t.del && ((t.from && t.from.code === code) || (t.share && t.share.code === code)));
    sheet(`<div class="sheet-title">${esc(d.title)}</div><p class="desc">${esc(IMPORT.owner ? tr('{name} 님이 공유한 일정이에요.', { name: IMPORT.owner }) : tr('공유받은 일정이에요.'))}</p>
      <div class="pl-calc-out"><div class="r"><span>${esc(tr('기간'))}</span><b>${esc(rangeText(d))}</b></div><div class="r"><span>${esc(tr('장소'))}</span><b>${esc(tr('{n}곳', { n }))}</b></div></div>
      ${mine ? `<p class="caption">${esc(tr('이미 내 여행에 있는 일정이에요. 다시 담으면 하나 더 만들어져요.'))}</p>` : ''}
      <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="import-ok">${esc(tr('내 여행에 담기'))}</button></div>`);
  } catch (e) { log('open shared failed: ' + (e && (e.code || e.message))); toast(e && e.status === 404 ? tr('공유가 꺼졌거나 없는 링크예요.') : tr('일정을 불러오지 못했어요.')); }
}
ACT['import-ok'] = () => { const x = IMPORT; if (!x) return; IMPORT = null; closeSheet(); const t = importDoc(x.doc, { code: x.code, owner: x.owner }); openTrip(t.id); toast(tr('내 여행에 담았어요.')); };
/** 공유 문서(shareDoc 모양)를 내 여행으로 복사해 저장하고 그 여행을 돌려준다 */
function importDoc(d, from) {
  const home = homeCur(); const dests = (d.dests || []).filter(v => v && v.name);
  const t = C.newTrip({ title: d.title || tr('이름 없는 여행'), start: d.start || '', end: d.end || '', dests, home, cur: PD.CC_CUR[(dests.find(v => v.cc) || {}).cc] || home, from: from || {} });
  const days = C.tripDays(t); const n = {}; (d.items || []).forEach(it => { const k = it.day && days.includes(it.day) ? it.day : ''; n[k] = (n[k] || 0) + 1; });
  const keys = {}, at = {}; for (const k of Object.keys(n)) { keys[k] = C.seqKeys(n[k]); at[k] = 0; }
  for (const it of d.items || []) {
    if (!it || !it.name) continue; const k = it.day && days.includes(it.day) ? it.day : '';
    const o = { id: C.uid(), day: k || null, sort: keys[k][at[k]++], kind: it.kind === 'note' ? 'note' : 'place', name: String(it.name), addr: it.addr || '', src: 'share', c: C.now(), u: C.now() };
    if (C.hasLL(it)) { o.lat = +it.lat; o.lon = +it.lon; } if (it.time) o.time = it.time; if (it.memo) o.memo = it.memo; if (Number.isFinite(it.stay)) o.stay = it.stay; if (hasImg(it)) o.img = it.img;
    if (it.leg && typeof it.leg === 'object') { const L = {}; if (MOVES.some(m => m[0] === it.leg.mode)) L.mode = it.leg.mode; if (it.leg.min > 0) L.min = Math.round(it.leg.min); if (L.mode || L.min) o.leg = L; }
    t.items.push(o);
  }
  ST.trips.push(t); persist(t); return t;
}

// ---------- 가는 방법 · 오는 방법 · 숙소 ----------
// 여행을 짤 때 제일 먼저 정하는 것. 예약 기록(bookings) 위에 얹어서, 준비 탭의 예약 내역·경비의 '미리 결제'와 같은 기록을 본다.
const wayKind = (m) => ({ plane: 'flight', train: 'rail', bus: 'rail', subway: 'rail', car: 'car' }[m] || 'etc');
const wayTitle = (b) => (b.from || b.to ? (b.from || '…') + ' → ' + (b.to || '…') : moveName(b.mode));
function waySub(t, b) { const a = [moveName(b.mode)]; const nf = stepFiles(t, b.id).length; if (b.fromPt && b.toPt && b.fromPt.code && b.toPt.code) a.push(b.fromPt.code + ' → ' + b.toPt.code); const when = b.start || b.end ? dtRange(b.start || b.end, b.start ? b.end : '') : ''; if (when) a.push(when); if (b.code) a.push(b.code); if (b.paid > 0) a.push(money(b.paid, t.home)); if (b.memo) a.push(b.memo); if (nf) a.push(tr('첨부 {n}', { n: nf })); return a.join(' · '); }
const stayNights = (t, s) => { const a = C.dayPart(s.start) || t.start, z = C.dayPart(s.end) || t.end; const n = a && z ? C.dayDiff(a, z) : 0; return n > 0 ? tr('{n}박', { n }) : ''; };
function baseHtml(t) {
  const go = C.ways(t, 'go'), back = C.ways(t, 'back'), st = C.stays(t);
  const modes = (l) => l.map(b => moveName(b.mode)).filter((x, i, a) => a.indexOf(x) === i).join(' → '); const when = (l) => { const b = l.find(x => x.start || x.end); return b ? dtText(b.start || b.end) : ''; };
  const tile = (act, attr, icon, label, main, sub, set) => `<button type="button" class="pl-base ${set ? 'set' : ''}" data-act="${act}" ${attr}><span class="pl-base-ic">${icon}</span><span class="pl-base-k">${esc(label)}</span><span class="pl-base-v">${esc(main)}</span>${sub ? `<span class="pl-base-s">${esc(sub)}</span>` : ''}</button>`;
  return `<div class="pl-bases">${tile('way', 'data-dir="go"', MOVE_ICON[(go[0] || {}).mode] || MOVE_ICON.plane, tr('가는 방법'), go.length ? modes(go) : tr('정하기'), when(go), go.length)}${tile('way', 'data-dir="back"', MOVE_ICON[(back[0] || {}).mode] || MOVE_ICON.plane, tr('오는 방법'), back.length ? modes(back) : tr('정하기'), when(back), back.length)}${tile('stay', '', BED_SVG, tr('숙소'), st.length ? st[0].title + (st.length > 1 ? ' +' + (st.length - 1) : '') : tr('정하기'), st.length ? stayNights(t, st[0]) : '', st.length)}</div>`;
}
ACT.way = (d) => { ST.wayDir = d && d.dir === 'back' ? 'back' : 'go'; closeSheet(); show('way'); };
SCREENS.way = () => {
  const t = trip(); if (!t) return { title: '', html: '' }; const dir = ST.wayDir || 'go'; const list = C.ways(t, dir);
  let h = `<div class="seg" style="margin:4px 0 14px"><button type="button" data-act="way-dir" data-v="go" class="${dir === 'go' ? 'active' : ''}">${esc(tr('가는 방법'))}</button><button type="button" data-act="way-dir" data-v="back" class="${dir === 'back' ? 'active' : ''}">${esc(tr('오는 방법'))}</button></div>`;
  const seenF = new Set(); const dirFiles = list.flatMap(b => stepFiles(t, b.id)).filter(f => !seenF.has(f.id) && seenF.add(f.id));   // 11-18 사용자: "비행기도 볼 수 있게 맨 위에 pdf 목록"
  if (dirFiles.length) h += `<div class="pl-sub-title pl-docs-title">${esc(tr('올린 표 · 확인서 {n}개', { n: dirFiles.length }))}</div>${filesHtml(dirFiles, 'wayl')}`;
  h += `<p class="pl-sum">${esc(dir === 'go' ? tr('집에서 여행지까지 가는 길을 순서대로 적어요. 택시 → 비행기 → 지하철처럼 단계를 나눌 수 있어요.') : tr('여행지에서 집으로 돌아오는 길을 순서대로 적어요.'))}</p>`;
  h += ticketBtn('ways', (list[0] || {}).mode || 'plane');
  if (list.length) h += `<ol class="pl-tl pl-steps">${list.map((b, i) => `<li class="pl-way" data-act="way-edit" data-id="${esc(b.id)}"><span class="pl-num" style="background:var(--grey400)">${i + 1}</span><span class="pl-way-ic">${MOVE_ICON[b.mode] || MOVE_ICON.auto}</span><div class="pl-way-body"><div class="pl-way-title">${esc(wayTitle(b))}</div><div class="pl-way-sub">${esc(waySub(t, b))}</div></div><span class="chev"></span></li>`).join('')}</ol>`;
  h += `<div class="pl-sub-title">${esc(list.length ? tr('다음 단계 더하기') : dir === 'go' ? tr('어떻게 가나요?') : tr('어떻게 돌아오나요?'))}</div><div class="pl-modes">${WAYS.map(([k, n]) => `<button type="button" class="pl-mode" data-act="way-new" data-v="${k}">${MOVE_ICON[k]}<span>${esc(tr(n))}</span></button>`).join('')}</div>`;
  if (dir === 'back' && !list.length && C.ways(t, 'go').length) h += `<button type="button" class="btn weak" style="margin-top:16px" data-act="way-copy">${esc(tr('가는 방법을 거꾸로 채우기'))}</button>`;
  return { title: tr('가는 방법 · 오는 방법'), html: h };
};
ACT['way-dir'] = (d) => { ST.wayDir = d.v === 'back' ? 'back' : 'go'; renderScreen(true); };
ACT['way-new'] = (d) => waySheet(null, d.v);
ACT['way-edit'] = (d) => waySheet(d.id);
function waySheet(id, mode) {
  const t = trip(); if (!t) return; const b = id ? t.bookings.find(x => x.id === id) : null; const dir = b ? b.dir : (ST.wayDir || 'go'); const v = b || {};
  WAY = { id: id || null, dir, mode: (b && b.mode) || mode || 'plane', files: [], fromPt: (b && b.fromPt) || null, toPt: (b && b.toPt) || null };
  if (WAY.mode === 'plane') loadAirports(); const date = v.day || C.dayPart(v.start) || (dir === 'back' ? t.end : t.start) || '';
  sheet(`<div class="sheet-title">${esc(dir === 'back' ? tr('오는 방법') : tr('가는 방법'))}</div>
    <div id="pl-w-files"></div>${ticketBtn('way', WAY.mode)}
    <div class="chips small pl-moves" id="pl-w-mode" style="margin-top:14px">${WAYS.map(([k, n]) => `<button type="button" class="chip ${WAY.mode === k ? 'active' : ''}" data-v="${k}">${MOVE_ICON[k]}${esc(tr(n))}</button>`).join('')}</div>
    <div class="pl-date-row" style="margin-top:14px"><div class="field"><label for="pl-w-from">${esc(tr('출발하는 곳'))}</label><input id="pl-w-from" maxlength="40" autocomplete="off" placeholder="${esc(tr('예: 김포공항'))}" value="${esc(v.from || '')}"></div><div class="field"><label for="pl-w-to">${esc(tr('도착하는 곳'))}</label><input id="pl-w-to" maxlength="40" autocomplete="off" placeholder="${esc(tr('예: 간사이공항'))}" value="${esc(v.to || '')}"></div></div>
    <div class="field"><label for="pl-w-date">${esc(tr('날짜'))}</label><input id="pl-w-date" type="date" value="${esc(date)}"></div>
    <div class="pl-date-row"><div class="field"><label for="pl-w-dep">${esc(tr('출발 시각'))}</label><input id="pl-w-dep" type="time" value="${esc(v.start ? v.start.slice(11, 16) : '')}"></div><div class="field"><label for="pl-w-arr">${esc(tr('도착 시각'))}</label><input id="pl-w-arr" type="time" value="${esc(v.end ? v.end.slice(11, 16) : '')}"></div></div>
    <div class="pl-date-row"><div class="field"><label for="pl-w-code">${esc(tr('편명·예약 번호'))}</label><input id="pl-w-code" maxlength="40" autocomplete="off" value="${esc(v.code || '')}"></div><div class="field"><label for="pl-w-paid">${esc(tr('요금 ({c})', { c: t.home }))}</label><input id="pl-w-paid" inputmode="decimal" autocomplete="off" value="${esc(v.paid || '')}"></div></div>
    <div class="field"><input id="pl-w-memo" maxlength="120" autocomplete="off" placeholder="${esc(tr('메모(안 적어도 돼요)'))}" value="${esc(v.memo || '')}"></div>
    <button type="button" class="btn primary" data-act="way-save">${esc(tr('저장'))}</button>
    ${b ? `<button type="button" class="pl-link-danger" data-act="way-del">${esc(tr('이 단계 지우기'))}</button>` : ''}`, () => { chipGroup('#pl-w-mode', (m) => { WAY.mode = m; }); paintWayFiles(); });
}
function wayRecord(t, dir, mode, o) {   // 가는·오는 방법의 단계 하나(예약 기록)
  const last = C.ways(t, dir).pop(); const b = Object.assign({ id: C.uid(), c: C.now(), u: C.now(), dir, mode, kind: wayKind(mode), from: '', to: '', title: moveName(mode), day: dir === 'back' ? t.end : t.start, start: '', end: '', code: '', paid: 0, memo: '', addr: '', sort: C.midKey(last ? last.sort || '' : '', '') }, o || {});
  t.bookings.push(b); return b;
}
ACT['way-save'] = () => {
  const t = trip(); if (!t || !WAY) return; const date = $('#pl-w-date').value || (WAY.dir === 'back' ? t.end : t.start) || ''; const dep = $('#pl-w-dep').value, arr = $('#pl-w-arr').value;
  const from = $('#pl-w-from').value.trim(), to = $('#pl-w-to').value.trim(); const paid = num($('#pl-w-paid').value);
  const b = WAY.id ? t.bookings.find(x => x.id === WAY.id) : wayRecord(t, WAY.dir, WAY.mode); if (!b) return;
  Object.assign(b, { mode: WAY.mode, kind: wayKind(WAY.mode), from, to, title: from || to ? (from || '…') + ' → ' + (to || '…') : moveName(WAY.mode), day: date,
    start: date && dep ? date + 'T' + dep : '', end: date && arr ? (dep && arr < dep ? C.addDays(date, 1) : date) + 'T' + arr : '',   // 도착이 출발보다 이르면 다음 날 도착
    code: $('#pl-w-code').value.trim(), paid: paid > 0 ? paid : 0, memo: $('#pl-w-memo').value.trim() });
  const fp = WAY.fromPt || (WAY.mode === 'plane' ? airOf(from) : null), tp = WAY.toPt || (WAY.mode === 'plane' ? airOf(to) : null);   // 공항 코드·위치(고른 것 → 이름으로 맞춘 것)
  if (fp) b.fromPt = fp; else delete b.fromPt; if (tp) b.toPt = tp; else delete b.toPt;
  for (const rec of WAY.files || []) saveFile(t, rec, [b.id]);   // 이 시트에서 올린 표
  C.touch(b); persist(t); closeSheet(); renderScreen();
};
ACT['way-del'] = () => { const t = trip(); const b = t && WAY && WAY.id ? t.bookings.find(x => x.id === WAY.id) : null; if (!b) return; b.del = true; C.touch(b); persist(t); closeSheet(); renderScreen(); };
ACT['way-copy'] = () => {   // 오는 방법: 가는 방법을 거꾸로(출발·도착을 바꾸고 날짜는 마지막 날, 시각은 비운다)
  const t = trip(); if (!t) return; const go = C.ways(t, 'go'); if (!go.length || C.ways(t, 'back').length) return;
  go.slice().reverse().forEach(g => { const o = { from: g.to || '', to: g.from || '', title: g.from || g.to ? (g.to || '…') + ' → ' + (g.from || '…') : moveName(g.mode) }; if (g.toPt) o.fromPt = g.toPt; if (g.fromPt) o.toPt = g.fromPt; wayRecord(t, 'back', g.mode, o); });
  persist(t); renderScreen(); toast(tr('가는 방법을 거꾸로 채웠어요. 시각을 고쳐 주세요.'));
};
// ---------- 공항 ----------
// 전 세계 정기편 공항(data/airports.js, 약 4천 곳·0.6MB)은 앱 안에 들어 있고 처음 쓸 때 한 번 읽는다(서버를 부르지 않는다). 찾기·맞추기는 planner-air.js
let airP = null, AC = null;
function loadAirports() {
  if (root.AIRPORTS) return Promise.resolve(true);
  return airP || (airP = new Promise((res) => { const sc = document.createElement('script'); sc.src = 'data/airports.js'; sc.onload = () => res(!!root.AIRPORTS); sc.onerror = () => { airP = null; res(false); }; document.head.appendChild(sc); }));
}
const airPt = (x) => (x ? { code: x.code, lat: x.lat, lon: x.lon } : null);
const airOf = (name) => (root.AIRPORTS && root.PlannerAir && name ? airPt(root.PlannerAir.match(root.AIRPORTS, name, LANG())) : null);   // 표에서 읽거나 직접 적은 공항 이름 → 코드·위치
// 출발·도착 칸에서 공항 고르기(수단이 비행기일 때): 치는 대로 후보가 칸 아래에 뜨고, 고르면 이름과 함께 코드·위치를 기억한다. 고쳐 치면 기억한 것은 지운다
function acCtx(inp) {   // 이 칸이 어느 것인지: 여행 만들기 4단계의 칸 / 단계 시트의 칸
  const box = inp.closest('.pl-wayform');
  if (box && ST.draft) { const o = draftWay(ST.draft)[box.dataset.k]; return o ? { o, f: inp.dataset.f, mode: ST.draft.go } : null; }
  if ((inp.id === 'pl-w-from' || inp.id === 'pl-w-to') && WAY) return { o: WAY, f: inp.id === 'pl-w-from' ? 'from' : 'to', mode: WAY.mode };
  return null;
}
function acHide() { const el = $('#pl-ac'); if (el) el.remove(); AC = null; }
async function acType(inp) {
  const cx = acCtx(inp); if (!cx) return; delete cx.o[cx.f + 'Pt'];
  const q = inp.value.trim(); if (cx.mode !== 'plane' || q.length < 2 || jamoTail(q)) { acHide(); return; }
  if (!(await loadAirports()) || !inp.isConnected || inp.value.trim() !== q) return;
  const items = root.PlannerAir.search(root.AIRPORTS, q, LANG()); if (!items.length) { acHide(); return; }
  const row = inp.closest('.pl-date-row') || inp.parentNode; let el = $('#pl-ac');
  if (!el || el.previousElementSibling !== row) { acHide(); el = document.createElement('ul'); el.id = 'pl-ac'; el.className = 'pl-ac'; row.insertAdjacentElement('afterend', el); }
  AC = { inp, items };
  el.innerHTML = items.map((x, i) => `<li data-act="ac-pick" data-i="${i}"><b>${esc(x.name)}</b><small>${esc(x.city)} · ${esc(x.code)}</small></li>`).join('');
}
ACT['ac-pick'] = (d) => {
  const a = AC; const x = a && a.items[+d.i]; if (!x) return; const cx = acCtx(a.inp); if (!cx) { acHide(); return; }
  a.inp.value = x.name; cx.o[cx.f + 'Pt'] = airPt(x); if (cx.o !== WAY) cx.o[cx.f] = x.name; acHide();
};

// ---------- 표 올리기(전자항공권 · 승선권 · 승차권) ----------
// PDF·사진을 고르면 ① 파일을 붙여 저장하고(기기 안 IndexedDB) ② 네이티브가 기기 안에서 글자를 꺼내고(PDF 글자층 → 글자 인식) ③ planner-ticket.js 가 구간으로 읽어 칸을 채운다. 사람이 확인하고 고친다.
const FILE_MAX = 10 * 1024 * 1024;
const ticketWord = (m) => (m === 'stay' ? tr('예약 확인서 올리기') : m === 'plane' ? tr('전자항공권 올리기') : m === 'ferry' ? tr('승선권 올리기') : m === 'car' || m === 'taxi' || m === 'walk' ? tr('예약 확인서 올리기') : tr('승차권 올리기'));
function ticketBtn(ctx, mode) { return `<button type="button" class="pl-ticket" data-act="ticket-pick" data-ctx="${ctx}">${CLIP_SVG}<span><b>${esc(ticketWord(mode))}</b><small>${esc(mode === 'stay' ? tr('PDF나 사진을 올리면 숙소 이름·날짜·예약 번호를 채우고 파일도 저장해요. 한국어·영어·현지어처럼 언어별 판을 따로따로 올려 둘 수 있어요.') : tr('PDF나 사진을 올리면 글자를 읽어 칸을 채우고, 파일도 같이 저장해요.'))}</small></span></button>`; }
// 붙인 파일의 언어: 같은 확인서를 한국어·영어·현지어(그 나라 말) 판으로 나눠 두고 골라 연다(11-18 사용자: "그 나라에 맞는 확인서가 필요할 수도").
// 고르기 목록은 지금 고른 말 → 한국어 · 영어 → 여행지 나라의 말 → 그 밖의 흔한 말. 이름은 기기 내장 언어 이름(Intl.DisplayNames)을 화면 언어로
const MORE_LANGS = ['ja', 'zh', 'th', 'vi', 'id', 'ms', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'ru', 'tr', 'el', 'pl', 'cs', 'ar', 'he', 'hi', 'km', 'lo', 'my', 'mn', 'sv', 'da', 'nb', 'fi', 'hu', 'ro', 'uk'];
let langDN = null;
const langName = (k) => { if (!k) return ''; try { if (!langDN || langDN.loc !== LOCALE()) { langDN = new Intl.DisplayNames([LOCALE()], { type: 'language' }); langDN.loc = LOCALE(); } const n = langDN.of(k); if (n && n !== k) return n; } catch (e) { /* 아래로 */ } return k.toUpperCase(); };
const tripLangs = (ctx) => { const ds = (ctx === 'dstay' || ctx === 'draft') && ST.draft ? ST.draft.dests || [] : ((trip() || {}).dests || []); const P = root.PlannerTicket; return P ? ds.filter(x => x.cc).map(x => P.localLang(x.cc)) : []; };
const langCodes = (f, ctx) => [...new Set([f.lang, 'ko', 'en'].concat(tripLangs(ctx), MORE_LANGS).filter(Boolean))];
const langSel = (f, ctx) => `<select class="pl-file-lang${f.lang ? '' : ' none'}" data-id="${esc(f.id)}" data-ctx="${ctx}" aria-label="${esc(tr('파일 언어'))}"><option value=""${f.lang ? '' : ' selected'}>${esc(tr('언어'))}</option>${langCodes(f, ctx).map(k => `<option value="${k}"${f.lang === k ? ' selected' : ''}>${esc(langName(k))}</option>`).join('')}</select>`;
const sizeText = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB');
const stepFiles = (t, bid) => C.live(t.files || []).filter(f => (f.bids || []).includes(bid));
function filesHtml(list, ctx) {
  return list && list.length ? `<div class="pl-files">${list.map(f => `<div class="pl-file" data-act="file-open" data-id="${esc(f.id)}" data-ctx="${ctx}"><span class="pl-file-ic">${f.mime === 'application/pdf' ? 'PDF' : tr('사진')}</span><span class="pl-file-n">${esc(f.name)}<small>${esc(sizeText(f.size || 0))}</small></span>${langSel(f, ctx)}<button type="button" data-act="file-del" data-id="${esc(f.id)}" data-ctx="${ctx}" aria-label="${esc(tr('지우기'))}">×</button></div>`).join('')}</div>` : '';
}
function saveFile(t, rec, bids) {   // 파일 본문은 기기 저장소에, 기록(이름·크기·붙인 단계)은 여행에
  (t.files || (t.files = [])).push({ id: rec.id, bids: bids.slice(), name: rec.name, mime: rec.mime, size: rec.size, lang: rec.lang || '', c: C.now(), u: C.now() });
  C.Store.putFile({ id: rec.id, name: rec.name, mime: rec.mime, buf: rec.buf }).catch(e => log('file save failed: ' + (e && e.message)));
}
function pendingFiles(ctx) { return ctx === 'draft' ? (ST.draft ? draftWay(ST.draft).files : []) : ctx === 'dstay' ? (ST.draft ? (ST.draft.stayFiles || (ST.draft.stayFiles = [])) : []) : ctx === 'way' && WAY ? WAY.files : ctx === 'stay' && STAY ? STAY.files : []; }
function setFileLang(id, ctx, v) {   // 파일 줄의 언어 고르기
  v = /^[a-z]{2,3}$/.test(v || '') ? v : '';
  const pend = pendingFiles(ctx).find(f => f.id === id); if (pend) { pend.lang = v; return; }
  const t = trip(); const f = t && (t.files || []).find(x => x.id === id); if (!f) return;
  f.lang = v; C.touch(f); persist(t);
}
function paintStayFiles() { const box = $('#pl-s-files'); const t = trip(); if (!box || !STAY || !t) return; box.innerHTML = filesHtml((STAY.id ? stepFiles(t, STAY.id) : []).concat(STAY.files), 'stay'); }
function paintWayFiles() { const box = $('#pl-w-files'); const t = trip(); if (!box || !WAY || !t) return; box.innerHTML = filesHtml((WAY.id ? stepFiles(t, WAY.id) : []).concat(WAY.files), 'way'); }
ACT['ticket-pick'] = (d) => {
  let inp = $('#pl-file-in');
  if (!inp) {
    inp = document.createElement('input'); inp.type = 'file'; inp.id = 'pl-file-in'; inp.accept = 'application/pdf,image/*'; inp.hidden = true; document.body.appendChild(inp);
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; const ctx = inp.dataset.ctx; inp.value = ''; if (f) onTicket(f, ctx); });
  }
  inp.dataset.ctx = d.ctx || ''; if (d.ctx === 'draft') readWay();
  inp.click();
};
async function onTicket(file, ctx) {
  const mime = file.type || (/\.pdf$/i.test(file.name || '') ? 'application/pdf' : /\.(jpe?g|png|heic|webp)$/i.test(file.name || '') ? 'image/jpeg' : '');
  if (!(mime === 'application/pdf' || /^image\//.test(mime))) { toast(tr('PDF나 사진만 올릴 수 있어요.')); return; }
  if (file.size > FILE_MAX) { toast(tr('파일이 너무 커요. 10MB까지 올릴 수 있어요.')); return; }
  let buf; try { buf = await file.arrayBuffer(); } catch (e) { toast(tr('파일을 읽지 못했어요.')); return; }
  await loadAirports();   // 표의 공항 이름에 코드·위치를 붙이려고
  const rec = { id: C.uid(), name: String(file.name || (mime === 'application/pdf' ? 'ticket.pdf' : 'ticket.jpg')).slice(0, 80), mime, size: file.size, buf };
  const isStay = ctx === 'stay' || ctx === 'dstay';
  toast(isStay ? tr('확인서를 읽는 중…') : tr('표를 읽는 중…'));
  let res = null; try { res = H.scanDoc ? await H.scanDoc(new Blob([buf], { type: mime }), rec.name) : null; } catch (e) { res = null; }
  const t = trip(); const mode = ctx === 'draft' ? (ST.draft && ST.draft.go) : ctx === 'way' ? (WAY && WAY.mode) : '';
  const year = +String((ctx === 'draft' ? ST.draft && ST.draft.start : t && t.start) || '').slice(0, 4) || 0;
  rec.lang = root.PlannerTicket ? root.PlannerTicket.docLang(res && res.ok ? res.text : '', rec.name) : '';
  const parsed = !isStay && res && res.ok && res.text && root.PlannerTicket ? root.PlannerTicket.parse(res.text, { lang: LANG(), mode, year, today: C.today() }) : { segments: [], ref: '', mode: '' };
  log('ticket: ' + (res ? (res.ok ? (res.source || 'ok') + ' ' + String(res.text || '').length + ' chars' : 'fail ' + (res.reason || '')) : 'no reader') + ' → ' + parsed.segments.length + ' segments');
  const n = ctx === 'stay' ? ticketToStay(rec, res && res.ok ? res.text : '', year) : ctx === 'dstay' ? ticketToDraftStay(rec, res && res.ok ? res.text : '', year) : ctx === 'draft' ? ticketToDraft(rec, parsed) : ctx === 'ways' ? ticketToWays(rec, parsed) : ctx === 'way' ? ticketToSheet(rec, parsed) : -1;
  if (n < 0) return;
  toast(n > 0 ? (isStay ? tr('확인서에서 읽은 내용을 채웠어요. 맞는지 확인해 주세요.') : tr('표에서 읽은 내용을 채웠어요. 맞는지 확인해 주세요.')) : isStay && res && res.ok ? tr('파일은 붙였어요. 날짜는 읽지 못해서 직접 적어 주세요.') : res && res.ok ? tr('파일은 붙였어요. 날짜와 시각은 읽지 못해서 직접 적어 주세요.') : tr('파일은 붙였어요. 이 기기에서는 글자를 읽지 못해서 직접 적어 주세요.'));
}
// 표에서 읽은 구간 → 단계에 넣을 값
function wayFields(t, dir, s) {
  const mode = MOVES.some(m => m[0] === s.mode) ? s.mode : 'plane'; const date = s.date || (dir === 'back' ? t.end : t.start) || ''; const from = s.from || '', to = s.to || '';
  const o = { mode, kind: wayKind(mode), from, to, title: from || to ? (from || '…') + ' → ' + (to || '…') : moveName(mode), day: date,
    start: date && s.dep ? date + 'T' + s.dep : '', end: date && s.arr ? (s.arrDate || (s.dep && s.arr < s.dep ? C.addDays(date, 1) : date)) + 'T' + s.arr : '', code: s.code || '', memo: s.memo || s.carrier || '' };
  const fp = s.fromPt || (mode === 'plane' ? airOf(from) : null), tp = s.toPt || (mode === 'plane' ? airOf(to) : null);   // 비행기면 공항 코드·위치(고른 것 → 이름으로 맞춘 것)
  if (fp) o.fromPt = fp; if (tp) o.toPt = tp;
  return o;
}
const segForm = (s) => ({ from: s.from || '', to: s.to || '', date: s.date || '', dep: s.dep || '', arr: s.arr || '', arrDate: s.arrDate || '', code: s.code || '', memo: s.carrier || '', mode: s.mode || '' });
function ticketToDraft(rec, parsed) {   // 여행 만들기 4단계
  const d = ST.draft; if (!d) return -1; const W = draftWay(d); W.files.push(rec);
  const sp = root.PlannerTicket ? root.PlannerTicket.split(parsed.segments) : { go: [], back: [] };
  if (sp.go.length) { W.go = segForm(sp.go[0]); W.goMore = sp.go.slice(1).map(segForm); W.fromTicket = true; if (WAYS.some(w => w[0] === sp.go[0].mode)) d.go = sp.go[0].mode; }
  if (sp.back.length) { W.back = segForm(sp.back[0]); W.backMore = sp.back.slice(1).map(segForm); d.backSame = true; }
  renderScreen(); return parsed.segments.length;
}
function ticketToWays(rec, parsed) {   // 가는 방법 · 오는 방법 화면: 한 번 올리면 양쪽 단계를 채운다
  const t = trip(); if (!t) return -1; const sp = root.PlannerTicket ? root.PlannerTicket.split(parsed.segments) : { go: [], back: [] }; const hit = [];
  const fill = (dir, list) => {
    const have = C.ways(t, dir); let k = 0;
    for (const sg of list) {
      let b = null; while (k < have.length && !b) { const x = have[k++]; if (!x.from && !x.to && !x.start && !x.code) b = x; }   // 수단만 골라 둔 빈 단계가 있으면 그것부터 채운다
      const o = wayFields(t, dir, sg); if (b) Object.assign(b, o); else b = wayRecord(t, dir, o.mode, o);
      C.touch(b); hit.push(b.id);
    }
  };
  fill('go', sp.go); fill('back', sp.back);
  let bids = hit;
  if (!bids.length) { const dir = ST.wayDir || 'go'; const cur = C.ways(t, dir); bids = cur.length ? cur.map(b => b.id) : [wayRecord(t, dir, parsed.mode && MOVES.some(m => m[0] === parsed.mode) ? parsed.mode : 'plane').id]; }   // 못 읽었으면 지금 보는 쪽 단계에 파일만 붙인다
  saveFile(t, rec, bids); persist(t); renderScreen(); return parsed.segments.length;
}
function ticketToSheet(rec, parsed) {   // 단계 하나를 고치는 시트: 이 방향의 첫 구간으로 칸을 채운다
  if (!WAY || sheetEl().hidden) return -1; WAY.files.push(rec);
  const sp = root.PlannerTicket ? root.PlannerTicket.split(parsed.segments) : { go: [], back: [] }; const sg = (WAY.dir === 'back' ? sp.back[0] : sp.go[0]) || parsed.segments[0];
  if (sg) {
    const set = (sel, v) => { const el = $(sel); if (el && v) el.value = v; };
    set('#pl-w-from', sg.from); set('#pl-w-to', sg.to); set('#pl-w-date', sg.date); set('#pl-w-dep', sg.dep); set('#pl-w-arr', sg.arr); set('#pl-w-code', sg.code);
    const memo = $('#pl-w-memo'); if (memo && !memo.value && sg.carrier) memo.value = sg.carrier;
    if (MOVES.some(m => m[0] === sg.mode)) { WAY.mode = sg.mode; $$('#pl-w-mode .chip').forEach(ch => ch.classList.toggle('active', ch.dataset.v === sg.mode)); }
    WAY.fromPt = WAY.mode === 'plane' ? airOf(sg.from) : null; WAY.toPt = WAY.mode === 'plane' ? airOf(sg.to) : null;
  }
  paintWayFiles(); return sg ? 1 : 0;
}
function ticketToStay(rec, text, year) {   // 숙소 시트: 확인서를 붙이고, 읽힌 체크인·체크아웃·예약 번호를 칸에 채운다(예약 번호는 비어 있을 때만)
  if (!STAY || sheetEl().hidden || !$('#pl-s-files')) return -1; STAY.files.push(rec);
  const r = text && root.PlannerTicket ? root.PlannerTicket.stay(text, { year, today: C.today() }) : { checkin: '', checkout: '', ref: '' }; let n = 0;
  const din = $('#pl-s-in'), dout = $('#pl-s-out'), code = $('#pl-s-code');
  if (r.checkin && din) { din.value = r.checkin; n++; } if (r.checkout && dout) { dout.value = r.checkout; n++; }
  if (r.ref && code && !code.value.trim()) { code.value = r.ref.slice(0, 40); n++; }
  const nm = $('#pl-s-name'), ad = $('#pl-s-addr');
  if (r.addr && ad && !ad.value.trim()) { ad.value = r.addr.slice(0, 120); n++; }
  if (r.name && nm && !nm.value.trim()) { nm.value = r.name.slice(0, 60); n++; STAY.lat = STAY.lon = undefined; STAY.img = ''; STAY.seq++; clearTimeout(pickT); $('#pl-s-pos').textContent = tr('찾는 중…'); staySearch(nm.value.trim(), true); }
  paintStayFiles(); return n;
}
function ticketToDraftStay(rec, text, year) {   // 새 여행 '어디서 묵나요?': 확인서 → 숙소 이름·주소·체크인·체크아웃·예약 번호. 이름을 읽으면 그 이름으로 찾아 후보를 보여 준다(고르면 지도 위치까지)
  const d = ST.draft; if (!d || d.step < 5) return -1;
  (d.stayFiles || (d.stayFiles = [])).push(rec);
  const r = text && root.PlannerTicket ? root.PlannerTicket.stay(text, { year, today: C.today() }) : {}; let n = 0, q = '';
  if (r.checkin) { d.stayIn = r.checkin; n++; } if (r.checkout) { d.stayOut = r.checkout; n++; } if (r.ref && !d.stayCode) { d.stayCode = r.ref.slice(0, 40); n++; }
  if (r.name && !(d.stay && d.stay.name)) { d.stay = { name: r.name.slice(0, 60), addr: (r.addr || '').slice(0, 160) }; q = d.stay.name; n++; }
  else if (r.addr && d.stay && !d.stay.addr) d.stay.addr = r.addr.slice(0, 160);
  if (q) { d.sq = q; d.sres = []; d.sseq = (d.sseq || 0) + 1; d.smore = { state: 'loading', items: [] }; d.autoAddr = !!(d.stay && d.stay.addr); d.addrMsg = ''; }
  renderScreen();
  if (q) draftStaySearch(q, true);
  return n;
}
ACT['file-open'] = async (d) => {
  const t = trip(); const pend = pendingFiles(d.ctx).find(f => f.id === d.id); let meta = pend || (t && (t.files || []).find(f => f.id === d.id)); if (!meta) return;
  let buf = pend ? pend.buf : null;
  if (!buf) { try { const r = await C.Store.getFile(d.id); buf = r && r.buf; } catch (e) { buf = null; } }
  if (!buf) { toast(tr('이 기기에는 파일이 없어요. 올린 기기에서 열 수 있어요.')); return; }
  const ok = H.openDoc ? await H.openDoc({ name: meta.name, mime: meta.mime, blob: new Blob([buf], { type: meta.mime }) }) : false;
  if (!ok) toast(tr('파일을 열지 못했어요.'));
};
ACT['file-del'] = async (d) => {
  const pend = pendingFiles(d.ctx); const i = pend.findIndex(f => f.id === d.id);
  if (i >= 0) { pend.splice(i, 1); if (d.ctx === 'draft') { readWay(); renderScreen(); } else if (d.ctx === 'dstay') renderScreen(); else if (d.ctx === 'stay') paintStayFiles(); else paintWayFiles(); return; }
  const t = trip(); const f = t && (t.files || []).find(x => x.id === d.id); if (!f) return;
  const ok = await H.askConfirm(tr('이 파일을 지울까요?'), tr('붙여 둔 파일만 지워지고 적어 둔 내용은 그대로예요.'), tr('지우기'), true); if (!ok) return;
  f.del = true; C.touch(f); persist(t); dropFileIfUnused(f.id); paintWayFiles(); paintStayFiles(); renderScreen();
};
// 폰에만 있는 파일(올린 표·확인서, 일기 사진, 지출 사진). 여러 여행(내 여행으로 복사한 것)이 같은 파일을 쓸 수 있어 아무도 안 쓸 때만 지운다.
// 로그아웃한 계정의 여행이 쓰던 파일은 'pl-keepfiles.<계정>' 에 적어 두고 남긴다(다시 로그인하면 여행과 함께 돌아온다)
const KEEP_PRE = 'pl-keepfiles.';
const expPhotos = (e) => (e && Array.isArray(e.photos) ? e.photos : []);
function tripFileIds(t) { const out = []; for (const f of C.live(t.files || [])) out.push(f.id); for (const e of C.live(t.diary || [])) out.push(...dyPhotos(e)); for (const e of C.live(t.expenses || [])) out.push(...expPhotos(e)); return out; }
function keptFileIds() { const s = new Set(); try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEEP_PRE)) for (const id of JSON.parse(localStorage.getItem(k) || '[]')) s.add(id); } } catch (e) { /* ignore */ } return s; }
function fileInUse(id) { return keptFileIds().has(id) || ST.trips.some(t => !t.del && tripFileIds(t).includes(id)); }
function dropFileIfUnused(id) { if (id && !fileInUse(id)) C.Store.delFile(id).catch(() => { /* ignore */ }); }
// 어느 여행에도 붙어 있지 않은 파일 본문을 치운다(여행을 지웠을 때 남는 것)
async function sweepFiles() {
  try { const keep = keptFileIds(); for (const t of ST.trips) for (const id of tripFileIds(t)) keep.add(id); for (const k of await C.Store.fileKeys()) if (!(typeof k === 'string' && k.startsWith('img:')) && !keep.has(k)) await C.Store.delFile(k); } catch (e) { log('file sweep failed: ' + (e && e.message)); }
}

// 숙소: 이름을 치면 찾아서 지도 위치까지 정한다(못 찾으면 이름만). 여러 곳이면 목록에서 고른다
ACT.stay = (d) => { const t = trip(); if (!t) return; const list = C.stays(t); if (d && d.id) { staySheet(d.id); return; } if (!list.length && cands(t).length) { candSheet(); return; } if (list.length <= 1) { staySheet(list.length ? list[0].id : null); return; } staysSheet(); };
function staysSheet() {
  const t = trip(); const list = C.stays(t);
  sheet(`<div class="sheet-title">${esc(tr('숙소'))}</div><ul class="rows">${list.map(s => `<li class="row tap" data-act="stay" data-id="${esc(s.id)}"><span class="pl-thumb ic">${BED_SVG}</span><div class="row-body"><div class="row-title">${esc(s.title)}</div><div class="row-desc">${esc([dtRangeDay(s), stayNights(t, s)].filter(Boolean).join(' · '))}</div></div><span class="chev"></span></li>`).join('')}</ul>
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="stay-new">${esc(tr('숙소 더하기'))}</button></div>`);
}
const dtRangeDay = (s) => { const a = C.dayPart(s.start), z = C.dayPart(s.end); return a && z ? rangeText({ start: a, end: z }) : ''; };
ACT['stay-new'] = () => staySheet(null);
function staySheet(id, addDay) {
  const t = trip(); if (!t) return; const b = id ? t.bookings.find(x => x.id === id) : null; const v = b || {}; const prev = !b ? C.stays(t).pop() : null;
  STAY = { id: id || null, lat: v.lat, lon: v.lon, img: v.img || '', seq: 0, items: [], addDay: addDay || null, files: [] };
  const din = C.dayPart(v.start) || (prev ? C.dayPart(prev.end) : '') || t.start || '', dout = C.dayPart(v.end) || t.end || '';
  sheet(`<div class="sheet-title">${esc(tr('숙소'))}</div>${addDay ? `<p class="desc">${esc(tr('저장하면 이 날 일정 끝에 바로 넣어요.'))}</p>` : ''}
    ${ticketBtn('stay', 'stay')}<div id="pl-s-files">${filesHtml(b ? stepFiles(t, b.id) : [], 'stay')}</div>
    <div class="pl-addrow"><input id="pl-s-name" maxlength="60" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" placeholder="${esc(tr('숙소 이름'))}" value="${esc(v.title || '')}"><button type="button" data-act="stay-find">${esc(tr('위치 찾기'))}</button></div>
    <ul class="rows pl-stay-res" id="pl-s-res" hidden></ul>
    <p class="pl-conv" id="pl-s-pos">${C.hasLL(v) ? esc(tr('지도 위치가 정해져 있어요.')) : esc(tr('이름을 적고 ‘위치 찾기’를 누르면 지도 위치까지 저장해요. 못 찾으면 이름만 적어도 돼요.'))}</p>
    <div class="pl-date-row"><div class="field"><label for="pl-s-in">${esc(tr('체크인'))}</label><input id="pl-s-in" type="date" value="${esc(din)}"></div><div class="field"><label for="pl-s-out">${esc(tr('체크아웃'))}</label><input id="pl-s-out" type="date" value="${esc(dout)}"></div></div>
    <div class="field"><label for="pl-s-addr">${esc(tr('주소(현지 글자로 적으면 택시 기사에게 보여줄 수 있어요)'))}</label><div class="pl-addrow"><input id="pl-s-addr" maxlength="160" autocomplete="off" value="${esc(v.addr || '')}"><button type="button" data-act="stay-addr-find">${esc(tr('주소로 찾기'))}</button></div></div>
    <div class="pl-date-row"><div class="field"><label for="pl-s-code">${esc(tr('예약 번호'))}</label><input id="pl-s-code" maxlength="40" autocomplete="off" value="${esc(v.code || '')}"></div><div class="field"><label for="pl-s-paid">${esc(tr('결제한 금액 ({c})', { c: t.home }))}</label><input id="pl-s-paid" inputmode="decimal" autocomplete="off" value="${esc(v.paid || '')}"></div></div>
    <button type="button" class="btn primary" data-act="stay-save">${esc(tr('저장'))}</button>
    ${b && b.addr ? `<button type="button" class="pl-link" data-act="taxi" data-id="${esc(id)}">${esc(tr('택시 기사에게 보여주기'))}</button>` : ''}
    <button type="button" class="pl-link" data-act="cands">${esc(cands(t).length ? tr('숙소 비교 리스트 {n}곳', { n: cands(t).length }) : tr('숙소 비교 리스트'))}</button>
    ${b ? `<button type="button" class="pl-link-danger" data-act="stay-del">${esc(tr('이 숙소 지우기'))}</button>` : ''}`, () => {
    const inp = $('#pl-s-name');
    const adr = $('#pl-s-addr'); adr.addEventListener('input', () => { if (STAY && STAY.byAddr) { STAY.lat = STAY.lon = undefined; STAY.byAddr = false; $('#pl-s-pos').textContent = ''; } });
    inp.addEventListener('input', () => { const q = inp.value.trim(); if (!STAY.byAddr) { STAY.lat = STAY.lon = undefined; STAY.img = ''; } STAY.seq++; clearTimeout(pickT); $('#pl-s-pos').textContent = ''; if (q.length < 2 || jamoTail(q)) { paintStay([]); return; } pickT = setTimeout(() => staySearch(q, false), 260); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACT['stay-find'](); } });
  });
}
async function staySearch(q, full) {   // 입력 중에는 후보(국내 카카오·해외 위키백과), '위치 찾기'를 누르면 오픈스트리트맵까지
  if (!STAY || q.length < 2) return; const seq = STAY.seq; let items = [];
  try { const j = await H.api('GET', '/places/suggest?' + placeQs(q)); items = ((j && j.items) || []).slice(0, 4); } catch (e) { /* 아래로 */ }
  if (full && STAY && seq === STAY.seq) { try { const j = await H.api('GET', '/places/search?' + placeQs(q)); const have = new Set(items.map(llKey)); items = items.concat(((j && j.items) || []).filter(x => !have.has(llKey(x))).slice(0, 5)); } catch (e) { log('stay search failed: ' + (e && (e.code || e.message))); } }
  if (!STAY || seq !== STAY.seq) return;
  paintStay(items);
  if (full && !items.length) {   // 이름으로 못 찾으면 주소로(AI 는 쓰지 않는다 — 11-18 사용자)
    const ad = $('#pl-s-addr'); if (ad && ad.value.trim().length >= 4) { stayAddrFind(); return; }
    $('#pl-s-pos').textContent = tr('이름으로는 찾지 못했어요. 주소 칸에 주소(구글 지도나 예약 확인서의 주소)를 넣고 ‘주소로 찾기’를 눌러 보세요. 이름만 적어 두고 저장해도 돼요.');
  }
}
// 주소로 위치 찾기(서버 /places/geocode: 건물 번호를 떼고 다듬은 주소 → 안 되면 우편번호 근처). 숙소 이름·주소 칸은 그대로 두고 지도 위치만 정한다
async function stayAddrFind() {
  const inp = $('#pl-s-addr'); const q = inp ? inp.value.trim() : ''; const st = STAY; if (!st) return;
  if (q.length < 4) { toast(tr('주소를 적어 주세요.')); return; }
  const pos = $('#pl-s-pos'); if (pos) pos.textContent = tr('주소로 찾는 중…'); const seq = st.aseq = (st.aseq || 0) + 1;
  let it = null; try { const j = await H.api('GET', '/places/geocode?' + placeQs(q)); it = ((j && j.items) || [])[0] || null; } catch (e) { log('stay geocode failed: ' + (e && (e.code || e.message))); }
  if (STAY !== st || seq !== st.aseq || !$('#pl-s-pos')) return;
  if (!it) { $('#pl-s-pos').textContent = tr('이 주소로는 위치를 찾지 못했어요. 영어나 현지 글자로 된 주소(구글 지도·예약 확인서)를 넣어 보세요. 위치 없이 저장해도 돼요.'); return; }
  st.lat = +it.lat; st.lon = +it.lon; st.byAddr = true; paintStay([]);
  $('#pl-s-pos').textContent = it.approx === 'post' ? tr('우편번호 근처로 지도 위치를 정했어요.') : tr('주소로 지도 위치를 정했어요 · {p}', { p: [it.name, it.addr].filter(Boolean).join(', ').slice(0, 60) });
}
ACT['stay-addr-find'] = () => stayAddrFind();
function paintStay(items) {
  if (!STAY) return; STAY.items = items; const box = $('#pl-s-res'); if (!box) return; box.hidden = !items.length;
  box.innerHTML = items.map((x, i) => `<li class="row tap" data-act="stay-pick" data-i="${i}">${thumb(x)}<div class="row-body"><div class="row-title">${esc(x.name)}</div>${x.addr ? `<div class="row-desc">${esc(x.addr)}</div>` : ''}</div></li>`).join('');
}
ACT['stay-find'] = () => { const inp = $('#pl-s-name'); const q = inp ? inp.value.trim() : ''; if (!STAY || q.length < 2) { toast(tr('숙소 이름을 적어 주세요.')); return; } clearTimeout(pickT); STAY.seq++; $('#pl-s-pos').textContent = tr('찾는 중…'); staySearch(q, true); };
ACT['stay-pick'] = async (d) => {
  const st = STAY; const x = st && st.items[+d.i]; if (!x) return; st.seq++; clearTimeout(pickT);
  $('#pl-s-name').value = x.name; paintStay([]); $('#pl-s-pos').textContent = tr('찾는 중…');
  const ok = await resolvePlace(x); if (STAY !== st || !$('#pl-s-pos')) return;
  if (ok) { st.lat = +x.lat; st.lon = +x.lon; st.img = hasImg(x) ? x.img : ''; st.byAddr = false; }
  const ad = $('#pl-s-addr'); if (ad && !ad.value.trim() && x.addr) ad.value = x.addr;
  $('#pl-s-pos').textContent = ok ? tr('지도 위치가 정해졌어요.') : tr('위치를 불러오지 못했어요. 이름만 저장할 수 있어요.');
};
ACT['stay-save'] = () => {
  const t = trip(); if (!t || !STAY) return; const title = $('#pl-s-name').value.trim(); if (!title) { toast(tr('숙소 이름을 적어 주세요.')); return; }
  const din = $('#pl-s-in').value, dout = $('#pl-s-out').value; if (din && dout && dout < din) { toast(tr('날짜를 확인해 주세요.')); return; }
  const b = STAY.id ? t.bookings.find(x => x.id === STAY.id) : { id: C.uid(), c: C.now(), memo: '' }; if (!b) return; const paid = num($('#pl-s-paid').value);
  Object.assign(b, { kind: 'stay', title, start: din ? din + 'T15:00' : '', end: dout ? dout + 'T11:00' : '', addr: $('#pl-s-addr').value.trim(), code: $('#pl-s-code').value.trim(), paid: paid > 0 ? paid : 0 });
  if (Number.isFinite(STAY.lat) && Number.isFinite(STAY.lon)) { b.lat = STAY.lat; b.lon = STAY.lon; } else { delete b.lat; delete b.lon; } if (STAY.img) b.img = STAY.img; else delete b.img;
  if (!STAY.id) t.bookings.push(b); C.touch(b);
  for (const rec of STAY.files || []) saveFile(t, rec, [b.id]);   // 이 시트에서 올린 확인서
  for (const it of t.items) if (it.stayId === b.id && !it.del) {   // 일정에 넣어 둔 이 숙소도 같이 고친다
    it.name = b.title; it.addr = b.addr || ''; if (C.hasLL(b)) { it.lat = b.lat; it.lon = b.lon; } else { delete it.lat; delete it.lon; } if (b.img) it.img = b.img; else delete it.img; C.touch(it);
  }
  const addDay = STAY.addDay; persist(t); closeSheet();
  if (addDay) { addStayItem(t, b, addDay); return; }
  renderScreen(); toast(tr('숙소를 정했어요.'));
};
ACT['stay-del'] = () => { const t = trip(); const b = t && STAY && STAY.id ? t.bookings.find(x => x.id === STAY.id) : null; if (!b) return; b.del = true; C.touch(b); persist(t); closeSheet(); renderScreen(); };

// ---------- 숙소 비교 리스트 ----------
// 예약 사이트(트립닷컴·아고다 등)의 숙소 링크를 붙여 넣거나 그 앱의 '공유하기'로 보내면 후보로 쌓인다(예약 기록의 한 종류 kind:'cand' — 같이 가는 사람도 본다).
// 이름·사진·가격은 서버가 링크에서 읽어 온다(GET /links/preview). 사이트가 막으면 주소에서 읽은 이름만 들어가고, 이름과 가격은 고쳐 적을 수 있다.
const cands = (t) => C.live(t.bookings || []).filter(b => b.kind === 'cand');
const LINK_RE = /(?:https?:\/\/|(?=(?:[a-z0-9-]+\.)+[a-z]{2,}\/))[^\s<>"']{4,1500}/i;   // http 가 빠진 주소(trip.com/…)도 링크로 본다
const linkOf = (text) => { const m = LINK_RE.exec(String(text || '')); if (!m) return ''; let u = m[0].replace(/[.,)]+$/, ''); if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { const h = new URL(u).hostname; return /\.[a-z]{2,}$/i.test(h) ? u : ''; } catch (e) { return ''; } };
// 폰이 연 숙소 페이지 안에서 도는 스크립트(네이티브 LinkProbe 가 1.3초마다 부른다): 이름(og:title → 제목) · 대표 사진 · 가격.
// 가격은 ① 페이지에 박힌 구조화 정보(JSON-LD) ② 화면에 보이는 '통화 + 숫자' 글자 가운데 가장 크게 적힌 것(줄 그은 값은 뺀다). 아직 못 읽었으면 null, 마지막 차례(final)면 읽힌 만큼.
const PROBE_JS = `function(final){try{
var q=function(s){var e=document.querySelector(s);return e?(e.getAttribute('content')||''):'';};
var title=q('meta[property="og:title"]')||q('meta[name="twitter:title"]')||document.title||'';var img=q('meta[property="og:image"]')||q('meta[name="twitter:image"]')||'';
var CUR=[[/₩|￦|KRW|원/,'KRW'],[/¥|JPY|円|엔/,'JPY'],[/US\\$|USD|\\$/,'USD'],[/€|EUR/,'EUR']];var MIN={KRW:5000,JPY:500,USD:5,EUR:5};
var parse=function(t){t=String(t||'').replace(/\\s+/g,' ').trim();if(t.length>24||!/\\d/.test(t))return null;
var m=/^(?:(₩|￦|¥|US\\$|\\$|€|KRW|JPY|USD|EUR)\\s?)?(\\d{1,3}(?:[,.]\\d{3})+|\\d{2,9})(?:[.,]\\d{1,2})?\\s?(원|円|엔|KRW|JPY|USD|EUR)?$/.exec(t);if(!m||(!m[1]&&!m[3]))return null;
var n=parseFloat(m[2].replace(/[,.](?=\\d{3})/g,''));var s=(m[1]||'')+(m[3]||'');var c='';for(var i=0;i<CUR.length;i++)if(CUR[i][0].test(s)){c=CUR[i][1];break;}
return c&&n>=MIN[c]&&n<1e9?{n:n,c:c}:null;};
var price=0,cur='';
var lds=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<lds.length&&!price;i++){var tx=lds[i].textContent||'';var m=/"price"\\s*:\\s*"?([0-9][0-9.,]{1,12})"?[^{}]{0,80}"priceCurrency"\\s*:\\s*"([A-Z]{3})"/.exec(tx)||null;var m2=m?null:/"priceCurrency"\\s*:\\s*"([A-Z]{3})"[^{}]{0,80}"price"\\s*:\\s*"?([0-9][0-9.,]{1,12})"?/.exec(tx);
if(m){price=parseFloat(m[1].replace(/,/g,''));cur=m[2];}else if(m2){price=parseFloat(m2[2].replace(/,/g,''));cur=m2[1];}}
var per='',night=0;
if(!price){var els=document.querySelectorAll('span,div,strong,b,p,em,ins');var list=[];
var TOT=/총|합계|전체|결제 ?금액|최종|total|in total|for \\d+ nights?|\\d+\\s?박\\s?(?:요금|금액|합계|기준)?|\\d+泊|合計/i,NGT=/1\\s?박|박당|\\/\\s?박|per night|a night|\\/\\s?night|nightly|1泊|평균/i;
var ctxOf=function(el){var t='',e=el;for(var k=0;k<3&&e;k++){e=e.parentElement;if(!e)break;var x=(e.textContent||'').replace(/\\s+/g,' ').trim();if(x.length<=140){t=x;}else break;}return t;};
for(var j=0;j<els.length&&j<8000&&list.length<80;j++){var el=els[j];if(el.children.length>3)continue;var p=parse(el.textContent);if(!p)continue;
var r=el.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;var cs=getComputedStyle(el);var ps=el.parentElement?getComputedStyle(el.parentElement):cs;
if((cs.textDecorationLine||'').indexOf('line-through')>=0||(ps.textDecorationLine||'').indexOf('line-through')>=0||el.closest('del,s,strike'))continue;if(cs.visibility==='hidden'||cs.display==='none')continue;
var fs=parseFloat(cs.fontSize)||0;if(fs<11)continue;var cx=ctxOf(el);var isN=NGT.test(cx)&&!/\\d{2,}\\s?박/.test(cx);var isT=TOT.test(cx)&&!/^1\\s?박/.test(cx);
list.push({fs:fs,n:p.n,c:p.c,t:isT&&!isN?1:0,g:isN?1:0});}
var best=null;for(var a=0;a<list.length;a++){var L=list[a];if(!best||L.fs>best.fs+0.5||(Math.abs(L.fs-best.fs)<=0.5&&L.n<best.n))best=L;}
if(best&&best.fs>=13){
// 전체 금액으로 적힌 것이 따로 있으면 그것을 쓴다: 가장 크게 적힌 값(보통 1박 요금)보다 크고 같은 통화인 것 가운데 가장 작은 값(가장 싼 방의 합계)
var tot=null;for(var b2=0;b2<list.length;b2++){var T=list[b2];if(T.t&&T.c===best.c&&T.n>best.n*1.2&&(!tot||T.n<tot.n))tot=T;}
if(tot){price=tot.n;cur=tot.c;per='total';night=best.n;}
else if(best.t){price=best.n;cur=best.c;per='total';}
else{price=best.n;cur=best.c;per=best.g?'night':'';}}}
var blocked=/captcha|robot|access denied|verify|just a moment|보안 확인|로봇이 아닙니다/i.test(title)||/login|signin|sign-in|passport|captcha|challenge|verify/i.test(location.pathname)||/[?&]chal_t=/.test(location.search)||/^(온라인 호텔 예약|호텔, 항공권|Hotels?, Flights?|Online Hotel)/i.test(title)||(title||'').trim().length<4;   // 로그인·봇 확인·첫 화면으로 넘어간 것은 숙소 페이지가 아니다
if(!final&&(!price||!title||blocked))return null;
if(blocked)return JSON.stringify({ok:false,why:'wall'});
return JSON.stringify({ok:!!(title||price),title:title.slice(0,160),image:/^https:/.test(img)?img.slice(0,500):'',price:price||0,cur:cur||'',per:per||'',night:night||0});
}catch(e){return final?JSON.stringify({ok:false}):null;}}`;
const cleanStayTitle = (s) => String(s || '').replace(/\s+/g, ' ').replace(/\s*[|\-–—:·]\s*(Trip\.com|트립닷컴|Agoda|아고다|Booking\.com|부킹닷컴|Hotels\.com|호텔스닷컴|Expedia|익스피디아|Airbnb|에어비앤비|야놀자|여기어때|Tripadvisor|NOL).*$/i, '').replace(/\s*[-–|]\s*(최저가|특가|예약|호텔 예약|객실 예약|Deals?|Reviews?|리뷰).*$/i, '').replace(/^(예약|Book)\s+/i, '').trim().slice(0, 80);
const candNights = (t) => { const a = dOf(t.start), z = dOf(t.end); const n = a && z ? Math.round((z - a) / 86400000) : 0; return n > 0 ? n : 1; };
const candTotal = (b, t) => (b.per === 'night' ? b.price * candNights(t) : b.price);   // 1박 요금으로 적힌 것은 여행 박수를 곱해 견준다
const candPrice = (b, t) => (b.price > 0 ? (b.per === 'night' ? tr('1박 {m} · {n}박 약 {x}', { m: money(b.price, b.cur || t.home), n: candNights(t), x: money(candTotal(b, t), b.cur || t.home) }) : money(b.price, b.cur || t.home)) : '');
const candKrw = (b, t) => { if (!(b.price > 0)) return Infinity; const fx = fxNow(); const r = fx && fx.rates ? fx.rates[b.cur || t.home] : 0; const h = fx && fx.rates ? fx.rates[t.home] || 1 : 1; const v = candTotal(b, t); return r > 0 ? v * r / h : v; };   // 싼 순으로 늘어놓으려고 같은 통화 · 전체 금액으로
function candSheet() {
  const t = trip(); if (!t) return; const list = cands(t).sort((a, b) => candKrw(a, t) - candKrw(b, t) || (a.c || 0) - (b.c || 0));
  const min = list.length > 1 && list[0].price > 0 ? list[0].id : null;
  sheet(`<div class="sheet-title">${esc(tr('숙소 비교 리스트'))}</div>
    <div class="pl-addrow"><input id="pl-cd-url" maxlength="1500" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" inputmode="url" enterkeyhint="done" placeholder="${esc(tr('숙소 링크 붙여넣기'))}"><button type="button" data-act="cand-add">${esc(tr('추가'))}</button></div>
    <p class="caption" style="margin:6px 0 12px">${esc(tr('트립닷컴·아고다 같은 앱에서 숙소를 보다가 ‘공유하기’ → 여행여권을 고르면 여기에 바로 들어와요.'))}${H.probeLink ? ' ' + esc(tr('이름·사진·가격은 폰이 그 페이지를 열어 읽어 와요. 날짜·인원에 따라 실제 가격과 다를 수 있으니 확인해 주세요.')) : ''}</p>
    ${list.length ? `<ul class="pl-cands">${list.map(b => `<li class="pl-cand" data-id="${esc(b.id)}">${hasImg(b) ? `<img class="pl-cand-img" ${picAttrs(b.img)} alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="pl-cand-img none">${BED_SVG}</span>`}
      <div class="pl-cand-body"><div class="pl-cand-title">${esc(b.title || tr('이름 없는 숙소'))}</div><div class="pl-cand-sub">${esc([b.site || '', b.memo || ''].filter(Boolean).join(' · '))}</div>
      <div class="pl-cand-price ${b.price > 0 ? '' : 'none'}" data-act="cand-edit" data-id="${esc(b.id)}">${esc(candPrice(b, t) || (b.probing ? tr('가격 읽는 중…') : tr('가격 적기')))}${b.price > 0 && b.auto ? `<em>${esc(tr('자동'))}</em>` : ''}${min === b.id ? `<i>${esc(tr('가장 저렴'))}</i>` : ''}</div>
      <div class="pl-cand-acts"><button type="button" data-act="cand-open" data-id="${esc(b.id)}">${esc(tr('링크 열기'))}</button><button type="button" data-act="cand-edit" data-id="${esc(b.id)}">${esc(tr('고치기'))}</button>${H.probeLink ? `<button type="button" data-act="cand-refresh" data-id="${esc(b.id)}">${esc(b.probing ? tr('읽는 중…') : tr('다시 읽기'))}</button>` : ''}<button type="button" class="pick" data-act="cand-pick" data-id="${esc(b.id)}">${esc(tr('이 숙소로 정하기'))}</button></div></div></li>`).join('')}</ul>`
      : `<p class="pl-hint">${esc(tr('아직 후보가 없어요. 마음에 드는 숙소의 링크를 넣어 보세요.'))}</p>`}
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`, () => {
    const inp = $('#pl-cd-url'); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACT['cand-add'](); } });
    inp.addEventListener('paste', () => setTimeout(() => { if (linkOf(inp.value)) ACT['cand-add'](); }, 60));   // 붙여 넣으면 바로 추가
  });
}
ACT.cands = () => candSheet();
/** 링크 하나를 이 여행의 후보로 넣는다. 먼저 주소만으로 넣어 두고(바로 보이게), 서버가 읽어 온 이름·사진·가격으로 채운다 */
async function addCand(t, text, hintTitle) {
  const url = linkOf(text); if (!url) { toast(tr('숙소 링크를 넣어 주세요.')); return null; }
  const dup = cands(t).find(b => b.url === url); if (dup) { toast(tr('이미 비교 리스트에 있는 숙소예요.')); return dup; }
  let host = ''; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { host = ''; }
  const b = { id: C.uid(), kind: 'cand', c: C.now(), url, site: host, title: String(hintTitle || '').slice(0, 80), img: '', price: 0, cur: '', memo: '' };
  t.bookings.push(b); C.touch(b); persist(t); toast(tr('숙소 비교 리스트에 넣었어요.'));
  try {
    const j = await H.api('GET', '/links/preview?url=' + encodeURIComponent(url));
    if (j && j.ok && !b.del) {
      if (j.title && (!b.title || j.fetched)) b.title = String(j.title).slice(0, 80); if (j.site) b.site = String(j.site).slice(0, 40);
      if (j.image && /^https:\/\//.test(j.image)) b.img = String(j.image).slice(0, 500); if (j.price > 0 && !b.price) { b.price = +j.price; b.cur = j.cur || ''; }
      C.touch(b); persist(t);
    }
  } catch (e) { log('link preview failed: ' + (e && (e.code || e.message))); }
  probeCand(t, b);   // 이름·사진·가격은 폰이 그 페이지를 직접 열어 읽는다(몇 초 걸린다 — 기다리지 않고 채워지는 대로 그린다)
  return b;
}
async function probeCand(t, b) {
  if (!H.probeLink || b.probing) return; b.probing = true; candPaint(t);
  let r = null; try { r = await H.probeLink(b.url, PROBE_JS); } catch (e) { r = null; }
  delete b.probing;
  if (r && r.ok && !b.del) {
    const ti = cleanStayTitle(r.title); const words = (x) => String(x || '').toLowerCase().split(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龥]+/).filter(w => w.length >= 3);
    const alike = !b.title || words(b.title).some(w => ti.toLowerCase().includes(w));   // 주소에서 읽은 이름과 한 낱말이라도 겹칠 때만 바꾼다(다른 페이지의 제목이 들어오지 않게)
    if (ti && !b.named && alike) b.title = ti;
    if (r.image && /^https:\/\//.test(r.image) && !b.img) b.img = String(r.image).slice(0, 500);
    if (r.price > 0 && /^[A-Z]{3}$/.test(r.cur || '') && !(b.price > 0 && !b.auto)) { b.price = +r.price; b.cur = r.cur; b.auto = 1; b.per = r.per === 'night' ? 'night' : r.per === 'total' ? 'total' : ''; }   // 직접 적은 가격은 건드리지 않는다. 화면에 '1박'으로 적힌 값이면 그렇게 표시한다
    C.touch(b); persist(t);
  }
  log('link probe: ' + (r ? (r.ok ? 'ok price=' + (r.price || 0) + ' ' + (r.cur || '') + ' per=' + (r.per || '?') + ' night=' + (r.night || 0) : 'no data ' + (r.why || '')) : 'unavailable'));
  if (r && !r.ok && trip() === t && $('#pl-cd-url')) toast(tr('이 사이트는 가격을 자동으로 읽지 못했어요. 직접 적어 주세요.'));
  candPaint(t);
}
function candPaint(t) { if (trip() === t && $('#pl-cd-url') && !sheetEl().hidden) { const v = $('#pl-cd-url').value; candSheet(); const i = $('#pl-cd-url'); if (i && v) i.value = v; } }
let candBusy = 0;
ACT['cand-add'] = async () => {
  const t = trip(); const inp = $('#pl-cd-url'); if (!t || !inp) return; const v = inp.value.trim();
  if (!v) { if (Date.now() - candBusy > 2500) toast(tr('숙소 링크를 넣어 주세요.')); return; }   // 붙여 넣자마자 들어간 뒤 '추가'를 또 누른 것은 모른 척한다
  if (Date.now() - candBusy < 400) return;
  candBusy = Date.now(); inp.value = ''; const b = await addCand(t, v); candBusy = Date.now();
  if (b && trip() === t && $('#pl-cd-url')) candSheet(); else if (b && trip() === t) renderScreen();
};
ACT['cand-refresh'] = (d) => { const t = trip(); const b = t && t.bookings.find(x => x.id === d.id); if (!b) return; if (!H.probeLink) { toast(tr('이 기기에서는 자동으로 읽지 못해요.')); return; } candSheet(); probeCand(t, b); };
ACT['cand-open'] = (d) => { const t = trip(); const b = t && t.bookings.find(x => x.id === d.id); if (b && b.url && H.openExternal) H.openExternal(b.url, true); };
ACT['cand-edit'] = (d) => {
  const t = trip(); const b = t && t.bookings.find(x => x.id === d.id); if (!b) return;
  sheet(`<div class="sheet-title">${esc(tr('숙소 후보 고치기'))}</div>
    <div class="field"><label for="pl-cd-name">${esc(tr('숙소 이름'))}</label><input id="pl-cd-name" maxlength="80" autocomplete="off" value="${esc(b.title || '')}"></div>
    <div class="pl-date-row"><div class="field"><label for="pl-cd-price">${esc(tr('가격'))}</label><input id="pl-cd-price" inputmode="decimal" autocomplete="off" value="${esc(b.price > 0 ? String(b.price) : '')}"></div><div class="field"><label for="pl-cd-cur">${esc(tr('통화'))}</label><select id="pl-cd-cur">${[t.home, t.cur].concat(b.cur ? [b.cur] : []).filter((x, i, a) => x && a.indexOf(x) === i).map(c => `<option value="${esc(c)}" ${c === (b.cur || t.home) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>
    <div class="chips small" id="pl-cd-per" style="margin:-4px 0 12px">${[['total', tr('전체 숙박 금액')], ['night', tr('1박 금액')]].map(([k, n]) => `<button type="button" class="chip ${(b.per === 'night' ? 'night' : 'total') === k ? 'active' : ''}" data-v="${k}">${esc(n)}</button>`).join('')}</div>
    <div class="field"><label for="pl-cd-memo">${esc(tr('메모(조식 포함, 역에서 5분 등)'))}</label><input id="pl-cd-memo" maxlength="80" autocomplete="off" value="${esc(b.memo || '')}"></div>
    <button type="button" class="btn primary" data-act="cand-save" data-id="${esc(b.id)}">${esc(tr('저장'))}</button>
    <button type="button" class="pl-link-danger" data-act="cand-del" data-id="${esc(b.id)}">${esc(tr('후보에서 빼기'))}</button>`, () => chipGroup('#pl-cd-per'));
};
ACT['cand-save'] = (d) => {
  const t = trip(); const b = t && t.bookings.find(x => x.id === d.id); if (!b) return; const price = num($('#pl-cd-price').value);
  const nm0 = b.title; b.title = $('#pl-cd-name').value.trim().slice(0, 80); if (b.title !== nm0) b.named = 1; const per = chipVal('#pl-cd-per') === 'night' ? 'night' : 'total'; if ((price > 0 ? price : 0) !== (b.price || 0) || per !== (b.per === 'night' ? 'night' : 'total')) delete b.auto; b.per = per; b.price = price > 0 ? price : 0; b.cur = $('#pl-cd-cur').value || t.home; b.memo = $('#pl-cd-memo').value.trim();
  C.touch(b); persist(t); candSheet();
};
ACT['cand-del'] = (d) => { const t = trip(); const b = t && t.bookings.find(x => x.id === d.id); if (!b) return; b.del = true; C.touch(b); persist(t); candSheet(); renderScreen(); };
ACT['cand-pick'] = (d) => {   // 후보를 숙소로: 숙소 창에 이름·금액을 채워 연다(저장하면 숙소가 되고 후보는 남는다)
  const t = trip(); const b = t && t.bookings.find(x => x.id === d.id); if (!b) return;
  staySheet(null);
  const nm = $('#pl-s-name'); if (nm) { nm.value = b.title || ''; nm.dispatchEvent(new Event('input', { bubbles: true })); }
  const paid = $('#pl-s-paid'); if (paid && b.price > 0 && (b.cur || t.home) === t.home) paid.value = String(Math.round(candTotal(b, t)));
};
/** 밖에서 들어온 숙소 링크(다른 앱의 '공유하기' · phototravelmap://stay?u=…): 넣을 여행을 정해 비교 리스트에 넣는다 */
let pendingStayLink = null;
function takeStayLink(url, title) {
  if (!ST.ready) { pendingStayLink = { url, title }; return; }
  const td = C.today(); const open = trip(); const live = ST.trips.filter(t => !t.del && !t.sample && C.tripStatus(t, td) !== 'past');
  const go = async (t) => { closeSheet(); if (ST.tripId !== t.id || !ST.stack.length) openTrip(t.id, 'plan'); await addCand(t, url, title); if (trip() === t) candSheet(); };
  if (open && !open.sample && !open.del) { go(open); return; }
  const main = mainTrip(); if (main) { go(main); return; }
  if (live.length === 1) { go(live[0]); return; }
  if (!live.length) { toast(tr('먼저 여행을 만들어 주세요. 그 뒤에 숙소 링크를 다시 보내면 비교 리스트에 들어가요.')); return; }
  STAYLINK = { url, title };
  sheet(`<div class="sheet-title">${esc(tr('어느 여행의 숙소인가요?'))}</div><ul class="rows">${live.map(t => `<li class="row tap" data-act="staylink-to" data-id="${esc(t.id)}"><span class="pl-thumb ic">${BED_SVG}</span><div class="row-body"><div class="row-title">${esc(t.title || tr('이름 없는 여행'))}</div><div class="row-desc">${esc(rangeText(t))}</div></div><span class="chev"></span></li>`).join('')}</ul><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
}
let STAYLINK = null;
ACT['staylink-to'] = async (d) => { const t = ST.trips.find(x => x.id === d.id && !x.del); const L = STAYLINK; STAYLINK = null; if (!t || !L) return; closeSheet(); openTrip(t.id, 'plan'); await addCand(t, L.url, L.title); if (trip() === t) candSheet(); };

// '도착지 추가하기' · '출발지 추가하기': 저장해 둔 가는 편의 마지막 도착지(첫날 일정 맨 앞)·오는 편의 첫 출발지(마지막 날 일정 맨 끝)를 장소로 불러온다.
// 표에는 이름만 있으므로 위치는 그 이름으로 찾아 붙이고, 못 찾으면 이름만 넣는다. 넣고 나면 거기서 다음 장소까지의 이동 수단을 고를 수 있다.
function wayAddHtml(t, b, end, items) {
  const name = b && (end === 'to' ? b.to : b.from); if (!name) return '';
  const at = end === 'to' ? items[0] : items[items.length - 1]; if (at && at.wayId === b.id && at.wayEnd === end) return '';   // 이미 그 자리에 있다
  return `<li class="pl-addli"><button type="button" class="pl-addstay way" data-act="way-add" data-id="${esc(b.id)}" data-v="${end}"><span class="pl-way-ic">${MOVE_ICON[b.mode] || MOVE_ICON.auto}</span><span class="pl-addstay-t">${esc(end === 'to' ? tr('도착지 추가하기') : tr('출발지 추가하기'))}</span><span class="pl-addstay-s">${esc(name)}</span></button></li>`;
}
ACT['way-add'] = async (d) => {
  const t = trip(); const day = ST.day; const b = t && t.bookings.find(x => x.id === d.id); if (!b || !day || day === 'all') return;
  const end = d.v === 'from' ? 'from' : 'to'; const name = (end === 'to' ? b.to : b.from) || ''; if (!name) return;
  if (b.noEnd && b.noEnd[end]) { delete b.noEnd[end]; C.touch(b); }   // 버튼으로 되살렸으면 다시 자동으로 제자리에 둔다
  const items = C.dayItems(t, day); const first = items[0], last = items[items.length - 1];
  const when = end === 'to' ? (b.end || '').slice(11, 16) : (b.start || '').slice(11, 16);
  const it = { id: C.uid(), day, sort: end === 'to' ? C.midKey('', first ? first.sort : '') : C.midKey(last ? last.sort : '', ''), kind: 'place', name, addr: '', src: 'way', wayId: b.id, wayEnd: end, c: C.now(), u: C.now() };
  if (when) it.memo = end === 'to' ? tr('{t} 도착', { t: when }) : tr('{t} 출발', { t: when });
  const known = end === 'to' ? b.toPt : b.fromPt; if (known && C.hasLL(known)) { it.lat = +known.lat; it.lon = +known.lon; }   // 공항이면 위치를 이미 안다
  t.items.push(it); persist(t); renderScreen();
  if (C.hasLL(it)) { toast(tr('일정에 넣었어요.')); return; }
  // 위치 찾기: 터미널 표시(T1, I)는 떼고 찾는다. 이름이 통하는 첫 결과만 쓴다
  const q = name.replace(/\s+(?:T\d|[A-Z]|[Il|]|터미널\s*\d+|Terminal\s*\d+)$/i, '').trim(); let hit = null;
  try { const j = await H.api('GET', '/places/suggest?' + placeQs(q)); const key = q.replace(/\s+/g, '').slice(0, 2).toLowerCase(); const cand = ((j && j.items) || []).find(x => String(x.name || '').replace(/\s+/g, '').toLowerCase().includes(key)) || null; hit = cand && (await resolvePlace(cand)) ? cand : null; } catch (e) { hit = null; }
  const cur = t.items.find(x => x.id === it.id && !x.del);
  if (cur && hit) { cur.lat = +hit.lat; cur.lon = +hit.lon; if (hit.addr) cur.addr = hit.addr; if (hasImg(hit)) cur.img = hit.img; C.touch(cur); persist(t); renderScreen(); }
  toast(hit ? tr('일정에 넣었어요.') : tr('이름만 넣었어요. 위치는 그 장소를 눌러 찾을 수 있어요.'));
};

// 일정 맨 밑의 '숙소 추가하기': 따로 저장해 둔 숙소를 그 날 일정의 끝에 장소로 불러온다(위치·주소·사진까지). 넣고 나면 앞 장소에서 숙소까지의 이동 수단도 고를 수 있다
function stayForDay(t, d) { const list = C.stays(t); return C.stayOn(t, d) || C.stayOn(t, C.addDays(d, -1)) || (list.length === 1 ? list[0] : null); }
function stayAddHtml(t, d, items) {
  const s = stayForDay(t, d); const last = items[items.length - 1]; if (s && last && last.stayId === s.id) return '';   // 이미 끝에 있다
  return `<button type="button" class="pl-addstay" data-act="stay-add"><span class="pl-way-ic">${BED_SVG}</span><span class="pl-addstay-t">${esc(tr('숙소 추가하기'))}</span><span class="pl-addstay-s">${esc(s ? s.title : C.stays(t).length ? tr('저장해 둔 숙소에서 고르기') : tr('숙소를 먼저 저장해요'))}</span></button>`;
}
ACT['stay-add'] = () => {
  const t = trip(); const d = ST.day; if (!t || !d || d === 'all') return; const list = C.stays(t);
  if (!list.length) { staySheet(null, d); return; }   // 저장해 둔 숙소가 없으면 먼저 저장한다(저장하면 이 날 끝에 넣는다)
  const s = stayForDay(t, d); if (s) { addStayItem(t, s, d); return; }
  sheet(`<div class="sheet-title">${esc(tr('어느 숙소를 넣을까요?'))}</div><ul class="rows">${list.map(x => `<li class="row tap" data-act="stay-add-pick" data-id="${esc(x.id)}"><span class="pl-thumb ic">${BED_SVG}</span><div class="row-body"><div class="row-title">${esc(x.title)}</div><div class="row-desc">${esc([dtRangeDay(x), stayNights(t, x)].filter(Boolean).join(' · '))}</div></div></li>`).join('')}</ul>
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['stay-add-pick'] = (d) => { const t = trip(); const s = t && C.stays(t).find(x => x.id === d.id); if (s && ST.day && ST.day !== 'all') addStayItem(t, s, ST.day); };
function addStayItem(t, s, day) {
  const items = C.dayItems(t, day); const last = items[items.length - 1];
  if (last && last.stayId === s.id) { closeSheet(); toast(tr('이미 이 날 일정 끝에 숙소가 있어요.')); return; }
  const it = { id: C.uid(), day, sort: C.midKey(last ? last.sort : '', ''), kind: 'place', name: s.title, addr: s.addr || '', src: 'stay', stayId: s.id, c: C.now(), u: C.now() };
  if (C.hasLL(s)) { it.lat = +s.lat; it.lon = +s.lon; } if (hasImg(s)) it.img = s.img;
  t.items.push(it); persist(t); closeSheet(); renderScreen(); toast(tr('숙소를 이 날 일정 끝에 넣었어요.'));
}

// ---------- AI 일정 도우미 ----------
// 앱은 홈서버(/ai/plan, /ai/chat)만 부른다 — 모델 키는 서버에만 있다. 서버가 장소 후보(위키보이지·관광공사·위키백과)와 환율을 먼저 모아 모델에 주고,
// 좌표·사진은 서버가 확인한 값만 돌려준다. 모델 답이 수십 초 걸려서 서버는 작업 번호(202)를 주고, 앱은 /ai/job/<번호>?wait=20 으로 끝날 때까지 받아 간다.
// 대화는 여행별로 메모리에만 둔다(앱을 다시 켜면 비워진다). 받은 일정은 '이 일정 담기'를 눌러야 여행에 들어간다.
const AIS = {};
const aiOf = (t) => (AIS[t.id] = AIS[t.id] || { msgs: [], busy: false, stage: '', pace: 'normal', likes: [], iv: null, ans: {} });
const AI_PACE = [['relaxed', '여유롭게'], ['normal', '보통|pace'], ['packed', '알차게']];
const AI_LIKES = [['food', '맛집'], ['sight', '명소'], ['shop', '쇼핑'], ['nature', '자연'], ['culture', '역사·문화'], ['cafe', '카페'], ['night', '야경'], ['relax', '온천·휴식']];
const AI_STAGE = { places: '가 볼 만한 곳을 모으고 있어요…', model: '일정을 짜고 있어요. 30초에서 1분쯤 걸려요…', check: '장소를 확인하고 있어요…' };
const aiOn = () => !!(ST.aiInfo && ST.aiInfo.available);
const userPlaces = (t) => C.live(t.items).filter(i => i.kind !== 'note' && !i.wayId && !i.stayId);   // 직접 담은 장소(자동으로 든 공항·터미널, 불러온 숙소는 빼고)
async function refreshAi() {   // 서버에 자동 일정 기능이 켜져 있는지(꺼져 있으면 버튼을 숨긴다)
  if (!H || !H.api) return; const was = aiOn();
  try { const j = await H.api('GET', '/ai/status'); ST.aiInfo = { available: !!(j && j.available), left: (j && j.left) || null }; } catch (e) { ST.aiInfo = { available: false, left: null }; }
  if (aiOn() !== was) { const top = ST.stack[ST.stack.length - 1]; if (top && top.name === 'trip' && sheetEl().hidden && !ST.edit) renderScreen(); }
}
ACT.ai = () => { const t = trip(); if (!t) return; closeSheet(); if (t.sample) { toast(tr('샘플 여행에서는 쓸 수 없어요. 새 여행을 만들어 보세요.')); return; } show('ai'); refreshAi().then(() => { if (aiOnScreen(t)) renderScreen(); }); };   // 남은 횟수를 새로 받아 화면에
const planPlaces = (p) => ((p && p.days) || []).reduce((n, d) => n + (d.items || []).filter(x => x.kind !== 'note').length, 0);
const planDay = (t, d, i) => { const days = C.tripDays(t); return d.date && days.includes(d.date) ? d.date : days[(d.n || i + 1) - 1] || null; };
function planCard(t, m, idx) {
  const p = m.plan; const costTxt = (c) => (c && c.amt > 0 ? tr('약 {m}', { m: money(c.amt, c.cur || t.cur) }) : '');
  const li = (x) => (x.kind === 'note'
    ? `<li class="note"><span class="pl-thumb ic">${PEN_SVG}</span><div class="pl-ai-it"><b>${esc(x.name)}</b>${x.memo ? `<span>${esc(x.memo)}</span>` : ''}<small>${esc([x.time || '', costTxt(x.cost)].filter(Boolean).join(' · '))}</small></div></li>`
    : `<li>${thumb(x)}<div class="pl-ai-it"><b>${esc(x.name)}</b>${x.memo ? `<span>${esc(x.memo)}</span>` : ''}<small>${esc([x.time || '', Number.isFinite(x.stay) ? durText(x.stay) : '', costTxt(x.cost)].filter(Boolean).join(' · '))}</small></div></li>`);
  let h = '<div class="pl-ai-plan">';
  (p.days || []).forEach((d, i) => {
    const date = planDay(t, d, i);
    h += `<div class="pl-ai-day"><div class="pl-ai-dayhead"><b>${esc(tr('{n}일차', { n: d.n || i + 1 }))}</b>${date ? `<span>${esc(longDay(date))}</span>` : ''}${d.title ? `<i>${esc(d.title)}</i>` : ''}</div><ol>${(d.items || []).map(li).join('')}</ol></div>`;
  });
  if (p.wish && p.wish.length) h += `<div class="pl-ai-day"><div class="pl-ai-dayhead"><b>${esc(tr('시간이 남으면'))}</b></div><p class="pl-ai-wish">${esc(p.wish.map(x => x.name).join(' · '))}</p></div>`;
  h += budgetHtml(t, p.budget);
  if (p.tips && p.tips.length) h += `<ul class="pl-ai-tips">${p.tips.slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (m.attr) h += `<p class="caption">${esc(tr('장소 정보: {s}', { s: m.attr }))}</p>`;
  h += m.applied ? `<p class="pl-ai-done">${esc(tr('이 일정을 여행에 담았어요.'))}</p>` : `<div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="ai-again">${esc(tr('다시 짜기'))}</button><button type="button" class="btn primary" data-act="ai-apply" data-i="${idx}">${esc(tr('이 일정 담기'))}</button></div>`;
  return h + '</div>';
}
function budgetHtml(t, b) {
  if (!b || !(b.total > 0)) return '';
  const cats = PD.CATS.map(c => [c, (b.byCat || {})[c[0]] || 0]).filter(x => x[1] > 0); const cur = b.cur || t.cur; const n = b.people > 1 ? b.people : 0;
  return `<div class="pl-ai-budget"><div class="pl-ai-dayhead"><b>${esc(tr('예상 경비(대략)'))}</b><span>${esc(tr('1인 기준 · 항공권 제외'))}</span></div>${cats.map(([c, v]) => `<div class="r"><span>${esc(tr(c[1]))}</span><b>${esc(money(v, cur))}</b></div>`).join('')}
      <div class="r sum"><span>${esc(tr('1인 합계'))}</span><b>${esc(tr('약 {m}', { m: money(b.total, cur) }))}${b.totalHome > 0 && (b.home || t.home) !== cur ? ` <small>${esc(money(b.totalHome, b.home || t.home))}</small>` : ''}</b></div>
      ${n ? `<div class="r"><span>${esc(tr('{n}명 합계', { n }))}</span><b>${esc(tr('약 {m}', { m: b.groupTotalHome > 0 ? money(b.groupTotalHome, b.home || t.home) : money(b.groupTotal || b.total * n, cur) }))}</b></div>` : ''}
      ${b.note ? `<p class="caption">${esc(b.note)}</p>` : ''}<p class="caption">${esc(tr('AI가 어림한 값이에요. 실제와 다를 수 있어요.'))}</p></div>`;
}
// ---- AI 도우미의 질문(대화로 하나씩 묻는다): 누구와 · 강도 · 하고 싶은 것 · 경비 · 이동 범위 · 투어 · 그 밖에 ----
// 고르는 답은 칩·막대로, 그 밖의 답은 아래 입력 칸에 적는다(적은 글은 서버의 'traveler note' 로 간다). 답은 a.ans 에, 지금 몇 번째인지는 a.iv.step 에 둔다
const IV_WHO = [['solo', '혼자'], ['couple', '연인·배우자와'], ['friends', '친구와'], ['kids', '아이와 함께 가족'], ['parents', '부모님과'], ['group', '여럿이 단체로']];
const IV_BUDGET = [['low', '알뜰하게'], ['mid', '적당히'], ['high', '넉넉하게']];
const IV_DIST = [['near', '숙소 근처 위주로'], ['transit', '대중교통 30분 안팎까지'], ['far', '멀어도 좋아요(근교 포함)']];
const IV_TOUR = [['yes', '넣어 주세요'], ['maybe', '좋은 게 있으면'], ['no', '안 할래요']];
const IV_LEVEL = ['아주 느긋하게', '느긋하게', '적당히|level', '알차게|level', '아주 빡빡하게'];
const IVQ = [
  { k: 'who', label: '함께|iv', q: '누구와 함께 가나요?', opts: IV_WHO, ph: '직접 적어도 돼요 (예: 초등학생 아이 둘과)' },
  { k: 'pace', label: '일정 강도', q: '일정은 빡빡한 게 좋아요, 느긋한 게 좋아요? 막대를 끌어서 정해 주세요.', ph: '직접 적어도 돼요 (예: 오전은 쉬고 싶어요)' },
  { k: 'likes', label: '하고 싶은 것', q: '특히 하고 싶은 것이 있나요? 여러 개 골라도 돼요.', ph: '직접 적어도 돼요 (예: 라멘, 미술관)' },
  { k: 'budget', label: '경비|iv', q: '경비는 어느 정도로 생각하세요? 항공권과 숙소는 빼고요. 금액을 직접 적어도 돼요.', opts: IV_BUDGET, ph: '예: 50만원' },
  { k: 'dist', label: '이동|iv', q: '이동은 어디까지 괜찮아요?', opts: IV_DIST, ph: '직접 적어도 돼요 (예: 걷는 건 조금만)' },
  { k: 'tour', label: '투어|iv', q: '가이드 투어나 체험도 넣을까요?', opts: IV_TOUR, ph: '직접 적어도 돼요 (예: 스노클링은 꼭)' },
  { k: 'extra', label: '그 밖에', q: '마지막이에요. 꼭 가고 싶은 곳이나 피하고 싶은 것이 있으면 적어 주세요.', ph: '예: 디즈니랜드는 꼭, 회는 못 먹어요' },
];
const ivLevel = (v) => Math.max(0, Math.min(4, Math.floor((+v || 0) / 20.01)));   // 막대 0~100 → 다섯 단계
const ivName = (list, k) => tr((list.find(x => x[0] === k) || ['', ''])[1]);
// 금액을 적었는데 1인 금액인지 모두 합친 금액인지 알 수 없으면(여럿이 가는 여행) 그것만 따로 한 번 더 묻는다 — 미리 골라 두면 못 보고 지나친다
const IV_PER = { k: 'budgetPer', label: '', q: '', ph: '예: 1인 금액이에요' };
function ivFlow(t, a) {
  const b = (a.ans || {}).budget; const n = C.people(t).length || 1;
  return b && b.amt > 0 && !b.said && n > 1 ? IVQ.reduce((o, x) => o.concat(x.k === 'budget' ? [x, IV_PER] : [x]), []) : IVQ;
}
const ivCur = (t, a) => { const f = ivFlow(t, a); return a.iv && a.iv.step < f.length ? f[a.iv.step] : null; };
const ivPer = (a) => { const s = a.ans || {}; return (s.budgetPer && s.budgetPer.k) || (s.budget && s.budget.per) || ''; };
const ivQ = (t, a, q) => (q.k === 'budgetPer' ? tr('{m}은 한 사람 금액인가요, {n}명이 함께 쓰는 금액인가요?', { m: money(a.ans.budget.amt, t.home), n: C.people(t).length || 1 }) : tr(q.q));
const ivPerOpts = (t) => [['person', tr('1인 금액')], ['group', tr('{n}명 합친 금액', { n: C.people(t).length || 1 })]];
function ivAns(t, a, k) {   // 답을 말풍선에 적을 글로
  const x = (a.ans || {})[k]; const none = tr(k === 'extra' ? '없어요' : '상관없어요');
  if (k === 'likes') return aiLikes(a).concat(x && x.text ? [x.text] : []).join(', ') || none;
  if (!x) return none;
  if (x.text) return x.text;
  if (k === 'who' && x.k) return ivName(IV_WHO, x.k);
  if (k === 'pace' && Number.isFinite(x.v)) return tr(IV_LEVEL[ivLevel(x.v)]);
  if (k === 'budget') return x.amt > 0 ? (x.said ? tr(x.per === 'group' ? '모두 합쳐 {m}' : '1인 {m}', { m: money(x.amt, t.home) }) : money(x.amt, t.home)) : x.k ? ivName(IV_BUDGET, x.k) : none;
  if (k === 'budgetPer' && x.k) return (ivPerOpts(t).find(o => o[0] === x.k) || ['', none])[1];
  if (k === 'dist' && x.k) return ivName(IV_DIST, x.k);
  if (k === 'tour' && x.k) return ivName(IV_TOUR, x.k);
  return none;
}
// "50만원", "1인 30만", "총 100만원", "800 dollars" → { amt, per }. 숫자가 없으면 null
function ivMoney(text) {
  const s = String(text || '').replace(/[,\s]/g, ''); const m = s.replace(/1인당?|인당|1명당?|한명당?|1人|一人/g, '').match(/(\d+(?:\.\d+)?)(억|천만|백만|만|천|k|K|m|M)?/); if (!m) return null;
  const mul = { 억: 1e8, 천만: 1e7, 백만: 1e6, 만: 1e4, 천: 1e3, k: 1e3, K: 1e3, m: 1e6, M: 1e6 }[m[2]] || 1; const amt = Math.round(parseFloat(m[1]) * mul); if (!(amt > 0)) return null;
  return { amt, per: ivPerOf(s) };
}
const ivPerOf = (text) => { const s = String(text || '').replace(/\s/g, ''); return /1인|인당|한사람|한명|각자|혼자|perperson|each|一人|1人/i.test(s) ? 'person' : /전체|총|모두|합쳐|합친|다해서|같이|함께|total|together|everyone|全部|合計|全員/i.test(s) ? 'group' : ''; };
// 답 고르기는 대화 속이 아니라 입력 칸 바로 위에 붙인다(채팅의 빠른 답장처럼): 칩은 누르면 바로 보내지고, 막대·여러 개 고르기는 '보내기'로 보낸다. 어느 질문이든 글로 적어 보내도 된다
function ivDock(t, a, q) {
  const chip = (act, k, n, on) => `<button type="button" class="chip ${on ? 'active' : ''}" ${act ? `data-act="${act}"` : ''} data-v="${esc(k)}">${esc(n)}</button>`; const cur = a.ans[q.k] || {};
  const none = chip('iv-pick', '', tr(q.k === 'extra' ? '없어요' : '상관없어요'), false);
  let h = `<div class="pl-qr" data-q="${q.k}">`;
  if (q.k === 'pace') {
    const v = Number.isFinite(cur.v) ? cur.v : 50;
    h += `<div class="pl-qr-level" id="pl-iv-level">${esc(tr(IV_LEVEL[ivLevel(v)]))}</div><div class="pl-qr-range"><span>${esc(tr('느긋하게'))}</span><input type="range" id="pl-iv-pace" min="0" max="100" step="1" value="${v}" aria-label="${esc(tr('일정 강도'))}"><span>${esc(tr('빡빡하게'))}</span></div>`;
  } else if (q.k === 'likes') {
    h += `<div class="pl-qr-chips" id="pl-ai-likes">${AI_LIKES.map(([k, n]) => chip('', k, tr(n), a.likes.includes(k))).join('')}</div>`;
  } else h += `<div class="pl-qr-chips">${(q.k === 'budgetPer' ? ivPerOpts(t) : (q.opts || []).map(([k, n]) => [k, tr(n)])).map(([k, n]) => chip('iv-pick', k, n, false)).join('')}${q.k === 'budgetPer' ? '' : none}</div>`;
  const hint = q.k === 'pace' ? tr('막대를 끌고 보내기를 눌러 주세요. 글로 적어도 돼요.') : q.k === 'likes' ? tr('여러 개 고르고 보내기를 눌러 주세요. 글로 적어도 돼요.') : tr('눌러서 고르거나 글로 적어 보내 주세요.');
  h += `<div class="pl-qr-foot"><span>${esc(hint)}</span>${a.iv.step > 0 ? `<button type="button" data-act="iv-back">${esc(tr('이전 질문'))}</button>` : ''}<button type="button" data-act="iv-skip">${esc(tr('바로 짜기'))}</button></div></div>`;
  return h;
}
function ivSet(k, val) {
  const t = trip(); if (!t) return; const a = aiOf(t); if (!a.iv) return; if (val) a.ans[k] = val; else delete a.ans[k];
  if (k === 'budget') delete a.ans.budgetPer;   // 경비를 다시 답하면 1인/합친 금액도 다시 묻는다
  a.iv.step = Math.min(ivFlow(t, a).length, a.iv.step + 1); renderScreen();
}
function ivStart(t) { const a = aiOf(t); if (a.busy) return; a.iv = { step: 0 }; a.ans = {}; a.likes = []; a.pace = 'normal'; a.msgs = []; renderScreen(); }
ACT['iv-pick'] = (d) => { const t = trip(); if (!t) return; const a = aiOf(t); const q = ivCur(t, a); if (!q) return; ivSet(q.k, d.v ? { k: d.v } : null); };
ACT['iv-back'] = () => { const t = trip(); if (!t) return; const a = aiOf(t); if (!a.iv || a.iv.step < 1 || a.busy) return; a.iv.step = Math.min(a.iv.step, ivFlow(t, a).length) - 1; renderScreen(); };
ACT['iv-skip'] = () => { const t = trip(); if (!t) return; const a = aiOf(t); if (!a.iv) return; a.iv.step = ivFlow(t, a).length; renderScreen(); };
ACT['iv-start'] = () => { const t = trip(); if (t) ivStart(t); };
// 질문에 '보내기'로 답한 것(글 · 막대 · 여러 개 고르기). 받았으면 true
function ivSend(t, a, q, text) {
  if (q.k === 'pace') {
    if (text) { a.pace = /빡|알차|많이|꽉|packed|busy|full|ぎっしり|たくさん/i.test(text) ? 'packed' : /느긋|여유|천천|쉬|relax|slow|easy|ゆっくり|のんびり/i.test(text) ? 'relaxed' : 'normal'; ivSet('pace', { text: text.slice(0, 80) }); return true; }
    const el = $('#pl-iv-pace'); const v = el ? +el.value : 50; a.pace = v < 34 ? 'relaxed' : v < 67 ? 'normal' : 'packed'; ivSet('pace', { v }); return true;
  }
  if (q.k === 'likes') { ivSet('likes', text ? { text: text.slice(0, 80) } : null); return true; }
  if (!text) { toast(tr('눌러서 고르거나 글로 적어 보내 주세요.')); return true; }
  if (q.k === 'budget') { const m = ivMoney(text); ivSet('budget', m ? { amt: m.amt, per: m.per || 'person', said: !!m.per } : { text: text.slice(0, 80) }); return true; }
  if (q.k === 'budgetPer') { const per = ivPerOf(text); if (!per) { toast(tr('1인 금액인지 모두 합친 금액인지 골라 주세요.')); return true; } ivSet('budgetPer', { k: per }); return true; }
  ivSet(q.k, { text: text.slice(0, 80) }); return true;
}
// 질문의 답을 요청에 싣는다: 고른 값은 prefs(서버가 정해진 값만 받는다), 적은 글은 note
function aiPrefs(a) {
  const s = a.ans || {}; const p = {}; const notes = []; const say = (label, x) => { if (x && x.text) notes.push(label + ': ' + x.text); };
  if (s.who && s.who.k) p.who = s.who.k; say('with', s.who);
  if (s.pace && Number.isFinite(s.pace.v)) p.level = ivLevel(s.pace.v) + 1; say('pace', s.pace);
  say('wants', s.likes);
  if (s.budget) { if (s.budget.k) p.budget = s.budget.k; if (s.budget.amt > 0) { p.budgetAmt = s.budget.amt; p.budgetPer = ivPer(a) === 'group' ? 'group' : 'person'; } } say('budget', s.budget);
  if (s.dist && s.dist.k) p.dist = s.dist.k; say('range', s.dist);
  if (s.tour && s.tour.k) p.tour = s.tour.k; say('tours', s.tour);
  say('also', s.extra);
  const o = {}; if (Object.keys(p).length) o.prefs = p; if (notes.length) o.note = notes.join(' / ').slice(0, 300);
  return o;
}
SCREENS.ai = () => {
  const t = trip(); if (!t) return { title: '', html: '' }; const a = aiOf(t); const has = userPlaces(t).some(i => i.day);   // 공항·숙소만 들어 있는 것은 '처음'으로 본다
  if (!a.iv && !has && !a.msgs.length) a.iv = { step: 0 };   // 빈 여행이면 바로 묻기 시작한다
  const dest = (t.dests || []).map(d => d.name).join('·') || t.title; const bub = (who, html) => `<div class="pl-bub ${who}">${html}</div>`; const left = ST.aiInfo && ST.aiInfo.left; const flow = ivFlow(t, a); const q = ivCur(t, a);
  let h = '<div class="pl-ai">';
  h += bub('bot', esc(a.iv ? tr('{d} {n} 일정을 짜 드릴게요. 몇 가지만 여쭤볼게요. 고르거나 아래에 적어 주세요.', { d: dest, n: nightsText(t) }) : tr('지금 일정을 바탕으로 고쳐 드릴게요. 바꾸고 싶은 것을 아래에 적어 주세요. 처음부터 다시 짤 수도 있어요.')));
  h += `<p class="pl-ai-ctx">${esc(aiCtxText(t))}</p>`;
  if (aiFreeText()) h += `<p class="pl-ai-ctx pl-ai-free">${esc(aiFreeText())}</p>`;
  const leftHtml = left ? `<p class="caption" style="margin:10px 0 0;text-align:center">${esc((() => { const r = aiRest(); return r.free ? tr('처음 한 번 무료 · 오늘 {n}번 더 쓸 수 있어요', { n: r.rest }) : tr('티켓 {c}회 · 오늘 {n}번 더 쓸 수 있어요', { c: r.credits, n: r.rest }); })())}</p>` : '';
  if (a.iv) {
    flow.slice(0, a.iv.step).forEach((x) => { h += bub('bot', esc(ivQ(t, a, x))) + bub('me', esc(ivAns(t, a, x.k))); });
    if (q) h += bub('bot', esc(ivQ(t, a, q)));
    else {
      const sum = IVQ.filter(x => a.ans[x.k] || (x.k === 'likes' && a.likes.length)).map(x => '· ' + tr(x.label) + ': ' + (x.k === 'budget' && a.ans.budget.amt > 0 ? tr(ivPer(a) === 'group' ? '모두 합쳐 {m}' : '1인 {m}', { m: money(a.ans.budget.amt, t.home) }) : ivAns(t, a, x.k)));
      h += bub('bot', esc(sum.length ? tr('좋아요. 이렇게 짜 볼게요.') + '\n' + sum.join('\n') : tr('좋아요. 여행지와 날짜에 맞춰 무난하게 짜 볼게요.')));
      h += `<div class="pl-ai-opt"><button type="button" class="btn primary" data-act="ai-plan" ${a.busy ? 'disabled' : ''}>${esc(a.msgs.some(m => m.plan) ? tr('이 조건으로 다시 짜기') : tr('일정 짜기'))}</button>${leftHtml}</div>`;
    }
  } else h += `<div class="pl-ai-opt"><button type="button" class="btn secondary" data-act="iv-start" ${a.busy ? 'disabled' : ''}>${esc(tr('처음부터 다시 짜기'))}</button>${leftHtml}</div>`;
  a.msgs.forEach((m, i) => { h += m.role === 'user' ? bub('me', esc(m.text)) : bub('bot', esc(m.text)) + (m.plan ? planCard(t, m, i) : m.budget ? `<div class="pl-ai-plan only-budget">${budgetHtml(t, m.budget)}</div>` : '') + `<button type="button" class="pl-ai-flag" data-act="ai-report" data-i="${i}">${esc(tr('이 답 신고'))}</button>`; });   // AI 답마다 신고(구글 플레이 AI 생성 콘텐츠 정책)
  if (a.busy) h += bub('bot', `<span class="pl-dots"><i></i><i></i><i></i></span><span id="pl-ai-stage">${esc(tr(AI_STAGE[a.stage] || AI_STAGE.model))}</span>`);
  h += '</div>';
  const restart = a.iv && !q && !a.busy ? `<button type="button" class="pl-ai-restart" data-act="iv-start">${esc(tr('처음부터 다시 짜기'))}</button>` : '';   // 질문이 끝난 뒤에는 언제든 처음으로(질문 중에는 '이전 질문'으로 고친다)
  const cta = `${q && !a.busy ? ivDock(t, a, q) : restart}<div class="pl-ai-input"><input id="pl-ai-q" maxlength="200" autocomplete="off" enterkeyhint="send" placeholder="${esc(q ? tr(q.ph) : tr('예: 둘째 날은 여유롭게, 온천을 넣어 줘'))}" ${a.busy ? 'disabled' : ''}><button type="button" data-act="ai-send" ${a.busy ? 'disabled' : ''}>${esc(tr('보내기'))}</button></div>`;
  return { title: tr('AI 일정 도우미'), right: ticketChip(), html: h, cta, after: (el) => {
    const likes = $('#pl-ai-likes'); if (likes) likes.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; const i = a.likes.indexOf(c.dataset.v); if (i >= 0) a.likes.splice(i, 1); else a.likes.push(c.dataset.v); c.classList.toggle('active', i < 0); });
    const rng = $('#pl-iv-pace'); if (rng) rng.addEventListener('input', () => { const lv = $('#pl-iv-level'); if (lv) lv.textContent = tr(IV_LEVEL[ivLevel(rng.value)]); });
    const inp = $('#pl-ai-q'); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACT['ai-send'](); } });
    const dock = $('#pl-screen .pl-cta'); if (dock && el) el.style.paddingBottom = (dock.offsetHeight + 16) + 'px';   // 입력 칸 위에 답 고르기가 붙어 높이가 달라진다 → 마지막 말풍선이 가리지 않게
    if (a.msgs.length || a.busy || (a.iv && a.iv.step > 0)) el.scrollTop = el.scrollHeight;
  } };
};
let AIREP = null;   // 신고 시트가 열린 동안 신고할 답
ACT['ai-report'] = (d) => {
  const t = trip(); const m = t && aiOf(t).msgs[+d.i]; if (!m || m.role === 'user') return;
  AIREP = m;
  sheet(`<div class="sheet-title">${esc(tr('이 답을 신고할까요?'))}</div>
    <p class="desc">${esc(tr('운영자가 확인해요. 신고하면 이 답의 내용이 함께 전달돼요.'))}</p>
    <button type="button" class="btn weak" data-act="ai-report-send" data-r="bad">${esc(tr('부적절하거나 불쾌한 내용'))}</button>
    <button type="button" class="btn weak" data-act="ai-report-send" data-r="wrong" style="margin-top:8px">${esc(tr('사실과 다른 정보'))}</button>
    <button type="button" class="btn weak" data-act="ai-report-send" data-r="other" style="margin-top:8px">${esc(tr('기타'))}</button>`);
};
ACT['ai-report-send'] = async (d) => {
  const m = AIREP; AIREP = null; closeSheet(); if (!m) return;
  const days = m.plan && Array.isArray(m.plan.days) ? m.plan.days : [];
  const plan = days.map(x => [x.title || '', ...(x.items || []).map(it => [it.time, it.name, it.memo].filter(Boolean).join(' · '))].filter(Boolean).join('\n')).join('\n\n');
  const text = [m.text || '', plan].filter(Boolean).join('\n\n').slice(0, 4000);
  try { await H.api('POST', '/ai/report', { reason: d.r, text }); toast(tr('신고했어요. 확인해 볼게요.')); }
  catch (e) { toast(e && e.status === 401 ? tr('로그인이 필요해요') : tr('신고하지 못했어요. 잠시 뒤에 다시 해 주세요.')); }
};
function aiErr(e) {
  if (e && e.status === 429) return e.code === 'ai_busy' ? tr('지금 요청이 몰려 있어요. 1분쯤 뒤에 다시 해 주세요.') : tr('오늘 쓸 수 있는 횟수를 다 썼어요. 내일 다시 해 주세요.');
  if (e && (e.code === 'ai_pay_required' || e.code === 'ai_no_credits')) return tr('무료 이용은 처음 한 번뿐이에요. 광고를 보거나 이용권으로 쓸 수 있어요.');
  if (e && (e.status === 503 || e.code === 'network' || e.code === 'no_server' || e.code === 'timeout')) return tr('지금은 AI 도우미를 쓸 수 없어요. 잠시 뒤에 다시 해 주세요.');
  return tr('일정을 받지 못했어요. 잠시 뒤에 다시 해 주세요.');
}
const aiOnScreen = (t) => ST.tripId === t.id && (ST.stack[ST.stack.length - 1] || {}).name === 'ai';
async function aiRun(t, path, body) {   // 작업을 맡기고 끝날 때까지 받아 간다(최대 4분)
  const a = aiOf(t); let j = await H.api('POST', path + '?wait=20', body); const until = Date.now() + 240000;
  while (j && j.status === 'running' && j.job) {
    if (Date.now() > until) { const err = new Error('timeout'); err.code = 'timeout'; throw err; }
    if (j.stage && j.stage !== a.stage) { a.stage = j.stage; const el = $('#pl-ai-stage'); if (el && aiOnScreen(t)) el.textContent = tr(AI_STAGE[a.stage] || AI_STAGE.model); }
    j = await H.api('GET', '/ai/job/' + encodeURIComponent(j.job) + '?wait=20');
  }
  return j;
}
// 무료는 3번까지(일정 짜기·채팅으로 고치기를 합쳐서, 계정마다). 그 뒤는 프리미엄이 있어야 쓴다. 횟수는 서버가 센 값(없으면 이 기기에서 센 값)
const aiUsed = () => { const l = ST.aiInfo && ST.aiInfo.left; const n = l && Number.isFinite(l.used) ? l.used : -1; return Math.max(n, +(ST.prefs && ST.prefs.aiUsed) || 0); };
const aiFree = () => { const l = ST.aiInfo && ST.aiInfo.left; return l && Number.isFinite(l.free) ? l.free : 1; };
const aiLeft = () => (ST.aiInfo && ST.aiInfo.left) || {};
// AI 도움받기 = 티켓(11-18·11-19 사용자): 완전 처음 한 번만 무료, 그 뒤는 일정을 짜거나 고칠 때마다 티켓 1회. 프리미엄은 AI 와 무관.
//   AI 화면 머리줄 오른쪽에 티켓 그림 + 'N회'(무료 한 번 + 남은 티켓). 티켓이 없으면 '티켓 더 받기' — 광고 한 편 = 1회(하루 10회) · 10회 1,000원.
//   받으면 하려던 요청을 바로 잇는다. 서버(ai.gate)가 같은 규칙으로 다시 센다(처음 무료·티켓은 서버가 세고, 광고는 앱을 믿고 하루 한도로 묶는다)
let AIPAY = null;
const TICKET_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v2.2a2.8 2.8 0 0 1 0 5.6V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.2a2.8 2.8 0 0 1 0-5.6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/><path d="M15 5.5v1.8M15 11.1v1.8M15 16.7v1.8"/></svg>';
const aiRest = () => { const L = aiLeft(); const daily = L.daily || 10; return { daily, rest: Math.max(0, daily - (L.today || 0)), credits: L.credits || 0, free: aiUsed() < aiFree() }; };
const aiTickets = () => { const r = aiRest(); return r.credits + (r.free ? 1 : 0); };   // 머리줄에 보이는 수: 처음 무료 한 번도 1회로 센다
const ticketChip = () => `<button type="button" class="pl-aiticket${aiTickets() ? '' : ' zero'}" data-act="ai-tickets" aria-label="${esc(tr('티켓 더 받기'))}">${TICKET_SVG}<b>${esc(tr('{n}회', { n: aiTickets() }))}</b></button>`;
const aiFreeText = () => {
  const r = aiRest(); const today = tr('오늘 {n}번 더 쓸 수 있어요.', { n: r.rest });
  if (r.free) return tr('처음 한 번은 무료예요. 그 뒤로는 일정을 짜거나 고칠 때마다 티켓 1회를 써요.') + ' ' + today;
  if (r.credits > 0) return tr('티켓 {n}회 남았어요.', { n: r.credits }) + ' ' + today;
  return tr('티켓이 없어요. 오른쪽 위 티켓을 눌러 광고를 보거나 사서 받을 수 있어요.') + ' ' + today;
};
async function aiPay() {
  if (!loggedIn()) return 'free';   // 서버가 401 → 로그인 시트
  if (!Number.isFinite(aiLeft().daily)) await refreshAi();   // 남은 횟수: AI 화면을 열 때 새로 받고(ACT.ai), 쓸 때마다 서버 답으로 바뀐다
  const r = aiRest();
  if (r.rest <= 0) { toast(tr('오늘은 AI 도움받기를 {n}번 모두 썼어요. 내일 다시 해 주세요.', { n: r.daily })); return null; }
  if (r.free) return 'free';
  if (r.credits > 0) return 'credit';
  return (await ticketSheet(true)) ? 'credit' : null;   // 티켓이 없으면 더 받고, 받았으면 바로 잇는다
}
function ticketSheet(need) {   // '티켓 더 받기' — 받으면 true
  if (AIPAY) { const f = AIPAY; AIPAY = null; f(false); }
  const r = aiRest(); const price = (H.creditsPrice && H.creditsPrice()) || '';
  sheet(`<div class="sheet-title">${esc(need ? tr('티켓이 부족해요') : tr('티켓 더 받기'))}</div>
    <div class="pl-ai-meter"><div><b>${esc(tr('{n}회', { n: aiTickets() }))}</b><span>${esc(tr('남은 티켓'))}</span></div><div><b>${esc(r.rest + ' / ' + r.daily)}</b><span>${esc(tr('오늘 남은 횟수'))}</span></div></div>
    <button type="button" class="btn primary" data-act="ai-ticket-ad">${esc(tr('광고 보고 1회 받기'))}</button>
    <button type="button" class="btn weak" data-act="ai-ticket-buy" style="margin-top:8px">${esc(price ? tr('티켓 10회 사기 · {p}', { p: price }) : tr('티켓 10회 사기 · 1,000원'))}</button>
    <p class="caption" style="margin-top:12px">${esc(tr('AI로 일정을 짜거나 고칠 때마다 티켓 1회를 써요. 하루 {n}번까지예요.', { n: r.daily }))}</p>`);
  return new Promise((resolve) => { AIPAY = resolve; });
}
const aiTicketsChanged = () => { const top = ST.stack[ST.stack.length - 1]; if (top && top.name === 'ai' && sheetEl().hidden) renderScreen(); else { const c = document.querySelector('#pl-screen .pl-aiticket'); if (c) c.outerHTML = ticketChip(); } };
ACT['ai-tickets'] = () => { ticketSheet(false).then(aiTicketsChanged); };
ACT['ai-ticket-ad'] = async () => {
  const fin = AIPAY; AIPAY = null; closeSheet(); if (!fin) return;
  const r = H.rewardedAd ? await H.rewardedAd() : { available: false };
  if (!r || !r.available) { toast(tr('지금은 광고를 불러올 수 없어요. 잠시 뒤에 다시 시도해 주세요.')); fin(false); return; }
  if (!r.rewarded) { toast(tr('광고를 끝까지 보면 티켓을 받을 수 있어요.')); fin(false); return; }
  try {
    const j = await H.api('POST', '/ai/credits/ad', {});
    if (j && j.left) ST.aiInfo = Object.assign(ST.aiInfo || { available: true }, { left: j.left });
    toast(tr('티켓 1회를 받았어요.')); fin(true);
  } catch (e) { toast(e && e.code === 'ad_daily' ? tr('오늘은 광고로 받을 수 있는 티켓을 모두 받았어요. 내일 다시 받아 주세요.') : aiErr(e)); fin(false); }
};
ACT['ai-ticket-buy'] = async () => { const fin = AIPAY; AIPAY = null; closeSheet(); if (!fin) return; fin(!!(await buyCredits())); };
async function buyCredits() {   // 앱 안 결제(소모성 상품) → 서버가 거래를 확인하고 10회를 넣는다 → 거래를 마친다
  if (!H.buyCredits) { toast(tr('이 기기에서는 이용권을 살 수 없어요.')); return false; }
  const r = await H.buyCredits();
  if (!r || !r.ok) { if (r && r.message) toast(r.message); return false; }
  return redeemCredits(r);
}
async function redeemCredits(r) {   // 마치기 전에 앱이 꺼진 거래는 다음에 앱을 열면 다시 올린다(서버는 같은 거래를 두 번 넣지 않는다)
  try {
    const j = await H.api('POST', r.platform === 'android' ? '/ai/credits/google' : '/ai/credits/apple', r.platform === 'android' ? { json: r.json, signature: r.signature, token: r.token } : { jws: r.jws });
    if (j && j.left) ST.aiInfo = Object.assign(ST.aiInfo || { available: true }, { left: j.left });
    if (H.finishCredits) H.finishCredits(r);
    if (j && j.added) toast(tr('이용권 {n}회를 넣었어요.', { n: j.added }));
    return true;
  } catch (e) {
    log('credits redeem failed: ' + (e && (e.code || e.message)));
    if (e && e.code === 'purchase_used' && H.finishCredits) H.finishCredits(r);
    toast(e && e.status === 401 ? tr('로그인한 뒤에 이용권을 넣을 수 있어요.') : tr('구매는 됐는데 이용권을 아직 넣지 못했어요. 앱을 다시 열면 다시 넣어요.'));
    return false;
  }
}
async function creditsPending() {   // 앱을 열 때: 마치지 못한 이용권 거래가 있으면 서버에 올린다
  if (!loggedIn() || !H.pendingCredits) return;
  try { const list = await H.pendingCredits(); for (const r of (list || [])) await redeemCredits(r); } catch (e) { /* 다음에 */ }
}
async function aiConsent() {
  if (ST.prefs && ST.prefs.aiOk) return true;
  const ok = await H.askConfirm(tr('AI 도움받기를 쓸까요?'), tr('일정을 짜려고 여행지·날짜·인원 수, 적어 둔 도착·출발 시각과 장소, 숙소 이름과 위치, 채팅에 적은 내용이 개발자 서버를 거쳐 NVIDIA(미국)의 AI 모델로 전달돼요. 이름·계정 정보와 사진은 보내지 않아요.'), tr('동의하고 계속'));
  if (ok) { ST.prefs.aiOk = Date.now(); savePrefs(); }
  return !!ok;
}
async function aiCall(t, path, body, okText) {
  if (!(await aiConsent())) return;
  const pay = await aiPay(); if (!pay) return;
  body = Object.assign({}, body, { pay });
  const a = aiOf(t); a.busy = true; a.stage = path === '/ai/plan' ? 'places' : 'model'; if (aiOnScreen(t)) renderScreen();
  try {
    const j = await aiRun(t, path, body); if (j && j.left) ST.aiInfo = Object.assign(ST.aiInfo || { available: true }, { left: j.left });
    if (j && !j.cached) { ST.prefs.aiUsed = Math.max(aiUsed(), (+ST.prefs.aiUsed || 0) + 1); savePrefs(); }
    if (j && j.plan && j.changed !== false && planPlaces(j.plan) > 0) {
      let text = j.reply || okText; if (j.fallback) text = tr('지금은 AI가 답하지 못해서 알려진 곳만 모아 기본 일정으로 짰어요. 설명과 예상 경비는 빠져 있어요.'); else if (j.truncated) text += ' ' + tr('한 번에 {n}일까지만 짜 드려요.', { n: (j.plan.days || []).length });
      a.msgs.push({ role: 'bot', text, plan: j.plan, attr: j.attribution || '' });
    } else a.msgs.push({ role: 'bot', text: (j && j.reply) || tr('바꿀 것을 찾지 못했어요. 조금 더 자세히 적어 주세요.'), budget: (j && j.plan && j.plan.budget) || null });   // 일정은 그대로(경비만 물은 경우 경비 표를 붙인다)
  } catch (e) {
    log('ai failed: ' + (e && (e.code || e.message)));
    if (e && e.status === 401) { a.busy = false; if (aiOnScreen(t)) renderScreen(); loginSheet('ai'); return; }
    if (e && (e.code === 'ai_pay_required' || e.code === 'ai_no_credits' || e.code === 'ai_daily')) refreshAi();   // 다른 기기에서 썼거나 하루 한도: 남은 횟수를 다시 받는다
    a.msgs.push({ role: 'bot', text: aiErr(e) });
  }
  a.busy = false; a.stage = ''; if (aiOnScreen(t)) renderScreen();
}
// AI 에 같이 넘기는 도착·출발·숙소: 가는 편의 마지막 도착(언제·어디), 오는 편의 첫 출발, 저장해 둔 숙소(위치·체크인/아웃).
// 서버가 이것을 지시문에 넣어 도착 뒤에 시작하고, 출발 전에 끝나고, 숙소 근처에서 하루를 시작·마무리하게 짠다
function aiLogi(t) {
  const go = C.ways(t, 'go'), back = C.ways(t, 'back'); const a = go[go.length - 1], d = back[0]; const o = {};
  const pt = (b, end) => { const p = end === 'to' ? b.toPt : b.fromPt; const x = { at: (end === 'to' ? b.end : b.start) || b.day || '', place: (end === 'to' ? b.to : b.from) || '', mode: b.mode || '' }; if (p && C.hasLL(p)) { x.lat = p.lat; x.lon = p.lon; } return x; };
  const inTrip = (at) => { const k = String(at || '').slice(0, 10); return !t.start || !t.end || (k >= t.start && k <= t.end); };   // 여행 날짜 밖의 표(날짜를 잘못 적었거나 여행 날짜를 바꾼 경우)는 보내지 않는다
  if (a && (a.end || a.day) && inTrip(a.end || a.day)) o.arrive = pt(a, 'to');
  if (d && (d.start || d.day) && inTrip(d.start || d.day)) o.depart = pt(d, 'from');
  const st = C.stays(t).slice(0, 4).map(x => { const y = { name: x.title || '', in: C.dayPart(x.start), out: C.dayPart(x.end) }; if (C.hasLL(x)) { y.lat = x.lat; y.lon = x.lon; } return y; }).filter(y => y.name);
  if (st.length) o.stays = st;
  return o;
}
function aiCtxText(t) {   // AI 화면에 '무엇을 같이 보내는지' 한 줄
  const g = aiLogi(t); const a = [];
  if (g.arrive && g.arrive.at.length > 10) a.push(tr('{t} 도착', { t: dtText(g.arrive.at) }) + (g.arrive.place ? ' (' + g.arrive.place + ')' : ''));
  if (g.depart && g.depart.at.length > 10) a.push(tr('{t} 출발', { t: dtText(g.depart.at) }));
  if (g.stays) a.push(tr('숙소') + ' ' + g.stays.map(x => x.name).join(', '));
  return a.length ? a.join(' · ') + '. ' + tr('이 정보를 함께 보내 도착·출발 시각과 숙소 위치에 맞춰 짜요.') : tr('가는 방법과 숙소를 정해 두면 도착 시각과 숙소 위치에 맞춰 짜 드려요.');
}
const aiBase = (t) => ({ logi: aiLogi(t), dests: (t.dests || []).map(d => Object.assign({ name: d.name, cc: d.cc || '' }, C.hasLL(d) ? { lat: d.lat, lon: d.lon } : {})), start: t.start, end: t.end, days: C.tripDays(t).length || 1, people: C.people(t).length || 1, lang: LANG(), cur: t.cur, home: t.home });
const aiLikes = (a) => a.likes.map(k => tr((AI_LIKES.find(x => x[0] === k) || [k, k])[1]));
function aiPlan(fresh) {
  const t = trip(); if (!t) return; const a = aiOf(t); if (a.busy) return;
  if (!loggedIn()) { loginSheet('ai'); return; }
  aiCall(t, '/ai/plan', Object.assign(aiBase(t), { pace: a.pace, interests: aiLikes(a), fresh: !!fresh }, aiPrefs(a)), tr('이렇게 짜 봤어요. 마음에 들면 담고, 바꾸고 싶은 곳은 아래에 적어 주세요.'));
}
ACT['ai-plan'] = () => aiPlan(aiOf(trip()).msgs.some(m => m.plan));   // 이미 한 번 받았으면 새로 짠다(같은 조건이면 서버가 저장해 둔 것을 준다)
ACT['ai-again'] = () => aiPlan(true);
// 채팅으로 고치기: 아직 담지 않은 일정이 있으면 그것을, 없으면 지금 여행의 일정을 바탕으로 보낸다
function planToDoc(t, plan) {
  const items = [];
  (plan.days || []).forEach((d, i) => { const day = planDay(t, d, i); for (const x of d.items || []) items.push(Object.assign({}, x, { day })); });
  for (const x of plan.wish || []) items.push(Object.assign({}, x, { day: null }));
  return Object.assign(shareDoc(t), { items });
}
ACT['ai-send'] = () => {
  const t = trip(); if (!t) return; const a = aiOf(t); const inp = $('#pl-ai-q'); const text = inp ? inp.value.trim() : ''; if (a.busy) return;
  if (/^(처음부터|다시 처음|start over|restart|最初から)/i.test(text)) { ivStart(t); return; }   // 채팅으로도 처음부터 다시
  const q = ivCur(t, a); if (q) { ivSend(t, a, q, text); return; }   // 질문 중: 그 질문의 답으로 받는다(글 · 막대 · 여러 개 고르기)
  if (!text) return;
  if (!loggedIn()) { loginSheet('ai'); return; }
  const last = a.msgs.slice().reverse().find(m => m.plan && !m.applied); const base = last ? planToDoc(t, last.plan) : shareDoc(t);
  if (!base.items.some(x => x.kind !== 'note')) { toast(tr('먼저 ‘일정 짜기’로 일정을 받아 주세요.')); return; }
  a.msgs.push({ role: 'user', text });
  const hist = a.msgs.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.text || '').slice(0, 600) }));
  aiCall(t, '/ai/chat', Object.assign({ trip: Object.assign(base, { cur: t.cur, home: t.home, people: C.people(t).length || 1, logi: aiLogi(t) }), messages: hist, lang: LANG(), pace: a.pace }, aiPrefs(a)), tr('말씀하신 대로 고쳐 봤어요.'));
};
// 받은 일정을 여행에 담는다: 같은 이름(또는 같은 자리)의 장소는 그대로 살리고(방문 표시·메모 유지), 새 일정에 없는 예전 장소는 '가고 싶은 곳'으로 옮긴다
function applyPlan(t, plan) {
  const norm = (v) => String(v || '').replace(/\s+/g, '').toLowerCase(); const old = C.live(t.items); const used = new Set(); let moved = 0;
  const take = (x) => { const note = x.kind === 'note'; const it = old.find(o => !used.has(o.id) && (o.kind === 'note') === note && (norm(o.name) === norm(x.name) || (!note && C.hasLL(o) && C.hasLL(x) && C.hav(o.lat, o.lon, +x.lat, +x.lon) < 0.15))); if (it) used.add(it.id); return it || null; };
  const put = (x, day, key) => {
    if (!x || !x.name) return; let it = take(x);
    if (!it) { it = { id: C.uid(), kind: x.kind === 'note' ? 'note' : 'place', name: String(x.name).slice(0, 80), c: C.now() }; t.items.push(it); used.add(it.id); }
    it.day = day; it.sort = key; if (C.hasLL(x)) { it.lat = +x.lat; it.lon = +x.lon; } if (x.addr && !it.addr) it.addr = String(x.addr).slice(0, 160); if (hasImg(x)) it.img = x.img;
    if (/^\d{2}:\d{2}$/.test(x.time || '')) it.time = x.time; else if (day) delete it.time;
    if (Number.isFinite(x.stay) && x.stay > 0) it.stay = x.stay; if (x.memo && !it.memo) it.memo = String(x.memo).slice(0, 300);
    if (x.cost && x.cost.amt > 0) it.est = { amt: x.cost.amt, cur: x.cost.cur || t.cur }; it.src = it.src || x.src || 'ai'; C.touch(it);
  };
  (plan.days || []).forEach((d, i) => { const day = planDay(t, d, i); const keys = C.seqKeys((d.items || []).length); (d.items || []).forEach((x, k) => put(x, day, keys[k])); });
  const wish = plan.wish || []; const rest = old.filter(o => !used.has(o.id) && o.day && o.kind !== 'note'); const wk = C.seqKeys(wish.length + rest.length + 1); let w = 0;
  wish.forEach(x => put(x, null, wk[w++]));
  for (const o of old) if (!used.has(o.id) && o.day && o.kind !== 'note') { o.day = null; o.sort = wk[w++]; C.touch(o); moved++; }
  persist(t); return moved;
}
let AIB = 0;
ACT['ai-apply'] = async (d) => {
  const t = trip(); if (!t) return; const a = aiOf(t); const m = a.msgs[+d.i]; if (!m || !m.plan || m.applied) return;
  const had = C.live(t.items).some(i => i.day && i.kind !== 'note');
  if (had) { const ok = await H.askConfirm(tr('지금 일정을 이 일정으로 바꿀까요?'), tr('새 일정에 없는 장소는 ‘가고 싶은 곳’으로 옮겨 둬요. 지워지지는 않아요.'), tr('바꾸기')); document.body.style.overflow = 'hidden'; if (!ok) return; }
  const moved = applyPlan(t, m.plan); m.applied = true; a.iv = null;   // 담은 뒤에는 '지금 일정을 고치기'로 돌아간다(질문은 '처음부터 다시 짜기'로 다시)
  const b = m.plan.budget; ST.day = undefined; ST.sec = 'plan'; ST.stack.pop(); renderScreen(true);
  toast(moved ? tr('일정을 담았어요. 예전 일정 {n}곳은 가고 싶은 곳으로 옮겼어요.', { n: moved }) : tr('일정을 담았어요.'));
  const one = b ? (b.totalHome > 0 ? b.totalHome : (b.cur || t.cur) === t.home ? b.total : 0) : 0;
  if (one > 0 && !(C.budgetOf(t).total > 0)) {
    const n = C.people(t).length || 1; const total = Math.round(one / 1000) * 1000 || Math.round(one); AIB = total;   // 예산은 1인 기준(사람마다 따로)
    sheet(`<div class="sheet-title">${esc(tr('예상 경비를 예산으로 넣을까요?'))}</div><p class="desc">${esc(n > 1 ? tr('AI가 어림한 값이에요. 1인 약 {a}예요. 예산은 1인 기준으로 넣어요.', { a: money(total, t.home) }) : tr('AI가 어림한 값이에요. 약 {a}예요.', { a: money(total, t.home) }))}</p>
      <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('괜찮아요'))}</button><button type="button" class="btn primary" data-act="ai-budget">${esc(tr('예산으로 넣기'))}</button></div>`);
  }
};
ACT['ai-budget'] = () => { const t = trip(); if (!t || !(AIB > 0)) return; t.myBudget = { total: AIB }; persist(t); closeSheet(); renderScreen(); toast(tr('예산을 넣었어요.')); };

// ---------- 경비 ----------
const catOf = (k) => PD.CATS.find(c => c[0] === k) || PD.CATS[PD.CATS.length - 1];
const methodName = (k) => { const m = PD.METHODS.find(x => x[0] === k); return tr(m ? m[1] : '기타'); };
const methodGroup = (m) => (m === 'cash' ? 'cash' : m === 'pay' ? 'pay' : 'card');   // 현금 · 카드(카드, 외화 카드) · 간편결제
// 경비: 맨 위 요약 한 장(쓴 돈·예산·환율/예산/계산기 바로 가기) + 구역 셋 — 내역 · 정산(함께 쓴 돈만) · 통계
function moneySec(t) {
  const fx = fxNow(); const b = C.budgetInfo(t, fx, C.today()); const tot = b.totals; const home = t.home; const foreign = t.cur !== home;
  const multi = C.people(t).length > 1; const st = multi ? C.settle(t, fx) : null; const nm = (id) => pname(t, personOf(t, id));
  let V = ST.moneyView || 'list'; if (V === 'settle' && !multi) V = 'list';
  // --- 요약 --- 여럿이 가는 여행은 '내가 쓴 돈'(함께 쓴 돈 중 내 몫 + 내 개인 지출 + 미리 결제한 예약의 1인 몫) — 사람마다 다르다. 예산도 1인 기준(나만 봄)
  let h = `<div class="pl-card pl-mcard"><div class="pl-mhead"><div><div class="pl-card-label">${esc(multi ? tr('내가 쓴 돈') : tr('지금까지 쓴 돈'))}</div><div class="pl-card-big">${esc(money(tot.all, home))}</div></div>${multi && st.pending > 0 ? `<button type="button" class="pl-mbadge" data-act="money-view" data-v="settle">${esc(tr('정산할 돈 {m}', { m: money(st.pending, home) }))}</button>` : ''}</div>`;
  if (b.total != null) {
    const over = tot.all > b.total;
    h += `<div class="pl-bar ${over ? 'over' : ''}"><i style="width:${Math.min(100, Math.round(tot.all / b.total * 100))}%"></i></div><div class="pl-card-sub">${esc(over ? tr('예산 {a}보다 {b} 더 썼어요', { a: money(b.total, home), b: money(tot.all - b.total, home) }) : tr('예산 {a} 중 {b} 남음', { a: money(b.total, home), b: money(b.left, home) }))}</div>`;
  }
  if (multi) {
    const row = (k, v, cls) => `<li class="${cls || ''}"><span>${esc(k)}</span><b>${esc(money(v, home))}</b></li>`;
    h += `<ul class="pl-msplit">${row(tr('함께 쓴 돈 중 내 몫'), tot.shared)}${row(tr('내 개인 지출'), tot.solo)}${tot.prepaid > 0 ? row(tr('미리 결제한 돈의 내 몫'), tot.prepaid) : ''}${row(tr('함께 쓴 돈 전체({n}명)', { n: tot.people }), tot.groupShared, 'all')}</ul>`;
  }
  const r0 = foreign ? C.fxRate(fx, t.cur, home) : 0, mine = foreign ? C.myRate(t, t.cur) : 0;
  h += `<div class="pl-mquick">${foreign ? `<button type="button" data-act="rate"><span>${esc(tr('환율'))}</span><b>${esc(mine ? rateTxt(t.cur, mine, home) : r0 ? rateTxt(t.cur, r0, home) : tr('정보 없음'))}</b></button>` : ''}<button type="button" data-act="budget"><span>${esc(multi ? tr('내 예산') : tr('예산'))}</span><b>${esc(b.total != null ? money(b.total, home) : tr('정하지 않음'))}</b></button>${multi ? `<button type="button" data-act="solo-open"><span>${esc(tr('내 개인 지출'))}</span><b>${esc(t.soloOpen ? tr('함께 보기') : tr('나만 보기'))}</b></button>` : ''}${foreign ? `<button type="button" data-act="calc"><span>${esc(tr('환율 계산기'))}</span><b>${esc(tr('열기'))}</b></button>` : ''}<button type="button" data-act="exp-export"><span>${esc(tr('내보내기'))}</span><b>CSV</b></button></div></div>`;
  // --- 구역 ---
  const views = [['list', '내역']].concat(multi ? [['settle', '정산']] : []).concat([['stats', '통계']]);
  h += `<div class="seg pl-mseg">${views.map(([k, n]) => `<button type="button" class="${V === k ? 'on' : ''}" data-act="money-view" data-v="${k}">${esc(tr(n))}</button>`).join('')}</div>`;
  const all = C.live(t.expenses).slice().sort((a, b2) => (a.day === b2.day ? (b2.c || 0) - (a.c || 0) : (a.day < b2.day ? 1 : -1)));
  const expRow = (e, btn) => {
    const c = catOf(e.cat), x = C.expenseHome(t, e, fx); const basis = { mine: tr('내 환전 환율'), billed: tr('실제 청구액'), auto: x.approx ? tr('참고용 환율') : tr('오늘 환율|basis'), none: tr('환율 없음') }[x.basis] || '';
    const sub = [];
    if (multi) {   // 함께 쓴 것: 내 몫 · 몇 명 · 정산 · 낸 사람 / 개인: 내 것은 '개인', 남이 보이게 해 둔 것은 '○○ 개인'
      const so = C.shareOf(t, e);
      if (so.shared) { sub.push(so.among.includes(t.meId) ? (x.home != null ? tr('내 몫 {m}', { m: money(x.home / so.among.length, home) }) : tr('내 몫')) : tr('내 몫 없음'), tr('함께 {n}명', { n: so.among.length }), e.share && e.share.done ? tr('나눔 끝') : tr('정산 전')); if (so.payer !== t.meId) sub.push(tr('{name} 냄', { name: nm(so.payer) })); }
      else sub.push(so.payer === t.meId ? tr('개인') : tr('{name} 개인', { name: nm(so.payer) }));
    }
    sub.push(methodName(e.method));
    if (e.cur !== home && basis) sub.push(basis);
    return `<div class="pl-exp" data-act="exp-edit" data-id="${esc(e.id)}"><span class="pl-exp-ico" style="background:${c[2]}">${esc(tr(c[1]).slice(0, 1))}</span><div class="pl-exp-body"><div class="pl-exp-title">${esc(e.memo || tr(c[1]))}</div><div class="pl-exp-sub">${sub.map(v => `<span>${esc(v)}</span>`).join(' · ')}</div></div><div class="pl-exp-amt"><b>${esc(money(e.amt, e.cur))}</b>${e.cur !== home ? `<span>${esc(x.home != null ? money(x.home, home) : '–')}</span>` : ''}</div>${expThumb(e)}${btn === 'done' ? `<button type="button" class="pl-exp-set" data-act="exp-done" data-id="${esc(e.id)}" data-v="1">${esc(tr('정산'))}</button>` : btn === 'undo' ? `<button type="button" class="pl-exp-set undo" data-act="exp-done" data-id="${esc(e.id)}" data-v="0">${esc(tr('취소'))}</button>` : ''}</div>`;
  };
  // 날짜 줄의 합계: 내역(여럿이 가는 여행)은 그날 내가 쓴 돈(내 몫), 정산 화면은 그날 함께 쓴 돈 전체
  const byDay = (list, btn, mineOnly) => { const dayOf = {}; for (const e of list) { const x = C.expenseHome(t, e, fx); if (x.home == null) continue; let v = x.home; if (mineOnly) { const so = C.shareOf(t, e); v = so.among.includes(t.meId) ? x.home / so.among.length : 0; } dayOf[e.day] = (dayOf[e.day] || 0) + v; } let cur = null, o = ''; for (const e of list) { if (e.day !== cur) { cur = e.day; o += `<div class="pl-dayhead"><b>${esc(dOf(e.day) ? shortDay(e.day) : e.day)}</b><span>${esc(mineOnly ? tr('내 몫 {m}', { m: money(dayOf[e.day] || 0, home) }) : money(dayOf[e.day] || 0, home))}</span></div>`; } o += expRow(e, btn); } return o; };
  if (V === 'list') {
    const F = ST.expFilter || 'all'; const pass = (e) => F === 'all' || (F === 'cash' ? methodGroup(e.method) === 'cash' : F === 'card' ? methodGroup(e.method) !== 'cash' : F === 'shared' ? C.shareOf(t, e).shared : !C.shareOf(t, e).shared);
    const list = all.filter(pass); const filters = [['all', '전체|plan'], ['cash', '현금'], ['card', '카드']].concat(multi ? [['shared', '함께'], ['solo', '개인']] : []);
    if (all.length) h += `<div class="chips small pl-filter">${filters.map(([k, n]) => `<button type="button" class="chip ${F === k ? 'active' : ''}" data-act="exp-filter" data-v="${k}">${esc(tr(n))}</button>`).join('')}</div>`;
    if (!all.length) h += `<p class="pl-hint">${esc(tr('아직 적은 지출이 없어요.'))}</p>`; else if (!list.length) h += `<p class="pl-hint">${esc(tr('여기에 해당하는 지출이 없어요.'))}</p>`;
    h += byDay(list, null, multi);
  } else if (V === 'settle') {
    // 함께 쓴 돈만: 아직 나누지 않은 것으로 누가 누구에게 얼마. 그 자리에서 나눠 낸 것·이미 정산한 것은 아래에 따로
    const pend = all.filter(e => { const so = C.shareOf(t, e); return so.shared && !(e.share && e.share.done); }), dn = all.filter(e => { const so = C.shareOf(t, e); return so.shared && e.share && e.share.done; });
    if (!(st.shared > 0)) h += `<p class="pl-hint">${esc(tr('지출을 적을 때 누가 냈고 누구 몫인지 고르면, 누가 누구에게 얼마를 주면 되는지 계산해 드려요.'))}</p>`;
    else {
      h += `<div class="pl-card pl-settle"><div class="pl-card-label">${esc(tr('정산할 돈(함께 쓰고 아직 나누지 않은 돈)'))}</div><div class="pl-card-big">${esc(money(st.pending, home))}</div>`;
      h += st.transfers.length ? `<ul class="pl-xfer">${st.transfers.map(x => `<li><span>${esc(nm(x.from))}</span><i>→</i><span>${esc(nm(x.to))}</span><b>${esc(money(x.amt, home))}</b></li>`).join('')}</ul>` : `<div class="pl-card-sub">${esc(tr('주고받을 돈이 없어요.'))}</div>`;
      if (st.pendingN) h += `<div class="pl-sheet-acts" style="margin-top:14px"><button type="button" class="btn secondary" data-act="settle">${esc(tr('자세히 · 보내기'))}</button><button type="button" class="btn primary" data-act="settle-done">${esc(tr('정산 끝내기'))}</button></div>`;
      h += '</div>';
      if (pend.length) h += `<div class="section"><div class="section-title">${esc(tr('정산 전 {n}건', { n: pend.length }))}</div>${byDay(pend, 'done')}</div>`;
      if (dn.length) h += `<div class="section"><div class="section-head"><div class="section-title">${esc(tr('이미 나눈 것 {n}건 · {m}', { n: dn.length, m: money(st.done, home) }))}</div><button type="button" class="section-more" data-act="settle-fold">${esc(ST.doneOpen ? tr('접기') : tr('펼치기'))}</button></div>${ST.doneOpen ? byDay(dn, 'undo') + `<button type="button" class="pl-link" data-act="settle-undo-all">${esc(tr('정산한 것 모두 취소'))}</button>` : ''}</div>`;
    }
  } else {
    // 통계: 결제 수단 · 분류 · 사람마다 쓴 돈 (한 줄에 하나씩 — 큰 금액도 잘리지 않는다)
    const bar = (name, v, mx, color) => `<div class="pl-cat"><span class="pl-cat-dot" style="background:${color}"></span><span class="pl-cat-name">${esc(name)}</span><span class="pl-cat-bar"><i style="width:${Math.max(3, Math.round(v / (mx || 1) * 100))}%;background:${color}"></i></span><span class="pl-cat-amt">${esc(money(v, home))}</span></div>`;
    if (!(tot.sum > 0) && !(tot.all > 0)) h += `<p class="pl-hint">${esc(tr('아직 적은 지출이 없어요.'))}</p>`;
    const g = { cash: 0, card: 0, pay: 0 }; for (const k of Object.keys(tot.byMethod)) g[methodGroup(k)] += tot.byMethod[k];
    const ms = [['cash', '현금', '#03B26C'], ['card', '카드', '#3182F6'], ['pay', '간편결제', '#7A4FE0']].filter(x => g[x[0]] > 0);
    if (ms.length) { const mx = Math.max.apply(null, ms.map(x => g[x[0]])); h += `<div class="section pl-methods"><div class="section-title">${esc(tr('결제 수단별'))}</div>${ms.map(x => bar(tr(x[1]), g[x[0]], mx, x[2])).join('')}</div>`; }
    const cats = PD.CATS.map(c => [c, tot.byCat[c[0]] || 0]).filter(x => x[1] > 0).sort((a, b2) => b2[1] - a[1]);
    if (cats.length) { const mx = cats[0][1]; h += `<div class="section pl-cats"><div class="section-title">${esc(tr('분류별'))}</div>${cats.map(([c, v]) => bar(tr(c[1]), v, mx, c[2])).join('')}</div>`; }
    if (multi && st.people.some(x => x.sShare > 0)) { const mx = Math.max.apply(null, st.people.map(x => x.sShare)); h += `<div class="section pl-byperson"><div class="section-title">${esc(tr('함께 쓴 돈의 사람별 몫'))}</div>${st.people.map(x => bar(nm(x.id), x.sShare, mx, '#8B95A1')).join('')}</div>`; }   // 개인 지출은 본인만 보므로 사람끼리는 함께 쓴 돈만 견준다
    const notes = []; if (multi) notes.push(tr('결제 수단·분류는 내가 쓴 돈(함께 쓴 돈 중 내 몫 + 내 개인 지출) 기준이에요.'));
    if (tot.prepaid > 0) notes.push(multi ? tr('미리 결제한 {a}는 {n}명으로 나눠 내 몫 {b}로 셈했어요.', { a: money(tot.prepaidAll, home), n: tot.people, b: money(tot.prepaid, home) }) : tr('현지 지출 {a} · 미리 결제 {b}', { a: money(tot.sum, home), b: money(tot.prepaid, home) })); if (tot.unknown) notes.push(tr('환율을 몰라 합계에서 뺀 지출 {n}건', { n: tot.unknown })); if (tot.approx) notes.push(tr('참고용 환율로 계산한 지출이 들어 있어요.'));
    if (notes.length) h += `<p class="caption">${esc(notes.join(' · '))}</p>`;
  }
  return { html: h, cta: `<button type="button" class="btn primary" data-act="exp">${esc(tr('지출 추가'))}</button>`, after: (el) => exThumbs(el, t) };
}
ACT['money-view'] = (d) => { ST.moneyView = d.v; renderScreen(true); };
ACT['settle-fold'] = () => { ST.doneOpen = !ST.doneOpen; renderScreen(); };
// 지출 하나만 정산(나눔 끝) / 정산 취소
function setDone(t, e, on) { e.share = Object.assign({}, e.share || { mode: 'all' }); if (on) e.share.done = true; else delete e.share.done; C.touch(e); }
ACT['exp-done'] = (d) => {
  const t = trip(); const e = t && t.expenses.find(x => x.id === d.id); if (!e) return; const on = d.v === '1';
  setDone(t, e, on); persist(t); if (on) ST.doneOpen = true; renderScreen(); toast(on ? tr('이 지출을 정산했어요.') : tr('정산을 취소했어요.'));
};
ACT['settle-undo-all'] = async () => {
  const t = trip(); if (!t) return; const list = C.live(t.expenses).filter(e => e.share && e.share.done && C.shareOf(t, e).shared); if (!list.length) return;
  const ok = await H.askConfirm(tr('정산한 것을 모두 취소할까요?'), tr('함께 쓴 지출 {n}건이 다시 ‘정산 전’으로 돌아가요.', { n: list.length }), tr('모두 취소')); if (!ok) return;
  for (const e of list) setDone(t, e, false); persist(t); renderScreen(); toast(tr('정산을 취소했어요.'));
};
ACT['settle-done'] = async () => {   // 돈을 주고받았으면: 정산 전인 함께 쓴 지출을 모두 '나눔 끝'으로
  const t = trip(); if (!t) return; const st = C.settle(t, fxNow());
  const ok = await H.askConfirm(tr('정산을 끝낼까요?'), tr('함께 쓴 지출 {n}건을 ‘나눔 끝’으로 바꿔요. 주고받을 돈이 0이 돼요. 지출마다 다시 바꿀 수 있어요.', { n: st.pendingN }), tr('정산 끝내기')); if (!ok) return;
  for (const e of C.live(t.expenses)) { const so = C.shareOf(t, e); if (so.shared && !(e.share && e.share.done)) { e.share = Object.assign({}, e.share || { mode: 'all' }, { done: true }); C.touch(e); } }
  persist(t); ST.doneOpen = true; renderScreen(); toast(tr('정산을 끝냈어요.'));
};
ACT['exp-filter'] = (d) => { ST.expFilter = d.v; renderScreen(); };
// 정산 자세히: 사람마다 낸 돈 · 자기 몫 · 받을 돈/줄 돈, 그리고 메신저로 보낼 글
function settleText(t) {
  const fx = fxNow(); const st = C.settle(t, fx); const home = t.home; const nm = (id) => { const p = personOf(t, id); return p ? (p.id === t.meId ? (p.name || tr('나')) : p.name) : ''; };
  const out = [tr('{t} 정산', { t: t.title }), tr('함께 쓴 돈 {m}', { m: money(st.shared, home) }), ''];
  for (const x of st.people) out.push(nm(x.id) + ': ' + tr('낸 돈 {a} · 몫 {b}', { a: money(x.sPaid, home), b: money(x.sShare, home) }));   // 함께 쓴 돈만(개인 지출은 본인만 본다)
  out.push(''); if (st.transfers.length) for (const x of st.transfers) out.push(nm(x.from) + ' → ' + nm(x.to) + ' ' + money(x.amt, home)); else out.push(tr('주고받을 돈이 없어요.'));
  return out.join('\n');
}
ACT.settle = () => {
  const t = trip(); if (!t) return; const st = C.settle(t, fxNow()); const home = t.home; const nm = (id) => pname(t, personOf(t, id));
  sheet(`<div class="sheet-title">${esc(tr('함께 쓴 돈 정산'))}</div><p class="desc">${esc(tr('함께 쓰고 아직 나누지 않은 돈만 계산해요. 개인 지출, 이미 나눠 낸 것, 예약(미리 결제)은 들어가지 않아요.'))}</p>
    <ul class="rows pl-ppl">${st.people.map(x => `<li class="row"><span class="pl-avatar">${esc((nm(x.id) || '?').slice(0, 1))}</span><div class="row-body"><div class="row-title">${esc(nm(x.id))}</div><div class="row-desc">${esc(tr('낸 돈 {a} · 몫 {b}', { a: money(x.pendPaid, home), b: money(x.pendShare, home) }))}</div></div><span class="row-value ${x.bal < 0 ? 'neg' : ''}">${esc(x.bal > 0 ? tr('받을 돈 {m}', { m: money(x.bal, home) }) : x.bal < 0 ? tr('줄 돈 {m}', { m: money(-x.bal, home) }) : tr('정산 끝'))}</span></li>`).join('')}</ul>
    ${st.transfers.length ? `<div class="pl-flabel">${esc(tr('이렇게 보내면 끝나요'))}</div><ul class="pl-xfer">${st.transfers.map(x => `<li><span>${esc(nm(x.from))}</span><i>→</i><span>${esc(nm(x.to))}</span><b>${esc(money(x.amt, home))}</b></li>`).join('')}</ul>` : ''}
    ${st.unknown ? `<p class="caption">${esc(tr('환율을 몰라 합계에서 뺀 지출 {n}건', { n: st.unknown }))}</p>` : ''}
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="settle-share">${esc(tr('정산 내용 보내기'))}</button></div>`);
};
ACT['settle-share'] = () => { const t = trip(); if (!t) return; closeSheet(); if (H.shareText) H.shareText(settleText(t), '', t.title); };
const defaultBasis = (t, ex) => ((ex.method === 'cash' || ex.method === 'tcard') && C.myRate(t, ex.cur) ? 'mine' : 'auto');
function expConv() {
  const t = trip(); const el = $('#pl-e-conv'); if (!el || !EX || !t) return;
  const same = EX.cur === t.home; const amt = num(EX.amt); const home = t.home;
  $('#pl-e-basisbox').hidden = same; $('#pl-e-billed').hidden = same || EX.basis !== 'billed';
  $$('#pl-e-basis .chip').forEach(c => c.classList.toggle('active', c.dataset.v === EX.basis));
  if (same) { el.textContent = ''; return; }
  if (EX.basis === 'billed') { const h = num(EX.home); el.innerHTML = h > 0 && amt > 0 ? `= <b>${esc(money(h, home))}</b> · ${esc(rateTxt(EX.cur, h / amt, home))}` : esc(tr('카드 명세서에 찍힌 금액을 아래에 적어 주세요.')); return; }
  const fx = fxNow(); let r = null, label = '';
  if (EX.basis === 'mine') { r = C.myRate(t, EX.cur); label = tr('내 환전 환율'); if (!r) { r = C.fxRate(fx, EX.cur, home); label = tr('환전 기록이 없어 오늘 환율로 계산'); } }
  else { r = C.fxRate(fx, EX.cur, home); label = fx.approx ? tr('참고용 환율') : tr('오늘 환율|basis'); }
  if (!r) { el.textContent = tr('이 통화는 환율 정보가 없어요. 실제 청구액으로 적어 주세요.'); return; }
  el.innerHTML = `≈ <b>${esc(money((amt > 0 ? amt : 0) * r, home))}</b> · ${esc(label)} ${esc(rateTxt(EX.cur, r, home))}`;
}
function expSheet(id, preset) {
  const t = trip(); if (!t) return; const e0 = id ? t.expenses.find(x => x.id === id) : null; const td = C.today(), days = C.tripDays(t);
  const ps = C.people(t); const multi = ps.length > 1; const allIds = ps.map(p => p.id);
  const ex = e0 ? { id, amt: String(e0.amt), cur: e0.cur, cat: e0.cat, method: e0.method, basis: e0.basis, home: e0.home ? String(e0.home) : '', memo: e0.memo || '', day: e0.day, userBasis: true, photos: expPhotos(e0).slice() }
    : Object.assign({ id: null, amt: '', cur: t.cur, cat: ST.prefs.cat || 'food', method: ST.prefs.method || 'cash', basis: null, home: '', memo: '', day: days.includes(td) ? td : (days[0] || td), userBasis: false }, preset || {});
  if (!ex.basis) ex.basis = defaultBasis(t, ex);
  if (!Array.isArray(ex.photos)) ex.photos = []; ex.pend = new Map();   // 지출 사진(영수증 등): 고르는 동안은 pend 에, 저장할 때 폰에
  const so = e0 ? C.shareOf(t, e0) : null; const mode0 = e0 ? ((e0.share && (e0.share.mode === 'all' || e0.share.mode === 'some')) ? e0.share.mode : 'solo') : (ST.prefs.share === 'solo' ? 'solo' : 'all');
  ex.payer = so ? so.payer : t.meId; ex.share = multi ? mode0 : 'solo'; ex.done = !!(e0 && e0.share && e0.share.done); ex.ids = e0 && e0.share && e0.share.mode === 'some' ? (e0.share.ids || []).filter(i => allIds.includes(i)) : allIds.slice();
  if (multi && ex.share === 'solo') ex.payer = t.meId;   // 개인 지출은 언제나 내 것(다른 사람의 개인 지출은 적을 수 없다 — 서버도 받지 않는다)
  ex.mode = ex.share === 'some' ? 'some' : 'all';       // '함께 쓴 돈'으로 바꿀 때 돌아갈 나누는 방법
  // 여럿이 가는 여행: 먼저 '함께 쓴 돈'인지 '내 개인 지출'인지. 개인 지출은 누가 냈는지·누구 몫인지 묻지 않는다(11-19 사용자: "개인과 공동 지출은 분리")
  const who = multi ? `<div class="pl-flabel">${esc(tr('어떤 지출인가요?'))}</div><div class="chips small" id="pl-e-kind">${[['shared', tr('함께 쓴 돈')], ['solo', tr('내 개인 지출')]].map(([k, n]) => `<button type="button" class="chip ${(ex.share === 'solo' ? 'solo' : 'shared') === k ? 'active' : ''}" data-v="${k}">${esc(n)}</button>`).join('')}</div>
    <p class="caption" id="pl-e-solonote" ${ex.share === 'solo' ? '' : 'hidden'}>${esc(t.soloOpen ? tr('나만 적고 고칠 수 있어요. 함께 가는 사람에게도 보이게 해 두었어요.') : tr('나만 적고 나만 볼 수 있어요.'))}</p>
    <div id="pl-e-sharedbox" ${ex.share === 'solo' ? 'hidden' : ''}><div class="pl-flabel">${esc(tr('누가 냈나요?'))}</div><div class="chips small" id="pl-e-payer">${ps.map(p => `<button type="button" class="chip ${ex.payer === p.id ? 'active' : ''}" data-v="${esc(p.id)}">${esc(pname(t, p))}</button>`).join('')}</div>
    <div class="pl-flabel">${esc(tr('누구 몫인가요?'))}</div><div class="chips small" id="pl-e-share">${[['all', tr('모두 함께 ({n}명)', { n: ps.length })], ['some', tr('직접 고르기')]].map(([k, n]) => `<button type="button" class="chip ${ex.mode === k ? 'active' : ''}" data-v="${k}">${esc(n)}</button>`).join('')}</div>
    <div class="chips small" id="pl-e-ids" style="margin-top:8px" ${ex.share === 'some' ? '' : 'hidden'}>${ps.map(p => `<button type="button" class="chip ${ex.ids.includes(p.id) ? 'active' : ''}" data-v="${esc(p.id)}">${esc(pname(t, p))}</button>`).join('')}</div>
    <div class="pl-conv" id="pl-e-each"></div>
    <div id="pl-e-whenbox"><div class="pl-flabel">${esc(tr('언제 나누나요?'))}</div><div class="chips small" id="pl-e-when">${[['later', tr('나중에 정산')], ['done', tr('이미 나눠 냈어요')]].map(([k, n]) => `<button type="button" class="chip ${(ex.done ? 'done' : 'later') === k ? 'active' : ''}" data-v="${k}">${esc(n)}</button>`).join('')}</div></div></div>` : '';
  const chips = (list, on) => list.map(([k, n]) => `<button type="button" class="chip ${on === k ? 'active' : ''}" data-v="${k}">${esc(tr(n))}</button>`).join('');
  sheet(`<div class="sheet-title">${esc(e0 ? tr('지출 고치기') : tr('지출 추가'))}</div>
    <div class="pl-amt"><button type="button" class="pl-curbtn" data-act="exp-cur" id="pl-e-cur">${esc(curLabel(ex.cur))}</button><input id="pl-e-amt" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(ex.amt)}"></div>
    <div class="pl-conv" id="pl-e-conv"></div>
    <div class="pl-flabel">${esc(tr('분류'))}</div><div class="chips" id="pl-e-cat">${chips(PD.CATS, ex.cat)}</div>
    <div class="pl-flabel">${esc(tr('결제 수단'))}</div><div class="chips small" id="pl-e-method">${chips(PD.METHODS, ex.method)}</div>${who}
    <div id="pl-e-basisbox"><div class="pl-flabel">${esc(tr('환산 기준'))}</div><div class="chips small" id="pl-e-basis">${chips([['auto', '오늘 환율|basis'], ['mine', '내 환전 환율'], ['billed', '실제 청구액']], ex.basis)}</div></div>
    <div class="field" id="pl-e-billed" hidden style="margin-top:10px"><label for="pl-e-home">${esc(tr('실제 청구된 금액 ({c})', { c: t.home }))}</label><input id="pl-e-home" inputmode="decimal" autocomplete="off" value="${esc(ex.home)}"></div>
    <div class="pl-flabel">${esc(tr('날짜'))}</div><div class="field"><input id="pl-e-day" type="date" value="${esc(ex.day)}"></div>
    <div class="field"><input id="pl-e-memo" maxlength="60" autocomplete="off" placeholder="${esc(tr('메모(안 적어도 돼요)'))}" value="${esc(ex.memo)}"></div>
    <div class="pl-flabel">${esc(tr('사진(영수증 등)'))}</div><div class="pl-dy-grid pl-e-photos" id="pl-e-photos"></div>
    <p class="caption" id="pl-e-phnote">${esc(phNote(t, multi && ex.share === 'solo'))}</p>
    <button type="button" class="btn primary" data-act="exp-save">${esc(tr('저장'))}</button>
    ${e0 ? `<button type="button" class="pl-link-danger" data-act="exp-del">${esc(tr('이 지출 지우기'))}</button>` : ''}`, () => {
    EX = ex;
    const a = $('#pl-e-amt'); a.addEventListener('input', () => { EX.amt = a.value; expConv(); expEach(); });
    if (multi) {
      chipGroup('#pl-e-kind', (v) => { EX.share = v === 'solo' ? 'solo' : EX.mode; $('#pl-e-sharedbox').hidden = v === 'solo'; $('#pl-e-solonote').hidden = v !== 'solo'; $('#pl-e-ids').hidden = EX.share !== 'some'; $('#pl-e-phnote').textContent = phNote(t, v === 'solo'); expEach(); });
      chipGroup('#pl-e-payer', (v) => { EX.payer = v; });
      chipGroup('#pl-e-share', (v) => { EX.mode = v; EX.share = v; $('#pl-e-ids').hidden = v !== 'some'; expEach(); });
      chipGroup('#pl-e-when', (v) => { EX.done = v === 'done'; });
      $('#pl-e-ids').addEventListener('click', (ev) => { const c = ev.target.closest('.chip'); if (!c) return; const i = EX.ids.indexOf(c.dataset.v); if (i >= 0) EX.ids.splice(i, 1); else EX.ids.push(c.dataset.v); c.classList.toggle('active', i < 0); expEach(); });
    }
    const hm = $('#pl-e-home'); hm.addEventListener('input', () => { EX.home = hm.value; expConv(); });
    chipGroup('#pl-e-cat', (v) => { EX.cat = v; });
    chipGroup('#pl-e-method', (v) => { EX.method = v; if (!EX.userBasis) EX.basis = defaultBasis(t, EX); expConv(); });
    chipGroup('#pl-e-basis', (v) => { EX.basis = v; EX.userBasis = true; expConv(); });
    expConv(); expEach(); exPaint(); if (!e0) a.focus();
  });
}
const EXP_PHOTOS = 3;
// 지출 사진(영수증)은 함께 보는 사람끼리 나눈다(11-19 사용자: "영수증은 서로 공유되어야지"). 함께 보는 여행(서버에 있고 앱으로 들어온 사람이 둘 이상)이면
// 여행을 올린 뒤 사진도 서버(/trips/<여행>/photos/<사진>)에 올리고, 남이 올린 사진은 볼 때 받아 폰에 저장한다(그 뒤로는 인터넷이 없어도 보인다).
// 혼자 쓰는 여행은 폰에만 두었다가 함께 보기를 시작하면 올린다. 일기 사진은 나만 보는 기록이라 나누지 않는다.
const PHUP_KEY = 'pl-ph-up'; let PHUP = null;   // 서버에 올렸거나 서버에서 받은 사진 '여행/사진'
const phUp = () => { if (!PHUP) { try { PHUP = new Set(JSON.parse(localStorage.getItem(PHUP_KEY) || '[]')); } catch (e) { PHUP = new Set(); } } return PHUP; };
const phUpSave = () => { try { localStorage.setItem(PHUP_KEY, JSON.stringify([...phUp()].slice(-3000))); } catch (e) { /* ignore */ } };
const sharedTrip = (t) => !!(t && !t.sample && t.cloud && !t.cloud.gone && (t.cloud.members || []).length > 1);
// 그 지출의 사진을 함께 보는 사람과 나누는가: 함께 쓴 돈이거나, 내 개인 지출인데 '함께 가는 사람에게도 보이기'를 켰을 때. 나만 보는 개인 지출의 사진은 서버에 올리지 않는다
const photoShared = (t, e) => { if (!C.isPersonal(t, e)) return true; return !!t.soloOpen && C.shareOf(t, e).payer === t.meId; };
// 11-20 사용자: "지출영수증은 공유하기로 했잖아" — 서버에 있는 여행이면 혼자 쓰는 여행이어도, 나만 보는 개인 지출이어도 영수증을 올린다(내 다른 기기·웹에서도 보이게).
// 남의 나만 보는 개인 지출에 붙은 영수증은 서버가 그 사람에게만 준다(server/trips.py _photo_ok).
const onCloud = (t) => !!(t && !t.sample && t.cloud && !t.cloud.gone);
const phNote = (t, solo) => (solo && !t.soloOpen ? tr('개인 지출의 사진은 나만 볼 수 있어요.') : sharedTrip(t) ? tr('함께 보는 사람들도 이 사진을 볼 수 있어요.') : tr('로그인하면 내 다른 기기에서도 이 사진이 보여요. 친구와 함께 보면 그 사람들도 볼 수 있어요.'));
const phPath = (t, id) => '/trips/' + encodeURIComponent(t.id) + '/photos/' + encodeURIComponent(id);
async function rawApi(method, path, body) {   // 사진처럼 JSON 이 아닌 본문(H.api 는 JSON 만)
  const A = root.Account; if (!A || !A.base || !A.session || !A.session.token) { const e = new Error('no_login'); e.status = 401; throw e; }
  const headers = { Authorization: 'Bearer ' + A.session.token }; if (body) headers['Content-Type'] = 'image/jpeg';
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null; const timer = ac ? setTimeout(() => ac.abort(), 45000) : 0;
  try { const r = await fetch(A.base + path, { method, headers, body: body || undefined, signal: ac ? ac.signal : undefined }); if (!r.ok) { const e = new Error('http_' + r.status); e.status = r.status; throw e; } return r; }
  finally { clearTimeout(timer); }
}
let phSaving = Promise.resolve();   // 폰에 저장 중인 사진(다 저장된 뒤에 올린다)
const PH_MISS = new Set();          // 이 폰에 없는 사진(함께 보는 사람이 올린 것) — 다시 찾지 않는다
const PH_BUSY = new Map();          // 여행별로 올리는 중이면 끝난 뒤 한 번 더
async function uploadPhotos(t) {   // 함께 보는 여행의 지출 사진 중 아직 서버에 없는 것을 올린다(여행이 서버에 있어야 해서 여행을 올린 뒤에 부른다)
  if (!loggedIn() || !onCloud(t)) return;
  if (PH_BUSY.has(t.id)) { PH_BUSY.set(t.id, true); return; }
  PH_BUSY.set(t.id, false);
  try {
    await phSaving.catch(() => { /* ignore */ }); const up = phUp();
    for (const e of C.live(t.expenses)) for (const id of expPhotos(e)) {
      const k = t.id + '/' + id; if (up.has(k) || PH_MISS.has(id)) continue;
      let r = null; try { r = await C.Store.getFile(id); } catch (err) { r = null; }
      if (!r || !r.buf) { PH_MISS.add(id); continue; }
      try { await rawApi('PUT', phPath(t, id), r.buf); up.add(k); phUpSave(); }
      catch (err) { log('photo upload failed: ' + (err && err.message)); return; }   // 다음에 여행을 올릴 때 다시
    }
  } finally { const again = PH_BUSY.get(t.id); PH_BUSY.delete(t.id); if (again) uploadPhotos(t); }
}
async function exUrl(t, id) {   // 지출 사진: 폰에 있으면 그것, 없으면(함께 보는 사람이 올린 것) 서버에서 받아 폰에 저장
  const u = await dyUrl(id); if (u) return u;
  if (!loggedIn() || !t || !t.cloud || t.cloud.gone) return '';
  try {
    const r = await rawApi('GET', phPath(t, id)); const buf = await r.arrayBuffer();
    await C.Store.putFile({ id, name: 'receipt.jpg', mime: 'image/jpeg', buf }); PH_MISS.delete(id); phUp().add(t.id + '/' + id); phUpSave();
    const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' })); dyUrls.set(id, url); return url;
  } catch (e) { return ''; }
}
function exHydrate(scope, t) {   // data-exph 가 달린 그림을 채운다. 받을 수 없는 사진은 자리를 접는다
  $$('img[data-exph]', scope || document).forEach((im) => { exUrl(t, im.dataset.exph).then((u) => { if (u) im.src = u; else { const b = im.closest('.pl-dy-ph'); if (b) b.classList.add('gone'); } }); });
}
async function fetchTripPhotos(t) {   // 복사하기 전에: 아직 안 받은 지출 사진을 받아 둔다(나간 뒤에는 받을 수 없다)
  for (const e of C.live(t && t.expenses)) for (const id of expPhotos(e)) await exUrl(t, id);
}
function dropRemotePhoto(t, id, force) {   // 뺀 사진: 그 여행의 다른 지출도 안 쓰면 서버에서도 지운다(못 지워도 서버가 하루 뒤에 치운다). force: 지출은 그대로인데 나만 보게 바꿨을 때
  if (force || !loggedIn() || !t || !t.cloud || t.cloud.gone) return;   // force(나만 보게 바꿈): 이제 내리지 않는다 — 내 다른 기기에서 보이게 서버에 두고, 남에게는 서버가 주지 않는다
  if (force ? C.live(t.expenses).some(e => photoShared(t, e) && expPhotos(e).includes(id)) : C.live(t.expenses).some(e => expPhotos(e).includes(id))) return;
  const k = t.id + '/' + id; if (force ? !phUp().has(k) : (!sharedTrip(t) && !phUp().has(k))) return;   // 한 번도 서버에 간 적 없는 사진이면 부를 일이 없다
  rawApi('DELETE', phPath(t, id)).then(() => { phUp().delete(k); phUpSave(); }).catch(() => { /* 서버가 치운다 */ });
}
function exPaint() {
  const box = $('#pl-e-photos'); if (!box || !EX) return;
  box.innerHTML = EX.photos.map(id => `<span class="pl-dy-ph"><img data-exph="${esc(id)}" alt="" data-act="exp-ph-view" data-id="${esc(id)}"><button type="button" data-act="exp-ph-del" data-id="${esc(id)}" aria-label="${esc(tr('사진 빼기'))}">×</button></span>`).join('')
    + (EX.photos.length < EXP_PHOTOS ? `<button type="button" class="pl-dy-add" data-act="exp-ph-add">${CAM_SVG}<span>${esc(tr('사진 {a}/{b}', { a: EX.photos.length, b: EXP_PHOTOS }))}</span></button>` : '');
  exHydrate(box, trip());
}
async function exAdd(files) {
  const st = EX; if (!st) return; const list = Array.from(files || []).filter(f => /^image\//.test(f.type || 'image/')); const room = EXP_PHOTOS - st.photos.length;
  if (list.length > room) toast(tr('사진은 {n}장까지 넣을 수 있어요.', { n: EXP_PHOTOS }));
  for (const f of list.slice(0, Math.max(0, room))) {
    try { const blob = await dyJpeg(f); const id = C.uid(); st.pend.set(id, await blob.arrayBuffer()); dyUrls.set(id, URL.createObjectURL(blob)); st.photos.push(id); }
    catch (e) { log('expense photo failed: ' + (e && e.message)); toast(tr('사진을 읽지 못했어요.')); }
    if (EX === st) exPaint();
  }
}
ACT['exp-ph-add'] = () => {
  let inp = $('#pl-e-in');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'pl-e-in'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true; document.body.appendChild(inp); inp.addEventListener('change', () => { const fs = Array.from(inp.files || []); inp.value = ''; exAdd(fs); }); }
  inp.click();
};
ACT['exp-ph-del'] = (d) => { if (!EX) return; EX.photos = EX.photos.filter(x => x !== d.id); EX.pend.delete(d.id); exPaint(); };
ACT['exp-ph-view'] = async (d) => {   // 크게 보기(누르면 닫힘). 목록의 미리보기는 그 지출의 사진을 모두(여러 장이면 아래로 넘겨 본다)
  const t = trip(); const ids = (d.ids ? d.ids.split(',') : [d.id]).filter(Boolean);
  const urls = (await Promise.all(ids.map(id => exUrl(t, id)))).filter(Boolean);
  if (!urls.length) { toast(tr('사진을 불러오지 못했어요.')); return; }
  let v = $('#pl-photo-view');
  if (!v) { v = document.createElement('div'); v.id = 'pl-photo-view'; v.className = 'pl-photo-view'; v.addEventListener('click', () => { v.hidden = true; }); document.body.appendChild(v); }
  v.classList.toggle('multi', urls.length > 1); v.innerHTML = urls.map(u => `<img src="${esc(u)}" alt="">`).join(''); v.hidden = false; v.scrollTop = 0;
};
// 지출 목록: 금액 오른쪽에 첫 사진을 작은 정사각으로(11-19 사용자: "사진 작게 해서 미리보기로 정사각 잘라서 금액 오른쪽에", "누르면 켜지도록")
function expThumb(e) {
  const ph = expPhotos(e); if (!ph.length) return '';
  return `<span class="pl-exp-thumb" data-act="exp-ph-view" data-id="${esc(ph[0])}" data-ids="${esc(ph.join(','))}" role="button" aria-label="${esc(tr('사진 {n}장', { n: ph.length }))}">${CAM_SVG}<img data-exthumb="${esc(ph[0])}" alt="">${ph.length > 1 ? `<i>${ph.length}</i>` : ''}</span>`;
}
const exThumbP = new Map();   // 사진 id → 작은 정사각 사진 주소(약속) — 큰 사진을 목록에 그대로 쓰면 폰 메모리를 많이 먹는다
function exThumbUrl(t, id) {
  if (exThumbP.has(id)) return exThumbP.get(id);
  const p = (async () => {
    const full = await exUrl(t, id); if (!full) return '';
    try {
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = full; });
      const w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h); if (!s) return full;
      const N = 120; const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      cv.getContext('2d').drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, N, N);   // 가운데를 정사각으로 잘라 줄인다
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85)); return blob ? URL.createObjectURL(blob) : full;
    } catch (e) { return full; }
  })();
  exThumbP.set(id, p); p.then((u) => { if (!u) exThumbP.delete(id); });   // 못 받았으면(인터넷 없음) 다음에 다시
  return p;
}
async function exThumbs(scope, t) {   // 하나씩(큰 사진을 한꺼번에 풀지 않게). 못 받은 사진은 카메라 그림이 남는다
  for (const im of $$('img[data-exthumb]', scope)) { const u = await exThumbUrl(t, im.dataset.exthumb); if (u) im.src = u; }
}
function expEach() {   // 나눠 낼 때 한 사람 몫
  const el = $('#pl-e-each'); const t = trip(); if (!el || !EX || !t) return;
  const n = EX.share === 'all' ? C.people(t).length : EX.share === 'some' ? EX.ids.length : 1; const amt = num(EX.amt);
  el.textContent = n > 1 && amt > 0 ? tr('한 사람당 {m}', { m: money(amt / n, EX.cur) }) : '';
}
ACT.exp = () => expSheet(null);
// 다른 사람의 개인 지출(그 사람이 보이게 해 둔 것, 예전에 대신 적어 둔 것)은 보기만 한다
const othersSolo = (t, e) => !!e && C.people(t).length > 1 && C.isPersonal(t, e) && C.shareOf(t, e).payer !== t.meId;
ACT['exp-edit'] = (d) => { const t = trip(); const e = t && t.expenses.find(x => x.id === d.id && !x.del); if (othersSolo(t, e)) expView(e); else expSheet(d.id); };
let EXV = null;
function expView(e) {
  const t = trip(); const so = C.shareOf(t, e); const p = personOf(t, so.payer); const c = catOf(e.cat); const x = C.expenseHome(t, e, fxNow()); EXV = e.id;
  const rows = [[tr('분류'), tr(c[1])], [tr('결제 수단'), methodName(e.method)], [tr('날짜'), dOf(e.day) ? longDay(e.day) : e.day]].concat(e.memo ? [[tr('메모'), e.memo]] : []);
  sheet(`<div class="sheet-title">${esc(tr('{name}의 개인 지출', { name: pname(t, p) }))}</div>
    <div class="pl-card-big">${esc(money(e.amt, e.cur))}</div>${e.cur !== t.home && x.home != null ? `<div class="pl-card-sub">≈ ${esc(money(x.home, t.home))}</div>` : ''}
    <ul class="pl-kv">${rows.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
    ${expPhotos(e).length ? `<div class="pl-dy-grid pl-e-photos">${expPhotos(e).map(id => `<span class="pl-dy-ph"><img data-exph="${esc(id)}" alt="" data-act="exp-ph-view" data-id="${esc(id)}"></span>`).join('')}</div>` : ''}
    <p class="caption">${esc(tr('다른 사람의 개인 지출은 보기만 할 수 있어요.'))}</p>
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>
    ${p && p.uid ? '' : `<button type="button" class="pl-link-danger" data-act="exp-view-del">${esc(tr('이 지출 지우기'))}</button>`}`, () => exHydrate(sheetEl(), t));
}
// 앱으로 들어오지 않은 사람 앞으로 예전에 적어 둔 개인 지출은 주인이 없으니 누구나 지울 수 있다
ACT['exp-view-del'] = () => { const t = trip(); const e = t && t.expenses.find(x => x.id === EXV); EXV = null; if (e) { const p = personOf(t, C.shareOf(t, e).payer); if (!(p && p.uid)) { e.del = true; C.touch(e); persist(t); for (const id of expPhotos(e)) { dropFileIfUnused(id); dropRemotePhoto(t, id); } toast(tr('지출을 지웠어요.')); } } closeSheet(); renderScreen(); };
ACT['exp-cur'] = () => { const t = trip(); if (!EX || t.cur === t.home) return; EX.cur = EX.cur === t.cur ? t.home : t.cur; $('#pl-e-cur').textContent = curLabel(EX.cur); if (!EX.userBasis) EX.basis = defaultBasis(t, EX); expConv(); };
ACT['exp-save'] = () => {
  const t = trip(); if (!t || !EX) return; const amt = num($('#pl-e-amt').value);
  if (!(amt > 0)) { toast(tr('금액을 적어 주세요.')); return; }
  const same = EX.cur === t.home; const basis = same ? 'auto' : EX.basis; const billed = num($('#pl-e-home').value);
  if (basis === 'billed' && !(billed > 0)) { toast(tr('실제 청구된 금액을 적어 주세요.')); return; }
  const multi = C.people(t).length > 1;
  if (multi && EX.share === 'some' && !EX.ids.length) { toast(tr('누구 몫인지 골라 주세요.')); return; }
  const payer0 = EX.payer || t.meId; const one = multi && EX.share === 'some' && EX.ids.length === 1 && EX.ids[0] === payer0;   // 낸 사람 혼자의 몫 = 그 사람의 개인 지출
  if (one && payer0 !== t.meId) { toast(tr('다른 사람의 개인 지출은 적을 수 없어요. 그 사람이 직접 적어야 해요.')); return; }
  const e = EX.id ? t.expenses.find(x => x.id === EX.id) : { id: C.uid(), c: C.now() };
  const keep = EX.id && e.basis === 'auto' && e.cur === EX.cur && e.rate > 0;   // 고칠 때는 처음 적을 때의 환율을 그대로 둔다
  Object.assign(e, { day: $('#pl-e-day').value || C.today(), amt, cur: EX.cur, cat: EX.cat, method: EX.method, basis, memo: $('#pl-e-memo').value.trim() });
  if (basis === 'billed') { e.home = billed; delete e.rate; delete e.approx; delete e.rateDate; }
  else if (basis === 'mine' || same) { delete e.home; delete e.rate; delete e.approx; delete e.rateDate; const mr = same ? null : C.myRate(t, e.cur); if (mr) e.rate = mr; }
  else { delete e.home; if (!keep) { const fx = fxNow(); const r = C.fxRate(fx, e.cur, t.home); if (r) { e.rate = r; e.approx = !!fx.approx; e.rateDate = fx.date || ''; } else { delete e.rate; delete e.approx; delete e.rateDate; } } }
  if (multi) {
    if (EX.share === 'solo' || one) { e.payer = t.meId; e.share = { mode: 'solo' }; }   // 내 개인 지출: 낸 사람은 언제나 나
    else { e.payer = payer0; e.share = EX.share === 'some' ? { mode: 'some', ids: EX.ids.slice() } : { mode: 'all' }; if (EX.done) e.share.done = true; }
    if (EX.share !== 'some') ST.prefs.share = EX.share;
  } else { e.payer = t.meId; delete e.share; }
  const removedPh = expPhotos(e).filter(id => !EX.photos.includes(id));
  const saves = []; for (const id of EX.photos) if (EX.pend.has(id)) saves.push(C.Store.putFile({ id, name: 'receipt.jpg', mime: 'image/jpeg', buf: EX.pend.get(id) }).catch(err => log('expense photo save failed: ' + (err && err.message))));
  if (saves.length) phSaving = Promise.all([phSaving.catch(() => { /* ignore */ }), ...saves]);   // 다 저장된 뒤에 서버에 올린다(uploadPhotos)
  if (EX.photos.length) e.photos = EX.photos.slice(); else delete e.photos;
  if (!EX.id) t.expenses.push(e);
  C.touch(e); persist(t); for (const id of removedPh) { dropFileIfUnused(id); dropRemotePhoto(t, id); } ST.prefs.cat = e.cat; ST.prefs.method = e.method; savePrefs();
  if (multi && !photoShared(t, e)) for (const id of expPhotos(e)) dropRemotePhoto(t, id, true);   // 함께 쓴 돈 → 나만 보는 개인 지출로 바꾸면 올려 둔 영수증도 서버에서 내린다
  closeSheet(); renderScreen(); toast(tr('지출을 적었어요.'));
};
ACT['exp-del'] = () => { const t = trip(); if (!EX || !EX.id) return; const e = t.expenses.find(x => x.id === EX.id); if (e) { e.del = true; C.touch(e); persist(t); for (const id of expPhotos(e)) { dropFileIfUnused(id); dropRemotePhoto(t, id); } } closeSheet(); renderScreen(); toast(tr('지출을 지웠어요.')); };

function rateSheet() {
  const t = trip(); const fx = fxNow(); const cur = t.cur, home = t.home; const r = C.fxRate(fx, cur, home); const w = C.wallet(t, cur); const xs = C.live(t.exchanges).filter(x => x.cur === cur);
  sheet(`<div class="sheet-title">${esc(tr('환율'))}</div>
    <div class="pl-note"><b>${esc(fx.approx ? tr('참고용 환율') : tr('오늘 환율|basis'))}</b> · ${esc(r ? rateTxt(cur, r, home) : tr('정보 없음'))}<br>${esc(fx.approx ? tr('환율을 아직 받지 못해 대략값으로 계산하고 있어요. 인터넷에 연결되면 자동으로 바뀌어요.') : tr('{d} 기준 고시환율이에요.', { d: fx.date || '' }) + (fx.attr ? ' ' + tr('출처: {s}', { s: fx.attr }) : ''))}</div>
    <div class="pl-flabel">${esc(tr('내 환전 기록'))}</div>
    ${xs.length ? xs.map(x => `<div class="pl-x"><div class="pl-x-body">${esc(money(x.foreign, cur))} ← ${esc(money(x.home, home))}<small>${esc(rateTxt(cur, x.home / x.foreign, home))}</small></div><button type="button" class="pl-x-del" data-act="x-del" data-id="${esc(x.id)}" aria-label="${esc(tr('삭제'))}">×</button></div>`).join('') : `<p class="caption" style="margin-top:0">${esc(tr('환전한 금액을 적어 두면 현금으로 쓴 돈을 실제로 낸 돈 기준으로 계산해요.'))}</p>`}
    <div class="pl-x-add"><input id="pl-x-f" inputmode="decimal" autocomplete="off" placeholder="${esc(tr('받은 돈 ({c})', { c: cur }))}"><input id="pl-x-h" inputmode="decimal" autocomplete="off" placeholder="${esc(tr('낸 돈 ({c})', { c: home }))}"><button type="button" data-act="x-add">${esc(tr('추가'))}</button></div>
    ${w.avg ? `<div class="pl-note"><b>${esc(tr('내 환전 환율'))}</b> · ${esc(rateTxt(cur, w.avg, home))}<br>${esc(tr('환전한 {a} 중 {b} 사용 · {c} 남음', { a: money(w.bought, cur), b: money(w.spent, cur), c: money(w.left, cur) }))}</div>` : ''}
    <p class="caption">${esc(tr('고시환율은 실제 환전·카드 결제 환율과 달라요. 정확히 하려면 환전 기록을 적거나, 지출마다 실제 청구액을 적어 주세요.'))}</p>
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
}
ACT.rate = () => rateSheet();
ACT['x-add'] = () => {
  const t = trip(); const f = num($('#pl-x-f').value), h = num($('#pl-x-h').value);
  if (!(f > 0) || !(h > 0)) { toast(tr('받은 돈과 낸 돈을 모두 적어 주세요.')); return; }
  t.exchanges.push({ id: C.uid(), cur: t.cur, foreign: f, home: h, date: C.today(), c: C.now(), u: C.now() }); persist(t); renderScreen(); rateSheet();
};
ACT['x-del'] = (d) => { const t = trip(); const x = t.exchanges.find(y => y.id === d.id); if (!x) return; x.del = true; C.touch(x); persist(t); renderScreen(); rateSheet(); };
ACT.budget = () => {
  const t = trip(); const b = C.budgetInfo(t, fxNow()); const multi = C.people(t).length > 1;
  sheet(`<div class="sheet-title">${esc(multi ? tr('내 예산') : tr('예산'))}</div><p class="desc">${esc(multi ? tr('내가 이 여행에 쓸 돈을 1인 기준으로 적어 주세요. 함께 쓴 돈 중 내 몫, 내 개인 지출, 미리 결제한 돈의 내 몫을 더한 것과 견줘요. 예산은 나만 봐요.') : tr('여행 전체에 쓸 돈을 적어 주세요. 항공·숙소처럼 미리 결제한 돈도 포함해요.'))}</p>
    <div class="field"><label for="pl-b-total">${esc(multi ? tr('내 예산 · 1인 기준 ({c})', { c: t.home }) : tr('총예산 ({c})', { c: t.home }))}</label><input id="pl-b-total" inputmode="decimal" autocomplete="off" value="${b.total != null ? Math.round(b.total * 100) / 100 : ''}"></div>
    ${b.daily != null ? `<div class="pl-note">${esc(tr('미리 결제한 돈을 빼고 하루에 {m}씩 쓸 수 있어요.', { m: money(b.daily, t.home) }))}</div>` : ''}
    <button type="button" class="btn primary" data-act="budget-save">${esc(tr('저장'))}</button>`);
};
ACT['budget-save'] = () => { const t = trip(); const v = num($('#pl-b-total').value); t.myBudget = { total: v > 0 ? v : 0 }; persist(t); closeSheet(); renderScreen(); };   // 나만 보는 부분에(사람마다 예산이 다르다)
// ---------- 내 개인 지출: 나만 보기 / 함께 가는 사람에게도 보이기(11-19 사용자: "내 개인 지출을 보여줄지 말지를 선택") ----------
ACT['solo-open'] = () => {
  const t = trip(); if (!t) return;
  sheet(`<div class="sheet-title">${esc(tr('내 개인 지출'))}</div>
    <p class="desc">${esc(tr('개인 지출은 나만 적고 고칠 수 있어요. 함께 가는 사람에게 보일지 여기서 정해요. 보이게 해도 다른 사람은 보기만 해요.'))}</p>
    <div class="chips" id="pl-so">${[['0', tr('나만 보기')], ['1', tr('함께 가는 사람에게도 보이기')]].map(([k, n]) => `<button type="button" class="chip ${(t.soloOpen ? '1' : '0') === k ? 'active' : ''}" data-v="${k}">${esc(n)}</button>`).join('')}</div>
    <button type="button" class="btn primary" data-act="solo-open-save" style="margin-top:16px">${esc(tr('저장'))}</button>`, () => chipGroup('#pl-so'));
};
ACT['solo-open-save'] = () => {
  const t = trip(); if (!t) return; const on = chipVal('#pl-so') === '1'; const was = !!t.soloOpen; closeSheet(); if (on === was) return;
  t.soloOpen = on; persist(t);
  if (!on) for (const e of C.live(t.expenses)) if (C.isPersonal(t, e)) for (const id of expPhotos(e)) dropRemotePhoto(t, id, true);   // 올려 둔 개인 지출의 영수증도 서버에서 내린다
  renderScreen(); toast(on ? tr('내 개인 지출이 함께 가는 사람에게도 보여요.') : tr('내 개인 지출은 이제 나만 봐요.'));
};
// ---------- 지출 내보내기(CSV, 11-19 사용자: "내보내기 기능도 만들어줘 csv로") ----------
// 내가 볼 수 있는 지출(함께 쓴 돈 + 내 개인 지출 + 남이 보이게 해 둔 개인 지출)을 표 앱에서 열 수 있는 파일로. 엑셀이 한글을 읽도록 맨 앞에 BOM 을 둔다
const csvText = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };   // 수식으로 읽히지 않게(=·+·-·@ 로 시작하는 글)
function expenseCsv(t) {
  const fx = fxNow(); const home = t.home; const multi = C.people(t).length > 1; const nm = (id) => { const p = personOf(t, id); return p ? pname(t, p) : ''; };
  const n2 = (v, cur) => { if (v == null || !Number.isFinite(v)) return ''; const k = Math.pow(10, C.curInfo(cur).dec); return String(Math.round(v * k) / k); };
  const head = [tr('날짜'), tr('분류'), tr('메모'), tr('금액'), tr('통화'), tr('환산 금액 ({c})', { c: home }), tr('결제 수단')].concat(multi ? [tr('구분'), tr('낸 사람'), tr('나눈 사람'), tr('내 몫 ({c})', { c: home }), tr('정산')] : []).concat([tr('사진 수')]);
  const rows = C.live(t.expenses).slice().sort((a, b) => (a.day === b.day ? (a.c || 0) - (b.c || 0) : ((a.day || '') < (b.day || '') ? -1 : 1))).map((e) => {
    const x = C.expenseHome(t, e, fx); const so = C.shareOf(t, e); const part = x.home == null ? null : (so.among.includes(t.meId) ? x.home / so.among.length : 0);
    const r = [csvText(e.day || ''), csvText(tr(catOf(e.cat)[1])), csvText(e.memo || ''), n2(e.amt, e.cur), csvText(e.cur || ''), n2(x.home, home), csvText(methodName(e.method))];
    if (multi) r.push(csvText(so.shared ? tr('함께') : tr('개인')), csvText(nm(so.payer)), csvText(so.among.map(nm).join(' · ')), n2(part, home), csvText(so.shared ? (e.share && e.share.done ? tr('나눔 끝') : tr('정산 전')) : ''));
    r.push(expPhotos(e).length ? String(expPhotos(e).length) : '');
    return r;
  });
  return '\uFEFF' + [head.map(csvText)].concat(rows).map(r => r.join(',')).join('\r\n') + '\r\n';
}
ACT['exp-export'] = async () => {
  const t = trip(); if (!t) return; if (!C.live(t.expenses).length) { toast(tr('내보낼 지출이 없어요.')); return; }
  const name = (String(t.title || tr('여행')).replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 40) || 'trip') + ' ' + tr('경비') + '.csv';
  const ok = H.shareFile ? await H.shareFile({ name, mime: 'text/csv', blob: new Blob([expenseCsv(t)], { type: 'text/csv;charset=utf-8' }) }).catch(() => false) : false;
  if (!ok) toast(tr('내보내지 못했어요.'));
};

function calcOut() {
  const t = trip(); const el = $('#pl-c-out'); if (!el || !CALC || !t) return; const fx = fxNow();
  const a = num($('#pl-c-amt').value) * (1 + CALC.adj / 100); const from = CALC.from, to = from === t.cur ? t.home : t.cur;
  const conv = (r) => (from === t.cur ? a * r : a / r); const rows = [];
  const rA = C.fxRate(fx, t.cur, t.home), rM = C.myRate(t, t.cur);
  if (rA) rows.push([fx.approx ? tr('참고용 환율') : tr('오늘 환율|basis'), conv(rA), rateTxt(t.cur, rA, t.home)]);
  if (rM) rows.push([tr('내 환전 환율'), conv(rM), rateTxt(t.cur, rM, t.home)]);
  CALC.value = a > 0 ? a : 0;
  el.innerHTML = rows.length ? rows.map(([n, v, rt]) => `<div class="r"><span>${esc(n)}<small>${esc(rt)}</small></span><b>${esc(money(a > 0 ? v : 0, to))}</b></div>`).join('') : `<div class="r"><span>${esc(tr('이 통화는 환율 정보가 없어요.'))}</span></div>`;
}
function calcSheet() {
  const t = trip(); if (!t) return; const from = t.cur;
  sheet(`<div class="sheet-title">${esc(tr('환율 계산기'))}</div>
    <div class="pl-amt"><button type="button" class="pl-curbtn" data-act="calc-swap" id="pl-c-cur">${esc(curLabel(from))}</button><input id="pl-c-amt" inputmode="decimal" autocomplete="off" placeholder="0"></div>
    <div class="pl-calc-out" id="pl-c-out"></div>
    <div class="chips small" id="pl-c-adj">${[[0, '그대로'], [10, '세금 10% 더하기'], [15, '팁 15%'], [18, '팁 18%'], [20, '팁 20%']].map(([v, n]) => `<button type="button" class="chip ${v === 0 ? 'active' : ''}" data-v="${v}">${esc(tr(n))}</button>`).join('')}</div>
    <div class="pl-sheet-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="calc-save">${esc(tr('지출로 적기'))}</button></div>`, () => {
    CALC = { from, adj: 0, value: 0 };
    const a = $('#pl-c-amt'); a.addEventListener('input', calcOut); chipGroup('#pl-c-adj', (v) => { CALC.adj = +v; calcOut(); }); calcOut(); a.focus();
  });
}
ACT.calc = () => calcSheet();
ACT['calc-swap'] = () => { const t = trip(); if (!CALC) return; CALC.from = CALC.from === t.cur ? t.home : t.cur; $('#pl-c-cur').textContent = curLabel(CALC.from); calcOut(); };
ACT['calc-save'] = () => { if (!CALC) return; const v = CALC.value, cur = CALC.from; const dec = C.curInfo(cur).dec; if (!(v > 0)) { toast(tr('금액을 적어 주세요.')); return; } expSheet(null, { amt: String(dec === 0 ? Math.round(v) : Math.round(v * 100) / 100), cur }); };

// ---------- 일기 ----------
// ---------- 일기: 블로그처럼 제목 · 긴 글 · 사진 ----------
// 글은 여행과 함께 저장되고(나만 보는 쪽으로 서버에도), 사진은 이 기기 안에만 둔다(긴 변 1600px JPEG 로 다시 만들어 위치 정보가 빠진다). 게시판에 올리는 것은 '게시판에 공유하기'를 눌렀을 때뿐이다.
const DY_PHOTOS = 10, DY_TEXT = 5000;
const dyUrls = new Map();   // 사진 id → 화면에 쓸 주소
const dyPhotos = (e) => (e && Array.isArray(e.photos) ? e.photos : []);
async function dyUrl(id) {
  if (dyUrls.has(id)) return dyUrls.get(id);
  try { const r = await C.Store.getFile(id); if (r && r.buf) { const u = URL.createObjectURL(new Blob([r.buf], { type: 'image/jpeg' })); dyUrls.set(id, u); return u; } } catch (e) { /* 아래로 */ }
  return '';
}
function dyHydrate(scope) {   // data-dy 가 달린 그림에 기기 안 사진을 채운다. 이 기기에 없는 사진(다른 기기에서 쓴 일기)은 자리를 접는다
  $$('img[data-dy]', scope || document).forEach((im) => { dyUrl(im.dataset.dy).then((u) => { if (u) im.src = u; else { const b = im.closest('.pl-dy-ph'); if (b) b.classList.add('gone'); } }); });
}
const dyHas = (e) => !!e && !!(e.text || e.title || dyPhotos(e).length);
function diaryCard(t, d, e, feed) {
  const ph = dyPhotos(e); const head = feed ? `${t.title || tr('이름 없는 여행')} · ${tr('{n}일차', { n: dayNo(t, d) })}` : `${tr('{n}일차', { n: dayNo(t, d) })} · ${longDay(d)}`;
  const meta = []; if (feed) meta.push(longDay(d));
  else { const its = C.dayItems(t, d).filter(i => i.kind !== 'note'); if (its.length) meta.push(tr('{a}곳 중 {b}곳 방문', { a: its.length, b: its.filter(i => i.done).length })); const tot = C.myTotals(t, fxNow()); if (tot.byDay[d] > 0) meta.push(tr('쓴 돈 {m}', { m: money(tot.byDay[d], t.home) })); }
  const td = C.today();
  return `<div class="pl-diary" role="button" tabindex="0" data-act="diary" data-day="${d}" data-trip="${esc(t.id)}"><div class="pl-diary-day">${esc(head)}</div>${meta.length ? `<div class="pl-diary-meta">${esc(meta.join(' · '))}</div>` : ''}`
    + (ph.length ? `<div class="pl-dy-strip n${Math.min(3, ph.length)}">${ph.slice(0, 3).map((id, k) => `<span class="pl-dy-ph"><img data-dy="${esc(id)}" alt="">${k === 2 && ph.length > 3 ? `<i>+${ph.length - 3}</i>` : ''}</span>`).join('')}</div>` : '')
    + (e && e.title ? `<div class="pl-diary-title">${esc(e.title)}</div>` : '')
    + (e && e.text ? `<div class="pl-diary-text">${esc(e.text)}</div>` : (dyHas(e) ? '' : `<div class="pl-diary-empty">${esc(d === td ? tr('오늘 하루를 한 줄로 남겨 보세요') : tr('이날을 한 줄로 남겨 보세요'))}</div>`)) + '</div>';
}
function diarySec(t) {
  const td = C.today(); const written = new Set(C.live(t.diary).filter(dyHas).map(x => x.day));
  const days = C.tripDays(t).filter(d => d <= td || written.has(d));   // 지난 날과 오늘, 그리고 이미 적어 둔 날
  if (!days.length) return { html: `<p class="pl-hint">${esc(tr('여행이 시작되면 하루에 한 줄씩 남길 수 있어요.'))}</p>` };
  const html = days.slice().reverse().map(d => diaryCard(t, d, C.live(t.diary).find(x => x.day === d), false)).join('');
  return { html, after: (el) => dyHydrate(el) };
}
let DY = null;   // 쓰고 있는 일기: { day, photos: [id], pend: Map(id → ArrayBuffer) }
SCREENS.diary = (p) => {
  const t = trip(); if (!t) return { title: '', html: '' }; const e = C.live(t.diary).find(x => x.day === p.day);
  if (!DY || DY.day !== p.day || DY.trip !== t.id) DY = { day: p.day, trip: t.id, photos: dyPhotos(e).slice(), pend: new Map(), title: e ? e.title || '' : '', text: e ? e.text || '' : '' };
  const html = `<div class="pl-dy-edit"><input id="pl-dy-title" class="pl-dy-title" maxlength="60" autocomplete="off" placeholder="${esc(tr('제목(선택)'))}" value="${esc(DY.title)}">
    <div class="pl-dy-grid" id="pl-dy-photos"></div>
    <textarea id="pl-dy-text" rows="12" maxlength="${DY_TEXT}" placeholder="${esc(tr('오늘 가장 기억에 남는 순간은?'))}">${esc(DY.text)}</textarea>
    <p class="caption">${esc(tr('사진은 이 폰 안에만 저장돼요. 게시판에 공유하기를 누르기 전에는 어디에도 올라가지 않아요.'))}</p>
    ${dyHas(e) ? `<button type="button" class="pl-link" data-act="dy-share">${esc(tr('게시판에 공유하기'))}</button><button type="button" class="pl-link-danger" data-act="dy-del">${esc(tr('이 일기 지우기'))}</button>` : ''}</div>`;
  return { title: `${tr('{n}일차', { n: dayNo(t, p.day) })} · ${longDay(p.day)}`, html, cta: `<button type="button" class="btn primary" data-act="diary-save">${esc(tr('저장'))}</button>`, after: () => {
    dyPaint(); const ti = $('#pl-dy-title'), tx = $('#pl-dy-text');
    ti.addEventListener('input', () => { if (DY) DY.title = ti.value; }); tx.addEventListener('input', () => { if (DY) DY.text = tx.value; });
  } };
};
function dyPaint() {
  const box = $('#pl-dy-photos'); if (!box || !DY) return;
  box.innerHTML = DY.photos.map(id => `<span class="pl-dy-ph"><img data-dy="${esc(id)}" alt=""><button type="button" data-act="dy-ph-del" data-id="${esc(id)}" aria-label="${esc(tr('사진 빼기'))}">×</button></span>`).join('')
    + (DY.photos.length < DY_PHOTOS ? `<button type="button" class="pl-dy-add" data-act="dy-ph-add">${CAM_SVG}<span>${esc(tr('사진 {a}/{b}', { a: DY.photos.length, b: DY_PHOTOS }))}</span></button>` : '');
  dyHydrate(box);
}
const CAM_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 8.500A2.500 2.500 0 0 1 6.500 6h1.300l1.200-2h6l1.200 2h1.300A2.500 2.500 0 0 1 20 8.500v8A2.500 2.500 0 0 1 17.500 19h-11A2.500 2.500 0 0 1 4 16.500v-8z" stroke="currentColor" stroke-width="1.900" stroke-linejoin="round"/><circle cx="12" cy="12.500" r="3.200" stroke="currentColor" stroke-width="1.900"/></svg>';
async function dyJpeg(file) {   // 긴 변 1600px JPEG 로 다시 그린다(촬영 위치 같은 정보가 빠진다)
  let src = null; try { if (root.createImageBitmap) src = await root.createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
  let url = null; if (!src) { url = URL.createObjectURL(file); src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image')); im.src = url; }); }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight; if (!(w > 0 && h > 0)) throw new Error('image');
  const k = Math.min(1, 1600 / Math.max(w, h)); const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(src, 0, 0, cv.width, cv.height);
  if (url) URL.revokeObjectURL(url); if (src.close) src.close();
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.82)); if (!blob) throw new Error('image');
  return blob;
}
async function dyAdd(files) {
  const st = DY; if (!st) return; const list = Array.from(files || []).filter(f => /^image\//.test(f.type || 'image/')); const room = DY_PHOTOS - st.photos.length;
  if (list.length > room) toast(tr('사진은 {n}장까지 넣을 수 있어요.', { n: DY_PHOTOS }));
  for (const f of list.slice(0, Math.max(0, room))) {
    try { const blob = await dyJpeg(f); const id = C.uid(); st.pend.set(id, await blob.arrayBuffer()); dyUrls.set(id, URL.createObjectURL(blob)); st.photos.push(id); }
    catch (e) { log('diary photo failed: ' + (e && e.message)); toast(tr('사진을 읽지 못했어요.')); }
    if (DY === st) dyPaint();
  }
}
ACT['dy-ph-add'] = () => {
  let inp = $('#pl-dy-in');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'pl-dy-in'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true; document.body.appendChild(inp); inp.addEventListener('change', () => { const fs = Array.from(inp.files || []); inp.value = ''; dyAdd(fs); }); }
  inp.click();
};
ACT['dy-ph-del'] = (d) => { if (!DY) return; DY.photos = DY.photos.filter(x => x !== d.id); DY.pend.delete(d.id); dyPaint(); };
ACT.diary = (d) => { if (d.trip && d.trip !== ST.tripId) { openTrip(d.trip, 'diary'); } DY = null; show('diary', { day: d.day }); };
ACT['diary-save'] = () => {
  const t = trip(); const st = DY; if (!t || !st) return; const text = $('#pl-dy-text').value.trim(), title = $('#pl-dy-title').value.trim(); let e = C.live(t.diary).find(x => x.day === st.day);
  const empty = !text && !title && !st.photos.length;
  if (!e && empty) { DY = null; back(); return; }
  if (!e) { e = { id: C.uid(), day: st.day, c: C.now() }; t.diary.push(e); }
  const removed = dyPhotos(e).filter(id => !st.photos.includes(id));   // 뺀 사진은 아무 여행도 안 쓰면 기기에서도 지운다(아래에서 일기를 고친 뒤)
  for (const id of st.photos) if (st.pend.has(id)) C.Store.putFile({ id, name: 'diary.jpg', mime: 'image/jpeg', buf: st.pend.get(id) }).catch(err => log('diary photo save failed: ' + (err && err.message)));
  if (empty) e.del = true; else { e.text = text; e.title = title; e.photos = st.photos.slice(); }
  for (const id of removed) dropFileIfUnused(id);
  C.touch(e); persist(t); DY = null; back(); toast(empty ? tr('일기를 지웠어요.') : tr('일기를 남겼어요.'));
};
ACT['dy-del'] = async () => {
  const t = trip(); const st = DY; const e = t && st ? C.live(t.diary).find(x => x.day === st.day) : null; if (!e) return;
  const ok = await H.askConfirm(tr('이 일기를 지울까요?'), tr('글과 사진이 이 폰에서 지워져요. 게시판에 올린 글은 그대로예요.'), tr('지우기'), true); if (!ok) return;
  e.del = true; C.touch(e); persist(t); for (const id of dyPhotos(e)) dropFileIfUnused(id); DY = null; back(); toast(tr('일기를 지웠어요.'));
};
// 게시판에 공유하기: 저장해 둔 글과 사진으로 커뮤니티 글쓰기 화면을 연다(올리기 전에 고칠 수 있다. 올리기를 눌러야 공개된다)
ACT['dy-share'] = async () => {
  const t = trip(); const st = DY; const e = t && st ? C.live(t.diary).find(x => x.day === st.day) : null; if (!e || !root.Community || !root.Community.compose) return;
  const files = []; for (const id of dyPhotos(e)) { try { const r = await C.Store.getFile(id); if (r && r.buf) files.push(new Blob([r.buf], { type: 'image/jpeg' })); } catch (err) { /* 없는 사진은 건너뛴다 */ } }
  const title = e.title || `${t.title || tr('이름 없는 여행')} ${tr('{n}일차', { n: dayNo(t, e.day) })}`;
  DY = null; closeSheet(); closeScreens(); H.showTab('comm');
  root.Community.compose({ board: 'brag', title, body: e.text || '', files });
};
/** 모든 여행의 일기를 최근 날짜부터(여권 탭의 '여행일기') */
function diaryFeed(el) {
  const rows = []; for (const t of ST.trips) if (!t.del && !t.sample) for (const e of C.live(t.diary || [])) if (dyHas(e)) rows.push([t, e]);
  rows.sort((a, b) => (a[1].day < b[1].day ? 1 : a[1].day > b[1].day ? -1 : 0));
  el.innerHTML = rows.length ? rows.map(([t, e]) => diaryCard(t, e.day, e, true)).join('') : `<p class="pl-hint">${esc(tr('아직 쓴 일기가 없어요. 여행 탭에서 여행을 열고 ‘일기’에 남겨 보세요.'))}</p>`;
  dyHydrate(el);
}

// ---------- 준비: 예약 내역 · 준비물 · 할 일 ----------
const bkKind = (k) => { const f = PD.BOOKINGS.find(x => x[0] === k); return tr(f ? f[1] : '기타'); };
function bkSub(b, t) { const a = []; if (b.start) a.push(dtRange(b.start, b.end)); if (b.code) a.push(tr('예약 번호 {c}', { c: b.code })); if (b.paid > 0) a.push(money(b.paid, t.home)); return a.join(' · '); }
function prepSec(t) {
  const bks = C.live(t.bookings).filter(b => b.kind !== 'cand').slice().sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
  let h = `<div class="section-head" style="margin-top:6px"><div class="section-title">${esc(tr('예약 내역'))}</div><button type="button" class="section-more" data-act="bk">${esc(tr('추가'))}</button></div>`;
  h += bks.length ? bks.map(b => `<div class="pl-bk" data-act="bk" data-id="${esc(b.id)}"><span class="pl-bk-kind">${esc(bkKind(b.kind))}</span><div class="pl-bk-body"><div class="pl-bk-title">${esc(b.title)}</div><div class="pl-bk-sub">${esc(bkSub(b, t))}</div></div><span class="chev"></span></div>`).join('')
    : `<p class="caption" style="margin-top:0">${esc(tr('항공, 숙소, 입장권 같은 예약을 적어 두면 예약 번호를 바로 찾을 수 있어요.'))}</p>`;
  for (const [kind, title, ph] of [['pack', '준비물', '준비물 추가 (예: 수영복)'], ['todo', '출국 전 할 일', '할 일 추가 (예: 환전하기)']]) {
    const raw = C.live(t.checklist).filter(c => c.kind === kind); const done = raw.filter(c => c.done).length;
    const list = raw.filter(c => !c.done).sort((a, b) => (b.c || 0) - (a.c || 0)).concat(raw.filter(c => c.done));   // 방금 적은 것이 맨 위, 끝낸 것은 아래로
    h += `<div class="section"><div class="section-head"><div class="section-title">${esc(tr(title))}${list.length ? ` ${done}/${list.length}` : ''}</div>${list.length ? '' : `<button type="button" class="section-more" data-act="chk-tpl" data-kind="${kind}">${esc(tr('기본 목록 불러오기'))}</button>`}</div>`;
    h += `<div class="pl-addrow"><input id="pl-chk-${kind}" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="${esc(tr(ph))}"><button type="button" data-act="chk-add" data-kind="${kind}">${esc(tr('추가'))}</button></div>`;
    h += list.map(c => `<div class="pl-check ${c.done ? 'on' : ''}" data-act="chk" data-id="${esc(c.id)}"><span class="pl-box"></span><span class="pl-check-title">${esc(c.title)}</span><button type="button" class="pl-check-del" data-act="chk-del" data-id="${esc(c.id)}" aria-label="${esc(tr('삭제'))}">×</button></div>`).join('');
    if (!raw.length) h += `<p class="caption" style="margin-top:2px">${esc(tr('직접 적거나, 기본 목록을 불러와 고쳐 쓰세요.'))}</p>`;
    h += '</div>';
  }
  return { html: h, after: () => { for (const k of ['pack', 'todo']) { const i = $('#pl-chk-' + k); if (i) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ACT['chk-add']({ kind: k }); } }); } } };
}
ACT.chk = (d) => { const t = trip(); const c = t.checklist.find(x => x.id === d.id); if (!c) return; c.done = !c.done; C.touch(c); persist(t); renderScreen(); };
ACT['chk-del'] = (d) => { const t = trip(); const c = t.checklist.find(x => x.id === d.id); if (!c) return; c.del = true; C.touch(c); persist(t); renderScreen(); };
ACT['chk-add'] = (d) => { const t = trip(); const inp = $('#pl-chk-' + d.kind); const v = inp ? inp.value.trim() : ''; if (!v) return; t.checklist.push({ id: C.uid(), kind: d.kind, title: v, done: false, c: C.now(), u: C.now() }); persist(t); renderScreen(); const again = $('#pl-chk-' + d.kind); if (again) again.focus(); };
ACT['chk-tpl'] = (d) => {
  const t = trip(); const ccs = new Set((t.dests || []).map(x => x.cc)); let list = (PD.CHECK[d.kind] || []).slice();
  for (const cc of ccs) if (PD.CHECK[cc] && PD.CHECK[cc][d.kind]) list = list.concat(PD.CHECK[cc][d.kind]);
  for (const name of list) t.checklist.push({ id: C.uid(), kind: d.kind, title: tr(name), done: false, c: C.now(), u: C.now() });
  persist(t); renderScreen();
};
function bkSheet(id) {
  const t = trip(); const b = id ? t.bookings.find(x => x.id === id) : null; const v = b || { kind: 'flight', title: '', start: '', end: '', code: '', paid: '', addr: '', memo: '' };
  sheet(`<div class="sheet-title">${esc(b ? tr('예약 고치기') : tr('예약 추가'))}</div>
    <div class="chips small" id="pl-k-kind">${PD.BOOKINGS.map(([k, n]) => `<button type="button" class="chip ${v.kind === k ? 'active' : ''}" data-v="${k}">${esc(tr(n))}</button>`).join('')}</div>
    <div class="field" style="margin-top:14px"><label for="pl-k-title">${esc(tr('이름'))}</label><input id="pl-k-title" maxlength="60" autocomplete="off" placeholder="${esc(tr('예: 김포 → 간사이 7C1302'))}" value="${esc(v.title)}"></div>
    <div class="pl-date-row"><div class="field"><label for="pl-k-start">${esc(tr('시작'))}</label><input id="pl-k-start" type="datetime-local" value="${esc(v.start)}"></div><div class="field"><label for="pl-k-end">${esc(tr('끝'))}</label><input id="pl-k-end" type="datetime-local" value="${esc(v.end)}"></div></div>
    <div class="field"><label for="pl-k-code">${esc(tr('예약 번호'))}</label><input id="pl-k-code" maxlength="40" autocomplete="off" value="${esc(v.code)}"></div>
    <div class="field"><label for="pl-k-paid">${esc(tr('결제한 금액 ({c})', { c: t.home }))}</label><input id="pl-k-paid" inputmode="decimal" autocomplete="off" value="${esc(v.paid || '')}"></div>
    <div class="field"><label for="pl-k-addr">${esc(tr('주소(현지 글자로 적으면 택시 기사에게 보여줄 수 있어요)'))}</label><input id="pl-k-addr" maxlength="120" autocomplete="off" value="${esc(v.addr)}"></div>
    <div class="field"><label for="pl-k-memo">${esc(tr('메모'))}</label><input id="pl-k-memo" maxlength="120" autocomplete="off" value="${esc(v.memo)}"></div>
    <button type="button" class="btn primary" data-act="bk-save" data-id="${esc(id || '')}">${esc(tr('저장'))}</button>
    ${b && b.addr ? `<button type="button" class="pl-link" data-act="taxi" data-id="${esc(id)}">${esc(tr('택시 기사에게 보여주기'))}</button>` : ''}
    ${b ? `<button type="button" class="pl-link-danger" data-act="bk-del" data-id="${esc(id)}">${esc(tr('이 예약 지우기'))}</button>` : ''}`, () => chipGroup('#pl-k-kind'));
}
ACT.bk = (d) => { const b = d.id ? trip().bookings.find(x => x.id === d.id) : null; if (b && b.dir) waySheet(b.id); else if (b && b.kind === 'stay') staySheet(b.id); else bkSheet(d.id || null); };
ACT['bk-save'] = (d) => {
  const t = trip(); const title = $('#pl-k-title').value.trim(); if (!title) { toast(tr('이름을 적어 주세요.')); return; }
  const b = d.id ? t.bookings.find(x => x.id === d.id) : { id: C.uid(), c: C.now() }; const paid = num($('#pl-k-paid').value);
  Object.assign(b, { kind: chipVal('#pl-k-kind') || 'etc', title, start: $('#pl-k-start').value, end: $('#pl-k-end').value, code: $('#pl-k-code').value.trim(), paid: paid > 0 ? paid : 0, addr: $('#pl-k-addr').value.trim(), memo: $('#pl-k-memo').value.trim() });
  if (!d.id) t.bookings.push(b); C.touch(b); persist(t); closeSheet(); renderScreen();
};
ACT['bk-del'] = (d) => { const t = trip(); const b = t.bookings.find(x => x.id === d.id); if (!b) return; b.del = true; C.touch(b); persist(t); closeSheet(); renderScreen(); };
// 택시 카드: 이름과 주소를 화면 가득 크게
ACT.taxi = (d) => {
  const b = trip().bookings.find(x => x.id === d.id); if (!b) return; closeSheet();
  const el = document.createElement('div'); el.id = 'pl-taxi';
  const local = root.PlannerTicket ? root.PlannerTicket.localLang(((trip().dests || []).find(x => x.cc) || {}).cc) : 'en';   // 그 나라 말 판을 먼저
  const docs = stepFiles(trip(), b.id).slice().sort((x, y) => (y.lang === local) - (x.lang === local));
  el.innerHTML = `<button type="button" class="top-btn t-close" data-act="back" aria-label="${esc(tr('닫기'))}">${CLOSE_SVG}</button><div class="t-name">${esc(b.title)}</div><div class="t-addr">${esc(b.addr)}</div>${docs.length ? `<div class="t-docs">${docs.map(f => `<button type="button" class="t-doc" data-act="file-open" data-id="${esc(f.id)}" data-ctx="">${esc(langName(f.lang) ? tr('{l} 확인서', { l: langName(f.lang) }) : tr('확인서 보기'))}</button>`).join('')}</div>` : ''}`;
  $('#app').appendChild(el);
};

// ---------- 샘플 여행(샘플 여행 체험 중일 때만, 저장하지 않는다) ----------
function sampleTrip() {
  const td = C.today(); const d = (n) => C.addDays(td, n); const home = homeCur(); const krw = home === 'KRW';
  const t = C.newTrip({ sample: true, title: tr('오사카·교토 여행'), start: d(-1), end: d(3), cur: 'JPY', home,
    dests: [{ name: tr('오사카'), cc: 'JP', lat: 34.6937, lon: 135.5023 }, { name: tr('교토'), cc: 'JP', lat: 35.0116, lon: 135.7681 }], people: [{ id: 'p1', name: tr('민지') }], budget: krw ? { total: 1200000 } : {} });
  const add = (day, name, lat, lon, o) => { const last = C.dayItems(t, day).pop(); t.items.push(Object.assign({ id: C.uid(), day, sort: C.midKey(last ? last.sort : '', ''), kind: 'place', name: tr(name), lat, lon, c: C.now(), u: C.now() }, o || {})); };
  add(d(-1), '도톤보리', 34.6687, 135.5013, { done: true, time: '18:00' }); add(d(-1), '오사카성', 34.6873, 135.5259, { done: true }); add(d(-1), '우메다 스카이 빌딩', 34.7053, 135.4903, { done: true });
  add(td, '후시미이나리 신사', 34.9671, 135.7727, { done: true, time: '09:00' }); add(td, '니시키 시장', 35.0050, 135.7649); add(td, '기요미즈데라', 34.9949, 135.7850);
  add(d(1), '아라시야마 대나무숲', 35.0170, 135.6713); add(d(1), '금각사', 35.0394, 135.7292);
  add(null, '나라 공원', 34.6851, 135.8430); add(null, '유니버설 스튜디오 재팬', 34.6654, 135.4323);
  if (krw) t.exchanges.push({ id: C.uid(), cur: 'JPY', foreign: 50000, home: 465000, date: d(-3) });
  const me = C.ensureMe(t, '');
  const ex = (day, amt, cat, method, memo, share, payer) => t.expenses.push({ id: C.uid(), day, amt, cur: 'JPY', cat, method, basis: method === 'cash' && krw ? 'mine' : 'auto', memo: tr(memo), payer: payer || me.id, share: { mode: share || 'solo' }, c: C.now() });
  ex(d(-1), 800, 'food', 'cash', '타코야키', 'all'); ex(d(-1), 820, 'move', 'cash', '지하철 1일권', 'all'); ex(d(-1), 1200, 'sight', 'card', '오사카성 입장권', 'all', 'p1');
  ex(td, 1200, 'food', 'cash', '라멘'); ex(td, 3980, 'shop', 'card', '기념품');
  t.diary.push({ id: C.uid(), day: d(-1), text: tr('도톤보리 야경이 생각보다 훨씬 화려했다.') });
  t.bookings.push({ id: C.uid(), kind: 'flight', dir: 'go', mode: 'plane', from: tr('김포'), to: tr('간사이'), fromPt: { code: 'GMP', lat: 37.5583, lon: 126.791 }, toPt: { code: 'KIX', lat: 34.4273, lon: 135.244 }, day: d(-1), sort: 'm', title: tr('김포 → 간사이'), start: d(-1) + 'T09:10', end: d(-1) + 'T11:00', code: 'K7X2QM', paid: krw ? 320000 : 0, addr: '', memo: '' },
    { id: C.uid(), kind: 'stay', lat: 34.6659, lon: 135.5013, title: tr('난바 호텔'), start: d(-1) + 'T15:00', end: d(3) + 'T11:00', code: 'HT-88213', paid: krw ? 280000 : 0, addr: '大阪府大阪市中央区難波1丁目', memo: '' });
  for (const k of ['pack', 'todo']) PD.CHECK[k].concat(PD.CHECK.JP[k]).forEach((n, i) => t.checklist.push({ id: C.uid(), kind: k, title: tr(n), done: i < 4 }));
  return t;
}

// ---------- 시작 ----------
async function refreshFx(force) {
  if (!H || !H.api) return;
  if (!force && ST.fx && ST.fx.at && Date.now() - ST.fx.at < 6 * 3600 * 1000) return;
  try {
    const j = await H.api('GET', '/fx/latest');
    if (j && j.rates && j.rates.KRW) { ST.fx = { date: j.date || '', base: 'KRW', rates: j.rates, source: j.source || '', attr: j.attribution || '', at: Date.now() }; C.Store.putMeta('fx', ST.fx).catch(() => { /* ignore */ }); if (ST.stack.length && sheetEl().hidden) renderScreen(); else renderList(); }
  } catch (e) { log('fx failed: ' + (e && (e.code || e.message))); }
}
function markVisited() {   // 사진이 찍힌 자리로 일정의 방문 완료를 채운다(직접 취소한 것은 다시 켜지 않는다)
  const stops = H && H.DATA && H.DATA.stops; if (!stops || (H && H.demo)) return;
  for (const t of ST.trips) {
    if (t.del || t.sample || C.tripStatus(t) === 'upcoming') continue;
    const ids = C.autoVisited(t, stops).filter(id => { const it = t.items.find(x => x.id === id); return it && it.auto !== false; });
    if (!ids.length) continue;
    for (const id of ids) { const it = t.items.find(x => x.id === id); it.done = true; it.auto = true; C.touch(it); }
    persist(t);
  }
}
async function load() {
  try { ST.trips = (await C.Store.all()) || []; ST.storeOk = true; } catch (e) { ST.trips = []; ST.storeOk = false; log('store open failed: ' + (e && e.message)); }   // storeOk: 못 읽었으면 저장해 둔 사진을 '안 쓰는 것'으로 지우지 않게
  { const me = myUid(); ST.trips = ST.trips.filter(t => t.park == null || (me != null && String(t.park) === String(me))); for (const t of ST.trips) if (t.park != null) { delete t.park; saveQuiet(t); } }   // 다른 계정 몫으로 가려 둔 여행은 저장소에만 둔다
  setTimeout(sweepFiles, 8000);   // 어느 여행에도 붙어 있지 않은 파일 본문을 치운다
  try { ST.fx = (await C.Store.getMeta('fx')) || null; ST.prefs = (await C.Store.getMeta('prefs')) || {}; } catch (e) { /* ignore */ }
  if (H.demo && !ST.trips.some(t => !t.del)) ST.trips.push(sampleTrip());
  parkForeign();
  ST.ready = true; picSoon(5000); notifSync(4000); setTimeout(creditsPending, 6000); if (ST.pendingOpen) { const po = ST.pendingOpen; ST.pendingOpen = null; setTimeout(() => openFromNotif(po[0], po[1]), 300); } markVisited(); const pend = !!(pendingShared || pendingInvite); mainTick(); mainFlag(!!ST.prefs.mainId);
  const waiting = () => ST.stack.length === 1 && ST.stack[0].name === 'wait'; if (waiting() && (pend || !mainTrip())) closeScreens();
  renderList(); refreshFx(); refreshAi();
  if (pendingShared) { const c = pendingShared; pendingShared = null; openShared(c); }
  if (pendingInvite) { const c = pendingInvite; pendingInvite = null; openInvite(c); }
  syncAll(true);
  if (H.onReady) { try { H.onReady({ ongoing: Planner.hasOngoing(), main: pend ? null : ((mainTrip() || {}).id || null) }); } catch (e) { /* ignore */ } }
  if (pendingStayLink) { const L = pendingStayLink; pendingStayLink = null; setTimeout(() => { H.showTab('trip'); takeStayLink(L.url, L.title); }, 400); }
  if (waiting()) closeScreens();   // 앱이 메인 여행을 띄우지 않았으면(다른 화면으로 시작) 덮개를 걷는다
}
// 사용 통계(관리자 화면): 의미 있는 동작만 센다 — 앱(app.js 의 Mx)이 있을 때만. 이름과 횟수만 보낸다
const MX_ACT = { 'new-done': 'trip.create', open: 'trip.open', 'add-result': 'place.add', 'add-name': 'place.add', 'pick-ok': 'place.add', 'exp-save': 'expense.save', 'diary-save': 'diary.save', 'chk-add': 'check.add',
  'stay-save': 'stay.save', 'way-save': 'way.save', 'ticket-pick': 'ticket.upload', 'ai-plan': 'ai.plan', 'ai-send': 'ai.chat', 'ai-pay-ad': 'ai.ad', 'ai-pay-buy': 'ai.buy', 'share-link': 'trip.share', 'share-friend': 'trip.share',
  'share-send': 'trip.share', 'share-text': 'trip.share', 'invite-copy': 'trip.invite', taxi: 'taxi.show', calc: 'fx.calc', 'q-calc': 'fx.calc', settle: 'settle.view', 'settle-done': 'settle.done', 'map-app': 'route.app', 'day-app': 'route.app',
  'cand-add': 'stay.cand', 'optimize-ok': 'route.optimize', 'dy-share': 'diary.share', 'file-open': 'file.open' };
let bound = false;
// ---------- 당겨서 새로고침(11-19 사용자: "상대 핸드폰에 넣었는데 다른 폰에서 안 되는 경우도 있다. 위에서 아래로 당기면 새로고침 되게") ----------
// 여행 목록과 여행 안 화면(일정·경비·일기·준비)의 맨 위에서 아래로 당기면 서버와 다시 맞춘다(못 올린 것은 올리고, 서버 것을 받는다).
// 화면을 새로 그려도 남도록 표시는 화면 밖(body)에 띄운다.
async function refreshNow() {
  if (!loggedIn()) { refreshView(); return 'local'; }   // 로그인하지 않았으면 맞출 서버가 없다 — 화면만 다시 그린다
  if (offline()) { toast(tr('인터넷에 연결되어 있지 않아요.')); return 'offline'; }
  for (let i = 0; i < 40 && SY.busy; i++) await new Promise(r => setTimeout(r, 250));   // 맞추는 중이면 끝나길 기다렸다가 한 번 더
  await syncAll(true);
  if (SY.err) { toast(tr('새로 고치지 못했어요. 잠시 뒤에 다시 해 주세요.')); return 'error'; }
  refreshView(); return 'ok';
}
function ptrSetup() {
  if ($('#pl-ptr')) return;
  const ind = document.createElement('div'); ind.id = 'pl-ptr'; ind.className = 'pl-ptr'; ind.hidden = true; ind.innerHTML = '<i></i><span></span>'; document.body.appendChild(ind); const label = ind.querySelector('span');
  let y0 = null, pulled = 0, busy = false; const THRESH = 110;
  const scroller = () => { const sc = $('#pl-screen'); return sc && !sc.hidden ? sc : null; };
  const can = () => {   // 당길 수 있는 곳: 여행 안 화면의 맨 위, 또는 여행 탭 목록의 맨 위(창·지도·순서 바꾸기·사진 보기 중이 아닐 때)
    if (busy || !ST.ready || (sheetEl() && !sheetEl().hidden) || $('#pl-taxi') || ST.edit || ST.mapOn) return false;
    const pv = $('#pl-photo-view'); if (pv && !pv.hidden) return false;
    const sc = scroller(); if (sc) { const top = ST.stack[ST.stack.length - 1]; return !!top && top.name === 'trip' && sc.scrollTop <= 0; }
    const list = $('#pl-list'); return !!list && list.offsetParent !== null && (root.scrollY || 0) <= 0;
  };
  const show = (px, ready) => { ind.hidden = !(px > 0); ind.style.transform = `translate(-50%, ${Math.round(Math.min(px * 0.45, 52)) - 44}px)`; ind.style.opacity = String(Math.min(1, px / 70)); ind.classList.toggle('ready', !!ready); };
  document.addEventListener('touchstart', (e) => { if (!e.touches || e.touches.length !== 1 || !can()) { y0 = null; return; } y0 = e.touches[0].clientY; pulled = 0; }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (y0 == null || busy) return; pulled = Math.max(0, e.touches[0].clientY - y0); const sc = scroller(); if ((sc ? sc.scrollTop : (root.scrollY || 0)) > 0) pulled = 0; label.textContent = pulled >= THRESH ? tr('놓으면 새로고침') : tr('당겨서 새로고침'); show(pulled, pulled >= THRESH); }, { passive: true });
  const end = () => {
    if (y0 == null || busy) return; const go = pulled >= THRESH; y0 = null; if (!go) { show(0); return; }
    busy = true; ind.classList.add('busy'); label.textContent = tr('새로 고치는 중…'); show(THRESH, false);
    refreshNow().catch(() => { /* ignore */ }).then(() => { busy = false; ind.classList.remove('busy'); show(0); });
  };
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', () => { y0 = null; if (!busy) show(0); }, { passive: true });
}
function bind() {
  ptrSetup();
  if (bound) return; bound = true;
  document.addEventListener('click', (e) => {
    const scope = e.target.closest('#pl-list, #pl-screen, #pl-sheet, #pl-taxi, #pl-tripbar'); if (!scope) return;
    if (e.target.closest('.pl-file-lang')) return;   // 파일 언어 고르기(눌러도 파일을 열지 않는다)
    if (e.target.id === 'pl-sheet-dim') { closeSheet(); return; }
    const el = e.target.closest('[data-act]'); if (!el || !scope.contains(el) || el.disabled) return;
    const f = ACT[el.dataset.act]; if (f) { e.preventDefault(); f(el.dataset, el, e); const mx = MX_ACT[el.dataset.act]; if (mx && root.Mx) root.Mx.ev(mx); }
  });
  // 출발·도착 칸: 치는 대로 공항 후보. 칸을 떠나면 후보를 접는다(후보를 누르는 동안은 남겨 둔다)
  document.addEventListener('input', (e) => { const el = e.target; if (el && el.matches && el.matches('.pl-wayform input[data-f="from"], .pl-wayform input[data-f="to"], #pl-w-from, #pl-w-to')) acType(el); });
  document.addEventListener('change', (e) => { const el = e.target; if (el && el.matches && el.matches('.pl-file-lang')) { setFileLang(el.dataset.id, el.dataset.ctx, el.value); el.classList.toggle('none', !el.value); } });
  document.addEventListener('focusout', (e) => { const el = e.target; if (AC && el === AC.inp) setTimeout(() => { if (AC && AC.inp === el && document.activeElement !== el) acHide(); }, 300); });
  // 사진을 못 받으면 자리를 접는다(깨진 그림 표시가 보이지 않게)
  document.addEventListener('error', (e) => { const el = e.target; if (!el || el.tagName !== 'IMG' || !el.closest) return; if (el.classList.contains('pl-thumb')) { const box = document.createElement('span'); box.className = el.className + ' ic'; box.innerHTML = PIN_SVG; el.replaceWith(box); } }, true);   // 못 받은 사진은 아이콘 칸으로 바꾼다
  $('#pl-screen').addEventListener('scroll', () => { if (!ST.mapOn) return; ST.mapOn = false; const g = $('#pl-screen .pl-mapguard'); if (g) g.hidden = false; }, { passive: true });   // 화면을 내리면 지도는 다시 잠근다
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { mainTick(); notifSync(2000); } });   // 앱으로 돌아왔을 때: 메인 여행이 끝났으면 원래 화면으로
  // 키보드: iOS 는 키보드가 화면을 줄이지 않고 위를 덮는다 → 보이는 영역(visualViewport)에 하위 화면·시트를 맞춰 입력창이 가려지지 않게 한다
  const vv = root.visualViewport;
  if (vv) {
    const fit = () => {
      const de = document.documentElement; const kb = Math.round(root.innerHeight - vv.height - vv.offsetTop);
      if (kb > 80) { de.style.setProperty('--pl-vt', Math.max(0, Math.round(vv.offsetTop)) + 'px'); de.style.setProperty('--pl-vh', Math.round(vv.height) + 'px'); de.classList.add('pl-kb'); }
      else if (de.classList.contains('pl-kb')) { de.classList.remove('pl-kb'); de.style.removeProperty('--pl-vt'); de.style.removeProperty('--pl-vh'); }
    };
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  }
  // 서버와 맞추기: 로그인·로그아웃할 때, 앱으로 돌아올 때, 함께 보는 여행을 열어 둔 동안 20초마다
  ACCT = myUid();
  if (root.Account && root.Account.onChange) root.Account.onChange(() => { const uid = myUid(); if (ACCT !== uid && ST.ready) { if (ACCT != null) parkTrips(String(ACCT)); dropTombs(null); } ACCT = uid; if (loggedIn()) unpark(uid).catch(() => 0).then(() => syncAll(true)); else if (!ST.stack.length) renderList(); });   // 계정이 바뀌면 앞 계정의 여행과 '지운 표시'를 내린다
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncAll(); });
  // 인터넷이 돌아오면 밀린 것을 바로 올리고(여행·환율), 끊기면 상태 한 줄을 바꾼다
  root.addEventListener('online', () => { log('online'); paintCloud(); syncAll(true); refreshFx(); refreshAi(); picSoon(1500); });
  root.addEventListener('offline', () => { log('offline'); paintCloud(); });
  setInterval(() => { if (document.visibilityState !== 'visible' || !ST.stack.length) return; const top = ST.stack[ST.stack.length - 1]; const t = trip(); if (top.name === 'trip' && t && t.cloud && (t.cloud.members || []).length > 1) pullTrip(t); }, 20000);
  document.addEventListener('focusin', (e) => {
    const el = e.target; if (!el || !el.closest || !/^(INPUT|TEXTAREA)$/.test(el.tagName) || !el.closest('#pl-sheet, #pl-screen')) return;
    setTimeout(() => { try { if (document.activeElement === el) el.scrollIntoView({ block: 'nearest' }); } catch (err) { /* ignore */ } }, 320);   // 키보드가 다 올라온 뒤 입력창이 보이게
  });
}
// ---------- 여행 알림(폰 안에서 예약 — 서버 없이, 인터넷이 없어도 제때 울린다) ----------
// 11-18 사용자: "알림은 여행일정 알림도 줄 거야 … 여행 잘 다녀와요, 여행은 잘 마무리했나요? 등등 나갈 요소를 빼지 말고 다 넣어"
// 종류(설정 › 여행 알림, app.js 의 notifPrefs): prep 출발 준비(일주일·사흘·하루 전 · 출발일 아침 '잘 다녀와요') · times 비행기·숙소 시간(탑승 하루 전·몇 시간 전, 체크인·체크아웃)
//   · daily 여행 중 하루(아침에 오늘 일정, 밤에 경비·일기) · wrap 여행 마무리(다음 날 정산·지도, 사흘 뒤 사진으로 지도 칠하기)
// 시각은 그 기기의 벽시계 시각('YYYY-MM-DDTHH:MM')으로 넘긴다 — 여행지 시간대로 옮겨 가도 그곳 시각에 울린다(iOS 달력 알림 · 안드로이드는 앱을 열 때 다시 맞춘다)
const NOTIF_MAX = 56;   // iOS 는 앱 하나에 예약 알림 64개까지(추억 알림 몫을 남긴다)
const pad2 = (n) => String(n).padStart(2, '0');
const localDT = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const dtPlus = (dt, min) => { const d = new Date(+dt.slice(0, 4), +dt.slice(5, 7) - 1, +dt.slice(8, 10), +dt.slice(11, 13) || 0, +dt.slice(14, 16) || 0); d.setMinutes(d.getMinutes() + min); return localDT(d); };
const hhmm = (v) => String(v || '').slice(11, 16);
const hasTime = (v) => /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(String(v || ''));
function notifPlan(nowD) {
  const P = (H && H.notifPrefs) ? H.notifPrefs() : {}; const on = (k) => P[k] !== false;
  const nowS = localDT(nowD || new Date()); const td = nowS.slice(0, 10); const out = [];
  for (const t of ST.trips) {
    if (t.del || t.sample || !t.start) continue;
    const end = t.end || t.start; if (C.dayDiff(end, td) > 4) continue;   // 끝난 지 나흘이 넘은 여행은 없음
    const name = t.title || tripTitle(t.dests || []) || tr('여행');
    const add = (kind, key, at, title, body, sec) => { if (!on(kind) || !at || at <= nowS) return; out.push({ id: `${t.id}.${key}`, at, title: String(title).slice(0, 80), body: String(body || '').slice(0, 180), trip: t.id, sec: sec || 'plan', kind }); };
    const dayPlaces = (day) => C.dayItems(t, day).filter(x => x.name);
    const placesText = (its) => its.slice(0, 3).map(x => x.name).join(' → ') + (its.length > 3 ? ' ' + tr('외 {n}곳', { n: its.length - 3 }) : '');
    const dleft = C.dayDiff(td, t.start);
    const cl = C.live(t.checklist || []); const undone = cl.filter(x => !x.done).length;
    const goWays = C.ways(t, 'go'); const firstGo = goWays.find(b => hasTime(b.start));
    const route = (b) => [b.from, b.to].filter(Boolean).join(' → ') || moveName(b.mode);
    // 출발 준비
    if (dleft >= 7) add('prep', 'd7', C.addDays(t.start, -7) + 'T20:00', tr('‘{t}’까지 일주일 남았어요', { t: name }), cl.length ? tr('준비물 {a}개 중 {b}개를 챙겼어요. 남은 것을 확인해 볼까요?', { a: cl.length, b: cl.length - undone }) : tr('가고 싶은 곳을 담고 준비물을 적어 두세요.'), cl.length ? 'prep' : 'plan');
    if (dleft >= 3) {
      const needFx = t.cur && t.home && t.cur !== t.home && !C.live(t.exchanges || []).length;
      const parts = [undone ? tr('준비물 {n}개가 남았어요.', { n: undone }) : '', needFx ? tr('{c} 환전도 미리 해 두세요.', { c: t.cur }) : ''].filter(Boolean);
      if (parts.length) add('prep', 'd3', C.addDays(t.start, -3) + 'T20:00', tr('‘{t}’까지 사흘 남았어요', { t: name }), parts.join(' '), undone ? 'prep' : 'money');
    }
    if (dleft >= 1) add('prep', 'd1', C.addDays(t.start, -1) + 'T20:00', tr('‘{t}’ 출발이 내일이에요!', { t: name }),
      firstGo ? tr('{time} {route} · 여권·표·충전기를 챙기세요.', { time: hhmm(firstGo.start), route: route(firstGo) }) : tr('여권·지갑·충전기를 챙기셨나요? 첫날 일정 {n}곳이 기다려요.', { n: dayPlaces(t.start).length }));
    if (dleft >= 0) { const n0 = dayPlaces(t.start).length; add('prep', 'd0', t.start + 'T07:30', tr('여행 잘 다녀와요! ✈️'), n0 ? tr('즐거운 ‘{t}’ 되세요! 오늘 일정 {n}곳: {list}', { t: name, n: n0, list: placesText(dayPlaces(t.start)) }) : tr('즐겁고 안전한 ‘{t}’ 되세요!', { t: name })); }
    // 비행기·이동 · 숙소 시간
    for (const b of C.live(t.bookings || [])) {
      if (b.kind === 'stay') {
        const din = C.dayPart(b.start) || t.start, dout = C.dayPart(b.end) || t.end;
        if (din) add('times', 'in.' + b.id, hasTime(b.start) && hhmm(b.start) < '14:00' ? dtPlus(b.start, -120) : din + 'T12:00', tr('오늘 {s} 체크인 날이에요', { s: b.title || tr('숙소') }),
          [hasTime(b.start) ? tr('체크인 {t}부터', { t: hhmm(b.start) }) : '', b.code ? tr('예약 번호 {c}', { c: b.code }) : '', b.addr ? tr('주소는 택시 화면에 있어요.') : ''].filter(Boolean).join(' · ') || tr('예약 확인서는 숙소에 붙여 둘 수 있어요.'));
        if (dout && dout !== din) add('times', 'out.' + b.id, dout + 'T08:00', tr('오늘 {s} 체크아웃이에요', { s: b.title || tr('숙소') }), [hasTime(b.end) ? tr('체크아웃 {t}까지', { t: hhmm(b.end) }) : '', tr('두고 가는 물건이 없는지 확인하세요.')].filter(Boolean).join(' · '));
        continue;
      }
      if (b.kind === 'cand' || !b.dir || !hasTime(b.start)) continue;
      const files = stepFiles(t, b.id).length; const sec = b.dir === 'back' ? 'way-back' : 'way-go';
      const tail = [b.code, files ? tr('표는 가는 방법·오는 방법 맨 위에 있어요.') : ''].filter(Boolean).join(' · ');
      if (b.mode === 'plane') {
        add('times', 'f24.' + b.id, dtPlus(b.start, -24 * 60), tr('내일 {time} 비행기를 타요', { time: hhmm(b.start) }), [route(b), tr('온라인 체크인을 미리 해 두면 공항에서 덜 기다려요.')].join(' · '), sec);
        add('times', 'f3.' + b.id, dtPlus(b.start, -180), tr('비행기 출발 3시간 전이에요'), [route(b) + ' ' + hhmm(b.start), tail].filter(Boolean).join(' · '), sec);
      } else add('times', 'w1.' + b.id, dtPlus(b.start, -60), tr('{mode} 출발 1시간 전이에요', { mode: moveName(b.mode) }), [route(b) + ' ' + hhmm(b.start), tail].filter(Boolean).join(' · '), sec);
    }
    // 여행 중 하루: 아침에 오늘 일정(첫날은 '잘 다녀와요'가 대신), 밤에 경비·일기(그날 일기를 이미 썼으면 빼기)
    const written = new Set(C.live(t.diary || []).filter(e => e.text || (e.photos && e.photos.length) || e.mood).map(e => e.day));
    for (let d = t.start, i = 1; d <= end && i <= 60; d = C.addDays(d, 1), i++) {
      const its = dayPlaces(d); const last = d === end && d !== t.start;
      if (d !== t.start || !on('prep')) {
        if (its.length) add('daily', 'am.' + d, d + 'T08:00', last ? tr('여행 마지막 날이에요') : tr('{n}일차 아침이에요', { n: i }), tr('오늘 일정: {list}', { list: placesText(its) }));
        else if (last) add('daily', 'am.' + d, d + 'T08:00', tr('여행 마지막 날이에요'), tr('남은 현금과 기념품을 챙기고, 즐겁게 마무리하세요.'));
      }
      if (!written.has(d)) add('daily', 'pm.' + d, d + 'T21:00', tr('오늘 하루는 어땠나요?'), tr('오늘 쓴 돈과 한 줄 일기를 남겨 두면 나중에 여행을 돌아보기 좋아요.'), 'diary');
    }
    // 여행 마무리
    add('wrap', 'w1', C.addDays(end, 1) + 'T19:00', tr('‘{t}’, 잘 마무리했나요?', { t: name }), C.people(t).length > 1 ? tr('함께 쓴 돈을 정산하고, 여행 사진으로 지도를 칠해 보세요.') : tr('경비를 정리하고, 여행 사진으로 지도를 칠해 보세요.'), 'money');
    add('wrap', 'w3', C.addDays(end, 3) + 'T20:00', tr('‘{t}’ 사진으로 지도를 칠해 볼까요?', { t: name }), tr('설정의 ‘사진 다시 읽기’를 누르면 다녀온 곳이 지도에 칠해지고 여권 도장이 생겨요.'));
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(0, NOTIF_MAX);
}
let notifT = 0;
function notifSync(ms) { clearTimeout(notifT); notifT = setTimeout(() => { if (ST.ready && ST.storeOk !== false && H && H.scheduleNotifs) { try { H.scheduleNotifs(notifPlan()); } catch (e) { log('notif plan failed: ' + (e && e.message)); } } }, ms == null ? 1500 : ms); }
// 알림을 눌러 열기: phototravelmap://open/trip/<여행>?sec=<구역>. 여행을 아직 못 읽었으면 읽은 뒤에, 없으면 서버에서 받아 온 뒤에 한 번 더
function openFromNotif(id, sec) {
  if (!ST.ready) { ST.pendingOpen = [id, sec]; return; }
  const go = () => { const t = ST.trips.find(x => x.id === id && !x.del); if (!t) return false; H.showTab('trip');
    if (sec === 'way-go' || sec === 'way-back') { openTrip(id, 'plan'); ST.wayDir = sec === 'way-back' ? 'back' : 'go'; show('way'); } else openTrip(id, ['plan', 'money', 'diary', 'prep'].includes(sec) ? sec : 'plan'); return true; };
  if (!go()) Promise.resolve(syncAll()).then(go, go);
}

const Planner = {
  init(host) {
    H = host; bind(); let m = false; try { m = localStorage.getItem('pl-main') === '1'; } catch (e) { /* ignore */ }
    setTimeout(() => { if (ST.stack.length === 1 && ST.stack[0].name === 'wait') { log('main cover timed out'); closeScreens(); } }, 3000);   // 여행을 읽는 데 실패하거나 오래 걸려도 흰 덮개가 남지 않게
    if (m) { ST.stack.push({ name: 'wait', p: {} }); renderScreen(true); }   // 메인 여행이 있으면 처음부터 덮어 둔다(읽고 나서 여행을 띄우거나 걷는다)
    load();
  },
  /** 여행 탭이 보일 때(app.js showTab) */
  show() { renderList(); refreshFx(); refreshAi(); syncAll(); if (root.PlannerGMap) { root.PlannerGMap.log = log; if (root.PlannerGMap.on()) root.PlannerGMap.ready(); else log('gmap: off'); } },   // 구글 지도 스크립트를 미리 불러 둔다(지도를 띄울 때 바로 쓰게)
  /** 뒤로가기(안드로이드 시스템 버튼 포함). 닫을 것이 있어 처리했으면 true */
  back,
  /** 여행 알림: 지금 예약할 목록 · 다시 맞추기(설정을 바꾸거나 알림을 켰을 때) · 알림을 눌러 그 여행 열기 */
  notifPlan, notifSync, openFromNotif,
  /** 메인 여행을 연다(앱을 켰을 때 app.js 가 부른다) */
  openMain() { const t = mainTrip(); if (t) openTrip(t.id); },
  beforeLogout, forgetAccount,
  /** 앱의 탭이 바뀔 때(app.js showTab). 커뮤니티가 아니면 얹어 둔 여행 탭 줄을 걷는다 */
  onTab(name) { if (name !== 'comm') ST.navTrip = null; if (name !== 'comm' || !ST.navTrip) tripBar(false); },
  hasOngoing() { const td = C.today(); return ST.trips.some(t => !t.del && C.tripStatus(t, td) === 'ongoing'); },
  /** 받은 공유 링크(phototravelmap://trip/<코드>)를 연다 */
  openShared,
  /** 받은 초대 링크(phototravelmap://join/<코드>)를 연다 */
  openInvite,
  /** 다른 화면용: 내 여행 목록(간단히) · 공유 문서 만들기 · 공유 문서를 내 여행으로 가져오기(가져온 여행을 연다) */
  /** 여행 탭 목록의 구역: 'now'(내 여행: 메인·여행 중·예정) | 'past'(끝난 여행) */
  listView(v) { ST.listView = v === 'past' ? 'past' : 'now'; renderList(); },
  /** 다른 앱에서 공유한 숙소 링크를 비교 리스트에 넣는다 */
  addStayLink(url, title) { H.showTab('trip'); takeStayLink(String(url || ''), String(title || '')); },
  /** 여권 탭의 '여행일기': 모든 여행의 일기를 그린다 · 일기 하나를 연다 */
  diaryFeed(el) { if (el) diaryFeed(el); },
  openDiary(tripId, day) { if (!ST.trips.some(x => x.id === tripId && !x.del)) return; H.showTab('trip'); openTrip(tripId, 'diary'); DY = null; show('diary', { day }); },
  tripsBrief() { return ST.trips.filter(t => !t.del && !t.sample).map(t => ({ id: t.id, title: t.title, start: t.start, end: t.end, places: placeCount(t) })); },
  docOf(id) { const t = ST.trips.find(x => x.id === id && !x.del); return t ? shareDoc(t) : null; },
  importDoc(doc, from) { const t = importDoc(doc, from); openTrip(t.id); return t.id; },
  get busy() { return ST.stack.length > 0; },
  _debug: { ST, C, PIC, picSync, ACT, startNew, exAdd, expenseCsv, refreshNow, takeRemote, dropTombs, openInvite, unpark, parkTrips, tripFileIds, keptFileIds, notifPlan, aiPay, mainTrip, mainTick, fixEnds, userPlaces, openTrip, closeScreens, renderScreen, refreshFx, shareDoc, planText, syncAll, pushTrip, pullTrip, SY, AIS, applyPlan, refreshAi, get host() { return H; }, get pickMap() { return pickMap; } },   // 헤드리스 시험용
};
root.Planner = Planner;
})(typeof self !== 'undefined' ? self : globalThis);
