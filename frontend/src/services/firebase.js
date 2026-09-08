import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// This config is PUBLIC by design — it ships inside the JavaScript bundle and always has.
// It is an address, not a key: it tells the browser which Firebase project to talk to.
//
// The security boundary is `firestore.rules` and `storage.rules` at the root of this repo.
// Those rules decide who may read and write what. Never put a secret in this file.
const firebaseConfig = {
  apiKey: "AIzaSyBULVCEmUckqt3928ja52YZAo8ecDgYkhM",
  authDomain: "footage-tracker.firebaseapp.com",
  projectId: "footage-tracker",
  storageBucket: "footage-tracker.firebasestorage.app",
  messagingSenderId: "837813107769",
  appId: "1:837813107769:web:dd5102ed55d4fffc94a1e8",
  measurementId: "G-VV3QKQFNDL"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
