import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

/** Animate presentation only; assistive technology and the final value use the exact target. */
export default function AnimatedNumber({ value, format, finalValue }: {
  value: number; format(value: number): string; finalValue?: string;
}) {
  const reduced = useReducedMotion();
  const current = useMotionValue(value);
  const display = useTransform(current, next => next === value && finalValue ? finalValue : format(next));
  useEffect(() => {
    if (reduced) { current.set(value); return; }
    const animation = animate(current, value, { duration: .45, ease: "easeOut" });
    return () => animation.stop();
  }, [current, value, reduced]);
  return <><motion.span aria-hidden="true">{display}</motion.span><span className="sr-only">{finalValue || format(value)}</span></>;
}
