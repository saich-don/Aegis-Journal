import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Smile,
  ListTodo,
  CheckCircle2,
  Tag,
  Calendar,
  Sparkles,
  Award,
  Filter,
  ArrowRight,
  BrainCircuit,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  Target,
  FileText,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { JournalEntry, ActionItem, WeeklyCognitiveDigest } from '../types';
import { auth } from '../lib/firebase';

interface AnalyticsTabProps {
  entries: JournalEntry[];
  onToggleActionItem: (entryId: string, actionItemId: string, completed: boolean) => Promise<void>;
  onSelectEntry: (entry: JournalEntry) => void;
  onStartNewSession: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  entries,
  onToggleActionItem,
  onSelectEntry,
  onStartNewSession,
}) => {
  const [taskFilterStatus, setTaskFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');
  const [taskFilterCategory, setTaskFilterCategory] = useState<string>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{
    entry: JournalEntry;
    x: number;
    y: number;
  } | null>(null);

  // Flagship Feature 3: Weekly Cognitive & Growth Digest State
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyCognitiveDigest | null>(null);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Aggregate all action items from all entries
  const allActionItems = useMemo(() => {
    const list: Array<ActionItem & { entryId: string; entryTitle: string; entryDate: number }> = [];
    entries.forEach((entry) => {
      entry.actionItems.forEach((item) => {
        list.push({
          ...item,
          entryId: entry.id,
          entryTitle: entry.title,
          entryDate: entry.createdAt,
        });
      });
    });
    return list;
  }, [entries]);

  // Filtered action items
  const filteredActionItems = useMemo(() => {
    return allActionItems.filter((item) => {
      if (taskFilterStatus === 'pending' && item.completed) return false;
      if (taskFilterStatus === 'completed' && !item.completed) return false;
      if (taskFilterCategory !== 'all' && item.category !== taskFilterCategory) return false;
      return true;
    });
  }, [allActionItems, taskFilterStatus, taskFilterCategory]);

  // Mood frequency calculation
  const moodFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      e.moodTags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Sentiment metrics
  const { avgSentiment, predominantMood, completedTasksCount, totalTasksCount, completionPercentage } =
    useMemo(() => {
      if (entries.length === 0) {
        return {
          avgSentiment: 0,
          predominantMood: 'None',
          completedTasksCount: 0,
          totalTasksCount: 0,
          completionPercentage: 0,
        };
      }

      const totalScore = entries.reduce((acc, e) => acc + e.sentimentScore, 0);
      const avg = totalScore / entries.length;

      const topMood = moodFrequency.length > 0 ? moodFrequency[0].tag : 'Reflective';
      const completed = allActionItems.filter((i) => i.completed).length;
      const total = allActionItems.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        avgSentiment: avg,
        predominantMood: topMood,
        completedTasksCount: completed,
        totalTasksCount: total,
        completionPercentage: pct,
      };
    }, [entries, moodFrequency, allActionItems]);

  // Chronological entries for sentiment trend
  const chronologicalEntries = useMemo(() => {
    return [...entries].sort((a, b) => a.createdAt - b.createdAt);
  }, [entries]);

  // Trigger Weekly Cognitive Digest Generation via server-side proxy
  const handleGenerateWeeklyDigest = async () => {
    if (entries.length === 0 || isGeneratingDigest) return;

    setIsGeneratingDigest(true);
    setDigestError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/weekly-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
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
        throw new Error(errJson.error || `Weekly digest generation failed with status ${response.status}`);
      }

      const digest: WeeklyCognitiveDigest = await response.json();
      setWeeklyDigest(digest);
    } catch (err: unknown) {
      console.error('Weekly digest error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to generate weekly cognitive digest.';
      setDigestError(msg);
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  const handleCopyDigest = () => {
    if (!weeklyDigest) return;

    const reportText = `=====================================================
AEGIS EXECUTIVE WEEKLY COGNITIVE & GROWTH DIGEST
=====================================================
Headline: ${weeklyDigest.headline}
Generated: ${new Date(weeklyDigest.generatedAt).toLocaleString()}

EXECUTIVE SUMMARY:
${weeklyDigest.executiveSummary}

EMOTIONAL TRAJECTORY:
${weeklyDigest.emotionalTrajectory}

BREAKTHROUGHS & STRESSORS:
${weeklyDigest.topStressorsAndBreakthroughs.map((s, i) => `${i + 1}. Friction: ${s.stressor}\n   Breakthrough: ${s.breakthroughOrLesson}`).join('\n\n')}

CELEBRATED WINS:
${weeklyDigest.celebratedWins.map((w, i) => `• ${w}`).join('\n')}

ACTION AUDIT:
- Tasks: ${weeklyDigest.actionItemsAudit.completed}/${weeklyDigest.actionItemsAudit.total} Completed (${weeklyDigest.actionItemsAudit.resolutionRate})
- Recommendations: ${weeklyDigest.actionItemsAudit.recommendations}

STRATEGIC GROWTH DIRECTIVES:
${weeklyDigest.growthCoachingDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')}
=====================================================`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  if (entries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto bg-[#0f172a] border border-slate-800 rounded-2xl p-12 text-center space-y-5 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
          <BarChart3 className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-100">No Analytics Data Yet</h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Record and save your first journal sessions to populate real-time emotional trend charts,
            mood distributions, and AI-extracted action items.
          </p>
        </div>
        <button
          onClick={onStartNewSession}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start Journal Session</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Journal Sessions</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{entries.length}</div>
          <p className="text-[11px] text-slate-500 font-mono">Firestore Isolated Partition</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Sentiment Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {avgSentiment > 0 ? '+' : ''}
              {avgSentiment.toFixed(2)}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                avgSentiment >= 0.2
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : avgSentiment <= -0.2
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              }`}
            >
              {avgSentiment >= 0.2 ? 'Positive' : avgSentiment <= -0.2 ? 'Challenging' : 'Balanced'}
            </span>
          </div>
          <div className="relative h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className="absolute h-full bg-gradient-to-r from-orange-400 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.3)]"
              style={{ width: `${Math.max(5, Math.min(100, Math.round(((avgSentiment + 1) / 2) * 100)))}%` }}
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Predominant Mood</span>
            <Smile className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 truncate">#{predominantMood}</div>
          <p className="text-[11px] text-slate-500 font-mono">Most frequent emotional tone</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Action Resolution</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">{completionPercentage}%</span>
            <span className="text-xs text-slate-400">
              ({completedTasksCount}/{totalTasksCount})
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flagship Feature 3: Weekly Cognitive & Growth Digest Card */}
      <div className="bg-gradient-to-br from-[#0f172a] via-[#0d1527] to-[#020617] border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                  Flagship 3 • Executive Synthesis
                </span>
                <span className="text-xs text-slate-400 font-mono">Gemini 3.6 Flash Deep Engine</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                Weekly Cognitive & Growth Digest
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {weeklyDigest && (
              <button
                onClick={handleCopyDigest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Copy Full Digest to Clipboard"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Report</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-generate-weekly-digest"
              onClick={handleGenerateWeeklyDigest}
              disabled={isGeneratingDigest}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
            >
              {isGeneratingDigest ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Week...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{weeklyDigest ? 'Regenerate Digest' : 'Generate Weekly Digest'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {digestError && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center justify-between">
            <span>{digestError}</span>
            <button onClick={() => setDigestError(null)} className="text-rose-400 hover:text-rose-200 font-mono text-xs">
              Dismiss
            </button>
          </div>
        )}

        {!weeklyDigest && !isGeneratingDigest && (
          <div className="p-8 bg-[#020617]/70 border border-slate-800/80 rounded-xl text-center space-y-2">
            <BrainCircuit className="w-8 h-8 text-emerald-400/50 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">
              Ready to generate your executive synthesis
            </p>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Click &ldquo;Generate Weekly Digest&rdquo; to analyze your emotional trajectory, extract top stressors and breakthroughs, audit action items, and generate forward-looking coaching directives.
            </p>
          </div>
        )}

        {/* Render Generated Weekly Digest */}
        {weeklyDigest && (
          <div className="space-y-6 animate-fadeIn">
            {/* Headline Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-purple-950/20 border border-emerald-500/30 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Thematic Executive Headline
              </span>
              <h3 className="text-base sm:text-xl font-bold text-slate-100 leading-snug">
                &ldquo;{weeklyDigest.headline}&rdquo;
              </h3>
            </div>

            {/* Executive Summary */}
            <div className="bg-[#020617] border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                Executive Cognitive Summary
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {weeklyDigest.executiveSummary}
              </p>
            </div>

            {/* Emotional Trajectory Analysis */}
            <div className="bg-[#020617] border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                Emotional Trajectory & Headspace
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {weeklyDigest.emotionalTrajectory}
              </p>
            </div>

            {/* Stressors vs. Breakthroughs Grid */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Friction Points & Unpacked Breakthroughs
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weeklyDigest.topStressorsAndBreakthroughs.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
                        Friction Encountered
                      </span>
                      <p className="text-xs text-slate-300">{item.stressor}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                        Extracted Lesson / Breakthrough
                      </span>
                      <p className="text-xs text-slate-200 font-medium">{item.breakthroughOrLesson}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Celebrated Wins */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Celebrated Wins & Positive Behaviors
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {weeklyDigest.celebratedWins.map((win, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{win}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items Audit */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                  Action Items & Execution Audit
                </h4>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  {weeklyDigest.actionItemsAudit.resolutionRate} Resolution
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {weeklyDigest.actionItemsAudit.recommendations}
              </p>
            </div>

            {/* Prioritized Growth Coaching Directives */}
            <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 font-mono flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Strategic Growth Coaching Directives (Next 7 Days)
              </h4>
              <div className="space-y-2">
                {weeklyDigest.growthCoachingDirectives.map((directive, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-slate-200"
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="leading-relaxed font-medium">{directive}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics Row: Sentiment Trend Chart + Mood Frequency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Emotional Trajectory & Sentiment Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Visual progression across chronological reflections
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span>Positive</span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-2" />
              <span>Challenging</span>
            </div>
          </div>

          {/* SVG Line / Dot Chart */}
          <div className="relative w-full h-56 pt-2 select-none bg-[#020617] rounded-xl border border-slate-850 p-3">
            {chronologicalEntries.length === 1 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 space-y-2">
                <span>Single entry recorded with score: {chronologicalEntries[0].sentimentScore}</span>
                <span className="text-[11px] text-slate-500">
                  Add more journal entries to generate continuous trend lines.
                </span>
              </div>
            ) : (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
                {/* Zero line (Neutral) */}
                <line
                  x1="20"
                  y1="80"
                  x2="480"
                  y2="80"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x="22" y="75" fill="#475569" fontSize="9" fontFamily="monospace">
                  Neutral 0.0
                </text>
                <text x="22" y="20" fill="#10b981" fontSize="9" fontFamily="monospace">
                  +1.0 High
                </text>
                <text x="22" y="150" fill="#f59e0b" fontSize="9" fontFamily="monospace">
                  -1.0 Low
                </text>

                {(() => {
                  const points = chronologicalEntries.map((e, idx) => {
                    const x = 50 + (idx / (chronologicalEntries.length - 1)) * 420;
                    const normalized = (e.sentimentScore + 1) / 2;
                    const y = 140 - normalized * 120;
                    return { x, y, entry: e };
                  });

                  const pathData = points
                    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                    .join(' ');

                  return (
                    <>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <path
                        d={`${pathData} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`}
                        fill="url(#chartGradient)"
                      />

                      <path
                        d={pathData}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interactive Data Dots */}
                      {points.map((pt) => {
                        const isPositive = pt.entry.sentimentScore >= 0;
                        return (
                          <g key={pt.entry.id}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="5"
                              fill={isPositive ? '#10b981' : '#f59e0b'}
                              stroke="#020617"
                              strokeWidth="2"
                              className="cursor-pointer hover:scale-150 transition-transform"
                              onMouseEnter={() =>
                                setHoveredPoint({ entry: pt.entry, x: pt.x, y: pt.y })
                              }
                              onMouseLeave={() => setHoveredPoint(null)}
                              onClick={() => onSelectEntry(pt.entry)}
                            />
                            <text
                              x={pt.x}
                              y="155"
                              fill="#475569"
                              fontSize="9"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {new Date(pt.entry.createdAt).toLocaleDateString(undefined, {
                                month: 'numeric',
                                day: 'numeric',
                              })}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            )}

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute z-20 pointer-events-none bg-[#020617] border border-indigo-500/60 rounded-xl p-3 shadow-2xl text-xs space-y-1 w-48 -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(hoveredPoint.x / 500) * 100}%`,
                  top: `${(hoveredPoint.y / 160) * 100 - 10}%`,
                }}
              >
                <div className="font-bold text-slate-100 truncate">
                  {hoveredPoint.entry.title}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Score:</span>
                  <span
                    className={`font-semibold font-mono ${
                      hoveredPoint.entry.sentimentScore >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {hoveredPoint.entry.sentimentScore > 0 ? '+' : ''}
                    {hoveredPoint.entry.sentimentScore.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Moods: {hoveredPoint.entry.moodTags.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mood Distribution Breakdown (1 Col) */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
              Mood Frequency
            </h3>
            <p className="text-xs text-slate-400">Distribution of AI-assigned mood descriptors</p>
          </div>

          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
            {moodFrequency.map(({ tag, count }) => {
              const percentage = Math.round((count / entries.length) * 100);
              return (
                <div key={tag} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">#{tag}</span>
                    <span className="text-xs text-indigo-400 font-mono">
                      {percentage}% Match
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Centralized Action Items Checklist Section */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
              Extracted Action Items
            </h3>
            <p className="text-xs text-slate-400">
              Personal commitments extracted by Gemini during reflection sessions
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 self-start sm:self-auto">
            <button
              onClick={() => setTaskFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                taskFilterStatus === 'pending'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending ({allActionItems.filter((i) => !i.completed).length})
            </button>
            <button
              onClick={() => setTaskFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                taskFilterStatus === 'completed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed ({allActionItems.filter((i) => i.completed).length})
            </button>
            <button
              onClick={() => setTaskFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                taskFilterStatus === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({allActionItems.length})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto text-xs pb-1">
          <span className="text-slate-500 font-mono text-[11px]">CATEGORY:</span>
          {['all', 'Personal', 'Work', 'Wellness', 'Mindset'].map((cat) => (
            <button
              key={cat}
              onClick={() => setTaskFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                taskFilterCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Task Items List */}
        {filteredActionItems.length === 0 ? (
          <div className="p-8 bg-slate-900/30 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p>
              {taskFilterStatus === 'pending'
                ? 'No pending action items! All tasks are completed.'
                : 'No tasks found for this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredActionItems.map((item) => (
              <div
                key={`${item.entryId}_${item.id}`}
                onClick={() => onToggleActionItem(item.entryId, item.id, !item.completed)}
                className={`group flex items-start gap-3 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs text-slate-300 transition-all cursor-pointer ${
                  item.completed ? 'opacity-50 line-through' : 'hover:border-emerald-500/40'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded border border-emerald-500/50 flex items-center justify-center flex-shrink-0 cursor-pointer ${
                    item.completed ? 'bg-emerald-500 text-slate-950 font-bold text-[10px]' : ''
                  }`}
                >
                  {item.completed && '✓'}
                </div>

                <div className="flex-1 space-y-1">
                  <p className="leading-relaxed">{item.task}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
                      {item.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const found = entries.find((en) => en.id === item.entryId);
                        if (found) onSelectEntry(found);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-mono text-[10px]"
                    >
                      <span>From: {item.entryTitle}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
