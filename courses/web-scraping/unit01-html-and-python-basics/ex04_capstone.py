# ex04_capstone: ex01〜ex03の総合演習
# profile_card.html から素朴な文字列処理でスタッフ情報を取り出し、
# 辞書にまとめて整形済みの文字列を作る、というスクレイピングの最小パイプラインを体験する。
# 「取得(読み込み)→解析(抜き出し)→整形(辞書化・文字列化)」の流れそのもの。

from pathlib import Path

_UNIT_DIR = Path(__file__).resolve().parent
_COURSE_DIR = _UNIT_DIR.parents[1] if _UNIT_DIR.parent.name == ".solutions" else _UNIT_DIR.parent
DATA_DIR = _COURSE_DIR / "data"


# data/ 以下のファイルをUTF-8で読み込んで文字列として返す
def read_fixture(filename):
    path = DATA_DIR / filename
    return path.read_text(encoding="utf-8")


# --- ex01/ex03 で作った関数と同じ役割のヘルパー(このcapstoneで再利用する) ---

def extract_between(html, start_tag, end_tag):
    start_idx = html.find(start_tag)
    if start_idx == -1:
        return None
    start_idx += len(start_tag)
    end_idx = html.find(end_tag, start_idx)
    if end_idx == -1:
        return None
    return html[start_idx:end_idx]


def extract_value(text):
    _, value = text.split(":", 1)
    return value.strip()


def split_tags(text):
    return [part.strip() for part in text.split(",")]


def count_tags(tags):
    counts = {}
    for tag in tags:
        counts[tag] = counts.get(tag, 0) + 1
    return counts


# profile_card.html の文字列を受け取り、以下のキーを持つ辞書を返す
# {"name": "田中 美咲", "job": "焙煎士", "tags": ["焙煎", "ハンドドリップ", "浅煎り"]}
# ヒント: class="name"の行は "名前: xxx" 形式、class="job"の行は "職業: yyy" 形式、
# class="tags"の行は "タグ: a, b, c" 形式になっている(上のヘルパーが使える)
def parse_profile(html):
    # TODO: nameの行・jobの行・tagsの行をそれぞれ取り出し、辞書にまとめる
    raise NotImplementedError


# parse_profile()が返す辞書のリストを受け取り、タグ別の出現人数を数えた辞書を返す
# 例: 2人がそれぞれ ["焙煎", "浅煎り"], ["焙煎", "深煎り"] を持つ場合
#     -> {"焙煎": 2, "浅煎り": 1, "深煎り": 1}
def aggregate_tag_counts(profiles):
    # TODO: 全プロフィールのtagsをまとめて、タグごとの人数を数える(上のcount_tagsが使える)
    raise NotImplementedError


# 1件のプロフィール辞書から "田中 美咲(焙煎士) - タグ: 焙煎, ハンドドリップ, 浅煎り"
# という形式の1行サマリー文字列を作る
def format_profile_line(profile):
    # TODO: 辞書のname/job/tagsを使って指定フォーマットの文字列を組み立てる
    raise NotImplementedError
