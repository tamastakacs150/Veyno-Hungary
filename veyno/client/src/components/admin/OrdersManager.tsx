//client/src/components/admin/OrdersManager.tsx
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, Package, User, MapPin, CreditCard, Truck, Ticket } from "lucide-react";
import api from "@/utils/api";
import resolveImg, { candidatesFor } from "@/utils/resolveImg.js";
import { useCurrency } from "@/context/CurrencyContext";

interface Order {
  _id: string;
  orderNumber?: string;
  customer: {
    name: string;
    email: string;
    address: string;
    phone: string;
  };
  items: Array<{
    productId: any;
    title?: string;
    price?: number;
    quantity?: number;
    image?: string;
  }>;
  totalAmount: number;
  status: string;
  createdAt: string;
  paymentMethod: string;
  shippingMethod?: string;
  shippingCost?: number;
  couponCode?: string;
  discount?: number;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { format, rates } = useCurrency();

  // --- Search field ---
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");

  useEffect(() => {
    fetchOrders(submittedQ);
  }, [submittedQ]);

  // --- Automatic search debounced ---
  useEffect(() => {
    const id = setTimeout(() => {
      setSubmittedQ(q.trim());
    }, 400); // wait 400ms before actually searching
    return () => clearTimeout(id);
  }, [q]);

  const normalizeUSD = (value: number) => {
    if (value >= 200 && (rates?.HUF || 0)) return value / (rates.HUF || 370);
    return value;
  };

  // Normalize for different backend field names
  const normalizeOrder = (o: any): Order => {
    const itemsSrc = Array.isArray(o?.items)
      ? o.items
      : Array.isArray(o?.products)
      ? o.products
      : [];
    const items = itemsSrc.map((it: any) => {
      const prod =
        typeof it?.productId === "object" ? it.productId : it?.product || {};
      const price = Number(it?.price ?? it?.unitPrice ?? prod?.price ?? 0);
      const qty = Number(it?.quantity ?? it?.qty ?? 1);
      return {
        productId: prod || it?.productId || it?.id || "",
        title: it?.title || prod?.name || prod?.title || "Item",
        price,
        quantity: qty,
        image: it?.image || prod?.image || prod?.thumbnail,
      };
    });

    const subtotal = items.reduce(
      (s: number, it: any) =>
        s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
      0
    );

    // primary source of totalAmount
    const total =
      Number(o?.totalAmount) ||
      Number(o?.total) ||
      Number(o?.amount) ||
      subtotal;

    // shipping method + cost
    const shippingMethod =
      o?.shippingMethod ||
      o?.deliveryMethod ||
      o?.shipping?.method ||
      o?.shipping?.name ||
      "";

    const shippingCost =
      o?.shippingCost ??
      o?.shipping_fee ??
      o?.shipping?.cost ??
      o?.deliveryCost ??
      0;

    // coupon + discount amount
    const couponCode =
      o?.couponCode ||
      o?.coupon ||
      o?.discountCode ||
      o?.appliedCoupon ||
      o?.discount?.code ||
      "";

    const discount =
      o?.discount ??
      o?.couponDiscount ??
      o?.discountAmount ??
      o?.totalDiscount ??
      0;

    const addr =
      o?.shippingAddress?.formatted ||
      [o?.shippingAddress?.street, o?.shippingAddress?.city, o?.shippingAddress?.country]
        .filter(Boolean)
        .join(", ") ||
      o?.address ||
      o?.customer?.address ||
      "";

    const user = o?.user || o?.customer || {};
    const payment =
      o?.paymentMethod ||
      o?.payment?.method ||
      (o?.payment?.provider ? String(o.payment.provider) : "") ||
      "—";

    return {
      _id: String(o?._id || o?.id || ""),
      orderNumber: o?.orderNumber || o?.orderId || undefined,
      customer: {
        name: user?.name || user?.fullName || "—",
        email: user?.email || "—",
        address: addr,
        phone: user?.phone || user?.tel || "—",
      },
      items,
      totalAmount: total,
      status: o?.status || "pending",
      createdAt: o?.createdAt || o?.created_at || new Date().toISOString(),
      paymentMethod: payment,
      shippingMethod: shippingMethod || "—",
      shippingCost: Number(shippingCost) || 0,
      couponCode: couponCode || "",
      discount: Number(discount) || 0,
    };
  };

  const fetchOrders = async (search: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (search && search.trim()) params.q = search.trim();

      const { data } = await api.get("/admin/orders", { params });
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const normalized = list.map(normalizeOrder);
      setOrders(normalized);
    } catch (e) {
      console.error("Failed to load orders", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
    } catch (e) {
      console.error("Failed to update order status", e);
    } finally {
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-warning text-warning-foreground",
      paid: "bg-success text-success-foreground",
      processing: "bg-accent text-accent-foreground",
      shipped: "bg-primary text-primary-foreground",
      delivered: "bg-success text-success-foreground",
      cancelled: "bg-destructive text-destructive-foreground",
    };
    return colors[status] || "bg-secondary text-secondary-foreground";
  };

  const displayIdOf = (order: Order) => order.orderNumber || order._id;
  const imgFor = (productLike: any) => resolveImg(productLike);

  // --- Client-side filtering as fallback (name, email, order ID) ---
  const filtered = useMemo(() => {
    const term = (submittedQ || "").trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) => {
      const id = (displayIdOf(o) || "").toString().toLowerCase();
      const name = (o.customer?.name || "").toLowerCase();
      const email = (o.customer?.email || "").toLowerCase();
      return id.includes(term) || name.includes(term) || email.includes(term);
    });
  }, [orders, submittedQ]);

  // Calculations used in details (for CheckoutSuccess example)
  const priceBreakdown = (order: Order | null) => {
    if (!order) return { subtotal: 0, shipping: 0, discount: 0, total: 0 };

    const subtotal = (order.items || []).reduce((s, it) => {
      const qty = Number(it?.quantity ?? 1);
      const unit = Number(it?.price ?? it?.productId?.effectivePrice ?? it?.productId?.price ?? 0);
      return s + unit * qty;
    }, 0);

    const shipping = normalizeUSD(Number(order.shippingCost || 0));

    let discount = Number(order.discount || 0);
    if (discount >= 200 && (rates?.HUF || 0)) {
      discount = discount / (rates.HUF || 370);
    }

    const total = Math.max(0, subtotal - discount + shipping);
    return { subtotal, shipping, discount, total };
  };

  const breakdown = useMemo(() => priceBreakdown(selectedOrder), [selectedOrder]);

  const onSearch = () => setSubmittedQ(q);
  const onClear = () => {
    setQ("");
    setSubmittedQ("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          {/* Search bar – by order ID or customer name/email */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Input
              placeholder="Search by order number or customer name/email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
              className="w-full sm:max-w-md"
            />
            {submittedQ && (
              <Button variant="ghost" onClick={onClear}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading orders…</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((order) => (
                <div
                  key={order._id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">
                        {displayIdOf(order)}
                      </span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {order.customer.name}
                      </span>
                      <span>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                      <span>{format(priceBreakdown(order).total)}</span>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        updateOrderStatus(order._id, value)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No orders found.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Order Details –{" "}
              {selectedOrder ? displayIdOf(selectedOrder) : ""}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedOrder.customer.name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedOrder.customer.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedOrder.customer.phone}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedOrder.customer.address}
                  </CardContent>
                </Card>
              </div>

              {/* Shipping method + Coupon code */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Shipping Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedOrder.shippingMethod || "—"}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Coupon Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {selectedOrder.couponCode
                      ? selectedOrder.couponCode
                      : "—"}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => {
                      const p =
                        typeof item.productId === "object"
                          ? item.productId
                          : item;
                      const name = p?.name || item?.title || "Product";
                      const qty = Number(item?.quantity ?? 1);
                      const unit = Number(item?.price ?? p?.effectivePrice ?? p?.price ?? 0);
                      const line = unit * qty;
                      const src = imgFor(p);

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-3 border rounded-lg"
                        >
                          <img
                            src={src}
                            alt={name}
                            className="w-16 h-16 object-cover rounded bg-background"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement;
                              const list = candidatesFor(p, 1);
                              const next = list.find((u) => u !== el.src);
                              el.src = next || "/placeholder.svg";
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(unit)} × {qty}
                            </div>
                          </div>
                          <div className="font-semibold">
                            {format(line)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* === Price breakdown BELOW, according to CheckoutSuccess logic === */}
                  <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">
                        {format(breakdown.subtotal)}
                      </span>
                    </div>

                    {(selectedOrder.couponCode || breakdown.discount > 0) && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount{selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ""}</span>
                        <span className="font-medium">
                          -{format(breakdown.discount)}
                        </span>
                      </div>
                    )}

                    {selectedOrder.shippingMethod && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping{selectedOrder.shippingMethod ? ` (${selectedOrder.shippingMethod})` : ""}</span>
                        <span className="font-medium">
                          {breakdown.shipping > 0 ? `+${format(breakdown.shipping)}` : format(0)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">
                        {format(breakdown.total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>
                    <span className="font-medium">Method:</span>{" "}
                    {selectedOrder.paymentMethod}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
