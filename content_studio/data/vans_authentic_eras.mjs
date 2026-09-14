// VANS AUTHENTICの年代判別データ。
// 複数の古着専門ブログに加え、ユーザーが持ち込んだ手描きまとめ図（ヒールパッチ／サイドタグ／
// ソールの6段階チャート）を照合し、矛盾しない内容を採用して6段階に整理した参考情報。
// media は各年代で「注目すべきディテール」の数だけ並べる（1年代=1枚とは限らない）。

// サマリの直後に入れる「VANS AUTHENTICとは」概説スライド用のテキスト。
// 出典: Wikipedia(Vans / Paul Van Doren / Z-Boys)、FundingUniverse、vans.com公式ヒストリー、
// MR PORTER、Heddels、Hypebeast(Z-Boys interview)等を横断して、複数ソースで一致する内容を採用。
// 「off the wall」のセリフ自体や生地持ち込みの逸話は、各ソースが揃って"伝承"として紹介している
// ため、断定を避けた表現にしている。
export const intro = {
  eyebrow: "VANS AUTHENTICとは",
  heading: "すべての始まりは、飾り気のない1足だった",
  sections: [
    {
      label: "起源から、スケートカルチャーの定番へ",
      icon: "storefront",
      paragraph:
        "1966年、ポール・ヴァンドーレンらがカリフォルニア州アナハイムに「The Van Doren Rubber Company」を創業。最初に作られたのが後の「Authentic」、社内呼称「Style #44」だった。1970年代、南カリフォルニアのスケーターたちがこの靴を愛用し始めたことをきっかけに、VANSとスケートカルチャーの結びつきが生まれていく。",
    },
  ],
  closing:
    "次のページから、ヒールパッチ・サイドタグ・ソールの違いを年代ごとに見ていこう。",
};

// カルーセル最後の「まとめ」ページ用データ。各年代の早見表として使う。
export const summary = {
  heading: "ディテール早見ガイド",
  closing:
    "保存して、古着屋やフリマアプリでチェックする時のお供にどうぞ。次回はアイテム・ブランド紹介も予定しています。",
};

// render_era_slides.mjs（汎用エンジン）に渡すブランド・表紙まわりの設定。
// 新しいトピックを作る際は、この形のmetaを持つ data/<topic>.mjs を用意すればよい。
export const meta = {
  brand: "VINTAGE FIELD NOTES",
  series: "VANS AUTHENTIC/ERA",
  outputPrefix: "vans_authentic_carousel",
  bg: "#F4F3EF",
  heroImage: "covers/vans_authentic_hero.jpg",
  heroAlt: "VANS AUTHENTIC",
  badge: "MODEL & ERA GUIDE",
  subtitle: "年代別ディテール変遷のハイライト",
  overviewHeading: "概要：VANSの歴史を紡ぐ原点モデル",
  overviewBullets: [
    "1966年、カリフォルニア州アナハイムで誕生。設立時「Style #44」として登場し、後に「Authentic」と呼ばれるようになるVANS最古のアイコン。",
    "1976年には、Z-Boysのトニー・アルヴァやステイシー・ペラルタらとの協力でデザインされたとされる「ERA」(Style #95)も登場。",
    "ヒールパッチ・インソール表記・ソール形状の変遷は両モデルに共通。年代を見分けるポイントを解説。",
  ],
};

export const eras = [
  {
    range: "66〜70s初期",
    name: "VAN→VAN DOREN期",
    bullets: [
      "社名がまだ「Van Doren Rubber Company」だった最初期。ヒールパッチは飾り気のない「VAN」のみの表記から、程なく「VAN DOREN／Made in U.S.A.」表記へと切り替わっていく過渡期にあたる。",
      "この頃はまだサイドタグ自体が存在せず、ソールも後年主流になるワッフルパターンではなく、青みがかった「スリットソール」が使われていた。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ（初期）", props: { label: "VAN" }, photo: "heel_patches/van.jpg" },
      { type: "heelPatch", caption: "ヒールパッチ（後期）", props: { label: "VAN DOREN", sub: "Made in U.S.A." }, photo: "heel_patches/van_doren.jpg" },
      { type: "insole", caption: "インソール（VAN DOREN表記）", props: { label: "VAN DOREN" }, photo: "insoles/van_doren.jpg" },
      { type: "shoeSole", caption: "ソール（スリット）", props: { type: "slit" }, photo: "soles/slit_blue.jpg" },
    ],
  },
  {
    range: "70s中期",
    name: "サイドタグ登場期",
    bullets: [
      "ヒールパッチは「VAN DOREN／Made in U.S.A.」のまま据え置かれる一方、新たに青文字のサイドタグ「VANS」がアッパー側面に初めて登場する。",
      "同時にソールも茶色の「ワッフルソール」へ切り替わり、現在まで続くVANSらしいシルエットがこのあたりでほぼ固まる。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VAN DOREN", sub: "Made in U.S.A." }, photo: "heel_patches/van_doren.jpg" },
      { type: "insole", caption: "インソール（VANS表記）", props: { label: "VANS" }, photo: "insoles/vans_usa.jpg" },
      { type: "sideTag", caption: "サイドタグ（青文字）", props: { label: "VANS", color: "#2c4a7c" }, photo: "side_tags/vans_blue.jpg" },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" }, photo: "soles/waffle_brown.jpg" },
    ],
  },
  {
    range: "76〜70s後期",
    name: "OFF THE WALL登場期",
    bullets: [
      "1976年、南カリフォルニアのスケートカルチャーとの結びつきを象徴する「OFF THE WALL」ロゴが、赤いヒールパッチに初めて刻まれた年代。左上には小さく「T.M.」の表記が入る。",
      "Z-Boysのトニー・アルヴァらが実際に履いていた時期と重なるため、ヴィンテージ古着として特に人気が高い年代のひとつとされる。サイドタグは引き続き青文字の「VANS」。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#c9564a" }, photo: "heel_patches/off_the_wall_tm.jpg" },
      { type: "insole", caption: "インソール（VANS表記）", props: { label: "VANS" }, photo: "insoles/vans_usa.jpg" },
      { type: "sideTag", caption: "サイドタグ（青文字）", props: { label: "VANS", color: "#2c4a7c" }, photo: "side_tags/vans_blue.jpg" },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" }, photo: "soles/waffle_brown.jpg" },
    ],
  },
  {
    range: "70s後期〜80s前期",
    name: "®マーク追加期",
    bullets: [
      "ヒールパッチのデザインは「OFF THE WALL／T.M.」のまま変わらず継続する、比較的見分けの難しい年代。",
      "一方でサイドタグは青文字のまま「VANS®」に、®（登録商標）マークが新たに加わるのがこの年代を見分ける一番のポイントになる。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#c9564a" }, photo: "heel_patches/off_the_wall_tm.jpg" },
      { type: "insole", caption: "インソール（VANS表記）", props: { label: "VANS" }, photo: "insoles/vans_usa.jpg" },
      { type: "sideTag", caption: "サイドタグ（青文字＋®）", props: { label: "VANS", color: "#2c4a7c", mark: "®" }, photo: "side_tags/vans_blue_r.jpg" },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" }, photo: "soles/waffle_brown.jpg" },
    ],
  },
  {
    range: "80s後期〜90s",
    name: "黒文字期",
    bullets: [
      "ヒールパッチの表記が「T.M.」から「MADE IN USA」へ切り替わる。ロゴのデザイン自体は引き続き赤い「OFF THE WALL」のまま。",
      "サイドタグは青文字から黒文字の「VANS®」へと変化し、以降しばらくこの配色が定番になっていく。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "MADE IN USA", fill: "#c9564a" }, photo: "heel_patches/off_the_wall.jpg" },
      { type: "insole", caption: "インソール（無地）", props: { soft: false }, photo: "insoles/blank.jpg" },
      { type: "sideTag", caption: "サイドタグ（黒文字）", props: { label: "VANS", color: "#1a1a1a", mark: "®" }, photo: "side_tags/vans_black_r.jpg" },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" }, photo: "soles/waffle_brown.jpg" },
    ],
  },
  {
    range: "90s中期",
    name: "米国最終期",
    bullets: [
      "見た目自体はひとつ前の年代とほぼ変わらないが、1993年には既に韓国での生産が始まっており、1995年にはカリフォルニア州オレンジの自社工場も閉鎖。この頃がアメリカ国内生産の終盤にあたる。",
      "1990年代末までには生産のほとんどがアジア圏へ移行し、ヒールパッチに「Made in U.S.A.」の表記が見られるのはこのあたりが最後となる。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "MADE IN USA", fill: "#c9564a" }, photo: "heel_patches/off_the_wall.jpg" },
      { type: "insole", caption: "インソール", props: { label: "VANS®" }, photo: "insoles/vans_r_usa.jpg" },
      { type: "sideTag", caption: "サイドタグ（黒文字）", props: { label: "VANS", color: "#1a1a1a", mark: "®" }, photo: "side_tags/vans_black_r.jpg" },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" }, photo: "soles/waffle_brown.jpg" },
    ],
  },
];
