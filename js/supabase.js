window.db = window.supabase.createClient(
	TCHOOBCONFIG.supabaseUrl,
	TCHOOBCONFIG.supabaseAnonKey
);
