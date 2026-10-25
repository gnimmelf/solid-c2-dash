import type { ScatterplotLayerDefinition } from "./definition";

export type ScatterplotLayerUpdates = {
  opacity?: ScatterplotLayerDefinition["opacity"];
  radius?: {
    base?: number;
    byColumn?: ScatterplotLayerDefinition["radius"]["byColumn"];
  };
  fillColor?: ScatterplotLayerDefinition["fillColor"];
};

export function updateScatterplotDefinition(
  layer: ScatterplotLayerDefinition,
  updates: ScatterplotLayerUpdates,
) {
  if (updates.opacity !== undefined) layer.opacity = updates.opacity;
  if (updates.radius?.base !== undefined) {
    layer.radius.base = updates.radius.base;
  }
  if (updates.radius?.byColumn !== undefined) {
    layer.radius.byColumn = updates.radius.byColumn;
  }
  if (updates.fillColor !== undefined) layer.fillColor = updates.fillColor;
}