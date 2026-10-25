import { fireEvent, render } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { describe, expect, it } from "vitest";
import {
  createLayerCatalog,
  type ScatterplotLayerDefinition,
} from "../lib/layer-catalog";
import LayerCatalogPanel from ".";

function layer(id: string): ScatterplotLayerDefinition {
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
    fillColor: [242, 102, 67, 190],
  };
}

function setup(ids: string[] = ["one", "two", "three"]) {
  const [catalog, actions] = createLayerCatalog({
    layers: ids.map(layer),
    selectedLayerId: ids[0],
  });
  const result = render(() => (
    <LayerCatalogPanel catalog={catalog} actions={actions} />
  ));
  const byLabel = (label: string) => {
    const element = result.container.querySelector(`[aria-label="${label}"]`);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Could not find element labelled: ${label}`);
    }
    return element;
  };
  const rowIds = () =>
    [...result.container.querySelectorAll("[data-layer-id]")].map((element) =>
      element.getAttribute("data-layer-id"),
    );

  return { ...result, catalog, actions, byLabel, rowIds };
}

describe("LayerCatalogPanel", () => {
  it("renders layers in catalog order and marks the selection", () => {
    const { container, rowIds } = setup();

    expect(rowIds()).toEqual(["one", "two", "three"]);
    expect(
      container
        .querySelector('[data-layer-id="one"]')
        ?.getAttribute("data-selected"),
    ).toBe("true");
  });

  it("selects a layer by its name", async () => {
    const { catalog, container, getByText } = setup();

    await fireEvent.click(getByText("Layer two"));
    flush();

    expect(catalog.selectedLayerId).toBe("two");
    expect(
      container
        .querySelector('[data-layer-id="two"]')
        ?.getAttribute("data-selected"),
    ).toBe("true");
  });

  it("updates visibility from the OpenBridge icon check button event", () => {
    const { catalog, byLabel } = setup();
    byLabel("Show Layer one").dispatchEvent(
      new CustomEvent("icon-check-button-click", {
        detail: { checked: false },
        bubbles: true,
      }),
    );
    flush();

    expect(catalog.layers[0].visible).toBe(false);
  });

  it("moves layers and disables controls at list boundaries", async () => {
    const { byLabel, rowIds } = setup();

    expect(byLabel("Move Layer one up").hasAttribute("disabled")).toBe(true);
    expect(byLabel("Move Layer three down").hasAttribute("disabled")).toBe(
      true,
    );

    await fireEvent.click(byLabel("Move Layer two up"));
    flush();
    expect(rowIds()).toEqual(["two", "one", "three"]);

    await fireEvent.click(byLabel("Move Layer one down"));
    flush();
    expect(rowIds()).toEqual(["two", "three", "one"]);
  });

  it("deletes layers, clears selection, and shows the empty state", async () => {
    const { catalog, byLabel, getByText } = setup(["one"]);

    await fireEvent.click(byLabel("Delete Layer one"));
    flush();

    expect(catalog.layers).toHaveLength(0);
    expect(catalog.selectedLayerId).toBeUndefined();
    expect(getByText("No layers").isConnected).toBe(true);
  });
});