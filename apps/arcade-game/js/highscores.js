/* Classic Arcade Game leaderboard.
   Score is your win streak — a bug catching you ends the run. */

import { createLeaderboard } from "../../_shared/scores.js";

const CEILING = 1000000; // flips "higher streak wins" into "lower sortKey wins"

const board = createLeaderboard({
	game: "arcade-game",
	mount: document.getElementById("leaderboard"),
	heading: "High Scores",
	rule: "Longest win streak",
	sortKey: function (streak) {
		return CEILING - streak;
	},
	format: function (entry) {
		return entry.score + (entry.score === 1 ? " win" : " wins");
	}
});

board.load();

let busy = false;

window.onArcadeStreakEnd = function (streak) {
	// The game loop keeps running underneath; ignore overlapping run-ends.
	if (busy) return;

	if (!board.qualifies(streak, 0)) return;
	busy = true;

	const overlay = document.createElement("div");
	overlay.className = "hsOverlay";
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-modal", "true");

	const panel = document.createElement("div");
	panel.className = "hsOverlay__panel";

	const title = document.createElement("h2");
	title.textContent = "Streak over";

	const sub = document.createElement("p");
	sub.className = "hsOverlay__sub";
	sub.textContent =
		"You reached " + streak + (streak === 1 ? " win" : " wins") + " in a row.";

	const slot = document.createElement("div");

	panel.appendChild(title);
	panel.appendChild(sub);
	panel.appendChild(slot);
	overlay.appendChild(panel);
	document.body.appendChild(overlay);

	// Freeze movement so the player isn't steering blind behind the dialog.
	window.__hsModalOpen = true;

	function close() {
		overlay.remove();
		window.__hsModalOpen = false;
		busy = false;
	}

	board
		.offerSubmit({ score: streak, extra: 0, container: slot })
		.then(function (saved) {
			if (saved) {
				sub.textContent = "Saved. Nice run.";
				const done = document.createElement("button");
				done.type = "button";
				done.className = "hsOverlay__close";
				done.textContent = "Keep playing";
				done.addEventListener("click", close);
				panel.appendChild(done);
				done.focus();
			} else {
				close();
			}
		})
		.catch(function () {
			close();
		});
};
