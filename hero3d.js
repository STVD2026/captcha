import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 메인 히어로: 방(그리드) + 4개 오브제
const heroCanvas = document.getElementById('hero-canvas');
if (heroCanvas) initHero(heroCanvas);

// 페이지 배경: 방 없이 페이지별로 다른 오브제 1~2개만 (UI 뒤에 떠다님)
const DESIGNER_BG_LAYOUT = [
  { key: 'steps',         nx: -0.42, ny:  0.30, hf: 0.46, d: 24, rx: 0.26, ry:  0.95, rz:  0.20, mScale: 1.0, mnx: -0.5, mny:  0.5 },
  { key: 'traffic_light', nx:  0.44, ny: -0.30, hf: 0.42, d: 24, rx: 0.10, ry: -0.48, rz:  1.42, mScale: 1.1, mnx:  0.5, mny: -0.5 },
];
const WORK_BG_LAYOUT = [
  { key: 'road_narrows',  nx:  0.42, ny:  0.32, hf: 0.58, d: 20, rx: 0.15, ry:  0.25, rz: -2.30, mScale: 1.0, mnx:  0.5, mny:  0.5 },
  { key: 'fire_hydrant',  nx: -0.42, ny: -0.32, hf: 0.54, d: 22, rx: 0.10, ry:  0.30, rz:  2.19, mScale: 1.1, mnx: -0.5, mny: -0.5 },
];
const designerBg = document.getElementById('designer-bg');
if (designerBg) initHero(designerBg, { withRoom: false, layout: DESIGNER_BG_LAYOUT, sizeMode: 'viewport', bg: true });
const workBg = document.getElementById('work-bg');
if (workBg) initHero(workBg, { withRoom: false, layout: WORK_BG_LAYOUT, sizeMode: 'viewport', bg: true });
// 포토부스 배경: 파란 배경 위를 떠다니는 오브제
const MESSAGE_BG_LAYOUT = [ // 화면 바깥(특히 아래쪽)으로 걸치게
  { key: 'steps',         nx: -0.74, ny:  0.52, hf: 0.38, d: 30, rx: 0.26, ry:  0.95, rz:  0.20, mScale: 1.1, mnx: -0.65, mny:  0.6 },
  { key: 'traffic_light', nx:  0.78, ny:  0.46, hf: 0.42, d: 24, rx: 0.10, ry: -0.48, rz:  1.42, mScale: 1.1, mnx:  0.65, mny:  0.6 },
  { key: 'fire_hydrant',  nx: -0.70, ny: -0.66, hf: 0.44, d: 22, rx: 0.10, ry:  0.30, rz:  2.19, mScale: 1.1, mnx: -0.6, mny: -0.75 },
  { key: 'road_narrows',  nx:  0.66, ny: -0.70, hf: 0.47, d: 22, rx: 0.15, ry:  0.25, rz: -2.30, mScale: 1.1, mnx:  0.6, mny: -0.75 },
];
const messageBg = document.getElementById('message-bg');
if (messageBg) initHero(messageBg, { withRoom: false, layout: MESSAGE_BG_LAYOUT, sizeMode: 'viewport', bg: true, noMouse: true, floatK: 0.55, speed: 0.85 }); // 카메라가 있는 가운데는 비우고 네 모서리에서만, 마우스 반응 없음
// 포토부스 카메라 선택: 카메라별 필터 느낌으로 렌더한 3D 오브제 (ccd / film / pixel)
document.querySelectorAll('canvas.pb-cam-3d').forEach(c => initCamObj(c, c.dataset.key, c.dataset.look));

function initHero(canvas, opts = {}) {
  const withRoom = opts.withRoom !== false;
  const sizeMode = opts.sizeMode || 'stage';
  const stage = canvas.parentElement;
  const BLUE = 0x5254ff;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const scene = new THREE.Scene();

  // ── 1점 투시 방 (클로즈업 느낌을 위해 깊이(ROOM_D)를 줄이고 널널하게 조절) ──
  const ROOM_W = 42, ROOM_H = 42, ROOM_D = 55, CELL = 5.5;
  const CAM_Z = ROOM_D / 2 - 4; // 카메라를 조금 더 앞으로 당겨서 클로즈업 효과
  const FOV = 55; // 시야각을 넓혀서 공간감 극대화
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);
  camera.position.set(0, 0, CAM_Z);
  camera.lookAt(0, 0, -ROOM_D / 2);

  // 조명
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfbfe8, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.4); key.position.set(6, 9, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.0); rim.position.set(-7, 4, 6); scene.add(rim);

  // ── 그리드 벽 ──
  function gridPlane(w, h) {
    const cw = Math.round(w / CELL), ch = Math.round(h / CELL), p = [];
    for (let i = 0; i <= cw; i++) { const x = -w / 2 + w * i / cw; p.push(x, -h / 2, 0, x, h / 2, 0); }
    for (let j = 0; j <= ch; j++) { const y = -h / 2 + h * j / ch; p.push(-w / 2, y, 0, w / 2, y, 0); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    
    // ⭐️ 셰이더에서 구별하기 위한 빨간색 마커
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ 
      color: 0xFF0000, 
      transparent: true, 
      opacity: 1.0 
    }));
  }
  if (withRoom) {
    const room = new THREE.Group(); scene.add(room);
    let m;
    m = gridPlane(ROOM_W, ROOM_H); m.position.z = -ROOM_D / 2; room.add(m);
    m = gridPlane(ROOM_W, ROOM_D); m.rotation.x = -Math.PI / 2; m.position.y = -ROOM_H / 2; room.add(m);
    m = gridPlane(ROOM_W, ROOM_D); m.rotation.x = Math.PI / 2; m.position.y = ROOM_H / 2; room.add(m);
    m = gridPlane(ROOM_D, ROOM_H); m.rotation.y = Math.PI / 2; m.position.x = -ROOM_W / 2; room.add(m);
    m = gridPlane(ROOM_D, ROOM_H); m.rotation.y = -Math.PI / 2; m.position.x = ROOM_W / 2; room.add(m);
  }

  const material = new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.32, metalness: 0, envMapIntensity: 1.0 });

  const draco = new DRACOLoader(); draco.setDecoderPath('./vendor/draco/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  const b64ToBuf = b64 => { const s = atob(b64), n = s.length, a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = s.charCodeAt(i); return a.buffer; };

  const DESIGN_ASPECT = 1440 / 754;
  const LAYOUT = opts.layout || [
    { key: 'steps',         nx: -0.651, ny:  0.138, hf: 0.350, d: 30, rx:  0.26, ry:  0.95, rz:  0.20, mScale: 1.0, mnx: -0.55, mny:  0.56 },
    { key: 'fire_hydrant',  nx: -0.296, ny: -0.186, hf: 0.454, d: 22, rx:  0.10, ry:  0.30, rz:  2.19, mScale: 1.2, mnx: -0.34, mny: -0.52 },
    { key: 'road_narrows',  nx:  0.230, ny:  0.108, hf: 0.799, d: 17, rx:  0.15, ry:  0.25, rz: -2.30, mScale: 1.1, mnx:  0.14, mny:  0.02 },
    { key: 'traffic_light', nx:  0.709, ny:  0.284, hf: 0.282, d: 26, rx:  0.10, ry: -0.48, rz:  1.42, mScale: 1.2, mnx:  0.64, mny:  0.46 },
  ];

  const objs = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function placeModel(def, gltf) {
    const inner = new THREE.Group(), geos = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); geos.push(g); } });
    const box = new THREE.Box3();
    geos.forEach(g => { g.computeBoundingBox(); box.union(g.boundingBox); });
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    geos.forEach(g => { g.translate(-center.x, -center.y, -center.z); inner.add(new THREE.Mesh(g, material)); });
    inner.rotation.set(def.rx, def.ry, def.rz);

    const pivot = new THREE.Group();
    pivot.add(inner);
    scene.add(pivot);

    const near = 1 - (def.d - 17) / 13;
    const mouseAngle = Math.random() * Math.PI * 2;
    const dirX = Math.cos(mouseAngle);
    const dirY = Math.sin(mouseAngle);

    pivot.userData = {
      def, inner, baseH: size.y || 1,
      fAmp: rnd(0.9, 1.7) * (def.d / 22), fSpeed: rnd(0.35, 0.7), fPhase: Math.random() * 6.28,
      dAmp: rnd(0.05, 0.11), dSpeed: rnd(0.2, 0.42), dPhase: Math.random() * 6.28,
      mouseKY: (0.85 + 0.85 * near) * dirY, 
      mouseKX: (0.30 + 0.35 * near) * dirX,
      phase: Math.random() * 6.28,
    };
    objs.push(pivot);
    layoutOne(pivot);
  }

  function designBox(d) {
    const vh = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * d;
    const vw = vh * camera.aspect;
    if (window.innerWidth < 768) {
      const MOBILE_ASPECT = 0.9;
      const H = Math.min(vh, vw / MOBILE_ASPECT);
      return { H, W: H * MOBILE_ASPECT };
    }
    return { H: vh, W: Math.min(vh * DESIGN_ASPECT, vw) };
  }

  function layoutOne(pivot) {
    const u = pivot.userData, def = u.def, b = designBox(def.d);
    const mob = window.innerWidth < 768;
    const sc = mob ? (def.mScale || 1) : 1;
    const spread = mob ? (opts.bg ? 0.75 : 1.12) : 1;
    pivot.position.set(def.nx * b.W * spread, def.ny * b.H * spread, camera.position.z - def.d);
    u.baseY = pivot.position.y; u.baseX = pivot.position.x;
    u.inner.scale.setScalar((def.hf * sc * 2 * b.H) / u.baseH);
  }
  const layoutAll = () => objs.forEach(layoutOne);

  const MODELS = window.CAPTCHA_MODELS || {};
  let li = 0;
  (function loadNext() {
    if (li >= LAYOUT.length) return;
    const def = LAYOUT[li++], buf = MODELS[def.key];
    if (!buf) return loadNext();
    gltfLoader.parse(b64ToBuf(buf), '', gltf => { placeModel(def, gltf); setTimeout(loadNext, 30); },
      err => { console.error('model load error', def.key, err); loadNext(); });
  })();

  // ── 디더(픽셀) 포스트 프로세싱 ──
  const rt = new THREE.WebGLRenderTarget(2, 2, { 
    minFilter: THREE.NearestFilter, 
    magFilter: THREE.NearestFilter, 
    depthBuffer: true 
  });
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postScene = new THREE.Scene();
  const ditherMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uScale: { value: 3.4 },
      uInk: { value: opts.bg ? new THREE.Vector3(0.70, 0.71, 1.0) : new THREE.Vector3(0.322, 0.329, 1.0) }, // 배경용은 연한 라벤더 블루
      uFill: { value: opts.bg ? 1.0 : 0.0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uScale; uniform vec3 uInk; uniform float uFill;
      varying vec2 vUv;
      float bayer(vec2 p){
        mat4 B = mat4( 0.0, 8.0, 2.0,10.0, 12.0, 4.0,14.0, 6.0, 3.0,11.0, 1.0, 9.0, 15.0, 7.0,13.0, 5.0)/16.0;
        int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0));
        vec4 col = B[y];
        float t = col.x;
        if(x==1) t=col.y; else if(x==2) t=col.z; else if(x==3) t=col.w;
        return t;
      }
      float coverage(vec4 c){
        if(c.a < 0.1) return 0.0;
        vec3 rgb = c.rgb / max(c.a, 0.1);
        float lum = dot(rgb, vec3(0.299,0.587,0.114));
        float v = 1.0 - lum;
        v = uFill > 0.5 ? (v - 0.42) * 2.6 + 0.12 : (v - 0.65) * 4.5 + 0.01; // 배경용: 더 꽉 찬 실루엣
        float cov = clamp(v, 0.0, 1.0) * clamp(c.a + 0.25, 0.0, 1.0);
        if(c.a > 0.03) cov = max(cov, 0.001);
        return cov;
      }
      void main(){
        vec2 block = floor(gl_FragCoord.xy / uScale);
        vec2 snappedUv = (block + 0.5) / uRes;
        
        vec4 c = texture2D(tDiffuse, snappedUv); 
        
        if(c.a < 0.05) {
            discard;
        }
        // 그리드 선 처리 (#A0A1FF 컬러 적용 및 예쁜 점선 패턴)
        else if(c.r > c.b + 0.1) {
            float th = bayer(block);
            if(0.5 > th) {
                gl_FragColor = vec4(0.627, 0.631, 1.0, 1.0); // #A0A1FF
            } else {
                discard;
            }
        } 
        // 3D 개체 처리 (오리지널 깔끔한 렌더링 유지)
        else {
            float cov = coverage(c);
            float th = bayer(block);
            
            if(cov > th) {
                gl_FragColor = vec4(uInk, 1.0);
            } else {
                discard;
            }
        }
      }`
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));

  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let PR = 1;
  function resize() {
    const w = sizeMode === 'viewport' ? window.innerWidth  : stage.clientWidth;
    const h = Math.max((sizeMode === 'viewport' ? window.innerHeight : stage.clientHeight) - 43, 1);
    PR = Math.min(window.devicePixelRatio, 1.5);
    const scale = ditherMat.uniforms.uScale.value;
    
    renderer.setPixelRatio(PR);
    renderer.setSize(w, h, false);
    
    // ⭐️ 우측 끝 선이 잘리지 않도록 Math.ceil을 사용해 해상도를 넉넉하게 보정
    const rw = Math.ceil((w * PR) / scale);
    const rh = Math.ceil((h * PR) / scale);
    rt.setSize(rw, rh);
    ditherMat.uniforms.uRes.value.set(rw, rh);
    
    camera.aspect = w / h; camera.updateProjectionMatrix();
    layoutAll();
  }
  if (sizeMode === 'viewport') window.addEventListener('resize', resize);
  else new ResizeObserver(resize).observe(stage);
  resize();

  const clock = new THREE.Clock();
  (function loop() {
    // 페이지가 숨겨져 있으면(비활성) 렌더 생략 — 성능 절약
    if (canvas.getClientRects().length === 0) { requestAnimationFrame(loop); return; }
    const t = clock.getElapsedTime() * (opts.speed || 1); // 배경용은 느리게
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    const mx = (reduce || opts.noMouse) ? 0 : cur.x, my = (reduce || opts.noMouse) ? 0 : cur.y;

    objs.forEach(p => {
      const u = p.userData, inner = u.inner;
      const fk = opts.floatK || 1;
      p.position.y = u.baseY + Math.sin(t * u.fSpeed + u.fPhase) * u.fAmp * (opts.bg ? 1.6 : 1) * fk;
      if (opts.bg) p.position.x = u.baseX + Math.cos(t * u.fSpeed * 0.7 + u.fPhase) * u.fAmp * 1.4 * fk; // 배경: 좌우로도 유영
      const tiltX = my * u.mouseKX + Math.sin(t * u.dSpeed + u.dPhase) * u.dAmp;
      const tiltY = mx * u.mouseKY + Math.cos(t * u.dSpeed * 0.8 + u.dPhase) * u.dAmp;
      p.rotation.x += (tiltX - p.rotation.x) * 0.15;
      p.rotation.y += (tiltY - p.rotation.y) * 0.2;
      p.rotation.z = Math.sin(t * u.dSpeed * 0.6 + u.dPhase) * u.dAmp * 0.7;
      
      inner.rotation.x = u.def.rx + Math.sin(t * 0.4 + u.phase) * 0.1;
      inner.rotation.y = u.def.ry + Math.sin(t * 0.3 + u.phase * 1.3) * 0.4;
      inner.rotation.z = u.def.rz + Math.cos(t * 0.35 + u.phase) * 0.05;
    });

    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCam);

    requestAnimationFrame(loop);
  })();
}
export function initCamObj(canvas, key, look, o = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: look !== 'pixel', alpha: true, preserveDrawingBuffer: !!o.front });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 0.8, 0.1, 100);
  camera.position.set(0, 0, 12);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8080a0, 1.0));
  const key1 = new THREE.DirectionalLight(0xffffff, 3.2); key1.position.set(5, 8, 9); scene.add(key1);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(-6, 3, 4); scene.add(rim);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0 });
  const pivot = new THREE.Group(); scene.add(pivot);

  // 카메라 3D 모형 (코드로 생성): CCD = 납작한 컴팩트 디카, FILM = 프리즘 달린 필름 SLR, PIXEL = 복셀 블록 카메라
  const cam = buildCamera(look, mat);
  const box = new THREE.Box3().setFromObject(cam), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  cam.position.sub(c);
  const inner = new THREE.Group(); inner.add(cam);
  const rad = box.getBoundingSphere(new THREE.Sphere()).radius;
  inner.scale.setScalar(3.1 / rad); // 회전해도 캔버스 밖으로 잘리지 않게 구 기준으로 맞춤
  inner.rotation.set(o.front ? 0 : 0.18, o.front ? 0 : ({ ccd: -0.55, film: 0.5, pixel: -0.2 }[look] || 0), o.front ? 0 : ({ ccd: 0.04, film: -0.06, pixel: 0.1 }[look] || 0)); // 카메라마다 다른 각도
  pivot.add(inner);

  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const LOOK = { ccd: 0, film: 1, pixel: 2 }[look] || 0;
  const post = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uLook: { value: LOOK } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime; uniform int uLook;
      varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      float bayer(vec2 p){
        mat4 B = mat4(0.0,8.0,2.0,10.0, 12.0,4.0,14.0,6.0, 3.0,11.0,1.0,9.0, 15.0,7.0,13.0,5.0)/16.0;
        int x = int(mod(p.x,4.0)); int y = int(mod(p.y,4.0)); vec4 r = B[y];
        return x==0 ? r.x : x==1 ? r.y : x==2 ? r.z : r.w;
      }
      void main(){
        vec2 uv = vUv;
        if (uLook == 2) { vec2 b = floor(gl_FragCoord.xy / 3.0); uv = (b + 0.5) * 3.0 / uRes; }
        vec4 c = texture2D(tDiffuse, uv);
        if (c.a < 0.05) discard;
        float l = dot(c.rgb / max(c.a, 0.01), vec3(0.299,0.587,0.114));
        vec3 col;
        if (uLook == 0) {            // CCD: 차갑고 쨍한 디카 — 청록 섀도, 날아간 하이라이트
          l = clamp((l - 0.45) * 1.6 + 0.5, 0.0, 1.0);
          col = mix(vec3(0.10,0.12,0.18), vec3(0.90,0.94,1.0), l);   // 차가운 스틸
          col += smoothstep(0.88, 1.0, l) * 0.25;                       // 날아간 반사
          col *= 0.96 + 0.04 * rnd(vec2(0.0, floor(gl_FragCoord.y)));  // 헤어라인(브러시드) 결
        } else if (uLook == 1) {     // FILM: 바랜 블랙, 따뜻한 하이라이트, 움직이는 그레인
          col = mix(vec3(0.12,0.11,0.11), vec3(0.88,0.85,0.82), smoothstep(0.04, 0.96, l)); // 쿨 브라운
          col += (rnd(floor(gl_FragCoord.xy / 1.5) + fract(uTime * 7.0)) - 0.5) * 0.18;
        } else {                     // PIXEL: 파랑 디더
          vec2 b = floor(gl_FragCoord.xy / 3.0);                     // 촘촘한 디더
          float v = clamp((1.0 - l) * 1.5 - 0.05, 0.0, 1.0);
          if (v < bayer(b)) col = vec3(1.0); else col = vec3(0.322,0.329,1.0);
        }
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  function resize() {
    const w = Math.max(canvas.clientWidth, 1), h = Math.max(canvas.clientHeight, 1), pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    rt.setSize(Math.ceil(w * pr), Math.ceil(h * pr)); post.uniforms.uRes.value.set(Math.ceil(w * pr), Math.ceil(h * pr));
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let hover = 0, hv = 0; const ptr = { x: 0, y: 0 }, pc = { x: 0, y: 0 };
  window.addEventListener('pointermove', e => {               // 마우스 방향으로 카메라가 고개를 돌림
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    ptr.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    ptr.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
  });
  const btn = canvas.closest('button');
  if (btn) { btn.addEventListener('pointerenter', () => hover = 1); btn.addEventListener('pointerleave', () => hover = 0); }
  const clock = new THREE.Clock();
  (function loop() {
    if (canvas.getClientRects().length === 0) { requestAnimationFrame(loop); return; }
    const t = clock.getElapsedTime();
    hv += (hover - hv) * 0.08;
    pc.x += (ptr.x - pc.x) * 0.08; pc.y += (ptr.y - pc.y) * 0.08;
    if (o.front) { pivot.rotation.set(0, 0, 0); pivot.position.y = 0; }
    else {
      const ph = { ccd: 0, film: 2.1, pixel: 4.2 }[look] || 0, sp = { ccd: 0.6, film: 0.47, pixel: 0.73 }[look] || 0.6; // 카메라마다 다른 박자
      pivot.rotation.y = Math.sin(t * sp + ph) * 0.35 + pc.x * 0.6 + hv * Math.sin(t * 2.2) * 0.25; // 렌즈가 마우스 쪽으로
      pivot.rotation.x = Math.sin(t * sp * 0.8 + ph) * 0.12 + pc.y * 0.35;
      pivot.rotation.z = Math.cos(t * sp * 0.6 + ph) * 0.08;
    }
    if (!o.front) pivot.position.y = Math.sin(t * 1.1 + ({ ccd: 0, film: 1.7, pixel: 3.4 }[look] || 0)) * 0.15;
    post.uniforms.uTime.value = t;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(postScene, postCam);
    requestAnimationFrame(loop);
  })();
}

/* 포토부스 카메라 모형 3종 — 렌즈는 +z(화면 쪽) */
export function buildCamera(look, body) { // body: 기본 재질 (CCD는 쇠로 교체)
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 0.25 });
  const mid  = new THREE.MeshStandardMaterial({ color: 0x777788, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.05, metalness: 0.2 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
  const cyl = (r, h, seg = 40) => new THREE.CylinderGeometry(r, r, h, seg);
  const RX = Math.PI / 2;
  if (look === 'ccd') {
    // 컴팩트 디카: 납작한 둥근 몸체, 작은 줌렌즈, 플래시, 셔터 버튼
    const shape = new THREE.Shape(); const W = 3.2, H = 2.0, R = 0.35;
    shape.moveTo(-W/2+R, -H/2); shape.lineTo(W/2-R, -H/2); shape.quadraticCurveTo(W/2, -H/2, W/2, -H/2+R);
    shape.lineTo(W/2, H/2-R); shape.quadraticCurveTo(W/2, H/2, W/2-R, H/2); shape.lineTo(-W/2+R, H/2);
    shape.quadraticCurveTo(-W/2, H/2, -W/2, H/2-R); shape.lineTo(-W/2, -H/2+R); shape.quadraticCurveTo(-W/2, -H/2, -W/2+R, -H/2);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.75, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 });
    bodyGeo.translate(0, 0, -0.375);
    const steel = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.75, envMapIntensity: 3.2 }); // 쇠 질감
    add(bodyGeo, steel, 0, 0, 0); body = steel;
    add(cyl(0.72, 0.25), mid, 0.25, -0.05, 0.5, RX);
    add(cyl(0.58, 0.3), body, 0.25, -0.05, 0.7, RX);
    add(cyl(0.42, 0.06), glass, 0.25, -0.05, 0.86, RX);
    add(new THREE.BoxGeometry(0.6, 0.28, 0.06), mid, -1.05, 0.6, 0.47);   // 플래시
    add(new THREE.BoxGeometry(0.22, 0.22, 0.06), dark, 1.15, 0.65, 0.47); // 뷰파인더
    add(cyl(0.18, 0.14), mid, 1.0, 1.1, 0);                                // 셔터
    add(new THREE.BoxGeometry(0.5, 0.08, 0.3), dark, -0.6, 1.08, 0);       // 전원 버튼
  } else if (look === 'film') {
    // 옛날 필름 SLR: 크롬 윗판·밑판 + 검정 가죽 몸체 + 펜타프리즘 + 크롬 링 렌즈 + 노브·레버 디테일
    const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.8, envMapIntensity: 3.0 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 0.85 });
    add(new THREE.BoxGeometry(3.6, 1.15, 1.0), leather, 0, -0.15, 0);                // 가죽 몸체
    add(new THREE.BoxGeometry(3.66, 0.42, 1.06), chrome, 0, 0.62, 0);                // 크롬 윗판
    add(new THREE.BoxGeometry(3.66, 0.16, 1.06), chrome, 0, -0.8, 0);                // 크롬 밑판
    const prism = new THREE.CylinderGeometry(0.42, 0.78, 0.75, 4, 1); prism.rotateY(Math.PI / 4); prism.scale(1, 1, 0.9);
    add(prism, chrome, 0, 1.2, 0);                                                    // 펜타프리즘
    add(new THREE.BoxGeometry(0.6, 0.14, 0.12), dark, 0, 1.25, 0.42);                 // 프리즘 로고판
    add(new THREE.BoxGeometry(0.5, 0.1, 0.5), chrome, 0, 1.62, 0);                    // 핫슈
    add(cyl(0.95, 0.12), chrome, 0, -0.1, 0.56, RX);                                  // 마운트 링
    add(cyl(0.82, 0.35), leather, 0, -0.1, 0.8, RX);                                  // 경통
    for (let i = 0; i < 6; i++) add(cyl(0.86, 0.035, 48), i % 2 ? chrome : dark, 0, -0.1, 0.68 + i * 0.06, RX); // 초점 링 홈
    add(cyl(0.8, 0.4), chrome, 0, -0.1, 1.2, RX);                                     // 크롬 경통
    add(cyl(0.84, 0.1), dark, 0, -0.1, 1.42, RX);                                     // 조리개 링
    add(cyl(0.72, 0.12), chrome, 0, -0.1, 1.52, RX);
    add(cyl(0.58, 0.04), glass, 0, -0.1, 1.59, RX);
    add(cyl(0.3, 0.02), mid, 0, -0.1, 1.615, RX);                                     // 렌즈 반사
    add(cyl(0.32, 0.22, 24), chrome, -1.3, 0.95, 0);                                  // 되감기 노브
    add(cyl(0.08, 0.3, 12), chrome, -1.3, 1.15, 0.12, 0, 0, 0.0);                    // 크랭크
    add(cyl(0.34, 0.16, 24), chrome, 1.0, 0.93, 0);                                   // 셔터 속도 다이얼
    add(cyl(0.12, 0.14, 16), chrome, 1.0, 1.06, 0);                                   // 셔터 버튼
    add(new THREE.BoxGeometry(0.75, 0.06, 0.18), chrome, 1.5, 0.98, 0.2, 0, -0.4, 0); // 와인딩 레버
    add(cyl(0.1, 0.25, 12), chrome, 1.25, 0.25, 0.55, RX);                            // 셀프타이머 레버
    add(new THREE.BoxGeometry(0.12, 0.25, 0.25), chrome, -1.86, 0.45, 0);             // 스트랩 고리
    add(new THREE.BoxGeometry(0.12, 0.25, 0.25), chrome, 1.86, 0.45, 0);
  } else {
    // 픽셀 카메라: 복셀(정육면체) 블록으로 쌓은 레트로 카메라
    const V = 0.42, vox = new THREE.BoxGeometry(V, V, V);
    const put = (x, y, z, m) => add(vox, m, x * V, y * V, z * V);
    for (let x = -4; x <= 4; x++) for (let y = -2; y <= 2; y++) for (let z = -1; z <= 1; z++) put(x, y, z, y === -1 ? dark : body);
    for (let x = -2; x <= -1; x++) put(x, 3, 0, body);                       // 셔터 블록
    put(3, 3, 0, dark);                                                       // 버튼
    // 렌즈: 진한 링 + 흰 반사 + 진한 중심이 앞으로 2칸 튀어나오게 (디더에서도 렌즈가 또렷하게)
    for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) {
      const r = Math.max(Math.abs(x), Math.abs(y));
      if (r === 2 && Math.abs(x) + Math.abs(y) === 4) continue;           // 모서리 깎아 둥글게
      put(x, y, 2, r === 2 ? glass : body);
      if (r <= 1) put(x, y, 3, (x === 0 && y === 0) ? glass : body);      // 흰 링 + 진한 중심
    }
    put(3, 1, 2, mid);                                                        // 플래시
  }
  return g;
}
