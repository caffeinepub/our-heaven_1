import type { backendInterface } from "../backend.d.ts";
import { useActor } from "./useActor";

/**
 * Returns the backend actor or null while it is loading.
 * Provides a typed reference to call backend methods.
 */
export function useBackend(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  return useActor();
}
