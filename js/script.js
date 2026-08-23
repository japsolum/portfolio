(function () {
	"use strict";

	// Mobile nav toggle
	var toggle = document.getElementById("navToggle");
	var list = document.getElementById("navList");

	if (toggle && list) {
		toggle.addEventListener("click", function () {
			var isOpen = list.classList.toggle("is-open");
			toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
		});

		list.querySelectorAll("a").forEach(function (link) {
			link.addEventListener("click", function () {
				list.classList.remove("is-open");
				toggle.setAttribute("aria-expanded", "false");
			});
		});
	}

	// Footer year
	var yearEl = document.getElementById("year");
	if (yearEl) {
		yearEl.textContent = String(new Date().getFullYear());
	}
})();
