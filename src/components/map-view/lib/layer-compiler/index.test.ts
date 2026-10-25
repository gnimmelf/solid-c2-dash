import {
  ScatterplotLayer,
  type ScatterplotLayerProps,
} from "@deck.gl/layers";
import { describe, expect, it } from "vitest";
import type { DatasetLookup, DatasetRow } from "../lib/dataset-repository";
import type { ScatterplotLayerDefinition } from "../layer-catalog";
import { compileLayers } from ".";

function definition(
  id: string,
  overrides: Partial<ScatterplotLayerDefinition> = {},
): ScatterplotLayerDefinition {
  return {
    id,
    name: `Layer ${id}`,
    datasetId: `dataset-${id}`,
    type: "scatterplot",
    visible: true,
    opacity: 0.75,
    position: {
      longitudeColumn: "longitude",
      latitudeColumn: "latitude",
    },
    radius: { base: 90 },
    fillColor: [242, 102, 67, 190],
    ...overrides,
  };
}

function readyDataset(id: string, rows: readonly DatasetRow[]): DatasetLookup {
  return {
    [id]: {
      id,
      status: "ready",
      data: { kind: "rows", rows },
    },
  };
}

describe("compileLayers", () => {
  it("creates ordered scatterplot layers with stable catalog props", () => {
    const layers = compileLayers(
      [definition("one"), definition("two", { visible: false })],
      {},
    );

    expect(layers).toHaveLength(2);
    expect(layers[0]).toBeInstanceOf(ScatterplotLayer);
    expect(layers.map(({ id }) => id)).toEqual(["one", "two"]);
    expect(layers[0].props).toMatchObject({
      id: "one",
      visible: true,
      opacity: 0.75,
      data: [],
      getRadius: 90,
      getFillColor: [242, 102, 67, 190],
    });
    expect(layers[1].props.visible).toBe(false);
  });

  it("resolves ready rows and maps configured position columns", () => {
    const row = { lon: 10.5, lat: 59.4 };
    const [compiledLayer] = compileLayers(
      [
        definition("points", {
          position: { longitudeColumn: "lon", latitudeColumn: "lat" },
        }),
      ],
      readyDataset("dataset-points", [row]),
    );
    const props = compiledLayer.props as ScatterplotLayerProps<DatasetRow>;
    const getPosition = props.getPosition;
    if (typeof getPosition !== "function") {
      throw new TypeError("Expected getPosition to be an accessor function.");
    }

    expect(props.data).toEqual([row]);
    expect(getPosition(row, { index: 0, data: [row], target: [] })).toEqual([
      10.5,
      59.4,
    ]);
  });

  it("applies optional radius modulation with numeric fallback", () => {
    const [compiledLayer] = compileLayers(
      [
        definition("points", {
          radius: {
            base: 90,
            byColumn: { column: "intensity", scale: 180 },
          },
        }),
      ],
      {},
    );
    const props = compiledLayer.props as ScatterplotLayerProps<DatasetRow>;
    const getRadius = props.getRadius;
    if (typeof getRadius !== "function") {
      throw new TypeError("Expected getRadius to be an accessor function.");
    }

    expect(getRadius({ intensity: 0.5 }, {} as never)).toBe(180);
    expect(getRadius({ intensity: "high" }, {} as never)).toBe(90);
    expect(getRadius({}, {} as never)).toBe(90);
  });

  it.each(["idle", "loading", "error"] as const)(
    "uses empty data for a %s dataset",
    (status) => {
      const [layer] = compileLayers([definition("points")], {
        "dataset-points": { id: "dataset-points", status },
      });

      expect(layer.props.data).toEqual([]);
    },
  );

  it("falls back to zero for missing or non-numeric positions", () => {
    const [compiledLayer] = compileLayers([definition("points")], {});
    const props = compiledLayer.props as ScatterplotLayerProps<DatasetRow>;
    const getPosition = props.getPosition;
    if (typeof getPosition !== "function") {
      throw new TypeError("Expected getPosition to be an accessor function.");
    }

    expect(getPosition({ longitude: "10", latitude: null }, {} as never)).toEqual([
      0,
      0,
    ]);
  });
});