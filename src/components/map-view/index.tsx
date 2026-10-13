import { onSettled } from "solid-js";
import { ScatterplotLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./style.module.css";

type Detection = {
  coordinates: [number, number];
  intensity: number;
};

const detections: Detection[] = [
  { coordinates: [-122.42, 37.81], intensity: 0.92 },
  { coordinates: [-122.39, 37.79], intensity: 0.76 },
  { coordinates: [-122.45, 37.78], intensity: 0.63 },
  { coordinates: [-122.4, 37.76], intensity: 0.88 },
  { coordinates: [-122.37, 37.77], intensity: 0.55 },
  { coordinates: [-122.43, 37.74], intensity: 0.7 },
  { coordinates: [-122.35, 37.8], intensity: 0.46 },
  { coordinates: [-122.47, 37.82], intensity: 0.58 },
  { coordinates: [-122.32, 37.78], intensity: 0.84 },
  { coordinates: [-122.38, 37.72], intensity: 0.67 },
  { coordinates: [-122.29, 37.75], intensity: 0.51 },
  { coordinates: [-122.33, 37.71], intensity: 0.79 },
];

export default function MapView() {
  let mapElement: HTMLDivElement | undefined;

  onSettled(() => {
    if (!mapElement) return;

    setWorkerUrl(mapLibreWorkerUrl);

    const map = new MapLibreMap({
      container: mapElement,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-122.39, 37.77],
      zoom: 11,
      pitch: 42,
      bearing: -18,
      attributionControl: false,
    });

    const overlay = new MapboxOverlay({
      layers: [
        new ScatterplotLayer<Detection>({
          id: "detection-points",
          data: detections,
          getPosition: (detection) => detection.coordinates,
          getRadius: (detection) => 90 + detection.intensity * 180,
          getFillColor: (detection) => [
            242,
            Math.round(102 + detection.intensity * 108),
            67,
            190,
          ],
          getLineColor: [255, 255, 255, 220],
          getLineWidth: 1.5,
          lineWidthMinPixels: 1,
          radiusMinPixels: 5,
          radiusMaxPixels: 22,
          pickable: true,
        }),
      ],
    });

    map.addControl(overlay);
    map.addControl(
      new NavigationControl({ showCompass: true }),
      "top-right",
    );
    map.addControl(new AttributionControl({ compact: true }));

    return () => {
      map.remove();
    };
  });

  return (
    <section class={styles.mapView}>
      <div class={styles.mapFrame}>
        <div
          class={styles.map}
          ref={(element) => { mapElement = element; }}
        />
      </div>
    </section>
  );
}