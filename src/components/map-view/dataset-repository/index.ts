import { CSVLoader } from "@loaders.gl/csv";
import { createStore, type Store } from "solid-js";

export type DatasetFormat = "csv";

export type EmbeddedDatasetSourceDescriptor = {
  id: string;
  kind: "embedded";
};

export type CsvUrlDatasetSourceDescriptor = {
  id: string;
  kind: "url";
  format: DatasetFormat;
  url: string;
};

export type CsvFileDatasetSourceDescriptor = {
  id: string;
  kind: "file";
  format: DatasetFormat;
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

export type DatasetSourceDescriptor =
  | EmbeddedDatasetSourceDescriptor
  | CsvUrlDatasetSourceDescriptor
  | CsvFileDatasetSourceDescriptor;

export type DatasetRow = Record<string, unknown>;

export type RowsDatasetData = {
  kind: "rows";
  rows: readonly DatasetRow[];
};

export type DatasetState = {
  id: string;
  status: "idle" | "loading" | "ready" | "error";
  data?: RowsDatasetData;
  error?: string;
};

export type DatasetLookup = Readonly<Record<string, DatasetState | undefined>>;

export type DatasetRepositoryState = {
  sources: Record<string, DatasetSourceDescriptor | undefined>;
  datasets: Record<string, DatasetState | undefined>;
};

export type EmbeddedDataset = {
  id: string;
  rows: readonly DatasetRow[];
};

export type DatasetRepositoryActions = {
  registerCsvUrl: (source: Omit<CsvUrlDatasetSourceDescriptor, "kind">) => void;
  registerCsvFile: (id: string, file: File) => void;
  load: (id: string) => Promise<void>;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  dispose: () => void;
};

type RuntimeResources = {
  controllers: Map<string, AbortController>;
  files: Map<string, File>;
  generations: Map<string, number>;
  sources: Map<string, DatasetSourceDescriptor>;
  disposed: boolean;
};

function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

function isAbortError(cause: unknown) {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function readFile(file: File, signal: AbortSignal): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const handleAbort = () => reader.abort();
    const finish = () => signal.removeEventListener("abort", handleAbort);

    reader.onload = () => {
      finish();
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("File reader returned an unexpected result."));
    };
    reader.onerror = () => {
      finish();
      reject(reader.error ?? new Error("Could not read the selected file."));
    };
    reader.onabort = () => {
      finish();
      reject(abortError());
    };

    if (signal.aborted) reject(abortError());
    else {
      signal.addEventListener("abort", handleAbort, { once: true });
      reader.readAsArrayBuffer(file);
    }
  });
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Could not load dataset.";
}

export function createDatasetRepository(
  initialEmbedded: readonly EmbeddedDataset[] = [],
): [Store<DatasetRepositoryState>, DatasetRepositoryActions] {
  const sources: DatasetRepositoryState["sources"] = {};
  const datasets: DatasetRepositoryState["datasets"] = {};
  const resources: RuntimeResources = {
    controllers: new Map(),
    files: new Map(),
    generations: new Map(),
    sources: new Map(),
    disposed: false,
  };

  for (const dataset of initialEmbedded) {
    if (resources.sources.has(dataset.id)) {
      throw new Error(`Dataset ID already exists: ${dataset.id}`);
    }
    const source: EmbeddedDatasetSourceDescriptor = {
      id: dataset.id,
      kind: "embedded",
    };
    sources[dataset.id] = source;
    datasets[dataset.id] = {
      id: dataset.id,
      status: "ready",
      data: { kind: "rows", rows: [...dataset.rows] },
    };
    resources.sources.set(dataset.id, source);
  }

  const [repository, setRepository] = createStore<DatasetRepositoryState>({
    sources,
    datasets,
  });

  const assertActive = () => {
    if (resources.disposed) throw new Error("Dataset repository is disposed.");
  };

  const assertAvailableId = (id: string) => {
    if (resources.sources.has(id)) {
      throw new Error(`Dataset ID already exists: ${id}`);
    }
  };

  const invalidate = (id: string) => {
    resources.controllers.get(id)?.abort();
    resources.controllers.delete(id);
    const generation = (resources.generations.get(id) ?? 0) + 1;
    resources.generations.set(id, generation);
    return generation;
  };

  const isCurrent = (id: string, generation: number) =>
    !resources.disposed && resources.generations.get(id) === generation;

  const actions: DatasetRepositoryActions = {
    registerCsvUrl(source) {
      assertActive();
      assertAvailableId(source.id);
      const descriptor: CsvUrlDatasetSourceDescriptor = {
        ...source,
        kind: "url",
      };
      resources.sources.set(source.id, descriptor);
      setRepository((draft) => {
        draft.sources[source.id] = descriptor;
        draft.datasets[source.id] = { id: source.id, status: "idle" };
      });
    },

    registerCsvFile(id, file) {
      assertActive();
      assertAvailableId(id);
      const descriptor: CsvFileDatasetSourceDescriptor = {
        id,
        kind: "file",
        format: "csv",
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      };
      resources.sources.set(id, descriptor);
      resources.files.set(id, file);
      setRepository((draft) => {
        draft.sources[id] = descriptor;
        draft.datasets[id] = { id, status: "idle" };
      });
    },

    async load(id) {
      assertActive();
      const source = resources.sources.get(id);
      if (!source) throw new Error(`Unknown dataset ID: ${id}`);
      if (source.kind === "embedded") return;

      const generation = invalidate(id);
      const controller = new AbortController();
      resources.controllers.set(id, controller);
      setRepository((draft) => {
        draft.datasets[id] = { id, status: "loading" };
      });

      try {
        let bytes: ArrayBuffer;
        if (source.kind === "url") {
          const response = await fetch(source.url, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(
              `Could not load dataset (${response.status} ${response.statusText})`,
            );
          }
          bytes = await response.arrayBuffer();
        } else {
          const file = resources.files.get(id);
          if (!file) throw new Error("Select the source file before loading.");
          bytes = await readFile(file, controller.signal);
        }

        if (!isCurrent(id, generation)) return;
        const table = await CSVLoader.parse(bytes, {
          csv: { shape: "object-row-table" },
        });
        if (!isCurrent(id, generation)) return;
        if (table.shape !== "object-row-table") {
          throw new Error("CSV loader returned an unexpected table shape.");
        }

        setRepository((draft) => {
          draft.datasets[id] = {
            id,
            status: "ready",
            data: { kind: "rows", rows: table.data },
          };
        });
      } catch (cause) {
        if (!isCurrent(id, generation) || isAbortError(cause)) return;
        setRepository((draft) => {
          draft.datasets[id] = {
            id,
            status: "error",
            error: errorMessage(cause),
          };
        });
      } finally {
        if (resources.generations.get(id) === generation) {
          resources.controllers.delete(id);
        }
      }
    },

    cancel(id) {
      if (!resources.sources.has(id)) return;
      invalidate(id);
      setRepository((draft) => {
        draft.datasets[id] = { id, status: "idle" };
      });
    },

    remove(id) {
      if (!resources.sources.has(id)) return;
      invalidate(id);
      resources.sources.delete(id);
      resources.files.delete(id);
      resources.generations.delete(id);
      setRepository((draft) => {
        delete draft.sources[id];
        delete draft.datasets[id];
      });
    },

    dispose() {
      if (resources.disposed) return;
      resources.disposed = true;
      for (const controller of resources.controllers.values()) {
        controller.abort();
      }
      resources.controllers.clear();
      resources.files.clear();
      resources.generations.clear();
      resources.sources.clear();
    },
  };

  return [repository, actions];
}