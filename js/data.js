// ============================================================
// data.js — stations.json / gakku.geojson の fetch・管理
// ============================================================
(function () {
  'use strict';

  var DataManager = {
    stations: [],
    meta: null,
    gakku: null,

    load: function () {
      var self = this;
      return Promise.all([
        self._loadStations(),
        self._loadGakku(),
      ]);
    },

    _loadStations: function () {
      var self = this;
      return fetch('data/stations.json')
        .then(function (res) {
          if (!res.ok) throw new Error('stations.json: ' + res.status);
          return res.json();
        })
        .then(function (data) {
          self.meta = data.meta;
          self.stations = data.stations;
        });
    },

    _loadGakku: function () {
      var self = this;
      return fetch('data/gakku.geojson')
        .then(function (res) {
          if (!res.ok) return null;
          return res.json();
        })
        .then(function (data) {
          self.gakku = data;
        })
        .catch(function () {
          self.gakku = null;
        });
    },

    getMajorCount: function () {
      return this.stations.filter(function (s) { return s.major; }).length;
    },

    getOutsideCount: function () {
      return this.stations.filter(function (s) { return s.outside; }).length;
    },

    getTravelMinutes: function (station) {
      if (station.duration !== undefined) return station.duration;
      if (!this.meta) return 0;
      return this.meta.targetMinutes - station.minutes;
    },
  };

  window.DataManager = DataManager;
})();
