/* Memory Game leaderboard.
   Ranked by fewest moves, then fastest time. A perfect game is 8 moves. */

import { createLeaderboard, formatClock } from "../_shared/scores.js";

const MOVE_WEIGHT = 100000; // leaves room for the seconds tiebreaker

const board = createLeaderboard({
	game: "memory-game",
	mount: document.getElementById("leaderboard"),
	heading: "High Scores",
	rule: "Fewest moves wins",
	sortKey: function (moves, seconds) {
		return moves * MOVE_WEIGHT + seconds;
	},
	format: function (entry) {
		return entry.score + (entry.score === 1 ? " move" : " moves") +
			" · " + formatClock(entry.extra);
	}
});

board.load();

window.onMemoryGameWin = function (result) {
	board
		.offerSubmit({
			score: result.moves,
			extra: result.seconds,
			container: result.slot
		})
		.then(function (saved) {
			if (saved) {
				// The form removes itself on success; say so, or it looks
				// like the score vanished.
				var done = document.createElement("p");
				done.className = "winSaved";
				done.textContent = "Score saved to the board below.";
				result.slot.appendChild(done);
			}
			if (result.focusFallback) result.focusFallback.focus();
		})
		.catch(function () {
			/* a broken leaderboard must never break the game */
		});
};
