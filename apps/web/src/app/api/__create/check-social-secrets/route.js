const ALLOWED_PROVIDERS = new Set(['google', 'facebook', 'twitter', 'apple']);
const PROVIDERS_WITH_SECRETS = new Set(process.env.NODE_ENV === 'development' ? ['google', 'github', 'facebook', 'twitter', 'apple'] : []);

export function GET(request) {
	if (process.env.NEXT_PUBLIC_CREATE_ENV !== 'DEVELOPMENT') {
		return Response.json({ error: 'not found' }, { status: 404 });
	}

	const url = new URL(request.url);
	const provider = url.searchParams.get('provider');

	if (!provider || !ALLOWED_PROVIDERS.has(provider.toLowerCase())) {
		return Response.json({ error: 'invalid provider' }, { status: 400 });
	}

	const missing = PROVIDERS_WITH_SECRETS.has(provider.toLowerCase())
		? (provider === 'github' ? ['GITHUB_ID', 'GITHUB_SECRET'] : [`${provider.toUpperCase()}_CLIENT_ID`, `${provider.toUpperCase()}_CLIENT_SECRET`])
		: [];

	return Response.json({ provider, configured: missing.length === 0 });
}
