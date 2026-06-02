import { createServer } from 'node:http';

import { log } from 'apify';

import { runCategoryCrawl } from './runCrawl.js';

const PORT = Number(process.env.ACTOR_WEB_SERVER_PORT) || 4321;

/** @type {boolean} */
let isBusy = false;

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
function sendJson(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}

const API_INFO = {
    name: 'thu-thap-link-danhmuc',
    endpoints: {
        'GET /': 'Health + readiness probe (Apify standby)',
        'GET /health': 'Health check',
        'POST /scrape': 'Thu thập link danh mục — body JSON giống input.json',
    },
    inputExample: {
        startUrl: 'https://example.com/',
        maxCategoryLinks: 50,
        maxDepth: 1,
        maxRequestsPerCrawl: 50,
        includeHomepage: true,
        includeSubdomains: false,
        proxyConfiguration: { useApifyProxy: false },
    },
};

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
async function handleRequest(req, res) {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const path = url.pathname.replace(/\/$/, '') || '/';

    if (method === 'GET' && path === '/') {
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Readiness probe OK\n');
            return;
        }
        sendJson(res, 200, { ok: true, ...API_INFO });
        return;
    }

    if (method === 'GET' && path === '/health') {
        sendJson(res, 200, { ok: true, busy: isBusy });
        return;
    }

    if (method === 'POST' && (path === '/scrape' || path === '/')) {
        if (isBusy) {
            sendJson(res, 429, { success: false, error: 'Đang xử lý request khác, thử lại sau.' });
            return;
        }

        let rawInput;
        try {
            const body = await readBody(req);
            rawInput = body.trim() ? JSON.parse(body) : {};
        } catch {
            sendJson(res, 400, { success: false, error: 'Body phải là JSON hợp lệ (giống input.json).' });
            return;
        }

        isBusy = true;
        try {
            const { items, total } = await runCategoryCrawl(rawInput);
            sendJson(res, 200, { success: true, total, items });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            log.error('API /scrape lỗi', { message });
            sendJson(res, 400, { success: false, error: message });
        } finally {
            isBusy = false;
        }
        return;
    }

    sendJson(res, 404, { success: false, error: 'Not found', ...API_INFO });
}

/**
 * Khởi động HTTP API (Apify standby / chạy local).
 * @returns {Promise<import('node:http').Server>}
 */
export function startApiServer() {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            handleRequest(req, res).catch((err) => {
                log.exception(err, 'Unhandled API error');
                sendJson(res, 500, { success: false, error: 'Internal server error' });
            });
        });

        server.listen(PORT, () => {
            log.info(`API đang lắng nghe http://0.0.0.0:${PORT}`, {
                scrape: `POST http://127.0.0.1:${PORT}/scrape`,
            });
            resolve(server);
        });
    });
}
