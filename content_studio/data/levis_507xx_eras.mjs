// Levi's 507XX（通称「セカンド」）の年代判別データ。【下書き段階】
// 出典: tf-style.com（トレファクスタイル アメリカ村店）、fashionsnap.com（mustbuy vintage vol.65）、
// hands-on-jeans.com（裏ブログ第226回）、longhorn-imports.com（507XX推定革パッチ）、vook.tokyo（507XXギャラ入り）、
// levi-fun.com（Gジャン見分け方）を横断し、複数ソースで矛盾しない内容を採用した。手描きの参考チャートは無し。
// 構成は本人の指定で3区分（片面タブ最初期／革パッチ両面タブ／紙パッチ）。
//
// 【ソース間で食い違いがあり、ヘッジ表現にしている点】
//   - 登場年: 1952年頃（fashionsnap・vook・levi-fun）／1953年（tf-style、LVC品名「1953 Type II」）。
//   - 終了: 1962年頃（tf-style・vook）／557XX登場後もしばらく製造継続（fashionsnap）。
//   - 革→紙の移行: 1954〜55年頃（longhorn・hands-on・vook）が多数。levi-funの1957年前後は他と合わず不採用。
//   - 片面タブ: 1952年頃のみ（vook・hands-on）。混在期もあるとされる。
//   - ボタン裏刻印: 革期は「ドット」（vook・longhorn）だが、革期の個体に小さい「17」の報告（hands-on）もある
//     → 写真項目にはせず、本文で「〜とされる」とヘッジ。
//   - リベットの素材（磁石テスト）はソース間で矛盾が大きいので不採用。
//   - 紙パッチの「ギャラ無し」（1961年以降の一部）はvookのみの記載なので本文で軽く触れるだけ。
//   - 胸ポケットのカンヌキ色（革期=黒・紺／紙期=オレンジ）は2ソース一致・例外ありのため本文でヘッジ付き。
//
// 【注意】media の type は既存のスニーカー用イラスト(lib/illustrations.mjs)を仮の見た目として
// 流用しているだけで意味は合っていない。Gemini画像が用意でき次第 photo で差し替わる。
//   sideTag → 赤タブ / heelPatch → パッチ / insole → 前立てステッチ / shoeSole → ウエストバンド
// 1952年頃と1953〜54年頃は赤タブ以外の見た目が同じなので、パッチ・前立て・ウエストバンドの絵は使い回す前提。

export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "LEVI'S 507XX",
  outputPrefix: "levis_507xx_carousel",
  bg: "#F4F3EF",
  heroImage: "covers/levis_507xx_hero.jpg", // 未作成（Geminiで生成予定）
  heroAlt: "LEVI'S 507XX TRUCKER JACKET",
  heroRef: "_private_ref/levis_507xx_eras/hero.jpg",
  // 表紙は別々の出品のオリジナル3着を添付（1枚の描き写しにならないように）。すべて平置きで袖が胴に付いている写真
  heroRefs: ["_private_ref/levis_507xx_eras/hero.jpg", "_private_ref/levis_507xx_eras/hero_b.jpg", "_private_ref/levis_507xx_eras/hero_c.jpg"],
  heroGemini: {
    // 2026-11-21 方針: 形と置き方は実物写真3枚に忠実に、画風は前回表紙の質感の切り抜き（シルエットが写らない）を見本に
    // 1枚目: VANS表紙（水彩タッチの見本・靴なので形は真似されない） 2枚目: 前回表紙の胸まわり切り抜き（荒い生地感の見本）
    styleImage: ["covers/vans_authentic_hero.jpg", "_private_ref/levis_507xx_eras/hero_texture.jpg"],
    intro: "Create a hand-drawn watercolor illustration of a 1950s Levi's 507XX Type II denim jacket, front view, laid flat and buttoned. Attachments: the FIRST image (a pair of sneakers) is the drawing-style sample — copy only its technique, not its subject. The SECOND image is a close-up crop showing the denim character I want (it does not show the jacket shape). The other THREE images are photos of real original 507XX jackets. Follow these photos faithfully for the jacket's shape, proportions and how it lies flat: the body, sleeves, collar, yoke, pockets, pleats and buttons should look like them. Natural vintage wear and individual character (fading, fraying, small repairs, stains) are welcome. Do not reproduce the photos' backgrounds or lighting.",
    styleText: "hand-drawn watercolor illustration in the style of the FIRST (sneaker) sample: soft graphite pencil outlines and sketch lines, transparent layered watercolor washes, gentle soft-edged shading, warm ivory textured paper with a loose wash vignette. Within that watercolor style, keep the rugged character of the vintage denim from the SECOND sample: mottled indigo, visible diagonal twill hatching, irregular vertical fading, pale abraded edges and roped seams. Painterly and soft — not photorealistic, not glossy, not cartoonish.",
    subject: "a 1950s Levi's 507XX Type II denim jacket",
    details: [
      "LAYOUT like the photos: laid flat; each sleeve hangs down along the side of the body and tilts inward only SLIGHTLY — about 5 to 10 degrees from vertical, just a little past parallel. The sleeves overlap only the outer edge of the body; each cuff rests on the outer end of the waistband, directly below the outer edge of the chest pocket — never crossing in front of the pockets or toward the center. Pockets, pleats and placket stay fully visible. NO gap of background between the sleeves and the body.",
      "SHAPE like the photos: short, boxy, almost square body; hem at the waist; broad shoulders; wide straight sleeves.",
      "Type II construction (NOT Type III): straight horizontal yoke seam across the chest; two patch pockets right below it with straight rectangular flaps and one button each; one narrow vertical pleat on each side of the placket from the yoke to the waistband, crossed by small box stitches; no V-shaped seams.",
      "Front waistband with only ONE button at center front (the side adjusters are on the back, not visible). Small red tab at the inner edge of the pocket on the wearer's left chest. Plain aged metal buttons. No patch, label or readable lettering.",
    ],
    check: "写真どおりの置き方（袖が胴にぴったり・隙間なし）・箱型・セカンドの作り（V字なし・まっすぐなフラップ・ヒダ）・前のボタン1つ・袖が内側（ハの字に開かない）・VANS表紙のような水彩タッチ＋荒い生地感・背景は無地の紙",
  },


  badge: "MODEL & ERA GUIDE",
  photoFit: "cover",
  subtitle: "セカンド（507XX）のディテール変遷",
  overviewHeading: "概要：プリーツが残る最後のGジャン「セカンド」",
  overviewBullets: [
    "1952年頃にファースト「506XX」の後継として登場し、1960年代前半にサード「557XX」へ移っていく。胸ポケット2つと裾の「サイドアジャスター」が特徴。",
    "約10年の製造期間は、「赤タブ」と「パッチ素材」で3つの時期に分かれる。",
    "パッチは取れている個体がほとんど。「前立て」と「ウエストバンド」のステッチが代わりの手がかりになる。",
  ],
};

export const eras = [
  {
    range: "1952年頃",
    name: "最初期 片面タブ",
    bullets: [
      "登場直後のごく短い期間だけ、赤タブの裏側に文字が無い「片面タブ」が使われたとされる。両面タブへの切り替えは1953年頃とされ、その前後の個体はタブだけでは断定しにくい。",
      "パッチは馬2頭の絵が入った「革パッチ」。前立てのステッチやウエストバンドなど、そのほかの特徴は次の革パッチ期と共通。",
    ],
    media: [
      { type: "sideTag", caption: "赤タブ（片面）", props: {}, photo: "levis_507xx/e1_tab_single.jpg", ref: "_private_ref/levis_507xx_eras/e1_tab_single_flip.jpg",
        gemini: { faithful: true, item: "red tab being flipped with tweezers", key: "the red tab is lifted and turned over by the tweezers, and the side facing the viewer is plain red with NO lettering; the Type II pocket flap and seams look exactly as in the photo", notes: ["Keep the tweezers exactly where they are in the photo — they show that the tab is being flipped.", "Do not draw any letters on the tab."], check: "写真どおりの構図（ピンセットでタブをめくっている）・ポケットの形が写真のまま・見えている側のタブに文字が無い" } },
      { type: "heelPatch", caption: "パッチ（革）", props: { label: "507XX" }, photo: "levis_507xx/e2_patch_leather.jpg", ref: "_private_ref/levis_507xx_eras/e2_patch_leather.jpg",
        gemini: { faithful: true, item: "a rectangular leather patch sewn on the INSIDE of a 1950s Levi's denim jacket, on the inner back just below the collar (the pale reverse side of the denim around it)", key: "reddish-brown aged leather with a worn, rubbed surface; any printing is faded and illegible", check: "ジャケット内側（白っぽい生地）・赤茶の革・文字は判読不能" } },
      { type: "insole", caption: "前立て（コの字ステッチ）", props: {}, photo: "levis_507xx/e2_placket_ushape.jpg", ref: "_private_ref/levis_507xx_eras/e2_placket_crop.jpg",
        gemini: { faithful: true, item: "the front button placket of a 1950s Levi's 507XX denim jacket, close-up of the chest yoke area", key: "every stitch line exactly where it is in the photo: the vertical stitch lines come down and end at the horizontal yoke seam, where they join the yoke stitching", notes: ["Copy ONLY the stitching that is visible in the photo. Do NOT add any extra stitching — no rectangles, boxes or new lines in the center or anywhere else."], check: "写真にないステッチ（真ん中の四角など）が足されていない・縦のステッチが胸の切り替えで止まっている" } },
      { type: "shoeSole", caption: "ウエストバンド（下側シングル）", props: {}, photo: "levis_507xx/e2_waistband_single.jpg", ref: "_private_ref/levis_507xx_eras/e2_waistband.jpg",
        gemini: { faithful: true, item: "the waistband of a 1950s Levi's 507XX denim jacket, close-up", key: "the top stitch line is a chain stitch, the bottom stitch line is a plain single straight lockstitch", check: "下側のステッチが1本のまっすぐな縫い目" } },
    ],
  },
  {
    range: "1953〜54年頃",
    name: "革パッチ 両面タブ",
    bullets: [
      "赤タブは表裏両方に文字が入る「両面タブ」へ。パッチは引き続き「革パッチ」だが、70年以上前の革は縮んだり取れたりしていることがほとんど。",
      "パッチが無くても、前立てのステッチが胸の切り替えで直角に曲がる「コの字」、ウエストバンド下側が「シングルステッチ」なら革パッチ期の目安。胸ポケットの補強（カンヌキ）が黒っぽい糸なのも特徴とされる（例外あり）。",
      "ボタン裏の刻印は「ドット」が多いとされるが、小さな「17」の報告もある。",
    ],
    media: [
      { type: "sideTag", caption: "赤タブ（両面）", props: {}, photo: "levis_507xx/e2_tab_double.jpg", ref: "_private_ref/levis_507xx_eras/e2_tab_double_b.jpg",
        gemini: { faithful: true, item: "the small red woven tab sewn into the side seam of a 1950s Levi's denim jacket chest pocket", key: "white woven lettering \"LEVI'S\" with a capital E, visible on the tab", text: "LEVI'S", check: "大文字のE（BIG E）" } },
      // 革パッチ・前立て・ウエストバンドは1952年頃と同じ見た目なので同じイラストを使い回す
      { type: "heelPatch", caption: "パッチ（革）", props: { label: "507XX" }, photo: "levis_507xx/e2_patch_leather.jpg" },
      { type: "insole", caption: "前立て（コの字ステッチ）", props: {}, photo: "levis_507xx/e2_placket_ushape.jpg" },
      { type: "shoeSole", caption: "ウエストバンド（下側シングル）", props: {}, photo: "levis_507xx/e2_waistband_single.jpg" },
    ],
  },
  {
    range: "1955〜62年頃",
    name: "紙パッチ",
    bullets: [
      "パッチが革から紙へ。初めは保証の文言入りの通称「ギャラ入り」（EVERY GARMENT GUARANTEED）とされ、文言の無い個体もごく少数あるとされる。",
      "前立てのステッチは切り替えを越えて下まで「まっすぐ」、ウエストバンドは上下とも鎖状の「チェーン」に。胸ポケットのカンヌキはオレンジ系の糸が目安とされる。ボタン裏は「17」の刻印が多いとされる（革パッチ期の個体にも見られる）。",
    ],
    media: [
      { type: "sideTag", caption: "赤タブ（両面）", props: {}, photo: "levis_507xx/e2_tab_double.jpg" },
      { type: "heelPatch", caption: "パッチ（紙・ギャラ入り）", props: { label: "507XX", sub: "GUARANTEED" }, photo: "levis_507xx/e3_patch_paper.jpg", ref: "_private_ref/levis_507xx_eras/e3_patch_paper.jpg",
        gemini: { faithful: true, item: "a 1950s Levi's paper (card) patch sewn on the INSIDE of a denim jacket, on the inner back just below the collar (the pale reverse side of the denim around it), aged tan card with a faded two-horse illustration", key: "the lot number \"507XX\" and the phrase \"EVERY GARMENT GUARANTEED\"", text: "507XX / EVERY GARMENT GUARANTEED", check: "507XX表記・保証文言" } },
      { type: "insole", caption: "前立て（まっすぐ）", props: {}, photo: "levis_507xx/e3_placket_straight.jpg", ref: "_private_ref/levis_507xx_eras/e3_placket.jpg",
        gemini: { faithful: true, item: "the front button placket of a late-1950s Levi's 507XX denim jacket, close-up of the chest yoke area", key: "the two parallel placket stitch lines run STRAIGHT down past the chest yoke seam without turning", check: "ステッチが切り替えを越えてまっすぐ続くこと" } },
      { type: "shoeSole", caption: "ウエストバンド（上下チェーン）", props: {}, photo: "levis_507xx/e3_waistband_chain.jpg", ref: "_private_ref/levis_507xx_eras/e3_waistband.jpg",
        gemini: { faithful: true, item: "the waistband of a late-1950s Levi's 507XX denim jacket, close-up", key: "BOTH the top and bottom stitch lines are chain stitches (looped, braid-like)", check: "上下とも鎖状の縫い目" } },
    ],
  },
];

// extras: 年代ページの後・早見ガイドの前に入る特集ページ（早見ガイドの表には入らない）。本人の希望で追加。
// 出典: fashionsnap vol.65（42以上で脇ハギ・54以上でT字切替）、hands-on第226回・levi-fun（42以上で脇ハギ）、
// Yahoo!知恵袋（42から・まれに40も）、houyhnhnm Vintage Summit 7（当時のカタログは50まで・それ以上は特注の可能性）、
// haute-lineup／LVC出品各種（LVCは44からTバック）。Tバックの開始サイズは52説と54説がある（houyhnhnmの所有者記事では実寸52＝表記54と推定、国内確認3〜4本）。
//   insole → 背面 / sideTag → 脇ハギ / heelPatch → Tバック / shoeSole → 継ぎ目アップ（仮の見た目）
export const extras = [
  {
    range: "サイズ42以上",
    name: "脇ハギ付き",
    bullets: [
      "サイズ42以上の507XXは、身頃の両脇に生地を継ぎ足した「脇ハギ」付きとされる。背中側を見れば、ハギの有無はすぐ分かる。",
      "表記54前後の特大サイズには、背中も中央で継いだ幻の「Tバック」が。特注品とみられ、国内で数本しか確認されていないとされる。",
    ],
    media: [
      { type: "insole", caption: "背面（40以下：ハギなし）", props: {}, photo: "levis_507xx/x_back_plain.jpg", ref: "_private_ref/levis_507xx_eras/x_back_plain.jpg",
        gemini: { faithful: true, item: "the back of a 1950s Levi's 507XX denim jacket, size 40, laid flat", key: "the back body is ONE single piece of denim below the yoke, with no extra side seams", check: "脇に継ぎ目が無いこと" } },
      { type: "sideTag", caption: "脇ハギ（42以上）", props: {}, photo: "levis_507xx/x_side_panel.jpg", ref: "_private_ref/levis_507xx_eras/x_side_panel.jpg",
        gemini: { faithful: true, item: "the back of a 1950s Levi's 507XX denim jacket, size 42, laid flat", key: "an extra narrow vertical denim panel sewn in along each side of the body, from armpit to hem", notes: ["Draw the two side-panel seams clearly with visible orange-tan stitching so they read at small size. Jacket laid flat, seen straight from the back, no measuring tape."], check: "両脇に縦長の継ぎ足し布があること" } },
      { type: "heelPatch", caption: "幻のTバック（54前後）", props: { label: "T-BACK" }, photo: "levis_507xx/x_tback.jpg", ref: "_private_ref/levis_507xx_eras/x_tback.jpg",
        gemini: { faithful: true, item: "the back of a very large 1950s Levi's 507XX denim jacket, laid flat", key: "a vertical center-back seam running from the yoke down to the waistband, forming a T shape with the yoke seam, plus side panels", check: "背中中央の縦の継ぎ目でT字になっていること" } },
      { type: "shoeSole", caption: "脇の継ぎ目アップ", props: {}, photo: "levis_507xx/x_side_panel_close.jpg", ref: "_private_ref/levis_507xx_eras/x_side_close.jpg",
        gemini: { faithful: true, item: "close-up of the side panel seam on a 1950s Levi's 507XX denim jacket", key: "a straight vertical seam joining the narrow side panel to the main back body, with orange-tan stitching", check: "縦の継ぎ目がはっきり見えること" } },
    ],
  },
];

export const summary = {
  heading: "ディテール早見ガイド",
  columns: ["赤タブ", "パッチ", "前立てステッチ", "ウエストバンド"],
  closing: "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。",
};
