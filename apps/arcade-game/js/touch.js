/* On-screen movement controls so the game is playable without a keyboard.
   Feeds the same directions the arrow-key handler in app.js uses. */
(function () {
	"use strict";

	var pad = document.getElementById("touchPad");
	if (!pad || typeof player === "undefined") return;

	function move(dir) {
		if (window.__hsModalOpen) return;
		if (dir) player.handleInput(dir);
	}

	pad.addEventListener("click", function (event) {
		var btn = event.target.closest(".padBtn");
		if (btn) move(btn.getAttribute("data-dir"));
	});

	// Prevent the double-tap zoom / 300ms delay on touch devices.
	pad.addEventListener("touchstart", function (event) {
		var btn = event.target.closest(".padBtn");
		if (!btn) return;
		event.preventDefault();
		move(btn.getAttribute("data-dir"));
	}, { passive: false });

	// Arrow keys scroll the page by default — suppress that while playing.
	window.addEventListener("keydown", function (e) {
		if ([37, 38, 39, 40].indexOf(e.keyCode) !== -1) e.preventDefault();
	});
})();
