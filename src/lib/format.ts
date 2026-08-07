export function formatDuration(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const minutes = Math.floor(seconds / 60);
	const remaining = Math.floor(seconds % 60);
	return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function formatNumber(value: number) {
	return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

export function formatFileSize(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const unitIndex = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** unitIndex;
	return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

export function formatDate(value: string | null) {
	if (!value) return "Chưa cập nhật";
	return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
		new Date(value),
	);
}

export function getErrorMessage(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "object" && error && "message" in error
				? String(error.message)
				: "";
	const normalized = message.toLowerCase();
	if (
		normalized.includes("row-level security") ||
		normalized.includes("permission")
	) {
		return "Bạn không có quyền thực hiện thao tác này.";
	}
	if (
		normalized.includes("duplicate") ||
		normalized.includes("already registered")
	) {
		return "Dữ liệu này đã tồn tại.";
	}
	if (
		normalized.includes("foreign key") ||
		normalized.includes("still referenced")
	) {
		return "Dữ liệu đang được sử dụng và chưa thể xóa.";
	}
	if (normalized.includes("last active admin")) {
		return "Không thể thay đổi quản trị viên đang hoạt động cuối cùng.";
	}
	if (normalized.includes("password")) {
		return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
	}
	if (normalized.includes("rate limit")) {
		return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
	}
	if (message) return message;
	return "Đã xảy ra lỗi. Vui lòng thử lại.";
}
