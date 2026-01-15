# Firestore Security Rules for Shell IDE
# Copy these rules to Firebase Console > Firestore Database > Rules

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Auth codes - temporary codes for desktop sign-in
    // Anyone can create (from web auth page after Google sign-in)
    // Anyone can read (desktop app validates the code)
    // Auto-deleted after 5 minutes by TTL policy or cleanup function
    match /authCodes/{code} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if true; // Allow cleanup
    }
    
    // Users collection - user profiles and settings
    match /users/{userId} {
      // Users can read and write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow creating new user document on first sign-in
      allow create: if request.auth != null && request.auth.uid == userId;
    }
    
    // Classrooms - teacher-managed classes
    match /classrooms/{classroomId} {
      // Anyone authenticated can read classroom info (for join by code)
      allow read: if request.auth != null;
      
      // Only teachers can create/update/delete classrooms
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tier == 'teacher';
      allow update, delete: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
    }
    
    // Projects - cloud-synced user projects
    match /projects/{projectId} {
      // Users can only access their own projects
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Submissions - student assignment submissions
    match /submissions/{submissionId} {
      // Students can create and read their own submissions
      allow create: if request.auth != null && 
        request.resource.data.studentId == request.auth.uid;
      allow read: if request.auth != null && 
        (resource.data.studentId == request.auth.uid || 
         resource.data.teacherId == request.auth.uid);
      // Only teachers can update (for grading)
      allow update: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
    }
  }
}
```

## Quick Setup Instructions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `shell-ide`
3. Navigate to **Firestore Database** > **Rules**
4. Replace the existing rules with the rules above
5. Click **Publish**

## Also Required: Add Authorized Domain

1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Add: `nagusamecs.github.io`

## Optional: Set up TTL for auth codes

Auth codes should auto-expire. You can set up a Cloud Function or use Firestore TTL:
- Go to Firestore > Indexes > TTL
- Add a TTL on `authCodes` collection using the `expiresAt` field
