import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { api } from "@/core/api/requests";
import { setAuthSnapshot } from "@/redux";
import { clearHttpCaches, setAuthGate, clearAuthGate } from "@/core/api/http";
import { advanceAuthGeneration, getAuthGeneration } from "@/core/authentication/authGeneration";
import { getOrgExternalIdStored, setOrgExternalIdStored, getUserIdStored } from "@/lib/tokens";
import { selectWorkspace } from "./workspaceSelection";

export function useWorkspaceSelection() {
  const dispatch = useDispatch(), navigate = useNavigate();
  return (id: string, options?: { beforeCommit?: () => Promise<void> }) => selectWorkspace(id, {
    getWorkspace: getOrgExternalIdStored, setWorkspace: setOrgExternalIdStored,
    getUser: getUserIdStored, generation: getAuthGeneration, advance: advanceAuthGeneration,
    clearCaches: clearHttpCaches, profile: () => api.getUser(id),
    commit: snapshot => { dispatch(setAuthSnapshot(snapshot)); },
    navigate: path => navigate(path, { replace: true }), setGate: setAuthGate, clearGate: clearAuthGate,
  }, options);
}
