import { Transition } from "framer-motion";

/**
 * Rendo Unified Motion Config
 * EstÃ¡ndar de transiciones y fÃ­sicas unificadas con Framer Motion.
 */

// TransiciÃ³n fÃ­sica orgÃ¡nica para superficies pÃºblicas (Marketplace, Landing, Modales)
export const publicSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
};

// TransiciÃ³n fÃ­sica tÃ©cnica de alta respuesta para backoffice (Dashboard del Gestor, Terminal)
export const terminalSpring: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
};

// Variantes estÃ¡ndar para animaciones de entrada/salida
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: publicSpring },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: publicSpring },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

export const terminalFadeIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: terminalSpring },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.1 } },
};
