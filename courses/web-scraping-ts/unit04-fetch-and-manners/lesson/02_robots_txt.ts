/* =====================================================================
 * 概念2: robots.txt の読み方と、自前ミニパーサの考え方
 * ---------------------------------------------------------------------
 * ■ なぜ:
 *   技術的に「取れる」ことと、倫理的・法務的に「取ってよい」ことは別問題です。
 *   ほぼすべてのサイトは https://例.com/robots.txt に「どのパスを巡回してよいか」を
 *   置いています。これはサイト運営者の意思表示で、法的拘束力こそ弱いものの、
 *   無視すればアクセス遮断・IPブロック・不正アクセスとみなされる法的リスクに
 *   つながります。逆に robots.txt を尊重するだけで「信頼できる書き方」として
 *   現場で評価されます。取得([1])の前に必ず通す関所が robots.txt です。
 *
 * ■ 解説:
 *   Python には urllib.robotparser という標準パーサがありますが、
 *   Node.js / TypeScript には同等の標準機能がありません。そこで自分で書きます。
 *   robots.txt は「行志向」の素朴なテキストで、次の4種類の行だけ押さえれば十分です:
 *
 *     User-agent: *              ← ここから下は「全ボット向け」のルール
 *     Disallow: /admin/          ← /admin/ で始まるパスは巡回禁止
 *     Allow: /private/reports/    ← Disallow の例外(ここは許可)
 *     Crawl-delay: 2             ← 連続リクエストは2秒あけて(概念3で使う)
 *
 *   構造は「グループの並び」です。User-agent 行が現れるたびに
 *   「今どのボット向けのルールを読んでいるか(currentAgent)」が切り替わり、
 *   それ以降の Disallow / Allow / Crawl-delay は、その currentAgent の
 *   ルールに溜まっていきます。C# で言えば ini/設定ファイルを1行ずつ読んで
 *   セクションごとに設定オブジェクトを組み立てるのと同じ発想です。
 *
 *   今日のゴールは「テキスト → ルールの Map」に変換する parseRobotsTxt の
 *   考え方を、STEP を追って手で組み立てること。演習 ex02 では、この Map を使って
 *   「このパスを取ってよいか(canFetch)」まで完成させます。今日はその一歩手前
 *   ——「1行を キー と 値 に割る」「User-agent でグループを切り替える」——を固めます。
 * ===================================================================== */

function check(name: string, actual: unknown, expected: unknown, hint = ""): boolean {
  const ok = actual !== null && actual !== undefined
    && JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) console.log(`[OK] ${name}: 正解!`);
  else {
    console.log(`[NG] ${name}: 期待値 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`);
    if (hint) console.log(`     ヒント: ${hint}`);
  }
  return ok;
}

// このレッスンで題材にする robots.txt(演習の data/example_robots.txt と同じ内容)。
// バッククォート文字列(テンプレートリテラル)で複数行をそのまま持つ。
// 本物では fetch("https://例.com/robots.txt") で取ってきた文字列がここに入る、と想像する。
const ROBOTS_TXT = `User-agent: *
Disallow: /admin/
Disallow: /private/
Crawl-delay: 2

User-agent: MyScraperBot
Disallow: /admin/
Allow: /private/reports/
Crawl-delay: 1

User-agent: BadBot
Disallow: /`;

// 演習と同じルールの型。1つの User-agent が持つルールをまとめたもの。
type RobotsRule = {
  disallow: string[];
  allow: string[];
  crawlDelay: number | null;
};

// --- 見る(worked example) ---------------------------------------------
// GOAL: robots.txt の1行を「キー: 値」に割り、User-agent でグループを切り替える流れを見る

// STEP 1: まず全体を行に割る。text.split("\n") で1行ずつの配列にする
//         (C# の string.Split('\n') と同じ)。各行の前後空白は trim で掃除する。
console.log("--- STEP 1: 行に割る ---");
const lines = ROBOTS_TXT.split("\n").map((l) => l.trim());
console.log("行数:", lines.length);
console.log("先頭3行:", lines.slice(0, 3));

// STEP 2: 1行を「キー」と「値」に割る。robots.txt は "キー: 値" の形。
//         値の中にコロンが来ることもある(URLなど)ので、最初のコロンだけで割る定石:
//         split(":") して先頭をキー、残りをコロンで繋ぎ直して値にする。
//         空行やコロンを含まない行は無視する。
console.log("--- STEP 2: キーと値に割る ---");
const sample = "Disallow: /admin/";
const [rawKey, ...rest] = sample.split(":");          // rawKey="Disallow", rest=[" /admin/"]
const key = rawKey.trim().toLowerCase();              // 大小無視のため小文字化 → "disallow"
const value = rest.join(":").trim();                  // 残りを繋ぎ直して trim → "/admin/"
console.log("key:", key, "/ value:", value);

// STEP 3: User-agent 行でグループを切り替えながら Map を組み立てる。
//         currentAgent が「今読んでいるグループの名前」。User-agent 行で更新し、
//         Disallow/Allow/Crawl-delay 行は currentAgent のルールに書き込む。
console.log("--- STEP 3: グループごとに Map を組む ---");
const rules = new Map<string, RobotsRule>();
let currentAgent: string | null = null;
for (const line of lines) {
  if (line === "" || !line.includes(":")) continue;      // 空行・コロン無し行は無視
  const [k0, ...r0] = line.split(":");
  const k = k0.trim().toLowerCase();
  const v = r0.join(":").trim();
  if (k === "user-agent") {
    currentAgent = v;                                    // グループ切り替え
    if (!rules.has(currentAgent)) {
      rules.set(currentAgent, { disallow: [], allow: [], crawlDelay: null });
    }
    continue;
  }
  if (currentAgent === null) continue;                   // User-agent より前の行は無視
  const rule = rules.get(currentAgent)!;                 // ! は「null でないと保証」(上で作った)
  if (k === "disallow") rule.disallow.push(v);
  else if (k === "allow") rule.allow.push(v);
  else if (k === "crawl-delay") rule.crawlDelay = Number(v);  // "2" → 2(文字列を数値化)
}
console.log("* のルール           :", rules.get("*"));
console.log("MyScraperBot のルール :", rules.get("MyScraperBot"));

// --- 予測してみよう -----------------------------------------------------
// 上で組んだ rules を使います。実行する前に予測してください:
//   Q1: rules.get("BadBot") の disallow には何が入っている?
//       (ROBOTS_TXT の BadBot は "Disallow: /" の1行だけ)
//   Q2: rules に登録されている User-agent は全部で何グループ?
console.log("--- 予測してみよう ---");
console.log("BadBot のルール:", rules.get("BadBot"));
console.log("グループ数    :", rules.size);

// --- 変えてみる ---------------------------------------------------------
// 「前方一致でアクセス可否を判定する」のが robots.txt の心臓部です(完全な判定は演習で)。
// startsWith を使った前方一致だけ先に体感しておきます。
// path が disallow のどれかで始まれば「禁止に触れている」。
console.log("--- 変えてみる ---");
const disallowOfStar = rules.get("*")!.disallow;                  // ["/admin/", "/private/"]
const path1 = "/admin/users";
const path2 = "/news/today";
console.log(`${path1} は禁止に触れる?:`, disallowOfStar.some((d) => path1.startsWith(d)));  // true
console.log(`${path2} は禁止に触れる?:`, disallowOfStar.some((d) => path2.startsWith(d)));  // false

// --- 書いてみる ---------------------------------------------------------
// 課題: ROBOTS_TXT を STEP 1〜3 と同じ手順でパースし、"MyScraperBot" グループの
//       Crawl-delay の値(数値)を取り出して result2 に入れてください(期待値: 1)。
//       上で組んだ rules をそのまま使ってよいです。
// ヒント(概念レベル): rules.get("MyScraperBot") で RobotsRule が取れる。その .crawlDelay。
//   ?. や ?? を使うと「グループが無かった場合」も安全に書けます(概念的には rules.get(...)?.crawlDelay)。
let result2: number | null = null;
// ここに書く(result2 に "MyScraperBot" の Crawl-delay を代入する)

check("概念2: Crawl-delay を取り出す", result2, 1,
  'rules.get("MyScraperBot") で RobotsRule を取り、その .crawlDelay を読む(?. で安全に)');

export {};
