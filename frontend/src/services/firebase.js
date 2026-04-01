import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
