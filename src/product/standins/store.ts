import { STAND_IN_LABELS } from "../copy";
import { KINDS, type EntityMap, type Kind } from "../model/types";
import type { StorePort } from "../ports";
import { type KeyValue, readJson, writeJson } from "./kv";

/** The version is part of the key so a later change of shape discards old data on purpose. */
export const STORE_KEY = "agely.product.v1";

type Document = { [K in Kind]: Record<string, EntityMap[K]> };

const empty = (): Document => Object.fromEntries(KINDS.map((k) => [k, {}])) as Document;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Stand-in storage: one JSON document in the browser's key-value storage (research R3). It
 * keeps data on one device and checks no permissions; the use cases do that.
 */
export function makeStandInStore(kv: KeyValue): StorePort {
  const read = (): Document => ({ ...empty(), ...readJson<Partial<Document>>(kv, STORE_KEY, {}) });

  const store: StorePort = {
    status: { service: "storage", connected: false, label: STAND_IN_LABELS.storage },

    async get(kind, id) {
      const found = read()[kind][id];
      return found === undefined ? null : copy(found);
    },

    async list(kind, where = {}) {
      const wanted = Object.entries(where);
      return Object.values(read()[kind])
        .filter((entity) => wanted.every(([field, value]) => (entity as unknown as Record<string, unknown>)[field] === value))
        .map(copy);
    },

    async put(kind, entity) {
      const doc = read();
      (doc[kind] as Record<string, EntityMap[typeof kind]>)[entity.id] = copy(entity);
      writeJson(kv, STORE_KEY, doc);
    },

    async remove(kind, id) {
      const doc = read();
      delete doc[kind][id];
      writeJson(kv, STORE_KEY, doc);
    },

    async transaction(work) {
      const before = kv.getItem(STORE_KEY);
      try {
        return await work(store);
      } catch (error) {
        if (before === null) kv.removeItem(STORE_KEY);
        else kv.setItem(STORE_KEY, before);
        throw error;
      }
    },
  };
  return store;
}
