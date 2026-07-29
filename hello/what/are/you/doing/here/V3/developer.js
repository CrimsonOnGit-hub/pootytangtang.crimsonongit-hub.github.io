import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let currentUser = null;
const IMGBB_API_KEY = "d5fd4e3e9fedc18b9bed075f980f12b7";

window.showCustomAlert = function(message) {
    const overlay = document.getElementById('custom-alert'); 
    if(!overlay) { alert(message); return; }
    document.getElementById('custom-alert-message').innerText = message; 
    overlay.classList.add('active');
};

window.handleSSOLogoUpload = async function(file) {
    if (!file || !file.type.startsWith('image/')) return window.showCustomAlert("Not a valid image.");
    const sEl = document.getElementById('sso-logo-status');
    sEl.style.display = 'block'; sEl.innerText = 'Uploading logo...';
    try {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const json = await res.json(); if (!json.success) throw new Error("Upload Failed");
        document.getElementById('sso-app-logo').value = json.data.url;
        sEl.innerText = "Logo uploaded successfully!";
    } catch (err) { sEl.innerText = "Error uploading logo."; }
    setTimeout(() => { sEl.style.display = 'none'; }, 3000);
};

window.createSSOLink = async function(e) {
    e.preventDefault();
    if (!currentUser) return;
    const btn = document.getElementById('btn-create-sso');
    btn.disabled = true; btn.innerText = "Creating...";

    try {
        const appName = document.getElementById('sso-app-name').value.trim();
        const appLogo = document.getElementById('sso-app-logo').value.trim() || "https://i.ibb.co/TBkJR2Jn/unnamed-removebg-preview.png";
        const redirectUrl = document.getElementById('sso-redirect-url').value.trim() || "";
        
        const perms = [];
        if (document.getElementById('perm-profile').checked) perms.push("Access your display name & profile picture");
        if (document.getElementById('perm-email').checked) perms.push("View your email address");
        if (document.getElementById('perm-sso').checked) perms.push("Authenticate via CrimsonFlame SSO");

        const customPermsStr = document.getElementById('sso-custom-perms').value.trim();
        if (customPermsStr) {
            customPermsStr.split(',').map(p => p.trim()).filter(Boolean).forEach(p => perms.push(p));
        }

        const randHex = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');
        const linkKey = `cf_key_${randHex}`;

        const ssoData = {
            linkkey: linkKey,
            ownerUid: currentUser.uid,
            appName: appName,
            appLogo: appLogo,
            redirectUrl: redirectUrl,
            permissions: perms,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "sso_links", linkKey), ssoData);

        try {
            localStorage.setItem('cf_sso_key_' + linkKey, JSON.stringify(ssoData));
        } catch(err) {}

        document.getElementById('sso-app-name').value = '';
        document.getElementById('sso-app-logo').value = '';
        document.getElementById('sso-redirect-url').value = '';
        document.getElementById('sso-custom-perms').value = '';

        window.showCustomAlert(`SSO Link Created!\nKey: ${linkKey}`);
        window.loadSSOLinks();
    } catch(err) {
        console.error("Error creating SSO Link:", err);
        window.showCustomAlert("Failed to create SSO Link: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ Generate SSO Link Key";
    }
};

window.loadSSOLinks = async function() {
    if (!currentUser) return;
    const container = document.getElementById('sso-links-list');
    if (!container) return;

    try {
        const q = query(collection(db, "sso_links"), where("ownerUid", "==", currentUser.uid));
        const snap = await getDocs(q);
        const ssoItems = [];

        snap.forEach(docSnap => {
            ssoItems.push(docSnap.data());
        });

        if (ssoItems.length === 0) {
            container.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.88rem; text-align: center; padding: 20px;">No SSO Links created yet. Fill out the form above to generate your first key!</p>`;
            return;
        }

        container.innerHTML = ssoItems.map(item => {
            const linkUrl = `https://crimsonflame-official.github.io/link?linkkey=${item.linkkey}`;
            const permsList = (item.permissions || []).map(p => `<li style="font-size: 0.8rem; color: #ede8ea;">✓ ${p}</li>`).join('');
            
            const totalAuths = item.totalAuthorizations || 0;
            const uniqueUsers = item.authorizedUserUids ? Object.keys(item.authorizedUserUids).length : 0;
            const lastUsed = item.lastAuthorizedAt ? new Date(item.lastAuthorizedAt).toLocaleDateString() + ' ' + new Date(item.lastAuthorizedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never';

            return `
                <div style="background: rgba(22, 12, 16, 0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${item.appLogo}" style="width: 42px; height: 42px; border-radius: 10px; object-fit: cover; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);">
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: #fff; font-size: 1.05rem;">${item.appName}</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary);">${item.redirectUrl ? 'Redirect: ' + item.redirectUrl : 'No default redirect URL'}</div>
                        </div>
                        <button onclick="window.deleteSSOLink('${item.linkkey}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; font-weight: 600;">Delete</button>
                    </div>

                    <!-- Analytics Stats Bar -->
                    <div style="background: rgba(0,0,0,0.4); padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 10px; text-align: center;">
                        <div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">Unique Users</div>
                            <div style="font-size: 1.05rem; font-weight: 800; color: #4ade80;">${uniqueUsers} Users</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">Total Auth Uses</div>
                            <div style="font-size: 1.05rem; font-weight: 800; color: var(--crimson-light);">${totalAuths} Times</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">Last Used</div>
                            <div style="font-size: 0.8rem; font-weight: 600; color: #ede8ea;">${lastUsed}</div>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">SSO Link Key</div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                            <code style="color: #4ade80; font-family: monospace; font-size: 0.9rem; word-break: break-all;">${item.linkkey}</code>
                            <button onclick="window.copyToClipboard('${item.linkkey}', this)" style="padding: 4px 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 0.78rem; cursor: pointer;">📋 Copy Key</button>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.4); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">SSO Authorization Link</div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                            <code style="color: var(--crimson-light); font-family: monospace; font-size: 0.8rem; word-break: break-all;">${linkUrl}</code>
                            <button onclick="window.copyToClipboard('${linkUrl}', this)" style="padding: 4px 10px; background: var(--crimson); border: none; border-radius: 6px; color: #fff; font-size: 0.78rem; cursor: pointer; font-weight: 600;">🔗 Copy Link</button>
                        </div>
                    </div>

                    <div style="margin-top: 4px;">
                        <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Requested Permissions</div>
                        <ul style="list-style: none; display: flex; flex-direction: column; gap: 4px; padding-left: 0;">
                            ${permsList}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');
    } catch(err) {
        console.error("Error loading SSO Links:", err);
    }
};

window.deleteSSOLink = async function(key) {
    if (!confirm("Are you sure you want to delete this SSO Link Key?")) return;
    try {
        await deleteDoc(doc(db, "sso_links", key));
        try { localStorage.removeItem('cf_sso_key_' + key); } catch(e) {}
        window.showCustomAlert("SSO Link Key deleted.");
        window.loadSSOLinks();
    } catch(err) {
        window.showCustomAlert("Failed to delete key: " + err.message);
    }
};

window.copyToClipboard = function(text, btnEl) {
    navigator.clipboard.writeText(text).then(() => {
        const origText = btnEl.innerText;
        btnEl.innerText = "✓ Copied!";
        setTimeout(() => { btnEl.innerText = origText; }, 2000);
    }).catch(err => {
        window.showCustomAlert("Copy failed: " + err);
    });
};

onAuthStateChanged(auth, user => {
    if (user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'))) {
        currentUser = user;
        document.getElementById('dev-auth-notice').style.display = 'none';
        document.getElementById('dev-dashboard-container').style.display = 'block';
        window.loadSSOLinks();
    } else {
        currentUser = null;
        document.getElementById('dev-auth-notice').style.display = 'block';
        document.getElementById('dev-dashboard-container').style.display = 'none';
    }
});
