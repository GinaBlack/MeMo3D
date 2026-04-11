import { useLang } from "../contexts/LangContext";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function CTASection() {
  const { t } = useLang();

  return (
    <>
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Upload your medical images and let our AI create custom 3D printable assistive devices
            </p>
            <Link to="/dashboard/upload">
              <Button size="lg" className="text-lg px-8">
                {t.cta.upload}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
