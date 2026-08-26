/* ---------------------------------------------------------------------------
 * Firebase configuration
 * ---------------------------------------------------------------------------
 * These values come from the Firebase console:
 *   Project settings -> General -> Your apps -> SDK setup and configuration.
 *
 * They are NOT secret. Firebase web config is designed to ship in client code —
 * anyone can read it by viewing source, and that is expected. What protects
 * your data is the Firestore security rules in firestore.rules, not hiding
 * these keys.
 *
 * See FIREBASE-SETUP.md for the remaining console steps.
 * ------------------------------------------------------------------------ */

export const firebaseConfig = {
	apiKey: "AIzaSyBmpzIdl8bbowhg6txGK-zpeCeTSZP5xrA",
	authDomain: "guestbook-ba3db.firebaseapp.com",
	projectId: "guestbook-ba3db",
	storageBucket: "guestbook-ba3db.firebasestorage.app",
	messagingSenderId: "639970613035",
	appId: "1:639970613035:web:ff01fb32a5f61798ac576e"
	// measurementId "G-7RX6EDHFB1" omitted — the guest book never loads
	// Analytics. Add it back here if you wire Analytics up later.
};

/* James's Firebase user ID, so he can delete anyone's message as site owner.
 * Must stay in sync with ownerUid() in firestore.rules, which is what
 * actually authorises the delete. */
export const OWNER_UID = "Mkoaglf88TQkVYnq9pDgQBwiyzl1";

/* Pinned SDK version. Bump deliberately, not automatically. */
export const SDK = "12.18.0";

/* True once the placeholders above have actually been replaced. The guest book
 * uses this to show a friendly setup notice instead of throwing errors. */
export const isConfigured =
	!firebaseConfig.apiKey.startsWith("PASTE") &&
	!firebaseConfig.projectId.startsWith("PASTE");
