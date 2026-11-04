# KNPL-7 "Cover Drive" Sponsorship Portal

A sponsorship collection website for **KNPL Season 7** (11–14 February 2027, FISAT & Boundary Cricket Grounds, Angamaly).

Sponsors can:
1. **Choose** one or more "Cover Drive" sponsorships (live slot status — taken slots show the sponsor and the promoting team)
2. **Enter details** — promoter team, sponsor name, name to advertise, contact, logo & leaflet uploads
3. **Pay** — UPI QR with the exact amount pre-filled, "Pay with UPI app" button on phones, or bank transfer details
4. **Download** an auto-generated **PDF receipt** (with thank-you & welcome note) and a **sponsor poster** (1080×1350 PNG, Instagram/WhatsApp ready)

Everything is saved to a **Google Sheet** (one row per sponsorship) and uploaded files go to a **Google Drive folder**.

```
index.html            ← the website
css/style.css
js/config.js          ← THE ONLY FILE YOU NEED TO EDIT (API URL, tariff, teams, bank details)
js/app.js             ← form logic
js/poster.js          ← poster generator
js/receipt.js         ← PDF receipt generator
js/vendor/            ← pdf-lib + QR library (bundled, no CDN needed)
assets/               ← KNPL, ONE, Sahayog, Farmrise, team logos, trophy, UPI QR
apps-script/Code.gs   ← Google Apps Script backend (paste into the Sheet)
```

---

## Part A — Google Sheet + Apps Script (15 minutes)

1. Open **Google Sheets** with the KNPL account → create a blank sheet, name it **KNPL-7 Cover Drive Sponsorships**.
2. Menu **Extensions ▸ Apps Script**. Delete the sample code, paste the entire contents of `apps-script/Code.gs`, click **Save**.
3. (Optional) At the top of the script, set `ADMIN_EMAILS: 'you@gmail.com,core2@gmail.com'` to get an e-mail for every new sponsorship.
4. In the function dropdown choose **setup** → **Run**. Approve the permissions (Advanced ▸ Go to project ▸ Allow).
   This creates the **Sponsorships** sheet, a **Summary** sheet with live totals, and a Drive folder **KNPL-7 Cover Drive Sponsor Uploads**.
5. **Deploy ▸ New deployment** → type **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (ends with `/exec`).
6. Test it: open the URL in a browser — you should see `{"ok":true,"items":[…]}`.

> **Changing the script later:** Deploy ▸ Manage deployments ▸ ✏️ Edit ▸ Version: **New version** ▸ Deploy. This keeps the same URL.

## Part B — Connect the website

Open `js/config.js` and paste the URL:

```js
API_URL: "https://script.google.com/macros/s/AKfy...../exec",
```

Until this is filled, the site runs in **demo mode** (a yellow banner says so; entries stay in that browser only).

## Part C — Publish on GitHub Pages (10 minutes)

1. Sign in at **github.com** → **New repository** → name `knpl7-cover-drive` → **Public** → Create.
2. Click **uploading an existing file**, drag in **everything inside this folder** (index.html, css, js, assets, apps-script, .nojekyll, README.md) → **Commit changes**.
3. Repository **Settings ▸ Pages** → Source: **Deploy from a branch** → Branch: **main** / **(root)** → Save.
4. After about a minute the site is live at `https://YOUR-USERNAME.github.io/knpl7-cover-drive/`

## Promoter links (one per franchise)

Each franchise owner can share a personal link — the promoter team is pre-selected and a "You were invited by …" banner is shown:

| # | Team | Owner | Link |
|---|------|-------|------|
| 1 | Devils Of Chitrakoot | Balamurali E | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=1` |
| 2 | Ayodhya Warriors | Deepu M | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=2` |
| 3 | Spartans Of Nalanda | Dileep Mampally | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=3` |
| 4 | Mighty Mithilas | Hareesh Govind | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=4` |
| 5 | Kalinga United | Hareesh Kumar G N | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=5` |
| 6 | Kurukshetra Yodhas | Hari Govind N | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=6` |
| 7 | Jaguars Of Jhansi | Hari T R | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=7` |
| 8 | Knights Of Kanchi | Haridas CMP | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=8` |
| 9 | Kombans Of Pataleeputhra | Ivish Kumar | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=9` |
| 10 | Kaaliyanz Of Dwaraka | Jithin Narayanan | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=10` |
| 11 | Madhura Mavericks | Krishnadas M N | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=11` |
| 12 | Panchaala Panthers | Midhun Panthavoor | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=12` |
| 13 | Gandhara Giants | Nikhil S | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=13` |
| 14 | Vamos Vrindavan | Praveen Kumar M | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=14` |
| 15 | Guardians Of Kamboja | Sunil Narayanan | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=15` |
| 16 | Varahas Of Vijayanagara | Umesh Krishna | `https://YOUR-USERNAME.github.io/knpl7-cover-drive/?team=16` |

## Running the drive (admin)

- New entries arrive with Status **Pending Verification**. The slot is reserved immediately (no double-booking — the script locks while checking availability).
- Check the bank/UPI statement against the **Transaction Ref / UTR** column and change Status to **Confirmed**.
- Set Status to **Rejected** for a payment that never arrived — the slot opens up again on the website.
- On the website, sponsored slots show the advertised name and promoter team; unverified ones carry a small "verifying" tag.
- The **Summary** sheet shows booked / confirmed / available slots and the confirmed amount per sponsorship.
- Logos, leaflets and payment screenshots are linked in each row (Drive folder).
- Sponsors can re-download their receipt and poster any time via **"Already sponsored?"** at the bottom of the page (receipt no. + mobile).
- The same transaction reference cannot be used twice.

## Editing

- **Prices / slots:** change both `js/config.js` (ITEMS) and `apps-script/Code.gs` (ITEMS), then redeploy the script (new version). The server's numbers always win, so nobody can change a price in the browser.
- **UPI:** `dynamicUpi: true` pre-fills the amount in the QR. Please do a ₹1 test payment from GPay/PhonePe/Paytm before launch. If a UPI app rejects it, set `dynamicUpi: false` to use the official brochure QR.
- **Sponsor e-mail:** `SEND_SPONSOR_EMAIL` in Code.gs (Gmail allows ~100 mails/day on a free account).

## Notes

- Payment is not auto-verified (that needs a payment gateway account such as Razorpay with KYC). The receipt is marked *"Received – subject to verification"* until you confirm.
- Uploads: logo ≤ 5 MB, leaflet ≤ 8 MB, payment screenshot ≤ 5 MB.
- Third-party code: pdf-lib (MIT), QRCode for JavaScript © Kazuhiko Arase (MIT).
