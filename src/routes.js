import { createCheerioRouter } from '@crawlee/cheerio';
import { log } from 'apify';

import { canEnqueueCategoryUrl, extractCategoryLinks, isSameSite, normalizeLink } from './categoryLinks.js';

/**
 * @typedef {Object} CategoryCrawlContext
 * @property {Set<string>} seenUrls
 * @property {object[]} items
 * @property {string} siteHostname
 * @property {boolean} includeSubdomains
 * @property {number} maxDepth
 * @property {number} maxCategoryLinks
 */

/**
 * @param {{ seenUrls: Set<string>, items?: object[], siteHostname: string, includeSubdomains: boolean, maxDepth: number, maxCategoryLinks: number }} options
 * @returns {CategoryCrawlContext}
 */
export function createCategoryCrawlContext(options) {
    return {
        seenUrls: options.seenUrls,
        items: options.items ?? [],
        siteHostname: options.siteHostname,
        includeSubdomains: options.includeSubdomains,
        maxDepth: options.maxDepth,
        maxCategoryLinks: options.maxCategoryLinks,
    };
}

/** @type {Map<string, CategoryCrawlContext>} */
const crawlContexts = new Map();

/**
 * @param {string} crawlId
 * @param {CategoryCrawlContext} ctx
 */
export function registerCrawlContext(crawlId, ctx) {
    crawlContexts.set(crawlId, ctx);
}

/**
 * @param {string} crawlId
 */
export function unregisterCrawlContext(crawlId) {
    crawlContexts.delete(crawlId);
}

/** @deprecated Dùng createCategoryCrawlContext — giữ cho test cũ */
export function initCategoryScraper(options) {
    return createCategoryCrawlContext(options);
}

/**
 * @param {CategoryCrawlContext} ctx
 */
export function isAtCategoryLimit(ctx) {
    return ctx.maxCategoryLinks > 0 && ctx.seenUrls.size >= ctx.maxCategoryLinks;
}

/**
 * @param {CategoryCrawlContext} ctx
 */
export function getRemainingCategorySlots(ctx) {
    if (ctx.maxCategoryLinks <= 0) return Infinity;
    return Math.max(0, ctx.maxCategoryLinks - ctx.seenUrls.size);
}

/**
 * @param {import('@crawlee/core').Request} request
 * @returns {CategoryCrawlContext}
 */
function getCrawlContext(request) {
    const crawlId = request.userData?.crawlId;
    if (!crawlId) {
        throw new Error('Thiếu crawlId trên request — mỗi crawl phải gắn context riêng.');
    }
    const ctx = crawlContexts.get(crawlId);
    if (!ctx) {
        throw new Error(`Không tìm thấy crawlContext cho crawlId=${crawlId}.`);
    }
    return ctx;
}

export const router = createCheerioRouter();

router.addDefaultHandler(async ({ $, request, enqueueLinks, pushData, crawler }) => {
    const ctx = getCrawlContext(request);

    if (isAtCategoryLimit(ctx)) {
        log.info(`Đã đủ ${ctx.maxCategoryLinks} link danh mục — dừng crawl.`);
        await crawler.stop();
        return;
    }

    const pageUrl = request.loadedUrl || request.url;
    const depth = request.userData?.depth ?? 0;

    const links = extractCategoryLinks($, pageUrl, ctx.siteHostname, {
        includeSubdomains: ctx.includeSubdomains,
    });

    let newCount = 0;
    let remaining = getRemainingCategorySlots(ctx);

    for (const link of links) {
        if (remaining <= 0) break;
        if (ctx.seenUrls.has(link.url)) continue;

        ctx.seenUrls.add(link.url);
        newCount += 1;
        remaining -= 1;

        const record = {
            url: link.url,
            label: link.label,
            sourceUrl: link.sourceUrl,
            fromNav: link.fromNav,
            depth,
        };
        ctx.items.push(record);
        await pushData(record);
    }

    log.info(`Trang: ${pageUrl} | depth=${depth} | mới: ${newCount} | tổng: ${ctx.seenUrls.size}`);

    if (isAtCategoryLimit(ctx)) {
        log.info(`Đạt giới hạn ${ctx.maxCategoryLinks} link danh mục.`);
        await crawler.stop();
        return;
    }

    if (depth >= ctx.maxDepth) return;

    await enqueueLinks({
        strategy: 'same-domain',
        selector:
            'li.menu-item-object-product_cat > a, li.mega-menu-item-object-product_cat > a.mega-menu-link, .product-categories > li > a, .header-middle-navigation .dropdown-content a, .menubar .menu .submenu a, .menu_desktop .submenu a, #menu .submenu a, section.product_index h2.title a, .header-menu .menu_holder .item > a.item-cate, .header-menu .menu_holder .menu-hover a.title-holder, .header-menu .menu_holder .menu-hover .holder-last a, #offcanvas a.l1:not(.dropicon), #offcanvas ul.l2 a.l2, .panel-product-category .category-item a, .aside-category .uk-accordion a',
        transformRequestFunction: (req) => {
            const nextDepth = depth + 1;
            const normalized = normalizeLink(req.url, pageUrl);
            if (!normalized) return false;
            if (!isSameSite(normalized, ctx.siteHostname, { includeSubdomains: ctx.includeSubdomains })) {
                return false;
            }
            if (!canEnqueueCategoryUrl(normalized)) return false;

            req.url = normalized;
            req.userData = { ...req.userData, depth: nextDepth, crawlId: request.userData.crawlId };
            return req;
        },
    });
});
