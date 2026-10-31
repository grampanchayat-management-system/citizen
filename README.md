# 📲 माझी ग्रामपंचायत (नागरिक ॲप) — Android APK

1. GitHub वर **नवी private repository** बनवा (उदा. `gp-citizen-apk`).
2. या फोल्डरमधील **सर्व फाईली** अपलोड करा — विशेषतः लपवलेला `.github` फोल्डर, `signing`, `www` (आतला `dir` फोल्डर ३६ फाईल्ससह) व `icons-android`. (Git / GitHub Desktop वापरणे सोपे; वेब drag-drop मध्ये `.github` सुटू शकतो.)
3. **Actions** टॅब → **Build Citizen APK** → **Run workflow** (८–१२ मिनिटे).
4. पूर्ण झाल्यावर run मध्ये खाली **Artifacts → MajhiGramPanchayat-APK** डाउनलोड करा → आतली `MajhiGramPanchayat.apk` फोनवर पाठवून Install करा.

## नवीन ग्रामपंचायत जोडल्यावर APK पुन्हा बनवायची गरज नको
`www/config.js` मध्ये तुमची GitHub Pages लिंक भरा (उदा. `window.GP_REMOTE="https://युजर.github.io/repo/";`) आणि तिथे नागरिक ॲप (`directory.json` सह) प्रकाशित ठेवा. मग `gps` यादी तिथून वाचली जाते; गावांची LGD यादी APK मध्येच आहे. रिकामे ठेवल्यास APK मधील `directory.json` वापरली जाते (त्या वेळी नवे गाव जोडल्यावर APK पुन्हा बनवा).

## टीप
- `signing/citizen-release.p12` ही APK ची कायमची सही-की आहे (अपडेटवर डेटा/लॉगिन टिकण्यासाठी). Repository **private** ठेवा; की गमावू नका.
- ही APK मी प्रत्यक्ष Gradle ने बनवून तपासलेली नाही; पहिल्या बिल्डमध्ये अडचण आल्यास Actions चा error लॉग पाठवा.
