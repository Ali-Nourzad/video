(function () {
	"use strict";

	if (!window.supabase) {
		console.error("Supabase CDN has not loaded.");
		return;
	}

	if (!window.TCHOOBCONFIG) {
		console.error("TCHOOBCONFIG is not loaded.");
		return;
	}

	window.db = window.supabase.createClient(
		window.TCHOOBCONFIG.supabaseUrl,
		window.TCHOOBCONFIG.supabaseAnonKey
	);
})();
