import { v4 as uuidv4 } from 'uuid';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';

export const dbService = {
  async registerPlayer(fullName, email, password, position) {
    if (email === 'admin@admin.com') throw new Error('Cannot register this email');

    // Check if email exists
    const q = query(collection(db, "players"), where("profile.email", "==", email));
    const qs = await getDocs(q);
    if (!qs.empty) {
      throw new Error('User already exists');
    }

    const uid = uuidv4();
    
    // Initialize empty player schema
    const playerData = {
      uid,
      password, // Stored locally for Phase 3 simple auth
      role: 'player',
      profile: { fullName, email, position, createdAt: new Date().toISOString() },
      fullGames: [],
      topThreeClips: [],
      skillClips: {
        passing: [], dribbling: [], defending: [], finishing: [], 
        movement: [], pressing: [], aerial: [], other: [],
        saves: [], distribution: [], commandingTheBox: [], "1v1Situations": [], organizingDefense: []
      },
      photos: {
        cleanKit: { link: "" },
        actionShot: { link: "" },
        training: { link: "" },
        headshot: { link: "" },
        teamPhoto: { link: "" },
        lifestyle: { link: "" }
      },
      driveFolder: { link: "" },
      adminNotes: { general: "", perClip: {} }
    };

    await setDoc(doc(db, "players", uid), playerData);
    return { uid, email, role: 'player' };
  },

  async login(email, password) {
    // Admin backdoor
    if (email === 'admin@admin.com' && password === 'adminpw123') {
      return { uid: 'admin_001', email, role: 'admin' };
    }

    const q = query(collection(db, "players"), where("profile.email", "==", email));
    const qs = await getDocs(q);
    
    if (qs.empty) throw new Error('Invalid credentials');
    
    const docSnap = qs.docs[0];
    const data = docSnap.data();
    
    if (data.password !== password) throw new Error('Invalid credentials');

    return { uid: docSnap.id, email: data.profile.email, role: 'player' };
  },

  async getPlayerData(uid) {
    const docRef = doc(db, "players", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data();
  },

  async updatePlayerData(uid, partialData) {
    // The previous app sends the full context state, so setDoc with merge is very safe
    // as it effectively acts as an upsert/update and won't overwrite unpassed fields
    const docRef = doc(db, "players", uid);
    await setDoc(docRef, partialData, { merge: true });
    
    const updatedSnap = await getDoc(docRef);
    return updatedSnap.data();
  },

  async getAllPlayers() {
    const qs = await getDocs(collection(db, "players"));
    return qs.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  },

  async updateAdminNotes(uid, notesUpdate) {
    const docRef = doc(db, "players", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const currentData = snap.data();
    const currentNotes = currentData.adminNotes || {};
    const currentPerClip = currentNotes.perClip || {};
    
    const newAdminNotes = {
      ...currentNotes,
      general: notesUpdate.general !== undefined ? notesUpdate.general : currentNotes.general,
      perClip: {
         ...currentPerClip,
         ...(notesUpdate.perClip || {})
      }
    };

    await updateDoc(docRef, { adminNotes: newAdminNotes });
    return newAdminNotes;
  }
};
