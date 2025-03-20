// app/components/PrivacySettings.tsx
"use client";

import { useState } from "react";
import { updatePrivacySettings } from "@/lib/api";
import type { PrivacySettings } from "@/src/interface/user";

export function PrivacySettings({ initialSettings }: {
  initialSettings: PrivacySettings
}) {
  const [settings, setSettings] = useState<PrivacySettings>(initialSettings);

  const handleChange = async (field: keyof PrivacySettings, value: boolean) => {
    const newSettings = {
      ...settings,
      [field]: value
    };
    
    setSettings(newSettings);
    await updatePrivacySettings(newSettings);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          role="switch"
          aria-checked={settings.showFavorites}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${settings.showFavorites ? 'bg-blue-500 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          onClick={() => handleChange("showFavorites", !settings.showFavorites)}
        >
          <span className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform ${settings.showFavorites ? 'translate-x-5' : 'translate-x-0.5'}`}>
            {settings.showFavorites && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </button>
        <label className="text-gray-700 dark:text-blue-200 text-sm cursor-pointer" onClick={() => handleChange("showFavorites", !settings.showFavorites)}>
          Mostrar mis periódicos favoritos públicamente
        </label>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          type="button"
          role="switch"
          aria-checked={settings.showActivity}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${settings.showActivity ? 'bg-blue-500 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          onClick={() => handleChange("showActivity", !settings.showActivity)}
        >
          <span className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform ${settings.showActivity ? 'translate-x-5' : 'translate-x-0.5'}`}>
            {settings.showActivity && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </button>
        <label className="text-gray-700 dark:text-blue-200 text-sm cursor-pointer" onClick={() => handleChange("showActivity", !settings.showActivity)}>
          Mostrar mi actividad reciente públicamente
        </label>
      </div>
    </div>
  );
}