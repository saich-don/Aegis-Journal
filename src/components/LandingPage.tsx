import React from 'react';
import {
  Sparkles,
  Shield,
  ShieldCheck,
  Lock,
  BrainCircuit,
  BarChart2,
  Mic,
  Database,
  ArrowRight,
  BookOpen,
  CalendarCheck,
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  isSigningIn: boolean;
  error: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  isSigningIn,
  error,
}) => {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl mx-auto text-center space-y-10">
        {/* Security & Status Pill */}
        <div className="inline-flex items-center space-x-2.5 bg-[#0f172a] border border-slate-800 px-4 py-1.5 rounded-full text-xs shadow-xl">
          <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="font-semibold text-emerald-400 font-mono text-[11px]">AEGIS INTELLIGENCE SYSTEM</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Zero-Trust Memory Sanctuary</span>
        </div>

        {/* Hero Title & Subheading */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-100">
            Aegis Journal{' '}
            <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-300">
              Personal Growth & Memory System
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
            Beyond everyday journaling. Aegis unites multi-modal voice dictation, conversational reflection with Gemini 2.5 Flash, cross-journal recall (&ldquo;Ask My Past Self&rdquo;), and executive cognitive digests in an isolated multi-tenant Firestore architecture.
          </p>
        </div>

        {/* Primary CTA: Single Google Sign-In Button */}
        <div className="flex flex-col items-center space-y-4 pt-2">
          <button
            id="btn-google-signin"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all bg-indigo-600 hover:bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSigningIn ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Initializing Aegis Session...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Google SVG G-Icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17.4C3.7 21.1 7.5 24 12 24z"
                  />
                </svg>
                <span>Enter Aegis Journal</span>
                <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}
          </button>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl max-w-md">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-500 font-mono">
            Isolated to your authenticated Google account • Zero-trust backend proxying
          </p>
        </div>

        {/* 3 Flagship Enterprise Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 text-left">
          {/* Flagship 1 */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3 hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">Flagship 1</span>
              <h3 className="text-base font-semibold text-slate-100">
                Multi-Modal Voice Journaling
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spoken dictation with live speech wave visualization. Speak your stream of consciousness naturally; Gemini transforms speech into empathic dialogue and structured reflections.
            </p>
          </div>

          {/* Flagship 2 */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3 hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono">Flagship 2</span>
              <h3 className="text-base font-semibold text-slate-100">
                &ldquo;Ask My Past Self&rdquo; Memory Engine
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Query your full historical archive using natural language. Gemini synthesizes retrospective patterns, identifies recurring themes, and cites exact entries with dates.
            </p>
          </div>

          {/* Flagship 3 */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3 hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">Flagship 3</span>
              <h3 className="text-base font-semibold text-slate-100">
                Weekly Cognitive & Growth Digest
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate an executive-grade synthesis analyzing your emotional trajectory, peak accomplishments, resolved action items, and prioritized growth coaching directives.
            </p>
          </div>
        </div>

        {/* Enterprise Architecture Verification Checklist */}
        <div className="p-4 rounded-xl bg-[#0f172a]/60 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px]">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Google Secret Manager Ingress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Server JWT Cryptographic Verification</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Multi-Tenant Firestore Isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
