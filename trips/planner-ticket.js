/* planner-ticket.js — 표(전자항공권·승선권·승차권)에서 꺼낸 글자를 이동 구간으로 읽는다. 화면·네트워크와 무관한 순수 함수(노드에서 시험한다).
 *
 *   PlannerTicket.parse(text, { lang, mode, year, today })
 *     → { segments: [{ mode, from, to, date, dep, arr, arrDate, flight, carrier, code }], ref, mode }
 *   PlannerTicket.split(segments) → { go: [...], back: [...] }   (구간 사이가 가장 크게 벌어진 곳에서 가는 편·오는 편을 나눈다)
 *
 * 글자는 기기 안에서 꺼낸다(네이티브: PDF 글자층 → 없으면 글자 인식). 여기서는
 *   ① 날짜·시각이 든 줄을 찾아 '순간'(날짜·시각·그 줄의 장소 글자)으로 만들고
 *   ② 이웃한 두 순간을 출발·도착으로 짝짓고
 *   ③ 그 근처의 편명(항공사 코드 + 숫자)과 예약 번호를 붙인다.
 * 표 모양은 회사마다 달라서 틀릴 수 있다. 화면은 읽은 내용을 칸에 채워 보여 주고 사람이 확인·수정하게 한다.
 */
(function (root) {
'use strict';

// 항공사 코드(IATA 두 글자) → [한국어, 영어]. 편명이 진짜인지 가리는 데 쓰고, 이름은 메모에 넣는다.
const AIRLINES = {
  KE: ['대한항공', 'Korean Air'], OZ: ['아시아나항공', 'Asiana Airlines'], '7C': ['제주항공', 'Jeju Air'], LJ: ['진에어', 'Jin Air'], TW: ['티웨이항공', "T'way Air"], BX: ['에어부산', 'Air Busan'],
  RS: ['에어서울', 'Air Seoul'], ZE: ['이스타항공', 'Eastar Jet'], YP: ['에어프레미아', 'Air Premia'], RF: ['에어로케이', 'Aero K'], '4V': ['플라이강원', 'Fly Gangwon'],
  JL: ['일본항공', 'Japan Airlines'], NH: ['전일본공수', 'ANA'], MM: ['피치항공', 'Peach'], GK: ['젯스타 재팬', 'Jetstar Japan'], ZG: ['집에어', 'ZIPAIR'], BC: ['스카이마크', 'Skymark'], IJ: ['스프링 재팬', 'Spring Japan'], '7G': ['스타플라이어', 'StarFlyer'], HD: ['에어두', 'AIRDO'], '6J': ['솔라시드에어', 'Solaseed Air'],
  CA: ['중국국제항공', 'Air China'], MU: ['중국동방항공', 'China Eastern'], CZ: ['중국남방항공', 'China Southern'], HU: ['하이난항공', 'Hainan Airlines'], MF: ['샤먼항공', 'Xiamen Air'], ZH: ['선전항공', 'Shenzhen Airlines'], SC: ['산둥항공', 'Shandong Airlines'], HO: ['준야오항공', 'Juneyao Air'], '9C': ['춘추항공', 'Spring Airlines'], '3U': ['쓰촨항공', 'Sichuan Airlines'],
  CI: ['중화항공', 'China Airlines'], BR: ['에바항공', 'EVA Air'], IT: ['타이거에어 타이완', 'Tigerair Taiwan'], JX: ['스타럭스항공', 'STARLUX'], CX: ['캐세이퍼시픽', 'Cathay Pacific'], HX: ['홍콩항공', 'Hong Kong Airlines'], UO: ['홍콩익스프레스', 'HK Express'], NX: ['에어마카오', 'Air Macau'],
  TG: ['타이항공', 'Thai Airways'], FD: ['타이 에어아시아', 'Thai AirAsia'], XJ: ['타이 에어아시아 엑스', 'Thai AirAsia X'], SL: ['타이 라이온에어', 'Thai Lion Air'], VZ: ['타이 비엣젯', 'Thai Vietjet'],
  VN: ['베트남항공', 'Vietnam Airlines'], VJ: ['비엣젯항공', 'Vietjet Air'], QH: ['뱀부항공', 'Bamboo Airways'], SQ: ['싱가포르항공', 'Singapore Airlines'], TR: ['스쿠트', 'Scoot'],
  MH: ['말레이시아항공', 'Malaysia Airlines'], AK: ['에어아시아', 'AirAsia'], D7: ['에어아시아 엑스', 'AirAsia X'], OD: ['바틱에어 말레이시아', 'Batik Air Malaysia'], PR: ['필리핀항공', 'Philippine Airlines'], '5J': ['세부퍼시픽', 'Cebu Pacific'], Z2: ['필리핀 에어아시아', 'Philippines AirAsia'],
  GA: ['가루다 인도네시아', 'Garuda Indonesia'], QZ: ['인도네시아 에어아시아', 'Indonesia AirAsia'], AI: ['에어인디아', 'Air India'], OM: ['미아트 몽골항공', 'MIAT Mongolian Airlines'],
  AA: ['아메리칸항공', 'American Airlines'], UA: ['유나이티드항공', 'United Airlines'], DL: ['델타항공', 'Delta Air Lines'], HA: ['하와이안항공', 'Hawaiian Airlines'], AS: ['알래스카항공', 'Alaska Airlines'], AC: ['에어캐나다', 'Air Canada'], AM: ['아에로멕시코', 'Aeromexico'],
  AF: ['에어프랑스', 'Air France'], KL: ['KLM 네덜란드항공', 'KLM'], LH: ['루프트한자', 'Lufthansa'], BA: ['영국항공', 'British Airways'], AY: ['핀에어', 'Finnair'], LO: ['LOT 폴란드항공', 'LOT Polish Airlines'], LX: ['스위스항공', 'SWISS'], OS: ['오스트리아항공', 'Austrian Airlines'],
  AZ: ['ITA 항공', 'ITA Airways'], IB: ['이베리아항공', 'Iberia'], SK: ['스칸디나비아항공', 'SAS'], TP: ['TAP 포르투갈항공', 'TAP Air Portugal'], TK: ['터키항공', 'Turkish Airlines'],
  EK: ['에미레이트항공', 'Emirates'], QR: ['카타르항공', 'Qatar Airways'], EY: ['에티하드항공', 'Etihad Airways'], ET: ['에티오피아항공', 'Ethiopian Airlines'], QF: ['콴타스항공', 'Qantas'], JQ: ['젯스타', 'Jetstar'], NZ: ['에어뉴질랜드', 'Air New Zealand'],
};

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MON = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const p2 = (n) => String(n).padStart(2, '0');
const okDate = (y, m, d) => y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
const ymd = (y, m, d) => y + '-' + p2(m) + '-' + p2(d);
const addDay = (s, n) => { const a = s.split('-').map(Number); const d = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n)); return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
const minutes = (date, time) => { const a = date.split('-').map(Number), b = time.split(':').map(Number); return Date.UTC(a[0], a[1] - 1, a[2], b[0], b[1]) / 60000; };

/** 한 줄에서 날짜를 찾는다 → [{ i, n, date }] (i = 시작 위치, n = 길이) */
function findDates(line, o) {
  const out = []; const taken = (i, n) => out.some(x => i < x.i + x.n && x.i < i + n);
  const push = (m, y, mo, d) => { if (okDate(y, mo, d) && !taken(m.index, m[0].length)) out.push({ i: m.index, n: m[0].length, date: ymd(y, mo, d) }); };
  let m;
  const r1 = /(\d{4})\s*[년年./-]\s*(\d{1,2})\s*[월月./-]\s*(\d{1,2})\s*[일日]?/g;   // 2026년 11월 29일 · 2026-11-29 · 2026.11.29 · 2026年11月29日
  while ((m = r1.exec(line))) push(m, +m[1], +m[2], +m[3]);
  const r2 = new RegExp(MON + '\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})(?!\\d)', 'gi');   // November 29, 2026 (글자 인식은 'November 29,2026' 처럼 빈칸을 빼먹기도 한다)
  while ((m = r2.exec(line))) push(m, +m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]);
  const r3 = new RegExp('(\\d{1,2})\\s*' + MON + '\\.?,?\\s*(\\d{4}|\\d{2})(?!\\d)', 'gi');   // 29 Nov 2026 · 29NOV26
  while ((m = r3.exec(line))) push(m, m[3].length === 2 ? 2000 + +m[3] : +m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
  const r4 = /(\d{1,2})\s*[월月]\s*(\d{1,2})\s*[일日]/g;   // 해가 없는 날짜: 11월 29일 → 여행 해(없으면 올해, 한참 지난 날짜면 내년)
  while ((m = r4.exec(line))) {
    if (taken(m.index, m[0].length)) continue;
    let y = o.year; const mo = +m[1], d = +m[2];
    if (!y) { const t = (o.today || '').split('-').map(Number); y = t[0] || new Date().getFullYear(); if (t[0] && (mo < t[1] - 6)) y++; }
    push(m, y, mo, d);
  }
  return out.sort((a, b) => a.i - b.i);
}

/** 한 줄에서 시각을 찾는다 → [{ i, n, time }] */
function findTimes(line) {
  const out = []; let m;
  const r1 = /(오전|오후|午前|午後|AM|PM|am|pm)?\s*(\d{1,2})\s*[:：]\s*(\d{2})(?!\d)\s*(AM|PM|am|pm|a\.m\.|p\.m\.)?/g;
  while ((m = r1.exec(line))) {
    let h = +m[2]; const mi = +m[3]; const ap = (m[1] || m[4] || '').toLowerCase().replace(/\./g, '');
    const pm = ap === 'pm' || ap === '오후' || ap === '午後', am = ap === 'am' || ap === '오전' || ap === '午前';
    if (pm && h < 12) h += 12; if (am && h === 12) h = 0;
    if (h > 23 || mi > 59) continue;
    const lead = m[0].length - m[0].trimStart().length;   // 앞에 붙은 공백은 뺀다
    out.push({ i: m.index + lead, n: m[0].length - lead, time: p2(h) + ':' + p2(mi) });
  }
  const r2 = /(오전|오후|午前|午後)?\s*(\d{1,2})\s*[시時](?!간|間)\s*(?:(\d{1,2})\s*분?)?/g;   // 7시 40분 (3시간 같은 '걸리는 시간'은 뺀다)
  while ((m = r2.exec(line))) {
    if (out.some(x => m.index < x.i + x.n && x.i < m.index + m[0].length)) continue;
    let h = +m[2]; const mi = m[3] ? +m[3] : 0; const pm = m[1] === '오후' || m[1] === '午後', am = m[1] === '오전' || m[1] === '午前';
    if (pm && h < 12) h += 12; if (am && h === 12) h = 0;
    if (h > 23 || mi > 59) continue;
    const lead = m[0].length - m[0].trimStart().length;
    out.push({ i: m.index + lead, n: m[0].length - lead, time: p2(h) + ':' + p2(mi) });
  }
  return out.sort((a, b) => a.i - b.i);
}

const DEP_RE = /(출발|출항|승선|탑승|departure|departs?|depart|出発|出港|乗船|発)/i, ARR_RE = /(도착|입항|하선|arrival|arrives?|arrive|到着|入港|着)/i;
const LABEL_RE = /(출발\s*일시|도착\s*일시|출발\s*일자?|도착\s*일자?|출발\s*시각|도착\s*시각|출발\s*시간|도착\s*시간|도착\s*예정(?:\s*시각)?|출발\s*예정(?:\s*시각)?|출발지|도착지|출발|도착|출항|입항|예정|일시|시각|시간|scheduled|departure|arrival|departs?|arrives?|date|time|ETD|ETA|出発|到着|出港|入港|予定)\s*[:：]?/gi;
const WEEK_RE = /[(（]\s*(?:[월화수목금토일]|[月火水木金土日]|mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*[)）]|[월화수목금토일]요일|[月火水木金土日]曜日?|\b(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\b\.?,?/gi;

/** 그 줄에서 날짜·시각·딱지를 뺀 나머지 = 장소 글자 */
const FLIGHT_RE = /(?<![A-Za-z0-9])([A-Z]{2}|[A-Z]\d|\d[A-Z])[ -]?(\d{2,4})(?![0-9A-Za-z년年])/g;
const WORD_RE = /(편명|항공편|항공사|운항\s*항공사|flight\s*(?:no\.?|number)?|flt\.?|airline|carrier|便名|航空会社)\s*[:：]?/gi;
function cleanPlace(s) {
  s = String(s || '').replace(FLIGHT_RE, (m, a) => (AIRLINES[a] ? ' ' : m)).replace(WORD_RE, ' ').replace(WEEK_RE, ' ').replace(LABEL_RE, ' ').replace(/[→➔➝▶⇒>~〜–—|]+|->/g, ' ');
  s = s.replace(/(^|\s)[発着](?=\s|$)/g, ' ').replace(/\s+/g, ' ');
  s = s.replace(/^[\s,.:;·\-/()（）\[\]]+|[\s,.:;·\-/(（\[]+$/g, '').trim();
  if (!/[A-Za-z가-힣ぁ-んァ-ヶ一-龥]/.test(s) || (s.length < 2 && !/[一-龥]/.test(s))) return '';   // 한 글자만 남은 것은 딱지의 찌꺼기다(한자 한 글자 지명은 둔다)
  return s.slice(0, 40).trim();
}

/** 글자 전체 → 순간들 [{ line, date, time, place, dep, arr }] */
function moments(lines, o) {
  const out = []; let cur = null, curLine = -99;   // 가장 최근에 본 날짜(시각만 있는 줄에 쓴다)
  lines.forEach((line, li) => {
    const ds = findDates(line, o), ts = findTimes(line).filter(t => !ds.some(d => t.i < d.i + d.n && d.i < t.i + t.n));
    if (ds.length) { cur = ds[ds.length - 1].date; curLine = li; }
    if (!ts.length) return;
    const dep = DEP_RE.test(line), arr = ARR_RE.test(line);
    // 날짜 글자를 같은 길이의 빈칸으로 가려 둔 줄(자리 번호가 그대로 맞는다)
    let bare = line; for (const d of ds) bare = bare.slice(0, d.i) + ' '.repeat(d.n) + bare.slice(d.i + d.n);
    const last = ts[ts.length - 1];
    // 시각이 둘 이상인 줄에서 장소가 시각 앞에 오는 모양(서울 08:30 → 부산 12:50)인지: 첫 시각 앞에 글자가 있고 마지막 시각 뒤에는 없다
    const lead = ts.length > 1 && !!cleanPlace(bare.slice(0, ts[0].i)) && !cleanPlace(bare.slice(last.i + last.n));
    ts.forEach((t, k) => {
      // 그 시각에 맞는 날짜: 같은 줄에서 시각 앞의 가장 가까운 날짜 → 뒤의 날짜 → 앞 줄들에서 이어받은 날짜
      const before = ds.filter(d => d.i < t.i).pop(), after = ds.find(d => d.i > t.i);
      const date = (before || after || {}).date || (li - curLine <= 4 ? cur : null) || null;
      // 장소: 이 시각 뒤부터 다음 시각 앞까지(장소가 앞에 오는 모양이면 앞 시각 뒤부터 이 시각 앞까지). 없으면 줄 전체에서 날짜·시각을 뺀 것
      const prev = ts[k - 1], next = ts[k + 1];
      const seg = lead ? bare.slice(prev ? prev.i + prev.n : 0, t.i) : bare.slice(t.i + t.n, next ? next.i : bare.length);
      let place = cleanPlace(seg);
      if (!place && ts.length === 1) { let rest = line; for (const x of ds.concat([t]).sort((a, b) => b.i - a.i)) rest = rest.slice(0, x.i) + ' ' + rest.slice(x.i + x.n); place = cleanPlace(rest); }
      out.push({ line: li, date, time: t.time, place, dep: dep && !arr, arr: arr && !dep });
    });
  });
  return out;
}

/** 편명: 항공사 코드 + 숫자(ZE621, 7C 1302). 터미널(T1)·예약 번호 안의 글자는 걸러낸다 */
function flights(lines) {
  const out = []; const re = new RegExp(FLIGHT_RE.source, 'g');
  lines.forEach((line, li) => {
    let m; const keyed = /편명|항공편|항공사|flight|airline|便名|航空/i.test(line);
    while ((m = re.exec(line))) if (AIRLINES[m[1]] || (keyed && !/^T\d$/.test(m[1]))) out.push({ line: li, code: m[1], no: m[1] + m[2] });
  });
  return out;
}

/** 예약 번호: ① e티켓 번호 바로 뒤의 글자(항공사 예약번호) ② '예약번호·PNR·Booking Reference' 뒤의 글자 섞인 번호 ③ 숫자뿐인 예약 번호 */
function bookingRef(text) {
  let m = /\b\d{3}-?\d{10}\s+([A-Z0-9]{5,7})\b/.exec(text); if (m && /[A-Z]/.test(m[1])) return m[1];
  const key = /(PNR|예약\s*(?:번호|코드)|예매\s*번호|승차권\s*번호|booking\s*(?:reference|ref\.?|no\.?|number|code|id)|reservation\s*(?:number|no\.?|code|id)|itinerary\s*(?:number|no\.?)|confirmation\s*(?:number|no\.?|code)|record\s*locator|予約番号|確認番号)/gi;
  let num = '';
  while ((m = key.exec(text))) {
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 90);
    const mix = /(?<![A-Za-z0-9])(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{5,14}(?![A-Za-z0-9])/.exec(tail); if (mix) return mix[0];
    const dig = /(?<![A-Za-z\d-])\d{6,16}(?![A-Za-z\d-])/.exec(tail); if (dig && !num) num = dig[0];
    const dot = /(?<![\d.])\d{3,4}\.\d{3}\.\d{3}(?![\d.])/.exec(tail); if (dot && !num) num = dot[0];   // 부킹닷컴: 4321.567.890
  }
  return num;
}

const MODE_WORDS = [['ferry', /승선권|여객선|페리|ferry|vessel|フェリー|乗船券|船/i], ['train', /KTX|SRT|열차|철도|新幹線|railway|\brail\b|\btrain\b|列車|特急/i], ['bus', /버스|\bbus\b|バス|\bcoach\b/i], ['plane', /항공|e-?티켓|탑승권|flight|airline|e-?ticket|boarding pass|航空|搭乗/i]];

function parse(text, opts) {
  const o = opts || {}; const raw = String(text || '').replace(/\r/g, '').replace(/[ 　]/g, ' ');
  const lines = raw.split('\n').map(s => s.trim());
  const ms = moments(lines, o), fl = flights(lines);
  // 이웃한 두 순간을 출발·도착으로 짝짓는다. 딱지가 분명하면(출발만, 도착만) 그것을 따른다
  const segs = []; let i = 0;
  while (i < ms.length) {
    const a = ms[i], b = ms[i + 1];
    if (!a.date) { i++; continue; }
    if (a.arr && !a.dep) { i++; continue; }   // 도착만 있는 줄이 먼저 오면 건너뛴다
    let pair = null;
    if (b && !(b.dep && !b.arr)) {
      const bd = b.date || a.date; const gap = minutes(bd, b.time) - minutes(a.date, a.time);
      if (gap > -16 * 60 && gap <= 36 * 60 && b.line - a.line <= 6) pair = { b, bd };   // 시차 때문에 도착이 더 이를 수도 있다
    }
    if (pair) { segs.push({ a, b: pair.b, date: a.date, dep: a.time, arr: pair.b.time, arrDate: pair.bd, from: a.place, to: pair.b.place, l0: a.line, l1: pair.b.line }); i += 2; }
    else { segs.push({ a, b: null, date: a.date, dep: a.time, arr: '', arrDate: '', from: a.place, to: '', l0: a.line, l1: a.line }); i++; }
  }
  // 날짜·시각 줄에 장소가 없으면 근처의 '출발지 → 도착지' 줄에서 찾는다
  const route = (l0, l1) => {
    for (let li = Math.max(0, l0 - 4); li <= Math.min(lines.length - 1, l1 + 3); li++) {
      const line = lines[li]; if (findTimes(line).length || findDates(line, o).length) continue;
      const m = /^(.{2,30}?)\s*(?:→|➔|➝|⇒|▶|->|~|〜|—|–| - )\s*(.{2,30})$/.exec(line); if (!m) continue;
      const a = cleanPlace(m[1]), b = cleanPlace(m[2]); if (a && b) return [a, b];
    }
    return null;
  };
  for (const s of segs) if (!s.from || (!s.to && s.arr)) { const r = route(s.l0, s.l1); if (r) { s.from = s.from || r[0]; s.to = s.to || r[1]; } }
  // 편명 붙이기: 그 구간 뒤(다음 구간 앞까지)의 가장 가까운 편명 → 없으면 구간 앞(앞 구간 뒤까지)의 가장 가까운 편명
  // 같은 줄에 있으면 그것. 아니면 표의 버릇을 따른다: 첫 편명이 첫 구간보다 앞에 나오면 '편명이 구간 앞', 아니면 '구간 뒤'
  const used = new Set(); const lead = fl.length && segs.length && fl[0].line < segs[0].l0;
  segs.forEach((s, k) => {
    const lo = k ? segs[k - 1].l1 : -1, hi = k + 1 < segs.length ? segs[k + 1].l0 : lines.length;
    const same = fl.filter(f => !used.has(f) && f.line >= s.l0 && f.line <= s.l1)[0];
    const after = fl.filter(f => !used.has(f) && f.line > s.l1 && f.line < hi)[0], before = fl.filter(f => !used.has(f) && f.line > lo && f.line < s.l0).pop();
    const f = same || (lead ? before || after : after || before); if (f) { used.add(f); s.flight = f.no; s.carrier = (AIRLINES[f.code] || [])[o.lang === 'ko' || !o.lang ? 0 : 1] || ''; }
  });
  // 같은 구간이 두 번(한국어판 + 영문판) 나오면 화면 언어에 맞는 쪽을 남긴다
  const want = o.lang === 'en' ? /^[\x20-\x7e]+$/ : o.lang === 'ja' ? /[ぁ-んァ-ヶ一-龥]/ : /[가-힣]/;
  const by = new Map();
  for (const s of segs) {
    const k = s.date + ' ' + s.dep + ' ' + s.arr; const old = by.get(k);
    if (!old) { by.set(k, s); continue; }
    const score = (x) => (want.test(x.from + x.to) ? 2 : 0) + (x.flight ? 1 : 0);
    if (score(s) > score(old)) by.set(k, Object.assign(s, { flight: s.flight || old.flight, carrier: s.carrier || old.carrier })); else { old.flight = old.flight || s.flight; old.carrier = old.carrier || s.carrier; }
  }
  const ref = bookingRef(raw);
  let mode = fl.length ? 'plane' : ''; if (!mode) for (const [k, re] of MODE_WORDS) if (re.test(raw)) { mode = k; break; }
  const segments = Array.from(by.values()).sort((x, y) => minutes(x.date, x.dep) - minutes(y.date, y.dep)).map(s => {
    const m = s.flight ? 'plane' : (mode || o.mode || '');
    return { mode: m, from: s.from, to: s.to, date: s.date, dep: s.dep, arr: s.arr, arrDate: s.arr && s.arrDate && s.arrDate !== s.date ? s.arrDate : '', flight: s.flight || '', carrier: s.carrier || '', code: [s.flight, ref].filter(Boolean).join(' · ').slice(0, 40) };
  });
  return { segments, ref, mode: mode || (segments[0] && segments[0].mode) || '' };
}

/** 가는 편 · 오는 편 나누기: 구간이 둘 이상이면 출발 시각 사이가 가장 크게(20시간 넘게) 벌어진 곳에서 자른다 */
function split(segments) {
  const s = segments || []; if (s.length < 2) return { go: s.slice(), back: [] };
  let at = -1, best = 20 * 60;
  for (let i = 1; i < s.length; i++) { const g = minutes(s[i].date, s[i].dep) - minutes(s[i - 1].date, s[i - 1].dep); if (g > best) { best = g; at = i; } }
  return at < 0 ? { go: s.slice(), back: [] } : { go: s.slice(0, at), back: s.slice(at) };
}

/** 숙소 예약 확인서: 체크인·체크아웃 날짜와 예약 번호 → { checkin, checkout, ref }
 *  '체크인'·'체크아웃' 딱지 뒤(같은 줄이나 세 줄 안)에 처음 나오는 날짜를 그 값으로 본다. 딱지가 한 줄에 나란히 있으면(표 머리글) 날짜도 그 순서로 짝짓는다.
 *  딱지가 없으면 '2026.11.29 ~ 2026.12.03' 처럼 한 줄에 날짜가 둘 있고 뒤가 더 늦은(60일 안) 첫 줄을 쓴다. 예약한 날 같은 다른 날짜를 집지 않으려고 그보다 느슨하게는 읽지 않는다. */
const IN_RE = /체크\s*인|입실|check\s*-?\s*in|チェックイン|入住|入住日/gi, OUT_RE = /체크\s*아웃|퇴실|check\s*-?\s*out|チェックアウト|退房/gi;
function stay(text, opts) {
  const o = opts || {}; const raw = String(text || '').replace(/\r/g, '').replace(/[ 　]/g, ' '); const lines = raw.split('\n');
  const toks = [];   // 딱지와 날짜를 글에 나오는 순서대로
  lines.forEach((line, li) => {
    let m; IN_RE.lastIndex = 0; OUT_RE.lastIndex = 0;
    while ((m = IN_RE.exec(line))) toks.push({ li, i: m.index, k: 'in' });
    while ((m = OUT_RE.exec(line))) toks.push({ li, i: m.index, k: 'out' });
    for (const d of findDates(line, o)) toks.push({ li, i: d.i, k: 'date', date: d.date });
  });
  toks.sort((a, b) => a.li - b.li || a.i - b.i);
  const got = { in: '', out: '' }; let wait = [];
  for (const t of toks) {
    if (t.k !== 'date') { if (!got[t.k] && !wait.some(w => w.k === t.k)) wait.push(t); continue; }
    wait = wait.filter(w => t.li - w.li <= 3); const w = wait.shift(); if (w) got[w.k] = t.date;
  }
  let checkin = got.in, checkout = got.out;
  if (!checkin && !checkout) {
    for (const line of lines) {
      const ds = findDates(line, o); if (ds.length < 2) continue;
      const gap = (minutes(ds[1].date, '00:00') - minutes(ds[0].date, '00:00')) / 1440;
      if (gap >= 1 && gap <= 60) { checkin = ds[0].date; checkout = ds[1].date; break; }
    }
  }
  if (checkin && checkout && checkout <= checkin) checkout = '';
  return { checkin, checkout, ref: bookingRef(raw), name: labeled(lines, NAME_STRONG, NAME_WEAK, 60), addr: labeled(lines, ADDR_STRONG, null, 160) };
}

// 숙소 이름·주소: '숙소명'·'Hotel name'·'ホテル名'·'주소'·'Address' 같은 딱지 뒤(같은 줄, 비었으면 다음 두 줄 안)의 글자.
// '호텔'·'Hotel'·'Property' 처럼 흔한 낱말은 쌍점(:)이 붙었을 때만 딱지로 본다('Hotel policies' 같은 줄을 이름으로 읽지 않게). 딱지가 없는 확인서는 읽지 않는다(사람이 적는다)
const NAME_STRONG = /^\s*(?:숙소\s*(?:명|이름)|호텔\s*(?:명|이름)|숙박\s*시설\s*(?:명|이름)?|hotel\s*name|property\s*name|accommodation\s*name|name\s+of\s+(?:the\s+)?(?:hotel|property)|ホテル名|施設名|宿泊施設名?|宿泊先|酒店名称|住宿名称)\s*[:：]?\s*(.*)$/i;
const NAME_WEAK = /^\s*(?:숙소|호텔|hotel|property|accommodation|ホテル|宿泊施設|酒店)\s*[:：]\s*(.*)$/i;
const ADDR_STRONG = /^\s*(?:(?:숙소|호텔)\s*)?주\s*소|^\s*(?:(?:hotel|property)\s+)?address|^\s*住\s*所|^\s*所在地|^\s*地址/i;
const LABELISH = /체크\s*인|체크\s*아웃|check\s*-?\s*(?:in|out)|チェック|예약\s*번호|\bbooking\b|\breservation\b|\bconfirmation\b|電話|전화|\bphone\b|\btel\b|e-?mail|^\s*(?:주\s*소|address|住\s*所)/i;
function labeled(lines, strong, weak, max) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; let rest = null;
    if (strong.source.indexOf('(.*)$') > 0) { const m = strong.exec(line) || (weak && weak.exec(line)); if (m) rest = m[1]; }
    else { const m = strong.exec(line); if (m) rest = line.slice(m.index + m[0].length).replace(/^\s*[:：]?\s*/, ''); }
    if (rest == null) continue;
    let v = clean(rest);
    for (let k = 1; !v && k <= 2 && i + k < lines.length; k++) v = clean(lines[i + k]);
    if (v) return v.slice(0, max);
  }
  return '';
  function clean(x) {
    const v = String(x || '').replace(/\s+/g, ' ').replace(/^[\s:：\-–·|]+|[\s|]+$/g, '').trim();
    if (v.length < 2 || /^[\d\s.:\-/]+$/.test(v) || LABELISH.test(v) || findDates(v, {}).length) return '';
    return v;
  }
}

/** 나라 → 그 나라에서 주로 쓰는 말(확인서의 '현지어 판'을 앞에 두고, 택시 화면에서 먼저 보여 줄 때). 표에 없으면 영어 */
const CC_LANG = {
  KR: 'ko', JP: 'ja', CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'en', TH: 'th', VN: 'vi', ID: 'id', MY: 'ms', PH: 'en', KH: 'km', LA: 'lo', MM: 'my', MN: 'mn', IN: 'hi', NP: 'ne', LK: 'si', BD: 'bn', MV: 'dv',
  US: 'en', GB: 'en', IE: 'en', AU: 'en', NZ: 'en', CA: 'en', ZA: 'en', GU: 'en', MP: 'en', FJ: 'en',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', CH: 'de', DE: 'de', AT: 'de', LI: 'de', NL: 'nl', ES: 'es', MX: 'es', AR: 'es', CL: 'es', CO: 'es', PE: 'es', CU: 'es', IT: 'it', SM: 'it', VA: 'it', MT: 'mt', PT: 'pt', BR: 'pt',
  RU: 'ru', UA: 'uk', BY: 'ru', KZ: 'kk', UZ: 'uz', KG: 'ky', TR: 'tr', GR: 'el', CY: 'el', PL: 'pl', CZ: 'cs', SK: 'sk', HU: 'hu', RO: 'ro', BG: 'bg', HR: 'hr', SI: 'sl', RS: 'sr', BA: 'bs', ME: 'sr', AL: 'sq', MK: 'mk',
  SE: 'sv', NO: 'nb', DK: 'da', FI: 'fi', IS: 'is', EE: 'et', LV: 'lv', LT: 'lt',
  AE: 'ar', SA: 'ar', QA: 'ar', EG: 'ar', MA: 'ar', JO: 'ar', OM: 'ar', KW: 'ar', BH: 'ar', TN: 'ar', IL: 'he', IR: 'fa', GE: 'ka', AM: 'hy', AZ: 'az',
};
const localLang = (cc) => CC_LANG[String(cc || '').toUpperCase()] || 'en';

// 글자 모양으로 가르는 말(그 글자가 20자 넘게 나오면) — 키릴 문자는 우크라이나어 글자(і ї є ґ)가 보이면 우크라이나어
const SCRIPT_LANGS = [['th', /[฀-๿]/g], ['ru', /[Ѐ-ӿ]/g], ['el', /[Ͱ-Ͽ]/g], ['ar', /[؀-ۿ]/g], ['he', /[֐-׿]/g], ['hi', /[ऀ-ॿ]/g],
  ['km', /[ក-៿]/g], ['lo', /[຀-໿]/g], ['my', /[က-႟]/g], ['ka', /[Ⴀ-ჿ]/g], ['hy', /[԰-֏]/g]];
// 로마자로 쓰는 말: 예약 확인서에 흔한 낱말(그 말에만 있는 것 위주)과 그 말에만 있는 글자를 센다
const LATIN_WORDS = {
  en: 'the and your of for booking reservation confirmation check-in check-out guest guests room nights night address total price paid cancellation property',
  fr: 'les des et du votre vos réservation arrivée départ chambre nuits nuit adresse prix annulation séjour établissement',
  de: 'der die das und für ihre buchung anreise abreise zimmer nächte nacht adresse preis stornierung unterkunft',
  es: 'los las del y su reserva llegada salida habitación noches noche dirección precio cancelación alojamiento',
  it: 'il gli della del sua prenotazione arrivo partenza camera notti notte indirizzo prezzo cancellazione struttura',
  pt: 'os do da sua reserva chegada saída quarto noites noite endereço preço cancelamento hospedagem',
  nl: 'het en van uw reservering boeking aankomst vertrek kamer nachten adres prijs annulering accommodatie',
  vi: 'và của đặt phòng nhận trả khách đêm địa chỉ giá hủy chỗ',
  id: 'dan yang untuk anda pemesanan kamar tamu malam alamat harga pembatalan menginap tanggal',
  ms: 'dan yang untuk anda tempahan bilik tetamu malam alamat harga pembatalan daftar tarikh',
  tr: 've bir için rezervasyon oda giriş çıkış gece adres fiyat iptal konaklama',
  pl: 'oraz rezerwacja przyjazd wyjazd pokój noce adres cena anulowanie zakwaterowanie',
  cs: 'rezervace příjezd odjezd pokoj noci adresa cena zrušení ubytování',
  sv: 'och att för din bokning ankomst avresa rum nätter adress pris avbokning boende',
};
const LATIN_MARKS = { vi: /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/gi, pl: /[ąęłśźżćń]/gi, cs: /[řůě]/gi, tr: /[şğı]/gi, de: /[ß]/g, es: /[ñ¿¡]/gi, pt: /[ãõ]/gi, fr: /[çœ]/gi };
const LATIN_RE = Object.fromEntries(Object.entries(LATIN_WORDS).map(([k, w]) => [k, new RegExp('(?<![\\p{L}])(?:' + w.split(' ').join('|') + ')(?![\\p{L}])', 'giu')]));
// 파일 이름의 언어 표시(글자를 못 읽었을 때): booking_th.pdf, Confirmation-French.pdf, 예약확인서_태국어.pdf …
const NAME_LANGS = [['ko', 'ko|kr|kor|korean', '한국어|한글'], ['ja', 'ja|jp|jpn|japanese', '일본어|日本語'], ['en', 'en|eng|english', '영어'], ['zh', 'zh|cn|chn|chinese', '중국어|中文'], ['th', 'th|tha|thai', '태국어'],
  ['vi', 'vi|vn|vie|vietnamese', '베트남어'], ['fr', 'fr|fra|french', '프랑스어'], ['de', 'de|deu|ger|german', '독일어'], ['es', 'es|spa|spanish', '스페인어'], ['it', 'it|ita|italian', '이탈리아어'], ['pt', 'pt|por|portuguese', '포르투갈어'],
  ['ru', 'ru|rus|russian', '러시아어'], ['id', 'id|ind|indonesian', '인도네시아어'], ['ms', 'ms|msa|malay', '말레이어'], ['tr', 'tr|tur|turkish', '튀르키예어|터키어']];

/** 파일이 무슨 말로 쓰였는지(같은 확인서의 한국어·영어·현지어 판을 나눠 두려고): 글자 모양 → 로마자는 흔한 낱말 → 못 읽었으면 파일 이름. 모르면 '' */
function docLang(text, name) {
  const s = String(text || ''); const cnt = (re) => (s.match(re) || []).length;
  const ko = cnt(/[가-힣]/g), kana = cnt(/[぀-ヿ]/g), han = cnt(/[一-鿿]/g), lat = cnt(/[A-Za-zÀ-ɏḀ-ỿ]/g);
  if (ko >= 20 && ko >= kana) return 'ko';
  if (kana >= 15) return 'ja';
  let best = '', top = 0;
  for (const [k, re] of SCRIPT_LANGS) { const n = cnt(re); if (n > top) { top = n; best = k; } }
  if (top >= 20 && top >= han) return best === 'ru' && cnt(/[іїєґ]/gi) >= 3 ? 'uk' : best;
  if (han >= 30) return 'zh';
  if (lat >= 40) {
    const score = {}; for (const k in LATIN_RE) score[k] = cnt(LATIN_RE[k]) + 2 * cnt(LATIN_MARKS[k] || /$^/g);
    const order = Object.keys(score).sort((x, y) => score[y] - score[x] || (y === 'en') - (x === 'en'));
    if (score[order[0]] >= 3) return order[0];
    if (lat >= 60) return 'en';
  }
  const n = String(name || '').toLowerCase();
  for (const [k, codes, words] of NAME_LANGS) if (new RegExp('(^|[^a-z])(' + codes + ')([^a-z]|$)').test(n) || new RegExp(words).test(n)) return k;
  return '';
}

root.PlannerTicket = { parse, split, stay, docLang, localLang, CC_LANG, findDates, findTimes, cleanPlace, bookingRef, AIRLINES, addDay };
})(typeof self !== 'undefined' ? self : globalThis);
