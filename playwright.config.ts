import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',use:{baseURL:process.env.TEST_BASE_URL??'http://127.0.0.1:8788',trace:'retain-on-failure'},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],reporter:'list'});
