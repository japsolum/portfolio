/* Injects a "back to portfolio" bar into a hosted app.
   Reads the app title from data-app-title on its own <script> tag. */
(function () {
	"use strict";

	var self = document.currentScript;
	var title = (self && self.getAttribute("data-app-title")) || document.title || "";
	var source = (self && self.getAttribute("data-source")) || "";

	function build() {
		if (document.querySelector(".jsp-backbar")) return;

		var bar = document.createElement("div");
		bar.className = "jsp-backbar";

		var home = document.createElement("a");
		home.className = "jsp-backbar-home";
		home.href = "../../index.html";
		home.textContent = "← Portfolio";
		bar.appendChild(home);

		if (title) {
			var label = document.createElement("span");
			label.className = "jsp-backbar-title";
			label.textContent = title;
			bar.appendChild(label);
		}

		if (source) {
			var src = document.createElement("a");
			src.className = "jsp-backbar-src";
			src.href = source;
			src.target = "_blank";
			src.rel = "noopener";
			src.textContent = "Source ↗";
			bar.appendChild(src);
		}

		document.body.insertBefore(bar, document.body.firstChild);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", build);
	} else {
		build();
	}
})();
