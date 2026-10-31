// "npx cap add android" नंतर चालतो: आयकॉन व versionCode टाकतो.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const appDir = path.join(root, 'android', 'app', 'src', 'main');

const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, px] of Object.entries(sizes)) {
  const src = path.join(root, 'icons-android', 'ic_launcher-' + px + '.png');
  const dir = path.join(appDir, 'res', 'mipmap-' + d);
  fs.mkdirSync(dir, { recursive: true });
  for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) fs.copyFileSync(src, path.join(dir, n));
}
const any = path.join(appDir, 'res', 'mipmap-anydpi-v26');
if (fs.existsSync(any)) fs.rmSync(any, { recursive: true, force: true });

const gradle = path.join(root, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
const vc = process.env.GITHUB_RUN_NUMBER || '1';
if (!/versionCode\s+\d+/.test(g)) throw new Error('build.gradle मध्ये versionCode सापडला नाही');
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + vc).replace(/versionName\s+"[^"]*"/, 'versionName "1.0.' + vc + '"');
fs.writeFileSync(gradle, g);
console.log('[prepare] versionCode', vc);
