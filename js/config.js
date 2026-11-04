/* =====================================================================
   KNPL-7 "Cover Drive" Sponsorship Portal — CONFIGURATION
   Edit this file only. Everything else reads from here.
   ===================================================================== */
window.KNPL_CONFIG = {

  /* 1. Paste your Google Apps Script Web App URL here after deployment
        (ends with /exec). Leave empty to run the portal in DEMO mode —
        demo entries are stored only in your own browser. */
  API_URL: "   API_URL: "https://script.google.com/macros/s/AKfycbzhb0N02RyK_lLfsMxQCooY_BRN1MtGhnVCVc7Wn4w6RtdVdPc30k3QaJs4gzgSkEOF/exec",

  /* 2. Event details (printed on receipts and posters) */
  EVENT: {
    league: "Kerala Namboodiris Premier League",
    short: "KNPL",
    season: "Season 7",
    tag: "KNPL-7",
    dates: "11 · 12 · 13 · 14 February 2027",
    datesShort: "11–14 Feb 2027",
    venue: "FISAT & Boundary Cricket Grounds, Angamaly",
    category: "Cover Drive",
    organiser: "ONE (Organization For Namboodiris Evolution)",
    regNo: "238/IV/24",
    tagline: "Making the impossible a reality."
  },

  /* 3. Payment details (from the brochure) */
  PAYMENT: {
    bank: "Canara Bank",
    accountName: "ONE (Organization For Namboodiris Evolution)",
    accountNo: "120040460298",
    ifsc: "CNRB0007457",
    branch: "PATTIKKAD",
    upiId: "339980003460298@cnrb",
    upiName: "ONE ORGANIZATION FOR NAMBOODIRIS EVOLUT",
    merchantCode: "8398",
    /* true  = show a QR / "Pay by UPI app" link with the exact amount pre-filled
       false = show only the official static QR from the brochure            */
    dynamicUpi: true
  },

  /* 4. Sponsorship tariff — must match ITEMS in apps-script/Code.gs.
        (When the backend is connected, the server's list is used.) */
  ITEMS: [
    { code: "CD01", name: "KNPL Champions Everolling Trophy", slots: 1,  rate: 150000, flagship: true, note: "1 slot · 15 years" },
    { code: "CD02", name: "KNPL-7 Winners Sponsor",            slots: 1,  rate: 50000,  flagship: true },
    { code: "CD03", name: "KNPL-7 Runners-Up Sponsor",         slots: 1,  rate: 30000,  flagship: true },
    { code: "CD04", name: "KNPL-7 Sahayog Sponsor",            slots: 2,  rate: 25000,  csr: "sahayog" },
    { code: "CD05", name: "KNPL-7 Farmrise Sponsor",           slots: 2,  rate: 15000,  csr: "farmrise" },
    { code: "CD06", name: "KNPL-7 \"Bronze Brigade\" Award - 1", slots: 1, rate: 15000 },
    { code: "CD07", name: "KNPL Team Jersey Sponsor",          slots: 16, rate: 7500 },
    { code: "CD08", name: "KNPL-7 Lunch Sponsor",              slots: 20, rate: 5000 },
    { code: "CD09", name: "KNPL-7 Fair Play Award Sponsor",    slots: 1,  rate: 5000 },
    { code: "CD10", name: "KNPL-7 Star of the League Sponsor", slots: 1,  rate: 5000 },
    { code: "CD11", name: "KNPL-7 Emerging Player Sponsor",    slots: 1,  rate: 4000 },
    { code: "CD12", name: "KNPL-7 Best Batter Sponsor",        slots: 1,  rate: 4000 },
    { code: "CD13", name: "KNPL-7 Best Bowler Sponsor",        slots: 1,  rate: 4000 },
    { code: "CD14", name: "KNPL-7 Best Keeper Sponsor",        slots: 1,  rate: 4000 },
    { code: "CD15", name: "KNPL-7 Best Fielder Sponsor",       slots: 1,  rate: 4000 },
    { code: "CD16", name: "KNPL-7 Best Captain Sponsor",       slots: 1,  rate: 4000 }
  ],

  /* 5. Promoter teams (franchises) — logo files are in assets/teams/ */
  TEAMS: [
    { name: "Devils Of Chitrakoot",       owner: "Balamurali E",       logo: "assets/teams/t01.png" },
    { name: "Ayodhya Warriors",           owner: "Deepu M",            logo: "assets/teams/t02.png" },
    { name: "Spartans Of Nalanda",        owner: "Dileep Mampally",    logo: "assets/teams/t03.png" },
    { name: "Mighty Mithilas",            owner: "Hareesh Govind",     logo: "assets/teams/t04.png" },
    { name: "Kalinga United",             owner: "Hareesh Kumar G N",  logo: "assets/teams/t05.png" },
    { name: "Kurukshetra Yodhas",         owner: "Hari Govind N",      logo: "assets/teams/t06.png" },
    { name: "Jaguars Of Jhansi",          owner: "Hari T R",           logo: "assets/teams/t07.png" },
    { name: "Knights Of Kanchi",          owner: "Haridas CMP",        logo: "assets/teams/t08.png" },
    { name: "Kombans Of Pataleeputhra",   owner: "Ivish Kumar",        logo: "assets/teams/t09.png" },
    { name: "Kaaliyanz Of Dwaraka",       owner: "Jithin Narayanan",   logo: "assets/teams/t10.png" },
    { name: "Madhura Mavericks",          owner: "Krishnadas M N",     logo: "assets/teams/t11.png" },
    { name: "Panchaala Panthers",         owner: "Midhun Panthavoor",  logo: "assets/teams/t12.png" },
    { name: "Gandhara Giants",            owner: "Nikhil S",           logo: "assets/teams/t13.png" },
    { name: "Vamos Vrindavan",            owner: "Praveen Kumar M",    logo: "assets/teams/t14.png" },
    { name: "Guardians Of Kamboja",       owner: "Sunil Narayanan",    logo: "assets/teams/t15.png" },
    { name: "Varahas Of Vijayanagara",    owner: "Umesh Krishna",      logo: "assets/teams/t16.png" }
  ],

  /* 6. Upload limits (Apps Script handles up to ~10 MB comfortably) */
  MAX_LOGO_MB: 5,
  MAX_LEAFLET_MB: 8,
  MAX_PROOF_MB: 5
};
