import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	Disc3,
	LoaderCircle,
	LockKeyhole,
	Mail,
	UserRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/register")({
	beforeLoad: ({ context }) => {
		if (context.auth.user) {
			throw redirect({
				to: "/",
				search: { page: 1, genre: "", artist: "", album: "" },
			});
		}
	},
	component: RegisterPage,
});

function RegisterPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [loading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (username.trim().length < 3) {
			toast.error("Tên người dùng cần ít nhất 3 ký tự.");
			return;
		}
		setLoading(true);
		const { error } = await createClient().auth.signUp({
			email,
			password,
			options: {
				data: { username: username.trim(), full_name: displayName.trim() },
			},
		});
		setLoading(false);
		if (error) {
			toast.error(getErrorMessage(error));
			return;
		}
		setEmailSent(true);
	};

	if (emailSent) {
		return (
			<div className="auth-card centered">
				<div className="success-icon">
					<Mail size={28} />
				</div>
				<h1>Kiểm tra email</h1>
				<p className="muted">
					Chúng tôi đã gửi liên kết xác nhận tới <strong>{email}</strong>. Hãy
					xác nhận rồi đăng nhập.
				</p>
				<Link to="/login" className="button primary full">
					Đi tới đăng nhập
				</Link>
			</div>
		);
	}

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
				<p className="eyebrow">Tạo tài khoản</p>
				<h1>Tham gia Âm Sắc</h1>
				<p className="muted">
					Lưu nhạc yêu thích và xây playlist của riêng bạn.
				</p>
			</div>
			<form onSubmit={submit} className="stack-form">
				<div className="form-grid two">
					<label>
						<span>Tên người dùng</span>
						<div className="input-with-icon">
							<UserRound size={18} />
							<input
								required
								minLength={3}
								maxLength={40}
								value={username}
								onChange={(event) => setUsername(event.target.value)}
							/>
						</div>
					</label>
					<label>
						<span>Tên hiển thị</span>
						<input
							required
							maxLength={80}
							value={displayName}
							onChange={(event) => setDisplayName(event.target.value)}
						/>
					</label>
				</div>
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
							autoComplete="new-password"
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
					{loading ? <LoaderCircle className="spin" size={18} /> : null} Đăng ký
				</button>
			</form>
			<p className="auth-switch">
				Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
			</p>
		</div>
	);
}
