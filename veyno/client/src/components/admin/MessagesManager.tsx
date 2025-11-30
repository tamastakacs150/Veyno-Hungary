// client/src/components/admin/MessagesManager.tsx
import { useState, useEffect } from "react";
import api from "../../utils/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Inbox, Send } from "lucide-react";

type Message = {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: "new" | "replied";
  createdAt: string;
};

export default function MessagesManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/messages");
      setMessages(data);
    } catch (error) {
      toast.error("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleOpenReply = (message: Message) => {
    setReplyingTo(message);
    setReplyText("");
  };

  const handleSendReply = async () => {
    if (!replyingTo || !replyText.trim()) {
      toast.error("Reply message cannot be empty.");
      return;
    }
    setSending(true);
    try {
      await api.post(`/admin/messages/${replyingTo._id}/reply`, { replyText });
      toast.success("Reply sent successfully!");
      setReplyingTo(null);
      fetchMessages(); // Refresh the list
    } catch (error) {
      toast.error("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p>Loading messages...</p>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox /> Contact Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground">No messages yet.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg._id} className="border p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{msg.name} <span className="font-normal text-muted-foreground">&lt;{msg.email}&gt;</span></p>
                      <p className="text-sm text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant={msg.status === 'new' ? 'destructive' : 'secondary'}>
                      {msg.status}
                    </Badge>
                  </div>
                  <p className="bg-muted/50 p-3 rounded-md">{msg.message}</p>
                  {msg.status === 'new' && (
                    <Button onClick={() => handleOpenReply(msg)}>Reply</Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!replyingTo} onOpenChange={() => setReplyingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {replyingTo?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm border p-3 rounded-md bg-muted/30">
                <p className="font-semibold mb-1">Original Message:</p>
                <p className="italic text-muted-foreground">{replyingTo?.message}</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="replyText">Your Reply</Label>
                <Textarea 
                    id="replyText"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={6}
                    placeholder="Type your response here..."
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
            <Button onClick={handleSendReply} disabled={sending}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}