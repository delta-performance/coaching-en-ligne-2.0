import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, onSnapshot, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyA__vW3RPMCMD9y1Uh7KvyBDDUXO9qXreY",
  authDomain: "delta-perf.firebaseapp.com",
  projectId: "delta-perf",
  storageBucket: "delta-perf.firebasestorage.app",
  messagingSenderId: "335271116250",
  appId: "1:335271116250:web:f8a26e13f1e248a42814e3"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
window.db = db;
window.fdb = { doc, setDoc, getDoc, deleteDoc, onSnapshot, collection, getDocs, writeBatch };
onAuthStateChanged(auth, u => { if(u) window.anonUid = u.uid; });
signInAnonymously(auth).catch(e => console.error(e));
