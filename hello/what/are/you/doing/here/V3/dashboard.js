import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, updateProfile, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, query, where, doc, onSnapshot, updateDoc, serverTimestamp, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBSSJKDrFJ1_qlliZqgw34CY2TSaKOxxxM",
    authDomain: "crimsonflame-8169e.firebaseapp.com",
    projectId: "crimsonflame-8169e",
    storageBucket: "crimsonflame-8169e.firebasestorage.app",
    messagingSenderId: "406321213530",
    appId: "1:406321213530:web:92d27a69d34d147393a863"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence);

let currentUser = null;
let isLogin = true;
const DEFAULT_PFP = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const IMGBB_API_KEY = "d5fd4e3e9fedc18b9bed075f980f12b7";

window.showCustomAlert = function(message) {
    const overlay = document.getElementById('custom-alert'); 
    if(!overlay) { alert(message); return; }
    document.getElementById('custom-alert-message').innerText = message; 
    overlay.classList.add('active');
};

function showResponseText(element, type, text) {
    const existing = element.parentNode.querySelectorAll('.status-text');
    existing.forEach(el => el.remove());
    const statusDiv = document.createElement('div'); 
    statusDiv.className = `status-text ${type}`; 
    statusDiv.innerText = text; 
    statusDiv.style.display = 'block';
    element.parentNode.insertBefore(statusDiv, element.nextSibling); 
    setTimeout(() => statusDiv.remove(), 4000); 
}

window.submitLogin = async function(e) {
    e.preventDefault(); 
    const btn = e.target.querySelector('button[type="submit"]'); 
    btn.disabled = true; btn.innerText = "Processing...";
    try {
        if(isLogin) {
            const cred = await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
            if (!cred.user.emailVerified) { await sendEmailVerification(cred.user); await signOut(auth); window.showCustomAlert("Email not verified. Link sent."); } 
        } else {
            const cred = await createUserWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
            await sendEmailVerification(cred.user); await signOut(auth); window.showCustomAlert("Account created! Check inbox."); window.toggleLoginMode();
        }
    } catch (err) { showResponseText(btn, 'error', err.message); } 
    finally { btn.disabled = false; btn.innerText = "Submit"; }
};

window.loginWithGoogle = async function(e) { 
    e.preventDefault(); 
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err) { window.showCustomAlert(err.message); } 
};

window.submitProfile = async function(e) {
    e.preventDefault(); 
    const btn = e.target.querySelector('button[type="submit"]');
    const newName = document.getElementById('display-name').value.trim();
    const newUsername = document.getElementById('username-input').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newPfp = document.getElementById('dashboard-pfp-preview').src;
    
    if (!currentUser) return;
    btn.disabled = true; btn.innerText = "Checking...";

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        let updates = { displayName: newName, photoURL: newPfp };

        if (newUsername && newUsername !== userData.username) {
            if (newUsername.length < 3) throw new Error("Username must be at least 3 characters.");
            if (userData.lastUsernameChange) {
                const daysSince = (new Date() - userData.lastUsernameChange.toDate()) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) throw new Error(`Usernames can only be changed once every 30 days. You have ${Math.ceil(30 - daysSince)} days left.`);
            }
            const q = query(collection(db, "users"), where("username", "==", newUsername));
            const snap = await getDocs(q);
            if (!snap.empty) throw new Error(`Username @${newUsername} is already taken!`);

            updates.username = newUsername;
            updates.lastUsernameChange = serverTimestamp();
        }

        await updateProfile(currentUser, { displayName: newName, photoURL: newPfp });
        await setDoc(userRef, updates, { merge: true });
        showResponseText(btn, 'success', "Profile Saved!");
    } catch (err) {
        window.showCustomAlert(err.message);
        showResponseText(btn, 'error', "Update Blocked.");
    } finally {
        btn.disabled = false; btn.innerText = "Save Profile Info";
    }
};

window.logOutUser = function() { signOut(auth); };
window.toggleLoginMode = function() { 
    isLogin = !isLogin; 
    document.getElementById('auth-title').innerText = isLogin ? "Login" : "Register"; 
    document.getElementById('toggle-auth').innerText = isLogin ? "Register here" : "Login here"; 
};

window.generateDiscordLinkCode = async function() {
    if(!currentUser) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString(); 
    await setDoc(doc(db, "users", currentUser.uid), { linkCode: code }, { merge: true });
    const display = document.getElementById('discord-link-code-display');
    display.style.display = 'block'; display.innerText = `DM the bot: !link ${code}`;
};

window.unlinkDiscord = async function() {
    if(!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), { discordId: null, discordUsername: null, discordAvatar: null, linkCode: null });
    window.showCustomAlert("Discord account unlinked.");
};

window.submitVRLinkCode = async function(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    const code = document.getElementById('vr-link-input').value.trim();
    if (code.length !== 6) return window.showCustomAlert("Code must be 6 digits.");

    try {
        const codeRef = doc(db, 'vr_link_codes', code);
        const codeSnap = await getDoc(codeRef);

        if (codeSnap.exists()) {
            const pfId = codeSnap.data().playfabId;
            await updateDoc(doc(db, "users", currentUser.uid), { playfabId: pfId });
            await deleteDoc(codeRef);
            window.showCustomAlert("VR Account successfully linked!");
        } else {
            window.showCustomAlert("Invalid or expired VR code.");
        }
    } catch (err) {
        console.error(err);
        window.showCustomAlert("An error occurred while linking.");
    }
};

window.handleUpload = async function(file, type) {
    if (!file || !file.type.startsWith('image/')) return window.showCustomAlert("Not a valid image.");
    const sEl = document.getElementById('upload-status'); 
    sEl.style.display = 'block'; sEl.innerText = 'Uploading...';
    try {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const json = await res.json(); if (!json.success) throw new Error("Upload Failed");
        document.getElementById('dashboard-pfp-preview').src = json.data.url;
        sEl.innerText = "Success!";
    } catch (err) { sEl.innerText = "Error uploading."; }
    setTimeout(() => { sEl.style.display = 'none'; }, 3000);
};

window.loadConnectedApps = async function() {
    if (!currentUser) return;
    const container = document.getElementById('connected-apps-list');
    if (!container) return;

    try {
        const snap = await getDocs(collection(db, "users", currentUser.uid, "connected_apps"));
        const apps = [];
        snap.forEach(d => apps.push({ id: d.id, ...d.data() }));

        if (apps.length === 0) {
            container.innerHTML = `<p id="connected-apps-empty" style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 10px; border: 1px dashed rgba(255,255,255,0.1);">No connected applications yet.</p>`;
            return;
        }

        container.innerHTML = apps.map(app => `
            <div class="linked-card" style="background: rgba(22, 12, 16, 0.8); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px;">
                <img src="${app.appLogo || DEFAULT_PFP}" style="width: 38px; height: 38px; border-radius: 10px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${app.appName || "Connected App"}</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary);">Authorized ${app.authorizedAt ? new Date(app.authorizedAt).toLocaleDateString() : 'recently'}</div>
                </div>
                <button onclick="window.revokeConnectedApp('${app.id}')" class="btn-danger" style="width: auto; padding: 6px 12px; font-size: 0.78rem;">Revoke Access</button>
            </div>
        `).join('');
    } catch(err) {
        console.error("Error loading connected apps:", err);
    }
};

window.revokeConnectedApp = async function(appId) {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to revoke access for this application?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "connected_apps", appId));
        const snap = await getDocs(collection(db, "users", currentUser.uid, "connected_apps"));
        snap.forEach(async (d) => {
            const data = d.data();
            if (d.id === appId || data.linkkey === appId || (data.appName && data.appName.toLowerCase().includes(appId.toLowerCase()))) {
                await deleteDoc(doc(db, "users", currentUser.uid, "connected_apps", d.id));
            }
        });
        window.showCustomAlert("Application access revoked.");
        setTimeout(() => window.loadConnectedApps(), 300);
    } catch(err) {
        window.showCustomAlert("Failed to revoke access: " + err.message);
    }
};

let userDocUnsub = null;

onAuthStateChanged(auth, user => {
    if (user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'))) {
        currentUser = user;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'block';
        document.getElementById('user-display-email').innerText = user.email;
        const nameEl = document.getElementById('user-sidebar-name');
        if (nameEl) nameEl.innerText = user.displayName || user.email.split('@')[0];
        document.getElementById('display-name').value = user.displayName || "";
        document.getElementById('dashboard-pfp-preview').src = user.photoURL || DEFAULT_PFP;
        
        getDoc(doc(db, "users", currentUser.uid)).then(docSnap => {
            if (!docSnap.exists() || !docSnap.data().username) {
                const baseName = (user.displayName || user.email.split('@')[0]);
                setDoc(doc(db, "users", currentUser.uid), { 
                    uid: currentUser.uid, 
                    username: baseName.toLowerCase().replace(/[^a-z0-9_]/g, ''), 
                    displayName: baseName 
                }, { merge: true });
            }
        });

        if (userDocUnsub) userDocUnsub();
        userDocUnsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if(docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById('username-input').value = data.username || "";
                if (data.displayName) document.getElementById('display-name').value = data.displayName;
                
                const sidebarNameEl = document.getElementById('user-sidebar-name');
                if (sidebarNameEl) {
                    sidebarNameEl.innerText = data.displayName || data.username || currentUser.displayName || currentUser.email.split('@')[0];
                }

                if(data.discordId) {
                    document.getElementById('discord-unlinked').style.display = 'none';
                    document.getElementById('discord-linked').style.display = 'flex';
                    document.getElementById('discord-username').innerText = `@${data.discordUsername}`;
                    document.getElementById('discord-avatar').src = data.discordAvatar || DEFAULT_PFP;
                } else {
                    document.getElementById('discord-unlinked').style.display = 'block';
                    document.getElementById('discord-linked').style.display = 'none';
                }

                if(data.playfabId) {
                    document.getElementById('vr-unlinked').style.display = 'none';
                    document.getElementById('vr-linked').style.display = 'flex';
                    document.getElementById('vr-playfab-id').innerText = data.playfabId;
                } else {
                    document.getElementById('vr-unlinked').style.display = 'block';
                    document.getElementById('vr-linked').style.display = 'none';
                }
            }
        });

        window.loadConnectedApps();
    } else {
        currentUser = null;
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
        if (userDocUnsub) { userDocUnsub(); userDocUnsub = null; }
    }
});
