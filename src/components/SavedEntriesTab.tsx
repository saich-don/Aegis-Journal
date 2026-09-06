import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Tag,
  ListTodo,
  TrendingUp,
  ArrowUpDown,
  BookOpen,
  Trash2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  BrainCircuit,
  Compass,
  Quote,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { JournalEntry, MemoryQueryResult } from '../types';
import { auth } from '../lib/firebase';

interface SavedEntriesTabProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onStartNewSession: () => void;
}

const MEMORY_SUGGESTIONS = [
  "What were my biggest stressors recently and how did I unpack them?",
  "What commitments have I made regarding health and focus?",
  "How has my perspective and emotional headspace evolved?",
  "What are my most celebrated breakthroughs and wins?",
];

export const SavedEntriesTab: React.FC<SavedEntriesTabProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onStartNewSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'sentiment-high' | 'sentiment-low'>('newest');

  // Flagship 2: Memory Query State
  const [memoryQuestion, setMemoryQuestion] = useState('');
  const [isQueryingMemory, setIsQueryingMemory] = useState(false);
  const [memoryResult, setMemoryResult] = useState<MemoryQueryResult | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  // Collect all unique mood tags across entries
  const allMoodTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      e.moodTags.forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [entries]);

  // Filter & sort entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        if (selectedMoodFilter !== 'all' && !entry.moodTags.includes(selectedMoodFilter)) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = entry.title.toLowerCase().includes(q);
          const matchSummary = entry.summary.toLowerCase().includes(q);
          const matchTags = entry.moodTags.some((t) => t.toLowerCase().includes(q));
          const matchTakeaways = entry.keyTakeaways.some((t) => t.toLowerCase().includes(q));
          const matchActions = entry.actionItems.some((a) => a.task.toLowerCase().includes(q));
          return matchTitle || matchSummary || matchTags || matchTakeaways || matchActions;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        if (sortBy === 'sentiment-high') return b.sentimentScore - a.sentimentScore;
        if (sortBy === 'sentiment-low') return a.sentimentScore - b.sentimentScore;
        return 0;
      });
  }, [entries, searchQuery, selectedMoodFilter, sortBy]);

  // Execute Cross-Journal Memory Query via server proxy
  const handleExecuteMemoryQuery = async (questionToAsk?: string) => {
    const q = (questionToAsk || memoryQuestion).trim();
    if (!q || isQueryingMemory) return;

    if (entries.length === 0) {
      setMemoryError('You need at least one saved entry to query your past reflections.');
      return;
    }

    setIsQueryingMemory(true);
    setMemoryError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/memory-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
          question: q,
          entries: entries.map((e) => ({
            id: e.id,
            title: e.title,
            summary: e.summary,
            keyTakeaways: e.keyTakeaways,
            moodTags: e.moodTags,
            sentimentScore: e.sentimentScore,
            sentimentLabel: e.sentimentLabel,
            actionItems: e.actionItems,
            createdAt: e.createdAt,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Memory recall failed with status ${response.status}`);
      }

      const result: MemoryQueryResult = await response.json();
      setMemoryResult(result);
    } catch (err: unknown) {
      console.error('Memory query error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to query journal memory.';
      setMemoryError(msg);
    } finally {
      setIsQueryingMemory(false);
    }
  };

  const handleSelectCitation = (entryId: string) => {
    const matched = entries.find((e) => e.id === entryId);
    if (matched) {
      onSelectEntry(matched);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Flagship Feature 2: "Ask My Past Self" Cross-Journal Memory Engine */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b0f1a] border border-purple-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-lg shadow-purple-500/20">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-purple-400 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded">
                  Flagship 2 • Memory Engine
                </span>
                <span className="text-xs text-slate-400">Synthesized Cross-Journal Recall</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                &ldquo;Ask My Past Self&rdquo; Memory Search
              </h2>
            </div>
          </div>

          <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/80 px-3 py-1 rounded-full self-start sm:self-auto">
            {entries.length} Indexed Journal Entries
          </span>
        </div>

        {/* Query Input Box */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="input-memory-query"
                type="text"
                value={memoryQuestion}
                onChange={(e) => setMemoryQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteMemoryQuery();
                }}
                disabled={isQueryingMemory}
                placeholder="Ask anything across your reflections (e.g., 'What patterns recur when I feel burnt out?')"
                className="w-full bg-slate-900/90 border border-purple-500/30 rounded-xl pl-4 pr-4 py-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors shadow-inner"
              />
            </div>
            <button
              id="btn-execute-memory-query"
              onClick={() => handleExecuteMemoryQuery()}
              disabled={!memoryQuestion.trim() || isQueryingMemory}
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-purple-600/20 active:scale-95 transition-all cursor-pointer flex-shrink-0"
            >
              {isQueryingMemory ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Past...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Query Archive</span>
                </>
              )}
            </button>
          </div>

          {/* Preset Prompts Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-500 font-mono flex-shrink-0 flex items-center gap-1">
              <Compass className="w-3 h-3 text-purple-400" />
              SUGGESTED:
            </span>
            {MEMORY_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => {
                  setMemoryQuestion(sug);
                  handleExecuteMemoryQuery(sug);
                }}
                disabled={isQueryingMemory}
                className="px-3 py-1 rounded-lg bg-slate-900/80 hover:bg-purple-950/40 text-slate-400 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 text-[11px] transition-colors whitespace-nowrap cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Memory Query Error */}
        {memoryError && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span>{memoryError}</span>
            <button onClick={() => setMemoryError(null)} className="text-rose-400 hover:text-rose-200 font-mono text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Memory Synthesis Result Card */}
        {memoryResult && (
          <div className="bg-[#0b0f1a] border border-purple-500/40 rounded-xl p-5 sm:p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">
                  Synthesized Answer from {memoryResult.citations?.length || 0} Historical Entries
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Gemini 2.5 Flash Retrospective Engine
              </span>
            </div>

            {/* Answer Body */}
            <div className="space-y-2">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {memoryResult.answer}
              </p>
            </div>

            {/* Recurring Themes */}
            {((memoryResult.keyThemes && memoryResult.keyThemes.length > 0) || (memoryResult as any).recurringThemes) && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Recurring Behavioral & Emotional Themes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(memoryResult.keyThemes || (memoryResult as any).recurringThemes || []).map((theme: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-800/80 text-purple-300 text-xs font-medium"
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Forward-looking Coaching Directive */}
            {(memoryResult.coachingInsight || (memoryResult as any).growthDirective) && (
              <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Growth Directive Based On Past Patterns:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  &ldquo;{memoryResult.coachingInsight || (memoryResult as any).growthDirective}&rdquo;
                </p>
              </div>
            )}

            {/* Interactive Citations */}
            {memoryResult.citations && memoryResult.citations.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Source Citations (Click to view full entry):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {memoryResult.citations.map((citation, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCitation(citation.entryId)}
                      className="p-3 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-purple-400 font-mono">{citation.date}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300 transition-colors" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 truncate">
                        {citation.title || (citation as any).entryTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                        &ldquo;{citation.excerptOrRelevance || (citation as any).relevanceSnippet}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Standard Entries Filter & Catalog Toolbar */}
      <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Encrypted Journal Library
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict multi-tenant isolation under your authenticated Firestore partition
            </p>
          </div>

          <button
            onClick={onStartNewSession}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Reflection Session</span>
          </button>
        </div>

        {/* Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="input-search-entries"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries by title, takeaway, mood tags, or action items..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                id="select-sort-entries"
                value={sortBy}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl pl-8 pr-8 py-2 appearance-none focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="sentiment-high">Highest Sentiment</option>
                <option value="sentiment-low">Lowest Sentiment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mood Tags Filter Bar */}
        {allMoodTags.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 text-xs">
            <span className="text-slate-500 flex items-center gap-1 flex-shrink-0 font-mono text-[11px]">
              <Filter className="w-3 h-3 text-indigo-400" />
              MOOD:
            </span>
            <button
              onClick={() => setSelectedMoodFilter('all')}
              className={`px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 cursor-pointer text-xs ${
                selectedMoodFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All ({entries.length})
            </button>
            {allMoodTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedMoodFilter(tag)}
                className={`px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 cursor-pointer text-xs ${
                  selectedMoodFilter === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entries Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-semibold text-slate-200">
              {entries.length === 0 ? 'No Journal Entries Yet' : 'No Matching Entries Found'}
            </h3>
            <p className="text-xs text-slate-400">
              {entries.length === 0
                ? 'Begin your first conversation or voice session with Aegis Companion to reflect and auto-save a structured summary.'
                : 'Try clearing your search query or changing your mood filter to view other saved entries.'}
            </p>
          </div>
          {entries.length === 0 && (
            <button
              onClick={onStartNewSession}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Your First Journal Session</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntries.map((entry) => {
            const completedCount = entry.actionItems.filter((a) => a.completed).length;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="group relative bg-[#020617] hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between space-y-4"
              >
                {/* Card Top: Date & Sentiment Pill */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          entry.sentimentScore >= 0.3
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                            : entry.sentimentScore <= -0.2
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/80'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800/80'
                        }`}
                      >
                        {entry.sentimentLabel}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {entry.title}
                  </h3>

                  {/* Mood Tags */}
                  <p className="text-[10px] text-slate-500 italic truncate font-mono">
                    #{entry.moodTags.join(' #')}
                  </p>

                  {/* Summary Preview */}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {entry.summary}
                  </p>
                </div>

                {/* Card Bottom: Metadata & Action Items */}
                <div className="border-t border-slate-850 pt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                      <ListTodo className="w-3.5 h-3.5" />
                      {completedCount}/{entry.actionItems.length} TASKS
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                      <MessageSquare className="w-3 h-3" />
                      {entry.messages.length} MSGS
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete entry "${entry.title}"?`)) {
                          onDeleteEntry(entry.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
