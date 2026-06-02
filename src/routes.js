import { createCheerioRouter } from '@crawlee/cheerio';
import { log } from 'apify';

import { canEnqueueCategoryUrl, extractCategoryLinks, isSameSite, normalizeLink } from './categoryLinks.js';

/** @type {Set<string>} */
let seenUrls = new Set();

/** @type {object[]} */
let collectedItems = [];

/** @type {{ siteHostname: string, includeSubdomains: boolean, maxDepth: number, maxCategoryLinks: number }} */
let scrapeConfig = {
    siteHostname: '',
    includeSubdomains: false,
    maxDepth: 1,
    maxCategoryLinks: 0,
};

/**
 * @param {{ seenUrls: Set<string>, items?: object[], siteHostname: string, includeSubdomains: boolean, maxDepth: number, maxCategoryLinks: number }} options
 */
export function initCategoryScraper(options) {
    seenUrls = options.seenUrls;
    collectedItems = options.items ?? [];
    scrapeConfig = {
        siteHostname: options.siteHostname,
        includeSubdomains: options.includeSubdomains,
        maxDepth: options.maxDepth,
        maxCategoryLinks: options.maxCategoryLinks,
    };
}

export function isAtCategoryLimit() {
    return scrapeConfig.maxCategoryLinks > 0 && seenUrls.size >= scrapeConfig.maxCategoryLinks;
}

export function getRemainingCategorySlots() {
    if (scrapeConfig.maxCategoryLinks <= 0) return Infinity;
    return Math.max(0, scrapeConfig.maxCategoryLinks - seenUrls.size);
}

export const router = createCheerioRouter();

router.addDefaultHandler(async ({ $, request, enqueueLinks, pushData, crawler }) => {
    if (isAtCategoryLimit()) {
        log.info(`Đã đủ ${scrapeConfig.maxCategoryLinks} link danh mục — dừng crawl.`);
        await crawler.stop();
        return;
    }

    const pageUrl = request.loadedUrl || request.url;
    const depth = request.userData?.depth ?? 0;

    const links = extractCategoryLinks($, pageUrl, scrapeConfig.siteHostname, {
        includeSubdomains: scrapeConfig.includeSubdomains,
    });

    let newCount = 0;
    let remaining = getRemainingCategorySlots();

    for (const link of links) {
        if (remaining <= 0) break;
        if (seenUrls.has(link.url)) continue;

        seenUrls.add(link.url);
        newCount += 1;
        remaining -= 1;

        const record = {
            url: link.url,
            label: link.label,
            sourceUrl: link.sourceUrl,
            fromNav: link.fromNav,
            depth,
        };
        collectedItems.push(record);
        await pushData(record);
    }

    log.info(`Trang: ${pageUrl} | depth=${depth} | mới: ${newCount} | tổng: ${seenUrls.size}`);

    if (isAtCategoryLimit()) {
        log.info(`Đạt giới hạn ${scrapeConfig.maxCategoryLinks} link danh mục.`);
        await crawler.stop();
        return;
    }

    if (depth >= scrapeConfig.maxDepth) return;

    await enqueueLinks({
        strategy: 'same-domain',
        selector:
            'li.menu-item-object-product_cat > a, li.mega-menu-item-object-product_cat > a.mega-menu-link, .product-categories > li > a, .header-middle-navigation .dropdown-content a, section.product_index h2.title a',
        transformRequestFunction: (req) => {
            const nextDepth = depth + 1;
            const normalized = normalizeLink(req.url, pageUrl);
            if (!normalized) return false;
            if (!isSameSite(normalized, scrapeConfig.siteHostname, { includeSubdomains: scrapeConfig.includeSubdomains })) {
                return false;
            }
            if (!canEnqueueCategoryUrl(normalized)) return false;

            req.url = normalized;
            req.userData = { ...req.userData, depth: nextDepth };
            return req;
        },
    });
});
