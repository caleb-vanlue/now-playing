import React from "react";
import { motion } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.2,
        ease: "easeInOut",
      }}
      className="w-full"
      style={{ minHeight: "calc(100vh - 200px)" }}
    >
      {children}
    </motion.div>
  );
}

export function AdvancedPageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {
          opacity: 0,
          y: 8,
        },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1.0],
            when: "beforeChildren",
            staggerChildren: 0.05,
          },
        },
        exit: {
          opacity: 0,
          y: 8,
          transition: {
            duration: 0.2,
            ease: [0.25, 0.1, 0.25, 1.0],
          },
        },
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
