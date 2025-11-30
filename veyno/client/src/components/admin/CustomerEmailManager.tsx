//client/src/components/admin/CustomerEmailManager.tsx
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Send, User, Eye } from "lucide-react";

type Customer = { id: string; name: string; email: string };
type RecentItem = { to: string; subject: string; date: string };

function nl2brHtml(s: string) {
  return s
    .trim()
    .split("\n")
    .map(line =>
      line === ""
        ? "<br/>"
        : line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
    )
    .join("<br/>");
}

function buildVeynoPreviewHtml(rawHtml: string, to = "preview@example.com", subject = "Preview") {
  const FRONT = (typeof window !== "undefined" ? window.location.origin : "") || "";
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
@media only screen and (max-width: 600px) {
  .email-container { width:100% !important; }
  .email-header { padding:32px 24px 24px !important; }
  .email-content { padding:32px 24px !important; }
  .email-footer { padding:16px 24px !important; }
  .email-title { font-size:24px !important; }
}
</style>
<title>${subject.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0;padding:24px 12px;">
<tr><td align="center" style="margin:0;padding:0;">
  <table role="presentation" class="email-container" style="max-width:600px;width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e5e5;">
    <tr><td style="padding:0;margin:0;">

      <div class="email-header" style="padding:48px 48px 32px;border-bottom:2px solid #000;">
        <h1 class="email-title" style="margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:-0.5px;color:#000;">VEYNO</h1>
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
        <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">© ${new Date().getFullYear()} VEYNO. All rights reserved.</p>
      </div>

    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export default function CustomerEmailManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Load: customers + recent emails
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        const [custRes, recRes] = await Promise.all([
          fetch("/api/admin/customers"),
          fetch("/api/admin/email/recent"),
        ]);

        if (!custRes.ok) throw new Error("customers load failed");
        if (!recRes.ok) throw new Error("recent load failed");

        const custData = await custRes.json();
        const recData = await recRes.json();

        if (mounted) {
          setCustomers(Array.isArray(custData.customers) ? custData.customers : []);
          const items: RecentItem[] = Array.isArray(recData.items)
            ? recData.items.map((r: any) => ({
                to: r.to,
                subject: r.subject,
                date: r.date || r.createdAt,
              }))
            : [];
          setRecent(items);
        }
      } catch (e) {
        console.error(e);
        if (mounted) toast.error("Error loading data");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSendEmail = async () => {
    if (!selectedCustomer || !subject.trim() || !message.trim()) {
      toast.error("Fill in all fields.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        to: selectedCustomer.email,
        subject,
        html: nl2brHtml(message),
      };

      const res = await fetch("/api/admin/email/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("send failed");

      toast.success(`Email sent: ${selectedCustomer.name} (${selectedCustomer.email})`);
      setSubject("");
      setMessage("");
      setSelectedCustomerId("");

      // refresh recent list
      try {
        const recRes = await fetch("/api/admin/email/recent");
        if (recRes.ok) {
          const recData = await recRes.json();
          const items: RecentItem[] = Array.isArray(recData.items)
            ? recData.items.map((r: any) => ({
                to: r.to,
                subject: r.subject,
                date: r.date || r.createdAt,
              }))
            : [];
          setRecent(items);
        }
      } catch {}
    } catch (e) {
      console.error(e);
      toast.error("Sending failed");
    } finally {
      setSending(false);
    }
  };

  const emailHeaderPreview = () => `
  <div class="email-header" style="padding:48px 48px 32px;border-bottom:2px solid #000;">
    <h1 class="email-title" style="margin:0 0 8px;font-size:32px;font-weight:700;letter-spacing:-0.5px;color:#000;">VEYNO</h1>
    <div style="height:4px;width:48px;background:#000;"></div>
  </div>`;

  const emailFooterPreview = () => `
    <div class="email-footer" style="padding:24px 48px;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">© ${new Date().getFullYear()} VEYNO. All rights reserved.</p>
    </div>`;

  const wrapEmailPreview = (inner: string) => `
  <!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8">
  <title>${subject ? subject.replace(/</g,"&lt;").replace(/>/g,"&gt;") : "Preview"}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
  @media only screen and (max-width: 600px) {
    .email-container { width:100% !important; }
    .email-header { padding:32px 24px 24px !important; }
    .email-content { padding:32px 24px !important; }
    .email-footer { padding:16px 24px !important; }
    .email-title { font-size:24px !important; }
  }
  </style>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0;padding:24px 12px;">
      <tr>
        <td align="center" style="margin:0;padding:0;">
          <table role="presentation" class="email-container" style="max-width:600px;width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e5e5;">
            <tr><td style="padding:0;margin:0;">${inner}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const handlePreview = () => {
    const bodyHtml = message.trim()
      ? nl2brHtml(message)
      : "<p style='margin:0 0 16px;font-size:15px;line-height:1.6;color:#000;'><i>No content</i></p>";

    const to = selectedCustomer?.email || "preview@example.com";
    const doc = buildVeynoPreviewHtml(bodyHtml, to, subject || "Preview");

    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(doc);
      w.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Custom Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Select Customer</Label>
            <Select
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
              disabled={loading || customers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading..." : "Choose a customer..."} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{c.name}</span>
                      <span className="text-muted-foreground text-xs">({c.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              placeholder="Write your personalized message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[250px]"
            />
            <p className="text-xs text-muted-foreground">
              HTML content is supported. Make sure to test before sending.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSendEmail} disabled={sending || !selectedCustomerId || !subject.trim() || !message.trim()} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Email"}
            </Button>
            <Button variant="outline" onClick={handlePreview}>
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Recent Custom Emails</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom emails have been sent yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((e, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{e.to}</p>
                      <p className="text-xs text-muted-foreground">{e.subject}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
