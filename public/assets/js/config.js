// Sales Reporter PWA — server configuration.
//
// The app (this folder) is hosted on GitHub Pages; all data, login,
// approvals, e-mails, IndiaMART and Tally sync stay on the existing
// Sales Reporter server below. Change SERVER if the backend moves.
// It must end with a slash and must serve api/*.php with the CORS
// rules in server/api-cors.htaccess (see README).
window.SR_CONFIG = {
  SERVER: 'https://canaresonline.com/Salesreport1/',
};

// Testing only: a different backend can be set per browser with
//   localStorage.setItem('sr_server', 'https://staging.example.com/Salesreport/')
// and removed with localStorage.removeItem('sr_server').
(function () {
  try {
    var o = localStorage.getItem('sr_server');
    if (o && /^https?:\/\/.+\/$/.test(o)) window.SR_CONFIG.SERVER = o;
  } catch (e) { /* storage blocked — keep default */ }
})();
