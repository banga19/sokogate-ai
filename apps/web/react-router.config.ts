import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: true,
	// prerender: ['/*?'], // Disabled to avoid build-time DB requirements
} satisfies Config;
