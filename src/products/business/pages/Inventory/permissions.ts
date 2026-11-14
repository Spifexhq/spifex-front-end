import { useMemo } from "react";
import { useAuthContext } from "@/hooks/useAuth";

/**
 * Inventory permissions are domain permissions, not page permissions. Owners
 * and superusers always pass; members need the matching inventory code.
 */
export function useInventoryPermissions() {
  const { isOwner, isSuperUser, permissions } = useAuthContext();

  return useMemo(() => {
    const has = (code: string) => isOwner || isSuperUser || permissions.includes(code);
    return {
      canView: has("view_inventory") || has("view_inventory_settings_page"),
      canCreate: has("add_inventory"),
      canEdit: has("change_inventory"),
      canDelete: has("delete_inventory"),
    };
  }, [isOwner, isSuperUser, permissions]);
}
