import { defineConfig, Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

// プラグインを作成してファイルのコピーと更新を行う
function chromeExtensionPlugin(): Plugin {
    return {
        name: 'chrome-extension',
        closeBundle: async () => {
            const outDir = 'dist';
            
            // manifest.json のコピーと更新
            fs.copyFileSync('manifest.json', path.join(outDir, 'manifest.json'));
            const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf-8'));
            manifest.content_scripts[0].js = ['content.js'];
            manifest.action.default_popup = 'popup.html';
            manifest.background.service_worker = 'background.js';
            fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

            // popup.html のコピーと更新
            fs.copyFileSync('src/popup.html', path.join(outDir, 'popup.html'));
            let popupHtml = fs.readFileSync(path.join(outDir, 'popup.html'), 'utf-8');
            popupHtml = popupHtml.replace('popup.ts', 'popup.js');
            fs.writeFileSync(path.join(outDir, 'popup.html'), popupHtml);
        }
    };
}

export default defineConfig({
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                content: 'src/content.ts',
                popup: 'src/popup.ts',
                background: 'src/background.ts'
            },
            output: {
                entryFileNames: '[name].js',
            }
        },
    },
    plugins: [chromeExtensionPlugin()]
});