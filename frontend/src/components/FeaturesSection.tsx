import { motion } from "framer-motion";
import { Upload, Brain, Box, Printer, Eye, Download } from "lucide-react";
import { useLang } from "../contexts/LangContext";

const icons = [Upload, Brain, Box, Printer, Eye, Download];

export default function FeaturesSection() {
  const { t } = useLang();

  return (
    <section id="features" className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {t.features.sectionTag}
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t.features.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t.features.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
