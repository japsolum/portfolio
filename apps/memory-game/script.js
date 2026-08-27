/* Memory Game — vanilla JS (no jQuery).
   Match all 8 pairs; fewer moves earns a higher star rating. */
(function () {
	"use strict";

	var CARD_BACK = "images/card.png";
	var PAIRS = 8;

	// Two of each card value; ids are assigned after shuffling.
	var cards = [];
	for (var v = 1; v <= PAIRS; v++) {
		cards.push({ cardValue: v, imageSrc: "images/card" + v + ".svg" });
		cards.push({ cardValue: v, imageSrc: "images/card" + v + ".svg" });
	}

	// Fisher-Yates shuffle.
	function shuffle(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var tmp = array[i];
			array[i] = array[j];
			array[j] = tmp;
		}
		return array;
	}

	function pad(val) {
		return val > 9 ? String(val) : "0" + val;
	}

	var el = {
		board: document.getElementById("gameBoard"),
		moves: document.getElementById("noOfMoves"),
		minutes: document.getElementById("minutes"),
		seconds: document.getElementById("seconds"),
		star1: document.getElementById("star1"),
		star2: document.getElementById("star2"),
		star3: document.getElementById("star3")
	};

	var state = {
		timerId: null,
		elapsed: 0,
		started: false,
		turn: 1,
		moves: 0,
		matched: 0,
		locked: false,
		firstId: null,
		firstSrc: null,
		starRating: "3 star",
		displayTime: "00:00"
	};

	// Timer only starts on the first card click, so the clock reflects play time.
	function startTimer() {
		if (state.started) return;
		state.started = true;
		state.timerId = setInterval(function () {
			state.elapsed += 1;
			var m = pad(Math.floor(state.elapsed / 60));
			var s = pad(state.elapsed % 60);
			state.displayTime = m + ":" + s;
			el.minutes.textContent = m;
			el.seconds.textContent = s;
		}, 1000);
	}

	function stopTimer() {
		if (state.timerId) clearInterval(state.timerId);
		state.timerId = null;
	}

	function updateStats() {
		el.moves.textContent = state.moves + (state.moves === 1 ? " Move" : " Moves");
		if (state.moves >= 18) {
			el.star3.src = "images/empty_star.svg";
			el.star2.src = "images/empty_star.svg";
			state.starRating = "1 star";
		} else if (state.moves >= 13) {
			el.star3.src = "images/empty_star.svg";
			state.starRating = "2 star";
		}
	}

	function cardById(id) {
		return el.board.querySelector('[data-id="' + id + '"]');
	}

	function onCardClick(event) {
		var card = event.currentTarget;
		if (state.locked) return;
		if (!card.classList.contains("active")) return;

		startTimer();

		var id = card.getAttribute("data-id");
		var src = card.getAttribute("data-src");

		if (state.turn === 1) {
			card.src = src;
			card.classList.remove("active");
			state.firstId = id;
			state.firstSrc = src;
			state.turn = 2;
			return;
		}

		state.moves += 1;
		updateStats();

		if (state.firstSrc === src) {
			handleMatch(id, src);
		} else {
			handleNonMatch(id, src);
		}
	}

	function handleMatch(id, src) {
		var second = cardById(id);
		var first = cardById(state.firstId);

		second.src = src;
		state.turn = 1;
		state.matched += 1;

		[first, second].forEach(function (c) {
			c.classList.remove("blueCard", "active");
			c.classList.add("whiteCard");
		});

		if (state.matched === PAIRS) {
			stopTimer();
			setTimeout(showWin, 400);
		}
	}

	function handleNonMatch(id, src) {
		var second = cardById(id);
		var first = cardById(state.firstId);

		second.src = src;
		state.locked = true;

		[first, second].forEach(function (c) {
			c.classList.remove("blueCard", "active");
			c.classList.add("redCard");
		});

		setTimeout(function () {
			[first, second].forEach(function (c) {
				c.src = CARD_BACK;
				c.classList.remove("redCard");
				c.classList.add("blueCard", "active");
			});
			state.locked = false;
		}, 900);

		state.turn = 1;
	}

	function showWin() {
		var overlay = document.createElement("div");
		overlay.className = "winOverlay";
		overlay.setAttribute("role", "dialog");
		overlay.setAttribute("aria-modal", "true");

		var panel = document.createElement("div");
		panel.className = "winPanel";

		var h = document.createElement("h2");
		h.textContent = "You win!";

		var p = document.createElement("p");
		p.textContent =
			"Finished in " + state.displayTime + " with " + state.moves +
			" moves — a " + state.starRating + " rating.";

		var again = document.createElement("button");
		again.type = "button";
		again.className = "winButton";
		again.textContent = "Play again";
		again.addEventListener("click", function () {
			location.reload();
		});

		panel.appendChild(h);
		panel.appendChild(p);

		// The high-score module drops its initials form in here, above the
		// Play again button, if this run made the top five.
		var scoreSlot = document.createElement("div");
		scoreSlot.className = "winScoreSlot";
		panel.appendChild(scoreSlot);

		panel.appendChild(again);
		overlay.appendChild(panel);
		document.body.appendChild(overlay);
		again.focus();

		// Hand the result to whoever is listening (highscores.js).
		if (typeof window.onMemoryGameWin === "function") {
			window.onMemoryGameWin({
				moves: state.moves,
				seconds: state.elapsed,
				displayTime: state.displayTime,
				slot: scoreSlot,
				focusFallback: again
			});
		}
	}

	function buildBoard() {
		shuffle(cards);
		el.board.textContent = "";

		for (var row = 0; row < 4; row++) {
			var rowEl = document.createElement("div");
			rowEl.className = "row";

			for (var col = 0; col < 4; col++) {
				var data = cards[row * 4 + col];
				var id = "card" + (row * 4 + col);

				var img = document.createElement("img");
				img.className = "card blueCard active";
				img.src = CARD_BACK;
				img.alt = "Face-down card";
				img.setAttribute("data-id", id);
				img.setAttribute("data-src", data.imageSrc);
				img.addEventListener("click", onCardClick);

				rowEl.appendChild(img);
			}
			el.board.appendChild(rowEl);
		}

		var resetRow = document.createElement("div");
		resetRow.className = "resetRow";
		var reset = document.createElement("button");
		reset.type = "button";
		reset.className = "reset";
		reset.textContent = "Reset";
		reset.addEventListener("click", function () {
			location.reload();
		});
		resetRow.appendChild(reset);
		el.board.appendChild(resetRow);
	}

	buildBoard();
	updateStats();
})();
