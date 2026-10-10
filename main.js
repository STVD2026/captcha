let DESIGNERS = [];

// 프로필 이미지 경로 (images/profiles/이름.webp), 특수 파일명 매핑
function profileWebp(name){
  var map = {'김서연(A)':'김서연_a','김서연(B)':'김서연_b','응우옌비엣호안':'호안'};
  var f = map[name] || name;
  // GitHub Pages(리눅스)는 한글 파일명을 NFD(자모 분리형)로 저장하므로 NFD로 요청해야 매칭됨
  return 'images/profiles/' + f.normalize('NFD') + '.webp';
}
// 한글 첫 글자의 초성 반환 (쌍자음은 기본 자음으로 통합)
function getChoseong(name){
  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var BASE = {'ㄲ':'ㄱ','ㄸ':'ㄷ','ㅃ':'ㅂ','ㅆ':'ㅅ','ㅉ':'ㅈ'};
  var c = (name||'').charCodeAt(0) - 0xAC00;
  if(c < 0 || c > 11171) return '';
  var ch = CHO[Math.floor(c/588)];
  return BASE[ch] || ch;
}
var curInitial = 'all';
var curSearch = '';
var curDesigner = -1;
var curWorkCat = 'all';
var curWorkSearch = '';
var CAT_EN = {'BX(브랜드)':'brand','CX(서비스디자인)':'service design','UX/UI':'ux/ui','영상':'motion graphics','일러스트':'illustration','편집':'editorial'};

// 데이터: works-data.js (tools/build_data.py 가 2026_web.csv + images 폴더로 생성)
// 파일명은 NFC(완성형)로 커밋됨 → 요청 경로도 NFC로 통일
function _nfd(p){ return p ? p.normalize('NFC') : p; }
window.addEventListener('DOMContentLoaded', function() {
  DESIGNERS = (window.WORKS_DATA || []).map(function(p, i) {
    return {
      id: i, sid: p.sid, kr: p.label, en: p.en,
      track: p.works.map(function(w){ return w.track; }).filter(function(v, j, a){ return v && a.indexOf(v) === j; }).join(' · '),
      contacts: p.contacts,
      profileImg: _nfd(p.profile),
      noneImg: 'images/profiles/none' + (Math.floor(Math.random() * 6) + 1) + '.png',
      works: p.works.map(function(w) {
        return {
          workTitle: w.title, titleEn: w.titleEn, category: w.cat, track: w.track,
          descKr: w.descKr, descEn: w.descEn, video: w.video, tags: w.tags,
          booth: w.booth || '',
          thumb: _nfd(w.thumb) || 'images/works/none.jpg',
          workImgs: w.imgs.length ? w.imgs.map(_nfd) : [_nfd(w.thumb) || 'images/works/none.jpg']
        };
      })
    };
  });
  renderGrid();
  renderWorks();
});

/* 작품명: 국문 제목이 없거나 영문뿐이면 영문을 메인 제목 크기로 */
function workNames(w) {
  var kr = (w.workTitle || '').trim(), en = (w.titleEn || '').trim();
  if (!kr || kr === '-' || kr === en || !/[가-힣]/.test(kr)) return { main: en || kr, sub: '' };
  return { main: kr, sub: en };
}

/* 컨택트 → 링크 */
function contactHTML(c) {
  var t = c[0], v = c[1], href = v;
  if (t === '이메일') href = 'mailto:' + v;
  else if (!/^https?:/.test(v)) href = 'https://' + v.replace(/^@/, (t === '인스타그램' ? 'instagram.com/' : ''));
  var label = { '이메일':'EMAIL', '인스타그램':'INSTAGRAM', '링크드인':'LINKEDIN', '비핸스':'BEHANCE', '기타':'LINK' }[t] || t;
  return '<a class="dz-dh-link" href="' + href + '" target="_blank" rel="noopener noreferrer"><span class="dz-tag">' + label + '</span><span>' + v.replace(/^https?:\/\/(www\.)?/, '') + '</span></a>';
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-links button').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('designer-detail').classList.remove('active');
  document.getElementById('work-detail').classList.remove('active');
  resetDesignerOverlay();
  var pg = document.getElementById('page-' + name);
  var nb = document.getElementById('nav-' + name);
  if(pg) pg.classList.add('active');
  if(nb) nb.classList.add('active');
  // 메인 페이지는 라이트 테마
  document.body.classList.toggle('theme-light', name === 'main');
  if (name === 'message') { boothBuildGrid(); boothShowStage('pick'); boothInitCam().catch(function(){}); }
  window.scrollTo(0,0);
}

function renderGrid() {
  var q = (curSearch || '').trim().toLowerCase();
  var html = '';

  for (var i = 0; i < DESIGNERS.length; i++) {
    var d = DESIGNERS[i];
    if (curInitial !== 'all' && getChoseong(d.kr) !== curInitial) continue;
    if (q && d.kr.toLowerCase().indexOf(q) === -1 && d.en.toLowerCase().indexOf(q) === -1) continue;
    html += '<div class="dz-card' + (curDesigner === i ? ' sel' : '') + '" data-idx="' + i + '" onclick="openDesigner(' + i + ')">'
      + '<div class="dz-img"><img src="' + (d.profileImg || d.noneImg) + '" alt="' + d.kr + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + d.noneImg + '\'"></div>'
      + '<div class="dz-kr">' + d.kr + '</div>'
      + '<div class="dz-en">' + d.en + '</div>'
      + '</div>';
  }

  if (!html) html = '<p class="no-result">검색 결과가 없습니다.</p>';
  document.getElementById('designer-grid').innerHTML = html;
}

function searchDesigner(value) {
  curSearch = value || '';
  renderGrid();
}

function filterInitial(btn, cho) {
  curInitial = cho;
  var row = btn.parentNode;
  row.querySelectorAll('.dz-filter').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderGrid();
}

// 디자이너 상세: 오른쪽 패널을 열고 채운다 (페이지 전환 없음)
function openDesigner(idx) {
  var d = DESIGNERS[idx];
  if(!d) return;
  curDesigner = idx;
  document.querySelectorAll('.dz-card').forEach(function(c){ c.classList.toggle('sel', c.getAttribute('data-idx') == idx); });

  var img = document.getElementById('dz-dimg');
  img.onerror = function(){ this.onerror=null; this.src=d.noneImg; };
  img.src = d.profileImg || d.noneImg;
  img.alt = d.kr;
  document.getElementById('dz-dkr').textContent = d.kr;
  document.getElementById('dz-den').textContent = d.en;

  var links = (d.contacts || []).map(contactHTML).join('');
  document.getElementById('dz-dlinks').innerHTML = links;

  var whtml = '';
  for(var wi=0; wi<d.works.length; wi++){
    whtml += workCardHTML(idx, wi);
  }
  document.getElementById('dz-dworks').innerHTML = whtml;

  var panel = document.getElementById('dz-detail');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden','false');
  panel.scrollTop = 0;
}

function closeDesignerDetail() {
  resetDesignerOverlay();
  document.querySelectorAll('.dz-card.sel').forEach(function(c){ c.classList.remove('sel'); });
}

// 오버레이/패널 공통 정리 (원래 위치로 복귀)
function resetDesignerOverlay() {
  curDesigner = -1;
  var panel = document.getElementById('dz-detail');
  if(!panel) return;
  panel.classList.remove('open','as-overlay');
  panel.setAttribute('aria-hidden','true');
  var bd = document.getElementById('dz-overlay-bd');
  if(bd) bd.classList.remove('show');
  document.body.style.overflow = '';
  if(panel._origParent){
    if(panel._origNext && panel._origNext.parentNode === panel._origParent) panel._origParent.insertBefore(panel, panel._origNext);
    else panel._origParent.appendChild(panel);
    panel._origParent = null; panel._origNext = null;
  }
}

// WORK 상세에서 호출: 디자이너 디테일을 우측 오버레이로 띄움 (페이지 전환 없음)
function openDesignerFromWork(idx) {
  openDesigner(idx); // 패널 내용 채우고 .open 부여
  var panel = document.getElementById('dz-detail');
  if(!panel._origParent){ panel._origParent = panel.parentNode; panel._origNext = panel.nextSibling; }
  document.body.appendChild(panel);
  panel.classList.add('as-overlay');
  var bd = document.getElementById('dz-overlay-bd');
  if(!bd){
    bd = document.createElement('div'); bd.id = 'dz-overlay-bd'; bd.className = 'dz-overlay-bd';
    bd.onclick = closeDesignerDetail;
    document.body.appendChild(bd);
  }
  bd.classList.add('show');
  document.body.style.overflow = 'hidden';
  panel.scrollTop = 0;
}

function openWorkDirect(dIdx, wIdx) {
  var d = DESIGNERS[dIdx];
  if(!d) return;
  var w = d.works[wIdx]||d.works[0];
  resetDesignerOverlay(); // 오버레이가 열려 있으면 닫고 원위치
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var dd = document.getElementById('designer-detail'); if(dd) dd.classList.remove('active');
  document.getElementById('work-detail').classList.add('active');
  document.querySelectorAll('.nav-links button').forEach(function(b){ b.classList.remove('active'); });
  var nw = document.getElementById('nav-work'); if(nw) nw.classList.add('active');
  document.body.classList.remove('theme-light');
  var en = CAT_EN[w.category] || '';
  var nm = workNames(w);
  document.getElementById('wd-title').textContent = nm.main;
  document.getElementById('wd-en').textContent = nm.sub;
  document.getElementById('wd-tags').innerHTML =
      '<span class="wd-tag">'+w.booth+'</span>'
    + '<span class="wd-tag">'+w.category+'</span>'
    + '<span class="wd-tag">'+d.kr+'</span>'
    + (w.tags || []).map(function(t){ return '<span class="wd-tag wd-hash">'+t.replace(/</g,'&lt;')+'</span>'; }).join('');
  var by = document.getElementById('wd-by');
  by.innerHTML = '<span class="wd-name">'+d.kr+' ('+d.en+')</span>'
    + '<span class="wd-arrow" aria-hidden="true">↗</span>';
  by.onclick = function(){ openDesignerFromWork(dIdx); };
  document.getElementById('wd-cat2').textContent = w.track || w.category;
  var desc = document.getElementById('wd-desc');
  desc.innerHTML = '';
  var langs = [['kr', '국문', w.descKr], ['en', 'ENG', w.descEn]].filter(function(x){ return x[2]; });
  if (langs.length) {
    desc.setAttribute('data-show', langs[0][0]);
    if (langs.length > 1) {
      var tabs = document.createElement('div'); tabs.className = 'wd-lang';
      langs.forEach(function(x, k) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = x[1]; if (!k) b.className = 'on';
        b.onclick = function() { desc.setAttribute('data-show', x[0]); tabs.querySelectorAll('button').forEach(function(o){ o.classList.toggle('on', o === b); }); };
        tabs.appendChild(b);
      });
      desc.appendChild(tabs);
    }
    var txt = document.createElement('div'); txt.className = 'wd-txt';
    langs.forEach(function(x) { var pp = document.createElement('p'); pp.setAttribute('data-lang', x[0]); pp.textContent = x[2].replace(/[ \t]*\n[\s]*\n\s*/g, '\n').trim(); /* 빈 줄 제거 */ txt.appendChild(pp); });
    desc.appendChild(txt);
  }
  if (w.video) { var va = document.createElement('a'); va.className = 'wd-video'; va.href = /^https?:/.test(w.video) ? w.video : 'https://' + w.video; va.target = '_blank'; va.rel = 'noopener noreferrer'; va.textContent = '▶ 영상 보기'; desc.appendChild(va); }
  if (!desc.childNodes.length) desc.textContent = d.kr + ' 디자이너의 졸업 작품입니다.';
  setTimeout(fitWorkDesc, 30); setTimeout(fitWorkDesc, 350);
  document.getElementById('wd-dlink2').onclick = function(){ openDesignerFromWork(dIdx); };
  // 디자이너 다른 작품 썸네일 (다른 작품이 있으면 그것, 없으면 현재 작품)
  var otherIdx = (d.works.length > 1) ? ((wIdx + 1) % d.works.length) : wIdx;
  var ow = d.works[otherIdx];
  var oen = CAT_EN[ow.category] || '';
  var mc = document.getElementById('wd-more-card');
  mc.innerHTML = '<div class="wd-mc-img"><img src="'+ow.thumb+'" alt="'+workNames(ow).main+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'"></div>'
    + '<div class="wd-mc-body"><div class="wd-mc-title">'+workNames(ow).main+'</div><div class="wd-mc-en">'+workNames(ow).sub+'</div>'+(ow.booth ? '<span class="wd-mc-booth">'+ow.booth+'</span>' : '')+'</div>';
  mc.onclick = function(){ openWorkDirect(dIdx, otherIdx); };
  var imgs = (w.workImgs && w.workImgs.length) ? w.workImgs : ['images/works/none.jpg'];
  document.getElementById('wdv-gallery').innerHTML = imgs.map(function(src, i){
    return '<img src="'+src+'" alt="'+w.workTitle+' '+(i+1)+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'">';
  }).join('');
  window.scrollTo(0,0);
}

// 공용 작품 카드 마크업 (WORK 리스트 · 디자이너 디테일 공통)
function workCardHTML(dIdx, wIdx) {
  var d = DESIGNERS[dIdx];
  var w = d.works[wIdx];
  var en = CAT_EN[w.category] || '';
  return '<div class="wk-card" onclick="openWorkDirect('+dIdx+','+wIdx+')">'
    +'<div class="wk-card-img"><img src="'+w.thumb+'" alt="'+workNames(w).main+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'"></div>'
    +'<div class="wk-card-body"><div class="wk-card-title">'+workNames(w).main+'</div><div class="wk-card-en">'+workNames(w).sub+'</div></div>'
    +'<div class="wk-card-tags"><span class="wk-tag">'+w.booth+'</span><span class="wk-tag">'+w.category+'</span><span class="wk-tag name">'+d.kr+'</span></div>'
    +'</div>';
}

function renderWorks() {
  var q = curWorkSearch.trim().toLowerCase();
  var list = [];
  for(var i=0; i<DESIGNERS.length; i++){
    var d = DESIGNERS[i];
    for(var wi=0; wi<d.works.length; wi++){
      var w = d.works[wi];
      var m = (w.booth || '').replace(/\s+/g, '').match(/^(\d)F([CE])(\d+)$/);
      // 선택한 층 작품만 (검색 중에는 모든 층에서 찾기)
      if(!q && typeof _wkFloor !== 'undefined' && (!m || m[1] !== _wkFloor)) continue;
      if(curWorkCat!=='all' && w.category!==curWorkCat) continue;
      if(q){
        var hay = (w.workTitle+' '+w.titleEn+' '+d.kr+' '+d.en+' '+w.category+' '+w.booth+' '+(w.tags||[]).join(' ')).toLowerCase();
        if(hay.indexOf(q) < 0) continue;
      }
      list.push({ i: i, wi: wi, k: m ? m[1] + m[2] + ('00' + m[3]).slice(-3) : 'z' });
    }
  }
  // 부스 번호 순 (층 → C/E → 번호)
  list.sort(function(a, b){ return a.k < b.k ? -1 : a.k > b.k ? 1 : 0; });
  var html = list.map(function(x){ return workCardHTML(x.i, x.wi); }).join('');
  if(!html) html = '<div class="wk-empty">검색 결과가 없습니다.</div>';
  document.getElementById('work-grid').innerHTML = html;
  setTimeout(syncWorkSearchWidth, 0);
}

function filterWork(btn, cat) {
  document.querySelectorAll('.wk-filter').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  curWorkCat = cat;
  renderWorks();
}

function searchWork(value) {
  curWorkSearch = value || '';
  renderWorks();
}

/* ── WORK 부스 지도: 층별 SVG(Figma) + 부스 호버/클릭 → 오른쪽에 작품 미리보기 ── */
var _wkMaps = {}, _wkFloor = '3', _wkPinned = '';
function wkFloor(btn) {
  document.querySelectorAll('.wk-floor').forEach(function(b){ b.classList.toggle('active', b === btn); });
  _wkFloor = btn.getAttribute('data-floor');
  renderWorks();
  wkUnpin();
  wkLoadMap(_wkFloor);
}
function wkBoothWork(floor, code) {
  for (var i = 0; i < DESIGNERS.length; i++) for (var j = 0; j < DESIGNERS[i].works.length; j++) {
    var b = (DESIGNERS[i].works[j].booth || '').replace(/\s+/g, '');
    if (b === floor + 'F' + code) return [i, j];
  }
  return null;
}
function wkLoadMap(floor) {
  var el = document.getElementById('wk-map');
  if (!el) return;
  var apply = function(svg) {
    if (_wkFloor !== floor) return;
    el.innerHTML = svg;
    var root = el.querySelector('svg'); root.removeAttribute('width'); root.removeAttribute('height');
    // 범례(Frame 249)를 지도에서 더 띄움 → viewBox도 그만큼 늘림
    var LEG = 28, legend = root.querySelector('g[id="Frame 249"]'), vb = root.getAttribute('viewBox').split(/\s+/).map(Number);
    if (legend) { legend.setAttribute('transform', 'translate(0 ' + LEG + ')'); vb[3] += LEG; root.setAttribute('viewBox', vb.join(' ')); }
    root.querySelectorAll('g[id]').forEach(function(g) {
      var code = g.id;
      if (!/^[CE]\d\d$/.test(code)) return;
      var hit = wkBoothWork(floor, code);
      g.classList.add('wk-bt');
      if (!hit) { g.classList.add('empty'); return; }
      var own = g.querySelector('rect'); if (own) own.classList.add('wk-pill');
      g.addEventListener('mouseenter', function(){ if (!_wkPinned && window.innerWidth > 920) wkShowPreview(code, hit); });
      g.addEventListener('mouseleave', function(){ if (!_wkPinned && window.innerWidth > 920) wkHidePreview(); });
      g.addEventListener('click', function(e) {
        e.stopPropagation();
        if (_wkPinned === code) { wkUnpin(); return; }
        _wkPinned = code; wkShowPreview(code, hit);
      });
    });
  };
  if (_wkMaps[floor]) apply(_wkMaps[floor]);
  else fetch('images/work/map-' + floor + 'f.svg').then(function(r){ return r.text(); }).then(function(t){ _wkMaps[floor] = t; apply(t); });
}
/* 강조용 흰 알약: 화면에 보일 때 글자 크기에 맞춰 생성 (Figma E12 비율) */
function wkEnsurePill(g) {
  if (g.querySelector('.wk-pill')) return;
  var b = { x: 1e9, y: 1e9, r: -1e9, btm: -1e9 };
  g.querySelectorAll('path').forEach(function(p) { var bb = p.getBBox(); b.x = Math.min(b.x, bb.x); b.y = Math.min(b.y, bb.y); b.r = Math.max(b.r, bb.x + bb.width); b.btm = Math.max(b.btm, bb.y + bb.height); });
  if (b.r < b.x) return;
  var h = (b.btm - b.y) + 10, w = (b.r - b.x) + 15, cx = (b.x + b.r) / 2, cy = (b.y + b.btm) / 2;
  var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', cx - w / 2); rect.setAttribute('y', cy - h / 2); rect.setAttribute('width', w); rect.setAttribute('height', h); rect.setAttribute('rx', h / 2);
  rect.setAttribute('class', 'wk-pill');
  g.insertBefore(rect, g.firstChild);
}
function wkNearby(floor, code, self) {
  var L = code[0], n = +code.slice(1), out = [];
  DESIGNERS.forEach(function(d, i) { d.works.forEach(function(w, j) {
    var m = (w.booth || '').replace(/\s+/g, '').match(/^(\d)F([CE])(\d\d)$/);
    if (!m || m[1] !== floor || (i === self[0] && j === self[1])) return;
    out.push({ i: i, j: j, dist: (m[2] === L ? 0 : 100) + Math.abs(+m[3] - n) });
  }); });
  return out.sort(function(a, b){ return a.dist - b.dist; }); // 같은 층 작품 전부, 가까운 순
}
function wkShowPreview(code, hit) {
  var gg = document.querySelector('#wk-map g[id="' + code + '"]'); if (gg) wkEnsurePill(gg);
  document.querySelectorAll('#wk-map .wk-bt').forEach(function(g){ g.classList.toggle('on', g.id === code); });
  var d = DESIGNERS[hit[0]], w = d.works[hit[1]], nm = workNames(w), pv = document.getElementById('wk-preview');
  // 모바일: 지도 바로 아래에 미리보기
  if (window.innerWidth <= 920) {
    pv = document.getElementById('wk-mpreview');
    if (!pv) { pv = document.createElement('div'); pv.id = 'wk-mpreview'; pv.className = 'wk-mpreview'; document.getElementById('wk-map').insertAdjacentElement('afterend', pv); }
  }
  pv.innerHTML = '<div class="wk-card wk-pv-card" onclick="openWorkDirect(' + hit[0] + ',' + hit[1] + ')">'
    + '<div class="wk-card-img"><img src="' + w.thumb + '" alt="' + nm.main + '" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'"></div>'
    + '<div class="wk-card-body"><div class="wk-card-title">' + nm.main + '</div><div class="wk-card-en">' + nm.sub + '</div></div>'
    + '<div class="wk-card-tags"><span class="wk-tag">' + w.booth + '</span><span class="wk-tag">' + w.category + '</span><span class="wk-tag name">' + d.kr + '</span></div></div>';
  // 웹: 큰 카드 아래에 같은 층 근처 부스 작품들
  if (pv.id === 'wk-preview') {
    var near = wkNearby(_wkFloor, code, hit);
    if (near.length) pv.innerHTML += '<div class="wk-pv-near"><div class="wk-pv-near-t">근처 작품</div><div class="wk-grid">' + near.map(function(x){ return workCardHTML(x.i, x.j); }).join('') + '</div></div>';
  }
  pv.hidden = false;
  if (pv.id === 'wk-preview') pv.parentNode.classList.add('previewing');
}
function wkHidePreview() {
  document.querySelectorAll('#wk-map .wk-bt.on').forEach(function(g){ g.classList.remove('on'); });
  var pv = document.getElementById('wk-preview');
  if (pv) { pv.hidden = true; pv.parentNode.classList.remove('previewing'); }
  var mp = document.getElementById('wk-mpreview'); if (mp) mp.hidden = true;
}
function wkUnpin() { _wkPinned = ''; wkHidePreview(); }
document.addEventListener('click', function(e) { if (_wkPinned && !e.target.closest('#wk-preview, #wk-mpreview, #wk-map .wk-bt')) wkUnpin(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && _wkPinned) wkUnpin(); });
window.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ wkLoadMap(_wkFloor); }, 0); });

function renderBooth() {
  var el = document.getElementById('wk-map');
  if(!el) return;
  var html = '';
  DESIGNERS.forEach(function(d){
    html += '<div class="wk-booth" title="'+d.kr+' — '+d.booth+'">'+d.booth+'</div>';
  });
  el.innerHTML = html;
}


/* ── 캐러셀 ── */
var _carImgs = [];
var _carIdx  = 0;

function initCarousel(imgs, altText) {
  _carImgs = imgs && imgs.length ? imgs : ['images/works/none.jpg'];
  _carIdx  = 0;
  var multi = _carImgs.length > 1;

  // 화살표 표시/숨김
  document.getElementById('wdc-prev').style.display = multi ? 'flex' : 'none';
  document.getElementById('wdc-next').style.display = multi ? 'flex' : 'none';

  // 도트 생성
  var dots = document.getElementById('wdc-dots');
  if(multi) {
    dots.innerHTML = _carImgs.map(function(_, i){
      return '<span class="wdc-dot' + (i===0?' active':'') + '" onclick="carGoTo('+i+')"></span>';
    }).join('');
    dots.style.display = 'flex';
  } else {
    dots.innerHTML = '';
    dots.style.display = 'none';
  }

  _carSetImg(0, altText);
}

function _carSetImg(idx, altText) {
  _carIdx = idx;
  var img = document.getElementById('wd-img');
  img.onerror = function(){ this.onerror=null; this.src='images/works/none.jpg'; };
  img.alt = altText || '';
  img.src = _carImgs[idx];
  // 도트 active
  document.querySelectorAll('.wdc-dot').forEach(function(d,i){ d.classList.toggle('active', i===idx); });
}

function carStep(dir) {
  _carSetImg((_carIdx + dir + _carImgs.length) % _carImgs.length);
}

function carGoTo(idx) {
  _carSetImg(idx);
}


/* ══ 포토부스 (PHOTOBOOTH) ══ */
var boothStream = null;
var boothPhotos = [];
var boothRunning = false;
var boothStickers = [];          // {el} 리스트
var _sid = 0;
var _frameColor = '#F2F2F7';     // 스트립 배경(프레임) 색
var _bubbleInk  = { bg: '#5254FF', fg: '#FFFFFF' }; // 말풍선 색
var _cam = 'ccd';                // 선택 카메라
var CAMS = {
  ccd:   { name: 'CCD' },       // 쿨·클린 디카룩
  fuji:  { name: 'FILM' },      // 밝고 따뜻·에어리 + 그레인
  pixel: { name: 'PIXEL' }      // 픽셀 아트(레트로)
};

/* 스테이지 전환: pick / start / edit */
function boothShowStage(name) {
  ['pick', 'start', 'edit'].forEach(function(s) {
    var el = document.getElementById('pb-' + s);
    if (el) el.hidden = (s !== name);
  });
}

/* 카메라 선택 → 촬영 화면으로 */
/* 카메라 선택 화면으로 돌아가기 */
function boothBackToPick() {
  if (boothRunning) return;
  boothShowStage('pick');
}

function boothPickCam(cam) {
  _cam = cam;
  var pb = document.getElementById('pb');
  pb.classList.remove('fx-ccd', 'fx-canon', 'fx-fuji');
  pb.classList.add('fx-' + cam);
  var tag = document.getElementById('pb-cam-tag');
  if (tag) tag.textContent = CAMS[cam].name;
  boothShowStage('start');
  boothResetTimer();
  boothInitCam().catch(function(){});
}

/* ── 촬영 결과에 카메라 감성 필터 적용 (픽셀 단위 컬러 그레이딩) ── */
function _cl(v){ return v < 0 ? 0 : v > 255 ? 255 : v; }
function _smooth(t){ return t<0?0:t>1?1:t*t*(3-2*t); } // smoothstep

/* 밝은 영역만 뽑아 블러 후 가산 합성 → 리얼 헐레이션/글로우 */
function _bloom(canvas, threshold, blurPx, strength, tint) {
  var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
  var t = document.createElement('canvas'); t.width = w; t.height = h;
  var tx = t.getContext('2d', { willReadFrequently: true });
  tx.drawImage(canvas, 0, 0);
  var im = tx.getImageData(0, 0, w, h), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    var l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    if (l <= threshold) { d[i]=d[i+1]=d[i+2]=0; }
    else {
      var k = (l - threshold) / (255 - threshold);      // 0..1
      k = k*k;                                           // 하이라이트일수록 급증
      d[i]=tint[0]*k; d[i+1]=tint[1]*k; d[i+2]=tint[2]*k;
    }
  }
  tx.putImageData(im, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  ctx.filter = 'blur(' + blurPx + 'px)';
  ctx.drawImage(t, 0, 0);
  ctx.restore(); ctx.filter = 'none'; ctx.globalAlpha = 1;
}
function _vignette(canvas, inner, strength) {
  var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
  var g = ctx.createRadialGradient(w/2, h*0.46, Math.min(w,h)*inner, w/2, h*0.5, Math.max(w,h)*0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function _grain(canvas, amt, mono) {
  var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
  var im = ctx.getImageData(0, 0, w, h), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    if (mono) { var n = (Math.random()-0.5)*amt; d[i]=_cl(d[i]+n); d[i+1]=_cl(d[i+1]+n); d[i+2]=_cl(d[i+2]+n); }
    else { d[i]=_cl(d[i]+(Math.random()-0.5)*amt); d[i+1]=_cl(d[i+1]+(Math.random()-0.5)*amt); d[i+2]=_cl(d[i+2]+(Math.random()-0.5)*amt); }
  }
  ctx.putImageData(im, 0, 0);
}

/* 채널 톤커브 LUT: black 리프트, white 롤오프, gamma, gain(화이트밸런스) */
function _toneLut(black, white, gamma, gain) {
  var a = new Float32Array(256);
  for (var i = 0; i < 256; i++) {
    var v = Math.pow(i / 255, gamma);
    a[i] = (black + (white - black) * v) * gain;
  }
  return a;
}
/* 디더(error-diffusion) — 그레인 + Floyd-Steinberg 2톤 잉크 */
var _DITH_INK = [82, 84, 255], _DITH_PAPER = [242, 241, 236];
function _ditherCanvas(canvas, px) {
  var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
  var sw = Math.max(1, Math.round(w / px)), sh = Math.max(1, Math.round(h / px));
  var small = document.createElement('canvas'); small.width = sw; small.height = sh;
  var sx = small.getContext('2d', { willReadFrequently: true });
  sx.drawImage(canvas, 0, 0, sw, sh);
  var im = sx.getImageData(0, 0, sw, sh), d = im.data, n = sw * sh;
  var L = new Float32Array(n);
  for (var i = 0, j = 0; j < n; i += 4, j++) {
    var v = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    v = 255 * Math.pow(v / 255, 0.9);                // 감마(살짝 밝게)
    v = 128 + (v - 128) * 1.55;                      // 대비
    L[j] = v + (Math.random() - 0.5) * 36;           // 그레인
  }
  for (var y = 0; y < sh; y++) {
    for (var x = 0; x < sw; x++) {
      var k = y * sw + x, o = L[k], q = o < 128 ? 0 : 255, e = o - q;
      L[k] = q;
      if (x + 1 < sw) L[k+1] += e * 7/16;
      if (y + 1 < sh) {
        if (x > 0) L[k+sw-1] += e * 3/16;
        L[k+sw] += e * 5/16;
        if (x + 1 < sw) L[k+sw+1] += e * 1/16;
      }
    }
  }
  for (var i2 = 0, j2 = 0; j2 < n; i2 += 4, j2++) {
    var c = L[j2] ? _DITH_PAPER : _DITH_INK;
    d[i2] = c[0]; d[i2+1] = c[1]; d[i2+2] = c[2]; d[i2+3] = 255;
  }
  sx.putImageData(im, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, w, h);
  ctx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}
function _gradePixel(canvas) { _ditherCanvas(canvas, Math.max(1, Math.round(canvas.width / 640))); }

/* ── 카메라 룩 (CCD / FILM) — 채널 커브 + 3-way 컬러 + 스킨 보호 채도 ── */
/* 모노톤 큐빅 보간 커브 → 256 LUT */
function _curve(pts) {
  var n = pts.length, xs = [], ys = [], m = [], dl = [], a = new Float32Array(256), i;
  for (i = 0; i < n; i++) { xs.push(pts[i][0]); ys.push(pts[i][1]); }
  for (i = 0; i < n - 1; i++) dl.push((ys[i+1]-ys[i]) / (xs[i+1]-xs[i]));
  m[0] = dl[0]; m[n-1] = dl[n-2];
  for (i = 1; i < n - 1; i++) m[i] = dl[i-1]*dl[i] <= 0 ? 0 : (dl[i-1]+dl[i]) / 2;
  for (var x = 0, k = 0; x < 256; x++) {
    while (k < n - 2 && x > xs[k+1]) k++;
    var hh = xs[k+1]-xs[k], t = (x - xs[k]) / hh, t2 = t*t, t3 = t2*t;
    a[x] = (2*t3-3*t2+1)*ys[k] + (t3-2*t2+t)*hh*m[k] + (-2*t3+3*t2)*ys[k+1] + (t3-t2)*hh*m[k+1];
  }
  return a;
}
var LOOKS = {
  // CCD 디카 (2000년대 컴팩트 디카): 쿨·시안 섀도, 쨍한 대비, 살짝 날아가는 하이라이트
  ccd: {
    M: _curve([[0,0],[40,32],[96,94],[160,166],[220,226],[255,250]]),
    R: _curve([[0,0],[128,124],[255,252]]),
    G: _curve([[0,2],[128,129],[255,255]]),
    B: _curve([[0,12],[128,138],[255,255]]),
    sh: [-6, 2, 10], hi: [-2, 2, 6], sat: 1.14, skin: 0.55
  },
  // FILM (Portra/Superia 계열): 매트 블랙, 웜 하이라이트, 그린-틸 섀도, 부드러운 롤오프
  fuji: {
    M: _curve([[0,24],[40,46],[96,98],[160,170],[215,222],[255,240]]),
    R: _curve([[0,0],[128,130],[255,252]]),
    G: _curve([[0,6],[128,129],[255,250]]),
    B: _curve([[0,16],[128,126],[255,246]]),
    sh: [-6, 5, 8], hi: [3, 2, -1], sat: 0.92, skin: 0.5
  }
};
/* 마스터 커브 → 채널 커브를 하나의 LUT로 합성(캐시) */
function _lookLuts(L) {
  if (L._r) return L;
  var f = function(C) { var o = new Float32Array(256);
    for (var x = 0; x < 256; x++) { var v = Math.round(_cl(L.M[x])); o[x] = _cl(C[v]); } return o; };
  L._r = f(L.R); L._g = f(L.G); L._b = f(L.B);
  return L;
}
function _gradeData(d, L) {
  _lookLuts(L);
  var R = L._r, G = L._g, B = L._b, sat = L.sat, sk = L.skin;
  for (var i = 0; i < d.length; i += 4) {
    var r = R[d[i]], g = G[d[i+1]], b = B[d[i+2]];
    var lum = (0.299*r + 0.587*g + 0.114*b) / 255, s = (1-lum)*(1-lum), h = lum*lum;
    r += L.sh[0]*s + L.hi[0]*h; g += L.sh[1]*s + L.hi[1]*h; b += L.sh[2]*s + L.hi[2]*h;
    var y = 0.299*r + 0.587*g + 0.114*b;
    // 스킨톤(r>g>b) 영역은 채도 변화를 줄여 피부를 자연스럽게
    var isSkin = (r > g && g > b && r - b > 20) ? sk : 0;
    var k = sat + (1 - sat) * isSkin;
    d[i] = _cl(y + (r-y)*k); d[i+1] = _cl(y + (g-y)*k); d[i+2] = _cl(y + (b-y)*k);
  }
}
/* 언샵 마스크(디카 특유의 샤픈) */
function _sharpen(canvas, amt, rad) {
  var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
  var t = document.createElement('canvas'); t.width = w; t.height = h;
  var tx = t.getContext('2d', { willReadFrequently: true });
  tx.filter = 'blur(' + rad + 'px)'; tx.drawImage(canvas, 0, 0); tx.filter = 'none';
  var bl = tx.getImageData(0, 0, w, h).data, im = ctx.getImageData(0, 0, w, h), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    d[i] = _cl(d[i] + (d[i]-bl[i])*amt); d[i+1] = _cl(d[i+1] + (d[i+1]-bl[i+1])*amt); d[i+2] = _cl(d[i+2] + (d[i+2]-bl[i+2])*amt);
  }
  ctx.putImageData(im, 0, 0);
}
/* 필름 그레인: 중간톤에 강하고, 살짝 뭉친 입자 */
function _filmGrain(canvas, amt) {
  var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
  var gw = Math.ceil(w / 1.3), gh = Math.ceil(h / 1.3);
  var g = document.createElement('canvas'); g.width = gw; g.height = gh;
  var gx = g.getContext('2d'), gi = gx.createImageData(gw, gh), gd = gi.data;
  for (var j = 0; j < gd.length; j += 4) { var v = 128 + (Math.random()-0.5)*255; gd[j]=gd[j+1]=gd[j+2]=v; gd[j+3]=255; }
  gx.putImageData(gi, 0, 0);
  var t = document.createElement('canvas'); t.width = w; t.height = h;
  var tx = t.getContext('2d', { willReadFrequently: true });
  tx.filter = 'blur(0.5px)'; tx.drawImage(g, 0, 0, w, h); tx.filter = 'none';
  var nd = tx.getImageData(0, 0, w, h).data, im = ctx.getImageData(0, 0, w, h), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    var l = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) / 255;
    var n = (nd[i] - 128) / 128 * amt * (0.35 + 1.3 * l * (1 - l) * 2);
    d[i] = _cl(d[i]+n); d[i+1] = _cl(d[i+1]+n); d[i+2] = _cl(d[i+2]+n);
  }
  ctx.putImageData(im, 0, 0);
}

/* 촬영 결과에 카메라 룩 적용 */
function boothApplyCam(canvas) {
  if (_cam === 'pixel') { _gradePixel(canvas); return; }
  var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  var im = ctx.getImageData(0, 0, w, h);
  _gradeData(im.data, LOOKS[_cam]);
  ctx.putImageData(im, 0, 0);
  if (_cam === 'ccd') {
    _sharpen(canvas, 0.45, 1.2);                      // 디카 샤픈
    _bloom(canvas, 228, 6, 0.22, [235, 245, 255]);   // 플래시 하이라이트 번짐(쿨)
    _grain(canvas, 7, false);                         // 센서 컬러 노이즈
    _vignette(canvas, 0.45, 0.16);
  } else {
    var c2 = ctx; c2.save(); c2.filter = 'blur(0.6px)'; c2.drawImage(canvas, 0, 0); c2.restore(); c2.filter = 'none'; // 필름 소프트니스
    _bloom(canvas, 212, 10, 0.32, [255, 90, 60]);     // 할레이션(붉은 번짐)
    _filmGrain(canvas, 20);
    _vignette(canvas, 0.4, 0.24);
  }
}

/* ── 원근 격자 배경 SVG ── */
/* 배경 그리드는 Figma 원본 이미지(images/booth/grid.png)를 CSS 배경으로 사용 — JS 주입 불필요 */
function boothBuildGrid() {}

/* ── 뷰티 필터 ── */
var _bPrevW = 640, _bPrevH = 480; // 4:3 프리뷰
var _bTmpC, _bTmpCtx, _bPrevCtx, _bAnimId, _bLUT;

function _buildBeautyLUT(w, h) {
  var lut = new Float32Array(w * h * 2);
  var cx = w / 2, faceCY = h * 0.45;
  var slimSigY = h * 0.32, slimStr = 0.025;
  var slimSigX = w * 0.42;
  var eyeCx = cx, eyeCy = h * 0.38, eyeR = Math.min(w, h) * 0.20, eyeStr = 0.09;
  for (var dy = 0; dy < h; dy++) {
    for (var dx = 0; dx < w; dx++) {
      var dCX = dx - cx;
      var gY = Math.exp(-((dy - faceCY) * (dy - faceCY)) / (2 * slimSigY * slimSigY));
      var gX = Math.exp(-(dCX * dCX) / (2 * slimSigX * slimSigX));
      var slimG = gY * gX;
      var sx = cx + dCX * (1 + slimStr * slimG);
      var sy = dy;
      var edx = sx - eyeCx, edy = sy - eyeCy;
      var ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < eyeR && ed > 0) {
        var cosFade = 0.5 * (1 + Math.cos(Math.PI * ed / eyeR));
        sx -= edx * eyeStr * cosFade;
        sy -= edy * eyeStr * cosFade;
      }
      var i = (dy * w + dx) * 2;
      lut[i]   = Math.max(0, Math.min(w - 1, sx));
      lut[i+1] = Math.max(0, Math.min(h - 1, sy));
    }
  }
  return lut;
}

/* 얼굴 왜곡(뷰티 워프) 제거 — 원본 그대로 복사 */
function _applyWarp(src, dst, lut, w, h) {
  dst.set(src);
}

function _boothLoop() {
  var video = document.getElementById('booth-video');
  if (boothStream && video.readyState >= 2) {
    var w = _bPrevW, h = _bPrevH;
    var vw = video.videoWidth || w, vh = video.videoHeight || h;
    var tRatio = w / h, sRatio = vw / vh;
    var sx, sy, sw, sh;
    if (sRatio > tRatio) { sh = vh; sw = Math.round(vh * tRatio); sx = Math.round((vw-sw)/2); sy = 0; }
    else                 { sw = vw; sh = Math.round(vw / tRatio); sx = 0; sy = Math.round((vh-sh)/2); }
    _bTmpCtx.save();
    _bTmpCtx.translate(w, 0); _bTmpCtx.scale(-1, 1);
    _bTmpCtx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    _bTmpCtx.restore();
    var src = _bTmpCtx.getImageData(0, 0, w, h);
    var dst = new ImageData(w, h);
    _applyWarp(src.data, dst.data, _bLUT, w, h);
    if (LOOKS[_cam]) _gradeData(dst.data, LOOKS[_cam]); // 프리뷰에도 같은 룩
    _bPrevCtx.putImageData(dst, 0, 0);
    // 픽셀 카메라: 라이브 프리뷰도 디더
    if (_cam === 'pixel') _ditherCanvas(_bPrevCtx.canvas, 1);
  }
  _bAnimId = requestAnimationFrame(_boothLoop);
}

function _boothStartBeauty() {
  var w = _bPrevW, h = _bPrevH;
  _bTmpC = document.createElement('canvas');
  _bTmpC.width = w; _bTmpC.height = h;
  _bTmpCtx = _bTmpC.getContext('2d', { willReadFrequently: true });
  var prev = document.getElementById('booth-preview');
  prev.width = w; prev.height = h;
  _bPrevCtx = prev.getContext('2d');
  _bLUT = _buildBeautyLUT(w, h);
  if (_bAnimId) cancelAnimationFrame(_bAnimId);
  _boothLoop();
}

function boothInitCam() {
  if (boothStream) return Promise.resolve();
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(function(stream) {
      boothStream = stream;
      document.getElementById('booth-video').srcObject = stream;
      _boothStartBeauty();
      var pb = document.getElementById('pb');
      if (pb) pb.classList.add('cam-on'); // 촬영 전부터 프리뷰 표시
    });
}

/* ── 촬영: 4컷 (4:3) ── */
var CAP_W = 800, CAP_H = 600;
var _bubblePos = { x: 20, y: null };

function boothSetProgress(p) {
  var el = document.getElementById('pb-prog');
  if (el) el.style.width = Math.max(0, Math.min(100, p * 100)) + '%';
}
/* SEC 원형 카운트다운 링 (frac 1→0) */
function boothSetRing(frac) {
  var el = document.getElementById('pb-ring');
  if (el) el.style.strokeDashoffset = 289 * (1 - Math.max(0, Math.min(1, frac)));
}
/* 촬영 대기 상태(가득 찬 링·바, SEC=3) */
function boothResetTimer() {
  boothSetInd(3, null); boothSetRing(1); boothSetProgress(1);
}

function boothStart() {
  if (boothRunning) return;
  boothInitCam().then(function() {
    boothRunning = true;
    boothPhotos = [];
    document.getElementById('pb').classList.add('shooting');
    boothResetTimer();
    boothShootSequence(0);
  }).catch(function() {
    alert('카메라 접근 권한이 필요합니다.');
  });
}

function boothSetInd(sec, cutIdx) {
  var s = document.getElementById('pb-sec');
  var c = document.getElementById('pb-cut');
  if (s && sec != null) s.textContent = sec;
  if (c && cutIdx != null) c.textContent = cutIdx + '/4';
}

function boothShootSequence(shotIdx) {
  if (shotIdx >= 4) {
    boothRunning = false;
    boothSetProgress(0);
    boothSetInd(0, 4);
    boothEnterEdit();
    return;
  }
  boothSetInd(3, shotIdx + 1); // 현재 컷 표시
  boothCountdown(3, function() {
    boothCapture(shotIdx);
    setTimeout(function() { boothShootSequence(shotIdx + 1); }, 600);
  });
}

/* 3→2→1 부드럽게: SEC 숫자·원형 링·상단 바를 초에 맞춰 함께 닳게 */
function boothCountdown(sec, cb) {
  var dur = sec * 1000, start = performance.now();
  (function tick(now) {
    now = now || performance.now();
    var remain = Math.max(0, dur - (now - start));
    var frac = remain / dur;
    boothSetInd(Math.max(1, Math.ceil(remain / 1000)), null);
    boothSetRing(frac);
    boothSetProgress(frac);
    if (remain <= 0) { boothSetRing(0); boothSetProgress(0); cb(); return; }
    requestAnimationFrame(tick);
  })();
}

function boothCapture(idx) {
  var video = document.getElementById('booth-video');
  var vw = video.videoWidth  || 1280;
  var vh = video.videoHeight || 720;
  var targetRatio = CAP_W / CAP_H;
  var srcRatio = vw / vh;
  var srcX, srcY, srcW, srcH;
  if (srcRatio > targetRatio) {
    srcH = vh; srcW = Math.round(vh * targetRatio);
    srcX = Math.round((vw - srcW) / 2); srcY = 0;
  } else {
    srcW = vw; srcH = Math.round(vw / targetRatio);
    srcX = 0; srcY = Math.round((vh - srcH) / 2);
  }
  var cW = CAP_W, cH = CAP_H;
  var tmpC = document.createElement('canvas');
  tmpC.width = cW; tmpC.height = cH;
  var tmpCtx = tmpC.getContext('2d', { willReadFrequently: true });
  tmpCtx.save();
  tmpCtx.translate(cW, 0); tmpCtx.scale(-1, 1);
  tmpCtx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, cW, cH);
  tmpCtx.restore();
  var capLUT = _buildBeautyLUT(cW, cH);
  var src = tmpCtx.getImageData(0, 0, cW, cH);
  var dst = new ImageData(cW, cH);
  _applyWarp(src.data, dst.data, capLUT, cW, cH);
  var canvas = document.createElement('canvas');
  canvas.width = cW; canvas.height = cH;
  var ctx = canvas.getContext('2d');
  var warpC = document.createElement('canvas');
  warpC.width = cW; warpC.height = cH;
  warpC.getContext('2d').putImageData(dst, 0, 0);
  ctx.drawImage(warpC, 0, 0);
  ctx.filter = 'blur(1.2px) contrast(1.07)';
  ctx.globalAlpha = 0.28;
  ctx.drawImage(warpC, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none';
  boothApplyCam(canvas); // 카메라 감성 필터
  var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  boothPhotos[idx] = dataUrl;
  var frame = document.getElementById('booth-frame-' + idx);
  frame.innerHTML = '<img src="' + dataUrl + '" alt="photo ' + (idx + 1) + '">';
}

/* ── 편집 화면 진입 ── */
function boothEnterEdit() {
  document.getElementById('pb').classList.remove('shooting');
  boothShowStage('edit');
  boothMTab('sticker'); // 모바일 기본 탭
  boothApplyFrame();
  boothUpdateBubble();
}

/* 모바일 편집 탭 전환 (스티커 / 프레임 / 메시지) */
function boothMTab(name) {
  var edit = document.getElementById('pb-edit');
  if (edit) edit.setAttribute('data-mtab', name);
  document.querySelectorAll('.pb-mtabs button').forEach(function(b) {
    b.classList.toggle('is-on', b.getAttribute('data-sec') === name);
  });
}

function boothRetake() {
  boothShowStage('start');
  boothResetTimer();
  boothSetInd(3, 1);
  // 스티커 · 말풍선 초기화
  boothStickers.forEach(function(s){ if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el); });
  boothStickers = [];
  _bubblePos = { x: 20, y: null };
  var ta = document.getElementById('booth-msg-input');
  if (ta) ta.value = '';
  boothUpdateBubble();
  boothCountUpdate();
}

/* ── 프레임 색 ── */
function boothSetFrame(el) {
  document.querySelectorAll('.pb-fswatch').forEach(function(b){ b.classList.remove('is-on'); });
  el.classList.add('is-on');
  _frameColor = el.dataset.frame;
  boothApplyFrame();
}
function boothApplyFrame() {
  var strip = document.getElementById('booth-strip');
  if (strip) strip.style.background = _frameColor;
  var dark = boothIsDark(_frameColor);
  var foot = strip ? strip.querySelector('.booth-strip-footer') : null;
  if (foot) foot.style.color = dark ? 'rgba(255,255,255,.7)' : '#999';
}
function boothIsDark(hex) {
  var c = hex.replace('#',''); if (c.length === 3) c = c.replace(/./g,'$&$&');
  var r=parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) < 140;
}

/* ── 말풍선 색 ── */
function boothSetInk(el) {
  document.querySelectorAll('.pb-swatch').forEach(function(b){ b.classList.remove('is-on'); });
  el.classList.add('is-on');
  _bubbleInk = { bg: el.dataset.ink, fg: el.dataset.bubble };
  var bub = document.getElementById('booth-bubble-text');
  if (bub) {
    bub.style.background = _bubbleInk.bg;
    bub.style.color = _bubbleInk.fg;
  }
  var tailStyle = document.getElementById('pb-bubble-tail-style');
  if (!tailStyle) {
    tailStyle = document.createElement('style');
    tailStyle.id = 'pb-bubble-tail-style';
    document.head.appendChild(tailStyle);
  }
  tailStyle.textContent = '#booth-bubble-text::after{border-top-color:' + _bubbleInk.bg + '}';
}

/* ── 메시지 ── */
function boothCountUpdate() {
  var ta = document.getElementById('booth-msg-input');
  var c = document.getElementById('pb-count');
  if (ta && c) c.textContent = (ta.value.length) + '/60';
}
function boothUpdateBubble() {
  boothCountUpdate();
  var msg = (document.getElementById('booth-msg-input').value || '').trim();
  var bubbleEl = document.getElementById('booth-bubble-text');
  if (!bubbleEl) return;
  if (msg && boothPhotos.length === 4) {
    bubbleEl.textContent = msg;
    bubbleEl.style.display = 'inline-block';
    bubbleEl.style.background = _bubbleInk.bg;
    bubbleEl.style.color = _bubbleInk.fg;
    if (_bubblePos.y === null) {
      var strip = document.getElementById('booth-strip');
      var sh = strip ? strip.offsetHeight : 500;
      _bubblePos.y = Math.round(sh * 0.62);
    }
    bubbleEl.style.left = _bubblePos.x + 'px';
    bubbleEl.style.top  = _bubblePos.y + 'px';
  } else {
    bubbleEl.style.display = 'none';
  }
}

/* ── 스티커 추가 ── */
function boothAddSticker(n) {
  var overlay = document.getElementById('pb-overlay');
  if (!overlay) return;
  var strip = document.getElementById('booth-strip');
  var el = document.createElement('div');
  el.className = 'pb-sticker-inst';
  el.dataset.sid = (++_sid);
  var img = new Image();
  img.src = 'images/booth/sticker' + n + '.png';
  el.appendChild(img);
  // 살짝 랜덤 위치 (겹침 방지)
  var sw = strip ? strip.offsetWidth : 320;
  var sh = strip ? strip.offsetHeight : 480;
  var px = Math.round(sw * 0.3 + (Math.random() * sw * 0.3));
  var py = Math.round(sh * 0.2 + (Math.random() * sh * 0.4));
  el.style.left = px + 'px';
  el.style.top  = py + 'px';
  overlay.appendChild(el);
  boothStickers.push({ el: el });
}

/* ── 드래그 (말풍선 + 스티커) ── */
(function() {
  var dragging = null, startX, startY, origX, origY;
  function isTarget(t) {
    if (!t) return null;
    if (t.id === 'booth-bubble-text') return t;
    var st = t.closest ? t.closest('.pb-sticker-inst') : null;
    return st || null;
  }
  function onDown(e) {
    var t = e.target;
    var el = isTarget(t);
    if (!el) return;
    dragging = el;
    el.classList.add('dragging');
    var touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX; startY = touch.clientY;
    origX = parseFloat(el.style.left) || 0;
    origY = parseFloat(el.style.top) || 0;
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    var touch = e.touches ? e.touches[0] : e;
    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    var wrap = dragging.parentElement; // pb-overlay
    var maxX = wrap.offsetWidth  - dragging.offsetWidth;
    var maxY = wrap.offsetHeight - dragging.offsetHeight;
    var nx = Math.max(0, Math.min(maxX, origX + dx));
    var ny = Math.max(0, Math.min(maxY, origY + dy));
    dragging.style.left = nx + 'px';
    dragging.style.top  = ny + 'px';
    if (dragging.id === 'booth-bubble-text') { _bubblePos.x = nx; _bubblePos.y = ny; }
    e.preventDefault();
  }
  function onUp() {
    if (!dragging) return;
    dragging.classList.remove('dragging');
    dragging = null;
  }
  document.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
})();

/* ── 최종 이미지 합성 (WYSIWYG: 미리보기 레이아웃 기반) ── */
function boothWrapText(ctx, text, maxW) {
  var chars = text.split(''), lines = [], line = '';
  for (var i = 0; i < chars.length; i++) {
    var test = line + chars[i];
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = chars[i]; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function boothBuildCanvas(cb) {
  var strip = document.getElementById('booth-strip');
  var SW = strip.offsetWidth, SH = strip.offsetHeight;
  var scale = 1080 / SW;
  var canvas = document.getElementById('booth-canvas');
  canvas.width  = Math.round(SW * scale);
  canvas.height = Math.round(SH * scale);
  var ctx = canvas.getContext('2d');
  // 배경(프레임 색)
  ctx.fillStyle = _frameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var frames = [];
  for (var i = 0; i < 4; i++) frames.push(document.getElementById('booth-frame-' + i));

  function drawCover(img, x, y, w, h) {
    var ir = img.width / img.height, rr = w / h, sx, sy, sw, sh;
    if (ir > rr) { sh = img.height; sw = img.height * rr; sx = (img.width - sw) / 2; sy = 0; }
    else         { sw = img.width;  sh = img.width / rr;  sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  var toLoad = boothPhotos.length, loaded = 0;
  function finish() {
    // 푸터
    var dark = boothIsDark(_frameColor);
    ctx.fillStyle = dark ? 'rgba(255,255,255,.72)' : '#999';
    ctx.font = '700 ' + (10 * scale) + 'px ' + (document.body.style.fontFamily || 'sans-serif');
    ctx.textAlign = 'center';
    ctx.fillText('CAPTCHA! — 2026 SNUT', canvas.width / 2, SH * scale - 12 * scale);
    ctx.textAlign = 'left';
    // 스티커
    boothStickers.forEach(function(s) {
      var el = s.el, im = el.querySelector('img');
      if (!im || !im.complete) return;
      ctx.drawImage(im, el.offsetLeft * scale, el.offsetTop * scale, el.offsetWidth * scale, el.offsetHeight * scale);
    });
    // 말풍선
    var bub = document.getElementById('booth-bubble-text');
    if (bub && bub.style.display !== 'none' && bub.textContent) {
      boothDrawBubble(ctx, bub, scale);
    }
    cb(canvas);
  }

  if (toLoad === 0) { finish(); return; }
  boothPhotos.forEach(function(srcUrl, i) {
    var img = new Image();
    img.onload = function() {
      var f = frames[i];
      drawCover(img, f.offsetLeft * scale, f.offsetTop * scale, f.offsetWidth * scale, f.offsetHeight * scale);
      loaded++;
      if (loaded === toLoad) finish();
    };
    img.src = srcUrl;
  });
}

function boothDrawBubble(ctx, el, scale) {
  var x = el.offsetLeft * scale, y = el.offsetTop * scale;
  var w = el.offsetWidth * scale, h = el.offsetHeight * scale;
  var r = 14 * scale, tail = 6 * scale;
  ctx.save();
  ctx.fillStyle = _bubbleInk.bg;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  // 꼬리
  ctx.beginPath();
  ctx.moveTo(x + 14 * scale, y + h);
  ctx.lineTo(x + 14 * scale, y + h + tail);
  ctx.lineTo(x + 26 * scale, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 텍스트
  var fs = 11 * scale, padX = 12 * scale, padY = 7 * scale, lineH = fs * 1.4;
  ctx.fillStyle = _bubbleInk.fg;
  ctx.font = '700 ' + fs + 'px ' + '"Noto Sans KR", sans-serif';
  ctx.textAlign = 'left';
  var lines = boothWrapText(ctx, el.textContent, w - padX * 2);
  lines.forEach(function(l, li) {
    ctx.fillText(l, x + padX, y + padY + fs + li * lineH);
  });
}

function boothShowQR() {
  if (boothPhotos.length < 4) return;
  var qrBtn = document.getElementById('booth-qr-btn');
  qrBtn.disabled = true;
  var label = qrBtn.innerHTML;
  qrBtn.textContent = '업로드 중...';
  boothBuildCanvas(function(canvas) {
    canvas.toBlob(function(blob) {
      var form = new FormData();
      form.append('file', blob, 'photobooth_2026_snut.jpg');
      fetch('https://file.io/?expires=10m', { method: 'POST', body: form })
        .then(function(r) { return r.json(); })
        .then(function(json) {
          if (!json.success || !json.link) throw new Error('link 없음');
          boothOpenQRModal(json.link);
        })
        .catch(function(err) {
          console.error('file.io 실패, tmpfiles 시도:', err);
          var form2 = new FormData();
          form2.append('file', blob, 'photobooth_2026_snut.jpg');
          return fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form2 })
            .then(function(r) { return r.json(); })
            .then(function(json) {
              var url = json.data && json.data.url;
              if (!url) throw new Error('url 없음');
              boothOpenQRModal(url.replace('tmpfiles.org/', 'tmpfiles.org/dl/'));
            });
        })
        .catch(function() {
          alert('업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
        })
        .finally(function() {
          qrBtn.disabled = false;
          qrBtn.innerHTML = label;
        });
    }, 'image/jpeg', 0.95);
  });
}

function boothOpenQRModal(url) {
  var qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=' + encodeURIComponent(url);
  document.getElementById('booth-qr-img').src = qrImgUrl;
  document.getElementById('booth-qr-link').href = url;
  document.getElementById('booth-qr-modal').classList.add('show');
}

function boothCloseQR() {
  document.getElementById('booth-qr-modal').classList.remove('show');
}

/* 필터 툴바: 상단에 붙었을(sticky) 때만 흰 배경 */
(function() {
  function check() {
    document.querySelectorAll('.dz-toolbar, .wk-toolbar').forEach(function(el) {
      if (!el.offsetParent) return;
      var top = parseFloat(getComputedStyle(el).top) || 0;
      var r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect();
      var padTop = parseFloat(getComputedStyle(el.parentElement).paddingTop) || 0;
      el.classList.toggle('is-stuck', r.top <= top + 1 && pr.top + padTop < r.top - 1);
    });
  }
  document.addEventListener('scroll', check, { capture: true, passive: true });
  window.addEventListener('resize', check);
  document.addEventListener('click', function() { setTimeout(check, 50); });
})();

/* 작품 상세(데스크탑): 설명 + 다른 작품 카드를 한 덩어리로 왼쪽에 고정 → 설명이 잘리지 않음 */
var WD_GAP = 12; // 다른 작품 카드와 화면 하단 사이 간격(px)
function fitWorkDesc(resize) {
  var info = document.querySelector('.wd-info'), more = document.querySelector('.wd-more-wrap'), body = document.querySelector('.wd-body');
  if (!info || !more || !body) return;
  var card = more.querySelector('.wd-more-card');
  if (window.innerWidth > 920) {
    if (more.parentNode !== info) info.appendChild(more);
    info.style.minHeight = '';
    var r = info.getBoundingClientRect(), room = window.innerHeight - WD_GAP - r.top;
    // 작품을 열 때/창 크기가 바뀔 때만 카드 크기를 정함 → 그 창에서는 크기 고정
    if (resize !== false && card) {
      card.style.maxWidth = '';
      // 국문/영문 중 더 긴 설명 기준으로 계산 → 탭을 바꿔도 카드 크기 그대로
      var desc = document.getElementById('wd-desc'), cur = desc.getAttribute('data-show'), over = -1e9;
      (cur ? ['kr', 'en'] : [null]).forEach(function(l) { if (l) desc.setAttribute('data-show', l); over = Math.max(over, info.getBoundingClientRect().height - room); });
      if (cur) desc.setAttribute('data-show', cur);
      if (over > 0) {
        var img = card.querySelector('.wd-mc-img'), ih = img.getBoundingClientRect().height;
        var nh = Math.max(110, ih - over);
        card.style.maxWidth = Math.round(card.getBoundingClientRect().width * nh / ih) + 'px'; // 3:2 비율 유지하며 카드 전체 축소
      }
      r = info.getBoundingClientRect(); room = window.innerHeight - WD_GAP - r.top;
    }
    info.style.minHeight = Math.max(0, room) + 'px';
  } else { info.style.minHeight = ''; if (card) card.style.maxWidth = ''; if (more.parentNode !== body) body.insertBefore(more, info.nextSibling); }
}
window.addEventListener('scroll', function() { if (document.getElementById('work-detail').classList.contains('active')) fitWorkDesc(false); }, { passive: true });
document.addEventListener('click', function(e) { if (e.target.closest('.wd-lang')) fitWorkDesc(false); });
window.addEventListener('resize', fitWorkDesc);

/* WORK 검색창 폭 = 작품 카드 한 칸 폭 */
function syncWorkSearchWidth() {
  var card = document.querySelector('#work-grid .wk-card'), box = document.querySelector('.wk-search');
  if (!box) return;
  box.style.width = (card && window.innerWidth > 920) ? card.getBoundingClientRect().width + 'px' : '';
}
window.addEventListener('resize', syncWorkSearchWidth);
document.addEventListener('click', function(e) { if (e.target.closest('.nav-links button, .wk-filter')) setTimeout(syncWorkSearchWidth, 50); });

/* 공통 푸터: MAIN 하단 정보(교수·위원회·후원·링크)를 모든 페이지 푸터로 복제 */
window.addEventListener('DOMContentLoaded', function() {
  var src = document.querySelector('#page-main .m-info');
  if (!src) return;
  document.querySelectorAll('footer[data-shared-foot]').forEach(function(f) {
    var c = src.cloneNode(true);
    f.innerHTML = ''; f.appendChild(c);
  });
});
