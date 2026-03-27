firebase.initializeApp({
    apiKey: "AIzaSyD5nxim_X1c0cVXRji8-k4CkMSDPDH7v0k",
    authDomain: "zelva-c6143.firebaseapp.com",
    projectId: "zelva-c6143",
    storageBucket: "zelva-c6143.firebasestorage.app",
    messagingSenderId: "876429015791",
    appId: "1:876429015791:web:02770e67c5ce81c335391a"
});

const auth = firebase.auth();
const db = firebase.firestore();
const TS = () => firebase.firestore.FieldValue.serverTimestamp();
const INC = n => firebase.firestore.FieldValue.increment(n);
const IMGBB_KEY = '944935afc5f7c9c0edc61c6eb5782e12';

const PAGES = ['landing', 'login', 'explorar', 'perfil', 'chats', 'contacte', 'detall', 'perfil-public'];
let historialNavegacio = ['explorar'];

function navigate(page, guardar = true) {
    if (guardar) {
        const actual = PAGES.find(p => !document.getElementById('page-' + p)?.classList.contains('hidden'));
        if (actual && actual !== page && actual !== 'landing' && actual !== 'login') {
            historialNavegacio.push(actual);
            if (historialNavegacio.length > 10) historialNavegacio.shift();
        }
    }
    PAGES.forEach(p => document.getElementById('page-' + p)?.classList.add('hidden'));
    document.getElementById('page-' + page)?.classList.remove('hidden');
    ['explorar', 'chats', 'contacte'].forEach(p =>
        document.getElementById('nav-' + p)?.classList.toggle('active', p === page)
    );
    window.scrollTo(0, 0);
    if (page === 'chats') carregarChats();
    if (page === 'perfil') { carregarMeusAnuncis(); carregarHistorial(); }
}

function tornar() {
    const anterior = historialNavegacio.pop() || 'explorar';
    navigate(anterior, false);
}

function navegarAPerfil() {
    const actual = PAGES.find(p => !document.getElementById('page-' + p)?.classList.contains('hidden'));
    if (actual && actual !== 'perfil') historialNavegacio.push(actual);
    navigate('perfil', false);
}

async function pujarImgBB(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error('La imatge no pot superar 5MB.');
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error('Error pujant imatge: ' + (data.error?.message || 'desconegut'));
    return data.data.url;
}

function toggleEco(checkbox) {
    document.documentElement.setAttribute('data-theme', checkbox.checked ? 'eco' : '');
    if (!checkbox.checked) document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('modoEco', checkbox.checked ? 'true' : 'false');
}

(function () {
    if (localStorage.getItem('modoEco') === 'true') {
        document.documentElement.setAttribute('data-theme', 'eco');
        const toggle = document.getElementById('eco-toggle');
        if (toggle) toggle.checked = true;
    }
})();