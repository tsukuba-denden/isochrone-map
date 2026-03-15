"""
Generate gakku.geojson — 筑波大学附属中学校 通学区域の境界データ
Overpass API から対象自治体の行政区域を取得し、dissolve + simplify して出力
"""
import json
import time
import requests
from shapely.geometry import shape, mapping, MultiPolygon, Polygon
from shapely.ops import unary_union

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

QUERIES = {
    "東京23区": """
[out:json][timeout:120];
area["name"="東京都"]["admin_level"="4"]->.tokyo;
relation["admin_level"="7"]["name"~"区$"]["boundary"="administrative"](area.tokyo);
out geom;
""",
    "東京多摩": """
[out:json][timeout:120];
area["name"="東京都"]["admin_level"="4"]->.tokyo;
(
  relation["admin_level"="7"]["name"="西東京市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="清瀬市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="狛江市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="東久留米市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="三鷹市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="武蔵野市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="府中市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="調布市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="小平市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="東村山市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="小金井市"]["boundary"="administrative"](area.tokyo);
  relation["admin_level"="7"]["name"="国分寺市"]["boundary"="administrative"](area.tokyo);
);
out geom;
""",
    "埼玉": """
[out:json][timeout:120];
area["name"="埼玉県"]["admin_level"="4"]->.saitama;
(
  relation["admin_level"="7"]["name"="和光市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="川口市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="朝霞市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="蕨市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="戸田市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="志木市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="新座市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="所沢市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="草加市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="三郷市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"="7"]["name"="八潮市"]["boundary"="administrative"](area.saitama);
  relation["admin_level"~"^[567]$"]["name"="さいたま市"]["boundary"="administrative"](area.saitama);
);
out geom;
""",
    "千葉・神奈川": """
[out:json][timeout:120];
area["name"="神奈川県"]["admin_level"="4"]->.kanagawa;
(
  relation["admin_level"="7"]["name"="浦安市"]["boundary"="administrative"];
  relation["admin_level"="7"]["name"="市川市"]["boundary"="administrative"];
  relation["admin_level"="7"]["name"="松戸市"]["boundary"="administrative"];
  relation["admin_level"="7"]["name"="流山市"]["boundary"="administrative"];
  relation["admin_level"="7"]["name"="柏市"]["boundary"="administrative"];
  relation["admin_level"~"^[567]$"]["name"="川崎市"]["boundary"="administrative"](area.kanagawa);
);
out geom;
""",
}


def merge_ways(ways):
    """複数のwayを端点で連結してリングを構成"""
    if not ways:
        return []
    closed_rings = []
    open_ways = []
    for w in ways:
        if len(w) >= 4 and w[0] == w[-1]:
            closed_rings.append(w)
        else:
            open_ways.append(list(w))

    while open_ways:
        current = open_ways.pop(0)
        changed = True
        while changed:
            changed = False
            for i, w in enumerate(open_ways):
                if current[-1] == w[0]:
                    current.extend(w[1:])
                    open_ways.pop(i)
                    changed = True
                    break
                elif current[-1] == w[-1]:
                    current.extend(reversed(w[:-1]))
                    open_ways.pop(i)
                    changed = True
                    break
                elif current[0] == w[-1]:
                    current = w[:-1] + current
                    open_ways.pop(i)
                    changed = True
                    break
                elif current[0] == w[0]:
                    current = list(reversed(w[1:])) + current
                    open_ways.pop(i)
                    changed = True
                    break
        if len(current) >= 4 and current[0] == current[-1]:
            closed_rings.append(current)
        elif len(current) >= 3:
            current.append(current[0])
            if len(current) >= 4:
                closed_rings.append(current)
    return closed_rings


def overpass_to_polygons(data):
    """Overpass JSON response からポリゴンを抽出"""
    polygons = []
    names_found = []

    for element in data.get("elements", []):
        if element["type"] != "relation":
            continue
        name = element.get("tags", {}).get("name", "unknown")
        names_found.append(name)

        outer_ways = []
        for member in element.get("members", []):
            if member.get("role") == "outer" and member.get("type") == "way":
                coords = [(node["lon"], node["lat"]) for node in member.get("geometry", [])]
                if len(coords) >= 2:
                    outer_ways.append(coords)

        if not outer_ways:
            print(f"  Warning: {name} has no outer ways")
            continue

        rings = merge_ways(outer_ways)
        for ring in rings:
            if len(ring) >= 4:
                try:
                    poly = Polygon(ring)
                    if not poly.is_valid:
                        poly = poly.buffer(0)
                    if poly.is_valid and poly.area > 0:
                        if poly.geom_type == "MultiPolygon":
                            polygons.extend(poly.geoms)
                        else:
                            polygons.append(poly)
                except Exception as e:
                    print(f"  Warning: {name}: {e}")

    return polygons, names_found


def round_coords(geom_dict, decimals):
    import copy
    result = copy.deepcopy(geom_dict)

    def rr(obj):
        if isinstance(obj, list):
            if len(obj) >= 2 and isinstance(obj[0], (int, float)):
                return [round(x, decimals) for x in obj]
            return [rr(item) for item in obj]
        return obj

    result["coordinates"] = rr(result["coordinates"])
    return result


def main():
    all_polygons = []
    all_names = []

    for label, query in QUERIES.items():
        print(f"\n--- {label} ---")
        print("Querying Overpass API...")
        for attempt in range(3):
            try:
                resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=180)
                resp.raise_for_status()
                break
            except Exception as e:
                print(f"  Attempt {attempt+1} failed: {e}")
                if attempt < 2:
                    print("  Retrying in 10s...")
                    time.sleep(10)
                else:
                    print("  Giving up on this query.")
                    resp = None

        if resp is None:
            continue

        data = resp.json()
        print(f"  Got {len(data.get('elements', []))} elements")

        polygons, names = overpass_to_polygons(data)
        all_polygons.extend(polygons)
        all_names.extend(names)
        print(f"  Names: {', '.join(sorted(set(names)))}")
        print(f"  Polygons: {len(polygons)}")

        # Be polite to the API
        time.sleep(3)

    print(f"\n=== Total: {len(all_polygons)} polygons from {len(set(all_names))} municipalities ===")
    print(f"Municipalities: {', '.join(sorted(set(all_names)))}")

    if not all_polygons:
        print("ERROR: No polygons!")
        return

    # Dissolve
    print("\nDissolving...")
    merged = unary_union(all_polygons)

    # Simplify
    print("Simplifying...")
    simplified = merged.simplify(0.001, preserve_topology=True)
    if simplified.geom_type == "Polygon":
        simplified = MultiPolygon([simplified])

    geom = round_coords(mapping(simplified), 4)

    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "name": "筑波大学附属中学校 通学区域",
                "source": "令和8年度 生徒募集要項"
            },
            "geometry": geom
        }]
    }

    output_path = "data/gakku.geojson"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    import os
    size = os.path.getsize(output_path)
    print(f"\nOutput: {output_path} ({size:,} bytes / {size/1024:.1f} KB)")

    if size > 200 * 1024:
        print("File exceeds 200KB. Trying more aggressive simplification...")
        for tol in [0.002, 0.003, 0.005]:
            s2 = merged.simplify(tol, preserve_topology=True)
            if s2.geom_type == "Polygon":
                s2 = MultiPolygon([s2])
            geojson["features"][0]["geometry"] = round_coords(mapping(s2), 4)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(geojson, f, ensure_ascii=False)
            size2 = os.path.getsize(output_path)
            print(f"  tolerance={tol}: {size2/1024:.1f} KB")
            if size2 <= 200 * 1024:
                break

    print("Done!")


if __name__ == "__main__":
    main()
