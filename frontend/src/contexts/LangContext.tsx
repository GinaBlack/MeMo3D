import { Upload } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

type Lang = "en" | "fr";

const translations = {
  en: {
    nav: {
      home: "Home",
      features: "Features",
      workflow: "Workflow",
      about: "About",
      getStarted: "Get Started",
    },
    hero: {
      badge: "AI-Powered Medical Innovation",
      title1: "From CT Scans to",
      title2: "3D Printable Devices",
      subtitle:
        "An AI-integrated web platform that converts medical imaging data into customizable 3D-printable assistive devices — bridging healthcare and digital manufacturing.",
      cta: "Start Processing",
      ctaSecondary: "Learn More",
    },
    features: {
      sectionTag: "Platform Capabilities",
      title: "Intelligent Medical Image Processing",
      subtitle: "A unified pipeline from DICOM upload to fabrication-ready STL export.",
      cards: [
        {
          title: "DICOM Upload",
          desc: "Securely upload CT scan datasets through an intuitive web interface with format validation.",
        },
        {
          title: "AI Segmentation",
          desc: "MONAI 2D U-Net powered segmentation isolates anatomical structures with clinical accuracy.",
        },
        {
          title: "3D Reconstruction",
          desc: "Marching Cubes algorithm converts segmented slices into volumetric 3D meshes in real time.",
        },
        {
          title: "Parametric Modeling",
          desc: "Automatically generate assistive devices with adjustable size and ergonomic parameters.",
        },
        {
          title: "3D Visualization",
          desc: "Browser-based Three.js rendering lets you inspect models from every angle before printing.",
        },
        {
          title: "STL Export",
          desc: "Download fabrication-ready STL files optimized for smoothness and printability.",
        },
      ],
    },
    workflow: {
      sectionTag: "How It Works",
      title: "Streamlined Workflow",
      subtitle: "Four simple steps from medical scan to printed device.",
      steps: [
        { step: "01", title: "Upload", desc: "Upload DICOM CT scan files" },
        { step: "02", title: "Process", desc: "AI segments & reconstructs" },
        { step: "03", title: "Visualize", desc: "Inspect 3D model in browser" },
        { step: "04", title: "Export", desc: "Download STL for printing" },
      ],
    },
    about:{
    title: 'About Our Platform',
    missiontitle: 'Our Mission',
    missiontext: 'We combine cutting-edge AI technology with medical imaging to create custom 3D printable assistive devices that improve patient outcomes and quality of life.',
    howtitle: 'How It Works',
    howstep1title: 'Upload Medical Images',
    howstep1desc: 'Upload CT, MRI, or X-ray scans of the affected area',
    howstep2title: 'AI Processing',
    howstep2desc: 'Our AI analyzes the images and extracts anatomical features',
    howstep3title: 'Model Generation',
    howstep3desc: 'A custom 3D model is generated based on patient anatomy',
    howstep4title: '3D Print',
    howstep4desc: 'Download and 3D print the assistive device',
    },
    footer: {
    copyright: '© 2026 MeMoPrint AI. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact',
    },
      cta:{
    upload: "Upload Your Scan",
  },
  upload: {
    title: 'Upload Medical Images',
    subtitle: 'Upload CT, MRI, or X-ray scans for AI processing',
    dragdrop: 'Drag and drop medical images here',
    or: 'or',
    browse: 'Browse Files',
    supported: 'Supported formats: DICOM, PNG, JPG, NIfTI',
    maxsize: 'Maximum file size: 100MB',
    buttonprocess: 'Start Processing',
    buttonclear: 'Clear All',
    projectname: 'Project Name',
    patientid: 'Patient ID',
    scantype: 'Scan Type',
    devicetype: 'Device Type',
    selectscan: 'Select scan type',
    selectdevice: 'Select device type',
  },
  processing: {
    title: 'Processing Medical Images',
    subtitle: 'AI is analyzing your images and generating the 3D model',
    step1: 'Analyzing medical images',
      step2: 'Extracting anatomical features',
      step3: 'Generating 3D model',
      step4: 'Optimizing for 3D printing',
    status:{
      complete: 'Complete',
      inprogress: 'In Progress',
      pending: 'Pending',   
    },
    estimated: 'Estimated time remaining',
    
  },
  results: {
  title: '3D Model Ready',
  subtitle: 'Your custom assistive device model has been generated',
  preview: '3D Model Preview',
  details: 'Model Details',
  download:{
  stl: 'Download STL',
  obj: 'Download OBJ',
  report: 'Download Report',
  },
  share: 'Share Results',
  new: 'Process New Image',
  info:{
  dimensions: 'Dimensions',
  volume: 'Volume',
  material: 'Recommended Material',
  printtime: 'Estimated Print Time',
  },
  },
},
  fr: {
    nav: {
      home: "Accueil",
      features: "Fonctionnalités",
      workflow: "Processus",
      about: "À propos",
      getStarted: "Commencer",
    },
    hero: {
      badge: "Innovation Médicale par l'IA",
      title1: "Des scanners CT aux",
      title2: "Dispositifs Imprimables 3D",
      subtitle:
        "Une plateforme web intégrée à l'IA qui convertit les données d'imagerie médicale en dispositifs d'assistance imprimables en 3D personnalisables.",
      cta: "Lancer le Traitement",
      ctaSecondary: "En Savoir Plus",
    },
    features: {
      sectionTag: "Capacités de la Plateforme",
      title: "Traitement Intelligent d'Images Médicales",
      subtitle: "Un pipeline unifié du téléchargement DICOM à l'exportation STL prête à la fabrication.",
      cards: [
        {
          title: "Téléchargement DICOM",
          desc: "Téléchargez en toute sécurité des ensembles de données CT via une interface web intuitive.",
        },
        {
          title: "Segmentation IA",
          desc: "Segmentation alimentée par MONAI 2D U-Net pour isoler les structures anatomiques avec précision.",
        },
        {
          title: "Reconstruction 3D",
          desc: "L'algorithme Marching Cubes convertit les tranches segmentées en maillages 3D volumétriques.",
        },
        {
          title: "Modélisation Paramétrique",
          desc: "Générez automatiquement des dispositifs d'assistance avec des paramètres ajustables.",
        },
        {
          title: "Visualisation 3D",
          desc: "Le rendu Three.js dans le navigateur permet d'inspecter les modèles sous tous les angles.",
        },
        {
          title: "Exportation STL",
          desc: "Téléchargez des fichiers STL prêts à la fabrication, optimisés pour l'impression.",
        },
      ],
    },
    workflow: {
      sectionTag: "Comment Ça Marche",
      title: "Processus Simplifié",
      subtitle: "Quatre étapes simples du scan médical au dispositif imprimé.",
      steps: [
        { step: "01", title: "Télécharger", desc: "Téléchargez les fichiers DICOM" },
        { step: "02", title: "Traiter", desc: "L'IA segmente et reconstruit" },
        { step: "03", title: "Visualiser", desc: "Inspectez le modèle 3D" },
        { step: "04", title: "Exporter", desc: "Téléchargez le STL" },
      ],
    },
    about: {
      title: "À propos de Notre Plateforme",
      missiontitle: "Notre Mission",
      missiontext: "Nous combinons la technologie de l'IA de pointe avec l'imagerie médicale pour créer des dispositifs d'assistance imprimables en 3D personnalisés qui améliorent les résultats et la qualité de vie des patients.",
      howtitle: "Comment Ça Marche",
      howstep1title: "Télécharger les Images Médicales",
      howstep1desc: "Téléchargez les scans CT, IRM ou radiographies de la zone affectée",
      howstep2title: "Traitement par IA",
      howstep2desc: "Notre IA analyse les images et extrait les caractéristiques anatomiques",
      howstep3title: "Génération de Modèle",
      howstep3desc: "Un modèle 3D personnalisé est généré en fonction de l'anatomie du patient",
      howstep4title: "Impression 3D",
      howstep4desc: "Téléchargez et imprimez en 3D le dispositif d'assistance",
    },
    footer: {
    copyright: '© 2026 MeMoPrint AI. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    contact: 'Contact',
    },
    cta:{
    upload: "Téléchargez Votre Scan",
    },
    upload: {
    title: 'Télécharger les Images Médicales',
    subtitle: 'Téléchargez des scans CT, IRM ou radiographies pour le traitement par IA',
    dragdrop: 'Glissez-déposez les images médicales ici',
    or: 'ou',
    browse: 'Parcourir les Fichiers',
    supported: 'Formats pris en charge : DICOM, PNG, JPG, NIfTI',
    maxsize: 'Taille maximale du fichier : 100MB',
    buttonprocess: 'Lancer le Traitement',
    buttonclear: 'Tout Effacer',
    projectname: 'Nom du Projet',
    patientid: 'ID du Patient',
    scantype: 'Type de Scan',
    devicetype: 'Type de Dispositif',
    selectscan: 'Sélectionnez le type de scan',
    selectdevice: 'Sélectionnez le type de dispositif',
  },
  processing: {
    title: 'Processing Medical Images',
    subtitle: 'AI is analyzing your images and generating the 3D model',
      step1: 'Analyzing medical images',
      step2: 'Extracting anatomical features',
      step3: 'Generating 3D model',
      step4: 'Optimizing for 3D printing',
    status:{
      complete: 'Complete',
      inprogress: 'In Progress',
      pending: 'Pending',   
    },
    estimated: 'Estimated time remaining',
    
  },
  results: {
  title: '3D Model Ready',
  subtitle: 'Your custom assistive device model has been generated',
  preview: '3D Model Preview',
  details: 'Model Details',
  download:{
  stl: 'Download STL',
  obj: 'Download OBJ',
  report: 'Download Report',
  },
  share: 'Share Results',
  new: 'Process New Image',
  info:{
  dimensions: 'Dimensions',
  volume: 'Volume',
  material: 'Recommended Material',
  printtime: 'Estimated Print Time',
  },
  },
  
},
};
interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  t: typeof translations.en;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggleLang = () => setLang((l) => (l === "en" ? "fr" : "en"));
  const t = translations[lang];

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
