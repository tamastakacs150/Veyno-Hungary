//client/src/pages/Privacy.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Button>
        </Link>

        <article className="max-w-4xl mx-auto animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elegant p-8 md:p-12 space-y-8">
            <header className="space-y-4 border-b border-border pb-8">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </header>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy and discretion are of paramount importance to us. This Privacy Policy explains 
                how we collect, use, and protect your information when you engage with our atelier, whether 
                through our website, in-person consultations, or bespoke services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                To provide you with exceptional service and bespoke garments, we collect certain information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Personal Information: Name, address, telephone, email, and correspondence preferences</li>
                <li>Measurements & Style Preferences: Body measurements, fabric choices, and style consultations</li>
                <li>Purchase History: Records of your orders, fittings, and alterations</li>
                <li>Payment Information: Securely processed through encrypted third-party services</li>
                <li>Website Usage: Information collected when you browse our digital showroom</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Use of Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use your information to provide you with an unparalleled experience of luxury and service:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Create and craft your bespoke garments with precision</li>
                <li>Process orders, fittings, and alterations</li>
                <li>Maintain your style profile and measurement records</li>
                <li>Communicate regarding appointments, orders, and exclusive offerings</li>
                <li>Send curated collections and private sale invitations</li>
                <li>Provide personalized recommendations based on your preferences</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Disclosure of Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We maintain the utmost discretion regarding your information. It may be shared only in limited circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Master Tailors & Artisans: Only those directly involved in crafting your garments</li>
                <li>Trusted Service Providers: Secure payment processors and shipping partners under strict confidentiality</li>
                <li>Legal Requirements: When required by law or to protect our rights and property</li>
                <li>Business Continuity: In the event of a merger, your relationship would be honored by any successor</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Security of Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your trust is our most valued possession. We employ bank-level encryption and security protocols 
                to protect your personal information, measurements, and transaction details. Our systems are 
                regularly audited, and access is restricted to authorized personnel only. However, we acknowledge 
                that no method of transmission over the internet is entirely impenetrable.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or comments about this Privacy Policy, please contact us at:
              </p>
              <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                <p className="text-foreground">Email: veynoapparel@gmail.com</p>
                <Link to="/contact" className="text-primary hover:underline inline-block">
                  Or contact us →
                </Link>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
};

export default Privacy;
