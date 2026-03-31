import { createRouter } from './router.js';
import type { User } from './types.js';

const router = createRouter();
console.log('App started with routes:', Object.keys(router));

export type { User };
export { createRouter };
