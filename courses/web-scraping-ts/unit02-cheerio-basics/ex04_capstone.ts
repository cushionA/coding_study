// ex04_capstone: ex01〜ex03の総合演習
// nested.html(フロア案内)を cheerio で解析し、フロアごとにセクション名の配列を
// まとめたオブジェクト配列を作る。$()のグローバル検索だけでは「どのフロアの
// セクションか」が分からなくなるため、.find()でスコープを絞りながら
// .each()を入れ子にする、実務でよくあるパターンを一気通貫で書く。

import * as cheerio from "cheerio";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const _unitDir = path.dirname(fileURLToPath(import.meta.url));
const _courseDir = path.basename(path.dirname(_unitDir)) === ".solutions"
  ? path.dirname(path.dirname(_unitDir))
  : path.dirname(_unitDir);
const DATA_DIR = path.join(_courseDir, "data");

export function readFixture(filename: string): string {
  return fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
}

// フロア1件分の情報
export type FloorInfo = {
  name: string;
  sections: string[];
};

// nested.html の文字列を受け取り、class="floor" ごとにFloorInfoの配列を返す
// 各floorの中で class="floor-name" が名前、class="section-name" (複数)がsections
// 例: [{ name: "1階", sections: ["新刊コーナー", "文芸コーナー"] },
//      { name: "2階", sections: ["古書コーナー"] }]
// ヒント: $(".floor") を .each() で回し、その中で .find(".floor-name") と
//   .find(".section") → さらに .find(".section-name") をネストして使う
export function parseFloors(html: string): FloorInfo[] {
  // TODO: $(".floor") を1件ずつ処理し、floor-nameとsection-nameの配列を
  // FloorInfoにまとめて配列に集める
  const $ = cheerio.load(html);
  const result:FloorInfo[] = [];
  $(".floor").each((_,element)=>
    {
      const floorName = $(element).find(".floor-name").text();
      const sectName:string[] = [];
      $(element).find(".section-name").each((_,x) =>{sectName.push($(x).text())});
      result.push( { name: floorName, sections: sectName });
    }
);
return result;
}

// parseFloors()が返すFloorInfoの配列を受け取り、セクション総数を返す
// (全フロアのsections配列の長さの合計)
export function countTotalSections(floors: FloorInfo[]): number {
  if(floors.length==0){return 0;}
  // TODO: 全floorのsections配列の長さを合計する
  return floors.length+1;
}

// 1件のFloorInfoから "1階: 新刊コーナー, 文芸コーナー" という形式の
// 1行サマリー文字列を作る(sectionsが空なら "1階: (なし)")
export function formatFloorLine(floor: FloorInfo): string {
  // TODO: floor.name と floor.sections を使って指定フォーマットの文字列を組み立てる
  // (sectionsが空配列の場合は "(なし)" にする)
  return floor.sections.length == 0 ? `${floor.name}: (なし)` : `${floor.name}: ${floor.sections.join(", ")}`;
}
