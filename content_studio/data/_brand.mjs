// 全トピック共通の「最後のページ（フォロー・保存への誘導）」の設定。
// render_era_slides.mjs が毎回読み込み、まとめページの後ろに固定で1枚追加する。
// ここを書き換えれば、VANS・BEN DAVIS・Levi's など全カルーセルの最終ページがまとめて変わる。
// 文言は「日本語は最小限・基本英語でクールに」という本人の方針で英語にしている。

export const brand = {
  // Instagramのアカウント名（@付き）
  handle: "@vintage_field_notes",
  // アイコン画像（assets/ 以下の相対パス）。本人のInstagramアイコン（スクショから円形部分を切り出したもの）。
  // null にすると「VFN」のロゴマークを表示する。
  avatar: "brand/avatar.png",
  // いちばん上の小さなラベル
  eyebrow: "END OF FIELD NOTE",
  // ブランド名の下に出すキャッチコピー（Bebas Neueの大文字で表示）
  tagline: "Read the details. Know the era.",
  // 補足の一文（セリフ体のイタリックで表示）
  description: "Vintage dating guides, built for the thrift store floor.",
  // 3つのアクション（アイコンは save / follow / share）
  actions: [
    { icon: "save", label: "SAVE", text: "Keep it for your next dig." },
    { icon: "follow", label: "FOLLOW", text: "Never miss the next era." },
    { icon: "share", label: "SHARE", text: "Pass it to your crew." },
  ],
  // いちばん下の黒いボタンの文言
  cta: "Follow for the next drop",
};
