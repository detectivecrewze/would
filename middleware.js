import { next } from '@vercel/functions';

export const config = { matcher: '/' };

export default function middleware(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('gift');
  if (id && /^[a-z0-9][a-z0-9-]{2,63}$/.test(id) && !url.searchParams.has('fromShare')) {
    return new Response(null, {
      status: 307,
      headers: {
        location: new URL('/share/' + encodeURIComponent(id), url).toString(),
        'cache-control': 'no-store',
      },
    });
  }
  return next();
}
