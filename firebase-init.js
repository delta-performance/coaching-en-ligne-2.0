const firebaseConfig = {
  apiKey: "AIzaSyA__vW3RPMCMD9y1Uh7KvyBDDUXO9qXreY",
  authDomain: "delta-perf.firebaseapp.com",
  projectId: "delta-perf",
  storageBucket: "delta-perf.firebasestorage.app",
  messagingSenderId: "335271116250",
  appId: "1:335271116250:web:f8a26e13f1e248a42814e3"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
window.db = db;
window.fdb = {
  doc: (db, ...path) => db.doc(path.join('/')),
  setDoc: (ref, data) => ref.set(data),
  getDoc: (ref) => ref.get(),
  deleteDoc: (ref) => ref.delete(),
  onSnapshot: (ref, cb) => ref.onSnapshot(cb),
  collection: (db, ...path) => db.collection(path.join('/')),
  getDocs: (ref) => ref.get(),
  writeBatch: (db) => db.batch()
};
auth.signInAnonymously().catch(e => console.error(e));
auth.onAuthStateChanged(u => { if (u) window.anonUid = u.uid; });
