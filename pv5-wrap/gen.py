# PV5 Cargo wrap mock-up generator (올바른종합환경 + 아이엠클리닝)
G, B = "#1f9d55", "#0b6fb8"
INK = "#1d2a33"
FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','WenQuanYi Zen Hei',sans-serif"
PHONE = "000-0000-0000"

BODY = ("M100,620 L100,560 Q100,520 130,505 L250,470 L360,200 Q370,140 420,135 "
        "L1440,135 Q1490,135 1495,185 L1500,600 Q1500,640 1470,640 L140,640 Q100,640 100,620 Z")

def side(idx, mirror, y0, label):
    pdx = -520 if mirror else 0      # cargo panel text shift
    cdx = 685 if mirror else 0       # cab door text shift
    tf = 'transform="translate(1600,0) scale(-1,1)"' if mirror else ''
    s = [f'<g transform="translate(0,{y0})">']
    s.append(f'<text x="60" y="-20" font-size="34" font-weight="700" fill="{INK}">{label}</text>')
    s.append(f'<clipPath id="c{idx}"><path d="{BODY}"/></clipPath>')
    s.append(f'<g {tf}>')
    s.append(f'<path d="{BODY}" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/>')
    s.append(f'<g clip-path="url(#c{idx})">')
    # wrap waves
    s.append(f'<path d="M100,545 C500,500 900,560 1500,505 L1500,650 L100,650 Z" fill="{G}"/>')
    s.append(f'<path d="M100,592 C500,547 900,607 1500,552 L1500,650 L100,650 Z" fill="{B}"/>')
    # door seams
    for x in (305, 612, 650, 1010):
        s.append(f'<line x1="{x}" y1="205" x2="{x}" y2="630" stroke="#9aa5ab" stroke-width="2.5"/>')
    s.append('<path d="M650,205 H1010" stroke="#9aa5ab" stroke-width="2.5"/>')
    # window + handle
    s.append('<path d="M322,305 L357,215 L600,215 L600,305 Z" fill="#9db4c1" stroke="#6e8190" stroke-width="2.5"/>')
    s.append('<rect x="560" y="330" width="40" height="9" rx="4" fill="#6e7b83"/>')
    s.append('<rect x="960" y="500" width="40" height="9" rx="4" fill="#6e7b83"/>')
    # wheel arches
    for cx in (300, 1195):
        s.append(f'<circle cx="{cx}" cy="615" r="100" fill="#23282c"/>')
    s.append('<rect x="100" y="505" width="38" height="22" rx="8" fill="#ffe9a8"/>')
    s.append('<rect x="1488" y="470" width="12" height="90" fill="#c93a3a"/>')
    s.append('</g>')
    for cx in (300, 1195):
        s.append(f'<circle cx="{cx}" cy="615" r="85" fill="#15181a"/><circle cx="{cx}" cy="615" r="50" fill="#b9c2c7"/><circle cx="{cx}" cy="615" r="14" fill="#6b757b"/>')
    s.append('</g>')  # mirror group end
    # ---- text (never mirrored) ----
    def t(x, y, txt, size, fill, w=700, extra=''):
        return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" {extra}>{txt}</text>'
    px = 640 + pdx
    # block A: 올바른종합환경
    s.append(f'<circle cx="{px+60}" cy="262" r="42" fill="{G}"/>')
    s.append(f'<path d="M{px+42},282 C{px+36},250 {px+58},232 {px+84},238 C{px+86},262 {px+70},282 {px+42},282 Z" fill="#fff"/>')
    s.append(t(px+125, 290, "올바른종합환경", 80, G, 800))
    s.append(t(px+128, 335, "깨끗한 환경, 올바른 선택", 32, "#55636b", 500))
    s.append(f'<line x1="{px+20}" y1="368" x2="{px+820}" y2="368" stroke="#c3ccd1" stroke-width="3"/>')
    # block B: 아이엠클리닝
    s.append(f'<circle cx="{px+60}" cy="418" r="42" fill="{B}"/>')
    s.append(f'<path d="M{px+60},392 L{px+68},410 L{px+86},418 L{px+68},426 L{px+60},444 L{px+52},426 L{px+34},418 L{px+52},410 Z" fill="#fff"/>')
    s.append(t(px+125, 446, "아이엠클리닝", 80, B, 800))
    s.append(t(px+128, 488, "I&#39;M CLEANING", 30, "#55636b", 600, 'letter-spacing="6"'))
    # cab door
    cx0 = 315 + cdx
    s.append(t(cx0, 392, "올바른종합환경", 33, G, 800))
    s.append(t(cx0, 424, f"T. {PHONE}", 24, INK, 600))
    s.append(t(cx0, 466, "아이엠클리닝", 33, B, 800))
    s.append(t(cx0, 498, f"T. {PHONE}", 24, INK, 600))
    s.append('</g>')
    return "\n".join(s)

def rear(x0, y0):
    s = [f'<g transform="translate({x0},{y0})">']
    s.append(f'<text x="0" y="-20" font-size="34" font-weight="700" fill="{INK}">③ 후면 (리어 도어)</text>')
    s.append('<clipPath id="cr"><rect x="0" y="0" width="565" height="520" rx="30"/></clipPath>')
    s.append('<rect x="0" y="0" width="565" height="520" rx="30" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/>')
    s.append('<g clip-path="url(#cr)">')
    s.append(f'<path d="M0,415 C150,380 380,440 565,390 L565,520 L0,520 Z" fill="{G}"/>')
    s.append(f'<path d="M0,458 C150,423 380,483 565,433 L565,520 L0,520 Z" fill="{B}"/>')
    s.append('<line x1="282" y1="10" x2="282" y2="500" stroke="#9aa5ab" stroke-width="2.5"/>')
    s.append('<rect x="0" y="40" width="14" height="150" fill="#c93a3a"/><rect x="551" y="40" width="14" height="150" fill="#c93a3a"/>')
    s.append('</g>')
    s.append('<rect x="10" y="520" width="545" height="50" rx="12" fill="#2b3135"/>')
    def t(x, y, txt, size, fill, w=800, a='middle'):
        return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{a}">{txt}</text>'
    s.append(t(282, 125, "올바른종합환경", 56, G))
    s.append(t(282, 163, f"T. {PHONE}", 28, INK, 600))
    s.append(t(282, 250, "아이엠클리닝", 56, B))
    s.append(t(282, 288, f"T. {PHONE}", 28, INK, 600))
    s.append('</g>')
    return "\n".join(s)

def front(x0, y0):
    s = [f'<g transform="translate({x0},{y0})">']
    s.append(f'<text x="0" y="-20" font-size="34" font-weight="700" fill="{INK}">④ 전면 (참고용 · 보닛 스트라이프)</text>')
    s.append('<clipPath id="cf"><path d="M20,520 L20,200 Q20,40 140,20 L425,20 Q545,40 545,200 L545,520 Z"/></clipPath>')
    s.append('<path d="M20,520 L20,200 Q20,40 140,20 L425,20 Q545,40 545,200 L545,520 Z" fill="#f7f9f8" stroke="#8a969c" stroke-width="3"/>')
    s.append('<path d="M60,60 L505,60 L525,250 L40,250 Z" fill="#9db4c1" stroke="#6e8190" stroke-width="2.5"/>')
    s.append('<g clip-path="url(#cf)">')
    s.append(f'<path d="M20,330 C180,300 380,360 545,320 L545,370 C380,410 180,350 20,380 Z" fill="{G}"/>')
    s.append(f'<path d="M20,385 C180,355 380,415 545,375 L545,420 C380,460 180,400 20,430 Z" fill="{B}"/>')
    s.append('</g>')
    s.append('<rect x="40" y="440" width="90" height="34" rx="14" fill="#ffe9a8" stroke="#8a969c"/><rect x="435" y="440" width="90" height="34" rx="14" fill="#ffe9a8" stroke="#8a969c"/>')
    s.append('<rect x="10" y="520" width="545" height="50" rx="12" fill="#2b3135"/>')
    s.append('</g>')
    return "\n".join(s)

W, H = 1600, 2560
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
       f'<rect width="{W}" height="{H}" fill="#eef2f4"/>',
       f'<text x="60" y="80" font-size="46" font-weight="800" fill="{INK}">Kia PV5 카고 래핑 도안 (시안 1)</text>',
       f'<text x="60" y="122" font-size="26" fill="#55636b">올바른종합환경 × 아이엠클리닝 · 흰색 차량 기준 · 로고/연락처는 임시 자리표시</text>']
svg.append(side(1, False, 240, "① 운전석 측면 (좌측)"))
svg.append(side(2, True, 1020, "② 조수석 측면 (우측)"))
svg.append(rear(120, 1850))
svg.append(front(880, 1850))
# palette + notes
svg.append(f'<rect x="60" y="2470" width="40" height="40" rx="8" fill="{G}"/><text x="112" y="2500" font-size="26" fill="{INK}">올바른종합환경 {G}</text>')
svg.append(f'<rect x="460" y="2470" width="40" height="40" rx="8" fill="{B}"/><text x="512" y="2500" font-size="26" fill="{INK}">아이엠클리닝 {B}</text>')
svg.append('</svg>')
open("/home/user/-/pv5-wrap/pv5-cargo-wrap-v1.svg", "w").write("\n".join(svg))
