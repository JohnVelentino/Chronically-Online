// Fix 7: start from scale 0 (was 0.3) and expand to 1.4 before fading — matches spec exactly
import { motion } from "framer-motion";

export default function SummonRune({ color = "rgba(239,159,39,0.35)" }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0.9 }}
      animate={{ scale: 1.4, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        position: "absolute",
        bottom: -30,
        left: "50%",
        transform: "translateX(-50%)",
        width: 80,
        height: 80,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        filter: "blur(1px)",
        boxShadow: `0 0 30px ${color}`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
