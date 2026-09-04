// VANS AUTHENTICの年代判別データ。
// 複数の古着専門ブログ（相互に矛盾しない範囲）を照合して作成した参考情報。
// media は各年代で「注目すべきディテール」の数だけ並べる（1年代=1枚とは限らない）。

export const eras = [
  {
    range: "〜1966年頃",
    name: "VANのみ期",
    bullets: [
      "ヒールパッチは「VAN」のみ、インソールは「VAN QUALITY」表記",
      "サイドタグはまだ無く、ソールは青みがかった「スリットソール」",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VAN" } },
      { type: "insole", caption: "インソール", props: { label: "VAN QUALITY" } },
      { type: "sole", caption: "ソール（スリット）", props: { type: "slit" } },
    ],
  },
  {
    range: "60s末〜70s前半",
    name: "VAN DOREN期",
    bullets: [
      "ヒールパッチが「VAN DOREN／Made in U.S.A.」表記に統合",
      "青文字のサイドタグ「VANS」が登場、ソールはワッフルソールへ切替",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VAN DOREN", sub: "MADE IN U.S.A." } },
      { type: "sideTag", caption: "サイドタグ", props: { label: "VANS", color: "#2c4a7c" } },
      { type: "sole", caption: "ソール（ワッフル）", props: { type: "waffle" } },
    ],
  },
  {
    range: "1976〜70s末",
    name: "OFF THE WALL登場期",
    bullets: [
      "赤いヒールパッチに「OFF THE WALL」ロゴ、左上「T.M.」表記",
      "サイドタグは青文字「VANS」に®マークが追加",
    ],
    trivia: "由来：スケーターTony Alvaのトリックを見て「off the wall」と言ったことから",
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#e2c9be" } },
      { type: "sideTag", caption: "サイドタグ", props: { label: "VANS", color: "#2c4a7c", mark: "®" } },
    ],
  },
  {
    range: "1980年代",
    name: "®マーク・黒文字期",
    bullets: [
      "ヒールパッチは「T.M.」→「®」表記、または白黒「VANS MADE IN USA」も併存",
      "80年代後期にサイドタグが黒文字「VANS®」に、インソールは無地に",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VANS", sub: "®" } },
      { type: "sideTag", caption: "サイドタグ", props: { label: "VANS", color: "#1a1a1a", mark: "®" } },
      { type: "insole", caption: "インソール（無地）", props: { label: "" } },
    ],
  },
  {
    range: "1990s後期〜",
    name: "海外生産シフト期",
    bullets: [
      "生産地がアジア圏へ移り、ヒールパッチ・インソールの「Made in U.S.A.」表記が消える",
      "インソールがCONVERSE ALL STAR風の柔らかい素材に変化",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VANS", sub: "®" } },
      { type: "insole", caption: "インソール（柔素材）", props: { soft: true } },
    ],
  },
];
