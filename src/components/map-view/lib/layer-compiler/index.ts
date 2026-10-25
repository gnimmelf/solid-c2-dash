import type { Layer } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import type {
  DatasetLookup,
  DatasetRow,
} from "../lib/dataset-repository";
import type {
  LayerDefinition,
  ScatterplotLayerDefinition,
} from "../layer-catalog";

function numericColumn(row: DatasetRow, column: string) {
  const value = row[column];
  return typeof value === "number" ? value : 0;
}

function compileScatterplotLayer(
  definition: ScatterplotLayerDefinition,
  datasets: DatasetLookup,
) {
  const dataset = datasets[definition.datasetId];
  const data =
    dataset?.status === "ready" && dataset.data?.kind === "rows"
      ? dataset.data.rows
      : [];
  const radius = definition.radius;
  const radiusByColumn = radius.byColumn;

  return new ScatterplotLayer<DatasetRow>({
    id: definition.id,
    visible: definition.visible,
    opacity: definition.opacity,
    data,
    getPosition: (row) => [
      numericColumn(row, definition.position.longitudeColumn),
      numericColumn(row, definition.position.latitudeColumn),
    ],
    getRadius: radiusByColumn
      ? (row) =>
          radius.base +
        numericColumn(row, radiusByColumn.column) * radiusByColumn.scale
      : radius.base,
    getFillColor: [...definition.fillColor],
    getLineColor: [255, 255, 255, 220],
    getLineWidth: 1.5,
    lineWidthMinPixels: 1,
    radiusMinPixels: 5,
    radiusMaxPixels: 22,
    pickable: true,
  });
}

export function compileLayers(
  definitions: readonly LayerDefinition[],
  datasets: DatasetLookup,
): Layer[] {
  return definitions.map((definition) => {
    switch (definition.type) {
      case "scatterplot":
        return compileScatterplotLayer(definition, datasets);
    }
  });
}