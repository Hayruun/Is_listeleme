// `npm run build` ciktisini claude.ai Artifact olarak yayinlanabilecek tek bir
// HTML dosyasina (JS ve CSS gomulu) cevirir; veri dosyasi yaninda durur.
// Cikti: dist-artifact/performans-panosu.html ve dist-artifact/data/board.json
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const assets = readdirSync('dist/assets');
const read = (ext) => readFileSync(`dist/assets/${assets.find((f) => f.endsWith(ext))}`, 'utf8');
const js = read('.js').replace(/<\/script/gi, '<\\/script');
const css = read('.css').replace(/<\/style/gi, '<\\/style');

// Artifact iskeleti <html>/<head>/<body> etiketlerini kendisi ekler.
const html = `<title>2026 Performans Panosu</title>
<meta name="color-scheme" content="light dark" />
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;

mkdirSync('dist-artifact/data', { recursive: true });
writeFileSync('dist-artifact/performans-panosu.html', html);
copyFileSync('public/data/board.json', 'dist-artifact/data/board.json');
console.log(`dist-artifact/performans-panosu.html (${Math.round(html.length / 1024)} KB)`);
