/* Neighborhood Map — vanilla JS, no API keys.
 *
 * The original build used Google Maps (key now dead), the Foursquare v2 API
 * (discontinued) and Google's Chart marker API (retired), plus jQuery and
 * Knockout. This version keeps the same idea — a filterable list of places
 * synced to a pannable map — with its own tiny Web Mercator map engine.
 *
 * Map tiles come from OpenStreetMap when the network allows. If they can't
 * load, the map falls back to a coordinate grid; markers stay correctly
 * positioned either way, so the app is never broken.
 */
(function () {
	"use strict";

	var PLACES = [
		{ name: "Chili's",             type: "Restaurants",    lat: 39.413115, lng: -104.871146 },
		{ name: "Outback",             type: "Restaurants",    lat: 39.407199, lng: -104.862636 },
		{ name: "Village Inn",         type: "Restaurants",    lat: 39.380436, lng: -104.864787 },
		{ name: "Walmart",             type: "Grocery Stores", lat: 39.406218, lng: -104.860948 },
		{ name: "King Soopers",        type: "Grocery Stores", lat: 39.415859, lng: -104.880294 },
		{ name: "Sprouts",             type: "Grocery Stores", lat: 39.415228, lng: -104.863347 },
		{ name: "Safeway",             type: "Grocery Stores", lat: 39.361930, lng: -104.860977 },
		{ name: "Home Depot",          type: "Misc",           lat: 39.415343, lng: -104.865925 },
		{ name: "PetSmart",            type: "Misc",           lat: 39.407385, lng: -104.863241 },
		{ name: "Castle Rock Outlets", type: "Misc",           lat: 39.415464, lng: -104.873549 }
	];

	var TYPES = ["All", "Restaurants", "Grocery Stores", "Misc"];

	var TYPE_COLOR = {
		"Restaurants":    "#f2934a",
		"Grocery Stores": "#4ac07a",
		"Misc":           "#22b8d8"
	};

	// Castle Rock, CO — the view everything is centred on.
	var HOME = { lat: 39.3945, lng: -104.8700, zoom: 13 };
	var TILE_SIZE = 256;
	var MIN_ZOOM = 11;
	var MAX_ZOOM = 17;

	/* ---------- Web Mercator projection ---------- */

	function lngToWorldX(lng, zoom) {
		return ((lng + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
	}

	function latToWorldY(lat, zoom) {
		var rad = (lat * Math.PI) / 180;
		var merc = Math.log(Math.tan(Math.PI / 4 + rad / 2));
		return (1 - merc / Math.PI) / 2 * TILE_SIZE * Math.pow(2, zoom);
	}

	// Great-circle distance in miles.
	function distanceMiles(a, b) {
		var R = 3958.8;
		var dLat = ((b.lat - a.lat) * Math.PI) / 180;
		var dLng = ((b.lng - a.lng) * Math.PI) / 180;
		var lat1 = (a.lat * Math.PI) / 180;
		var lat2 = (b.lat * Math.PI) / 180;
		var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
		return 2 * R * Math.asin(Math.sqrt(h));
	}

	/* ---------- DOM ---------- */

	var el = {
		map: document.getElementById("map"),
		tiles: document.getElementById("mapTiles"),
		grid: document.getElementById("mapGrid"),
		markers: document.getElementById("markerLayer"),
		list: document.getElementById("placeList"),
		filter: document.getElementById("filterBox"),
		count: document.getElementById("resultCount"),
		note: document.getElementById("mapNote"),
		navToggle: document.getElementById("navToggle"),
		sidebar: document.getElementById("sidebar"),
		zoomIn: document.getElementById("zoomIn"),
		zoomOut: document.getElementById("zoomOut"),
		resetView: document.getElementById("resetView"),
		info: document.getElementById("infoPanel"),
		infoName: document.getElementById("infoName"),
		infoType: document.getElementById("infoType"),
		infoCoords: document.getElementById("infoCoords"),
		infoDistance: document.getElementById("infoDistance"),
		infoDirections: document.getElementById("infoDirections"),
		infoClose: document.getElementById("infoClose")
	};

	var view = { lat: HOME.lat, lng: HOME.lng, zoom: HOME.zoom };
	var visible = PLACES.slice();
	var selected = null;
	var tilesWork = null; // null = unknown, true/false once tested
	var markerEls = new Map();
	var rowEls = new Map();

	function mapSize() {
		return { w: el.map.clientWidth, h: el.map.clientHeight };
	}

	// Pixel position of a lat/lng within the map viewport.
	function project(lat, lng) {
		var size = mapSize();
		var cx = lngToWorldX(view.lng, view.zoom);
		var cy = latToWorldY(view.lat, view.zoom);
		return {
			x: lngToWorldX(lng, view.zoom) - cx + size.w / 2,
			y: latToWorldY(lat, view.zoom) - cy + size.h / 2
		};
	}

	/* ---------- Tiles ---------- */

	function renderTiles() {
		if (tilesWork === false) return;

		var size = mapSize();
		var z = Math.round(view.zoom);
		var scale = Math.pow(2, view.zoom - z);
		var cx = lngToWorldX(view.lng, z);
		var cy = latToWorldY(view.lat, z);

		var half = { w: size.w / 2 / scale, h: size.h / 2 / scale };
		var minX = Math.floor((cx - half.w) / TILE_SIZE);
		var maxX = Math.floor((cx + half.w) / TILE_SIZE);
		var minY = Math.floor((cy - half.h) / TILE_SIZE);
		var maxY = Math.floor((cy + half.h) / TILE_SIZE);
		var limit = Math.pow(2, z);

		var frag = document.createDocumentFragment();

		for (var ty = minY; ty <= maxY; ty++) {
			if (ty < 0 || ty >= limit) continue;
			for (var tx = minX; tx <= maxX; tx++) {
				var wrapped = ((tx % limit) + limit) % limit;
				var img = document.createElement("img");
				img.className = "tile";
				img.alt = "";
				img.loading = "eager";
				img.src = "https://tile.openstreetmap.org/" + z + "/" + wrapped + "/" + ty + ".png";
				img.style.width = TILE_SIZE * scale + "px";
				img.style.height = TILE_SIZE * scale + "px";
				img.style.left = ((tx * TILE_SIZE - cx) * scale + size.w / 2) + "px";
				img.style.top = ((ty * TILE_SIZE - cy) * scale + size.h / 2) + "px";

				if (tilesWork === null) {
					img.addEventListener("load", function () { setTileStatus(true); }, { once: true });
					img.addEventListener("error", function () { setTileStatus(false); }, { once: true });
				}
				frag.appendChild(img);
			}
		}

		el.tiles.textContent = "";
		el.tiles.appendChild(frag);
	}

	function setTileStatus(ok) {
		if (tilesWork !== null) return;
		tilesWork = ok;
		el.map.classList.toggle("noTiles", !ok);
		if (!ok) {
			el.tiles.textContent = "";
			el.note.textContent =
				"Map tiles couldn't be reached, so the map is showing a coordinate grid. " +
				"Everything else works — markers are still positioned accurately.";
			el.note.classList.add("isVisible");
		} else {
			el.note.innerHTML = 'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
			el.note.classList.add("isVisible", "isAttribution");
		}
	}

	/* ---------- Fallback grid ---------- */

	function renderGrid() {
		var size = mapSize();
		var step = 0.01; // degrees
		var lines = [];

		var west = view.lng - (size.w / 2) / (TILE_SIZE * Math.pow(2, view.zoom) / 360);
		var east = view.lng + (size.w / 2) / (TILE_SIZE * Math.pow(2, view.zoom) / 360);

		for (var lng = Math.floor(west / step) * step; lng <= east; lng += step) {
			var p = project(view.lat, lng);
			if (p.x >= 0 && p.x <= size.w) {
				lines.push('<div class="gridLine gridV" style="left:' + p.x + 'px"><span>' + lng.toFixed(2) + '</span></div>');
			}
		}

		for (var i = -6; i <= 6; i++) {
			var lat = Math.round(view.lat / step) * step + i * step;
			var q = project(lat, view.lng);
			if (q.y >= 0 && q.y <= size.h) {
				lines.push('<div class="gridLine gridH" style="top:' + q.y + 'px"><span>' + lat.toFixed(2) + '</span></div>');
			}
		}

		el.grid.innerHTML = lines.join("");
	}

	/* ---------- Markers ---------- */

	function buildMarkers() {
		el.markers.textContent = "";
		markerEls.clear();

		PLACES.forEach(function (place) {
			var btn = document.createElement("button");
			btn.type = "button";
			btn.className = "marker";
			btn.style.setProperty("--pin", TYPE_COLOR[place.type] || "#22b8d8");
			btn.setAttribute("aria-label", place.name + " — " + place.type);

			var dot = document.createElement("span");
			dot.className = "markerDot";

			var label = document.createElement("span");
			label.className = "markerLabel";
			label.textContent = place.name;

			btn.appendChild(dot);
			btn.appendChild(label);

			btn.addEventListener("click", function () { select(place); });
			btn.addEventListener("mouseenter", function () { highlight(place, true); });
			btn.addEventListener("mouseleave", function () { highlight(place, false); });

			el.markers.appendChild(btn);
			markerEls.set(place.name, btn);
		});
	}

	function positionMarkers() {
		var size = mapSize();
		PLACES.forEach(function (place) {
			var node = markerEls.get(place.name);
			if (!node) return;

			var isVisible = visible.indexOf(place) !== -1;
			node.classList.toggle("isHidden", !isVisible);
			if (!isVisible) return;

			var p = project(place.lat, place.lng);
			var off = p.x < -60 || p.y < -60 || p.x > size.w + 60 || p.y > size.h + 60;
			node.classList.toggle("isOffscreen", off);
			node.style.transform = "translate(" + p.x + "px," + p.y + "px)";
		});
	}

	/* ---------- List ---------- */

	function renderList() {
		el.list.textContent = "";
		rowEls.clear();

		visible.forEach(function (place) {
			var li = document.createElement("li");
			var btn = document.createElement("button");
			btn.type = "button";
			btn.className = "placeRow";
			btn.style.setProperty("--pin", TYPE_COLOR[place.type] || "#22b8d8");

			var name = document.createElement("span");
			name.className = "placeName";
			name.textContent = place.name;

			var type = document.createElement("span");
			type.className = "placeType";
			type.textContent = place.type;

			btn.appendChild(name);
			btn.appendChild(type);

			btn.addEventListener("click", function () { select(place); });
			btn.addEventListener("mouseenter", function () { highlight(place, true); });
			btn.addEventListener("mouseleave", function () { highlight(place, false); });
			btn.addEventListener("focus", function () { highlight(place, true); });
			btn.addEventListener("blur", function () { highlight(place, false); });

			li.appendChild(btn);
			el.list.appendChild(li);
			rowEls.set(place.name, btn);
		});

		el.count.textContent =
			visible.length + (visible.length === 1 ? " place" : " places") + " shown";
	}

	function highlight(place, on) {
		var m = markerEls.get(place.name);
		var r = rowEls.get(place.name);
		if (m) m.classList.toggle("isHot", on);
		if (r) r.classList.toggle("isHot", on);
	}

	/* ---------- Selection ---------- */

	function select(place) {
		selected = place;

		markerEls.forEach(function (node, name) {
			node.classList.toggle("isSelected", name === place.name);
		});
		rowEls.forEach(function (node, name) {
			node.classList.toggle("isSelected", name === place.name);
		});

		el.infoName.textContent = place.name;
		el.infoType.textContent = place.type;
		el.infoType.style.setProperty("--pin", TYPE_COLOR[place.type] || "#22b8d8");
		el.infoCoords.textContent = place.lat.toFixed(5) + ", " + place.lng.toFixed(5);
		el.infoDistance.textContent =
			distanceMiles(HOME, place).toFixed(1) + " mi from central Castle Rock";
		el.infoDirections.href =
			"https://www.openstreetmap.org/?mlat=" + place.lat + "&mlon=" + place.lng + "#map=17/" + place.lat + "/" + place.lng;
		el.info.hidden = false;

		// Ease the map over to the selection.
		panTo(place.lat, place.lng);

		if (window.matchMedia("(max-width: 760px)").matches) {
			closeSidebar();
		}
	}

	function closeInfo() {
		el.info.hidden = true;
		selected = null;
		markerEls.forEach(function (n) { n.classList.remove("isSelected"); });
		rowEls.forEach(function (n) { n.classList.remove("isSelected"); });
	}

	/* ---------- View movement ---------- */

	var animId = null;

	function panTo(lat, lng) {
		if (animId) cancelAnimationFrame(animId);
		var startLat = view.lat;
		var startLng = view.lng;
		var t0 = performance.now();
		var dur = 320;

		function step(now) {
			var t = Math.min(1, (now - t0) / dur);
			var e = 1 - Math.pow(1 - t, 3);
			view.lat = startLat + (lat - startLat) * e;
			view.lng = startLng + (lng - startLng) * e;
			draw();
			if (t < 1) animId = requestAnimationFrame(step);
			else animId = null;
		}
		animId = requestAnimationFrame(step);
	}

	function setZoom(z) {
		view.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
		draw();
	}

	// Frame the given places with a little breathing room on all sides.
	function fitTo(places, animate) {
		if (!places.length) return;

		var lats = places.map(function (p) { return p.lat; });
		var lngs = places.map(function (p) { return p.lng; });
		var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
		var minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);

		var size = mapSize();
		// Leave room for the sidebar-side info panel and the controls.
		var padX = 150, padY = 90;
		var usableW = Math.max(120, size.w - padX * 2);
		var usableH = Math.max(120, size.h - padY * 2);

		var best = MIN_ZOOM;
		for (var z = MAX_ZOOM; z >= MIN_ZOOM; z -= 0.25) {
			var w = lngToWorldX(maxLng, z) - lngToWorldX(minLng, z);
			var h = latToWorldY(minLat, z) - latToWorldY(maxLat, z);
			if (w <= usableW && h <= usableH) { best = z; break; }
		}

		view.zoom = best;
		var cLat = (minLat + maxLat) / 2;
		var cLng = (minLng + maxLng) / 2;

		if (animate) {
			panTo(cLat, cLng);
		} else {
			view.lat = cLat;
			view.lng = cLng;
			draw();
		}
	}

	function draw() {
		renderTiles();
		if (tilesWork === false) renderGrid();
		else el.grid.innerHTML = "";
		positionMarkers();
	}

	/* ---------- Drag to pan ---------- */

	function attachDrag() {
		var dragging = false;
		var last = null;

		function toLatLng(dx, dy) {
			var scale = TILE_SIZE * Math.pow(2, view.zoom);
			var lngPerPx = 360 / scale;
			view.lng -= dx * lngPerPx;

			var cy = latToWorldY(view.lat, view.zoom) - dy;
			var n = Math.PI - (2 * Math.PI * cy) / scale;
			view.lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
		}

		function down(e) {
			if (e.target.closest(".marker")) return;
			dragging = true;
			el.map.classList.add("isDragging");
			var pt = e.touches ? e.touches[0] : e;
			last = { x: pt.clientX, y: pt.clientY };
		}

		function move(e) {
			if (!dragging) return;
			var pt = e.touches ? e.touches[0] : e;
			toLatLng(pt.clientX - last.x, pt.clientY - last.y);
			last = { x: pt.clientX, y: pt.clientY };
			draw();
			if (e.cancelable) e.preventDefault();
		}

		function up() {
			dragging = false;
			el.map.classList.remove("isDragging");
		}

		el.map.addEventListener("mousedown", down);
		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", up);
		el.map.addEventListener("touchstart", down, { passive: true });
		el.map.addEventListener("touchmove", move, { passive: false });
		window.addEventListener("touchend", up);

		el.map.addEventListener("wheel", function (e) {
			e.preventDefault();
			setZoom(view.zoom + (e.deltaY < 0 ? 0.5 : -0.5));
		}, { passive: false });
	}

	/* ---------- Sidebar (mobile) ---------- */

	function closeSidebar() {
		el.sidebar.classList.remove("isOpen");
		el.navToggle.setAttribute("aria-expanded", "false");
	}

	/* ---------- Filter ---------- */

	function applyFilter(value) {
		visible = value === "All"
			? PLACES.slice()
			: PLACES.filter(function (p) { return p.type === value; });

		if (selected && visible.indexOf(selected) === -1) closeInfo();

		renderList();
		positionMarkers();
		fitTo(visible, true);
	}

	/* ---------- Init ---------- */

	function init() {
		TYPES.forEach(function (t) {
			var opt = document.createElement("option");
			opt.value = t;
			opt.textContent = t;
			el.filter.appendChild(opt);
		});

		el.filter.addEventListener("change", function () {
			applyFilter(el.filter.value);
		});

		el.zoomIn.addEventListener("click", function () { setZoom(view.zoom + 1); });
		el.zoomOut.addEventListener("click", function () { setZoom(view.zoom - 1); });
		el.resetView.addEventListener("click", function () {
			closeInfo();
			fitTo(visible, true);
		});

		el.infoClose.addEventListener("click", closeInfo);

		el.navToggle.addEventListener("click", function () {
			var open = el.sidebar.classList.toggle("isOpen");
			el.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
		});

		document.addEventListener("keydown", function (e) {
			if (e.key === "Escape") closeInfo();
		});

		window.addEventListener("resize", draw);

		buildMarkers();
		renderList();
		attachDrag();
		fitTo(PLACES, false);

		// If nothing has reported in, assume tiles are unavailable.
		setTimeout(function () { setTileStatus(tilesWork === true); }, 4000);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
