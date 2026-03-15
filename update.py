
import json

def update_stations():
    with open('data/stations.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    for st in data['stations']:
        route = st['route']
        if '池袋' in route and '丸ノ内線' in route:
            if '副都心線' in route:
                pass # rule 4: 副都心線乗り換えの場合は茗荷谷丸ノ内線を採用
            else:
                # rule 2: 池袋が含まれる場合は必ず有楽町線を使用
                st['route'] = route.replace('丸ノ内線→茗荷谷', '有楽町線→護国寺').replace('丸ノ内線', '有楽町線')
                # 護国寺から学校8分、茗荷谷10分 なので、池袋〜茗荷谷と池袋〜護国寺の差を考慮する（数分変わる）
    
    with open('data/stations.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_stations()

