<?php /* Sales Reporter — main page. All logic lives in assets/js/app.js */ ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0F2D5C">
  <link rel="manifest" href="manifest.json">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Sales Reporter">
  <link rel="apple-touch-icon" href="https://gajananhs.github.io/salesreport/assets/icons/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="https://gajananhs.github.io/salesreport/assets/icons/favicon-32.png">
  <title>Sales Reporter</title>
  <link rel="stylesheet" href="assets/css/style.css?v=<?php echo filemtime(__DIR__ . '/assets/css/style.css'); ?>">
  <!-- Blue Meridian theme (embedded so no extra files are needed) -->
  <style>
/* Self-hosted fonts (SIL Open Font License — see assets/fonts/OFL-*.txt).
   latin + latin-ext subsets; latin-ext carries the ₹ sign. */
@font-face{font-family:'Fraunces';font-style:normal;font-weight:500;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/fraunces-latin-ext-500-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:500;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/fraunces-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/fraunces-latin-ext-600-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/fraunces-latin-600-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:700;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/fraunces-latin-ext-700-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Fraunces';font-style:normal;font-weight:700;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/fraunces-latin-700-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}

@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-ext-400-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-400-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:500;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-ext-500-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:500;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:600;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-ext-600-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:600;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-600-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:700;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-ext-700-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:700;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-sans-latin-700-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}

@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:500;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-mono-latin-ext-500-normal.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:500;font-display:swap;src:url(https://gajananhs.github.io/salesreport/assets/fonts/ibm-plex-mono-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}

/* =====================================================================
   Sales Reporter — blue Meridian theme
   Layered over the original assets/css/style.css (left unchanged) so
   every original screen, class and behaviour keeps working.
   Palette: navy + amber + cool white. Type: Fraunces / IBM Plex.
   Layout:  <600px   bottom tab bar (scrolls sideways if needed)
            600-1023 icon rail on the left
            >=1024   full sidebar
   ===================================================================== */

:root{
  /* Meridian tokens (blue) */
  --ink:#1A2433; --cream:#F6F8FC; --panel:#FFFFFF; --page:#E6EBF3;
  --deep:#0F2D5C; --deep-2:#1B4688; --slate:#687D99; --slate-ink:#2E4A70; --slate-soft:#E2E9F4;
  --amber:#D9A22C; --amber-ink:#8A6417; --amber-soft:#F6E7C4;
  --line:#E2E7EF; --red:#B85450; --red-soft:#F4DEDD; --ok:#2F7A4F; --ok-soft:#DFF1E6;
  --font-display:'Fraunces', Georgia, 'Times New Roman', serif;
  --font-text:'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono:'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --rail-w:84px; --sidebar-w:248px;

  /* remap the original variables so every original rule turns blue */
  --primary:var(--deep-2);
  --primary-dark:var(--deep);
  --bg:var(--panel);
  --surface:var(--panel);
  --text:var(--ink);
  --muted:var(--slate);
  --border:var(--line);
  --success:var(--ok);
  --error:var(--red);
  --radius:14px;
}

html, body{font-family:var(--font-text); background:var(--panel); color:var(--ink);}
body{font-size:14px; line-height:1.4;}
h1, h2, h3, h4, h5, .section-title, .modal-header h3, .aef-header h2{font-family:var(--font-display); font-weight:600; letter-spacing:0;}
input, select, textarea, button{font-family:var(--font-text);}

/* ---------- auth ---------- */
.auth-view{background:radial-gradient(1200px 600px at 10% -10%, #24569f 0%, transparent 60%), linear-gradient(135deg, var(--deep) 0%, var(--deep-2) 100%);}
.auth-card{border-radius:22px; box-shadow:0 24px 60px rgba(15,45,92,.35); border:1px solid rgba(255,255,255,.4);}
.logo-circle{background:linear-gradient(135deg, var(--deep), var(--deep-2)); color:var(--amber); font-family:var(--font-display); font-weight:600; border-radius:16px; position:relative; overflow:hidden;}
.logo-circle::after{content:""; position:absolute; right:-14px; top:-14px; width:40px; height:40px; border-radius:50%; border:1px solid rgba(217,162,44,.45);}
.auth-card h1{font-size:1.6rem;}

/* ---------- forms ---------- */
label{color:var(--ink); font-weight:500;}
input, select, textarea{background:var(--cream); border-color:var(--line); border-radius:9px; color:var(--ink);}
input:focus, select:focus, textarea:focus{outline:none; border-color:var(--deep-2); box-shadow:0 0 0 3px rgba(27,70,136,.15);}
.chip{background:var(--cream); color:var(--ink); border-color:var(--line); font-weight:500; font-size:.82rem; padding:8px 13px;}
.chip.active{background:var(--deep); border-color:var(--deep); color:var(--cream);}
.btn-primary{background:var(--deep); border-radius:10px; font-weight:600; font-size:.95rem;}
.btn-primary:hover{background:var(--deep-2);}
.btn-primary:active{background:var(--deep-2);}
.btn-danger{background:var(--red-soft); color:var(--red); border-radius:10px;}
.btn-small{background:var(--cream); color:var(--deep); border-color:var(--line); border-radius:7px;}
.btn-small:hover{border-color:var(--slate);}
.btn-add-task{border-radius:10px !important;}
.switch-link a{color:var(--deep-2);}
.error-msg{color:var(--red);}
.success-msg{color:var(--ok);}
.rate-hint{color:var(--slate);}
.switch:checked, input[type="checkbox"].switch:checked{accent-color:var(--deep);}
a:focus-visible, button:focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible{outline:2px solid var(--amber); outline-offset:2px;}

/* ---------- page header (Meridian style) ---------- */
.app-header h2{font-size:1.45rem;}
.greeting{color:var(--slate); font-size:.78rem; font-weight:500;}
.role-badge{background:var(--amber-soft); color:var(--deep); font-family:var(--font-display);}

/* Home header becomes the Meridian hero card */
#view-home > .app-header{
  background:linear-gradient(135deg, var(--deep) 0%, var(--deep-2) 100%);
  color:var(--cream); border-radius:20px; padding:22px 20px; margin-bottom:16px; position:relative; overflow:hidden;
}
#view-home > .app-header::after{content:""; position:absolute; right:-30px; top:-30px; width:120px; height:120px; border-radius:50%; border:1px solid rgba(217,162,44,.3); pointer-events:none;}
#view-home > .app-header .greeting{color:var(--amber); font-family:var(--font-mono); font-size:.68rem; letter-spacing:.5px; text-transform:uppercase;}
#view-home > .app-header h2{color:var(--cream); font-size:1.7rem; margin-top:2px;}
#view-home > .app-header .role-badge{background:var(--amber); color:var(--deep); position:relative; z-index:1;}

.section-title{font-size:1rem; margin:22px 2px 10px;}
.section-title a{color:var(--slate) !important; font-family:var(--font-text);}

/* ---------- cards & stats ---------- */
.card, .stat-card, .record-card, .detail-body, .gps-card, .profile-card, .plan-card, .action-btn, .hist-item, .li-card{border-color:var(--line); border-radius:16px;}
.card h4{font-family:var(--font-display); font-size:1rem; font-weight:600;}
.stat-card{padding:13px 14px;}
.stat-value{font-family:var(--font-display); font-weight:600; color:var(--ink); font-variant-numeric:tabular-nums;}
.stat-label{color:var(--slate); font-weight:500; font-size:.72rem;}
.stat-grid .stat-card:nth-child(4){background:var(--amber-soft); border-color:transparent;}
.stat-grid .stat-card:nth-child(4) .stat-label{color:var(--amber-ink);}
.action-btn{color:var(--deep); font-weight:600; font-size:.82rem;}
.action-btn:active, .action-btn:hover{background:var(--cream); border-color:var(--slate);}
.action-icon{width:38px; height:38px; border-radius:11px; background:var(--amber-soft); display:inline-flex; align-items:center; justify-content:center; font-size:1.1rem;}
.action-icon svg{width:19px; height:19px;}
.total-bar{background:var(--cream); border-color:var(--line);}
.total-bar strong{font-family:var(--font-mono); font-weight:500;}
.record-card .rc-top{font-weight:500;}
.avatar{background:var(--amber-soft); color:var(--deep); font-family:var(--font-display); font-weight:600;}

/* gps */
.gps-card{background:var(--slate-soft); border-color:transparent;}
.gps-status{color:var(--slate-ink);}
.gps-card.gps-ok{background:var(--ok-soft); border-color:transparent;}
.gps-card.gps-ok .gps-status{color:var(--ok);}
.gps-card.gps-err{background:var(--amber-soft); border-color:transparent;}
.gps-card.gps-err .gps-status{color:var(--amber-ink);}

/* badges */
.badge{background:var(--slate-soft); color:var(--slate-ink); font-weight:600;}
.badge.green, .badge.st-paid{background:var(--ok-soft); color:var(--ok);}
.badge.gray{background:var(--cream); color:var(--slate); border:1px solid var(--line);}
.badge.st-submitted, .badge.st-partially_paid{background:var(--amber-soft); color:var(--amber-ink);}
.badge.st-approved{background:#DCE7F7; color:#24508F;}
.badge.st-rejected{background:var(--red-soft); color:var(--red);}

/* modals → Meridian sheets */
.modal-overlay{background:rgba(15,45,92,.45);}
.modal-card{border-radius:22px; box-shadow:0 24px 60px rgba(15,45,92,.35);}
.modal-header{background:linear-gradient(135deg, var(--deep), var(--deep-2));}
.modal-close{background:rgba(246,248,252,.12);}

/* toast */
.toast{background:var(--deep); color:var(--cream); border-radius:12px; font-weight:500; box-shadow:0 10px 30px rgba(15,45,92,.3);}

/* ---------- navigation ---------- */
.tab-bar{
  background:rgba(255,255,255,.96); -webkit-backdrop-filter:saturate(1.4) blur(10px); backdrop-filter:saturate(1.4) blur(10px);
  border-top:1px solid var(--line); overflow-x:auto; scrollbar-width:none; padding:6px 4px calc(6px + env(safe-area-inset-bottom));
}
.tab-bar::-webkit-scrollbar{display:none;}
.tab-btn{flex:1 0 64px; color:var(--slate); font-size:.6rem; gap:4px; padding:5px 2px;}
.tab-btn span{font-size:0; line-height:0;}
.tab-btn span svg{width:20px; height:20px;}
.tab-btn.active{color:var(--deep);}
.side-brand{display:none;}
/* phones: hint that more tabs scroll in from the right */
@media (max-width:599px){
  .tab-bar{scroll-snap-type:x proximity; -webkit-mask-image:linear-gradient(to right,#000 0,#000 86%,rgba(0,0,0,.35) 100%); mask-image:linear-gradient(to right,#000 0,#000 86%,rgba(0,0,0,.35) 100%);}
  .tab-btn{scroll-snap-align:start;}
  .tab-bar.at-end{-webkit-mask-image:none; mask-image:none;}
}

.tab-view{padding-top:calc(16px + env(safe-area-inset-top));}

/* PWA banner (offline / update / install) */
#pwa-banner{position:sticky; top:0; z-index:120;}
#pwa-banner .pb{display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; font-weight:500; padding:9px 14px; background:var(--amber-soft); color:var(--amber-ink);}
#pwa-banner .pb.off{background:var(--red-soft); color:var(--red);}
#pwa-banner button{background:var(--deep); color:var(--cream); border:none; border-radius:8px; padding:6px 10px; font-size:11.5px; font-weight:600; cursor:pointer; white-space:nowrap;}
#pwa-banner .x{background:transparent; color:inherit;}

/* ---------- tablet: icon rail ---------- */
@media (min-width:600px){
  body{background:var(--page);}
  #app-shell{background:var(--panel); min-height:100vh; margin-left:var(--rail-w);}
  .tab-bar{
    top:0; bottom:0; left:0; right:auto; width:var(--rail-w); flex-direction:column; overflow-y:auto; overflow-x:hidden;
    background:linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%); border:none; padding:16px 8px; gap:2px;
    -webkit-backdrop-filter:none; backdrop-filter:none;
  }
  .tab-btn{flex:0 0 auto; color:rgba(246,248,252,.68); border-radius:11px; padding:9px 2px; font-size:.6rem;}
  .tab-btn:hover{background:rgba(246,248,252,.06); color:var(--cream);}
  .tab-btn.active{background:rgba(217,162,44,.14); color:var(--amber);}
  .side-brand{display:flex; justify-content:center; padding:2px 0 18px;}
  .side-brand img{width:38px; height:38px; border-radius:10px;}
  .side-brand div{display:none;}
  .tab-view{max-width:820px; padding:24px 28px 40px;}
  .toast{bottom:24px;}
  #pwa-banner{margin-left:0;}
}

/* ---------- desktop: full sidebar ---------- */
@media (min-width:1024px){
  #app-shell{margin-left:var(--sidebar-w);}
  .tab-bar{width:var(--sidebar-w); padding:22px 16px;}
  .tab-btn{flex-direction:row; justify-content:flex-start; gap:12px; padding:10px 12px; font-size:.84rem; font-weight:500; text-align:left;}
  .side-brand{justify-content:flex-start; gap:10px; align-items:center; padding:2px 6px 24px; text-decoration:none;}
  .side-brand div{display:block;}
  .side-brand b{display:block; font-family:var(--font-display); font-weight:600; font-size:17px; color:var(--cream); line-height:1.1;}
  .side-brand small{font-family:var(--font-mono); font-size:9.5px; letter-spacing:.5px; color:var(--amber);}
  .tab-view{max-width:980px; padding:30px 40px 48px;}
  .stat-grid{grid-template-columns:repeat(4, 1fr);}
  .quick-actions{max-width:640px;}
  .app-header h2{font-size:1.7rem;}
}

@media (prefers-reduced-motion: reduce){ *{transition:none !important; animation:none !important;} }
@media print{ .tab-bar, #pwa-banner, .toast{display:none !important;} #app-shell{margin:0 !important;} }

/* =====================================================================
   v2 polish — depth, colour accents, phone-first spacing
   ===================================================================== */
body{background:var(--cream);}
#app-shell{background:var(--cream);}
.tab-view{padding-left:14px; padding-right:14px;}

/* cards: soft depth instead of flat borders */
.card, .stat-card, .record-card, .plan-card, .action-btn, .profile-card, .hist-item, .detail-body{
  background:var(--panel); border:1px solid rgba(15,45,92,.06);
  box-shadow:0 1px 2px rgba(15,45,92,.04), 0 6px 18px rgba(15,45,92,.06);
}
.record-card, .plan-card{transition:transform .15s ease, box-shadow .15s ease;}
.record-card:active, .plan-card:active{transform:scale(.99);}

/* stat tiles with coloured accent bars */
.stat-grid{gap:10px;}
.stat-card{position:relative; overflow:hidden; padding:14px 14px 12px 16px; min-height:84px; justify-content:flex-end;}
.stat-card::before{content:""; position:absolute; left:0; top:12px; bottom:12px; width:4px; border-radius:0 4px 4px 0; background:var(--deep-2);}
.stat-grid .stat-card:nth-child(2)::before{background:#3E7BD6;}
.stat-grid .stat-card:nth-child(3)::before{background:#7A5CC7;}
.stat-grid .stat-card:nth-child(4)::before{background:var(--amber);}
.stat-grid .stat-card:nth-child(5)::before{background:var(--ok);}
.stat-grid .stat-card:nth-child(6)::before{background:#2BA39B;}
.stat-grid .stat-card:nth-child(7)::before{background:#D9772C;}
.stat-grid .stat-card:nth-child(8)::before{background:var(--red);}
.stat-grid .stat-card:nth-child(4){background:linear-gradient(135deg,#FBF1D9,#F6E7C4);}
.stat-value{font-size:1.5rem; line-height:1.1;}

/* home hero: richer, with role chip and breathing room */
#view-home > .app-header{padding:24px 20px 26px; box-shadow:0 14px 30px rgba(15,45,92,.25); margin:2px 0 18px;}
#view-home > .app-header::before{content:""; position:absolute; left:-40px; bottom:-60px; width:160px; height:160px; border-radius:50%; background:radial-gradient(circle, rgba(217,162,44,.18), transparent 70%); pointer-events:none;}

/* section titles with a small amber tick */
.section-title{position:relative; padding-left:12px;}
.section-title::before{content:""; position:absolute; left:0; top:50%; width:4px; height:14px; margin-top:-7px; border-radius:2px; background:var(--amber);}

/* quick actions: 3-up tiles */
.quick-actions{display:grid; grid-template-columns:repeat(3,1fr); gap:10px;}
.action-btn{padding:16px 6px 14px; gap:8px; font-size:.78rem;}

/* chips & inputs a touch larger for thumbs */
.chip{padding:9px 14px; min-height:38px;}
input, select, textarea{min-height:44px; font-size:16px;} /* 16px stops iOS zoom-on-focus */
textarea{min-height:80px;}
.btn-primary{min-height:48px; box-shadow:0 8px 18px rgba(15,45,92,.22);}

/* phone tab bar: pill highlight on the active tab */
@media (max-width:599px){
  .tab-bar{padding-top:6px; box-shadow:0 -6px 20px rgba(15,45,92,.08);}
  .tab-btn{border-radius:12px; margin:0 2px;}
  .tab-btn.active{background:var(--slate-soft);}
  .tab-view{padding-bottom:calc(92px + env(safe-area-inset-bottom));}
  .app-header h2{font-size:1.35rem;}
  .stat-value{font-size:1.35rem;}
  .modal-overlay{padding:0; align-items:flex-end;}
  .modal-card{max-width:100%; border-radius:22px 22px 0 0; max-height:92vh;}
}
@media (min-width:600px){ #app-shell{background:var(--cream);} .tab-view{padding-left:28px; padding-right:28px;} }
@media (min-width:1024px){ .tab-view{padding-left:40px; padding-right:40px;} .quick-actions{max-width:none;} }

  </style>
</head>
<body>

  <!-- ======================= AUTH: LOGIN ======================= -->
  <section id="view-login" class="view auth-view">
    <div class="auth-card">
      <div class="logo-circle">SR</div>
      <h1>Sales Reporter</h1>
      <p class="subtitle">Log visits, orders and expenses on the go</p>

      <label>Email</label>
      <input type="email" id="login-email" placeholder="you@company.com" autocomplete="email">
      <label>Password</label>
      <input type="password" id="login-password" placeholder="Your password" autocomplete="current-password">

      <p class="error-msg" id="login-error"></p>
      <button class="btn-primary" id="btn-login">Log In</button>
      <p class="switch-link"><a href="#" id="link-forgot">Forgot password?</a></p>
      <p class="switch-link">New team member? <a href="#" id="link-register">Create an account</a></p>
    </div>
  </section>

  <!-- ======================= AUTH: FORGOT PASSWORD ======================= -->
  <section id="view-forgot" class="view auth-view hidden">
    <div class="auth-card">
      <div class="logo-circle">SR</div>
      <h1>Forgot Password</h1>
      <p class="subtitle">Enter your email and we'll send you a reset link</p>

      <div id="forgot-form">
        <label>Email</label>
        <input type="email" id="forgot-email" placeholder="you@company.com" autocomplete="email">
        <p class="error-msg" id="forgot-error"></p>
        <button class="btn-primary" id="btn-forgot">Send Reset Link</button>
      </div>
      <p class="success-msg hidden" id="forgot-sent" style="text-align:center;font-size:0.95rem;margin-top:14px;">
        If that email is registered, a reset link has been sent. Check your inbox.
      </p>

      <p class="switch-link"><a href="#" id="link-back-login">Back to Login</a></p>
    </div>
  </section>

  <!-- ======================= AUTH: REGISTER ======================= -->
  <section id="view-register" class="view auth-view hidden">
    <div class="auth-card">
      <h1>Create Account</h1>
      <p class="subtitle">Register with your work details</p>

      <label>Full Name</label>
      <input type="text" id="reg-name" placeholder="e.g. Rajesh Kumar">
      <label>Email</label>
      <input type="email" id="reg-email" placeholder="you@company.com" autocomplete="email">
      <label>Phone</label>
      <input type="tel" id="reg-phone" placeholder="98765 43210">
      <label>Password (min 6 characters)</label>
      <input type="password" id="reg-password" placeholder="Choose a password" autocomplete="new-password">

      <label>Role</label>
      <div class="chip-group" id="reg-role">
        <button class="chip active" data-value="me">Marketing Executive</button>
        <button class="chip" data-value="tm">Territory Manager</button>
        <button class="chip" data-value="am">Assistant Manager</button>
        <button class="chip" data-value="mm">Marketing Manager</button>
        <button class="chip" data-value="mh">Marketing Head</button>
        <button class="chip" data-value="ceo">CEO</button>
        <button class="chip" data-value="gm">General Manager</button>
      </div>

      <label>Territory</label>
      <input type="text" id="reg-territory" placeholder="e.g. Mumbai North">

      <p class="error-msg" id="register-error"></p>
      <button class="btn-primary" id="btn-register">Create Account</button>
      <p class="switch-link">Already registered? <a href="#" id="link-login">Log in</a></p>
    </div>
  </section>

  <!-- ======================= APP SHELL ======================= -->
  <div id="app-shell" class="hidden">

    <!-- ---------- HOME TAB ---------- -->
    <section id="view-home" class="view tab-view">
      <header class="app-header">
        <div>
          <p class="greeting" id="home-greeting">Hello</p>
          <h2 id="home-name">—</h2>
        </div>
        <span class="role-badge" id="home-role">ME</span>
      </header>

      <!-- Accounts (Sukanya H S) only: Fully Approved Expenses Reports to pay.
           Filled from api/get_payment_queue.php, which refuses everyone else. -->
      <div class="card hidden" id="home-pay-card">
        <h4>&#128179; Payments to Make</h4>
        <p class="rate-hint" id="home-pay-summary"></p>
        <div id="home-pay-list" class="record-list"></div>
        <div id="home-paid-wrap" class="hidden">
          <h4 style="margin-top:14px;">Recently paid</h4>
          <div id="home-paid-list" class="record-list"></div>
        </div>
      </div>

      <h3 class="section-title">Daily Work Report</h3>
      <p class="rate-hint">Pick how today's work is logged, then add a row for each activity.</p>
      <div class="chip-group" id="dw-worktype">
        <button type="button" class="chip" data-value="office">Office Work</button>
        <button type="button" class="chip" data-value="field">Field Work</button>
      </div>
      <div id="dw-rows-section" class="hidden">
        <div id="dw-rows-list"></div>
        <button type="button" class="btn-add-task" id="dw-add-row">&#43; Add Row</button>
        <p class="error-msg" id="dw-error"></p>
        <button class="btn-primary" id="dw-save">Save Report</button>
        <p class="rate-hint" id="dw-saved-hint"></p>
      </div>

      <h3 class="section-title">Today's Summary</h3>
      <div class="stat-grid" id="home-stats">
        <div class="stat-card"><span class="stat-value" id="st-customers">0</span><span class="stat-label">Customers Visited</span></div>
        <div class="stat-card"><span class="stat-value" id="st-dealers">0</span><span class="stat-label">Dealers Visited</span></div>
        <div class="stat-card"><span class="stat-value" id="st-quotes">0</span><span class="stat-label">Quotations Sent</span></div>
        <div class="stat-card"><span class="stat-value" id="st-orders">0</span><span class="stat-label">Orders Received</span></div>
        <div class="stat-card"><span class="stat-value" id="st-ovalue">₹0</span><span class="stat-label">Order Value Received</span></div>
        <div class="stat-card"><span class="stat-value" id="st-pvalue">₹0</span><span class="stat-label">Payment Value Received</span></div>
        <div class="stat-card"><span class="stat-value" id="st-km">0</span><span class="stat-label">KM Travelled</span></div>
        <div class="stat-card"><span class="stat-value" id="st-expense">₹0</span><span class="stat-label">Expenses</span></div>
      </div>

      <h3 class="section-title">Reminders &amp; Plans <a href="#" id="home-plans-link" style="font-size:0.78rem;font-weight:700;">View all →</a></h3>
      <div id="home-plans-preview" class="record-list"></div>

      <h3 class="section-title">Quick Actions</h3>
      <div class="quick-actions">
        <button class="action-btn" id="qa-visit"><span class="action-icon">📍</span>Log Visit</button>
        <button class="action-btn" id="qa-expense"><span class="action-icon">🧾</span>Log Expense</button>
        <button class="action-btn" id="qa-plan"><span class="action-icon">🗓️</span>Add Plan</button>
      </div>
    </section>

    <!-- ---------- LOG VISIT ---------- -->
    <section id="view-visit" class="view tab-view hidden">
      <header class="app-header"><h2 id="visit-form-title">Log Visit</h2></header>

      <div class="gps-card" id="visit-gps">
        <span class="gps-status" id="visit-gps-status">Capturing GPS location…</span>
        <button class="btn-small" id="visit-gps-retry">Retry</button>
      </div>

      <label>Visit Type</label>
      <div class="chip-group" id="v-type">
        <button class="chip active" data-value="customer">Customer</button>
        <button class="chip" data-value="dealer">Dealer</button>
        <button class="chip" data-value="consultant">Consultant</button>
        <button class="chip" data-value="office">Office Work</button>
      </div>

      <label>Visit Date</label>
      <input type="date" id="v-date">

      <label id="v-name-label">Customer / Dealer Name *</label>
      <div class="dd-field" id="v-name-dd">
        <input type="text" id="v-name" placeholder="e.g. Sharma Traders" autocomplete="off" spellcheck="false">
        <button type="button" class="dd-toggle" id="v-name-dd-toggle" aria-label="Show suggestions">&#9662;</button>
        <div class="dd-list hidden" id="v-name-dd-list"></div>
      </div>
      <button type="button" class="btn-add-task" id="btn-open-add-customer" style="margin-top:6px;">&#43; Add Customer</button>

      <label>Contact Phone (optional)</label>
      <input type="tel" id="v-phone" placeholder="98765 43210">

      <label>Location (city / area / region)</label>
      <input type="text" id="v-location" placeholder="e.g. Andheri East, Mumbai" autocomplete="off">

      <label>Customer Category</label>
      <div class="chip-group" id="v-category">
        <button class="chip active" data-value="direct">Direct</button>
        <button class="chip" data-value="distributor">Distributor</button>
        <button class="chip" data-value="retailer">Retailer</button>
        <button class="chip" data-value="industrial">Industrial</button>
        <button class="chip" data-value="other">Other</button>
      </div>

      <label>Purpose of Visit</label>
      <input type="text" id="v-purpose" placeholder="e.g. Product demo, follow-up">

      <label>Product / Service Discussed</label>
      <input type="text" id="v-product" placeholder="e.g. Industrial pumps">

      <label>Visit Outcome</label>
      <div class="chip-group" id="v-outcome">
        <button class="chip" data-value="successful">Successful</button>
        <button class="chip" data-value="follow_up">Follow-up</button>
        <button class="chip active" data-value="pending">Pending</button>
        <button class="chip" data-value="not_interested">Not Interested</button>
      </div>

      <div id="v-followup-wrap" class="hidden">
        <label>Follow-up Date</label>
        <input type="date" id="v-followup">
      </div>

      <div class="toggle-row"><label>Quotation Sent</label><input type="checkbox" id="v-qsent" class="switch"></div>
      <div id="v-qvalue-wrap" class="hidden">
        <label>Quotation Value (₹)</label>
        <input type="number" id="v-qvalue" placeholder="0" min="0">
      </div>

      <div class="toggle-row"><label>Order Received</label><input type="checkbox" id="v-orecv" class="switch"></div>
      <div id="v-ovalue-wrap" class="hidden">
        <label>Order Value (₹)</label>
        <input type="number" id="v-ovalue" placeholder="0" min="0">
      </div>

      <div class="toggle-row"><label>Payment Collected</label><input type="checkbox" id="v-pcoll" class="switch"></div>
      <div id="v-pvalue-wrap" class="hidden">
        <label>Payment Amount (₹)</label>
        <input type="number" id="v-pvalue" placeholder="0" min="0">
      </div>

      <label>Competitor Activity (optional)</label>
      <textarea id="v-competitor" placeholder="e.g. Competitor X quoted lower price"></textarea>

      <label>Work for the Day — Activities</label>
      <div id="v-tasks-list" class="task-list"></div>
      <button type="button" class="btn-add-task" id="v-task-add">&#43; Add Row</button>

      <label>Remarks (optional)</label>
      <textarea id="v-remarks" placeholder="Any other notes"></textarea>

      <p class="error-msg" id="visit-error"></p>
      <button class="btn-primary" id="btn-save-visit">Save Visit</button>
      <button class="btn-small hidden" id="btn-cancel-edit-visit" style="width:100%;margin-top:8px;">Cancel Edit</button>

      <h3 class="section-title">Recent Visits <select id="visit-period" class="period-select"><option value="daily">Today</option><option value="weekly">This Week</option><option value="monthly">This Month</option><option value="last7">Last 7 Days</option><option value="lastweek">Last Week</option><option value="last30">Last 30 Days</option></select></h3>
      <div id="visit-list" class="record-list"></div>
    </section>

    <!-- ---------- LOG EXPENSE ---------- -->
    <section id="view-expense" class="view tab-view hidden">
      <header class="app-header"><h2>Log Expense</h2></header>

      <div class="gps-card" id="expense-gps">
        <span class="gps-status" id="expense-gps-status">Capturing GPS location…</span>
        <button class="btn-small" id="expense-gps-retry">Retry</button>
      </div>

      <label>Advance Expenses *</label>
      <button type="button" class="btn-add-task" id="btn-open-advance-hub" style="margin-bottom:10px;">&#128179; Advance Expenses</button>
      <select id="e-advance-select" required>
        <option value="">Select the advance request this expense is drawn against…</option>
      </select>
      <p class="rate-hint" id="e-advance-hint"></p>

      <div class="chip-group" id="e-view-toggle" style="margin:14px 0 18px;">
        <button type="button" class="chip active" data-etab="log">Log Expense</button>
        <button type="button" class="chip" data-etab="today">Today's Expenses</button>
      </div>

      <div id="e-today-panel" class="hidden">
        <label>Date</label>
        <input type="date" id="t-date">

        <label>Travel Mode</label>
        <div class="chip-group" id="t-mode">
          <button class="chip active" data-value="car">Car</button>
          <button class="chip" data-value="bike">Bike</button>
          <button class="chip" data-value="public">Public / Taxi</button>
          <button class="chip" data-value="none">No Travel</button>
        </div>

        <div id="t-route-wrap" class="row-2">
          <div><label>From (optional)</label><input type="text" id="t-from" placeholder="e.g. Office"></div>
          <div><label>To (optional)</label><input type="text" id="t-to" placeholder="e.g. Client site"></div>
        </div>

        <div id="t-km-wrap">
          <label>KM Travelled</label>
          <input type="number" id="t-km" placeholder="0" min="0">
          <p class="rate-hint" id="t-rate-hint">₹12/km × 0 km = ₹0</p>
        </div>

        <div id="t-public-wrap" class="hidden">
          <label>Public Transport / Taxi Amount (₹)</label>
          <input type="number" id="t-public" placeholder="0" min="0">
        </div>

        <label>Boarding / Meals (₹)</label>
        <input type="number" id="t-boarding" placeholder="0" min="0">
        <label>Lodging / Hotel (₹)</label>
        <input type="number" id="t-lodging" placeholder="0" min="0">
        <label>Other — Toll / Parking / Misc (₹)</label>
        <input type="number" id="t-other" placeholder="0" min="0">
        <label>Notes (optional)</label>
        <input type="text" id="t-notes" placeholder="e.g. Outstation trip to Pune">

        <label>Attachment for Bills (one or more — PDF or image)</label>
        <input type="file" id="t-attachment" accept=".pdf,image/jpeg,image/png,image/webp" multiple>
        <p class="rate-hint" id="t-attachment-name"></p>

        <div class="total-bar"><span>Total Expense</span><strong id="t-total">₹0</strong></div>
        <div class="total-bar" id="t-balance-bar"><span>Balance (Advance &minus; Expenses)</span><strong id="t-balance">₹0</strong></div>

        <p class="error-msg" id="t-error"></p>
        <button class="btn-primary" id="btn-save-today-expense">Save Expense</button>

        <h3 class="section-title">Expenses on this date</h3>
        <div class="total-bar" id="e-today-totals-bar"></div>
        <div id="e-today-list" class="record-list"></div>
      </div>

      <div id="e-log-fields">
      <label>Travel Mode</label>
      <div class="chip-group" id="e-mode">
        <button class="chip active" data-value="car">Car</button>
        <button class="chip" data-value="bike">Bike</button>
        <button class="chip" data-value="public">Public / Taxi</button>
        <button class="chip" data-value="none">No Travel</button>
      </div>

      <div id="e-route-wrap" class="row-2">
        <div><label>From (optional)</label><input type="text" id="e-from" placeholder="e.g. Office"></div>
        <div><label>To (optional)</label><input type="text" id="e-to" placeholder="e.g. Client site"></div>
      </div>

      <div id="e-km-wrap">
        <label>KM Travelled</label>
        <input type="number" id="e-km" placeholder="0" min="0">
        <p class="rate-hint" id="e-rate-hint">₹12/km × 0 km = ₹0</p>
      </div>

      <div id="e-public-wrap" class="hidden">
        <label>Public Transport / Taxi Amount (₹)</label>
        <input type="number" id="e-public" placeholder="0" min="0">
      </div>

      <label>Boarding / Meals (₹)</label>
      <input type="number" id="e-boarding" placeholder="0" min="0">
      <label>Lodging / Hotel (₹)</label>
      <input type="number" id="e-lodging" placeholder="0" min="0">
      <label>Other — Toll / Parking / Misc (₹)</label>
      <input type="number" id="e-other" placeholder="0" min="0">
      <label>Notes (optional)</label>
      <input type="text" id="e-notes" placeholder="e.g. Outstation trip to Pune">

      <label>Attachment for Bills (one or more — PDF or image)</label>
      <input type="file" id="e-attachment" accept=".pdf,image/jpeg,image/png,image/webp" multiple>
      <p class="rate-hint" id="e-attachment-name"></p>

      <div class="total-bar"><span>Total Expense</span><strong id="e-total">₹0</strong></div>
      <div class="total-bar" id="e-balance-bar"><span>Balance (Advance &minus; Expenses)</span><strong id="e-balance">₹0</strong></div>

      <p class="error-msg" id="expense-error"></p>
      <button class="btn-primary" id="btn-save-expense">Save Expense</button>
      </div>

      <h3 class="section-title">Recent Expenses <select id="expense-period" class="period-select"><option value="daily">Today</option><option value="weekly">This Week</option><option value="monthly">This Month</option><option value="last7">Last 7 Days</option><option value="lastweek">Last Week</option><option value="last30">Last 30 Days</option></select></h3>
      <div class="total-bar" id="expense-totals-bar"></div>
      <div id="expense-list" class="record-list"></div>
    </section>

    <!-- ---------- TASKS ---------- -->
    <section id="view-tasks" class="view tab-view hidden">
      <header class="app-header"><h2>Tasks</h2></header>

      <div id="tasks-assigner-tools" class="hidden">
        <button type="button" class="btn-primary" id="btn-open-assign-task" style="margin-bottom:10px;">&#43; Assign Task</button>
        <button type="button" class="btn-small" id="btn-sync-indiamart" style="margin-bottom:16px;">&#8635; Sync IndiaMART Leads</button>
        <a class="btn-small" href="lead_routing.html" style="margin-bottom:16px;text-decoration:none;display:inline-block;">&#128205; Lead Routing Report</a>
        <p class="rate-hint" id="tasks-sync-hint"></p>
        <div id="im-fill-box" class="hidden" style="margin:-6px 0 14px;">
          <p class="rate-hint" id="im-fill-text"></p>
          <button type="button" class="btn-small" id="btn-im-fill">&#128337; Fill IndiaMART times now</button>
        </div>

        <div id="tasks-unassigned-section" class="hidden">
          <h3 class="section-title">Unassigned IndiaMART Leads</h3>
          <div id="tasks-unassigned-list" class="record-list"></div>
        </div>

        <h3 class="section-title">All Tasks
          <select id="tasks-status-filter" class="period-select"><option value="">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="done">Done</option></select>
          <select id="tasks-region-filter" class="period-select"><option value="">All Regions</option></select>
        </h3>
      </div>

      <div id="tasks-employee-header" class="hidden">
        <h3 class="section-title">My Tasks <select id="tasks-status-filter-emp" class="period-select"><option value="">All</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="done">Done</option></select></h3>
      </div>

      <div id="tasks-list" class="record-list"></div>
    </section>

    <!-- ---------- PLANS / REMINDERS ---------- -->
    <section id="view-plans" class="view tab-view hidden">
      <header class="app-header"><h2>Plans &amp; Reminders</h2></header>

      <div class="chip-group" id="pl-type">
        <button class="chip active" data-value="next_day">Next Day Plan</button>
        <button class="chip" data-value="next_week">Next Week Plan</button>
        <button class="chip" data-value="pending_work">Pending Work</button>
      </div>

      <div class="card">
        <h4 id="pl-form-title">Add Plan</h4>
        <label>Customer / Dealer Name (optional)</label>
        <input type="text" id="pl-name" placeholder="e.g. Sharma Traders">
        <label>Purpose / Task</label>
        <input type="text" id="pl-purpose" placeholder="e.g. Follow up on quotation">
        <label>Planned Date</label>
        <input type="date" id="pl-date">
        <label>Notes (optional)</label>
        <textarea id="pl-notes" placeholder="Any other details"></textarea>
        <p class="error-msg" id="plan-error"></p>
        <button class="btn-primary" id="btn-save-plan">Save Plan</button>
        <button class="btn-small hidden" id="btn-cancel-edit-plan" style="width:100%;margin-top:8px;">Cancel Edit</button>
      </div>

      <h3 class="section-title" id="pl-list-title">Open Items</h3>
      <div id="plan-list" class="record-list"></div>

      <h3 class="section-title">Completed</h3>
      <div id="plan-done-list" class="record-list"></div>
    </section>

    <!-- ---------- REPORTS ---------- -->
    <section id="view-reports" class="view tab-view hidden">
      <header class="app-header">
        <h2>Reports</h2>
        <a href="#" id="link-report-history" class="btn-small">Report History</a>
      </header>

      <div class="chip-group" id="r-period">
        <button class="chip active" data-value="daily">Daily</button>
        <button class="chip" data-value="weekly">Weekly</button>
        <button class="chip" data-value="monthly">Monthly</button>
        <button class="chip" data-value="last7">Last 7 Days</button>
        <button class="chip" data-value="lastweek">Last Week</button>
      </div>

      <h3 class="section-title">My Performance</h3>
      <div class="stat-grid" id="r-my-stats"></div>

      <div id="r-team-section" class="hidden">
        <h3 class="section-title" id="r-team-title">Team Performance</h3>

        <label for="r-team-member-select">View report for</label>
        <select id="r-team-member-select">
          <option value="">All Team Members</option>
        </select>

        <div class="stat-grid hidden" id="r-team-member-stats"></div>

        <div id="r-team-list" class="record-list"></div>
        <div class="total-bar" id="r-team-totals"></div>
      </div>
    </section>

    <!-- ---------- SALES DATA (canaresai.com) ---------- -->
    <section id="view-salesdata" class="view tab-view hidden">
      <header class="app-header"><h2>Sales Data</h2></header>
      <p style="color:var(--muted);font-size:12px;margin:-8px 0 14px;">Real ERP documents from canaresai.com, live — not the self-reported figures under Reports.</p>

      <div class="chip-group" id="sd-type">
        <button class="chip active" data-value="quotations">Quotations</button>
        <button class="chip" data-value="transfer_orders">Transfer Orders</button>
        <button class="chip" data-value="delivery_challans">Delivery Challans</button>
      </div>

      <input type="text" id="sd-search" placeholder="Search by number&hellip; e.g. QUO-3021, SO-9157, DC-6383" autocomplete="off" style="margin:12px 0;">

      <div id="sd-list" class="record-list"></div>
      <div class="total-bar" id="sd-totals"></div>
    </section>

    <!-- ---------- PROFILE / ADMIN ---------- -->
    <section id="view-profile" class="view tab-view hidden">
      <header class="app-header"><h2>Profile</h2></header>

      <div class="profile-card">
        <div class="avatar" id="p-avatar">?</div>
        <div>
          <h3 id="p-name">—</h3>
          <p class="muted" id="p-email">—</p>
          <p class="muted" id="p-meta">—</p>
        </div>
      </div>

      <div id="admin-section" class="hidden">
        <h3 class="section-title">Admin Panel</h3>

        <div class="card">
          <h4>Expense Rates & Company</h4>
          <div class="row-2">
            <div><label>Car ₹/km</label><input type="number" id="a-car-rate" min="0" step="0.5"></div>
            <div><label>Bike ₹/km</label><input type="number" id="a-bike-rate" min="0" step="0.5"></div>
          </div>
          <label>Company Name (shown on reports)</label>
          <input type="text" id="a-company">
          <button class="btn-primary" id="btn-save-settings">Save Settings</button>
          <p class="success-msg hidden" id="a-settings-saved">Saved ✓</p>
        </div>

        <div class="card">
          <h4>Rate Master — Advance Expense Rates</h4>
          <p class="rate-hint">Per-designation daily limits used to auto-calculate Advance Expense Requests.</p>
          <div id="a-rate-master-list"></div>
          <div class="row-2" style="margin-top:10px;">
            <div><label>Designation</label><input type="text" id="a-rate-new-designation" placeholder="e.g. Marketing Manager"></div>
            <div><label>Daily Lodging Limit (₹)</label><input type="number" id="a-rate-new-lodging" min="0" placeholder="0"></div>
          </div>
          <div class="row-2">
            <div><label>Daily Food Limit (₹)</label><input type="number" id="a-rate-new-food" min="0" placeholder="0"></div>
            <div><label>TA per Day (₹)</label><input type="number" id="a-rate-new-ta" min="0" placeholder="0"></div>
          </div>
          <label>Own Vehicle Rate (₹/km)</label>
          <input type="number" id="a-rate-new-vehicle" min="0" placeholder="0">
          <button class="btn-small" id="btn-add-rate-row">Add / Update Designation</button>
        </div>

        <div class="card" id="a-expense-card">
          <h4>Expense Approvals &amp; Payments</h4>
          <p class="rate-hint">Every team member's expenses. Status and payment changes here appear in TallyField (Reports &rarr; Outstanding by Rep) automatically, and changes made there show up here.</p>
          <div class="row-2">
            <div><label>Status</label>
              <select id="ax-status">
                <option value="open">Open (not fully paid)</option>
                <option value="">All</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select></div>
            <div><label>Employee</label><select id="ax-user"><option value="">All employees</option></select></div>
          </div>
          <button class="btn-small" id="ax-refresh" style="margin-top:8px;">&#8635; Refresh</button>
          <div id="ax-totals" class="total-bar" style="margin-top:10px;"></div>
          <div id="ax-list" class="record-list"></div>
        </div>

        <div class="card" id="a-tf-card">
          <h4>TallyField Integration</h4>
          <p class="rate-hint">Connects expenses to TallyField. Generate a key, then paste it (with the API URL below) into TallyField &rarr; Settings &rarr; Sales Report Sync.</p>
          <div id="tf-status" class="rate-hint"></div>
          <label>API URL</label>
          <input type="text" id="tf-api-base" readonly>
          <div id="tf-key-box" class="hidden">
            <label>Integration Key <span class="rate-hint">(shown once &mdash; copy it now)</span></label>
            <input type="text" id="tf-key" readonly>
            <button class="btn-small" id="tf-copy-key" style="margin-top:6px;">Copy Key</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            <button class="btn-small" id="tf-generate">Generate Key</button>
            <button class="btn-small danger" id="tf-disable" style="margin-top:0;">Disable</button>
          </div>
        </div>

        <div class="card">
          <h4>Team Members</h4>
          <div id="a-member-list" class="record-list"></div>
        </div>

        <div class="card">
          <h4>IndiaMART Lead Assignment Rules</h4>
          <p class="rate-hint">Pincode mapping rules are checked first (most specific pincode wins). Then the rest, top to bottom — first match wins. Product/keyword rules match against any region; region rules match by state. Bulk-load the pincode mapping from <a href="lead_routing.html">Lead Routing Report</a>.</p>
          <label style="display:flex;gap:8px;align-items:center;margin:8px 0 12px;"><input type="checkbox" id="lar-pincode-strict" style="width:auto;"> Pincode-only routing: a lead with no pincode mapping goes to Unassigned Leads (untick to fall through to the product/region rules below)</label>
          <div id="lar-missing-users" class="hidden" style="margin-bottom:10px;"></div>
          <div id="lar-rules-list" class="record-list"></div>

          <div style="margin-top:14px;">
            <label>Fallback owner <span class="rate-hint">(used when no rule matches, or the lead is from outside India)</span></label>
            <select id="lar-fallback-owner"><option value="0">— None —</option></select>
          </div>

          <h4 style="margin-top:18px;">Add / Edit Rule</h4>
          <input type="hidden" id="lar-edit-id" value="">
          <label>Label</label>
          <input type="text" id="lar-label" placeholder="e.g. Karnataka">
          <div class="row-2">
            <div>
              <label>Type</label>
              <select id="lar-type">
                <option value="region">Region (by state)</option>
                <option value="pincode">Pincode mapping (sales team)</option>
                <option value="product">Product / keyword (any region)</option>
              </select>
            </div>
            <div>
              <label>Strategy</label>
              <select id="lar-strategy">
                <option value="single">Single owner</option>
                <option value="round_robin">Round-robin across owners</option>
              </select>
            </div>
          </div>
          <label id="lar-values-label">States (comma-separated)</label>
          <input type="text" id="lar-values" placeholder="e.g. Karnataka">
          <label>Assign to (select one, or several for round-robin)</label>
          <select id="lar-assignees" multiple size="4"></select>
          <div style="margin-top:10px;">
            <button class="btn-primary" id="btn-lar-save">Save Rule</button>
            <button class="btn-small" id="btn-lar-cancel-edit" style="display:none;">Cancel Edit</button>
          </div>
          <p class="rate-hint" id="lar-error" style="color:#c0392b;"></p>

          <h4 style="margin-top:18px;">Test a Lead</h4>
          <div class="row-2">
            <div><label>State</label><input type="text" id="lar-test-state" placeholder="e.g. Tamil Nadu"></div>
            <div><label>City</label><input type="text" id="lar-test-city" placeholder="optional"></div>
          </div>
          <label>Pincode</label>
          <input type="text" id="lar-test-pincode" placeholder="e.g. 560073" inputmode="numeric" maxlength="6">
          <label>Product / message text</label>
          <input type="text" id="lar-test-product" placeholder="e.g. Conveyor belt roller">
          <button class="btn-small" id="btn-lar-test">Test</button>
          <p class="rate-hint" id="lar-test-result"></p>

          <div style="margin-top:14px;">
            <button class="btn-small" id="btn-lar-reassign">&#8635; Re-run assignment for unassigned leads</button>
            <p class="rate-hint" id="lar-reassign-result"></p>
          </div>
        </div>
      </div>

      <button class="btn-danger" id="btn-logout">Log Out</button>
    </section>

    <!-- ---------- TAB BAR ---------- -->
    <nav class="tab-bar">
      <button class="tab-btn active" data-view="home"><span>🏠</span>Home</button>
      <button class="tab-btn" data-view="visit"><span>📍</span>Visits</button>
      <button class="tab-btn" data-view="expense"><span>🧾</span>Expenses</button>
      <button class="tab-btn" data-view="tasks"><span>✅</span>Tasks</button>
      <button class="tab-btn" data-view="plans"><span>🗓️</span>Plans</button>
      <button class="tab-btn" data-view="reports"><span>📊</span>Reports</button>
      <button class="tab-btn" data-view="salesdata"><span>💹</span>Sales Data</button>
      <button class="tab-btn" data-view="profile"><span>👤</span>Profile</button>
      <button class="tab-btn" id="btn-open-logbook"><span>📒</span>Logbook</button>
    </nav>
  </div>

  <div id="toast" class="toast hidden"></div>

  <!-- ---------- SALES DATA DETAIL MODAL ---------- -->
  <div class="modal-overlay hidden" id="sd-detail-modal">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="sd-detail-title">Details</h3>
        <button class="modal-close" id="sd-detail-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div id="sd-detail-body" class="detail-body"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-small" id="btn-sd-detail-close2">Close</button>
      </div>
    </div>
  </div>

  <!-- ---------- REPORT HISTORY MODAL ---------- -->
  <div class="modal-overlay hidden" id="history-modal">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="history-modal-title">&#128220; Report History</h3>
        <button class="modal-close" id="history-modal-close" aria-label="Close">&times;</button>
      </div>

      <div class="modal-body">
        <div id="history-list-view">
          <div class="hist-filter-row">
            <div>
              <label>From</label>
              <input type="date" id="hist-from">
            </div>
            <div>
              <label>To</label>
              <input type="date" id="hist-to">
            </div>
            <button class="btn-small" id="btn-hist-clear">Clear</button>
          </div>
          <div id="history-list" class="hist-scroll"></div>
        </div>

        <div id="history-detail-view" class="hidden">
          <button class="btn-small" id="btn-hist-back" style="margin-bottom:14px;">&larr; Back to Report History</button>
          <div id="history-detail-body" class="detail-body"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-small" id="btn-hist-close2">Close</button>
      </div>
    </div>
  </div>

  <!-- ---------- NEW CUSTOMER MODAL ---------- -->
  <div class="modal-overlay hidden" id="add-customer-modal">
    <div class="modal-card">
      <div class="modal-header">
        <h3>New Customer</h3>
        <button class="modal-close" id="add-customer-close" aria-label="Close">&times;</button>
      </div>

      <div class="modal-body">
        <h3 class="section-title" style="margin-top:0;">Identity</h3>
        <div class="row-2">
          <div><label>Customer Code *</label><input type="text" id="nc-code"></div>
          <div><label>Customer Name *</label><input type="text" id="nc-name"></div>
        </div>
        <div class="row-2">
          <div><label>GST Number</label><input type="text" id="nc-gst" placeholder="29ABCDE1234F1Z5"></div>
          <div><label>Credit Limit (₹)</label><input type="number" id="nc-credit" min="0" placeholder="0"></div>
        </div>

        <h3 class="section-title">Primary Contact</h3>
        <div class="row-2">
          <div><label>Contact Person</label><input type="text" id="nc-contact-person"></div>
          <div><label>Mobile Number</label><input type="tel" id="nc-mobile" placeholder="+91 98765 43210"></div>
        </div>
        <label>Email ID</label>
        <input type="email" id="nc-email">

        <h3 class="section-title">Billing Address</h3>
        <label>Address Line 1</label>
        <input type="text" id="nc-bill-line1">
        <label>Address Line 2</label>
        <input type="text" id="nc-bill-line2">
        <div class="row-2">
          <div><label>City</label><input type="text" id="nc-bill-city"></div>
          <div><label>State</label><input type="text" id="nc-bill-state"></div>
        </div>
        <div class="row-2">
          <div><label>Country</label><input type="text" id="nc-bill-country" value="India"></div>
          <div><label>PIN Code</label><input type="text" id="nc-bill-pincode"></div>
        </div>

        <h3 class="section-title">Shipping Address</h3>
        <div class="toggle-row"><label>Same as billing address</label><input type="checkbox" id="nc-ship-same" class="switch" checked></div>
        <div id="nc-ship-fields" class="hidden">
          <label>Address Line 1</label>
          <input type="text" id="nc-ship-line1">
          <label>Address Line 2</label>
          <input type="text" id="nc-ship-line2">
          <div class="row-2">
            <div><label>City</label><input type="text" id="nc-ship-city"></div>
            <div><label>State</label><input type="text" id="nc-ship-state"></div>
          </div>
          <div class="row-2">
            <div><label>Country</label><input type="text" id="nc-ship-country"></div>
            <div><label>PIN Code</label><input type="text" id="nc-ship-pincode"></div>
          </div>
        </div>

        <label style="text-transform:uppercase;font-size:0.72rem;letter-spacing:0.03em;">Legacy Address (free text, optional)</label>
        <textarea id="nc-legacy" placeholder="Leave empty — will auto-compose from billing fields above."></textarea>

        <p class="error-msg" id="add-customer-error"></p>
      </div>

      <div class="modal-footer">
        <button class="btn-small" id="btn-add-customer-cancel">Cancel</button>
        <button class="btn-primary" id="btn-add-customer-save" style="width:auto;margin-top:0;padding:10px 22px;display:inline-block;">Save</button>
      </div>
    </div>
  </div>

  <!-- ---------- ADVANCE EXPENSE REQUEST HUB (full-screen) ---------- -->
  <div class="modal-overlay fullscreen hidden" id="advance-hub-modal">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="adv-hub-title">Advance Expenses</h3>
        <button class="modal-close" id="adv-hub-close" aria-label="Close">&times;</button>
      </div>

      <div class="modal-body">
        <!-- ===== LIST VIEW: My Advance Requests ===== -->
        <div id="adv-list-view">
          <button type="button" class="btn-primary" id="btn-adv-new" style="margin-bottom:10px;">&#43; New Advance Expense Request</button>
          <div id="adv-import-bar" class="hidden" style="margin-bottom:16px;">
            <button type="button" class="btn-small" id="btn-adv-import" style="margin-top:0;">&#8679; Import Excel (Tally Ledger)</button>
            <input type="file" id="adv-import-input" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple class="hidden">
            <p class="rate-hint" style="margin-top:6px;">Import the Tally Ledger Account (.xlsx, same layout as Export Excel). Matching advances / expenses are approved or marked paid; other Tally vouchers are recorded against the employee. Re-importing never duplicates.</p>
          </div>
          <div id="adv-import-view" class="hidden"></div>
          <h3 class="section-title">My Advance Requests</h3>
          <div id="adv-req-list"></div>

          <div id="adv-team-req-section" class="hidden">
            <h3 class="section-title">Team Advance Requests</h3>
            <div id="adv-team-req-list"></div>
          </div>

          <div id="adv-tally-section" class="hidden">
            <h3 class="section-title">Tally Ledger (imported)</h3>
            <div id="adv-tally-list"></div>
          </div>
        </div>

        <!-- ===== FORM VIEW: replicates the Excel sheet exactly ===== -->
        <div id="adv-form-view" class="hidden">
          <div class="aef-header">
            <h2>CANARES AUTOMATION PVT. LTD. (CAPL)</h2>
            <p>Marketing Team &mdash; Advance Expense Request Form</p>
          </div>
          <p class="rate-hint" id="adv-req-no-display"></p>
          <p class="error-msg" id="adv-form-error"></p>

          <div class="aef-section-title">Employee &amp; Trip Details</div>
          <div class="row-2">
            <div class="locked-field"><label>Employee Name</label><input type="text" id="adv-emp-name" disabled></div>
            <div class="locked-field"><label>Employee Code</label><input type="text" id="adv-emp-code" disabled></div>
          </div>
          <div class="row-2">
            <div class="locked-field"><label>Designation</label><input type="text" id="adv-designation" disabled></div>
            <div class="locked-field"><label>Department</label><input type="text" id="adv-department" disabled></div>
          </div>
          <div class="field-editable"><label>Purpose of Travel *</label><input type="text" id="adv-purpose" placeholder="e.g. Client visits — ONGC/BPCL region"></div>
          <div class="row-2">
            <div class="field-editable"><label>Travel From (Place) *</label><input type="text" id="adv-travel-from" placeholder="e.g. Bengaluru"></div>
            <div class="field-editable"><label>Travel To (Place) *</label><input type="text" id="adv-travel-to" placeholder="e.g. Mumbai"></div>
          </div>
          <div class="row-2">
            <div class="field-editable"><label>Date From *</label><input type="date" id="adv-date-from"></div>
            <div class="field-editable"><label>Date To *</label><input type="date" id="adv-date-to"></div>
          </div>

          <div class="aef-section-title">1. Out-station Travelling &mdash; By Flight / Train / Bus (Actuals, attach tickets)</div>
          <div id="adv-travel-rows"></div>
          <div class="aef-subtotal-bar"><span>Sub-total &mdash; Out-station Travel (Rs.)</span><span id="adv-outstation-subtotal">₹0</span></div>

          <div class="aef-section-title">2. Boarding &amp; Lodging (Per Company-Defined Daily Limits)</div>
          <div class="row-2">
            <div class="locked-field"><label>Designation (auto)</label><input type="text" id="adv-bl-designation" disabled></div>
            <div class="field-editable"><label>No. of Days (Outstation) &mdash; enter manually</label><input type="number" id="adv-days-bl" min="0" step="1" placeholder="0"></div>
          </div>
          <div class="row-2">
            <div class="locked-field"><label>Daily Lodging Limit (Rs./day)</label><input type="text" id="adv-lodging-limit" disabled></div>
            <div class="locked-field"><label>Daily Food Limit (Rs./day)</label><input type="text" id="adv-food-limit" disabled></div>
          </div>
          <div class="row-2">
            <div class="field-editable"><label>Lodging Amount (Rs.) &mdash; enter manually</label><input type="number" id="adv-lodging-amount" min="0" step="0.01" placeholder="0"></div>
            <div class="field-editable"><label>Food Amount (Rs.) &mdash; enter manually</label><input type="number" id="adv-food-amount" min="0" step="0.01" placeholder="0"></div>
          </div>
          <div class="aef-subtotal-bar"><span>Sub-total &mdash; Boarding &amp; Lodging (Rs.)</span><span id="adv-boarding-subtotal">₹0</span></div>
          <label>Upload Bills (Boarding &amp; Lodging) &mdash; JPG, JPEG, PNG or PDF, max 5&nbsp;MB each</label>
          <input type="file" id="adv-bl-bills-input" accept=".jpg,.jpeg,.png,.pdf" multiple>
          <div id="adv-bl-bills-preview" class="bill-preview-list"></div>

          <div class="aef-section-title">3. Local Travelling Allowance</div>
          <div class="row-2">
            <div class="field-editable"><label>Travelling Allowance &mdash; Per Day (Rs.)</label><input type="number" id="adv-ta-per-day" min="0" step="0.01" placeholder="0"></div>
            <div class="field-editable"><label>No. of TA Days</label><input type="number" id="adv-days-ta" min="0" step="1" placeholder="0"></div>
          </div>
          <div class="field-editable"><label>TA Amount (Rs.) &mdash; enter manually</label><input type="number" id="adv-ta-amount" min="0" step="0.01" placeholder="0"></div>
          <div class="row-2">
            <div class="field-editable">
              <label>Own Vehicle Used?</label>
              <select id="adv-own-vehicle-used"><option value="no">No</option><option value="yes">Yes</option></select>
            </div>
            <div class="field-editable" id="adv-vehicle-rate-wrap"><label>Own Vehicle Rate (Rs./km) *</label><input type="number" id="adv-vehicle-rate" min="0" step="0.01" placeholder="Enter rate per km"></div>
          </div>
          <div class="field-editable" id="adv-km-wrap"><label>Kilometres Travelled (Own Vehicle)</label><input type="number" id="adv-km" min="0" placeholder="0"></div>
          <div class="field-editable" id="adv-vehicle-amount-wrap"><label>Own Vehicle Amount (Rs.) &mdash; enter manually</label><input type="number" id="adv-vehicle-amount" min="0" step="0.01" placeholder="0"></div>
          <div id="adv-other-transport-wrap" class="row-3 field-editable hidden">
            <div><label>Taxi &mdash; Total Amount (₹)</label><input type="number" id="adv-taxi-amount" min="0" placeholder="0"></div>
            <div><label>Rented Vehicle &mdash; Total Amount (₹)</label><input type="number" id="adv-rented-amount" min="0" placeholder="0"></div>
            <div><label>Auto &mdash; Total Amount (₹)</label><input type="number" id="adv-auto-amount" min="0" placeholder="0"></div>
          </div>
          <div class="field-editable" id="adv-local-note-wrap"><label>Local Travelling Note * <span class="rate-hint">(required when any local travelling is claimed)</span></label><textarea id="adv-local-note" rows="2" maxlength="1000" placeholder="e.g. Client visits — Peenya, Dabaspet; site survey at Kachohalli"></textarea></div>
          <div class="aef-subtotal-bar"><span>Sub-total &mdash; Local Travelling Allowance (Rs.)</span><span id="adv-local-subtotal">₹0</span></div>
          <label>Upload Bills (Local Travelling) &mdash; JPG, JPEG, PNG or PDF, max 5&nbsp;MB each</label>
          <input type="file" id="adv-lt-bills-input" accept=".jpg,.jpeg,.png,.pdf" multiple>
          <div id="adv-lt-bills-preview" class="bill-preview-list"></div>

          <div class="aef-section-title">Advance Requested</div>
          <div class="detail-row"><span class="detail-label">1. Out-station Travelling</span><span class="detail-value" id="adv-sum-1">₹0</span></div>
          <div class="detail-row"><span class="detail-label">2. Boarding &amp; Lodging</span><span class="detail-value" id="adv-sum-2">₹0</span></div>
          <div class="detail-row"><span class="detail-label">3. Local Travelling Allowance</span><span class="detail-value" id="adv-sum-3">₹0</span></div>
          <div class="aef-total-bar"><span>TOTAL ADVANCE REQUESTED (Rs.)</span><span id="adv-grand-total">₹0</span></div>

          <div class="aef-section-title">Approval</div>
          <div class="detail-row"><span class="detail-label">Employee Signature &amp; Date</span><span class="detail-value" id="adv-appr-employee">—</span></div>
          <div class="detail-row"><span class="detail-label">Reporting Manager Signature &amp; Date</span><span class="detail-value" id="adv-appr-manager">—</span></div>
          <div class="detail-row"><span class="detail-label">Accounts/Finance Approval &amp; Date</span><span class="detail-value" id="adv-appr-accounts">—</span></div>
          <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" id="adv-status-pill">—</span></div>
          <div id="adv-approve-actions" class="hidden" style="display:flex;gap:8px;margin-top:10px;">
            <button class="btn-small" id="btn-adv-approve" style="border-color:var(--success);color:var(--success);">Approve</button>
            <button class="btn-small" id="btn-adv-reject" style="border-color:var(--error);color:var(--error);">Reject</button>
          </div>

          <p class="aef-legend">Legend: Yellow cells = fields to fill in for this trip. Lodging/food limits, TA, and own-vehicle rate are pulled automatically from the Rate Master based on Designation.</p>
        </div>
      </div>

      <div class="modal-footer sticky-footer">
        <button class="btn-small" id="btn-adv-back-to-list">Back to List</button>
        <button class="btn-small hidden" id="btn-adv-export">Export Excel</button>
        <button class="btn-small hidden" id="btn-adv-print">Print / Save as PDF</button>
        <button class="btn-small hidden" id="btn-adv-report-pdf">Download PDF</button>
        <button class="btn-small hidden" id="btn-adv-report-print">Print Report</button>
        <button class="btn-primary hidden" id="btn-adv-save" style="width:auto;padding:10px 20px;">Submit Request</button>
      </div>
    </div>
  </div>

  <!-- ---------- ASSIGN TASK MODAL ---------- -->
  <div class="modal-overlay hidden" id="assign-task-modal">
    <div class="modal-card">
      <div class="modal-header">
        <h3 id="assign-task-title">Assign Task</h3>
        <button class="modal-close" id="assign-task-close" aria-label="Close">&times;</button>
      </div>

      <div class="modal-body">
        <label>Assign To *</label>
        <select id="at-assignee"></select>
        <label>Title *</label>
        <input type="text" id="at-title" placeholder="e.g. Follow up with ONGC on pending quotation">
        <label>Description (optional)</label>
        <textarea id="at-description" placeholder="Any extra detail"></textarea>
        <label>Due Date (optional)</label>
        <input type="date" id="at-due-date">
        <p class="error-msg" id="at-error"></p>
      </div>

      <div class="modal-footer">
        <button class="btn-small" id="btn-at-cancel">Cancel</button>
        <button class="btn-primary" id="btn-at-save" style="width:auto;margin-top:0;padding:10px 22px;display:inline-block;">Save</button>
      </div>
    </div>
  </div>

  <script src="assets/js/app.js?v=<?php echo filemtime(__DIR__ . '/assets/js/app.js'); ?>"></script>
  <!-- PWA shell: icons, banners, install, service worker (embedded) -->
  <script>
/* Sales Reporter — PWA shell.
 * Runs after the original app.js. It only adds things around the app:
 * line icons + sidebar brand, install / update / offline banners, and
 * the service worker. It never changes app logic or data.
 * APP_VERSION is stamped by scripts/build.mjs.
 */
(function () {
  'use strict';
  var APP_VERSION = '2.0.0';
  window.SR_PWA_VERSION = APP_VERSION;

  var svg = function (body) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  var ICONS = {
    home: svg('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>'),
    visit: svg('<path d="M12 21s-7-5.6-7-11.2A7 7 0 0 1 19 9.8C19 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.6"/>'),
    expense: svg('<path d="M12 2v20M17 5.5c0-1.6-2-2.5-5-2.5S7 4 7 5.8s2 2.4 5 2.9 5 1.3 5 3-2 2.8-5 2.8-5-.9-5-2.5"/>'),
    tasks: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    plans: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
    reports: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    salesdata: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    logbook: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>'),
    receipt: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  };

  function $(id) { return document.getElementById(id); }

  // ---------- icons + brand (presentation only) ----------
  function decorateNav() {
    var bar = document.querySelector('.tab-bar');
    if (!bar) return;
    Array.prototype.forEach.call(bar.querySelectorAll('.tab-btn'), function (b) {
      var key = b.dataset.view || (b.id === 'btn-open-logbook' ? 'logbook' : '');
      var span = b.querySelector('span');
      if (span && ICONS[key]) { span.innerHTML = ICONS[key]; span.setAttribute('aria-hidden', 'true'); }
      if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', b.textContent.trim());
    });
    if (!bar.querySelector('.side-brand')) {
      var brand = document.createElement('div');
      brand.className = 'side-brand';
      brand.innerHTML = '<img src="https://gajananhs.github.io/salesreport/assets/icons/icon-192.png" alt="" width="38" height="38"><div><b>Sales Reporter</b><small>FIELD · VISITS · SPEND</small></div>';
      bar.insertBefore(brand, bar.firstChild);
    }
    var qa = { 'qa-visit': ICONS.visit, 'qa-expense': ICONS.receipt, 'qa-plan': ICONS.plans };
    Object.keys(qa).forEach(function (id) {
      var el = $(id) && $(id).querySelector('.action-icon');
      if (el) el.innerHTML = qa[id];
    });
    var edge = function () { bar.classList.toggle('at-end', bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 2); };
    bar.addEventListener('scroll', edge, { passive: true });
    window.addEventListener('resize', edge);
    edge();
    // keep the active tab visible on phones and start each tab at the top
    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.tab-btn');
      if (!b || !b.dataset.view) return;
      window.scrollTo(0, 0);
      if (b.scrollIntoView && window.innerWidth < 600) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  // ---------- banners ----------
  var state = { offline: !navigator.onLine, update: false, install: false };
  var deferredPrompt = null;
  var waitingWorker = null;
  var updateRequested = false;

  function paintBanner() {
    var host = $('pwa-banner');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pwa-banner';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.insertBefore(host, document.body.firstChild);
      host.addEventListener('click', onBannerClick);
    }
    var html = '';
    if (state.offline) html += '<div class="pb off"><span>You\'re offline — Sales Reporter needs a connection to load and save data. It will work again as soon as you reconnect.</span></div>';
    if (state.update) html += '<div class="pb"><span>A new version of the app is ready.</span><button type="button" data-act="update">Reload</button></div>';
    if (state.install && !state.update) html += '<div class="pb"><span>Install Sales Reporter on this device for one-tap access.</span><span><button type="button" data-act="install">Install</button> <button type="button" class="x" data-act="dismiss" aria-label="Dismiss">✕</button></span></div>';
    host.innerHTML = html;
  }

  function onBannerClick(e) {
    var act = e.target.closest && e.target.closest('[data-act]');
    if (!act) return;
    act = act.dataset.act;
    if (act === 'update') {
      if (!waitingWorker) { location.reload(); return; }
      updateRequested = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    if (act === 'install' && deferredPrompt) {
      var p = deferredPrompt; deferredPrompt = null;
      p.prompt();
      p.userChoice.finally(function () { state.install = false; paintBanner(); });
    }
    if (act === 'dismiss') {
      state.install = false; paintBanner();
      try { localStorage.setItem('sr_install_dismissed', '1'); } catch (_) { /* ignore */ }
    }
  }

  window.addEventListener('online', function () { state.offline = false; paintBanner(); });
  window.addEventListener('offline', function () { state.offline = true; paintBanner(); });
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var dismissed = false;
    try { dismissed = localStorage.getItem('sr_install_dismissed') === '1'; } catch (_) { /* ignore */ }
    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    state.install = !dismissed && !standalone;
    paintBanner();
  });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; state.install = false; paintBanner(); });

  // ---------- service worker ----------
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var go = function () {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(function (reg) {
        var track = function (w) {
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) { waitingWorker = w; state.update = true; paintBanner(); }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; state.update = true; paintBanner(); }
        reg.addEventListener('updatefound', function () { if (reg.installing) track(reg.installing); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
      }).catch(function (err) { console.warn('Service worker registration failed:', err); });
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading || !updateRequested) return;
      reloading = true;
      location.reload();
    });
  }

  // Friendlier text when the server can't be reached (network down or the
  // server's api/.htaccess CORS file missing). Presentation only.
  function explainNetworkErrors() {
    var msg = 'Can\u2019t reach the Sales Reporter server. Check your internet connection. ' +
      'If this keeps happening, the server needs its one-time setup file (api/.htaccess) \u2014 see the README.';
    ['login-error', 'register-error', 'forgot-error'].forEach(function (id) {
      var el = $(id);
      if (!el || !window.MutationObserver) return;
      new MutationObserver(function () {
        if (/failed to fetch|networkerror|load failed/i.test(el.textContent)) el.textContent = msg;
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  decorateNav();
  explainNetworkErrors();
  paintBanner();
  registerSW();
})();

  </script>
</body>
</html>