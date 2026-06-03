/** Slug/path không phải danh mục sản phẩm (tin tức, giới thiệu, ...) */
export const NON_PRODUCT_PATH =
    /\/(?:about|gioi-thieu|intro|thu-ngo|ton-chi|ho-so-nang-luc|tin-tuc|tin-hoat-dong|tin-nganh|bao-chi|kien-thuc|blog|news|bai-viet|posts?|article|magazine|tuyen-dung|recruitment|recuiment|agency|dai-ly|contact|lien-he|construction|cong-trinh|huong-dan|faq|cart|checkout|account|search|tim-kiem|tag|author|pages?|wp-admin|wp-json|wishlist|compare|login|dang-nhap)(?:\/|$)/i;

/** Trang hệ thống / không phải catalog */
export const EXCLUDED_PATH =
    /\/(?:login|dang-nhap|register|signup|cart|gio-hang|checkout|thanh-toan|account|tai-khoan|search|tim-kiem|wishlist|compare|api)(?:\/|$|\?)/i;

export const EXCLUDED_EXTENSIONS = /\.(?:pdf|zip|rar|jpg|jpeg|png|gif|webp|svg|css|js|xml|mp4|mp3)(?:\?|$)/i;

/** Path chắc chắn là catalog sản phẩm (đa nền tảng VN) */
export const PRODUCT_CATEGORY_PATH =
    /\/(?:danh-?muc(?:-san-pham)?|chuyen-?muc|nhom-?hang|nganh-?hang|hang-?muc|loai-?san-?pham|product-?category|product-?cat|categories|collections?|catalog|shop\/category|cua-hang|dong-san-pham)(?:\/|$|\?)/i;

/** Tiêu đề menu cha = khu vực sản phẩm */
export const PRODUCT_MENU_TITLE =
    /(?:sản\s*phẩm|san\s*pham|danh\s*mục|danh\s*muc|hàng\s*hoá|hang\s*hoa|products?|shop|mua\s*sắm|cửa\s*hàng|cua\s*hang|thương\s*hiệu|thuong\s*hieu|nhãn\s*hiệu|nhan\s*hieu|catalog)/i;

/** Tiêu đề menu cha = không phải catalog sản phẩm */
export const NON_PRODUCT_MENU_TITLE =
    /(?:tin\s*tức|tin\s*uc|giới\s*thiệu|gioi\s*thieu|about|blog|bài\s*viết|bai\s*viet|tuyển\s*dụng|tuyen\s*dung|liên\s*hệ|lien\s*he|đại\s*lý|dai\s*ly|công\s*trình|cong\s*trinh|dịch\s*vụ|dich\s*vu|hỗ\s*trợ|ho\s*tro|chính\s*sách|chinh\s*sach|hoạt\s*động|hoat\s*dong|báo\s*chí|bao\s*chi|kiến\s*thức|kien\s*thuc)/i;

/** Nhãn link thường không phải danh mục SP */
export const NON_PRODUCT_LABEL =
    /(?:tin\s*(?:tức|hoạt\s*động|ngành)|báo\s*chí|kiến\s*thức|thư\s*ngỏ|tôn\s*chỉ|hồ\s*sơ\s*năng\s*lực|giới\s*thiệu|liên\s*hệ|đại\s*lý|tuyển\s*dụng|trang\s*chủ|xem\s*thêm|đọc\s*tiếp|chi\s*tiết)/i;

/** Slug gợi ý danh mục sản phẩm */
export const PRODUCT_SLUG_HINT =
    /(?:san-pham|sản-phẩm|product|dong-san-pham|collection|hang-hoa|danh-muc|category|keo|son|may|dien|thiet-bi|bond|skbond|vat-lieu|vật\s*liệu|op-lat|chong-tham|phu-tro|ngoi|gach|sen-voi)/i;

/** Slug 1 cấp kiểu haditech.com.vn/san-pham-op-lat/ */
export const FLAT_CATEGORY_SLUG =
    /^(?:san-pham-[a-z0-9][a-z0-9-]*|vat-lieu-[a-z0-9][a-z0-9-]*|keo-[a-z0-9][a-z0-9-]*|son-[a-z0-9][a-z0-9-]*|hang-[a-z0-9][a-z0-9-]*)$/i;

/** File .html dạng danh mục (TOTO: ban-cau.html, chau-rua-dat-tren-ban.html) */
export const HTML_CATALOG_FILE = /^[a-z][a-z0-9-]*\.html$/i;

/** Slug trang hệ thống .html — không phải danh mục SP */
export const HTML_SYSTEM_SLUG = /^(?:trang-chu|tim-kiem|index|home)$/i;

const MAX_SLUG_LENGTH = 80;
const MIN_LABEL_LENGTH = 2;

/**
 * @param {string} href
 * @param {string} baseUrl
 * @returns {string | null}
 */
export function normalizeLink(href, baseUrl) {
    if (!href || href.startsWith('#') || /^javascript:/i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return null;
    }

    let path = href.trim();
    if (!path.startsWith('/') && !/^https?:\/\//i.test(path) && !path.startsWith('?')) {
        path = `/${path}`;
    }

    try {
        const base = new URL(baseUrl);
        const url = new URL(path, /^https?:\/\//i.test(path) ? undefined : base.origin);
        if (!['http:', 'https:'].includes(url.protocol)) return null;

        url.hash = '';
        let normalized = url.href;
        if (normalized.endsWith('/') && url.pathname.length > 1) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    } catch {
        return null;
    }
}

/**
 * @param {string} url
 */
export function isExcludedUrl(url) {
    try {
        const { pathname, search } = new URL(url);
        const path = `${pathname}${search}`;

        if (EXCLUDED_EXTENSIONS.test(path)) return true;
        if (EXCLUDED_PATH.test(pathname)) return true;
        if (NON_PRODUCT_PATH.test(pathname)) return true;
        if (/\?add-to-cart=/i.test(search)) return true;
        if (/\/shop\/?\?filter_/i.test(path)) return true;
        if (/\/san-pham\/[^/]+\/?$/i.test(pathname)) return true;
        if (/\/product\/[^/]+\/?$/i.test(pathname)) return true;
        if (/\/p\/[^/]+\/?$/i.test(pathname)) return true;
        if (/\/trang-\d+\.html$/i.test(pathname)) return true;

        const htmlFile = pathname.match(/\/([^/]+)\.html$/i);
        if (htmlFile && !htmlFile[1].includes('-')) return true;

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) return true;

        const lastSlug = segments[segments.length - 1];
        if (lastSlug.length > MAX_SLUG_LENGTH) return true;
        if (/^\d+$/.test(lastSlug) && segments.length >= 2) return true;

        return false;
    } catch {
        return true;
    }
}

/**
 * @param {string} url
 */
export function hasProductCategoryPath(url) {
    try {
        const { pathname } = new URL(url);
        if (!PRODUCT_CATEGORY_PATH.test(pathname)) return false;
        if (NON_PRODUCT_PATH.test(pathname)) return false;
        return true;
    } catch {
        return false;
    }
}

/**
 * @param {string} url
 */
export function hasProductSlug(url) {
    try {
        const { pathname } = new URL(url);
        const slug = pathname.split('/').filter(Boolean).pop() || '';
        return PRODUCT_SLUG_HINT.test(slug) || PRODUCT_SLUG_HINT.test(pathname);
    } catch {
        return false;
    }
}

/**
 * @param {string} label
 */
export function isValidLabel(label) {
    const text = (label || '').replace(/\s+/g, ' ').trim();
    if (text.length < MIN_LABEL_LENGTH) return false;
    if (text === '+' || text === '>' || text === '»') return false;
    if (NON_PRODUCT_LABEL.test(text)) return false;
    return true;
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Element} el
 */
export function isWooCommerceProductCategory($, el) {
    const li = $(el).closest(
        [
            'li.menu-item-type-taxonomy.menu-item-object-product_cat',
            'li.menu-item-object-product_cat',
            'li.mega-menu-item-type-taxonomy.mega-menu-item-object-product_cat',
            'li.mega-menu-item-object-product_cat',
        ].join(', '),
    );
    if (!li.length) return false;
    if (
        $(el).closest(
            'li.menu-item-object-product, li.menu-item-type-post_type.menu-item-object-product, li.mega-menu-item-object-product',
        ).length
    ) {
        return false;
    }
    if ($(el).closest('li.mega-menu-item-object-category, li.menu-item-object-category').length) {
        return false;
    }
    return true;
}

/**
 * Link menu cha chỉ để mở submenu (bỏ qua, giữ link con trong sub-menu).
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Element} el
 */
export function isExpandableMenuParent($, el) {
    const li = $(el).closest('li.mega-menu-item-has-children, li.menu-item-has-children');
    if (!li.length) return false;
    if ($(el).closest('.mega-sub-menu, .sub-menu, .children, ul.children').length) return false;
    return true;
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Element} el
 */
export function isInsideProductBlock($, el) {
    if ($(el).closest('.mega-menu, .mega-sub-menu, #mega-menu-main-menu, nav.menu, .header-middle-navigation').length) {
        return false;
    }

    const classAndId = $(el)
        .parents()
        .toArray()
        .map((node) => `${node.attribs?.class || ''} ${node.attribs?.id || ''}`)
        .join(' ');

    return /menu-item-object-product(?:\s|$)|\btype-product\b|\bproduct-type-simple\b|\bproduct-small\b|\brelated-products\b|\bproduct_list\b|\bproduct-grid\b|\bproduct-item\b|\bproduct-container\b/i.test(
        classAndId,
    );
}

/**
 * URL danh mục dạng /ban-cau.html hoặc /ban-cau/bon-cau-neorest.html (CMS HTML, TOTO).
 * @param {string} url
 */
export function isHtmlCatalogCategoryUrl(url) {
    try {
        const { pathname } = new URL(url);
        if (NON_PRODUCT_PATH.test(pathname)) return false;

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0 || segments.length > 2) return false;

        const file = segments[segments.length - 1];
        if (!HTML_CATALOG_FILE.test(file)) return false;
        if (/^trang-\d+\.html$/i.test(file)) return false;

        const slug = file.replace(/\.html$/i, '');
        if (HTML_SYSTEM_SLUG.test(slug)) return false;
        if (!slug.includes('-')) return false;

        return true;
    } catch {
        return false;
    }
}

/**
 * @param {import('cheerio').CheerioAPI} $
 * @param {import('cheerio').Element} el
 */
export function isUnderProductMenu($, el) {
    if (isWooCommerceProductCategory($, el)) return true;

    const subMenu = $(el).closest('.dropdown-content, .sub-menu, .submenu, .children, .mega-sub-menu, ul.children, .menu-hover');
    if (subMenu.length) {
        const branch = subMenu.parent().closest('.dropdown, .nav-item, li.menu-item, li.mega-menu-item, li');
        const parentText = branch
            .find('> a.nav-link, > .dropdown > a.nav-link, > a.mega-menu-link, > a')
            .first()
            .text();
        const parentTitle =
            branch.find('> a.nav-link, > .dropdown > a.nav-link, > a.mega-menu-link, > a').first().attr('title') || '';
        const combined = `${parentText} ${parentTitle}`;

        if (NON_PRODUCT_MENU_TITLE.test(combined)) return false;
        if (PRODUCT_MENU_TITLE.test(combined)) return true;

        if (subMenu.hasClass('mega-sub-menu') && $(el).closest('li.mega-menu-item-object-product_cat').length) {
            return true;
        }

        return false;
    }

    return false;
}

/**
 * URL dạng slug phẳng: /san-pham-op-lat/ (WooCommerce rewrite VN).
 * @param {string} url
 */
export function isFlatProductCategoryUrl(url) {
    try {
        const { pathname } = new URL(url);
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length !== 1) return false;

        const slug = segments[0];
        if (NON_PRODUCT_PATH.test(`/${slug}/`)) return false;
        if (/^san-pham-\d+$/i.test(slug)) return false;

        return FLAT_CATEGORY_SLUG.test(slug) || (PRODUCT_SLUG_HINT.test(slug) && slug.includes('-'));
    } catch {
        return false;
    }
}

/**
 * Bộ lọc tổng — quyết định có phải link danh mục sản phẩm không.
 * @param {string} url
 * @param {{ label?: string, fromTaxonomy?: boolean, fromProductMenu?: boolean, fromCategoryWidget?: boolean }} ctx
 */
export function passesProductCategoryFilter(url, ctx = {}) {
    if (isExcludedUrl(url)) return false;
    if (ctx.label && !isValidLabel(ctx.label)) return false;
    if (ctx.label && NON_PRODUCT_LABEL.test(ctx.label)) return false;

    if (ctx.fromTaxonomy || ctx.fromProductMenu || ctx.fromCategoryWidget) {
        if (NON_PRODUCT_PATH.test(new URL(url).pathname)) return false;
        return true;
    }

    if (isFlatProductCategoryUrl(url)) return true;
    if (isHtmlCatalogCategoryUrl(url)) return true;
    if (hasProductCategoryPath(url) && hasProductSlug(url)) return true;
    if (hasProductCategoryPath(url)) {
        const segments = new URL(url).pathname.split('/').filter(Boolean);
        return segments.length <= 3;
    }

    return false;
}

/**
 * Kiểm tra URL có nên crawl sâu hơn.
 * @param {string} url
 */
export function canEnqueueCategoryUrl(url) {
    if (isExcludedUrl(url)) return false;
    if (passesProductCategoryFilter(url, { fromTaxonomy: true })) return true;
    if (passesProductCategoryFilter(url, { fromProductMenu: true })) return true;
    if (isFlatProductCategoryUrl(url)) return true;
    if (isHtmlCatalogCategoryUrl(url)) return true;
    if (hasProductCategoryPath(url) && hasProductSlug(url)) return true;
    return false;
}
