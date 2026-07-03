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

function emptyRule(): RobotsRule {
  return { disallow: [], allow: [], crawlDelay: null };
}

// robots.txtのテキストを解析し、User-agentごとのルールをMapにして返す
// 各行は "キー: 値" の形式(例: "User-agent: *", "Disallow: /admin/")。
// 空行やコロンを含まない行は無視してよい。キーの大文字・小文字は区別しない
// (例: "user-agent" も "User-Agent" も同じ扱い)。
// User-agent行が現れるたびに「現在対象にしているUser-agent」が切り替わり、
// それ以降のDisallow/Allow/Crawl-delay行はそのUser-agentのルールに追加されていく。
export function parseRobotsTxt(text: string): RobotsRules {
  const rules: RobotsRules = new Map();
  let currentAgent: string | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || !line.includes(":")) continue;

    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      currentAgent = value;
      if (!rules.has(currentAgent)) rules.set(currentAgent, emptyRule());
      continue;
    }

    if (currentAgent === null) continue;
    const rule = rules.get(currentAgent)!;

    if (key === "disallow") {
      rule.disallow.push(value);
    } else if (key === "allow") {
      rule.allow.push(value);
    } else if (key === "crawl-delay") {
      rule.crawlDelay = Number(value);
    }
  }

  return rules;
}

function resolveRule(rules: RobotsRules, userAgent: string): RobotsRule | undefined {
  return rules.get(userAgent) ?? rules.get("*");
}

// 指定したUser-Agent名で指定パスにアクセスしてよいか判定する
// ルールは「より長く一致したパス指定が優先される」(Allowが同じ長さ以上ならAllow優先)という
// 一般的なrobots.txtの解釈に従う。指定したuserAgentのエントリが無ければ"*"のルールを使う。
// "*"のルールも無ければ常に許可(true)とする。
export function canFetch(rules: RobotsRules, userAgent: string, path: string): boolean {
  const rule = resolveRule(rules, userAgent);
  if (!rule) return true;

  let bestLength = -1;
  let bestIsAllow = true;

  for (const entry of rule.disallow) {
    if (entry !== "" && path.startsWith(entry) && entry.length > bestLength) {
      bestLength = entry.length;
      bestIsAllow = false;
    }
  }
  for (const entry of rule.allow) {
    if (entry !== "" && path.startsWith(entry) && entry.length >= bestLength) {
      bestLength = entry.length;
      bestIsAllow = true;
    }
  }

  return bestIsAllow;
}

// 指定したUser-Agent向けのCrawl-delay(秒)を返す。指定が無ければdefaultを返す
// (userAgentのエントリが無ければ"*"にフォールバックするのはcanFetchと同じ)
export function getCrawlDelay(rules: RobotsRules, userAgent: string, defaultDelay = 1): number {
  const rule = resolveRule(rules, userAgent);
  if (!rule || rule.crawlDelay === null) return defaultDelay;
  return rule.crawlDelay;
}
