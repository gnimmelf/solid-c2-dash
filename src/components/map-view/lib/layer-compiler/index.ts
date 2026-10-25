import type { Layer } from "@deck.gl/core";
import type { DatasetLookup } from "../dataset-repository/index";
import type { LayerDefinition } from "../layer-catalog";
import { compileScatterplotLayer } from "../../layers/scatterplot/compiler";

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