// アプリのアイコン（icon-192.png・icon-512.png）を作る。紺の地に、3×3 の人のマスと、まん中の声をかける人から広がる印（100人の町ドミノ）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    const cells = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { const c = x === 1 && y === 1, near = (x === 1) !== (y === 1); cells.push(`<rect x="${14 + x * 25}" y="${14 + y * 25}" width="21" height="21" rx="5" fill="${c ? "#b23a24" : near ? "#21704a" : "#d3e6f7"}"/>`); }
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#123554"/>${cells.join("")}
      <path d="M44 50 L52 45 L52 55Z" fill="#fff"/><path d="M53 46 Q57 50 53 54" stroke="#fff" stroke-width="2" fill="none"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
