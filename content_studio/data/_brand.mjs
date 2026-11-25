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
  // Gemini用プロンプト（tools/gemini_prompts.mjs）で毎回添付する「タッチの見本」。
  // 表紙用と、ディテール用（写真忠実モードでは写真の後に2枚目として添付する）。
  geminiStyle: {
    // 表紙の画風見本は「形が写らない物」にする（507XXで557の表紙を付けたらサードの形を真似された）。靴の絵なら服の形に影響しない
    cover: "covers/vans_authentic_hero.jpg",
    // ディテール用は「デニムの網目だけ」の横長切り抜き（506XX 01の絵から）。
    // 557のDボタンの絵を付けたら写真を無視してDボタンを描き直され、縦長の切り抜きを付けたらそれを下地にされた。
    // → 物が写っていない・写真と同じ横長の見本にする。2段階方式の②塗りで添付する。
    detail: "style_samples/denim_hatching_wide.jpg",
    // 557方式（今の標準）の画風見本。2枚目に「技法だけ」として付ける。靴の絵なので服の形が移らない（506XX 04で成功）
    sketch: "covers/vans_authentic_hero.jpg",
  },
};
