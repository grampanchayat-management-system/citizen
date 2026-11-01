/* ─────────────────────────────────────────────────────────────────────────
   📄 दाखला → PDF  (नागरिक ॲप)
   सॉफ्टवेअरच्या "प्रिंट / PDF" सारखाच निकाल: A4, फक्त २ मिमी मार्जिन, दाखला एकाच पानात
   (जन्म, मृत्यू, विवाह, BPL, येणे-बाकी-नाही, निराधार, नमुना ८ = एक पान; पान भरून येतो).
   ॲपला मिळालेला दाखल्याचा HTML (certHtml) लपवलेल्या iframe मध्ये मांडतो → html2canvas ने चित्र →
   साध्या PDF मध्ये ठेवतो. बाहेरची PDF library लागत नाही (फक्त html2canvas.bundle.js).
   वापर:  certPdfMake(r) → Promise<{blob,name,title}>   |   certPdfDeliver(res) → Promise
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var SINGLE = { n8: 1, birth: 1, death: 1, vivah: 1, bpl: 1, nodue: 1, niradhar: 1 }; // सॉफ्टवेअरच्या singleDocIds प्रमाणेच
  var IN = 96;                                  // CSS px प्रति इंच
  var A4 = { w: 8.27, h: 11.69 };               // इंच

  function h2cLoad() {
    return new Promise(function (res, rej) {
      if (window.html2canvas) return res();
      var s = document.createElement('script');
      s.src = 'html2canvas.bundle.js';
      s.onload = function () { window.html2canvas ? res() : rej(new Error('html2canvas उपलब्ध नाही')); };
      s.onerror = function () { rej(new Error('PDF साधन (html2canvas) लोड झाले नाही — इंटरनेट तपासा')); };
      document.head.appendChild(s);
    });
  }

  // सॉफ्टवेअरच्या printDiv() मधील तेच CSS (नमुना ८ इ. वर्ग-आधारित दाखल्यांसाठी) — @page वगळून
  function baseCss(single, land) {
    var fs = single ? (land ? '10px' : '13px') : (land ? '8.5px' : '11px'), lh = single ? '2.1' : '1.8';
    return 'html,body{margin:0;padding:0;background:#fff}' +
      'body{font-family:Mangal,"Noto Serif Devanagari","Noto Sans Devanagari","Times New Roman",serif;font-size:' + fs + ';line-height:' + lh + '}' +
      '.doc{border:1px solid #999;padding:' + (single ? '8px' : (land ? '6px' : '10px')) + ';margin:0 auto;box-sizing:border-box;width:100%}' +
      '.cert-box{border:2px solid #333;padding:' + (single ? '10px' : '12px') + ';margin:0 auto}' +
      '.doc-hdr{text-align:center;margin-bottom:8px;background:#d9d9d9;padding:10px 14px;border-radius:4px}' +
      '.doc-div{border:none;border-top:2px double #003;margin:4px 0}' +
      '.dtable{width:100%;border-collapse:collapse;font-size:' + (land ? '8px' : '10px') + ';margin:4px 0}' +
      '.dtable th,.dtable td{border:1px solid #999;padding:3px 5px}' +
      '.dtable th{background:#f0f0f0;font-weight:700;text-align:center}' +
      '.dtable td.c{text-align:center}.dtable td.r{text-align:right}' +
      '.dtable .hl{background:#fffbf0;font-weight:700}.dtable .tot{background:#fff3cd;font-weight:700}' +
      '.doc-ftr{display:flex;justify-content:space-between;margin-top:14px}' +
      '.doc-sign{margin-right:0.5in;max-width:2.6in}' +
      '.sign-ln{border-top:1px solid #333;margin-top:28px;padding-top:3px;font-size:10px;text-align:center}' +
      '.logo-ph{width:55px;height:55px;border:3px double #D4A017;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;text-align:center;font-weight:700;color:#0D2B5E}' +
      'table th{font-weight:700!important}';
  }


  // html2canvas ला CSS `writing-mode` (उभे हेडिंग — नमुना ८ मधील) येत नाही; म्हणून अशा मजकुराला आधी स्वतः
  // (canvas वर, खालून वर वाचला जाईल असा) चित्र बनवून जागेवर बसवतो — मांडणी व उंची तीच राहते.
  function rasterVertical(doc) {
    var els = [].slice.call(doc.querySelectorAll('[style*="writing-mode"]'));
    els.forEach(function (el) {
      try {
        var cs = doc.defaultView.getComputedStyle(el), txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) return;
        var fsz = parseFloat(cs.fontSize) || 12, font = (cs.fontWeight || '700') + ' ' + fsz + 'px ' + cs.fontFamily;
        var m = document.createElement('canvas').getContext('2d'); m.font = font;
        var tw = Math.ceil(m.measureText(txt).width), lh = Math.ceil(fsz * 1.2), K = 3;
        var c = document.createElement('canvas'); c.width = lh * K; c.height = tw * K;
        var g = c.getContext('2d'); g.scale(K, K); g.translate(0, tw); g.rotate(-Math.PI / 2);
        g.font = font; g.fillStyle = cs.color || '#000'; g.textBaseline = 'middle'; g.fillText(txt, 0, lh / 2);
        var im = doc.createElement('img'); im.src = c.toDataURL('image/png');
        im.style.cssText = 'display:inline-block;vertical-align:middle;width:' + lh + 'px;height:' + tw + 'px';
        el.parentNode.replaceChild(im, el);
      } catch (e) { /* चूक झाली तरी PDF बनतोच */ }
    });
  }

  function waitImages(doc, ms) {
    return new Promise(function (res) {
      var imgs = [].slice.call(doc.images || []), left = imgs.length, done = false;
      var fin = function () { if (!done) { done = true; res(); } };
      if (!left) return fin();
      setTimeout(fin, ms || 5000);
      imgs.forEach(function (im) {
        if (im.complete) { if (--left === 0) fin(); return; }
        var one = function () { if (--left === 0) fin(); };
        im.addEventListener('load', one); im.addEventListener('error', one);
      });
    });
  }

  function b64ToBytes(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function canvasJpeg(cv) { return b64ToBytes(cv.toDataURL('image/jpeg', 0.93).split(',')[1]); }

  // ── अगदी साधा PDF लेखक: प्रत्येक पानावर एक JPEG ──
  function ascii(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  function hexUtf16(s) { var h = 'FEFF'; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i).toString(16); h += ('0000' + c).slice(-4); } return h; }
  function pdfBuild(pages, pwPt, phPt, title) {
    var chunks = [], offs = [], len = 0;
    function push(u) { chunks.push(u); len += u.length; }
    function pushS(s) { push(ascii(s)); }
    function obj(n, fn) { offs[n] = len; pushS(n + ' 0 obj\n'); fn(); pushS('\nendobj\n'); }
    var N = pages.length, total = 3 + N * 3;      // 1 Catalog, 2 Pages, 3 Info, मग प्रत्येक पानाचे ३ (page, content, image)
    push(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])); // %PDF-1.4 + binary marker
    obj(1, function () { pushS('<< /Type /Catalog /Pages 2 0 R >>'); });
    var kids = []; for (var i = 0; i < N; i++) kids.push((4 + i * 3) + ' 0 R');
    obj(2, function () { pushS('<< /Type /Pages /Count ' + N + ' /Kids [' + kids.join(' ') + '] >>'); });
    obj(3, function () { pushS('<< /Title <' + hexUtf16(title || 'दाखला') + '> /Producer (Majhi Grampanchayat) >>'); });
    pages.forEach(function (p, k) {
      var pn = 4 + k * 3, cn = pn + 1, inn = pn + 2;
      obj(pn, function () {
        pushS('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pwPt.toFixed(2) + ' ' + phPt.toFixed(2) + '] /Resources << /XObject << /Im0 ' + inn + ' 0 R >> >> /Contents ' + cn + ' 0 R >>');
      });
      var cs = 'q ' + p.wPt.toFixed(2) + ' 0 0 ' + p.hPt.toFixed(2) + ' ' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' cm /Im0 Do Q';
      obj(cn, function () { pushS('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'); });
      obj(inn, function () {
        pushS('<< /Type /XObject /Subtype /Image /Width ' + p.wPx + ' /Height ' + p.hPx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
        push(p.jpeg); pushS('\nendstream');
      });
    });
    var xref = len;
    pushS('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
    for (var n = 1; n <= total; n++) pushS(('0000000000' + offs[n]).slice(-10) + ' 00000 n \n');
    pushS('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  // ── मुख्य: r = ॲप-मागणी नोंद (certHtml, dk, land, kind, certNo, code) ──
  function certPdfMake(r) {
    if (!r || !r.certHtml) return Promise.reject(new Error('दाखला उपलब्ध नाही'));
    var land = !!r.land;
    var single = r.kind !== 'tax' && !!SINGLE[r.dk];
    var m = single ? 0.03 : (land ? 6 / 25.4 : 8 / 25.4);               // सॉफ्टवेअरचे मार्जिन (इंच): एकल-पानी २ मिमी
    var pw = land ? A4.h : A4.w, ph = land ? A4.w : A4.h;
    var W = (pw - 2 * m) * IN, H = (ph - 2 * m) * IN;                    // छापण्यायोग्य जागा (px)
    var mz = (r.dk === 'bpl' || r.dk === 'nodue' || r.dk === 'niradhar') ? 1.1 : 2.2;
    var S = Math.min(2.5, Math.sqrt(9e6 / (W * H)));                      // चित्राची स्पष्टता (≈ २४० dpi)
    var fr, wrap, doc;

    return h2cLoad().then(function () {
      fr = document.createElement('iframe');
      fr.setAttribute('sandbox', 'allow-same-origin');                   // दाखल्यातील कोणतीही स्क्रिप्ट चालणार नाही
      fr.style.cssText = 'position:fixed;left:-20000px;top:0;width:2600px;height:3200px;border:0;visibility:hidden';
      document.body.appendChild(fr);
      doc = fr.contentDocument;
      doc.open();
      doc.write('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="script-src \'none\'"><style>' +
        baseCss(single, land) + '</style></head><body><div id="w">' + r.certHtml + '</div></body></html>');
      doc.close();
      return waitImages(doc, 6000);
    }).then(function () {
      return (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).catch(function () {});
    }).then(function () {
      wrap = doc.getElementById('w');
      rasterVertical(doc);
      var body = doc.body, el = wrap.querySelector('.doc') || wrap.querySelector('.cert-box') || wrap.firstElementChild;
      var z = 1, multi = !single;
      function hAt(zz) { body.style.width = (W / zz) + 'px'; if (el) el.style.minHeight = '0px'; return wrap.getBoundingClientRect().height * zz; } // पानावरील (zoom नंतरची) उंची
      if (single) {
        // सॉफ्टवेअरसारखेच: दाखला एका पानात मावेपर्यंत / पान भरेपर्यंत zoom शोधतो (०.५५ ते कमाल)
        var lo = 0.55, hi = mz, lim = H * 0.97;
        if (hAt(lo) > lim) { multi = true; }                              // अपवाद: खूपच मोठा मजकूर → अनेक पाने
        else {
          for (var t = 0; t < 14; t++) { var mid = (lo + hi) / 2; if (hAt(mid) <= lim) lo = mid; else hi = mid; }
          z = lo; hAt(z);
          if (el) el.style.minHeight = Math.floor((H * 0.975) / z) + 'px';  // पान भरून (तळापर्यंत बॉर्डर)
        }
      }
      if (multi) { z = 1; hAt(1); }
      var cssW = W / z, cssH = wrap.getBoundingClientRect().height;
      return window.html2canvas(wrap, {
        scale: z * S, backgroundColor: '#ffffff', useCORS: true, logging: false,
        width: cssW, height: cssH, windowWidth: Math.ceil(cssW) + 20, windowHeight: Math.ceil(cssH) + 20, scrollX: 0, scrollY: 0
      }).then(function (cv) { return { cv: cv, z: z, multi: multi, cssH: cssH }; });
    }).then(function (o) {
      var cv = o.cv, pages = [], PT = 72;
      var wPt = (pw - 2 * m) * PT, mPt = m * PT, pwPt = pw * PT, phPt = ph * PT;
      var pxPerPt = cv.width / wPt;                                       // चित्र-px प्रति pt
      var pageHpx = Math.floor((ph - 2 * m) * PT * pxPerPt);              // एका पानाची चित्र-उंची
      var count = o.multi ? Math.max(1, Math.ceil(cv.height / pageHpx)) : 1;
      for (var i = 0; i < count; i++) {
        var sy = i * pageHpx, sh = o.multi ? Math.min(pageHpx, cv.height - sy) : cv.height, c2 = cv;
        if (o.multi && count > 1) {
          c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = sh;
          var cx = c2.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c2.width, c2.height);
          cx.drawImage(cv, 0, sy, cv.width, sh, 0, 0, cv.width, sh);
        }
        var hPt = sh / pxPerPt;
        pages.push({ jpeg: canvasJpeg(c2), wPx: c2.width, hPx: c2.height, wPt: wPt, hPt: hPt, x: mPt, y: phPt - mPt - hPt });
      }
      var base = (r.kind === 'tax' ? 'Pavati-' : 'Dakhala-') + String(r.certNo || r.code || Date.now()).replace(/[^\w.-]+/g, '_');
      var title = (r.kind === 'tax' ? 'पावती-' : 'दाखला-') + (r.certNo || r.code || '');
      return { blob: pdfBuild(pages, pwPt, phPt, title), name: base + '.pdf', title: title, pages: count };
    }).then(function (res) { if (fr && fr.parentNode) fr.parentNode.removeChild(fr); return res; },
            function (e) { if (fr && fr.parentNode) fr.parentNode.removeChild(fr); throw e; });
  }

  // ── पोहोच: APK मध्ये Share/Save शीट, ब्राउझर/PWA मध्ये थेट डाउनलोड ──
  function blobB64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1]); };
      fr.onerror = function () { rej(fr.error || new Error('फाईल वाचता आली नाही')); };
      fr.readAsDataURL(blob);
    });
  }
  function browserDownload(res) {
    var url = URL.createObjectURL(res.blob), a = document.createElement('a');
    a.href = url; a.download = res.name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { try { document.body.removeChild(a); } catch (e) {} URL.revokeObjectURL(url); }, 60000);
    return 'saved';
  }
  function certPdfDeliver(res) {
    var C = window.Capacitor;
    if (C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) {
      var FS = C.registerPlugin('Filesystem'), SH = C.registerPlugin('Share');
      return blobB64(res.blob).then(function (b64) {
        return FS.writeFile({ path: res.name, data: b64, directory: 'CACHE' });
      }).then(function (w) {
        return SH.share({ title: res.title, url: w.uri, dialogTitle: 'PDF जतन करा / पाठवा' }).then(function () { return 'shared'; },
          function (e) { if (/cancel/i.test(String(e && (e.message || e)))) return 'cancelled'; throw e; });
      }).catch(function (e) { console.warn('native save failed', e); return browserDownload(res); });
    }
    return Promise.resolve(browserDownload(res));
  }
  function certPdfOpen(res) {                                              // "प्रिंट": PDF नव्या टॅबमध्ये (तिथून प्रिंट)
    var url = URL.createObjectURL(res.blob), w = window.open(url, '_blank');
    if (!w) location.href = url;
    setTimeout(function () { URL.revokeObjectURL(url); }, 300000);
    return Promise.resolve('opened');
  }

  window.certPdfMake = certPdfMake;
  window.certPdfDeliver = certPdfDeliver;
  window.certPdfOpen = certPdfOpen;
  window.certPdfBuild = pdfBuild;
})();
