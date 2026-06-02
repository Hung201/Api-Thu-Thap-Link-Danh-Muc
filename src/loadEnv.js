import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');

if (existsSync(envPath)) {
    config({ path: envPath });
}

/**
 * Port HTTP API: PORT (.env) → ACTOR_WEB_SERVER_PORT (Apify standby) → 4321
 */
export function getServerPort() {
    const port = Number(process.env.PORT) || Number(process.env.ACTOR_WEB_SERVER_PORT);
    return port > 0 ? port : 4321;
}
