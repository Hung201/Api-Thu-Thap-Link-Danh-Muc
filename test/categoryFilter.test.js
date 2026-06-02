import { readFileSync } from 'node:fs';
import path from 'node:path';

import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';

import {
    isUnderProductMenu,
    isValidLabel,
    normalizeLink,
    passesProductCategoryFilter,
} from '../src/categoryFilter.js';
import { extractCategoryLinks } from '../src/categoryLinks.js';

describe('categoryFilter', () => {
    it('normalizeLink sửa path tương đối không có slash đầu', () => {
        expect(normalizeLink('categories/san-pham-khac', 'https://kingbond.vn/categories/dong-san-pham')).toBe(
            'https://kingbond.vn/categories/san-pham-khac',
        );
    });

    it('loại trừ tin tức / giới thiệu trên path /categories/', () => {
        expect(
            passesProductCategoryFilter('https://kingbond.vn/categories/tin-hoat-dong', { fromProductMenu: true }),
        ).toBe(false);
        expect(
            passesProductCategoryFilter('https://kingbond.vn/categories/about/ho-so-nang-luc', { fromProductMenu: true }),
        ).toBe(false);
        expect(
            passesProductCategoryFilter('https://kingbond.vn/categories/dong-san-pham-kingbond', { fromProductMenu: true }),
        ).toBe(true);
    });

    it('loại trừ nhãn tin tức', () => {
        expect(isValidLabel('Tin hoạt động')).toBe(false);
        expect(isValidLabel('Kingbond')).toBe(true);
    });

    it('kingbond — chỉ lấy menu Sản phẩm', () => {
        const htmlPath = path.join(process.cwd(), 'storage', 'tmp-kingbond.html');
        let html;
        try {
            html = readFileSync(htmlPath, 'utf8');
        } catch {
            return;
        }

        const $ = cheerio.load(html);
        const links = extractCategoryLinks($, 'https://kingbond.vn/', 'kingbond.vn');
        const urls = links.map((l) => l.url);

        expect(urls).toContain('https://kingbond.vn/categories/dong-san-pham-kingbond');
        expect(urls).toContain('https://kingbond.vn/categories/san-pham-khac');
        expect(urls).not.toContain('https://kingbond.vn/categories/tin-hoat-dong');
        expect(urls).not.toContain('https://kingbond.vn/categories/bao-chi-voi-kingbond');
        expect(urls.every((u) => !u.includes('/categories/categories/'))).toBe(true);
        expect(links.length).toBeLessThanOrEqual(5);
    });

    it('tongkhokeodan — chỉ taxonomy WooCommerce', () => {
        const htmlPath = path.join(process.cwd(), 'storage', 'tmp-home.html');
        let html;
        try {
            html = readFileSync(htmlPath, 'utf8');
        } catch {
            return;
        }

        const $ = cheerio.load(html);
        const links = extractCategoryLinks($, 'https://tongkhokeodan.com/', 'tongkhokeodan.com');

        expect(links.some((l) => l.url.includes('/keo-silicone'))).toBe(true);
        expect(links.every((l) => !l.url.includes('kore-a100'))).toBe(true);
        expect(links.length).toBeGreaterThan(10);
        expect(links.length).toBeLessThan(80);
    });

    it('haditech — Max Mega Menu + slug phẳng /san-pham-op-lat/', () => {
        const htmlPath = path.join(process.cwd(), 'storage', 'tmp-haditech.html');
        let html;
        try {
            html = readFileSync(htmlPath, 'utf8');
        } catch {
            return;
        }

        const $ = cheerio.load(html);
        const links = extractCategoryLinks($, 'https://haditech.com.vn/', 'haditech.com.vn');
        const urls = links.map((l) => l.url);

        expect(urls.some((u) => u.includes('san-pham-op-lat'))).toBe(true);
        expect(urls.some((u) => u.includes('vat-lieu-chong-tham'))).toBe(true);
        expect(urls).not.toContain('https://haditech.com.vn/category/kien-thuc');
        expect(links.length).toBeGreaterThanOrEqual(3);
        expect(links.length).toBeLessThanOrEqual(6);
    });

    it('isUnderProductMenu phân biệt Sản phẩm vs Tin tức', () => {
        const html = `
            <ul>
              <li class="nav-item"><div class="dropdown">
                <a class="nav-link" title="Sản phẩm">Sản phẩm</a>
                <ul class="dropdown-content"><li><a href="/categories/sp-a">A</a></li></ul>
              </div></li>
              <li class="nav-item"><div class="dropdown">
                <a class="nav-link" title="Tin tức">Tin tức</a>
                <ul class="dropdown-content"><li><a href="/categories/tin-a">B</a></li></ul>
              </div></li>
            </ul>`;
        const $ = cheerio.load(html);
        const productLink = $('a[href="/categories/sp-a"]')[0];
        const newsLink = $('a[href="/categories/tin-a"]')[0];
        expect(isUnderProductMenu($, productLink)).toBe(true);
        expect(isUnderProductMenu($, newsLink)).toBe(false);
    });
});
