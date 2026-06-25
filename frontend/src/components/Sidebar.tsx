/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scale, Home, Library, BarChart3, Settings } from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (screen: 'home' | 'live' | 'verdict' | 'library' | 'analytics') => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  currentScreen,
  onNavigate,
  onOpenSettings,
}: SidebarProps) {
  
  return (
    <aside 
      id="app-icon-rail"
      className="w-16 md:w-20 h-full flex flex-col items-center py-6 border-r shrink-0 select-none bg-zinc-950 border-zinc-900 shadow-xl z-20 relative"
    >
      {/* App Brand Icon */}
      <div className="mb-8 relative group cursor-pointer" onClick={() => onNavigate('home')}>
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl accent-gradient flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <Scale className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-800 text-zinc-100 text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50">
          Debate Arena
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 border-[5px] border-transparent border-r-zinc-800" />
        </div>
      </div>

      {/* Primary Navigation Icons */}
      <nav className="flex-1 w-full flex flex-col items-center gap-4">
        
        <NavButton 
          icon={<Home className="w-5 h-5 md:w-6 md:h-6" />} 
          label="Home"
          isActive={currentScreen === 'home'} 
          onClick={() => onNavigate('home')} 
        />
        
        <NavButton 
          icon={<Library className="w-5 h-5 md:w-6 md:h-6" />} 
          label="Library"
          isActive={currentScreen === 'library'} 
          onClick={() => onNavigate('library')} 
        />
        
        <NavButton 
          icon={<BarChart3 className="w-5 h-5 md:w-6 md:h-6" />} 
          label="Analytics"
          isActive={currentScreen === 'analytics'} 
          onClick={() => onNavigate('analytics')} 
        />

      </nav>

      {/* Bottom Actions */}
      <div className="w-full flex flex-col items-center gap-4 mt-auto">
        <NavButton 
          icon={<Settings className="w-5 h-5 md:w-6 md:h-6" />} 
          label="Settings"
          isActive={false} 
          onClick={onOpenSettings} 
        />
      </div>
    </aside>
  );
}

function NavButton({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all group cursor-pointer ${
        isActive 
          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
          : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
      }`}
    >
      {icon}
      
      {/* Active Indicator Dot */}
      {isActive && (
        <span className="absolute -right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Tooltip */}
      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-zinc-800 text-zinc-100 text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50">
        {label}
        <div className="absolute top-1/2 -translate-y-1/2 -left-1 border-[5px] border-transparent border-r-zinc-800" />
      </div>
    </button>
  );
}
