// app/components/PrivacySettings.tsx

"use client";

import { Switch } from "@/src/app/components/ui/switch";
import { Label } from "@/components/ui/label";
import { updatePrivacySettings } from "@/lib/api";
import { useState } from "react";

export function PrivacySettings({ initialSettings }: {
  initialSettings: {
    showFavorites: boolean;
    showActivity: boolean;
  }
}) {
  const [settings, setSettings] = useState(initialSettings);

  const handleChange = async (field: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    await updatePrivacySettings({ [field]: value });
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