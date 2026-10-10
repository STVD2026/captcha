"""2026_web.csv + images/ 폴더 → works-data.js 생성
CSV의 파일명은 오타가 많아서, 학번 + 작품명으로 실제 파일을 찾아 연결한다.
사용: python3 tools/build_data.py  (files 폴더에서 실행)"""
import csv, json, os, re, unicodedata, difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TH = os.path.join(ROOT, 'images/works/Thumbnail')
WP = os.path.join(ROOT, 'images/works/webportfolio')
PF = os.path.join(ROOT, 'images/profiles')
nfc = lambda s: unicodedata.normalize('NFC', s)
norm = lambda s: re.sub(r'[^0-9a-z가-힣]', '', nfc(s).lower())

def files(d): return [nfc(f) for f in os.listdir(d) if not f.startswith('.')]
thumbs = [('Thumbnail', f) for f in files(TH)] + [('webportfolio', f) for f in files(WP) if re.search(r'thumb', f, re.I)]
works  = [f for f in files(WP) if not re.search(r'thumb', f, re.I)]

def key_of(f, sid):
    s = f[len(sid) + 1:]
    s = re.split(r'_?\s*(thumb\w*|work\s*\d|\d)(\W|$)', s, flags=re.I)[0]
    return norm(s)

def best(sid, targets, cands):
    """targets: 비교할 이름들(작품명/CSV파일명), cands: (key, item) 목록 → 가장 비슷한 것"""
    sc = []
    for k, it in cands:
        r = max(difflib.SequenceMatcher(None, k, t).ratio() if t else 0 for t in targets)
        if any(t and (t.startswith(k) or k.startswith(t)) for t in targets): r = max(r, 0.9)
        sc.append((r, k, it))
    sc.sort(key=lambda x: -x[0])
    return sc[0] if sc and sc[0][0] >= 0.55 else None

rows = list(csv.reader(open(os.path.join(ROOT, '2026_web.csv'), encoding='utf-8-sig')))
H = rows[0]; rows = [r for r in rows[1:] if r and r[0].strip()]
profiles = set(files(PF))
seen = {}
people = {}
report = []
for r in rows:
    sid, kr, en = r[0].strip(), r[1].strip(), r[2].strip()
    if sid not in people:
        # 동명이인(김서연) → 김서연_a / 김서연_b
        same = sorted({x[0].strip() for x in rows if x[1].strip() == kr})
        pname = kr if len(same) == 1 else kr + '_' + 'ab'[same.index(sid)]
        has = r[3].strip() == '사진 O' and (pname + '.webp') in profiles
        people[sid] = dict(sid=sid, kr=kr, en=en, label=kr if len(same) == 1 else kr + '(' + 'AB'[same.index(sid)] + ')',
                           profile=('images/profiles/' + pname + '.webp') if has else '',
                           contacts=[c for c in [(r[6].strip(), r[7].strip()), (r[8].strip(), r[9].strip())] if c[0] and c[1]],
                           works=[])
    title_en = r[12].strip(); csvthumb = r[15].strip()
    targets = [norm(title_en), key_of(csvthumb, sid) if csvthumb.startswith(sid) else '']
    tc = [(key_of(f, sid), (d, f)) for d, f in thumbs if f.startswith(sid + '_')]
    m = best(sid, targets, tc)
    thumb = ('images/works/%s/%s' % m[2]) if m else ''
    tkey = m[1] if m else targets[0]
    wc = [(key_of(f, sid), f) for f in works if f.startswith(sid + '_')]
    imgs = []
    for k, f in wc:
        r2 = best(sid, [tkey] + targets, [(k, f)])
        # 같은 사람의 다른 작품에 더 잘 맞으면 제외
        if r2: imgs.append((k, f))
    # 다른 작품 키와 비교해 더 가까운 쪽으로 배정
    def mine(k):
        others = [norm(x[12]) for x in rows if x[0].strip() == sid and x[12].strip() != title_en]
        me = max(difflib.SequenceMatcher(None, k, t).ratio() for t in [tkey] + targets if t)
        ot = max([difflib.SequenceMatcher(None, k, o).ratio() for o in others] or [0])
        return me >= ot
    imgs = sorted([f for k, f in imgs if mine(k)], key=lambda f: (re.findall(r'(\d)\D*$', f.split('.')[0]) or ['9'])[-1])
    w = dict(no=r[10].strip(), title=r[11].strip(), titleEn=title_en, track=r[4].strip(), cat=r[5].strip(),
             descKr=r[13].strip(), descEn=r[14].strip(), video=r[19].strip(),
             tags=[t for t in re.split(r'\s+', r[20].replace('#', ' #')) if t.startswith('#') and len(t) > 1],
             booth=r[22].strip(), thumb=thumb,
             imgs=['images/works/webportfolio/' + f for f in imgs])
    people[sid]['works'].append(w)
    report.append('%s %s | %-28s | thumb=%s | imgs=%d' % (sid, kr, title_en[:28], os.path.basename(thumb) or '-', len(imgs)))

data = sorted(people.values(), key=lambda p: p['label'])
with open(os.path.join(ROOT, 'works-data.js'), 'w', encoding='utf-8') as fp:
    fp.write('/* 자동 생성: python3 tools/build_data.py — 직접 수정하지 마세요 */\nwindow.WORKS_DATA = ')
    json.dump(data, fp, ensure_ascii=False, indent=1)
    fp.write(';\n')
print('\n'.join(report))
used = {os.path.basename(w['thumb']) for p in data for w in p['works']} | {os.path.basename(i) for p in data for w in p['works'] for i in w['imgs']}
print('\n[연결 안 된 썸네일]', [f for d, f in thumbs if f not in used])
print('[연결 안 된 작업 이미지]', [f for f in works if f not in used])
