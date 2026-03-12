// app/providers.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useWallet }       from "@/hooks/useWallet";
import { usePriceFeed }    from "@/hooks/usePriceFeed";
import { useMarkets }      from "@/hooks/useMarkets";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useSmartBets }    from "@/hooks/useSmartBets";

interface AppCtx {
  wallet:     ReturnType<typeof useWallet>;
  priceFeed:  ReturnType<typeof usePriceFeed>;
  markets:    ReturnType<typeof useMarkets>;
  activity:   ReturnType<typeof useActivityFeed>;
  smartBets:  ReturnType<typeof useSmartBets>;
  darkMode:   boolean;
  toggleDark: () => void;
}

const Ctx = createContext<AppCtx>(null!);
export const useAppContext = () => useContext(Ctx);

export function Providers({ children }: { children: React.ReactNode }) {
  const wallet    = useWallet();
  const priceFeed = usePriceFeed();
  const markets   = useMarkets();
  const activity  = useActivityFeed();
  // useSmartBets needs the ADDRESS string, not the whole WalletState object
  const smartBets = useSmartBets(wallet.wallet.address);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reflex-theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("reflex-theme", next ? "dark" : "light");
  };

  return (
    <Ctx.Provider value={{ wallet, priceFeed, markets, activity, smartBets, darkMode, toggleDark }}>
      {children}
    </Ctx.Provider>
  );
}