import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { useLang } from "../contexts/LangContext";
import heroImage from "../assets/hero-medical-3d.jpg";

export default function HeroSection() {
  const { t } = useLang();

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-hero pt-16">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "linear-gradient(hsl(207 90% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(207 90% 50% / 0.3) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="container relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-12 py-20 lg:flex-row">
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary-foreground/80"
          >
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-highlight" />
            {t.hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="font-heading text-4xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl"
          >
            {t.hero.title1}
            <br />
            <span className="text-gradient">{t.hero.title2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/60 lg:text-xl"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <a
              href="/dashboard/upload"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:scale-105"
            >
              {t.hero.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/20 px-6 py-3 text-sm font-semibold text-primary-foreground/80 transition-colors hover:border-primary-foreground/40 hover:text-primary-foreground"
            >
              <Play className="h-4 w-4" />
              {t.hero.ctaSecondary}
            </a>
          </motion.div>
        </div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="flex-1"
        >
          <div className="animate-float">
            <img
              src={heroImage}
              alt="3D Medical Device Visualization"
              className="w-full max-w-lg rounded-2xl shadow-elevated mx-auto"
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
