// ============================================================
// main.js — エントリ: 初期化・イベント接続
// ============================================================
(function () {
  'use strict';

  var app = {};
  window.app = app;

  // UI初期化（データロード前にテーマ等を適用）
  UIManager.init(onSettingChanged);

  var settings = UIManager.getSettings();

  // 地図初期化
  var map = MapManager.init();
  app.map = map;

  // タイル設定
  if (settings.tileId) {
    MapManager.setTileByUser(settings.tileId);
  } else {
    MapManager.onThemeChanged(settings.theme);
  }

  // オーバーレイ初期化（データロード後にstationsをセット）
  var contourOverlay = new ContourOverlay({
    stations: [],
    interval: settings.contourInterval,
    visible: settings.contourEnabled,
  });
  contourOverlay.addTo(map);
  app.contourOverlay = contourOverlay;

  var gradientOverlay = new GradientOverlay({
    stations: [],
    visible: settings.gradientEnabled,
  });
  gradientOverlay.addTo(map);
  app.gradientOverlay = gradientOverlay;

  // データ読み込み
  DataManager.load().then(function () {
    var stations = DataManager.stations;
    var meta = DataManager.meta;

    // オーバーレイにデータを渡す
    contourOverlay.setStations(stations);
    gradientOverlay.setStations(stations);

    // マーカー初期化
    MarkerManager.init(map, stations, meta);
    MarkerManager.setLabelsEnabled(settings.labelsEnabled);

    // 学区境界
    if (DataManager.gakku) {
      MarkerManager.setGakkuData(DataManager.gakku);
      MarkerManager.setGakkuVisible(settings.gakkuEnabled);
    }

    // データ情報
    UIManager.updateDataInfo(
      meta,
      stations.length,
      DataManager.getMajorCount(),
      DataManager.getOutsideCount()
    );
  }).catch(function (err) {
    console.error('データ読み込みエラー:', err);
  });

  function onSettingChanged(key, value) {
    switch (key) {
      case 'theme':
        MapManager.onThemeChanged(value);
        MarkerManager.updateTheme();
        contourOverlay.refresh();
        break;
      case 'tile':
        MapManager.setTileByUser(value);
        break;
      case 'contour':
        contourOverlay.setVisible(value);
        break;
      case 'interval':
        contourOverlay.setInterval(value);
        break;
      case 'gradient':
        gradientOverlay.setVisible(value);
        break;
      case 'labels':
        MarkerManager.setLabelsEnabled(value);
        break;
      case 'gakku':
        MarkerManager.setGakkuVisible(value);
        break;
    }
  }
})();
