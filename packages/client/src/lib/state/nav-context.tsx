import { createContext, useContext, useState, type ReactNode } from "react";

interface NavContextValue {
  mobileNavContent: ReactNode;
  setMobileNavContent: (node: ReactNode) => void;
}

const NavContext = createContext<NavContextValue>({
  mobileNavContent: null,
  setMobileNavContent: () => {},
});

export function NavContextProvider({ children }: { children: ReactNode }) {
  const [mobileNavContent, setMobileNavContent] = useState<ReactNode>(null);
  return (
    <NavContext.Provider value={{ mobileNavContent, setMobileNavContent }}>
      {children}
    </NavContext.Provider>
  );
}

export const useNavContext = () => useContext(NavContext);
