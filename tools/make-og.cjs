// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例だけ（例の町で、たのんだ1人から100人全員へ広がった図）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const G = require(path.join(__dirname, "..", "data.js"));
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
// 例の町：練習の町（p0mix|og）。図は、全員に届く置き方の1つで逃げた手（qa/run.mjs が、この置き方で100人全員に届くかを見る）
const EX = { tag: "p0mix|og" };
const P = G.make(EX.tag), ANS = P.sols[0], A = G.parseAt(ANS), T = G.spread(P.g, A.at, A.role);
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:40px 56px;background:#f3efe4;color:#1d2a3f;display:flex;gap:40px;align-items:center">
    <div style="flex:0 0 520px">
      <div style="font-size:28px;color:#83261a;letter-spacing:.06em">率先避難者と声かけのパズル</div>
      <div style="font-size:76px;font-weight:900;margin-top:8px;line-height:1.15;color:#123554">100人の町<br><span style="color:#b23a24">ドミノ</span></div>
      <div style="font-size:32px;margin-top:14px;line-height:1.5">1人にたのんで、<br>町の100人全員を逃がそう</div>
      <div style="font-size:24px;margin-top:18px;color:#4c5568">見て逃げる人・声で逃げる人・2人で逃げる人</div>
    </div>
    <div style="flex:1;background:#fffdf7;border:4px solid #1d2a3f;border-radius:8px;padding:14px;display:flex;justify-content:center">
      ${G.gridSvg(P, { t: T, at: A.at, role: A.role }).replace("<svg ", '<svg width="500" height="500" ')}
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
