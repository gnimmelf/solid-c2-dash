import { createStore, untrack, type Store } from "solid-js";
import {
  updateScatterplotDefinition,
  type ScatterplotLayerUpdates,
} from "../../layers/scatterplot/catalog";
import type { LayerDefinition } from "../../layers/scatterplot/definition";
import type { CatalogState } from "./types";
export type {
  BaseLayerDefinition,
  CatalogState,
  LayerDefinition,
} from "./types";
export type { ScatterplotLayerDefinition } from "../../layers/scatterplot/definition";

export type LayerCatalogActions = {
  addLayer: (layer: LayerDefinition) => void;
  removeLayer: (id: string) => void;
  toggleVisibility: (id: string) => void;
  moveLayer: (id: string, toIndex: number) => void;
  selectLayer: (id?: string) => void;
  updateScatterplot: (id: string, updates: ScatterplotLayerUpdates) => void;
};

export function createLayerCatalog(
  initialState: CatalogState = { layers: [] },
): [Store<CatalogState>, LayerCatalogActions] {
  const selectedLayerId = initialState.layers.some(
    (layer) => layer.id === initialState.selectedLayerId,
  )
    ? initialState.selectedLayerId
    : undefined;
  const [catalog, setCatalog] = createStore<CatalogState>({
    layers: [...initialState.layers],
    selectedLayerId,
  });

  const actions: LayerCatalogActions = {
    addLayer(layer) {
      const duplicate = untrack(() =>
        catalog.layers.some((candidate) => candidate.id === layer.id),
      );
      if (duplicate) throw new Error(`Layer ID already exists: ${layer.id}`);

      setCatalog((draft) => {
        draft.layers.push(layer);
      });
    },

    removeLayer(id) {
      setCatalog((draft) => {
        const index = draft.layers.findIndex((layer) => layer.id === id);
        if (index === -1) return;

        draft.layers.splice(index, 1);
        if (draft.selectedLayerId === id) draft.selectedLayerId = undefined;
      });
    },

    toggleVisibility(id) {
      setCatalog((draft) => {
        const layer = draft.layers.find((layer) => layer.id === id);
        if (layer) layer.visible = !layer.visible;
      });
    },

    moveLayer(id, toIndex) {
      const layers = untrack(() => [...catalog.layers]);
      const fromIndex = layers.findIndex((layer) => layer.id === id);
      if (fromIndex === -1 || layers.length < 2) return;

      const destination = Math.max(0, Math.min(toIndex, layers.length - 1));
      const [layer] = layers.splice(fromIndex, 1);
      layers.splice(destination, 0, layer);
      setCatalog((draft) => {
        draft.layers = layers;
      });
    },

    selectLayer(id) {
      const validId = untrack(() =>
        id === undefined || catalog.layers.some((layer) => layer.id === id),
      );
      if (!validId) return;

      setCatalog((draft) => {
        const isCurrent = draft.selectedLayerId === id;
        draft.selectedLayerId = isCurrent ? undefined : id;
      });
    },

    updateScatterplot(id, updates) {
      setCatalog((draft) => {
        const layer = draft.layers.find((candidate) => candidate.id === id);
        if (!layer || layer.type !== "scatterplot") return;
        updateScatterplotDefinition(layer, updates);
      });
    },
  };

  return [catalog, actions];
}