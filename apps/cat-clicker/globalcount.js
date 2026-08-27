/* ---------------------------------------------------------------------------
 * Cat Clicker — one shared tally across everyone who has ever played.
 *
 * A clicker generates far too many clicks to write one document per click:
 * a single enthusiastic visitor would eat a meaningful slice of the free
 * tier's 20,000 daily writes on their own. So clicks pile up locally and
 * flush in batches — a 200-click session costs a handful of writes, not 200.
 *
 * Firestore's increment() is applied server-side and atomically, so two
 * people clicking at the same moment both count; neither overwrites the
 * other's total.
 * ------------------------------------------------------------------------ */

import { firebaseConfig, isConfigured, SDK } from "../../js/firebase-config.js";

const APP_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`;
const FS_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`;

const CATS = ["Tiger", "Leopard", "Cheetah", "Panther", "Lynx"];
const FIELD = {
	Tiger: "tiger",
	Leopard: "leopard",
	Cheetah: "cheetah",
	Panther: "panther",
	Lynx: "lynx"
};

const IDLE_FLUSH_MS = 2500; // quiet spell before sending what's queued
const BATCH_LIMIT = 100;    // or send early once this many pile up

const mount = document.getElementById("globalCount");

let fs = null;
let db = null;
let ref = null;

let server = null;               // last totals from Firestore
let pending = Object.create(null);   // queued, not yet sent
let inFlight = Object.create(null);  // sent, awaiting confirmation
let pendingTotal = 0;
let inFlightTotal = 0;
let displayedTotal = 0;          // only ever moves up, so it never flickers down
let idleTimer = null;
let offline = false;

/* ---------- view ---------- */

function build() {
	mount.className = "hs gc";
	mount.textContent = "";

	const head = document.createElement("div");
	head.className = "hs__head";

	const title = document.createElement("h2");
	title.className = "hs__title";
	title.textContent = "Clicked Worldwide";
	head.appendChild(title);

	const rule = document.createElement("span");
	rule.className = "hs__rule";
	rule.textContent = "Everyone who has ever played";
	head.appendChild(rule);

	mount.appendChild(head);

	const big = document.createElement("p");
	big.className = "gc__total";
	big.id = "gcTotal";
	big.textContent = "—";
	mount.appendChild(big);

	const list = document.createElement("ul");
	list.className = "gc__list";
	list.id = "gcList";
	mount.appendChild(list);

	const note = document.createElement("p");
	note.className = "gc__note";
	note.id = "gcNote";
	note.hidden = true;
	mount.appendChild(note);
}

function setNote(message) {
	const note = document.getElementById("gcNote");
	if (!note) return;
	note.textContent = message || "";
	note.hidden = !message;
}

/* Deliberately does NOT add inFlight. Firestore applies a pending write to
 * the local snapshot immediately (latency compensation), so a flushed batch
 * shows up in `server` well before setDoc resolves. Counting inFlight here
 * too would double it — and because the display only ever moves upward, that
 * inflated figure would then stick. inFlight exists purely so a failed write
 * can be put back on the queue; the upward clamp in render() is what stops
 * the number dipping while a write is in the air. */
function totalNow() {
	const base = server ? server.total : 0;
	return base + pendingTotal;
}

function catNow(name) {
	const key = FIELD[name];
	const base = server && server[key] ? server[key] : 0;
	return base + (pending[name] || 0);
}

function render() {
	const big = document.getElementById("gcTotal");
	const list = document.getElementById("gcList");
	if (!big || !list) return;

	// Clamp upward only: a flush clears its local tally the instant it lands,
	// and if the snapshot is a beat behind the number would otherwise dip.
	displayedTotal = Math.max(displayedTotal, totalNow());
	big.textContent = displayedTotal.toLocaleString();

	list.textContent = "";
	CATS.slice()
		.sort(function (a, b) {
			return catNow(b) - catNow(a);
		})
		.forEach(function (name) {
			const li = document.createElement("li");
			li.className = "gc__row";

			const label = document.createElement("span");
			label.className = "gc__name";
			label.textContent = name;

			const value = document.createElement("span");
			value.className = "gc__value";
			value.textContent = catNow(name).toLocaleString();

			li.appendChild(label);
			li.appendChild(value);
			list.appendChild(li);
		});
}

/* ---------- data ---------- */

async function connect() {
	if (db) return;
	const [appMod, fsMod] = await Promise.all([import(APP_URL), import(FS_URL)]);
	const app = appMod.getApps && appMod.getApps().length
		? appMod.getApps()[0]
		: appMod.initializeApp(firebaseConfig);
	fs = fsMod;
	db = fsMod.getFirestore(app);
	ref = fsMod.doc(db, "counters", "cat-clicker");
}

async function watch() {
	await connect();
	fs.onSnapshot(
		ref,
		function (snap) {
			const data = snap.exists() ? snap.data() : {};
			server = {
				total: data.total || 0,
				tiger: data.tiger || 0,
				leopard: data.leopard || 0,
				cheetah: data.cheetah || 0,
				panther: data.panther || 0,
				lynx: data.lynx || 0
			};
			offline = false;
			setNote("");
			render();
		},
		function () {
			offline = true;
			setNote("Live total unavailable — your clicks still count locally.");
		}
	);
}

async function flush() {
	if (idleTimer) {
		clearTimeout(idleTimer);
		idleTimer = null;
	}
	if (pendingTotal === 0) return;
	if (!isConfigured) return;

	// Move the queue into flight so clicks during the write aren't lost.
	const batch = pending;
	const batchTotal = pendingTotal;
	pending = Object.create(null);
	pendingTotal = 0;

	Object.keys(batch).forEach(function (name) {
		inFlight[name] = (inFlight[name] || 0) + batch[name];
	});
	inFlightTotal += batchTotal;

	try {
		await connect();

		const update = {
			total: fs.increment(batchTotal),
			updatedAt: fs.serverTimestamp()
		};
		Object.keys(batch).forEach(function (name) {
			update[FIELD[name]] = fs.increment(batch[name]);
		});

		// merge:true creates the document on the very first click ever.
		await fs.setDoc(ref, update, { merge: true });

		Object.keys(batch).forEach(function (name) {
			inFlight[name] -= batch[name];
			if (inFlight[name] <= 0) delete inFlight[name];
		});
		inFlightTotal -= batchTotal;
		offline = false;
	} catch (err) {
		// Put it back so nothing is silently dropped.
		Object.keys(batch).forEach(function (name) {
			inFlight[name] -= batch[name];
			if (inFlight[name] <= 0) delete inFlight[name];
			pending[name] = (pending[name] || 0) + batch[name];
		});
		inFlightTotal -= batchTotal;
		pendingTotal += batchTotal;
		offline = true;
		setNote("Can't reach the counter right now — clicks are queued.");
	}
	render();
}

function scheduleFlush() {
	if (idleTimer) clearTimeout(idleTimer);
	idleTimer = setTimeout(flush, IDLE_FLUSH_MS);
}

/* ---------- public hook ---------- */

window.onCatClick = function (catName) {
	if (!FIELD[catName]) return;

	pending[catName] = (pending[catName] || 0) + 1;
	pendingTotal += 1;
	render();

	if (pendingTotal >= BATCH_LIMIT) flush();
	else scheduleFlush();
};

// Send whatever is queued before the tab goes away. visibilitychange is the
// one that actually fires reliably on mobile; unload often does not.
document.addEventListener("visibilitychange", function () {
	if (document.visibilityState === "hidden") flush();
});
window.addEventListener("pagehide", flush);

/* ---------- boot ---------- */

build();

if (!isConfigured) {
	setNote("The worldwide counter isn't connected yet.");
	render();
} else {
	watch().catch(function () {
		offline = true;
		setNote("Live total unavailable — your clicks still count locally.");
		render();
	});
}
