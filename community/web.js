/* web.js — 여행여권 웹 커뮤니티의 호스트(웹 버전). 원본은 webver/web.js, 사이트의 community/web.js 는 scripts/build_web_community.py 가 복사한 것이다.
   커뮤니티 화면은 앱과 같은 파일(community.js)이 그린다. 앱에서는 app.js · account.js · i18n.js 가 해 주던 일을 여기서 브라우저에 맞게 맡는다:
   - window.I18N    한국어 원문이 키인 번역(ko · en · ja). 사전은 조립할 때 앱의 i18n.js 와 webver/l10n.json 에서 뽑아 data.js 에 넣는다.
   - window.Account 로그인 상태와 서버 호출. 로그인은 서버 중계다: ${서버}/auth/<제공자>/start?web=1&next=<이 페이지>&state=… 로 떠났다가
                    돌아온 주소의 1회용 코드(#code=…&state=…)를 POST /auth/exchange 로 세션 토큰과 바꿔 localStorage 에 둔다(앱과 같은 계정).
                    세션 토큰은 주소에 실리지 않는다. 로그아웃하면 서버의 세션도 지운다(POST /auth/logout).
   - Community.init(host)  tr · askConfirm · shareText · login · api · setBusy
   - 웹에만 있는 것: 머리 줄의 계정 버튼(로그인 · 닉네임 · 로그아웃 · 탈퇴), 브라우저 뒤로가기, 글 주소(…/community/post/번호 — 서버가 그려 주는
                    검색용 글 페이지와 같은 주소)와 공유 버튼, 앱에서만 되는 일(여행 일정 붙이기) 안내.
   화면 문구를 넣으면 webver/l10n.json 에도 넣는다(조립 스크립트가 빠진 문구를 알려 준다). 한국어 문구는 작은따옴표 문자열로만 적는다. */
(function (root) {
'use strict';
const CFG = root.WV_DATA || {};
// 이 페이지가 놓인 폴더(…/community/). 글을 열면 주소가 …/community/post/번호 로 바뀌므로, 상대 주소(../terms.html 등)가 늘 이 폴더 기준으로 풀리게 <base> 를 둔다
const ROOT = location.pathname.replace(/[^/]*$/, '');
(function () { const b = document.createElement('base'); b.href = location.origin + ROOT; document.head.insertBefore(b, document.head.firstChild); })();
const $ = (s, el) => (el || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);   // 개발용 주소에서 열었는지
const QS = new URLSearchParams(location.search);
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
  if (!LOCAL && location.origin !== CFG.origin) { location.href = CFG.origin + '/community/'; return new Promise(() => {}); }
  const cmt = $('#cm-cmt-in'); const state = randomState();
  const pend = { state, provider, at: Date.now(), act: lastAct, post: postId(), comment: cmt && cmt.value.trim() ? cmt.value : '' };
  if (!pending.set(JSON.stringify(pend))) return Promise.resolve({ error: tr('이 브라우저에서는 로그인할 수 없어요. 사이트 데이터(쿠키) 저장을 허용한 뒤 다시 해 주세요.') });
  // 돌아올 곳은 이 화면(…/community/)이다. 보던 글은 ?post=번호 로 싣는다 — …/community/post/번호 는 서버가 그리는 글 페이지라 코드를 받아 줄 수 없다
  const next = new URL(location.origin + ROOT + location.search); next.searchParams.delete('post'); if (pend.post) next.searchParams.set('post', String(pend.post));
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
  if (h.error || !h.code) { try { console.warn('[login] ' + (h.error || 'no code')); } catch (e) { /* ignore */ } return { error: h.error || 'failed', canceled: /denied|cancel/i.test(h.error || '') }; }
  let j = null;
  try { j = await api('POST', '/auth/exchange', { code: h.code, state: h.state }); } catch (e) { return { error: (e && e.code) || 'exchange' }; }
  if (!j || !j.token) return { error: 'exchange' };
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
let toastT = 0;
function toast(text) { const el = $('#cm-toast'); if (!el) return; el.textContent = text; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2400); }
const relock = () => { document.body.style.overflow = ((root.Community && root.Community.busy) || sheetOpen() || modal) ? 'hidden' : ''; };
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
  openModal(`<div class="sheet-title">${esc(tr('로그인'))}</div><p class="desc">${esc(tr('글과 댓글을 쓰면 포인트가 쌓여요. 읽기는 로그인 없이 할 수 있어요.'))}</p>
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
    <div class="rows wv-rows">${row('trips', tr('내 여행'))}${row('profile', tr('프로필 설정'))}${row('nick', tr('닉네임 바꾸기'))}${row('points', tr('내 포인트'))}${row('logout', tr('로그아웃'))}
      <button type="button" class="row tap" data-wv="delete"><span class="row-body"><span class="row-title danger">${esc(tr('회원 탈퇴'))}</span><span class="row-desc">${esc(tr('계정과 글·댓글·사진·포인트가 모두 지워져요.'))}</span></span><span class="chev"></span></button></div>
    <button type="button" class="btn secondary" data-wv="cancel">${esc(tr('닫기'))}</button>`,
  (v) => { if (v === 'trips') root.Community.openTrips(); else if (v === 'profile') root.Community.openProfile(); else if (v === 'nick') askNickname(false); else if (v === 'points') root.Community.openPoints(); else if (v === 'logout') { logout(); toast(tr('로그아웃했어요.')); reloadList(); } else if (v === 'delete') deleteAccount(); });
}
/** 회원 탈퇴: 무엇이 지워지는지 알리고 확인을 받은 뒤 서버에서 계정을 지운다(앱의 설정 › 회원 탈퇴와 같은 일) */
async function deleteAccount() {
  const ok = await askConfirm(tr('회원 탈퇴할까요?'), tr('계정과 지도 대결 통계, 커뮤니티에 쓴 글·댓글·사진과 포인트, 서버에 저장한 여행이 지워져요. 친구와 함께 보던 여행에서는 나만 빠져요. 되돌릴 수 없어요.'), tr('탈퇴하기'), true);
  if (!ok) return;
  try { await api('DELETE', '/me'); } catch (e) { if (!(e && e.status === 401)) { toast(tr('탈퇴하지 못했어요. 잠시 뒤에 다시 해 주세요.')); return; } }
  save(null); toast(tr('탈퇴했어요. 계정과 글이 지워졌어요.')); reloadList();
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
const isOpen = () => !!((root.Community && root.Community.busy) || sheetOpen() || $('#cm-viewer') || modal);
const TITLE = { page: document.title, short: '' };
const postPath = (id) => ROOT + 'post/' + id;
const urlPost = () => { const m = /\/post\/(\d{1,12})$/.exec(location.pathname); return m ? +m[1] : +new URLSearchParams(location.search).get('post') || 0; };   // 지금 주소가 가리키는 글 번호
function currentUrl() { const q = new URLSearchParams(location.search); q.delete('post'); const s = q.toString(); const id = postId(); return (id ? postPath(id) : ROOT) + (s ? '?' + s : ''); }
let backing = false, backT = 0;
function syncHistory() {
  if (backing) return;
  const open = isOpen(), has = !!(history.state && history.state.wv), first = has && !!history.state.own, url = currentUrl(), same = url === location.pathname + location.search;
  const st0 = ST(), deeper = (st0 && st0.stack.length > 1) || sheetOpen() || !!$('#cm-viewer') || !!modal;   // 들어온 글 위에 무언가 더 열렸는지(고치기 화면 · 시트 · 창)
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
  const C = root.Community; if (!C) return;
  if (isOpen()) { if (modal) closeModal(null); else C.back(); }   // 뒤로가기 → 맨 위에 열린 것 하나를 닫는다(쓰던 글이 있으면 커뮤니티가 먼저 물어본다)
  else { const id = urlPost(); if (id > 0 && history.state && history.state.wv) C.openPost(id); }   // 앞으로 가기 → 그 글을 다시 연다
  setTimeout(syncHistory, 0);
});
document.addEventListener('keydown', (e) => {
  if (e.isComposing) return;
  if (e.key === 'Escape') { if (modal) { e.preventDefault(); closeModal(null); } else if (($('#cm-viewer') || sheetOpen()) && root.Community) { e.preventDefault(); root.Community.back(); } }
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
async function boot() {
  const C = root.Community;
  document.documentElement.lang = I18N.lang; I18N.apply(document.body);
  TITLE.short = tr('여행여권 커뮤니티'); if (I18N.lang !== 'ko') { TITLE.page = TITLE.short; document.title = TITLE.page; }
  paintAccount();
  document.querySelectorAll('#wv-langs a[data-lang]').forEach((a) => { const u = new URL(location.origin + ROOT + location.search); u.searchParams.delete('post'); u.searchParams.set('lang', a.dataset.lang); a.href = u.pathname + u.search; if (a.dataset.lang === I18N.lang) a.setAttribute('aria-current', 'true'); });
  const skip = $('.wv-skip'); if (skip) skip.addEventListener('click', (e) => { e.preventDefault(); const t = $('#cm-page'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } });
  { const tl = $('#wv-trips'); if (tl) tl.addEventListener('click', (e) => { e.preventDefault(); root.Community.openTrips(); }); }
  $('#wv-account').addEventListener('click', (e) => { const el = e.target.closest('[data-wv]'); if (!el) return; if (el.dataset.wv === 'login') loginDialog(); else accountMenu(); });
  $('#wv-modal').addEventListener('click', (e) => {
    if (e.target.id === 'wv-modal-dim') { closeModal(null); return; }
    const lb = e.target.closest('.login[data-provider]'); if (lb) { loginFromDialog(lb.dataset.provider); return; }
    const el = e.target.closest('[data-wv]'); if (!el || el.disabled) return;
    if (MODAL_ACT[el.dataset.wv]) MODAL_ACT[el.dataset.wv](el); else closeModal(el.dataset.wv);
  });
  const login = await takeLoginResult();   // 로그인하고 돌아온 길이면 1회용 코드를 세션과 바꾼다(주소는 부르자마자 정리된다)
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
