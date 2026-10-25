import type { BaseLayerDefinition } from "./base-types";
import type { ScatterplotLayerDefinition } from "../../layers/scatterplot/definition";

export type LayerDefinition = ScatterplotLayerDefinition;

export type CatalogState = {
  layers: LayerDefinition[];
  selectedLayerId?: string;
};

export type { BaseLayerDefinition };