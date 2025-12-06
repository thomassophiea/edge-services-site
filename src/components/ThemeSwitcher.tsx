import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Palette } from 'lucide-react';
import { applyTheme, getStoredTheme, themes, type ThemeMode } from '../lib/themes';

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getStoredTheme());

  useEffect(() => {
    // Apply theme on mount
    applyTheme(currentTheme);
  }, []);

  const handleThemeChange = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 text-xs">
            {themes[currentTheme].emoji}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-semibold">Choose Theme</div>
        {(Object.keys(themes) as ThemeMode[]).map((themeKey) => {
          const theme = themes[themeKey];
          return (
            <DropdownMenuItem
              key={themeKey}
              onClick={() => handleThemeChange(themeKey)}
              className={`flex items-center justify-between cursor-pointer ${
                currentTheme === themeKey ? 'bg-accent' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{theme.emoji}</span>
                <span>{theme.displayName}</span>
              </span>
              {currentTheme === themeKey && (
                <span className="text-xs">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
