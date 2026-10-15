import { createMemo, createSignal } from "solid-js";
import { ScatterplotLayer } from "@deck.gl/layers";
import "@oicl/openbridge-webcomponents/dist/components/button/button.js";
import styles from "./style.module.css";
import MapEngine from "./map-engine";

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
  { coordinates: [10.498293, 59.43007], intensity: 0.0 },
  { coordinates: [10.505344, 59.430985], intensity: 0.46 },
  { coordinates: [10.500307, 59.431462], intensity: 0.6 },
  { coordinates: [10.503812, 59.427663], intensity: 0.91 },
  { coordinates: [10.497144, 59.429117], intensity: 0.71 },
  { coordinates: [10.504832, 59.427309], intensity: 0.52 },
  { coordinates: [10.498217, 59.430916], intensity: 0.85 },
];

/**
 * Note that the `data` prop is referenced, so recreating a layer will reuse the
 * referenced `data` prop, both here and inside Deck.gl. The datasets are considered 
 * independent from the layers in deck.gl’s **declarative, immutable scene-graph philosophy**:
 * - Layer catalog
 * - Dataset repository
 */
function createDemoLayer(visible = true) {
  return new ScatterplotLayer<Detection>({
    id: "detection-points",
    visible,
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
  });
}

export default function MapView() {
  const [isDemoLayerShown, setIsDemoLayerShown] = createSignal(true);
  const layers = createMemo(() => [createDemoLayer(isDemoLayerShown())]);

  function toggleDemoLayer() {
    setIsDemoLayerShown((isShown) => !isShown);
  }

  return (
    <section class={styles.mapView}>
      <aside class={styles["layers-cataloge"]}>
        <obc-button onClick={toggleDemoLayer}>Toggle Demo Layer</obc-button>
      </aside>

      <div class={styles.mapFrame}>
        <MapEngine layers={layers()} />
      </div>
    </section>
  );
}
