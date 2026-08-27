/* ---------------------------------------------------------------------------
 * Arcade-style high scores — top 5 per game, three initials, no login.
 *
 * Data model: leaderboards/{game}/entries/{id}
 *   initials   "ABC"
 *   score      the headline number (moves for memory, streak for arcade)
 *   extra      tiebreaker (seconds for memory, 0 for arcade)
 *   sortKey    single number where LOWER IS ALWAYS BETTER, so one orderBy
 *              serves every game and Firestore needs no composite index
 *   createdAt  server clock
 *
 * A collection per game (rather than one collection with a `game` field)
 * keeps the query to a plain orderBy, which Firestore indexes automatically.
 * ------------------------------------------------------------------------ */

import { firebaseConfig, isConfigured, SDK } from "../../js/firebase-config.js";

const APP_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`;
const FS_URL = `https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`;

const TOP_N = 5;

/* Keep the board presentable. Not exhaustive and not a security control —
 * anyone determined can bypass client-side checks, which is what the Delete
 * option in the Firebase console is for. */
const BLOCKED = new Set([
	"ASS", "FUK", "FUC", "FCK", "SHT", "SEX", "CUM", "TIT", "FAG", "NIG",
	"KKK", "DIE", "GAY", "JEW", "POO", "PIS", "DIK", "COK", "VAG", "RAP"
]);

let fs = null;
let db = null;

async function connect() {
	if (db) return;
	const [appMod, fsMod] = await Promise.all([import(APP_URL), import(FS_URL)]);
	const app = appMod.getApps && appMod.getApps().length
		? appMod.getApps()[0]
		: appMod.initializeApp(firebaseConfig);
	fs = fsMod;
	db = fsMod.getFirestore(app);
}

function entriesRef(game) {
	return fs.collection(db, "leaderboards", game, "entries");
}

export function formatClock(totalSeconds) {
	const s = Math.max(0, Math.round(totalSeconds));
	const m = Math.floor(s / 60);
	const r = s % 60;
	return m + ":" + (r < 10 ? "0" + r : String(r));
}

/* ------------------------------------------------------------------------ */

export function createLeaderboard(options) {
	const game = options.game;
	const mount = options.mount;
	const formatRow = options.format;
	const heading = options.heading || "High Scores";
	const rule = options.rule || "";
	// score -> sortKey, where lower always wins
	const toSortKey = options.sortKey;

	let entries = [];
	let loaded = false;

	function shell() {
		mount.textContent = "";
		mount.className = "hs";

		const head = document.createElement("div");
		head.className = "hs__head";

		const h = document.createElement("h2");
		h.className = "hs__title";
		h.textContent = heading;
		head.appendChild(h);

		if (rule) {
			const sub = document.createElement("span");
			sub.className = "hs__rule";
			sub.textContent = rule;
			head.appendChild(sub);
		}

		mount.appendChild(head);

		const body = document.createElement("div");
		body.className = "hs__body";
		mount.appendChild(body);
		return body;
	}

	function renderState(message) {
		const body = mount.querySelector(".hs__body") || shell();
		body.textContent = "";
		const p = document.createElement("p");
		p.className = "hs__state";
		p.textContent = message;
		body.appendChild(p);
	}

	function renderTable(highlightId) {
		const body = mount.querySelector(".hs__body") || shell();
		body.textContent = "";

		if (entries.length === 0) {
			renderState("No scores yet — be the first.");
			return;
		}

		const list = document.createElement("ol");
		list.className = "hs__list";

		entries.forEach(function (entry, index) {
			const li = document.createElement("li");
			li.className = "hs__row";
			if (entry.id && entry.id === highlightId) li.classList.add("isNew");

			const rank = document.createElement("span");
			rank.className = "hs__rank";
			rank.textContent = String(index + 1);

			const who = document.createElement("span");
			who.className = "hs__initials";
			who.textContent = entry.initials;

			const what = document.createElement("span");
			what.className = "hs__score";
			what.textContent = formatRow(entry);

			li.appendChild(rank);
			li.appendChild(who);
			li.appendChild(what);
			list.appendChild(li);
		});

		body.appendChild(list);
	}

	async function load() {
		shell();

		if (!isConfigured) {
			renderState("High scores aren't connected yet.");
			return;
		}

		renderState("Loading…");

		try {
			await connect();
			const snap = await fs.getDocs(
				fs.query(entriesRef(game), fs.orderBy("sortKey", "asc"), fs.limit(TOP_N))
			);
			entries = snap.docs.map(function (d) {
				const data = d.data();
				return {
					id: d.id,
					initials: data.initials,
					score: data.score,
					extra: data.extra,
					sortKey: data.sortKey
				};
			});
			loaded = true;
			renderTable();
		} catch (err) {
			// The game itself must never depend on this.
			renderState("High scores are unavailable right now.");
		}
	}

	/* Does this run make the board? */
	function qualifies(score, extra) {
		if (!loaded) return false;
		if (entries.length < TOP_N) return true;
		return toSortKey(score, extra) < entries[entries.length - 1].sortKey;
	}

	async function submit(initials, score, extra) {
		await connect();
		const doc = {
			initials: initials,
			score: score,
			extra: extra,
			sortKey: toSortKey(score, extra),
			createdAt: fs.serverTimestamp()
		};
		const ref = await fs.addDoc(entriesRef(game), doc);
		await load();
		renderTable(ref.id);
		return ref.id;
	}

	/* Build the initials form. Resolves once submitted or skipped. */
	function askForInitials(container, score, extra, rank) {
		return new Promise(function (resolve) {
			const wrap = document.createElement("div");
			wrap.className = "hsAsk";

			const title = document.createElement("p");
			title.className = "hsAsk__title";
			title.textContent = rank === 1
				? "New high score!"
				: "You made the top " + TOP_N + " — #" + rank + "!";

			const form = document.createElement("form");
			form.className = "hsAsk__form";

			const label = document.createElement("label");
			label.className = "hsAsk__label";
			label.setAttribute("for", "hsInitials");
			label.textContent = "Enter your initials";

			const input = document.createElement("input");
			input.id = "hsInitials";
			input.className = "hsAsk__input";
			input.type = "text";
			// No maxlength attribute on purpose: the browser would truncate the
			// raw value before the filter below strips digits and punctuation,
			// so typing "a1b2c" would land as "AB". Clean first, then cap.
			input.autocomplete = "off";
			input.spellcheck = false;
			input.setAttribute("aria-describedby", "hsInitialsHint");
			input.placeholder = "AAA";

			const hint = document.createElement("p");
			hint.id = "hsInitialsHint";
			hint.className = "hsAsk__hint";
			hint.textContent = "Three letters.";

			const actions = document.createElement("div");
			actions.className = "hsAsk__actions";

			const save = document.createElement("button");
			save.type = "submit";
			save.className = "hsAsk__save";
			save.textContent = "Save score";
			save.disabled = true;

			const skip = document.createElement("button");
			skip.type = "button";
			skip.className = "hsAsk__skip";
			skip.textContent = "No thanks";

			actions.appendChild(save);
			actions.appendChild(skip);

			form.appendChild(label);
			form.appendChild(input);
			form.appendChild(hint);
			form.appendChild(actions);

			wrap.appendChild(title);
			wrap.appendChild(form);
			container.appendChild(wrap);

			input.addEventListener("input", function () {
				const clean = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
				if (clean !== input.value) input.value = clean;
				save.disabled = clean.length !== 3;
				hint.textContent = "Three letters.";
				hint.classList.remove("isError");
			});

			function finish(result) {
				wrap.remove();
				resolve(result);
			}

			skip.addEventListener("click", function () {
				finish(false);
			});

			form.addEventListener("submit", async function (event) {
				event.preventDefault();
				const initials = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);

				if (initials.length !== 3) {
					hint.textContent = "Please enter exactly three letters.";
					hint.classList.add("isError");
					return;
				}
				if (BLOCKED.has(initials)) {
					hint.textContent = "Pick a different set of initials.";
					hint.classList.add("isError");
					input.select();
					return;
				}

				save.disabled = true;
				skip.disabled = true;
				hint.textContent = "Saving…";

				try {
					await submit(initials, score, extra);
					finish(true);
				} catch (err) {
					hint.textContent = "Couldn't save that score. Check your connection.";
					hint.classList.add("isError");
					save.disabled = false;
					skip.disabled = false;
				}
			});

			setTimeout(function () {
				input.focus();
			}, 50);
		});
	}

	/* Call when a run ends. Resolves true if a score was actually saved. */
	async function offerSubmit(opts) {
		const score = opts.score;
		const extra = opts.extra || 0;
		const container = opts.container;

		if (!isConfigured || !loaded) return false;
		if (!qualifies(score, extra)) return false;

		const key = toSortKey(score, extra);
		let rank = 1;
		entries.forEach(function (e) {
			if (e.sortKey <= key) rank += 1;
		});

		return askForInitials(container, score, extra, rank);
	}

	return {
		load: load,
		render: renderTable,
		qualifies: qualifies,
		offerSubmit: offerSubmit,
		get entries() {
			return entries.slice();
		}
	};
}
