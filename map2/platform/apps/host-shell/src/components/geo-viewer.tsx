'use client';

/**
 * Geospatial viewer (SRS §7) — MapLibre GL JS 5 base map + deck.gl 9
 * overlay via `MapboxOverlay`.
 *
 *  - Raster outputs (ORTHOMOSAIC / DSM / SPECTRAL_INDEX / …) render as
 *    `BitmapLayer`s using the server-side WGS84 preview PNG stored on
 *    `processing_outputs.statistics`.
 *
 *  - LAZ point clouds are decoded client-side via `@loaders.gl/las`
 *    (WebAssembly), reprojected from native UTM to WGS84 lon/lat with
 *    `proj4`, and drawn as a deck.gl `PointCloudLayer`. The UTM zone is
 *    inferred from the first available WGS84 raster preview's bbox
 *    centre — the orthomosaic and the point cloud of the same survey are
 *    always in matching footprints, so this is reliable.
 */
import type { Layer } from '@deck.gl/core';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import { BitmapLayer, GeoJsonLayer, PointCloudLayer } from '@deck.gl/layers';
import { MapboxOverlay } from '@deck.gl/mapbox';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapView,
  useControl,
  useMap,
} from 'react-map-gl/maplibre';
import { toast } from 'sonner';
import type {
  GeoJSONPolygon,
  ProcessingOutput,
} from '@platform/shared-types';

const RENDERABLE_RASTER_TYPES = new Set([
  'ORTHOMOSAIC',
  'DSM',
  'DTM',
  'SPECTRAL_INDEX',
  'CHANGE_LAYER',
  'THERMAL_MAP',
  'LAND_COVER',
]);

const OUTPUT_TYPE_LABEL: Record<string, string> = {
  ORTHOMOSAIC: 'Orthomosaic',
  DSM: 'Digital Surface Model',
  DTM: 'Digital Terrain Model',
  POINT_CLOUD: 'Point Cloud',
  MESH_3D: '3D Mesh',
  CONTOURS: 'Contour Lines',
  VOLUME_REPORT: 'Volume Report',
  SPECTRAL_INDEX: 'Spectral Index',
  CHANGE_LAYER: 'Change Layer',
  ML_DETECTION: 'Object Detection',
  LAND_COVER: 'Land Cover',
  THERMAL_MAP: 'Thermal Map',
};

const BASE_STYLES = {
  osm: {
    label: 'OpenStreetMap',
    style: 'https://tiles.openfreemap.org/styles/positron',
  },
  terrain: {
    label: 'Terrain',
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
  blank: {
    label: 'Blank',
    style: {
      version: 8,
      sources: {},
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#0f172a' } },
      ],
    } as StyleSpecification,
  },
} as const;

type BaseStyleKey = keyof typeof BASE_STYLES;

interface Props {
  project: {
    id: string;
    name: string;
    regionOfInterest: GeoJSONPolygon | null;
  };
  outputs: ProcessingOutput[];
}

interface PreviewInfo {
  url: string;
  bbox: [number, number, number, number]; // WGS84 [west, south, east, north]
}

interface PointCloudData {
  positions: Float32Array; // [lng, lat, elev, …]
  colors: Uint8Array; // [r, g, b, …]
  count: number;
  bbox: [number, number, number, number];
}

function DeckGLOverlay(props: { layers: Layer[] }): React.ReactElement | null {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true, ...props }));
  overlay.setProps(props);
  return null;
}

function FitToBounds({
  bounds,
  pitch,
}: {
  bounds: [number, number, number, number] | null;
  pitch: number;
}): null {
  const { current } = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    const map = current?.getMap();
    if (!map || !bounds || fittedRef.current) return;
    fittedRef.current = true;
    try {
      map.fitBounds(
        [
          [bounds[0], bounds[1]],
          [bounds[2], bounds[3]],
        ],
        { padding: 40, animate: true, duration: 800, maxZoom: 19, pitch },
      );
    } catch {
      // ignore
    }
  }, [current, bounds, pitch]);
  return null;
}

/** Animates the camera pitch as the point-cloud visibility changes — tilts
 *  to ~45° when a cloud comes on, eases back to flat when it goes off. */
function CameraPitchSync({ hasPointCloud }: { hasPointCloud: boolean }): null {
  const { current } = useMap();
  const lastRef = useRef<boolean | null>(null);
  useEffect(() => {
    const map = current?.getMap();
    if (!map) return;
    const previous = lastRef.current;
    lastRef.current = hasPointCloud;
    if (previous === null) return; // initial render handled by FitToBounds
    if (hasPointCloud && map.getPitch() < 10) {
      map.easeTo({ pitch: 45, duration: 600 });
    } else if (!hasPointCloud && map.getPitch() > 5) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  }, [current, hasPointCloud]);
  return null;
}

/** UTM zone from longitude; northern/southern hemisphere from latitude. */
function utmZoneDef(lng: number, lat: number): string {
  const zone = Math.floor((lng + 180) / 6) + 1;
  const south = lat < 0 ? ' +south' : '';
  return `+proj=utm +zone=${zone}${south} +datum=WGS84 +units=m +no_defs`;
}

export function GeoViewer({ project, outputs }: Props): React.ReactElement {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () =>
      new Set(
        outputs
          .filter((o) => RENDERABLE_RASTER_TYPES.has(o.type) || o.type === 'POINT_CLOUD')
          .map((o) => o.id),
      ),
  );
  const [opacity, setOpacity] = useState(85);
  const [pointSize, setPointSize] = useState(2);
  const [baseStyle, setBaseStyle] = useState<BaseStyleKey>('osm');
  const [previews, setPreviews] = useState<globalThis.Map<string, PreviewInfo>>(
    () => new globalThis.Map(),
  );
  const [pointClouds, setPointClouds] = useState<globalThis.Map<string, PointCloudData>>(
    () => new globalThis.Map(),
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [missingPreviews, setMissingPreviews] = useState<Set<string>>(new Set());

  // --- Lazy raster preview fetcher --------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function loadRaster(output: ProcessingOutput): Promise<void> {
      setLoadingIds((p) => new Set(p).add(output.id));
      try {
        const res = await fetch(`/api/proxy/outputs/${output.id}/preview-url`);
        if (res.status === 404) {
          if (!cancelled) setMissingPreviews((p) => new Set(p).add(output.id));
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PreviewInfo;
        if (cancelled) return;
        setPreviews((p) => {
          const next = new globalThis.Map(p);
          next.set(output.id, data);
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(`Could not load ${OUTPUT_TYPE_LABEL[output.type] ?? output.type}`, {
            description: error instanceof Error ? error.message : '',
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingIds((p) => {
            const next = new Set(p);
            next.delete(output.id);
            return next;
          });
        }
      }
    }
    for (const output of outputs) {
      if (
        visibleIds.has(output.id) &&
        RENDERABLE_RASTER_TYPES.has(output.type) &&
        !previews.has(output.id) &&
        !loadingIds.has(output.id) &&
        !missingPreviews.has(output.id)
      ) {
        void loadRaster(output);
      }
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, outputs]);

  // --- Lazy LAZ decoder + reprojector -----------------------------------
  useEffect(() => {
    let cancelled = false;

    /** First available raster preview's centre — used for UTM zone discovery. */
    function refLngLat(): [number, number] | null {
      for (const info of previews.values()) {
        return [(info.bbox[0] + info.bbox[2]) / 2, (info.bbox[1] + info.bbox[3]) / 2];
      }
      const roi = project.regionOfInterest;
      if (roi) {
        const coords = roi.coordinates[0] ?? [];
        if (coords.length > 0) {
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          return [
            (Math.min(...lngs) + Math.max(...lngs)) / 2,
            (Math.min(...lats) + Math.max(...lats)) / 2,
          ];
        }
      }
      return null;
    }

    async function loadPointCloud(output: ProcessingOutput): Promise<void> {
      setLoadingIds((p) => new Set(p).add(output.id));
      try {
        const dlRes = await fetch(`/api/proxy/outputs/${output.id}/download`);
        if (!dlRes.ok) throw new Error(`download URL HTTP ${dlRes.status}`);
        const { url } = (await dlRes.json()) as { url: string };

        const [{ load }, { LASLoader }, proj4Module] = await Promise.all([
          import('@loaders.gl/core'),
          import('@loaders.gl/las'),
          import('proj4'),
        ]);
        const proj4 = proj4Module.default;

        const data = (await load(url, LASLoader, {
          las: { shape: 'mesh', fp64: true },
        })) as unknown as {
          attributes: {
            POSITION: { value: Float64Array | Float32Array; size: number };
            COLOR_0?: { value: Uint8Array; size: number };
          };
          header?: { vertexCount: number };
        };
        if (cancelled) return;

        const rawPositions = data.attributes.POSITION.value;
        const rawColors = data.attributes.COLOR_0?.value;
        const numPoints = rawPositions.length / 3;
        const sampleX = rawPositions[0];
        const sampleY = rawPositions[1];
        const isWgs84 = Math.abs(sampleX) <= 180 && Math.abs(sampleY) <= 90;

        let outPositions: Float32Array;
        let minLng = Infinity, maxLng = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;

        if (isWgs84) {
          outPositions = new Float32Array(rawPositions.length);
          for (let i = 0; i < numPoints; i++) {
            const lng = rawPositions[i * 3];
            const lat = rawPositions[i * 3 + 1];
            outPositions[i * 3] = lng;
            outPositions[i * 3 + 1] = lat;
            outPositions[i * 3 + 2] = rawPositions[i * 3 + 2];
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        } else {
          const ref = refLngLat();
          if (!ref) {
            throw new Error(
              'Point cloud is in a projected CRS (UTM/local); a raster output or ROI is required to infer the source zone.',
            );
          }
          const srcDef = utmZoneDef(ref[0], ref[1]);
          outPositions = new Float32Array(rawPositions.length);
          for (let i = 0; i < numPoints; i++) {
            const x = rawPositions[i * 3];
            const y = rawPositions[i * 3 + 1];
            const z = rawPositions[i * 3 + 2];
            const [lng, lat] = proj4(srcDef, 'EPSG:4326', [x, y]);
            outPositions[i * 3] = lng;
            outPositions[i * 3 + 1] = lat;
            outPositions[i * 3 + 2] = z;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          }
        }

        // Coerce colour buffer to RGB (3 bytes per point).
        let outColors: Uint8Array;
        if (rawColors && rawColors.length === numPoints * 4) {
          outColors = new Uint8Array(numPoints * 3);
          for (let i = 0; i < numPoints; i++) {
            outColors[i * 3] = rawColors[i * 4];
            outColors[i * 3 + 1] = rawColors[i * 4 + 1];
            outColors[i * 3 + 2] = rawColors[i * 4 + 2];
          }
        } else if (rawColors && rawColors.length === numPoints * 3) {
          outColors = rawColors;
        } else {
          outColors = new Uint8Array(numPoints * 3).fill(180);
        }

        if (cancelled) return;
        setPointClouds((p) => {
          const next = new globalThis.Map(p);
          next.set(output.id, {
            positions: outPositions,
            colors: outColors,
            count: numPoints,
            bbox: [minLng, minLat, maxLng, maxLat],
          });
          return next;
        });
        toast.success(`Point cloud loaded`, {
          description: `${numPoints.toLocaleString()} points · ready to navigate`,
        });
      } catch (error) {
        if (!cancelled) {
          toast.error('Could not load point cloud', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingIds((p) => {
            const next = new Set(p);
            next.delete(output.id);
            return next;
          });
        }
      }
    }

    for (const output of outputs) {
      if (
        visibleIds.has(output.id) &&
        output.type === 'POINT_CLOUD' &&
        !pointClouds.has(output.id) &&
        !loadingIds.has(output.id)
      ) {
        void loadPointCloud(output);
      }
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds, outputs, previews]);

  const initialView = useMemo(() => {
    if (project.regionOfInterest) {
      const coords = project.regionOfInterest.coordinates[0] ?? [];
      if (coords.length > 0) {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        return {
          longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
          zoom: 14,
        };
      }
    }
    return { longitude: 0, latitude: 20, zoom: 1.5 };
  }, [project.regionOfInterest]);

  const deckLayers = useMemo<Layer[]>(() => {
    const result: Layer[] = [];
    if (project.regionOfInterest) {
      const roiFeature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: project.regionOfInterest.coordinates.map((ring) =>
            ring.map((position) => [...position]),
          ),
        },
        properties: {},
      };
      result.push(
        new GeoJsonLayer({
          id: 'project-roi',
          data: roiFeature as never,
          stroked: true,
          filled: false,
          lineWidthMinPixels: 2,
          getLineColor: [99, 102, 241, 200],
        }),
      );
    }
    // Raster previews
    for (const output of outputs) {
      if (!visibleIds.has(output.id)) continue;
      const info = previews.get(output.id);
      if (!info) continue;
      result.push(
        new BitmapLayer({
          id: `bitmap-${output.id}`,
          image: info.url,
          bounds: info.bbox,
          opacity: opacity / 100,
          pickable: false,
        }),
      );
    }
    // Point clouds
    for (const output of outputs) {
      if (output.type !== 'POINT_CLOUD' || !visibleIds.has(output.id)) continue;
      const pc = pointClouds.get(output.id);
      if (!pc) continue;
      result.push(
        new PointCloudLayer({
          id: `pc-${output.id}`,
          data: {
            length: pc.count,
            attributes: {
              getPosition: { value: pc.positions, size: 3 },
              getColor: { value: pc.colors, size: 3 },
            },
          },
          pointSize,
          coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
          opacity: 1,
          pickable: false,
        }),
      );
    }
    return result;
  }, [project.regionOfInterest, outputs, previews, pointClouds, visibleIds, opacity, pointSize]);

  function toggleOutput(id: string): void {
    setVisibleIds((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // First available bbox drives the auto-fit.
  const firstBounds = useMemo<[number, number, number, number] | null>(() => {
    for (const id of visibleIds) {
      const r = previews.get(id);
      if (r) return r.bbox;
      const pc = pointClouds.get(id);
      if (pc) return pc.bbox;
    }
    return null;
  }, [previews, pointClouds, visibleIds]);

  const hasPointCloud = outputs.some((o) => o.type === 'POINT_CLOUD' && visibleIds.has(o.id));
  const rasterVisibleCount = outputs.filter(
    (o) => RENDERABLE_RASTER_TYPES.has(o.type) && visibleIds.has(o.id) && previews.has(o.id),
  ).length;
  const pointCloudVisibleCount = outputs.filter(
    (o) => o.type === 'POINT_CLOUD' && visibleIds.has(o.id) && pointClouds.has(o.id),
  ).length;
  const totalPoints = Array.from(pointClouds.values()).reduce(
    (sum, pc) => sum + pc.count,
    0,
  );

  return (
    <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-lg border border-slate-200 bg-white">
      <aside className="w-72 overflow-y-auto border-r border-slate-200 p-4 space-y-5">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Base map</h3>
          <select
            value={baseStyle}
            onChange={(event) => setBaseStyle(event.target.value as BaseStyleKey)}
            className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            {(Object.entries(BASE_STYLES) as [BaseStyleKey, { label: string }][]).map(
              ([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Raster opacity
            </h3>
            <span className="text-xs text-slate-500">{opacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </div>

        {hasPointCloud && (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Point size
              </h3>
              <span className="text-xs text-slate-500">{pointSize}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={pointSize}
              onChange={(event) => setPointSize(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Layers ({outputs.length})
          </h3>
          {outputs.length === 0 ? (
            <div className="mt-2 rounded border border-dashed border-slate-300 p-3 text-xs text-slate-500">
              No outputs yet.
            </div>
          ) : (
            <ul className="mt-2 space-y-1">
              {outputs.map((output) => {
                const isRaster = RENDERABLE_RASTER_TYPES.has(output.type);
                const isCloud = output.type === 'POINT_CLOUD';
                const isRenderable = isRaster || isCloud;
                const visible = visibleIds.has(output.id);
                const loading = loadingIds.has(output.id);
                const missing = missingPreviews.has(output.id) && isRaster;
                const loaded = (isRaster && previews.has(output.id)) || (isCloud && pointClouds.has(output.id));
                let hint: string = output.format;
                if (!isRenderable) hint += ' · download only';
                else if (missing) hint += ' · preview not yet generated';
                else if (loading && visible) hint += isCloud ? ' · decoding LAZ…' : ' · loading…';
                else if (isCloud && loaded) {
                  const c = pointClouds.get(output.id)!.count;
                  hint += ` · ${c.toLocaleString()} pts`;
                }
                return (
                  <li key={output.id}>
                    <label className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleOutput(output.id)}
                        disabled={!isRenderable || missing}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {OUTPUT_TYPE_LABEL[output.type] ?? output.type}
                        </div>
                        <div className="text-[10px] text-slate-500">{hint}</div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {rasterVisibleCount > 0 && (
          <div className="rounded bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            {rasterVisibleCount} raster layer{rasterVisibleCount === 1 ? '' : 's'} rendered.
          </div>
        )}
        {pointCloudVisibleCount > 0 && (
          <div className="rounded bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-800">
            {pointCloudVisibleCount} point cloud{pointCloudVisibleCount === 1 ? '' : 's'} · {totalPoints.toLocaleString()} points.
            <br />
            <span className="text-[10px] opacity-80">
              Right-click + drag to tilt the camera for 3D.
            </span>
          </div>
        )}
      </aside>

      <div className="flex-1 relative">
        <MapView
          mapLib={maplibregl}
          initialViewState={initialView}
          mapStyle={BASE_STYLES[baseStyle].style as never}
          style={{ width: '100%', height: '100%' }}
          attributionControl={{ compact: true }}
          maxPitch={75}
        >
          <FitToBounds bounds={firstBounds} pitch={hasPointCloud ? 45 : 0} />
          <CameraPitchSync hasPointCloud={hasPointCloud} />
          <DeckGLOverlay layers={deckLayers} />
        </MapView>
      </div>
    </div>
  );
}
