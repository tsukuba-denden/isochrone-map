import json
import os

with open("data/stations.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Rule 1: 護国寺から8分、茗荷谷から10分。
# Rule 2: 池袋が含まれる場合は必ず有楽町線。(Rule 4: 副都心線は丸ノ内線)
# Rule 5 (個別): 赤塚、成増は東武より有楽町線採用
for st in data["stations"]:
    route = st.get("route", "")
    line = st.get("line", "")
    minutes = st.get("minutes", 400)
    
    # 既存の丸ノ内線経由から有楽町線経由に移行すべきか判定
    # 現状 "池袋→丸ノ内線→茗荷谷" などになっている場合
    if "池袋" in route and "丸ノ内線" in route:
        if "副都心線" in route:
            # Rule 4: 特例的に池袋副都心線乗り換えの場合のみ利用状況を鑑みて茗荷谷への丸ノ内線を採用
            continue
        else:
            # Rule 2: 池袋が含まれる場合は必ず有楽町線を使用
            st["route"] = route.replace("丸ノ内線", "有楽町線").replace("茗荷谷", "護国寺")
            st["line"] = line.replace("丸ノ内線", "有楽町線")
            # 茗荷谷(10分)から護国寺(8分)になるので2分短縮、さらに池袋から護国寺のほうが池袋から茗荷谷より1分早いか？
            # 池袋→茗荷谷は丸ノ内線で5分
            # 池袋→護国寺は有楽町線で4分
            # さらに徒歩が2分短いのでトータルでおおよそ3分短くなる。
            st["minutes"] = minutes + 3

    # Rule 5 Ⅰ地下鉄赤塚、地下鉄成増に関しては東武線のほうが早い場合であっても有楽町線を採用
    if st["station"] in ["地下鉄成増", "地下鉄赤塚"]:
        st["route"] = "有楽町線→護国寺"
        st["line"] = "有楽町線"
        # ちなみにここも護国寺に変更
        if "茗荷谷" in route:
            st["minutes"] = minutes + 3

with open("data/stations.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated stations.json")
