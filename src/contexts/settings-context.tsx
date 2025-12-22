"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SettingsContextType {
  isDegradedMode: boolean;
  toggleDegradedMode: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isDegradedMode, setIsDegradedMode] = useState(false);

  const toggleDegradedMode = () => {
    setIsDegradedMode((prev) => !prev);
  };

  return (
    <SettingsContext.Provider value={{ isDegradedMode, toggleDegradedMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
