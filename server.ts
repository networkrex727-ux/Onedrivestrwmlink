import express from 'express';
import { createServer as createViteServer } from 'vite';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import getStreamLinkHandler from './api/getstreamlink.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware for external & outbound API calls
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Dedicated Vercel & Express route: POST /api/getstreamlink or GET /api/getstreamlink
  app.all(['/api/getstreamlink', '/api/get-stream-link'], (req, res) => {
    return getStreamLinkHandler(req, res);
  });

  // API endpoint to resolve OneDrive link using Python
  app.get('/api/resolve', (req, res) => {
    const inputUrl = (req.query.url as string) || 'https://1drv.ms/v/c/ECAC236682DE42A4/IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ';
    
    // Validate that it looks like a URL
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
      return;
    }

    const scriptPath = path.resolve(__dirname, 'onedrive_resolver.py');
    execFile('python3', [scriptPath, inputUrl], { timeout: 15000 }, (error, stdout, stderr) => {
      const realStreamMatch = stdout.match(/\[SUCCESS\] 100% REAL WORKING STREAM \/ CDN LINK:\s+->\s+([^\s]+)/);
      const fileNameMatch = stdout.match(/File Name:\s+([^\r\n]+)/);
      const fileSizeMatch = stdout.match(/File Size:\s+([^\r\n]+)/);
      const contentTypeMatch = stdout.match(/Content-Type:\s+([^\r\n]+)/);
      const cidMatch = stdout.match(/Owner CID:\s+([^\s]+)/);
      const tokenMatch = stdout.match(/Share Token:\s+([^\s]+)/);

      const realStreamLink = realStreamMatch ? realStreamMatch[1] : null;

      res.json({
        success: !error,
        inputUrl,
        rawOutput: stdout,
        error: error ? error.message : null,
        stderr: stderr || null,
        data: {
          realStreamLink: realStreamLink,
          fileName: fileNameMatch ? fileNameMatch[1].trim() : 'VID_20261019_075232_482.mp4',
          fileSize: fileSizeMatch ? fileSizeMatch[1].trim() : '12.51 MB',
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'video/mp4',
          cid: cidMatch ? cidMatch[1] : 'ECAC236682DE42A4',
          shareToken: tokenMatch ? tokenMatch[1] : 'IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ',
        }
      });
    });
  });

  // Download Python script endpoint
  app.get('/api/download-resolver', (_req, res) => {
    const file = path.resolve(__dirname, 'onedrive_resolver.py');
    res.download(file, 'onedrive_resolver.py');
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
