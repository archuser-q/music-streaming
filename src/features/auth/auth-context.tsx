import { useRouter } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthSnapshot } from "./auth-server";
import { updateBrowserAuthSnapshot } from "./auth-snapshot-cache";
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
	const refreshPromise = useRef<Promise<void> | null>(null);

	useEffect(() => {
		setSnapshot(initialAuth);
		updateBrowserAuthSnapshot(initialAuth);
	}, [initialAuth]);

	const refresh = useCallback(() => {
		if (refreshPromise.current) return refreshPromise.current;

		setLoading(true);
		const request = (async () => {
			try {
				const next = await getAuthSnapshot();
				if (!updateBrowserAuthSnapshot(next)) return;
				setSnapshot(next);
				await router.invalidate({ sync: true });
			} finally {
				setLoading(false);
			}
		})();

		refreshPromise.current = request;
		const clearRequest = () => {
			if (refreshPromise.current === request) refreshPromise.current = null;
		};
		request.then(clearRequest, clearRequest);
		return request;
	}, [router]);

	useEffect(() => {
		const supabase = createClient();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === "INITIAL_SESSION") return;
			window.setTimeout(() => void refresh(), 0);
		});

		return () => subscription.unsubscribe();
	}, [refresh]);

	const signOut = useCallback(async () => {
		setLoading(true);
		try {
			await createClient().auth.signOut();
			await refresh();
		} finally {
			setLoading(false);
		}
	}, [refresh]);

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
