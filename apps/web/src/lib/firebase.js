import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

let _app = null;
let _auth = null;
let _googleProvider = null;

// Development fallback values - use only when Firebase is intentionally not configured
const devFirebaseConfig = null;

function getFirebase() {
  if (typeof window === "undefined") {
    return { app: null, auth: null, googleProvider: null };
  }
  
  if (!_app) {
    const isProd = import.meta.env.PROD;

    // Required environment variables - using NEXT_PUBLIC_ prefix (matching vite envPrefix in vite.config.ts)
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];
    
    // Check if we're missing required env vars
    const missing = requiredEnvVars.filter(key => !import.meta.env[key]);
    if (missing.length > 0) {
      console.error('❌ Missing required Firebase environment variables:', missing);
      console.error('   Firebase authentication will be disabled.');
      return { app: null, auth: null, googleProvider: null };
    }
    
    const firebaseConfig = {
      apiKey: import.meta.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
      authDomain: import.meta.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
      projectId: import.meta.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
      storageBucket: import.meta.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
      messagingSenderId: import.meta.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
      appId: import.meta.env['NEXT_PUBLIC_FIREBASE_APP_ID']
    };
     
    _app = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _googleProvider = new GoogleAuthProvider();
  }
   
  return { app: _app, auth: _auth, googleProvider: _googleProvider };
}

export const signInWithCredentials = async (email, password) => {
  const { auth } = getFirebase();
  if (!auth) return { user: null, error: "Firebase not initialized" };
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signUpWithCredentials = async (email, password, name) => {
  const { auth } = getFirebase();
  if (!auth) return { user: null, error: "Firebase not initialized" };
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  const { auth, googleProvider } = getFirebase();
  if (!auth || !googleProvider) return { user: null, error: "Firebase not initialized" };
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  const { auth } = getFirebase();
  if (!auth) return { error: "Firebase not initialized" };
  
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const getCurrentUser = () => {
  const { auth } = getFirebase();
  if (!auth) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export default getFirebase;