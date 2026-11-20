/* planner-air.js — 공항 찾기. 화면·네트워크와 무관한 순수 함수(노드에서 시험한다). 자료는 web/data/airports.js(전 세계 정기편 공항, scripts/build_airports.py 가 만든다).
 *
 *   PlannerAir.search(A, q, lang)  → [{ code, name, city, cc, lat, lon }…]  (최대 8곳. 코드·공항 이름·도시 이름·다른 이름으로 찾는다. 큰 공항이 먼저)
 *   PlannerAir.match(A, text, lang) → { code, name, city, cc, lat, lon } | null   (표에서 읽은 "인천국제공항 T1" 같은 글자를 공항에 맞춘다)
 *   PlannerAir.byCode(A, code, lang)
 *
 * A 의 줄: [코드, 영어 이름, 한국어 이름, 일본어 이름, 도시(영어), 도시(한국어), 도시(일본어), 나라, 위도, 경도, 크기 L|M|S, 다른 이름]
 */
(function (root) {
'use strict';
const norm = (s) => String(s || '').toLowerCase().replace(/[\s\-.·'’,()]/g, '');
const SIZE = { L: 12, M: 5, S: 0 };
let idx = null, idxOf = null;   // 줄마다 미리 다듬어 둔 글자(검색할 때마다 다시 만들지 않게)
function index(A) {
  if (idxOf === A && idx) return idx;
  idx = A.map(a => ({ names: [norm(a[1]), norm(a[2]), norm(a[3])], cities: [norm(a[4]), norm(a[5]), norm(a[6])], alias: String(a[11] || '').split(' ').map(norm).filter(Boolean), keys: [akey(a[1]), akey(a[2]), akey(a[3])] }));
  idxOf = A; return idx;
}
function obj(a, lang) {
  const i = lang === 'ko' ? 2 : lang === 'ja' ? 3 : 1, c = lang === 'ko' ? 5 : lang === 'ja' ? 6 : 4;
  return { code: a[0], name: a[i] || a[1], city: a[c] || a[4], cc: a[7], lat: a[8], lon: a[9] };
}
function search(A, q, lang) {
  if (!A || !A.length) return [];
  const s = norm(q), up = String(q || '').trim().toUpperCase(); if (s.length < 2) return [];
  const ix = index(A); const out = [];
  for (let i = 0; i < A.length; i++) {
    const a = A[i], x = ix[i]; let sc = 0;
    if (a[0] === up) sc = 100;
    else {
      for (const h of x.names) if (h) { if (h.startsWith(s)) sc = Math.max(sc, 80); else if (h.includes(s)) sc = Math.max(sc, 50); }
      for (const h of x.cities) if (h) { if (h === s) sc = Math.max(sc, 85); else if (h.startsWith(s)) sc = Math.max(sc, 75); else if (h.includes(s)) sc = Math.max(sc, 45); }
      for (const h of x.alias) { if (h === s) sc = Math.max(sc, 82); else if (h.startsWith(s)) sc = Math.max(sc, 70); }
      if (!sc && up.length === 2 && a[0].startsWith(up)) sc = 30;
    }
    if (sc) out.push([sc + SIZE[a[10]], i]);
  }
  out.sort((p, r) => r[0] - p[0] || p[1] - r[1]);
  return out.slice(0, 8).map(p => obj(A[p[1]], lang));
}
// 공항 이름의 뼈대: 터미널 표시·'국제공항'·'Airport' 같은 말을 뗀다 ("인천국제공항 T1" → "인천", "New Chitose Airport I" → "newchitose")
function akey(s) {
  s = String(s || '').replace(/[(（][^)）]*[)）]/g, ' ').replace(/\s+(?:T\d|[A-Z]|[Il|]|제?\s*\d\s*(?:여객)?터미널|터미널\s*\d+|terminal\s*\d+|第\d+ターミナル)\s*$/i, '');
  return norm(s).replace(/international|intl|airport|국제공항|공항|国際空港|空港/g, '');
}
function byCode(A, code, lang) { const a = (A || []).find(x => x[0] === code); return a ? obj(a, lang) : null; }
function match(A, text, lang) {
  if (!A || !A.length || !text) return null;
  const m = /[(（]\s*([A-Z]{3})\s*[)）]/.exec(String(text)); if (m) { const hit = byCode(A, m[1], lang); if (hit) return hit; }   // "서울/인천(ICN)" 처럼 코드가 괄호 안에 있으면 그것
  const k = akey(text); if (k.length < 2) return null;
  const ix = index(A); let best = -1, bestSc = 0;
  for (let i = 0; i < A.length; i++) {
    let sc = 0;
    for (const h of ix[i].keys) { if (!h) continue; if (h === k) sc = Math.max(sc, 100); else if (k.length >= 4 && (h.endsWith(k) || h.startsWith(k))) sc = Math.max(sc, 60); else if (h.length >= 4 && (k.endsWith(h) || k.startsWith(h))) sc = Math.max(sc, 55); }
    if (!sc) continue; sc += SIZE[A[i][10]];
    if (sc > bestSc) { bestSc = sc; best = i; }
  }
  return best >= 0 ? obj(A[best], lang) : null;
}
root.PlannerAir = { search, match, byCode, akey, obj };
})(typeof self !== 'undefined' ? self : globalThis);
