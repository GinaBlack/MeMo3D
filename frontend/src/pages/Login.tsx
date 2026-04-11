import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import logo from "../assets/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const { t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      // Route based on role — admin@memoprint.com goes to admin
      if (email === "admin@memoprint.com") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen ">
      {/* Left panel — branding */}
      <div className="hidden w-1/2 items-center justify-center bg-gradient-hero lg:flex">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md px-12 text-center"
        >
          <img src={logo} alt="MemoPrint" className="mx-auto mb-6 h-16 w-16" />
          <h1 className="mb-4 font-heading text-4xl font-bold text-white">
            Memo<span className="text-accent">Print</span>
          </h1>
          <p className="text-lg text-white/70">
            AI-integrated medical image processing for custom 3D-printable assistive devices.
          </p>
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 backdrop-blur">
            <p className="mb-1 font-medium text-white/80">Demo credentials:</p>
            <p>Admin: admin@memoprint.com</p>
            <p>User: user@memoprint.com</p>
            <p className="mt-1 text-white/40">Any password works</p>
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 lg:w-1/2 py-32">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 text-center lg:hidden">
            <img src={logo} alt="MemoPrint" className="mx-auto mb-3 h-10 w-10" />
            <h2 className="font-heading text-2xl font-bold">
              Memo<span className="text-gradient">Print</span>
            </h2>
          </div>

          <h2 className="mb-1 font-heading text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="mb-6 text-sm text-muted-foreground">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full bg-gradient-primary" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </span>
              )}
            </Button>

            <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
