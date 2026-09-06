import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ChatJournalTab } from './components/ChatJournalTab';
import { SavedEntriesTab } from './components/SavedEntriesTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { EntryDetailModal } from './components/EntryDetailModal';
import {
  UserProfile,
  JournalEntry,
  ActiveTab,
  ActionItem,
} from './types';
import {
  onAuthChange,
  signInWithGoogle,
  signOutUser,
  subscribeUserJournalEntries,
  deleteJournalEntry,
  updateJournalEntryActionItems,
} from './lib/firebase';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // 1. Listen for Firebase Auth changes persistently
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
        setEntries([]);
        setSelectedEntry(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time subscription to authenticated user's isolated Firestore collection: users/{uid}/journal_entries
  useEffect(() => {
    if (!user?.uid) {
      setEntries([]);
      return;
    }

    setFirestoreError(null);
    const unsubscribe = subscribeUserJournalEntries(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        // If an entry is opened in modal, keep it updated
        setSelectedEntry((curr) => {
          if (!curr) return null;
          return fetchedEntries.find((e) => e.id === curr.id) || null;
        });
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setFirestoreError('Failed to sync isolated Firestore data.');
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Sign In with Google
  const handleSignIn = async () => {
    setSignInLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      const errMsg = err instanceof Error ? err.message : 'Google authentication failed.';
      setAuthError(errMsg);
    } finally {
      setSignInLoading(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setActiveTab('chat');
    } catch (err: unknown) {
      console.error('Sign out error:', err);
    }
  };

  // Toggle Action Item completion directly in isolated Firestore
  const handleToggleActionItem = async (
    entryId: string,
    actionItemId: string,
    completed: boolean
  ) => {
    if (!user?.uid) return;

    const targetEntry = entries.find((e) => e.id === entryId);
    if (!targetEntry) return;

    const updatedActionItems = targetEntry.actionItems.map((item) =>
      item.id === actionItemId ? { ...item, completed } : item
    );

    try {
      await updateJournalEntryActionItems(user.uid, entryId, updatedActionItems);
    } catch (err: unknown) {
      console.error('Failed to update action item:', err);
    }
  };

  // Delete Journal Entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await deleteJournalEntry(user.uid, entryId);
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
    } catch (err: unknown) {
      console.error('Failed to delete entry:', err);
      alert('Failed to delete entry from Cloud Firestore.');
    }
  };

  // Count pending action items across all entries
  const pendingTasksCount = entries.reduce((acc, entry) => {
    return acc + entry.actionItems.filter((item) => !item.completed).length;
  }, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Verifying session integrity...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        entriesCount={entries.length}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {firestoreError && (
          <div className="mb-4 p-3 bg-amber-950/80 border border-amber-800 text-amber-200 text-xs rounded-xl">
            {firestoreError}
          </div>
        )}

        {!user ? (
          <LandingPage
            onSignIn={handleSignIn}
            isSigningIn={signInLoading}
            error={authError}
          />
        ) : (
          <div>
            {activeTab === 'chat' && (
              <ChatJournalTab
                user={user}
                onEntrySaved={(savedEntry) => {
                  // Optionally switch to entries or stay on chat
                }}
                onViewEntries={() => setActiveTab('entries')}
              />
            )}

            {activeTab === 'entries' && (
              <SavedEntriesTab
                entries={entries}
                onSelectEntry={(entry) => setSelectedEntry(entry)}
                onDeleteEntry={handleDeleteEntry}
                onStartNewSession={() => setActiveTab('chat')}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab
                entries={entries}
                onToggleActionItem={handleToggleActionItem}
                onSelectEntry={(entry) => setSelectedEntry(entry)}
                onStartNewSession={() => setActiveTab('chat')}
              />
            )}
          </div>
        )}
      </main>

      {/* Entry Detail & Conversation Modal */}
      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={handleDeleteEntry}
          onToggleActionItem={handleToggleActionItem}
        />
      )}
    </div>
  );
}
