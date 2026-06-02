import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';

import { passesProductCategoryFilter } from '../src/categoryFilter.js';
import { extractCategoryLinks, normalizeInput } from '../src/categoryLinks.js';

describe('categoryLinks', () => {
    it('extractCategoryLinks chỉ lấy WooCommerce taxonomy', () => {
        const html = `
            <ul>
                <li class="menu-item menu-item-type-taxonomy menu-item-object-product_cat">
                    <a href="https://shop.test/keo-silicone/">Keo silicone</a>
                </li>
                <li class="menu-item menu-item-type-post_type menu-item-object-product">
                    <a href="https://shop.test/keo-silicone-acrylic-kore-a100/">Sản phẩm A</a>
                </li>
            </ul>
        `;
        const $ = cheerio.load(html);
        const links = extractCategoryLinks($, 'https://shop.test/', 'shop.test');
        const urls = links.map((l) => l.url);

        expect(urls).toContain('https://shop.test/keo-silicone');
        expect(urls).not.toContain('https://shop.test/keo-silicone-acrylic-kore-a100');
    });

    it('normalizeInput có maxCategoryLinks', () => {
        const config = normalizeInput({ startUrl: 'https://a.com', maxCategoryLinks: 50 });
        expect(config.maxCategoryLinks).toBe(50);
    });

    it('passesProductCategoryFilter với path /danh-muc/', () => {
        expect(passesProductCategoryFilter('https://shop.test/danh-muc/ao', {})).toBe(true);
        expect(passesProductCategoryFilter('https://shop.test/cart', {})).toBe(false);
    });
});
