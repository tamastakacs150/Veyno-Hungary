//client/src/components/admin/SalesManager.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Percent, Calendar, Trash2, Edit, Tag, Package, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import resolveImg from "@/utils/resolveImg";
import { useCurrency } from "@/context/CurrencyContext";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  currentSale?: {
    discountType: "percentage" | "fixed";
    discountValue: number;
    endDate: string;
  };
}

interface ProductSale {
  id: string;
  productIds: string[];
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string;
  endDate: string;
  minPurchase: number;
  maxUses: number;
  currentUses: number;
  active: boolean;
  expired?: boolean;
  activeNow?: boolean;
}

type P = {
  _id: string;
  name: string;
  price?: number;
  effectivePrice?: number;
  images?: string[];
  image?: string;
  brand?: string;
  category?: string;
  createdAt?: string | Date;
  ratingAvg?: number;
  sale?: { active?: boolean };
  variants?: Array<{ size?: string; stock?: number }>;
};

function toCardProduct(p: P) {

  const price = Number(p?.effectivePrice ?? p?.price ?? 0);
  const originalPrice =
    p?.sale?.active && p?.price && price < Number(p.price) ? Number(p.price) : undefined;

  const isNew =
    p?.createdAt
      ? (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24) < 30
      : false;

  const rating =
    typeof p?.ratingAvg === "number"
      ? Math.max(0, Math.min(5, Math.round(p.ratingAvg)))
      : 0;

  const sizes = Array.isArray(p?.variants)
    ? p.variants
        .filter((v) => v?.size && Number(v?.stock ?? 0) > 0)
        .map((v) => String(v.size))
    : [];

  return {
    id: String(p._id),
    name: p.name,
    price,
    originalPrice,
    onSale: Boolean(p?.sale?.active),
    isNew,
    rating,
    sizes,
  };
}

function isSaleActiveLocal(endDate?: string | Date, startDate?: string | Date) {
  const now = Date.now();

  const parseLocalStartOfDay = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(dd)
      ? new Date(y, m - 1, dd, 0, 0, 0, 0).getTime()
      : NaN;
  };
  const parseLocalEndOfDay = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(dd)
      ? new Date(y, m - 1, dd, 23, 59, 59, 999).getTime()
      : NaN;
  };

  if (startDate) {
    const startTs =
      typeof startDate === "string"
        ? (startDate.includes("T") ? new Date(startDate).getTime() : parseLocalStartOfDay(startDate))
        : new Date(startDate).getTime();
    if (!Number.isFinite(startTs) || now < startTs) return false;
  }

  if (!endDate) return true;

  const endTs =
    typeof endDate === "string"
      ? (endDate.includes("T") ? new Date(endDate).getTime() : parseLocalEndOfDay(endDate))
      : new Date(endDate).getTime();

  if (!Number.isFinite(endTs)) return false;
  return now <= endTs;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SalesManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const [saleFormData, setSaleFormData] = useState({
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    startDate: todayStr(),
    endDate: "",
  });

  const [couponFormData, setCouponFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    startDate: todayStr(),
    endDate: "",
    minPurchase: "",
    maxUses: "",
  });

  // search/browse for products
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(30);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");

  const { format, rates } = useCurrency();
  const normalizeUSD = (value: number) => {
    if (value >= 200 && (rates?.HUF || 0)) return value / (rates.HUF || 370);
    return value; 
  };

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q.trim());
      setSkip(0);
    }, 300); // 300ms debounce
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    fetchProducts();
    fetchCoupons();
  }, [limit, skip, debouncedQ]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const params = new URLSearchParams({
        fields: "_id,name,price,effectivePrice,category,image,sale",
        limit: String(limit),
        skip: String(skip),
      });
      if (debouncedQ) params.set("q", debouncedQ);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();

      const items = Array.isArray(data.items) ? data.items : [];
      const mapped: Product[] = items.map((p: any) => {
        const sale = p?.sale || {};
        const price = Number(p?.price ?? 0);
        const effective = Number(p?.effectivePrice ?? price);

        // dates can come from the backend with different names
        const start = sale.startAt || sale.startDate || "";
        const end   = sale.endAt   || sale.endDate   || "";

        // Consider it a sale if: according to the backend it is active, AND it is still active in time, AND it is really cheaper than effective
        const onSale = !!sale?.active && isSaleActiveLocal(end, start) && effective < price;

        const internalImg = resolveImg(p) || "/placeholder.svg";

        return {
          id: String(p._id),
          name: p.name,
          // The price displayed on the card is always the effectivePrice
          price: effective,
          category: p.category || "Other",
          image: internalImg,
          ...(onSale
            ? {
                currentSale: {
                  discountType: sale.type === "amount" ? "fixed" : "percentage",
                  discountValue: Number(sale.value || 0),
                  endDate: end,
                },
              }
            : {}),
        };
      });

      setProducts(mapped);
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading products", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await fetch(`/api/admin/coupons`);
      if (!res.ok) throw new Error("Failed to load coupons");
      const data = await res.json();
      const mapped: (Coupon & { expired: boolean; activeNow: boolean })[] =
        (Array.isArray(data.items) ? data.items : []).map((c: any) => {
          const expired = c.endDate ? !isSaleActiveLocal(c.endDate, c.startDate) : false;
          const activeNow = !!c.active && !expired && isSaleActiveLocal(c.endDate, c.startDate);
          return {
            id: String(c._id),
            code: c.code,
            discountType: c.discountType, // "percentage" | "fixed"
            discountValue: Number(c.discountValue || 0),
            startDate: c.startDate,
            endDate: c.endDate,
            minPurchase: Number(c.minPurchase || 0),
            maxUses: Number(c.maxUses || 0),
            currentUses: Number(c.currentUses || 0),
            active: !!c.active,
            expired,
            activeNow,
          };
      });
      setCoupons(mapped);
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading coupons", variant: "destructive" });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleApplySale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select at least one product to apply the sale.",
        variant: "destructive",
      });
      return;
    }

    if (!saleFormData.discountValue.trim()) {
      toast({ title: "Enter the discount value", variant: "destructive" });
      return;
    }

    // Backend 'type' field: 'percent' | 'amount'
    const apiType = saleFormData.discountType === "fixed" ? "amount" : "percent";
    const valueNum = Number(saleFormData.discountValue);

    let ok = 0,
      fail = 0;

    for (const productId of selectedProducts) {
      try {
        const r = await fetch("/api/admin/sales/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            type: apiType,
            value: valueNum,
            label: "",
            start: saleFormData.startDate || null,
            end: saleFormData.endDate || null,
          }),
        });
        if (!r.ok) throw new Error();
        ok++;
      } catch {
        fail++;
      }
    }

    // UI update
    setProductSales((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productIds: [...selectedProducts],
        discountType: saleFormData.discountType,
        discountValue: valueNum,
        startDate: saleFormData.startDate,
        endDate: saleFormData.endDate,
        active: true,
      },
    ]);

    toast({
      title: "Sale applied",
      description: `Success: ${ok} • Failed: ${fail}`,
    });

    // empty + reload
    resetSaleForm();
    await fetchProducts();
  };

  const removeProductSale = async (productId: string) => {
    try {
      const r = await fetch("/api/admin/sales/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!r.ok) throw new Error();
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, currentSale: undefined } : p))
      );
      toast({ title: "Sale removed from product" });
    } catch {
      toast({ title: "Failed to remove sale", variant: "destructive" });
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      code: couponFormData.code.toUpperCase().trim(),
      discountType: couponFormData.discountType, // "percentage" | "fixed"
      discountValue: Number(couponFormData.discountValue),
      startDate: couponFormData.startDate,
      endDate: couponFormData.endDate,
      minPurchase: couponFormData.minPurchase ? Number(couponFormData.minPurchase) : 0,
      maxUses: couponFormData.maxUses ? Number(couponFormData.maxUses) : 0,
    };

    try {
      if (editingCoupon) {
        const r = await fetch(`/api/admin/coupons/${editingCoupon.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error();
        toast({ title: "Coupon updated successfully" });
      } else {
        const r = await fetch(`/api/admin/coupons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error();
        toast({ title: "Coupon created successfully" });
      }
      resetCouponForm();
      fetchCoupons();
    } catch {
      toast({ title: "Coupon save failed", variant: "destructive" });
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      startDate: coupon.startDate?.slice(0, 10) || "",
      endDate: coupon.endDate?.slice(0, 10) || "",
      minPurchase: String(coupon.minPurchase ?? ""),
      maxUses: String(coupon.maxUses ?? ""),
    });
    setIsCouponDialogOpen(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const r = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast({ title: "Coupon deleted successfully", variant: "destructive" });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const toggleCouponActive = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/coupons/${id}/toggle`, { method: "PATCH" });
      if (!r.ok) throw new Error();
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
    } catch {
      toast({ title: "Toggle failed", variant: "destructive" });
    }
  };

  const resetSaleForm = () => {
    setSaleFormData({
      discountType: "percentage",
      discountValue: "",
      startDate: todayStr(),
      endDate: "",
    });
    setSelectedProducts([]);
    setIsSaleDialogOpen(false);
  };

  const resetCouponForm = () => {
    setCouponFormData({
      code: "",
      discountType: "percentage",
      discountValue: "",
      startDate: todayStr(),
      endDate: "",
      minPurchase: "",
      maxUses: "",
    });
    setEditingCoupon(null);
    setIsCouponDialogOpen(false);
  };

  const allOnPageSelected = useMemo(
    () => products.length > 0 && products.every((p) => selectedProducts.includes(p.id)),
    [products, selectedProducts]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales & Promotions Manager</h1>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Sales
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Coupon Codes
            </TabsTrigger>
          </TabsList>

          {/* Product Sales Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Product Sales</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select products and apply discounts
                </p>
              </div>
              <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={selectedProducts.length === 0}
                    onClick={() => setIsSaleDialogOpen(true)}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Apply or Modify Sale to Selected ({selectedProducts.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Apply Sale to {selectedProducts.length} Product(s)</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleApplySale} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="discountType">Discount Type *</Label>
                        <Select
                          value={saleFormData.discountType}
                          onValueChange={(value: "percentage" | "fixed") =>
                            setSaleFormData({ ...saleFormData, discountType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discountValue">
                          Value * {saleFormData.discountType === "percentage" ? "(%)" : "($)"}
                        </Label>
                        <Input
                          id="discountValue"
                          type="number"
                          step="0.01"
                          value={saleFormData.discountValue}
                          onChange={(e) =>
                            setSaleFormData({ ...saleFormData, discountValue: e.target.value })
                          }
                          placeholder={saleFormData.discountType === "percentage" ? "25" : "10.00"}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={saleFormData.startDate}
                          onChange={(e) =>
                            setSaleFormData({ ...saleFormData, startDate: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={saleFormData.endDate}
                          onChange={(e) =>
                            setSaleFormData({ ...saleFormData, endDate: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        Apply Sale
                      </Button>
                      <Button type="button" variant="outline" onClick={resetSaleForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {selectedProducts.length > 0 && (
              <div className="bg-accent/10 border border-accent rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{selectedProducts.length} selected</Badge>
                  <span className="text-sm text-muted-foreground">
                    Click "Apply Sale to Selected" to add discounts
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProducts([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${
                    selectedProducts.includes(product.id)
                      ? "ring-2 ring-primary shadow-lg"
                      : ""
                  }`}
                  onClick={() => handleProductSelection(product.id)}
                >
                  <CardHeader className="p-0">
                    <div className="relative">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-80 object-cover rounded-t-lg"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                      <div className="absolute top-3 left-3">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => handleProductSelection(product.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-background/90 border-2"
                        />
                      </div>
                      {product.currentSale && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-destructive">
                            <Percent className="h-3 w-3 mr-1" />
                            {product.currentSale.discountType === "percentage"
                              ? `${product.currentSale.discountValue}% OFF`
                              : `${format(Number(product.currentSale.discountValue))} OFF`}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {product.category}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {product.currentSale ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-destructive">
                              {format(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold">{format(product.price)}</span>
                        )}
                      </div>

                      {product.currentSale && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProductSale(product.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {product.currentSale && product.currentSale.endDate && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Ends: {new Date(product.currentSale.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paging + search toolbar for products */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search products..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSkip(0);
                      fetchProducts();
                    }
                  }}
                  className="w-full sm:w-[260px]"
                />
                {q && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQ("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setSkip(0); }}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 / page</SelectItem>
                    <SelectItem value="30">30 / page</SelectItem>
                    <SelectItem value="60">60 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setSkip(Math.max(0, skip - limit))} disabled={skip === 0}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSkip(skip + limit)}
                  disabled={typeof total === "number" ? skip + limit >= total : false}
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Coupon Codes Tab */}
          <TabsContent value="coupons" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Coupon Codes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage discount coupons
                </p>
              </div>
              <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetCouponForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleCouponSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Coupon Code *</Label>
                      <Input
                        id="code"
                        value={couponFormData.code}
                        onChange={(e) =>
                          setCouponFormData({
                            ...couponFormData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="e.g., SUMMER25"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="couponDiscountType">Discount Type *</Label>
                        <Select
                          value={couponFormData.discountType}
                          onValueChange={(value: "percentage" | "fixed") =>
                            setCouponFormData({ ...couponFormData, discountType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="couponDiscountValue">
                          Value * {couponFormData.discountType === "percentage" ? "(%)" : "($)"}
                        </Label>
                        <Input
                          id="couponDiscountValue"
                          type="number"
                          step="0.01"
                          value={couponFormData.discountValue}
                          onChange={(e) =>
                            setCouponFormData({
                              ...couponFormData,
                              discountValue: e.target.value,
                            })
                          }
                          placeholder={
                            couponFormData.discountType === "percentage" ? "25" : "10.00"
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="couponStartDate">Start Date *</Label>
                        <Input
                          id="couponStartDate"
                          type="date"
                          value={couponFormData.startDate}
                          onChange={(e) =>
                            setCouponFormData({ ...couponFormData, startDate: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="couponEndDate">End Date *</Label>
                        <Input
                          id="couponEndDate"
                          type="date"
                          value={couponFormData.endDate}
                          onChange={(e) =>
                            setCouponFormData({ ...couponFormData, endDate: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minPurchase">Min Purchase ($)</Label>
                        <Input
                          id="minPurchase"
                          type="number"
                          step="0.01"
                          value={couponFormData.minPurchase}
                          onChange={(e) =>
                            setCouponFormData({ ...couponFormData, minPurchase: e.target.value })
                          }
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxUses">Max Uses</Label>
                        <Input
                          id="maxUses"
                          type="number"
                          value={couponFormData.maxUses}
                          onChange={(e) =>
                            setCouponFormData({ ...couponFormData, maxUses: e.target.value })
                          }
                          placeholder="Unlimited (0)"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        {editingCoupon ? "Update Coupon" : "Create Coupon"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetCouponForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coupons.map((coupon) => (
                <Card
                  key={coupon.id}
                  className="hover:shadow-lg transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl font-mono">{coupon.code}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={coupon.expired ? "destructive" : (coupon.active ? "default" : "secondary")}>
                            {coupon.expired ? "Expired" : (coupon.active ? "Active" : "Inactive")}
                          </Badge>
                          <Badge variant="outline" className="text-primary">
                            <Percent className="h-3 w-3 mr-1" />
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% OFF`
                              : `${format(Number(coupon.discountValue))} OFF`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(coupon.startDate).toLocaleDateString()} -{" "}
                        {new Date(coupon.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Purchase:</span>
                        <span>{format(Number(coupon.minPurchase))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uses:</span>
                        <span>
                          {coupon.currentUses} / {coupon.maxUses === 0 ? "∞" : coupon.maxUses}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => !coupon.expired && toggleCouponActive(coupon.id)}
                        disabled={coupon.expired}
                        title={coupon.expired ? "This coupon is expired" : undefined}
                      >
                        {coupon.expired ? "Expired" : (coupon.active ? "Deactivate" : "Activate")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditCoupon(coupon)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
