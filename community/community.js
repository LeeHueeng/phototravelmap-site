/* community.js — 커뮤니티 탭: 게시판 4개(자유게시판 · 같이 여행가요 · 여행일정공유 · 여행 자랑) · 댓글 · 좋아요 · 신고 · 차단 · 사진 · 포인트.
   서버는 server/community.py(주소 /community/…, /me/points, /u/…). app.js 가 boot 안에서 Community.init(host) 를 부른다.
   host = { tr, askConfirm, shareText, login, nlog, api, platform, demo, DATA, setBusy }. 그 밖에 window.Account(로그인 상태), window.Planner(일정 붙이기·가져오기)를 쓴다.
   화면 구조: 탭 본문(#cm-page, 목록) → 하위 화면(#cm-screen: 글 보기 · 글쓰기) → 바텀시트(#cm-sheet). 버튼은 전부 data-act 로 한 곳(ACT)에서 처리한다.
   새 문구를 넣으면 scripts/community_l10n.py 의 표에도 넣는다(한국어 원문이 키). 사용자가 쓴 글은 번역하지 않는다. */
(function (root) {
'use strict';
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let H = null;
const tr = (k, p) => (H ? H.tr(k, p) : k);
const I18 = () => root.I18N || { lang: 'ko', locale: 'ko-KR' };
const LANG = () => I18().lang, LOCALE = () => I18().locale;
const ACC = () => root.Account || null;
const authed = () => !!(ACC() && ACC().loggedIn);
const myUid = () => (authed() && ACC().session ? ACC().session.uid : null);
const log = (t) => { try { if (H && H.nlog) H.nlog('[community] ' + t); } catch (e) { /* ignore */ } };

const svg = (d, o) => `<svg width="${(o && o.s) || 20}" height="${(o && o.s) || 20}" viewBox="0 0 24 24" fill="${(o && o.fill) || 'none'}" stroke="currentColor" stroke-width="${(o && o.w) || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC = {
  back: svg('<path d="M15 5l-7 7 7 7"/>', { s: 24, w: 2.2 }),
  more: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', { w: 2.2 }),
  heart: svg('<path d="M12 20s-7-4.400-7-9.600A4.200 4.200 0 0 1 12 7.600 4.200 4.200 0 0 1 19 10.400C19 15.600 12 20 12 20z"/>', { s: 18 }),
  heartOn: svg('<path d="M12 20s-7-4.400-7-9.600A4.200 4.200 0 0 1 12 7.600 4.200 4.200 0 0 1 19 10.400C19 15.600 12 20 12 20z"/>', { s: 18, fill: 'currentColor' }),
  bubble: svg('<path d="M20 12a7.500 7.500 0 0 1-11.200 6.500L4 20l1.500-4.300A7.500 7.500 0 1 1 20 12z"/>', { s: 18 }),
  pen: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.500 6.500l4 4"/>'),
  photo: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10.500" r="1.800"/><path d="M21 15.500l-4.500-4.500L8 19"/>'),
  plan: svg('<path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M8 17h6a4 4 0 0 0 0-8h-4a3 3 0 0 1 0-6"/>'),
  record: svg('<rect x="5" y="3" width="14" height="18" rx="2.500"/><circle cx="12" cy="10" r="3"/><path d="M9 16.500h6"/>'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  block: svg('<circle cx="12" cy="12" r="8.500"/><path d="M6 18L18 6"/>'),
  trash: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>'),
  send: svg('<path d="M5 12h13M13 6l6 6-6 6"/>', { w: 2.400 }),
  refresh: svg('<path d="M19 12a7 7 0 1 1-2.100-5M19 4v4h-4"/>'),
  search: svg('<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>'),
  web: svg('<rect x="3" y="4.500" width="18" height="12" rx="2"/><path d="M8.500 20h7M12 16.500V20"/>'),
  copy: svg('<rect x="8.500" y="8.500" width="11" height="11" rx="2"/><path d="M15.500 8.500V6.500a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>'),
  out: svg('<path d="M12 15V4M8 7.500L12 3.500l4 4M5 12.500v6a1.500 1.500 0 0 0 1.500 1.500h11a1.500 1.500 0 0 0 1.500-1.500v-6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', { w: 2.400 }),
  point: svg('<circle cx="12" cy="12" r="8.500"/><path d="M10 16V8h2.800a2.500 2.500 0 0 1 0 5H10"/>', { s: 18 }),
  chev: svg('<path d="M9 5l7 7-7 7"/>', { s: 18 }),
  check: svg('<path d="M5 12.500l4.500 4.500L19 7.500"/>', { w: 2.600 }),
  user: svg('<circle cx="12" cy="8.500" r="3.700"/><path d="M4.500 20a7.500 7.500 0 0 1 15 0"/>'),
};

// 프로필 사진(없으면 이름 첫 글자). uid 를 주면 누를 수 있다(그 사람의 프로필)
const ava = (a, cls) => { a = a || {}; const inner = a.avatar ? `<img src="${esc(a.avatar)}" alt="" loading="lazy">` : esc((a.name || '?').slice(0, 1)); return `<span class="cm-ava${cls ? ' ' + cls : ''}${a.avatar ? ' pic' : ''}"${a.uid ? ` data-act="profile" data-uid="${a.uid}" role="button"` : ''}>${inner}</span>`; };

const BOARDS = [['free', '자유게시판'], ['mate', '같이 여행가요'], ['plan', '여행일정공유'], ['brag', '여행 자랑']];
const BOARD_HINT = { free: '여행 이야기라면 무엇이든 나눠요.', mate: '같이 떠날 사람을 찾아요. 언제, 어디로 가는지 적어 주세요.', plan: '내가 짠 여행 일정을 나눠요. 마음에 들면 내 여행으로 담아 갈 수 있어요.', brag: '다녀온 곳을 사진과 함께 자랑해요.' };
const REASONS = ['스팸·광고', '욕설·비방', '음란물', '개인정보 노출', '기타'];
const POINT_KIND = { post: '글 쓰기', photo: '사진 올린 글', comment: '댓글 쓰기', liked: '받은 좋아요', attend: '출석', undo: '지운 글·댓글' };
const META_KEY = 'photo-map-cm-meta.v1', ATTEND_KEY = 'photo-map-cm-attend.v1';

const ST = { meta: null, me: null, board: '', region: '', sub: '', mine: false, q: '', qOpen: false, list: { items: [], next: null, state: 'idle', seq: 0, at: 0 }, stack: [], post: null, draft: null, sel: null };
let toastT = 0, bound = false, fileInput = null, afterAuth = null, cmtBusy = false;

// ---------- 표기 ----------
const boardName = (id) => { const b = BOARDS.find(x => x[0] === id); return tr(b ? b[1] : '커뮤니티'); };
const regions = () => (ST.meta && ST.meta.regions) || [];
const regionOf = (id) => regions().find(r => r.id === id) || null;
const rname = (id) => { const r = regionOf(id); return r ? (r.name[LANG()] || r.name.en || id) : ''; };
const cname = (cc) => { try { return String(new Intl.DisplayNames([LOCALE()], { type: 'region' }).of(cc) || cc).replace(/\s*[（(].*[)）]\s*$/, ''); } catch (e) { return cc || ''; } };
const placeText = (p) => (p.region ? rname(p.region) + (p.sub ? ' · ' + cname(p.sub) : '') : '');
const limit = (k, d) => (ST.meta && ST.meta.limits && ST.meta.limits[k]) || d;
function ago(iso) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return tr('방금'); if (s < 3600) return tr('{n}분 전', { n: Math.floor(s / 60) }); if (s < 86400) return tr('{n}시간 전', { n: Math.floor(s / 3600) }); if (s < 7 * 86400) return tr('{n}일 전', { n: Math.floor(s / 86400) });
  try { return new Intl.DateTimeFormat(LOCALE(), { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(t)); } catch (e) { return iso.slice(0, 10); }
}
const dOf = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
function rangeText(a, b) {
  const d1 = dOf(a), d2 = dOf(b || a); if (!d1) return '';
  try { const f = new Intl.DateTimeFormat(LOCALE(), { year: 'numeric', month: 'short', day: 'numeric' }); return d2 && d2 > d1 ? f.formatRange(d1, d2) : f.format(d1); } catch (e) { return a + (b && b !== a ? ' – ' + b : ''); }
}
const errText = (e) => {
  const c = e && e.code;
  if (c === 'network' || c === 'no_server') return tr('서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.');
  if (c === 'bad_words') return tr('쓸 수 없는 말이 들어 있어요. 고쳐서 다시 올려 주세요.');
  if (c === 'slow_down') return tr('너무 자주 올리고 있어요. 잠시 뒤에 다시 해 주세요.');
  if (c === 'storage_full') return tr('사진 저장 공간이 가득 찼어요. 사진 없이 올려 주세요.');
  if (c === 'too_large' || c === 'bad_image') return tr('이 사진은 올릴 수 없어요. 다른 사진을 골라 주세요.');
  if (c === 'not_found') return tr('지워졌거나 없는 글이에요.');
  if (c === 'region_required') return tr('지역을 골라 주세요.');
  if (c === 'plan_required') return tr('나눌 여행 일정을 붙여 주세요.');
  return tr('문제가 생겼어요. 잠시 뒤에 다시 해 주세요.');
};

// ---------- 알림 · 시트 · 하위 화면 ----------
function toast(text) { const el = $('#cm-toast'); if (!el) return; el.textContent = text; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2400); }
const sheetEl = () => $('#cm-sheet');
const lock = () => { document.body.style.overflow = (ST.stack.length || (sheetEl() && !sheetEl().hidden)) ? 'hidden' : ''; };
function sheet(html, after) { $('#cm-sheet-body').innerHTML = html; const el = sheetEl(); el.hidden = false; const sh = $('.sheet', el); if (sh) sh.scrollTop = 0; lock(); if (after) after($('#cm-sheet-body')); }
function closeSheet() { const el = sheetEl(); if (!el || el.hidden) return; el.hidden = true; $('#cm-sheet-body').innerHTML = ''; ST.sel = null; lock(); }
const SCREENS = {}, ACT = {};
function show(name, p, replace) { if (replace) ST.stack.pop(); ST.stack.push({ name, p: p || {} }); renderScreen(); }
function closeScreens() { ST.stack.length = 0; const el = $('#cm-screen'); el.hidden = true; el.innerHTML = ''; lock(); if (H && H.setBusy) H.setBusy(false); }
function renderScreen() {
  const el = $('#cm-screen'); const top = ST.stack[ST.stack.length - 1]; if (!top) { closeScreens(); return; }
  const v = SCREENS[top.name](top.p) || {};
  el.innerHTML = `<header class="sd-top"><button type="button" class="top-btn" data-act="back" aria-label="${esc(tr('뒤로'))}">${IC.back}</button><div class="sd-top-title">${esc(v.title || '')}</div><span class="top-spacer"></span>${v.right || ''}</header><div class="cm-scroll" id="cm-scroll">${v.html || ''}</div>${v.bar ? `<div class="cm-bar">${v.bar}</div>` : ''}`;
  el.hidden = false; lock(); if (H && H.setBusy) H.setBusy(true);
  if (v.after) v.after(el);
}
function back() {
  const vw = $('#cm-viewer'); if (vw) { vw.remove(); return true; }
  if (sheetEl() && !sheetEl().hidden) { closeSheet(); return true; }
  if (!ST.stack.length) return false;
  const top = ST.stack[ST.stack.length - 1];
  if (top.name === 'write' && draftDirty()) { askLeave(); return true; }
  popScreen(); return true;
}
function popScreen() { ST.stack.pop(); if (ST.stack.length) renderScreen(); else closeScreens(); }
ACT.back = () => back();
ACT['sheet-close'] = () => closeSheet();

// ---------- 서버 ----------
const api = (m, p, b) => H.api(m, p, b);
async function loadMeta() {
  if (!ST.meta) { try { const j = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (j && j.regions) ST.meta = j; } catch (e) { /* ignore */ } }
  try { const j = await api('GET', '/community/meta'); if (j && j.regions) { ST.meta = j; try { localStorage.setItem(META_KEY, JSON.stringify(j)); } catch (e) { /* ignore */ } } } catch (e) { log('meta failed: ' + (e && (e.code || e.message))); }
}
async function loadMe() {
  if (!authed()) { ST.me = null; paintHead(); return null; }
  try { ST.me = await api('GET', '/community/me'); } catch (e) { if (e && e.status === 401) ST.me = null; log('me failed: ' + (e && (e.code || e.message))); }
  paintHead(); return ST.me;
}
async function attend() {   // 하루 한 번 출석 포인트
  if (!authed()) return; const day = new Date().toDateString() + '|' + myUid();
  try { if (localStorage.getItem(ATTEND_KEY) === day) return; } catch (e) { /* ignore */ }
  try { const j = await api('POST', '/me/attend'); try { localStorage.setItem(ATTEND_KEY, day); } catch (e) { /* ignore */ } if (j && j.earned > 0) { if (ST.me) ST.me.points = j.total; paintHead(); toast(tr('출석 포인트 +{n}', { n: j.earned })); } } catch (e) { /* 다음에 다시 */ }
}
function listQs(before) {
  const q = new URLSearchParams(); if (ST.mine) q.set('mine', '1'); else { if (ST.board) q.set('board', ST.board); if (ST.region) q.set('region', ST.region); if (ST.sub) q.set('sub', ST.sub); }
  if (ST.q) q.set('q', ST.q);   // 검색어: 지금 고른 게시판·지역(또는 내 글) 안에서 제목·내용을 찾는다
  if (before) q.set('before', before); return q.toString();
}
async function loadList(more) {
  const L = ST.list; if (L.state === 'loading' && more) return; const seq = ++L.seq;
  if (!more) { L.items = []; L.next = null; } L.state = 'loading'; paintList();
  try {
    const j = await api('GET', '/community/posts?' + listQs(more ? L.next : null)); if (seq !== L.seq) return;
    L.items = more ? L.items.concat(j.items || []) : (j.items || []); L.next = j.next || null; L.state = 'done'; L.at = Date.now();
  } catch (e) { if (seq !== L.seq) return; L.state = 'error'; L.err = e; log('list failed: ' + (e && (e.code || e.message))); }
  paintList();
}

// ---------- 로그인 · 약관 ----------
function loginSheet(then) {
  const src = $('#battle-out .login-btns'); afterAuth = then || null;
  sheet(`<div class="sheet-title">${esc(tr('로그인이 필요해요'))}</div><p class="desc">${esc(tr('글을 쓰거나 좋아요를 누르려면 로그인해 주세요. 읽기는 로그인 없이 할 수 있어요.'))}</p>
    <div class="login-btns" id="cm-login">${src ? src.innerHTML : ''}</div><p class="caption" id="cm-login-msg" style="min-height:18px"></p><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`,
  (body) => { $$('#cm-login .login', body).forEach(b => { b.dataset.act = 'cm-login'; }); });
}
ACT['cm-login'] = async (d) => {
  const msg = $('#cm-login-msg'); const then = afterAuth; if (msg) msg.textContent = tr('로그인 창을 여는 중…');
  const r = H.login ? await H.login(d.provider) : null;
  if (!r || !r.ok) { if (msg) msg.textContent = (r && r.error) || tr('로그인에 실패했어요.'); return; }
  afterAuth = null; closeSheet(); await loadMe(); attend(); if (then) then();
};
function needLogin(then) { if (authed()) { then(); return; } loginSheet(then); }
const TERMS = ['욕설, 비방, 음란물, 불법 광고, 다른 사람의 개인정보는 올리지 않아요.', '올린 글과 사진은 누구나 볼 수 있어요. 사진의 위치 정보는 올리기 전에 지워져요.', '약속을 어긴 글은 신고할 수 있고, 신고가 쌓이면 자동으로 가려지며 운영자가 지울 수 있어요.', '보고 싶지 않은 사람은 차단할 수 있어요.'];
function termsSheet(then) {
  afterAuth = then || null;
  sheet(`<div class="sheet-title">${esc(tr('커뮤니티 이용 약속'))}</div><ul class="cm-terms">${TERMS.map(x => `<li>${esc(tr(x))}</li>`).join('')}</ul><p class="caption">${esc(tr('문의: {m}', { m: (ST.meta && ST.meta.contact) || 'hi@hueeng.com' }))}</p>
    <p class="caption" id="cm-terms-msg" style="min-height:18px"></p><div class="cm-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="terms-ok">${esc(tr('동의하고 계속하기'))}</button></div>`);
}
ACT['terms-ok'] = async () => {
  const then = afterAuth; const msg = $('#cm-terms-msg');
  try { if (!ST.meta) await loadMeta(); ST.me = await api('POST', '/community/terms', { version: (ST.meta && ST.meta.terms) || '' }); afterAuth = null; closeSheet(); paintHead(); if (then) then(); }
  catch (e) { if (msg) msg.textContent = errText(e); }
};
/** 쓰기 전에: 로그인 → 약속 동의 → then */
function needWriter(then) {
  needLogin(async () => { if (!ST.me) await loadMe(); if (ST.me && ST.me.agreed) then(); else if (ST.me) termsSheet(then); else toast(tr('서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.')); });
}

// ---------- 탭 본문: 목록 ----------
const chip = (act, v, label, on, extra) => `<button type="button" class="chip ${on ? 'active' : ''}" data-act="${act}" data-v="${esc(v)}" ${extra || ''}>${esc(label)}</button>`;
let qTimer = 0;
// 웹 버전의 넓은 화면(PC): 검색 칸을 늘 보여 주고 고르기를 왼쪽 기둥에 둔다(배치는 web.css)
const isWide = () => !!H && H.platform === 'web' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches;
function renderPage() {
  const box = $('#cm-page'); if (!box) return;
  if (!ACC() || !ACC().base) { box.innerHTML = `<h1 class="title">${esc(tr('커뮤니티'))}</h1><p class="cm-hint">${esc(tr('커뮤니티 서버가 아직 준비되지 않았어요.'))}</p>`; return; }
  const subs = ST.region ? ((regionOf(ST.region) || {}).subs || []) : [];
  // 묶음 셋: 앞줄(검색·웹 안내) · 고르기(게시판·지역) · 목록. 앱에서는 그냥 위에서 아래로 놓이고, 웹의 넓은 화면(web.css)에서는 고르기가 왼쪽 기둥, 나머지가 오른쪽 본문이 된다
  const wide = isWide(); const showQ = ST.qOpen || ST.q || wide;
  box.innerHTML = `<div class="cm-head"><h1 class="title">${esc(tr('커뮤니티'))}</h1><span class="top-spacer"></span><span id="cm-headbtns"></span></div>
    <div class="cm-pre">${showQ ? `<form class="cm-search" id="cm-search" action="#"><span class="cm-search-ic">${IC.search}</span><input id="cm-q" type="search" maxlength="40" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" placeholder="${esc(tr('제목·내용 검색'))}" aria-label="${esc(tr('제목·내용 검색'))}" value="${esc(ST.q)}"><button type="button" data-act="q-clear" aria-label="${esc(tr('검색 닫기'))}" ${wide && !ST.q ? 'hidden' : ''}>×</button></form>` : ''}
    ${webOn() && !ST.q && !ST.qOpen && !ST.mine ? `<button type="button" class="cm-webrow" data-act="web-info">${IC.web}<span>${esc(tr('PC·웹에서도 보고 글을 쓸 수 있어요'))}</span><i class="chev"></i></button>` : ''}</div>
    <div class="cm-side"><button type="button" class="cm-side-write" data-act="write">${IC.pen}<span>${esc(tr('글쓰기'))}</span></button>
    <div class="cm-side-label">${esc(tr('게시판'))}</div>
    <div class="cm-chips" id="cm-boards">${chip('board', '', tr('전체|board'), !ST.board && !ST.mine)}${BOARDS.map(([k, n]) => chip('board', k, tr(n), ST.board === k && !ST.mine)).join('')}${authed() ? chip('mine', '1', tr('내 글'), ST.mine) : ''}</div>
    ${ST.mine ? '' : `<div class="cm-side-label">${esc(tr('지역'))}</div><div class="cm-chips small" id="cm-regions">${chip('region', '', tr('모든 지역'), !ST.region)}${regions().map(r => chip('region', r.id, rname(r.id), ST.region === r.id)).join('')}</div>`}
    ${!ST.mine && subs.length ? `<div class="cm-chips small" id="cm-subs">${chip('sub', '', tr('전체|board'), !ST.sub)}${subs.map(cc => chip('sub', cc, cname(cc), ST.sub === cc)).join('')}</div>` : ''}</div>
    <div class="cm-main">${ST.board && !ST.mine ? `<p class="cm-boardhint">${esc(tr(BOARD_HINT[ST.board]))}</p>` : ''}
    <div id="cm-list"></div></div>
    <button type="button" class="cm-fab" data-act="write" aria-label="${esc(tr('글쓰기'))}">${IC.pen}<span>${esc(tr('글쓰기'))}</span></button>`;
  paintHead(); paintList();
  const qi = $('#cm-q');
  if (qi) {   // 치는 대로 찾는다(잠깐 멈추면). 엔터는 바로 찾고 키보드를 내린다
    qi.addEventListener('input', () => { const x = $('#cm-search [data-act="q-clear"]'); if (x) x.hidden = isWide() && !qi.value; clearTimeout(qTimer); qTimer = setTimeout(() => { const v = qi.value.trim(); if (v !== ST.q) { ST.q = v; loadList(); } }, 350); });
    $('#cm-search').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(qTimer); const v = qi.value.trim(); if (v !== ST.q) { ST.q = v; loadList(); } qi.blur(); });
  }
  const on = $('#cm-boards .chip.active'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function paintHead() {
  const el = $('#cm-headbtns'); if (!el) return;
  el.innerHTML = `${authed() && ST.me ? `<button type="button" class="cm-pill" data-act="points" aria-label="${esc(tr('포인트'))}">${IC.point}<b>${esc(String(ST.me.points || 0))}</b></button>` : ''}<button type="button" class="top-btn ${ST.q ? 'on' : ''}" data-act="q-open" aria-label="${esc(tr('검색'))}">${IC.search}</button><button type="button" class="top-btn" data-act="reload" aria-label="${esc(tr('새로 고침'))}">${IC.refresh}</button><button type="button" class="top-btn" data-act="cm-menu" aria-label="${esc(tr('더 보기'))}">${IC.more}</button>`;
}
function attachChip(a) {
  if (!a) return '';
  const t = a.kind === 'plan' ? [tr('일정|attach'), a.title, tr('{n}곳', { n: a.places || 0 })] : [tr('여행 기록'), a.title];
  return `<span class="cm-att">${a.kind === 'plan' ? IC.plan : IC.record}${esc(t.filter(Boolean).join(' · '))}</span>`;
}
function cardHtml(p) {
  const big = p.board === 'brag' && p.thumb; const place = placeText(p);
  const tags = `<div class="cm-tags"><span class="cm-tag b-${esc(p.board)}">${esc(boardName(p.board))}</span>${place ? `<span class="cm-tag">${esc(place)}</span>` : ''}${p.hidden ? `<span class="cm-tag warn">${esc(tr('가려진 글'))}</span>` : ''}</div>`;
  return `<article class="cm-card ${big ? 'big' : ''}" data-act="open" data-id="${p.id}" role="button" tabindex="0">
    ${big ? `<div class="cm-card-photo"><img src="${esc(p.thumb)}" alt="" loading="lazy">${p.photoCount > 1 ? `<span class="cm-count">${IC.photo}${p.photoCount}</span>` : ''}</div>` : ''}
    <div class="cm-card-main"><div class="cm-card-body">${tags}<h3 class="cm-card-title">${esc(p.title)}</h3>${p.excerpt ? `<p class="cm-card-ex">${esc(p.excerpt)}</p>` : ''}
      ${p.when ? `<span class="cm-att">${esc(rangeText(p.when.start, p.when.end))}</span>` : ''}${attachChip(p.attach)}</div>${!big && p.thumb ? `<img class="cm-card-thumb" src="${esc(p.thumb)}" alt="" loading="lazy">` : ''}</div>
    <div class="cm-card-foot"><span class="cm-by">${esc(p.author.name || tr('이름 없음'))} · ${esc(ago(p.createdAt))}</span><span class="cm-stats"><span class="cm-stat ${p.liked ? 'on' : ''}">${p.liked ? IC.heartOn : IC.heart}${p.likes}</span><span class="cm-stat">${IC.bubble}${p.comments}</span></span></div></article>`;
}
function paintList() {
  const box = $('#cm-list'); if (!box) return; const L = ST.list; let h = L.items.map(cardHtml).join('');
  if (L.state === 'loading') h += `<p class="cm-hint">${esc(tr('불러오는 중…'))}</p>`;
  else if (L.state === 'error') h += `<div class="cm-empty"><p>${esc(errText(L.err))}</p><button type="button" class="btn weak" data-act="reload">${esc(tr('다시 시도'))}</button></div>`;
  else if (!L.items.length && ST.q) h += `<div class="cm-empty"><p>${esc(tr('‘{q}’ 검색 결과가 없어요.', { q: ST.q }))}</p><button type="button" class="btn weak" data-act="q-clear">${esc(tr('검색 닫기'))}</button></div>`;
  else if (!L.items.length) h += `<div class="cm-empty"><p>${esc(ST.mine ? tr('아직 쓴 글이 없어요.') : tr('아직 글이 없어요. 첫 글을 남겨 보세요.'))}</p><button type="button" class="btn weak" data-act="write">${esc(tr('글쓰기'))}</button></div>`;
  else if (L.next) h += `<button type="button" class="btn secondary cm-more" data-act="more">${esc(tr('더 보기'))}</button>`;
  box.innerHTML = h;
}
ACT.board = (d) => { ST.mine = false; ST.board = d.v || ''; renderPage(); loadList(); };
ACT.mine = () => { ST.mine = !ST.mine; renderPage(); loadList(); };
ACT.region = (d) => { ST.region = d.v || ''; ST.sub = ''; renderPage(); loadList(); };
ACT.sub = (d) => { ST.sub = d.v || ''; renderPage(); loadList(); };
ACT['q-open'] = () => {   // 돋보기: 검색 칸을 열고 초점. 열려 있고 검색어가 없으면 닫는다
  if (ST.qOpen && !ST.q) { ST.qOpen = false; renderPage(); return; }
  ST.qOpen = true; renderPage(); const qi = $('#cm-q'); if (qi) { qi.focus(); try { qi.setSelectionRange(qi.value.length, qi.value.length); } catch (e) { /* ignore */ } }
};
ACT['q-clear'] = () => { clearTimeout(qTimer); const had = !!ST.q; ST.q = ''; ST.qOpen = false; renderPage(); if (had) loadList(); if (isWide()) { const qi = $('#cm-q'); if (qi) qi.focus(); } };
ACT.more = () => loadList(true);
ACT.reload = () => { loadList(); loadMe(); };
ACT.open = (d) => show('post', { id: +d.id });
ACT['cm-menu'] = () => {
  sheet(`<div class="sheet-title">${esc(tr('커뮤니티'))}</div><ul class="rows">
    ${authed() ? `<li class="row tap" data-act="profile-edit"><span class="cm-ic">${IC.user}</span><div class="row-body"><div class="row-title">${esc(tr('프로필 설정'))}</div><div class="row-desc">${esc(tr('프로필 사진 · 닉네임 · 소개'))}</div></div><span class="chev"></span></li>
    <li class="row tap" data-act="points"><span class="cm-ic">${IC.point}</span><div class="row-body"><div class="row-title">${esc(tr('내 포인트'))}</div></div><span class="chev"></span></li>
    <li class="row tap" data-act="blocks"><span class="cm-ic">${IC.block}</span><div class="row-body"><div class="row-title">${esc(tr('차단한 사람'))}</div></div><span class="chev"></span></li>` : ''}
    ${webOn() ? `<li class="row tap" data-act="web-info"><span class="cm-ic">${IC.web}</span><div class="row-body"><div class="row-title">${esc(tr('웹에서 보기 · 글쓰기'))}</div><div class="row-desc">${esc(tr('PC나 다른 기기의 브라우저에서'))}</div></div><span class="chev"></span></li>` : ''}
    <li class="row tap" data-act="terms-view"><span class="cm-ic">${IC.flag}</span><div class="row-body"><div class="row-title">${esc(tr('커뮤니티 이용 약속'))}</div><div class="row-desc">${esc(tr('신고·차단 안내'))}</div></div><span class="chev"></span></li></ul>
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
// 웹 버전 안내: 검색해서 들어오거나, 주소를 복사하거나, 공유로 PC·다른 기기에 보낸다
const WEB_URL = 'https://passport.hueeng.com/community/';
const webOn = () => !!H && H.platform !== 'web';
const webUrl = () => (ST.meta && typeof ST.meta.web === 'string' && /^https:\/\//.test(ST.meta.web) ? ST.meta.web : WEB_URL);
function copyText(text) {   // 앱 안의 웹뷰는 navigator.clipboard 가 막혀 있을 수 있어 예전 방식으로도 해 본다
  const old = () => { try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0;font-size:16px'; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, text.length); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } };
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => old()); } catch (e) { /* fall through */ }
  return Promise.resolve(old());
}
ACT['web-info'] = () => {
  const u = webUrl(); const shown = u.replace(/^https:\/\//, '').replace(/\/$/, '');
  sheet(`<div class="sheet-title">${esc(tr('웹에서도 커뮤니티를 쓸 수 있어요'))}</div><p class="desc">${esc(tr('PC나 다른 기기의 브라우저에서 글을 보고 쓸 수 있어요. 앱과 같은 계정으로 로그인하면 내 글과 포인트가 그대로 이어져요.'))}</p>
    <div class="cm-webfind"><div class="cm-webbar">${IC.search}<b>${esc(tr('여행여권'))}</b></div><p>${esc(tr('검색창에 ‘여행여권’을 검색하세요'))}</p></div>
    <div class="cm-weburl" id="cm-weburl">${esc(shown)}</div>
    <div class="cm-webacts"><button type="button" class="btn secondary" data-act="web-copy">${IC.copy}<span>${esc(tr('링크 복사'))}</span></button><button type="button" class="btn primary" data-act="web-share">${IC.out}<span>${esc(tr('공유하기'))}</span></button></div>
    <button type="button" class="cm-link" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['web-copy'] = async () => { const ok = await copyText(webUrl()); toast(ok ? tr('링크를 복사했어요.') : tr('복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.')); };
ACT['web-share'] = () => { const u = webUrl(); if (H && H.shareText) H.shareText(tr('여행여권 커뮤니티 — 웹에서도 여행 이야기를 보고 쓸 수 있어요.') + '\n' + u, u, tr('여행여권 커뮤니티')); else ACT['web-copy'](); };
ACT['terms-view'] = () => {
  sheet(`<div class="sheet-title">${esc(tr('커뮤니티 이용 약속'))}</div><ul class="cm-terms">${TERMS.map(x => `<li>${esc(tr(x))}</li>`).join('')}</ul><p class="caption">${esc(tr('문의: {m}', { m: (ST.meta && ST.meta.contact) || 'hi@hueeng.com' }))}</p><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};

// ---------- 포인트 · 차단 목록 ----------
ACT.points = () => needLogin(async () => {
  sheet(`<div class="sheet-title">${esc(tr('내 포인트'))}</div><div id="cm-points"><p class="cm-hint">${esc(tr('불러오는 중…'))}</p></div><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
  try {
    const j = await api('GET', '/me/points'); if (ST.me) ST.me.points = j.total; paintHead(); const box = $('#cm-points'); if (!box) return;
    const rules = ['post', 'photo', 'comment', 'liked', 'attend'].filter(k => j.rules && j.rules[k]).map(k => `<li><span>${esc(tr(POINT_KIND[k]))}</span><b>+${j.rules[k].amount}</b><i>${esc(tr('하루 {n}번까지', { n: j.rules[k].perDay }))}</i></li>`).join('');
    const items = (j.items || []).map(x => `<li><span>${esc(tr(POINT_KIND[x.kind] || '기타'))}</span><b class="${x.amount < 0 ? 'neg' : ''}">${x.amount > 0 ? '+' : ''}${x.amount}</b><i>${esc(ago(x.at))}</i></li>`).join('');
    box.innerHTML = `<div class="cm-pbig"><b>${esc(String(j.total))}</b><span>${esc(tr('포인트'))}</span></div><p class="caption">${esc(tr('포인트를 쓰는 곳은 아직 없어요. 지금은 모으기만 할 수 있어요.'))}</p>
      <div class="cm-sub">${esc(tr('모으는 방법'))}</div><ul class="cm-plist">${rules}</ul>${items ? `<div class="cm-sub">${esc(tr('최근 내역'))}</div><ul class="cm-plist">${items}</ul>` : ''}`;
  } catch (e) { const box = $('#cm-points'); if (box) box.innerHTML = `<p class="cm-hint">${esc(errText(e))}</p>`; }
});
ACT.blocks = () => needLogin(async () => {
  sheet(`<div class="sheet-title">${esc(tr('차단한 사람'))}</div><div id="cm-blocks"><p class="cm-hint">${esc(tr('불러오는 중…'))}</p></div><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
  try { paintBlocks(await api('GET', '/community/blocks')); } catch (e) { const box = $('#cm-blocks'); if (box) box.innerHTML = `<p class="cm-hint">${esc(errText(e))}</p>`; }
});
function paintBlocks(j) {
  const box = $('#cm-blocks'); if (!box) return; const items = (j && j.items) || []; if (ST.me) ST.me.blocks = items.map(x => x.uid);
  box.innerHTML = items.length ? `<ul class="rows">${items.map(x => `<li class="row"><div class="row-body"><div class="row-title">${esc(x.name || tr('이름 없음'))}</div></div><button type="button" class="chip" data-act="unblock" data-uid="${x.uid}">${esc(tr('차단 풀기'))}</button></li>`).join('')}</ul>` : `<p class="cm-hint">${esc(tr('차단한 사람이 없어요.'))}</p>`;
}
ACT.unblock = async (d) => { try { paintBlocks(await api('DELETE', '/community/blocks/' + encodeURIComponent(d.uid))); loadList(); } catch (e) { toast(errText(e)); } };

// ---------- 글 보기 ----------
// 붙인 여행 일정을 날짜별로 자세히: 날짜마다 순서 · 시각 · 이름 · 주소 · 메모 · 머무는 시간 · 다음 곳까지의 이동. 날짜는 접었다 펼 수 있다.
const MOVE_NAME = { walk: '걷기', subway: '지하철', bus: '버스', train: '기차', taxi: '택시', car: '자동차', plane: '비행기', ferry: '배' };
const minText = (m) => (m >= 60 ? (m % 60 ? tr('{h}시간 {m}분', { h: Math.floor(m / 60), m: m % 60 }) : tr('{n}시간', { n: m / 60 })) : tr('{n}분', { n: m }));
function planDays(d) {
  const items = (d && d.items) || []; if (!items.length) return '';
  const keys = []; const by = {}; for (const it of items) { const k = it.day || ''; if (!by[k]) { by[k] = []; keys.push(k); } by[k].push(it); }
  keys.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a < b ? -1 : a > b ? 1 : 0));   // 날짜순, 날짜를 정하지 않은 곳은 맨 아래
  const start = dOf(d.start) || dOf(keys[0]);
  const dayLabel = (k) => { const dt = dOf(k); if (!dt) return [tr('날짜 미정'), '']; const n = start ? Math.round((dt - start) / 86400000) + 1 : 0; let s = k; try { s = new Intl.DateTimeFormat(LOCALE(), { month: 'short', day: 'numeric', weekday: 'short' }).format(dt); } catch (e) { /* ignore */ } return [n > 0 ? tr('{n}일차', { n }) : s, n > 0 ? s : '']; };
  return `<div class="cm-plan">${keys.map((k) => {
    const list = by[k]; const [a, b] = dayLabel(k); const cnt = list.filter(x => x.kind !== 'note').length; let no = 0;
    const rows = list.map((it) => {
      if (it.kind === 'note') return `<li class="note"><span class="cm-plan-n">·</span><div><div class="cm-plan-name">${esc(it.name)}</div>${it.memo ? `<div class="cm-plan-memo">${esc(it.memo)}</div>` : ''}</div></li>`;
      no++; const lg = it.leg; const leg = lg && (lg.mode || lg.min) ? `<li class="leg">${esc([lg.mode && MOVE_NAME[lg.mode] ? tr(MOVE_NAME[lg.mode]) : '', lg.min ? minText(lg.min) : ''].filter(Boolean).join(' · '))}</li>` : '';
      return `<li><span class="cm-plan-n">${no}</span><div><div class="cm-plan-top"><b class="cm-plan-name">${esc(it.name)}</b>${it.time ? `<span class="cm-plan-time">${esc(it.time)}</span>` : ''}</div>${it.addr ? `<div class="cm-plan-addr">${esc(it.addr)}</div>` : ''}${it.memo ? `<div class="cm-plan-memo">${esc(it.memo)}</div>` : ''}${it.stay ? `<div class="cm-plan-stay">${esc(tr('{t} 머물기', { t: minText(it.stay) }))}</div>` : ''}</div></li>${leg}`;
    }).join('');
    return `<details class="cm-plan-day" open><summary><b>${esc(a)}</b><span>${esc([b, tr('{n}곳', { n: cnt })].filter(Boolean).join(' · '))}</span></summary><ol>${rows}</ol></details>`;
  }).join('')}</div>`;
}
function planCard(a, post) {
  const d = a.doc || {}; const places = (d.items || []).filter(x => x.kind !== 'note'); const dests = (d.dests || []).map(x => x.name).filter(Boolean);
  return `<div class="cm-attcard"><div class="cm-attcard-k">${IC.plan}${esc(tr('여행 일정'))}</div><div class="cm-attcard-t">${esc(d.title || '')}</div><div class="cm-attcard-s">${esc([dests.slice(0, 4).join(', '), rangeText(d.start, d.end), tr('{n}곳', { n: places.length })].filter(Boolean).join(' · '))}</div>
    ${planDays(d)}
    ${root.Planner && root.Planner.importDoc ? `<button type="button" class="btn weak" data-act="import" data-id="${post.id}">${esc(tr('내 여행에 담기'))}</button>` : ''}</div>`;
}
function recordCard(a) {
  const sub = [rangeText(a.start, a.end), a.days ? tr('{n}일', { n: a.days }) : '', a.photos ? tr('사진 {n}장', { n: a.photos }) : ''].filter(Boolean).join(' · ');
  return `<div class="cm-attcard"><div class="cm-attcard-k">${IC.record}${esc(tr('여행 기록'))}</div><div class="cm-attcard-t">${esc(a.title || '')}</div>${sub ? `<div class="cm-attcard-s">${esc(sub)}</div>` : ''}
    ${(a.places || []).length ? `<div class="cm-places">${a.places.map(n => `<span>${esc(n)}</span>`).join('')}</div>` : ''}</div>`;
}
function commentHtml(c) {
  if (c.deleted) return `<li class="cm-cmt gone" data-cid="${c.id}"><span class="cm-ava"></span><div class="cm-cmt-body"><p>${esc(tr('지워진 댓글이에요.'))}</p></div></li>`;
  return `<li class="cm-cmt${c.parent ? ' reply' : ''}" data-cid="${c.id}">${ava(c.author)}<div class="cm-cmt-body"><div class="cm-cmt-head"><b>${esc(c.author.name || tr('이름 없음'))}</b><span>${esc(ago(c.createdAt))}</span></div><p>${esc(c.body)}</p>
    <button type="button" class="cm-cmt-reply" data-act="cmt-reply" data-id="${c.id}">${esc(tr('답글 달기'))}</button></div>
    <button type="button" class="cm-cmt-more" data-act="cmt-menu" data-id="${c.id}" aria-label="${esc(tr('더 보기'))}">${IC.more}</button></li>`;
}
// 댓글 목록을 다시 그린다(서버가 줄기 순서로 준다: 댓글 → 그 답글들)
function paintComments() {
  const p = ST.post; if (!p) return; const ul = $('#cm-cmts'); if (ul) ul.innerHTML = (p.commentList || []).map(commentHtml).join('');
  const t = $('#cm-cmt-title'); if (t) t.textContent = tr('댓글 {n}', { n: p.comments });
  const none = $('#cm-cmt-none'); if (none && (p.commentList || []).length) none.remove();
}
function paintReply() {   // 입력 칸 위의 '○○님에게 답글' 줄
  const box = $('#cm-replyto'); if (!box) return; const r = ST.reply;
  box.hidden = !r; box.innerHTML = r ? `<span>${esc(tr('{name}님에게 답글', { name: r.name || tr('이름 없음') }))}</span><button type="button" data-act="cmt-reply-x" aria-label="${esc(tr('답글 그만두기'))}">${IC.close}</button>` : '';
  const inp = $('#cm-cmt-in'); if (inp) inp.placeholder = r ? tr('답글을 남겨 보세요') : tr('댓글을 남겨 보세요');
}
ACT['cmt-reply'] = (d) => {
  const p = ST.post; const c = p && (p.commentList || []).find(x => x.id === +d.id); if (!c || c.deleted) return;
  ST.reply = { id: c.id, name: c.author.name }; paintReply(); const inp = $('#cm-cmt-in'); if (inp) inp.focus();
};
ACT['cmt-reply-x'] = () => { ST.reply = null; paintReply(); };
// ---------- 서식 있는 본문 ----------
// 서버가 걸러 저장한 본문(bodyHtml)도 그릴 때 한 번 더 거른다: 허용한 태그만, 속성은 정해 둔 것만. 사진은 <img data-photo="id"> 자리를 photos 의 주소로 바꾼다.
const RT_INLINE = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', DEL: 's' };
const RT_BLOCK = { P: 'p', DIV: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', UL: 'ul', OL: 'ol', LI: 'li', BLOCKQUOTE: 'blockquote', TABLE: 'table', THEAD: 'tbody', TBODY: 'tbody', TFOOT: 'tbody', TR: 'tr', TD: 'td', TH: 'th' };
const RT_SKIP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, TEMPLATE: 1, SVG: 1, MATH: 1, TEXTAREA: 1, SELECT: 1, BUTTON: 1, NOSCRIPT: 1, TITLE: 1, HEAD: 1 };
/** html 을 걸러 다시 쓴다. img(el) 은 사진 자리를 무엇으로 쓸지 정한다(빈 문자열이면 뺀다). */
function cleanHtml(html, img) {
  const doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
  const walk = (node) => {
    let out = '';
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === 3) { out += esc(n.nodeValue).replace(/&quot;/g, '"').replace(/&#39;/g, "'"); continue; }
      if (n.nodeType !== 1 || RT_SKIP[n.tagName]) continue;
      const tag = n.tagName;
      if (tag === 'BR') { out += '<br>'; continue; }
      if (tag === 'HR') { out += '<hr>'; continue; }
      if (tag === 'IMG') { out += img ? img(n) : ''; continue; }
      const t = RT_INLINE[tag] || RT_BLOCK[tag]; const inner = walk(n);
      if (!t) { out += inner; continue; }
      const al = n.getAttribute('data-a'); const attr = (t === 'p' || t === 'h2' || t === 'h3') && (al === 'c' || al === 'r') ? ` data-a="${al}"` : '';
      out += `<${t}${attr}>${inner}</${t}>`;
    }
    return out;
  };
  return walk(doc.body);
}
const textToHtml = (t) => String(t || '').split('\n').map(l => `<p>${esc(l) || '<br>'}</p>`).join('');
const imgAttrs = (n) => { const w = n.getAttribute('data-w'), a = n.getAttribute('data-a'); return (w === 's' || w === 'm' ? ` data-w="${w}"` : '') + (a === 'l' || a === 'r' ? ` data-a="${a}"` : ''); };
function bodyHtml(p) {
  const photos = p.photos || []; const used = new Set();
  const pic = (x, i, extra) => `<img class="cm-photo" src="${esc(x.url)}" alt="" loading="lazy" data-act="view" data-i="${i}"${extra || ''} ${x.w && x.h ? `style="aspect-ratio:${x.w}/${x.h}"` : ''}>`;
  let h = '';
  if (p.bodyHtml) {
    const inner = cleanHtml(p.bodyHtml, (n) => { const i = photos.findIndex(x => x.id === n.getAttribute('data-photo')); if (i < 0 || used.has(i)) return ''; used.add(i); return pic(photos[i], i, imgAttrs(n)); });
    h = `<div class="cm-body rich">${inner}</div>`;
  } else if (p.body) h = `<div class="cm-body">${esc(p.body)}</div>`;
  return h + photos.map((x, i) => (used.has(i) ? '' : pic(x, i))).join('');
}
function postHtml(p) {
  const place = placeText(p);
  return `<div class="cm-post"><div class="cm-tags"><span class="cm-tag b-${esc(p.board)}">${esc(boardName(p.board))}</span>${place ? `<span class="cm-tag">${esc(place)}</span>` : ''}${p.hidden ? `<span class="cm-tag warn">${esc(tr('가려진 글'))}</span>` : ''}</div>
    <h1 class="cm-post-title">${esc(p.title)}</h1>
    <div class="cm-author">${ava(p.author)}<div><b>${esc(p.author.name || tr('이름 없음'))}</b><span>${esc(ago(p.createdAt))}${p.updatedAt !== p.createdAt ? ' · ' + esc(tr('고침')) : ''}</span></div></div>
    ${p.hidden ? `<div class="cm-note">${esc(tr('신고가 여러 번 들어와 다른 사람에게는 보이지 않아요. 문의: {m}', { m: (ST.meta && ST.meta.contact) || 'hi@hueeng.com' }))}</div>` : ''}
    ${p.when ? `<div class="cm-when">${esc(tr('여행 날짜'))} · ${esc(rangeText(p.when.start, p.when.end))}</div>` : ''}
    ${bodyHtml(p)}
    ${p.attach ? (p.attach.kind === 'plan' ? planCard(p.attach, p) : recordCard(p.attach)) : ''}
    <div class="cm-react"><button type="button" class="cm-like ${p.liked ? 'on' : ''}" data-act="like" aria-pressed="${p.liked ? 'true' : 'false'}">${p.liked ? IC.heartOn : IC.heart}<span>${esc(tr('좋아요'))}</span><b id="cm-likes">${p.likes}</b></button></div>
    <div class="cm-sub" id="cm-cmt-title">${esc(tr('댓글 {n}', { n: p.comments }))}</div>
    <ul class="cm-cmts" id="cm-cmts">${(p.commentList || []).map(commentHtml).join('')}</ul>${(p.commentList || []).length ? '' : `<p class="cm-hint" id="cm-cmt-none">${esc(tr('첫 댓글을 남겨 보세요.'))}</p>`}</div>`;
}
SCREENS.post = (p) => {
  const cur = ST.post && ST.post.id === p.id ? ST.post : null;
  if (!cur || (ST.reply && !(cur.commentList || []).some(x => x.id === ST.reply.id))) ST.reply = null;
  const bar = `<div class="cm-replyto" id="cm-replyto" hidden></div><input id="cm-cmt-in" maxlength="${limit('comment', 500)}" autocomplete="off" placeholder="${esc(tr('댓글을 남겨 보세요'))}"><button type="button" class="cm-send" data-act="cmt-send" aria-label="${esc(tr('댓글 올리기'))}">${IC.send}</button>`;
  return { title: cur ? boardName(cur.board) : tr('커뮤니티'), right: cur ? `<button type="button" class="top-btn" data-act="post-menu" aria-label="${esc(tr('더 보기'))}">${IC.more}</button>` : '',
    html: cur ? postHtml(cur) : `<p class="cm-hint">${esc(tr('불러오는 중…'))}</p>`, bar: cur ? bar : '',
    after: () => { if (cur) { paintReply(); const inp = $('#cm-cmt-in'); if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ACT['cmt-send'](); } }); } else loadPost(p.id); } };
};
async function loadPost(id) {
  try { ST.post = await api('GET', '/community/posts/' + id); }
  catch (e) { const top = ST.stack[ST.stack.length - 1]; if (top && top.name === 'post' && top.p.id === id) { popScreen(); toast(errText(e)); if (e && e.code === 'not_found') { ST.list.items = ST.list.items.filter(x => x.id !== id); paintList(); } } return; }
  const top = ST.stack[ST.stack.length - 1]; if (top && top.name === 'post' && top.p.id === id) renderScreen();
}
const syncCard = (p) => { const i = ST.list.items.findIndex(x => x.id === p.id); if (i >= 0) { Object.assign(ST.list.items[i], { likes: p.likes, liked: p.liked, comments: p.comments, title: p.title }); paintList(); } };
ACT.like = () => needLogin(async () => {
  const p = ST.post; if (!p) return; const on = !p.liked;
  p.liked = on; p.likes = Math.max(0, p.likes + (on ? 1 : -1)); paintLike();   // 먼저 바꿔 보이고, 실패하면 되돌린다
  try { const j = await api(on ? 'POST' : 'DELETE', '/community/posts/' + p.id + '/like'); p.liked = j.liked; p.likes = j.likes; }
  catch (e) { p.liked = !on; p.likes = Math.max(0, p.likes + (on ? -1 : 1)); toast(errText(e)); }
  paintLike(); syncCard(p);
});
function paintLike() { const p = ST.post, b = $('#cm-screen .cm-like'); if (!p || !b) return; b.classList.toggle('on', p.liked); b.setAttribute('aria-pressed', p.liked ? 'true' : 'false'); b.innerHTML = `${p.liked ? IC.heartOn : IC.heart}<span>${esc(tr('좋아요'))}</span><b id="cm-likes">${p.likes}</b>`; }
ACT['cmt-send'] = () => {
  const inp = $('#cm-cmt-in'); const text = inp ? inp.value.trim() : ''; if (!text || cmtBusy) return;
  needWriter(async () => {
    const p = ST.post; if (!p || cmtBusy) return; cmtBusy = true;   // 연달아 눌러도 한 번만 올린다
    try {
      const reply = ST.reply; const j = await api('POST', '/community/posts/' + p.id + '/comments', reply ? { body: text, parent: reply.id } : { body: text });
      p.commentList = j.commentList || (p.commentList || []).concat([j.comment]); p.comments = j.comments; if (ST.me && j.points) ST.me.points = j.points.total;
      const again = $('#cm-cmt-in'); if (again) again.value = ''; ST.reply = null; paintReply(); paintComments();
      const li = $(`#cm-cmts .cm-cmt[data-cid="${j.comment.id}"]`); const sc = $('#cm-scroll'); if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' }); else if (sc) sc.scrollTop = sc.scrollHeight;
      syncCard(p); paintHead();
      toast(j.points && j.points.earned > 0 ? tr('댓글을 올렸어요. 포인트 +{n}', { n: j.points.earned }) : tr('댓글을 올렸어요.'));
    } catch (e) { toast(errText(e)); }
    cmtBusy = false;
  });
};
ACT['cmt-menu'] = (d) => {
  const p = ST.post; const c = p && (p.commentList || []).find(x => x.id === +d.id); if (!c) return; ST.sel = { kind: 'comment', id: c.id, uid: c.author.uid, name: c.author.name };
  sheet(`<div class="sheet-title">${esc(tr('댓글'))}</div><ul class="rows">${c.mine ? `<li class="row tap" data-act="cmt-del"><span class="cm-ic">${IC.trash}</span><div class="row-body"><div class="row-title danger">${esc(tr('댓글 지우기'))}</div></div></li>`
    : `<li class="row tap" data-act="report"><span class="cm-ic">${IC.flag}</span><div class="row-body"><div class="row-title">${esc(tr('신고하기'))}</div></div></li><li class="row tap" data-act="block"><span class="cm-ic">${IC.block}</span><div class="row-body"><div class="row-title">${esc(tr('이 사람 차단하기'))}</div><div class="row-desc">${esc(tr('이 사람이 쓴 글과 댓글이 보이지 않아요.'))}</div></div></li>`}</ul>
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['cmt-del'] = async () => {
  const s = ST.sel, p = ST.post; if (!s || !p) return; closeSheet();
  try {
    const j = await api('DELETE', '/community/comments/' + s.id); p.commentList = j.commentList || p.commentList.filter(x => x.id !== s.id); p.comments = j.comments; if (ST.me && j.points) ST.me.points = j.points.total;
    if (ST.reply && !p.commentList.some(x => x.id === ST.reply.id && !x.deleted)) { ST.reply = null; paintReply(); }
    paintComments();   // 화면 전체가 아니라 댓글 목록만 다시 그린다(읽던 자리 유지). 답글이 달린 댓글은 '지워진 댓글' 자리만 남는다
    syncCard(p); paintHead(); toast(tr('댓글을 지웠어요.'));
  }
  catch (e) { toast(errText(e)); }
};
ACT['post-menu'] = () => {
  const p = ST.post; if (!p) return; ST.sel = { kind: 'post', id: p.id, uid: p.author.uid, name: p.author.name };
  sheet(`<div class="sheet-title">${esc(p.title)}</div><ul class="rows">${p.mine ? `<li class="row tap" data-act="post-edit"><span class="cm-ic">${IC.pen}</span><div class="row-body"><div class="row-title">${esc(tr('글 고치기'))}</div></div></li><li class="row tap" data-act="post-del"><span class="cm-ic">${IC.trash}</span><div class="row-body"><div class="row-title danger">${esc(tr('글 지우기'))}</div></div></li>`
    : `<li class="row tap" data-act="report"><span class="cm-ic">${IC.flag}</span><div class="row-body"><div class="row-title">${esc(tr('신고하기'))}</div></div></li><li class="row tap" data-act="block"><span class="cm-ic">${IC.block}</span><div class="row-body"><div class="row-title">${esc(tr('이 사람 차단하기'))}</div><div class="row-desc">${esc(tr('이 사람이 쓴 글과 댓글이 보이지 않아요.'))}</div></div></li>`}</ul>
    <button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['post-del'] = async () => {
  const p = ST.post; if (!p) return; closeSheet();
  const ok = await H.askConfirm(tr('이 글을 지울까요?'), tr('댓글과 사진도 함께 지워지고 되돌릴 수 없어요.'), tr('지우기'), true); lock(); if (!ok) return;
  try { const j = await api('DELETE', '/community/posts/' + p.id); if (ST.me && j.points) ST.me.points = j.points.total; ST.list.items = ST.list.items.filter(x => x.id !== p.id); ST.post = null; popScreen(); paintList(); paintHead(); toast(tr('글을 지웠어요.')); }
  catch (e) { toast(errText(e)); }
};
ACT.report = () => { const s = ST.sel; if (!s) return; needLogin(() => {
  sheet(`<div class="sheet-title">${esc(tr('신고하기'))}</div><p class="desc">${esc(tr('어떤 문제인가요? 신고가 쌓이면 자동으로 가려지고 운영자가 확인해요.'))}</p><div class="chips" id="cm-reasons">${REASONS.map((r, i) => `<button type="button" class="chip ${i === 0 ? 'active' : ''}" data-act="reason" data-v="${esc(r)}">${esc(tr(r))}</button>`).join('')}</div>
    <div class="cm-acts"><button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button><button type="button" class="btn primary" data-act="report-ok">${esc(tr('신고하기'))}</button></div>`);
  ST.sel = Object.assign({}, s, { reason: REASONS[0] });
}); };
ACT.reason = (d, el) => { if (ST.sel) ST.sel.reason = d.v; $$('#cm-reasons .chip').forEach(c => c.classList.toggle('active', c === el)); };
ACT['report-ok'] = async () => {
  const s = ST.sel; if (!s) return;
  try { await api('POST', '/community/report', { kind: s.kind, id: s.id, reason: s.reason || '' }); closeSheet(); toast(tr('신고했어요. 확인해 볼게요.')); }
  catch (e) { closeSheet(); toast(errText(e)); }
};
ACT.block = () => { const s = ST.sel; if (!s) return; needLogin(async () => {
  closeSheet();
  const ok = await H.askConfirm(tr('{name} 님을 차단할까요?', { name: s.name || tr('이름 없음') }), tr('이 사람이 쓴 글과 댓글이 보이지 않아요. 커뮤니티 메뉴에서 다시 풀 수 있어요.'), tr('차단하기'), true); lock(); if (!ok) return;
  try { const j = await api('POST', '/community/blocks', { uid: s.uid }); if (ST.me) ST.me.blocks = (j.items || []).map(x => x.uid); ST.post = null; if (ST.stack.length) popScreen(); loadList(); toast(tr('차단했어요.')); }
  catch (e) { toast(errText(e)); }
}); };
ACT.view = (d) => {
  const p = ST.post; const x = p && p.photos && p.photos[+d.i]; if (!x) return;
  const el = document.createElement('div'); el.id = 'cm-viewer'; el.innerHTML = `<img src="${esc(x.url)}" alt=""><button type="button" class="cm-viewer-x" aria-label="${esc(tr('닫기'))}">${IC.close}</button>`;
  el.addEventListener('click', () => el.remove()); document.body.appendChild(el);
};
ACT.import = () => {
  const p = ST.post; if (!p || !p.attach || p.attach.kind !== 'plan' || !root.Planner || !root.Planner.importDoc) return;
  const tab = $('#tabbar [data-tab="trip"]'); closeScreens(); if (tab) tab.click();   // 여행 탭으로 옮겨 가져온 여행을 연다
  try { root.Planner.importDoc(p.attach.doc, { post: p.id, owner: p.author.name || '' }); toast(tr('내 여행에 담았어요.')); } catch (e) { log('import failed: ' + (e && e.message)); toast(tr('문제가 생겼어요. 잠시 뒤에 다시 해 주세요.')); }
};

// ---------- 프로필 ----------
ACT.profile = async (d) => {   // 글쓴이를 누르면: 프로필 사진 · 이름 · 소개 · 쓴 글 수
  const uid = +d.uid; if (!uid) return; let pf = null;
  try { pf = await api('GET', '/community/profile/' + uid); } catch (e) { toast(errText(e)); return; }
  const mine = !!(ST.me && ST.me.uid === uid);
  sheet(`<div class="cm-pf">${ava({ name: pf.name, avatar: pf.avatar }, 'big')}<b class="cm-pf-name">${esc(pf.name || tr('이름 없음'))}</b>${pf.bio ? `<p class="cm-pf-bio">${esc(pf.bio)}</p>` : ''}<span class="cm-pf-n">${esc(tr('쓴 글 {n}개', { n: pf.posts || 0 }))}</span></div>
    ${mine ? `<button type="button" class="btn weak" data-act="profile-edit">${esc(tr('프로필 설정'))}</button>` : ''}<button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['profile-edit'] = () => needWriter(() => { closeSheet(); ST.pf = { name: (ST.me && ST.me.name) || '', bio: (ST.me && ST.me.bio) || '', avatar: (ST.me && ST.me.avatar) || '', blob: null, drop: false, busy: false }; show('profile'); });
SCREENS.profile = () => {
  const f = ST.pf; if (!f) return { title: '', html: '' };
  const html = `<div class="cm-pfedit">
    <div class="cm-pf-pic"><button type="button" class="cm-pf-avabtn" data-act="pf-pick" aria-label="${esc(tr('프로필 사진 바꾸기'))}">${ava({ name: f.name, avatar: f.avatar }, 'big')}<i>${IC.photo}</i></button>
      <div class="cm-pf-picbtns"><button type="button" class="chip" data-act="pf-pick">${esc(tr('사진 고르기'))}</button>${f.avatar ? `<button type="button" class="chip" data-act="pf-drop">${esc(tr('사진 지우기'))}</button>` : ''}</div></div>
    <div class="cm-flabel">${esc(tr('닉네임'))}</div><div class="field"><input id="cm-pf-name" maxlength="20" autocomplete="off" value="${esc(f.name)}" aria-label="${esc(tr('닉네임'))}"></div>
    <div class="cm-flabel">${esc(tr('소개'))}</div><div class="field"><input id="cm-pf-bio" maxlength="80" autocomplete="off" placeholder="${esc(tr('한 줄로 나를 소개해 보세요'))}" value="${esc(f.bio)}" aria-label="${esc(tr('소개'))}"></div>
    <p class="caption">${esc(tr('프로필 사진과 닉네임, 소개는 글과 댓글에 함께 보이고 누구나 볼 수 있어요.'))}</p></div>`;
  return { title: tr('프로필 설정'), html, bar: `<button type="button" class="btn primary" id="cm-pf-save" data-act="pf-save">${esc(tr('저장'))}</button>`,
    after: () => { const n = $('#cm-pf-name'), b = $('#cm-pf-bio'); if (n) n.addEventListener('input', () => { f.name = n.value; }); if (b) b.addEventListener('input', () => { f.bio = b.value; }); } };
};
let pfInput = null;
ACT['pf-pick'] = () => {
  if (!pfInput) { pfInput = document.createElement('input'); pfInput.type = 'file'; pfInput.accept = 'image/*'; pfInput.id = 'cm-pf-file'; pfInput.hidden = true; document.body.appendChild(pfInput);
    pfInput.addEventListener('change', async () => {
      const file = (pfInput.files || [])[0]; pfInput.value = ''; const f = ST.pf; if (!file || !f) return;
      try {   // 가운데를 정사각으로 잘라 320px JPEG 로(위치 정보 같은 부가 정보는 빠진다)
        let src = null; try { if (root.createImageBitmap) src = await root.createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
        let url = null; if (!src) { url = URL.createObjectURL(file); src = await loadImg(url); }
        const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight; if (!(w > 0 && h > 0)) throw new Error('image'); const side = Math.min(w, h);
        const cv = document.createElement('canvas'); cv.width = cv.height = 320; const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 320, 320); ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 320, 320);
        if (url) URL.revokeObjectURL(url); if (src.close) src.close();
        const blob = await toBlob(cv, 0.85); if (!blob) throw new Error('image');
        f.blob = blob; f.drop = false; f.avatar = URL.createObjectURL(blob); renderScreen();
      } catch (e) { toast(tr('사진을 읽지 못했어요.')); }
    }); }
  pfInput.click();
};
ACT['pf-drop'] = () => { const f = ST.pf; if (!f) return; f.avatar = ''; f.blob = null; f.drop = true; renderScreen(); };
ACT['pf-save'] = async () => {
  const f = ST.pf; if (!f || f.busy) return; const name = f.name.trim(), bio = f.bio.trim();
  if (!name) { toast(tr('닉네임을 적어 주세요.')); return; }
  f.busy = true; const btn = $('#cm-pf-save'); if (btn) { btn.disabled = true; btn.textContent = tr('저장하는 중…'); }
  try {
    const A = ACC();
    if (ST.me && name !== ST.me.name) { if (A.setName) await A.setName(name); else await api('PATCH', '/me', { name }); }
    if (f.blob) { const r = await fetch(A.base + '/community/profile/avatar', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + ((A.session && A.session.token) || '') }, body: f.blob }); if (!r.ok) { let j = null; try { j = await r.json(); } catch (e) { j = null; } throw Object.assign(new Error('avatar'), { code: (j && j.error) || 'http_' + r.status, status: r.status, message: (j && j.message) || '' }); } }
    else if (f.drop) await api('DELETE', '/community/profile/avatar');
    ST.me = await api('PUT', '/community/profile', { bio });
    ST.pf = null; popScreen(); paintHead(); toast(tr('프로필을 저장했어요.'));
    if (ST.post) { try { ST.post = await api('GET', '/community/posts/' + ST.post.id); const top = ST.stack[ST.stack.length - 1]; if (top && top.name === 'post') renderScreen(); } catch (e) { /* ignore */ } }
    loadList(); if (H.onProfile) H.onProfile(ST.me);
  } catch (e) { f.busy = false; if (btn) { btn.disabled = false; btn.textContent = tr('저장'); } toast(errText(e)); }
};

// ---------- 글쓰기 ----------
const newDraft = (board) => ({ id: null, board: board || 'free', region: '', sub: '', title: '', body: '', html: '', photos: [], attach: null, when: { start: '', end: '' }, busy: false, sig: '' });
const draftSig = (d) => JSON.stringify([d.board, d.region, d.sub, d.title, d.body, d.html, d.photos.map(x => x.id || x.key), d.attach ? [d.attach.kind, d.attach.title || (d.attach.doc && d.attach.doc.id)] : null, d.when]);
const draftDirty = () => !!ST.draft && !ST.draft.busy && draftSig(ST.draft) !== ST.draft.sig;
async function askLeave() {
  const ok = await H.askConfirm(tr('쓰던 글을 버릴까요?'), tr('지금 나가면 쓰던 내용이 사라져요.'), tr('버리기'), true); lock();
  if (ok) { ST.draft = null; popScreen(); }
}
ACT.write = () => needWriter(() => {
  const d = newDraft(ST.board || 'free'); if (ST.region && !ST.mine) { d.region = ST.region; d.sub = ST.sub; } d.sig = draftSig(d); ST.draft = d; show('write');
});
ACT['post-edit'] = () => {
  const p = ST.post; if (!p) return; closeSheet();
  const d = newDraft(p.board); Object.assign(d, { id: p.id, region: p.region, sub: p.sub, title: p.title, body: p.body || '', html: p.bodyHtml ? cleanHtml(p.bodyHtml, (n) => { const x = (p.photos || []).find(y => y.id === n.getAttribute('data-photo')); return x ? `<img class="cm-ed-photo" data-key="${esc(x.id)}" src="${esc(x.url)}" alt=""${imgAttrs(n)}>` : ''; }) : textToHtml(p.body || ''), photos: (p.photos || []).map(x => ({ id: x.id, key: x.id, url: x.url, state: 'done' })), attach: p.attach || null, when: p.when ? { start: p.when.start, end: p.when.end } : { start: '', end: '' } });
  d.sig = draftSig(d); ST.draft = d; show('write');
};
function subOptions(d) {
  const r = regionOf(d.region); const subs = r ? r.subs.map(cc => [cc, cname(cc)]).sort((a, b) => a[1].localeCompare(b[1], LOCALE())) : [];
  return `<option value="">${esc(tr('나라 고르기(안 골라도 돼요)'))}</option>` + subs.map(([cc, n]) => `<option value="${cc}" ${d.sub === cc ? 'selected' : ''}>${esc(n)}</option>`).join('');
}
function photosHtml(d) {
  const max = limit('photos', 6);
  return d.photos.map((x, i) => `<div class="cm-ph ${x.state}"><img src="${esc(x.local || x.url)}" alt=""><button type="button" data-act="ph-del" data-i="${i}" aria-label="${esc(tr('사진 빼기'))}">${IC.close}</button>${x.state === 'up' ? '<i></i>' : ''}${x.state === 'fail' ? `<b>${esc(tr('실패'))}</b>` : ''}</div>`).join('')
    + (d.photos.length < max ? `<button type="button" class="cm-ph add" data-act="ph-add" aria-label="${esc(tr('사진 넣기'))}">${IC.photo}<span>${d.photos.length}/${max}</span></button>` : '');
}
function attachHtml(d) {
  if (d.attach) {
    const a = d.attach; const title = a.kind === 'plan' ? (a.doc && a.doc.title) : a.title; const sub = a.kind === 'plan' ? tr('{n}곳', { n: ((a.doc && a.doc.items) || []).filter(x => x.kind !== 'note').length }) : (a.places || []).slice(0, 4).join(', ');
    return `<div class="cm-attsel">${a.kind === 'plan' ? IC.plan : IC.record}<div><b>${esc(title || '')}</b><span>${esc([a.kind === 'plan' ? tr('여행 일정') : tr('여행 기록'), sub].filter(Boolean).join(' · '))}</span></div><button type="button" data-act="att-del" aria-label="${esc(tr('붙인 것 빼기'))}">${IC.close}</button></div>${a.kind === 'plan' ? `<details class="cm-plan-prev" open><summary>${esc(tr('올라가는 일정 보기'))}</summary>${planDays(a.doc)}</details>` : ''}`;
  }
  return `<div class="cm-attbtns"><button type="button" class="chip" data-act="att-plan">${IC.plan}${esc(tr('여행 일정 붙이기'))}</button></div>`;
}
// 글쓰기 화면: 위(게시판·지역·날짜) · 본문(제목 · 서식 줄 · 본문 · 사진) · 붙이기. 넓은 화면(PC)에서는 본문이 왼쪽, 나머지가 오른쪽 기둥으로 간다(community.css).
const ED_TOOLS = [['bold', '굵게', '<b>B</b>'], ['italic', '기울임', '<i>I</i>'], ['underline', '밑줄', '<u>U</u>'], ['strikeThrough', '취소선', '<s>S</s>'], ['|'],
  ['h2', '제목|ed', svg('<path d="M5 5v14M13 5v14M5 12h8M17 10.500l2.500-1.500v10"/>')], ['ul', '목록', svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="18" r="1"/>')],
  ['ol', '번호 목록', svg('<path d="M10 6h10M10 12h10M10 18h10M4 4.500l1.500-.500v4M3.800 14.500c1-1.200 2.700-.800 2.700.400 0 1-1.500 1.700-2.700 3.100h2.900"/>')], ['quote', '인용', svg('<path d="M6 17c2-1 3-3 3-6V7H5v5h3M15 17c2-1 3-3 3-6V7h-4v5h3"/>')],
  ['center', '가운데 정렬', svg('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>')], ['|'],
  ['table', '표', svg('<rect x="3.500" y="5" width="17" height="14" rx="2"/><path d="M3.500 10h17M3.500 14.500h17M9.500 5v14M15 5v14"/>')], ['hr', '구분선', svg('<path d="M4 12h16"/><path d="M8 7h8M8 17h8" opacity=".35"/>')], ['photo', '사진 넣기', IC.photo]];
const ED = { range: null, pick: null };   // range: 본문에서 마지막으로 있던 자리(서식 단추를 눌러도 잃지 않게), pick: 고른 사진
const edEl = () => $('#cm-w-body');
const edTop = (n) => { const ed = edEl(); while (n && n.parentNode !== ed) n = n.parentNode; return n; };   // 본문 바로 아래의 덩어리(문단·표·사진)
const edInside = (n) => { const ed = edEl(); return !!(ed && n && (n === ed || ed.contains(n))); };
function edSave() { const sel = root.getSelection && root.getSelection(); if (sel && sel.rangeCount && edInside(sel.anchorNode)) ED.range = sel.getRangeAt(0).cloneRange(); }
function edRestore() {
  const ed = edEl(); if (!ed) return; ed.focus({ preventScroll: true }); const sel = root.getSelection(); if (!sel) return;
  if (ED.range && edInside(ED.range.startContainer)) { sel.removeAllRanges(); sel.addRange(ED.range); }
  else { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
}
const edNode = () => { const sel = root.getSelection(); let n = sel && sel.rangeCount ? sel.anchorNode : null; if (n && n.nodeType === 3) n = n.parentNode; return edInside(n) ? n : null; };
const edUp = (tags) => { let n = edNode(); const ed = edEl(); while (n && n !== ed) { if (tags.indexOf(n.tagName) >= 0) return n; n = n.parentNode; } return null; };
function edCaretIn(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(true); const sel = root.getSelection(); sel.removeAllRanges(); sel.addRange(r); edSave(); }
/** 본문 맨 위 층에 덩어리(표·사진·구분선)를 넣는다: 지금 있는 덩어리 바로 아래. 뒤에 글 쓸 줄이 없으면 하나 만든다 */
function edInsertBlock(node) {
  const ed = edEl(); const cur = edTop(edNode()); if (cur && cur !== ed) { if (cur.tagName === 'P' && !cur.textContent.trim() && !cur.querySelector('img')) ed.replaceChild(node, cur); else ed.insertBefore(node, cur.nextSibling); } else ed.appendChild(node);
  let nx = node.nextElementSibling; if (!nx || nx.tagName !== 'P') { nx = document.createElement('p'); nx.innerHTML = '<br>'; ed.insertBefore(nx, node.nextSibling); }
  return nx;
}
function edSync() {   // 본문 → 초안(html · 글자)
  const d = ST.draft, ed = edEl(); if (!d || !ed) return; d.html = ed.innerHTML; d.body = (ed.innerText || '').replace(/ /g, ' ').trim();
  ed.classList.toggle('empty', !d.body && !ed.querySelector('img,table,hr,li'));
  const n = $('#cm-w-count'); if (n) { const max = limit('body', 5000); n.textContent = d.body.length + '/' + max; n.classList.toggle('over', d.body.length > max); }
}
function edCtx() {   // 표 안이면 표 도구, 사진을 골랐으면 사진 도구
  const box = $('#cm-ed-ctx'); if (!box) return; const ed = edEl();
  $$('.cm-ed-photo.on', ed).forEach(x => x.classList.remove('on'));
  const b = (c, name, body) => `<button type="button" data-act="ed" data-c="${c}" aria-label="${esc(tr(name))}">${body || esc(tr(name))}</button>`;
  if (ED.pick && ed.contains(ED.pick)) {
    ED.pick.classList.add('on'); const w = ED.pick.getAttribute('data-w') || 'l', a = ED.pick.getAttribute('data-a') || 'c'; const on = (x, y) => (x === y ? ' class="on"' : '');
    box.innerHTML = `<span class="cm-ed-ctxk">${esc(tr('사진'))}</span>${b('ph-up', '위로', svg('<path d="M12 19V5M6 11l6-6 6 6"/>'))}${b('ph-down', '아래로', svg('<path d="M12 5v14M6 13l6 6 6-6"/>'))}<i></i>`
      + [['s', '작게'], ['m', '중간'], ['l', '크게']].map(([k, n]) => `<button type="button" data-act="ed" data-c="ph-w" data-v="${k}"${on(w, k)}>${esc(tr(n))}</button>`).join('') + '<i></i>'
      + [['l', '왼쪽'], ['c', '가운데'], ['r', '오른쪽']].map(([k, n]) => `<button type="button" data-act="ed" data-c="ph-a" data-v="${k}"${on(a, k)}>${esc(tr(n))}</button>`).join('') + '<i></i>' + b('ph-out', '본문에서 빼기');
    box.hidden = false; return;
  }
  ED.pick = null;
  if (edUp(['TD', 'TH'])) { box.innerHTML = `<span class="cm-ed-ctxk">${esc(tr('표'))}</span>${b('row+', '줄 추가')}${b('col+', '칸 추가')}${b('row-', '줄 지우기')}${b('col-', '칸 지우기')}<i></i>${b('table-', '표 지우기')}`; box.hidden = false; return; }
  box.hidden = true; box.innerHTML = '';
}
function edCmd(c, v) {
  const ed = edEl(); if (!ed) return; const X = (name, arg) => { try { document.execCommand(name, false, arg); } catch (e) { /* ignore */ } };
  if (c.slice(0, 3) === 'ph-') {   // 고른 사진: 자리 · 크기 · 정렬
    const im = ED.pick; if (!im || !ed.contains(im)) return;
    if (c === 'ph-up') { const pv = im.previousElementSibling; if (pv) ed.insertBefore(im, pv); }
    else if (c === 'ph-down') { const nx = im.nextElementSibling; if (nx) ed.insertBefore(im, nx.nextSibling); }
    else if (c === 'ph-w') { if (v === 'l') im.removeAttribute('data-w'); else im.setAttribute('data-w', v); }
    else if (c === 'ph-a') { if (v === 'c') im.removeAttribute('data-a'); else im.setAttribute('data-a', v); }
    else if (c === 'ph-out') { im.remove(); ED.pick = null; }
    if (ED.pick && ED.pick.scrollIntoView) ED.pick.scrollIntoView({ block: 'nearest' });
    edSync(); edCtx(); return;
  }
  edRestore();
  if (c === 'bold' || c === 'italic' || c === 'underline' || c === 'strikeThrough') X(c);
  else if (c === 'ul') X('insertUnorderedList'); else if (c === 'ol') X('insertOrderedList');
  else if (c === 'h2') X('formatBlock', edUp(['H2']) ? 'p' : 'h2');
  else if (c === 'quote') X('formatBlock', edUp(['BLOCKQUOTE']) ? 'p' : 'blockquote');
  else if (c === 'center') { const b = edUp(['P', 'H2', 'H3']) || (X('formatBlock', 'p'), edUp(['P'])); if (b) { if (b.getAttribute('data-a') === 'c') b.removeAttribute('data-a'); else b.setAttribute('data-a', 'c'); } }
  else if (c === 'hr') { const nx = edInsertBlock(document.createElement('hr')); edCaretIn(nx); }
  else if (c === 'table') {
    if (edUp(['TABLE'])) { toast(tr('표 안에는 표를 넣을 수 없어요.')); return; }
    const t = document.createElement('table'); t.innerHTML = '<tbody>' + '<tr><th><br></th><th><br></th><th><br></th></tr>' + '<tr><td><br></td><td><br></td><td><br></td></tr>'.repeat(2) + '</tbody>';
    edInsertBlock(t); edCaretIn(t.querySelector('th'));
  } else if (c === 'photo') { ACT['ph-add'](); return; }
  else {   // 표 도구
    const cell = edUp(['TD', 'TH']); const tr0 = cell && cell.parentNode; const table = cell && cell.closest('table'); if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr')); const ci = Array.prototype.indexOf.call(tr0.children, cell);
    if (c === 'row+') { if (rows.length >= 30) return; const nr = document.createElement('tr'); nr.innerHTML = '<td><br></td>'.repeat(tr0.children.length); tr0.parentNode.insertBefore(nr, tr0.nextSibling); edCaretIn(nr.children[Math.min(ci, nr.children.length - 1)]); }
    else if (c === 'col+') { if (tr0.children.length >= 8) return; for (const r of rows) { const nc = document.createElement(r.children[0] && r.children[0].tagName === 'TH' ? 'th' : 'td'); nc.innerHTML = '<br>'; r.insertBefore(nc, r.children[ci] ? r.children[ci].nextSibling : null); } }
    else if (c === 'row-') { if (rows.length <= 1) table.remove(); else { const to = tr0.nextElementSibling || tr0.previousElementSibling; tr0.remove(); if (to && to.children[0]) edCaretIn(to.children[Math.min(ci, to.children.length - 1)]); } }
    else if (c === 'col-') { if (tr0.children.length <= 1) table.remove(); else { for (const r of rows) if (r.children[ci]) r.children[ci].remove(); edCaretIn(tr0.children[Math.min(ci, tr0.children.length - 1)]); } }
    else if (c === 'table-') table.remove();
  }
  edSave(); edSync(); edCtx(); edMarks();
}
function edMarks() {   // 서식 단추에 지금 상태를 표시
  const st = (n) => { try { return document.queryCommandState(n); } catch (e) { return false; } };
  const on = { bold: st('bold'), italic: st('italic'), underline: st('underline'), strikeThrough: st('strikeThrough'), ul: !!edUp(['UL']), ol: !!edUp(['OL']), h2: !!edUp(['H2']), quote: !!edUp(['BLOCKQUOTE']), center: (edUp(['P', 'H2', 'H3']) || { getAttribute: () => '' }).getAttribute('data-a') === 'c' };
  $$('#cm-ed-bar button').forEach(b => b.classList.toggle('on', !!on[b.dataset.c]));
}
ACT.ed = (v) => edCmd(v.c, v.v);
/** 올린 사진을 본문에 넣는다(지금 글 쓰던 자리 아래) */
function edAddPhoto(item) {
  const ed = edEl(); if (!ed || !item) return; if (ed.querySelector(`img[data-key="${item.key}"]`)) return;
  edRestore(); const im = document.createElement('img'); im.className = 'cm-ed-photo'; im.setAttribute('data-key', item.key); im.alt = ''; im.src = item.local || item.url || '';
  const nx = edInsertBlock(im); edCaretIn(nx); edSync();
}
/** 보낼 본문: 허용한 것만 남기고, 사진은 올라간 것만 <img data-photo="id"> 로 */
function edOut(d) {
  return cleanHtml(d.html, (n) => { const x = d.photos.find(y => y.key === n.getAttribute('data-key')); return x && x.state === 'done' && x.id ? `<img data-photo="${esc(x.id)}"${imgAttrs(n)}>` : ''; });
}
SCREENS.write = () => {
  const d = ST.draft; if (!d) return { title: '', html: '' };
  const tools = ED_TOOLS.map(([c, name, body]) => (c === '|' ? '<i></i>' : `<button type="button" data-act="ed" data-c="${c}" aria-label="${esc(tr(name))}" title="${esc(tr(name))}">${body}</button>`)).join('');
  const html = `<div class="cm-write">
    <div class="cm-w-meta">
    <div class="cm-flabel">${esc(tr('게시판'))}</div><div class="cm-chips" id="cm-w-board">${BOARDS.map(([k, n]) => `<button type="button" class="chip ${d.board === k ? 'active' : ''}" data-act="w-board" data-v="${k}" ${d.id ? 'disabled' : ''}>${esc(tr(n))}</button>`).join('')}</div>
    <p class="cm-boardhint" id="cm-w-hint">${esc(tr(BOARD_HINT[d.board]))}</p>
    <div class="cm-flabel" id="cm-w-rlabel">${esc(d.board === 'brag' ? tr('지역') : tr('지역(안 골라도 돼요)'))}</div>
    <div class="cm-chips small" id="cm-w-region">${regions().map(r => `<button type="button" class="chip ${d.region === r.id ? 'active' : ''}" data-act="w-region" data-v="${r.id}">${esc(rname(r.id))}</button>`).join('')}</div>
    <div class="field" id="cm-w-subbox" ${d.region && (regionOf(d.region) || { subs: [] }).subs.length ? '' : 'hidden'}><select id="cm-w-sub">${subOptions(d)}</select></div>
    <div id="cm-w-whenbox" ${d.board === 'mate' ? '' : 'hidden'}><div class="cm-flabel">${esc(tr('여행 날짜(정해졌으면)'))}</div><div class="cm-dates"><div class="field"><input id="cm-w-d1" type="date" value="${esc(d.when.start)}" aria-label="${esc(tr('가는 날'))}"></div><div class="field"><input id="cm-w-d2" type="date" value="${esc(d.when.end)}" aria-label="${esc(tr('오는 날'))}"></div></div></div>
    </div>
    <div class="cm-w-main">
    <input id="cm-w-title" class="cm-w-title" maxlength="${limit('title', 60)}" autocomplete="off" placeholder="${esc(tr('제목'))}" value="${esc(d.title)}">
    <div class="cm-ed-box"><div class="cm-ed-bar" id="cm-ed-bar" role="toolbar" aria-label="${esc(tr('글 꾸미기'))}">${tools}</div>
    <div class="cm-ed-ctx" id="cm-ed-ctx" hidden></div>
    <div id="cm-w-body" class="cm-ed cm-body rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${esc(tr('내용'))}" data-ph="${esc(tr('내용을 적어 주세요'))}">${d.html || '<p><br></p>'}</div>
    <div class="cm-ed-foot"><span>${esc(tr('사진을 누르면 자리와 크기를 바꿀 수 있어요.'))}</span><b id="cm-w-count"></b></div></div>
    <div class="cm-flabel">${esc(tr('사진'))}</div><div class="cm-phs" id="cm-w-photos">${photosHtml(d)}</div>
    </div>
    <div class="cm-w-extra">
    <div class="cm-flabel">${esc(tr('붙이기'))}</div><div id="cm-w-attach">${attachHtml(d)}</div>
    <p class="caption">${esc(tr('사진의 위치 정보는 올리기 전에 지워져요. 여행 기록은 제목과 들른 곳 이름만 올라가요.'))}</p></div></div>`;
  return { title: d.id ? tr('글 고치기') : tr('글쓰기'), html, bar: `<button type="button" class="btn primary" id="cm-w-submit" data-act="w-submit">${esc(d.id ? tr('고쳐서 올리기') : tr('올리기'))}</button>`,
    after: () => {
      const on = (id, ev, f) => { const el = $(id); if (el) el.addEventListener(ev, (e) => f(el, e)); };
      on('#cm-w-title', 'input', (el) => { d.title = el.value; });
      on('#cm-w-sub', 'change', (el) => { d.sub = el.value; }); on('#cm-w-d1', 'change', (el) => { d.when.start = el.value; }); on('#cm-w-d2', 'change', (el) => { d.when.end = el.value; });
      for (const sel of ['#cm-w-board .chip.active', '#cm-w-region .chip.active']) { const c = $(sel); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      // 본문(서식 편집기)
      ED.range = null; ED.pick = null; try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignore */ }
      const ed = edEl(); if (!ed) return;
      const track = () => { edSave(); edMarks(); if (ED.pick && root.getSelection && !root.getSelection().isCollapsed) ED.pick = null; edCtx(); };
      ed.addEventListener('input', () => { if (!ed.firstChild) ed.innerHTML = '<p><br></p>'; edSync(); track(); });
      ed.addEventListener('keyup', track); ed.addEventListener('mouseup', track); ed.addEventListener('focus', track); ed.addEventListener('blur', edSave);
      ed.addEventListener('click', (e) => { const t = e.target; ED.pick = t && t.tagName === 'IMG' ? t : null; edCtx(); edMarks(); });
      ed.addEventListener('paste', (e) => {   // 붙여 넣기는 글자만(다른 곳의 서식·그림을 들이지 않는다)
        const t = e.clipboardData && e.clipboardData.getData('text/plain'); if (t == null) return; e.preventDefault();
        try { document.execCommand('insertText', false, t); } catch (x) { /* ignore */ }
      });
      ed.addEventListener('drop', (e) => e.preventDefault());
      // 서식 단추를 눌러도 본문의 선택이 풀리지 않게
      for (const id of ['#cm-ed-bar', '#cm-ed-ctx']) { const b = $(id); if (b) b.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); }); }
      edSync();
    } };
};
ACT['w-board'] = (v, el) => {
  const d = ST.draft; if (!d || d.id) return; d.board = v.v; $$('#cm-w-board .chip').forEach(c => c.classList.toggle('active', c === el));
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('#cm-w-hint').textContent = tr(BOARD_HINT[d.board]); $('#cm-w-rlabel').textContent = d.board === 'brag' ? tr('지역') : tr('지역(안 골라도 돼요)'); $('#cm-w-whenbox').hidden = d.board !== 'mate';
};
ACT['w-region'] = (v, el) => {
  const d = ST.draft; if (!d) return; d.region = d.region === v.v ? '' : v.v; d.sub = '';
  $$('#cm-w-region .chip').forEach(c => c.classList.toggle('active', c === el && !!d.region));
  const box = $('#cm-w-subbox'); const subs = d.region ? (regionOf(d.region) || { subs: [] }).subs : []; box.hidden = !subs.length; $('#cm-w-sub').innerHTML = subOptions(d);
};
const paintPhotos = () => { const b = $('#cm-w-photos'); if (b && ST.draft) b.innerHTML = photosHtml(ST.draft); };
const paintAttach = () => { const b = $('#cm-w-attach'); if (b && ST.draft) b.innerHTML = attachHtml(ST.draft); };
// 사진: 고른 파일을 캔버스에 다시 그려 긴 변 1600px JPEG 로 만든다(위치 정보 같은 EXIF 가 빠진다) → 바로 서버에 올려 둔다
const loadImg = (url) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image')); im.src = url; });
const toBlob = (cv, q) => new Promise((res) => cv.toBlob(res, 'image/jpeg', q));
async function toJpeg(file) {
  let src = null; try { if (root.createImageBitmap) src = await root.createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
  let url = null; if (!src) { url = URL.createObjectURL(file); src = await loadImg(url); }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight; if (!(w > 0 && h > 0)) throw new Error('image');
  const k = Math.min(1, 1600 / Math.max(w, h)); const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(src, 0, 0, cv.width, cv.height);
  if (url) URL.revokeObjectURL(url); if (src.close) src.close();
  let q = 0.82, blob = await toBlob(cv, q); const max = limit('photoBytes', 2097152);
  while (blob && blob.size > max && q > 0.45) { q -= 0.12; blob = await toBlob(cv, q); }
  if (!blob || blob.size > max) throw Object.assign(new Error('too large'), { code: 'too_large' });
  // 목록용 작은 사진(긴 변 640px): 목록에서 원본(1600px)을 받지 않게 함께 올린다. 못 만들면 없이 간다(목록도 원본을 쓴다).
  let small = null;
  try {
    const k2 = Math.min(1, 640 / Math.max(cv.width, cv.height)); const c2 = document.createElement('canvas'); c2.width = Math.max(1, Math.round(cv.width * k2)); c2.height = Math.max(1, Math.round(cv.height * k2));
    c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height); small = await toBlob(c2, 0.72); if (small && small.size > 200000) small = null;
  } catch (e) { small = null; }
  blob.small = small;
  return blob;
}
async function upload(blob) {
  const A = ACC(); let r;
  try { r = await fetch(A.base + '/community/photos', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + ((A.session && A.session.token) || '') }, body: blob }); }
  catch (e) { throw Object.assign(new Error('network'), { code: 'network' }); }
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok) throw Object.assign(new Error((j && j.message) || 'HTTP ' + r.status), { code: (j && j.error) || 'http_' + r.status, status: r.status });
  if (blob.small && j && j.id) fetch(A.base + '/community/photos/' + encodeURIComponent(j.id) + '/thumb', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + ((A.session && A.session.token) || '') }, body: blob.small }).then((x) => { if (!x.ok) log('thumb failed: ' + x.status); }, () => { /* 작은 사진은 없어도 된다 */ });
  return j;
}
async function addFiles(files) {
  const d = ST.draft; if (!d) return; const room = limit('photos', 6) - d.photos.length; const list = Array.from(files || []).filter(f => /^image\//.test(f.type || 'image/')).slice(0, Math.max(0, room));
  if ((files || []).length > list.length) toast(tr('사진은 {n}장까지 넣을 수 있어요.', { n: limit('photos', 6) }));
  for (const f of list) {
    const item = { key: 'k' + Date.now() + Math.random().toString(36).slice(2, 6), state: 'up', local: '' }; d.photos.push(item);
    try { const blob = await toJpeg(f); item.local = URL.createObjectURL(blob); paintPhotos(); if (ST.draft === d) edAddPhoto(item); const j = await upload(blob); item.id = j.id; item.url = j.url; item.state = 'done'; }
    catch (e) { item.state = 'fail'; { const im = edEl() && edEl().querySelector(`img[data-key="${item.key}"]`); if (im) { im.remove(); edSync(); } } log('photo failed: ' + (e && (e.code || e.message))); toast(errText(e)); if (e && e.code === 'terms_required') { ST.me = null; } }
    if (ST.draft === d) paintPhotos();
  }
}
ACT['ph-add'] = () => {
  if (!fileInput) { fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.multiple = true; fileInput.id = 'cm-file'; fileInput.hidden = true; document.body.appendChild(fileInput); fileInput.addEventListener('change', () => { const fs = Array.from(fileInput.files || []); fileInput.value = ''; addFiles(fs); }); }
  fileInput.click();
};
ACT['ph-del'] = (v) => { const d = ST.draft; if (!d) return; const x = d.photos[+v.i]; if (x && x.local) { try { URL.revokeObjectURL(x.local); } catch (e) { /* ignore */ } } d.photos.splice(+v.i, 1); paintPhotos(); { const im = x && edEl() && edEl().querySelector(`img[data-key="${x.key}"]`); if (im) { im.remove(); if (ED.pick === im) ED.pick = null; edSync(); edCtx(); } } };
ACT['att-del'] = () => { if (ST.draft) { ST.draft.attach = null; paintAttach(); } };
ACT['att-plan'] = () => {
  const trips = (root.Planner && root.Planner.tripsBrief) ? root.Planner.tripsBrief() : [];
  sheet(`<div class="sheet-title">${esc(tr('여행 일정 붙이기'))}</div>${trips.length ? `<p class="desc">${esc(tr('일정(장소·날짜·메모)만 올라가요. 경비와 일기는 올라가지 않아요.'))}</p><ul class="rows">${trips.map(t => `<li class="row tap" data-act="att-plan-ok" data-id="${esc(t.id)}"><span class="cm-ic">${IC.plan}</span><div class="row-body"><div class="row-title">${esc(t.title || tr('이름 없는 여행'))}</div><div class="row-desc">${esc([rangeText(t.start, t.end), tr('{n}곳', { n: t.places || 0 })].filter(Boolean).join(' · '))}</div></div></li>`).join('')}</ul>`
    : `<p class="cm-hint">${esc(tr('붙일 여행이 없어요. 먼저 여행 탭에서 일정을 만들어 주세요.'))}</p>`}<button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['att-plan-ok'] = (v) => {
  const doc = root.Planner && root.Planner.docOf ? root.Planner.docOf(v.id) : null; closeSheet(); if (!doc || !ST.draft) return;
  ST.draft.attach = { kind: 'plan', doc }; paintAttach();
  const ti = $('#cm-w-title'); if (ti && !ti.value.trim()) { ti.value = doc.title || ''; ST.draft.title = ti.value; }
};
function records() {   // 사진으로 만든 여행 기록(나의 지도): 제목 · 기간 · 들른 곳 이름만 꺼낸다
  const D = H && H.DATA; if (!D || !Array.isArray(D.trips) || !Array.isArray(D.stops)) return [];
  return D.trips.slice().sort((a, b) => String(b.start).localeCompare(String(a.start))).slice(0, 60).map(t => {
    const names = []; for (const s of D.stops) if (s.trip === t.id && !s.home && s.name && !names.includes(s.name)) names.push(s.name);
    return { id: t.id, title: t.title || '', start: String(t.start || '').slice(0, 10), end: String(t.end || '').slice(0, 10), days: t.days || 0, photos: t.n || 0, places: names.slice(0, 40) };
  }).filter(r => r.title);
}
ACT['att-record'] = () => {
  const rs = records(); ST.sel = { records: rs };
  sheet(`<div class="sheet-title">${esc(tr('여행 기록 붙이기'))}</div>${rs.length ? `<p class="desc">${esc(tr('제목, 기간, 들른 곳 이름만 올라가요. 사진과 정확한 위치는 올라가지 않아요.'))}</p><ul class="rows">${rs.map((r, i) => `<li class="row tap" data-act="att-record-ok" data-i="${i}"><span class="cm-ic">${IC.record}</span><div class="row-body"><div class="row-title">${esc(r.title)}</div><div class="row-desc">${esc([rangeText(r.start, r.end), tr('사진 {n}장', { n: r.photos })].filter(Boolean).join(' · '))}</div></div></li>`).join('')}</ul>`
    : `<p class="cm-hint">${esc(tr('아직 여행 기록이 없어요. 위치가 담긴 사진이 쌓이면 나의 지도에 기록이 생겨요.'))}</p>`}<button type="button" class="btn secondary" data-act="sheet-close">${esc(tr('닫기'))}</button>`);
};
ACT['att-record-ok'] = (v) => {
  const r = ST.sel && ST.sel.records && ST.sel.records[+v.i]; closeSheet(); if (!r || !ST.draft) return;
  ST.draft.attach = { kind: 'record', title: r.title, start: r.start, end: r.end, days: r.days, photos: r.photos, places: r.places }; paintAttach();
  const ti = $('#cm-w-title'); if (ti && !ti.value.trim()) { ti.value = r.title; ST.draft.title = ti.value; }
};
ACT['w-submit'] = async () => {
  const d = ST.draft; if (!d || d.busy) return;
  edSync(); const title = d.title.trim(), body = d.body.trim();
  if (!title) { toast(tr('제목을 적어 주세요.')); const ti = $('#cm-w-title'); if (ti) ti.focus(); return; }
  if (d.board === 'brag' && !d.region) { toast(tr('지역을 골라 주세요.')); return; }
  if (d.board === 'plan' && !(d.attach && d.attach.kind === 'plan')) { toast(tr('나눌 여행 일정을 붙여 주세요.')); return; }
  if (d.photos.some(x => x.state === 'up')) { toast(tr('사진을 올리는 중이에요. 잠시만 기다려 주세요.')); return; }
  const photos = d.photos.filter(x => x.state === 'done' && x.id).map(x => x.id);
  if (!body && !photos.length && !d.attach) { toast(tr('내용을 적어 주세요.')); return; }
  if (body.length > limit('body', 5000)) { toast(tr('글이 너무 길어요. {n}자까지 쓸 수 있어요.', { n: limit('body', 5000) })); return; }
  const payload = { board: d.board, title, body, bodyHtml: edOut(d), region: d.region, sub: d.sub, photos, attach: d.attach, when: d.board === 'mate' && d.when.start ? d.when : null, lang: LANG() };
  d.busy = true; const btn = $('#cm-w-submit'); if (btn) { btn.disabled = true; btn.textContent = tr('올리는 중…'); }
  try {
    const j = d.id ? await api('PUT', '/community/posts/' + d.id, payload) : await api('POST', '/community/posts', payload);
    ST.post = j.post; ST.draft = null; if (ST.me && j.points) ST.me.points = j.points.total;
    ST.stack.pop(); if (d.id) { ST.stack.pop(); } ST.stack.push({ name: 'post', p: { id: j.post.id } }); renderScreen();
    if (!ST.mine && ST.board && ST.board !== j.post.board) { ST.board = j.post.board; ST.region = ''; ST.sub = ''; } renderPage(); loadList();
    toast(d.id ? tr('글을 고쳤어요.') : (j.points && j.points.earned > 0 ? tr('글을 올렸어요. 포인트 +{n}', { n: j.points.earned }) : tr('글을 올렸어요.')));
  } catch (e) {
    d.busy = false; if (btn) { btn.disabled = false; btn.textContent = d.id ? tr('고쳐서 올리기') : tr('올리기'); }
    if (e && e.code === 'terms_required') { ST.me = null; needWriter(() => ACT['w-submit']()); return; }
    if (e && e.status === 401) { loginSheet(() => ACT['w-submit']()); return; }
    toast(errText(e));
  }
};

// ---------- 시작 ----------
function bind() {
  if (bound) return; bound = true;
  document.addEventListener('click', (e) => {
    const scope = e.target.closest('#cm-page, #cm-screen, #cm-sheet'); if (!scope) return;
    if (e.target.id === 'cm-sheet-dim') { closeSheet(); return; }
    const el = e.target.closest('[data-act]'); if (!el || !scope.contains(el) || el.disabled) return;
    const f = ACT[el.dataset.act]; if (f) { e.preventDefault(); f(el.dataset, el, e); }
  });
  document.addEventListener('error', (e) => { const el = e.target; if (el && el.tagName === 'IMG' && el.closest && el.closest('#cm-page, #cm-screen')) el.classList.add('fail'); }, true);
  if (!root.Planner && root.visualViewport) {   // 키보드가 올라오면 보이는 영역에 맞춘다(여행 탭이 있으면 거기서 같은 일을 한다: html.pl-kb, --pl-vt, --pl-vh)
    const vv = root.visualViewport; const fit = () => { const de = document.documentElement; const kb = Math.round(root.innerHeight - vv.height - vv.offsetTop);
      if (kb > 80) { de.style.setProperty('--pl-vt', Math.max(0, Math.round(vv.offsetTop)) + 'px'); de.style.setProperty('--pl-vh', Math.round(vv.height) + 'px'); de.classList.add('pl-kb'); } else if (de.classList.contains('pl-kb')) { de.classList.remove('pl-kb'); de.style.removeProperty('--pl-vt'); de.style.removeProperty('--pl-vh'); } };
    vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit);
  }
  if (ACC() && ACC().onChange) ACC().onChange(() => { ST.me = null; if (!authed()) ST.mine = false; if (shown()) { loadMe(); renderPage(); } });
}
const shown = () => { const pg = $('#cm-page'); return !!(pg && pg.closest('.page') && !pg.closest('.page').hidden); };
const Community = {
  init(host) { H = host; bind(); },
  /** 커뮤니티 탭이 보일 때(app.js showTab) */
  async show() {
    renderPage(); if (!ACC() || !ACC().base) return;
    const fresh = ST.list.state === 'done' && Date.now() - ST.list.at < 60000;
    if (!ST.meta) { await loadMeta(); renderPage(); } else loadMeta();
    if (!fresh) loadList(); else paintList();
    if (authed()) { await loadMe(); attend(); }
  },
  /** 뒤로가기(안드로이드 시스템 버튼 포함). 닫을 것이 있어 처리했으면 true */
  back,
  /** 글 하나를 바로 연다(공유 링크 등) */
  openPost(id) { if (+id > 0) show('post', { id: +id }); },
  /** 다른 화면(설정 탭의 내 정보 등)에서 쓰는 창구: 지금 아는 포인트 합계(모르면 null) · 포인트 시트 열기 */
  points() { return ST.me ? (ST.me.points || 0) : null; },
  openPoints() { ACT.points(); },
  /** 프로필 설정 화면(프로필 사진 · 닉네임 · 소개) — 웹의 계정 메뉴에서도 연다 */
  openProfile() { ACT['profile-edit'](); },
  /** 다른 화면에서 글쓰기를 연다(여행 탭의 일기를 게시판에 공유): 제목·본문·사진을 채운 글쓰기 화면. 사진은 여기서 다시 줄여 올리고, '올리기'를 눌러야 공개된다 */
  compose(o) {
    o = o || {};
    needWriter(() => {
      const d = newDraft(BOARDS.some(b => b[0] === o.board) ? o.board : 'free'); d.title = String(o.title || '').slice(0, limit('title', 60)); d.body = String(o.body || '').slice(0, limit('body', 5000)); d.html = d.body ? textToHtml(d.body) : '';
      d.sig = draftSig(newDraft(d.board)); ST.draft = d; show('write');   // 빈 글과 견줘 '쓰던 글'로 본다(나갈 때 물어본다)
      if (o.files && o.files.length) addFiles(o.files);
    });
  },
  get busy() { return ST.stack.length > 0; },
  _debug: { ST, closeScreens, renderPage, loadList, records, toJpeg, get host() { return H; } },   // 헤드리스 시험용
};
root.Community = Community;
})(typeof self !== 'undefined' ? self : globalThis);
