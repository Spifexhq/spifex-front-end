import { api } from "@/core/api/requests";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useAuthContext } from "@/hooks/useAuth";
import { getCursorFromUrl } from "@/lib/list";
import type { EntryFilters } from "@/models/components/filterBar";
import { entryQuery, type FinancialEntry } from "./entryRows";
export function useEntries(filters: EntryFilters | undefined, settled: boolean) {
    const { organization } = useAuthContext();
    return useCursorPager<FinancialEntry>(async (cursor, page_size) => { const params = { ...entryQuery(filters, settled), cursor, page_size }; const { data } = settled ? await api.getSettledEntriesTable(params) : await api.getEntriesTable(params); return { items: data.results, nextCursor: getCursorFromUrl(data.next), totalCount: "count" in data && typeof data.count === "number" ? data.count : undefined }; }, { accumulate: true, deps: [filters, settled, organization?.organization?.id] });
}
