import { createEffect, createMemo, createSignal, onCleanup, onSettled } from "solid-js";
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
import { getTheme, THEME_CHANGE_EVENT } from "../../lib/theme";

type Detection = {
  coordinates: [number, number];
  intensity: number;
};

const detections: Detection[] = [
  { coordinates: [10.4852, 59.4294], intensity: 0.92 },
  { coordinates: [10.4864, 59.4299], intensity: 0.76 },
  { coordinates: [10.4843, 59.4288], intensity: 0.63 },
  { coordinates: [10.4871, 59.4290], intensity: 0.88 },
  { coordinates: [10.4858, 59.4282], intensity: 0.55 },
  { coordinates: [10.4839, 59.4297], intensity: 0.7 },
  { coordinates: [10.4880, 59.4304], intensity: 0.46 },
  { coordinates: [10.4848, 59.4306], intensity: 0.58 },
  { coordinates: [10.4868, 59.4284], intensity: 0.84 },
  { coordinates: [10.4829, 59.4292], intensity: 0.67 },
  { coordinates: [10.4877, 59.4280], intensity: 0.51 },
  { coordinates: [10.4835, 59.4303], intensity: 0.79 },
];

export default function MapView() {
  let mapElement: HTMLDivElement | undefined;

  const [localTheme, setLocalTheme] = createSignal(getTheme());

  const handleThemeChange = () => setLocalTheme(getTheme());
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  onCleanup(() => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange));

  const themedProps = createMemo(() => {
    const theme = localTheme();
    return {
      mapStyle:
        theme === "day" || theme === "bright"
          ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    };
  });

  let libreMap: MapLibreMap | undefined;

  createEffect(
    () => themedProps().mapStyle,
    (mapStyle) => {
      libreMap?.setStyle(mapStyle);
    },
  );

  onSettled(() => {
    if (!mapElement) return;

    setWorkerUrl(mapLibreWorkerUrl);

    const initialMapInstance = new MapLibreMap({
      container: mapElement,
      style: themedProps().mapStyle,
      center: [10.4851, 59.41565],
      zoom: 11,
      pitch: 42,
      bearing: -18,
      attributionControl: false,
    });
    libreMap = initialMapInstance;

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

    libreMap.addControl(overlay);
    libreMap.addControl(
      new NavigationControl({ showCompass: true }),
      "top-right",
    );
    libreMap.addControl(new AttributionControl({ compact: true }));

    return () => {
      initialMapInstance.remove();
      if (libreMap === initialMapInstance) libreMap = undefined;
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