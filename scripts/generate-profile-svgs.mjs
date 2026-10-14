// Generates every image the profile README uses into assets/profile/.
//
//   node scripts/generate-profile-svgs.mjs           drawn SVGs only
//   node scripts/generate-profile-svgs.mjs --icons   also re-fetch the stack icon rows
//
// GitHub renders README SVGs as images: no script, no web fonts, no external
// requests. So everything is pre-computed here, text uses the system font
// stack GitHub itself uses, and the stack icons are vendored rather than
// hotlinked from skillicons.dev.
//
// The header object is a port of MyPortfolio/src/components/home/Core.tsx: same
// config, same scene graph, projected through the same camera and baked into
// SMIL keyframes. The Enigma banner ports the mark and FacetField from the
// enigmadigital repo. Copy in either has to be changed there and here.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "profile");
mkdirSync(OUT, { recursive: true });

const CFG = {
  nodes: 79, linkDist: 31, coreRadius: 47, edgeOpacity: 0.37,
  ringCount: 3, tickDensity: 100, ringSpread: 95, ringOpacity: 0.55, arcOpacity: 0.68,
  tilt: 0.43, packets: 7, packetSpeed: 0.6,
};
const RING_AXES = [
  { rx: 0, rz: 0, sweep: 1.1, dir: 1 },
  { rx: Math.PI / 2.4, rz: 0.5, sweep: 0.7, dir: -1 },
  { rx: -Math.PI / 3.1, rz: 1.2, sweep: 1.6, dir: 1 },
];
const FIT_RADIUS = CFG.ringSpread + (CFG.ringCount - 1) * 16 + 16;

const C = {
  canvas: "#050505", border: "#1c1f24", text: "#f0f6fc", sub: "#c9d1d9", muted: "#8b949e",
  signal: "#3b82f6", hot: "#38bdf8", strong: "#60a5fa",
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

// Seeded so the lattice is the same every time the file is regenerated
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rotX = (a) => ([x, y, z]) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
const rotY = (a) => ([x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rotZ = (a) => ([x, y, z]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
const f1 = (n) => (Math.round(n * 10) / 10).toString();

function makeProjector({ cx, cy, halfHeight }) {
  // Three's Euler XYZ applies Z, then Y, then X to a vector. The root carries
  // the fixed tilt and the drift yaw, so everything turns together.
  const k = halfHeight / FIT_RADIUS;
  const D = FIT_RADIUS / Math.tan((42 * Math.PI) / 360);
  return (v, yaw) => {
    const [x, y, z] = rotX(CFG.tilt)(rotY(yaw)(v));
    const s = (k * D) / (D - z);
    return [cx + x * s, cy - y * s];
  };
}
const animD = (frames, dur) => `<animate attributeName="d" values="${frames.join(";")}" dur="${dur}s" repeatCount="indefinite"/>`;

function header() {
  const W = 1280, H = 420;
  const rand = mulberry32(7);
  const project = makeProjector({ cx: 1000, cy: 212, halfHeight: 196 });
  const Pi = (v, yaw) => project(v, yaw).map(Math.round).join(" ");
  let s = "";

  // Starfield
  for (let i = 0; i < 110; i++) {
    const x = f1(rand() * W), y = f1(rand() * H), r = f1(0.5 + rand() * 1.1), o = (0.08 + rand() * 0.3).toFixed(2);
    if (i % 9 === 0) {
      const d = (3 + rand() * 5).toFixed(1);
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"><animate attributeName="opacity" values="${o};0.05;${o}" dur="${d}s" repeatCount="indefinite"/></circle>`;
    } else {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
    }
  }

  // One loop: the whole object drifts a full turn, and each ring spins two
  // turns inside its holder, neighbours counter-rotating (the gyroscope read).
  // The portfolio's rates, rounded so the loop closes: drift 0.13 rad/s
  // (portfolio 0.14), ring spin 0.26 rad/s (portfolio 0.29).
  const LOOP = 48, YAW0 = 0.55, RING_TURNS = 2;
  const yawAt = (t) => YAW0 + (t / LOOP) * Math.PI * 2;

  // Rings: the ticks, circle and arc all ride the spinner, so they are keyed
  // together. 72 keyframes keeps the worst chord (drift plus spin) at 15 deg.
  const KR = 72;
  RING_AXES.forEach((axis, i) => {
    const radius = CFG.ringSpread + i * 16;
    const count = CFG.tickDensity + i * 24;
    const holder = (v) => rotX(axis.rx)(rotZ(axis.rz)(v));
    const onRing = (a, r) => holder([Math.cos(a) * r, 0, Math.sin(a) * r]);
    const sweepSteps = 16;
    const tickF = [], ringF = [], arcF = [];
    for (let k = 0; k <= KR; k++) {
      const t = (k / KR) * LOOP, yaw = yawAt(t);
      const spin = axis.dir * (t / LOOP) * Math.PI * 2 * RING_TURNS;
      let ticks = "", ring = "", arc = "";
      for (let n = 0; n < count; n++) {
        const a = (n / count) * Math.PI * 2 - spin, len = n % 5 === 0 ? 9.5 : 4.5;
        ticks += `M${Pi(onRing(a, radius), yaw)} ${Pi(onRing(a, radius + len), yaw)}`;
      }
      for (let n = 0; n < 96; n++) ring += `${n ? " " : "M"}${Pi(onRing((n / 96) * Math.PI * 2, radius), yaw)}`;
      for (let n = 0; n <= sweepSteps; n++) arc += `${n ? " " : "M"}${Pi(onRing((n / sweepSteps) * axis.sweep - spin, radius), yaw)}`;
      tickF.push(ticks); ringF.push(ring + "Z"); arcF.push(arc);
    }
    s += `<path d="${tickF[0]}" stroke="${C.signal}" stroke-opacity="${CFG.ringOpacity}" stroke-width="1.1" fill="none">${animD(tickF, LOOP)}</path>`;
    s += `<path d="${ringF[0]}" stroke="${C.signal}" stroke-opacity="${(CFG.ringOpacity * 0.7).toFixed(3)}" stroke-width="1.1" fill="none">${animD(ringF, LOOP)}</path>`;
    s += `<path d="${arcF[0]}" stroke="${C.hot}" stroke-opacity="${CFG.arcOpacity}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none">${animD(arcF, LOOP)}</path>`;
  });

  // Core lattice: points in a ball (hollow centre), neighbours wired together
  const pts = [];
  let guard = 0;
  while (pts.length < CFG.nodes && guard++ < 20000) {
    const v = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
    const len = Math.hypot(...v);
    if (len > 1 || len < 0.15) continue;
    pts.push(v.map((c) => c * CFG.coreRadius));
  }
  const edges = [];
  for (let a = 0; a < pts.length; a++)
    for (let b = a + 1; b < pts.length; b++)
      if (Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1], pts[a][2] - pts[b][2]) < CFG.linkDist) edges.push([a, b]);

  // The core turns with the drift; 24 keyframes is a 15 deg step on a small radius
  const K = 24, edgeF = [], nodeF = [];
  for (let k = 0; k <= K; k++) {
    // Whole pixels: the image renders at about 0.65x, so rounding is invisible
    const yaw = yawAt((k / K) * LOOP);
    const q = pts.map((p) => Pi(p, yaw));
    edgeF.push(edges.map(([a, b]) => `M${q[a]} ${q[b]}`).join(""));
    nodeF.push(q.map((p) => `M${p}h0`).join(""));
  }
  s += `<defs><radialGradient id="glow"><stop offset="0" stop-color="${C.hot}" stop-opacity="0.85"/><stop offset="0.3" stop-color="${C.hot}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.hot}" stop-opacity="0"/></radialGradient>`;
  s += `<path id="nodes" d="${nodeF[0]}">${animD(nodeF, LOOP)}</path></defs>`;
  s += `<path d="${edgeF[0]}" stroke="${C.hot}" stroke-opacity="${CFG.edgeOpacity}" stroke-width="0.9" fill="none">${animD(edgeF, LOOP)}</path>`;
  const [ccx, ccy] = project([0, 0, 0], 0);
  s += `<circle cx="${f1(ccx)}" cy="${f1(ccy)}" r="30" fill="url(#glow)"/>`;
  s += `<use href="#nodes" stroke="${C.hot}" stroke-opacity="0.16" stroke-width="10" stroke-linecap="round"/>`;
  s += `<use href="#nodes" stroke="${C.hot}" stroke-opacity="0.9" stroke-width="3.6" stroke-linecap="round"/>`;

  // Packets: white dots riding edges, fading in and out across each hop
  const hops = Math.round(LOOP * CFG.packetSpeed), hop = LOOP / hops, STEPS = 384;
  for (let p = 0; p < CFG.packets; p++) {
    const seq = Array.from({ length: hops }, () => edges[Math.floor(rand() * edges.length)]);
    const phase = rand() * LOOP;
    const xs = [], ys = [], os = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = (i / STEPS) * LOOP;
      const local = (t + phase) % LOOP;
      const [a, b] = seq[Math.floor(local / hop) % hops];
      const u = (local % hop) / hop;
      const v = pts[a].map((c, j) => c + (pts[b][j] - c) * u);
      const [x, y] = project(v, yawAt(t));
      xs.push(f1(x)); ys.push(f1(y)); os.push(Math.sin(u * Math.PI).toFixed(2));
    }
    s += `<circle r="2.6" fill="#fff" cx="${xs[0]}" cy="${ys[0]}" opacity="${os[0]}">`
      + `<animate attributeName="cx" values="${xs.join(";")}" dur="${LOOP}s" repeatCount="indefinite"/>`
      + `<animate attributeName="cy" values="${ys.join(";")}" dur="${LOOP}s" repeatCount="indefinite"/>`
      + `<animate attributeName="opacity" values="${os.join(";")}" dur="${LOOP}s" repeatCount="indefinite"/></circle>`;
  }

  // Copy
  let t = "";
  t += `<text x="64" y="138" font-family="${MONO}" font-size="17" letter-spacing="2.5" fill="${C.muted}">BOURNEMOUTH, UK  ·  BSc SOFTWARE ENGINEERING</text>`;
  t += `<text x="60" y="228" font-family="${SANS}" font-size="92" font-weight="700" letter-spacing="-2.5" fill="${C.text}">Riley Jordan</text>`;
  t += `<text x="64" y="282" font-family="${SANS}" font-size="30" font-weight="500" fill="${C.sub}">Lead Frontend Developer at PACS</text>`;
  t += `<text x="64" y="322" font-family="${SANS}" font-size="26" fill="${C.muted}">Full-stack, AI and cloud. Building UniGrade.</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Riley Jordan - Lead Frontend Developer at PACS">`
    + `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="${C.canvas}" stroke="${C.border}"/>`
    + `<clipPath id="card"><rect width="${W}" height="${H}" rx="18"/></clipPath><g clip-path="url(#card)">${s}</g>${t}</svg>`;
  console.log(`header: ${pts.length} nodes, ${edges.length} edges, ${(svg.length / 1024).toFixed(0)} KB`);
  return svg;
}

function footer() {
  const W = 1280, H = 132, x0 = 40, x1 = 1240, base = 110;
  let ticks = "";
  for (let i = 0, x = x0; x <= x1; i++, x += 8) ticks += `M${x} ${base}V${base - (i % 5 === 0 ? 12 : 6)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Riley Jordan, Bournemouth, UK - rileyj.co.uk">`
    + `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="${C.canvas}" stroke="${C.border}"/>`
    + `<text x="${x0}" y="52" font-family="${SANS}" font-size="22" font-weight="600" fill="${C.text}">Riley Jordan</text>`
    + `<text x="${x0}" y="78" font-family="${MONO}" font-size="14" letter-spacing="2" fill="${C.muted}">BOURNEMOUTH, UK</text>`
    + `<text x="${x1}" y="52" font-family="${MONO}" font-size="18" fill="${C.strong}" text-anchor="end">rileyj.co.uk</text>`
    + `<text x="${x1}" y="78" font-family="${MONO}" font-size="14" letter-spacing="1" fill="${C.muted}" text-anchor="end">riley@mrenigma.uk</text>`
    + `<path d="${ticks}" stroke="${C.signal}" stroke-opacity="${CFG.ringOpacity}" stroke-width="1.1"/>`
    + `<path d="M${x0} ${base}H${x1}" stroke="${C.signal}" stroke-opacity="0.385" stroke-width="1.1"/>`
    + `<path d="M${x0} ${base}H${x1}" pathLength="1000" stroke="${C.hot}" stroke-opacity="${CFG.arcOpacity}" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="150 850"><animate attributeName="stroke-dashoffset" values="0;-1000" dur="22s" repeatCount="indefinite"/></path>`
    + `</svg>`;
}

function highlights(theme) {
  const th = theme === "dark"
    ? { fg: "#f0f6fc", muted: "#9198a1", line: "#3d444d" }
    : { fg: "#1f2328", muted: "#59636e", line: "#d1d9e0" };
  const items = [
    ["First", "Class honours so far", "80.2% Y1 · 78% Y2"],
    ["Top 5%", "Nationally, with L4 and", "L5 commendations"],
    ["1st", "Computing in", "Business Sprint"],
    ["3rd", "AWS DeepRacer", "at the MoD"],
  ];
  let b = "";
  items.forEach(([v, l1, l2], i) => {
    const x = i * 320 + (i ? 36 : 4);
    if (i) b += `<line x1="${i * 320}" y1="18" x2="${i * 320}" y2="142" stroke="${th.line}" stroke-width="1.5"/>`;
    b += `<text x="${x - 3}" y="78" font-family="${SANS}" font-size="56" font-weight="700" letter-spacing="-1.5" fill="${th.fg}">${v}</text>`;
    b += `<text x="${x}" y="112" font-family="${SANS}" font-size="19" fill="${th.muted}">${l1}</text>`;
    b += `<text x="${x}" y="138" font-family="${SANS}" font-size="19" fill="${th.muted}">${l2}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 156" width="1280" height="156" role="img" aria-label="First Class so far. Top 5% nationally with L4 and L5 commendations. 1st, Computing in Business Sprint. 3rd, AWS DeepRacer at MoD.">${b}</svg>`;
}

// Enigma Digital banner, in Enigma's own identity rather than the profile's:
// white ground, near-black type, the blue mark, and the site's facet imagery.
// Mark and FacetField are ported from enigmadigital/components/ui.
const FACETS_X = 760;
function enigma() {
  const W = 1280, H = 330;
  const BRAND = { ground: "#ffffff", ink: "#0b0d12", ink2: "#525a66", line: "#e4e7ec" };
  const ACCENT = { deepest: "#0e1f6e", deep: "#1530a8", mid: "#1d3cc9", base: "#2447e8", light: "#4a68f5", lightest: "#6f8bff" };
  const ACCENTS = Object.values(ACCENT);
  const PALES = ["#ffffff", "#f7f8fa", "#f1f3f6", "#eaedf2", "#e2e6ec"];
  const MARK = [
    ["16,1 31,16 16,31 1,16", BRAND.ground], ["16,1 31,16 16,16", ACCENT.base], ["31,16 16,31 16,16", ACCENT.deep],
    ["16,1 16,16 1,16", ACCENT.lightest], ["1,16 16,16 16,31", ACCENT.mid], ["16,7 25,16 16,25 7,16", BRAND.ground],
    ["16,7 25,16 16,16", ACCENT.light], ["7,16 16,16 16,25", ACCENT.deepest],
  ];

  // FacetField: jittered lattice, triangulated, blue leaning to the right
  let state = 41 >>> 0;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  const fx = FACETS_X, fw = W - fx, cols = 8, rows = 5, cw = fw / cols, ch = H / rows, bias = 0.4;
  const pt = [];
  for (let r = 0; r <= rows; r++) {
    pt[r] = [];
    for (let c = 0; c <= cols; c++) {
      const ve = c === 0 || c === cols, he = r === 0 || r === rows;
      pt[r][c] = { x: fx + c * cw + (ve ? 0 : (random() - 0.5) * cw * 0.82), y: r * ch + (he ? 0 : (random() - 0.5) * ch * 0.82) };
    }
  }
  let facets = "", wires = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = pt[r][c], tr = pt[r][c + 1], bl = pt[r + 1][c], br = pt[r + 1][c + 1];
      const pair = random() > 0.5 ? [[tl, tr, bl], [tr, br, bl]] : [[tl, tr, br], [tl, br, bl]];
      const lean = c / cols;
      pair.forEach((tri) => {
        const ramp = random() < bias * (0.45 + lean * 0.9) ? ACCENTS : PALES;
        facets += `<polygon points="${tri.map((p) => `${f1(p.x)},${f1(p.y)}`).join(" ")}" fill="${ramp[Math.floor(random() * ramp.length)]}"/>`;
      });
    }
  }
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c <= cols; c++) {
      if (c < cols) wires += `M${f1(pt[r][c].x)} ${f1(pt[r][c].y)} ${f1(pt[r][c + 1].x)} ${f1(pt[r][c + 1].y)}`;
      // No wire down the seam column, or it shows as a line where the two images meet
      if (r < rows && c > 0) wires += `M${f1(pt[r][c].x)} ${f1(pt[r][c].y)} ${f1(pt[r + 1][c].x)} ${f1(pt[r + 1][c].y)}`;
    }

  const mark = MARK.map(([p, f]) => `<polygon points="${p}" fill="${f}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Enigma Digital - websites and systems you own outright. Built by hand in Bournemouth. Visit mrenigma.uk">`
    + `<defs><clipPath id="card"><rect width="${W}" height="${H}" rx="18"/></clipPath>`
    + `<linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
    + `<g clip-path="url(#card)"><rect width="${W}" height="${H}" fill="${BRAND.ground}"/>${facets}<path d="${wires}" stroke="rgba(36,71,232,0.12)" stroke-width="0.6" fill="none"/>`
    + `<rect x="${fx}" width="150" height="${H}" fill="url(#fade)"/></g>`
    + `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${BRAND.line}"/>`
    + `<g transform="translate(56 50) scale(1.375)">${mark}</g>`
    + `<text x="112" y="82" font-family="${SANS}" font-size="27" font-weight="700" letter-spacing="-0.5" fill="${BRAND.ink}">Enigma Digital</text>`
    + `<text x="56" y="148" font-family="${SANS}" font-size="17" font-weight="700" letter-spacing="2" fill="${ACCENT.base}">FREELANCE</text>`
    + `<text font-family="${SANS}" font-size="50" font-weight="700" letter-spacing="-1.8" fill="${BRAND.ink}"><tspan x="54" y="204">Websites and systems</tspan><tspan x="54" y="258">you own outright.</tspan></text>`
    + `<path d="M56 282H640" stroke="${BRAND.line}" stroke-width="2"/>`
    + `<text x="56" y="314" font-family="${SANS}" font-size="21"><tspan font-weight="700" fill="${ACCENT.base}">Built by hand in Bournemouth.</tspan><tspan dx="14" fill="${BRAND.ink2}">Fixed prices, no monthly licence.</tspan></text>`
    + `<rect x="488" y="46" width="216" height="52" rx="10" fill="${BRAND.ink}"/>`
    + `<text x="596" y="78" font-family="${SANS}" font-size="17" font-weight="600" fill="#ffffff" text-anchor="middle">Visit mrenigma.uk  →</text>`
    + `</svg>`;
}


const PROJECTS = [
  { slug: "unigrade", name: "UniGrade", live: true, action: "unigrade.co.uk",
    summary: "Models a full UK degree to project your classification. 100+ users, 99% uptime.",
    stack: ["React", "TypeScript", "Supabase", "PostgreSQL"] },
  { slug: "copacetic", name: "Copacetic", live: true, action: "Download",
    summary: "A desktop browser where colour only appears when it carries real connection state.",
    stack: ["Electron", "Chromium", "TypeScript"] },
  { slug: "chess", name: "Chess", action: "Play in the browser",
    summary: "A C# engine from scratch: bitboards, search, evaluation, an opening book and game analysis.",
    stack: ["C#", ".NET", "Blazor WASM"] },
  { slug: "vrp-solver", name: "VRP Solver", action: "View the code",
    summary: "Compares Clarke and Wright savings, Nearest Neighbour with 2-opt and a Genetic Algorithm.",
    stack: ["Python"] },
  { slug: "marcus-aurelius", name: "Marcus Aurelius AI", action: "Try the demo",
    summary: "A museum chatbot that answers in character, mixing NLP rules, vector search and an LLM fallback.",
    stack: ["Express", "React", "Hugging Face", "MongoDB"] },
];

// One compact row per project, stacked tightly so the set reads as one list.
// Each is its own image because each needs its own link.
function project(pr, theme) {
  const th = theme === "dark"
    ? { bg: "#151b23", border: "#3d444d", fg: "#f0f6fc", muted: "#9198a1", link: "#4493f8", chip: "#212830", chipText: "#d1d7e0", live: "#3fb950" }
    : { bg: "#f6f8fa", border: "#d1d9e0", fg: "#1f2328", muted: "#59636e", link: "#0969da", chip: "#ffffff", chipText: "#1f2328", live: "#1a7f37" };
  const W = 1280, H = 112, X = 36, R = W - 36;
  // Summaries are one line by design; past this they would run under the link
  if (pr.summary.length > 96) throw new Error(`${pr.slug} summary is ${pr.summary.length} chars`);
  let b = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="${th.bg}" stroke="${th.border}" stroke-width="1.5"/>`;
  b += `<text x="${X}" y="49" font-family="${SANS}" font-size="27" font-weight="700" letter-spacing="-0.4" fill="${th.fg}">${pr.name}`;
  if (pr.live) b += `<tspan dx="14" dy="-3" font-family="${MONO}" font-size="13" font-weight="600" letter-spacing="1.5" fill="${th.live}">● LIVE</tspan>`;
  b += `</text>`;
  // Mono chips, right-aligned on the title line: a fixed advance makes the widths exact
  const widths = pr.stack.map((t) => Math.round(t.length * 13 * 0.6 + 22));
  let cx = R - widths.reduce((a, w) => a + w, 0) - 8 * (widths.length - 1);
  pr.stack.forEach((t, i) => {
    const w = widths[i];
    b += `<rect x="${cx}" y="22" width="${w}" height="28" rx="14" fill="${th.chip}" stroke="${th.border}" stroke-width="1.2"/>`;
    b += `<text x="${cx + w / 2}" y="41" font-family="${MONO}" font-size="13" fill="${th.chipText}" text-anchor="middle">${t}</text>`;
    cx += w + 8;
  });
  b += `<text x="${X}" y="87" font-family="${SANS}" font-size="18" fill="${th.muted}">${pr.summary}</text>`;
  b += `<text x="${R}" y="87" font-family="${SANS}" font-size="17" font-weight="600" fill="${th.link}" text-anchor="end">${pr.action}  →</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${pr.name}. ${pr.summary} Built with ${pr.stack.join(", ")}.">${b}</svg>`;
}

function academics(theme) {
  const th = theme === "dark"
    ? { fg: "#f0f6fc", muted: "#9198a1", line: "#3d444d" }
    : { fg: "#1f2328", muted: "#59636e", line: "#d1d9e0" };
  const cols = [
    { x: 0, label: "DEGREE", rows: [["Course", "BSc Software Engineering"], ["Classification", "First Class so far"], ["Year 1 average", "80.2%"], ["Year 2 average", "78%"], ["Python Programming", "95%"]] },
    { x: 680, label: "RECOGNITION", rows: [["Letter of Commendation", "L4 and L5"], ["National ranking", "Top 5%"], ["Computing in Business Sprint", "1st of 30+ teams"], ["AWS DeepRacer at MoD", "3rd place"], ["Student Ambassador", "Bournemouth University"]] },
  ];
  const CW = 600, top = 34, first = 86, pitch = 52;
  let b = "";
  cols.forEach(({ x, label, rows }) => {
    b += `<text x="${x}" y="${top}" font-family="${MONO}" font-size="15" letter-spacing="2" fill="${th.muted}">${label}</text>`;
    rows.forEach(([k, v], i) => {
      const y = first + i * pitch;
      b += `<path d="M${x} ${y - 34}H${x + CW}" stroke="${th.line}" stroke-width="1.2"/>`;
      b += `<text x="${x}" y="${y}" font-family="${SANS}" font-size="20" fill="${th.muted}">${k}</text>`;
      b += `<text x="${x + CW}" y="${y}" font-family="${SANS}" font-size="20" font-weight="600" fill="${th.fg}" text-anchor="end">${v}</text>`;
    });
  });
  const cy = first + 5 * pitch + 16;
  b += `<path d="M0 ${cy - 34}H1280" stroke="${th.line}" stroke-width="1.2"/>`;
  b += `<text x="0" y="${cy + 6}" font-family="${MONO}" font-size="15" letter-spacing="2" fill="${th.muted}">CERTIFICATIONS</text>`;
  b += `<text x="1280" y="${cy + 6}" font-family="${SANS}" font-size="20" font-weight="600" fill="${th.fg}" text-anchor="end">HackerRank Python  ·  HackerRank SQL  ·  MathWorks MATLAB  ·  JPMorgan Work Experience</text>`;
  const H = cy + 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 ${H}" width="1280" height="${H}" role="img" aria-label="Degree: BSc Software Engineering, First Class so far, 80.2% Year 1, 78% Year 2, 95% Python Programming. Recognition: L4 and L5 Letters of Commendation, top 5% nationally, 1st of 30+ teams in the Computing in Business Sprint, 3rd AWS DeepRacer at MoD, Student Ambassador at Bournemouth University. Certifications: HackerRank Python and SQL, MathWorks MATLAB, JPMorgan Work Experience.">${b}</svg>`;
}

writeFileSync(`${OUT}/header.svg`, header());
writeFileSync(`${OUT}/footer.svg`, footer());
writeFileSync(`${OUT}/highlights-dark.svg`, highlights("dark"));
writeFileSync(`${OUT}/highlights-light.svg`, highlights("light"));
writeFileSync(`${OUT}/enigma.svg`, enigma());
for (const pr of PROJECTS) for (const t of ["dark", "light"]) writeFileSync(`${OUT}/project-${pr.slug}-${t}.svg`, project(pr, t));
writeFileSync(`${OUT}/academics-dark.svg`, academics("dark"));
writeFileSync(`${OUT}/academics-light.svg`, academics("light"));

// Stack icon rows, vendored from skillicons.dev (MIT) in both themes
const STACK = {
  languages: "python,ts,js,php,cs,java,cpp",
  frontend: "react,nextjs,vite,tailwind,redux,materialui,threejs,electron,html,css",
  backend: "nodejs,express,dotnet,laravel,prisma,postgres,mysql,mongodb,supabase",
  cloud: "aws,azure,gcp,vercel,docker,githubactions,raspberrypi,git,github,cloudflare",
};
if (process.argv.includes("--icons")) {
  for (const [row, icons] of Object.entries(STACK)) {
    for (const theme of ["dark", "light"]) {
      const res = await fetch(`https://skillicons.dev/icons?i=${icons}&theme=${theme}&perline=10`);
      if (!res.ok) throw new Error(`skillicons ${row}/${theme}: HTTP ${res.status}`);
      writeFileSync(`${OUT}/stack-${row}-${theme}.svg`, await res.text());
    }
  }
}
