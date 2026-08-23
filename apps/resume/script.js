/* Resume — the original inline script called getElementById as a bare
   function and tested an empty jQuery selector, so it threw on every click.
   This just wires up the print button. */
(function () {
	"use strict";

	var btn = document.getElementById("printButton");
	if (btn) {
		btn.addEventListener("click", function () {
			window.print();
		});
	}
})();
