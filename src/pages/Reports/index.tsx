import { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { useRequests } from "@/api/requests";
import { Entry } from "@/models/Entries";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

const Report = () => {
  const { getEntries } = useRequests();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getEntries(10000, 0);
        setEntries(response.data?.entries ?? []);
      } catch (e) {
        console.error("Failed to fetch entries", e);
        setError("Erro ao buscar lançamentos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getEntries]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { amount: number; isPositive: boolean }> = {};

    entries.forEach((entry) => {
      const monthKey = dayjs(entry.due_date)
        .startOf("month")
        .format("YYYY-MM");
      const amount = parseFloat(entry.amount);
      const isCredit = entry.transaction_type === "credit";
      const signedAmount = isCredit ? amount : -amount;

      if (!map[monthKey]) {
        map[monthKey] = { amount: signedAmount, isPositive: signedAmount >= 0 };
      } else {
        map[monthKey].amount += signedAmount;
        map[monthKey].isPositive = map[monthKey].amount >= 0;
      }
    });

    const monthsSorted = Object.keys(map).sort();

    const currentMonthKey = dayjs().startOf("month").format("YYYY-MM");
    if (!map[currentMonthKey]) {
      map[currentMonthKey] = { amount: 0, isPositive: true };
      monthsSorted.push(currentMonthKey);
      monthsSorted.sort();
    }

    if (monthsSorted.length > 24) {
      const currentIndex = monthsSorted.indexOf(currentMonthKey);
      let start = currentIndex - 11;
      if (start < 0) start = 0;

      let end = start + 24;
      if (end > monthsSorted.length) {
        end = monthsSorted.length;
        start = end - 24;
      }

      monthsSorted.splice(0, start);
      monthsSorted.splice(24);
    }

    return monthsSorted.map((key) => ({
      monthKey: key,
      month: dayjs(key).format("MMM/YY"),
      amount: map[key].amount,
      isPositive: map[key].isPositive,
    }));
  }, [entries]);

  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    []
  );

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        handleOpenModal={() => {}}
        handleOpenTransferenceModal={() => {}}
        mode="default"
      />

      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        <div className="mt-[80px] w-full px-10 py-6">
          <h1 className="text-2xl font-semibold mb-6">
            Relatório de Fluxo de Caixa
          </h1>

          {loading && <p className="text-sm">Carregando…</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}

          {!loading && !error && (
            <div className="w-full h-80 bg-gray-100 rounded-xl p-4 shadow-lg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#374151", fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: "#374151", fontSize: 12 }}
                    tickFormatter={(v: number) =>
                      v.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        minimumFractionDigits: 0,
                      })
                    }
                  />
                  <Tooltip
                    labelClassName="text-sm"
                    formatter={(value: number) => [
                      value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }),
                      "Saldo",
                    ]}
                    contentStyle={{ backgroundColor: "#F9FAFB", border: "1px solid #D1D5DB", color: "#111827" }}
                    cursor={{ fill: "#E5E7EB", opacity: 0.6 }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isPositive ? "#1E3A8A" : "#991B1B"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Report;
