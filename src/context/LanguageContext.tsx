import "expo-sqlite/localStorage/install";
import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { strings, type Lang } from "@/i18n/strings";

const STORAGE_KEY = "lang";

// Idioma guardado; si no hay, el del teléfono (español si empieza por "es", si no inglés).
function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "es" || saved === "en") return saved;
  return Intl.DateTimeFormat().resolvedOptions().locale.startsWith("es") ? "es" : "en";
}

type LanguageState = { lang: Lang; setLang: (lang: Lang) => void; t: typeof strings.es };

const LanguageContext = createContext<LanguageState>({
  lang: "es",
  setLang: () => {},
  t: strings.es,
});

export function LanguageProvider({ children }: PropsWithChildren) {
  const [lang, setLangState] = useState(initialLang);

  function setLang(next: Lang) {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: strings[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
