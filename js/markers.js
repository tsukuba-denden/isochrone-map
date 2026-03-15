// ============================================================
// markers.js — 駅マーカー・ラベル・ツールチップ・目的地マーカー
// ============================================================
(function () {
  'use strict';

  var MarkerManager = {
    _map: null,
    _meta: null,
    _markers: [],    // { marker, label, data }
    _destMarker: null,
    _labelsEnabled: true,
    _gakkuLayer: null,

    init: function (map, stations, meta) {
      this._map = map;
      this._meta = meta;
      this._createDestMarker();
      this._createStationMarkers(stations);
      map.on('zoomend', this._updateDisplay.bind(this));
      this._updateDisplay();
    },

    _createDestMarker: function () {
      var dest = CONFIG.destination;
      this._destMarker = L.marker([dest.lat, dest.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div class="dest-marker"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        zIndexOffset: 1000,
      }).addTo(this._map);

      this._destMarker.bindTooltip(
        '<div class="station-tooltip">' +
          '<div class="tt-name">\uD83C\uDFEB ' + dest.name + '</div>' +
          '<div class="tt-time" style="color:#ff6b6b">' + dest.arrivalTime + '</div>' +
          '<div class="tt-line">朝の連絡</div>' +
        '</div>',
        { direction: 'top', offset: [0, -12], className: 'station-tooltip-wrapper', opacity: 1 }
      );
    },

    _getMarkerStroke: function () {
      return getComputedStyle(document.documentElement).getPropertyValue('--marker-stroke').trim() || '#fff';
    },

    _createStationMarkers: function (stations) {
      var self = this;
      var targetMinutes = this._meta.targetMinutes;
      var strokeColor = this._getMarkerStroke();

      stations.forEach(function (s) {
        var c = minutesToColor(s.minutes);
        var ts = minutesToTimeStr(s.minutes);
        var travel = targetMinutes - s.minutes;
        var isMajor = !!s.major;
        var isOutside = !!s.outside;

        // Circle marker
        var marker = L.circleMarker([s.lat, s.lng], {
          radius: 6,
          fillColor: colorToCSS(c),
          color: strokeColor,
          weight: isMajor ? 2 : 1.5,
          opacity: 1,
          fillOpacity: isOutside ? 0.4 : 0.9,
        }).addTo(self._map);

        // Tooltip
        var outsideBadge = isOutside ? '<div class="tt-outside">※学区外</div>' : '';
        var routeHtml = s.route ? '<div class="tt-line">' + s.route + '</div>' : '';
        var noteHtml = s.note ? '<div class="tt-detail">' + s.note + '</div>' : '';
        var searchDateHtml = s.searchDate ? '<div class="tt-detail">検索日: ' + s.searchDate + '</div>' : '';
        var detailSection = (routeHtml || noteHtml || searchDateHtml)
          ? '<div class="tt-divider"></div>' + routeHtml + noteHtml + searchDateHtml
          : '';

        marker.bindTooltip(
          '<div class="station-tooltip">' +
            outsideBadge +
            '<div class="tt-name">' + s.station + '</div>' +
            '<div class="tt-time" style="color:' + colorToCSS(c) + '">' + ts + '</div>' +
            '<div class="tt-travel">所要 ' + travel + '分</div>' +
            '<div class="tt-divider"></div>' +
            '<div class="tt-line">' + s.line + '</div>' +
            detailSection +
          '</div>',
          { direction: 'top', offset: [0, -8], className: 'station-tooltip-wrapper', opacity: 1 }
        );

        // Label (divIcon marker)
        var label = L.marker([s.lat, s.lng], {
          icon: L.divIcon({
            className: 'station-label' + (isOutside ? ' outside' : ''),
            html: '<span class="sl-name">' + s.station + '</span>' +
              '<br><span class="sl-time">' + ts + '</span>' +
              (isOutside ? '<br><span class="sl-outside">学区外</span>' : '') +
              '<span class="sl-detail" style="display:none"><br>' + s.line + '</span>',
            iconSize: [120, 40],
            iconAnchor: [-8, 15],
          }),
          interactive: false,
        });

        self._markers.push({ marker: marker, label: label, data: s, isMajor: isMajor, isOutside: isOutside });
      });
    },

    _updateDisplay: function () {
      var z = this._map.getZoom();

      this._markers.forEach(function (item) {
        var m = item.marker;
        var isMajor = item.isMajor;

        // Marker radius by zoom
        var r;
        if (isMajor) {
          r = z <= 10 ? 5 : z === 11 ? 6 : z <= 13 ? 7 : 8;
        } else {
          r = z <= 10 ? 3 : z === 11 ? 4 : z <= 13 ? 5 : 6;
        }
        m.setRadius(r);

        // Labels visibility
        var showLabel = false;
        if (this._labelsEnabled) {
          if (z >= 14) {
            showLabel = true;
          } else if (z >= 12) {
            showLabel = true;
          } else if (z <= 11 && isMajor) {
            showLabel = true;
          }
        }

        // Update label detail visibility at zoom >= 14
        if (item.label._icon) {
          var detail = item.label._icon.querySelector('.sl-detail');
          if (detail) {
            detail.style.display = z >= 14 ? '' : 'none';
          }
        }

        if (showLabel && !this._map.hasLayer(item.label)) {
          item.label.addTo(this._map);
        } else if (!showLabel && this._map.hasLayer(item.label)) {
          this._map.removeLayer(item.label);
        }

        // After add, update detail visibility
        if (showLabel && item.label._icon) {
          var d = item.label._icon.querySelector('.sl-detail');
          if (d) d.style.display = z >= 14 ? '' : 'none';
        }
      }.bind(this));
    },

    setLabelsEnabled: function (enabled) {
      this._labelsEnabled = enabled;
      this._updateDisplay();
    },

    updateTheme: function () {
      var strokeColor = this._getMarkerStroke();
      this._markers.forEach(function (item) {
        item.marker.setStyle({ color: strokeColor });
      });
    },

    // 学区境界
    setGakkuData: function (geojson) {
      if (!geojson) return;
      var style = getComputedStyle(document.documentElement);
      this._gakkuLayer = L.geoJSON(geojson, {
        style: {
          fillColor: style.getPropertyValue('--gakku-stroke').trim() || 'rgba(0,100,200,0.4)',
          fillOpacity: 0.05,
          color: style.getPropertyValue('--gakku-stroke').trim() || 'rgba(0,100,200,0.4)',
          weight: 2,
          dashArray: '6, 4',
          opacity: 0.4,
        },
      });
    },

    setGakkuVisible: function (visible) {
      if (!this._gakkuLayer) return;
      if (visible && !this._map.hasLayer(this._gakkuLayer)) {
        this._gakkuLayer.addTo(this._map);
      } else if (!visible && this._map.hasLayer(this._gakkuLayer)) {
        this._map.removeLayer(this._gakkuLayer);
      }
    },
  };

  window.MarkerManager = MarkerManager;
})();
