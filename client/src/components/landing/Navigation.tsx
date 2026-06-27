import { NAVIGATION } from "@shared/site";
import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";

export default function Navigation() {
  const [, setLocation] = useLocation();
  const { openModal } = useApp();

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      const id = href.substring(1);
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    } else {
      setLocation(href);
    }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="frame-nav fixed top-0 left-0 right-0 z-50 !px-9"
    >
      <button
        type="button"
        onClick={() => setLocation("/")}
        className="bg-transparent border-none"
      >
        <BrandLogo />
      </button>

      <div className="flex gap-5 items-center">
        {NAVIGATION.map((link) => (
          <button
            key={link.href}
            type="button"
            onClick={() => {
              if (link.href === "#contact") openModal("contact");
              else handleNavClick(link.href);
            }}
            className="frame-nav-link hidden sm:inline"
          >
            {link.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="frame-nav-link text-frame-orange hover:text-frame-orange"
        >
          Login
        </button>
      </div>
    </motion.nav>
  );
}
