import { createMemo } from "solid-js";
import { ScatterplotLayer } from "@deck.gl/layers";
import "@oicl/openbridge-webcomponents/dist/components/button/button.js";
import {
  createLayerCatalog,
  type CatalogState,
  type ScatterplotLayerDefinition,
} from "./layer-catalog";
import styles from "./style.module.css";
import MapEngine from "./map-engine";

type Detection = Record<string, number> & {
  longitude: number;
  latitude: number;
  intensity: number;
};

const detections: Detection[] = [
  { longitude: 10.499587, latitude: 59.429763, intensity: 1.0 },
  { longitude: 10.503477, latitude: 59.430613, intensity: 0.81 },
  { longitude: 10.498948, latitude: 59.428223, intensity: 0.66 },
  { longitude: 10.504738, latitude: 59.428661, intensity: 0.95 },
  { longitude: 10.502014, latitude: 59.427308, intensity: 0.56 },
  { longitude: 10.498293, latitude: 59.43007, intensity: 0.0 },
  { longitude: 10.505344, latitude: 59.430985, intensity: 0.46 },
  { longitude: 10.500307, latitude: 59.431462, intensity: 0.6 },
  { longitude: 10.503812, latitude: 59.427663, intensity: 0.91 },
  { longitude: 10.497144, latitude: 59.429117, intensity: 0.71 },
  { longitude: 10.504832, latitude: 59.427309, intensity: 0.52 },
  { longitude: 10.498217, latitude: 59.430916, intensity: 0.85 },
];

const initialCatalogState: CatalogState = {
  layers: [
    {
      id: "detection-points",
      name: "Detection points",
      datasetId: "demo-detections",
      type: "scatterplot",
      visible: true,
      opacity: 1,
      position: {
        longitudeColumn: "longitude",
        latitudeColumn: "latitude",
      },
      radius: 90,
      fillColor: [242, 102, 67, 190],
    },
  ],
};

function createDemoLayer(definition: ScatterplotLayerDefinition) {
  const [red, green, blue, alpha] = definition.fillColor;
  return new ScatterplotLayer<Detection>({
    id: definition.id,
    visible: definition.visible,
    opacity: definition.opacity,
    data: detections,
    getPosition: (detection) => [
      detection[definition.position.longitudeColumn],
      detection[definition.position.latitudeColumn],
    ],
    getRadius: (detection) => definition.radius + detection.intensity * 180,
    getFillColor: (detection) => [
      red,
      Math.round(green + detection.intensity * 108),
      blue,
      alpha,
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
  const [catalog, catalogActions] = createLayerCatalog(initialCatalogState);
  const layers = createMemo(() => catalog.layers.map(createDemoLayer));

  function toggleDemoLayer() {
    catalogActions.toggleVisibility("detection-points");
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
