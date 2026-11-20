/* icons.js — 앱 아이콘 한 벌(24×24 선 아이콘). 이모지 대신 SVG 로 그린다.
   - HTML: <svg class="ico"><use href="#ic-이름"/></svg> (스프라이트는 이 파일이 body 에 넣는다) 또는 icon('이름', '클래스') 로 마크업 생성
   - 캔버스(engine.js, 워커 포함): root.ICONS[이름].d 를 Path2D 로 그린다 — document 가 없는 워커에서도 안전 */
(function (root) {
  const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const I = {
    map: { d: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14' },
    sparkles: { d: 'M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8z' },
    sparkle: { d: 'M12 3l2.2 5.8 5.8 2.2-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z', fill: true },
    trophy: { d: 'M8 21h8 M12 17v4 M7 4h10v4a5 5 0 01-10 0z M7 6H4v2a3 3 0 003 3 M17 6h3v2a3 3 0 01-3 3' },
    bell: { d: 'M6 10a6 6 0 0112 0c0 5.5 2 7 2 7H4s2-1.5 2-7z M10 20.5a2.2 2.2 0 004 0' },
    video: { d: 'M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z M17 10l5-3v10l-5-3z' },
    gear: { d: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z' },
    lock: { d: 'M7 11V8a5 5 0 0110 0v3 M5 11h14v10H5z M12 15v2' },
    pin: { d: 'M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
    clapper: { d: 'M3 8h18v12H3z M3 8l2-4h4l-2 4 M9 8l2-4h4l-2 4 M15 8l2-4h4l-2 4' },
    camera: { d: 'M4 8h3l2-3h6l2 3h3v11H4z M12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z' },
    tag: { d: 'M3 12l9-9h8v8l-9 9-8-8z M16 8.5a.5.5 0 100-1 .5.5 0 000 1z' },
    footprints: { d: 'M8.5 13a2.5 4.5 0 100-9 2.5 4.5 0 000 9z M8.5 15v3 M15.5 20a2.5 4.5 0 100-9 2.5 4.5 0 000 9z M15.5 6v3' },
    search: { d: 'M11 18a7 7 0 100-14 7 7 0 000 14z M20.5 20.5l-4.5-4.5' },
    cloud: { d: 'M7 18a4 4 0 01-.6-8A6 6 0 0118 11.5 3.3 3.3 0 0117 18z' },
    refresh: { d: 'M4 12a8 8 0 0113.7-5.7L20 8.5 M20 4v4.5h-4.5 M20 12a8 8 0 01-13.7 5.7L4 15.5 M4 20v-4.5h4.5' },
    flask: { d: 'M9 3h6 M10 3v6l-5.5 9.3A2 2 0 006.2 21h11.6a2 2 0 001.7-2.7L14 9V3 M7.5 15h9' },
    home: { d: 'M3 11l9-8 9 8 M5 10v10h5v-6h4v6h5V10' },
    star: { d: 'M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z', fill: true },
    'star-line': { d: 'M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z' },
    calendar: { d: 'M4 6h16v15H4z M4 10h16 M8 3v4 M16 3v4' },
    check: { d: 'M5 12l5 5 9-10' },
    'check-circle': { d: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 12l3 3 5-6' },
    globe: { d: 'M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18' },
    image: { d: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M16.5 9.5a1 1 0 100-2 1 1 0 000 2z' },
    phone: { d: 'M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1z M10.5 18.5h3' },
    server: { d: 'M4 4h16v7H4z M4 13h16v7H4z M7.5 7.5h.01 M7.5 16.5h.01' },
    database: { d: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' },
    prism: { d: 'M12 4l9 15H3z M12 4v15 M7.5 13.5h9' },
    folder: { d: 'M3 6h6l2 2h10v11H3z M3 11h18' },
    drive: { d: 'M9 3h6l7 12-3 5H5l-3-5z M9 3l3 5.5 M15 3l-3 5.5 M4 15h16' },
    box: { d: 'M3 8l9-5 9 5-9 5-9-5z M3 8v9l9 5 9-5V8 M12 13v9' },
    moon: { d: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z' },
    satellite: { d: 'M5 13l6-6 4 4-6 6z M13 5l2-2 6 6-2 2 M9 17l-3 3 M4 10l3-3 M15 15a5 5 0 004-4' },
    film: { d: 'M3 9h13v10H3z M16 12l5-3v9l-5-3z M7 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z M13 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z' },
    ruler: { d: 'M3 17L17 3l4 4L7 21z M7.5 12.5l2 2 M10.5 9.5l2 2 M13.5 6.5l2 2' },
    'no-ads': { d: 'M12 21a9 9 0 100-18 9 9 0 000 18z M5.6 5.6l12.8 12.8' },
    share: { d: 'M12 3v13 M8 7l4-4 4 4 M5 12v8h14v-8' },
    copy: { d: 'M9 9h11v11H9z M5 15H4V4h11v1' },
    link: { d: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L11.5 6.8 M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.5-1.5' },
    user: { d: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21a8 8 0 0116 0' },
    logout: { d: 'M10 4H5v16h5 M14 8l4 4-4 4 M9 12h9' },
    trash: { d: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14 M10 11v6 M14 11v6' },
    chevron: { d: 'M9 5l7 7-7 7' },
    close: { d: 'M6 6l12 12 M18 6L6 18' },
    compass: { d: 'M12 21a9 9 0 100-18 9 9 0 000 18z M15.5 8.5l-2 5-5 2 2-5z' },
    car: { d: 'M5 16l1.6-5.4A2 2 0 018.5 9h7a2 2 0 011.9 1.6L19 16 M4 16h16v3H4z M7 19v2 M17 19v2 M7.5 16.5h.01 M16.5 16.5h.01' },
    plane: { d: 'M12 2l1.5 1.5v6l8 5v2l-8-2.5v4l2 1.5v1.5L12 20l-3.5 1.5V20l2-1.5v-4L2.5 16.5v-2l8-5v-6z', fill: true },
    road: { d: 'M4 21L9 3h6l5 18 M12 6v3 M12 12v3 M12 18v3' },
    sun: { d: 'M12 17a5 5 0 100-10 5 5 0 000 10z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4' },
    play: { d: 'M8 5.5v13l11-6.5z', fill: true },
    dropbox: { d: 'M7 3l5 3-5 3-5-3z M17 3l5 3-5 3-5-3z M7 9l5 3-5 3-5-3z M17 9l5 3-5 3-5-3z M7 16l5 3 5-3' },
    key: { d: 'M15 13a5 5 0 100-10 5 5 0 000 10z M11.5 11.5L3 20l3 1 1-3h3v-3' },
    heart: { d: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z' },
  };
  const svg = (name, cls, inline) => { const ic = I[name]; if (!ic) return ''; const attrs = ic.fill ? 'fill="currentColor" stroke="none"' : S; return inline ? `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" ${attrs}><path d="${ic.d}"/></svg>` : `<svg class="ico ${cls || ''}" viewBox="0 0 24 24"><use href="#ic-${name}"/></svg>`; };
  root.ICONS = I;
  root.icon = (name, cls) => svg(name, cls, false);
  root.iconInline = (name, cls) => svg(name, cls, true);
  root.ccBadge = (cc) => (cc && cc.length === 2 ? `<span class="cc-badge">${String(cc).toUpperCase()}</span>` : '');   // 국기 이모지 대신 국가 코드 배지
  if (typeof document !== 'undefined' && document.body) {
    const symbols = Object.keys(I).map(n => { const ic = I[n]; return `<symbol id="ic-${n}" viewBox="0 0 24 24" ${ic.fill ? 'fill="currentColor" stroke="none"' : S}><path d="${ic.d}"/></symbol>`; }).join('');
    document.body.insertAdjacentHTML('afterbegin', `<svg id="icon-sprite" style="display:none" aria-hidden="true">${symbols}</svg>`);
  }
})(typeof self !== 'undefined' ? self : window);
