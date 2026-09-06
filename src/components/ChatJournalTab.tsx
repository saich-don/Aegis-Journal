import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Tag,
  ListTodo,
  AlertCircle,
  Save,
  Shield,
  ArrowUpRight,
  Mic,
  MicOff,
  Volume2,
  Radio,
  Clock,
  StopCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChatMessage, SummarizeResponse, UserProfile, JournalEntry } from '../types';
import { saveJournalEntry, auth } from '../lib/firebase';

interface ChatJournalTabProps {
  user: UserProfile;
  onEntrySaved: (entry: JournalEntry) => void;
  onViewEntries: () => void;
}

const PROMPT_STARTERS = [
  {
    icon: '🌅',
    label: 'Morning Intentions',
    prompt: "Good morning! Today I want to set my focus and intentions. Can you help me clarify what truly matters most for today?",
  },
  {
    icon: '🌙',
    label: 'Evening Reflection & Wins',
    prompt: "I'd like to reflect on my day, celebrate what went well, and unpack any moments where I felt drained or challenged.",
  },
  {
    icon: '🧘',
    label: 'Decompress Stress',
    prompt: "I'm feeling a bit overwhelmed and stressed right now. Help me untangle these thoughts so I can gain mental clarity and peace.",
  },
  {
    icon: '💡',
    label: 'Brainstorm Solutions',
    prompt: "I have a complex challenge I need to think through. Act as my creative sparring partner and help me explore innovative angles.",
  },
];

export const ChatJournalTab: React.FC<ChatJournalTabProps> = ({
  user,
  onEntrySaved,
  onViewEntries,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarizeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Multi-Modal Voice Journaling Mode State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechInterim, setSpeechInterim] = useState('');
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Check browser speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicSupported(false);
    }
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Toggle Voice Journaling Dictation
  const startRecording = () => {
    setErrorMessage(null);
    setSpeechInterim('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalizedText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalizedText += event.results[i][0].transcript + ' ';
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        if (finalizedText) {
          setInputPrompt((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalizedText.trim()}` : finalizedText.trim();
          });
        }
        setSpeechInterim(interimText);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        if (isRecording) {
          // Restart if still intended to be recording
          try {
            recognition.start();
          } catch {
            setIsRecording(false);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Error starting voice recognition:', err);
      const errMsg = err instanceof Error ? err.message : 'Could not initialize microphone.';
      setErrorMessage(errMsg);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setSpeechInterim('');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatRecordingTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Handle sending a message to Gemini via server-side proxy
  const handleSendMessage = async (textToSend?: string) => {
    if (isRecording) {
      stopRecording();
    }

    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || isGenerating) return;

    setErrorMessage(null);
    setInputPrompt('');
    setSpeechInterim('');

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsGenerating(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
          messages: nextMessages,
          userPrompt: promptText,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      const modelMessage: ChatMessage = {
        id: `gem_${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: data.timestamp || Date.now(),
      };

      setMessages([...nextMessages, modelMessage]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to reach Aegis Companion.';
      setErrorMessage(errMsg);
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  // Trigger auto-summarization & sentiment extraction
  const handleSummarizeSession = async () => {
    if (isRecording) stopRecording();
    if (messages.length === 0 || isSummarizing) return;

    setErrorMessage(null);
    setIsSummarizing(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/summarize-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken || ''}`,
        },
        body: JSON.stringify({
          messages,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Summarization failed (${response.status})`);
      }

      const data: SummarizeResponse = await response.json();
      setSummaryData(data);
      setSaveSuccess(false);
    } catch (err: unknown) {
      console.error('Summarize error:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to generate session summary.';
      setErrorMessage(errMsg);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Save session directly to isolated Cloud Firestore collection
  const handleSaveToFirestore = async () => {
    if (!summaryData || !user.uid || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const entryToSave: Omit<JournalEntry, 'id'> = {
        userId: user.uid,
        title: summaryData.title,
        summary: summaryData.summary,
        keyTakeaways: summaryData.keyTakeaways,
        moodTags: summaryData.moodTags,
        sentimentScore: summaryData.sentimentScore,
        sentimentLabel: summaryData.sentimentLabel,
        actionItems: summaryData.actionItems.map((item) => ({
          ...item,
          sourceEntryTitle: summaryData.title,
        })),
        messages: messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const entryId = await saveJournalEntry(user.uid, entryToSave);

      const savedEntry: JournalEntry = {
        ...entryToSave,
        id: entryId,
      };

      onEntrySaved(savedEntry);
      setSaveSuccess(true);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981'],
      });
    } catch (err: unknown) {
      console.error('Firestore save error:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to save entry to Firestore.';
      setErrorMessage(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSession = () => {
    if (messages.length > 0 && !window.confirm('Reset this session? Unsaved conversation will be cleared.')) {
      return;
    }
    if (isRecording) stopRecording();
    setMessages([]);
    setSummaryData(null);
    setErrorMessage(null);
    setSaveSuccess(false);
    setInputPrompt('');
    setSpeechInterim('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Error Banner if any */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 text-rose-200 rounded-xl text-xs flex items-center space-x-2 shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Flagship Feature 1: Multi-Modal Voice Journaling Mode Banner */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              isRecording
                ? 'bg-rose-500/20 border border-rose-500 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
            }`}
          >
            {isRecording ? <Radio className="w-6 h-6 animate-spin" /> : <Mic className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2 py-0.5 rounded">
                Flagship 1 • Voice Dictation
              </span>
              {isRecording && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  REC {formatRecordingTime(recordingSeconds)}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-100 mt-1">
              Multi-Modal Spoken Journaling Mode
            </h3>
            <p className="text-xs text-slate-400">
              Speak your thoughts naturally. Aegis transcribes and processes your spoken reflections with Gemini 3.6 Flash in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            id="btn-toggle-voice-journal"
            onClick={toggleVoiceRecording}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
            }`}
          >
            {isRecording ? (
              <>
                <StopCircle className="w-4 h-4" />
                <span>Stop Spoken Dictation</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Spoken Reflection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Auto-Summary Result Card (if generated) */}
      {summaryData && (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2 py-0.5 rounded">
                  Aegis AI Session Digest
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    summaryData.sentimentScore >= 0.3
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : summaryData.sentimentScore <= -0.2
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  }`}
                >
                  {summaryData.sentimentLabel} ({summaryData.sentimentScore > 0 ? '+' : ''}
                  {summaryData.sentimentScore.toFixed(2)})
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100">{summaryData.title}</h3>
            </div>

            {/* Save Button */}
            <div className="flex items-center space-x-2">
              {saveSuccess ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Saved to Isolated Firestore!</span>
                  </span>
                  <button
                    onClick={onViewEntries}
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                  >
                    View in Entries &rarr;
                  </button>
                </div>
              ) : (
                <button
                  id="btn-save-entry"
                  onClick={handleSaveToFirestore}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving to Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save to Isolated Firestore</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mood Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-1 font-mono">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Mood Tags:
            </span>
            {summaryData.moodTags.map((tag, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Summary Text */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Synthesized Summary
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {summaryData.summary}
            </p>
          </div>

          {/* Key Insights & Extracted Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Key Insights & Breakthroughs
              </h4>
              <ul className="space-y-2">
                {summaryData.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span className="leading-relaxed">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                Extracted Action Items ({summaryData.actionItems.length})
              </h4>
              <div className="space-y-2">
                {summaryData.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs text-slate-300"
                  >
                    <div className="w-4 h-4 mt-0.5 rounded border border-emerald-500/50 flex items-center justify-center flex-shrink-0 text-[9px] text-emerald-400">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="leading-relaxed">{item.task}</p>
                      <span className="text-[10px] text-emerald-400/80 mt-1 inline-block font-mono">
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Elegant Dark Flex Layout (Aside + Chat Section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Real-time Companion Widgets */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-5">
          {/* Mood Real-time Widget */}
          <div className="bg-[#020617] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Emotional Headspace
              </h3>
              <span className="text-[10px] text-indigo-400 font-mono">LIVE</span>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-200">
                  {summaryData ? summaryData.moodTags[0] || 'Reflective' : 'Reflective'}
                </span>
                <span className="text-xs text-indigo-400 font-mono">
                  {summaryData ? `${Math.round(Math.abs(summaryData.sentimentScore) * 100)}% Trajectory` : 'Active'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: summaryData ? `${Math.max(25, Math.round(Math.abs(summaryData.sentimentScore) * 100))}%` : '75%' }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Real-time cognitive trajectory evaluated by Gemini 3.6 Flash.
            </p>
          </div>

          {/* Voice Journaling Quick Stats */}
          <div className="bg-[#020617] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Input Mode
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isRecording ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'}`}>
                {isRecording ? '🎙️ Spoken Dictation' : '💬 Dual Mode'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tap the microphone to speak your mind freely or type deep reflections into the text console.
            </p>
          </div>

          {/* Action Items Quick Peek */}
          <div className="bg-[#020617] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Extracted Commitments
              </h3>
              <span className="text-[10px] text-slate-600 font-mono">LIVE</span>
            </div>
            <div className="space-y-2.5">
              {summaryData && summaryData.actionItems.length > 0 ? (
                summaryData.actionItems.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs text-slate-300">
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border border-emerald-500/50 flex-shrink-0" />
                    <p className="leading-relaxed line-clamp-2">{item.task}</p>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-900/30 border border-slate-800 rounded-lg text-xs text-slate-500 text-center">
                  End session to extract commitments.
                </div>
              )}
            </div>
          </div>

          {/* System Integrity Widget */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mt-auto">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-mono">
              System Integrity
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Aegis Vault • Isolated</span>
            </div>
          </div>
        </div>

        {/* Center: Main Interactive Chat Section */}
        <div className="lg:col-span-9 bg-[#0b0f1a] border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[580px] shadow-2xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#0f172a]/60 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Aegis AI Companion
                </h3>
                <p className="text-[11px] text-slate-400">
                  Empathetic multi-modal reflection powered by Gemini 3.6 Flash
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  id="btn-reset-chat"
                  onClick={handleResetSession}
                  disabled={isGenerating || isSummarizing}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <span className="text-[11px] font-mono text-slate-500 px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                {messages.length} msgs
              </span>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[500px]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center space-y-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-semibold text-slate-100">
                    What&apos;s on your mind today?
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Speak your mind using the microphone, write freely to unpack what matters, or choose a guided reflection below:
                  </p>
                </div>

                {/* Starter Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
                  {PROMPT_STARTERS.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(starter.prompt)}
                      className="p-3.5 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all group flex items-start space-x-3 text-xs text-slate-300 cursor-pointer"
                    >
                      <span className="text-lg flex-shrink-0">{starter.icon}</span>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                          {starter.label}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2">
                          {starter.prompt}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 max-w-3xl ${
                    msg.role === 'user'
                      ? 'justify-start'
                      : 'flex-row-reverse self-end ml-auto justify-start'
                  }`}
                >
                  {/* User Bubble */}
                  {msg.role === 'user' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-slate-300">
                        {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ME'}
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-700/50 shadow-sm">
                        <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] text-slate-500 mt-1.5 block font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Aegis Companion Bubble */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-indigo-900/20 p-4 rounded-2xl rounded-tr-none border border-indigo-500/20 shadow-sm">
                        <p className="text-sm leading-relaxed text-indigo-100 whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] text-indigo-400/60 mt-1.5 block font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {isGenerating && (
              <div className="flex gap-4 max-w-3xl flex-row-reverse self-end ml-auto">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex-shrink-0 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="bg-indigo-900/20 px-5 py-4 rounded-2xl rounded-tr-none border border-indigo-500/20 flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-indigo-300 ml-2 font-mono">Aegis is reflecting...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Voice Waveform Live Indicator (when recording) */}
          {isRecording && (
            <div className="mx-6 mb-2 p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                {/* Visual Audio Waveform Equalizer */}
                <div className="flex items-center gap-1 h-5">
                  {[40, 80, 60, 95, 45, 75, 90, 50, 85, 60, 90, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-rose-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i % 5) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-rose-300">Listening to spoken reflection... </span>
                  <span className="font-mono text-rose-400">({formatRecordingTime(recordingSeconds)})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={stopRecording}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Done Speaking
                </button>
              </div>
            </div>
          )}

          {/* Live Interim Speech Preview */}
          {speechInterim && (
            <div className="mx-6 mb-2 px-3.5 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 italic font-mono flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse flex-shrink-0" />
              <span className="truncate">&ldquo;{speechInterim}&rdquo;</span>
            </div>
          )}

          {/* Bottom Input Area matching Design HTML */}
          <div className="p-6 bg-[#0f172a]/50 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row gap-4 items-end max-w-4xl mx-auto">
              <div className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2 shadow-inner focus-within:border-indigo-500 transition-colors">
                <textarea
                  ref={textareaRef}
                  id="input-chat-prompt"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating || isSummarizing}
                  placeholder={
                    isRecording
                      ? 'Listening to your voice... Speak continuously to transcribe your thoughts.'
                      : 'Speak via microphone or type your reflection here...'
                  }
                  rows={2}
                  className="bg-transparent outline-none text-sm resize-none w-full text-slate-200 placeholder-slate-500 focus:ring-0"
                />
                <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>Aegis Zero-Trust</span>
                    <span>•</span>
                    <span>Gemini 3.6 Flash</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Voice Dictation Button */}
                    <button
                      id="btn-mic-dictate"
                      onClick={toggleVoiceRecording}
                      disabled={isGenerating || isSummarizing}
                      className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title={isRecording ? 'Stop Recording' : 'Dictate Spoken Thoughts (Microphone)'}
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      id="btn-send-chat"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim() || isGenerating || isSummarizing}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer"
                      title="Send Reflection"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* End Session & Summarize Button */}
              <button
                id="btn-summarize-session"
                onClick={handleSummarizeSession}
                disabled={messages.length === 0 || isGenerating || isSummarizing}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-[76px] px-8 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
              >
                {isSummarizing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] opacity-70 uppercase tracking-widest">Synthesizing</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs sm:text-sm tracking-wide">END SESSION</span>
                    <span className="text-[10px] opacity-70 tracking-wider font-normal">& SUMMARIZE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
