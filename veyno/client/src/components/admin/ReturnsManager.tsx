// client/src/components/admin/ReturnsManager.tsx
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import api from "@/utils/api";
import { RotateCcw, Search } from "lucide-react";

interface ReturnRequest {
    _id: string;
    status: string;
    reason?: string;
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
    order?: {
        _id: string;
        orderNumber?: string;
        totalAmount?: number;
        displayCurrency?: string;
    };
    user?: {
        _id: string;
        email?: string;
        name?: string;
    };
}

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    received: "Received",
    refunded: "Refunded",
};

export default function ReturnsManager() {
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const loadReturns = async () => {
        try {
            setIsLoading(true);
            const params: any = {};
            if (statusFilter && statusFilter !== "all") params.status = statusFilter;

            const { data } = await api.get("/admin/returns", { params });
            setReturns(data?.items || []);
        } catch (err) {
            console.error("Failed to load returns", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReturns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const filtered = returns.filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            r.order?.orderNumber?.toLowerCase().includes(q) ||
            r.user?.email?.toLowerCase().includes(q) ||
            r.reason?.toLowerCase().includes(q)
        );
    });

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { data } = await api.patch(`/admin/returns/${id}`, { status: newStatus });
            setReturns((prev) => prev.map((r) => (r._id === id ? { ...r, ...data } : r)));
        } catch (err) {
            console.error("Failed to update return status", err);
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <RotateCcw size={18} />
                        <CardTitle>Returns</CardTitle>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="received">Received</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 opacity-60" />
                            <Input
                                className="pl-8 w-[220px]"
                                placeholder="Search by order, email, reason..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <Button variant="outline" size="sm" onClick={loadReturns}>
                            Refresh
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading && <p>Loading returns…</p>}

                    {!isLoading && filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground">No return requests found.</p>
                    )}

                    {!isLoading && filtered.length > 0 && (
                        <div className="space-y-3">
                            {filtered.map((r) => (
                                <div
                                    key={r._id}
                                    className="border rounded-xl px-3 py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium">
                                                Order: {r.order?.orderNumber || r.order?._id || "—"}
                                            </span>
                                            <Badge variant="outline">
                                                {STATUS_LABELS[r.status] || r.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {r.user?.email && <>Customer: {r.user.email}</>}
                                        </div>
                                        {r.reason && (
                                            <div className="text-xs">
                                                <span className="font-medium">Reason: </span>
                                                {r.reason}
                                            </div>
                                        )}
                                        <div className="text-[11px] text-muted-foreground">
                                            Requested: {new Date(r.createdAt).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                                        <Select
                                            value={r.status}
                                            onValueChange={(val) => updateStatus(r._id, val)}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="received">Received</SelectItem>
                                                <SelectItem value="refunded">Refunded</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
