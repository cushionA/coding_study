from conftest import load_exercise

ex = load_exercise("ex02_robots_check")


# load_robots_parser: フィクスチャを読み込んでRobotFileParserを構築できる
def test_load_robots_parser_returns_parser():
    rp = ex.load_robots_parser()
    assert rp is not None


# is_allowed: "*"向けは/admin/配下が禁止されている
def test_is_allowed_disallowed_path():
    rp = ex.load_robots_parser()
    assert ex.is_allowed(rp, "*", "/admin/secret") is False


# is_allowed: "*"向けでも許可されているパスはTrue
def test_is_allowed_allowed_path():
    rp = ex.load_robots_parser()
    assert ex.is_allowed(rp, "*", "/public/page") is True


# is_allowed: MyScraperBot向けには/private/reports/以下だけ個別に許可されている(エッジケース)
def test_is_allowed_specific_user_agent_override():
    rp = ex.load_robots_parser()
    assert ex.is_allowed(rp, "MyScraperBot", "/private/reports/x") is True


# is_allowed: BadBotは全面的に禁止されている
def test_is_allowed_fully_blocked_bot():
    rp = ex.load_robots_parser()
    assert ex.is_allowed(rp, "BadBot", "/anything") is False


# get_crawl_delay: "*"向けのCrawl-delayは2秒
def test_get_crawl_delay_wildcard():
    rp = ex.load_robots_parser()
    assert ex.get_crawl_delay(rp, "*") == 2


# get_crawl_delay: MyScraperBot向けは個別に1秒が指定されている
def test_get_crawl_delay_specific_bot():
    rp = ex.load_robots_parser()
    assert ex.get_crawl_delay(rp, "MyScraperBot") == 1
