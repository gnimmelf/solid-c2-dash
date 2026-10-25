import { ScatterplotLayer } from "@deck.gl/layers";
import type {
  DatasetLookup,
  DatasetRow,
} from "../../lib/dataset-repository";
import type { ScatterplotLayerDefinition } from "./definition";

function numericColumn(row: DatasetRow, column: string) {
  const value = row[column];
  return typeof value === "number" ? value : 0;
}

export function compileScatterplotLayer(
  definition: ScatterplotLayerDefinition,
  datasets: DatasetLookup,
) {
  const dataset = datasets[definition.datasetId];
  const data =
    dataset?.status === "ready" && dataset.data?.kind === "rows"
      ? dataset.data.rows
      : [];
  const baseRadius = definition.radius.base;
  const radiusByColumn = definition.radius.byColumn;
  const radiusColumn = radiusByColumn?.column;
  const radiusScale = radiusByColumn?.scale;

  return new ScatterplotLayer<DatasetRow>({
    id: definition.id,
    visible: definition.visible,
    opacity: definition.opacity,
    data,
    getPosition: (row) => [
      numericColumn(row, definition.position.longitudeColumn),
      numericColumn(row, definition.position.latitudeColumn),
    ],
    getRadius: radiusColumn !== undefined && radiusScale !== undefined
      ? (row) =>
          baseRadius + numericColumn(row, radiusColumn!) * radiusScale!
      : baseRadius,
    updateTriggers: {
      getRadius: [baseRadius, radiusColumn, radiusScale],
    },
    radiusUnits: "pixels",
    getFillColor: [...definition.fillColor],
    getLineColor: [255, 255, 255, 220],
    getLineWidth: 1.5,
    lineWidthMinPixels: 1,
    radiusMinPixels: 0,
    radiusMaxPixels: 50,
    pickable: true,
  });
}