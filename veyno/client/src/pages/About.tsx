//client/src/pages/About.tsx
import { Link } from "react-router-dom";
import { ArrowLeft, Target, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-5xl mx-auto animate-fade-in space-y-16">
          <section className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              About Us
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Timeless elegance. Impeccable craftsmanship. A legacy of refined sophistication 
              woven into every thread.
            </p>
          </section>

          <section className="bg-card rounded-2xl shadow-elegant p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-foreground">Our Heritage</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Established with an unwavering commitment to sartorial excellence, our atelier has been 
                crafting distinguished garments for discerning gentlemen and ladies who appreciate the 
                finer things in life. Each piece we create embodies the essence of understated luxury 
                and timeless style.
              </p>
              <p>
                We believe that true elegance never fades. Our collections are designed for those who 
                understand that quality transcends trends, and that genuine sophistication is measured 
                not by ostentation, but by the whisper of fine fabric and the precision of expert tailoring. 
                Every garment carries our commitment to excellence and our respect for tradition.
              </p>
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-6">
            <Card className="p-8 shadow-elegant hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
               <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
              <p className="text-muted-foreground">
                To preserve and celebrate the art of classic tailoring while dressing generations 
                in garments that stand the test of time.
              </p>
            </Card>

            <Card className="p-8 shadow-elegant hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="inline-block p-3 bg-accent/10 rounded-lg mb-4">
                <Zap className="h-8 w-8 text-accent" />
              </div>
               <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
              <p className="text-muted-foreground">
                To be the distinguished choice for those who demand excellence, setting the 
                standard for refined elegance in every wardrobe.
              </p>
            </Card>

            <Card className="p-8 shadow-elegant hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
               <h3 className="text-xl font-semibold mb-3">Our Atelier</h3>
              <p className="text-muted-foreground">
                Master tailors, skilled artisans, and style consultants united by an 
                uncompromising dedication to craftsmanship and sophistication.
              </p>
            </Card>
          </section>

          <section className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-primary">Craftsmanship</h3>
                <p className="text-muted-foreground">
                  Every stitch, every seam, every detail reflects our commitment to the 
                  highest standards of tailoring excellence.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-accent">Timelessness</h3>
                <p className="text-muted-foreground">
                  We create pieces that transcend fleeting trends, designed to be worn 
                  with pride for generations.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-primary">Discretion</h3>
                <p className="text-muted-foreground">
                  True luxury whispers rather than shouts. Our garments speak through 
                  quality and subtle refinement.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-accent">Heritage</h3>
                <p className="text-muted-foreground">
                  We honor traditional techniques while serving the modern connoisseur 
                  of classic style.
                </p>
              </div>
            </div>
          </section>

          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4">Experience the difference</h2>
            <p className="text-muted-foreground mb-8">
              Visit our atelier or contact us.
            </p>
            <Link to="/contact">
              <Button size="lg" className="gradient-primary text-white">
                Contact
              </Button>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
