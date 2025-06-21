import React from "react";
import { motion } from "framer-motion";
import { ANIMATION_CONFIG } from "../utils/animations";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = React.memo(function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ANIMATION_CONFIG.PAGE_TRANSITION}
      className="w-full"
    >
      {children}
    </motion.div>
  );
});

export const AdvancedPageTransition = React.memo(function AdvancedPageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={ANIMATION_CONFIG.ADVANCED_PAGE_TRANSITION}
      className="w-full"
    >
      {children}
    </motion.div>
  );
});

export default PageTransition;
