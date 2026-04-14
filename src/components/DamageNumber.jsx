import { motion } from "framer-motion";

export default function DamageNumber({ x, y, text, color }) {
  return (
    <motion.div
      initial={{ y: 0, scale: 0, opacity: 1 }}
      animate={{ y: -40, scale: [0, 1.4, 1], opacity: [1, 1, 0] }}
      transition={{ duration: 0.9 }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        color,
        fontSize: 20,
        fontWeight: 900,
        textShadow: "0 0 12px rgba(0,0,0,0.7)",
        pointerEvents: "none",
        zIndex: 600,
      }}
    >
      {text}
    </motion.div>
  );
}
