import { createStore, untrack, type Store } from "solid-js";

export type BaseLayerDefinition = {
  id: string;
  name: string;
  datasetId: string;
  visible: boolean;
  opacity: number;
};

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

export type LayerDefinition = ScatterplotLayerDefinition;

export type CatalogState = {
  layers: LayerDefinition[];
  selectedLayerId?: string;
};

export type LayerCatalogActions = {
  addLayer: (layer: LayerDefinition) => void;
  removeLayer: (id: string) => void;
  toggleVisibility: (id: string) => void;
  moveLayer: (id: string, toIndex: number) => void;
  selectLayer: (id?: string) => void;
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
      if (
        id !== undefined &&
        !untrack(() => catalog.layers.some((layer) => layer.id === id))
      ) {
        return;
      }
      setCatalog((draft) => {
        draft.selectedLayerId = id;
      });
    },
  };

  return [catalog, actions];
}