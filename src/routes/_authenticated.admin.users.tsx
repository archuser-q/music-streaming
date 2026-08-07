import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { AppRole, ProfileRow } from "@/lib/supabase/database.types";

export const Route = createFileRoute("/_authenticated/admin/users")({
	component: UsersAdmin,
});

function UsersAdmin() {
	const [users, setUsers] = useState<ProfileRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingId, setSavingId] = useState<string | null>(null);
	const load = useCallback(async () => {
		const { data, error } = await createClient()
			.from("profiles")
			.select("*")
			.order("created_at", { ascending: false });
		if (error) toast.error(getErrorMessage(error));
		else setUsers(data ?? []);
		setLoading(false);
	}, []);
	useEffect(() => void load(), [load]);
	const setRole = async (userId: string, role: AppRole) => {
		setSavingId(userId);
		const { error } = await createClient().rpc("admin_set_user_role", {
			p_user_id: userId,
			p_role: role,
		});
		if (error) toast.error(getErrorMessage(error));
		else {
			toast.success("Đã cập nhật quyền.");
			await load();
		}
		setSavingId(null);
	};
	const setActive = async (userId: string, active: boolean) => {
		setSavingId(userId);
		const { error } = await createClient().rpc("admin_set_user_active", {
			p_user_id: userId,
			p_is_active: active,
		});
		if (error) toast.error(getErrorMessage(error));
		else {
			toast.success("Đã cập nhật trạng thái.");
			await load();
		}
		setSavingId(null);
	};
	return (
		<div className="page-stack">
			<AdminNav />
			<div>
				<p className="eyebrow">Phân quyền</p>
				<h1>Quản lý người dùng</h1>
			</div>
			{loading ? (
				<div className="loading-state">
					<LoaderCircle className="spin" /> Đang tải...
				</div>
			) : (
				<div className="admin-table users-table">
					<div className="admin-table-head">
						<span>Người dùng</span>
						<span>Vai trò</span>
						<span>Trạng thái</span>
						<span>Thao tác</span>
					</div>
					{users.map((profile) => (
						<div className="admin-table-row" key={profile.id}>
							<div className="table-entity">
								<div className="avatar-placeholder">
									{profile.role === "admin" ? (
										<ShieldCheck size={19} />
									) : (
										<UserRound size={19} />
									)}
								</div>
								<div className="truncate">
									<strong>{profile.display_name ?? profile.username}</strong>
									<small>@{profile.username}</small>
								</div>
							</div>
							<select
								value={profile.role}
								disabled={savingId === profile.id}
								onChange={(event) =>
									void setRole(profile.id, event.target.value as AppRole)
								}
							>
								<option value="user">User</option>
								<option value="admin">Admin</option>
							</select>
							<span
								className={
									profile.is_active ? "status success" : "status danger"
								}
							>
								{profile.is_active ? "Hoạt động" : "Đã khóa"}
							</span>
							<button
								type="button"
								className={
									profile.is_active ? "button subtle danger" : "button subtle"
								}
								disabled={savingId === profile.id}
								onClick={() => void setActive(profile.id, !profile.is_active)}
							>
								{savingId === profile.id ? (
									<LoaderCircle className="spin" size={16} />
								) : null}
								{profile.is_active ? "Khóa" : "Mở khóa"}
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
