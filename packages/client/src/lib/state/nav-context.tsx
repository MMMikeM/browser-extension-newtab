import { createContext, useContext, useState, type ReactNode } from "react";

interface NavContextValue {
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
}

const NavContext = createContext<NavContextValue>({
  navOpen: false,
  setNavOpen: () => {},
});

export function NavContextProvider({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return <NavContext.Provider value={{ navOpen, setNavOpen }}>{children}</NavContext.Provider>;
}

export const useNavContext = () => useContext(NavContext);
