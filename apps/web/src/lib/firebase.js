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

const defaultFirebaseConfig = {
  apiKey: "AIzaSyDdUoYg7bbl3O6mH2z9mwFCXbWKpSKndas",
  authDomain: "ultimo-trading-c-1747477956665.firebaseapp.com",
  projectId: "ultimo-trading-c-1747477956665",
  storageBucket: "ultimo-trading-c-1747477956665.firebasestorage.app",
  messagingSenderId: "1087620624424",
  appId: "1:1087620624424:web:eb15c0fe778d61206f051d"
};

function getFirebase() {
  if (typeof window === "undefined") {
    return { app: null, auth: null, googleProvider: null };
  }
  
  if (!_app) {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId
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