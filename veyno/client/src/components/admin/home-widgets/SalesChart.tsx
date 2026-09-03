// client/src/components/admin/home-widgets/SalesChart.tsx
import { memo } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Row = { name: string; revenue: number };

export default memo(function SalesChart({ data }: { data: Row[] }) {
  
  const { format } = useCurrency();
  
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
                    
          margin={{ top: 8, right: 40, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" className="text-xs" />

          <YAxis
            className="text-xs"
            width={40}
            tickMargin={8}
            tickFormatter={(v) => format(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value) => [format(Number(value)), "Revenue"] as [string, string]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#000"
            strokeWidth={3}
            dot={{ fill: "#000", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
