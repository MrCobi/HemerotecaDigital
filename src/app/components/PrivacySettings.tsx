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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        <div className="flex items-center order-2 sm:order-1">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.showFavorites}
            onChange={() => handleChange("showFavorites", !settings.showFavorites)}
            id="show-favorites-switch"
          />
          <label 
            htmlFor="show-favorites-switch"
            className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 cursor-pointer">
          </label>
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white order-1 sm:order-2 mb-1 sm:mb-0 sm:ms-3">
          Mostrar mis periódicos favoritos públicamente
        </span>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center order-2 sm:order-1">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.showActivity}
            onChange={() => handleChange("showActivity", !settings.showActivity)}
            id="show-activity-switch"
          />
          <label 
            htmlFor="show-activity-switch"
            className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 cursor-pointer">
          </label>
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-white order-1 sm:order-2 mb-1 sm:mb-0 sm:ms-3">
          Mostrar mi actividad reciente públicamente
        </span>
      </div>
    </div>
  );
}