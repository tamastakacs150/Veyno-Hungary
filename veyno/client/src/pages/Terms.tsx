//client/src/pages/Terms.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
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
                Terms of Service
              </h1>
              <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            </header>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By engaging with our atelier, whether through our website, showroom visits, or placing orders 
                for bespoke garments, you accept and agree to be bound by these Terms of Service. These terms 
                govern your relationship with our establishment and the purchase of our goods and services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Bespoke Orders & Commissions</h2>
              <p className="text-muted-foreground leading-relaxed">
                All bespoke and made-to-measure garments are crafted specifically for each client. By placing 
                an order, you acknowledge and agree to the following:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Bespoke orders require a non-refundable deposit of 50% upon commission</li>
                <li>Completion time for bespoke garments typically ranges from 8-12 weeks</li>
                <li>Fittings are required and must be scheduled within the agreed timeframe</li>
                <li>Custom orders cannot be canceled once fabric has been cut</li>
                <li>Minor alterations are included; major changes may incur additional fees</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Ready-to-Wear Collections</h2>
              <p className="text-muted-foreground leading-relaxed">
                Items from our ready-to-wear collections may be returned within 14 days of delivery in 
                unworn, unaltered condition with all original tags attached. Bespoke and made-to-measure 
                items are final sale. All returns require prior authorization and are subject to inspection.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Intellectual Property & Craftsmanship</h2>
              <p className="text-muted-foreground leading-relaxed">
                All designs, patterns, techniques, and proprietary methods used in creating our garments 
                remain the exclusive intellectual property of our atelier. Our name, logo, and house style 
                are protected trademarks. Reproduction or unauthorized use of our proprietary designs is 
                strictly prohibited and subject to legal action.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Care & Maintenance</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our garments are crafted from the finest materials and require proper care:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Professional dry cleaning is recommended for all tailored garments</li>
                <li>Store garments in breathable garment bags, never plastic</li>
                <li>Use wooden or padded hangers to maintain structure</li>
                <li>We offer complimentary annual inspections and minor repairs for the first year</li>
                <li>Damage resulting from improper care is not covered under our guarantee</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Quality Guarantee</h2>
              <p className="text-muted-foreground leading-relaxed">
                We stand behind the quality of our craftsmanship. All garments are guaranteed against defects 
                in materials and workmanship for one year from date of delivery. This guarantee does not cover 
                normal wear and tear, alterations by third parties, or damage from improper care. Our liability 
                is limited to repair or replacement of defective items at our discretion.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Payment Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We accept major credit cards, bank transfers, and approved house accounts. Payment is due 
                in full upon completion of bespoke orders unless alternative arrangements have been agreed 
                upon in writing. Late payments may incur interest charges. We reserve the right to refuse 
                service or extend credit to any party at our discretion.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or replace these Terms at any time. If a revision is 
                material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us:
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

export default Terms;
