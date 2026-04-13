const firebaseConfig = {
  apiKey: "AIzaSyA__vW3RPMCMD9y1Uh7KvyBDDUXO9qXreY",
  authDomain: "delta-perf.firebaseapp.com",
  projectId: "delta-perf",
  storageBucket: "delta-perf.firebasestorage.app",
  messagingSenderId: "335271116250",
  appId: "1:335271116250:web:f8a26e13f1e248a42814e3"
};
firebase.initializeApp(firebaseConfig);
const _auth = firebase.auth();
const _db = firebase.firestore();
window.db = _db;

/** Deuxième instance Auth : créer coach/client sans remplacer la session admin connectée. */
window.getSecondaryAuth = function getSecondaryAuth() {
  if (window._secondaryAuth) return window._secondaryAuth;
  try {
    window._secondaryAuth = firebase.app('SecondaryAccountCreate').auth();
  } catch (e) {
    window._secondaryAuth = firebase.initializeApp(firebaseConfig, 'SecondaryAccountCreate').auth();
  }
  return window._secondaryAuth;
};

function _resolveRef(db, segments) {
  let ref = db;
  segments.forEach((seg, i) => {
    ref = (i % 2 === 0) ? ref.collection(seg) : ref.doc(seg);
  });
  return ref;
}

window.fdb = {
  doc: (db, ...path) => _resolveRef(db, path),
  collection: (db, ...path) => _resolveRef(db, path),
  setDoc: (ref, data) => ref.set(data),
  getDoc: (ref) => ref.get(),
  deleteDoc: (ref) => ref.delete(),
  onSnapshot: (ref, cb) => ref.onSnapshot(cb),
  getDocs: (ref) => ref.get(),
  writeBatch: (db) => db.batch()
};

_auth.onAuthStateChanged(u => { window.anonUid = u ? u.uid : null; });
