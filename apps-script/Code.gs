/**
 * KNPL-7 "Cover Drive" Sponsorship Portal — Google Apps Script backend
 * -------------------------------------------------------------------
 * Paste this file into Extensions ▸ Apps Script of the Google Sheet
 * that will hold the sponsorship register, run setup() once, then
 * Deploy ▸ New deployment ▸ Web app (Execute as: Me, Access: Anyone).
 * See README.md for the full step-by-step guide.
 */

/* ============================ SETTINGS ============================ */
const SETTINGS = {
  SHEET_NAME: 'Sponsorships',
  SUMMARY_SHEET: 'Summary',
  UPLOAD_FOLDER_NAME: 'KNPL-7 Cover Drive Sponsor Uploads',
  RECEIPT_PREFIX: 'KNPL7-CD-',

  // Status given to every new entry. Change the Status cell in the sheet to
  // "Confirmed" after you see the money in the bank, or "Rejected" to free the slot.
  DEFAULT_STATUS: 'Pending Verification',
  STATUSES: ['Pending Verification', 'Confirmed', 'Rejected'],
  FREE_SLOT_STATUSES: ['Rejected'],          // these rows do NOT block a slot

  // E-mails
  SEND_SPONSOR_EMAIL: true,                  // acknowledgement mail to the sponsor
  ADMIN_EMAILS: '',                          // e.g. 'core1@gmail.com,core2@gmail.com'
  EVENT_LINE: 'KNPL Season 7 · 11–14 February 2027 · FISAT & Boundary Cricket Grounds, Angamaly',

  MAX_FILE_BYTES: 10 * 1024 * 1024
};

/* Tariff — keep in sync with js/config.js */
const ITEMS = [
  { code: 'CD01', name: 'KNPL Champions Everolling Trophy',   slots: 1,  rate: 150000 },
  { code: 'CD02', name: 'KNPL-7 Winners Sponsor',             slots: 1,  rate: 50000 },
  { code: 'CD03', name: 'KNPL-7 Runners-Up Sponsor',          slots: 1,  rate: 30000 },
  { code: 'CD04', name: 'KNPL-7 Sahayog Sponsor',             slots: 2,  rate: 25000 },
  { code: 'CD05', name: 'KNPL-7 Farmrise Sponsor',            slots: 2,  rate: 15000 },
  { code: 'CD06', name: 'KNPL-7 "Bronze Brigade" Award - 1',  slots: 1,  rate: 15000 },
  { code: 'CD07', name: 'KNPL Team Jersey Sponsor',           slots: 16, rate: 7500, perTeam: true },
  { code: 'CD08', name: 'KNPL-7 Lunch Sponsor',               slots: 20, rate: 5000 },
  { code: 'CD09', name: 'KNPL-7 Fair Play Award Sponsor',     slots: 1,  rate: 5000 },
  { code: 'CD10', name: 'KNPL-7 Star of the League Sponsor',  slots: 1,  rate: 5000 },
  { code: 'CD11', name: 'KNPL-7 Emerging Player Sponsor',     slots: 1,  rate: 4000 },
  { code: 'CD12', name: 'KNPL-7 Best Batter Sponsor',         slots: 1,  rate: 4000 },
  { code: 'CD13', name: 'KNPL-7 Best Bowler Sponsor',         slots: 1,  rate: 4000 },
  { code: 'CD14', name: 'KNPL-7 Best Keeper Sponsor',         slots: 1,  rate: 4000 },
  { code: 'CD15', name: 'KNPL-7 Best Fielder Sponsor',        slots: 1,  rate: 4000 },
  { code: 'CD16', name: 'KNPL-7 Best Captain Sponsor',        slots: 1,  rate: 4000 }
];

const TEAMS = [
  'Devils Of Chitrakoot', 'Ayodhya Warriors', 'Spartans Of Nalanda', 'Mighty Mithilas',
  'Kalinga United', 'Kurukshetra Yodhas', 'Jaguars Of Jhansi', 'Knights Of Kanchi',
  'Kombans Of Pataleeputhra', 'Kaaliyanz Of Dwaraka', 'Madhura Mavericks', 'Panchaala Panthers',
  'Gandhara Giants', 'Vamos Vrindavan', 'Guardians Of Kamboja', 'Varahas Of Vijayanagara'
];

const HEADERS = [
  'Timestamp', 'Receipt No', 'Status', 'Item Code', 'Sponsorship', 'Qty', 'Rate (Rs)', 'Amount (Rs)',
  'Receipt Total (Rs)', 'Sponsor / Company Name', 'Name to Advertise', 'Contact Person', 'Mobile',
  'Email', 'City / Address', 'Social Media Handles', 'Promoter Team', 'Payment Mode',
  'Transaction Ref / UTR', 'Payment Date', 'Logo URL', 'Leaflet URL', 'Payment Proof URL',
  'Message / Notes', 'Logo File ID', 'Jersey Team'
];
const COL = {}; HEADERS.forEach((h, i) => COL[h] = i);

/* ============================ ONE-TIME SETUP ============================ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SETTINGS.SHEET_NAME, 0);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#0d1b33').setFontColor('#e9b949');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, HEADERS.length, 150);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(SETTINGS.STATUSES, true).build();
  sh.getRange(2, COL['Status'] + 1, 2000, 1).setDataValidation(rule);

  // Conditional colours for status
  const statusRange = sh.getRange(2, COL['Status'] + 1, 2000, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Confirmed').setBackground('#d9f2d9').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Pending Verification').setBackground('#fff2cc').setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Rejected').setBackground('#f4cccc').setRanges([statusRange]).build()
  ]);

  // Summary sheet with live formulas
  let sm = ss.getSheetByName(SETTINGS.SUMMARY_SHEET);
  if (!sm) sm = ss.insertSheet(SETTINGS.SUMMARY_SHEET);
  sm.clear();
  sm.getRange(1, 1, 1, 8).setValues([[
    'Code', 'Sponsorship', 'Slots', 'Rate (Rs)', 'Booked (incl. pending)', 'Confirmed', 'Available', 'Confirmed Amount (Rs)'
  ]]).setFontWeight('bold').setBackground('#0d1b33').setFontColor('#e9b949');
  const S = "'" + SETTINGS.SHEET_NAME + "'!";
  const codeCol = S + colLetter_(COL['Item Code'] + 1) + ':' + colLetter_(COL['Item Code'] + 1);
  const qtyCol = S + colLetter_(COL['Qty'] + 1) + ':' + colLetter_(COL['Qty'] + 1);
  const stCol = S + colLetter_(COL['Status'] + 1) + ':' + colLetter_(COL['Status'] + 1);
  const amtCol = S + colLetter_(COL['Amount (Rs)'] + 1) + ':' + colLetter_(COL['Amount (Rs)'] + 1);
  ITEMS.forEach((it, i) => {
    const r = i + 2;
    sm.getRange(r, 1, 1, 8).setValues([[
      it.code, it.name, it.slots, it.rate,
      `=SUMIFS(${qtyCol},${codeCol},A${r},${stCol},"<>Rejected")`,
      `=SUMIFS(${qtyCol},${codeCol},A${r},${stCol},"Confirmed")`,
      `=C${r}-E${r}`,
      `=SUMIFS(${amtCol},${codeCol},A${r},${stCol},"Confirmed")`
    ]]);
  });
  const last = ITEMS.length + 2;
  sm.getRange(last, 2).setValue('TOTAL').setFontWeight('bold');
  sm.getRange(last, 3).setFormula(`=SUM(C2:C${last - 1})`);
  sm.getRange(last, 5, 1, 4).setFormulas([[
    `=SUM(E2:E${last - 1})`, `=SUM(F2:F${last - 1})`, `=SUM(G2:G${last - 1})`, `=SUM(H2:H${last - 1})`
  ]]);
  sm.setColumnWidth(2, 300);

  // Upload folder
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('FOLDER_ID')) {
    const folder = DriveApp.createFolder(SETTINGS.UPLOAD_FOLDER_NAME);
    props.setProperty('FOLDER_ID', folder.getId());
  }
  if (!props.getProperty('RECEIPT_SEQ')) props.setProperty('RECEIPT_SEQ', '0');
  Logger.log('Setup complete. Upload folder: ' + DriveApp.getFolderById(props.getProperty('FOLDER_ID')).getUrl());
}

/* ============================ WEB ENDPOINTS ============================ */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.action === 'lookup') return json_(lookup_(p.receipt, p.mobile));
    return json_(status_());
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'submit') throw new Error('Unknown action');
    lock.waitLock(30000);
    return json_(submit_(body));
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ============================ CORE LOGIC ============================ */
function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS.SHEET_NAME);
  if (!sh) throw new Error('Run setup() first.');
  return sh;
}

function rows_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HEADERS.length).getValues();
}

function isActive_(row) {
  return SETTINGS.FREE_SLOT_STATUSES.indexOf(String(row[COL['Status']])) === -1;
}

function status_() {
  const rows = rows_();
  const items = ITEMS.map(it => {
    const sponsors = [];
    let taken = 0;
    rows.forEach(r => {
      if (r[COL['Item Code']] !== it.code || !isActive_(r)) return;
      const q = Number(r[COL['Qty']]) || 1;
      taken += q;
      sponsors.push({
        name: String(r[COL['Name to Advertise']] || r[COL['Sponsor / Company Name']]),
        team: String(r[COL['Promoter Team']]),
        jerseyTeam: String(r[COL['Jersey Team']] || ''),
        qty: q,
        confirmed: r[COL['Status']] === 'Confirmed'
      });
    });
    return Object.assign({}, it, { taken: taken, sponsors: sponsors });
  });
  return { ok: true, items: items, updated: new Date().toISOString() };
}

function submit_(body) {
  const d = body.data || {};
  const req = ['sponsorName', 'displayName', 'contactPerson', 'mobile', 'team', 'paymentMode', 'txnRef'];
  req.forEach(k => { if (!String(d[k] || '').trim()) throw new Error('Missing field: ' + k); });
  if (TEAMS.indexOf(d.team) === -1) throw new Error('Invalid promoter team');
  if (!/^[+0-9 \-]{8,16}$/.test(String(d.mobile))) throw new Error('Invalid mobile number');
  if (!Array.isArray(d.items) || !d.items.length) throw new Error('No sponsorship selected');

  // Availability check (under lock) + duplicate UTR check
  const rows = rows_();
  const ref = String(d.txnRef).trim().toUpperCase();
  rows.forEach(r => {
    if (isActive_(r) && String(r[COL['Transaction Ref / UTR']]).replace(/^'/, '').trim().toUpperCase() === ref)
      throw new Error('This transaction reference has already been used for receipt ' + r[COL['Receipt No']] + '.');
  });

  let total = 0;
  const lines = [];
  d.items.forEach(sel => {
    const it = ITEMS.filter(x => x.code === sel.code)[0];
    if (!it) throw new Error('Unknown sponsorship ' + sel.code);
    const active = rows.filter(r => r[COL['Item Code']] === it.code && isActive_(r));
    if (it.perTeam) {
      const teams = Array.isArray(sel.teams) ? sel.teams.filter((t, i, a) => a.indexOf(t) === i) : [];
      if (!teams.length) throw new Error('Please choose the team(s) for "' + it.name + '".');
      const takenTeams = active.map(r => String(r[COL['Jersey Team']]));
      teams.forEach(t => {
        if (TEAMS.indexOf(t) === -1) throw new Error('Invalid jersey team: ' + t);
        if (takenTeams.indexOf(t) !== -1) throw new Error('Sorry, the ' + t + ' jersey was just sponsored by someone else. Please refresh and choose again.');
      });
      teams.forEach(t => { total += it.rate; lines.push({ it: it, qty: 1, amount: it.rate, jerseyTeam: t }); });
      return;
    }
    const qty = Math.max(1, Math.floor(Number(sel.qty) || 1));
    const taken = active.reduce((a, r) => a + (Number(r[COL['Qty']]) || 1), 0);
    if (taken + qty > it.slots) {
      throw new Error('Sorry, "' + it.name + '" was just taken' +
        (it.slots - taken > 0 ? ' — only ' + (it.slots - taken) + ' slot(s) left.' : '.') +
        ' Please refresh and choose again.');
    }
    total += qty * it.rate;
    lines.push({ it: it, qty: qty, amount: qty * it.rate, jerseyTeam: '' });
  });

  // Files
  const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  const props = PropertiesService.getScriptProperties();
  const seq = Number(props.getProperty('RECEIPT_SEQ') || 0) + 1;
  props.setProperty('RECEIPT_SEQ', String(seq));
  const receiptNo = SETTINGS.RECEIPT_PREFIX + ('0000' + seq).slice(-4);
  const files = body.files || {};
  const safe = String(d.sponsorName).replace(/[^\w\- ]+/g, '').slice(0, 40);
  const logo = saveFile_(folder, files.logo, receiptNo + ' - ' + safe + ' - LOGO');
  const leaflet = saveFile_(folder, files.leaflet, receiptNo + ' - ' + safe + ' - LEAFLET');
  const proof = saveFile_(folder, files.proof, receiptNo + ' - ' + safe + ' - PAYMENT');

  const now = new Date();
  const out = lines.map(l => {
    const row = new Array(HEADERS.length).fill('');
    row[COL['Timestamp']] = now;
    row[COL['Receipt No']] = receiptNo;
    row[COL['Status']] = SETTINGS.DEFAULT_STATUS;
    row[COL['Item Code']] = l.it.code;
    row[COL['Sponsorship']] = l.it.name;
    row[COL['Qty']] = l.qty;
    row[COL['Rate (Rs)']] = l.it.rate;
    row[COL['Amount (Rs)']] = l.amount;
    row[COL['Receipt Total (Rs)']] = total;
    row[COL['Sponsor / Company Name']] = clean_(d.sponsorName);
    row[COL['Name to Advertise']] = clean_(d.displayName);
    row[COL['Contact Person']] = clean_(d.contactPerson);
    row[COL['Mobile']] = "'" + clean_(d.mobile);
    row[COL['Email']] = clean_(d.email);
    row[COL['City / Address']] = clean_(d.city);
    row[COL['Social Media Handles']] = clean_(d.social);
    row[COL['Promoter Team']] = d.team;
    row[COL['Payment Mode']] = clean_(d.paymentMode);
    row[COL['Transaction Ref / UTR']] = "'" + clean_(d.txnRef);
    row[COL['Payment Date']] = clean_(d.paymentDate);
    row[COL['Logo URL']] = logo ? logo.getUrl() : '';
    row[COL['Leaflet URL']] = leaflet ? leaflet.getUrl() : '';
    row[COL['Payment Proof URL']] = proof ? proof.getUrl() : '';
    row[COL['Message / Notes']] = clean_(d.notes);
    row[COL['Logo File ID']] = logo ? logo.getId() : '';
    row[COL['Jersey Team']] = l.jerseyTeam;
    return row;
  });
  const sh = sheet_();
  sh.getRange(sh.getLastRow() + 1, 1, out.length, HEADERS.length).setValues(out);
  SpreadsheetApp.flush();

  const result = {
    ok: true,
    receiptNo: receiptNo,
    timestamp: now.toISOString(),
    status: SETTINGS.DEFAULT_STATUS,
    total: total,
    items: lines.map(l => ({ code: l.it.code, name: l.it.name, qty: l.qty, rate: l.it.rate, amount: l.amount, jerseyTeam: l.jerseyTeam }))
  };
  try { sendMails_(d, result); } catch (err) { Logger.log('Mail failed: ' + err); }
  return result;
}

function lookup_(receipt, mobile) {
  receipt = String(receipt || '').trim().toUpperCase();
  const digits = s => String(s || '').replace(/\D/g, '').slice(-10);
  const rows = rows_().filter(r => String(r[COL['Receipt No']]).toUpperCase() === receipt);
  if (!rows.length || digits(rows[0][COL['Mobile']]) !== digits(mobile))
    return { ok: false, error: 'No sponsorship found for that receipt number and mobile number.' };
  const r0 = rows[0];
  let logoData = '';
  const fid = r0[COL['Logo File ID']];
  if (fid) {
    try {
      const blob = DriveApp.getFileById(fid).getBlob();
      if (blob.getBytes().length < 4 * 1024 * 1024)
        logoData = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (_) {}
  }
  return {
    ok: true,
    receiptNo: r0[COL['Receipt No']],
    timestamp: new Date(r0[COL['Timestamp']]).toISOString(),
    status: rows.some(r => r[COL['Status']] === 'Rejected') ? 'Rejected'
      : rows.every(r => r[COL['Status']] === 'Confirmed') ? 'Confirmed' : 'Pending Verification',
    total: Number(r0[COL['Receipt Total (Rs)']]),
    items: rows.map(r => ({
      code: r[COL['Item Code']], name: r[COL['Sponsorship']], qty: Number(r[COL['Qty']]),
      rate: Number(r[COL['Rate (Rs)']]), amount: Number(r[COL['Amount (Rs)']]),
      jerseyTeam: String(r[COL['Jersey Team']] || '')
    })),
    data: {
      sponsorName: r0[COL['Sponsor / Company Name']], displayName: r0[COL['Name to Advertise']],
      contactPerson: r0[COL['Contact Person']], mobile: String(r0[COL['Mobile']]),
      email: r0[COL['Email']], city: r0[COL['City / Address']], team: r0[COL['Promoter Team']],
      paymentMode: r0[COL['Payment Mode']], txnRef: String(r0[COL['Transaction Ref / UTR']]),
      paymentDate: r0[COL['Payment Date']]
    },
    logoData: logoData
  };
}

/* ============================ HELPERS ============================ */
function saveFile_(folder, f, name) {
  if (!f || !f.data) return null;
  const bytes = Utilities.base64Decode(String(f.data).split(',').pop());
  if (bytes.length > SETTINGS.MAX_FILE_BYTES) throw new Error('File too large: ' + f.name);
  const ext = (String(f.name || '').match(/\.[a-z0-9]+$/i) || [''])[0];
  const file = folder.createFile(Utilities.newBlob(bytes, f.type || 'application/octet-stream', name + ext));
  return file;
}

function clean_(v) {
  v = String(v == null ? '' : v).trim().slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;   // stop formula injection
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function inr_(n) { return 'Rs. ' + Number(n).toLocaleString('en-IN'); }

function sendMails_(d, res) {
  const list = res.items.map(i => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${i.name}${i.jerseyTeam ? ' — ' + i.jerseyTeam : ''}${i.qty > 1 ? ' × ' + i.qty : ''}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${inr_(i.amount)}</td></tr>`).join('');
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1a2238">
      <h2 style="color:#0d1b33;margin-bottom:4px">Thank you for sponsoring KNPL Season 7!</h2>
      <p style="margin-top:0;color:#8a6d1d"><b>"Cover Drive" Category · Receipt ${res.receiptNo}</b></p>
      <p>Dear ${d.contactPerson},</p>
      <p>We have received your sponsorship details on behalf of <b>${d.displayName}</b>, promoted by
      <b>${d.team}</b>. Your payment (ref. ${d.txnRef}) will be verified by the KNPL Core Group.</p>
      <table style="border-collapse:collapse;width:100%">${list}
        <tr><td style="padding:8px 10px"><b>Total</b></td><td style="padding:8px 10px;text-align:right"><b>${inr_(res.total)}</b></td></tr></table>
      <p>We warmly welcome you to the event:<br><b>${SETTINGS.EVENT_LINE}</b></p>
      <p>You can re-download your receipt and sponsor poster any time from the sponsorship portal using
      your receipt number and mobile number.</p>
      <p>With gratitude,<br>KNPL Core Group<br>ONE (Organization For Namboodiris Evolution) · Reg. No. 238/IV/24</p>
    </div>`;
  if (SETTINGS.SEND_SPONSOR_EMAIL && d.email && /@/.test(d.email)) {
    MailApp.sendEmail({ to: d.email, subject: 'KNPL-7 Sponsorship Acknowledgement · ' + res.receiptNo, htmlBody: html, name: 'KNPL Season 7' });
  }
  if (SETTINGS.ADMIN_EMAILS) {
    MailApp.sendEmail({
      to: SETTINGS.ADMIN_EMAILS,
      subject: `New KNPL-7 sponsorship ${res.receiptNo}: ${d.displayName} (${inr_(res.total)}) via ${d.team}`,
      htmlBody: html + `<p>Mobile: ${d.mobile}<br>Payment: ${d.paymentMode} / ${d.txnRef}<br>` +
        `<a href="${SpreadsheetApp.getActiveSpreadsheet().getUrl()}">Open the register</a></p>`,
      name: 'KNPL-7 Sponsorship Portal'
    });
  }
}
