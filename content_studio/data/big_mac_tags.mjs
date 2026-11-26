// BIG MAC（ビッグマック）ネルシャツのタグ年代判別データ ― 「TAG ARCHIVE」フォーマット（Five Brotherと同じ）。【下書き段階】
// タグだけを年代順に追い、1ページ＝1章（2〜3枚のタグ）にまとめる構成。
//
// 判断の最優先: 本人が用意した画像（2026-11-26）。
//   - source_overview.webp … タグ10枚の一覧（各タグの下に年代表記あり）。本人いわく「ネルシャツには使われていない
//     タグも含まれる」ので、ネル以外と判断した3枚は使わない（下記）。
//   - src_*.webp/png … 本人撮影のネルシャツのタグ写真4枚。
// 裏取り: de-suke.com（BIG MACのタグ判別。最も詳しい）、muuseo.com（IROZAバイヤー記事）、tobariused.com、
// furugiblog.com、vintrowear.wordpress.com（USPTO商標記録の引用: 初使用1922年1月）を横断し、本人の画像と矛盾しない内容を採用。
//
// 【一覧画像から外したタグ（ネルシャツ以外と判断）― 本人に確認したい】
//   - 上段2枚目「BIG MAC SANFORIZED … J.C.PENNEY CO.INC」（50's）: 戦前〜50年代のオーバーオール／ワークシャツ系の書式。
//   - 上段3枚目「PENNEY'S（紺）／BIG MAC（オレンジ）」（50's）: de-sukeの「青赤タグ」。カバーオールの例が出典。
//   - 中段3枚目「BIG MAC SANFORIZED・VAT DYED PENNEY'S VOR.7701」（60's）: 「VAT DYED（染料の種類）」はシャンブレー／
//     デニム系の表記と判断。
//
// 【ソース間で食い違いがあり、ヘッジ表現にしている点】
//   - 誕生年: 1922年（商標記録・J.C.ペニー社史・タグの「SINCE 1922」）が最も根拠が強い。de-sukeの「1934年」は採らない。
//   - 「AUTHENTIC WORKWEAR SINCE 1922」: de-sukeは80〜90年代 → バッジは「1980〜90's」。
//   - St. John's Bay: 2026年に40周年とする記事あり（1986年頃）、商標出願は1982年 →「80年代半ば以降」。BIG MACの商標は2017年にも更新されており、
//     「BIG MACが消えてSt. John's Bayになった」とまでは言えない →「流れが受け継がれたとされる」。誕生年は1928年説もある →「誕生したとされる」。「BIGMAC FLANNEL」との二重タグの時期を明記する
//     ソースは見つからず →「80年代後半以降」「〜とされる」でヘッジ。
//   - 「Penney's」→「JCPenney」: J.C.ペニーのロゴが「JCPenney」に変わったのは1971年。本人の一覧画像でも70'sのタグは
//     すべて「JCPenney」表記で矛盾なし。
//
// 【写真】meta.ownPhotos = true。本人の画像をそのまま使う（Geminiイラスト化はしない）。
// 各タグの crop は元画像上の切り抜き範囲 [左, 上, 右, 下]（px）。src があればその写真から、無ければ meta.sourceImage から
// 切り出す（node tools/crop_tags.mjs big_mac_tags）。type は写真が無いときの仮表示用。

export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "BIG MAC FLANNEL TAG",
  outputPrefix: "big_mac_tags_carousel",
  bg: "#F4F3EF",
  layout: "tagArchive",
  ownPhotos: true,
  sourceImage: "big_mac_tags/source_overview.webp",
  heroImage: "big_mac_tags/cover.jpg", // 表紙はFive Brother同様Geminiの水彩イラスト予定（未作成＝仮表示）
  // 表紙の参考は本人が貼ったネルシャツの写真（ハンガー吊り・白壁）。Five Brotherと同じ「写真に忠実」な表紙プロンプト。
  heroRefs: ["_private_ref/big_mac_tags/hero_ref_1.jpg"],
  heroGemini: {
    subject: "a vintage Big Mac cotton flannel work shirt",
    intro: "Create a realistic hand-drawn watercolor illustration of a vintage Big Mac cotton flannel work shirt, front view, buttoned. Attachments, in this order: the FIRST image (a pair of sneakers) is a sample ONLY for the paper, the loose wash vignette and the overall mood — copy neither its subject nor its simplified rendering. The SECOND image is a photo of the real shirt. Follow this photo faithfully for the shape, proportions, how the sleeves hang along the body, the plaid pattern and every construction detail. Do NOT draw the wooden hanger, the wall, the background or the photo's lighting — the shirt alone on the paper.",
    styleText: "a detailed, realistic watercolor illustration: minimal fine pencil outlines, layers of transparent watercolor building up the soft, brushed, slightly fuzzy surface of cotton flannel with a visible twill texture, gentle fading and soft creases, realistic light and shadow in the folds. It must read as a painting on warm ivory textured paper with a loose wash vignette — not a photograph, not glossy, not cartoonish, not flat.",
    colorText: "take the colors from the photo — the same clear cerulean / teal blue, the same charcoal-grey and white shadow-plaid stripes, with the same contrast. Do NOT lighten, wash out or desaturate.",
    details: [
      "LAYOUT: front view, buttoned to the top, collar points down; both sleeves hang straight down along the sides of the body, exactly as in the photo. No hanger.",
      "COLOR and PATTERN like the photo: a blue shadow plaid (ombre plaid) — a clear cerulean / teal-blue ground crossed by soft, blurred bands of charcoal grey, light grey and white, the stripes fading into each other at the edges. Keep the blue rich — do not turn it navy, green or grey.",
      "TWO chest patch pockets, one on each side, WITHOUT flaps; each pocket has one button near its top edge and a slightly pointed / rounded bottom. The pocket bodies are cut on the BIAS so their plaid runs DIAGONALLY, unlike the straight plaid of the body.",
      "About seven small whitish-grey buttons down the placket, one button on each pocket, one on each cuff; long buttoned cuffs; straight shirt-tail hem.",
      "A small red woven neck label inside the collar is fine, but no readable lettering anywhere.",
    ],
    check: "青（セルリアン）地にグレー・白のぼかしチェック（オンブレ）・胸ポケット2つ（フラップ無し・ボタン1つ・本体はチェックが斜め）・白っぽいボタン約7個・ハンガーと壁は描かない・襟の赤いタグ",
  },
  heroAlt: "BIG MAC TAGS 1950s-1990s",
  badge: "TAG ARCHIVE",
  subtitle: "タグだけで読む、ビッグマックのネルシャツの年代",
  overviewHeading: "概要：親会社の表記を追えば年代が見える",
  overviewBullets: [
    "1922年にアメリカの百貨店チェーン「J.C.ペニー」のワークウェアブランドとして誕生したとされる。ネルシャツは古着の定番。",
    "タグは親会社の表記（「Penney's」→「JCPenney」）や刺繍の色で年代を絞り込める。",
  ],
};

// eras = 章。range は章の年代幅（黒バッジ）、name は章タイトル、bullets は CHECK POINT。
// media = その章のタグ。year は画像下の黒バッジ、desc は2行キャプション（<br>で改行、「」は太字）。
export const eras = [
  {
    range: "1950年代〜1960年代",
    name: "「Penney's」の時代",
    bullets: [
      "タグに親会社の「Penney's」表記が入る。",
      "60年代のタグには、防縮加工済みを示す「SANFORIZED」も入る。",
      "サイズは「17-17½」のように首回り（インチ）で表記される。",
    ],
    // 2026-11-26 本人の指摘で、一覧画像の「®入り（上部が赤地）」「白地に赤刺繍・筆記体Penneys」「黒一色 SMALL 14-14½」の
    // 3枚はネルシャツに付かないタグとして削除し、50年代と60年代を1章にまとめた。
    media: [
      { type: "sideTag", year: "1950's", caption: "1950's TALL", desc: "赤地に「木のマーク」が目印。<br>背の高い人向けの「for TALL」",
        crop: [72, 54, 312, 288], photo: "big_mac_tags/t01_1950s_tall.jpg" },
      { type: "sideTag", year: "1960's", caption: "1960's VOR-7064", desc: "白地に「赤一色」の刺繍。<br>「VOR-7064」の番号と筆記体の「Penneys」",
        src: "big_mac_tags/src_1960s_vor7064.png", crop: [60, 25, 480, 340], photo: "big_mac_tags/t05_1960s_vor7064.jpg" },
    ],
  },
  {
    range: "1970年代",
    name: "「JCPenney」表記へ",
    bullets: [
      "親会社の表記が「Penney's」から「JCPenney」に変わる。",
      "「SANFORIZED」が見られなくなり、「100% Cotton」とサイズを線で区切ったタグが増える。",
    ],
    media: [
      { type: "sideTag", year: "1970's", caption: "1970's 青", desc: "青一色。素材とサイズを<br>線で区切る「Tall Size」",
        crop: [1137, 463, 1376, 699], photo: "big_mac_tags/t06_1970s_blue.jpg" },
      { type: "sideTag", year: "1970's", caption: "1970's MW", desc: "赤一色。洗濯表示の「MW」と<br>首回りサイズ「15-15½」",
        crop: [72, 870, 310, 1100], photo: "big_mac_tags/t07_1970s_mw.jpg" },
      { type: "sideTag", year: "1970's", caption: "1970's XL", desc: "赤一色。<br>「100% Cotton」と「XL」を線で区切る",
        crop: [426, 864, 664, 1109], photo: "big_mac_tags/t08_1970s_xl.jpg" },
    ],
  },
  {
    range: "1980年代〜1990年代",
    name: "BIG MACからSt. John's Bayへ",
    summaryName: "BIG MACから<br>St. John's Bayへ", // 早見ガイドの左欄で「St.」と「John's」の間で折れないように
    bullets: [
      "80年代は、太字の「BIGMAC」を「紺のライン」で挟んだ刺繍タグ。",
      "80年代半ば以降に「St. John's Bay」が登場し、並んで付くタグも。BIG MACの流れはこのブランドに受け継がれたとされる。",
    ],
    media: [
      { type: "sideTag", year: "1980's", caption: "1980's 紺ライン", desc: "赤の「BIGMAC」を紺のラインで<br>挟む。下に「Made in U.S.A.」",
        src: "big_mac_tags/src_1980s_bigmac.webp", crop: [130, 110, 710, 600], photo: "big_mac_tags/t09_1980s_navy.jpg" },
      { type: "sideTag", year: "1980's半ば〜", caption: "1980's半ば〜 St. John's Bay", desc: "「BIGMAC FLANNEL」の小タグと<br>「St. John's Bay」が並ぶ",
        src: "big_mac_tags/src_bigmac_flannel_sjb.webp", crop: [110, 30, 720, 575], photo: "big_mac_tags/t10_sjb.jpg" },
      { type: "sideTag", year: "1980〜90's", caption: "1980〜90's SINCE 1922", desc: "赤の「BIG MAC®」に<br>「SINCE 1922」",
        src: "big_mac_tags/src_1990s_since1922.webp", crop: [95, 40, 855, 420], photo: "big_mac_tags/t11_since1922.jpg" },
    ],
  },
];

export const summary = {
  heading: "タグ早見ガイド",
  closing: "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。",
};
