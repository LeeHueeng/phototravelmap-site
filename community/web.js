/* web.js — 여행여권 웹 커뮤니티의 호스트(웹 버전). 원본은 webver/web.js, 사이트의 community/web.js 는 scripts/build_web_community.py 가 복사한 것이다.
   커뮤니티 화면은 앱과 같은 파일(community.js)이 그린다. 앱에서는 app.js · account.js · i18n.js 가 해 주던 일을 여기서 브라우저에 맞게 맡는다:
   - window.I18N    한국어 원문이 키인 번역(ko · en · ja). 사전은 조립할 때 앱의 i18n.js 와 webver/l10n.json 에서 뽑아 data.js 에 넣는다.
   - window.Account 로그인 상태와 서버 호출. 로그인은 서버 중계다: ${서버}/auth/<제공자>/start?web=1&next=<이 페이지>&state=… 로 떠났다가
                    돌아온 주소의 1회용 코드(#code=…&state=…)를 POST /auth/exchange 로 세션 토큰과 바꿔 localStorage 에 둔다(앱과 같은 계정).
                    세션 토큰은 주소에 실리지 않는다. 로그아웃하면 서버의 세션도 지운다(POST /auth/logout).
   - Community.init(host)  tr · askConfirm · shareText · login · api · setBusy
   - 웹에만 있는 것: 머리 줄의 계정 버튼(로그인 · 닉네임 · 로그아웃 · 탈퇴), 브라우저 뒤로가기, 글 주소(…/community/post/번호 — 서버가 그려 주는
                    검색용 글 페이지와 같은 주소)와 공유 버튼, 앱에서만 되는 일(여행 일정 붙이기) 안내.
   - 내 여행(…/trips/, 11-20): 같은 파일이 여행 페이지의 호스트도 맡는다(<body data-wv-page="trips">). 여행 화면은 앱과 같은 파일(planner.js 등)이 그리고,
                    기록은 이 브라우저(IndexedDB)에 두었다가 로그인하면 서버(/trips)와 맞춘다 — 폰의 앱과 같은 여행을 보고 고친다.
                    서버는 로그인 뒤 …/community/ 로만 돌려보내므로, 여행 페이지에서 시작한 로그인은 커뮤니티 페이지가 코드를 바꾼 뒤 여행 페이지로 넘겨 준다.
   화면 문구를 넣으면 webver/l10n.json 에도 넣는다(조립 스크립트가 빠진 문구를 알려 준다). 한국어 문구는 작은따옴표 문자열로만 적는다. */
(function (root) {
'use strict';
const CFG = root.WV_DATA || {};
// 이 페이지가 놓인 폴더(…/community/). 글을 열면 주소가 …/community/post/번호 로 바뀌므로, 상대 주소(../terms.html 등)가 늘 이 폴더 기준으로 풀리게 <base> 를 둔다
const ROOT = location.pathname.replace(/[^/]*$/, '');
const PAGE = document.body && document.body.getAttribute('data-wv-page') === 'trips' ? 'trips' : 'comm';   // 이 페이지: 커뮤니티 | 내 여행
const COMM = PAGE === 'trips' ? ROOT.replace(/[^/]+\/$/, '') + 'community/' : ROOT, TRIPS = PAGE === 'trips' ? ROOT : ROOT.replace(/[^/]+\/$/, '') + 'trips/';   // 두 페이지의 폴더(나란히 놓여 있다)
(function () { const b = document.createElement('base'); b.href = location.origin + ROOT; document.head.insertBefore(b, document.head.firstChild); })();
const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);   // 개발용 주소에서 열었는지
const QS = new URLSearchParams(location.search);
const JOIN = /^[A-Za-z0-9_-]{4,64}$/.test(QS.get('join') || '') ? QS.get('join') : '';   // 여행 초대 코드(…/trips/?join=코드)
// 저장소가 막힌 브라우저(사이트 데이터 차단)에서는 건드리기만 해도 오류가 난다 → 없는 것으로 다룬다
const store = (name) => { try { return root[name] || null; } catch (e) { return null; } };
const LS = store('localStorage'), SS = store('sessionStorage');
const get = (st, k) => { try { return st ? st.getItem(k) : null; } catch (e) { return null; } };
const put = (st, k, v) => { try { if (!st) return false; if (v == null) st.removeItem(k); else st.setItem(k, v); return true; } catch (e) { return false; } };

// ---------- 번역(앱의 i18n.js 와 같은 규칙: {k} 치환, {k:하나|여럿}, 키 끝의 |문맥 은 떼어낸다) ----------
const LANGS = ['ko', 'en', 'ja'], LOCALES = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }, LANG_KEY = 'photo-map-lang';
const langOf = (l) => { const p = String(l || '').toLowerCase().split(/[-_]/)[0]; return LANGS.indexOf(p) >= 0 ? p : null; };
function detectLang() {   // 아래 줄의 언어 링크(?lang=en)로 고른 것 → 지난번에 고른 것 → 브라우저 언어 가운데 처음 나오는 지원 언어 → 한국어
  const picked = langOf(QS.get('lang')); if (picked) { put(LS, LANG_KEY, picked); return picked; }
  const saved = langOf(get(LS, LANG_KEY)); if (saved) return saved;
  const nav = root.navigator || {}; const list = nav.languages && nav.languages.length ? Array.from(nav.languages) : [nav.language];
  for (const l of list) { const n = langOf(l); if (n) return n; }
  return 'ko';
}
const DICT = CFG.l10n || {};
const own = (d, k) => (d && Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null);
const I18N = { lang: 'ko', locale: LOCALES.ko };
I18N.lang = detectLang(); I18N.locale = LOCALES[I18N.lang];
// 한국어 화면도 사전(DICT.ko)을 본다: 앱에만 있는 기능을 말하는 문구 몇 개는 웹에서 다르게 보인다(webver/l10n.json 의 셋째 값)
const lookup = (key) => { let s = own(DICT[I18N.lang], key); if (s == null && I18N.lang === 'ja') s = own(DICT.en, key); return s; };
const num = (v) => { if (typeof v === 'number') return v; const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : NaN; };
I18N.t = (key, params) => {
  let s = lookup(key); if (s == null) s = key.replace(/\|[a-z]+$/, '');
  if (s.indexOf('{') >= 0) s = s.replace(/\{(\w+)(?::([^{}|]*)\|([^{}]*))?\}/g, (m, k, one, many) => { const v = params ? params[k] : undefined; if (one !== undefined) return num(v) === 1 ? one : many; return v == null ? '' : String(v); });
  return s;
};
/** 껍데기 HTML 의 한국어 글자 마디와 placeholder · aria-label · title · alt 를 사전으로 바꾼다(한국어면 아무것도 안 한다) */
I18N.apply = (el) => {
  if (I18N.lang === 'ko' || !el) return;
  const walker = document.createTreeWalker(el, 5, null); const texts = [], els = []; let n;
  while ((n = walker.nextNode())) { if (n.nodeType === 3) texts.push(n); else els.push(n); }
  for (const node of texts) {
    const p = node.parentNode; if (!p || p.tagName === 'SCRIPT' || p.tagName === 'STYLE') continue;
    const raw = node.nodeValue, key = raw.trim(); if (!key || !/[가-힣]/.test(key)) continue;
    const s = lookup(key); if (s != null) node.nodeValue = raw.replace(key, () => s);
  }
  for (const e of els) for (const a of ['placeholder', 'aria-label', 'title', 'alt']) { const v = e.getAttribute(a); if (v && /[가-힣]/.test(v)) { const s = lookup(v.trim()); if (s != null) e.setAttribute(a, s); } }
};
root.I18N = I18N;
const tr = I18N.t;

// ---------- 계정 · 서버 호출(앱의 account.js 와 같은 모양) ----------
const KEY = 'photo-map-account.v1', PENDING = 'photo-map-web-login.v1', SERVER_KEY = 'photo-map-server';
let base = String(CFG.server || '');
// 개발할 때만 ?server=http://127.0.0.1:8794 로 서버를 바꿔 끼운다(이 탭에서만 기억). 공개 주소에서는 받지 않는다 — 받으면 남이 만든 링크 하나로 내 로그인 토큰이 다른 서버로 간다
if (LOCAL) { const o = QS.get('server'); if (o != null) put(SS, SERVER_KEY, o || null); base = get(SS, SERVER_KEY) || base; }
base = base.replace(/\/+$/, '');
const readSession = (raw) => { try { const s = JSON.parse(raw || 'null'); return s && s.token ? s : null; } catch (e) { return null; } };
let session = readSession(get(LS, KEY));
const listeners = new Set();
const changed = () => { paintAccount(); listeners.forEach((f) => { try { f(session); } catch (e) { /* ignore */ } }); };
const save = (s) => { session = s; put(LS, KEY, s ? JSON.stringify(s) : null); changed(); };

async function api(method, path, body) {
  if (!base) throw Object.assign(new Error('no server'), { code: 'no_server' });
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session && session.token) headers.Authorization = 'Bearer ' + session.token;
  let r;
  try { r = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { throw Object.assign(new Error('network'), { code: 'network' }); }
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (r.status === 401 && session) save(null);   // 만료 · 탈퇴 → 로그아웃 상태로
  if (!r.ok) throw Object.assign(new Error((j && (j.message || j.error)) || ('HTTP ' + r.status)), { code: (j && j.error) || ('http_' + r.status), status: r.status });
  return j;
}

// 로그인: 이 페이지를 떠나 서버(→ 구글·카카오·애플)로 갔다가 돌아온다. 떠나기 전에 state 와 하려던 일을 적어 둔다.
// 적어 두는 곳은 localStorage — 카카오톡 앱을 거쳐 돌아올 때처럼 새 탭으로 돌아와도 내가 시작한 로그인인지 알아볼 수 있게(20분 지나면 버린다).
let lastAct = null, loginWait = null;
const pending = { get: () => { try { return JSON.parse(get(LS, PENDING) || get(SS, PENDING) || 'null'); } catch (e) { return null; } }, set: (v) => put(LS, PENDING, v) || put(SS, PENDING, v), clear: () => { put(LS, PENDING, null); put(SS, PENDING, null); } };
const randomState = () => { const a = new Uint8Array(16); (root.crypto || root.msCrypto).getRandomValues(a); return Array.from(a, (b) => ('0' + b.toString(16)).slice(-2)).join(''); };
function startLogin(provider) {
  if (!base) return Promise.resolve({ error: tr('커뮤니티 서버가 아직 준비되지 않았어요.') });
  if (loginWait) return loginWait.promise;
  // 서버는 미리 허락한 주소(WEB_ORIGINS)로만 돌려보낸다. 다른 주소(사본 사이트)에서 열었으면 로그인할 수 있는 주소로 옮긴다
  if (!LOCAL && location.origin !== CFG.origin) { location.href = CFG.origin + (PAGE === 'trips' ? '/trips/' : '/community/'); return new Promise(() => {}); }
  const cmt = $('#cm-cmt-in'); const state = randomState();
  const pend = { state, provider, at: Date.now(), act: lastAct, post: postId(), comment: cmt && cmt.value.trim() ? cmt.value : '', page: PAGE, join: PAGE === 'trips' ? (JOIN || '') : '' };
  if (!pending.set(JSON.stringify(pend))) return Promise.resolve({ error: tr('이 브라우저에서는 로그인할 수 없어요. 사이트 데이터(쿠키) 저장을 허용한 뒤 다시 해 주세요.') });
  // 돌아올 곳은 이 화면(…/community/)이다. 보던 글은 ?post=번호 로 싣는다 — …/community/post/번호 는 서버가 그리는 글 페이지라 코드를 받아 줄 수 없다
  // 여행 페이지에서 시작했어도 돌아올 곳은 커뮤니티 페이지다(서버가 그 주소만 받는다) — 거기서 코드를 바꾼 뒤 pend.page 를 보고 여행 페이지로 넘긴다
  const next = new URL(location.origin + COMM + location.search); next.searchParams.delete('post'); next.searchParams.delete('join'); if (pend.post) next.searchParams.set('post', String(pend.post));
  let resolve; const promise = new Promise((r) => { resolve = r; }); loginWait = { promise, resolve };
  location.assign(base + '/auth/' + encodeURIComponent(provider) + '/start?' + new URLSearchParams({ web: '1', next: next.toString(), state, lang: I18N.lang }));
  return promise;   // 페이지가 떠나므로 보통은 풀리지 않는다. 뒤로가기로 돌아오면 아래 pageshow 에서 '취소'로 푼다
}
root.addEventListener('pageshow', (e) => { if (e.persisted && loginWait && !session) { const w = loginWait; loginWait = null; pending.clear(); w.resolve({ error: tr('로그인이 취소됐어요.') }); } });
/** 로그인하고 돌아왔으면 주소의 1회용 코드(#code=…&state=…)를 서버에서 세션 토큰과 바꿔 저장한다. 코드는 주소에서 바로 지운다.
    세션 토큰은 주소에 실리지 않는다(코드는 한 번만, 1분 안에만 쓸 수 있다). → null | { ok, isNew, pend } | { error, canceled } */
async function takeLoginResult() {
  const raw = location.hash.replace(/^#/, ''); const isAuth = /(^|&)(code|error)=/.test(raw);
  const clean = new URL(location.href); clean.hash = ''; clean.searchParams.delete('lang');
  try { history.replaceState(null, '', clean.pathname + clean.search); } catch (e) { if (raw) location.hash = ''; }
  if (!isAuth) { const old = pending.get(); if (old && !(Date.now() - old.at < 20 * 60000)) pending.clear(); return null; }   // 오래된 것만 치운다(방금 것은 다른 탭에서 로그인하는 중일 수 있다)
  const pend = pending.get(); pending.clear();
  const h = {}; new URLSearchParams(raw).forEach((v, k) => { h[k] = v; });
  // 내가 시작한 로그인이 아니면(state 가 다르면) 서버에 묻지도 않는다 — 남이 만든 #code=… 링크로 남의 계정에 로그인되는 것을 막는다
  if (!pend || !h.state || h.state !== pend.state || Date.now() - pend.at > 20 * 60000) return { error: 'state' };
  if (h.error || !h.code) { try { console.warn('[login] ' + (h.error || 'no code')); } catch (e) { /* ignore */ } return { error: h.error || 'failed', canceled: /denied|cancel/i.test(h.error || ''), page: pend.page }; }
  let j = null;
  try { j = await api('POST', '/auth/exchange', { code: h.code, state: h.state }); } catch (e) { return { error: (e && e.code) || 'exchange', page: pend.page }; }
  if (!j || !j.token) return { error: 'exchange', page: pend.page };
  save({ token: j.token, uid: j.uid, name: j.name || '', provider: j.provider || pend.provider, at: Date.now() });
  return { ok: true, isNew: j.new === '1', pend };
}
/** 로그아웃: 이 브라우저의 세션을 지우고, 서버에서도 그 세션을 없앤다(못 닿아도 이 브라우저에서는 로그아웃된다) */
function logout() {
  const tok = session && session.token; save(null);
  if (tok && base) { try { fetch(base + '/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, keepalive: true }).catch(() => {}); } catch (e) { /* ignore */ } }
}
// 다른 탭에서 로그인 · 로그아웃하면 따라간다. 이 탭에서 시작한 로그인이 다른 탭에서 끝났으면(새 탭으로 돌아온 경우) 기다리던 일을 이어서 한다
if (LS) root.addEventListener('storage', (e) => {
  if (e.key !== KEY) return; session = readSession(e.newValue); changed();
  if (session && loginWait) { const w = loginWait; loginWait = null; w.resolve({ ok: true }); } else reloadList();
});

root.Account = {
  api,
  get base() { return base; },
  get session() { return session; },
  get loggedIn() { return !!(session && session.token); },
  onChange: (f) => listeners.add(f),
  login: startLogin,
  logout,
};

// ---------- 알림 · 웹 대화창(확인 · 로그인 · 닉네임 · 계정 메뉴) ----------
const ST = () => { const C = root.Community; return C && C._debug ? C._debug.ST : null; };   // 커뮤니티의 상태(읽기만 한다)
const sheetOpen = () => { const el = $('#cm-sheet'); return !!el && !el.hidden; };
const shown = (sel) => { const el = $(sel); return !!el && !el.hidden; };
const plOpen = () => !!((root.Planner && root.Planner.busy) || shown('#pl-sheet') || $('#pl-taxi') || shown('#pl-photo-view'));   // 여행 화면 · 시트 · 택시 카드 · 크게 본 사진
let toastT = 0;
function toast(text) { const el = $('#cm-toast'); if (!el) return; el.textContent = text; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2400); }
const relock = () => { document.body.style.overflow = ((root.Community && root.Community.busy) || sheetOpen() || modal || (root.Planner && root.Planner.busy) || shown('#pl-sheet')) ? 'hidden' : ''; };
let modal = null; const MODAL_ACT = {};
function openModal(html, done) {
  if (modal) closeModal(null);
  const el = $('#wv-modal'); $('#wv-modal-body').innerHTML = html; el.hidden = false; const sh = $('.sheet', el); if (sh) sh.scrollTop = 0;
  modal = { done: done || null }; relock(); syncHistory();
  const f = $('[data-wv-focus]', el); if (f) setTimeout(() => { try { f.focus(); } catch (e) { /* ignore */ } }, 60);
}
function closeModal(v) {
  if (!modal) return; const m = modal; modal = null;
  $('#wv-modal').hidden = true; $('#wv-modal-body').innerHTML = ''; relock(); syncHistory();
  if (m.done) m.done(v);
}
/** 확인 창. 커뮤니티가 host.askConfirm(제목, 설명, 확인 글자, 위험한 일인지) 로 부른다 → 확인했으면 true */
function askConfirm(title, desc, ok, danger, cancel) {
  return new Promise((resolve) => {
    openModal(`<div class="sheet-title">${esc(title)}</div>${desc ? `<p class="desc">${esc(desc)}</p>` : ''}
      <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-wv="ok" ${danger ? '' : 'data-wv-focus'}>${esc(ok || tr('확인'))}</button><button type="button" class="btn secondary" data-wv="cancel" ${danger ? 'data-wv-focus' : ''}>${esc(cancel || tr('취소'))}</button>`,
    (v) => resolve(v === 'ok'));
  });
}
const notice = (title, desc) => new Promise((resolve) => { openModal(`<div class="sheet-title">${esc(title)}</div><p class="desc">${esc(desc)}</p><button type="button" class="btn primary" data-wv="ok" data-wv-focus>${esc(tr('확인'))}</button>`, () => resolve()); });
function shareText(text, url, title) {
  if (navigator.share) { navigator.share({ text, url, title }).catch(() => {}); return; }
  try { navigator.clipboard.writeText([text, url].filter(Boolean).join('\n')).then(() => toast(tr('링크를 복사했어요.')), () => {}); } catch (e) { /* ignore */ }
}

// ---------- 머리 줄의 계정 버튼 ----------
const PROVIDERS = { google: 'Google', kakao: '카카오', apple: 'Apple' };
function paintAccount() {
  const box = $('#wv-account'); if (!box) return;
  if (session) { const name = session.name || tr('이름 없음'); box.innerHTML = `<button type="button" class="wv-me" data-wv="me" title="${esc(tr('내 계정'))}"><span class="cm-ava">${esc(name.slice(0, 1))}</span><span>${esc(name)}</span></button>`; }
  else box.innerHTML = `<button type="button" class="wv-login" data-wv="login">${esc(tr('로그인'))}</button>`;
}
const reloadList = () => { const b = $('#cm-headbtns [data-act="reload"]'); if (b) b.click(); };
function loginDialog() {
  lastAct = null; const src = $('#battle-out .login-btns');
  openModal(`<div class="sheet-title">${esc(tr('로그인'))}</div><p class="desc">${esc(PAGE === 'trips' ? tr('로그인하면 여행이 서버에 저장돼서 폰의 여행여권 앱과 같은 여행을 보고 고칠 수 있어요.') : tr('글과 댓글을 쓰면 포인트가 쌓여요. 읽기는 로그인 없이 할 수 있어요.'))}</p>
    <div class="login-btns">${src ? src.innerHTML : ''}</div><p class="caption" id="wv-login-msg" style="min-height:18px"></p><button type="button" class="btn secondary" data-wv="cancel">${esc(tr('닫기'))}</button>`);
}
async function loginFromDialog(provider) {
  const msg = $('#wv-login-msg'); if (msg) msg.textContent = tr('로그인 창을 여는 중…');
  const r = await startLogin(provider);
  if (r && r.ok) { if ($('#wv-login-msg')) closeModal(null); reloadList(); return; }   // 다른 탭에서 로그인이 끝남
  const again = $('#wv-login-msg'); if (again) again.textContent = (r && r.error) || '';
}
function accountMenu() {
  if (!session) return; const p = PROVIDERS[session.provider];
  const row = (act, title, extra) => `<button type="button" class="row tap" data-wv="${act}"><span class="row-body"><span class="row-title">${esc(title)}</span>${extra || ''}</span><span class="chev"></span></button>`;
  openModal(`<div class="sheet-title">${esc(session.name || tr('이름 없음'))}</div>${p ? `<p class="desc">${esc(tr('{p} 계정으로 로그인했어요.', { p: tr(p) }))}</p>` : ''}
    <div class="rows wv-rows">${PAGE === 'trips' ? row('comm', tr('커뮤니티')) : row('trips', tr('내 여행')) + row('profile', tr('프로필 설정'))}${row('nick', tr('닉네임 바꾸기'))}${PAGE === 'trips' ? '' : row('points', tr('내 포인트'))}${row('logout', tr('로그아웃'))}
      <button type="button" class="row tap" data-wv="delete"><span class="row-body"><span class="row-title danger">${esc(tr('회원 탈퇴'))}</span><span class="row-desc">${esc(tr('계정과 글·댓글·사진·포인트가 모두 지워져요.'))}</span></span><span class="chev"></span></button></div>
    <button type="button" class="btn secondary" data-wv="cancel">${esc(tr('닫기'))}</button>`,
  (v) => { if (v === 'trips') location.href = TRIPS; else if (v === 'comm') location.href = COMM; else if (v === 'profile') root.Community.openProfile(); else if (v === 'nick') askNickname(false); else if (v === 'points') root.Community.openPoints(); else if (v === 'logout') doLogout(); else if (v === 'delete') deleteAccount(); });
}
/** 로그아웃. 여행 페이지에서는 먼저 못 올린 변경을 올려 보고, 남으면 알린다(앱의 설정 › 로그아웃과 같은 일) — 로그아웃하면 그 계정의 여행은 이 브라우저에서 내려간다 */
async function doLogout() {
  const P = root.Planner;
  if (P && P.beforeLogout) {
    let r = { dirty: 0 }; try { r = await P.beforeLogout(); } catch (e) { r = { dirty: 0 }; }
    if (r && r.dirty > 0 && !(await askConfirm(tr('아직 서버에 못 올린 여행 변경이 있어요'), tr('그 여행은 이 브라우저에 남겨 두었다가, 같은 계정으로 다시 로그인하면 서버에 올려요. 다른 기기에서는 그때까지 보이지 않아요.'), tr('로그아웃')))) return;
  }
  logout(); toast(tr('로그아웃했어요.')); reloadList();
}
/** 회원 탈퇴: 무엇이 지워지는지 알리고 확인을 받은 뒤 서버에서 계정을 지운다(앱의 설정 › 회원 탈퇴와 같은 일) */
async function deleteAccount() {
  const ok = await askConfirm(tr('회원 탈퇴할까요?'), tr('계정과 지도 대결 통계, 커뮤니티에 쓴 글·댓글·사진과 포인트, 서버에 저장한 여행이 지워져요. 친구와 함께 보던 여행에서는 나만 빠져요. 되돌릴 수 없어요.'), tr('탈퇴하기'), true);
  if (!ok) return;
  const acct = session && session.uid;
  try { await api('DELETE', '/me'); } catch (e) { if (!(e && e.status === 401)) { toast(tr('탈퇴하지 못했어요. 잠시 뒤에 다시 해 주세요.')); return; } }
  save(null); if (acct != null && root.Planner && root.Planner.forgetAccount) { try { root.Planner.forgetAccount(String(acct)); } catch (e) { /* ignore */ } } toast(tr('탈퇴했어요. 계정과 글이 지워졌어요.')); reloadList();
}
/** 닉네임 정하기(방금 가입했을 때 — 로그인 제공자가 준 이름이 그대로 보이지 않게) · 바꾸기 */
function askNickname(first) {
  return new Promise((resolve) => {
    const cur = (session && session.name) || '';
    openModal(`<div class="sheet-title">${esc(first ? tr('커뮤니티에서 쓸 닉네임을 정해 주세요') : tr('닉네임 바꾸기'))}</div><p class="desc">${esc(tr('글과 댓글에 이 이름으로 보여요. 나중에 바꿀 수 있어요.'))}</p>
      <div class="field"><input id="wv-nick" maxlength="20" autocomplete="off" placeholder="${esc(cur || tr('닉네임'))}" aria-label="${esc(tr('닉네임'))}" data-wv-focus></div><p class="caption" id="wv-nick-msg" style="min-height:18px"></p>
      <button type="button" class="btn primary" data-wv="nick-save">${esc(tr('저장'))}</button><button type="button" class="btn secondary" data-wv="cancel">${esc(first && cur ? tr('지금 이름({name}) 그대로 쓰기', { name: cur }) : tr('취소'))}</button>`,
    () => resolve());
    const inp = $('#wv-nick'); if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); MODAL_ACT['nick-save'](); } });
  });
}
MODAL_ACT['nick-save'] = async () => {
  const inp = $('#wv-nick'); const v = inp ? inp.value.replace(/\s+/g, ' ').trim() : '';
  if (!v || (session && v === session.name)) { closeModal('cancel'); return; }
  const msg = $('#wv-nick-msg'); if (msg) msg.textContent = tr('저장하는 중…');
  try {
    const r = await api('PATCH', '/me', { name: v }); if (session) save(Object.assign({}, session, { name: (r && r.user && r.user.name) || v }));
    closeModal('saved'); toast(tr('닉네임을 바꿨어요.')); reloadList();
  } catch (e) { const again = $('#wv-nick-msg'); if (again) again.textContent = e && e.code === 'bad_words' ? tr('쓸 수 없는 말이 들어 있어요. 다른 이름으로 정해 주세요.') : tr('저장하지 못했어요. 잠시 뒤에 다시 해 주세요.'); }
};

// ---------- 주소와 뒤로가기: 글·시트·창이 열려 있는 동안 방문 기록에 한 칸({ wv: 1 })을 둔다 → 브라우저 뒤로가기가 사이트를 떠나지 않고 열린 것을 닫는다 ----------
// 글이 열려 있는 동안 주소는 …/community/post/번호 — 서버가 그려 주는 검색용 글 페이지와 같은 주소라 그대로 복사해 보내도 된다(새로 고치면 그 페이지가 뜨고, 거기서 '커뮤니티에서 보기'로 돌아온다).
// 이 화면으로 글을 바로 여는 주소는 …/community/?post=번호 — 그렇게 들어온 때는 칸을 더하지 않고 들어온 칸에 표시만 한다({ wv: 1, own: 1 }) → 뒤로가기는 왔던 곳으로 돌아가고, 화면의 뒤로 버튼은 목록을 보여 준다
function postId() { const st = ST(); if (!st) return null; for (let i = st.stack.length - 1; i >= 0; i--) if (st.stack[i].name === 'post') return st.stack[i].p.id; return null; }
const isOpen = () => !!((root.Community && root.Community.busy) || sheetOpen() || $('#cm-viewer') || modal || plOpen());
const TITLE = { page: document.title, short: '' };
const postPath = (id) => ROOT + 'post/' + id;
const urlPost = () => { const m = /\/post\/(\d{1,12})$/.exec(location.pathname); return m ? +m[1] : +new URLSearchParams(location.search).get('post') || 0; };   // 지금 주소가 가리키는 글 번호
function currentUrl() { const q = new URLSearchParams(location.search); q.delete('post'); const s = q.toString(); const id = postId(); return (id ? postPath(id) : ROOT) + (s ? '?' + s : ''); }
let backing = false, backT = 0;
function syncHistory() {
  if (backing) return;
  const open = isOpen(), has = !!(history.state && history.state.wv), first = has && !!history.state.own, url = currentUrl(), same = url === location.pathname + location.search;
  const st0 = ST(), deeper = (st0 && st0.stack.length > 1) || sheetOpen() || !!$('#cm-viewer') || !!modal || plOpen();   // 들어온 글 위에 무언가 더 열렸는지(고치기 화면 · 시트 · 창)
  try {
    if (open && (!has || (first && deeper))) history.pushState({ wv: 1 }, '', url);
    else if (!open && first) history.replaceState(null, '', url);
    else if (!open && has) { backing = true; clearTimeout(backT); backT = setTimeout(() => { if (backing) { backing = false; syncHistory(); } }, 800); history.back(); return; }
    else if (!same) history.replaceState(history.state, '', url);
  } catch (e) { /* 방문 기록을 못 고쳐도 화면은 그대로 쓴다 */ }
  const st = ST(), id = postId();
  document.title = id && st && st.post && st.post.id === id && st.post.title ? st.post.title + ' — ' + TITLE.short : TITLE.page;
}
root.addEventListener('popstate', () => {
  if (backing) { backing = false; clearTimeout(backT); syncHistory(); return; }   // 우리가 닫으면서 되돌린 한 칸
  const C = root.Community, P = root.Planner; if (!C && !P) return;
  if (!C) { if (modal) closeModal(null); else if (plOpen()) P.back(); setTimeout(syncHistory, 0); return; }   // 여행 페이지: 맨 위에 열린 것 하나를 닫는다(여행 만들기는 한 단계 앞으로)
  if (isOpen()) { if (modal) closeModal(null); else C.back(); }   // 뒤로가기 → 맨 위에 열린 것 하나를 닫는다(쓰던 글이 있으면 커뮤니티가 먼저 물어본다)
  else { const id = urlPost(); if (id > 0 && history.state && history.state.wv) C.openPost(id); }   // 앞으로 가기 → 그 글을 다시 연다
  setTimeout(syncHistory, 0);
});
document.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if (e.key === 'Escape') { if (modal) { e.preventDefault(); closeModal(null); } else if (($('#cm-viewer') || sheetOpen()) && root.Community) { e.preventDefault(); root.Community.back(); } else if ((shown('#pl-sheet') || $('#pl-taxi') || shown('#pl-photo-view')) && root.Planner) { e.preventDefault(); root.Planner.back(); } }
  else if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }   // 글 카드를 키보드로 열기
});

// ---------- 앱에서만 되는 것 ----------
/** 글쓰기 화면이 그려질 때마다: 붙이기 버튼은 숨겼으니(web.css) 붙인 것이 없으면 '붙이기' 제목도 숨기고, 여행일정공유가 골라져 있으면 자유게시판으로 바꾼다 */
function fixWrite() {
  const a = $('#cm-w-attach'); if (!a) return;
  const label = a.previousElementSibling; if (label && label.classList.contains('cm-flabel')) label.hidden = !$('.cm-attsel', a);
  const on = $('#cm-w-board .chip.active'); if (on && on.dataset.v === 'plan' && !on.disabled) { const free = $('#cm-w-board .chip[data-v="free"]'); if (free) free.click(); }
}
async function planNotice() {
  const ok = await askConfirm(tr('여행일정공유 글은 앱에서 쓸 수 있어요'), tr('일정을 붙이려면 여행여권 앱의 여행 탭에서 만든 일정이 필요해요. 다른 게시판에는 여기서 바로 쓸 수 있어요.'), tr('앱 받기'), false, tr('닫기'));
  if (ok) location.href = '../#download';
}
// ---------- 글 공유(웹에만): 글 화면 머리 줄에 버튼을 끼워 넣는다. 보내는 주소는 서버가 그려 주는 글 페이지(…/community/post/번호) ----------
const SHARE_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8 7.500l4-4 4 4"/><path d="M6 11.500v6.500a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6.500"/></svg>';
function addShare() {
  const menu = $('#cm-screen .sd-top [data-act="post-menu"]'); if (!menu || $('#wv-share')) return;
  menu.insertAdjacentHTML('beforebegin', `<button type="button" class="top-btn" id="wv-share" aria-label="${esc(tr('공유'))}">${SHARE_SVG}</button>`);
}
function sharePost() {
  const st = ST(); const p = st && st.post; if (!p) return; const url = location.origin + postPath(p.id);
  if (navigator.share) { navigator.share({ title: p.title, url }).catch(() => {}); return; }
  const fallback = () => notice(tr('글 주소'), url);   // 복사가 막힌 브라우저: 주소를 보여 준다
  try { navigator.clipboard.writeText(url).then(() => toast(tr('링크를 복사했어요.')), fallback); } catch (e) { fallback(); }
}
document.addEventListener('click', (e) => { const t = e.target; if (t && t.closest && t.closest('#wv-share')) sharePost(); });
document.addEventListener('click', (e) => {   // 커뮤니티의 버튼 처리보다 먼저 본다
  const t = e.target; const el = t && t.closest ? t.closest('[data-act]') : null; if (!el || !el.closest('#cm-page, #cm-screen, #cm-sheet')) return;
  const act = el.dataset.act; if (act !== 'cm-login') lastAct = act;   // 로그인 시트를 띄운 일(글쓰기 · 좋아요)을 기억해 두었다가 돌아와서 잇는다
  const st = ST();
  if (act === 'write' && st && st.board === 'plan' && !st.mine) { e.preventDefault(); e.stopPropagation(); planNotice(); }
  else if (act === 'trips') { e.preventDefault(); e.stopPropagation(); location.href = TRIPS; }   // 커뮤니티 메뉴의 '내 여행' → 고칠 수 있는 여행 페이지
}, true);

// ---------- 시작 ----------
const host = {
  tr, askConfirm, shareText, platform: 'web', demo: false, DATA: null,
  nlog: (t) => { try { console.warn(t); } catch (e) { /* ignore */ } },
  login: (provider) => startLogin(provider),
  api: (m, p, b) => api(m, p, b),
  setBusy: (b) => { if (b) { fixWrite(); addShare(); } syncHistory(); },   // 커뮤니티가 하위 화면을 그리거나 닫을 때마다 부른다
};
const waitFor = (fn, ms) => new Promise((resolve) => { const t0 = Date.now(); const tick = () => { let v = null; try { v = fn(); } catch (e) { v = null; } if (v) resolve(v); else if (Date.now() - t0 > ms) resolve(null); else setTimeout(tick, 100); }; tick(); });
/** 로그인하러 떠나기 전에 하려던 일을 잇는다: 글쓰기는 다시 열고, 보던 글의 좋아요는 눌러 주고, 적던 댓글은 입력창에 되살린다 */
async function resume(p) {
  if (!p) return;
  if (p.post && (p.comment || p.act === 'like')) {
    const ok = await waitFor(() => { const st = ST(); return st && st.post && st.post.id === p.post && $('#cm-screen .cm-like'); }, 8000); if (!ok) return;
    const inp = $('#cm-cmt-in'); if (p.comment && inp && !inp.value) inp.value = p.comment;
    const like = $('#cm-screen .cm-like'); if (p.act === 'like' && like && like.getAttribute('aria-pressed') === 'false') like.click();
  } else if (p.act === 'write' && !p.post) { const fab = $('#cm-page .cm-fab'); if (fab) fab.click(); }
}
// ---------- 내 여행 페이지(…/trips/): 앱의 여행 탭(planner.js)을 그대로 띄운다 ----------
/** 파일을 내려받게 한다(경비 CSV 내보내기) */
function saveBlob(name, blob) {
  try { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name || 'file'; a.hidden = true; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); return true; } catch (e) { return false; }
}
const tripsHost = {
  tr, askConfirm, shareText, platform: 'web', demo: false, DATA: null,
  nlog: (t) => { try { console.warn(t); } catch (e) { /* ignore */ } },
  login: (provider) => startLogin(provider),
  api: (m, p, b) => api(m, p, b),
  setBusy: () => { syncHistory(); },   // 여행 화면이 열리고 닫힐 때마다 → 브라우저 뒤로가기를 맞춘다
  openExternal: (url) => { try { root.open(url, '_blank', 'noopener'); } catch (e) { /* ignore */ } },   // 지도 앱 · 예약 사이트 링크는 새 탭으로
  showTab: (name) => { if (name === 'comm') location.href = COMM; },   // 여행 아래 줄의 '커뮤니티'. '홈으로'는 여행 목록으로 돌아온다(여행 탭이 닫아 준다)
  shareFile: async (f) => saveBlob(f.name, f.blob),
  // 숙소 링크 다시 읽기: 앱은 폰이 그 페이지를 열어 읽지만 브라우저는 남의 사이트를 열어 읽을 수 없다 → 서버가 읽어 온 것(GET /links/preview)을 같은 모양으로 돌려준다
  probeLink: async (url) => {
    try { const j = await api('GET', '/links/preview?url=' + encodeURIComponent(url)); return j && j.fetched ? { ok: true, title: j.title || '', image: j.image || '', price: +j.price || 0, cur: j.cur || '', per: '' } : { ok: false, why: 'blocked' }; }
    catch (e) { return { ok: false, why: (e && e.code) || 'error' }; }
  },
  openDoc: async (f) => { try { const u = URL.createObjectURL(f.blob); const w = root.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 10 * 60000); return !!w || saveBlob(f.name, f.blob); } catch (e) { return false; } },   // 올려 둔 표·확인서: 새 탭에서 연다(팝업이 막히면 내려받는다)
};
// 지도: 앱처럼 구글 지도(planner-gmap.js, 표시용 키는 조립할 때 앱의 cloud-config.js 에서 가져온다). 구글 지도를 못 불러오면 앱의 예비 지도와 같은 밝은 바탕 지도(engine.js TILE_STYLES.esri 와 같은 값)
if (PAGE === 'trips' && CFG.gmapKey && !root.CLOUD_CONFIG) root.CLOUD_CONFIG = { GOOGLE_MAPS_KEY: CFG.gmapKey };
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
if (PAGE === 'trips' && !root.PhotoMapEngine) root.PhotoMapEngine = { TILE_STYLES: { esri: { maxZoom: 16, attr: 'Esri, HERE, Garmin, © OpenStreetMap contributors', under: () => '#dfe3e6',
  layers: () => [ESRI + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', ESRI + 'Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'] } } };
// ---------- 여행 내보내기(웹에만, 11-20 사용자: "웹에 여행 내보내기 기능도 만들어줘") ----------
// 여행 메뉴(⋯) 시트에 '여행 내보내기' 줄을 끼워 넣는다 → 문서(HTML 한 파일: 일정 · 예약 · 경비 · 일기 · 준비물. 열어서 인쇄하거나 PDF 로 저장) · 경비 표(CSV) · 백업 파일(JSON).
// 파일은 이 브라우저 안에서 만들어 내려받는다(서버로 보내지 않는다). 일기 사진은 이 브라우저에 있는 것만 문서에 들어간다.
function addExportRow() {
  const del = $('#pl-sheet-body [data-act="trip-del"]'); if (!del || !$('#pl-sheet-body [data-act="trip-edit"]') || $('#wv-export')) return;
  const li = del.closest('li') || del; li.insertAdjacentHTML('beforebegin', `<li class="row tap" id="wv-export" role="button" tabindex="0"><div class="row-body"><div class="row-title">${esc(tr('여행 내보내기'))}</div><div class="row-desc">${esc(tr('문서 · 경비 표 · 백업 파일로 저장해요'))}</div></div><span class="chev"></span></li>`);
}
const fileBase = (t) => (String(t.title || tr('여행')).replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 40) || 'trip');
const dayText = (v) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(v || '')); if (!m) return ''; try { return new Intl.DateTimeFormat(I18N.locale, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(+m[1], +m[2] - 1, +m[3])); } catch (e) { return m[0]; } };
const timeOf = (v) => { const m = /T(\d\d:\d\d)/.exec(String(v || '')); return m ? m[1] : ''; };
const b64 = (buf) => { const a = new Uint8Array(buf); let out = ''; for (let i = 0; i < a.length; i += 0x8000) out += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(out); };
async function tripDocHtml(t) {
  const D = root.Planner._debug, C = D.C, PD = root.PLANNER_DATA || {}; const fx = D.ST.fx || null; const money = (n, cur) => C.fmtMoney(n, cur, I18N.locale);
  const h = []; const sec = (title) => h.push(`<h2>${esc(title)}</h2>`); const live = (a) => C.live(a || []);
  const ppl = C.people(t); const pn = (id) => { const p = ppl.find((x) => x.id === id); return p ? (p.id === t.meId ? tr('나') : p.name || '') : ''; };
  h.push(`<h1>${esc(t.title || tr('이름 없는 여행'))}</h1><p class="sub">${esc([t.start && t.end ? dayText(t.start) + ' ~ ' + dayText(t.end) : '', (t.dests || []).map((d) => d.name).filter(Boolean).join(' · '), ppl.length > 1 ? ppl.map((p) => pn(p.id)).join(', ') : ''].filter(Boolean).join('  |  '))}</p>`);
  // 가는 방법 · 오는 방법 · 숙소
  const wayRow = (b) => `<tr><td>${esc([dayText(b.day || b.start), [timeOf(b.start), timeOf(b.end)].filter(Boolean).join(' → ')].filter(Boolean).join(' '))}</td><td>${esc(b.title || '')}${b.memo ? `<div class="memo">${esc(b.memo)}</div>` : ''}</td><td>${esc(b.code || '')}</td><td class="num">${b.paid > 0 ? esc(money(b.paid, t.home)) : ''}</td></tr>`;
  for (const [dir, name] of [['go', tr('가는 방법')], ['back', tr('오는 방법')]]) { const ws = C.ways(t, dir); if (ws.length) { sec(name); h.push(`<table><tbody>${ws.map(wayRow).join('')}</tbody></table>`); } }
  const stays = C.stays(t);
  if (stays.length) { sec(tr('숙소')); h.push(`<table><tbody>${stays.map((b) => `<tr><td>${esc([dayText(b.start), dayText(b.end)].filter(Boolean).join(' ~ '))}</td><td>${esc(b.title || '')}${b.addr ? `<div class="memo">${esc(b.addr)}</div>` : ''}</td><td>${esc(b.code || '')}</td><td class="num">${b.paid > 0 ? esc(money(b.paid, t.home)) : ''}</td></tr>`).join('')}</tbody></table>`); }
  // 일정
  const days = C.tripDays(t); const itemLi = (it) => `<li>${it.time ? `<b class="time">${esc(it.time)}</b> ` : ''}${esc(it.name || '')}${it.memo ? `<span class="memo"> — ${esc(it.memo)}</span>` : ''}${it.addr ? `<div class="memo">${esc(it.addr)}</div>` : ''}</li>`;
  const planned = days.map((d, i) => [d, i, C.dayPlan(t, d).items]).filter((x) => x[2].length); const wish = C.dayItems(t, null);
  if (planned.length || wish.length) {
    sec(tr('일정'));
    for (const [d, i, items] of planned) h.push(`<h3>${esc(tr('{n}일차', { n: i + 1 }) + ' · ' + dayText(d))}</h3><ol>${items.map(itemLi).join('')}</ol>`);
    if (wish.length) h.push(`<h3>${esc(tr('가고 싶은 곳'))}</h3><ul>${wish.map(itemLi).join('')}</ul>`);
  }
  // 경비
  const exps = live(t.expenses).slice().sort((a, b) => String(a.day || '').localeCompare(String(b.day || '')) || (a.c || 0) - (b.c || 0));
  if (exps.length) {
    sec(tr('경비')); let sum = 0; const cat = (k) => { const c = (PD.CATS || []).find((x) => x[0] === k); return c ? tr(c[1]) : ''; };
    const rows = exps.map((e) => { const x = C.expenseHome(t, e, fx); if (x.home != null) sum += x.home; return `<tr><td>${esc(dayText(e.day))}</td><td>${esc(cat(e.cat))}</td><td>${esc(e.memo || '')}${ppl.length > 1 && e.payer ? `<div class="memo">${esc(pn(e.payer))}</div>` : ''}</td><td class="num">${esc(money(e.amt, e.cur))}</td><td class="num">${e.cur !== t.home && x.home != null ? esc(money(x.home, t.home)) : ''}</td></tr>`; });
    h.push(`<table><tbody>${rows.join('')}</tbody><tfoot><tr><td colspan="3">${esc(tr('합계'))}</td><td class="num" colspan="2">${esc(money(sum, t.home))}</td></tr></tfoot></table>`);
  }
  // 일기(사진은 이 브라우저에 있는 것만)
  const diary = live(t.diary).filter((e) => e.title || e.text || (e.photos || []).length).sort((a, b) => String(a.day || '').localeCompare(String(b.day || '')));
  if (diary.length) {
    sec(tr('일기'));
    for (const e of diary) {
      const imgs = []; for (const id of (e.photos || [])) { try { const r = await C.Store.getFile(id); if (r && r.buf) imgs.push(`<img alt="" src="data:image/jpeg;base64,${b64(r.buf)}">`); } catch (err) { /* 이 브라우저에 없는 사진 */ } }
      h.push(`<article><h3>${esc(dayText(e.day))}${e.title ? ' · ' + esc(e.title) : ''}</h3>${e.text ? `<p class="text">${esc(e.text)}</p>` : ''}${imgs.length ? `<div class="photos">${imgs.join('')}</div>` : ''}</article>`);
    }
  }
  // 준비물 · 할 일
  const chk = live(t.checklist);
  if (chk.length) { sec(tr('준비물')); h.push(`<ul class="chk">${chk.map((c) => `<li>${c.done ? '☑' : '☐'} ${esc(c.title || '')}</li>`).join('')}</ul>`); }
  const css = 'body{font-family:-apple-system,BlinkMacSystemFont,"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Segoe UI",sans-serif;color:#191F28;line-height:1.6;max-width:760px;margin:0 auto;padding:32px 20px 48px;font-size:15px}h1{font-size:28px;margin:0 0 4px}h2{font-size:19px;margin:34px 0 10px;padding-bottom:6px;border-bottom:2px solid #191F28}h3{font-size:16px;margin:18px 0 6px}.sub{color:#4E5968;margin:0}table{width:100%;border-collapse:collapse}td{padding:7px 8px 7px 0;border-bottom:1px solid #E5E8EB;vertical-align:top}td.num{text-align:right;white-space:nowrap}tfoot td{font-weight:700;border-bottom:0}.memo{color:#6B7684;font-size:13px}.time{font-variant-numeric:tabular-nums}ol,ul{margin:0;padding-left:22px}li{margin:3px 0}.chk{list-style:none;padding:0}.text{white-space:pre-wrap;margin:4px 0 8px}.photos{display:flex;flex-wrap:wrap;gap:8px}.photos img{width:calc(50% - 4px);border-radius:10px}article{break-inside:avoid}footer{margin-top:40px;color:#8B95A1;font-size:12px}@media print{body{padding:0;max-width:none}h2{break-after:avoid}tr,li{break-inside:avoid}}';
  return `<!doctype html>\n<html lang="${esc(I18N.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t.title || tr('이름 없는 여행'))}</title><style>${css}</style></head><body>\n${h.join('\n')}\n<footer>${esc(tr('여행여권에서 내보낸 여행이에요.'))} · ${esc(dayText(new Date().toISOString().slice(0, 10)))}</footer>\n</body></html>\n`;
}
function exportDialog() {
  const D = root.Planner && root.Planner._debug; const t = D && D.ST.trips.find((x) => x.id === D.ST.tripId && !x.del); if (!t) return;
  const row = (act, title, desc) => `<button type="button" class="row tap" data-wv="${act}"><span class="row-body"><span class="row-title">${esc(title)}</span><span class="row-desc">${esc(desc)}</span></span><span class="chev"></span></button>`;
  openModal(`<div class="sheet-title">${esc(tr('여행 내보내기'))}</div><p class="desc">${esc(tr('파일은 이 브라우저에서 만들어 내려받아요. 서버로 보내지 않아요.'))}</p>
    <div class="rows wv-rows">${row('x-doc', tr('문서로 저장'), tr('일정 · 예약 · 경비 · 일기 · 준비물을 한 파일로. 열어서 인쇄하거나 PDF 로 저장할 수 있어요.'))}${row('x-csv', tr('경비 표로 저장 (CSV)'), tr('엑셀 같은 표 프로그램에서 열 수 있어요.'))}${row('x-json', tr('백업 파일로 저장 (JSON)'), tr('여행 기록 전체예요. 사진은 들어가지 않아요.'))}</div>
    <button type="button" class="btn secondary" data-wv="cancel">${esc(tr('닫기'))}</button>`,
  async (v) => {
    if (v !== 'x-doc' && v !== 'x-csv' && v !== 'x-json') return; let ok = false;
    try {
      if (v === 'x-doc') ok = saveBlob(fileBase(t) + '.html', new Blob([await tripDocHtml(t)], { type: 'text/html;charset=utf-8' }));
      else if (v === 'x-csv') ok = saveBlob(fileBase(t) + ' ' + tr('경비') + '.csv', new Blob([D.expenseCsv(t)], { type: 'text/csv;charset=utf-8' }));
      else { const doc = Object.assign({}, t); delete doc.cloud; delete doc.park; ok = saveBlob(fileBase(t) + '.json', new Blob([JSON.stringify({ app: 'travel-passport', format: 1, exportedAt: new Date().toISOString(), trip: doc }, null, 2)], { type: 'application/json' })); }
    } catch (e) { tripsHost.nlog('export failed: ' + (e && e.message)); ok = false; }
    toast(ok ? tr('파일을 저장했어요.') : tr('내보내지 못했어요.'));
  });
}
document.addEventListener('click', (e) => { const t = e.target; if (PAGE === 'trips' && t && t.closest && t.closest('#wv-export')) { if (root.Planner) root.Planner.back(); setTimeout(exportDialog, 0); } });
async function bootTrips() {
  const P = root.Planner; const login = await takeLoginResult();   // 주소 정리(로그인 코드는 커뮤니티 페이지가 받는다)
  if (!P || !root.PlannerCore) { const hint = $('#pl-list .pl-hint'); if (hint) hint.textContent = tr('문제가 생겼어요. 잠시 뒤에 다시 해 주세요.'); return; }
  $$w('[data-tripseg] button').forEach((b) => b.addEventListener('click', () => { $$w('[data-tripseg] button').forEach((x) => x.classList.toggle('on', x === b)); P.listView(b.dataset.v === 'past' ? 'past' : 'now'); }));
  P.init(tripsHost);
  if (root.PlannerGMap) { root.PlannerGMap.log = tripsHost.nlog; if (root.PlannerGMap.on()) root.PlannerGMap.ready(); }   // 구글 지도 스크립트를 미리 불러 둔다(앱의 Planner.show 와 같은 일)
  if (root.MutationObserver) { const mo = new MutationObserver(() => { addExportRow(); syncHistory(); }); mo.observe($('#pl-sheet'), { attributes: true, attributeFilter: ['hidden'] }); mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); }   // 시트 · 택시 카드 · 크게 본 사진이 열리고 닫힐 때
  setTimeout(() => { const sc = document.createElement('script'); sc.src = 'data/cities.js?v=' + encodeURIComponent(CFG.citiesV || ''); sc.async = true; document.head.appendChild(sc); }, 1200);   // 여행지 찾기에 쓰는 도시 이름(크다 — 화면이 뜬 뒤에 받는다. 받기 전에는 인기 여행지만 찾아진다)
  if (JOIN && P.openInvite) { try { const u = new URL(location.href); u.searchParams.delete('join'); history.replaceState(history.state, '', u.pathname + u.search); } catch (e) { /* ignore */ } P.openInvite(JOIN); }   // 초대 링크로 들어옴(…/trips/?join=코드) — 주소에서는 지운다(새로 고칠 때마다 다시 묻지 않게)
  if (login && !login.ok) notice(tr('로그인하지 못했어요'), login.canceled ? tr('로그인을 끝내지 않고 돌아왔어요. 다시 해 보세요.') : tr('잠시 뒤에 다시 해 주세요.'));
}
const $$w = (s) => Array.from(document.querySelectorAll(s));
async function boot() {
  const C = root.Community;
  document.documentElement.lang = I18N.lang; I18N.apply(document.body);
  TITLE.short = PAGE === 'trips' ? tr('내 여행 — 여행여권') : tr('여행여권 커뮤니티'); if (I18N.lang !== 'ko') { TITLE.page = TITLE.short; document.title = TITLE.page; }
  paintAccount();
  document.querySelectorAll('#wv-langs a[data-lang]').forEach((a) => { const u = new URL(location.origin + ROOT + location.search); u.searchParams.delete('post'); u.searchParams.set('lang', a.dataset.lang); a.href = u.pathname + u.search; if (a.dataset.lang === I18N.lang) a.setAttribute('aria-current', 'true'); });
  const skip = $('.wv-skip'); if (skip) skip.addEventListener('click', (e) => { e.preventDefault(); const t = $(PAGE === 'trips' ? '#pl-list' : '#cm-page'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } });
  $('#wv-account').addEventListener('click', (e) => { const el = e.target.closest('[data-wv]'); if (!el) return; if (el.dataset.wv === 'login') loginDialog(); else accountMenu(); });
  $('#wv-modal').addEventListener('click', (e) => {
    if (e.target.id === 'wv-modal-dim') { closeModal(null); return; }
    const lb = e.target.closest('.login[data-provider]'); if (lb) { loginFromDialog(lb.dataset.provider); return; }
    const el = e.target.closest('[data-wv]'); if (!el || el.disabled) return;
    if (MODAL_ACT[el.dataset.wv]) MODAL_ACT[el.dataset.wv](el); else closeModal(el.dataset.wv);
  });
  if (PAGE === 'trips') { bootTrips(); return; }
  const login = await takeLoginResult();   // 로그인하고 돌아온 길이면 1회용 코드를 세션과 바꾼다(주소는 부르자마자 정리된다)
  const fromTrips = login && (login.ok ? login.pend && login.pend.page : login.page) === 'trips';   // 여행 페이지에서 시작한 로그인 → 끝나면 그 페이지로 돌려보낸다
  if (fromTrips) {
    if (login.ok) { if (login.isNew) await askNickname(true); }
    else await notice(tr('로그인하지 못했어요'), login.canceled ? tr('로그인을 끝내지 않고 돌아왔어요. 다시 해 보세요.') : tr('잠시 뒤에 다시 해 주세요.'));
    const jn = login.ok && login.pend && /^[A-Za-z0-9_-]{4,64}$/.test(login.pend.join || '') ? login.pend.join : '';   // 초대 링크로 들어와 로그인한 길이면 그 초대를 이어서 연다
    location.replace(TRIPS + (jn ? '?join=' + jn : '')); return;
  }
  if (!C) { const hint = $('#cm-page .cm-hint'); if (hint) hint.textContent = tr('문제가 생겼어요. 잠시 뒤에 다시 해 주세요.'); return; }   // community.js 를 받지 못함
  C.init(host);
  if (root.MutationObserver) { const mo = new MutationObserver(() => syncHistory()); mo.observe($('#cm-sheet'), { attributes: true, attributeFilter: ['hidden'] }); mo.observe(document.body, { childList: true }); }   // 시트 · 사진 크게 보기가 열리고 닫힐 때
  const vv = root.visualViewport;
  if (vv) {   // 커뮤니티는 보이는 영역이 줄면 키보드가 올라온 것으로 본다. 화면을 확대했을 때는 그렇게 보지 않게 되돌린다(커뮤니티의 처리 뒤에 불린다)
    const unzoom = () => { if (vv.scale > 1.02) { const de = document.documentElement; de.classList.remove('pl-kb'); de.style.removeProperty('--pl-vt'); de.style.removeProperty('--pl-vh'); } };
    vv.addEventListener('resize', unzoom); vv.addEventListener('scroll', unzoom);
  }
  try { await C.show(); } catch (e) { host.nlog('show failed: ' + (e && e.message)); }
  const st = ST(); if (session && st && st.me && st.me.name && st.me.name !== session.name) { session = Object.assign({}, session, { name: st.me.name }); put(LS, KEY, JSON.stringify(session)); paintAccount(); }   // 앱에서 닉네임을 바꿨으면 따라간다
  const want = +QS.get('post');
  if (want > 0) { try { history.replaceState({ wv: 1, own: 1 }, '', location.pathname + location.search); } catch (e) { /* ignore */ } C.openPost(want); }
  if (!login) return;
  if (login.ok) { if (login.isNew) await askNickname(true); resume(login.pend); }
  else notice(tr('로그인하지 못했어요'), login.canceled ? tr('로그인을 끝내지 않고 돌아왔어요. 다시 해 보세요.') : tr('잠시 뒤에 다시 해 주세요.'));
}
boot();
})(typeof self !== 'undefined' ? self : window);
