import { describe, expect, it } from 'vitest';

import { normalizeInput } from '../src/categoryLinks.js';
import { createCategoryCrawlContext, getRemainingCategorySlots, isAtCategoryLimit } from '../src/routes.js';

describe('main input & limit', () => {
    it('normalizeInput yêu cầu ít nhất một URL sau khi gộp', () => {
        expect(normalizeInput({ startUrl: 'https://shop.vn' }).startUrls).toHaveLength(1);
        expect(normalizeInput({}).startUrls).toHaveLength(0);
    });

    it('giới hạn maxCategoryLinks', () => {
        const seen = new Set(['https://a.com/1', 'https://a.com/2']);
        const ctx = createCategoryCrawlContext({
            seenUrls: seen,
            items: [],
            siteHostname: 'a.com',
            includeSubdomains: false,
            maxDepth: 1,
            maxCategoryLinks: 2,
        });

        expect(isAtCategoryLimit(ctx)).toBe(true);
        expect(getRemainingCategorySlots(ctx)).toBe(0);
    });
});
