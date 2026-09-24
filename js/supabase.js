window.db = window.supabase.createClient(
	window.TCHOOBCONFIG.supabaseUrl,
	window.TCHOOBCONFIG.supabaseAnonKey
);
