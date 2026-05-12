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

// Development fallback values (dummy/placeholder - NOT for production)
const devFirebaseConfig = {
  apiKey: "dev-api-key-placeholder",
  authDomain: "dev-project.firebaseapp.com",
  projectId: "dev-project",
  storageBucket: "dev-project.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

function getFirebase() {
  if (typeof window === "undefined") {
    return { app: null, auth: null, googleProvider: null };
  }
  
  if (!_app) {
    const isProd = import.meta.env.PROD;
    const getEnv = (key) => import.meta.env[key];
    
    // Required environment variables in production
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID'
    ];
    
    // Check if we're missing required env vars in production
    if (isProd) {
      const missing = requiredEnvVars.filter(key => !getEnv(key));
      if (missing.length > 0) {
        console.error('❌ Missing required Firebase environment variables:', missing);
        throw new Error('Firebase configuration incomplete. Check environment variables.');
      }
    }
    
    const firebaseConfig = {
      apiKey: getEnv('VITE_FIREBASE_API_KEY') || devFirebaseConfig.apiKey,
      authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || devFirebaseConfig.authDomain,
      projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || devFirebaseConfig.projectId,
      storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || devFirebaseConfig.storageBucket,
      messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || devFirebaseConfig.messagingSenderId,
      appId: getEnv('VITE_FIREBASE_APP_ID') || devFirebaseConfig.appId
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