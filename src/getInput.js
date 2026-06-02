import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Actor, log } from 'apify';

const INPUT_FILE = 'input.json';

/**
 * Ưu tiên input.json ở thư mục gốc project (phát triển local),
 * nếu không có thì lấy input từ Apify Console / storage INPUT.
 */
export async function getActorInput() {
    const inputPath = path.join(process.cwd(), INPUT_FILE);

    if (existsSync(inputPath)) {
        const raw = await readFile(inputPath, 'utf8');
        const parsed = JSON.parse(raw);
        log.info(`Đã đọc cấu hình từ ${INPUT_FILE}`);
        return parsed;
    }

    const apifyInput = await Actor.getInput();
    if (apifyInput) {
        log.info('Đã đọc cấu hình từ Apify input');
        return apifyInput;
    }

    return {};
}
