# つくりながら学ぶ！ ドメイン駆動設計 実践入門

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

このリポジトリは、書籍『つくりながら学ぶ！ ドメイン駆動設計 実践入門 』の各章で実装するコードを管理したものです。読者の皆様が書籍を読み進める中で詰まった際に、該当する chapter のコードを参照したり、コピーして利用したりすることができます。

## 📚 書籍について

**書籍名**: つくりながら学ぶ！ ドメイン駆動設計 実践入門
**購入**: [Amazon で購入](https://www.amazon.co.jp/dp/B0G3VZVC4B)
**著者**: [@yamayu_ddd](https://x.com/yamayu_ddd)

## 🎯 このリポジトリについて

書籍の各章に対応するコード実装を管理しています。読者の方が書籍を読み進める中で詰まった際に、該当する chapter のコードを参照したり、コピーして利用したりできます。

## 🛠️ 技術スタック

このプロジェクトで使用している主な技術。

- **言語**: TypeScript 5.9
- **Web フレームワーク**: Express 5.1
- **データベース**: PostgreSQL 15
- **テスティング**: Jest 29.7
- **DI コンテナ**: tsyringe 4.10
- **コンテナ化**: Docker, Docker Compose

### アーキテクチャ

ドメイン駆動設計（DDD）に基づいた 4 層アーキテクチャを採用しています。

```
src/
├── Domain/          # ドメイン層（エンティティ、値オブジェクト、ドメインサービス）
├── Application/     # アプリケーション層（ユースケース、アプリケーションサービス）
├── Infrastructure/  # インフラストラクチャ層（リポジトリ実装、DB接続）
└── Presentation/    # プレゼンテーション層（REST API、コントローラー）
```

## 📖 Chapter ガイド

このリポジトリは書籍の各章に対応したコード実装を提供しています。各 chapter は書籍を読み進める中で、その時点までの実装状態を確認できるようになっています。

### Part 1・Part 2（第 1 章～第 5 章）

理論と設計フェーズを扱う章です。

| Chapter        | 書籍の章                       | 内容                                  |
| -------------- | ------------------------------ | ------------------------------------- |
| **chapter-05** | 第 5 章 ドメインモデルの可視化 | PlantUML によるドメインモデル図の作成 |

### Part 3 ドメインモデルの実装（第 6 章～第 15 章）

DDD の戦術的設計パターンを段階的に実装していきます。

| Chapter        | 書籍の章                          | 実装内容                                       |
| -------------- | --------------------------------- | ---------------------------------------------- |
| **chapter-08** | 第 8 章 実装の準備                | プロジェクトセットアップ、TypeScript 環境構築  |
| **chapter-09** | 第 9 章 値オブジェクト            | 不変性と等価性を持つ値オブジェクトの実装       |
| **chapter-10** | 第 10 章 エンティティ             | 識別子による同一性を持つエンティティの実装     |
| **chapter-11** | 第 11 章 集約                     | 整合性境界としての集約パターンの実装           |
| **chapter-12** | 第 12 章 ドメインサービス         | 複数集約にまたがるビジネスロジックの実装       |
| **chapter-13** | 第 13 章 リポジトリ               | PostgreSQL を使った永続化層の実装              |
| **chapter-14** | 第 14 章 アプリケーションサービス | ユースケースを実現するアプリケーション層の実装 |
| **chapter-15** | 第 15 章 プレゼンテーション層     | Express.js による REST API の実装              |

### Part 4 ビジネス価値を守り続ける（第 16 章～第 21 章）

保守性と拡張性を高めるための高度なパターンを実装します。

| Chapter        | 書籍の章                              | 実装内容                                       |
| -------------- | ------------------------------------- | ---------------------------------------------- |
| **chapter-17** | 第 17 章 中核ビジネスロジックの独立性 | ESLint による依存関係の保護                    |
| **chapter-18** | 第 18 章 技術実装からの分離           | tsyringe による DI コンテナの導入              |
| **chapter-19** | 第 19 章 イベント駆動アーキテクチャ   | ドメインイベントと Pub/Sub パターンの実装      |
| **chapter-20** | 第 20 章 Outbox パターン              | 確実なイベント配信のための Outbox パターン実装 |
| **chapter-21** | 第 21 章 イベントソーシング           | イベントソーシングと CQRS パターンの実装       |

> **📝 実装ガイドについて**: chapter-20 と chapter-21 には`impl.md`ファイルが含まれており、書籍で書ききれなかった実装手順が記載されています。

## 🚀 使い方

### 前提条件

- Node.js 20 以上
- npm
- Docker（chapter-13 以降で使用）

### 基本的な使い方

```bash
# リポジトリをクローン
git clone https://github.com/yamachan0625/hands-on-ddd-introduction.git
cd hands-on-ddd-introduction

# 学習したいchapterに移動
cd chapter-09/CatalogService

# 依存関係をインストール
npm install

# テストを実行
jest
```

### chapter-13 以降（PostgreSQL 使用）

chapter-13 以降では PostgreSQL が必要です。

```bash
# chapterディレクトリに移動
cd chapter-13/CatalogService

# Dockerでデータベースを起動
docker compose up -d

# 依存関係をインストール
npm install

# テストを実行
jest

# 使用後はコンテナを停止
docker compose down
```

## 💡 学習のヒント

- 各 chapter のコードは独立しているため、必要に応じてコピーして使用できます
- 書籍の説明と該当する chapter のコードを照らし合わせながら学習を進めてください

## 🐛 トラブルシューティング

### Docker コンテナが起動しない

```bash
# コンテナの状態を確認
docker compose ps

# ログを確認
docker compose logs

# コンテナを再起動
docker compose down
docker compose up -d
```

### PostgreSQL に接続できない

- Docker コンテナが起動しているか確認してください
- ポート 5432 が他のプロセスで使用されていないか確認してください

### テストが失敗する

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install

# キャッシュをクリア
npm cache clean --force
```

## 📝 ライセンス

このプロジェクトは教育目的で公開されています。詳細は LICENSE ファイルを参照してください。

## 🤝 サポート

質問や問題がある場合は、以下の方法でお気軽にお問い合わせください。

- **GitHub Issues**: [Issues](https://github.com/yamachan0625/hands-on-ddd-introduction/issues)でバグ報告や技術的な質問を受け付けています
- **X (Twitter)**: [@yamayu_ddd](https://x.com/yamayu_ddd)で書籍に関する質問や感想をお待ちしています

本書に関するご質問やフィードバックを歓迎します。学習の過程で疑問に思ったことがあれば、遠慮なくお問い合わせください。
