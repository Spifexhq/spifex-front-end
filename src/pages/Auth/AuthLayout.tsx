import { Suspense } from "react";
import { Link, useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AuthStory from "./AuthStory";
import logo from "@/assets/Icons/logo/logo-black.svg";

export default function AuthLayout() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const direction = pathname === "/signin" ? -1 : 1;
  return <div className="flex min-h-dvh bg-white text-black">
    <div className="flex w-full flex-col px-6 py-6 sm:px-10 sm:py-8 md:w-[55%] lg:w-1/2">
      <header><Link to="/signin"><img src={logo} alt="Spifex" className="h-7 w-auto sm:h-8" /></Link></header>
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md"><AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={pathname} custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 18 }), visible: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : -d * 12 }) }} initial="enter" animate="visible" exit="exit" transition={{ duration: reduced ? 0 : .18, ease: "easeOut" }} onAnimationComplete={() => { const heading = document.querySelector<HTMLElement>("main h1"); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } }}>
            <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-stone-50 motion-reduce:animate-none" aria-busy="true" />}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence></div>
      </main>
    </div>
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#f5e9df] via-[#edcfb9] to-[#ba8065] md:flex md:w-[45%] lg:w-1/2"><AuthStory /></div>
  </div>;
}
