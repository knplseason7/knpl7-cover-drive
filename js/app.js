/* KNPL-7 Cover Drive Sponsorship Portal — main app */
(function () {
  const C = window.KNPL_CONFIG;
  const DEMO = !C.API_URL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const inr = n => "₹" + Number(n).toLocaleString("en-IN");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const teamByName = n => C.TEAMS.find(t => t.name === n);

  const state = {
    items: C.ITEMS.map(i => Object.assign({ taken: 0, sponsors: [] }, i)),
    cart: {},              // code -> qty
    jersey: [],            // team names chosen for the per-team (jersey) sponsorship
    details: null,
    files: { logo: null, leaflet: null, proof: null },
    logoPng: null,         // normalised logo for poster / receipt
    result: null,
    showStaticQr: !C.PAYMENT.dynamicUpi
  };

  /* ---------------------------- data ---------------------------- */
  const DEMO_KEY = "knpl7_cd_demo_rows";
  const demoRows = () => { try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]"); } catch (_) { return []; } };
  const saveDemoRows = r => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(r)); } catch (_) {} };

  async function loadStatus() {
    $("#loading").hidden = false;
    try {
      if (DEMO) {
        const rows = demoRows();
        state.items = C.ITEMS.map(it => {
          const mine = rows.filter(r => r.code === it.code);
          return Object.assign({}, it, {
            taken: mine.reduce((a, r) => a + r.qty, 0),
            sponsors: mine.map(r => ({ name: r.displayName, team: r.team, jerseyTeam: r.jerseyTeam || "", qty: r.qty, confirmed: false }))
          });
        });
      } else {
        const res = await fetch(C.API_URL + "?action=status&t=" + Date.now());
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Status unavailable");
        const meta = Object.fromEntries(C.ITEMS.map(i => [i.code, i]));
        state.items = data.items.map(i => Object.assign({}, meta[i.code] || {}, i));
        $("#liveNote").textContent = "Live status — updated " + new Date(data.updated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + ".";
      }
      applyPick();
      // drop cart entries that are no longer available
      const jt = jerseyItem();
      if (jt) {
        const gone = takenTeams(jt);
        state.jersey = state.jersey.filter(t => !gone.includes(t));
        if (state.cart[jt.code]) { if (state.jersey.length) state.cart[jt.code] = state.jersey.length; else delete state.cart[jt.code]; }
      }
      Object.keys(state.cart).forEach(code => {
        const it = state.items.find(i => i.code === code);
        if (it && it.perTeam) return;
        const left = it ? it.slots - it.taken : 0;
        if (left <= 0) delete state.cart[code]; else state.cart[code] = Math.min(state.cart[code], left);
      });
    } catch (err) {
      toast("Couldn't load live slot status. Showing the tariff — availability will be checked on submit.");
      console.error(err);
    }
    $("#loading").hidden = true;
    render();
  }

  /* ---------------------------- render step 1 ---------------------------- */
  function render() {
    const trophy = state.items.find(i => i.code === "CD01");
    renderFeatured(trophy);
    const top = state.items.filter(i => i.code !== "CD01" && (i.flagship || i.csr));
    const rest = state.items.filter(i => !i.flagship && !i.csr);
    $("#gridTop").innerHTML = top.map(card).join("");
    $("#gridRest").innerHTML = rest.map(card).join("");
    updateCart();
  }

  // approved vs. awaiting-approval slot counts for an item
  const counts = it => {
    let ok = 0, wait = 0;
    (it.sponsors || []).forEach(s => { if (s.confirmed) ok += s.qty || 1; else wait += s.qty || 1; });
    return { ok, wait };
  };
  const fullBadge = it => counts(it).wait
    ? `<span class="badge wait">⏳ Sponsorship attempted · Under approval</span>`
    : `<span class="badge sold">✓ ${it.slots > 1 ? "All slots sponsored" : "Sponsored"}</span>`;

  function sponsorList(it) {
    if (!it.sponsors || !it.sponsors.length) return "";
    const grouped = [];
    it.sponsors.forEach(s => {
      const g = s.jerseyTeam && grouped.find(x => x.jerseys && x.name === s.name && x.team === s.team);
      if (g) { g.jerseys.push(s.jerseyTeam); g.confirmed = g.confirmed && s.confirmed; }
      else grouped.push(Object.assign({}, s, { jerseys: s.jerseyTeam ? [s.jerseyTeam] : null }));
    });
    return `<ul class="sponsors">${grouped.map(s => {
      const t = teamByName(s.jerseys && s.jerseys.length === 1 ? s.jerseys[0] : s.team);
      return `<li class="${s.confirmed ? "" : "pending-row"}">${t ? `<img src="${t.logo}" alt="">` : ""}<div><b>${esc(s.name)}${s.qty > 1 ? " × " + s.qty : ""}</b>
        <small>${s.jerseys ? "Jersey: " + s.jerseys.map(esc).join(", ") + " · " : ""}Promoted by ${esc(s.team)}${s.confirmed ? "" : ' · <span class="pend">Sponsorship attempted · request under approval</span>'}</small></div></li>`;
    }).join("")}</ul>`;
  }

  function card(it) {
    const left = Math.max(0, it.slots - it.taken);
    const full = left === 0;
    const sel = state.cart[it.code] || 0;
    const no = it.code.replace("CD", "");
    const csrLogo = it.csr ? `<img class="csr" src="assets/${it.csr}.png" alt="${it.csr}">` : "";
    let pick;
    if (full) pick = fullBadge(it);
    else if (it.perTeam) pick = `
      ${sel ? `<div class="chips">${state.jersey.map(t => `<span class="chip"><img src="${teamByName(t).logo}" alt="">${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="pick"><span class="tick"><i>${sel ? "✓" : ""}</i>${sel ? sel + (sel === 1 ? " team" : " teams") + " · " + inr(sel * it.rate) : "Teams"}</span>
        <button type="button" class="btn outline small" data-jersey>${sel ? "Change teams" : "Choose teams"}</button></div>`;
    else if (it.slots > 1) pick = `<div class="pick"><span class="tick"><i>${sel ? "✓" : ""}</i>${sel ? "Qty " + sel + " · " + inr(sel * it.rate) : "Quantity"}</span>
        <div class="qty" data-qty="${it.code}"><button type="button" data-d="-1" aria-label="Fewer" ${sel ? "" : "disabled"}>−</button><span>${sel}</span><button type="button" data-d="1" aria-label="More" ${sel >= left ? "disabled" : ""}>+</button></div></div>`;
    else pick = `<div class="pick"><span class="tick"><i>${sel ? "✓" : ""}</i>${sel ? "Selected" : "Select"}</span></div>`;
    return `<div class="item ${it.flagship ? "flag" : ""} ${sel ? "selected" : ""} ${full ? "full" : ""}" data-code="${it.code}" ${full ? "" : 'tabindex="0" role="button"'} aria-pressed="${!!sel}">
      <div class="item-top"><div><span class="item-no">${no}</span><h4>${esc(it.name)}</h4></div>${csrLogo}</div>
      <div class="rate">${inr(it.rate)}${it.slots > 1 ? '<small style="font-size:12px;color:var(--muted);font-family:var(--sans);font-weight:500"> / slot</small>' : ""}</div>
      ${it.slots > 1 ? `<div class="meter"><i style="width:${(it.taken / it.slots) * 100}%"></i></div>
        <div class="slot-line"><span>${it.taken} of ${it.slots} taken</span><span>${left} left</span></div>`
        : `<div class="slot-line"><span>1 slot</span>${full ? "" : '<span class="badge open">Available</span>'}</div>`}
      ${sponsorList(it)}
      ${pick}
    </div>`;
  }

  function renderFeatured(it) {
    if (!it) return;
    const full = it.taken >= it.slots, sel = !!state.cart[it.code];
    $("#featuredCard").innerHTML = `
      <img src="assets/trophy.jpg" alt="KNPL Champions Everolling Trophy design">
      <div>
        <p class="eyebrow gold">Featured sponsorship · 01</p>
        <h3>KNPL Champions Everolling Trophy</h3>
        <p>A hand-carved wooden trophy that passes from champion to champion for 15 years, starting with Season 7 in 2027. Sponsor it, and your brand is associated with every KNPL champion who lifts it.</p>
        <div class="row-f">
          <div><div class="rate">${inr(it.rate)}</div><span class="fine">1 slot · 15 years · Design image for reference only</span></div>
          ${full ? fullBadge(it) :
            `<button type="button" class="btn ${sel ? "outline" : "gold"}" data-feature="${it.code}">${sel ? "✓ Selected — tap to remove" : "Sponsor the trophy"}</button>`}
        </div>
        ${sponsorList(it)}
      </div>`;
  }

  function toggle(code) {
    const it = state.items.find(i => i.code === code);
    if (!it || it.taken >= it.slots) return;
    if (it.perTeam) { openJersey(); return; }
    if (state.cart[code]) delete state.cart[code]; else state.cart[code] = 1;
    render();
  }

  function cartLines() {
    return C.ITEMS.filter(i => state.cart[i.code]).map(meta => {
      const it = state.items.find(i => i.code === meta.code) || meta;
      const qty = state.cart[it.code];
      return { code: it.code, name: it.name, qty, rate: it.rate, amount: qty * it.rate, teams: it.perTeam ? state.jersey.slice() : null };
    });
  }

  /* ---------------------------- jersey team picker ---------------------------- */
  const jerseyItem = () => state.items.find(i => i.perTeam);
  const takenTeams = it => (it.sponsors || []).map(s => s.jerseyTeam).filter(Boolean);

  function openJersey() {
    const it = jerseyItem(); if (!it) return;
    const taken = Object.fromEntries((it.sponsors || []).filter(s => s.jerseyTeam).map(s => [s.jerseyTeam, s.name]));
    const draft = new Set(state.jersey);
    const dlg = $("#jerseyDlg");
    const paint = () => {
      $("#jerseyGrid").innerHTML = C.TEAMS.map(t => {
        const by = taken[t.name], on = draft.has(t.name);
        return `<button type="button" class="jt ${on ? "on" : ""}" data-jt="${esc(t.name)}" ${by ? "disabled" : ""} aria-pressed="${on}">
          <img src="${t.logo}" alt=""><b>${esc(t.name)}</b>
          <small>${by ? "Sponsored by " + esc(by) : on ? "✓ Selected" : "Available"}</small></button>`;
      }).join("");
      const n = draft.size;
      $("#jerseyTotal").innerHTML = n ? `${n} ${n === 1 ? "team" : "teams"} × ${inr(it.rate)} = <b>${inr(n * it.rate)}</b>` : "Tap the teams whose jerseys you want to sponsor";
    };
    $("#jerseyGrid").onclick = e => {
      const b = e.target.closest("[data-jt]"); if (!b || b.disabled) return;
      const n = b.dataset.jt; draft.has(n) ? draft.delete(n) : draft.add(n); paint();
    };
    $("#jerseyAll").onclick = () => { C.TEAMS.forEach(t => { if (!taken[t.name]) draft.add(t.name); }); paint(); };
    $("#jerseyNone").onclick = () => { draft.clear(); paint(); };
    $("#jerseyDone").onclick = () => {
      state.jersey = C.TEAMS.map(t => t.name).filter(n => draft.has(n));
      if (state.jersey.length) state.cart[it.code] = state.jersey.length; else delete state.cart[it.code];
      dlg.close(); render();
    };
    paint();
    dlg.showModal();
  }
  const cartTotal = () => cartLines().reduce((a, l) => a + l.amount, 0);

  function updateCart() {
    const lines = cartLines();
    const show = lines.length && !$("#step1").hidden;
    $("#cart").hidden = !show;
    $("#cartCount").textContent = lines.length + (lines.length === 1 ? " sponsorship selected" : " sponsorships selected");
    $("#cartTotal").textContent = inr(cartTotal());
    $("#cartNext").textContent = "Continue →";
    const box = $("#selSummary");
    box.hidden = !lines.length;
    box.innerHTML = lines.length ? `<h4 class="card-title">Your selection</h4>${summaryRows(lines)}
      <div class="total-line"><span>Total amount payable</span><b>${inr(cartTotal())}</b></div>
      <div class="form-actions" style="justify-content:flex-end"><button type="button" class="btn gold" data-go="2">Continue to sponsor details →</button></div>` : "";
  }

  function summaryRows(lines) {
    return lines.map(l => `<div class="sum-row"><span>${esc(l.name)}<small class="sum-sub">${l.qty} × ${inr(l.rate)}${l.teams ? " · " + l.teams.map(esc).join(", ") : ""}</small></span><span>${inr(l.amount)}</span></div>`).join("");
  }

  /* ---------------------------- navigation ---------------------------- */
  function go(n) {
    $$(".step").forEach(s => s.hidden = s.id !== "step" + n);
    $$(".steps li").forEach(li => {
      const k = +li.dataset.step;
      li.classList.toggle("active", k === n);
      li.classList.toggle("done", k < n);
    });
    updateCart();
    if (n === 3) renderPay();
    $(".steps").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------------------------- step 2 ---------------------------- */
  function initTeams() {
    const sel = $("#teamSelect");
    C.TEAMS.forEach(t => sel.insertAdjacentHTML("beforeend", `<option value="${esc(t.name)}">${esc(t.name)} — ${esc(t.owner)}</option>`));
    sel.addEventListener("change", () => {
      const t = teamByName(sel.value);
      $("#teamPreview").src = t ? t.logo : "assets/knpl-logo.png";
      sel.classList.remove("invalid");
    });
    // Personal promoter links: ?team=11 or ?team=Madhura%20Mavericks
    const q = new URLSearchParams(location.search).get("team");
    if (q) document.querySelectorAll('a[href="status.html"]').forEach(a => a.href = "status.html?team=" + encodeURIComponent(q));
    if (q) {
      const t = /^\d+$/.test(q) ? C.TEAMS[+q - 1] : C.TEAMS.find(x => x.name.toLowerCase() === q.toLowerCase());
      if (t) {
        sel.value = t.name; sel.dispatchEvent(new Event("change"));
        const b = $("#promoBanner");
        b.innerHTML = `<img src="${t.logo}" alt=""><span>You were invited by <b>${esc(t.name)}</b> (${esc(t.owner)}). Thank you for supporting KNPL Season 7!</span>`;
        b.hidden = false;
      }
    }
  }

  function readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res({ name: file.name, type: file.type, size: file.size, data: r.result });
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // Normalise any logo (incl. SVG/WebP) into a PNG data URL, max 900px
  function toPng(dataUrl) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 900 / Math.max(img.naturalWidth || 900, img.naturalHeight || 900));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round((img.naturalWidth || 900) * s));
        c.height = Math.max(1, Math.round((img.naturalHeight || 900) * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        try { res(c.toDataURL("image/png")); } catch (_) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = dataUrl;
    });
  }

  function bindFile(input, key, maxMb, onDone) {
    input.addEventListener("change", async () => {
      const f = input.files[0];
      const drop = input.closest(".drop");
      if (!f) { state.files[key] = null; drop.classList.remove("has"); onDone && onDone(null); return; }
      if (f.size > maxMb * 1024 * 1024) { toast(`File is larger than ${maxMb} MB. Please choose a smaller file.`); input.value = ""; return; }
      state.files[key] = await readFile(f);
      drop.classList.add("has");
      onDone && onDone(state.files[key]);
    });
  }

  function validate(form) {
    let ok = true, first = null;
    $$("[required]", form).forEach(el => {
      let bad = el.type === "checkbox" ? !el.checked : !String(el.value).trim();
      if (!bad && el.name === "mobile") bad = String(el.value).replace(/\D/g, "").length < 10;
      if (!bad && el.type === "email" && el.value) bad = !/^\S+@\S+\.\S+$/.test(el.value);
      el.classList.toggle("invalid", bad);
      if (bad && !first) first = el;
      ok = ok && !bad;
    });
    const em = $("[type=email]", form);
    if (em && em.value && !/^\S+@\S+\.\S+$/.test(em.value)) { em.classList.add("invalid"); ok = false; first = first || em; }
    if (first) { first.focus(); first.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return ok;
  }

  /* ---------------------------- step 3 ---------------------------- */
  function upiUri(amount, note) {
    const p = C.PAYMENT, e = encodeURIComponent;
    return `upi://pay?pa=${p.upiId}&pn=${e(p.upiName)}&mc=${p.merchantCode}&am=${amount.toFixed(2)}&cu=INR&tn=${e(note)}`;
  }

  function renderPay() {
    const lines = cartLines(), total = cartTotal();
    $("#summaryList").innerHTML = summaryRows(lines);
    $("#payTotal").textContent = inr(total);
    const note = ("KNPL7 " + (state.details ? state.details.displayName : "")).slice(0, 40);
    const uri = upiUri(total, note);
    $("#upiLink").href = uri;
    $("#upiLink").textContent = "Pay " + inr(total) + " with UPI app";
    if (!state.showStaticQr && window.KNPLQR) {
      $("#qrBox").innerHTML = window.KNPLQR.svg(uri, "M");
      $("#qrHint").textContent = "The amount " + inr(total) + " is filled in for you.";
      $("#toggleQr").textContent = "Use the brochure QR instead";
    } else {
      $("#qrBox").innerHTML = `<img src="assets/upi-qr.png" alt="UPI QR code for ONE">`;
      $("#qrHint").textContent = "Enter the amount " + inr(total) + " in your UPI app.";
      $("#toggleQr").textContent = C.PAYMENT.dynamicUpi ? "Use a QR with the amount filled in" : "";
    }
    const P = C.PAYMENT;
    $("#bankList").innerHTML = [["Bank", P.bank], ["A/c name", P.accountName], ["A/c no", P.accountNo], ["IFSC", P.ifsc], ["Branch", P.branch], ["UPI ID", P.upiId]]
      .map(([k, v]) => `<dt>${k}</dt><dd><span>${esc(v)}</span>${/A\/c no|IFSC|UPI/.test(k) ? `<button type="button" class="copy" data-copy="${esc(v)}">Copy</button>` : ""}</dd>`).join("");
    const d = $("[name=paymentDate]");
    if (!d.value) d.value = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  }

  async function submitAll() {
    const btn = $("#submitBtn");
    const pay = Object.fromEntries(new FormData($("#payForm")));
    delete pay.proof; delete pay.agree;
    const lines = cartLines();
    const payload = {
      action: "submit",
      data: Object.assign({}, state.details, pay, { items: lines.map(l => l.teams ? { code: l.code, qty: l.qty, teams: l.teams } : { code: l.code, qty: l.qty }) }),
      files: { logo: state.files.logo, leaflet: state.files.leaflet, proof: state.files.proof }
    };
    btn.disabled = true; btn.textContent = "Submitting…"; $("#payError").textContent = "";
    try {
      let res;
      if (DEMO) {
        await new Promise(r => setTimeout(r, 600));
        const rows = demoRows();
        for (const l of lines) {
          const it = C.ITEMS.find(i => i.code === l.code);
          const mine = rows.filter(r => r.code === l.code);
          if (l.teams) { const t = l.teams.find(x => mine.some(r => r.jerseyTeam === x)); if (t) throw new Error(`The ${t} jersey was just taken. Please go back and choose again.`); }
          else if (mine.reduce((a, r) => a + r.qty, 0) + l.qty > it.slots) throw new Error(`"${it.name}" was just taken. Please go back and choose again.`);
        }
        const seq = (+localStorage.getItem(DEMO_KEY + "_seq") || 0) + 1;
        localStorage.setItem(DEMO_KEY + "_seq", seq);
        const receiptNo = "DEMO-CD-" + String(seq).padStart(4, "0");
        const out = [];
        lines.forEach(l => (l.teams ? l.teams.map(t => ({ ...l, qty: 1, amount: l.rate, jerseyTeam: t })) : [{ ...l, jerseyTeam: "" }]).forEach(x => out.push(x)));
        out.forEach(l => rows.push({ code: l.code, qty: l.qty, displayName: state.details.displayName, team: state.details.team, jerseyTeam: l.jerseyTeam, receiptNo }));
        saveDemoRows(rows);
        res = { ok: true, receiptNo, timestamp: new Date().toISOString(), status: "Pending Verification", total: cartTotal(), items: out };
      } else {
        const r = await fetch(C.API_URL, { method: "POST", body: JSON.stringify(payload) }); // text/plain → no CORS preflight
        res = await r.json();
      }
      if (!res.ok) throw new Error(res.error || "Submission failed");
      state.result = Object.assign(res, { data: payload.data });
      showDone();
    } catch (err) {
      $("#payError").textContent = err.message || String(err);
      if (/taken/i.test(err.message)) loadStatus();
    } finally {
      btn.disabled = false; btn.textContent = "Submit sponsorship";
    }
  }

  /* ---------------------------- step 4 ---------------------------- */
  async function showDone() {
    const r = state.result, d = r.data;
    const status = r.status || "Pending Verification";
    $("#pendingView").hidden = status !== "Pending Verification";
    $("#rejectedView").hidden = status !== "Rejected";
    $("#doneView").hidden = status !== "Confirmed";
    $$(".steps li")[3].lastChild.textContent = status === "Confirmed" ? "Receipt" : "Done";
    state.cart = {}; state.jersey = [];

    if (status === "Pending Verification") {
      $("#pendName").textContent = "Thank you, " + d.displayName + "!";
      $("#pendText").innerHTML = `Your sponsorship request of <b>${inr(r.total)}</b>, promoted by <b>${esc(d.team)}</b>, has been received and is <b>under approval</b>.`;
      $("#pendNo").textContent = $("#pendNo2").textContent = r.receiptNo;
      go(4); loadStatus(); return;
    }
    if (status === "Rejected") { $("#rejNo").textContent = r.receiptNo; go(4); loadStatus(); return; }

    $("#thanksName").textContent = "Thank you, " + d.displayName + "!";
    $("#thanksText").innerHTML = `Your sponsorship of <b>${inr(r.total)}</b> is <b>confirmed</b>. Download your official receipt and sponsor poster below.
      We warmly welcome you to <b>KNPL Season 7</b> at ${esc(C.EVENT.venue)}, ${esc(C.EVENT.datesShort)}.`;
    $("#receiptNo").textContent = r.receiptNo;
    const msg = `I'm proud to sponsor ${C.EVENT.tag} (${C.EVENT.league}) — "${C.EVENT.category}" category, promoted by ${d.team}. ${C.EVENT.datesShort} at ${C.EVENT.venue}. Sponsor here: ${location.origin + location.pathname}`;
    $("#shareWa").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    go(4);
    await window.KNPLPoster.draw($("#posterCanvas"), posterData());
    loadStatus();
  }

  // receipt and poster only for approved sponsorships
  const approved = () => state.result && state.result.status === "Confirmed";

  const posterData = () => ({ result: state.result, logo: state.logoPng, team: teamByName(state.result.data.team), cfg: C });

  async function downloadPoster() {
    const c = $("#posterCanvas");
    await window.KNPLPoster.draw(c, posterData());
    const a = document.createElement("a");
    a.download = `KNPL7-Sponsor-Poster-${state.result.receiptNo}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  /* ---------------------------- lookup ---------------------------- */
  async function lookup(receipt, mobile) {
    if (DEMO) throw new Error("Lookup works once the Google Sheet is connected.");
    const r = await fetch(`${C.API_URL}?action=lookup&receipt=${encodeURIComponent(receipt)}&mobile=${encodeURIComponent(mobile)}`);
    const res = await r.json();
    if (!res.ok) throw new Error(res.error);
    state.logoPng = res.logoData ? await toPng(res.logoData) : null;
    state.result = res;
    return res;
  }

  function openLookup(receipt, mobile) {
    const f = $("#lookupForm");
    $("#lookupError").textContent = "";
    if (receipt) f.receipt.value = receipt;
    if (mobile) f.mobile.value = String(mobile).replace(/^'/, "");
    $("#lookupDlg").showModal();
    (receipt ? f.mobile : f.receipt).focus();
  }

  /* ---------------------------- misc ---------------------------- */
  let tt;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 3800); }

  /* ---------------------------- events ---------------------------- */
  function bind() {
    document.addEventListener("click", e => {
      const q = e.target.closest(".qty button");
      if (q) {
        e.stopPropagation();
        const code = q.parentElement.dataset.qty, it = state.items.find(i => i.code === code);
        const n = (state.cart[code] || 0) + +q.dataset.d;
        if (n <= 0) delete state.cart[code]; else state.cart[code] = Math.min(n, it.slots - it.taken);
        render(); return;
      }
      if (e.target.closest("[data-jersey]")) { openJersey(); return; }
      const f = e.target.closest("[data-feature]");
      if (f) { toggle(f.dataset.feature); return; }
      const item = e.target.closest(".item:not(.full)");
      if (item && !e.target.closest(".sponsors")) { toggle(item.dataset.code); return; }
      const g = e.target.closest("[data-go]");
      if (g) { go(+g.dataset.go); return; }
      const cp = e.target.closest("[data-copy]");
      if (cp) { navigator.clipboard && navigator.clipboard.writeText(cp.dataset.copy); toast("Copied: " + cp.dataset.copy); }
    });
    document.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".item[role=button]")) { e.preventDefault(); toggle(e.target.dataset.code); }
    });
    $("#cartNext").addEventListener("click", () => go(2));

    $("#detailsForm").addEventListener("submit", e => {
      e.preventDefault();
      if (!validate(e.target)) { toast("Please fill the highlighted fields."); return; }
      const fd = Object.fromEntries(new FormData(e.target));
      delete fd.logo; delete fd.leaflet;
      state.details = fd;
      go(3);
    });
    $$("#detailsForm input, #payForm input, select").forEach(el => el.addEventListener("input", () => el.classList.remove("invalid")));

    bindFile($("[name=logo]"), "logo", C.MAX_LOGO_MB, async f => {
      const img = $("#logoPreview");
      state.logoPng = f ? await toPng(f.data) : null;
      if (f && !state.logoPng) toast("That logo couldn't be read for the poster; it will still be sent to KNPL.");
      img.hidden = !state.logoPng; if (state.logoPng) img.src = state.logoPng;
    });
    bindFile($("[name=leaflet]"), "leaflet", C.MAX_LEAFLET_MB, f => $("#leafletName").textContent = f ? f.name : "");
    bindFile($("[name=proof]"), "proof", C.MAX_PROOF_MB, f => $("#proofName").textContent = f ? f.name : "");

    $("[name=paymentMode]").addEventListener("change", e => {
      const v = e.target.value, inp = $("[name=txnRef]");
      const map = {
        "UPI": ["UPI transaction ID / UTR number", "12-digit UTR from your UPI app"],
        "Bank transfer (NEFT/IMPS/RTGS)": ["Bank UTR / reference number", "Reference from your bank"],
        "Cheque": ["Cheque number & bank", "e.g. 004512 · SBI"],
        "Cash to team coordinator": ["Cash handed to (name)", "Name of the coordinator who received it"]
      };
      $("#refLabel").innerHTML = map[v][0] + " <i>*</i>"; inp.placeholder = map[v][1];
    });
    $("#toggleQr").addEventListener("click", () => { state.showStaticQr = !state.showStaticQr; renderPay(); });

    $("#payForm").addEventListener("submit", e => {
      e.preventDefault();
      if (!cartLines().length) { go(1); return; }
      if (!validate(e.target)) { toast("Please complete the payment details."); return; }
      submitAll();
    });

    $("#dlReceipt").addEventListener("click", () => { if (approved()) window.KNPLReceipt.download(posterData()); });
    $("#dlPoster").addEventListener("click", () => { if (approved()) downloadPoster(); });
    const restart = () => {
      state.result = null; $("#payForm").reset(); $("#proofName").textContent = ""; state.files.proof = null;
      go(1);
    };
    ["#newSponsor", "#pendNew", "#rejBack"].forEach(id => $(id).addEventListener("click", restart));
    $("#pendCopy").addEventListener("click", () => {
      const no = state.result && state.result.receiptNo;
      if (no && navigator.clipboard) navigator.clipboard.writeText(no);
      toast("Request number copied: " + no);
    });
    $("#pendCheck").addEventListener("click", () => openLookup(state.result && state.result.receiptNo, state.result && state.result.data && state.result.data.mobile));

    const dlg = $("#lookupDlg");
    $("#openLookup").addEventListener("click", () => openLookup());
    $("#lookupForm").addEventListener("submit", async e => {
      if (e.submitter && e.submitter.value === "cancel") return;
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const b = $("#lookupBtn"); b.disabled = true; b.textContent = "Searching…";
      try {
        const res = await lookup(f.receipt.trim().toUpperCase(), f.mobile.trim());
        dlg.close();
        if (res.status === "Pending Verification") toast("Not approved yet — your request is still under approval.");
        showDone();
      }
      catch (err) { $("#lookupError").textContent = err.message; }
      finally { b.disabled = false; b.textContent = "Find"; }
    });
  }

  // ?pick=CD02 (from the status page) pre-selects that sponsorship once, if still available
  let pickDone = false;
  function applyPick() {
    if (pickDone) return; pickDone = true;
    const code = new URLSearchParams(location.search).get("pick");
    const it = code && state.items.find(i => i.code === code.toUpperCase());
    if (!it || it.taken >= it.slots) return;
    if (it.perTeam) { setTimeout(openJersey, 300); return; }
    state.cart[it.code] = 1;
    setTimeout(() => { const el = document.querySelector(`[data-code="${it.code}"]`) || $("#featuredCard"); el && el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300);
  }

  /* ---------------------------- start ---------------------------- */
  $("#demoBanner").hidden = !DEMO;
  initTeams();
  bind();
  render();
  loadStatus();
  // link from the approval e-mail / WhatsApp: ?receipt=KNPL7-CD-0001
  const rq = new URLSearchParams(location.search).get("receipt");
  if (rq) setTimeout(() => openLookup(rq.toUpperCase()), 400);
})();
