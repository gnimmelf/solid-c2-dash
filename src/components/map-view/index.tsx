import { createMemo, onCleanup } from "solid-js";
import {
  createDatasetRepository,
  type DatasetRow,
} from "./lib/dataset-repository";
import { createLayerCatalog, type CatalogState } from "./lib/layer-catalog";
import LayerCatalogPanel from "./components/layer-catalog-panel";
import { compileLayers } from "./lib/layer-compiler";
import { createScatterplotLayerDefinition } from "./layers/scatterplot";
import styles from "./style.module.css";
import MapEngine from "./components/map-engine";

const detections: DatasetRow[] = [
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
      ...createScatterplotLayerDefinition({
        id: "detection-points",
        name: "Detection points",
        datasetId: "demo-detections",
      }),
      radius: {
        base: 4,
        byColumn: { column: "intensity", scale: 10 },
      },
    },
  ],
};

export default function MapView() {
  const [catalog, catalogActions] = createLayerCatalog(initialCatalogState);
  const [repository, datasetActions] = createDatasetRepository([
    { id: "demo-detections", rows: detections },
  ]);
  onCleanup(datasetActions.dispose);

  const layers = createMemo(() =>
    compileLayers(catalog.layers, repository.datasets),
  );

  return (
    <section class={styles.mapView}>
      <aside class={styles.layerCatalog}>
        <LayerCatalogPanel catalog={catalog} actions={catalogActions} />
      </aside>

      <div class={styles.mapFrame}>
        <MapEngine layers={layers()} />
      </div>
    </section>
  );
}
