// Levi's 506XX（通称「ファースト」）の年代判別データ。【下書き段階】
// 出典: fuku-hack.com（506XX完全ガイド）、studmuffin.jp、allblue-japan.com、mylevis501.com（506XXの年代の見分け方・
// リベットの謎・針シンチ）、hands-on-jeans.com（第27・38・39・140・148・149・201回）、jelado.com（506XX後編）、
// denimarchieves.com（1937〜42年製）、levi.com／hypebeast（LVC S506XX 1944）を横断し、複数ソースで矛盾しない内容を採用した。
// 手描きの参考チャートは無し。構成は本人の希望で「戦後を細かく」→4区分（戦前片面タブ／大戦／戦後前期＝47モデル／最終期）。
// 赤タブ前（〜1937年）のページも一度作ったが、オリジナルの写真が見つからず文章ソースも少ないため、本人の判断で外した（2026-11-21）。
// 戦前の分割の出典: mylevis501（赤タブ無し＝1937年6月以前・特許書類、小さいボックスステッチ約2.5cm・ボタンの下、平らなシンチ・SOLIDE刻印が古い）、
// jamtrading（同趣旨）、denimarchieves（1937〜42年製: 片面タブ・滑り止め付きシンチ・鉄製の深い刻印ボタン）。
// 赤タブ前のオリジナル写真は見つからず、胸ポケットは1937〜42年製の写真の赤タブを隣のデニムで上塗りした参考写真（e0_pocket_notab）から描き起こす。
// 1937〜41年のシンチの滑り止め: 付きが多い（mylevis・denimarchieves・jam）／平ら（hands-on 38）→ ヘッジ。
// ヤフオクのオリジナル出品5件（assets/_private_ref/levis_506xx_eras/raw/）で、胸ポケット1つ＋フラップ、
// 2本針シンチ（40年代）とスライドバックル（最終期）の見た目を確認済み。
//
// 【ソース間で食い違いがあり、ヘッジ表現にしている点】
//   - 赤タブの付き始め: 1936年（fuku-hack・studmuffin・allblue）／ジャケットは1937年7月（mylevis、特許書類）→「1937年頃」。
//   - 片面タブの終わり: ほとんどのソース（mylevis・hands-on複数）が「506XXは全期間片面」。studmuffinだけ1950年以降両面 → 不採用。
//   - 針なし（スライド）への移行: 1946年（mylevis）／1947年後期（jelado）／1950年頃（hands-on）→「1940年代末〜」とぼかす。
//   - 大戦モデルのボタン: 月桂樹ボタンが典型（多数）だが、社名入りや既製ボタンの個体もある（mylevis・hands-on）→「〜が多い」。
//   - 大戦モデルの期間: 1942〜46年頃（fuku-hack）／Levi's公式は簡略化を1944年からとする（hypebeast・LVC）→「1942〜45年頃」。
//   - リベット刻印: 小文字Co＝戦前、無刻印＝大戦、大文字CO中央寄り＝戦後が多数説。ただし大戦期の混在（hands-on 2023）あり → ヘッジ。
//   - ボタン裏: hands-on 38は「1940年代ドーム／1950年代平ら」、hands-on 140（1950年頃）はドーム → 平らは決め手にしない。
//     「17」刻印は最終期の個体の報告（hands-on 149）→「〜も見られる」。
//   - 507XX登場: 1952年／1953年の両説。506XXとの同時生産期もあるとされる。
//   - Tバック: 「46以上」（fuku-hack・studmuffin・hands-on 39、LVCも46から）。脇ハギは506XXには無く507XXの方式。
//
// 【注意】media の type は既存のスニーカー用イラスト(lib/illustrations.mjs)を仮の見た目として流用しているだけ。
//   shoeSole → シンチバック / heelPatch → 胸ポケット / insole → ボタン / sideTag → リベット
// 参考写真（非公開）: hands-on-jeans.com 第27・38・39・125・144・149回、ヤフオク q1250059681。月桂樹ボタンだけはS501XX（ジーンズ）の写真。
// 戦後前期と最終期は胸ポケット・リベットが同じ見た目なので絵を使い回す前提。

export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "LEVI'S 506XX",
  outputPrefix: "levis_506xx_carousel",
  bg: "#F4F3EF",
  heroImage: "covers/levis_506xx_hero.jpg", // 未作成（Geminiで生成予定）
  heroAlt: "LEVI'S 506XX TYPE I JACKET",
  // 表紙は大きいサイズのオリジナル2着（実寸44・表記46-44）の平置き写真（2枚）。本人の指摘で小さい個体から差し替え（2026-11-21）
  heroRefs: ["_private_ref/levis_506xx_eras/raw/t1229927167_00.jpg", "_private_ref/levis_506xx_eras/raw/d1251513267_10.jpg"],
  heroGemini: {
    subject: "a 1940s Levi's 506XX Type I denim jacket",
    // 本人の希望で、質感を実写寄りに（1回目は絵本っぽく軽すぎた）
    intro: "Create a realistic hand-drawn watercolor illustration of a 1940s Levi's 506XX Type I denim jacket, front view, laid flat and buttoned. Attachments, in this order: the FIRST image (a pair of sneakers) is a sample ONLY for the paper, the loose wash vignette and the overall mood — copy neither its subject nor its soft, simplified rendering; render the denim far more realistically than that sample. The other TWO images are photos of real original LARGE-size jackets. Follow these photos faithfully for the shape, proportions, how it lies flat (including where the sleeves lie), and every construction detail. Natural vintage wear (fading, fraying, small repairs) is welcome. Do not reproduce the photos' backgrounds or lighting.",
    styleText: "a highly detailed, realistic watercolor illustration that looks close to a photograph: minimal fine pencil outlines, many layers of transparent watercolor building up true-to-life denim — clearly visible diagonal twill weave, mottled indigo with irregular vertical fading streaks, whiskers and honeycomb creases, roped hems, frayed edges and small repairs, metal buttons with a realistic dull sheen, and realistic light, shadow and depth in the folds. It must still read as a painting on warm ivory textured paper with a loose wash vignette — not a photograph, not glossy, not cartoonish, not flat.",
    details: [
      "LAYOUT: laid flat, front view, buttoned; each sleeve hangs down along the side of the body, tilting inward only slightly; no gap of background between sleeves and body. Pocket, pleats and placket fully visible.",
      "SHAPE like the photos: a LARGE size (around size 44-46) — roomy, wide boxy body that is clearly wider than it is long, broad shoulders, hem at the waist, wide straight sleeves.",
      "Type I construction (NOT Type II or Type III): only ONE chest pocket, on the wearer's left chest, with a flap and one button; a straight horizontal yoke seam; one narrow vertical pleat on each side of the placket from the yoke to the waistband, crossed by small box stitches; no V-shaped seams; no second pocket.",
      "Small red tab on the left side of the chest pocket. Plain aged metal buttons. No patch, label or readable lettering. The cinch belt is on the back and is not visible.",
    ],
    check: "写真どおりの置き方（袖が胴に沿う）・胸ポケットは1つだけ（フラップ付き）・ヒダとボックスステッチ・V字なし・水彩タッチ・背景は無地の紙",
  },
  badge: "MODEL & ERA GUIDE",
  photoFit: "cover",
  subtitle: "ファースト（506XX）のディテール変遷",
  overviewHeading: "概要：すべてのGジャンの原点「ファースト」",
  overviewBullets: [
    "戦前から1950年代前半まで作られたGジャンの原点。胸ポケット1つと背中のベルト「シンチバック」が特徴で、後継はセカンド「507XX」。",
    "赤タブは全期間を通して表だけに文字がある「片面タブ」、パッチは「革パッチ」（欠損した個体も多い）。タブやパッチだけでは時期を絞りにくい。",
    "見分けの手がかりは「シンチバック」「胸ポケット」「ボタン」「リベット」の4点。",
  ],
};

export const eras = [
  {
    range: "1937〜41年頃",
    name: "戦前 片面タブ",
    bullets: [
      "赤タブが付いた最初の時期。胸ポケットの脇に、表だけに文字がある「片面タブ」が付く。背中は2本の針で留める「針シンチ」。",
      "前立てのヒダを留める「ボックスステッチ」は大きめの長方形。シンチの金具は滑り止め付きが多いとされるが、平らな個体もある。",
      "ボタンは社名入りの鉄製で刻印が深く、裏側はふっくらした「ドーム型」とされる。リベットの刻印は小文字の「Co」が主流とされるが、大文字の「CO」の個体もある。",
    ],
    media: [
      { type: "shoeSole", caption: "シンチバック（針）", props: {}, photo: "levis_506xx/e1_cinch_prong.jpg", ref: "_private_ref/levis_506xx_eras/e1_cinch_prong.jpg",
        gemini: { faithful: true, item: "the cinch back of a late-1930s Levi's 506XX denim jacket, close-up", key: "a two-prong metal buckle; the TWO pointed prongs pierce the denim strap", check: "2本の針がベルトに刺さっていること" } },
      { type: "heelPatch", caption: "胸ポケット（片面タブ付き）", props: { label: "POCKET" }, photo: "levis_506xx/e1_pocket_tab.jpg", ref: "_private_ref/levis_506xx_eras/e1_pocket_tab.jpg",
        gemini: { faithful: true, item: "the single chest pocket of a late-1930s Levi's 506XX denim jacket, close-up", key: "a pocket closed by a flap with one metal button, and a small red tab sewn into the left edge of the pocket", check: "フラップ・ボタン・ポケット左端の赤タブ" } },
      { type: "insole", caption: "ボタン（社名入り）", props: {}, photo: "levis_506xx/e0_button.jpg", ref: "_private_ref/levis_506xx_eras/e0_button.jpg",
        gemini: { faithful: true, item: "a front button of a late-1930s Levi's 506XX denim jacket, close-up", key: "an aged dark metal tack button with the embossed lettering \"LEVI STRAUSS & CO. S.F. CAL.\" around the edge", text: "LEVI STRAUSS & CO. S.F. CAL.", check: "社名の刻印が入ったボタン" } },
      { type: "sideTag", caption: "リベット（Co）", props: {}, photo: "levis_506xx/e0_rivet_co.jpg", ref: "_private_ref/levis_506xx_eras/e0_rivet_co.jpg",
        gemini: { faithful: true, item: "a copper rivet at the corner of the chest pocket of a 1930s Levi's 506XX denim jacket, close-up", key: "the rivet head stamped \"L.S. & Co. S.F.\" with a small lowercase \"o\"", text: "L.S. & Co. S.F.", check: "Coのoが小文字" } },
    ],
  },
  {
    range: "1942〜45年頃",
    name: "大戦モデル S506XX",
    bullets: [
      "第二次大戦の物資統制で作りを簡略化したモデル。品番の頭の「S」はSimplified（簡略化）の意味とされる。",
      "胸ポケットの「フラップ」が省かれ、前ボタンは5つから「4つ」に。ボタンは月桂樹柄の「ドーナツボタン」が多いとされる（社名入りの個体もある）。",
      "リベットは刻印の無い「無刻印」が多いとされる（刻印入りが混じる個体もある）。シンチバックは針シンチのままで、ユリの紋章入りの既製品の金具が付いた個体も見られる。",
    ],
    media: [
      { type: "shoeSole", caption: "シンチバック（針・既製品）", props: {}, photo: "levis_506xx/e2_cinch_lily.jpg", ref: "_private_ref/levis_506xx_eras/e2_cinch_lily.jpg",
        gemini: { faithful: true, item: "the cinch back of a WWII-era Levi's S506XX denim jacket, close-up", key: "a two-prong metal buckle with a decorative embossed frame (a fleur-de-lis pattern on the base)", check: "2本の針・金具の装飾（ユリの紋章）" } },
      { type: "heelPatch", caption: "胸ポケット（フラップ無し）", props: { label: "POCKET" }, photo: "levis_506xx/e2_pocket_noflap.jpg", ref: "_private_ref/levis_506xx_eras/e2_pocket_noflap.jpg",
        gemini: { faithful: true, item: "the single chest pocket of a WWII-era Levi's S506XX denim jacket, close-up", key: "a plain patch pocket with NO flap and NO pocket button", check: "フラップもボタンも無いこと" } },
      { type: "insole", caption: "ボタン（月桂樹）", props: {}, photo: "levis_506xx/e2_button_laurel.jpg", ref: "_private_ref/levis_506xx_eras/e2_button_laurel.jpg",
        gemini: { faithful: true, item: "a front button of a WWII-era Levi's S506XX denim jacket, close-up", key: "a donut-shaped metal button with a hollow center and a laurel-wreath pattern around the ring, no lettering", check: "真ん中が抜けたドーナツ形・月桂樹の模様・文字なし" } },
      { type: "sideTag", caption: "リベット（無刻印）", props: {}, photo: "levis_506xx/e2_rivet_plain.jpg", ref: "_private_ref/levis_506xx_eras/e2_rivet_plain.jpg",
        gemini: { faithful: true, item: "a rivet at the corner of the chest pocket of a WWII-era Levi's denim jacket, close-up", key: "a plain smooth rivet head with NO stamping at all", check: "刻印が無いこと" } },
    ],
  },
  {
    range: "1946〜49年頃",
    name: "戦後前期 47モデル",
    bullets: [
      "戦争が終わり、胸ポケットの「フラップ」と前ボタン5つが復活。通称「47モデル」。",
      "シンチバックは針シンチのままだが、金具に細かい溝の滑り止めが付いた「ヤスリ状」のもの（通称47バックル）が目安とされる。ただし1946年頃や戦中にも似た金具の例がある。",
      "リベットは刻印の「CO」が大文字で、文字が中央に寄ったタイプ。ボタン裏はまだ「ドーム型」が多いとされる。",
    ],
    media: [
      { type: "shoeSole", caption: "シンチバック（ヤスリ状の針）", props: {}, photo: "levis_506xx/e3_cinch_file.jpg", ref: "_private_ref/levis_506xx_eras/e3_cinch_file.jpg",
        gemini: { faithful: true, item: "the cinch back of a late-1940s Levi's 506XX denim jacket, close-up", key: "a two-prong buckle whose metal bar has fine file-like ridges (a textured anti-slip surface)", check: "2本の針＋金具のヤスリ状の溝" } },
      { type: "heelPatch", caption: "胸ポケット（フラップ復活）", props: { label: "POCKET" }, photo: "levis_506xx/e3_pocket_flap.jpg", ref: "_private_ref/levis_506xx_eras/e3_pocket_flap.jpg",
        gemini: { faithful: true, item: "the single chest pocket of a late-1940s Levi's 506XX denim jacket, close-up", key: "the pocket is closed by a flap with rounded lower corners and one metal button", check: "フラップとボタンがあること" } },
      { type: "insole", caption: "ボタン裏（ドーム型）", props: {}, photo: "levis_506xx/e3_button_back_dome.jpg", ref: "_private_ref/levis_506xx_eras/e3_button_back_dome.jpg",
        gemini: { faithful: true, item: "the back (inside) of a front button on a 1940s Levi's 506XX denim jacket, close-up", key: "the back of the button is a smooth rounded dome", check: "裏側がふっくらしたドーム型" } },
      { type: "sideTag", caption: "リベット（大文字CO）", props: {}, photo: "levis_506xx/e3_rivet_CO.jpg", ref: "_private_ref/levis_506xx_eras/e3_rivet_CO.jpg",
        gemini: { faithful: true, item: "a copper rivet at the corner of the chest pocket of a late-1940s Levi's 506XX denim jacket, close-up", key: "the rivet head stamped \"L.S. & CO. S.F.\" with a capital \"O\", small letters gathered toward the center", text: "L.S. & CO. S.F.", check: "COが大文字・文字が中央寄り" } },
    ],
  },
  {
    range: "1950〜53年頃",
    name: "最終期 スライドバックル",
    bullets: [
      "シンチバックが針の無い「スライドバックル」に。家具や車のシートを針で傷つけないための変更と伝えられている。移行は1940年代末からとする説もある。",
      "前立てのボックスステッチ（ヒダを留める四角い縫い目）がボタンと同じ高さにそろう個体が多いとされる。ボタン裏に「17」などの数字の刻印が入った個体も見られる。",
      "1952〜53年頃にセカンド「507XX」が登場し、しばらく並行して作られたとされる。",
    ],
    media: [
      { type: "shoeSole", caption: "シンチバック（スライド）", props: {}, photo: "levis_506xx/e4_cinch_slide.jpg", ref: "_private_ref/levis_506xx_eras/e4_cinch_slide.jpg",
        gemini: { faithful: true, item: "the cinch back of an early-1950s Levi's 506XX denim jacket, close-up", key: "a rectangular slide buckle with NO prongs; the strap simply passes through it", check: "針が無いこと・四角い金具" } },
      { type: "heelPatch", caption: "胸ポケット（フラップ付き）", props: { label: "POCKET" }, photo: "levis_506xx/e3_pocket_flap.jpg" },
      { type: "insole", caption: "ボタン裏（17刻印も）", props: {}, photo: "levis_506xx/e4_button_back_17.jpg", ref: "_private_ref/levis_506xx_eras/e4_button_back_17.jpg",
        gemini: { faithful: true, item: "the back (inside) of a front button on an early-1950s Levi's denim jacket, close-up", key: "the button back with a small stamped number \"17\"", text: "17", check: "17の刻印" } },
      { type: "sideTag", caption: "リベット（大文字CO）", props: {}, photo: "levis_506xx/e3_rivet_CO.jpg" },
    ],
  },
];

// extras: 年代ページの後・早見ガイドの前に入る特集ページ（早見ガイドの表には入らない）。本人の希望で追加。
// 出典: fuku-hack・studmuffin（46以上でTバック、織幅不足が理由）、hands-on第39回（46インチ以上、セルビッジ幅70〜80cm程度、
// 507XXは脇に継ぎ足し）、LVC各種（46からT-Back）。
//   insole → 背面 / heelPatch → Tバック / shoeSole → 継ぎ目アップ / sideTag → 507XXとの比較（仮の見た目）
export const extras = [
  {
    range: "サイズ46以上",
    name: "幻のTバック",
    bullets: [
      "サイズ46以上の大きな506XXは、背中を左右2枚の生地で継いだ「Tバック」仕様とされる。ヨークの横線と中央の縦線でT字に見えるのが名前の由来。",
      "当時の織り幅（耳付きで約70〜80cm）では、大きな背中を1枚で取れなかったためとされる。セカンド507XXの大きいサイズは、両脇を継ぎ足す「脇ハギ」方式とされる。",
    ],
    media: [
      { type: "insole", caption: "背面（通常サイズ）", props: {}, photo: "levis_506xx/x_back_plain.jpg", ref: "_private_ref/levis_506xx_eras/x_back_plain.jpg",
        gemini: { faithful: true, item: "the back of a 1940s Levi's 506XX denim jacket, laid flat", key: "the back body below the yoke is ONE single piece of denim with the cinch belt at the waist", check: "背中が1枚・中央に継ぎ目が無い" } },
      { type: "heelPatch", caption: "Tバック（46以上）", props: { label: "T-BACK" }, photo: "levis_506xx/x_tback.jpg", ref: "_private_ref/levis_506xx_eras/x_tback.jpg",
        gemini: { faithful: true, item: "the back of a very large 1940s Levi's 506XX denim jacket, laid flat", key: "a vertical center-back seam from the yoke down to the waistband, forming a T with the yoke seam; the cinch belt at the waist", check: "背中中央の縦の継ぎ目でT字・シンチバックあり" } },
      { type: "shoeSole", caption: "中央の継ぎ目アップ", props: {}, photo: "levis_506xx/x_tback_close.jpg", ref: "_private_ref/levis_506xx_eras/x_tback_close.jpg",
        gemini: { faithful: true, item: "close-up of the center-back seam of a Levi's 506XX T-back denim jacket where it meets the yoke", key: "the vertical center seam meeting the horizontal yoke seam in a T, with orange-tan stitching", check: "T字の交点がはっきり見える" } },
      // 507XX制作で作った脇ハギの絵を比較用に使い回す
      { type: "sideTag", caption: "参考：507XXは脇ハギ", props: {}, photo: "levis_507xx/x_side_panel.jpg" },
    ],
  },
];

export const summary = {
  heading: "ディテール早見ガイド",
  columns: ["シンチバック", "胸ポケット", "ボタン", "リベット"],
  closing: "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。",
};
