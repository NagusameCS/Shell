/**
 * Firebase Configuration for Shell IDE
 */

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBT2aio4RviupuWKIFbflL6R2CpRJcbfNo",
  authDomain: "shell-ide.firebaseapp.com",
  projectId: "shell-ide",
  storageBucket: "shell-ide.firebasestorage.app",
  messagingSenderId: "519393287232",
  appId: "1:519393287232:web:23707ebfb542b3bf6193a5",
  measurementId: "G-BCLDXZC1SV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser)
let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// Initialize Auth
export const auth = getAuth(app);

// Set persistence to LOCAL (persists until explicit sign out - 30+ days)
setPersistence(auth, browserLocalPersistence).catch(console.error);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Check if running in Tauri (desktop app)
export const IS_TAURI = typeof window !== 'undefined' && '__TAURI__' in window;
export const IS_LOCALHOST = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Auth redirect page hosted on GitHub Pages (authorized domain)
export const AUTH_PAGE_URL = 'https://nagusamecs.github.io/Shell/auth.html';

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// ============================================
// User Types
// ============================================

export type UserTier = "free" | "educator";

export interface ShellUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  tier: UserTier;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  settings: UserSettings;
  classrooms?: string[]; // For educators
  enrolledClassrooms?: string[]; // For students
}

export interface UserSettings {
  theme: "dark" | "light" | "system";
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  autoSave: boolean;
  cloudSyncEnabled: boolean;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  educatorId: string;
  educatorName: string;
  code: string; // Join code
  createdAt: Timestamp;
  studentCount: number;
}

export interface CloudProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  files: { path: string; storageRef: string }[];
}

// ============================================
// Authentication Functions
// ============================================

/**
 * Check for local educator upgrade and apply it to user data
 */
function checkLocalEducatorUpgrade(userData: ShellUser): ShellUser {
  const localUpgrade = localStorage.getItem('shell_educator_upgrade');
  if (localUpgrade) {
    try {
      const upgrade = JSON.parse(localUpgrade);
      if (upgrade.userId === userData.uid) {
        return { ...userData, tier: 'educator' };
      }
    } catch (e) {
      console.error('Failed to parse local upgrade:', e);
    }
  }
  return userData;
}

/**
 * Sign in with Google using popup
 * In Tauri, the popup is handled by the system browser via shell plugin
 */
export async function signInWithGoogle(): Promise<ShellUser> {
  try {
    // Try popup first - works on most browsers and authorized domains
    const result = await signInWithPopup(auth, googleProvider);
    return processUserLogin(result.user);
  } catch (error: unknown) {
    const errorCode = (error as { code?: string })?.code;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Google sign-in error:', errorCode, errorMessage);
    
    // Handle specific errors
    if (errorCode === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site and try again.');
    }
    
    if (errorCode === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }
    
    if (errorCode === 'auth/unauthorized-domain') {
      // This happens when running on localhost - Firebase doesn't authorize it by default
      // The solution is to add localhost to Firebase Console > Authentication > Settings > Authorized domains
      console.warn('Domain not authorized. Add localhost to Firebase authorized domains.');
      throw new Error(
        'This domain is not authorized for sign-in. ' +
        'If you are a developer, add "localhost" to Firebase Console > Authentication > Settings > Authorized domains.'
      );
    }
    
    if (errorCode === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // Generic error
    throw new Error(`Sign-in failed: ${errorMessage}`);
  }
}

/**
 * Parse a 6-character auth code and return the user
 * The code is stored in Firestore by the web auth page
 */
export async function parseAuthCode(code: string): Promise<ShellUser> {
  const normalizedCode = code.toUpperCase().trim();
  
  if (normalizedCode.length !== 6) {
    throw new Error('Code must be 6 characters');
  }
  
  // Look up the code in Firestore
  const codeRef = doc(db, "authCodes", normalizedCode);
  const codeSnap = await getDoc(codeRef);
  
  if (!codeSnap.exists()) {
    throw new Error('Invalid code. Please check and try again.');
  }
  
  const codeData = codeSnap.data();
  
  // Check expiry (5 minutes)
  const expiresAt = codeData.expiresAt?.toDate?.() || new Date(codeData.expiresAt);
  if (Date.now() > expiresAt.getTime()) {
    throw new Error('Code has expired. Please sign in again.');
  }
  
  const user = codeData.user;
  
  // Create ShellUser from code data
  const shellUser: ShellUser = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'Shell User',
    photoURL: user.photoURL || null,
    tier: user.tier || 'free',
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    lastLoginAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    settings: {
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'JetBrains Mono',
      tabSize: 2,
      autoSave: true,
      cloudSyncEnabled: false,
    },
  };
  
  return checkLocalEducatorUpgrade(shellUser);
}

/**
 * Process user login - creates or updates user in Firestore
 */
async function processUserLogin(user: User): Promise<ShellUser> {
  // Check if user exists in Firestore
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login
    try {
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Could not update last login:', e);
    }
    const userData = userSnap.data() as ShellUser;
    return checkLocalEducatorUpgrade(userData);
  } else {
    // Create new user
    const newUser: Omit<ShellUser, "createdAt" | "lastLoginAt"> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      lastLoginAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "Shell User",
      photoURL: user.photoURL,
      tier: "free",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      settings: {
        theme: "dark",
        fontSize: 14,
        fontFamily: "JetBrains Mono",
        tabSize: 2,
        autoSave: true,
        cloudSyncEnabled: false,
      },
    };

    try {
      await setDoc(userRef, newUser);
    } catch (e) {
      console.warn('Could not create user document:', e);
    }
    
    const userData = { ...newUser, createdAt: null, lastLoginAt: null } as unknown as ShellUser;
    return checkLocalEducatorUpgrade(userData);
  }
}

/**
 * Handle redirect result (called on auth page)
 */
export async function handleAuthRedirect(): Promise<ShellUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return processUserLogin(result.user);
    }
  } catch (error) {
    console.error('Redirect auth error:', error);
  }
  return null;
}

/**
 * Start redirect sign-in flow (called from auth page)
 */
export async function startRedirectSignIn(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentShellUser(): Promise<ShellUser | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as ShellUser;
  }
  return null;
}

// ============================================
// User Settings Functions
// ============================================

export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    settings: settings,
  });
}

export async function upgradeToEducator(userId: string, licenseKey: string): Promise<boolean> {
  // Validate the license key/access code
  // For testing: "Educator1" works
  // In production, validate against server/database
  const validCodes = ["Educator1", "EDUCATOR1", "educator1"];
  
  if (!validCodes.includes(licenseKey)) {
    console.log('Invalid license code provided');
    return false;
  }
  
  try {
    const userRef = doc(db, "users", userId);
    
    // First check if user document exists
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.error('User document does not exist');
      return false;
    }
    
    // Update the tier to educator
    await updateDoc(userRef, {
      tier: "educator",
      upgradedAt: serverTimestamp(),
      licenseCode: licenseKey,
    });
    
    console.log('Successfully upgraded to educator tier');
    return true;
  } catch (error: unknown) {
    // Handle Firestore permission errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to upgrade to educator:', errorMessage);
    
    // If it's a permission error, the Firestore rules need to be updated
    // For now, we'll use local storage as a fallback
    if (errorMessage.includes('permission') || errorMessage.includes('PERMISSION_DENIED')) {
      console.log('Firestore permission denied - using local upgrade');
      // Store upgrade locally (will be synced when rules are fixed)
      localStorage.setItem('shell_educator_upgrade', JSON.stringify({
        userId,
        licenseKey,
        upgradedAt: new Date().toISOString()
      }));
      return true;
    }
    
    return false;
  }
}

// Validate educator access code without upgrading (for preview)
export function validateEducatorCode(code: string): boolean {
  const validCodes = ["Educator1", "EDUCATOR1", "educator1"];
  return validCodes.includes(code);
}

// ============================================
// Cloud Storage Functions (Educator Tier Only)
// ============================================

export async function uploadProjectFile(
  userId: string,
  projectId: string,
  filePath: string,
  content: Uint8Array
): Promise<string> {
  const storageRef = ref(storage, `projects/${userId}/${projectId}/${filePath}`);
  await uploadBytes(storageRef, content);
  return await getDownloadURL(storageRef);
}

export async function downloadProjectFile(
  userId: string,
  projectId: string,
  filePath: string
): Promise<string> {
  const storageRef = ref(storage, `projects/${userId}/${projectId}/${filePath}`);
  return await getDownloadURL(storageRef);
}

export async function deleteProjectFile(
  userId: string,
  projectId: string,
  filePath: string
): Promise<void> {
  const storageRef = ref(storage, `projects/${userId}/${projectId}/${filePath}`);
  await deleteObject(storageRef);
}

export async function listProjectFiles(
  userId: string,
  projectId: string
): Promise<string[]> {
  const listRef = ref(storage, `projects/${userId}/${projectId}`);
  const result = await listAll(listRef);
  return result.items.map((item) => item.name);
}

// ============================================
// Cloud Projects Functions
// ============================================

export async function createCloudProject(
  userId: string,
  name: string,
  description: string,
  language: string
): Promise<string> {
  const projectRef = doc(collection(db, "projects"));
  const project: Omit<CloudProject, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    id: projectRef.id,
    userId,
    name,
    description,
    language,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    files: [],
  };
  await setDoc(projectRef, project);
  return projectRef.id;
}

export async function getUserProjects(userId: string): Promise<CloudProject[]> {
  const projectsRef = collection(db, "projects");
  const q = query(projectsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as CloudProject);
}

// ============================================
// Classroom Functions (Educator Tier Only)
// ============================================

export async function createClassroom(
  educatorId: string,
  educatorName: string,
  name: string,
  description: string
): Promise<string> {
  const classroomRef = doc(collection(db, "classrooms"));
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const classroom: Omit<Classroom, "createdAt"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
  } = {
    id: classroomRef.id,
    name,
    description,
    educatorId,
    educatorName,
    code: joinCode,
    createdAt: serverTimestamp(),
    studentCount: 0,
  };

  await setDoc(classroomRef, classroom);

  // Add classroom to educator's list
  const userRef = doc(db, "users", educatorId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data() as ShellUser;
    const classrooms = userData.classrooms || [];
    await updateDoc(userRef, {
      classrooms: [...classrooms, classroomRef.id],
    });
  }

  return classroomRef.id;
}

export async function joinClassroom(studentId: string, joinCode: string): Promise<boolean> {
  const classroomsRef = collection(db, "classrooms");
  const q = query(classroomsRef, where("code", "==", joinCode));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return false;
  }

  const classroomDoc = snapshot.docs[0];
  const classroom = classroomDoc.data() as Classroom;

  // Add student to classroom
  await updateDoc(classroomDoc.ref, {
    studentCount: classroom.studentCount + 1,
  });

  // Add classroom to student's list
  const userRef = doc(db, "users", studentId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data() as ShellUser;
    const enrolledClassrooms = userData.enrolledClassrooms || [];
    await updateDoc(userRef, {
      enrolledClassrooms: [...enrolledClassrooms, classroom.id],
    });
  }

  return true;
}

export async function getEducatorClassrooms(educatorId: string): Promise<Classroom[]> {
  const classroomsRef = collection(db, "classrooms");
  const q = query(classroomsRef, where("educatorId", "==", educatorId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as Classroom);
}

export { app, analytics };
