// Hemcan — web dosyalarını (bir üst klasör) iOS kabuğunun www/ klasörüne kopyalar ve
// uygulamanın İNTERNETSİZ de düzgün görünmesi için dışarıdan yüklenen parçaları içine gömer:
//   * Tailwind (CDN'deki tarayıcı derleyicisi)  -> derleme sırasında hazır app.css
//   * Iconify simge bileşeni + kullanılan lucide simgeleri -> iconify-icon.min.js + icons-data.js
//   * Google Fonts (Space Grotesk, Manrope)    -> fonts.css + fonts/*.woff2
// Web sitesi (Netlify) bu dosyalara dokunmaz, olduğu gibi çalışmaya devam eder.
//
// Çalıştır:  cd native && npm ci && node scripts/sync-web.js && npx cap sync ios
const fs = require('fs'), path = require('path'), cp = require('child_process');

const nativeDir = path.resolve(__dirname, '..');
const src = path.resolve(nativeDir, '..');
const dst = path.join(nativeDir, 'www');
const nm = (...p) => path.join(nativeDir, 'node_modules', ...p);

const FILES = /\.(html|js|json|png|jpg|jpeg|svg|webp|ico|woff2?)$/i;
const SKIP = new Set(['service-worker.js', 'assetlinks.json', 'assetlinks-content.json', 'package.json', 'package-lock.json']);

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });

let n = 0;
for (const f of fs.readdirSync(src, { withFileTypes: true })) {
  if (f.isFile() && FILES.test(f.name) && !SKIP.has(f.name)) { fs.copyFileSync(path.join(src, f.name), path.join(dst, f.name)); n++; }
}
const iconsSrc = path.join(src, 'icons');
if (fs.existsSync(iconsSrc)) {
  fs.mkdirSync(path.join(dst, 'icons'), { recursive: true });
  for (const f of fs.readdirSync(iconsSrc)) { fs.copyFileSync(path.join(iconsSrc, f), path.join(dst, 'icons', f)); n++; }
}
console.log('www/ klasörüne ' + n + ' dosya kopyalandı.');
if (!fs.existsSync(path.join(dst, 'hosgeldin.html'))) { console.error('HATA: hosgeldin.html bulunamadı.'); process.exit(1); }

const pages = fs.readdirSync(dst).filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(path.join(dst, f), 'utf8');

// ---- 1) Tailwind: sayfalardaki satır içi yapılandırmayı al, bir kez derle -------------------------
const cfgRe = /<script>\s*tailwind\.config\s*=\s*(\{[\s\S]*?\n\s*\});?\s*<\/script>/;
const cdnRe = /[ \t]*<script src="https:\/\/cdn\.tailwindcss\.com[^"]*"><\/script>\n?/;
// En kapsamlı (en uzun) yapılandırmayı kullan; sayfalar arasında yalnızca grafik renkleri farklı.
let best = '';
for (const p of pages) { const m = read(p).match(cfgRe); if (m && m[1].length > best.length) best = m[1]; }
if (!best) { console.error('HATA: tailwind.config bulunamadı.'); process.exit(1); }
const theme = new Function('return (' + best + ')')().theme;
const cfgFile = path.join(nativeDir, 'scripts', 'tailwind.generated.cjs');
fs.writeFileSync(cfgFile, 'module.exports = ' + JSON.stringify({ content: [path.join(dst, '*.html'), path.join(dst, '*.js')], theme }, null, 2) + ';\n');
cp.execFileSync(process.execPath, [nm('tailwindcss', 'lib', 'cli.js'), '-c', cfgFile, '-i', path.join(__dirname, 'in.css'), '-o', path.join(dst, 'app.css'), '--minify'], { stdio: 'inherit' });
fs.rmSync(cfgFile);

// ---- 2) Simgeler -----------------------------------------------------------------------------------
const used = new Set();
for (const f of fs.readdirSync(dst)) {
  if (!/\.(html|js)$/.test(f)) continue;
  for (const m of fs.readFileSync(path.join(dst, f), 'utf8').matchAll(/lucide:([a-z0-9-]+)/g)) used.add(m[1]);
}
const lucide = JSON.parse(fs.readFileSync(nm('@iconify-json', 'lucide', 'icons.json'), 'utf8'));
const out = { prefix: 'lucide', width: lucide.width, height: lucide.height, icons: {}, aliases: {} };
const missing = [];
for (const name of [...used].sort()) {
  if (lucide.icons[name]) out.icons[name] = lucide.icons[name];
  else if (lucide.aliases && lucide.aliases[name]) {
    const a = lucide.aliases[name]; out.aliases[name] = a;
    if (lucide.icons[a.parent]) out.icons[a.parent] = lucide.icons[a.parent]; else missing.push(name);
  } else missing.push(name);
}
if (missing.length) console.warn('UYARI: lucide içinde bulunamayan simgeler:', missing.join(', '));
fs.copyFileSync(nm('iconify-icon', 'dist', 'iconify-icon.min.js'), path.join(dst, 'iconify-icon.min.js'));
fs.writeFileSync(path.join(dst, 'icons-data.js'),
  '(function(){var C=window.customElements&&customElements.get("iconify-icon");if(C&&C.addCollection)C.addCollection(' + JSON.stringify(out) + ');})();\n');
console.log('Simgeler: ' + used.size + ' kullanılıyor, ' + Object.keys(out.icons).length + ' gömüldü.');

// ---- 3) Yazı tipleri ---------------------------------------------------------------------------------
fs.mkdirSync(path.join(dst, 'fonts'), { recursive: true });
let fontCss = '';
for (const pkg of ['space-grotesk', 'manrope']) {
  const base = nm('@fontsource-variable', pkg);
  let css = fs.readFileSync(path.join(base, 'index.css'), 'utf8')
    .replace(/'(Space Grotesk|Manrope) Variable'/g, "'$1'")
    .replace(/url\(\.\/files\//g, 'url(fonts/');
  fontCss += css + '\n';
  for (const f of fs.readdirSync(path.join(base, 'files'))) fs.copyFileSync(path.join(base, 'files', f), path.join(dst, 'fonts', f));
}
fs.writeFileSync(path.join(dst, 'fonts.css'), fontCss);

// ---- 4) HTML'i yeniden yaz ---------------------------------------------------------------------------
let rewritten = 0;
for (const p of pages) {
  let s = read(p);
  const before = s;
  s = s.replace(cfgRe, '').replace(cdnRe, '    <link rel="stylesheet" href="app.css">\n');
  s = s.replace(/<script src="https:\/\/code\.iconify\.design[^"]*"><\/script>/, '<script src="iconify-icon.min.js"></script>\n  <script src="icons-data.js"></script>');
  s = s.replace(/<link rel="preconnect"[^>]*fonts[^>]*>\s*/g, '');
  s = s.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/, '<link rel="stylesheet" href="fonts.css">');
  if (s !== before) { fs.writeFileSync(path.join(dst, p), s); rewritten++; }
  if (/cdn\.tailwindcss|code\.iconify|fonts\.googleapis|fonts\.gstatic/.test(s)) console.warn('UYARI: ' + p + ' hâlâ dış kaynak içeriyor.');
}
console.log(rewritten + ' sayfa dış kaynaklardan arındırıldı.');
