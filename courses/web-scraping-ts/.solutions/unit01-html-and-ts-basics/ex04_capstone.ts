// ex04_capstone: ex01〜ex03の総合演習
// profile_card.html から素朴な文字列処理でスタッフ情報を取り出し、
// オブジェクトにまとめて整形済みの文字列を作る、というスクレイピングの最小パイプラインを体験する。
// 「取得(読み込み)→解析(抜き出し)→整形(オブジェクト化・文字列化)」の流れそのもの。

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const _unitDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.basename(path.dirname(_unitDir)) === ".solutions"
  ? path.dirname(path.dirname(_unitDir))
  : path.dirname(_unitDir);
const DATA_DIR = path.join(_courseDir, "data");

// data/ 以下のファイルをUTF-8で読み込んで文字列として返す
export function readFixture(filename: string): string {
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// --- ex01/ex03 で作った関数と同じ役割のヘルパー(このcapstoneで再利用する) ---

export function extractBetween(html: string, startTag: string, endTag: string): string | null {
  let startIdx = html.indexOf(startTag);
  if (startIdx === -1) return null;
  startIdx += startTag.length;
  const endIdx = html.indexOf(endTag, startIdx);
  if (endIdx === -1) return null;
  return html.slice(startIdx, endIdx);
}

export function extractValue(text: string): string {
  const [, ...rest] = text.split(":");
  return rest.join(":").trim();
}

export function splitTags(text: string): string[] {
  return text.split(",").map((part) => part.trim());
}

export function countTags(tags: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

// スタッフ1人分のプロフィール
export type Profile = {
  name: string;
  job: string;
  tags: string[];
};

// profile_card.html の文字列を受け取り、Profile型のオブジェクトを返す
// 例: {"name": "佐藤 涼太", "job": "選書担当", "tags": ["文芸", "海外文学", "新刊"]}
// ヒント: class="name"の行は "名前: xxx" 形式、class="job"の行は "職業: yyy" 形式、
// class="tags"の行は "タグ: a, b, c" 形式になっている(上のヘルパーが使える)
export function parseProfile(html: string): Profile {
  const nameLine = extractBetween(html, 'class="name">', "</h2>") ?? "";
  const jobLine = extractBetween(html, 'class="job">', "</p>") ?? "";
  const tagsLine = extractBetween(html, 'class="tags">', "</p>") ?? "";

  const name = extractValue(nameLine);
  const job = extractValue(jobLine);
  const tags = splitTags(extractValue(tagsLine));

  return { name, job, tags };
}

// parseProfile()が返すProfileの配列を受け取り、タグ別の出現人数を数えたRecordを返す
// 例: 2人がそれぞれ ["文芸", "新刊"], ["文芸", "海外文学"] を持つ場合
//     -> {"文芸": 2, "新刊": 1, "海外文学": 1}
export function aggregateTagCounts(profiles: Profile[]): Record<string, number> {
  const allTags = profiles.flatMap((profile) => profile.tags);
  return countTags(allTags);
}

// 1件のProfileから "佐藤 涼太(選書担当) - タグ: 文芸, 海外文学, 新刊"
// という形式の1行サマリー文字列を作る
export function formatProfileLine(profile: Profile): string {
  const tagsStr = profile.tags.join(", ");
  return `${profile.name}(${profile.job}) - タグ: ${tagsStr}`;
}
