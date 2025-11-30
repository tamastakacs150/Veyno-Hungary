// client/src/pages/Account.tsx
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, User, Mail, Phone, MapPin, Bell, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../auth/AuthContext";
import api from "../utils/api.js";

// Password strength scoring (0-4)
function scorePassword(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length < 6 && score > 1) score = 1;
  return Math.min(score, 4);
}

// Password field with toggle visibility
function PasswordField({
  label,
  value,
  onChange,
  placeholder = "",
  required = true,
  showStrength = false,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
}) {
  const [show, setShow] = useState(false);
  const score = showStrength ? scorePassword(value) : 0;

  const getStrengthColor = () => {
    if (score === 0) return "bg-muted";
    if (score === 1) return "bg-destructive";
    if (score === 2) return "bg-orange-500";
    if (score === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (score === 0) return "";
    if (score === 1) return "Weak";
    if (score === 2) return "Medium";
    if (score === 3) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={label}>{label}</Label>
      <div className="relative">
        <Input
          id={label}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showStrength && value && (
        <div className="space-y-1">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1.5 flex-1 rounded-full transition-colors ${score >= level ? getStrengthColor() : "bg-muted"
                  }`}
              />
            ))}
          </div>
          {score > 0 && (
            <p className="text-xs text-muted-foreground">
              Password strength: <span className="font-medium">{getStrengthText()}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface Address {
  country?: string;
  postalCode?: string;
  city?: string;
  line1?: string;
  line2?: string;
}

export default function Account() {
  const { toast } = useToast();
  const { updateUser, logout } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState<Address>({
    country: "US",
    postalCode: "",
    city: "",
    line1: "",
    line2: "",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/me");
        if (!alive) return;

        setName(data?.name || "");
        setEmail(data?.email || "");
        setPhone(data?.phone || "");
        setAddr({
          country: data?.defaultAddress?.country || "US",
          postalCode: data?.defaultAddress?.postalCode || "",
          city: data?.defaultAddress?.city || "",
          line1: data?.defaultAddress?.line1 || "",
          line2: data?.defaultAddress?.line2 || "",
        });

        // Real query for newsletter status
        try {
          const st = await api.get("/newsletter/status", { params: { email: data?.email } });
          setSubscribed(Boolean(st?.data?.subscribed));
        } catch {
          setSubscribed(false);
        }
      } catch (e: any) {
        if (e?.response?.status === 401) {
          toast({
            title: "Login required",
            description: "Please log in again.",
            variant: "destructive",
          });
          setTimeout(() => logout(), 1200);
        } else {
          toast({
            title: "Error",
            description: e?.response?.data?.error || "Failed to load account information.",
            variant: "destructive",
          });
        }
      } finally {
        if (alive) setLoadingProfile(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [logout, toast]);

  // If the email changes, update the newsletter status
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!email) return;
      try {
        const st = await api.get("/newsletter/status", { params: { email } });
        if (alive) setSubscribed(Boolean(st?.data?.subscribed));
      } catch {

      }
    })();
    return () => {
      alive = false;
    };
  }, [email]);

  // SAVE PROFILE (PATCH /me)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        email,
        phone,
        defaultAddress: {
          country: addr.country || "US",
          postalCode: addr.postalCode || "",
          city: addr.city || "",
          line1: addr.line1 || "",
          line2: addr.line2 || "",
        },
      };
      const { data } = await api.patch("/me", payload);
      // Update auth context
      updateUser?.({ name: data?.name, email: data?.email });
      toast({ title: "Success", description: "Profile successfully updated." });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast({ title: "Login required", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => logout(), 1200);
      } else {
        toast({
          title: "Error",
          description: error?.response?.data?.error || "Failed to save profile.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // CHANGE PASSWORD (PUT /me/password)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "The password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "The passwords do not match.", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      await api.put("/me/password", { currentPassword: currentPassword, newPassword });
      toast({ title: "Success", description: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast({ title: "Login required.", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => logout(), 1200);
      } else {
        toast({
          title: "Error",
          description: error?.response?.data?.error || "Failed to change password.",
          variant: "destructive",
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // SUBSCRIBE TO NEWSLETTER (PATCH /me/newsletter)
  const handleNewsletterToggle = async () => {
    if (!email) {
      toast({
        title: "Missing data",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setNewsletterLoading(true);
    try {
      const next = !subscribed;
      const { data } = await api.patch("/me/newsletter", { subscribe: next });

      const serverState = typeof data?.subscribed === "boolean" ? data.subscribed : next;
      setSubscribed(serverState);

      if (serverState) {
        toast({
          title: "Registration successful",
          description: "You have successfully subscribed to the newsletter.",
        });
      } else {
        toast({
          title: "Unsubscribe successful",
          description: "You have successfully unsubscribed from the newsletter.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Operation failed.",
        variant: "destructive",
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone.."
    );
    if (!confirmed) return;

    try {
      setDeleting(true);

      // Backend: DELETE /api/me  -> api.delete("/me") (baseURL: /api)
      await api.delete("/me");

      toast({
        title: "Account deleted",
        description: "Your user account has been successfully deleted.",
      });

      // Kiléptetés és átirányítás a logout logika szerint
      await logout();
    } catch (error: any) {
      console.error("Account delete error:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.error ||
          "Your account could not be deleted. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <div className="container max-w-6xl py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Account settings
          </h1>
          <p className="text-muted-foreground">Manage your account information and settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card className="glass-card border-primary/10 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile data
              </CardTitle>
              <CardDescription>Update your basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 213 123 4567" />
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    Address
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value })} placeholder="US" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal code</Label>
                      <Input id="postalCode" value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })} placeholder="1234" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="Los Angeles" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="line1">Street, house number</Label>
                    <Input id="line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="Lincoln Blvd. 217." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="line2">Floor/door (optional)</Label>
                    <Input id="line2" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} placeholder="2. floor 5." />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving || loadingProfile}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {saving ? "Saving..." : "Save profile"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password + Newsletter column */}
          <div className="space-y-6">
            <Card className="glass-card border-primary/10 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Change password
                </CardTitle>
                <CardDescription>Secure your account with a strong password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <PasswordField
                    label="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Your current password"
                  />

                  <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    showStrength
                  />

                  <PasswordField
                    label="New password again"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter the new password."
                  />

                  <p className="text-xs text-muted-foreground">
                    Tip: use capital letters, numbers and special characters.
                  </p>

                  <Button type="submit" disabled={changingPassword} variant="secondary" className="w-full">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {changingPassword ? "Modifying..." : "Change password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Newsletter Card */}
            <Card className="glass-card border-primary/10 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Newsletter
                </CardTitle>
                <CardDescription>Sign up for exclusive offers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">State</p>
                      <p className="text-xs text-muted-foreground">
                        {subscribed ? "Subscribed" : "Not subscribed"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${subscribed ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {subscribed ? "Active" : "Inactive"}
                  </div>
                </div>

                <Button
                  onClick={handleNewsletterToggle}
                  disabled={newsletterLoading || loadingProfile}
                  variant={subscribed ? "outline" : "default"}
                  className={
                    subscribed ? "" : "w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  }
                >
                  {newsletterLoading ? "Processing..." : subscribed ? "Unsubscribe" : "Subscribe"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">You can change your mind at any time.</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/10 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldCheck className="h-5 w-5" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Deleting your account is permanent. Your orders will remain for accounting purposes,
                  but you will no longer be able to access your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your profile and personal data will be deleted, and previous orders
                  will remain anonymous in the system.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting || loadingProfile}
                  className="w-full"
                >
                  {deleting ? "Deleting account..." : "Permanently delete account"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
