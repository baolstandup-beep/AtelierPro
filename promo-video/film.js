// AtelierPro: pure function of time. window.seek(t) paints frame t (see lib/motion.js).
// Timing is in beats (u) on the measured grid; docs/shotlist.md is the plan this file follows.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, springKeys, SPRING, wobble, font, layout, fitSize, text, fill, cover, crop, rrect, shake, mix } = M;

// Brand tokens from assets/brand.json + DESIGN.md. One accent: amber.
const C = {
  green: '#0F3B32', green2: '#14513F', paper: '#FBF9F5', card: '#FFFFFF', ink: '#111827',
  grey: '#4B5563', sand: '#8A7A65', accent: '#D97706', mint: '#EBF7F1',
};
const DISPLAY = 'Display', UI = 'UI';

// Every visual accent: [beat, label, sfx, opts].
const HITS = [
  [0, 'Fini les', 'impact'],
  [0.5, 'carnets', 'pop', { pitch: 'E5' }],
  [1, 'perdus.', 'thud'],
  [0.25, 'stitch draws', 'type', { len: 1.2, n: 8 }],
  [3, 'strike 1', 'click'],
  [4, 'phrase 2', 'whoosh', { len: 0.35 }],
  [5.25, 'strike 2', 'click'],
  [6, 'phrase 3', 'whoosh', { len: 0.35, from: 2400, to: 700 }],
  [6.5, 'strike 3', 'click'],
  [7, 'scissors travel', 'riser', { len: 0.45 }],
  [7.5, 'snip', 'click', { pitch: 'C7' }],
  [8, 'drop: green floods', 'impact'],
  [8.5, 'logo lands', 'pop', { pitch: 'A5' }],
  [9.5, 'HAUTE CONFECTION', 'type', { len: 0.6, n: 8 }],
  [11.5, 'into the o', 'whoosh', { len: 0.45 }],
  [12, 'hero headline', 'thud'],
  [13, 'couple rises', 'whoosh', { len: 0.6, from: 400, to: 1800 }],
  [14.5, 'précision.', 'pop', { pitch: 'E6' }],
  [15, 'underline', 'blip', { pitch: 'A6' }],
  [19.5, 'push to features', 'whoosh', { len: 0.4 }],
  [20, 'feature 1', 'thud'],
  [22, 'Carrure', 'tick'], [23, 'Longueur Bras', 'tick'], [24, 'Tour de Cou', 'tick'], [25, 'Poitrine', 'tick'],
  [27.6, 'push', 'whoosh', { len: 0.4, from: 2400, to: 600 }],
  [28, 'feature 2', 'thud'],
  [30, 'card lands', 'pop', { pitch: 'D5' }],
  [35.6, 'push', 'whoosh', { len: 0.4 }],
  [36, 'feature 3', 'thud'],
  [37.5, 'acompte reçu', 'bell', { pitch: 'E6' }],
  [38.5, 'counter', 'coins'],
  [43.6, 'push', 'whoosh', { len: 0.4, from: 2400, to: 600 }],
  [44, 'feature 4', 'thud'],
  [46, 'card 2', 'pop', { pitch: 'A5' }],
  [51.6, 'into proof', 'swell'],
  [52, 'proof', 'impact'],
  [53, '+500', 'tick'], [55, '+48 000', 'tick'],
  [57.6, 'into end', 'whoosh', { len: 0.4 }],
  [58, 'end card', 'impact'],
  [59, 'CTA', 'pop', { pitch: 'A5' }],
  [60, 'stitch closes', 'bell', { pitch: 'E6' }],
];

// Source-pixel rects of real UI cut from the gathered landing screenshots.
const R = {
  photo: [104, 1016, 1149, 640],      // section_02: tailor + phone showing the real app
  notif: [146, 1096, 495, 109],       // "Grand Boubou Bazin · Acompte Wave 35 000 FCFA reçu"
  mens: [1310, 950, 820, 272],        // "Mensurations Complètes"
  acpt: [1310, 1288, 820, 272],       // "Gestion des Acomptes & Soldes"
  c1: [49, 610, 518, 598], c2: [610, 610, 517, 598], c3: [1171, 610, 517, 598], c4: [1732, 610, 517, 598],
};

// ---------------------------------------------------------------- helpers
const S = FORMAT.safe;
const CX = W / 2;

// Lucide "Scissors" (the brand's logo glyph), 24-unit grid, stroked.
function scissors(ctx, x, y, size, color, rot = 0, open = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const blade = (sign) => {
    ctx.save(); ctx.translate(12, 12); ctx.rotate(sign * open); ctx.translate(-12, -12);
    ctx.beginPath();
    if (sign < 0) { ctx.arc(6, 6, 3, 0, M.TAU); ctx.moveTo(8.12, 8.12); ctx.lineTo(12, 12); ctx.moveTo(14.8, 14.8); ctx.lineTo(20, 20); }
    else { ctx.arc(6, 18, 3, 0, M.TAU); ctx.moveTo(20, 4); ctx.lineTo(8.12, 15.88); }
    ctx.stroke(); ctx.restore();
  };
  blade(-1); blade(1);
  ctx.restore();
}

// The DESIGN.md "stitch": a fine dashed line, drawn on from a to b over p (0..1).
function stitch(ctx, x0, y0, x1, y1, p, color, w = 5, dash = [22, 14]) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, p), lerp(y0, y1, p)); ctx.stroke(); ctx.restore();
}

// Words rise out of a per-line mask, staggered. lines: [[word, color?], ...] per line.
function wordLines(ctx, lines, x, y, size, u, u0, { weight = 700, color = C.ink, stagger = 0.18, lineH = 1.08, align = 'left', exit = null, track = -0.025 } = {}) {
  const f = font(size, weight, DISPLAY);
  let k = 0;
  lines.forEach((line, li) => {
    const base = y + li * size * lineH;
    const full = line.map((w) => (Array.isArray(w) ? w[0] : w)).join(' ');
    const Lw = layout(ctx, full, f, track * size).width;
    let cx = align === 'center' ? x - Lw / 2 : x;
    ctx.save(); ctx.beginPath(); ctx.rect(0, base - size * 1.05, W, size * 1.4); ctx.clip();
    line.forEach((w) => {
      const [str, col] = Array.isArray(w) ? w : [w, color];
      const p = springU(u, u0 + k * stagger, SPRING.snappy);
      const out = exit ? E.inBack(prog(u, exit + k * 0.04, exit + 0.4 + k * 0.04), 1.2) : 0;
      const dy = (1 - p) * size * 1.2 - out * size * 1.3;
      if (p > 0.001) text(ctx, str, cx, base + dy, f, col, 'left', track * size);
      cx += layout(ctx, str + ' ', f, track * size).width;
      k++;
    });
    ctx.restore();
  });
}

function shadowCard(ctx, x, y, w, h, r, blur = 60, alpha = 0.18) {
  ctx.save(); ctx.shadowColor = `rgba(15,59,50,${alpha})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = blur * 0.35;
  rrect(ctx, x, y, w, h, r); ctx.fillStyle = C.card; ctx.fill(); ctx.restore();
}

// A real crop placed as a floating card with a soft shadow and rounded clip.
function cropCard(ctx, img, rect, x, y, w, r = 28, k = 1, rot = 0) {
  if (!img || k <= 0) return 0;
  const h = (w * rect[3]) / rect[2];
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.scale(k, k); ctx.translate(-(x + w / 2), -(y + h / 2));
  shadowCard(ctx, x, y, w, h, r);
  rrect(ctx, x, y, w, h, r); ctx.clip();
  crop(ctx, img, rect, x, y, w, h);
  ctx.restore();
  return h;
}

// Cover-fit a source rect of a real screenshot into a box, focal point + push-in.
function coverRect(ctx, img, [sx, sy, sw, sh], x, y, w, h, { fx = 0.5, fy = 0.5, zoom = 1, radius = 0 } = {}) {
  const s = Math.max(w / sw, h / sh) * zoom;
  const vw = w / s, vh = h / s;
  const ox = sx + (sw - vw) * fx, oy = sy + (sh - vh) * fy;
  ctx.save(); rrect(ctx, x, y, w, h, radius); ctx.clip();
  ctx.drawImage(img, ox, oy, vw, vh, x, y, w, h);
  ctx.restore();
}

// A phone shell (frame only) around a real app capture.
function phone(ctx, img, x, y, w, h, scroll = 0) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
  rrect(ctx, x, y, w, h, w * 0.14); ctx.fillStyle = '#0B0F0E'; ctx.fill(); ctx.restore();
  const b = w * 0.035, ix = x + b, iy = y + b, iw = w - 2 * b, ih = h - 2 * b;
  ctx.save(); rrect(ctx, ix, iy, iw, ih, w * 0.11); ctx.clip();
  const s = iw / img.width, dh = img.height * s;
  ctx.drawImage(img, ix, iy - Math.max(0, dh - ih) * scroll, iw, dh);
  ctx.restore();
}

function pill(ctx, str, x, y, k, { bg = C.mint, fg = C.green, size = 34 } = {}) {
  if (k <= 0) return;
  const f = font(size, 700, UI), tr = size * 0.08;
  const w = layout(ctx, str, f, tr).width + size * 1.4, h = size * 1.9;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
  ctx.translate(x, y + h / 2); ctx.scale(lerp(0.6, 1, k), lerp(0.6, 1, k)); ctx.translate(-x, -(y + h / 2));
  rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  text(ctx, str, x + size * 0.7, y + h * 0.66, f, fg, 'left', tr);
  ctx.restore();
}

// ---------------------------------------------------------------- 1-2 problem   (u 0..8)
const PROBLEMS = [
  { at: 0, strike: 3, lines: [['Fini', 'les'], ['carnets'], ['perdus.']] },
  { at: 4, strike: 5.25, lines: [['Les'], ['contestations'], ['de', 'mesures.']] },
  { at: 6, strike: 6.5, lines: [['Les', 'retards'], ['de'], ['livraison.']] },
];
const STITCH_Y = 1270;
function sceneProblem(ctx, u) {
  fill(ctx, C.paper);
  const size = Math.min(170, fitSize(ctx, 'contestations', 700, DISPLAY, S.w, 220, -0.025));
  const lineH = 1.06;
  PROBLEMS.forEach((P, i) => {
    const next = PROBLEMS[i + 1];
    const end = next ? next.at : 7.0;
    if (u < P.at - 0.4 || u > end + 0.5) return;
    const y0 = S.y + 330 + size;
    // the struck phrase is thrown up and out as the next one rises
    const out = E.inBack(prog(u, end - 0.15, end + 0.3), 1.4);
    ctx.save(); ctx.translate(0, -out * 900);
    ctx.save(); shake(ctx, u, P.at + 0.9, 8);
    wordLines(ctx, P.lines, S.x, y0, size, u, P.at - (i === 0 ? 0.3 : 0), { stagger: i === 0 ? 0.42 : 0.12, lineH });
    ctx.restore();
    // strike-through, line by line: the problem is over
    P.lines.forEach((ln, l) => {
      const sp = E.outQuint(prog(u, P.strike + l * 0.12, P.strike + 0.45 + l * 0.12));
      if (sp <= 0) return;
      const w = layout(ctx, ln.join(' '), font(size, 700, DISPLAY), -0.025 * size).width;
      ctx.fillStyle = C.accent; ctx.fillRect(S.x - 10, y0 + l * size * lineH - size * 0.33, (w + 20) * sp, size * 0.1);
    });
    ctx.restore();
  });
  // the stitch draws under the type, then the scissors run along it and snip at 7.5
  stitch(ctx, -20, STITCH_Y, W + 20, STITCH_Y, E.outCubic(prog(u, -0.6, 2.5)), C.green, 8, [30, 18]);
  const tp = E.inOutCubic(prog(u, 6.9, 7.5));
  if (tp > 0) {
    const sx = lerp(-160, CX, tp);
    const open = 0.32 * Math.abs(Math.sin(u * Math.PI * 4)) * (u < 7.5 ? 1 : 0);
    ctx.fillStyle = C.paper; ctx.fillRect(-20, STITCH_Y - 14, sx + 20, 28);
    scissors(ctx, sx + 50, STITCH_Y, 190, C.green, -Math.PI * 0.75, open);
  }
}

// ---------------------------------------------------------------- 3 brand drop   (u 8..12)
function sceneBrand(ctx, u, IMG) {
  // green floods out of the cut point
  fill(ctx, C.paper);
  const r = E.outExpo(prog(u, 7.9, 8.6)) * Math.hypot(W, H);
  ctx.beginPath(); ctx.arc(CX + 50, STITCH_Y, r, 0, M.TAU); ctx.fillStyle = C.green; ctx.fill();
  const k = springU(u, 8.3, SPRING.bouncy);
  const size = 168;
  const f = font(size, 700, DISPLAY);
  const tA = 'Atelier', tP = 'Pro';
  const wA = layout(ctx, tA, f, -0.03 * size).width, wP = layout(ctx, tP, f, -0.03 * size).width;
  const total = wA + wP;
  const x0 = CX - total / 2, base = H * 0.5 + size * 0.32;
  // badge
  const bk = springU(u, 8.1, SPRING.bouncy);
  if (bk > 0) {
    ctx.save(); ctx.translate(CX, base - size * 1.75); ctx.scale(bk, bk);
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, M.TAU); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    scissors(ctx, 0, 0, 104, C.accent, 0, 0.18 * wobble(u - 8.1, 2, 4));
    ctx.restore();
  }
  ctx.save(); ctx.beginPath(); ctx.rect(0, base - size, W, size * 1.3); ctx.clip();
  const dy = (1 - k) * size * 1.2;
  text(ctx, tA, x0, base + dy, f, C.paper, 'left', -0.03 * size);
  const k2 = springU(u, 8.5, SPRING.bouncy);
  text(ctx, tP, x0 + wA, base + (1 - k2) * size * 1.2, f, C.accent, 'left', -0.03 * size);
  ctx.restore();
  // HAUTE CONFECTION tracks out letter by letter
  const sub = 'HAUTE CONFECTION';
  const tk = E.outQuint(prog(u, 9.5, 10.6));
  const n = Math.round(sub.length * clamp(prog(u, 9.5, 10.1)));
  if (n > 0) text(ctx, sub.slice(0, n), CX, base + 92, font(40, 600, UI), 'rgba(251,249,245,0.72)', 'center', lerp(4, 14, tk));
  stitch(ctx, CX - 260, base + 150, CX + 260, base + 150, E.outCubic(prog(u, 10, 11)), 'rgba(217,119,6,0.8)', 4, [16, 12]);
  // exit: paper irises in from the "o" of Pro
  const oR = E.inOutCubic(prog(u, 11.4, 12)) * Math.hypot(W, H);
  if (oR > 0) {
    const ox = x0 + wA + wP * 0.7, oy = base - size * 0.25;
    ctx.beginPath(); ctx.arc(ox, oy, oR, 0, M.TAU); ctx.fillStyle = C.paper; ctx.fill();
  }
}

// ---------------------------------------------------------------- 4 promise   (u 12..20)
function scenePromise(ctx, u, IMG) {
  fill(ctx, C.paper);
  const out = E.inOutCubic(prog(u, 19.3, 20));
  ctx.save(); ctx.translate(-out * W, 0);
  const size = 138;
  const y = S.y + size;
  wordLines(ctx, [['Gérez', 'votre'], ['atelier', 'de'], ['couture', 'avec']], S.x, y, size, u, 11.85, { stagger: 0.16 });
  // "précision." in green, its own beat
  wordLines(ctx, [[['précision.', C.green]]], S.x, y + size * 3 * 1.08, size, u, 14.4, {});
  const L = layout(ctx, 'précision', font(size, 700, DISPLAY), -0.025 * size);
  const up = E.inOutCubic(prog(u, 15, 16.2));
  if (up > 0) {
    const ux = S.x, uy = y + size * 3 * 1.08 + 26, uw = L.width * up;
    ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath();
    for (let x = 0; x <= uw; x += 4) { const yy = uy + Math.sin(x / 13) * 7; x ? ctx.lineTo(ux + x, yy) : ctx.moveTo(ux, yy); }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  // the couple rises from the bottom edge, then leaves left a touch faster than the type
  const img = IMG.couple;
  if (img) {
    const k = springU(u, 12.8, SPRING.gentle);
    const h = 1180, w = (img.width / img.height) * h;
    const push = 1 + 0.05 * prog(u, 13, 20);
    const x = W - w * 0.92 - out * W * 1.25, yb = H + 40 + (1 - k) * h;
    ctx.save(); ctx.translate(x + w / 2, yb); ctx.scale(push, push);
    ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
  }
}

// ---------------------------------------------------------------- 5-8 features   (u 20..52)
// Each feature: tab pill + title in the site's words + the real visual. If the user's app
// capture exists in assets/app/, it is shown in a phone; otherwise real landing UI is used.
const FEATURES = [
  { at: 20, n: '01', tab: 'Carnet & Gabarits', title: [['Mensurations'], ['complètes.']], app: 'appMesures' },
  { at: 28, n: '02', tab: 'Suivi Couturiers', title: [['Chaque', 'tenue,'], ['chaque', 'couturier.']], app: 'appProduction' },
  { at: 36, n: '03', tab: 'Acomptes & Caisse', title: [['Acomptes', 'Wave'], ['& Orange', 'Money.']], app: 'appPaiements' },
  { at: 44, n: '04', tab: 'Reçus WhatsApp', title: [['Reçus', 'pros,'], ['bilan', 'net.']], app: 'appRecu', app2: 'appDashboard' },
];

function featureVisual(ctx, F, u, IMG, top) {
  const a = F.at, s2 = IMG.s2, s3 = IMG.s3;
  const vh = S.y + S.h + 260 - top;            // visual band reaches under the bottom safe line
  if (IMG[F.app]) {
    const k = springU(u, a + 0.3, SPRING.gentle);
    const pw = 620, ph = Math.min(vh + 200, pw * 2.05);
    const img = (F.app2 && IMG[F.app2] && u > a + 4) ? IMG[F.app2] : IMG[F.app];
    phone(ctx, img, CX - pw / 2, top + 40 + (1 - k) * 600, pw, ph, E.inOutSine(prog(u, a + 1.5, a + 7)));
    return;
  }
  if (F.n === '01') {
    const k = springU(u, a + 0.2, SPRING.gentle);
    const w = W - 2 * 56, h = 640;
    const y = top + 20 + (1 - k) * 500;
    shadowCard(ctx, 56, y, w, h, 36);
    if (s2) coverRect(ctx, s2, R.photo, 56, y, w, h, { fx: 0.3, fy: 0.4, zoom: lerp(1.0, 1.1, prog(u, a, a + 8)), radius: 36 });
    // the real measurement names from the site, two by two under the photo
    ['Carrure', 'Longueur Bras', 'Tour de Cou', 'Poitrine'].forEach((m, i) => {
      const p = springU(u, a + 2 + i, SPRING.bouncy);
      pill(ctx, m, i % 2 ? CX + 10 : 56, y + h + 40 + Math.floor(i / 2) * 110, p, { bg: i % 2 ? C.mint : C.green, fg: i % 2 ? C.green : C.paper, size: 44 });
    });
    return;
  }
  if (F.n === '02') {
    const k = springU(u, a + 0.2, SPRING.gentle);
    const w = W - 2 * 56, h = 560, y = top + 20 + (1 - k) * 500;
    // push into the phone in the real photo: the app's own dashboard tiles
    shadowCard(ctx, 56, y, w, h, 36);
    if (s2) coverRect(ctx, s2, R.photo, 56, y, w, h, { fx: 0.02, fy: 0.6, zoom: lerp(2.0, 2.3, prog(u, a, a + 8)), radius: 36 });
    const kc = springU(u, a + 2, SPRING.bouncy);
    cropCard(ctx, s3, R.c3, W - 56 - 560, y + h - 220, 560, 30, kc, -0.03 * (1 - kc) + 0.012 * wobble(u - a - 2, 1.6, 3));
    return;
  }
  if (F.n === '03') {
    const k = springU(u, a + 0.2, SPRING.gentle);
    const y = top + 10 + (1 - k) * 500;
    cropCard(ctx, s2, R.acpt, 40, y, W - 80, 26, k);
    // the real notification drops in, then the amount counts up
    const kn = springU(u, a + 1.5, SPRING.bouncy);
    const ny = y + 380 + (1 - kn) * -240;
    if (kn > 0) {
      ctx.save(); ctx.globalAlpha = clamp(kn * 2);
      cropCard(ctx, s2, R.notif, 70, ny, W - 140, 24, 1, 0.02 * wobble(u - a - 2, 1.8, 3));
      ctx.restore();
    }
    const cp = E.outCubic(prog(u, a + 2.5, a + 4.5));
    if (cp > 0) {
      const v = Math.round((35000 * cp) / 500) * 500;
      const str = v.toLocaleString('fr-FR').replace(/ | /g, ' ');
      const by = ny + 380;
      text(ctx, str, CX, by, font(190, 700, DISPLAY), C.green, 'center', -6);
      text(ctx, 'FCFA reçus', CX, by + 80, font(48, 600, UI), C.accent, 'center', 2);
      // payment rails from the site: Wave + Orange Money
      const lk = springU(u, a + 3.5, SPRING.bouncy);
      if (lk > 0 && IMG.wave && IMG.om) {
        const sz = 120 * lk;
        ctx.save(); rrect(ctx, CX - 150 - sz / 2, by + 150, sz, sz, 28); ctx.clip(); ctx.drawImage(IMG.wave, CX - 150 - sz / 2, by + 150, sz, sz); ctx.restore();
        ctx.drawImage(IMG.om, CX + 150 - sz / 2, by + 150, sz, sz);
        text(ctx, '+', CX, by + 150 + 80, font(70 * lk, 500, UI), C.sand, 'center');
      }
    }
    return;
  }
  // 04: the site's two cards that promise WhatsApp receipts and the net balance
  const y = top + 10;
  const k1 = springU(u, a + 0.3, SPRING.gentle), k2 = springU(u, a + 2, SPRING.bouncy);
  const k3 = springU(u, a + 4, SPRING.bouncy);
  cropCard(ctx, s3, R.c2, 40, y + (1 - k1) * 600, 640, 30, k1, -0.03);
  cropCard(ctx, s3, R.c4, W - 40 - 640, y + 260 + (1 - k2) * 400, 640, 30, k2, 0.03 + 0.02 * wobble(u - a - 2, 1.6, 3));
  void k3;
}

function sceneFeatures(ctx, u, IMG) {
  fill(ctx, C.paper);
  // horizontal push between features: the strip moves one screen per feature
  const pos = springKeys(u, [[20, 0], [27.6, 1], [35.6, 2], [43.6, 3]], SPRING.gentle);
  const enter = 1 - E.outCubic(prog(u, 19.3, 20.1));
  FEATURES.forEach((F, i) => {
    const off = (i - pos) * W + enter * W;
    if (Math.abs(off) >= W) return;
    ctx.save(); ctx.translate(off, 0);
    const la = F.at - (i === 0 ? 0 : 0.2);
    pill(ctx, `${F.n} · ${F.tab}`, S.x, S.y - 10, springU(u, la, SPRING.bouncy), { bg: i % 2 ? '#FEF3C7' : C.mint, fg: i % 2 ? C.accent : C.green, size: 42 });
    const size = 112;
    wordLines(ctx, F.title, S.x, S.y + 130 + size, size, u, la + 0.25, { stagger: 0.12, color: C.green });
    featureVisual(ctx, F, u, IMG, S.y + 130 + size * 2.3);
    ctx.restore();
  });
  // proof iris: dark from the bottom at 51.6..52
  const ir = E.inOutCubic(prog(u, 51.5, 52));
  if (ir > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, H * (1 - ir), W, H * ir); }
}

// ---------------------------------------------------------------- 9 proof   (u 52..58)
function sceneProof(ctx, u, IMG) {
  fill(ctx, '#000');
  const img = IMG.roi;
  if (img) {
    const k = springU(u, 51.8, SPRING.gentle);
    const w = W * 1.0, h = (img.height / img.width) * w;
    const par = lerp(0, -60, prog(u, 52, 58));
    ctx.drawImage(img, W - w + 90, H - h + 330 + (1 - k) * 500 + par, w, h);
  }
  const stat = (at, num, label, y) => {
    const k = springU(u, at, SPRING.bouncy);
    if (k <= 0) return;
    const p = E.outCubic(prog(u, at, at + 1.6));
    const v = Math.round(num * p);
    const str = '+' + v.toLocaleString('fr-FR').replace(/ | /g, ' ');
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
    text(ctx, str, S.x, y + (1 - k) * 60, font(170, 700, DISPLAY), C.accent, 'left', -5);
    text(ctx, label, S.x + 6, y + 70 + (1 - k) * 60, font(46, 600, UI), C.paper);
    ctx.restore();
  };
  stat(53, 500, 'ateliers actifs', S.y + 150);
  stat(55, 48000, 'mesures enregistrées', S.y + 400);
  const out = E.inOutCubic(prog(u, 57.5, 58));
  if (out > 0) { ctx.fillStyle = C.green; ctx.fillRect(0, H * (1 - out), W, H * out); }
}

// ---------------------------------------------------------------- 10 end card   (u 58..64)
function sceneEnd(ctx, u) {
  fill(ctx, C.green);
  const k = springU(u, 57.75, SPRING.bouncy);
  const size = 150, f = font(size, 700, DISPLAY);
  const wA = layout(ctx, 'Atelier', f, -0.03 * size).width, wP = layout(ctx, 'Pro', f, -0.03 * size).width;
  const x0 = CX - (wA + wP) / 2, base = H * 0.40;
  ctx.save(); ctx.translate(CX, base - size * 1.55); ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, 0, 80, 0, M.TAU); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
  scissors(ctx, 0, 0, 90, C.accent); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, base - size, W, size * 1.3); ctx.clip();
  text(ctx, 'Atelier', x0, base + (1 - k) * size, f, C.paper, 'left', -0.03 * size);
  text(ctx, 'Pro', x0 + wA, base + (1 - springU(u, 57.95, SPRING.bouncy)) * size, f, C.accent, 'left', -0.03 * size);
  ctx.restore();
  const tg = E.outQuint(prog(u, 58.3, 59));
  if (tg > 0) {
    ctx.save(); ctx.globalAlpha = tg;
    text(ctx, 'Gérez votre atelier de couture avec précision.', CX, base + 80, font(44, 500, UI), 'rgba(251,249,245,0.8)', 'center');
    ctx.restore();
  }
  // CTA: the site's own button
  const ck = springU(u, 58.8, SPRING.bouncy);
  const cw = 820, ch = 132, cx = CX - cw / 2, cy = base + 190;
  if (ck > 0) {
    ctx.save(); ctx.translate(CX, cy + ch / 2); ctx.scale(ck, ck); ctx.translate(-CX, -(cy + ch / 2));
    rrect(ctx, cx, cy, cw, ch, 26); ctx.fillStyle = C.paper; ctx.fill();
    const cf = font(46, 700, UI), tw = layout(ctx, 'Créer mon atelier gratuitement', cf).width;
    text(ctx, 'Créer mon atelier gratuitement', CX - 35, cy + ch * 0.6, cf, C.green, 'center');
    const ax = CX - 35 + tw / 2 + 50 + 8 * Math.sin(Math.max(0, u - 60) * Math.PI);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax - 22, cy + ch / 2); ctx.lineTo(ax + 18, cy + ch / 2); ctx.moveTo(ax + 2, cy + ch / 2 - 16); ctx.lineTo(ax + 18, cy + ch / 2); ctx.lineTo(ax + 2, cy + ch / 2 + 16); ctx.stroke();
    ctx.restore();
  }
  // the stitch closes around the CTA
  const sp = E.inOutCubic(prog(u, 59.6, 60.6));
  if (sp > 0) {
    const pad = 24;
    ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 4; ctx.setLineDash([16, 12]);
    // reveal the dashed frame with a clockwise sweep
    ctx.beginPath(); ctx.moveTo(CX, cy + ch / 2); ctx.arc(CX, cy + ch / 2, W, -Math.PI / 2, -Math.PI / 2 + sp * M.TAU); ctx.closePath(); ctx.clip();
    rrect(ctx, cx - pad, cy - pad, cw + 2 * pad, ch + 2 * pad, 40); ctx.stroke();
    ctx.restore();
  }
  const lk = E.outQuint(prog(u, 60, 60.8));
  if (lk > 0) {
    ctx.save(); ctx.globalAlpha = lk;
    text(ctx, '0 FCFA · Sans carte bancaire', CX, cy + ch + 110, font(40, 600, UI), C.paper, 'center');
    text(ctx, 'Paiement Wave & Orange Money', CX, cy + ch + 165, font(36, 500, UI), 'rgba(251,249,245,0.65)', 'center');
    ctx.restore();
  }
}

M.film({
  fonts: [font(100, 700, DISPLAY), font(40, 500, UI), font(40, 600, UI)],
  images: {
    couple: 'assets/brand/couple-atelierpro.png',
    roi: 'assets/brand/roi-simulator-smartphone.png',
    wave: 'assets/brand/wave.png',
    om: 'assets/brand/orange-money.png',
    s2: 'assets/shots/section_02_con-u-sp-cialement-pour-les-ma-tres-tail.png',
    s3: 'assets/shots/section_03_pourquoi-abandonner-le-cahier-papier-et-.png',
    // the user's real app captures; any missing file falls back to landing UI
    appMesures: 'assets/app/mesures.png',
    appProduction: 'assets/app/production.png',
    appPaiements: 'assets/app/paiements.png',
    appRecu: 'assets/app/recu-whatsapp.png',
    appDashboard: 'assets/app/dashboard.png',
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 7.9) sceneProblem(ctx, u);
    else if (u < 12) sceneBrand(ctx, u, IMG);
    else if (u < 20.1) { scenePromise(ctx, u, IMG); if (u > 19.3) sceneFeaturesOver(ctx, u, IMG); }
    else if (u < 52) sceneFeatures(ctx, u, IMG);
    else if (u < 58) sceneProof(ctx, u, IMG);
    else sceneEnd(ctx, u);
  },
});

// during 19.3..20.1 the features strip slides in over the promise as it leaves
function sceneFeaturesOver(ctx, u, IMG) {
  const enter = 1 - E.outCubic(prog(u, 19.3, 20.1));
  ctx.save(); ctx.beginPath(); ctx.rect(enter * W, 0, W, H); ctx.clip();
  sceneFeatures(ctx, u, IMG);
  ctx.restore();
}
