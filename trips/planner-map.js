/* planner-map.js — 일정 화면용 작은 타일 지도(캔버스 하나). 끌기 · 두 손가락 확대 · 핀 · 선만 있는 최소 구현.
   engine.js 의 지도는 영상·색칠 지도용이라 거리 단위 확대와 핀 편집에는 맞지 않아 따로 둔다. 타일 주소는 engine 의 TILE_STYLES 를 받아 쓴다.
   사용: const m = PlannerMap(canvas, { layers: [url…], under, maxZoom, attr }); m.setData({ markers, lines }); m.fit(points); m.on('marker', fn)
   이벤트: marker(핀을 누름) · tap(빈 곳을 누름, {lat, lon}) · long(길게 누름, {lat, lon}) · move(보는 곳이 바뀜) */
(function (root) {
'use strict';
const TILE = 256;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lon2x = (lon, z) => (lon + 180) / 360 * Math.pow(2, z) * TILE;
const lat2y = (lat, z) => { const s = Math.sin(clamp(lat, -85.05, 85.05) * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * Math.pow(2, z) * TILE; };
const x2lon = (x, z) => x / (Math.pow(2, z) * TILE) * 360 - 180;
const y2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / (Math.pow(2, z) * TILE); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };

function PlannerMap(canvas, opts) {
  opts = opts || {};
  const ctx = canvas.getContext('2d');
  const st = { lat: opts.lat == null ? 36.5 : opts.lat, lon: opts.lon == null ? 127.8 : opts.lon, z: opts.z || 5, W: 1, H: 1, dpr: 1 };
  let layers = opts.layers || [], under = opts.under || '#dfe3e6', maxZ = opts.maxZoom || 16, attr = opts.attr || '';
  const MINZ = 2;
  let markers = [], lines = [];
  const tiles = new Map();   // 주소 → { img, ok }
  const handlers = {};
  let raf = 0, dead = false, moveT = 0;
  const emit = (name, arg) => { const f = handlers[name]; if (f) { try { f(arg); } catch (e) { /* ignore */ } } };
  const redraw = () => { if (dead || raf) return; raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  const moved = () => { redraw(); clearTimeout(moveT); moveT = setTimeout(() => emit('move', { lat: st.lat, lon: st.lon, z: st.z }), 120); };

  function resize() {
    const r = canvas.getBoundingClientRect(); st.dpr = Math.min(3, root.devicePixelRatio || 1);
    st.W = Math.max(1, r.width); st.H = Math.max(1, r.height);
    canvas.width = Math.round(st.W * st.dpr); canvas.height = Math.round(st.H * st.dpr); redraw();
  }
  const project = (lat, lon) => [lon2x(lon, st.z) - lon2x(st.lon, st.z) + st.W / 2, lat2y(lat, st.z) - lat2y(st.lat, st.z) + st.H / 2];
  const unproject = (x, y) => ({ lat: y2lat(lat2y(st.lat, st.z) + y - st.H / 2, st.z), lon: x2lon(lon2x(st.lon, st.z) + x - st.W / 2, st.z) });
  function tile(url) {
    let t = tiles.get(url);
    if (!t) {
      t = { img: new Image(), ok: false }; t.img.decoding = 'async';
      t.img.onload = () => { t.ok = true; redraw(); }; t.img.onerror = () => { t.bad = true; };
      t.img.src = url; tiles.set(url, t);
      if (tiles.size > 360) { const k = tiles.keys().next().value; tiles.delete(k); }   // 오래된 것부터 버린다
    }
    return t;
  }
  const icons = new Map();   // 핀 안에 그릴 아이콘(SVG 글자 → 흰색 그림). 다 읽히면 다시 그린다
  function icon(svg) {
    let t = icons.get(svg);
    if (!t) {
      t = { img: new Image(), ok: false }; t.img.onload = () => { t.ok = true; redraw(); };
      let src = String(svg).replace(/currentColor/g, '#fff'); if (!/xmlns=/.test(src)) src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"');
      t.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); icons.set(svg, t);
    }
    return t;
  }
  function draw() {
    const { W, H, dpr } = st; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = under; ctx.fillRect(0, 0, W, H);
    const zi = clamp(Math.round(st.z), 0, maxZ); const scale = Math.pow(2, st.z - zi); const n = Math.pow(2, zi);
    const x0 = lon2x(st.lon, zi) - W / 2 / scale, y0 = lat2y(st.lat, zi) - H / 2 / scale;
    const tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE), tx1 = Math.floor((x0 + W / scale) / TILE), ty1 = Math.floor((y0 + H / scale) / TILE);
    for (const tpl of layers) for (let ty = ty0; ty <= ty1; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = tx0; tx <= tx1; tx++) {
        const wx = ((tx % n) + n) % n; const t = tile(tpl.replace('{z}', zi).replace('{x}', wx).replace('{y}', ty));
        if (t.ok) ctx.drawImage(t.img, (tx * TILE - x0) * scale, (ty * TILE - y0) * scale, TILE * scale + 0.6, TILE * scale + 0.6);
      }
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const l of lines) {
      if (!l.pts || l.pts.length < 2) continue;
      const path = () => { ctx.beginPath(); l.pts.forEach((p, i) => { const q = project(p[0], p[1]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); };
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = (l.width || 3.5) + 3; path(); ctx.stroke();
      ctx.setLineDash(l.dash ? [2, 8] : []); ctx.strokeStyle = l.color || '#3182F6'; ctx.lineWidth = l.width || 3.5; path(); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const m of markers) {
      const q = project(m.lat, m.lon); if (q[0] < -30 || q[1] < -30 || q[0] > W + 30 || q[1] > H + 30) continue;
      const r = m.active ? 16 : 12.5;
      ctx.beginPath(); ctx.arc(q[0], q[1], r + 2.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1.5; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fillStyle = m.done ? '#03B26C' : (m.color || '#3182F6'); ctx.fill();
      if (m.svg) { const ic = icon(m.svg); if (ic.ok) { const k = m.active ? 18 : 15; ctx.drawImage(ic.img, q[0] - k / 2, q[1] - k / 2, k, k); } }   // 숙소·도착지·출발지: 번호 대신 아이콘
      else if (m.label != null && m.label !== '') { ctx.fillStyle = '#fff'; ctx.font = `700 ${m.active ? 14 : 12}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`; ctx.fillText(String(m.label), q[0], q[1] + 0.5); }
    }
    if (attr) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(attr, 6, H - 6); ctx.fillStyle = '#4E5968'; ctx.fillText(attr, 6, H - 6);
    }
  }

  // ---------- 손가락·마우스 ----------
  canvas.style.touchAction = 'none';
  const ptrs = new Map(); let drag = null, pinch = null, hasMoved = false, downAt = 0, longT = 0, longFired = false, lastTap = 0;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const zoomAt = (z, x, y) => { const ll = unproject(x, y); st.z = clamp(z, MINZ, maxZ + 1); const q = project(ll.lat, ll.lon); const c = unproject(st.W / 2 + (q[0] - x), st.H / 2 + (q[1] - y)); st.lat = c.lat; st.lon = c.lon; moved(); };
  const onDown = (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const p = pos(e); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      drag = { x: p.x, y: p.y }; hasMoved = false; longFired = false; downAt = Date.now();
      clearTimeout(longT); longT = setTimeout(() => { if (!hasMoved && ptrs.size === 1) { longFired = true; emit('long', unproject(p.x, p.y)); } }, 550);
    } else if (ptrs.size === 2) {
      clearTimeout(longT); const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: st.z }; drag = null; hasMoved = true;
    }
  };
  const onMove = (e) => {
    if (!ptrs.has(e.pointerId)) return; const p = pos(e); ptrs.set(e.pointerId, p);
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoomAt(pinch.z + Math.log2(d / pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (drag) {
      const dx = p.x - drag.x, dy = p.y - drag.y;
      if (!hasMoved && Math.hypot(dx, dy) < 7) return;
      hasMoved = true; clearTimeout(longT);
      const c = unproject(st.W / 2 - dx, st.H / 2 - dy); st.lat = clamp(c.lat, -84, 84); st.lon = c.lon; drag = { x: p.x, y: p.y }; moved();
    }
  };
  const onUp = (e) => {
    if (!ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); clearTimeout(longT);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 1) { const q = [...ptrs.values()][0]; drag = { x: q.x, y: q.y }; return; }
    if (ptrs.size > 0) return;
    drag = null;
    if (hasMoved || longFired || Date.now() - downAt > 500) return;
    let hit = null, best = 24;
    for (const m of markers) { const q = project(m.lat, m.lon); const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < best) { best = d; hit = m; } }
    if (hit) { emit('marker', hit); return; }
    const t = Date.now(); if (t - lastTap < 320) { lastTap = 0; zoomAt(st.z + 1, p.x, p.y); return; }
    lastTap = t; emit('tap', unproject(p.x, p.y));
  };
  const onWheel = (e) => { e.preventDefault(); const p = pos(e); zoomAt(st.z - e.deltaY * 0.0025, p.x, p.y); };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  const onResize = () => resize(); root.addEventListener('resize', onResize);
  resize();

  return {
    resize, project, unproject,
    get view() { return { lat: st.lat, lon: st.lon, z: st.z }; },
    setView(lat, lon, z) { st.lat = lat; st.lon = lon; if (z != null) st.z = clamp(z, MINZ, maxZ + 1); moved(); },
    zoomBy(d) { zoomAt(st.z + d, st.W / 2, st.H / 2); },
    setData(d) { markers = (d && d.markers) || []; lines = (d && d.lines) || []; redraw(); },
    setStyle(s) { layers = s.layers || layers; under = s.under || under; maxZ = s.maxZoom || maxZ; attr = s.attr == null ? attr : s.attr; redraw(); },
    /** 점들이 모두 보이게 맞춘다. pts = [[위도, 경도]…] */
    fit(pts, pad) {
      pts = (pts || []).filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1])); if (!pts.length) return;
      pad = pad == null ? 44 : pad;
      const lats = pts.map(p => p[0]), lons = pts.map(p => p[1]);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
      st.lat = (minLat + maxLat) / 2; st.lon = (minLon + maxLon) / 2;
      if (pts.length === 1 || (maxLat - minLat < 1e-6 && maxLon - minLon < 1e-6)) { st.z = Math.min(14, maxZ); moved(); return; }
      const dx = Math.abs(lon2x(maxLon, 0) - lon2x(minLon, 0)) || 1e-9, dy = Math.abs(lat2y(minLat, 0) - lat2y(maxLat, 0)) || 1e-9;
      const z = Math.min(Math.log2(Math.max(40, st.W - pad * 2) / dx), Math.log2(Math.max(40, st.H - pad * 2) / dy));
      st.z = clamp(z, MINZ, Math.min(maxZ, 16));
      st.lat = y2lat((lat2y(minLat, st.z) + lat2y(maxLat, st.z)) / 2, st.z);   // 메르카토르 기준 가운데
      moved();
    },
    on(name, fn) { handlers[name] = fn; return this; },
    destroy() { dead = true; clearTimeout(longT); clearTimeout(moveT); if (raf) cancelAnimationFrame(raf); root.removeEventListener('resize', onResize); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('wheel', onWheel); tiles.clear(); },
  };
}
root.PlannerMap = PlannerMap;
})(typeof self !== 'undefined' ? self : globalThis);
