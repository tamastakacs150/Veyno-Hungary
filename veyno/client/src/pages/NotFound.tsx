//client/src/pages/NotFound.tsx
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, ShoppingBag, Package } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-6">
      
      {/* Top left corner: VEYNO + lines */}
      <div className="text-left mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
          VEYNO
        </h1>
        {/* Short thick line */}
        <div className="h-[3px] w-16 bg-foreground mb-3"></div>
        {/* Long thin line */}
        <div className="h-[1px] w-full bg-foreground"></div>
      </div>

      {/* Middle content */}
      <div className="flex flex-col items-center justify-center flex-grow text-center animate-fade-in-up">
        <h2 className="text-7xl md:text-8xl font-black tracking-tight text-foreground mb-4">
          404
        </h2>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
          PAGE NOT FOUND
        </h3>
        <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved. Please check the URL or return to our homepage.
        </p>

        <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">
          Navigate
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="font-semibold uppercase tracking-wider text-xs">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-semibold border-2 uppercase tracking-wider text-xs">
            <Link to="/">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Shop
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-semibold border-2 uppercase tracking-wider text-xs">
            <Link to="/category/polo">
              <Package className="mr-2 h-4 w-4" />
              Products
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-semibold border-2 uppercase tracking-wider text-xs">
            <Link to="/">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Link>
          </Button>
        </div>
      </div>

      {/* Bottom – aligned to two corners */}
      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <p className="font-mono">
          Error: <span className="text-foreground font-semibold">{location.pathname}</span>
        </p>
        <p>
          © {new Date().getFullYear()} VEYNO. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
