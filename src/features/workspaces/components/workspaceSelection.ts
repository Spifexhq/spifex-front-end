import type { GetUserResponse } from "@/models/auth/user";

type Dependencies = {
  getWorkspace(): string;
  setWorkspace(id: string): void;
  getUser(): string;
  generation(): number;
  advance(): void;
  clearCaches(): void;
  profile(organizationId: string): Promise<{ data: GetUserResponse }>;
  commit(snapshot: GetUserResponse): void;
  navigate(path: string): void;
  setGate(task: Promise<void>): void;
  clearGate(task: Promise<void>): void;
};

/** Commit only a verified same-user workspace snapshot; restore the hint on failure. */
export async function selectWorkspace(id: string, deps: Dependencies, options: { beforeCommit?: () => Promise<void> } = {}): Promise<void> {
  const previous = deps.getWorkspace(), user = deps.getUser();
  deps.advance();
  const generation = deps.generation();
  const current = () => generation === deps.generation() && user === deps.getUser();
  deps.clearCaches();
  deps.setWorkspace(id);
  const task = (async () => {
    try {
      const { data } = await deps.profile(id);
      if (!current()) throw new Error("Workspace switch superseded");
      if (user && data.user.id !== user) throw new Error("refresh_user_mismatch");
      if (data.organization?.organization?.id !== id) throw new Error("Workspace access could not be verified");
      await options.beforeCommit?.();
      if (!current()) throw new Error("Workspace switch superseded");
      deps.commit(data);
      deps.navigate(data.organization.organization.product_category === "personal" ? "/personal/overview" : "/overview");
    } catch (error) {
      if (current()) { deps.advance(); deps.clearCaches(); deps.setWorkspace(previous); }
      throw error;
    }
  })();
  deps.setGate(task);
  try { await task; } finally { deps.clearGate(task); }
}
