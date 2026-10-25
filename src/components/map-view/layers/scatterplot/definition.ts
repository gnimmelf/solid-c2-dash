import type { BaseLayerDefinition } from "../../lib/layer-catalog/base-types";

export type ScatterplotLayerDefinition = BaseLayerDefinition & {
  type: "scatterplot";
  position: {
    longitudeColumn: string;
    latitudeColumn: string;
  };
  radius: {
    base: number;
    byColumn?: {
      column: string;
      scale: number;
    };
  };
  fillColor: readonly [number, number, number, number];
};

export type ScatterplotLayerIdentity = Pick<
  ScatterplotLayerDefinition,
  "id" | "name" | "datasetId"
>;

export function createScatterplotLayerDefinition(
  identity: ScatterplotLayerIdentity,
): ScatterplotLayerDefinition {
  return {
    ...identity,
    type: "scatterplot",
    visible: true,
    opacity: 1,
    position: {
      longitudeColumn: "longitude",
      latitudeColumn: "latitude",
    },
    radius: { base: 4 },
    fillColor: [242, 102, 67, 190],
  };
}