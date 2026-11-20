/* planner-gmap.js — 여행 탭의 지도를 구글 지도(Maps JavaScript API)로 그린다.
 * 캔버스 지도(planner-map.js 의 PlannerMap)와 같은 모양의 기능을 내므로 planner.js 는 어느 쪽인지 몰라도 된다.
 *
 *   PlannerGMap.on()            키가 있고 꺼 두지 않았으면 true (자동 시험·?gmap=0 에서는 꺼진다. ?gmap=1 이면 시험에서도 켠다)
 *   PlannerGMap.loaded()        구글 지도 스크립트를 이미 불러왔으면 true
 *   PlannerGMap.ready()         → Promise<boolean>  스크립트를 한 번만 불러온다. 키가 틀렸거나(인증 실패) 네트워크가 없으면 false
 *   PlannerGMap.create(canvas)  → { g:true, setData, fit, setView, zoomBy, on, view, destroy }   canvas 자리 위에 지도를 얹는다
 *
 * 표시 키(CLOUD_CONFIG.GOOGLE_MAPS_KEY)는 앱에 들어 있는 값이다. Maps JavaScript API 만 허용하도록 콘솔에서 제한해 둔다. 장소 검색·경로는 이 키가 아니라 서버가 한다.
 * 번호 핀은 OverlayView 로 직접 그린다(예전 Marker 는 지원이 끝나 가고, 새 AdvancedMarker 는 지도 ID 가 있어야 한다).
 */
(function (root) {
'use strict';
const doc = root.document;
const key = () => (root.CLOUD_CONFIG && root.CLOUD_CONFIG.GOOGLE_MAPS_KEY) || '';
const param = (k) => { try { return new URLSearchParams(root.location.search).get(k); } catch (e) { return null; } };
let state = 'idle', waiters = [], Dots = null;   // idle → loading → ok | fail(30초 뒤 다시 idle)
const say = (t) => { try { if (root.PlannerGMap && root.PlannerGMap.log) root.PlannerGMap.log('gmap: ' + t); } catch (e) { /* ignore */ } };

function on() {
  if (!key() || !doc) return false;
  const g = param('gmap'); if (g === '0') return false;
  if (root.navigator && root.navigator.webdriver && g !== '1') return false;   // 자동 시험에서는 구글 지도를 부르지 않는다(지도 표시 횟수가 요금으로 잡힌다)
  return true;
}
const loaded = () => state === 'ok';
function finish(ok, why) {
  state = ok ? 'ok' : 'fail'; say(ok ? 'ready' : 'load failed (' + (why || '?') + ')');
  if (!ok) setTimeout(() => { if (state === 'fail') state = 'idle'; }, 30000);   // 잠깐 끊긴 것일 수 있으니 나중에 다시 시도할 수 있게
  const w = waiters; waiters = []; w.forEach(f => f(ok));
}

function ready() {
  if (!on()) return Promise.resolve(false);
  if (state === 'ok') return Promise.resolve(true);
  if (state === 'fail') return Promise.resolve(false);
  return new Promise((resolve) => {
    waiters.push(resolve); if (state === 'loading') return; state = 'loading'; say('loading');
    const lang = (root.I18N && root.I18N.lang) || 'ko';
    const timer = setTimeout(() => { if (state === 'loading') finish(false, 'timeout'); }, 12000);
    root.gm_authFailure = () => { clearTimeout(timer); state = 'fail'; say('auth failure (key or API setting)'); try { doc.querySelectorAll('.pl-gmap').forEach(el => { el.dispatchEvent(new Event('gm-fail')); }); } catch (e) { /* ignore */ } };   // 키가 틀렸거나 이 API 가 꺼져 있다
    root.__plGmapsReady = async () => {
      clearTimeout(timer);
      try {
        const gm = root.google.maps; if (gm.importLibrary) await gm.importLibrary('maps');
        define(root.google.maps); finish(true);
      } catch (e) { finish(false, 'init: ' + (e && e.message)); }
    };
    const s = doc.createElement('script'); s.async = true; s.onerror = () => { clearTimeout(timer); finish(false, 'script error'); };
    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key()) + '&v=weekly&loading=async&callback=__plGmapsReady&language=' + encodeURIComponent(lang);
    doc.head.appendChild(s);
  });
}

// 번호 핀 묶음: 지도 위에 놓이는 HTML 조각들(누르면 onTap)
function define(gm) {
  if (Dots) return;
  Dots = class extends gm.OverlayView {
    constructor() { super(); this.items = []; this.els = []; this.box = null; this.onTap = null; }
    onAdd() { this.box = doc.createElement('div'); this.box.className = 'pl-gm-dots'; this.getPanes().overlayMouseTarget.appendChild(this.box); this.paint(); }
    onRemove() { if (this.box) this.box.remove(); this.box = null; this.els = []; }
    draw() {
      const pr = this.getProjection(); if (!pr || !this.box) return;
      this.els.forEach((el, i) => { const m = this.items[i]; const p = pr.fromLatLngToDivPixel(new gm.LatLng(m.lat, m.lon)); if (p) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; } });
    }
    setItems(items) { this.items = items || []; this.paint(); }   // set 이라는 이름은 쓰면 안 된다(OverlayView 가 물려받은 MVCObject.set 을 덮어써 setMap 이 듣지 않는다)
    paint() {
      if (!this.box) return; this.box.textContent = '';
      this.els = this.items.map((m) => {
        const el = doc.createElement('div'); const small = (m.label === '' || m.label == null) && !m.svg;
        el.className = 'pl-gm-dot' + (small ? ' small' : '') + (m.done ? ' done' : ''); el.style.background = m.done ? '' : (m.color || '#3182F6'); if (m.svg) el.innerHTML = m.svg; else el.textContent = small ? '' : String(m.label);   // 목적지는 번호(다녀온 곳도 번호 그대로, 색만 바뀜), 숙소·도착지·출발지는 아이콘(svg 는 앱이 가진 고정 글자)
        if (m.id != null) el.addEventListener('click', (e) => { e.stopPropagation(); if (this.onTap) this.onTap(m); });
        this.box.appendChild(el); return el;
      });
      this.draw();
    }
  };
}

function create(canvas) {
  const gm = root.google.maps; const host = canvas.parentNode;
  const el = doc.createElement('div'); el.className = 'pl-gmap'; host.insertBefore(el, canvas); canvas.style.visibility = 'hidden';
  const gmap = new gm.Map(el, { center: { lat: 37.5665, lng: 126.978 }, zoom: 11, disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false, keyboardShortcuts: false, mapTypeId: 'roadmap' });
  const dots = new Dots(); dots.setMap(gmap);
  const handlers = {}; let lines = [], dead = false, failed = false;
  dots.onTap = (m) => { const f = handlers.marker; if (f) { try { f(m); } catch (e) { /* ignore */ } } };
  el.addEventListener('gm-fail', () => { failed = true; const f = handlers.fail; if (f) f(); });
  const api = {
    g: true,
    get failed() { return failed; },
    get view() { const c = gmap.getCenter(); return { lat: c ? c.lat() : 0, lon: c ? c.lng() : 0, z: gmap.getZoom() || 0 }; },
    setView(lat, lon, z) { gmap.setCenter({ lat, lng: lon }); if (z != null) gmap.setZoom(Math.round(z)); },
    zoomBy(d) { gmap.setZoom((gmap.getZoom() || 11) + d); },
    setData(d) {
      lines.forEach(l => l.setMap(null));
      lines = ((d && d.lines) || []).map(l => new gm.Polyline({ map: gmap, path: l.pts.map(p => ({ lat: p[0], lng: p[1] })), strokeColor: l.color || '#3182F6', strokeOpacity: 0.85, strokeWeight: 4, clickable: false }));
      dots.setItems((d && d.markers) || []);
    },
    /** 점들이 모두 보이게 맞춘다. pts = [[위도, 경도]…] */
    fit(pts, pad) {
      pts = (pts || []).filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1])); if (!pts.length) return;
      if (pts.length === 1 || pts.every(p => Math.abs(p[0] - pts[0][0]) < 1e-6 && Math.abs(p[1] - pts[0][1]) < 1e-6)) { gmap.setCenter({ lat: pts[0][0], lng: pts[0][1] }); gmap.setZoom(14); return; }
      const b = new gm.LatLngBounds(); pts.forEach(p => b.extend({ lat: p[0], lng: p[1] }));
      gmap.fitBounds(b, pad == null ? 44 : pad);
      gm.event.addListenerOnce(gmap, 'idle', () => { if (!dead && gmap.getZoom() > 16) gmap.setZoom(16); });   // 너무 가까이 들어가지 않게
    },
    on(name, fn) { handlers[name] = fn; return api; },
    destroy() { if (dead) return; dead = true; lines.forEach(l => l.setMap(null)); lines = []; dots.setMap(null); try { gm.event.clearInstanceListeners(gmap); } catch (e) { /* ignore */ } el.remove(); canvas.style.visibility = ''; },
  };
  return api;
}

root.PlannerGMap = { on, loaded, ready, create };
})(typeof self !== 'undefined' ? self : window);
