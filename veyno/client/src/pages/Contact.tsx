// client/src/pages/Contact.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import { Toaster, toast } from "sonner";
import api from "../utils/api.js";

type ContactForm = {
  name: string;
  email: string;
  message: string;
};

const initialForm: ContactForm = { name: "", email: "", message: "" };

const Contact = () => {
  const [formData, setFormData] = useState<ContactForm>(initialForm);
  const [sending, setSending] = useState(false);

  const validate = (f: ContactForm) => {
    if (!f.name.trim() || !f.email.trim() || !f.message.trim()) {
      toast.error("Please fill out all fields.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      toast.error("Invalid email address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(formData)) return;

    setSending(true);
    try {
      await api.post("/contact", formData);
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData(initialForm);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to send your message. Please try again later.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
              Contact Our Atelier
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Schedule a private consultation or inquire about our bespoke services.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* --- Left column: Form --- */}
            <Card className="p-8 shadow-elegant space-y-6 hover:shadow-2xl transition-shadow">
              <div className="space-y-2">
                <div className="inline-block p-3 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Send us a Message</h2>
                <p className="text-muted-foreground">
                  Our style advisors will respond within 24 hours to arrange your private appointment.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={sending}
                    className="transition-all focus:shadow-md"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={sending}
                    className="transition-all focus:shadow-md"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Describe your inquiry or request..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    disabled={sending}
                    className="transition-all focus:shadow-md resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full gradient-primary text-white group"
                >
                  {sending ? "Sending..." : "Send Message"}
                  <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>
            </Card>

            {/* --- Right column: Info --- */}
            <div className="space-y-6">
              <Card className="p-8 shadow-elegant hover:shadow-2xl transition-shadow">
                <div className="inline-block p-3 bg-accent/10 rounded-lg mb-4">
                  <Mail className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Correspondence</h3>
                <p className="text-muted-foreground mb-4">
                  For bespoke inquiries and private orders.
                </p>
                <a
                  href="mailto:atelier@veyno.com"
                  className="text-primary hover:underline font-medium"
                >
                  atelier@oldmoneyapparel.com
                </a>
              </Card>

              <Card className="p-8 shadow-elegant bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-2xl transition-shadow">
                <h3 className="text-xl font-semibold mb-4">Atelier Hours</h3>
                <div className="space-y-2 text-muted-foreground">
                  <p>Monday - Friday: 10:00 AM - 7:00 PM</p>
                  <p>Saturday: 11:00 AM - 6:00 PM</p>
                  <p>Sunday: By Appointment Only</p>
                </div>
              </Card>

              <Card className="p-8 shadow-elegant hover:shadow-2xl transition-shadow">
                <h3 className="text-xl font-semibold mb-4">Our Atelier</h3>
                <p className="text-muted-foreground">
                  Park Avenue Residence<br />
                  Fifth Floor<br />
                  New York, NY 10065<br />
                  United States
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Global toaster (if not already mounted in App) */}
      <Toaster richColors position="top-center" />
    </div>
  );
};

export default Contact;
