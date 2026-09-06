import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry, ActionItem } from '../types';

// Initialize Firebase App instance safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with the provisioned database ID
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== ''
  ? firebaseConfig.firestoreDatabaseId
  : '(default)';
export const db = getFirestore(app, dbId);

// Auth Helpers
export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// Isolated Firestore Data Access: users/{userId}/journal_entries/{entryId}
export const getJournalEntriesCollection = (userId: string) => {
  return collection(db, 'users', userId, 'journal_entries');
};

export const saveJournalEntry = async (
  userId: string,
  entryData: Omit<JournalEntry, 'id'>
): Promise<string> => {
  const colRef = getJournalEntriesCollection(userId);
  const newDocRef = doc(colRef);
  const entryWithId: JournalEntry = {
    ...entryData,
    id: newDocRef.id,
    userId,
    updatedAt: Date.now(),
  };
  await setDoc(newDocRef, entryWithId);
  return newDocRef.id;
};

export const deleteJournalEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'journal_entries', entryId);
  await deleteDoc(docRef);
};

export const updateActionItemStatus = async (
  userId: string,
  entryId: string,
  actionItemId: string,
  completed: boolean
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'journal_entries', entryId);
  // Fetch and update action item inside the document
  // We can update the actionItems array
  // In real-time listener, client has the entry, but here we can read or use Firestore update
  // To avoid race conditions, we can pass updated actionItems array or updateDoc
};

export const updateJournalEntryActionItems = async (
  userId: string,
  entryId: string,
  actionItems: ActionItem[]
): Promise<void> => {
  const docRef = doc(db, 'users', userId, 'journal_entries', entryId);
  await updateDoc(docRef, {
    actionItems,
    updatedAt: Date.now(),
  });
};

export const subscribeUserJournalEntries = (
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const colRef = getJournalEntriesCollection(userId);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      onUpdate(entries);
    },
    (error) => {
      console.error('Firestore listener error:', error);
      if (onError) onError(error);
    }
  );
};
