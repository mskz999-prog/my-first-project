// Levi's 557XX〜557（通称「サード」）の年代判別データ。【下書き段階】
// 出典: mylevis501.com（557XXギャラ入りの見分け方）、hands-on-jeans.com（557XXギャラ無し）、
// longhorn-imports.com（ギャラ入りとギャラ無しの違い）、hikakaku.com、levi-fun.com、
// fashionsnap.com（mustbuy vintage vol.95）、shibaken.work（「A」刻印）、levi.com（LVC 1961 557）
// を横断し、複数ソースで矛盾しない内容を採用した。手描きの参考チャートは無し。
//
// 【ソース間で食い違いがあり、ヘッジ表現にしている点】
//   - 登場年: 多くのブログは1962年。一方LVC（公式復刻）の品名は「1961 557」。
//   - ギャラ入りの終わり: 1962年頃とする説と1963年頃とする説がある。
//   - ギャラ無し期のフラップ裏: ライトオンス（mylevis501）／レギュラーデニム（hands-on-jeans）
//     の両方の報告あり。移行期は各ディテールが混在するため、最終判別はパッチ表記によるとされる。
//   - 刻印「O」は557XX・557の両方に存在するため、Oだけでは判別できない。
//
// 【注意】media の type は既存のスニーカー用イラスト(lib/illustrations.mjs)を仮の見た目として
// 流用しているだけで意味は合っていない（ジャケット用イラストが無いため）。実写真/Gemini画像が
// 用意でき次第 photo フィールドで差し替える前提。
//   heelPatch → 紙パッチ / shoeSole → ボタン裏刻印 / insole → フラップ裏 / sideTag → 袖口ステッチ

export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "LEVI'S 557XX/557",
  outputPrefix: "levis_557_carousel",
  bg: "#F4F3EF",
  heroImage: "covers/levis_557_hero.jpg", // 未作成（Geminiで生成予定）
  heroAlt: "LEVI'S 557XX TRUCKER JACKET",
  badge: "MODEL & ERA GUIDE",
  photoFit: "cover", // 写真をグレーの余白なしで枠いっぱいに描く（本人希望）
  subtitle: "サード（557XX〜557）のディテール変遷",
  overviewHeading: "概要：今のGジャンの原型になった「サード」",
  overviewBullets: [
    "1962年頃、セカンド「507XX」をモデルチェンジして登場したのが「557XX」。前立てのプリーツを廃止し、胸から裾へ走る「V字ステッチ」を採用した、現代のGジャンの原型とされるモデル。",
    "製造期間は1967年頃に「70505」（フォース）へ切り替わるまでの約5年と短く、その中でもパッチ表記の違いで「ギャラ入り」「ギャラ無し」「557」の3段階に分けられる。",
    "見分けのカギは「紙パッチ」「ボタン裏の刻印」「フラップ裏の生地」「袖口のステッチ」の4点。",
  ],
};

export const eras = [
  {
    range: "1962年頃",
    name: "557XX ギャラ入り",
    bullets: [
      "紙パッチに「EVERY GARMENT GUARANTEED」（品質保証の文言、通称「ギャラ」）が入る最初期。ボタン裏の刻印は数字2桁の「17」が目安とされ、17ならほぼギャラ入りと判断できるとされる。",
      "胸ポケットのフラップ裏に本体より薄い「ライトオンスデニム」、袖口などにセカンドと同じ「折り返しステッチ」が残るなど、507XXの作りを色濃く引き継ぐ。",
    ],
    media: [
      // photo は本人がGeminiで生成した水彩イラスト（表紙と同じタッチ）
      { type: "heelPatch", caption: "紙パッチ（ギャラ入り）", props: { label: "557XX", sub: "GUARANTEED" }, photo: "levis_557/e1_patch_guaranteed.jpg" },
      { type: "shoeSole", caption: "ボタン裏刻印（17）", props: {}, photo: "levis_557/e1_button_17.jpg" },
      { type: "insole", caption: "フラップ裏（ライトオンス）", props: {}, photo: "levis_557/e1_flap_lightounce.jpg" },
      { type: "sideTag", caption: "袖口（折り返しステッチ）", props: {}, photo: "levis_557/e1_cuff_folded_stitch.jpg" },
    ],
  },
  {
    range: "1963〜66年頃",
    name: "557XX ギャラ無し",
    bullets: [
      "パッチから保証の文言が消え、品番「557XX」のみの表記に。ボタン裏の刻印は数字からアルファベット1文字の「D」（デニソン工場とされる）へ移るが、胸ポケットのボタンだけ「17」が残る個体も多いとされる。",
      "袖口の「折り返しステッチ」は基本的に姿を消す。フラップ裏はライトオンスの個体と本体と同じデニムの個体の両方が報告される移行期で、最終的な判別は「パッチ表記」が決め手。",
    ],
    media: [
      { type: "heelPatch", caption: "紙パッチ（ギャラ無し）", props: { label: "557XX" }, photo: "levis_557/e2_patch_no_guarantee.jpg" },
      { type: "shoeSole", caption: "ボタン裏刻印（D）", props: {}, photo: "levis_557/e2_button_d.jpg" },
      { type: "insole", caption: "フラップ裏（個体差あり）", props: {}, photo: "levis_557/e2_flap.jpg" },
      { type: "sideTag", caption: "袖口（折り返しなし）", props: {}, photo: "levis_557/e2_cuff.jpg" },
    ],
  },
  {
    range: "1966〜67年頃",
    name: "557（XX表記なし）",
    bullets: [
      "パッチの品番から「XX」が省略され「557」表記に。最後は「557／70505」のダブルネームを経て、「70505」（フォース）へ品番が切り替わる。",
      "ボタン裏は「O」などのアルファベット刻印（ただしOは557XXにもあるため単独では決め手にならない）。フラップ裏は本体と同じデニムの個体が中心とされる。",
    ],
    media: [
      { type: "heelPatch", caption: "紙パッチ（557表記）", props: { label: "557" }, photo: "levis_557/e3_patch_557.jpg" },
      { type: "shoeSole", caption: "ボタン裏刻印（O など）", props: {}, photo: "levis_557/e3_button_o.jpg" },
      // ギャラ無し期と同じ見た目（本体と同じデニム）なので、同じイラストを使い回している（本人了承）
      { type: "insole", caption: "フラップ裏（本体と同じデニム）", props: {}, photo: "levis_557/e2_flap.jpg" },
      { type: "sideTag", caption: "袖口（折り返しなし）", props: {}, photo: "levis_557/e3_cuff.jpg" },
    ],
  },
];

export const summary = {
  heading: "ディテール早見ガイド",
  // 早見表の列見出し（各年代の media と同じ並び順）
  columns: ["紙パッチ", "ボタン裏刻印", "フラップ裏", "袖口ステッチ"],
  closing:
    "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。",
};
