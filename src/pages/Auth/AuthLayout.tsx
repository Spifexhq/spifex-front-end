import { Suspense } from "react";
import { Link, useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthStory from "./AuthStory";
import { useTheme } from "@/theme/ThemeProvider";
import logo from "@/assets/Icons/logo/logo-black.svg";

export default function AuthLayout() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const direction = pathname === "/signin" ? -1 : 1;
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation("navbar");
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  return <div className="flex min-h-dvh bg-white text-black">
    <div className="flex w-full flex-col px-6 py-6 sm:px-10 sm:py-8 md:w-[55%] lg:w-1/2">
      <header className="flex items-center justify-between"><Link to="/signin"><img src={logo} alt="Spifex" className="h-7 w-auto dark:invert sm:h-8" /></Link>
        <button type="button" onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-md p-0 text-black/60 transition-colors hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white" aria-label={themeLabel} title={themeLabel} aria-pressed={theme === "dark"}>{theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</button>
      </header>
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md"><AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={pathname} custom={direction} variants={{ enter: (d: number) => ({ opacity: 0, x: reduced ? 0 : d * 18 }), visible: { opacity: 1, x: 0 }, exit: (d: number) => ({ opacity: 0, x: reduced ? 0 : -d * 12 }) }} initial="enter" animate="visible" exit="exit" transition={{ duration: reduced ? 0 : .18, ease: "easeOut" }} onAnimationComplete={() => { const heading = document.querySelector<HTMLElement>("main h1"); if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); } }}>
            <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-stone-50 motion-reduce:animate-none" aria-busy="true" />}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence></div>
      </main>
    </div>
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#f5e9df] via-[#edcfb9] to-[#ba8065] dark:from-[#241a15] dark:via-[#2a1c16] dark:to-[#3a241a] md:flex md:w-[45%] lg:w-1/2"><AuthStory /></div>
  </div>;
}
