/**
 * Design mode — extracts Tailwind className and computed styles from DOM elements.
 */

export type GetStyleInfo = (resolved: { element: HTMLElement | null }) => {
	className: string;
	styles: Record<string, string> | null;
};

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof document !== 'undefined';
}

let isClientInitialized = false;

function initDesignModeBrowser(getStyleInfo: GetStyleInfo): () => void {
	let lastResolved: HTMLElement | null = null;

	function handleSelection() {
		const selection = window.getSelection();
		let element: HTMLElement | null = null;

		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const node = range.commonAncestorContainer;
			element = node instanceof HTMLElement ? node : node.parentElement;
		} else {
			element = document.activeElement as HTMLElement;
		}

		lastResolved = element;
		getStyleInfo({ element });
	}

	function reselect() {
		getStyleInfo({ element: lastResolved });
	}

	document.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		handleSelection();
	}, true);

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			lastResolved = null;
		}
	});

	return reselect;
}

export function initDesignMode(getStyleInfo: GetStyleInfo): () => void {
	if (!isBrowser()) {
		return () => {};
	}
	if (!isClientInitialized) {
		isClientInitialized = true;
		return initDesignModeBrowser(getStyleInfo);
	}
	return () => {};
}