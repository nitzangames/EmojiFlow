function downsample(imageData, srcSize, dstSize) {
  var blockSize = srcSize / dstSize;
  var pixels = [];
  for (var dy = 0; dy < dstSize; dy++) {
    for (var dx = 0; dx < dstSize; dx++) {
      var rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      var count = 0;
      for (var by = 0; by < blockSize; by++) {
        for (var bx = 0; bx < blockSize; bx++) {
          var sx = dx * blockSize + bx;
          var sy = dy * blockSize + by;
          var idx = (sy * srcSize + sx) * 4;
          rSum += imageData.data[idx];
          gSum += imageData.data[idx + 1];
          bSum += imageData.data[idx + 2];
          aSum += imageData.data[idx + 3];
          count++;
        }
      }
      pixels.push({
        r: Math.round(rSum / count),
        g: Math.round(gSum / count),
        b: Math.round(bSum / count),
        a: Math.round(aSum / count),
      });
    }
  }
  return { pixels: pixels, width: dstSize, height: dstSize };
}

function colorDistance(c1, c2) {
  var dr = c1.r - c2.r;
  var dg = c1.g - c2.g;
  var db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function quantizeColors(pixels, threshold) {
  var ALPHA_CUTOFF = 128;
  var clusters = [];
  var assignments = new Uint8Array(pixels.length);

  for (var i = 0; i < pixels.length; i++) {
    var p = pixels[i];
    if (p.a < ALPHA_CUTOFF) {
      assignments[i] = 255;
      continue;
    }
    var bestIdx = -1;
    var bestDist = Infinity;
    for (var c = 0; c < clusters.length; c++) {
      var d = colorDistance(p, clusters[c]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = c;
      }
    }
    if (bestIdx >= 0 && bestDist < threshold) {
      var cl = clusters[bestIdx];
      var n = cl.count + 1;
      cl.r = Math.round((cl.r * cl.count + p.r) / n);
      cl.g = Math.round((cl.g * cl.count + p.g) / n);
      cl.b = Math.round((cl.b * cl.count + p.b) / n);
      cl.count = n;
      assignments[i] = bestIdx;
    } else {
      assignments[i] = clusters.length;
      clusters.push({ r: p.r, g: p.g, b: p.b, count: 1 });
    }
  }

  var palette = clusters.map(function(cl) {
    var hex = '#' +
      ((1 << 24) + (cl.r << 16) + (cl.g << 8) + cl.b)
        .toString(16).slice(1);
    return { r: cl.r, g: cl.g, b: cl.b, hex: hex };
  });

  return { palette: palette, assignments: assignments };
}

function extractBoard(image, quantizeThreshold) {
  var srcSize = 72;
  var dstSize = GRID_SIZE;

  var canvas = document.createElement('canvas');
  canvas.width = srcSize;
  canvas.height = srcSize;
  var ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, srcSize, srcSize);

  var imageData = ctx.getImageData(0, 0, srcSize, srcSize);
  var downsampled = downsample(imageData, srcSize, dstSize);
  var quantized = quantizeColors(downsampled.pixels, quantizeThreshold);

  return {
    board: quantized.assignments,
    palette: quantized.palette,
  };
}
