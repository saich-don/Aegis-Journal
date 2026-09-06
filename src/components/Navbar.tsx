import React from 'react';
import {
  Shield,
  ShieldCheck,
  Sparkles,
  BookOpen,
  BarChart3,
  MessageSquare,
  LogOut,
  Mic,
  BrainCircuit,
} from 'lucide-react';
import { UserProfile, ActiveTab } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onSignOut: () => Promise<void>;
  entriesCount: number;
  pendingTasksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onSignOut,
  entriesCount,
  pendingTasksCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#0f172a] border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-bold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-indigo-100 to-slate-300">
                  Aegis Journal
                </h1>
                <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-mono tracking-tight">Zero-Trust Protected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          {user && (
            <nav className="flex items-center h-full gap-1">
              <button
                id="nav-tab-chat"
                onClick={() => setActiveTab('chat')}
                className={`h-full px-3.5 sm:px-5 flex items-center gap-2 border-b-2 font-medium transition-colors text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 bg-slate-800/50 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Journal & Voice</span>
              </button>

              <button
                id="nav-tab-entries"
                onClick={() => setActiveTab('entries')}
                className={`h-full px-3.5 sm:px-5 flex items-center gap-2 border-b-2 font-medium transition-colors text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'entries'
                    ? 'border-indigo-500 bg-slate-800/50 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Entries & Recall</span>
                {entriesCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'entries'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {entriesCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`h-full px-3.5 sm:px-5 flex items-center gap-2 border-b-2 font-medium transition-colors text-xs sm:text-sm cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'border-indigo-500 bg-slate-800/50 text-indigo-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Analytics & Digest</span>
                {pendingTasksCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'analytics'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    {pendingTasksCount}
                  </span>
                )}
              </button>
            </nav>
          )}

          {/* User Profile & Sign Out */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-100 truncate max-w-[120px]">
                  {user.displayName || 'Journaler'}
                </p>
                <p className="text-[10px] text-slate-500 truncate max-w-[120px] font-mono">
                  {user.email}
                </p>
              </div>

              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full border-2 border-indigo-500/40 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center text-xs font-semibold text-slate-200">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <button
                id="nav-btn-signout"
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-xs text-slate-400">Enterprise Ready</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
