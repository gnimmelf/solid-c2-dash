import { flush } from "solid-js";
import { describe, expect, it } from "vitest";
import {
  createLayerCatalog,
  type CatalogState,
  type ScatterplotLayerDefinition,
} from ".";

function layer(
  id: string,
  overrides: Partial<ScatterplotLayerDefinition> = {},
): ScatterplotLayerDefinition {
  return {
    id,
    name: `Layer ${id}`,
    datasetId: `dataset-${id}`,
    type: "scatterplot",
    visible: true,
    opacity: 1,
    position: {
      longitudeColumn: "longitude",
      latitudeColumn: "latitude",
    },
    radius: { base: 100 },
    fillColor: [242, 210, 67, 190],
    ...overrides,
  };
}

describe("createLayerCatalog", () => {
  it("copies the initial layer array", () => {
    const layers = [layer("one")];
    const [catalog] = createLayerCatalog({ layers });

    layers.push(layer("two"));

    expect(catalog.layers.map(({ id }) => id)).toEqual(["one"]);
  });

  it("appends layers and rejects duplicate IDs", () => {
    const [catalog, actions] = createLayerCatalog({ layers: [layer("one")] });

    actions.addLayer(layer("two"));
    flush();

    expect(catalog.layers.map(({ id }) => id)).toEqual(["one", "two"]);
    expect(() => actions.addLayer(layer("one"))).toThrow(
      "Layer ID already exists: one",
    );
  });

  it("removes a layer and clears its selection", () => {
    const [catalog, actions] = createLayerCatalog({
      layers: [layer("one"), layer("two")],
      selectedLayerId: "one",
    });

    actions.removeLayer("one");
  flush();

    expect(catalog.layers.map(({ id }) => id)).toEqual(["two"]);
    expect(catalog.selectedLayerId).toBeUndefined();
  });

  it("leaves state unchanged for unknown layer IDs", () => {
    const [catalog, actions] = createLayerCatalog({
      layers: [layer("one")],
      selectedLayerId: "one",
    });

    actions.removeLayer("missing");
    actions.toggleVisibility("missing");
    actions.moveLayer("missing", 0);
    actions.selectLayer("missing");
    flush();

    expect(catalog.layers.map(({ id, visible }) => ({ id, visible }))).toEqual([
      { id: "one", visible: true },
    ]);
    expect(catalog.selectedLayerId).toBe("one");
  });

  it("toggles visibility without removing or replacing the layer ID", () => {
    const [catalog, actions] = createLayerCatalog({ layers: [layer("one")] });

    actions.toggleVisibility("one");
  flush();

    expect(catalog.layers).toHaveLength(1);
    expect(catalog.layers[0]).toMatchObject({ id: "one", visible: false });
  });

  it("moves layers in both directions and clamps the destination", () => {
    const [catalog, actions] = createLayerCatalog({
      layers: [layer("one"), layer("two"), layer("three")],
    });

    actions.moveLayer("three", -1);
  flush();
    expect(catalog.layers.map(({ id }) => id)).toEqual([
      "three",
      "one",
      "two",
    ]);

    actions.moveLayer("three", 99);
  flush();
    expect(catalog.layers.map(({ id }) => id)).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("selects existing layers and clears selection explicitly", () => {
    const [catalog, actions] = createLayerCatalog({ layers: [layer("one")] });

    actions.selectLayer("one");
  flush();
    expect(catalog.selectedLayerId).toBe("one");

    actions.selectLayer();
  flush();
    expect(catalog.selectedLayerId).toBeUndefined();
  });

  it("drops an invalid initial selection", () => {
    const [catalog] = createLayerCatalog({
      layers: [layer("one")],
      selectedLayerId: "missing",
    });

    expect(catalog.selectedLayerId).toBeUndefined();
  });

  it("contains only JSON-serializable state", () => {
    const initial: CatalogState = {
      layers: [layer("one")],
      selectedLayerId: "one",
    };
    const [catalog] = createLayerCatalog(initial);

    expect(JSON.parse(JSON.stringify(catalog))).toEqual(initial);
  });
});