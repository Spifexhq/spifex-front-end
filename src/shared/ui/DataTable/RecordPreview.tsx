import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import type { Column } from "./types";

export default function RecordPreview<T extends { id: string }>({ item, columns, load, onClose, onEdit, editLabel }: {
  item?: T; columns: Column<T>[]; load?(item: T): Promise<T>; onClose(): void; onEdit?(item: T): void; editLabel: string;
}) {
  const { t } = useTranslation("common");
  const loader = useRef(load); loader.current = load;
  const [state, setState] = useState<{ id: string; item?: T; error?: boolean }>({ id: "" });
  const [retry, setRetry] = useState(0);
  const id = item?.id;
  const source = useRef(item); source.current = item;
  useEffect(() => {
    if (!id || !source.current || !loader.current) return;
    let active = true;
    setState({ id });
    void loader.current(source.current).then(detail => { if (active) setState({ id, item: detail }); }, () => { if (active) setState({ id, error: true }); });
    return () => { active = false; };
  }, [id, retry]);
  const loaded = !load ? item : state.id === id ? state.item : undefined;
  const error = !!load && state.id === id && state.error;
  return <SidePanel skeletonRows={columns.length} isOpen={!!item} loading={!!item && !loaded && !error} title={item ? columns[0]?.render(loaded || item) : ""} onClose={onClose}
    footer={onEdit && item ? <Button variant="outline" disabled={!loaded} onClick={() => { if (loaded) { onClose(); onEdit(loaded); } }}>{editLabel}</Button> : undefined}>
    {error ? <div role="alert" className="space-y-3 text-sm text-gray-600"><p>{t("previewError")}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>{t("previewRetry")}</Button></div> : loaded && <SidePanelDetails fields={columns.map(column => ({ label: column.label, value: column.render(loaded) }))}/>}
  </SidePanel>;
}
