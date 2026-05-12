import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import type { Handler } from 'hono/types';
import updatedFetch from '../src/__create/fetch';

const API_BASENAME = '/api';
const api = new Hono();

// Get current directory (used for path resolution)
const __dirname = join(fileURLToPath(new URL('.', import.meta.url)), '../src/app/api');

// In production, pre-bundle routes using Vite's global import if available
const isProduction = !import.meta.env?.DEV && !import.meta.env?.development;

async function getRouteFiles(): Promise<string[]> {
	if (isProduction && typeof import.meta.glob === 'function') {
		// Build-time: Vite provides virtual modules for all matching files
		const routes: string[] = [];
		const routeModules = import.meta.glob('../src/app/api/**/route.js', { eager: false });
		for (const [filePath] of Object.entries(routeModules)) {
			// Convert virtual path to virtual module ID
			routes.push(filePath);
		}
		return routes.sort((a, b) => b.length - a.length);
	}

	// Development: scan filesystem
	const files = await readdir(__dirname);
	let routes: string[] = [];

	for (const file of files) {
		try {
			const filePath = join(__dirname, file);
			const statResult = await stat(filePath);

			if (statResult.isDirectory()) {
				routes = routes.concat(await findRouteFiles(filePath));
			} else if (file === 'route.js') {
				if (filePath === join(__dirname, 'route.js')) {
					routes.unshift(filePath);
				} else {
					routes.push(filePath);
				}
			}
		} catch (error) {
			console.error(`Error reading file ${file}:`, error);
		}
	}

	return routes;
}

// Recursively find all route.js files (dev-only fallback)
async function findRouteFiles(dir: string): Promise<string[]> {
	const files = await readdir(dir);
	let routes: string[] = [];

	for (const file of files) {
		try {
			const filePath = join(dir, file);
			const statResult = await stat(filePath);

			if (statResult.isDirectory()) {
				routes = routes.concat(await findRouteFiles(filePath));
			} else if (file === 'route.js') {
				if (filePath === join(__dirname, 'route.js')) {
					routes.unshift(filePath);
				} else {
					routes.push(filePath);
				}
			}
		} catch (error) {
			console.error(`Error reading file ${file}:`, error);
		}
	}

	return routes;
}

// Helper function to transform file path to Hono route path
function getHonoPath(routeFile: string): { name: string; pattern: string }[] {
	const relativePath = routeFile.replace(__dirname, '');
	const parts = relativePath.split('/').filter(Boolean);
	const routeParts = parts.slice(0, -1); // Remove 'route.js'
	if (routeParts.length === 0) {
		return [{ name: 'root', pattern: '' }];
	}
	const transformedParts = routeParts.map((segment) => {
		const match = segment.match(/^\[(\.{3})?([^\]]+)\]$/);
		if (match) {
			const [_, dots, param] = match;
			return dots === '...'
				? { name: param, pattern: `:${param}{.+}` }
				: { name: param, pattern: `:${param}` };
		}
		return { name: segment, pattern: segment };
	});
	return transformedParts;
}

// Import and register all routes
async function registerRoutes() {
	const routeFiles = await getRouteFiles();

	// Clear existing routes
	api.routes = [];

	for (const routeFile of routeFiles) {
		try {
			// In production, routeFile may be a virtual module path from import.meta.glob
			// In dev, it's a filesystem path
			const route = await import(/* @vite-ignore */ `${routeFile}?update=${Date.now()}`);

			const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
			for (const method of methods) {
				try {
					if (route[method]) {
						const parts = getHonoPath(routeFile);
						const honoPath = `/${parts.map(({ pattern }) => pattern).join('/')}`;
						const handler: Handler = async (c) => {
							const params = c.req.param();
							if (import.meta.env.DEV) {
								const updatedRoute = await import(
									/* @vite-ignore */ `${routeFile}?update=${Date.now()}`
								);
								return await updatedRoute[method](c.req.raw, { params });
							}
							return await route[method](c.req.raw, { params });
						};
						const methodLowercase = method.toLowerCase();
						switch (methodLowercase) {
							case 'get':
								api.get(honoPath, handler);
								break;
							case 'post':
								api.post(honoPath, handler);
								break;
							case 'put':
								api.put(honoPath, handler);
								break;
							case 'delete':
								api.delete(honoPath, handler);
								break;
							case 'patch':
								api.patch(honoPath, handler);
								break;
							default:
								console.warn(`Unsupported method: ${method}`);
								break;
						}
					}
				} catch (error) {
					console.error(`Error registering route ${routeFile} for method ${method}:`, error);
				}
			}
		} catch (error) {
			console.error(`Error importing route file ${routeFile}:`, error);
		}
	}
}

// Start route registration immediately and export a promise that resolves when done
const routesReady = registerRoutes().catch((err) => {
	console.error('Route registration failed:', err);
	throw err;
});

// Hot reload routes in development
if (import.meta.env.DEV) {
	import.meta.glob('../src/app/api/**/route.js', {
		eager: true,
	});
	if (import.meta.hot) {
		import.meta.hot.accept((newSelf) => {
			registerRoutes().catch((err) => {
				console.error('Error reloading routes:', err);
			});
		});
	}
}

export { API_BASENAME, api, routesReady };
