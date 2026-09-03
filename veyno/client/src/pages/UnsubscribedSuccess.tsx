// client/src/pages/UnsubscribedSuccessfully.tsx
import { Link } from "react-router-dom";
import { CheckCircle2, Home, MailX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UnsubscribedSuccessfully() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Card className="w-full max-w-2xl animate-fade-in shadow-2xl border-2">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
            <MailX className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Unsubscribed
          </CardTitle>
          <CardDescription className="text-base">
            You will no longer receive our newsletters.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 animate-scale-in">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertDescription className="ml-2 font-semibold text-green-700 dark:text-green-300">
              You have been successfully removed from our mailing list.
            </AlertDescription>
          </Alert>

          <p className="text-center text-sm text-muted-foreground pt-4">
            You can subscribe again at any time from our homepage. We are sorry to see you go!
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild size="lg" className="min-w-[140px] hover-scale bg-black text-white hover:bg-gray-900">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}