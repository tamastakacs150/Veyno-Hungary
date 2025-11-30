//client/src/components/admin/NewsletterManager.tsx
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Send, Users } from "lucide-react";

type Stats = {
  totalSubscribers: number;
  sentThisMonth: number;
  avgOpenRate: number; // 0..100
};

export default function NewsletterManager() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem("NEWSLETTER_ADMIN_TOKEN") || "");
  const authHeaders = useMemo(() => (adminToken ? { "X-Newsletter-Token": adminToken } : {}), [adminToken]);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalSubscribers: 0,
    sentThisMonth: 0,
    avgOpenRate: 0,
  });

  async function loadStats() {
    try {
      const r = await fetch("/api/admin/newsletter/stats", { credentials: "include" });
      if (!r.ok) throw new Error("stats failed");
      const data = await r.json();
      setStats({
        totalSubscribers: Number(data?.totalSubscribers || 0),
        sentThisMonth: Number(data?.sentThisMonth || 0),
        avgOpenRate: Number(data?.avgOpenRate || 0),
      });
    } catch (e) {
      console.error(e);
      setStats({ totalSubscribers: 0, sentThisMonth: 0, avgOpenRate: 0 });
    }
  }

  useEffect(() => { loadStats(); }, []);

  const handleSendNewsletter = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include", 
        body: JSON.stringify({ subject, html: content }),
      });


      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send newsletter");
      }

      const res = await response.json();
      toast.success(`Newsletter sent to ${res?.sent ?? 0} subscribers`);
      setSubject("");
      setContent("");
      loadStats();
    } catch (error: any) {
      toast.error(error?.message || "Failed to send newsletter");
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handlePreviewTemplate = async () => {
    try {
      const name = prompt("Enter template filename (without .html):");
      if (!name) return;
      const token = prompt("Enter admin token (X-Newsletter-Token):") || "";
      const r = await fetch(`/api/newsletter/preview?template=${encodeURIComponent(name)}&wrapped=1`, {
        headers: { "X-Newsletter-Token": token },
      });
      const html = await r.text();
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load template preview");
    }
  };

  function buildVeynoPreviewHtml(rawHtml: string, to = "preview@example.com") {
    const FRONT = (typeof window !== "undefined" ? window.location.origin : "") || "";
    return `<!DOCTYPE html>
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
    <style>
    @media only screen and (max-width: 600px) {
      .email-container { width:100% !important; }
      .email-header { padding:32px 24px 24px !important; }
      .email-content { padding:32px 24px !important; }
      .email-footer { padding:16px 24px !important; }
    }
    .text-black { color:#000 !important; }
    </style>
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0;padding:24px 12px;">
    <tr><td align="center" style="margin:0;padding:0;">
      <table role="presentation" class="email-container" style="max-width:600px;width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e5e5;">
        <tr><td style="padding:0;margin:0;">

          <div class="email-header" style="padding:48px 48px 32px;border-bottom:2px solid #000;">
            <h1 style="margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:-0.5px;color:#000;">VEYNO</h1>
            <div style="height:4px;width:48px;background:#000;"></div>
          </div>

          <div class="email-content" style="padding:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
            ${rawHtml || "<p><i>No content</i></p>"}
            <div style="text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #e5e5e5;">
              <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 12px;">
                You are receiving this email because you subscribed to the VEYNO newsletter.
              </p>
              <a href="${FRONT}/unsubscribe?email=${encodeURIComponent(to)}"
                style="display:inline-block;padding:10px 20px;border:1px solid #000;color:#000;text-decoration:none;
                        font-size:12px;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">
                Unsubscribe
              </a>
            </div>
          </div>

          <div class="email-footer" style="padding:24px 48px;border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">ÂŠ ${new Date().getFullYear()} VEYNO. All rights reserved.</p>
          </div>

        </td></tr>
      </table>
    </td></tr>
    </table>
    </body></html>`;
  }

  return (
    
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Subscribers
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Active subscribers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent This Month
            </CardTitle>
            <Mail className="w-5 h-5 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.sentThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Newsletters delivered</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Open Rate
            </CardTitle>
            <Send className="h-5 w-5 text-black" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(stats.avgOpenRate)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Create Newsletter
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              placeholder="Enter newsletter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Email Content</Label>
            <Textarea
              id="content"
              placeholder="Write your newsletter content here... (HTML supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              HTML content is supported. Make sure to test before sending.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSendNewsletter} disabled={sending} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Newsletter"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  const wrapped = buildVeynoPreviewHtml(content, "preview@example.com");
                  w.document.write(wrapped);
                  w.document.close();
                }
              }}
            >
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}