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
            manifest.background.type = 'module';
            manifest.options_page = 'options.html';
            fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

            // HTML ファイルのコピーと更新
            for (const file of ['popup.html', 'options.html']) {
                fs.copyFileSync(`src/${file}`, path.join(outDir, file));
                let html = fs.readFileSync(path.join(outDir, file), 'utf-8');
                html = html.replace('.ts', '.js');
                fs.writeFileSync(path.join(outDir, file), html);
            }
        }
    };
}

export default defineConfig({
    build: {
        outDir: 'dist',
        target: 'esnext',
        rollupOptions: {
            input: {
                content: 'src/content.ts',
                popup: 'src/popup.ts',
                background: 'src/background.ts',
                options: 'src/options.ts'
            },
            output: {
                format: 'es',
                entryFileNames: '[name].js',
                chunkFileNames: '[name].[hash].js',
                assetFileNames: '[name].[ext]'
            }
        },
    },
    plugins: [chromeExtensionPlugin()]
});