// पार्श्वभूमी (ॲप बंद असतानाही) सूचना तपासणी — Capacitor Background Runner मध्ये चालते (WebView/DOM नाही).
// दर ~१५ मिनिटांनी: गावाच्या Firestore मधून gpapp/notices वाचते, नवीन सूचना असल्यास फोनवर नोटिफिकेशन देते.
// ॲप (index.html) लॉगिननंतर 'gpSave' इव्हेंटने गाव/लॉगिन माहिती येथे देते; लॉगआउटवर 'gpClear'.
var FS = 'https://firestore.googleapis.com/v1', TOK = 'https://securetoken.googleapis.com/v1/token';

function kget(k) { try { var r = CapacitorKV.get(k); return (r && r.value) || null; } catch (e) { return null; } }
function kjson(k, d) { try { var v = kget(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function kset(k, v) { CapacitorKV.set(k, JSON.stringify(v)); }
function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 2000000000) + 1; }

// ॲपकडून: लॉगिन/गाव माहिती + ॲपने आधीच पाहिलेल्या सूचनांची यादी (दुहेरी नोटिफिकेशन टाळण्यासाठी)
addEventListener('gpSave', function (resolve, reject, args) {
  try {
    var a = args || {};
    if (a.p && a.k && a.rt) kset('c', { p: a.p, k: a.k, rt: a.rt, n: a.n || '' });
    if (a.seen && a.seen.length) {
      var cur = kjson('seen', []), have = {};
      cur.forEach(function (e) { have[e.i] = 1; });
      a.seen.forEach(function (id) { if (!have[id]) { cur.push({ i: String(id), k: 'n', t: 0 }); have[id] = 1; } });
      kset('seen', cur.slice(-100));
    }
    resolve();
  } catch (e) { reject(e); }
});

addEventListener('gpClear', function (resolve, reject) {
  try { CapacitorKV.remove('c'); CapacitorKV.remove('seen'); resolve(); } catch (e) { reject(e); }
});

// ॲप उघडताना: बॅकग्राउंडने आधीच दाखवलेल्या सूचना परत द्या (ॲपमध्ये पुन्हा आवाज/पॉपअप होऊ नये)
addEventListener('gpGetSeen', function (resolve) {
  resolve({ s: JSON.stringify(kjson('seen', [])) });
});

addEventListener('gpCheck', function (resolve, reject) {
  var c = kjson('c', null);
  if (!c) { resolve(); return; }
  var now = Date.now();
  fetch(TOK + '?key=' + encodeURIComponent(c.k), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(c.rt)
  }).then(function (r) {
    if (!r.ok) throw new Error('token ' + r.status);
    return r.json();
  }).then(function (t) {
    if (t.refresh_token && t.refresh_token !== c.rt) { c.rt = t.refresh_token; kset('c', c); }
    return fetch(FS + '/projects/' + encodeURIComponent(c.p) + '/databases/(default)/documents/gpapp/notices', { method: 'GET', headers: { Authorization: 'Bearer ' + t.id_token } });
  }).then(function (r) {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('notices ' + r.status);
    return r.json();
  }).then(function (d) {
    var list = [];
    try { var s = d && d.fields && d.fields.n && d.fields.n.stringValue; var a = JSON.parse(s || '[]'); if (Array.isArray(a)) list = a; } catch (e) { list = []; }
    var seenArr = kjson('seen', null), first = !seenArr; seenArr = seenArr || [];
    var seen = {}; seenArr.forEach(function (e) { seen[e.i] = 1; });
    var fresh = [];
    list.forEach(function (x) {
      if (!x || !x.i || !x.x || seen[x.i]) return;
      var age = now - new Date(x.ts).getTime(); if (isNaN(age)) age = 0;
      seenArr.push({ i: String(x.i), k: x.k === 'e' ? 'e' : 'n', t: now }); seen[x.i] = 1;
      if (first && !(x.k === 'e' && age < 900000)) return;     // पहिल्यांदा जुन्या सूचनांसाठी नोटिफिकेशन नको
      if (age > 24 * 3600000) return;                          // २४ तासांपेक्षा जुनी सूचना दाखवत नाही
      fresh.push({ x: x, age: age });
    });
    kset('seen', seenArr.slice(-100));
    fresh.sort(function (a, b) { return b.age - a.age; }); // जुनी आधी, नवीन शेवटी
    var nots = fresh.map(function (f) {
      var em = f.x.k === 'e', txt = String(f.x.x); if (txt.length > 400) txt = txt.slice(0, 397) + '…';
      return { id: hash(String(f.x.i)), title: em ? '🚨 आणीबाणी सूचना' : '📢 ' + (c.n || 'ग्रामपंचायत') + ' — सूचना', body: txt, channelId: em ? 'gp-alarm' : 'gp-info', autoCancel: true };
    });
    if (nots.length) CapacitorNotifications.schedule(nots);
    resolve({ n: nots.length });
  }).catch(function (e) { reject(e); });
});
