import { useRouter } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthSnapshot } from "./auth-server";
import type { AuthSnapshot, AuthState } from "./auth-types";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
	children,
	initialAuth,
}: {
	children: ReactNode;
	initialAuth: AuthSnapshot;
}) {
	const router = useRouter();
	const [snapshot, setSnapshot] = useState(initialAuth);
	const [loading, setLoading] = useState(false);

	useEffect(() => setSnapshot(initialAuth), [initialAuth]);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const next = await getAuthSnapshot();
			setSnapshot(next);
			await router.invalidate();
		} finally {
			setLoading(false);
		}
	}, [router]);

	useEffect(() => {
		const supabase = createClient();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(() => {
			window.setTimeout(() => void refresh(), 0);
		});

		return () => subscription.unsubscribe();
	}, [refresh]);

	const signOut = useCallback(async () => {
		setLoading(true);
		try {
			await createClient().auth.signOut();
			setSnapshot({ user: null, profile: null });
			await router.invalidate();
		} finally {
			setLoading(false);
		}
	}, [router]);

	const value = useMemo<AuthState>(
		() => ({ ...snapshot, loading, refresh, signOut }),
		[loading, refresh, signOut, snapshot],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context)
		throw new Error("useAuth phải được dùng bên trong AuthProvider");
	return context;
}
