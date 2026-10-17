# 올바른종합환경 PV5 Cargo wrap, "도안 2" composition (navy band + yellow stripe)
NAVY, YEL, INK, GREY = "#1b4a9c", "#f6b800", "#1d2a33", "#55636b"
FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','WenQuanYi Zen Hei',sans-serif"
NAME, TAG, SUB = "올바른종합환경", "깨끗한 환경, 올바른 선택", "Total care solution"
SVC = ["사무실·카페·관공서 청소", "바닥 왁스·에어컨 분해 세척"]   # 임시 문구
PHONE, PHONE_LABEL = "1111-1234", "청소 상담"                        # 임시 번호
BODY = ("M100,620 L100,560 Q100,520 130,505 L250,470 L360,200 Q370,140 420,135 "
        "L1440,135 Q1490,135 1495,185 L1500,600 Q1500,640 1470,640 L140,640 Q100,640 100,620 Z")
TOP = "M100,590 C250,590 330,545 440,520 C540,498 600,470 720,468 L1250,468 C1350,468 1420,430 1500,410"

def T(x, y, s, size, fill, w=800, a="start", extra=""):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{a}" {extra}>{s}</text>'

def badge(cx, cy, r):
    return (f'<rect x="{cx-r}" y="{cy-r}" width="{2*r}" height="{2*r}" rx="{r*0.35}" fill="{YEL}"/>'
            + T(cx, cy + r*0.38, "올", r*1.25, NAVY, 900, "middle"))

def side(idx, mirror, y0, label):
    m = (lambda L, w: 1600 - L - w) if mirror else (lambda L, w: L)   # block-wise mirroring
    tf = 'transform="translate(1600,0) scale(-1,1)"' if mirror else ''
    s = [f'<g transform="translate({0},{y0})">', T(60, -20, label, 34, INK, 700),
         f'<clipPath id="c{idx}"><path d="{BODY}"/></clipPath><g {tf}>',
         f'<path d="{BODY}" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/><g clip-path="url(#c{idx})">',
         f'<path d="{TOP} L1500,650 L100,650 Z" fill="{YEL}" transform="translate(0,-24)"/>',
         f'<path d="{TOP} L1500,650 L100,650 Z" fill="{NAVY}"/>']
    for x in (305, 612, 650, 1010):
        s.append(f'<line x1="{x}" y1="205" x2="{x}" y2="630" stroke="#9aa5ab" stroke-width="2.5" opacity=".8"/>')
    s.append('<path d="M322,305 L357,215 L600,215 L600,305 Z" fill="#9db4c1" stroke="#6e8190" stroke-width="2.5"/>'
             '<rect x="560" y="330" width="40" height="9" rx="4" fill="#6e7b83"/><rect x="960" y="330" width="40" height="9" rx="4" fill="#6e7b83"/>')
    for cx in (300, 1195):
        s.append(f'<circle cx="{cx}" cy="615" r="100" fill="#23282c"/>')
    s.append('<rect x="100" y="505" width="38" height="22" rx="8" fill="#ffe9a8"/><rect x="1488" y="470" width="12" height="90" fill="#c93a3a"/></g>')
    for cx in (300, 1195):
        s.append(f'<circle cx="{cx}" cy="615" r="85" fill="#15181a"/><circle cx="{cx}" cy="615" r="50" fill="#b9c2c7"/><circle cx="{cx}" cy="615" r="14" fill="#6b757b"/>')
    s.append('</g>')
    # cargo: logo block
    L = m(670, 400)
    s += [badge(L+34, 262, 34), T(L+84, 285, NAME, 46, NAVY), T(L+86, 318, SUB, 22, GREY, 500),
          T(L+4, 372, TAG, 34, NAVY, 800)]
    # cargo: services block
    L = m(1115, 360)
    s.append(f'<line x1="{L-18}" y1="215" x2="{L-18}" y2="355" stroke="{NAVY}" stroke-width="4"/>')
    for i, t in enumerate(SVC):
        s.append(T(L, 262 + i*46, t, 27, NAVY, 700))
    # phone in band
    L = m(650, 440)
    s += [T(L, 580, PHONE_LABEL, 28, "#fff", 700), T(L+128, 585, PHONE, 60, "#fff", 800)]
    # cab door: logo block
    C = 1600 - 460 if mirror else 460
    s += [badge(C, 356, 34), T(C, 422, NAME, 34, NAVY, 800, "middle"), T(C, 448, SUB, 20, GREY, 500, "middle")]
    s.append('</g>')
    return "\n".join(s)

def rear(x0, y0):
    return "\n".join([f'<g transform="translate({x0},{y0})">', T(0, -20, "③ 후면 (리어 도어)", 34, INK, 700),
        '<clipPath id="cr"><rect x="0" y="0" width="565" height="520" rx="30"/></clipPath>',
        '<rect x="0" y="0" width="565" height="520" rx="30" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/><g clip-path="url(#cr)">',
        f'<path d="M0,400 C150,415 400,380 565,390 L565,520 L0,520 Z" fill="{YEL}" transform="translate(0,-24)"/>',
        f'<path d="M0,400 C150,415 400,380 565,390 L565,520 L0,520 Z" fill="{NAVY}"/>',
        '<line x1="282" y1="10" x2="282" y2="500" stroke="#9aa5ab" stroke-width="2.5"/>',
        '<rect x="0" y="40" width="14" height="150" fill="#c93a3a"/><rect x="551" y="40" width="14" height="150" fill="#c93a3a"/></g>',
        '<rect x="10" y="520" width="545" height="50" rx="12" fill="#2b3135"/>',
        badge(141, 100, 38), T(141, 180, NAME, 31, NAVY, 800, "middle"), T(141, 204, SUB, 16, GREY, 500, "middle"),
        T(424, 125, "깨끗한 환경,", 32, NAVY, 800, "middle"), T(424, 170, "올바른 선택", 32, NAVY, 800, "middle"),
        T(282, 452, PHONE_LABEL, 28, "#fff", 700, "middle"), T(282, 505, PHONE, 56, "#fff", 800, "middle"), '</g>'])

def front(x0, y0):
    p = "M20,520 L20,200 Q20,40 140,20 L425,20 Q545,40 545,200 L545,520 Z"
    return "\n".join([f'<g transform="translate({x0},{y0})">', T(0, -20, "④ 전면 (참고용)", 34, INK, 700),
        f'<clipPath id="cf"><path d="{p}"/></clipPath><path d="{p}" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/>',
        '<path d="M60,60 L505,60 L525,250 L40,250 Z" fill="#9db4c1" stroke="#6e8190" stroke-width="2.5"/><g clip-path="url(#cf)">',
        f'<path d="M20,380 C180,350 380,410 545,370 L545,520 L20,520 Z" fill="{YEL}" transform="translate(0,-24)"/>',
        f'<path d="M20,380 C180,350 380,410 545,370 L545,520 L20,520 Z" fill="{NAVY}"/></g>',
        '<rect x="40" y="440" width="90" height="34" rx="14" fill="#ffe9a8" stroke="#8a969c"/><rect x="435" y="440" width="90" height="34" rx="14" fill="#ffe9a8" stroke="#8a969c"/>',
        '<rect x="10" y="520" width="545" height="50" rx="12" fill="#2b3135"/></g>'])

W, H = 1600, 2560
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
       f'<rect width="{W}" height="{H}" fill="#eef2f4"/>',
       T(60, 80, "도안 2 · 올바른종합환경 (벡터 시안)", 46, INK, 800),
       T(60, 122, "PV5 CARGO · 흰색 차량 기준 · 로고(올 배지)·업종 문구·전화번호는 임시 자리표시", 26, GREY, 400),
       side(1, False, 240, "① 운전석 측면 (좌측)"), side(2, True, 1020, "② 조수석 측면 (우측)"),
       rear(120, 1850), front(880, 1850),
       f'<rect x="60" y="2470" width="40" height="40" rx="8" fill="{NAVY}"/>' + T(112, 2500, f"네이비 {NAVY}", 26, INK, 400) +
       f'<rect x="400" y="2470" width="40" height="40" rx="8" fill="{YEL}"/>' + T(452, 2500, f"옐로 {YEL}", 26, INK, 400), '</svg>']
open("pv5-cargo-wrap-olbareun-v2.svg", "w").write("\n".join(svg))
