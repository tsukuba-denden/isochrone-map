// ============================================================
// devtools.js — 開発者ツール（駅追加・データexport/import）
// ============================================================
(function () {
  'use strict';

  var DevTools = {
    _open: false,
    _panel: null,
    _pickMode: false,
    _previewMarker: null,
    _mapClickHandler: null,

    init: function () {
      this._buildPanel();
      // ?dev=1 で自動表示
      if (location.search.indexOf('dev=1') !== -1) {
        this.toggle();
      }
    },

    toggle: function () {
      this._open = !this._open;
      if (this._panel) {
        this._panel.style.display = this._open ? 'block' : 'none';
      }
      var btn = document.getElementById('btn-devtools');
      if (btn) {
        btn.textContent = this._open ? '\uD83D\uDD27 開発者ツール \u25B2' : '\uD83D\uDD27 開発者ツール';
      }
      if (this._open) {
        this._runValidation();
      }
    },

    _buildPanel: function () {
      var panel = document.createElement('div');
      panel.id = 'devtools-panel';
      panel.className = 'devtools-section';
      panel.style.display = 'none';

      var today = new Date().toISOString().slice(0, 10);

      panel.innerHTML =
        '<div class="devtools-group">' +
          '<div class="devtools-group-title">\u99C5\u306E\u8FFD\u52A0</div>' +
          '<label class="devtools-field">' +
            '<span class="devtools-field-label">\u5730\u56F3\u30AF\u30EA\u30C3\u30AF\u3067\u5EA7\u6A19\u53D6\u5F97</span>' +
            '<input type="checkbox" id="dev-pick-mode">' +
            '<span class="ctrl-toggle"></span>' +
          '</label>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">ID</span>' +
            '<input type="text" id="dev-id" class="devtools-input" placeholder="station-xxx (\u81EA\u52D5\u751F\u6210)">' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u99C5\u540D</span>' +
            '<input type="text" id="dev-station" class="devtools-input" placeholder="\u99C5\u540D">' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u7DEF\u5EA6</span>' +
            '<input type="number" id="dev-lat" class="devtools-input" step="0.0001" placeholder="35.xxxx">' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u7D4C\u5EA6</span>' +
            '<input type="number" id="dev-lng" class="devtools-input" step="0.0001" placeholder="139.xxxx">' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u6642\u523B</span>' +
            '<div class="devtools-time-inputs">' +
              '<input type="number" id="dev-hour" class="devtools-input devtools-input-sm" min="0" max="23" value="7" placeholder="HH">' +
              '<span>:</span>' +
              '<input type="number" id="dev-min" class="devtools-input devtools-input-sm" min="0" max="59" value="48" placeholder="MM">' +
            '</div>' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u8DEF\u7DDA</span>' +
            '<input type="text" id="dev-line" class="devtools-input" placeholder="\u4E38\u30CE\u5185\u7DDA\u306A\u3069">' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u7D4C\u8DEF</span>' +
            '<input type="text" id="dev-route" class="devtools-input" placeholder="\u5F92\u6B6910\u5206\u306A\u3069">' +
          '</div>' +
          '<label class="devtools-field">' +
            '<span class="devtools-field-label">\u4E3B\u8981\u99C5</span>' +
            '<input type="checkbox" id="dev-major">' +
            '<span class="ctrl-toggle"></span>' +
          '</label>' +
          '<label class="devtools-field">' +
            '<span class="devtools-field-label">\u5B66\u533A\u5916</span>' +
            '<input type="checkbox" id="dev-outside">' +
            '<span class="ctrl-toggle"></span>' +
          '</label>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u30E1\u30E2</span>' +
            '<input type="text" id="dev-note" class="devtools-input" placeholder="">' +
          '</div>' +
          '<div class="devtools-field">' +
            '<span class="devtools-field-label">\u691C\u7D22\u65E5</span>' +
            '<input type="date" id="dev-searchdate" class="devtools-input" value="' + today + '">' +
          '</div>' +
          '<div class="devtools-btn-row">' +
            '<button class="devtools-btn" id="dev-preview">\u30D7\u30EC\u30D3\u30E5\u30FC</button>' +
            '<button class="devtools-btn devtools-btn-primary" id="dev-confirm">\u78BA\u5B9A</button>' +
          '</div>' +
        '</div>' +
        '<div class="devtools-group">' +
          '<div class="devtools-group-title">\u30C7\u30FC\u30BF\u7BA1\u7406</div>' +
          '<button class="devtools-btn devtools-btn-full" id="dev-copy-json">JSON\u3092\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u306B\u30B3\u30D4\u30FC</button>' +
          '<button class="devtools-btn devtools-btn-full" id="dev-export-json">JSON\u30D5\u30A1\u30A4\u30EB\u306B\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8</button>' +
          '<button class="devtools-btn devtools-btn-full" id="dev-import-json">JSON\u30D5\u30A1\u30A4\u30EB\u3092\u30A4\u30F3\u30DD\u30FC\u30C8</button>' +
          '<input type="file" id="dev-import-file" accept=".json" style="display:none">' +
        '</div>' +
        '<div class="devtools-group">' +
          '<div class="devtools-group-title">\u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3</div>' +
          '<div class="devtools-validation" id="dev-validation"></div>' +
        '</div>';

      // 設定パネルの btn-devtools の後に挿入
      var btn = document.getElementById('btn-devtools');
      if (btn && btn.parentNode) {
        btn.parentNode.appendChild(panel);
      }

      this._panel = panel;
      this._bindEvents();
      this._runValidation();
    },

    _bindEvents: function () {
      var self = this;

      // 座標取得モード
      document.getElementById('dev-pick-mode').addEventListener('change', function () {
        self._pickMode = this.checked;
        var container = app.map.getContainer();
        if (self._pickMode) {
          container.style.cursor = 'crosshair';
          self._mapClickHandler = function (e) {
            if (!self._pickMode) return;
            document.getElementById('dev-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('dev-lng').value = e.latlng.lng.toFixed(6);
          };
          app.map.on('click', self._mapClickHandler);
        } else {
          container.style.cursor = '';
          if (self._mapClickHandler) {
            app.map.off('click', self._mapClickHandler);
            self._mapClickHandler = null;
          }
        }
      });

      // プレビュー
      document.getElementById('dev-preview').addEventListener('click', function () {
        self._showPreview();
      });

      // 確定
      document.getElementById('dev-confirm').addEventListener('click', function () {
        self._confirmStation();
      });

      // JSONコピー
      document.getElementById('dev-copy-json').addEventListener('click', function () {
        self._copyJSON();
      });

      // JSONエクスポート
      document.getElementById('dev-export-json').addEventListener('click', function () {
        self._exportJSON();
      });

      // JSONインポート
      document.getElementById('dev-import-json').addEventListener('click', function () {
        document.getElementById('dev-import-file').click();
      });

      document.getElementById('dev-import-file').addEventListener('change', function () {
        if (this.files && this.files[0]) {
          self._importJSON(this.files[0]);
          this.value = '';
        }
      });
    },

    _getFormData: function () {
      var h = parseInt(document.getElementById('dev-hour').value, 10) || 0;
      var m = parseInt(document.getElementById('dev-min').value, 10) || 0;
      var minutes = h * 60 + m;
      var id = document.getElementById('dev-id').value.trim();
      if (!id) {
        id = 'station-' + Date.now();
      }

      return {
        id: id,
        station: document.getElementById('dev-station').value.trim(),
        lat: parseFloat(document.getElementById('dev-lat').value) || 0,
        lng: parseFloat(document.getElementById('dev-lng').value) || 0,
        minutes: minutes,
        major: document.getElementById('dev-major').checked,
        line: document.getElementById('dev-line').value.trim(),
        route: document.getElementById('dev-route').value.trim(),
        outside: document.getElementById('dev-outside').checked,
        note: document.getElementById('dev-note').value.trim() || undefined,
        searchDate: document.getElementById('dev-searchdate').value || undefined,
      };
    },

    _validateStation: function (s, existingStations) {
      var errors = [];
      if (!s.station) errors.push('\u99C5\u540D\u304C\u7A7A\u3067\u3059');
      if (s.lat < 34.5 || s.lat > 37.0) errors.push('\u7DEF\u5EA6\u304C\u7BC4\u56F2\u5916 (34.5\u301C37.0)');
      if (s.lng < 138.5 || s.lng > 141.0) errors.push('\u7D4C\u5EA6\u304C\u7BC4\u56F2\u5916 (138.5\u301C141.0)');
      if (s.minutes < 360 || s.minutes > 500) errors.push('\u6642\u523B\u304C\u7BC4\u56F2\u5916 (06:00\u301C08:20)');
      if (existingStations) {
        var dup = existingStations.some(function (st) { return st.id === s.id; });
        if (dup) errors.push('ID \u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059: ' + s.id);
      }
      return errors;
    },

    _showPreview: function () {
      var data = this._getFormData();
      var errors = this._validateStation(data, DataManager.stations);

      if (errors.length > 0) {
        this._showValidationErrors(errors);
        return;
      }

      // 既存プレビューを削除
      this._clearPreview();

      // プレビューマーカー（点線の円）
      this._previewMarker = L.circleMarker([data.lat, data.lng], {
        radius: 12,
        fillColor: colorToCSS(minutesToColor(data.minutes)),
        color: '#ff6b6b',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3,
        dashArray: '5, 5',
      }).addTo(app.map);

      this._previewMarker.bindTooltip(
        '<div class="station-tooltip">' +
          '<div class="tt-name">\u30D7\u30EC\u30D3\u30E5\u30FC: ' + data.station + '</div>' +
          '<div class="tt-time" style="color:' + colorToCSS(minutesToColor(data.minutes)) + '">' + minutesToTimeStr(data.minutes) + '</div>' +
        '</div>',
        { permanent: true, direction: 'top', offset: [0, -15], className: 'station-tooltip-wrapper', opacity: 1 }
      );

      app.map.setView([data.lat, data.lng], Math.max(app.map.getZoom(), 12));
      this._showValidationSuccess('\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8868\u793A\u4E2D');
    },

    _clearPreview: function () {
      if (this._previewMarker) {
        app.map.removeLayer(this._previewMarker);
        this._previewMarker = null;
      }
    },

    _confirmStation: function () {
      var data = this._getFormData();
      var errors = this._validateStation(data, DataManager.stations);

      if (errors.length > 0) {
        this._showValidationErrors(errors);
        return;
      }

      // Clean undefined fields
      var station = {};
      var keys = ['id', 'station', 'lat', 'lng', 'minutes', 'major', 'line', 'route', 'outside', 'note', 'searchDate'];
      keys.forEach(function (k) {
        if (data[k] !== undefined && data[k] !== '') {
          station[k] = data[k];
        }
      });

      DataManager.stations.push(station);
      this._clearPreview();
      this._refreshAll();

      // フォームクリア
      document.getElementById('dev-id').value = '';
      document.getElementById('dev-station').value = '';
      document.getElementById('dev-lat').value = '';
      document.getElementById('dev-lng').value = '';

      this._showValidationSuccess('\u2713 \u99C5\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F: ' + station.station);
    },

    _refreshAll: function () {
      var stations = DataManager.stations;
      var meta = DataManager.meta;

      // 等時線・グラデーション再描画
      if (app.contourOverlay) app.contourOverlay.setStations(stations);
      if (app.gradientOverlay) app.gradientOverlay.setStations(stations);

      // マーカー再描画
      if (MarkerManager.refresh) {
        MarkerManager.refresh(stations, meta);
      }

      // 学区境界を再適用
      if (DataManager.gakku) {
        MarkerManager.setGakkuData(DataManager.gakku);
        var settings = UIManager.getSettings();
        MarkerManager.setGakkuVisible(settings.gakkuEnabled);
      }

      // データ情報更新
      UIManager.updateDataInfo(
        meta,
        stations.length,
        DataManager.getMajorCount(),
        DataManager.getOutsideCount()
      );

      this._runValidation();
    },

    _copyJSON: function () {
      var exportData = {
        meta: DataManager.meta,
        stations: DataManager.stations,
      };
      var text = JSON.stringify(exportData, null, 2);
      var btn = document.getElementById('dev-copy-json');

      navigator.clipboard.writeText(text).then(function () {
        var orig = btn.textContent;
        btn.textContent = '\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F \u2713';
        btn.classList.add('devtools-btn-success');
        setTimeout(function () {
          btn.textContent = orig;
          btn.classList.remove('devtools-btn-success');
        }, 1500);
      }).catch(function () {
        btn.textContent = '\u30B3\u30D4\u30FC\u5931\u6557';
        setTimeout(function () {
          btn.textContent = 'JSON\u3092\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u306B\u30B3\u30D4\u30FC';
        }, 1500);
      });
    },

    _exportJSON: function () {
      var exportData = {
        meta: DataManager.meta,
        stations: DataManager.stations,
      };
      var text = JSON.stringify(exportData, null, 2);
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'stations.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    _importJSON: function (file) {
      var self = this;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);

          // Validate structure
          if (!data.stations || !Array.isArray(data.stations)) {
            self._showValidationErrors(['\u7121\u52B9\u306AJSON: stations\u914D\u5217\u304C\u3042\u308A\u307E\u305B\u3093']);
            return;
          }

          // Validate each station
          var allErrors = [];
          var ids = [];
          data.stations.forEach(function (s, i) {
            var errs = self._validateStation(s, null);
            // Check ID duplicates within imported data
            if (ids.indexOf(s.id) !== -1) {
              errs.push('ID\u91CD\u8907: ' + s.id);
            }
            ids.push(s.id);
            errs.forEach(function (err) {
              allErrors.push('\u99C5' + (i + 1) + ' (' + (s.station || '?') + '): ' + err);
            });
          });

          if (allErrors.length > 0) {
            self._showValidationErrors(allErrors);
            return;
          }

          // Apply
          if (data.meta) DataManager.meta = data.meta;
          DataManager.stations = data.stations;
          self._refreshAll();
          self._showValidationSuccess('\u2713 ' + data.stations.length + '\u99C5\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F');
        } catch (err) {
          self._showValidationErrors(['JSON\u30D1\u30FC\u30B9\u30A8\u30E9\u30FC: ' + err.message]);
        }
      };
      reader.readAsText(file);
    },

    _runValidation: function () {
      var stations = DataManager.stations;
      var ids = {};
      var errors = [];
      var duplicates = 0;
      var coordErrors = 0;

      stations.forEach(function (s) {
        if (ids[s.id]) duplicates++;
        ids[s.id] = true;
        if (s.lat < 34.5 || s.lat > 37.0 || s.lng < 138.5 || s.lng > 141.0) coordErrors++;
      });

      var html = '\u2713 ' + stations.length + '\u99C5';
      if (duplicates > 0) {
        html += ' / <span class="devtools-error">ID\u91CD\u8907 ' + duplicates + '\u4EF6</span>';
      } else {
        html += ' / \u91CD\u8907\u306A\u3057';
      }
      if (coordErrors > 0) {
        html += ' / <span class="devtools-error">\u5EA7\u6A19\u7BC4\u56F2\u5916 ' + coordErrors + '\u4EF6</span>';
      } else {
        html += ' / \u5EA7\u6A19\u7BC4\u56F2OK';
      }

      var el = document.getElementById('dev-validation');
      if (el) {
        el.innerHTML = '<span class="devtools-success">' + html + '</span>';
      }
    },

    _showValidationErrors: function (errors) {
      var el = document.getElementById('dev-validation');
      if (el) {
        el.innerHTML = errors.map(function (e) {
          return '<div class="devtools-error">\u2717 ' + e + '</div>';
        }).join('');
      }
    },

    _showValidationSuccess: function (msg) {
      var el = document.getElementById('dev-validation');
      if (el) {
        el.innerHTML = '<div class="devtools-success">' + msg + '</div>';
      }
      // 通常バリデーションも表示
      var self = this;
      setTimeout(function () { self._runValidation(); }, 2000);
    },
  };

  window.DevTools = DevTools;

  // DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { DevTools.init(); });
  } else {
    // Wait for app to be ready
    setTimeout(function () { DevTools.init(); }, 0);
  }
})();
