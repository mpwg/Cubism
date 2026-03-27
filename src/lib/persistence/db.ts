import Dexie, { type Table } from "dexie";

export interface SnapshotRecord<TPayload> {
  id: string;
  updatedAt: number;
  payload: TPayload;
}

export class CubismDatabase<TPayload> extends Dexie {
  snapshots!: Table<SnapshotRecord<TPayload>, string>;

  constructor() {
    super("cubism");
    this.version(1).stores({
      snapshots: "id,updatedAt"
    });
  }
}
