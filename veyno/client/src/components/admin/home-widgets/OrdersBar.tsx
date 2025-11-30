// client/src/components/admin/home-widgets/OrdersBar.tsx
import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Row = { name: string; orders: number };

export default memo(function OrdersBar({ data }: { data: Row[] }) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          // symmetrical margin – balance the left Y axis to the right
          margin={{ top: 8, right: 40, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" className="text-xs" />
          {/* fixed width + small tick margin to avoid optically shifting the chart to the right */}
          <YAxis className="text-xs" width={40} tickMargin={8} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
          />
          <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
