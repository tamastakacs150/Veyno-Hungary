//client/src/components/admin/DashboardHome.tsx
import { useEffect, useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, ShoppingCart, Wallet } from "lucide-react";
import api from "@/utils/api";
import { useCurrency } from "@/context/CurrencyContext";

const OrdersBar = lazy(() => import("./home-widgets/OrdersBar"));
const SalesChart = lazy(() => import("./home-widgets/SalesChart"));

interface Stats {
  newUsers: number;
  newOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  userGrowth: number;
  orderGrowth: number;
  revenueGrowth: number;
  aovGrowth: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats>({
    newUsers: 0,
    newOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    userGrowth: 0,
    orderGrowth: 0,
    revenueGrowth: 0,
    aovGrowth: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const { format, rates } = useCurrency();

  useEffect(() => {
    let alive = true;

    const normalizeUSD = (value: number) => {
      if (value >= 200 && (rates?.HUF || 0)) return value / (rates.HUF || 370);
      return value;
    };

    const dayMs = 24 * 60 * 60 * 1000;
    const inRange = (t: any, a: number, b: number) => {
      const ts = new Date(t).getTime();
      return Number.isFinite(ts) && ts >= a && ts < b;
    };
    const getOrderTotal = (o: any) => {
      if (typeof o?.totalAmount === "number") return o.totalAmount;
      if (typeof o?.total === "number") return o.total;
      if (typeof o?.amount === "number") return o.amount;
      if (Array.isArray(o?.items)) {
        return o.items.reduce(
          (s: number, it: any) =>
            s + (Number(it.price) || 0) * (Number(it.quantity ?? it.qty) || 1),
          0
        );
      }
      return 0;
    };
    const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
    const pct = (cur: number, prev: number) =>
      prev <= 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    (async () => {
      try {
        // Orders
        const { data: orders } = await api.get("/admin/orders");
        if (!alive) return;

        const now = Date.now();
        const startCur = now - dayMs;
        const startPrev = now - 2 * dayMs;
        const endPrev = startCur;

        const curOrdersArr = (orders || []).filter((o: any) =>
          inRange(o.createdAt, startCur, now)
        );
        const prevOrdersArr = (orders || []).filter((o: any) =>
          inRange(o.createdAt, startPrev, endPrev)
        );

        const curOrders = curOrdersArr.length;
        const prevOrders = prevOrdersArr.length;

        const curRevenue = curOrdersArr.reduce((s, o) => s + normalizeUSD(getOrderTotal(o)), 0);
        const prevRevenue = prevOrdersArr.reduce((s, o) => s + normalizeUSD(getOrderTotal(o)), 0);
        const totalRevenue = (orders || []).reduce((s, o) => s + normalizeUSD(getOrderTotal(o)), 0);

        const avgOrderValue =
          (orders?.length || 0) > 0
            ? Math.round(totalRevenue / orders.length)
            : 0;

        const curAov = curOrders > 0 ? Math.round(curRevenue / curOrders) : 0;
        const prevAov = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

        // Users (if there is an endpoint)
        let curUsers = 0;
        let prevUsers = 0;
        try {
          const { data: users } = await api.get("/admin/users");
          curUsers = (users || []).filter((u: any) =>
            inRange(u.createdAt, startCur, now)
          ).length;
          prevUsers = (users || []).filter((u: any) =>
            inRange(u.createdAt, startPrev, endPrev)
          ).length;
        } catch {}

        // 7-day daily breakdown
        const byDay: Record<string, { name: string; orders: number; revenue: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now - i * dayMs);
          const key = weekdayFmt.format(d);
          byDay[key] = { name: key, orders: 0, revenue: 0 };
        }
        for (const o of orders || []) {
          const d = new Date(o.createdAt);
          const key = weekdayFmt.format(d);    
          if (byDay[key]) {
            byDay[key].orders += 1;
            byDay[key].revenue += normalizeUSD(getOrderTotal(o));
          }
        }

        setStats({
          newUsers: curUsers,
          newOrders: curOrders,
          totalRevenue,
          avgOrderValue,
          userGrowth: pct(curUsers, prevUsers),
          orderGrowth: pct(curOrders, prevOrders),
          revenueGrowth: pct(curRevenue, prevRevenue),
          aovGrowth: pct(curAov, prevAov),
        });

        setChartData(Object.values(byDay));
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const statCards = [
    { title: "New Users",       value: stats.newUsers,                   change: stats.userGrowth,    icon: Users,         color: "text-primary" },
    { title: "New Orders",      value: stats.newOrders,                  change: stats.orderGrowth,   icon: ShoppingCart,  color: "text-black" },
    { title: "Total Revenue",   value: format(stats.totalRevenue), change: stats.revenueGrowth, icon: Wallet,        color: "text-black" },
    { title: "Avg Order Value", value: format(stats.avgOrderValue), change: stats.aovGrowth,     icon: TrendingUp,   color: "text-warning" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI cards – lightweight component, can stay here */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <div className="flex items-center text-sm mt-2">
                  {card.change >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500 font-medium">
                        +{Math.abs(card.change)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 rotate-180 text-red-500 mr-1" />
                      <span className="text-red-500 font-medium">
                        -{Math.abs(card.change)}%
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-1">from last period</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Graphics sections – only here are the big libs loaded */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <Suspense fallback={<Skeleton height={300} />}>
              <OrdersBar data={chartData} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <Suspense fallback={<Skeleton height={300} />}>
              <SalesChart data={chartData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Skeleton({ height = 120 }: { height?: number }) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardContent>
        <div className="animate-pulse bg-muted rounded-xl w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}
