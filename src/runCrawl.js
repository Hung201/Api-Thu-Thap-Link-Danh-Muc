import { CheerioCrawler } from '@crawlee/cheerio';
import { Actor, log } from 'apify';

import { getHomepageUrl, normalizeInput } from './categoryLinks.js';
import { initCategoryScraper, router } from './routes.js';

const DEFAULT_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

/**
 * @param {Record<string, unknown>} rawInput — cùng cấu trúc input.json
 * @returns {Promise<{ items: object[], total: number }>}
 */
export async function runCategoryCrawl(rawInput) {
    const input = normalizeInput(rawInput);

    if (input.startUrls.length === 0) {
        throw new Error('startUrl hoặc startUrls là bắt buộc');
    }

    const startHostname = new URL(input.startUrls[0].url).hostname;
    const seenUrls = new Set();
    /** @type {object[]} */
    const items = [];

    initCategoryScraper({
        seenUrls,
        items,
        siteHostname: startHostname,
        includeSubdomains: input.includeSubdomains,
        maxDepth: input.maxDepth,
        maxCategoryLinks: input.maxCategoryLinks,
    });

    const proxyConfiguration =
        input.proxyConfiguration?.useApifyProxy === true
            ? await Actor.createProxyConfiguration(input.proxyConfiguration)
            : undefined;

    const crawler = new CheerioCrawler({
        proxyConfiguration,
        maxRequestsPerCrawl: input.maxRequestsPerCrawl,
        maxConcurrency: 10,
        maxRequestRetries: 2,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 60,
        requestHandler: router,
        preNavigationHooks: [
            async ({ request }) => {
                request.headers = { ...DEFAULT_HEADERS, ...request.headers };
            },
        ],
    });

    /** @type {Map<string, { url: string, userData: { depth: number } }>} */
    const seedMap = new Map();

    for (const { url } of input.startUrls) {
        seedMap.set(url, { url, userData: { depth: 0 } });
        if (input.includeHomepage) {
            const home = getHomepageUrl(url);
            if (!seedMap.has(home)) {
                seedMap.set(home, { url: home, userData: { depth: 0 } });
            }
        }
    }

    const seeds = [...seedMap.values()];

    log.info('Bắt đầu thu thập link danh mục', {
        startUrls: seeds.map((s) => s.url),
        maxDepth: input.maxDepth,
        maxCategoryLinks: input.maxCategoryLinks || 'không giới hạn',
        maxRequestsPerCrawl: input.maxRequestsPerCrawl,
    });

    await crawler.run(seeds);

    log.info(`Hoàn tất. Tổng link danh mục: ${items.length}`);

    return { items, total: items.length };
}
