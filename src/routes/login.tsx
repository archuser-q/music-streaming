import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { Disc3, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/features/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

const searchSchema = z.object({
	redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
	validateSearch: searchSchema,
	beforeLoad: ({ context }) => {
		if (context.auth.user) {
			throw redirect({
				to: "/",
				search: { page: 1, genre: "", artist: "", album: "" },
			});
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const { redirect: redirectTo } = Route.useSearch();
	const router = useRouter();
	const auth = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setLoading(true);
		const { error } = await createClient().auth.signInWithPassword({
			email,
			password,
		});
		setLoading(false);
		if (error) {
			toast.error("Email hoặc mật khẩu không chính xác.");
			return;
		}
		await auth.refresh();
		toast.success("Đăng nhập thành công.");
		const safeRedirect =
			redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
				? redirectTo
				: "/";
		router.history.push(safeRedirect);
	};

	return (
		<div className="auth-card">
			<Link
				to="/"
				search={{ page: 1, genre: "", artist: "", album: "" }}
				className="auth-brand"
			>
				<Disc3 /> Âm Sắc
			</Link>
			<div>
				<p className="eyebrow">Chào mừng trở lại</p>
				<h1>Đăng nhập</h1>
				<p className="muted">Tiếp tục hành trình âm nhạc của bạn.</p>
			</div>
			<form onSubmit={submit} className="stack-form">
				<label>
					<span>Email</span>
					<div className="input-with-icon">
						<Mail size={18} />
						<input
							type="email"
							required
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="ban@example.com"
						/>
					</div>
				</label>
				<label>
					<span>Mật khẩu</span>
					<div className="input-with-icon">
						<LockKeyhole size={18} />
						<input
							type="password"
							required
							minLength={8}
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</div>
				</label>
				<button
					type="submit"
					className="button primary full"
					disabled={loading}
				>
					{loading ? <LoaderCircle className="spin" size={18} /> : null} Đăng
					nhập
				</button>
			</form>
			<p className="auth-switch">
				Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
			</p>
		</div>
	);
}
