import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Globe, Menu, X } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import logo from "../assets/logo.png";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";


export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate(); // Add this

  const links = [
    { label: t.nav.home, path: "/" },
    { label: t.nav.features, path: "/#features" },
    { label: t.nav.workflow, path: "/#workflow" },
    { label: t.nav.about, path: "/about" },
  ];

  const handleNavigation = (path: any) => {
    setMobileOpen(false);
    
    if (path.includes("#")) {
      // Handle hash navigation
      const [basePath, hash] = path.split("#");
      
      if (window.location.pathname !== basePath && basePath !== "/") {
        // Navigate to the page first if we're not on it
        navigate(basePath);
        // Wait for navigation to complete then scroll
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        // We're on the correct page, just scroll
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      // Regular navigation
      navigate(path);
    }
  };
  const navigateTo = (path: string) => {
    navigate(path); 
  };

  const isActive = (path: string) => {
    return path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);
  };

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <button 
          onClick={() => handleNavigation("/")} 
          className="flex items-center gap-2"
        >
          <img src={logo} alt="MemoPrint" className="h-16 w-16" />
          <span className="font-heading text-xl font-bold tracking-tight">
            MeMo<span className="text-gradient">Print</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavigation(link.path)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            {lang === "en" ? "FR" : "EN"}
          </button>
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-3">
        {isActive("/login") ?
        <Button
          size="sm"
          onClick={() => navigateTo("/signup")}
          className={"hidden rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 md:inline-flex"}
          
        >
          Sign Up
        </Button>
        :
        <Button
          size="sm"
          onClick={() => navigateTo("/login")}
          className={"hidden rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 md:inline-flex"}
          
        >
          Login
        </Button>
  }
      </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border bg-background md:hidden"
        >
          <nav className="container flex flex-col gap-4 py-4">
            {links.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavigation(link.path)}
                className="text-left text-sm font-medium text-muted-foreground"
              >
                {link.label}
              </button>
            ))}
            <button 
              onClick={() => handleNavigation("/login")}
              className="rounded-lg bg-gradient-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              {t.nav.getStarted}
            </button>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}