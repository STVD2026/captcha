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

window.addEventListener('DOMContentLoaded', () => {
    fetch('2026_web.csv', {cache:'no-store'})
        .then(response => {
            if (!response.ok) throw new Error('CSV 로드 실패');
            return response.text();
        })
        .then(csvString => {
            Papa.parse(csvString, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const groupedDesigners = {};

                    results.data.forEach(row => {
                        const krName = row['이름'] || '';
                        if (!groupedDesigners[krName]) {
                            groupedDesigners[krName] = {
                                kr: krName,
                                en: row['영어 이름'] || '',
                                track: row['트랙'] || '',
                                insta: row['인스타'] || '',
                                intro: row['한줄 소개'] || '',
                                profileImg: profileWebp(krName),
                                works: []
                            };
                        }
                        var imgs = [];
                        var imgKeys = ['작품이미지','작품이미지2','작품이미지3','작품이미지4','작품이미지5','작품이미지6','작품이미지7'];
                        imgKeys.forEach(function(k){ if(row[k] && row[k].trim()) imgs.push(row[k].trim()); });
                        if(imgs.length === 0) imgs.push('images/works/none.jpg');
                        groupedDesigners[krName].works.push({
                            workTitle: row['작품명'] || '',
                            category: row['카테고리'] || '',
                            workImgs: imgs
                        });
                    });

                    // 가나다 순 정렬
                    DESIGNERS = Object.values(groupedDesigners)
                        .sort((a, b) => a.kr.localeCompare(b.kr, 'ko'))
                        .map((designer, index) => ({
                            id: index,
                            ...designer
                        }));

                    // 디자이너별 부스 코드 부여 (작품은 소속 디자이너 부스 공유)
                    DESIGNERS.forEach(function(d, i){
                        d.booth = 'C.' + String(i + 1).padStart(2, '0');
                        d.works.forEach(function(w){ w.booth = d.booth; });
                        // 프로필 이미지가 없을 때 보여줄 대체 이미지(none1~none6 랜덤, 사람마다 고정)
                        d.noneImg = 'images/profiles/none' + (Math.floor(Math.random() * 6) + 1) + '.png';
                    });

                    renderGrid();
                    renderWorks();
                }
            });
        })
        .catch(err => console.error(err));
});

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
  if (name === 'message') { boothBuildGrid(); boothInitCam().catch(function(){}); }
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
      + '<div class="dz-img"><img src="' + d.profileImg + '" alt="' + d.kr + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + d.noneImg + '\'"></div>'
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
  img.src = d.profileImg;
  img.alt = d.kr;
  document.getElementById('dz-dkr').textContent = d.kr;
  document.getElementById('dz-den').textContent = d.en;

  var links = '';
  if(d.insta){
    var ig = d.insta.replace(/^@/,'').trim();
    links += '<a class="dz-dh-link" href="https://instagram.com/'+ig+'" target="_blank" rel="noopener noreferrer"><span class="dz-tag">SNS</span><span>'+d.insta+'</span></a>';
  }
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
  document.getElementById('wd-title').textContent = w.workTitle;
  document.getElementById('wd-en').textContent = en;
  document.getElementById('wd-tags').innerHTML =
      '<span class="wd-tag">'+w.booth+'</span>'
    + '<span class="wd-tag">'+w.category+'</span>'
    + '<span class="wd-tag">'+d.kr+'</span>';
  var by = document.getElementById('wd-by');
  by.innerHTML = '<span class="wd-name">'+d.kr+' ('+d.en+')</span>'
    + '<span class="wd-arrow" aria-hidden="true">↗</span>';
  by.onclick = function(){ openDesignerFromWork(dIdx); };
  document.getElementById('wd-cat2').textContent = d.track || w.category;
  document.getElementById('wd-desc').textContent = (d.intro && d.intro.trim())
      ? d.intro
      : (d.kr + ' 디자이너의 졸업 작품입니다. Captcha! 졸업전시를 위해 제작되었습니다.');
  document.getElementById('wd-dlink2').onclick = function(){ openDesignerFromWork(dIdx); };
  // 디자이너 다른 작품 썸네일 (다른 작품이 있으면 그것, 없으면 현재 작품)
  var otherIdx = (d.works.length > 1) ? ((wIdx + 1) % d.works.length) : wIdx;
  var ow = d.works[otherIdx];
  var oen = CAT_EN[ow.category] || '';
  var mc = document.getElementById('wd-more-card');
  mc.innerHTML = '<div class="wd-mc-img"><img src="'+ow.workImgs[0]+'" alt="'+ow.workTitle+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'"></div>'
    + '<div class="wd-mc-body"><div class="wd-mc-title">'+ow.workTitle+'</div><div class="wd-mc-en">'+oen+'</div></div>';
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
    +'<div class="wk-card-img"><img src="'+w.workImgs[0]+'" alt="'+w.workTitle+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/works/none.jpg\'"></div>'
    +'<div class="wk-card-body"><div class="wk-card-title">'+w.workTitle+'</div><div class="wk-card-en">'+en+'</div></div>'
    +'<div class="wk-card-tags"><span class="wk-tag">'+w.booth+'</span><span class="wk-tag">'+w.category+'</span><span class="wk-tag name">'+d.kr+'</span></div>'
    +'</div>';
}

function renderWorks() {
  var q = curWorkSearch.trim().toLowerCase();
  var html = '';
  for(var i=0; i<DESIGNERS.length; i++){
    var d = DESIGNERS[i];
    for(var wi=0; wi<d.works.length; wi++){
      var w = d.works[wi];
      if(curWorkCat!=='all' && w.category!==curWorkCat) continue;
      if(q){
        var hay = (w.workTitle+' '+d.kr+' '+d.en+' '+w.category+' '+w.booth).toLowerCase();
        if(hay.indexOf(q) < 0) continue;
      }
      html += workCardHTML(i, wi);
    }
  }
  if(!html) html = '<div class="wk-empty">검색 결과가 없습니다.</div>';
  document.getElementById('work-grid').innerHTML = html;
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

function wkFloor(btn) {
  document.querySelectorAll('.wk-floor').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

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

function _applyWarp(src, dst, lut, w, h) {
  for (var i = 0; i < w * h; i++) {
    var di = i * 4;
    var sx = lut[i*2], sy = lut[i*2+1];
    var x0=sx|0, y0=sy|0, x1=Math.min(w-1,x0+1), y1=Math.min(h-1,y0+1);
    var fx=sx-x0, fy=sy-y0;
    var i00=(y0*w+x0)*4,i10=(y0*w+x1)*4,i01=(y1*w+x0)*4,i11=(y1*w+x1)*4;
    for (var c=0;c<3;c++) {
      dst[di+c]=(src[i00+c]*(1-fx)*(1-fy)+src[i10+c]*fx*(1-fy)+
                 src[i01+c]*(1-fx)*fy+src[i11+c]*fx*fy)|0;
    }
    dst[di+3]=255;
  }
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
    _bPrevCtx.putImageData(dst, 0, 0);
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
  if (el) el.style.width = Math.round(p * 100) + '%';
}

function boothStart() {
  if (boothRunning) return;
  boothInitCam().then(function() {
    boothRunning = true;
    boothPhotos = [];
    document.getElementById('pb').classList.add('shooting');
    boothSetProgress(0);
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
    boothSetProgress(1);
    boothSetInd(0, 4);
    boothEnterEdit();
    return;
  }
  boothSetInd(3, shotIdx + 1); // 현재 컷 표시
  boothCountdown(3, function() {
    boothCapture(shotIdx);
    boothSetProgress((shotIdx + 1) / 4);
    setTimeout(function() { boothShootSequence(shotIdx + 1); }, 600);
  });
}

function boothCountdown(sec, cb) {
  var el = document.getElementById('booth-countdown');
  boothSetInd(Math.max(0, sec), null); // 좌측 초 인디케이터 갱신
  if (sec <= 0) { el.textContent = ''; el.classList.remove('show'); cb(); return; }
  el.textContent = sec;
  el.classList.add('show');
  setTimeout(function() { boothCountdown(sec - 1, cb); }, 1000);
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
  var dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  boothPhotos[idx] = dataUrl;
  var frame = document.getElementById('booth-frame-' + idx);
  frame.innerHTML = '<img src="' + dataUrl + '" alt="photo ' + (idx + 1) + '">';
}

/* ── 편집 화면 진입 ── */
function boothEnterEdit() {
  document.getElementById('pb').classList.remove('shooting');
  document.getElementById('pb-start').hidden = true;
  document.getElementById('pb-edit').hidden = false;
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
  document.getElementById('pb-edit').hidden = true;
  document.getElementById('pb-start').hidden = false;
  boothSetProgress(0);
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
