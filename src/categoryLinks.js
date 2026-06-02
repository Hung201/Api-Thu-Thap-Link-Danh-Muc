import {
    isExpandableMenuParent,
    isInsideProductBlock,
    isUnderProductMenu,
    isValidLabel,
    isWooCommerceProductCategory,
    normalizeLink,
    passesProductCategoryFilter,
} from './categoryFilter.js';

/** Chỉ selector gắn với taxonomy / widget danh mục — không quét cả khối nav */
const TAXONOMY_CATEGORY_SELECTORS = [
    'li.menu-item-type-taxonomy.menu-item-object-product_cat > a[href]',
    'li.menu-item-object-product_cat > a[href]',
    'li.mega-menu-item-type-taxonomy.mega-menu-item-object-product_cat > a.mega-menu-link[href]',
    'li.mega-menu-item-object-product_cat > a.mega-menu-link[href]',
    '.mega-sub-menu li.mega-menu-item-object-product_cat > a.mega-menu-link[href]',
    '.product-categories > li > a[href]',
    '.widget_product_categories ul li > a[href]',
    '.woocommerce-widget-product-categories ul li > a[href]',
];

/** Menu dropdown "Sản phẩm" (Haravan, custom CMS VN) */
const PRODUCT_DROPDOWN_SELECTORS = [
    '.header-middle-navigation .dropdown-content a[href]',
    '.header-bottom-navigation .dropdown-content a[href]',
    'nav .dropdown-content a[href]',
    '.mash-submenu .dropdown-content a[href]',
    '.menubar .menu .submenu a[href]',
    '.menu_desktop .submenu a[href]',
    '#menu .submenu a[href]',
    '.menux .submenu a[href]',
    '.header-menu .menu_holder .item > a.item-cate[href]',
    '.header-menu .menu_holder .menu-hover a.title-holder[href]',
    '.header-menu .menu_holder .menu-hover .holder-last a[href]',
];

/** Trang chủ block danh mục (theme Lindos / tương tự) */
const HOMEPAGE_CATEGORY_SELECTORS = ['section.product_index h2.title a.title_link_a[href]', '.product_index h2.title a[href]'];

/**
 * @param {string} url
 * @param {string} siteHostname
 * @param {{ includeSubdomains?: boolean }} [options]
 */
export function isSameSite(url, siteHostname, options = {}) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        const base = siteHostname.replace(/^www\./, '');
        if (hostname === base) return true;
        if (options.includeSubdomains && hostname.endsWith(`.${base}`)) return true;
        return false;
    } catch {
        return false;
    }
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Element} el
 */
function getLinkLabel($, el) {
    const $el = $(el);
    const text = $el.clone().children('i, svg, img').remove().end().text();
    return (text || $el.attr('title') || $el.attr('aria-label') || '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {string} pageUrl
 * @param {string} siteHostname
 * @param {{ includeSubdomains?: boolean }} siteOptions
 * @returns {Array<{ url: string, label: string, sourceUrl: string, fromNav: boolean }>}
 */
export function extractCategoryLinks($, pageUrl, siteHostname, siteOptions = {}) {
    /** @type {Map<string, { url: string, label: string, sourceUrl: string, fromNav: boolean }>} */
    const found = new Map();

    const addLink = (href, label, ctx) => {
        const url = normalizeLink(href, pageUrl);
        if (!url) return;
        if (!isSameSite(url, siteHostname, siteOptions)) return;
        if (!passesProductCategoryFilter(url, { label, ...ctx })) return;

        const text = (label || '').replace(/\s+/g, ' ').trim();
        if (!isValidLabel(text)) return;

        if (!found.has(url)) {
            found.set(url, { url, label: text, sourceUrl: pageUrl, fromNav: Boolean(ctx.fromTaxonomy || ctx.fromProductMenu) });
        } else if (text.length > (found.get(url).label?.length || 0)) {
            found.get(url).label = text;
        }
    };

    for (const selector of TAXONOMY_CATEGORY_SELECTORS) {
        $(selector).each((_, el) => {
            if (isInsideProductBlock($, el)) return;
            if (isExpandableMenuParent($, el)) return;
            addLink($(el).attr('href'), getLinkLabel($, el), {
                fromTaxonomy: isWooCommerceProductCategory($, el),
                fromCategoryWidget: selector.includes('product-categor'),
            });
        });
    }

    for (const selector of PRODUCT_DROPDOWN_SELECTORS) {
        $(selector).each((_, el) => {
            if (isInsideProductBlock($, el)) return;
            const isKnownCatalogBlock = selector.includes('.header-menu .menu_holder');
            if (!isKnownCatalogBlock && !isUnderProductMenu($, el)) return;
            addLink($(el).attr('href'), getLinkLabel($, el), { fromProductMenu: true });
        });
    }

    for (const selector of HOMEPAGE_CATEGORY_SELECTORS) {
        $(selector).each((_, el) => {
            if (isInsideProductBlock($, el)) return;
            addLink($(el).attr('href'), getLinkLabel($, el), { fromProductMenu: true });
        });
    }

    const isWooCategoryPage =
        $('body').hasClass('tax-product_cat') ||
        $('body').hasClass('woocommerce-page') && $('.archive.taxonomy.product_cat, .breadcrumb a.taxonomy.product_cat').length > 0;

    if (isWooCategoryPage) {
        $('.product-categories a[href], .widget_product_categories a[href]').each((_, el) => {
            if (isInsideProductBlock($, el)) return;
            addLink($(el).attr('href'), getLinkLabel($, el), { fromCategoryWidget: true });
        });
    }

    return [...found.values()];
}

/**
 * @param {string} url
 */
export function getHomepageUrl(url) {
    const parsed = new URL(url);
    return `${parsed.origin}/`;
}

/**
 * @param {Record<string, unknown>} raw
 */
export function normalizeInput(raw) {
    const startUrls = [];

    if (typeof raw.startUrl === 'string' && raw.startUrl.trim()) {
        startUrls.push({ url: raw.startUrl.trim() });
    }

    if (Array.isArray(raw.startUrls)) {
        for (const item of raw.startUrls) {
            if (typeof item === 'string' && item.trim()) {
                startUrls.push({ url: item.trim() });
            } else if (item && typeof item === 'object' && typeof item.url === 'string' && item.url.trim()) {
                startUrls.push({ url: item.url.trim() });
            }
        }
    }

    const unique = [...new Map(startUrls.map((s) => [s.url, s])).values()];

    const maxCategoryLinks = Number(raw.maxCategoryLinks);
    const includeHomepage = raw.includeHomepage !== false;

    return {
        startUrls: unique,
        maxRequestsPerCrawl: Math.max(1, Number(raw.maxRequestsPerCrawl) || 100),
        maxDepth: Math.max(0, Number.isFinite(Number(raw.maxDepth)) ? Number(raw.maxDepth) : 1),
        maxCategoryLinks: Number.isFinite(maxCategoryLinks) && maxCategoryLinks > 0 ? maxCategoryLinks : 0,
        includeSubdomains: Boolean(raw.includeSubdomains),
        includeHomepage,
        proxyConfiguration: raw.proxyConfiguration,
    };
}

// Re-export cho routes/tests
export {
    canEnqueueCategoryUrl,
    isExcludedUrl,
    normalizeLink,
    passesProductCategoryFilter,
} from './categoryFilter.js';
