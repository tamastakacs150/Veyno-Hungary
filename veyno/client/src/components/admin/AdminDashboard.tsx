//client/src/components/admin/AdminDashboard.tsx
import { useState, Suspense, lazy } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Package, ShoppingCart, Percent, Mail, Send, BrainCircuit, Inbox, RotateCcw } from "lucide-react";
import "../../styles/AdminDashboard.css";

const DashboardHome = lazy(() => import("@/components/admin/DashboardHome"));
const OrdersManager = lazy(() => import("@/components/admin/OrdersManager"));
const ProductsManager = lazy(() => import("@/components/admin/ProductsManager"));
const SalesManager = lazy(() => import("@/components/admin/SalesManager"));
const NewsletterManager = lazy(() => import("@/components/admin/NewsletterManager"));
const CustomerEmailManager = lazy(() => import("@/components/admin/CustomerEmailManager"));
const AiMarketingAssistant = lazy(() => import("@/components/admin/AiMarketingAssistant"));
const MessagesManager = lazy(() => import("@/components/admin/MessagesManager"));
const ReturnsManager = lazy(() => import("@/components/admin/ReturnsManager"));

export default function AdminDashboard() {
  const [tab, setTab] = useState("home");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Dashboard Veyno
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-6 pt-2 sm:pt-8 pb-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto w-full max-w-6xl gap-2 mb-8 [&>button>svg]:h-4 [&>button>svg]:w-4 [&>button>svg]:shrink-0">
            <TabsTrigger value="home"><LayoutDashboard className="h-4 w-4" />Home</TabsTrigger>
            <TabsTrigger value="returns"><RotateCcw className="h-4 w-4" />Returns</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4" />Orders</TabsTrigger>
            <TabsTrigger value="products"><Package className="h-4 w-4" />Products</TabsTrigger>
            <TabsTrigger value="sales"><Percent className="h-4 w-4" />Sales</TabsTrigger>
            <TabsTrigger value="newsletter"><Mail className="h-4 w-4" />Newsletter</TabsTrigger>
            <TabsTrigger value="email"><Send className="h-4 w-4" />Email</TabsTrigger>
            <TabsTrigger value="messages"><Inbox className="h-4 w-4" />Messages</TabsTrigger>
            <TabsTrigger value="aimarketing"><BrainCircuit className="h-4 w-4" />Ai Assistant</TabsTrigger>
          </TabsList>


          <Suspense fallback={<p>Loading...</p>}>
            <TabsContent value="home" className="admin-content"><DashboardHome /></TabsContent>
            <TabsContent value="orders" className="admin-content"><OrdersManager /></TabsContent>
            <TabsContent value="products" className="admin-content"><ProductsManager /></TabsContent>
            <TabsContent value="returns" className="admin-content"><ReturnsManager /></TabsContent>
            <TabsContent value="sales" className="admin-content"><SalesManager /></TabsContent>
            <TabsContent value="newsletter" className="admin-content"><NewsletterManager /></TabsContent>
            <TabsContent value="email" className="admin-content"><CustomerEmailManager /></TabsContent>
            <TabsContent value="messages" className="admin-content"><MessagesManager /></TabsContent>
            <TabsContent value="aimarketing" className="admin-content"><AiMarketingAssistant /></TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
}