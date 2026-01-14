/**
 * Firebase Configuration for Shell IDE
 */

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
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
const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// ============================================
// User Types
// ============================================

export type UserTier = "free" | "teacher";

export interface ShellUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  tier: UserTier;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  settings: UserSettings;
  classrooms?: string[]; // For teachers
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
  teacherId: string;
  teacherName: string;
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

export async function signInWithGoogle(): Promise<ShellUser> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Check if user exists in Firestore
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
    });
    return userSnap.data() as ShellUser;
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

    await setDoc(userRef, newUser);
    return { ...newUser, createdAt: null, lastLoginAt: null } as unknown as ShellUser;
  }
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

export async function upgradeToTeacher(userId: string, licenseKey: string): Promise<boolean> {
  // Validate the license key/access code
  // For testing: "Teacher1" works
  // In production, validate against server/database
  const validCodes = ["Teacher1", "TEACHER1", "teacher1"];
  
  if (!validCodes.includes(licenseKey)) {
    return false;
  }
  
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    tier: "teacher",
  });
  return true;
}

// Validate teacher access code without upgrading (for preview)
export function validateTeacherCode(code: string): boolean {
  const validCodes = ["Teacher1", "TEACHER1", "teacher1"];
  return validCodes.includes(code);
}

// ============================================
// Cloud Storage Functions (Teacher Tier Only)
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
// Classroom Functions (Teacher Tier Only)
// ============================================

export async function createClassroom(
  teacherId: string,
  teacherName: string,
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
    teacherId,
    teacherName,
    code: joinCode,
    createdAt: serverTimestamp(),
    studentCount: 0,
  };

  await setDoc(classroomRef, classroom);

  // Add classroom to teacher's list
  const userRef = doc(db, "users", teacherId);
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

export async function getTeacherClassrooms(teacherId: string): Promise<Classroom[]> {
  const classroomsRef = collection(db, "classrooms");
  const q = query(classroomsRef, where("teacherId", "==", teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as Classroom);
}

export { app, analytics };
