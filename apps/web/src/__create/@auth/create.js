import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

export const auth = async () => {
  const c = getContext();
  // Detect if connection is secure: prefer X-Forwarded-Proto (reverse proxy), then AUTH_URL
  const isSecure = (c.req.header('x-forwarded-proto')?.split(',')[0].trim() === 'https')
    || (process.env.AUTH_URL?.startsWith('https') ?? false);
  const token = await getToken({
    req: c.req.raw,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecure,
  });
  if (token) {
    return {
      user: {
        id: token.sub,
        email: token.email,
        name: token.name,
        image: token.picture,
      },
      expires: token.exp.toString(),
    };
  }
};

export default function CreateAuth() {
  return { auth };
}
