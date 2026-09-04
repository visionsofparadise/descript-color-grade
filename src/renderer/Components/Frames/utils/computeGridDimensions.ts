export function computeGridDimensions(count: number, landscape: boolean): { cols: number; rows: number } {
	if (count <= 1) return { cols: 1, rows: 1 };

	let cols = Math.ceil(Math.sqrt(count));
	let rows = Math.ceil(count / cols);

	if (!landscape && cols > rows) {
		[cols, rows] = [rows, cols];
	}

	return { cols, rows };
}
