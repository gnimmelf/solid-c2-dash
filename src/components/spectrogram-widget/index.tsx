import { createSignal, onSettled, Show, untrack } from "solid-js";
import * as v from "valibot";
import { WindowChannelRegistry } from "../../lib/window-channel";
import Spectrogram from "../spectrogram";
import {
  SpectrogramChannelSchemas,
  SpectrogramStateSchema,
  type ColormapName,
  type SpectrumSourceOption,
} from "../spectrogram/channel";
import "@oicl/openbridge-webcomponents/dist/components/button/button.js";
import styles from "./style.module.css";
import { AudioSource } from "../spectrogram/spectrum-source";

export default function SpectrogramWidget(props: { widgetId: string }) {
  const [attentionLevel, setAttentionLevel] = createSignal<1 | 2>(1);
  const [assetId, setAssetId] = createSignal(
    `hydrophone-${props.widgetId.padStart(2, "0")}`,
  );
  const [running, setRunning] = createSignal(true);
  const [colormap, setColormap] = createSignal<ColormapName>("viridis");
  const [spectrumSource, setSpectrumSource] = createSignal<AudioSource>("simulation");
  const [popupError, setPopupError] = createSignal("");

  const channel = new WindowChannelRegistry(
    "spectrogram_c2_demo",
    window.location.href,
    {
      schemas: SpectrogramChannelSchemas,
      schemaVersion: "3",
      state: {
        schema: SpectrogramStateSchema,
        getSnapshot: () =>
          untrack(() => ({
            assetId: assetId(),
            running: running(),
            colormap: colormap(),
            spectrumSource: spectrumSource(),
          })),
        applySnapshot: (state) => {
          const snapshot = v.parse(SpectrogramStateSchema, state);
          setAssetId(snapshot.assetId);
          setRunning(snapshot.running);
          setColormap(snapshot.colormap);
          setSpectrumSource(snapshot.spectrumSource);
        },
      },
    },
  );

  onSettled(() => {
    const unsubscribe = channel.subscribe((message) => {
      if (message.type === "spectrogram-controls") {
        setRunning(message.data.running);
        setColormap(message.data.colormap);
        setSpectrumSource(message.data.spectrumSource);
      }
    });
    const disconnect = channel.connect();
    return () => {
      unsubscribe();
      disconnect();
    };
  });

  const broadcastControls = (
    nextRunning: boolean,
    nextColormap: ColormapName,
    nextSpectrumSource: SpectrumSourceOption,
  ) => {
    if (attentionLevel() < 2) return;
    setRunning(nextRunning);
    setColormap(nextColormap);
    setSpectrumSource(nextSpectrumSource);
    void channel.broadcast("spectrogram-controls", {
      running: nextRunning,
      colormap: nextColormap,
      spectrumSource: nextSpectrumSource,
    });
  };

  const castToL3 = () => {
    const target = new URL("/pages/l3-spectrogram-workspace", window.location.origin);
    target.searchParams.set("assetId", assetId());
    target.searchParams.set("level", "3");
    if (channel.openChild(target.href)) {
      setPopupError("");
    } else {
      setPopupError("The L3 window was blocked. Allow popups and try again.");
    }
  };

  return (
    <div class={styles.root}>
      <section
        class={styles.widget}
        aria-label="Operational overview dashboard"
      >
        <h2>Hydrophone array #{props.widgetId}</h2>
        <div class={styles.actions}>
          <obc-button
            variant={attentionLevel() === 2 ? "raised" : "normal"}
            onClick={() =>
              setAttentionLevel((level) => (level === 1 ? 2 : 1))
            }
          >
            {attentionLevel() === 1 ? "Inspect at L2" : "Return to L1"}
          </obc-button>
          <obc-button variant="raised" onClick={castToL3}>
            Open L3 workspace
          </obc-button>
        </div>
        <Spectrogram
          attentionLevel={attentionLevel()}
          assetId={assetId()}
          running={running}
          colormap={colormap}
          spectrumSource={spectrumSource}
          onRunningChange={(nextRunning) =>
            broadcastControls(nextRunning, colormap(), spectrumSource())
          }
          onColormapChange={(nextColormap) =>
            broadcastControls(running(), nextColormap, spectrumSource())
          }
          onSpectrumSourceChange={(nextSpectrumSource) =>
            broadcastControls(running(), colormap(), nextSpectrumSource)
          }
        />

        <dl class={styles.details}>
          <div>
            <dt>Attention model</dt>
            <dd>L{attentionLevel()} {attentionLevel() === 1 ? "Monitor" : "Inspect"}</dd>
          </div>
          <div class={styles.help}>
            {attentionLevel() === 1
              ? "L1 keeps status and attention cues compact inside the operational overview."
              : "L2 expands the live view and basic controls while preserving dashboard context."}
          </div>
          <div>
            <dt>L3 peers</dt>
            <dd>{channel.peers().length}</dd>
          </div>
        </dl>
        <Show when={popupError()}>
          <p class={styles.error} role="alert">
            {popupError()}
          </p>
        </Show>
        <Show when={channel.error()}>
          {(error) => (
            <p class={styles.error} role="alert">
              {error()}
            </p>
          )}
        </Show>



      </section>
    </div>
  );
}
