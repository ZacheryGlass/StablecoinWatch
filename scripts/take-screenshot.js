#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    PORT: process.env.SCREENSHOT_PORT || 3010,
    BASE_URL: `http://localhost`,
    TIMEOUT: 30000,
    SCREENSHOT_DIR: 'screenshots',
    DEVICE_PRESETS: {
        desktop: { width: 1200, height: 800, name: 'desktop' },
        tablet: { width: 768, height: 1024, name: 'tablet' },
        mobile: { width: 375, height: 667, name: 'mobile' },
        'mobile-large': { width: 414, height: 896, name: 'mobile-large' },
        'mobile-small': { width: 320, height: 568, name: 'mobile-small' }
    },
    DEFAULT_DEVICE: 'desktop',
    PAGES: [
        // Updated selectors to match v2 templates
        { name: 'home', path: '/', waitFor: '#coinsTable' },
        { name: 'platforms', path: '/platforms', waitFor: '.summary-card' },
        { name: 'status', path: '/status', waitFor: '.summary-card' }
    ]
};

class ScreenshotTaker {
    constructor(device = CONFIG.DEFAULT_DEVICE, customViewport = null) {
        this.browser = null;
        this.serverProcess = null;
        this.serverReady = false;
        this.device = device;
        this.viewport = this.getViewport(device, customViewport);
    }

    getViewport(device, customViewport) {
        if (customViewport && customViewport.width && customViewport.height) {
            return { ...customViewport, name: 'custom' };
        }
        
        const preset = CONFIG.DEVICE_PRESETS[device];
        if (!preset) {
            console.warn(`⚠️ Device '${device}' not found, using default '${CONFIG.DEFAULT_DEVICE}'`);
            return CONFIG.DEVICE_PRESETS[CONFIG.DEFAULT_DEVICE];
        }
        
        return preset;
    }

    async init() {
        console.log('🚀 Starting screenshot process...');
        
        this.ensureScreenshotDir();
        await this.startServer();
        await this.launchBrowser();
    }

    ensureScreenshotDir() {
        if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
            fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
            console.log(`📁 Created ${CONFIG.SCREENSHOT_DIR} directory`);
        }
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log(`🌐 Starting server on port ${CONFIG.PORT}...`);
            
            // Force mock mode so screenshots render deterministically and fast
            const env = { 
                ...process.env, 
                PORT: CONFIG.PORT,
                DEBUG_MODE: process.env.DEBUG_MODE || 'true',
                MOCK_APIS: process.env.MOCK_APIS || 'true',
                HEALTH_MONITORING: process.env.HEALTH_MONITORING || 'false'
            };
            this.serverProcess = spawn('node', ['app/app.js'], { 
                env, 
                stdio: 'pipe',
                cwd: process.cwd()
            });

            let serverOutput = '';
            
            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                serverOutput += output;
                
                if (output.includes(`Listening on port ${CONFIG.PORT}`)) {
                    this.serverReady = true;
                    console.log(`✅ Server ready on port ${CONFIG.PORT}`);
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });

            this.serverProcess.on('error', (error) => {
                reject(new Error(`Failed to start server: ${error.message}`));
            });

            setTimeout(() => {
                if (!this.serverReady) {
                    reject(new Error('Server startup timeout'));
                }
            }, CONFIG.TIMEOUT);
        });
    }

    async launchBrowser() {
        console.log('🌐 Launching browser...');
        this.browser = await puppeteer.launch({
            headless: 'new',
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async takeScreenshot(pageName, pagePath, waitSelector) {
        const page = await this.browser.newPage();
        const url = `${CONFIG.BASE_URL}:${CONFIG.PORT}${pagePath}`;
        
        try {
            console.log(`📸 Taking screenshot of ${pageName} (${url}) at ${this.viewport.width}×${this.viewport.height}...`);
            
            await page.setViewport({
                width: this.viewport.width,
                height: this.viewport.height
            });
            
            await page.goto(url, { waitUntil: 'networkidle0', timeout: CONFIG.TIMEOUT });
            
            if (waitSelector) {
                try {
                    await page.waitForSelector(waitSelector, { timeout: 5000 });
                } catch (e) {
                    console.warn(`⚠️  Selector ${waitSelector} not found for ${pageName}, continuing anyway`);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const deviceSuffix = this.viewport.name === 'desktop' ? '' : `-${this.viewport.name}`;
            const filename = `${timestamp}-${pageName}${deviceSuffix}.png`;
            const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);
            
            await page.screenshot({
                path: filepath,
                fullPage: false,
                type: 'png'
            });
            
            console.log(`✅ Screenshot saved: ${filepath}`);
            return filepath;
            
        } catch (error) {
            console.error(`❌ Error taking screenshot of ${pageName}: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    async takeAllScreenshots() {
        console.log(`📸 Taking screenshots of ${CONFIG.PAGES.length} pages...`);
        
        const results = [];
        
        for (const pageConfig of CONFIG.PAGES) {
            const result = await this.takeScreenshot(
                pageConfig.name, 
                pageConfig.path, 
                pageConfig.waitFor
            );
            results.push(result);
        }
        
        return results.filter(Boolean);
    }

    async takeSingleScreenshot(pageName = 'home') {
        const pageConfig = CONFIG.PAGES.find(p => p.name === pageName);
        if (!pageConfig) {
            throw new Error(`Page '${pageName}' not found. Available: ${CONFIG.PAGES.map(p => p.name).join(', ')}`);
        }
        
        console.log(`📸 Taking single screenshot of ${pageName}...`);
        return await this.takeScreenshot(pageConfig.name, pageConfig.path, pageConfig.waitFor);
    }

    async cleanup() {
        console.log('🧹 Cleaning up...');
        
        if (this.browser) {
            await this.browser.close();
        }
        
        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    this.serverProcess.kill('SIGKILL');
                }
            }, 5000);
        }
    }
}

async function findAvailablePort(startPort) {
    const net = require('net');
    
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

async function main() {
    const args = process.argv.slice(2);
    const singlePage = args.find(arg => arg.startsWith('--page='))?.split('=')[1];
    const single = args.includes('--single') || singlePage;
    const deviceArg = args.find(arg => arg.startsWith('--device='))?.split('=')[1];
    const widthArg = args.find(arg => arg.startsWith('--width='))?.split('=')[1];
    const heightArg = args.find(arg => arg.startsWith('--height='))?.split('=')[1];
    
    let customViewport = null;
    if (widthArg && heightArg) {
        customViewport = {
            width: parseInt(widthArg),
            height: parseInt(heightArg)
        };
    }
    
    const device = deviceArg || CONFIG.DEFAULT_DEVICE;
    
    CONFIG.PORT = await findAvailablePort(CONFIG.PORT);
    
    const screenshotTaker = new ScreenshotTaker(device, customViewport);
    
    console.log(`📱 Using device: ${screenshotTaker.viewport.name} (${screenshotTaker.viewport.width}×${screenshotTaker.viewport.height})`);
    
    process.on('SIGINT', async () => {
        console.log('\n🛑 Interrupted, cleaning up...');
        await screenshotTaker.cleanup();
        process.exit(0);
    });
    
    try {
        await screenshotTaker.init();
        
        let results;
        if (single) {
            const pageName = singlePage || 'home';
            results = [await screenshotTaker.takeSingleScreenshot(pageName)];
        } else {
            results = await screenshotTaker.takeAllScreenshots();
        }
        
        console.log(`\n🎉 Screenshot process complete!`);
        console.log(`📁 Screenshots saved in: ${CONFIG.SCREENSHOT_DIR}/`);
        
        if (results.length > 0) {
            console.log('📋 Files created:');
            results.forEach(file => console.log(`   - ${file}`));
        }
        
    } catch (error) {
        console.error(`❌ Screenshot process failed: ${error.message}`);
        process.exit(1);
    } finally {
        await screenshotTaker.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ScreenshotTaker, CONFIG };
