import SettingsSurface from "@/shared/ui/Settings/SettingsSurface";
import PersonalCollectionWorkspace from "../../components/PersonalCollectionWorkspace";

export default function CategoriesPage() {
  return <SettingsSurface><PersonalCollectionWorkspace collection="categories" settings /></SettingsSurface>;
}
