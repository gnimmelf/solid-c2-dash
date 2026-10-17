import { flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDatasetRepository } from ".";

function response(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, ...init });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createDatasetRepository", () => {
  it("initializes embedded rows without aliasing the caller array", () => {
    const rows = [{ longitude: 10, latitude: 59 }];
    const [repository] = createDatasetRepository([{ id: "demo", rows }]);

    rows.push({ longitude: 11, latitude: 60 });

    expect(repository.sources.demo).toEqual({ id: "demo", kind: "embedded" });
    expect(repository.datasets.demo).toMatchObject({
      id: "demo",
      status: "ready",
      data: { kind: "rows", rows: [{ longitude: 10, latitude: 59 }] },
    });
  });

  it("registers serializable URL and file descriptors", () => {
    const [repository, actions] = createDatasetRepository();
    const file = new File(["x,y\n1,2"], "points.csv", {
      type: "text/csv",
      lastModified: 123,
    });

    actions.registerCsvUrl({
      id: "remote",
      format: "csv",
      url: "https://example.test/points.csv",
    });
    actions.registerCsvFile("local", file);
    flush();

    expect(repository.sources.remote).toEqual({
      id: "remote",
      kind: "url",
      format: "csv",
      url: "https://example.test/points.csv",
    });
    expect(repository.sources.local).toMatchObject({
      id: "local",
      kind: "file",
      format: "csv",
      name: "points.csv",
      type: "text/csv",
      lastModified: 123,
    });
    expect(JSON.parse(JSON.stringify(repository.sources))).toEqual(
      repository.sources,
    );
  });

  it("rejects duplicate IDs before queued store updates flush", () => {
    const [, actions] = createDatasetRepository();

    actions.registerCsvUrl({
      id: "points",
      format: "csv",
      url: "https://example.test/one.csv",
    });

    expect(() =>
      actions.registerCsvUrl({
        id: "points",
        format: "csv",
        url: "https://example.test/two.csv",
      }),
    ).toThrow("Dataset ID already exists: points");
  });

  it("loads URL and file CSV sources through object-row tables", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response("longitude,latitude\n10.5,59.4")),
    );
    const [repository, actions] = createDatasetRepository();
    actions.registerCsvUrl({
      id: "remote",
      format: "csv",
      url: "https://example.test/points.csv",
    });
    actions.registerCsvFile(
      "local",
      new File(["longitude,latitude\n11.5,60.4"], "points.csv"),
    );

    await actions.load("remote");
    await actions.load("local");
    flush();

    expect(repository.datasets.remote?.data?.rows).toEqual([
      { longitude: 10.5, latitude: 59.4 },
    ]);
    expect(repository.datasets.local?.data?.rows).toEqual([
      { longitude: 11.5, latitude: 60.4 },
    ]);
  });

  it("records HTTP failures without stale data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response("missing", { status: 404, statusText: "Not Found" })),
    );
    const [repository, actions] = createDatasetRepository();
    actions.registerCsvUrl({
      id: "missing",
      format: "csv",
      url: "https://example.test/missing.csv",
    });

    await actions.load("missing");
    flush();

    expect(repository.datasets.missing).toEqual({
      id: "missing",
      status: "error",
      error: "Could not load dataset (404 Not Found)",
    });
  });

  it("cancels active URL loading without recording an abort error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );
    const [repository, actions] = createDatasetRepository();
    actions.registerCsvUrl({
      id: "slow",
      format: "csv",
      url: "https://example.test/slow.csv",
    });

    const loading = actions.load("slow");
    actions.cancel("slow");
    await loading;
    flush();

    expect(repository.datasets.slow).toEqual({ id: "slow", status: "idle" });
  });

  it("ignores a superseded load that completes late", async () => {
    const resolvers: Array<(value: Response) => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolvers.push(resolve);
          }),
      ),
    );
    const [repository, actions] = createDatasetRepository();
    actions.registerCsvUrl({
      id: "points",
      format: "csv",
      url: "https://example.test/points.csv",
    });

    const firstLoad = actions.load("points");
    const secondLoad = actions.load("points");
    resolvers[1](response("value\n2"));
    await secondLoad;
    resolvers[0](response("value\n1"));
    await firstLoad;
    flush();

    expect(repository.datasets.points?.data?.rows).toEqual([{ value: 2 }]);
  });

  it("ignores late completion after removal", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const [repository, actions] = createDatasetRepository();
    actions.registerCsvUrl({
      id: "removed",
      format: "csv",
      url: "https://example.test/removed.csv",
    });

    const loading = actions.load("removed");
    actions.remove("removed");
    resolveFetch(response("x,y\n1,2"));
    await loading;
    flush();

    expect(repository.sources.removed).toBeUndefined();
    expect(repository.datasets.removed).toBeUndefined();
  });

  it("disposes active requests and rejects future registration", async () => {
    let aborted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => {
                aborted = true;
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true },
            );
          }),
      ),
    );
    const [, actions] = createDatasetRepository();
    actions.registerCsvUrl({
      id: "slow",
      format: "csv",
      url: "https://example.test/slow.csv",
    });

    const loading = actions.load("slow");
    actions.dispose();
    await loading;

    expect(aborted).toBe(true);
    expect(() =>
      actions.registerCsvUrl({
        id: "later",
        format: "csv",
        url: "https://example.test/later.csv",
      }),
    ).toThrow("Dataset repository is disposed.");
  });
});