/* KNPL-7 sponsorship acknowledgement receipt — A4 PDF built with pdf-lib (bundled in js/vendor) */
window.KNPLReceipt = (function () {
  const MM = 72 / 25.4, PW = 595.28, PH = 841.89;
  const hex = h => { const n = parseInt(h.slice(1), 16); return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
  let C;
  const colors = () => ({
    navy: hex("#0a1630"), navy2: hex("#1a2c50"), gold: hex("#e9b949"), goldDk: hex("#b0861e"), ink: hex("#1a2238"),
    muted: hex("#687288"), line: hex("#dee2eb"), soft: hex("#f8f9fc"), cream: hex("#fdf8ea"), white: hex("#ffffff"),
    pale: hex("#c8d2e6"), mid: hex("#3c4254")
  });

  function words(num) {
    num = Math.round(Number(num));
    if (!num) return "Zero";
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    const three = n => (n >= 100 ? a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? two(n % 100) : "");
    const parts = [];
    const cr = Math.floor(num / 1e7); num %= 1e7;
    const lk = Math.floor(num / 1e5); num %= 1e5;
    const th = Math.floor(num / 1e3); num %= 1e3;
    if (cr) parts.push(three(cr) + " Crore");
    if (lk) parts.push(two(lk) + " Lakh");
    if (th) parts.push(two(th) + " Thousand");
    if (num) parts.push(three(num));
    return parts.join(" ");
  }

  async function pngBytes(src) {
    const img = await window.KNPLPoster.load(src);
    if (!img) return null;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    try {
      const b64 = c.toDataURL("image/png").split(",")[1];
      return Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
    } catch (_) { return null; }
  }

  async function build({ result, logo, team, cfg }) {
    if (!window.PDFLib) throw new Error("PDF library is still loading — please try again in a moment.");
    C = C || colors();
    const { PDFDocument, StandardFonts } = PDFLib;
    const pdf = await PDFDocument.create();
    pdf.setTitle("KNPL-7 Sponsorship Receipt " + result.receiptNo);
    pdf.setAuthor("KNPL Core Group · ONE");
    const page = pdf.addPage([PW, PH]);
    const F = {
      reg: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      ital: await pdf.embedFont(StandardFonts.HelveticaOblique), serif: await pdf.embedFont(StandardFonts.TimesRomanBold),
      serifIt: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic), serifI: await pdf.embedFont(StandardFonts.TimesRomanItalic)
    };
    const charset = new Set(F.reg.getCharacterSet());
    const safe = s => [...String(s == null ? "" : s).replace(/^'/, "").replace(/₹/g, "Rs.")].map(ch => charset.has(ch.codePointAt(0)) ? ch : (ch === "\n" ? " " : "?")).join("");
    const embed = async src => { const b = await pngBytes(src); return b ? pdf.embedPng(b) : null; };
    const [knpl, one, teamImg, spImg] = await Promise.all([embed("assets/knpl-logo.png"), embed("assets/one-logo.png"), embed(team && team.logo), embed(logo)]);

    // ---- drawing helpers (mm, top-left origin) ----
    const box = (x, y, w, h, color, r = 0, border) => {
      const X = x * MM, Y = y * MM, Wd = w * MM, Hd = h * MM, R = r * MM;
      const p = R ? `M${X + R} ${Y} H${X + Wd - R} Q${X + Wd} ${Y} ${X + Wd} ${Y + R} V${Y + Hd - R} Q${X + Wd} ${Y + Hd} ${X + Wd - R} ${Y + Hd} H${X + R} Q${X} ${Y + Hd} ${X} ${Y + Hd - R} V${Y + R} Q${X} ${Y} ${X + R} ${Y} Z`
        : `M${X} ${Y} H${X + Wd} V${Y + Hd} H${X} Z`;
      page.drawSvgPath(p, { x: 0, y: PH, color, borderColor: border, borderWidth: border ? 0.6 : 0 });
    };
    const circle = (cx, cy, r, color) => page.drawCircle({ x: cx * MM, y: PH - cy * MM, size: r * MM, color });
    const text = (s, x, y, { f = F.reg, size = 9, color = C.ink, align = "left", spacing = 0 } = {}) => {
      s = safe(s);
      if (spacing) s = s.split("").join(" ".repeat(1));
      const w = f.widthOfTextAtSize(s, size) / MM;
      const X = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      page.drawText(s, { x: X * MM, y: PH - y * MM, size, font: f, color });
      return w;
    };
    const fit = (s, f, size, maxMm) => {
      s = safe(s);
      if (f.widthOfTextAtSize(s, size) / MM <= maxMm) return s;
      while (s.length > 1 && f.widthOfTextAtSize(s + "...", size) / MM > maxMm) s = s.slice(0, -1);
      return s + "...";
    };
    const wrap = (s, f, size, maxMm) => {
      const out = []; let line = "";
      safe(s).split(/\s+/).forEach(w => {
        const t = line ? line + " " + w : w;
        if (f.widthOfTextAtSize(t, size) / MM > maxMm && line) { out.push(line); line = w; } else line = t;
      });
      if (line) out.push(line);
      return out;
    };
    const image = (img, x, y, w, h) => img && page.drawImage(img, { x: x * MM, y: PH - (y + h) * MM, width: w * MM, height: h * MM });
    const imageFit = (img, x, y, w, h) => {
      if (!img) return;
      const s = Math.min(w / img.width, h / img.height);
      image(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
    };
    const logoDisc = (img, cx, cy, r) => { circle(cx, cy, r + 0.8, C.gold); circle(cx, cy, r, C.white); image(img, cx - r * .9, cy - r * .9, r * 1.8, r * 1.8); };

    const E = cfg.EVENT, P = cfg.PAYMENT, d = result.data;
    const W = PW / MM, M = 16;
    const fmtDate = v => { const t = new Date(v); return isNaN(t) ? String(v || "-") : t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

    // ---- header band ----
    box(0, 0, W, 44, C.navy);
    box(0, 44, W, 1.4, C.gold);
    logoDisc(knpl, M + 13, 22, 13);
    logoDisc(one, W - M - 13, 22, 13);
    text(E.league.toUpperCase(), W / 2, 14, { size: 7.5, color: C.pale, align: "center", spacing: 1 });
    text(E.season.toUpperCase(), W / 2, 25.5, { f: F.serif, size: 25, color: C.white, align: "center" });
    text(`${E.datesShort.toUpperCase()}  ·  ${E.venue.toUpperCase()}`, W / 2, 32.5, { f: F.bold, size: 8.5, color: C.gold, align: "center" });
    text(`THE "${E.category.toUpperCase()}" CATEGORY SPONSORSHIP`, W / 2, 38.5, { size: 7.5, color: C.pale, align: "center" });

    // ---- title + meta ----
    let y = 59;
    text("SPONSORSHIP", M, y - 6, { f: F.bold, size: 15 });
    text("ACKNOWLEDGEMENT", M, y + 0.5, { f: F.bold, size: 15 });
    box(M, y + 3, 22, 1, C.gold);
    const meta = [["Receipt No", result.receiptNo], ["Date", fmtDate(result.timestamp)],
      ["Status", result.status === "Confirmed" ? "Payment confirmed" : "Received - subject to verification"]];
    meta.forEach(([k, v], i) => {
      text(k, W - M - 75, y - 7 + i * 5.2, { size: 8.5, color: C.muted });
      text(v, W - M, y - 7 + i * 5.2, { f: F.bold, size: 8.5, align: "right" });
    });

    // ---- sponsor box ----
    y += 9;
    const boxH = 40, hasLogo = !!spImg;
    box(M, y, W - 2 * M, boxH, C.soft, 3, C.line);
    text("RECEIVED WITH THANKS FROM", M + 5, y + 7, { size: 7.5, color: C.muted, spacing: 1 });
    text(fit(d.sponsorName, F.bold, 13, hasLogo ? 120 : 165), M + 5, y + 14, { f: F.bold, size: 13 });
    const rows = [["Advertised as", d.displayName], ["Contact person", d.contactPerson], ["Mobile", d.mobile],
      ["Email", d.email || "-"], ["City / Address", d.city || "-"], ["Social", d.social || "-"]];
    rows.forEach(([k, v], i) => {
      const col = Math.floor(i / 3), row = i % 3;
      const colW = hasLogo ? 64 : 86;
      const x = M + 5 + col * colW, yy = y + 22 + row * 5.6;
      text(k, x, yy, { size: 8.5, color: C.muted });
      text(fit(v, F.reg, 8.5, colW - 30), x + 25, yy, { size: 8.5 });
    });
    if (hasLogo) {
      const bw = 38, bh = 30, bx = W - M - bw - 5, by = y + 5;
      box(bx, by, bw, bh, C.white, 2, C.line);
      imageFit(spImg, bx + 2, by + 2, bw - 4, bh - 4);
    }

    // ---- promoter ----
    y += boxH + 6;
    box(M, y, W - 2 * M, 16, C.navy2, 3);
    if (team) logoDisc(teamImg, M + 9, y + 8, 5.6);
    text("PROMOTED BY", M + 19, y + 6.5, { f: F.bold, size: 7, color: C.gold, spacing: 1 });
    text(d.team, M + 19, y + 12, { f: F.bold, size: 11, color: C.white });
    if (team) text("Franchise owner: " + team.owner, W - M - 5, y + 10, { size: 8.5, color: C.pale, align: "right" });

    // ---- items table ----
    y += 24;
    const xNo = M + 3, xName = M + 13, xQty = W - M - 62, xRate = W - M - 32, xAmt = W - M - 3;
    box(M, y, W - 2 * M, 8, C.gold);
    [["NO.", xNo, "left"], ["SPONSORSHIP", xName, "left"], ["QTY", xQty, "center"], ["RATE (RS)", xRate, "right"], ["AMOUNT (RS)", xAmt, "right"]]
      .forEach(([t, x, al]) => text(t, x, y + 5.4, { f: F.bold, size: 8, color: C.navy, align: al }));
    y += 8;
    // group the per-team jersey rows into one line with the team names underneath
    const rowsOut = [];
    result.items.forEach(it => {
      const g = it.jerseyTeam && rowsOut.find(r => r.code === it.code && r.teams);
      if (g) { g.qty += it.qty; g.amount += it.amount; g.teams.push(it.jerseyTeam); }
      else rowsOut.push(Object.assign({}, it, { teams: it.jerseyTeam ? [it.jerseyTeam] : null }));
    });
    rowsOut.forEach((it, i) => {
      const sub = it.teams ? wrap("Teams: " + it.teams.join(", "), F.reg, 7.6, xQty - xName - 10) : [];
      const rh = 8 + sub.length * 3.6;
      if (i % 2) box(M, y, W - 2 * M, rh, C.soft);
      text(String(i + 1).padStart(2, "0"), xNo, y + 5.4, { size: 9, color: C.muted });
      text(fit(it.name, F.reg, 9.3, xQty - xName - 10), xName, y + 5.4, { size: 9.3 });
      sub.forEach((l, k) => text(l, xName, y + 9.2 + k * 3.6, { size: 7.6, color: C.muted }));
      text(String(it.qty), xQty, y + 5.4, { size: 9.3, align: "center" });
      text(Number(it.rate).toLocaleString("en-IN"), xRate, y + 5.4, { size: 9.3, align: "right" });
      text(Number(it.amount).toLocaleString("en-IN"), xAmt, y + 5.4, { size: 9.3, align: "right" });
      y += rh;
    });
    box(M, y, W - 2 * M, 0.5, C.navy);
    y += 7.5;
    text("TOTAL", xRate, y, { f: F.bold, size: 11, align: "right" });
    text("Rs. " + Number(result.total).toLocaleString("en-IN") + "/-", xAmt, y, { f: F.bold, size: 11, align: "right" });
    y += 6;
    text("Rupees " + words(result.total) + " Only", xAmt, y, { f: F.ital, size: 8.6, color: C.muted, align: "right" });

    // ---- payment ----
    y += 10;
    text("PAYMENT DETAILS", M, y, { f: F.bold, size: 7.5, color: C.muted, spacing: 1 });
    y += 6;
    [["Mode", d.paymentMode], ["Reference", d.txnRef], ["Payment date", fmtDate(d.paymentDate)], ["Paid to", "ONE · " + P.bank + ", " + P.branch]]
      .forEach(([k, v], i) => {
        const x = M + (i % 2) * 89, yy = y + Math.floor(i / 2) * 5.8;
        text(k, x, yy, { size: 8.8, color: C.muted });
        text(fit(v, F.bold, 8.8, 62), x + 23, yy, { f: F.bold, size: 8.8 });
      });

    // ---- thank-you note ----
    y += 16;
    const msg = `Dear ${d.contactPerson}, on behalf of the KNPL Core Group and ${d.team}, we thank ${d.displayName} for supporting the ${E.league} through the "${E.category}" category. Your partnership gives budding cricket talent a professional stage and supports community initiatives like SAHAYOG and FARMRISE.`;
    const lines = wrap(msg, F.reg, 9.3, W - 2 * M - 16);
    const welcome = wrap(`We warmly welcome you to the event at ${E.venue} on ${E.dates.replace(/ · /g, ", ")}.`, F.bold, 9.3, W - 2 * M - 16);
    const noteH = 16 + lines.length * 4.6 + welcome.length * 4.6 + 4;
    box(M, y, W - 2 * M, noteH, C.cream, 3);
    box(M, y, 2.2, noteH, C.gold);
    text(`Thank you for being part of ${E.short} ${E.season}!`, M + 8, y + 9.5, { f: F.serifIt, size: 15 });
    let ly = y + 16.5;
    lines.forEach(l => { text(l, M + 8, ly, { size: 9.3, color: C.mid }); ly += 4.6; });
    ly += 1.5;
    welcome.forEach(l => { text(l, M + 8, ly, { f: F.bold, size: 9.3 }); ly += 4.6; });

    // ---- footer ----
    const fy = 270;
    box(M, fy, W - 2 * M, 0.3, C.line);
    text(`Organised by ${E.organiser} · Reg. No. ${E.regNo}`, M, fy + 5, { size: 7.6, color: C.muted });
    text(`A/c ${P.accountNo} · IFSC ${P.ifsc} · ${P.bank}, ${P.branch} · UPI ${P.upiId}`, M, fy + 9.5, { size: 7.6, color: C.muted });
    text("This is a computer-generated acknowledgement and does not require a signature.", M, fy + 14, { size: 7.6, color: C.muted });
    if (result.status !== "Confirmed") text("Final confirmation follows payment verification by the KNPL Core Group.", M, fy + 18.5, { size: 7.6, color: C.muted });
    text(E.tagline, W - M, fy + 5, { f: F.serifI, size: 11, color: C.goldDk, align: "right" });
    return pdf.save();
  }

  async function download(ctx) {
    const bytes = await build(ctx);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url; a.download = `KNPL7-Sponsorship-Receipt-${ctx.result.receiptNo}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  return { build, download, words };
})();
