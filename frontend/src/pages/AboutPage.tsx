import { useLang } from "../contexts/LangContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Upload, Brain, Boxes, Printer } from 'lucide-react';

export function AboutPage() {
  const { t } = useLang();

  const steps = [
    {
      icon: Upload,
      title: t.about.howstep1title,
      description: t.about.howstep1desc,
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Brain,
      title: t.about.howstep2title,
      description: t.about.howstep2desc,
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Boxes,
      title: t.about.howstep3title,
      description: t.about.howstep3desc,
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Printer,
      title: t.about.howstep4title,
      description: t.about.howstep4desc,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {t.about.title}
          </h1>
        </div>

        {/* Mission Section */}
        <Card className="mb-12 border-2">
          <CardHeader>
            <CardTitle className="text-2xl">{t.about.missiontitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.about.missiontext}
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
            {t.about.howtitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${step.color} opacity-10 rounded-bl-full`} />
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${step.color} text-white`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-muted-foreground mb-1">
                          Step {index + 1}
                        </div>
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Technology Stack */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Technology & Innovation</CardTitle>
            <CardDescription>Powered by cutting-edge AI and medical imaging technology</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Deep Learning
                </h4>
                <p className="text-sm text-muted-foreground">
                  Neural networks trained on thousands of medical scans for accurate anatomical analysis
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  3D Reconstruction
                </h4>
                <p className="text-sm text-muted-foreground">
                  Advanced algorithms convert 2D medical images into precise 3D models
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Medical Compliance
                </h4>
                <p className="text-sm text-muted-foreground">
                  Designed with medical standards and patient safety as top priorities
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mt-8 p-6 bg-muted/50 border-l-4 border-primary rounded-lg">
          <h4 className="font-semibold mb-2">Important Notice</h4>
          <p className="text-sm text-muted-foreground">
            This platform is designed to assist healthcare professionals in creating custom assistive devices. 
            All 3D printed medical devices should be reviewed and approved by qualified medical personnel before use. 
            This tool does not replace professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
    </div>
  );
}
export default AboutPage;