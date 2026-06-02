import { setTimeout } from 'node:timers/promises';

import { CheerioCrawler } from '@crawlee/cheerio';
import { Actor, log } from 'apify';

import { getHomepageUrl, normalizeInput } from './categoryLinks.js';
import { getActorInput } from './getInput.js';
import { initCategoryScraper, router } from './routes.js';

await Actor.init();

Actor.on('aborting', async () => {
    await setTimeout(1000);
    await Actor.exit();
});

const rawInput = await getActorInput();
const input = normalizeInput(rawInput);

if (input.startUrls.length === 0) {
    log.error('Thiếu URL khởi đầu. Thêm startUrl trong input.json hoặc Input tab Apify.');
    await Actor.fail('startUrl hoặc startUrls là bắt buộc');
}

const startHostname = new URL(input.startUrls[0].url).hostname;
const seenUrls = new Set();

initCategoryScraper({
    seenUrls,
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
    requestHandler: router,
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

log.info(`Hoàn tất. Tổng link danh mục: ${seenUrls.size}`);

await Actor.exit();
