import React, { useRef, useState } from "react";
import { Layers, Zap, CheckCircle } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import "./SpotlightCards.css";

const TILT_MAX = 9;
const TILT_SPRING = { stiffness: 300, damping: 28 };
const GLOW_SPRING = { stiffness: 180, damping: 22 };

const DEFAULT_ITEMS = [
  {
    icon: Layers,
    title: "Subjects",
    description: "We detect each row and capture the subject name/title when available. If the name is noisy, you can keep it blank and still calculate SGPA.",
    color: "#a78bfa",
  },
  {
    icon: Zap,
    title: "Credits",
    description: "Credits are parsed as numbers (like 4, 3, 1.5). This is what drives weighted calculation.",
    color: "#60a5fa",
  },
  {
    icon: CheckCircle,
    title: "Grades (including A+)",
    description: "Grades like A+, A, B+, B… are recognized and normalized (even if the screenshot spacing is weird).",
    color: "#34d399",
  }
];

function Card({ item, dimmed, onHoverStart, onHoverEnd }) {
  const Icon = item.icon;
  const cardRef = useRef(null);

  const normX = useMotionValue(0.5);
  const normY = useMotionValue(0.5);

  const rawRotateX = useTransform(normY, [0, 1], [TILT_MAX, -TILT_MAX]);
  const rawRotateY = useTransform(normX, [0, 1], [-TILT_MAX, TILT_MAX]);

  const rotateX = useSpring(rawRotateX, TILT_SPRING);
  const rotateY = useSpring(rawRotateY, TILT_SPRING);
  const glowOpacity = useSpring(0, GLOW_SPRING);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    normX.set((e.clientX - rect.left) / rect.width);
    normY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseEnter = () => {
    glowOpacity.set(1);
    onHoverStart();
  };

  const handleMouseLeave = () => {
    normX.set(0.5);
    normY.set(0.5);
    glowOpacity.set(0);
    onHoverEnd();
  };

  return (
    <motion.div
      animate={{
        scale: dimmed ? 0.96 : 1,
        opacity: dimmed ? 0.5 : 1,
      }}
      className="spotlight-card group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={cardRef}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {/* Static accent tint — always visible */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "1.25rem",
          pointerEvents: "none",
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}14, transparent 65%)`,
        }}
      />

      {/* Hover glow layer */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "1.25rem",
          pointerEvents: "none",
          opacity: glowOpacity,
          background: `radial-gradient(ellipse at 20% 20%, ${item.color}2e, transparent 65%)`,
        }}
      />

      {/* Icon badge */}
      <div
        className="spotlight-icon-badge"
        style={{
          background: `${item.color}18`,
          boxShadow: `inset 0 0 0 1px ${item.color}30`,
        }}
      >
        <Icon size={24} strokeWidth={1.9} style={{ color: item.color }} />
      </div>

      {/* Text */}
      <div className="spotlight-card-content">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>

    </motion.div>
  );
}

export default function SpotlightCards({ items = DEFAULT_ITEMS }) {
  const [hoveredTitle, setHoveredTitle] = useState(null);

  return (
    <div className="spotlight-wrapper">
      <div className="spotlight-grid">
        {items.map((item) => (
          <Card
            key={item.title}
            dimmed={hoveredTitle !== null && hoveredTitle !== item.title}
            item={item}
            onHoverEnd={() => setHoveredTitle(null)}
            onHoverStart={() => setHoveredTitle(item.title)}
          />
        ))}
      </div>
    </div>
  );
}
