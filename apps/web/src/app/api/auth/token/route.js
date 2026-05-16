import { getToken } from '@auth/core/jwt';
export async function GET(request) {
	// Detect HTTPS: prefer X-Forwarded-Proto header (reverse proxy), then AUTH_URL, then request URL
	const isSecure = (request.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https')
		|| (process.env.AUTH_URL?.startsWith('https') ?? false)
		|| request.url?.startsWith('https');
	const [token, jwt] = await Promise.all([
		getToken({
			req: request,
			secret: process.env.AUTH_SECRET,
			secureCookie: isSecure,
			raw: true,
		}),
		getToken({
			req: request,
			secret: process.env.AUTH_SECRET,
			secureCookie: isSecure,
		}),
	]);

	if (!jwt) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	}

	return new Response(
		JSON.stringify({
			jwt: token,
			user: {
				id: jwt.sub,
				email: jwt.email,
				name: jwt.name,
			},
		}),
		{
			headers: {
				'Content-Type': 'application/json',
			},
		}
	);
}
