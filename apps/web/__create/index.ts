import { AsyncLocalStorage } from 'node:async_hooks';
import nodeConsole from 'node:console';
import { skipCSRFCheck } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import Google from '@auth/core/providers/google';
import GitHub from '@auth/core/providers/github';
import Facebook from '@auth/core/providers/facebook';
import Twitter from '@auth/core/providers/twitter';
import Apple from '@auth/core/providers/apple';
import { authHandler, initAuthConfig } from '@hono/auth-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { hash, verify } from 'argon2';
import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { proxy } from 'hono/proxy';
import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import { createHonoServer } from 'react-router-hono-server/node';
import { serializeError } from 'serialize-error';
import ws from 'ws';
import NeonAdapter from './adapter';
import { getHTMLForErrorPage } from './get-html-for-error-page';
import { isAuthAction } from './is-auth-action';
import { API_BASENAME, api, routesReady } from './route-builder';
import { serverEvents } from '../src/server/pubsub';
import { initializeWebSocket } from '../src/server/websocket';

// Attach WebSocket constructor to Neon for database websockets
neonConfig.webSocketConstructor = ws;

const als = new AsyncLocalStorage<{ requestId: string }>();

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
	const original = nodeConsole[method].bind(console);
	console[method] = (...args: unknown[]) => {
		const requestId = als.getStore()?.requestId;
		if (requestId) {
			original(`[traceId:${requestId}]`, ...args);
		} else {
			original(...args);
		}
	};
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});
const adapter = NeonAdapter(pool);

const app = new Hono();

app.use('*', requestId());

app.use('*', (c, next) => {
	const requestId = c.get('requestId');
	return als.run({ requestId }, () => next());
});

app.use(contextStorage());

app.onError((err, c) => {
	if (c.req.method !== 'GET') {
		return c.json(
			{
				error: 'An error occurred in your app',
				details: serializeError(err),
			},
			500
		);
	}
	return c.html(getHTMLForErrorPage(err), 200);
});

if (process.env.CORS_ORIGINS) {
	app.use(
		'/*',
		cors({
			origin: process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
		})
	);
}

for (const method of ['post', 'put', 'patch'] as const) {
	app[method](
		'*',
		bodyLimit({
			maxSize: 4.5 * 1024 * 1024,
			onError: (c) => {
				return c.json({ error: 'Body size limit exceeded' }, 413);
			},
		})
	);
}

if (process.env.AUTH_SECRET) {
	app.use(
		'*',
		initAuthConfig((c) => ({
			secret: c.env.AUTH_SECRET,
			basePath: '/api/auth',
			pages: {
				signIn: '/account/signin',
				signOut: '/account/logout',
			},
			skipCSRFCheck,
			session: { strategy: 'jwt' },
			callbacks: {
				session({ session, token }) {
					if (token.sub) {
						session.user.id = token.sub;
					}
					return session;
				},
			},
			cookies: {
				csrfToken: { options: { secure: true, sameSite: 'none' } },
				sessionToken: { options: { secure: true, sameSite: 'none' } },
				callbackUrl: { options: { secure: true, sameSite: 'none' } },
			},
			providers: [
			...(process.env.NEXT_PUBLIC_CREATE_ENV === 'DEVELOPMENT'
				? [
						Credentials({
							id: 'dev-social',
							name: 'Development Social Sign-in',
							credentials: {
								email: { label: 'Email', type: 'email' },
								name: { label: 'Name', type: 'text' },
								provider: { label: 'Provider', type: 'text' },
							},
							authorize: async (credentials) => {
								const { email, name, provider } = credentials;
								if (!email || typeof email !== 'string') return null;

								const existing = await adapter.getUserByEmail(email);
								if (existing) return existing;

								const allowedProviders = new Set(['google', 'facebook', 'twitter', 'apple']);
								const providerName =
									typeof provider === 'string' && allowedProviders.has(provider.toLowerCase())
										? provider.toLowerCase()
										: 'google';

								const newUser = await adapter.createUser({
									emailVerified: null,
									email,
									name: typeof name === 'string' && name.length > 0 ? name : undefined,
								});

								await adapter.linkAccount({
									type: 'oauth',
									userId: newUser.id,
									provider: providerName,
									providerAccountId: `dev-${newUser.id}`,
								});

								return newUser;
							},
						}),
				  ]
				: []),
			Credentials({
				id: 'credentials-signin',
				name: 'Credentials Sign in',
				credentials: {
					email: { label: 'Email', type: 'email' },
					password: { label: 'Password', type: 'password' },
				},
				authorize: async (credentials) => {
					const { email, password } = credentials;
					if (!email || !password) return null;
					if (typeof email !== 'string' || typeof password !== 'string') return null;

					const user = await adapter.getUserByEmail(email);
					if (!user) return null;

					const matchingAccount = user.accounts.find(
						(account) => account.provider === 'credentials'
					);
					const accountPassword = matchingAccount?.password;
					if (!accountPassword) return null;

					const isValid = await verify(accountPassword, password);
					if (!isValid) return null;

					return user;
				},
			}),
			Credentials({
				id: 'credentials-signup',
				name: 'Credentials Sign up',
				credentials: {
					email: { label: 'Email', type: 'email' },
					password: { label: 'Password', type: 'password' },
					name: { label: 'Name', type: 'text' },
					image: { label: 'Image', type: 'text', required: false },
				},
				authorize: async (credentials) => {
					const { email, password, name, image } = credentials;
					if (!email || !password) return null;
					if (typeof email !== 'string' || typeof password !== 'string') return null;

					const user = await adapter.getUserByEmail(email);
					if (!user) {
						const newUser = await adapter.createUser({
							emailVerified: null,
							email,
							name: typeof name === 'string' && name.length > 0 ? name : undefined,
							image: typeof image === 'string' && image.length > 0 ? image : undefined,
						});

						await adapter.linkAccount({
							extraData: { password: await hash(password) },
							type: 'credentials',
							userId: newUser.id,
							providerAccountId: newUser.id,
							provider: 'credentials',
						});

						return newUser;
					}
					return null;
				},
			}),

			// OAuth Providers (enabled when env vars are set)
			...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
				? [
						Google({
							clientId: process.env.GOOGLE_CLIENT_ID,
							clientSecret: process.env.GOOGLE_CLIENT_SECRET,
						}),
				  ]
				: []),
			...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
				? [
						GitHub({
							clientId: process.env.GITHUB_ID,
							clientSecret: process.env.GITHUB_SECRET,
						})
				  ]
				: []),
			...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
				? [
						Facebook({
							clientId: process.env.FACEBOOK_CLIENT_ID,
							clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
						})
				  ]
				: []),
			...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
				? [
						Twitter({
							clientId: process.env.TWITTER_CLIENT_ID,
							clientSecret: process.env.TWITTER_CLIENT_SECRET,
						})
				  ]
				: []),
			...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID
				? [
						Apple({
							clientId: process.env.APPLE_CLIENT_ID,
							clientSecret: {
								teamId: process.env.APPLE_TEAM_ID,
								keyId: process.env.APPLE_KEY_ID,
								privateKey: process.env.APPLE_CLIENT_SECRET,
							},
						})
				  ]
				: []),
		],
		}))
	);
}

app.all('/integrations/:path{.+}', async (c, next) => {
	const queryParams = c.req.query();
	const url = `${process.env.NEXT_PUBLIC_CREATE_BASE_URL ?? 'https://www.create.xyz'}/integrations/${c.req.param('path')}${Object.keys(queryParams).length > 0 ? `?${new URLSearchParams(queryParams).toString()}` : ''}`;

	return proxy(url, {
		method: c.req.method,
		body: c.req.raw.body ?? null,
		duplex: 'half',
		redirect: 'manual',
		headers: {
			...c.req.header(),
			'X-Forwarded-For': process.env.NEXT_PUBLIC_CREATE_HOST,
			'x-createxyz-host': process.env.NEXT_PUBLIC_CREATE_HOST,
			Host: process.env.NEXT_PUBLIC_CREATE_HOST,
			'x-createxyz-project-group-id': process.env.NEXT_PUBLIC_PROJECT_GROUP_ID,
		},
	});
});

app.use('/api/auth/*', async (c, next) => {
	if (isAuthAction(c.req.path)) {
		return authHandler()(c, next);
	}
	return next();
});

// Async initialization to avoid top-level await in SSR build
const init = async () => {
	// Wait for API routes to be registered
	await routesReady;

	// Mount the API routes
	app.route(API_BASENAME, api);

	// Create the HTTP server
	const server = await createHonoServer({
		app,
		defaultLogger: false,
	});

	// Initialize WebSocket server on the same port
	initializeWebSocket(server as any);

	return server;
};

export default init();
