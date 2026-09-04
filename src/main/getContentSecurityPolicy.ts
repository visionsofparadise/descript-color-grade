export const getContentSecurityPolicy = (isDev: boolean): string => {
	const devSources = isDev ? "http://localhost:* ws://localhost:*" : "";

	return [
		`default-src 'self' ${devSources}`,
		`script-src 'self' ${isDev ? "'unsafe-eval' 'unsafe-inline'" : ""} ${devSources}`,
		`style-src 'self' 'unsafe-inline' ${devSources}`,
		`img-src 'self' data: blob: media: ${devSources}`,
		`media-src 'self' data: blob: media: ${devSources}`,
		`connect-src 'self' media: ${devSources}`,
		`font-src 'self' data: ${devSources}`,
	].join("; ");
};
