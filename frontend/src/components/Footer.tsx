import { useLang } from '../contexts/LangContext';
import logo from "../assets/logo.png";

export function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
      
           <div className="flex items-center gap-2">
            <img src={logo} alt="MemoPrint" className="h-12 w-12" />
            <span className="font-heading text-xl font-bold">
              Memo<span className="text-gradient">Print</span>
            </span>
          </div>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              {t.footer.privacy}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t.footer.terms}
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              {t.footer.contact}
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
export default Footer;


