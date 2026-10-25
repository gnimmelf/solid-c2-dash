import { For, Show } from "solid-js";
import "@oicl/openbridge-webcomponents/dist/components/button/button.js";
import "@oicl/openbridge-webcomponents/dist/components/icon-check-button/icon-check-button.js";
import "@oicl/openbridge-webcomponents/dist/components/icon-button/icon-button.js";
import "@oicl/openbridge-webcomponents/dist/icons/icon-chevron-down-google.js";
import "@oicl/openbridge-webcomponents/dist/icons/icon-chevron-up-google.js";
import "@oicl/openbridge-webcomponents/dist/icons/icon-delete.js";
import "@oicl/openbridge-webcomponents/dist/icons/icon-visibility-off-google.js";
import "@oicl/openbridge-webcomponents/dist/icons/icon-visibility-on-google.js";
import type {
  CatalogState,
  LayerCatalogActions,
  LayerDefinition,
} from "../lib/layer-catalog";
import styles from "./style.module.css";

type LayerCatalogPanelProps = {
  catalog: CatalogState;
  actions: LayerCatalogActions;
};

export default function LayerCatalogPanel(props: LayerCatalogPanelProps) {
  function handleVisibilityChange(
    layer: LayerDefinition,
    event: CustomEvent<{ checked: boolean }>,
  ) {
    if (event.detail.checked !== layer.visible) {
      props.actions.toggleVisibility(layer.id);
    }
  }

  return (
    <section class={styles.panel} aria-labelledby="layer-catalog-heading">
      <h2 id="layer-catalog-heading">Layers</h2>
      <Show
        when={props.catalog.layers.length > 0}
        fallback={<p class={styles.empty}>No layers</p>}
      >
        <ol class={styles.list} aria-label="Map layers">
          <For each={props.catalog.layers}>
            {(layer, index) => {
              const selected = () =>
                props.catalog.selectedLayerId === layer.id;
              const label = () => layer.name || layer.id;

              return (
                <li
                  class={styles.row}
                  data-layer-id={layer.id}
                  data-selected={selected() ? "true" : undefined}
                >
                  <obc-icon-check-button
                    prop:checked={layer.visible}
                    externalControl
                    aria-label={`Show ${label()}`}
                    ref={(element) =>
                      element.addEventListener(
                        "icon-check-button-click",
                        (event) =>
                          handleVisibilityChange(
                            layer,
                            event as CustomEvent<{ checked: boolean }>,
                          ),
                      )}
                  >
                    <Show
                      when={layer.visible}
                      fallback={<obi-visibility-off-google slot="icon" />}
                    >
                      <obi-visibility-on-google slot="icon" />
                    </Show>
                  </obc-icon-check-button>
                  <obc-button
                    class={styles.name}
                    variant={selected() ? "raised" : "normal"}
                    aria-current={selected() ? "true" : undefined}
                    onClick={() => props.actions.selectLayer(layer.id)}
                  >
                    {label()}
                  </obc-button>
                  <div class={styles.actions}>
                    <obc-icon-button
                      variant="flat"
                      disabled={index() === 0}
                      aria-label={`Move ${label()} up`}
                      onClick={() => props.actions.moveLayer(layer.id, index() - 1)}
                    >
                      <obi-chevron-up-google />
                    </obc-icon-button>
                    <obc-icon-button
                      variant="flat"
                      disabled={index() === props.catalog.layers.length - 1}
                      aria-label={`Move ${label()} down`}
                      onClick={() => props.actions.moveLayer(layer.id, index() + 1)}
                    >
                      <obi-chevron-down-google />
                    </obc-icon-button>
                    <obc-icon-button
                      variant="flat"
                      aria-label={`Delete ${label()}`}
                      onClick={() => props.actions.removeLayer(layer.id)}
                    >
                      <obi-delete />
                    </obc-icon-button>
                  </div>
                </li>
              );
            }}
          </For>
        </ol>
      </Show>
    </section>
  );
}