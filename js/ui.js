// ============================================================
// ui.js — 設定パネル・トグル・テーマ切替・凡例・localStorage
// ============================================================
(function () {
  'use strict';

  var STORAGE_KEY = 'isochrone-settings';

  var UIManager = {
    _settings: null,
    _onUpdate: null,
    _panelOpen: false,

    init: function (onUpdate) {
      this._onUpdate = onUpdate;
      this._settings = this._loadSettings();
      this._applyTheme(this._settings.theme);
      this._bindEvents();
      this._syncUI();
      this._buildLegend();
    },

    getSettings: function () {
      return this._settings;
    },

    _defaults: function () {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return {
        theme: prefersDark ? 'dark' : 'light',
        tileId: null,  // null = auto
        contourEnabled: CONFIG.defaultContourEnabled,
        contourInterval: CONFIG.defaultContourInterval,
        gradientEnabled: CONFIG.defaultGradientEnabled,
        labelsEnabled: CONFIG.defaultLabelsEnabled,
        gakkuEnabled: CONFIG.defaultGakkuEnabled,
      };
    },

    _loadSettings: function () {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          var parsed = JSON.parse(saved);
          var defaults = this._defaults();
          // Merge with defaults
          for (var k in defaults) {
            if (!(k in parsed)) parsed[k] = defaults[k];
          }
          return parsed;
        }
      } catch (e) { /* ignore */ }
      return this._defaults();
    },

    _saveSettings: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
      } catch (e) { /* ignore */ }
    },

    _applyTheme: function (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    },

    _syncUI: function () {
      var s = this._settings;
      document.getElementById('toggle-contour').checked = s.contourEnabled;
      document.getElementById('toggle-gradient').checked = s.gradientEnabled;
      document.getElementById('toggle-labels').checked = s.labelsEnabled;
      document.getElementById('toggle-gakku').checked = s.gakkuEnabled;
      document.getElementById('select-interval').value = String(s.contourInterval);
      document.getElementById('select-tile').value = s.tileId || CONFIG.defaultTile[s.theme];
      document.getElementById('toggle-theme').checked = s.theme === 'dark';

      // Interval selector visibility
      document.getElementById('interval-row').style.display = s.contourEnabled ? '' : 'none';
    },

    _bindEvents: function () {
      var self = this;

      // Gear button
      document.getElementById('btn-settings').addEventListener('click', function () {
        self._panelOpen = !self._panelOpen;
        document.getElementById('settings-panel').classList.toggle('open', self._panelOpen);
      });

      // Theme toggle
      document.getElementById('toggle-theme').addEventListener('change', function () {
        self._settings.theme = this.checked ? 'dark' : 'light';
        self._applyTheme(self._settings.theme);
        // Always auto-switch tile to match theme
        var autoTile = CONFIG.defaultTile[self._settings.theme];
        self._settings.tileId = null;
        document.getElementById('select-tile').value = autoTile;
        self._saveSettings();
        self._notify('theme', self._settings.theme);
      });

      // Tile select
      document.getElementById('select-tile').addEventListener('change', function () {
        self._settings.tileId = this.value;
        self._saveSettings();
        self._notify('tile', this.value);
      });

      // Contour toggle
      document.getElementById('toggle-contour').addEventListener('change', function () {
        self._settings.contourEnabled = this.checked;
        document.getElementById('interval-row').style.display = this.checked ? '' : 'none';
        self._saveSettings();
        self._buildLegend();
        self._notify('contour', this.checked);
      });

      // Contour interval
      document.getElementById('select-interval').addEventListener('change', function () {
        self._settings.contourInterval = parseInt(this.value, 10);
        self._saveSettings();
        self._buildLegend();
        self._notify('interval', self._settings.contourInterval);
      });

      // Gradient toggle
      document.getElementById('toggle-gradient').addEventListener('change', function () {
        self._settings.gradientEnabled = this.checked;
        self._saveSettings();
        self._buildLegend();
        self._notify('gradient', this.checked);
      });

      // Labels toggle
      document.getElementById('toggle-labels').addEventListener('change', function () {
        self._settings.labelsEnabled = this.checked;
        self._saveSettings();
        self._notify('labels', this.checked);
      });

      // Gakku toggle
      document.getElementById('toggle-gakku').addEventListener('change', function () {
        self._settings.gakkuEnabled = this.checked;
        self._saveSettings();
        self._notify('gakku', this.checked);
      });

      // Dev tools
      document.getElementById('btn-devtools').addEventListener('click', function () {
        if (window.DevTools) {
          DevTools.toggle();
        } else {
          alert('開発者ツールは利用できません');
        }
      });
    },

    _notify: function (key, value) {
      if (this._onUpdate) this._onUpdate(key, value);
    },

    updateDataInfo: function (meta, stationCount, majorCount, outsideCount) {
      var info = document.getElementById('data-info');
      info.innerHTML =
        '<span>' + stationCount + '</span> 駅 ｜ ' +
        '<span>' + majorCount + '</span> 主要 ｜ ' +
        '<span>' + outsideCount + '</span> 学区外' +
        (meta.lastUpdated ? '<br>更新: ' + meta.lastUpdated : '');
    },

    _buildLegend: function () {
      var s = this._settings;
      var container = document.getElementById('legend-lines');
      var title = document.getElementById('legend-title');
      var gradBar = document.getElementById('legend-grad');
      var gradLabels = document.getElementById('legend-grad-labels');

      // Title
      if (s.contourEnabled && s.gradientEnabled) {
        title.textContent = '出発時刻（等時線＋グラデーション）';
      } else if (s.contourEnabled) {
        title.textContent = '出発時刻（' + s.contourInterval + '分刻み等時線）';
      } else if (s.gradientEnabled) {
        title.textContent = '出発時刻（グラデーション）';
      } else {
        title.textContent = '出発時刻';
      }

      // Contour legend (10-min only)
      container.innerHTML = '';
      container.style.display = s.contourEnabled ? '' : 'none';
      if (s.contourEnabled) {
        for (var m = 400; m <= 480; m += 10) {
          var c = minutesToColor(m);
          var item = document.createElement('div');
          item.className = 'legend-item';
          item.innerHTML =
            '<span class="legend-swatch thick" style="background:' + colorToCSS(c) + '"></span>' +
            '<span class="legend-time">' + minutesToTimeStr(m) + '</span>';
          container.appendChild(item);
        }
      }

      // Gradient legend
      gradBar.style.display = s.gradientEnabled ? 'block' : 'none';
      gradLabels.style.display = s.gradientEnabled ? 'flex' : 'none';
      if (s.gradientEnabled) {
        var stops = [];
        for (var m2 = 390; m2 <= 485; m2 += 2) {
          var pct = ((m2 - 390) / (485 - 390) * 100).toFixed(1);
          stops.push(colorToCSS(minutesToColor(m2)) + ' ' + pct + '%');
        }
        gradBar.style.background = 'linear-gradient(90deg, ' + stops.join(',') + ')';
      }

      // Gakku legend
      var gakkuLegend = document.getElementById('legend-gakku');
      if (gakkuLegend) {
        gakkuLegend.style.display = s.gakkuEnabled ? '' : 'none';
      }
    },
  };

  window.UIManager = UIManager;
})();
