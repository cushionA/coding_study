from conftest import load_exercise

ex = load_exercise("ex03_attributes")


def _load_nested_soup():
    return ex.load_soup("nested.html")


# get_floor_ids はclass="floor"のdivのid属性を出現順に集める
def test_get_floor_ids_basic():
    soup = _load_nested_soup()
    assert ex.get_floor_ids(soup) == ["floor-1", "floor-2"]


# get_section_name はidで指定したsection内のテキストを返す
def test_get_section_name_basic():
    soup = _load_nested_soup()
    assert ex.get_section_name(soup, "section-window") == "窓際席"


# 別のidでも正しく対応する値を返す(2階のセクション)
def test_get_section_name_other_section():
    soup = _load_nested_soup()
    assert ex.get_section_name(soup, "section-sofa") == "ソファ席"


# get_next_section_id は同フロア内の次の兄弟セクションのidを返す
def test_get_next_section_id_basic():
    soup = _load_nested_soup()
    assert ex.get_next_section_id(soup, "section-window") == "section-counter"


# 兄弟がない(そのフロア最後の)セクションはNone(境界値)
def test_get_next_section_id_none():
    soup = _load_nested_soup()
    assert ex.get_next_section_id(soup, "section-counter") is None
