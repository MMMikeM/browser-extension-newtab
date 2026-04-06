import { createContext, useContext, useState, type ReactNode } from "react";

interface NavContextValue {
  mobileNavContent: ReactNode;
  setMobileNavContent: (node: ReactNode) => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
}

const NavContext = createContext<NavContextValue>({
  mobileNavContent: null,
  setMobileNavContent: () => {},
  navOpen: false,
  setNavOpen: () => {},
});

export function NavContextProvider({ children }: { children: ReactNode }) {
  const [mobileNavContent, setMobileNavContent] = useState<ReactNode>(null);
  const [navOpen, setNavOpen] = useState(false);
  return (
    <NavContext.Provider value={{ mobileNavContent, setMobileNavContent, navOpen, setNavOpen }}>
      {children}
    </NavContext.Provider>
  );
}

export const useNavContext = () => useContext(NavContext);
