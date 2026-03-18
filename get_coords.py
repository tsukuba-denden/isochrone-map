import json
import urllib.request
import urllib.parse
import time

stations = [
    {"station": "池袋", "minutes": 475, "major": True},
    {"station": "大塚", "minutes": 470},
    {"station": "目白", "minutes": 467},
    {"station": "新宿", "minutes": 466, "major": True},
    {"station": "高田馬場", "minutes": 465},
    {"station": "有楽町", "minutes": 465},
    {"station": "巣鴨", "minutes": 464},
    {"station": "東京", "minutes": 463, "major": True},
    {"station": "新大久保", "minutes": 463},
    {"station": "神田", "minutes": 462},
    {"station": "秋葉原", "minutes": 462, "major": True},
    {"station": "駒込", "minutes": 462},
    {"station": "代々木", "minutes": 461},
    {"station": "田端", "minutes": 460},
    {"station": "渋谷", "minutes": 458, "major": True},
    {"station": "西日暮里", "minutes": 458},
    {"station": "新橋", "minutes": 458},
    {"station": "日暮里", "minutes": 457},
    {"station": "御徒町", "minutes": 457},
    {"station": "上野", "minutes": 456, "major": True},
    {"station": "原宿", "minutes": 456},
    {"station": "浜松町", "minutes": 456},
    {"station": "鶯谷", "minutes": 455},
    {"station": "恵比寿", "minutes": 455},
    {"station": "田町", "minutes": 454},
    {"station": "大崎", "minutes": 451},
    {"station": "高輪ゲートウェイ", "minutes": 451},
    {"station": "品川", "minutes": 450, "major": True},
    {"station": "目黒", "minutes": 449},
    {"station": "五反田", "minutes": 446}
]

# ROMAJI mapping
romaji = {
    "池袋": "ikebukuro", "大塚": "otsuka", "目白": "mejiro", "新宿": "shinjuku",
    "高田馬場": "takadanobaba", "有楽町": "yurakucho", "巣鴨": "sugamo",
    "東京": "tokyo", "新大久保": "shin-okubo", "神田": "kanda",
    "秋葉原": "akihabara", "駒込": "komagome", "代々木": "yoyogi",
    "田端": "tabata", "渋谷": "shibuya", "西日暮里": "nishi-nippori",
    "新橋": "shimbashi", "日暮里": "nippori", "御徒町": "okachimachi",
    "上野": "ueno", "原宿": "harajuku", "浜松町": "hamamatsucho",
    "鶯谷": "uguisudani", "恵比寿": "ebisu", "田町": "tamachi",
    "大崎": "osaki", "高輪ゲートウェイ": "takanawa-gateway",
    "品川": "shinagawa", "目黒": "meguro", "五反田": "gotanda"
}

def get_lat_lng(station_name):
    query = urllib.parse.quote(station_name + "駅 東京")
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print("error", e)
    return 0.0, 0.0

result = []
for s in stations:
    lat, lng = get_lat_lng(s['station'])
    time.sleep(1)
    
    obj = {
        "id": romaji[s['station']],
        "station": s['station'],
        "lat": lat,
        "lng": lng,
        "minutes": s['minutes'],
        "line": "山手線"
    }
    if s.get("major"):
        obj["major"] = True
        
    result.append(obj)

# Load existing
with open("data/stations.json", "r", encoding="utf-8") as f:
    existing = json.load(f)

existing["meta"]["lastUpdated"] = "2026-03-16"
existing["stations"].extend(result)

with open("data/stations.json", "w", encoding="utf-8") as f:
    json.dump(existing, f, indent=2, ensure_ascii=False)

print(json.dumps(result, indent=2, ensure_ascii=False))
