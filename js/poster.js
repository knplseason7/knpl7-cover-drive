/* KNPL-7 sponsor poster generator (1080 × 1350, Instagram portrait) */
window.KNPLPoster = (function () {
  const W = 1080, H = 1350;
  const GOLD = "#e9b949", NAVY = "#0a1630", INK = "#1b1405";
  const cache = {};

  function load(src) {
    if (!src) return Promise.resolve(null);
    if (cache[src]) return cache[src];
    cache[src] = new Promise(res => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => res(null);
      i.src = src;
    });
    return cache[src];
  }

  async function fonts() {
    if (!document.fonts) return;
    try {
      await Promise.all([
        document.fonts.load('700 80px "Lora"'), document.fonts.load('italic 500 30px "Lora"'),
        document.fonts.load('600 24px "Poppins"'), document.fonts.load('500 20px "Poppins"'), document.fonts.load('400 18px "Poppins"')
      ]);
    } catch (_) {}
  }

  function spaced(ctx, text, x, y, spacing, align = "center") {
    const chars = [...text];
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    const prev = ctx.textAlign; ctx.textAlign = "left";
    chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + spacing; });
    ctx.textAlign = prev;
    return total;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function circleImg(ctx, img, cx, cy, r, ring = GOLD, bg = "#fff", pad = 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.fillStyle = ring; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill(); ctx.clip();
    if (img) ctx.drawImage(img, cx - r + pad, cy - r + pad, (r - pad) * 2, (r - pad) * 2);
    ctx.restore();
  }

  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let line = "";
    words.forEach(w => {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  function fitName(ctx, name, maxW) {
    for (let size = 64; size >= 34; size -= 2) {
      ctx.font = `700 ${size}px Lora, Georgia, serif`;
      const lines = wrap(ctx, name, maxW);
      if (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= maxW)) return { size, lines };
    }
    ctx.font = `700 34px Lora, Georgia, serif`;
    return { size: 34, lines: wrap(ctx, name, maxW).slice(0, 3) };
  }

  function pillLayout(ctx, labels, maxW, size) {
    ctx.font = `600 ${size}px Poppins, sans-serif`;
    const padX = 20, gap = 12, h = size + 22;
    const rows = []; let row = [], rowW = 0;
    labels.forEach(l => {
      const w = Math.min(maxW, ctx.measureText(l).width + padX * 2);
      if (row.length && rowW + gap + w > maxW) { rows.push({ row, rowW }); row = []; rowW = 0; }
      rowW += (row.length ? gap : 0) + w; row.push({ l, w });
    });
    if (row.length) rows.push({ row, rowW });
    return { rows, h, gap, size, height: rows.length * h + (rows.length - 1) * gap };
  }

  async function draw(canvas, { result, logo, team, cfg }) {
    await fonts();
    const E = cfg.EVENT;
    const [bg, knpl, one, teamImg, spLogo] = await Promise.all([
      load("assets/bg.jpg"), load("assets/knpl-logo.png"), load("assets/one-logo.png"),
      load(team && team.logo), load(logo)
    ]);
    const ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    ctx.textBaseline = "alphabetic";

    // Background
    ctx.fillStyle = "#060e20"; ctx.fillRect(0, 0, W, H);
    if (bg) {
      const s = Math.max(W / bg.width, H / bg.height);
      ctx.globalAlpha = .9; ctx.drawImage(bg, (W - bg.width * s) / 2, 0, bg.width * s, bg.height * s); ctx.globalAlpha = 1;
    }
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(6,14,32,.35)"); g.addColorStop(.38, "rgba(6,14,32,.72)"); g.addColorStop(1, "rgba(6,14,32,.96)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; rrect(ctx, 26, 26, W - 52, H - 52, 22); ctx.stroke();
    ctx.strokeStyle = "rgba(233,185,73,.35)"; ctx.lineWidth = 1; rrect(ctx, 38, 38, W - 76, H - 76, 16); ctx.stroke();

    // Header
    circleImg(ctx, knpl, W / 2, 142, 82, GOLD, "#fff", 4);
    ctx.fillStyle = "#dfe6f4"; ctx.font = "500 20px Poppins, sans-serif";
    spaced(ctx, E.league.toUpperCase(), W / 2, 270, 5);
    ctx.fillStyle = "#fff"; ctx.font = "700 88px Lora, Georgia, serif"; ctx.textAlign = "center";
    ctx.fillText(E.season.toUpperCase(), W / 2, 356);
    ctx.fillStyle = GOLD; ctx.font = "600 25px Poppins, sans-serif";
    spaced(ctx, E.dates.toUpperCase(), W / 2, 404, 3);
    ctx.fillStyle = "#c9d2e6"; ctx.font = "500 17px Poppins, sans-serif";
    spaced(ctx, E.venue.toUpperCase(), W / 2, 438, 3);

    // Sponsor panel — measure first
    const d = result.data;
    const labels = result.items.map(i => (i.name.replace(/^KNPL-7\s+/i, "").replace(/^KNPL\s+/i, "") + (i.qty > 1 ? " × " + i.qty : "")).toUpperCase());
    const innerW = 780;
    const panelTop = 476, footerTop = H - 120, bottomBlock = 250;
    const maxPanel = footerTop - bottomBlock - panelTop;
    let pills = pillLayout(ctx, labels, innerW, labels.length > 3 ? 18 : 21);
    const name = fitName(ctx, d.displayName, innerW);
    const nameH = name.lines.length * name.size * 1.15;
    const base = () => 34 + nameH + 26 + 30 + 18 + pills.height + 70;
    if (base() + (spLogo ? 130 : 0) > maxPanel) pills = pillLayout(ctx, labels, innerW, 16);
    let logoBox = null;
    if (spLogo) {
      const room = maxPanel - base() - 30;
      if (room >= 90) logoBox = { w: 340, h: Math.min(190, room) };
    }
    const blocks = base() - 70 + (logoBox ? logoBox.h + 30 : 0);
    const panelH = blocks + 70;
    const panelX = 110, panelW = W - 220;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    g = ctx.createLinearGradient(0, panelTop, 0, panelTop + panelH);
    g.addColorStop(0, "rgba(26,44,80,.94)"); g.addColorStop(1, "rgba(13,24,47,.94)");
    ctx.fillStyle = g; rrect(ctx, panelX, panelTop, panelW, panelH, 22); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(233,185,73,.55)"; ctx.lineWidth = 1.5; rrect(ctx, panelX, panelTop, panelW, panelH, 22); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillRect(W / 2 - 50, panelTop - 2, 100, 4);

    let y = panelTop + 50;
    ctx.fillStyle = GOLD; ctx.font = "600 19px Poppins, sans-serif";
    spaced(ctx, "PROUDLY SPONSORED BY", W / 2, y, 6);
    y += 24;
    if (logoBox) {
      const bw = logoBox.w + 40, bh = logoBox.h;
      ctx.fillStyle = "#fff"; rrect(ctx, W / 2 - bw / 2, y, bw, bh, 16); ctx.fill();
      const s = Math.min((bw - 36) / spLogo.width, (bh - 28) / spLogo.height);
      const lw = spLogo.width * s, lh = spLogo.height * s;
      ctx.drawImage(spLogo, W / 2 - lw / 2, y + (bh - lh) / 2, lw, lh);
      y += bh + 30;
    } else y += 10;
    ctx.fillStyle = "#fff"; ctx.font = `700 ${name.size}px Lora, Georgia, serif`; ctx.textAlign = "center";
    name.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + name.size * 0.92 + i * name.size * 1.15));
    y += nameH + 26;
    ctx.fillStyle = "#c9d2e6"; ctx.font = "500 17px Poppins, sans-serif";
    spaced(ctx, `THE “${E.category.toUpperCase()}” CATEGORY · ${E.tag}`, W / 2, y + 6, 4);
    y += 30;
    pills.rows.forEach((r, ri) => {
      let x = W / 2 - r.rowW / 2;
      const py = y + ri * (pills.h + pills.gap);
      r.row.forEach(p => {
        g = ctx.createLinearGradient(0, py, 0, py + pills.h);
        g.addColorStop(0, "#f3cf73"); g.addColorStop(1, GOLD);
        ctx.fillStyle = g; rrect(ctx, x, py, p.w, pills.h, pills.h / 2); ctx.fill();
        ctx.fillStyle = INK; ctx.font = `600 ${pills.size}px Poppins, sans-serif`; ctx.textAlign = "center";
        let t = p.l; while (ctx.measureText(t).width > p.w - 30 && t.length > 4) t = t.slice(0, -2);
        if (t !== p.l) t = t.slice(0, -1) + "…";
        ctx.fillText(t, x + p.w / 2, py + pills.h / 2 + pills.size * .36);
        x += p.w + pills.gap;
      });
    });

    // Promoted by + thank-you, centred in the space between panel and footer
    const r = 50;
    const blockH = (team ? r * 2 + 34 : 0) + 72;
    let py = panelTop + panelH + Math.max(24, (footerTop - (panelTop + panelH) - blockH) / 2);
    if (team) {
      ctx.font = "700 32px Lora, Georgia, serif";
      const tw = Math.max(ctx.measureText(team.name).width, 220);
      const groupW = r * 2 + 24 + tw;
      const gx = W / 2 - groupW / 2, cy = py + r;
      circleImg(ctx, teamImg, gx + r, cy, r, GOLD, "#fff");
      ctx.textAlign = "left";
      ctx.fillStyle = GOLD; ctx.font = "600 16px Poppins, sans-serif";
      spaced(ctx, "PROMOTED BY", gx + r * 2 + 24, cy - 10, 5, "left");
      ctx.fillStyle = "#fff"; ctx.font = "700 32px Lora, Georgia, serif";
      ctx.fillText(team.name, gx + r * 2 + 24, cy + 28);
      py = cy + r + 34;
    }
    const ty = py + 26;
    ctx.textAlign = "center"; ctx.fillStyle = GOLD; ctx.font = "italic 500 30px Lora, Georgia, serif";
    ctx.fillText(`Thank you for powering ${E.short} ${E.season}!`, W / 2, ty);
    ctx.fillStyle = "#c9d2e6"; ctx.font = "400 18px Poppins, sans-serif";
    ctx.fillText(`See you at Angamaly · ${E.datesShort}`, W / 2, ty + 32);

    // Footer
    ctx.strokeStyle = "rgba(233,185,73,.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(110, footerTop + 8); ctx.lineTo(W - 110, footerTop + 8); ctx.stroke();
    const fy = footerTop + 54;
    ctx.font = "500 16px Poppins, sans-serif";
    const t1 = "Organised by " + E.organiser, t2 = "Reg. No. " + E.regNo + "  ·  " + E.tagline;
    const fw = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width);
    const fx = W / 2 - (fw + 84) / 2;
    circleImg(ctx, one, fx + 32, fy, 32, "rgba(233,185,73,.8)", "#fff", 2);
    ctx.textAlign = "left"; ctx.fillStyle = "#e6ebf6"; ctx.fillText(t1, fx + 84, fy - 4);
    ctx.fillStyle = "#a9b4ca"; ctx.font = "400 15px Poppins, sans-serif"; ctx.fillText(t2, fx + 84, fy + 20);
    ctx.textAlign = "left";
    return canvas;
  }

  return { draw, load };
})();
