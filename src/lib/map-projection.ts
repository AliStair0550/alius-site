// ============================================================
// Geographic projection utilities for Denmark
//
// Converts longitude/latitude coordinates to SVG x/y coordinates
// using a Mercator projection cropped to Denmark's bounding box.
// ============================================================

// Denmark's approximate bounds
const DENMARK_BOUNDS = {
  minLng: 8.0,
  maxLng: 15.2,
  minLat: 54.5,
  maxLat: 57.8,
};

export const MAP_VIEWBOX = {
  width: 800,
  height: 600,
};

/**
 * Project a [lng, lat] coordinate to SVG x/y using a Mercator projection.
 * Returns [x, y] in SVG coordinate space (0,0 = top-left).
 */
export function projectToSvg(lng: number, lat: number): [number, number] {
  const mercatorY = (lat: number) => {
    const radLat = (lat * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + radLat / 2));
  };

  const minX = DENMARK_BOUNDS.minLng;
  const maxX = DENMARK_BOUNDS.maxLng;
  const minY = mercatorY(DENMARK_BOUNDS.minLat);
  const maxY = mercatorY(DENMARK_BOUNDS.maxLat);

  const xRange = maxX - minX;
  const yRange = maxY - minY;

  const xScaleRatio = MAP_VIEWBOX.width / xRange;
  const yScaleRatio = MAP_VIEWBOX.height / yRange;
  const scale = Math.min(xScaleRatio, yScaleRatio) * 0.95;

  const offsetX = (MAP_VIEWBOX.width - xRange * scale) / 2;
  const offsetY = (MAP_VIEWBOX.height - yRange * scale) / 2;

  const x = offsetX + (lng - minX) * scale;
  const y = MAP_VIEWBOX.height - (offsetY + (mercatorY(lat) - minY) * scale);

  return [x, y];
}

/**
 * Convert a GeoJSON Polygon or MultiPolygon geometry to an SVG path string.
 */
export function geometryToSvgPath(geometry: {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinates: any;
}): string {
  if (geometry.type === "Polygon") {
    return polygonToPath(geometry.coordinates as number[][][]);
  } else if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][])
      .map((polygon) => polygonToPath(polygon))
      .join(" ");
  }
  return "";
}

function polygonToPath(polygon: number[][][]): string {
  return polygon
    .map((ring) => {
      const points = ring.map(([lng, lat]) => projectToSvg(lng, lat));
      const [firstX, firstY] = points[0];
      const pathParts = [`M ${firstX.toFixed(2)} ${firstY.toFixed(2)}`];
      for (let i = 1; i < points.length; i++) {
        pathParts.push(`L ${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)}`);
      }
      pathParts.push("Z");
      return pathParts.join(" ");
    })
    .join(" ");
}

/**
 * Color scale for unemployment data.
 * Maps a value to a moss-green hex color from light to dark.
 */
export function getColorForValue(
  value: number | null,
  min: number,
  max: number
): string {
  if (value === null) return "#E9E4D8";

  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const stops = [
    { t: 0.0, color: [241, 237, 226] },
    { t: 0.3, color: [200, 215, 200] },
    { t: 0.6, color: [140, 175, 150] },
    { t: 1.0, color: [45, 95, 74] },
  ];

  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const localT = upper.t === lower.t ? 0 : (t - lower.t) / (upper.t - lower.t);
  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * localT);
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * localT);
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * localT);

  return `rgb(${r},${g},${b})`;
}
