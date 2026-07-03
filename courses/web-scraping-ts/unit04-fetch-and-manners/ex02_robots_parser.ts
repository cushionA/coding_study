// ex02_robots_parser: robots.txtを自前でミニパースする
// robots.txtはサイト運営者が「このパスはクロールしないでほしい」と表明する紳士協定のファイルで、
// 法的拘束力はないが無視すればアクセス遮断や法的リスクにつながりうる。
// Pythonにはurllib.robotparser.RobotFileParserという標準ライブラリのパーサがあるが、
// Node.js/TypeScriptには同等の標準機能が無い。そこでここでは行志向のシンプルな仕様
// (User-agent: / Disallow: / Allow: / Crawl-delay: の4種類の行だけを扱う)に絞って
// 自分でパーサを書く。C#で言えば設定ファイルをパースしてルールオブジェクトを構築するのと同じ。
//
// robots.txtは複数の「グループ」からなり、各グループは
//   User-agent: <名前>
//   Disallow: <パス>
//   Allow: <パス>
//   Crawl-delay: <秒>
// の行が続く形式。同じUser-agentが複数のDisallow/Allow行を持つこともある。

export type RobotsRule = {
  disallow: string[];
  allow: string[];
  crawlDelay: number | null;
};

// User-agent名(小文字化したもの) -> ルール、のMap。C#のDictionary<string, RobotsRule>に相当
export type RobotsRules = Map<string, RobotsRule>;

// robots.txtのテキストを解析し、User-agentごとのルールをMapにして返す
// 各行は "キー: 値" の形式(例: "User-agent: *", "Disallow: /admin/")。
// 空行やコロンを含まない行は無視してよい。キーの大文字・小文字は区別しない
// (例: "user-agent" も "User-Agent" も同じ扱い)。
// User-agent行が現れるたびに「現在対象にしているUser-agent」が切り替わり、
// それ以降のDisallow/Allow/Crawl-delay行はそのUser-agentのルールに追加されていく。
export function parseRobotsTxt(text: string): RobotsRules {
  const rules: RobotsRules = new Map();
  // TODO: text を行ごとに処理し、"User-agent:" が出るたびに currentAgent を更新、
  // "Disallow:" / "Allow:" / "Crawl-delay:" はその時点の currentAgent のルールに書き込む。
  // rules に currentAgent のエントリが無ければ { disallow: [], allow: [], crawlDelay: null } で作る。
  throw new Error("TODO: 未実装");
}

// 指定したUser-Agent名で指定パスにアクセスしてよいか判定する
// ルールは「より長く一致したパス指定が優先される」(Allowが同じ長さ以上ならAllow優先)という
// 一般的なrobots.txtの解釈に従う。指定したuserAgentのエントリが無ければ"*"のルールを使う。
// "*"のルールも無ければ常に許可(true)とする。
export function canFetch(rules: RobotsRules, userAgent: string, path: string): boolean {
  // TODO: rules.get(userAgent) が無ければ rules.get("*") にフォールバックする。
  // ルールも無ければ true。
  // disallow/allowの中でpathが前方一致する最長のエントリを探し、
  // 最長一致がallow側ならtrue、disallow側ならfalse、どちらも一致しなければtrue。
  throw new Error("TODO: 未実装");
}

// 指定したUser-Agent向けのCrawl-delay(秒)を返す。指定が無ければdefaultを返す
// (userAgentのエントリが無ければ"*"にフォールバックするのはcanFetchと同じ)
export function getCrawlDelay(rules: RobotsRules, userAgent: string, defaultDelay = 1): number {
  // TODO: userAgentのルール(無ければ"*")のcrawlDelayを見て、nullならdefaultDelayを返す
  throw new Error("TODO: 未実装");
}
