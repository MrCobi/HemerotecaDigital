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
      <div className="flex items-center mb-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.showFavorites}
            onChange={() => handleChange("showFavorites", !settings.showFavorites)}
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-900 dark:text-white">
            Mostrar mis periódicos favoritos públicamente
          </span>
        </label>
      </div>
      
      <div className="flex items-center">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.showActivity}
            onChange={() => handleChange("showActivity", !settings.showActivity)}
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-900 dark:text-white">
            Mostrar mi actividad reciente públicamente
          </span>
        </label>
      </div>
    </div>
  );
}