// ============================================================
// renderer.js — IDW補間 → マーチングスクエア → Canvas等時線描画
//               IDW補間 → Canvas グラデーション描画
// ============================================================
(function () {
  'use strict';

  // IDW補間
  function idw(lat, lng, stations, power) {
    if (!power) power = CONFIG.idwPower;
    var num = 0, den = 0;
    for (var i = 0; i < stations.length; i++) {
      var s = stations[i];
      var dlat = lat - s.lat;
      var dlng = (lng - s.lng) * Math.cos(lat * Math.PI / 180);
      var d = Math.sqrt(dlat * dlat + dlng * dlng);
      if (d < 0.0005) return s.minutes;
      var w = 1 / Math.pow(d, power);
      num += w * s.minutes;
      den += w;
    }
    return den > 0 ? num / den : null;
  }

  // 等時線のブレーク値を生成
  function buildContourBreaks(interval) {
    var breaks = [];
    for (var m = 400; m <= 485; m += interval) {
      breaks.push(m);
    }
    return breaks;
  }

  // ============================================================
  // ContourRenderer — マーチングスクエア等時線
  // ============================================================
  var ContourOverlay = L.Layer.extend({
    options: { pane: 'overlayPane' },

    initialize: function (opts) {
      this._stations = opts.stations || [];
      this._interval = opts.interval || 5;
      this._visible = opts.visible !== false;
      this._debounceTimer = null;
    },

    onAdd: function (map) {
      this._map = map;
      this._cv = L.DomUtil.create('canvas', 'leaflet-layer');
      Object.assign(this._cv.style, { position: 'absolute', pointerEvents: 'none', zIndex: '250' });
      map.getPanes().overlayPane.appendChild(this._cv);
      map.on('moveend zoomend resize', this._debouncedRender, this);
      this._render();
    },

    onRemove: function (map) {
      L.DomUtil.remove(this._cv);
      map.off('moveend zoomend resize', this._debouncedRender, this);
    },

    _debouncedRender: function () {
      var self = this;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(function () { self._render(); }, CONFIG.renderDebounceMs);
    },

    setVisible: function (v) { this._visible = v; this._render(); },
    setInterval: function (interval) { this._interval = interval; this._render(); },
    setStations: function (stations) { this._stations = stations; this._render(); },

    refresh: function () { if (this._map) this._render(); },

    _render: function () {
      var map = this._map;
      if (!map) return;
      var sz = map.getSize(), cv = this._cv;
      cv.width = sz.x; cv.height = sz.y;
      L.DomUtil.setPosition(cv, map.containerPointToLayerPoint([0, 0]));
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, sz.x, sz.y);
      if (!this._visible || this._stations.length === 0) return;

      var cell = CONFIG.gridSize(map.getZoom());
      var cols = Math.ceil(sz.x / cell) + 1;
      var rows = Math.ceil(sz.y / cell) + 1;
      var grid = new Float32Array(cols * rows);
      var stations = this._stations;

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var ll = map.containerPointToLatLng([c * cell, r * cell]);
          grid[r * cols + c] = idw(ll.lat, ll.lng, stations) || 0;
        }
      }

      var breaks = buildContourBreaks(this._interval);

      for (var bi = 0; bi < breaks.length; bi++) {
        var level = breaks[bi];
        var col = minutesToColor(level);
        var isMain = (level % 10 === 0);
        ctx.strokeStyle = colorToCSS(col, isMain ? 0.9 : 0.45);
        ctx.lineWidth = isMain ? 3 : 1.2;
        ctx.beginPath();

        for (r = 0; r < rows - 1; r++) {
          for (c = 0; c < cols - 1; c++) {
            var v00 = grid[r * cols + c], v10 = grid[r * cols + c + 1];
            var v01 = grid[(r + 1) * cols + c], v11 = grid[(r + 1) * cols + c + 1];
            var ci = (v00 >= level ? 8 : 0) | (v10 >= level ? 4 : 0) | (v11 >= level ? 2 : 0) | (v01 >= level ? 1 : 0);
            if (ci === 0 || ci === 15) continue;

            var x0 = c * cell, y0 = r * cell;
            var lx = function (va, vb) { return x0 + (level - va) / (vb - va) * cell; };
            var ly = function (va, vb) { return y0 + (level - va) / (vb - va) * cell; };

            // Marching squares edge interpolation
            var tTop = [lx(v00, v10), y0];
            var tBot = [lx(v01, v11), y0 + cell];
            var tLft = [x0, ly(v00, v01)];
            var tRgt = [x0 + cell, ly(v10, v11)];

            var segs = [];
            switch (ci) {
              case 1: case 14: segs.push([tLft, tBot]); break;
              case 2: case 13: segs.push([tBot, tRgt]); break;
              case 3: case 12: segs.push([tLft, tRgt]); break;
              case 4: case 11: segs.push([tTop, tRgt]); break;
              case 5: segs.push([tLft, tTop], [tBot, tRgt]); break;
              case 6: case 9: segs.push([tTop, tBot]); break;
              case 7: case 8: segs.push([tLft, tTop]); break;
              case 10: segs.push([tTop, tRgt], [tLft, tBot]); break;
            }
            for (var si = 0; si < segs.length; si++) {
              ctx.moveTo(segs[si][0][0], segs[si][0][1]);
              ctx.lineTo(segs[si][1][0], segs[si][1][1]);
            }
          }
        }
        ctx.stroke();

        // Labels on main contour lines
        if (isMain) {
          var txt = minutesToTimeStr(level);
          ctx.font = '600 11px "JetBrains Mono", monospace';
          var placed = 0;
          var rowStep = Math.max(1, Math.floor(rows / 4));
          for (r = rowStep; r < rows - 1 && placed < 3; r += rowStep) {
            for (c = 0; c < cols - 1 && placed < 3; c++) {
              var v = grid[r * cols + c], vn = grid[r * cols + c + 1];
              if ((v < level) !== (vn < level)) {
                var px = c * cell, py = r * cell;
                var tw = ctx.measureText(txt).width;
                var labelBg = getComputedStyle(document.documentElement).getPropertyValue('--contour-label-bg').trim() || 'rgba(255,255,255,0.82)';
                ctx.fillStyle = labelBg;
                ctx.fillRect(px - 2, py - 11, tw + 4, 14);
                ctx.fillStyle = colorToCSS(col, 1);
                ctx.fillText(txt, px, py);
                placed++;
                c += Math.floor(cols / 4);
              }
            }
          }
        }
      }
    },
  });

  // ============================================================
  // GradientRenderer — IDW グラデーション
  // ============================================================
  var GradientOverlay = L.Layer.extend({
    options: { pane: 'overlayPane' },

    initialize: function (opts) {
      this._stations = opts.stations || [];
      this._visible = opts.visible || false;
      this._debounceTimer = null;
    },

    onAdd: function (map) {
      this._map = map;
      this._cv = L.DomUtil.create('canvas', 'leaflet-layer');
      Object.assign(this._cv.style, { position: 'absolute', pointerEvents: 'none', zIndex: '200' });
      map.getPanes().overlayPane.appendChild(this._cv);
      map.on('moveend zoomend resize', this._debouncedRender, this);
      this._render();
    },

    onRemove: function (map) {
      L.DomUtil.remove(this._cv);
      map.off('moveend zoomend resize', this._debouncedRender, this);
    },

    _debouncedRender: function () {
      var self = this;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(function () { self._render(); }, CONFIG.renderDebounceMs);
    },

    setVisible: function (v) { this._visible = v; this._render(); },
    setStations: function (stations) { this._stations = stations; this._render(); },

    refresh: function () { if (this._map) this._render(); },

    _render: function () {
      var map = this._map;
      if (!map) return;
      var sz = map.getSize(), cv = this._cv;
      cv.width = sz.x; cv.height = sz.y;
      L.DomUtil.setPosition(cv, map.containerPointToLayerPoint([0, 0]));
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, sz.x, sz.y);
      if (!this._visible || this._stations.length === 0) return;

      var step = Math.max(4, Math.floor(Math.min(sz.x, sz.y) / 180));
      var stations = this._stations;
      for (var x = 0; x < sz.x; x += step) {
        for (var y = 0; y < sz.y; y += step) {
          var ll = map.containerPointToLatLng([x, y]);
          var val = idw(ll.lat, ll.lng, stations);
          if (val !== null) {
            ctx.fillStyle = colorToCSS(minutesToColor(val), 0.28);
            ctx.fillRect(x, y, step, step);
          }
        }
      }
    },
  });

  window.ContourOverlay = ContourOverlay;
  window.GradientOverlay = GradientOverlay;
})();
