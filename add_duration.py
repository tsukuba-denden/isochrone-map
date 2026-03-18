import json

durations = {
    "池袋": 13,
    "大塚": 18,
    "目白": 21,
    "新宿": 22,
    "高田馬場": 23,
    "有楽町": 23,
    "巣鴨": 24,
    "東京": 22,
    "新大久保": 25,
    "神田": 21,
    "秋葉原": 23,
    "駒込": 23,
    "代々木": 27,
    "田端": 28,
    "渋谷": 30,
    "西日暮里": 30,
    "新橋": 30,
    "日暮里": 31,
    "御徒町": 28,
    "上野": 29,
    "原宿": 32,
    "浜松町": 32,
    "鶯谷": 33,
    "恵比寿": 30,
    "田町": 34,
    "大崎": 34,
    "高輪ゲートウェイ": 37,
    "品川": 35,
    "目黒": 39,
    "五反田": 39
}

with open("data/stations.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for st in data["stations"]:
    name = st["station"]
    if name in durations:
        st["duration"] = durations[name]

with open("data/stations.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(json.dumps(data["stations"][-30:], indent=2, ensure_ascii=False))
