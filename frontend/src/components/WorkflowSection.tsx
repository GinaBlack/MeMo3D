import { motion } from "framer-motion";
import { useLang } from "../contexts/LangContext";

export default function WorkflowSection() {
  const { t } = useLang();

  return (
    <section id="workflow" className="bg-surface py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block rounded-full bg-highlight/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-highlight">
            {t.workflow.sectionTag}
          </span>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t.workflow.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t.workflow.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {t.workflow.steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < 3 && (
                <div className="absolute right-0 top-8 hidden h-0.5 w-full translate-x-1/2 bg-gradient-to-r from-primary/40 to-highlight/40 lg:block" />
              )}
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-elevated">
                {step.step}
              </div>
              <h3 className="font-heading text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
