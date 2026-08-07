import { createFileRoute } from "@tanstack/react-router";
import {
	BarChart3,
	Disc3,
	Headphones,
	LibraryBig,
	LoaderCircle,
	Mic2,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { formatNumber, getErrorMessage } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Summary = {
	total_songs: number;
	published_songs: number;
	total_artists: number;
	total_albums: number;
	total_users: number;
	total_plays: number;
};

type TopSong = {
	song_id: string;
	title: string;
	artist_name: string;
	total_plays: number;
};
type PlayStat = {
	period_start: string;
	play_count: number;
	unique_listeners: number;
};

export const Route = createFileRoute("/_authenticated/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const [summary, setSummary] = useState<Summary | null>(null);
	const [topSongs, setTopSongs] = useState<TopSong[]>([]);
	const [stats, setStats] = useState<PlayStat[]>([]);
	const [granularity, setGranularity] = useState<"day" | "month" | "year">(
		"day",
	);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		const to = new Date();
		const from = new Date(to);
		if (granularity === "day") from.setDate(from.getDate() - 30);
		if (granularity === "month") from.setFullYear(from.getFullYear() - 1);
		if (granularity === "year") from.setFullYear(from.getFullYear() - 5);
		try {
			const [summaryResult, topResult, statsResult] = await Promise.all([
				createClient().rpc("admin_dashboard_summary", {}),
				createClient().rpc("admin_top_songs", { p_limit: 10 }),
				createClient().rpc("admin_play_stats", {
					p_granularity: granularity,
					p_from: from.toISOString(),
					p_to: to.toISOString(),
				}),
			]);
			if (summaryResult.error) throw summaryResult.error;
			if (topResult.error) throw topResult.error;
			if (statsResult.error) throw statsResult.error;
			setSummary(summaryResult.data?.[0] ?? null);
			setTopSongs(topResult.data ?? []);
			setStats(statsResult.data ?? []);
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, [granularity]);

	useEffect(() => void load(), [load]);

	const cards = summary
		? [
				{
					label: "Bài hát",
					value: summary.total_songs,
					detail: `${summary.published_songs} đã phát hành`,
					icon: Disc3,
				},
				{
					label: "Nghệ sĩ",
					value: summary.total_artists,
					detail: "Trong thư viện",
					icon: Mic2,
				},
				{
					label: "Album",
					value: summary.total_albums,
					detail: "Trong thư viện",
					icon: LibraryBig,
				},
				{
					label: "Người dùng",
					value: summary.total_users,
					detail: "Tài khoản",
					icon: Users,
				},
				{
					label: "Lượt nghe",
					value: summary.total_plays,
					detail: "Đã xác nhận",
					icon: Headphones,
				},
			]
		: [];
	const chartStats = stats.map((item) => ({
		...item,
		label: new Intl.DateTimeFormat(
			"vi-VN",
			granularity === "day"
				? { day: "2-digit", month: "2-digit" }
				: granularity === "month"
					? { month: "short", year: "2-digit" }
					: { year: "numeric" },
		).format(new Date(item.period_start)),
	}));

	return (
		<div className="page-stack">
			<AdminNav />
			<div className="section-heading">
				<div>
					<p className="eyebrow">Quản trị hệ thống</p>
					<h1>Dashboard thống kê</h1>
				</div>
				<select
					value={granularity}
					onChange={(event) =>
						setGranularity(event.target.value as "day" | "month" | "year")
					}
				>
					<option value="day">30 ngày</option>
					<option value="month">12 tháng</option>
					<option value="year">5 năm</option>
				</select>
			</div>
			{loading ? (
				<div className="loading-state">
					<LoaderCircle className="spin" /> Đang tổng hợp dữ liệu...
				</div>
			) : (
				<>
					<div className="stats-grid">
						{cards.map(({ label, value, detail, icon: Icon }) => (
							<article className="stat-card" key={label}>
								<div>
									<span>{label}</span>
									<strong>{formatNumber(value)}</strong>
									<small>{detail}</small>
								</div>
								<Icon size={25} />
							</article>
						))}
					</div>
					<div className="dashboard-grid">
						<section className="chart-card wide">
							<div className="section-heading">
								<h2>Lượt nghe theo thời gian</h2>
								<BarChart3 size={20} />
							</div>
							<div className="chart-wrap">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={chartStats}>
										<CartesianGrid strokeDasharray="3 3" stroke="#273046" />
										<XAxis dataKey="label" stroke="#8490a8" />
										<YAxis stroke="#8490a8" allowDecimals={false} />
										<Tooltip
											contentStyle={{
												background: "#111827",
												border: "1px solid #2d3748",
												borderRadius: 12,
											}}
										/>
										<Legend />
										<Line
											type="monotone"
											dataKey="play_count"
											name="Lượt nghe"
											stroke="#8b5cf6"
											strokeWidth={3}
											dot={false}
										/>
										<Line
											type="monotone"
											dataKey="unique_listeners"
											name="Người nghe"
											stroke="#2dd4bf"
											strokeWidth={2}
											dot={false}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</section>
						<section className="chart-card">
							<div className="section-heading">
								<h2>Top bài hát</h2>
							</div>
							<div className="chart-wrap">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={topSongs}
										layout="vertical"
										margin={{ left: 12 }}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#273046" />
										<XAxis type="number" stroke="#8490a8" />
										<YAxis
											type="category"
											dataKey="title"
											width={90}
											stroke="#8490a8"
											tick={{ fontSize: 12 }}
										/>
										<Tooltip
											contentStyle={{
												background: "#111827",
												border: "1px solid #2d3748",
												borderRadius: 12,
											}}
										/>
										<Bar
											dataKey="total_plays"
											name="Lượt nghe"
											fill="#8b5cf6"
											radius={[0, 8, 8, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</section>
					</div>
				</>
			)}
		</div>
	);
}
