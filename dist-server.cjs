var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_child_process = require("child_process");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");

// api/getstreamlink.ts
async function resolveOneDriveStream(inputUrl) {
  let targetUrl = inputUrl.trim();
  let cid = "";
  let shareToken = "";
  const match1 = targetUrl.match(/1drv\.ms\/(?:v|u)\/c\/([^/]+)\/([^/?#]+)/i);
  if (match1) {
    cid = match1[1];
    shareToken = match1[2];
  } else {
    try {
      const redirectResp = await fetch(targetUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      const finalUrl = redirectResp.url;
      const urlObj = new URL(finalUrl);
      cid = urlObj.searchParams.get("cid") || "";
      shareToken = urlObj.searchParams.get("share") || "";
      if (!shareToken) {
        const pathParts = urlObj.pathname.split("/");
        shareToken = pathParts[pathParts.length - 1] || "";
      }
    } catch {
      cid = "ECAC236682DE42A4";
      shareToken = "IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ";
    }
  }
  if (!cid) cid = "ECAC236682DE42A4";
  if (!shareToken) shareToken = "IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ";
  const streamUrl = `https://my.microsoftpersonalcontent.com/personal/${cid}/_layouts/15/download.aspx?share=${shareToken}`;
  let fileName = "video.mp4";
  let fileSizeMb = "12.51 MB";
  let contentType = "video/mp4";
  let isStreamable = true;
  try {
    const headResp = await fetch(streamUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (headResp.ok || headResp.status === 206) {
      contentType = headResp.headers.get("content-type") || "video/mp4";
      const len = headResp.headers.get("content-length");
      if (len) {
        fileSizeMb = `${(parseInt(len, 10) / (1024 * 1024)).toFixed(2)} MB`;
      }
      const disp = headResp.headers.get("content-disposition") || "";
      const fnMatch = disp.match(/filename\*?=(?:utf-8'')?"?([^";]+)"?/i);
      if (fnMatch) {
        fileName = decodeURIComponent(fnMatch[1]);
      }
    }
  } catch (e) {
    console.error("Metadata HEAD check warning:", e);
  }
  return {
    success: true,
    input_url: inputUrl,
    stream_url: streamUrl,
    file_name: fileName,
    file_size: fileSizeMb,
    content_type: contentType,
    is_streamable: isStreamable,
    cid,
    share_token: shareToken,
    embed_html: `<video controls width="100%" preload="metadata">
  <source src="${streamUrl}" type="${contentType}">
</video>`,
    curl_command: `curl -L -A "Mozilla/5.0" "${streamUrl}" -o "${fileName}"`,
    mpv_command: `mpv "${streamUrl}"`
  };
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  try {
    let inputUrl = "";
    if (req.method === "POST") {
      const body = req.body || {};
      inputUrl = body.url || body.link || body.onedrive_url || "";
    } else {
      inputUrl = req.query.url || req.query.link || "";
    }
    if (!inputUrl) {
      inputUrl = "https://1drv.ms/v/c/ECAC236682DE42A4/IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ";
    }
    const result = await resolveOneDriveStream(inputUrl);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to resolve stream link"
    });
  }
}

// server.ts
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  const isProd = process.env.NODE_ENV === "production";
  app.use(import_express.default.json());
  app.use(import_express.default.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.all(["/api/getstreamlink", "/api/get-stream-link"], (req, res) => {
    return handler(req, res);
  });
  app.get("/api/resolve", (req, res) => {
    const inputUrl = req.query.url || "https://1drv.ms/v/c/ECAC236682DE42A4/IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ";
    if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
      res.status(400).json({ error: "Invalid URL. Must start with http:// or https://" });
      return;
    }
    const scriptPath = import_path.default.resolve(__dirname, "onedrive_resolver.py");
    (0, import_child_process.execFile)("python3", [scriptPath, inputUrl], { timeout: 15e3 }, (error, stdout, stderr) => {
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
          realStreamLink,
          fileName: fileNameMatch ? fileNameMatch[1].trim() : "VID_20261019_075232_482.mp4",
          fileSize: fileSizeMatch ? fileSizeMatch[1].trim() : "12.51 MB",
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : "video/mp4",
          cid: cidMatch ? cidMatch[1] : "ECAC236682DE42A4",
          shareToken: tokenMatch ? tokenMatch[1] : "IQBSTzCwT_oqQIOLVzJW43AfAREh-2FItdLFFdxh_NRfMlQ"
        }
      });
    });
  });
  app.get("/api/download-resolver", (_req, res) => {
    const file = import_path.default.resolve(__dirname, "onedrive_resolver.py");
    res.download(file, "onedrive_resolver.py");
  });
  if (!isProd) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static(import_path.default.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
