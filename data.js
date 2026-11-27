// 100人の町ドミノの問題を作る（ブラウザと node の両方で使う）。
// 10×10 のマス目に100人が住む町。町の1人に「率先避難者」か「声をかける人」をたのむと、避難がドミノのようにとなりへ伝わる。
// 人によって逃げるきっかけがちがう（見て逃げる・声で逃げる・2人に言われたら逃げる）。全員に届く置き方を探すパズル。
// 決まりは遊びのための単純な決まりで、人の行動を測ったものではない（遊び方・「このゲームについて」・README に書く）。
// 率先避難者・声を掛け合う避難・呼びかけは、内閣府「避難情報に関するガイドライン」、広報誌「ぼうさい」（釜石の避難3原則）、
// 「住民の適切な避難行動の促進に向けた好事例集」、釜石市「指導者用防災教育プログラム」を 2026-11-27 に読んだ（引用は共有フォルダ games/hinan-domino-research.md）。
// 1問は、町の図を見て全員に届く置き方を探す（正解したら2段目「ア〜エのどこにたのむと全員に届く？」）か、資料に書いてあることの問いに答える。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回し・町の作り方・まちがいの選び肢は、足すだけでも過去の日の問題が変わる。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const N = 10; // 10×10＝100人

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    guide: ["内閣府「避難情報に関するガイドライン」（令和8年3月）", "https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/pdf/hinan_guideline_r8_1.pdf"],
    kohou: ["内閣府 広報誌「ぼうさい」（津波防災の日シンポジウム2011・釜石の避難3原則）", "https://www.bousai.go.jp/kohou/kouhoubousai/h23/65/news_06.html"],
    jirei: ["内閣府「住民の適切な避難行動の促進に向けた好事例集」（令和5年6月）", "https://www.bousai.go.jp/oukyu/hinankankoku/pdf/jumin_hinan.pdf"],
    kamaishi: ["釜石市防災課「釜石市 指導者用防災教育プログラム」", "https://www.jishin.go.jp/main/bosai/kyoiku-shien/01kamaishi/material/kmis_05.pdf"],
  };

  // ---- 町と避難の決まり（遊びのための単純な決まり）----
  // 町の人：m 見て逃げる人（となりに逃げた人がいれば逃げる）・v 声で逃げる人（となりから声をかけられれば逃げる）・w 2人で逃げる人（となりの2人以上から声をかけられれば逃げる）
  // たのむ役目：r 率先避難者（手0で逃げる。逃げる姿は見えるが、声はかけない）・k 声をかける人（手0でとなりに声をかける。逃げる姿は数えない）
  // 逃げた町の人は、次の手から、となり（上下左右）に姿も見え、声もかける（声を掛け合って逃げる）。たのんだ人のマスは、もとの人の決まりを使わない
  const PEOPLE = { m: { ch: "見", name: "見て逃げる人", rule: "となりの人が逃げるのを見たら逃げる" }, v: { ch: "声", name: "声で逃げる人", rule: "となりから声をかけられたら逃げる" }, w: { ch: "2", name: "2人で逃げる人", rule: "となりの2人以上に声をかけられたら逃げる" } };
  const ROLES = { r: { ch: "🏃", name: "率先避難者", sub: "まっ先に逃げる（姿を見せる）" }, k: { ch: "📣", name: "声をかける人", sub: "となりに声をかける" } };
  const nbOf = (c) => { const x = c % N, y = (c - x) / N, o = []; if (y > 0) o.push(c - N); if (x > 0) o.push(c - 1); if (x < N - 1) o.push(c + 1); if (y < N - 1) o.push(c + N); return o; };
  // 避難の広がり：各マスが逃げた手（たのんだ人は0。逃げなかった人は -1）を返す
  function spread(g, at, role) {
    const t = new Array(N * N).fill(-1), see = new Array(N * N).fill(0), voice = new Array(N * N).fill(0);
    t[at] = 0;
    for (const d of nbOf(at)) { if (role === "r") see[d]++; else voice[d]++; }
    let touched = nbOf(at), step = 0;
    for (;;) {
      step++;
      const next = [];
      for (const c of touched) { if (t[c] >= 0 || next.includes(c)) continue; const p = g[c]; if ((p === "m" && see[c] >= 1) || (p === "v" && voice[c] >= 1) || (p === "w" && voice[c] >= 2)) next.push(c); }
      if (!next.length) break;
      next.sort((a, b) => a - b);
      for (const c of next) t[c] = step;
      const tt = new Set();
      for (const c of next) for (const d of nbOf(c)) { see[d]++; voice[d]++; if (t[d] < 0) tt.add(d); }
      touched = [...tt].sort((a, b) => a - b);
    }
    return t;
  }
  const countOf = (t) => t.filter((x) => x >= 0).length;
  const stepsOf = (t) => Math.max(0, ...t);
  const keyAt = (role, at) => `${role}${at}`; // 置き方の名前（r12 は 2行3列に率先避難者）
  const parseAt = (s) => { const m = /^([rk])(\d{1,2})$/.exec(String(s)); return m && +m[2] < N * N ? { role: m[1], at: +m[2] } : null; };
  // 全員に届く置き方（200通りを全部ためす）。hi を超えたら、そこで止めて null（町を作るときに、多すぎる町を早く捨てる）
  // となりに動ける人がいない置き方（率先避難者のとなりに見の人がいない・声をかける人のとなりに声の人がいない）は、ためさなくても届かない
  function solve(g, hi = Infinity) {
    const out = [];
    for (const role of ["r", "k"]) for (let c = 0; c < N * N; c++) {
      if (!nbOf(c).some((d) => g[d] === (role === "r" ? "m" : "v"))) continue;
      if (countOf(spread(g, c, role)) === N * N) { out.push(keyAt(role, c)); if (out.length > hi) return null; }
    }
    return out;
  }
  const posStr = (at) => `${Math.floor(at / N) + 1}行${(at % N) + 1}列`;

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  const MEDIA = { town: "100人の町", sanko: "釜石の避難3原則", guide: "避難の呼びかけ" };

  // ---- 町をつくる ----
  // 住むところのまとまり：k 個の中心に「見」か「声」を決め、いちばん近い中心と同じ人にする（少しゆらす）
  function regions(R, k, pm) {
    const seeds = [];
    for (let i = 0; i < k; i++) seeds.push([ri(R, 0, N - 1), ri(R, 0, N - 1), R() < pm ? "m" : "v"]);
    const a = [];
    for (let c = 0; c < N * N; c++) {
      const x = c % N, y = (c - x) / N; let b = 0, bd = 1e9;
      for (let j = 0; j < k; j++) { const s = seeds[j], d = Math.abs(s[0] - x) + Math.abs(s[1] - y) + R() * 1.5; if (d < bd) { bd = d; b = j; } }
      a.push(seeds[b][2]);
    }
    return a;
  }
  const sprinkle = (R, a, p) => { for (let c = 0; c < N * N; c++) if (R() < p) a[c] = "w"; return a; };
  // 町を横切る「2人で逃げる人」の並び（行か列をまるごと）。片側からだけでは声が1人分しか届かず、こえられない
  function wall(R, a) { const row = R() < 0.5, at = ri(R, 2, N - 3); for (let i = 0; i < N; i++) a[row ? at * N + i : i * N + at] = "w"; return { row, at }; }
  function seg(R, a, w) { const len = ri(R, 3, 5), x0 = ri(R, 0, N - 1), y0 = ri(R, 0, N - 1); for (let j = 0; j < len; j++) { const x = w.row ? x0 : (x0 + j) % N, y = w.row ? (y0 + j) % N : y0; a[y * N + x] = "w"; } return a; }
  // 町の作り方（kind ごと）。R を引く回数は tag ごとに決まる
  const TOWN = {
    mix: (R) => sprinkle(R, regions(R, 6, 0.5), 0.05),
    mee: (R) => sprinkle(R, regions(R, 8, 0.75), 0.05),
    koe: (R) => sprinkle(R, regions(R, 8, 0.25), 0.05),
    two: (R) => sprinkle(R, regions(R, 8, 0.5), 0.55),
    twom: (R) => sprinkle(R, regions(R, 8, 0.8), 0.55),
    twov: (R) => sprinkle(R, regions(R, 8, 0.2), 0.55),
    line: (R) => { const a = sprinkle(R, regions(R, 7, 0.55), 0.12); wall(R, a); return a; },
    wall: (R) => { const a = sprinkle(R, regions(R, 8, 0.6), 0.1); wall(R, a); return a; },
    room: (R) => { const a = sprinkle(R, regions(R, 8, 0.55), 0.08), w = wall(R, a); return seg(R, a, w); },
    dense: (R) => sprinkle(R, regions(R, 8, 0.5), 0.62),
    fine: (R) => sprinkle(R, regions(R, 16, 0.5), 0.6),
  };
  // 2段目：ア〜エの4人。1人だけ全員に届く（同じ役目で）。ほかの3人は、答えから近い人を選ぶ
  const CL = ["ア", "イ", "ウ", "エ"], GK = ["a", "b", "c", "d"];
  function candOf(R, sols) {
    const by = { r: [], k: [] };
    for (const s of sols) { const p = parseAt(s); by[p.role].push(p.at); }
    const roles = ["r", "k"].filter((r) => by[r].length >= 1 && by[r].length <= N * N - 3);
    if (!roles.length) return null;
    const role = roles[ri(R, 0, roles.length - 1)], good = by[role][ri(R, 0, by[role].length - 1)];
    const dist = (c) => Math.abs((c % N) - (good % N)) + Math.abs(Math.floor(c / N) - Math.floor(good / N));
    const bad = []; for (let c = 0; c < N * N; c++) if (!by[role].includes(c)) bad.push(c);
    const near = bad.filter((c) => dist(c) <= 3), pool = near.length >= 3 ? near : bad;
    const cs = shuffle(R, [good, ...pickN(R, pool, 3)]);
    return { role, cs, best: cs.indexOf(good) };
  }
  // 1つの町：条件（全員に届く置き方の数が lo〜hi）に合うまで作り直す
  function scene(R, mk, lo, hi) {
    for (let k = 0; k < 600; k++) {
      const g = mk(R).join(""), sols = solve(g, hi);
      if (!sols || sols.length < lo) continue;
      const cd = candOf(R, sols); if (!cd) continue;
      return { g, sols, cd };
    }
    return null;
  }
  const PLACE_Q = [
    () => "1人に役目をたのんで、100人全員を逃がそう。だれに、どちらをたのむ？",
    () => "町の100人全員に避難を届けたい。どこに、どちらの人を置く？",
    () => "ドミノのように100人全員へ。どの人に、どちらをたのむ？",
  ];
  function placeMake(mk, lo, hi) {
    return (R) => {
      const S = scene(R, mk, lo, hi), si = ri(R, 0, PLACE_Q.length - 1), c = S.cd, good = c.cs[c.best], tg = spread(S.g, good, c.role);
      const hs = S.sols[ri(R, 0, S.sols.length - 1)]; // ヒントで教える置き方
      const gwhy = `${CL[c.best]}（${posStr(good)}）に${ROLES[c.role].name}なら、${stepsOf(tg)}手で100人全員に届きます。ほかの3人では、逃げない人が残ります。`;
      const why = `この町で全員に届く置き方は、200通りのうち${S.sols.length}通り。逃げるきっかけは人によってちがいます。${S.g.includes("w") ? "2人で逃げる人は、声が2人分そろうまで動きません。" : ""}`;
      return { type: "place", media: MEDIA.town, q: PLACE_Q[si](), opts: [], ans: null, g: S.g, n: N, sols: S.sols, hint: hs, cands: c.cs, crole: c.role, grp: GK[c.best], gwhy, why, v: `${si}:${S.g}:${c.role}${c.cs.join(".")}` };
    };
  }
  const P_ = (id, lv, town, lo, hi, name, look, key) => ({ id, lv, ans: "", col: "town", name, look, key, why: "", src: ["kohou", "guide"], make: placeMake(TOWN[town], lo, hi), n: N, grid: 1 });

  // 資料に書いてあることの問題。ans：答え、ws：まちがいの選び肢の候補（やさしいは2つ、ほかは3つ使う）、sit：問いの言い方
  function fact(col, sit, ans, ws) {
    return (R, lv) => {
      const si = ri(R, 0, sit.length - 1), ds = pickN(R, ws, lv === 0 ? 2 : 3);
      return { type: "fact", media: MEDIA[col], q: sit[si], opts: shuffle(R, [ans, ...ds]), ans, v: `${si}:${ds.map((d) => ws.indexOf(d)).join(".")}` };
    };
  }
  const F = (id, lv, col, src, name, look, key, why, sit, ans, ws) => ({ id, lv, ans, grp: null, gwhy: "", col, name, look, key, why, src: [src], make: fact(col, sit, ans, ws) });

  const KINDS = [
    // ---- やさしい ----
    P_("p0mix", 0, "mix", 60, 150, "見て逃げる人と声で逃げる人", "たのむ人のとなりは、どちらで動く人？", "見て逃げる人のそばは率先避難者、声で逃げる人のそばは声をかける人。"),
    P_("p0mee", 0, "mee", 60, 150, "見て逃げる人が多い町", "まっ先に逃げる姿を見せると？", "見て逃げる人は、となりの人が逃げるのを見ると逃げます。"),
    P_("p0koe", 0, "koe", 60, 150, "声で逃げる人が多い町", "声をかけると動く人が多い町です。", "声で逃げる人は、となりから声をかけられると逃げます。"),
    F("sanko3", 0, "sanko", "kohou", "避難3原則の3つ目", "「まず自分が」です。", "釜石の避難3原則の3つ目は「率先的避難者になる」です。",
      "片田教授の避難3原則は「想定にとらわれない」「状況下において最善を尽くす」「率先的避難者になる」です（内閣府「ぼうさい」）。",
      ["釜石で教えていた避難3原則。3つ目は？", "避難3原則のうち、「まず自分が逃げる」ことを言うのは？", "釜石の子どもたちが学んだ避難3原則の3つ目は？"], "率先的避難者になる", ["家族がそろうまで待つ", "テレビで確かめてから動く", "みんなが逃げてから逃げる", "その場でじっと待つ"]),
    F("sossen", 0, "sanko", "kohou", "率先的避難者になる", "勇気を持って、です。", "率先的避難者になるとは、いざというとき、まず自分が勇気を持って逃げることです。",
      "内閣府「ぼうさい」は「いざというときには、まず自分が勇気を持って逃げる、ということです。」と説明しています。",
      ["「率先的避難者になる」とは、どうすること？", "率先避難者は、いざというとき何をする人？", "避難3原則の「率先的避難者になる」の意味は？"], "まず自分が勇気を持って逃げる", ["みんなが逃げるのを見てから逃げる", "家にいて様子を見る", "逃げた人の数を数える", "電話がかかるのを待つ"]),
    F("kuruzo", 0, "sanko", "kohou", "叫んで、すぐに走り出した", "声と姿の両方で知らせました。", "釜石東中学校の生徒は、地割れに気づき「津波がくるぞー！」と叫んで、すぐに走り出しました。",
      "サッカー部の生徒たちは大きな地割れに気づき、「津波がくるぞー！」と叫んで、すぐに走り出したそうです（内閣府「ぼうさい」）。",
      ["地震のとき、校庭にいた釜石東中学校の生徒たちは？", "大きな地割れに気づいた中学生たちが、まずしたことは？", "釜石東中学校のサッカー部の生徒は、地震のあと？"], "「津波がくるぞー！」と叫んで、すぐに走り出した", ["先生の指示が出るまで校庭で待った", "家族に電話をかけ続けた", "海を見に行った", "教室にもどって荷物をまとめた"]),
    F("kakeau", 0, "guide", "guide", "声を掛け合って避難する", "家族や地域と、です。", "内閣府のガイドラインは、災害時には可能な範囲で声を掛け合って避難すべきとしています。",
      "ガイドラインは「災害時には可能な範囲で声を掛け合って避難すべきである。」と書いています（内閣府）。",
      ["内閣府のガイドライン。災害のとき、家族や地域の人とは？", "避難のとき、まわりの人とどうするとよい？（内閣府のガイドライン）", "ガイドラインが言う、家族や地域との避難のしかたは？"], "可能な範囲で声を掛け合って避難する", ["だれにも言わずに1人で逃げる", "全員がそろうまで家で待つ", "まわりが逃げるまで動かない", "声は出さず、手紙を置いていく"]),
    // ---- ふつう ----
    P_("p1two", 1, "two", 8, 45, "2人で逃げる人がまじる町", "2の人は、声が2人分そろうまで動きません。", "2の人が多い所は、となりの2人から声が届く向きを考えます。"),
    P_("p1twom", 1, "twom", 8, 45, "見る人と2人の町", "見て逃げる人から広げられる所は？", "見て逃げる人が多いなら率先避難者。2の人は2人分の声が要ります。"),
    P_("p1twov", 1, "twov", 8, 45, "声の人と2人の町", "声で逃げる人から広げられる所は？", "声で逃げる人が多いなら声をかける人。2の人は2人分の声が要ります。"),
    P_("p1line", 1, "line", 5, 45, "町を横切る2の並び", "2の並びは、片側から1人分の声では動きません。", "並びの上の人にたのむと、両側から声がそろいます。"),
    F("roppyaku", 1, "sanko", "kohou", "600人の子どもたちが走った", "小学校の子どもたちです。", "中学生が小学校に向かって叫び、600人の子どもたちが最初の避難場所へと走りました。",
      "内閣府「ぼうさい」は「６００人の子どもたちが最初の避難場所へと走りました」と書いています。",
      ["中学生が小学校に向かって叫んだあと、最初の避難場所へ走った子どもは何人？", "釜石で、中学生の声を聞いて走った小学校の子どもたちは何人？", "「津波がくるぞー！」の声のあと、走った子どもは何人？"], "600人", ["6人", "60人", "6,000人", "60,000人"]),
    F("sugata", 1, "sanko", "kohou", "逃げる姿を見て、お年寄りも", "姿を見て、です。", "中学生が必死に避難する姿を見て、近所のおじいちゃん・おばあちゃんも避難場所へ走りました。",
      "内閣府「ぼうさい」は、中学生が必死に避難している姿を見て、近所のお年寄りも避難場所へと走ったと書いています。",
      ["中学生が必死に避難する姿を見て、近所のお年寄りは？", "釜石で、逃げる中学生を見た近所の人たちは？", "率先して逃げた中学生の姿は、まわりにどう伝わった？"], "近所のおじいちゃん・おばあちゃんも避難場所へ走った", ["家にもどって様子を見た", "中学生を止めに行った", "逃げずに見送った", "テレビの前で待った"]),
    F("denwa", 1, "guide", "guide", "親戚・知人には電話で", "呼びかけは大きな動機付けです。", "他の人からの避難の呼びかけは、避難の大きな動機付けになることがあります。",
      "ガイドラインは、親戚・知人が危ない区域にいるなら「電話等をして避難を強く促すべきである」としています（内閣府）。",
      ["親戚や知人が、災害のおそれがある所に住んでいたら？（内閣府のガイドライン）", "ガイドラインが言う、遠くの知り合いへのよい行動は？", "他の人からの呼びかけは避難の動機付けになる。では、知人には？"], "電話などで避難を強く促す", ["何も言わずに待つ", "災害が終わってから連絡する", "逃げないように伝える", "メールで天気だけ送る"]),
    F("bias", 1, "guide", "guide", "正常性バイアス", "思い込みのことです。", "「自分は災害に遭わない」という思い込みを、正常性バイアスといいます。",
      "ガイドラインは「自分は災害に遭わないという思い込み（正常性バイアス）」で避難のタイミングを逃さないよう書いています（内閣府）。",
      ["ガイドラインにある「正常性バイアス」とは？", "避難のタイミングを逃す原因の1つ「正常性バイアス」は？", "「正常性バイアス」の意味は？（内閣府のガイドライン）"], "自分は災害に遭わないという思い込み", ["災害の前に体が重くなること", "避難所が満員になること", "道がこんでいること", "雨の量を正しく測ること"]),
    // ---- むずかしい ----
    P_("p2wall", 2, "wall", 1, 6, "町を分ける2の並び", "並びの外からでは、声は1人分しか届きません。", "並びの上の人の、上下のとなりが何で動く人かを見ます。"),
    P_("p2room", 2, "room", 1, 6, "並びと小さな並び", "長い並びと短い並び。両方をこえるには？", "並びの上で、上下のとなりから広がる人を探します。"),
    P_("p2dense", 2, "dense", 1, 6, "2人で逃げる人が多い町", "2の人が少ない、細い道すじを探します。", "2の人は、となりの2人から声がそろう所から動きます。"),
    P_("p2fine", 2, "fine", 1, 6, "細かくまじる町", "見と声と2が、こまかくまじっています。", "まわりの見・声の数と、2の人の向きを見ます。"),
    F("minna", 2, "guide", "jirei", "皆が避難するから、自分たちも", "まわりの動きが背中を押します。", "呼びかけながら避難する人がいると、住民も「皆が避難するから、自分たちも避難しよう」と思えます。",
      "内閣府の好事例集は、従業員が呼びかけながら避難すると、住民も「皆が避難するから、自分たちも避難しよう」と思うとしています。",
      ["会社の人が呼びかけながら避難すると、地域の住民は？（内閣府の好事例集）", "呼びかけをしながら避難する従業員を見た住民は、どう思う？", "「津波率先避難等協力事業所」の人が呼びかけながら逃げると？"], "「皆が避難するから、自分たちも避難しよう」と思う", ["「自分たちは残ろう」と思う", "「会社の人だけ逃げればよい」と思う", "「何も起きない」と思う", "「明日にしよう」と思う"]),
    F("doko", 2, "guide", "jirei", "まわりの動きと近所の呼びかけ", "人の動きと声です。", "他の人の動きや近所の人からの呼びかけが、避難をうながすことが分かりました。",
      "内閣府の好事例集には「他者の動向や近所の方からの呼びかけが、避難行動を促進することが判明。」とあります。",
      ["好事例集の調べで、避難をうながすと分かったものは？", "内閣府の好事例集。避難行動を促進すると分かったのは？", "人が避難するきっかけになると分かったものは？（内閣府の好事例集）"], "他の人の動きや、近所の人からの呼びかけ", ["だれもいない静かな町", "避難所の場所を知らないこと", "家の中にいること", "夜になること"]),
    F("anzen", 2, "guide", "jirei", "率先安全避難者", "声かけと、自分も避難。", "ある町の率先安全避難者は、災害時に住民へ避難の声かけをし、自らも率先して避難します。",
      "内閣府の好事例集は、率先安全避難者は災害時に「住民へ避難の声かけを行い、自らも率先して避難行動をとる」としています。",
      ["ある町の「率先安全避難者」が災害のときにすることは？", "好事例集にある「率先安全避難者」の役目は？", "率先安全避難者は、災害時に何をする？（内閣府の好事例集）"], "住民に避難の声かけをし、自分も率先して避難する", ["最後まで町に残って見守る", "避難所のかぎを開けるだけ", "電話の前で知らせを待つ", "逃げる人の数を数える"]),
    F("kouun", 2, "guide", "guide", "何も起きなければ「幸運だった」", "空振りでも、です。", "避難して何も起きなければ「幸運だった」と考える心構えが大切です。",
      "ガイドラインは「避難した結果、何も起きなければ「幸運だった」という心構えをすることが重要である。」としています（内閣府）。",
      ["避難して、何も起きなかったら？（内閣府のガイドライン）", "空振りになったときの心構えは？", "ガイドラインが言う、避難したのに災害が起きなかったときの考え方は？"], "「幸運だった」と考える", ["「損をした」と考える", "「次は逃げない」と決める", "「呼びかけた人がまちがえた」と考える", "「避難は要らなかった」と言いふらす"]),
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);
  const placeOf = (lv) => KINDS.filter((k) => k.lv === lv && k.grid).map((k) => k.id);
  const factOf = (lv) => KINDS.filter((k) => k.lv === lv && !k.grid).map((k) => k.id);

  // 2段目「ア〜エのどの人にたのむと、全員に届く？」の4つ（図のア〜エ）
  const GROUPS = {
    a: { name: "ア", sub: "図のアの人" },
    b: { name: "イ", sub: "図のイの人" },
    c: { name: "ウ", sub: "図のウの人" },
    d: { name: "エ", sub: "図のエの人" },
  };

  // ---- 町の図（SVG）。色だけにせず、人は「見・声・2」の字、たのんだ人は🏃・📣、逃げた人は手の数字、残った人は字のまま赤い点線のわく
  const CELL = 34, M = 6;
  const FILL = { m: ["#d3e6f7", "#12406b"], v: ["#fbe1c6", "#7a3d0c"], w: ["#e6d9f3", "#4b2a78"] };
  function gridSvg(P, o = {}) {
    const W = N * CELL + M * 2, g = P.g, t = o.t || null, out = [];
    out.push(`<rect width="${W}" height="${W}" fill="#efe9db"/>`);
    for (let i = 0; i < N * N; i++) {
      const x = M + (i % N) * CELL, y = M + Math.floor(i / N) * CELL, p = g[i], done = t && t[i] >= 0, isAt = o.at === i;
      if (isAt) out.push(`<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="7" fill="#b23a24"/><text x="${x + CELL / 2}" y="${y + 23}" font-size="17" text-anchor="middle">${ROLES[o.role].ch}</text>`);
      else if (done) out.push(`<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="7" fill="#1f3d2c"/><text x="${x + CELL / 2}" y="${y + 23}" font-size="15" font-weight="900" text-anchor="middle" fill="#fff">${t[i]}</text>`);
      else if (t) out.push(`<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="7" fill="${FILL[p][0]}" stroke="#83261a" stroke-width="2.5" stroke-dasharray="4 3"/><text x="${x + CELL / 2}" y="${y + 23}" font-size="15" font-weight="900" text-anchor="middle" fill="${FILL[p][1]}">${PEOPLE[p].ch}</text>`); // 残った人：きっかけの字のまま、赤い点線のわく
      else out.push(`<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="7" fill="${FILL[p][0]}"${p === "w" ? ` stroke="${FILL[p][1]}" stroke-width="2"` : ""}/><text x="${x + CELL / 2}" y="${y + 23}" font-size="15" font-weight="900" text-anchor="middle" fill="${FILL[p][1]}">${PEOPLE[p].ch}</text>`);
    }
    if (o.cands) o.cands.forEach((c, j) => { const x = M + (c % N) * CELL + CELL - 8, y = M + Math.floor(c / N) * CELL + 8; out.push(`<circle cx="${x}" cy="${y}" r="8.5" fill="#fff" stroke="#1d2a3f" stroke-width="2"/><text x="${x}" y="${y + 4.5}" font-size="12" font-weight="900" text-anchor="middle" fill="#1d2a3f">${CL[j]}</text>`); });
    const label = o.label || "100人の町の図。見は見て逃げる人、声は声で逃げる人、2は2人で逃げる人";
    return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="${label}">${out.join("")}</svg>`;
  }

  // 図を文字で読む（読み上げ用。行ごとに左から右へ）。o.t があれば逃げた手、o.cands があればア〜エ
  function gridText(P, o = {}) {
    const g = P.g, t = o.t || null, rows = [];
    for (let y = 0; y < N; y++) {
      const cells = [];
      for (let x = 0; x < N; x++) {
        const i = y * N + x, ci = o.cands ? o.cands.indexOf(i) : -1;
        let w = PEOPLE[g[i]].ch;
        if (o.at === i) w = ROLES[o.role].name;
        else if (t) w = t[i] >= 0 ? `逃${t[i]}` : `残（${PEOPLE[g[i]].ch}）`;
        if (ci >= 0) w += `（${CL[ci]}）`;
        cells.push(w);
      }
      rows.push(`${y + 1}行目：${cells.join("・")}`);
    }
    return rows;
  }

  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // 1問を作る。tag は「種類|種」（例 "p0mix|2026-11-27:d0"）。同じ tag ならいつも同じ問題。町の問題は作るのに時間がかかるので、同じ tag は覚えておく
  const memo = new Map();
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    if (memo.has(tag)) return memo.get(tag);
    const p = k.make(rng(seedOf(tag)), k.lv);
    const P = { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, why: k.why, grp: k.grp || null, gwhy: k.gwhy || "", n: 0, ...p, src: (p.src || k.src).map((s) => SRC[s]) };
    P.svg = P.n ? gridSvg(P) : "";
    if (memo.size > 400) memo.clear();
    memo.set(tag, P);
    return P;
  }
  const keyOf = (P) => `${P.kind}:${P.q}:${P.g || ""}:${P.opts.slice().sort().join("/")}`;

  // 今日の5問：やさしい（町1・資料1）・ふつう（町1・資料1）・むずかしい（町1）。上級：今日とちがうむずかしい町2つと資料1つ
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date));
    const ids = [pickN(R, placeOf(0), 1)[0], pickN(R, factOf(0), 1)[0], pickN(R, placeOf(1), 1)[0], pickN(R, factOf(1), 1)[0], pickN(R, placeOf(2), 1)[0]];
    return ids.map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date));
    const ids = [...pickN(R, placeOf(2).filter((x) => x !== dh), 2), pickN(R, factOf(2), 1)[0]];
    return ids.map((id, i) => `${id}|${date}:h${i}`);
  }

  const HND = { KINDS, BY, GROUPS, LV, SRC, MEDIA, CL, GK, N, PEOPLE, ROLES, gridText, gridSvg, spread, solve, countOf, stepsOf, keyAt, parseAt, posStr, nbOf, kindsOf, placeOf, factOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN, CELL, M };
  if (typeof module !== "undefined" && module.exports) module.exports = HND; else root.HND = HND;
})(typeof self !== "undefined" ? self : this);
