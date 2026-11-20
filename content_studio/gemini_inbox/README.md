# gemini_inbox（Geminiで作った画像の置き場）

Geminiで生成した画像は、ファイル名を気にせずこのフォルダに放り込んでOK。
Claude側で中身を見て、assets/ の適切な場所（covers/・heel_patches/ など）に
名前を付けて移動し、データファイルの photo に設定してから再レンダリングする。

- ファイル名は自由（例: gemini_01.png）。どの項目の画像か分かるならファイル名に書いてくれると助かる
- このフォルダの画像はGitHubに上がらない（.gitignoreで除外。採用した画像だけ assets/ に移してコミットする）
