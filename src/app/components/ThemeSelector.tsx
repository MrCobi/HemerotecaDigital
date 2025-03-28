"use client";

import { useTheme } from "@/src/app/components/ThemeProvider";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mb-4 sm:mb-8">
      <label className="block text-gray-600 dark:text-blue-200/80 mb-2 text-sm sm:text-base">Tema</label>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={() => setTheme("light")}
          className={`px-3 py-2 rounded-md flex items-center justify-center text-sm ${
            theme === "light" 
              ? "bg-blue-500 text-white" 
              : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m6.34 17.66-1.41 1.41"></path>
            <path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
          Claro
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`px-3 py-2 rounded-md flex items-center justify-center text-sm ${
            theme === "dark" 
              ? "bg-blue-600 text-white" 
              : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
          Oscuro
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`px-3 py-2 rounded-md flex items-center justify-center text-sm ${
            theme === "system" 
              ? "bg-blue-500 text-white" 
              : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <rect width="16" height="12" x="4" y="6" rx="2"></rect>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="M12 22v-4"></path>
          </svg>
          Sistema
        </button>
      </div>
    </div>
  );
}
