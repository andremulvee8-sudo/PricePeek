"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryItem = {
  price: number;
  checkedAt: string;
};

type PriceHistoryChartProps = {
  productId: string;
};

export default function PriceHistoryChart({
  productId,
}: PriceHistoryChartProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const deviceId = window.localStorage.getItem(
        "pricepeek-device-id"
      );

      if (!deviceId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/price-history?productId=${encodeURIComponent(
            productId
          )}&deviceId=${encodeURIComponent(deviceId)}`
        );

        const data = await response.json();

        if (response.ok) {
          setHistory(data.history ?? []);
        }
      } catch (error) {
        console.error("Could not load price history:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [productId]);

  if (isLoading) {
    return (
      <p className="mt-4 text-sm text-slate-400">
        Loading price history...
      </p>
    );
  }

  if (history.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate-400">
        Price history will appear after the next automatic check.
      </p>
    );
  }

  const chartData = history.map((item) => ({
    price: item.price,
    date: new Date(item.checkedAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="mt-5">
      <p className="mb-3 text-sm font-semibold text-slate-300">
        Price History
      </p>

      <div className="h-48 w-full rounded-xl bg-slate-900/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              stroke="#334155"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              width={55}
              domain={["auto", "auto"]}
              tickFormatter={(value) => `€${Number(value).toFixed(0)}`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "12px",
              }}
              formatter={(value) => [
                `€${Number(value).toFixed(2)}`,
                "Price",
              ]}
            />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ fill: "#22c55e", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}