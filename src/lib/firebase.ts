import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const configuredValues = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(configuredValues).every(Boolean);
export const usingFirebaseEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

const firebaseConfig = {
  apiKey: configuredValues.apiKey || "demo-api-key",
  authDomain: configuredValues.authDomain || "localhost",
  projectId: configuredValues.projectId || "demo-sorveteria",
  storageBucket: configuredValues.storageBucket || "demo-sorveteria.appspot.com",
  messagingSenderId: configuredValues.messagingSenderId || "000000000000",
  appId: configuredValues.appId || "1:000000000000:web:demo",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp, "southamerica-east1");

if (usingFirebaseEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8088);
  connectStorageEmulator(storage, "127.0.0.1", 9415);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export function assertFirebaseConfigured(): void {
  if (!firebaseConfigured && !usingFirebaseEmulators) {
    throw new Error("Configure as variáveis VITE_FIREBASE_* ou habilite os emuladores locais.");
  }
}
