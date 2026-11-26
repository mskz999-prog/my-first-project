// FIVE BROTHER（ファイブブラザー）のタグ年代判別データ ― 新フォーマット「TAG ARCHIVE」。【下書き段階】
// タグだけを年代順に追い、1ページ＝1章（2〜4枚のタグ）にまとめる構成。
//
// 判断の最優先: 本人の参考チャート（タグ9枚の一覧画像。本人が昔自分で撮った写真）。
// 裏取り: furugi-tag-history.com、de-suke.com、ferantracing.jp、muuseo.com（IROZAバイヤー記事）、
// wnblue-vintage.com を横断し、本人チャートと矛盾しない内容を採用した。
//
// 【ソース間で食い違いがあり、ヘッジ表現にしている／本人に確認したい点】
//   - 創業地: 「1890年ニューヨーク」が多数派。英語ブログには「ケンタッキー州ルイビルの M. Fine & Sons 製」とあり、
//     場所は本文に書かない。創業者の5人の子どもが名前の由来という説は複数ソースで一致（「〜とされる」）。
//   - 1940年代の大文字タグの地の色: 本人チャートは「黒地と白地」、ブログ2件は「黒地と黄色地」。
//     写真では生成り〜黄色っぽい地。2026-11-26 本人の判断で「黄色地」に統一。
//   - WPL: 新規発行は1941〜59年だが、番号自体は後年も使われた例がある（FTC・VFG）→「目安」「59年頃までの番号」と表現。
//   - 名前の由来（5人の子ども）: muuseo（Morris Fineの5人の子ども）・wnblue（five sons）の2件のみ → 「とされる」。
//   - 70〜80年代の四角形タグ: 本人チャートとferantracingが記載。ソースによっては三角形タグのみ紹介。
//   - 1990年代以降の色: 本人チャート・furugiは「緑＋茶」、de-suke・ferantracingは「緑＋オレンジ」。2026-11-26 本人の判断で「緑＋オレンジ」に統一。
//   - 森タグ後期の「SANFORIZED」: 本人チャートは「前期まで」。de-suke等は後期で消えるとは書いていない → 前期の説明は
//     「〜とされる」でヘッジする。
//
// 【写真】meta.ownPhotos = true。本人撮影の写真をそのまま使う（Geminiイラスト化はしない）。
// 元画像は assets/five_brother_tags/source_overview.webp（1072×1196）。各タグの crop は元画像上の
// 切り抜き範囲 [左, 上, 右, 下]（px）。素材工程でこの範囲を切り出して photo の保存先に書き出す。
// type は既存SVGイラストの「sideTag」を仮表示用に流用しているだけ（写真が入れば使われない）。

export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "FIVE BROTHER TAG",
  outputPrefix: "five_brother_tags_carousel",
  bg: "#F4F3EF",
  layout: "tagArchive", // 章ページ＝タグ2〜4枚＋各タグの年代バッジ・2行キャプション（試作 draft_v4 のデザイン）
  ownPhotos: true,
  sourceImage: "five_brother_tags/source_overview.webp",
  heroImage: "five_brother_tags/cover.jpg", // 表紙だけGeminiの水彩イラスト（本人がシャツの写真を用意）
  heroRefs: ["_private_ref/five_brother_tags/hero_ref_1.jpg"],
  heroGemini: {
    subject: "a vintage Five Brother heavyweight cotton flannel work shirt",
    intro: "Create a realistic hand-drawn watercolor illustration of a vintage Five Brother heavyweight cotton flannel work shirt, front view, laid flat and buttoned. Attachments, in this order: the FIRST image (a pair of sneakers) is a sample ONLY for the paper, the loose wash vignette and the overall mood — copy neither its subject nor its simplified rendering. The SECOND image is a photo of the real shirt. Follow this photo faithfully for the shape, proportions, how it lies flat (including where the sleeves lie), the plaid pattern and every construction detail. Do not reproduce the photo's wooden floor, background or lighting.",
    styleText: "a detailed, realistic watercolor illustration: minimal fine pencil outlines, layers of transparent watercolor building up the soft, brushed, slightly fuzzy surface of heavy cotton flannel with a visible diagonal twill texture, gentle fading and soft creases, realistic light and shadow in the folds. It must read as a painting on warm ivory textured paper with a loose wash vignette — not a photograph, not glossy, not cartoonish, not flat.",
    // 表紙プロンプトのCOLOR行の既定はデニム向け（indigo）なので、ネルシャツ用に上書き
    colorText: "take the colors from the photo — the same saturated turquoise and the same near-black stripes, with the same contrast. Do NOT lighten, wash out or desaturate.",
    details: [
      "LAYOUT: laid flat, front view, buttoned to the top; collar spread flat; both sleeves lie along the sides of the body, slightly angled outward toward the cuffs, exactly as in the photo.",
      "COLOR and PATTERN like the photo: a bright turquoise / aqua-blue ground with a bold plaid of wide dark charcoal-black vertical stripes and thinner, fainter horizontal lines. Keep the turquoise rich and saturated — do not turn it green, grey or pale.",
      "TWO chest pockets, one on each side, each with a pointed-corner button flap; the pocket bodies are cut on the BIAS so their plaid runs DIAGONALLY, unlike the straight plaid of the body.",
      "Seven small dark buttons down the placket, one button on each pocket flap, one on each cuff; long buttoned cuffs; slightly curved shirt-tail hem.",
      "A small woven neck label inside the collar is fine, but no readable lettering anywhere.",
    ],
    check: "ターコイズ地に黒の太い縦縞チェック・胸ポケット2つ（フラップ付き・ポケット本体はチェックが斜め）・ボタン7個・袖は胴に沿って平置き・背景は無地の紙（床は描かない）",
  },
  heroAlt: "FIVE BROTHER TAGS 1930s-1990s",
  badge: "TAG ARCHIVE",
  subtitle: "タグだけで読む、ファイブブラザーの年代",
  overviewHeading: "概要：「5」のマークを追えば年代が見える",
  overviewBullets: [
    "1890年創業とされるアメリカのワークウェアブランド。名前は創業者の「5人の子ども」に由来するとされ、ネルシャツの定番として古着でも人気が高い。",
    "タグは「5」のマークを軸にデザインが何度も変わり、地の色・刺繍かプリントか・小さな表記（「WPL」「®」「MADE IN USA」など）で年代を絞り込める。",
    "復刻品も多く出ているため、年代判別は必ずタグの実物で確認したい。",
  ],
};

// eras = 章。range は章の年代幅（黒バッジ）、name は章タイトル、bullets は CHECK POINT。
// media = その章のタグ。year は画像下の黒バッジ、desc は2行キャプション（<br>で改行、「」は太字）。
export const eras = [
  {
    range: "1930年代〜1940年代",
    name: "刺繍タグの時代",
    bullets: [
      "最初期は「黒地に金」の刺繍で、通称「黒タグ」。",
      "40年代に入ると、ブランド名の真ん中に大きな「5」を重ねたデザインに変わる。",
    ],
    media: [
      { type: "sideTag", year: "1930's", caption: "1930's 黒タグ", desc: "通称「黒タグ」。黒地に金の刺繍、<br>ブランド名がアーチ状に入る",
        crop: [110, 137, 326, 238], photo: "five_brother_tags/t01_1930s_black.jpg" },
      { type: "sideTag", year: "1940's（黒地）", caption: "1940's 黒地", desc: "黒地に「赤＋緑」の刺繍。<br>タグ中央に大きな「5」",
        crop: [455, 47, 604, 152], photo: "five_brother_tags/t02_1940s_black.jpg" },
      { type: "sideTag", year: "1940's（黄色地）", caption: "1940's 黄色地", desc: "同じデザインの「黄色地」版。<br>40年代は黒地と黄色地の2種",
        crop: [462, 158, 602, 262], photo: "five_brother_tags/t03_1940s_yellow.jpg" },
    ],
  },
  {
    range: "1940年代〜1950年代",
    name: "プリントの登場",
    bullets: [
      "刺繍だけだったタグに「プリント」が加わる。",
      "文字は「赤＋青」が中心。ウール製品の登録番号「WPL」は59年までに発行されたもので、あれば50年代以前の目安になる。",
    ],
    media: [
      { type: "sideTag", year: "1940〜50's", caption: "1940〜50's", desc: "「プリント」と「刺繍」の2種。<br>文字は青＋赤の2色",
        crop: [757, 54, 923, 154], photo: "five_brother_tags/t04_1940s50s.jpg" },
      { type: "sideTag", year: "1950's", caption: "1950's プリント", desc: "プリントのタグ。「赤丸に5」、<br>ブランド名は大文字",
        crop: [106, 454, 314, 602], photo: "five_brother_tags/t05_1950s_print.jpg" },
      { type: "sideTag", year: "1950's", caption: "1950's WPL", desc: "「白地に赤」の刺繍。<br>最下部の「WPL」は59年頃までの番号",
        crop: [420, 459, 639, 599], photo: "five_brother_tags/t06_1950s_wpl.jpg" },
    ],
  },
  {
    range: "1960年代〜1970年代初期",
    name: "森タグの時代",
    bullets: [
      "タグに「木と山の風景」が入る、通称「森タグ」。「5」は緑の丸の中。",
      "前期と後期は下の表記で見分ける。「PRE-SHRUNK」「NEVER PRESS」があれば後期。",
    ],
    media: [
      { type: "sideTag", year: "1960's", caption: "1960's 森タグ前期", desc: "通称「森タグ前期」。<br>「SANFORIZED」表記はこの頃までとされる",
        crop: [717, 460, 955, 596], photo: "five_brother_tags/t07_1960s_forest_early.jpg" },
      { type: "sideTag", year: "1960〜70's初期", caption: "1960〜70's 森タグ後期", desc: "通称「森タグ後期」。<br>「PRE-SHRUNK」「NEVER PRESS」が入る",
        crop: [126, 808, 320, 946], photo: "five_brother_tags/t08_1960s70s_forest_late.jpg" },
    ],
  },
  {
    range: "1970年代〜",
    name: "現行ロゴへ",
    bullets: [
      "「5 BROTHER」から「FIVE BROTHER」表記に変わり、「SINCE 1890」が入る。",
      "「®」があれば70年代以降。「MADE IN USA」が消えて「SEE REVERSE FOR CARE」に変わっていれば90年代以降。",
    ],
    media: [
      { type: "sideTag", year: "1970〜80's", caption: "1970〜80's", desc: "「青＋茶」の刺繍。「®」と<br>「MADE IN USA」が入る。三角形のほか四角形もある",
        crop: [402, 840, 678, 934], photo: "five_brother_tags/t09_1970s80s.jpg" },
      { type: "sideTag", year: "1990's〜", caption: "1990's〜", desc: "「緑＋オレンジ」の刺繍。<br>「SEE REVERSE FOR CARE」表記",
        crop: [728, 817, 943, 955], photo: "five_brother_tags/t10_1990s.jpg" },
    ],
  },
];

export const summary = {
  heading: "タグ早見ガイド", // 全10枚を年代順に並べる一覧（本人の参考チャートと同じ見せ方）
  closing: "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。",
};
