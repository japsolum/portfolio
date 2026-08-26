/* ---------------------------------------------------------------------------
 * Authentication — Google sign-in and passwordless email links.
 * Wraps the Firebase Auth SDK so the rest of the site deals in plain callbacks.
 * ------------------------------------------------------------------------ */

import { firebaseConfig, isConfigured, SDK } from "./firebase-config.js";

const APP_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-auth.js`;

const EMAIL_KEY = "jsp:pendingEmail";

let auth = null;
let sdk = null;
let app = null;

/* Load the SDK once and hand back the pieces we need. */
async function load() {
	if (auth) return { auth, sdk };

	const [appMod, authMod] = await Promise.all([import(APP_URL), import(AUTH_URL)]);

	app = appMod.initializeApp(firebaseConfig);
	auth = authMod.getAuth(app);
	sdk = authMod;

	// Keep the user signed in between visits.
	await authMod.setPersistence(auth, authMod.browserLocalPersistence);

	return { auth, sdk };
}

export function configured() {
	return isConfigured;
}

export async function getApp() {
	await load();
	return app;
}

/* Subscribe to sign-in state. Fires immediately with the current user (or
 * null), then again on every change. Returns an unsubscribe function. */
export async function onUserChange(callback) {
	const { auth, sdk } = await load();
	return sdk.onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
	const { auth, sdk } = await load();
	const provider = new sdk.GoogleAuthProvider();
	provider.setCustomParameters({ prompt: "select_account" });

	try {
		await sdk.signInWithPopup(auth, provider);
	} catch (err) {
		// Popup blockers and mobile in-app browsers routinely kill popups;
		// fall back to a full-page redirect rather than failing outright.
		if (
			err.code === "auth/popup-blocked" ||
			err.code === "auth/operation-not-supported-in-this-environment"
		) {
			await sdk.signInWithRedirect(auth, provider);
			return;
		}
		if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
			throw new Error("Sign-in was cancelled.");
		}
		throw err;
	}
}

/* Send a one-time sign-in link. The link returns to this same page. */
export async function sendMagicLink(email) {
	const { auth, sdk } = await load();

	const url = new URL(window.location.href);
	url.hash = "";
	url.search = "";

	await sdk.sendSignInLinkToEmail(auth, email, {
		url: url.toString(),
		handleCodeInApp: true
	});

	// Needed to complete sign-in when they come back via the link.
	try {
		window.localStorage.setItem(EMAIL_KEY, email);
	} catch (e) {
		/* private mode — we'll prompt for the address instead */
	}
}

/* Call on page load. If this page was opened from a sign-in link, finish the
 * sign-in. Returns true if a sign-in actually completed. */
export async function completeMagicLink() {
	if (!isConfigured) return false;

	const { auth, sdk } = await load();
	if (!sdk.isSignInWithEmailLink(auth, window.location.href)) return false;

	let email = null;
	try {
		email = window.localStorage.getItem(EMAIL_KEY);
	} catch (e) {
		/* ignore */
	}

	// Opened on a different device or browser than the one that requested it.
	if (!email) {
		email = window.prompt("Confirm the email address this link was sent to:");
	}
	if (!email) return false;

	await sdk.signInWithEmailLink(auth, email, window.location.href);

	try {
		window.localStorage.removeItem(EMAIL_KEY);
	} catch (e) {
		/* ignore */
	}

	// Strip the credential out of the address bar.
	const clean = new URL(window.location.href);
	clean.search = "";
	window.history.replaceState({}, document.title, clean.toString());

	return true;
}

export async function signOutUser() {
	const { auth, sdk } = await load();
	await sdk.signOut(auth);
}

/* Human-readable messages for the error codes users actually hit. */
export function describeError(err) {
	const code = (err && err.code) || "";
	const text = (err && err.message) || "";

	// The SDK loads from Google's CDN at runtime. Ad blockers, locked-down
	// corporate networks, and offline visitors all fail here, and the raw
	// message ("Failed to fetch dynamically imported module: https://...")
	// means nothing to a visitor.
	if (/dynamically imported module|Failed to fetch|NetworkError/i.test(text)) {
		return "Couldn't load the sign-in service. Check your connection — " +
			"an ad blocker or network filter may be blocking Google's servers.";
	}

	const map = {
		"auth/invalid-email": "That doesn't look like a valid email address.",
		"auth/missing-email": "Please enter an email address.",
		"auth/invalid-action-code": "That sign-in link has expired or was already used. Request a new one.",
		"auth/expired-action-code": "That sign-in link has expired. Request a new one.",
		"auth/network-request-failed": "Network problem — check your connection and try again.",
		"auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
		"auth/unauthorized-domain": "This domain isn't authorised in the Firebase console yet.",
		"permission-denied": "You don't have permission to do that.",
		"unavailable": "Can't reach the database right now. Try again in a moment."
	};
	return map[code] || (err && err.message) || "Something went wrong. Please try again.";
}
