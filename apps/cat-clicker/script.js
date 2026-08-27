/* Cat Clicker — vanilla JS (no Knockout, no jQuery).
   Keeps the original model/view split: a list of cats, one selected at a
   time, each tracking its own click count and derived level. */
(function () {
	"use strict";

	var initialCats = [
		{ name: "Tiger",   imgSrc: "images/tiger.jpg",   scientific: "Panthera tigris" },
		{ name: "Leopard", imgSrc: "images/leopard.jpg", scientific: "Panthera pardus" },
		{ name: "Cheetah", imgSrc: "images/cheetah.jpg", scientific: "Acinonyx jubatus" },
		{ name: "Panther", imgSrc: "images/panther.jpg", scientific: "Panthera pardus" },
		{ name: "Lynx",    imgSrc: "images/lynx.jpg",    scientific: "Lynx pardinus" }
	];

	var LEVELS = [
		{ under: 10,  label: "Newborn" },
		{ under: 50,  label: "Infant" },
		{ under: 100, label: "Child" },
		{ under: 200, label: "Teen" },
		{ under: 500, label: "Adult" }
	];

	function levelFor(clicks) {
		for (var i = 0; i < LEVELS.length; i++) {
			if (clicks < LEVELS[i].under) return LEVELS[i].label;
		}
		return "Ninja";
	}

	var cats = initialCats.map(function (data) {
		return {
			name: data.name,
			imgSrc: data.imgSrc,
			scientific: data.scientific,
			clickCount: 0
		};
	});

	var el = {
		list: document.getElementById("catList"),
		name: document.getElementById("catName"),
		image: document.getElementById("catImage"),
		button: document.getElementById("catButton"),
		scientific: document.getElementById("catScientific"),
		level: document.getElementById("catLevel"),
		clicks: document.getElementById("catClicks")
	};

	var currentIndex = 0;
	var buttons = [];

	function renderList() {
		el.list.textContent = "";
		buttons = [];

		cats.forEach(function (cat, index) {
			var li = document.createElement("li");
			var btn = document.createElement("button");
			btn.type = "button";
			btn.className = "navButton";
			btn.textContent = cat.name;
			btn.addEventListener("click", function () {
				selectCat(index);
			});
			li.appendChild(btn);
			el.list.appendChild(li);
			buttons.push(btn);
		});
	}

	function selectCat(index) {
		currentIndex = index;
		buttons.forEach(function (btn, i) {
			btn.classList.toggle("isActive", i === index);
			btn.setAttribute("aria-current", i === index ? "true" : "false");
		});
		renderCat();
	}

	function renderCat() {
		var cat = cats[currentIndex];
		el.name.textContent = cat.name;
		el.image.src = cat.imgSrc;
		el.image.alt = cat.name;
		el.scientific.textContent = cat.scientific;
		el.level.textContent = levelFor(cat.clickCount);
		el.clicks.textContent = String(cat.clickCount);
	}

	el.button.addEventListener("click", function () {
		var cat = cats[currentIndex];
		cat.clickCount += 1;
		renderCat();

		// Feed the shared worldwide tally (globalcount.js), if it loaded.
		if (typeof window.onCatClick === "function") {
			window.onCatClick(cat.name);
		}
	});

	renderList();
	selectCat(0);
})();
