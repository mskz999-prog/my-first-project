// BEN DAVIS「FRISCO PANTS（フリスコパンツ）」の年代判別データ。
// 出典: 公式サイト(bendavisjp.com/about)、BEN DAVISタグの年代判別を扱う複数の古着ブログ
// （ferantracing.jp、de-suke.com、vintagematome.com）、ユーザーが持ち込んだメルカリ出品12点
// （50's-60's〜00's、各年代の実個体・出品者コメント）、および本人の実物知識（トップボタンの
// スナップ／ボタンフライの違い、素材の混紡比率）を横断して、矛盾しない内容を採用した。
// 【本人からの訂正を反映済み】
//   - 三角タグ（"ALL FULLY SHRUNK COTTON"表記）はBEN DAVISのトップス（シャツ等）の話であり、
//     フリスコパンツ（ボトムス）には当てはまらない。50's-60'sのパンツ用タグは終始「BEN DAVIS」
//     の一枚タグとして扱う。
//   - 素材は年代を問わずポリコットン混紡が基本で、コットン100%の個体はむしろ稀。「00年代から
//     混紡に変わった」という当初案は誤りだったため削除し、素材表記は年代の決め手として使わない。
//   - トップボタンは「スナップボタン」か「ボタンフライ」かの違いがあり、00's以降はボタンフライ
//     になる（本人確認）。00's以前がいつからスナップボタンだったかまでは資料上裏付けが取れて
//     いないため、ひとまず「00's以降=ボタンフライ、それ以前=スナップボタン」として扱っている
//     （要・実物での再確認）。
//
// 【注意】media の type は既存のスニーカー用イラスト(lib/illustrations.mjs)を仮の見た目として
// 流用しているだけで、意味的には合っていない（パンツのタグ・ボタン用イラストが無いため）。
// 実写真が用意でき次第 photo フィールドで差し替える前提。

export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "BEN DAVIS/FRISCO PANTS",
  outputPrefix: "ben_davis_frisco_carousel",
  bg: "#F4F3EF",
  heroImage: "covers/ben_davis_frisco_hero.jpg",
  heroAlt: "BEN DAVIS FRISCO PANTS",
  badge: "MODEL & ERA GUIDE",
  subtitle: "年代別ディテール変遷のハイライト",
  overviewHeading: "概要：西海岸ワークウェアの定番、フリスコパンツ",
  overviewBullets: [
    "1935年、サンフランシスコで創業したワークウェアブランド「BEN DAVIS」。創業者ベン・デイビスの祖父ジェイコブ・デイビスは、リーバイスとリベット留めポケットの特許を共同取得した人物。",
    "「フリスコ」はサンフランシスコの愛称。タグの「スマイリーゴリラ」が目印の定番ワークパンツ。",
  ],
};

export const eras = [
  {
    range: "50's-60's",
    name: "BEN DAVISタグ期",
    bullets: [
      "この頃のフリスコパンツは、大きく「BEN DAVIS」とスマイリーゴリラが入ったシンプルな一枚タグが基本（トップス〈シャツ等〉で見られる折り込み式の「三角タグ」とは別物）。",
      "トップボタンは「スナップボタン」仕様が基本とされる。",
    ],
    media: [
      { type: "heelPatch", caption: "タグ（BEN DAVIS）", props: { label: "BEN DAVIS" } },
      { type: "shoeSole", caption: "トップボタン（スナップ）", props: {} },
      { type: "sideTag", caption: "内タグ（サイズ表記）", props: {} },
      { type: "insole", caption: "内タグ（素材・原産国表記）", props: {} },
    ],
  },
  {
    range: "70's前期",
    name: "黄タグ登場期（プリント）",
    bullets: [
      "「BEN DAVIS」の一枚タグに代わって、鮮やかな「黄タグ」が登場し始める年代とされる。この時期の黄タグは「プリント」（印刷）仕上げなのが特徴で、後の70's（刺繍仕上げ）と見分けるポイントになる。",
      "表記は引き続き「UNION MADE」。®マークはまだ付かない。トップボタンは引き続きスナップボタン仕様とされる。",
    ],
    media: [
      { type: "heelPatch", caption: "タグ（黄タグ・プリント）", props: { label: "BEN DAVIS", fill: "#e8c34a" } },
      { type: "shoeSole", caption: "トップボタン（スナップ）", props: {} },
      { type: "sideTag", caption: "内タグ（サイズ表記）", props: {} },
      { type: "insole", caption: "内タグ（素材・原産国表記）", props: {} },
    ],
  },
  {
    range: "70's",
    name: "黄タグ定着期（刺繍）",
    bullets: [
      "黄タグが標準的なデザインとして定着する年代。70's前期の「プリント」黄タグに対して、この時期は「刺繍」仕上げの黄タグに変わるのが違い。",
      "この頃の個体は「表記サイズなし・実寸のみ」で売られていることが多く、内タグにサイズが印字されていない個体が目立つ。",
    ],
    media: [
      { type: "heelPatch", caption: "タグ（黄タグ・刺繍）", props: { label: "BEN DAVIS", fill: "#e8c34a" } },
      { type: "sideTag", caption: "内タグ（サイズ表記なしの個体が多い）", props: {} },
      { type: "shoeSole", caption: "トップボタン（スナップ）", props: {} },
      { type: "insole", caption: "内タグ（素材・原産国表記）", props: {} },
    ],
  },
  {
    range: "80's初期",
    name: "ウエスト内側無地期",
    bullets: [
      "後年の「ゴリラカット」系統で見られるような、ウエスト内側へのゴリラマークの刻印・プリントがまだ入らない年代とされる（古着店の出品コメントより）。ディテール全体としても70年代の作りに近い。",
      "タグは黄タグから「UNION MADE」表記のタグに変わる。トップボタンはスナップボタン仕様が続く。",
    ],
    media: [
      { type: "heelPatch", caption: "タグ（UNION MADE表記）", props: { label: "BEN DAVIS", sub: "UNION MADE" } },
      { type: "shoeSole", caption: "ウエスト内側（ゴリラマークなし）", props: {} },
      { type: "sideTag", caption: "内タグ（サイズ表記）", props: {} },
      { type: "insole", caption: "トップボタン（スナップ）", props: {} },
    ],
  },
  {
    range: "80's",
    name: "UNION MADE後期",
    bullets: [
      "タグの表記はまだ「UNION MADE」のまま。®マークもまだ付かず、90年代の変化前夜にあたる年代とされる。",
      "この頃のブラウンカラーなど、USA製自体が近年の古着市場では出回りにくく希少とされている（出品側のコメントより）。トップボタンはスナップボタン仕様。",
    ],
    media: [
      { type: "heelPatch", caption: "タグ（UNION MADE表記）", props: { label: "BEN DAVIS", sub: "UNION MADE" } },
      { type: "shoeSole", caption: "トップボタン（スナップ）", props: {} },
      { type: "sideTag", caption: "内タグ（サイズ表記）", props: {} },
      { type: "insole", caption: "内タグ（素材・原産国表記）", props: {} },
    ],
  },
  {
    range: "90's",
    name: "U.S.A. MADE・®マーク期",
    bullets: [
      "タグの表記が「UNION MADE」から「U.S.A. MADE」へ切り替わり、ゴリラの絵柄の横に®（登録商標）マークが新たに加わるのがこの年代の一番のポイント。ゴリラの表情もやや変化するとされる。",
      "内タグにサイズがきちんと印字されている個体が増え、「表記サイズ」と実寸を併記した出品が目立つようになる。トップボタンは引き続きスナップボタン仕様とされる。",
    ],
    media: [
      { type: "heelPatch", caption: "タグ（U.S.A. MADE・®マーク）", props: { label: "BEN DAVIS", sub: "U.S.A. MADE ®" } },
      { type: "sideTag", caption: "内タグ（サイズ表記）", props: {} },
      { type: "shoeSole", caption: "トップボタン（スナップ）", props: {} },
      { type: "insole", caption: "内タグ（素材・原産国表記）", props: {} },
    ],
  },
  {
    range: "00's",
    name: "ボタンフライ切り替え期",
    bullets: [
      "トップボタンが「スナップボタン」から「ボタンフライ」（複数ボタン留め）へ切り替わるのがこの年代の一番わかりやすいポイント。",
      "生地はUSA製のままでも、縫製工程が海外（ドミニカ共和国など）に移る個体が増えてくる年代とされる。内タグに縫製国の表記が加わっている場合、その手がかりになる。",
    ],
    media: [
      { type: "shoeSole", caption: "トップボタン（ボタンフライ）", props: {} },
      { type: "heelPatch", caption: "タグ（®マーク継続）", props: { label: "BEN DAVIS", sub: "U.S.A. MADE ®" } },
      { type: "insole", caption: "内タグ（縫製国表記）", props: {} },
      { type: "sideTag", caption: "内タグ（サイズ表記）", props: {} },
    ],
  },
];

export const summary = {
  heading: "ディテール早見ガイド",
  closing:
    "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。",
};
