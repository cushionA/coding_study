# fake_responses: requests.get() の戻り値(requests.Response)を模したダミー応答を作るヘルパ。
# C#で言えば HttpResponseMessage を単体テスト用にスタブ化するのと同じ発想。
# 本物のrequestsは一切importしない・ネットワークにも触れない、純粋なデータ生成コード。


class FakeHTTPError(Exception):
    # requests.exceptions.HTTPError 相当のダミー例外(NotImplementedErrorと混同しないよう独立させている)
    pass


class FakeResponse:
    # status_code/text/headers/ok は requests.Response と同じ属性名にしている
    # (演習コードが本物のrequests.Responseを受け取っても、このFakeResponseを
    #  受け取っても同じ書き方でアクセスできるようにするため)
    def __init__(self, status_code, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}

    @property
    def ok(self):
        return 200 <= self.status_code < 400

    def raise_for_status(self):
        if not self.ok:
            raise FakeHTTPError(f"HTTP error: {self.status_code}")


def make_ok_response(text):
    # 200 OK 相当のダミー応答を作る
    return FakeResponse(200, text=text, headers={"Content-Type": "text/html; charset=utf-8"})


def make_not_found_response():
    # 404 Not Found 相当のダミー応答を作る
    return FakeResponse(404, text="Not Found", headers={"Content-Type": "text/plain"})


def make_rate_limited_response(retry_after_seconds=5):
    # 429 Too Many Requests + Retry-After ヘッダ付きのダミー応答を作る
    return FakeResponse(
        429,
        text="Too Many Requests",
        headers={"Content-Type": "text/plain", "Retry-After": str(retry_after_seconds)},
    )
