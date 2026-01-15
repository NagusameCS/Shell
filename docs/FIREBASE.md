# Firebase Configuration

This document contains the Firebase configuration needed for Shell IDE.

## Firestore Security Rules

Deploy these rules to your Firebase console at:
`https://console.firebase.google.com/project/shell-ide/firestore/rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Users can create their own document on first sign-in
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Users can update their own document
      // Allow tier upgrades with valid license codes
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects collection
    match /projects/{projectId} {
      // Users can read their own projects
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Users can create projects (must be their own)
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      // Users can update their own projects
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Users can delete their own projects
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Classrooms collection
    match /classrooms/{classroomId} {
      // Anyone authenticated can read classrooms (for joining)
      allow read: if request.auth != null;
      
      // Only teachers can create classrooms
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tier == 'teacher';
      
      // Teachers can update their own classrooms
      allow update: if request.auth != null && resource.data.teacherId == request.auth.uid;
      
      // Teachers can delete their own classrooms
      allow delete: if request.auth != null && resource.data.teacherId == request.auth.uid;
    }
  }
}
```

## Authentication Setup

### Authorized Domains

Add these domains to your Firebase Authentication settings:
1. `shell-ide.firebaseapp.com` (default)
2. `nagusameCS.github.io` (GitHub Pages for auth redirect)
3. `localhost` (for development - optional)

### Google Sign-In Provider

1. Enable Google as a sign-in provider
2. Configure OAuth consent screen
3. Add authorized JavaScript origins:
   - `https://shell-ide.firebaseapp.com`
   - `https://nagusameCS.github.io`

## Storage Rules

Deploy these rules for Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Project files
    match /projects/{userId}/{projectId}/{allPaths=**} {
      // Only the owner can read/write their project files
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Environment Variables

The Firebase configuration is embedded in the source code. For production, consider using environment variables:

```env
VITE_FIREBASE_API_KEY=AIzaSyBT2aio4RviupuWKIFbflL6R2CpRJcbfNo
VITE_FIREBASE_AUTH_DOMAIN=shell-ide.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=shell-ide
VITE_FIREBASE_STORAGE_BUCKET=shell-ide.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=519393287232
VITE_FIREBASE_APP_ID=1:519393287232:web:23707ebfb542b3bf6193a5
```

## Auth Redirect Flow

Since Firebase cannot authorize `localhost` as an OAuth redirect domain for desktop apps, we use an auth redirect page hosted on GitHub Pages:

1. Desktop app opens `https://nagusameCS.github.io/Shell/auth.html`
2. User signs in with Google on the authorized domain
3. Auth page communicates success via BroadcastChannel
4. Desktop app receives the auth token and completes sign-in

This allows the Tauri desktop app to authenticate without needing `localhost` to be an authorized domain.
