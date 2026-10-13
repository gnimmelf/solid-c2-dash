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
  { coordinates: [10.499587, 59.429763], intensity: 1.0 },
  { coordinates: [10.503477, 59.430613], intensity: 0.81 },
  { coordinates: [10.498948, 59.428223], intensity: 0.66 },
  { coordinates: [10.504738, 59.428661], intensity: 0.95 },
  { coordinates: [10.502014, 59.427308], intensity: 0.56 },
  { coordinates: [10.498293, 59.430070], intensity: 0.0 },
  { coordinates: [10.505344, 59.430985], intensity: 0.46 },
  { coordinates: [10.500307, 59.431462], intensity: 0.6 },
  { coordinates: [10.503812, 59.427663], intensity: 0.91 },
  { coordinates: [10.497144, 59.429117], intensity: 0.71 },
  { coordinates: [10.504832, 59.427309], intensity: 0.52 },
  { coordinates: [10.498217, 59.430916], intensity: 0.85 },
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
      center: [10.49, 59.425],
      zoom: 14,
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