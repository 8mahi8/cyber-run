# CYBER RUN｜次のチャット用・最短引き継ぎ入口

最終更新: 2026-10-23
**最優先: 新マップの実装ではなく、設計相談から再開する。**

## 最新の本人発言

「うーんやっぱりコインの道標ないと知らないギミック来た時の対応がムズいかもな。次は実装の前にしっかり設計固めていこうマップについて」

このメッセージ以降、ユーザーはチャット上限を理由に引き継ぎ資料の作成を依頼し、**長文は途中で切れるからGitHubへ詳述し、チャットでは短い文章とリンクだけを渡す運用**を指定した。

## まず読む資料（この順番）

1. **[最新のマップ設計議題とコインの道標（最重要）](docs/MAP_DESIGN_NEXT.md)** — 決定済み/未決事項・次に協議する提案・実装禁止範囲。
2. [現行手作りマップ THE CIRCUIT 01](docs/HANDCRAFTED_CIRCUIT_01.md) — 20セクション/約65秒の試作、既知の課題とQA。
3. [情報密度とコース設計の外部研究](docs/V07_INFORMATION_DENSITY_RESEARCH.md) — 操作・状況変化・視認性を別々に考える。
4. [V0.8のギミックとユーザーの不満](docs/V08_DIFFICULTY_GIMMICKS.md) — 崩れる足場、空中リング、ギミックの少なさ、単調さ。
5. [Firebaseランキングの確定仕様](docs/LEADERBOARD_DESIGN_V1.md) — 別タスク、オンライン未実装。
6. [技術品質/人間の面白さの評価基準](docs/QUALITY_RELEASE_GATE.md)。

## リポジトリ/ブランチ

- GitHub: https://github.com/8mahi8/cyber-run
- **手作りマップブランチ**: `dev/handcrafted-circuit-01-20261023`
- Draft PR #4: https://github.com/8mahi8/cyber-run/pull/4
- 主要コード: `handcrafted-level.js`, `game-handcrafted.js`, `handcrafted-playtest.html`
- 現行有限マップの試遊用GitHub Pages: https://8mahi8.github.io/cyber-run/playtest-circuit-01/
- 他のエンドレス版: `dev/challenge-v08` (Draft PR #3)、`dev/trajectory-first-v07` (Draft PR #2)。

## 次の担当AIの最初の行動

**1. 上記マップ設計議題を読み、ユーザーとコインによる進路誘導、初見ギミックの教え方、高難度化、章構成を相談する。** コインはまず「道標」の要望であり、収集アイテムやスコアへの復活まで確定したわけではない。

**2. 設計が合意されるまで、新たなゲームコードを勝手に書き進めない。** 設計を固めたらGitHubの設計資料を更新してから実装・検証する。

**3. 学校での運用はGoogle Sitesの「埋め込みコード」に単一HTML/CSS/JSを直接貼り付けること。** GitHub Pagesは君自身の試遊用であり、学校へ貼るURLではない。既存main/Pages/Google Sites公開版は勝手に上書きしない。

**4. 完全無料、古いiPad Safariで軽く、友達同士で競って楽しいゲームを目指す。** AIの自動テストは技術検証。主観的な面白さの最終評価はユーザー。

※引き継ぎのたびにこの `HANDOFF.md` のリンク1つを渡し、最新の決定や作業の状況は詳細資料に追記する。仕様の変更があればここも更新する。
