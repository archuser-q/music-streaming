import { getAuthSnapshot } from "./auth-server";
import type { AuthSnapshot } from "./auth-types";

let browserSnapshot: AuthSnapshot | undefined;
let browserRequest: Promise<AuthSnapshot> | undefined;

function snapshotsMatch(left: AuthSnapshot, right: AuthSnapshot) {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function updateBrowserAuthSnapshot(snapshot: AuthSnapshot) {
	if (typeof window === "undefined") return false;
	const changed =
		!browserSnapshot || !snapshotsMatch(browserSnapshot, snapshot);
	browserSnapshot = snapshot;
	browserRequest = undefined;
	return changed;
}

export async function resolveAuthSnapshot(): Promise<AuthSnapshot> {
	if (typeof window === "undefined") return getAuthSnapshot();
	if (browserSnapshot) return browserSnapshot;

	browserRequest ??= getAuthSnapshot().then(
		(snapshot) => {
			updateBrowserAuthSnapshot(snapshot);
			return snapshot;
		},
		(error: unknown) => {
			browserRequest = undefined;
			throw error;
		},
	);

	return browserRequest;
}
