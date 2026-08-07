import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/supabase/database.types";

export interface AuthSnapshot {
	user: Pick<User, "id" | "email" | "created_at"> | null;
	profile: ProfileRow | null;
}

export interface AuthState extends AuthSnapshot {
	loading: boolean;
	refresh: () => Promise<void>;
	signOut: () => Promise<void>;
}
