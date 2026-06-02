import { setTimeout } from 'node:timers/promises';

import { Actor, log } from 'apify';

import { startApiServer } from './apiServer.js';
import { getActorInput } from './getInput.js';
import { runCategoryCrawl } from './runCrawl.js';

await Actor.init();

Actor.on('aborting', async () => {
    await setTimeout(1000);
    await Actor.exit();
});

const runMode = process.argv.includes('--batch') ? 'batch' : process.env.RUN_MODE || 'api';

if (runMode === 'batch') {
    const rawInput = await getActorInput();
    try {
        const { total } = await runCategoryCrawl(rawInput);
        log.info(`Batch hoàn tất: ${total} link danh mục`);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error(message);
        await Actor.fail(message);
    }
    await Actor.exit();
} else {
    await startApiServer();
    log.info('Chế độ API — gửi POST /scrape với body JSON giống input.json');
}
