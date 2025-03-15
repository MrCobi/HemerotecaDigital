// app/components/PrivacySettings.tsx
"use client";

import { Switch } from "@/src/app/components/ui/switch";
import { Label } from "@/src/app/components/ui/label";
import { updatePrivacySettings } from "@/lib/api";
import { useState } from "react";
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
        <Switch
          id="show-favorites"
          checked={settings.showFavorites}
          onCheckedChange={(val) => handleChange("showFavorites", val)}
        />
        <Label htmlFor="show-favorites">
          Mostrar mis periódicos favoritos públicamente
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="show-activity"
          checked={settings.showActivity}
          onCheckedChange={(val) => handleChange("showActivity", val)}
        />
        <Label htmlFor="show-activity">
          Mostrar mi actividad reciente públicamente
        </Label>
      </div>
    </div>
  );
}