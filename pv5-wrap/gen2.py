# PV5 Cargo wrap mock-ups, one vehicle per company
INK = "#1d2a33"
FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','WenQuanYi Zen Hei',sans-serif"
BODY = ("M100,620 L100,560 Q100,520 130,505 L250,470 L360,200 Q370,140 420,135 "
        "L1440,135 Q1490,135 1495,185 L1500,600 Q1500,640 1470,640 L140,640 Q100,640 100,620 Z")
BRANDS = {
 "olbareun": dict(name="올바른종합환경", c1="#1f9d55", c2="#14703c", tag="깨끗한 환경, 올바른 선택",
                  svc="[업종 문구 입력]", phone="000-0000-0000", icon="leaf", size=80),
 "imcleaning": dict(name="아이엠클리닝", c1="#0b6fb8", c2="#4aa3df", tag="I&#39;M CLEANING",
                  svc="[업종 문구 입력]", phone="000-0000-0000", icon="spark", size=88),
}

def icon(kind, cx, cy, c):
    if kind == "leaf":
        return (f'<circle cx="{cx}" cy="{cy}" r="46" fill="{c}"/><path d="M{cx-18},{cy+20} C{cx-24},{cy-12} {cx-2},{cy-30} {cx+24},{cy-24} '
                f'C{cx+26},{cy} {cx+10},{cy+20} {cx-18},{cy+20} Z" fill="#fff"/>')
    return (f'<circle cx="{cx}" cy="{cy}" r="46" fill="{c}"/><path d="M{cx},{cy-28} L{cx+9},{cy-9} L{cx+28},{cy} L{cx+9},{cy+9} L{cx},{cy+28} '
            f'L{cx-9},{cy+9} L{cx-28},{cy} L{cx-9},{cy-9} Z" fill="#fff"/>')

def T(x, y, txt, size, fill, w=800, a="start", extra=""):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{a}" {extra}>{txt}</text>'

def side(b, idx, mirror, y0, label):
    pdx, cdx = (-520, 685) if mirror else (0, 0)
    tf = 'transform="translate(1600,0) scale(-1,1)"' if mirror else ''
    s = [f'<g transform="translate(0,{y0})">', T(60, -20, label, 34, INK, 700),
         f'<clipPath id="c{idx}"><path d="{BODY}"/></clipPath><g {tf}>',
         f'<path d="{BODY}" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/><g clip-path="url(#c{idx})">',
         f'<path d="M100,545 C500,500 900,560 1500,505 L1500,650 L100,650 Z" fill="{b["c1"]}"/>',
         f'<path d="M100,592 C500,547 900,607 1500,552 L1500,650 L100,650 Z" fill="{b["c2"]}"/>']
    for x in (305, 612, 650, 1010):
        s.append(f'<line x1="{x}" y1="205" x2="{x}" y2="630" stroke="#9aa5ab" stroke-width="2.5"/>')
    s.append('<path d="M650,205 H1010" stroke="#9aa5ab" stroke-width="2.5"/>'
             '<path d="M322,305 L357,215 L600,215 L600,305 Z" fill="#9db4c1" stroke="#6e8190" stroke-width="2.5"/>'
             '<rect x="560" y="330" width="40" height="9" rx="4" fill="#6e7b83"/><rect x="960" y="540" width="40" height="9" rx="4" fill="#6e7b83"/>')
    for cx in (300, 1195):
        s.append(f'<circle cx="{cx}" cy="615" r="100" fill="#23282c"/>')
    s.append('<rect x="100" y="505" width="38" height="22" rx="8" fill="#ffe9a8"/><rect x="1488" y="470" width="12" height="90" fill="#c93a3a"/></g>')
    for cx in (300, 1195):
        s.append(f'<circle cx="{cx}" cy="615" r="85" fill="#15181a"/><circle cx="{cx}" cy="615" r="50" fill="#b9c2c7"/><circle cx="{cx}" cy="615" r="14" fill="#6b757b"/>')
    s.append('</g>')
    px = 640 + pdx
    s.append(icon(b["icon"], px+62, 262, b["c1"]))
    s.append(T(px+130, 292, b["name"], b["size"], b["c1"]))
    s.append(T(px+133, 340, b["tag"], 32, "#55636b", 500, extra='letter-spacing="3"'))
    s.append(f'<line x1="{px+20}" y1="372" x2="{px+820}" y2="372" stroke="#c3ccd1" stroke-width="3"/>')
    s.append(T(px+20, 424, b["svc"], 40, INK, 700))
    s.append(T(px+20, 482, "T. " + b["phone"], 54, b["c1"], 800))
    cx0 = 315 + cdx
    s.append(T(cx0, 400, b["name"], 33, b["c1"]))
    s.append(T(cx0, 436, b["svc"], 22, INK, 600))
    s.append(T(cx0, 470, "T. " + b["phone"], 26, INK, 700))
    s.append('</g>')
    return "\n".join(s)

def rear(b, x0, y0):
    s = [f'<g transform="translate({x0},{y0})">', T(0, -20, "③ 후면 (리어 도어)", 34, INK, 700),
         '<clipPath id="cr"><rect x="0" y="0" width="565" height="520" rx="30"/></clipPath>',
         '<rect x="0" y="0" width="565" height="520" rx="30" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/><g clip-path="url(#cr)">',
         f'<path d="M0,415 C150,380 380,440 565,390 L565,520 L0,520 Z" fill="{b["c1"]}"/>',
         f'<path d="M0,458 C150,423 380,483 565,433 L565,520 L0,520 Z" fill="{b["c2"]}"/>',
         '<line x1="282" y1="10" x2="282" y2="500" stroke="#9aa5ab" stroke-width="2.5"/>',
         '<rect x="0" y="40" width="14" height="150" fill="#c93a3a"/><rect x="551" y="40" width="14" height="150" fill="#c93a3a"/></g>',
         '<rect x="10" y="520" width="545" height="50" rx="12" fill="#2b3135"/>',
         T(282, 130, b["name"], 56 if len(b["name"]) > 6 else 64, b["c1"], 800, "middle"),
         T(282, 190, b["svc"], 30, INK, 700, "middle"),
         T(282, 270, "T. " + b["phone"], 40, b["c1"], 800, "middle"), '</g>']
    return "\n".join(s)

def front(b, x0, y0):
    p = "M20,520 L20,200 Q20,40 140,20 L425,20 Q545,40 545,200 L545,520 Z"
    return "\n".join([f'<g transform="translate({x0},{y0})">', T(0, -20, "④ 전면 (참고용)", 34, INK, 700),
        f'<clipPath id="cf"><path d="{p}"/></clipPath><path d="{p}" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/>',
        '<path d="M60,60 L505,60 L525,250 L40,250 Z" fill="#9db4c1" stroke="#6e8190" stroke-width="2.5"/><g clip-path="url(#cf)">',
        f'<path d="M20,330 C180,300 380,360 545,320 L545,370 C380,410 180,350 20,380 Z" fill="{b["c1"]}"/>',
        f'<path d="M20,385 C180,355 380,415 545,375 L545,420 C380,460 180,400 20,430 Z" fill="{b["c2"]}"/></g>',
        '<rect x="40" y="440" width="90" height="34" rx="14" fill="#ffe9a8" stroke="#8a969c"/><rect x="435" y="440" width="90" height="34" rx="14" fill="#ffe9a8" stroke="#8a969c"/>',
        '<rect x="10" y="520" width="545" height="50" rx="12" fill="#2b3135"/></g>'])

for key, b in BRANDS.items():
    W, H = 1600, 2560
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
           f'<rect width="{W}" height="{H}" fill="#eef2f4"/>',
           T(60, 80, f'Kia PV5 카고 래핑 도안 · {b["name"]}', 46, INK, 800),
           T(60, 122, "흰색 차량 기준 · 업종 문구/연락처는 임시 자리표시", 26, "#55636b", 400),
           side(b, 1, False, 240, "① 운전석 측면 (좌측)"), side(b, 2, True, 1020, "② 조수석 측면 (우측)"),
           rear(b, 120, 1850), front(b, 880, 1850),
           f'<rect x="60" y="2470" width="40" height="40" rx="8" fill="{b["c1"]}"/>' + T(112, 2500, f'메인 {b["c1"]}', 26, INK, 400) +
           f'<rect x="400" y="2470" width="40" height="40" rx="8" fill="{b["c2"]}"/>' + T(452, 2500, f'보조 {b["c2"]}', 26, INK, 400),
           '</svg>']
    open(f"pv5-cargo-wrap-{key}.svg", "w").write("\n".join(svg))
