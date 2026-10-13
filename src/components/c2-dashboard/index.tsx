import { createSignal, onSettled, Show, untrack } from "solid-js";

import "@oicl/openbridge-webcomponents/dist/components/button/button.js";
import styles from "./style.module.css";
import SpectrogramWidget from "../spectrogram-widget";

export default function C2Dashboard() {
  return (
    <div class={styles.root}>
      <header class={styles.header}>
        <div>
          <span class="eyebrow">Operational overview dashboard · L1-L2</span>
          <h1>Acoustic operations</h1>
        </div>
      </header>

      <section
        class={styles.overview}
        aria-label="Operational overview dashboard"
      >
        <div class={styles["widget-list"]}>
          <SpectrogramWidget />
          <SpectrogramWidget />
        </div>
      </section>
    </div>
  );
}
