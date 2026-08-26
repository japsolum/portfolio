/* ---------------------------------------------------------------------------
 * Guest book — post, list, and moderate messages.
 * ------------------------------------------------------------------------ */

import { firebaseConfig, isConfigured, OWNER_UID, SDK } from "./firebase-config.js";
import {
	onUserChange,
	signInWithGoogle,
	sendMagicLink,
	completeMagicLink,
	signOutUser,
	describeError,
	getApp
} from "./auth.js";

const FS_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`;

const MAX_LEN = 500;
const COOLDOWN_MS = 30000; // client-side courtesy limit; rules are the real guard

const el = {
	setup: document.getElementById("setupNotice"),
	authPanel: document.getElementById("authPanel"),
	signedOut: document.getElementById("signedOut"),
	signedIn: document.getElementById("signedIn"),
	googleBtn: document.getElementById("googleBtn"),
	emailForm: document.getElementById("emailForm"),
	emailInput: document.getElementById("emailInput"),
	authStatus: document.getElementById("authStatus"),
	who: document.getElementById("who"),
	avatar: document.getElementById("avatar"),
	signOutBtn: document.getElementById("signOutBtn"),
	form: document.getElementById("messageForm"),
	text: document.getElementById("messageText"),
	counter: document.getElementById("charCount"),
	postBtn: document.getElementById("postBtn"),
	formStatus: document.getElementById("formStatus"),
	list: document.getElementById("messageList"),
	empty: document.getElementById("emptyState"),
	loading: document.getElementById("loadingState"),
	count: document.getElementById("messageCount")
};

let db = null;
let fs = null;
let currentUser = null;
let lastPostAt = 0;

/* Last snapshot from Firestore. Signing in or out changes which Delete
 * buttons should show, but does not itself trigger a new snapshot — so we
 * keep the docs around and re-render from them when auth state changes. */
let latestDocs = [];

/* ---------- status helpers ---------- */

function setStatus(node, message, kind) {
	if (!node) return;
	node.textContent = message || "";
	node.className = "status" + (kind ? " status--" + kind : "");
	node.hidden = !message;
}

function timeAgo(date) {
	if (!date) return "just now";
	const secs = Math.floor((Date.now() - date.getTime()) / 1000);
	if (secs < 60) return "just now";
	const mins = Math.floor(secs / 60);
	if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
	const hours = Math.floor(mins / 60);
	if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
	const days = Math.floor(hours / 24);
	if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
	return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function initials(name) {
	const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
	return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

/* ---------- rendering ---------- */

function renderMessages(docs) {
	latestDocs = docs;
	el.loading.hidden = true;
	el.list.textContent = "";

	el.count.textContent =
		docs.length === 0 ? "" : docs.length + (docs.length === 1 ? " message" : " messages");

	if (docs.length === 0) {
		el.empty.hidden = false;
		return;
	}
	el.empty.hidden = true;

	docs.forEach((entry) => {
		const data = entry.data();
		const item = document.createElement("li");
		item.className = "message";

		const head = document.createElement("div");
		head.className = "message__head";

		const badge = document.createElement("span");
		badge.className = "message__avatar";
		if (data.photoURL && /^https:\/\//i.test(data.photoURL)) {
			const img = document.createElement("img");
			img.src = data.photoURL;
			img.alt = "";
			img.referrerPolicy = "no-referrer";
			img.addEventListener("error", () => {
				badge.textContent = initials(data.name);
			});
			badge.appendChild(img);
		} else {
			badge.textContent = initials(data.name);
		}

		const meta = document.createElement("div");
		meta.className = "message__meta";

		const name = document.createElement("span");
		name.className = "message__name";
		name.textContent = data.name || "Anonymous";

		const when = document.createElement("time");
		when.className = "message__time";
		const created = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;
		if (created) when.dateTime = created.toISOString();
		when.textContent = timeAgo(created);

		meta.appendChild(name);
		meta.appendChild(when);

		head.appendChild(badge);
		head.appendChild(meta);

		// Authors can remove their own message; the owner can remove any.
		const canDelete =
			currentUser && (currentUser.uid === data.uid || currentUser.uid === OWNER_UID);

		if (canDelete) {
			const del = document.createElement("button");
			del.type = "button";
			del.className = "message__delete";
			del.textContent = "Delete";
			del.setAttribute("aria-label", "Delete message from " + (data.name || "Anonymous"));
			del.addEventListener("click", () => removeMessage(entry.id, del));
			head.appendChild(del);
		}

		const body = document.createElement("p");
		body.className = "message__body";
		body.textContent = data.text; // textContent, never innerHTML

		item.appendChild(head);
		item.appendChild(body);
		el.list.appendChild(item);
	});
}

/* ---------- data ---------- */

async function connect() {
	if (db) return;
	const app = await getApp();
	fs = await import(FS_URL);
	db = fs.getFirestore(app);
}

async function watchMessages() {
	await connect();

	const q = fs.query(
		fs.collection(db, "guestbook"),
		fs.orderBy("createdAt", "desc"),
		fs.limit(100)
	);

	fs.onSnapshot(
		q,
		(snap) => renderMessages(snap.docs),
		(err) => {
			el.loading.hidden = true;
			setStatus(
				el.formStatus,
				"Couldn't load messages: " + describeError(err),
				"error"
			);
		}
	);
}

async function postMessage(text) {
	await connect();

	await fs.addDoc(fs.collection(db, "guestbook"), {
		uid: currentUser.uid,
		name: currentUser.displayName || currentUser.email.split("@")[0],
		photoURL: (currentUser.photoURL && /^https:\/\//i.test(currentUser.photoURL))
			? currentUser.photoURL
			: null,
		text: text,
		createdAt: fs.serverTimestamp()
	});
}

async function removeMessage(id, button) {
	if (!window.confirm("Delete this message?")) return;
	button.disabled = true;
	try {
		await connect();
		await fs.deleteDoc(fs.doc(db, "guestbook", id));
	} catch (err) {
		button.disabled = false;
		setStatus(el.formStatus, describeError(err), "error");
	}
}

/* ---------- auth UI ---------- */

function showSignedIn(user) {
	currentUser = user;
	el.signedOut.hidden = true;
	el.signedIn.hidden = false;
	el.form.hidden = false;

	const label = user.displayName || user.email || "Signed in";
	el.who.textContent = label;

	el.avatar.textContent = "";
	if (user.photoURL && /^https:\/\//i.test(user.photoURL)) {
		const img = document.createElement("img");
		img.src = user.photoURL;
		img.alt = "";
		img.referrerPolicy = "no-referrer";
		img.addEventListener("error", () => {
			el.avatar.textContent = initials(label);
		});
		el.avatar.appendChild(img);
	} else {
		el.avatar.textContent = initials(label);
	}
}

function showSignedOut() {
	currentUser = null;
	el.signedOut.hidden = false;
	el.signedIn.hidden = true;
	el.form.hidden = true;
}

/* ---------- wiring ---------- */

function wireForm() {
	el.text.addEventListener("input", () => {
		const len = el.text.value.length;
		el.counter.textContent = len + " / " + MAX_LEN;
		el.counter.classList.toggle("isOver", len > MAX_LEN);
		el.postBtn.disabled = len === 0 || len > MAX_LEN;
	});

	el.form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const text = el.text.value.trim();

		if (!text) return;
		if (text.length > MAX_LEN) {
			setStatus(el.formStatus, "That message is too long.", "error");
			return;
		}
		if (Date.now() - lastPostAt < COOLDOWN_MS) {
			const wait = Math.ceil((COOLDOWN_MS - (Date.now() - lastPostAt)) / 1000);
			setStatus(el.formStatus, `Give it ${wait}s before posting again.`, "error");
			return;
		}

		el.postBtn.disabled = true;
		setStatus(el.formStatus, "Posting…", "");

		try {
			await postMessage(text);
			lastPostAt = Date.now();
			el.text.value = "";
			el.counter.textContent = "0 / " + MAX_LEN;
			setStatus(el.formStatus, "Posted. Thanks for signing!", "ok");
			setTimeout(() => setStatus(el.formStatus, ""), 4000);
		} catch (err) {
			setStatus(el.formStatus, describeError(err), "error");
			el.postBtn.disabled = false;
		}
	});
}

function wireAuth() {
	el.googleBtn.addEventListener("click", async () => {
		setStatus(el.authStatus, "Opening Google sign-in…", "");
		el.googleBtn.disabled = true;
		try {
			await signInWithGoogle();
			setStatus(el.authStatus, "");
		} catch (err) {
			setStatus(el.authStatus, describeError(err), "error");
		} finally {
			el.googleBtn.disabled = false;
		}
	});

	el.emailForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const email = el.emailInput.value.trim();
		if (!email) return;

		const btn = el.emailForm.querySelector("button");
		btn.disabled = true;
		setStatus(el.authStatus, "Sending your sign-in link…", "");

		try {
			await sendMagicLink(email);
			setStatus(
				el.authStatus,
				`Link sent to ${email}. Open it on this device to finish signing in.`,
				"ok"
			);
			el.emailInput.value = "";
		} catch (err) {
			setStatus(el.authStatus, describeError(err), "error");
		} finally {
			btn.disabled = false;
		}
	});

	el.signOutBtn.addEventListener("click", async () => {
		await signOutUser();
		setStatus(el.formStatus, "");
	});
}

/* ---------- boot ---------- */

async function init() {
	if (!isConfigured) {
		el.setup.hidden = false;
		el.authPanel.hidden = true;
		el.loading.hidden = true;
		el.empty.hidden = true;
		return;
	}

	wireForm();
	wireAuth();

	try {
		await completeMagicLink();
	} catch (err) {
		setStatus(el.authStatus, describeError(err), "error");
	}

	await onUserChange((user) => {
		if (user) showSignedIn(user);
		else showSignedOut();
		// Delete buttons depend on who is signed in.
		if (latestDocs.length) renderMessages(latestDocs);
	});

	watchMessages();
}

init().catch((err) => {
	el.loading.hidden = true;
	setStatus(el.formStatus, describeError(err), "error");
});
