export interface SyncModel {
  name: string;
  apiPath: string;
  syncMessage: string;
}

export const defineModel = (name: string): SyncModel => ({
  name,
  apiPath: `/api/${name}`,
  syncMessage: `SYNC_${name.toUpperCase()}`,
});
