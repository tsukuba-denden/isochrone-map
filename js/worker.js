// ============================================================
// worker.js — Web Worker for heavy IDW calculation
// ============================================================

// IDW補間 (ピクセル座標版)
function idwPx(x, y, pixStations, halfPower) {
  var num = 0, den = 0;
  for (var i = 0; i < pixStations.length; i++) {
    var s = pixStations[i];
    var dx = x - s.x;
    var dy = y - s.y;
    var distSq = dx * dx + dy * dy;
    if (distSq < 0.1) return s.minutes;
    var w = 1 / Math.pow(distSq, halfPower);
    num += w * s.minutes;
    den += w;
  }
  return den > 0 ? num / den : null;
}

self.onmessage = function (e) {
  const { type, id, payload } = e.data;

  if (type === 'CALC_GRID') {
    const { cols, rows, cell, pixStations, halfPower } = payload;
    const grid = new Float32Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      let cy = r * cell;
      for (let c = 0; c < cols; c++) {
        let cx = c * cell;
        grid[r * cols + c] = idwPx(cx, cy, pixStations, halfPower) || 0;
      }
    }
    self.postMessage({ type: 'GRID_READY', id, grid }, [grid.buffer]);
  } 
  else if (type === 'CALC_GRADIENT') {
    const { width, height, step, pixStations, halfPower } = payload;
    
    const cols = Math.ceil(width / step) + 1;
    const rows = Math.ceil(height / step) + 1;
    const values = new Float32Array(cols * rows);
    
    for (let r = 0; r < rows; r++) {
      let y = r * step;
      for (let c = 0; c < cols; c++) {
        let x = c * step;
        values[r * cols + c] = idwPx(x, y, pixStations, halfPower) || 0;
      }
    }
    self.postMessage({ type: 'GRADIENT_READY', id, values }, [values.buffer]);
  }
  else if (type === 'CALC_3D_GRID') {
    const { latMin, latMax, lngMin, lngMax, cols, rows, stations, halfPower } = payload;
    const grid = new Float32Array(cols * rows);
    const centerLat = (latMin + latMax) / 2;
    const cosLat = Math.cos(centerLat * Math.PI / 180);
    const dLat = (latMax - latMin) / (rows - 1);
    const dLng = (lngMax - lngMin) / (cols - 1);

    for (let r = 0; r < rows; r++) {
      const lat = latMax - r * dLat;
      for (let c = 0; c < cols; c++) {
        const lng = lngMin + c * dLng;
        let num = 0, den = 0;
        for (let i = 0; i < stations.length; i++) {
          const s = stations[i];
          const dlat = lat - s.lat;
          const dlng = (lng - s.lng) * cosLat;
          const distSq = dlat * dlat + dlng * dlng;
          if (distSq < 0.00000025) { num = s.minutes; den = 1; break; }
          const w = 1 / Math.pow(distSq, halfPower);
          num += w * s.minutes;
          den += w;
        }
        grid[r * cols + c] = den > 0 ? num / den : 0;
      }
    }
    self.postMessage({ type: 'GRID_3D_READY', id, grid, cols, rows }, [grid.buffer]);
  }
};