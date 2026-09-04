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
      label: "起源：1966年、アナハイムの小さな工場",
      icon: "storefront",
      paragraph:
        "1966年3月、ポール・ヴァンドーレンと兄ジェームズ、共同創業者のゴードン・リー、サージ・デリアの4人が、カリフォルニア州アナハイムに「The Van Doren Rubber Company」を創業。工場と直営店を同じ建物に構え、注文を受けたその日のうちに靴を仕上げて手渡すという、当時としては珍しいスタイルで営業をスタートした。最初に作られたのが後の「Authentic」、社内呼称「Style #44」——キャンバスアッパーに厚手のゴムソールを合わせただけの、飾り気のない一足だった。",
    },
    {
      label: "接続：南カリフォルニアのスケートカルチャーへ",
      icon: "skateboard",
      paragraph:
        "ブランド側が意図したわけではなく、1970年代前半に南カリフォルニアのスケーターたちがこの靴のグリップ力と足への馴染みやすさに目をつけ、独自に愛用し始めたのがVANSとスケートカルチャーの出会い。Z-Boysと呼ばれたZephyrチームのトニー・アルヴァやステイシー・ペラルタらが履きこなし、1976年には初の本格的なスケートシューズが誕生、「OFF THE WALL」のロゴが生まれた（アルヴァがプールの壁を飛び越えるトリックを決めたことに由来すると伝えられている）。翌77年のチェッカーボード柄は映画『初体験/リッジモント・ハイ』などを通じてポップカルチャーのアイコンとなり、パンク〜スケート〜ストリートへとVANSは越境していく。",
    },
  ],
  closing:
    "つまりディテールの変遷を辿ることは、そのままVANSがどうカルチャーと共に育っていったかを辿ることでもある。次のページから、その「証拠」となるヒールパッチ・サイドタグ・ソールの違いを見ていこう。",
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
      { type: "heelPatch", caption: "ヒールパッチ（初期）", props: { label: "VAN" } },
      { type: "heelPatch", caption: "ヒールパッチ（後期）", props: { label: "VAN DOREN", sub: "Made in U.S.A." } },
      { type: "shoeSole", caption: "ソール（スリット）", props: { type: "slit" } },
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
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "VAN DOREN", sub: "Made in U.S.A." } },
      { type: "sideTag", caption: "サイドタグ（青文字）", props: { label: "VANS", color: "#2c4a7c" } },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" } },
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
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（青文字）", props: { label: "VANS", color: "#2c4a7c" } },
      { type: "shoeSole", caption: "ソール（ワッフル）", props: { type: "waffle" } },
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
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "T.M.", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（青文字＋®）", props: { label: "VANS", color: "#2c4a7c", mark: "®" } },
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
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "MADE IN USA", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（黒文字）", props: { label: "VANS", color: "#1a1a1a", mark: "®" } },
    ],
  },
  {
    range: "90s中期",
    name: "海外生産シフト期",
    bullets: [
      "見た目自体はひとつ前の年代とほぼ変わらないが、この時期を境に生産拠点がアメリカからアジア圏へと徐々に移っていく。",
      "後年、ヒールパッチの「Made in U.S.A.」表記そのものが消えていくのは、この生産シフトの延長線上にある変化として理解できる。",
    ],
    media: [
      { type: "heelPatch", caption: "ヒールパッチ", props: { label: "OFF THE WALL", sub: "MADE IN USA", fill: "#c9564a" } },
      { type: "sideTag", caption: "サイドタグ（黒文字）", props: { label: "VANS", color: "#1a1a1a", mark: "®" } },
      { type: "shoeSole", caption: "ソール（ワッフル・柔らか）", props: { type: "waffle" } },
    ],
  },
];
