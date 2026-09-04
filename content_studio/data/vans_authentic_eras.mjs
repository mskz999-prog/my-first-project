// VANS AUTHENTICの年代判別データ。
// 複数の古着専門ブログに加え、ユーザーが持ち込んだ手描きまとめ図（ヒールパッチ／サイドタグ／
// ソールの6段階チャート）を照合し、矛盾しない内容を採用して6段階に整理した参考情報。
// media は各年代で「注目すべきディテール」の数だけ並べる（1年代=1枚とは限らない）。

export const eras = [
  {
    range: "66〜70s初期",
    name: "VAN→VAN DOREN期",
    bullets: [
      "ヒールパッチは「VAN」のみ→「VAN DOREN／Made in U.S.A.」へ移行する過渡期",
      "サイドタグはまだ無く、ソールは青い「スリットソール」",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ（初期）", props: { label: "VAN" } },
      { type: "heelPatch", caption: "ヒールパッチ（後期）", props: { label: "VAN DOREN", sub: "Made in U.S.A." } },
      { type: "shoeSole", caption: "ソール（スリット）", props: { type: "slit" } },
    ],
  },
  {
    range: "70s中期",
    name: "サイドタグ登場期",
    bullets: [
      "ヒールパッチは「VAN DOREN／Made in U.S.A.」のまま",
      "青文字のサイドタグ「VANS」が新たに登場、ソールは茶色のワッフルソールへ切替",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VAN DOREN", sub: "Made in U.S.A." } },
      { type: "sideTag", caption: "サイドタグ（青文字）", props: { label: "VANS", color: "#2c4a7c" } },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" } },
    ],
  },
  {
    range: "76〜70s後期",
    name: "OFF THE WALL登場期",
    bullets: [
      "赤いヒールパッチに「OFF THE WALL」ロゴ、左上「T.M.」表記に切替",
      "サイドタグは引き続き青文字「VANS」",
    ],
    trivia: "由来：スケーターTony Alvaのトリックを見て「off the wall」と言ったことから",
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（青文字）", props: { label: "VANS", color: "#2c4a7c" } },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" } },
    ],
  },
  {
    range: "70s後期〜80s前期",
    name: "®マーク追加期",
    bullets: [
      "ヒールパッチは「OFF THE WALL／T.M.」のまま継続",
      "サイドタグは青文字のまま「VANS®」に、®マークが新たに入る",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（青文字＋®）", props: { label: "VANS", color: "#2c4a7c", mark: "®" } },
    ],
  },
  {
    range: "80s後期〜90s",
    name: "黒文字期",
    bullets: [
      "ヒールパッチの表記が「T.M.」→「MADE IN USA」に変わる（ロゴ自体は引き続き赤いOFF THE WALL）",
      "サイドタグは黒文字の「VANS®」に変化",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "MADE IN USA", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（黒文字）", props: { label: "VANS", color: "#1a1a1a", mark: "®" } },
    ],
  },
  {
    range: "90s中期",
    name: "海外生産シフト期",
    bullets: [
      "ヒールパッチ・サイドタグの見た目は前段階から継続",
      "生産地がアジア圏へ移り、後にヒールパッチの「Made in U.S.A.」表記が消えていく",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "MADE IN USA", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（黒文字）", props: { label: "VANS", color: "#1a1a1a", mark: "®" } },
      { type: "shoeSole", caption: "ソール（ワッフル・柔らか）", props: { type: "waffle" } },
    ],
  },
];
