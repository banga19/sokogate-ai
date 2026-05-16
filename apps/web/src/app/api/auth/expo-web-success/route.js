import { getToken } from '@auth/core/jwt';

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET(request) {
  // Detect HTTPS: prefer X-Forwarded-Proto from reverse proxy, then AUTH_URL
  const isSecure = (request.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https')
    || (process.env.AUTH_URL?.startsWith('https') ?? false)
    || request.url?.startsWith('https');

  // Expected redirect target — only allow postMessage to this origin
  const allowedOrigin = process.env.AUTH_URL || (isSecure ? `https://${new URL(request.url).host}` : `http://${new URL(request.url).host}`);

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
    return new Response(
      `
      <html>
        <body>
          <script>
            window.parent.postMessage({ type: 'AUTH_ERROR', error: 'Unauthorized' }, "${allowedOrigin}");
          </script>
        </body>
      </html>
      `,
      {
        status: 401,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }

  const message = {
    type: 'AUTH_SUCCESS',
    jwt: token,
    user: {
      id: jwt.sub,
      email: jwt.email,
      name: jwt.name,
    },
  };

  return new Response(
    `
    <html>
      <body>
        <script>
          window.parent.postMessage(${JSON.stringify(message)}, "${allowedOrigin}");
        </script>
      </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
