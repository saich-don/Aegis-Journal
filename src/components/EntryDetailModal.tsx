import React, { useState } from 'react';
import {
  X,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Trash2,
  Bot,
  User as UserIcon,
  Sparkles,
  ListTodo,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { JournalEntry, ActionItem } from '../types';

interface EntryDetailModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onDelete: (entryId: string) => Promise<void>;
  onToggleActionItem: (entryId: string, actionItemId: string, completed: boolean) => Promise<void>;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  onClose,
  onDelete,
  onToggleActionItem,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!entry) return null;

  const handleCopySummary = () => {
    const content = `# ${entry.title}\nDate: ${new Date(entry.createdAt).toLocaleString()}\nSentiment: ${entry.sentimentLabel} (${entry.sentimentScore})\nMoods: ${entry.moodTags.join(', ')}\n\n## Summary\n${entry.summary}\n\n## Key Takeaways\n${entry.keyTakeaways.map(t => `- ${t}`).join('\n')}\n\n## Action Items\n${entry.actionItems.map(a => `- [${a.completed ? 'x' : ' '}] ${a.task} (${a.category})`).join('\n')}`;

    navigator.clipboard.writeText(content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const content = `# ${entry.title}\nDate: ${new Date(entry.createdAt).toLocaleString()}\nSentiment: ${entry.sentimentLabel} (${entry.sentimentScore})\nMoods: ${entry.moodTags.join(', ')}\n\n## Summary\n${entry.summary}\n\n## Key Takeaways\n${entry.keyTakeaways.map(t => `- ${t}`).join('\n')}\n\n## Action Items\n${entry.actionItems.map(a => `- [${a.completed ? 'x' : ' '}] ${a.task} (${a.category})`).join('\n')}\n\n## Full Conversation Log\n${entry.messages.map(m => `### ${m.role === 'user' ? 'You' : 'Aegis Companion'} (${new Date(m.timestamp).toLocaleTimeString()})\n${m.text}\n`).join('\n')}`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${entry.id}-${new Date(entry.createdAt).toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this journal entry? This cannot be undone.')) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#020617]/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800 bg-[#0f172a]">
          <div className="space-y-2 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at{' '}
                {new Date(entry.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  entry.sentimentScore >= 0.3
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : entry.sentimentScore <= -0.2
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}
              >
                {entry.sentimentLabel} ({entry.sentimentScore > 0 ? '+' : ''}
                {entry.sentimentScore.toFixed(2)})
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100">{entry.title}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Mood Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400 mr-1" />
            {entry.moodTags.map((tag, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Synthesized Summary */}
          <div className="bg-[#020617] rounded-xl p-4 border border-slate-800 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Synthesized Summary
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {entry.summary}
            </p>
          </div>

          {/* Key Insights & Action Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Insights */}
            <div className="bg-[#020617] rounded-xl p-4 border border-slate-800 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Key Insights
              </h4>
              <ul className="space-y-2">
                {entry.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span className="leading-relaxed">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items Checklist */}
            <div className="bg-[#020617] rounded-xl p-4 border border-slate-800 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                Extracted Actions ({entry.actionItems.length})
              </h4>
              <div className="space-y-2">
                {entry.actionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onToggleActionItem(entry.id, item.id, !item.completed)}
                    className={`flex items-start gap-3 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs transition-all cursor-pointer ${
                      item.completed ? 'opacity-50 line-through text-slate-400' : 'text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded border border-emerald-500/50 flex items-center justify-center flex-shrink-0 cursor-pointer ${
                        item.completed ? 'bg-emerald-500 text-slate-950 font-bold text-[9px]' : ''
                      }`}
                    >
                      {item.completed && '✓'}
                    </div>
                    <div className="flex-1">
                      <p className="leading-relaxed">{item.task}</p>
                      <span className="text-[10px] text-emerald-400/80 mt-0.5 inline-block font-mono">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Conversation History */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              Session Dialogue Transcript ({entry.messages.length} messages)
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto p-4 rounded-xl bg-[#0b0f1a] border border-slate-800">
              {entry.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${
                    m.role === 'user' ? 'justify-start' : 'flex-row-reverse ml-auto'
                  }`}
                >
                  {m.role === 'user' ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 flex-shrink-0 mt-0.5">
                        ME
                      </div>
                      <div className="p-3 rounded-2xl rounded-tl-none bg-slate-800/50 border border-slate-700/50 max-w-[82%] leading-relaxed text-slate-200">
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <span className="text-[9px] text-slate-500 mt-1 block font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex items-center justify-center text-white flex-shrink-0 mt-0.5 border border-indigo-400/30">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                      <div className="p-3 rounded-2xl rounded-tr-none bg-indigo-900/20 border border-indigo-500/20 max-w-[82%] leading-relaxed text-indigo-100">
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <span className="text-[9px] text-indigo-400/60 mt-1 block font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0f172a] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copySuccess ? 'Copied!' : 'Copy Summary'}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export .MD
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Deleting...' : 'Delete Entry'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
