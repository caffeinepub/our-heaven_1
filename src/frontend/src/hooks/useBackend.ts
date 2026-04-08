import { useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { backendInterface } from "../backend.d.ts";

/**
 * Returns the backend actor or null while it is loading.
 * Provides a typed reference to call backend methods.
 */
export function useBackend(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  const { actor, isFetching } = useActor(createActor);
  return { actor: actor as backendInterface | null, isFetching };
}
