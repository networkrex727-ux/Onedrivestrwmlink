/**
 * Direct Video Stream Proxy
 * Endpoint: /api/stream?url=...
 * Proxies video chunks with Content-Disposition: inline and CORS headers
 * so HTML5 <video> can play any Google Drive or OneDrive video without browser CORS blocks.
 */

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawUrl = req.query.url as string;
  const fileId = req.query.id as string;

  let targetUrl = rawUrl;
  if (!targetUrl && fileId) {
    targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  }

  if (!targetUrl) {
    targetUrl = 'https://drive.usercontent.google.com/download?id=16IjGZxszUY-_kUFCud3VHPwzSbY60NUk&export=download';
  }

  try {
    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    const videoResp = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: forwardHeaders
    });

    res.status(videoResp.status);
    res.setHeader('Content-Type', videoResp.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', 'inline');

    if (videoResp.headers.get('content-length')) {
      res.setHeader('Content-Length', videoResp.headers.get('content-length')!);
    }
    if (videoResp.headers.get('content-range')) {
      res.setHeader('Content-Range', videoResp.headers.get('content-range')!);
    }

    if (req.method === 'HEAD' || !videoResp.body) {
      res.end();
      return;
    }

    const reader = videoResp.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error: any) {
    console.error('Stream proxy error:', error);
    res.status(500).json({ error: 'Failed to stream video', details: error.message });
  }
}
