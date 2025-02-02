import { Meteor } from 'meteor/meteor'
import { WebAppInternals } from 'meteor/webapp'
import type HTTP from 'http'
import { getConfig, MeteorViteConfig, setConfig, ViteConnection } from './loading/vite-connection-handler';
import { createWorkerFork } from './workers';

if (Meteor.isDevelopment) {
    console.log('⚡ Starting Vite server...')
    setConfig({
        ready: false,
        host: 'localhost',
        port: 0,
        entryFile: '',
    });
    
    WebAppInternals.registerBoilerplateDataCallback('meteor-vite', (request: HTTP.IncomingMessage, data: BoilerplateData) => {
        const { host, port, entryFile, ready } = getConfig();
        if (ready) {
            data.dynamicBody = `${data.dynamicBody || ""}\n<script type="module" src="http://${host}:${port}/${entryFile}"></script>\n`
        } else {
            // Vite not ready yet
            // Refresh page after some time
            data.dynamicBody = `${data.dynamicBody || ""}\n${Assets.getText('loading/dev-server-splash.html')}`
        }
    });
    
    const viteServer = createWorkerFork({
        viteConfig(config) {
            const ready = !!(config.entryFile && config.port);
            setConfig({ ...config, ready });
            if (ready) {
                console.log(`⚡  Meteor-Vite ready for connections!`)
            }
        },
    });
    
    
    viteServer.call({
        method: 'vite.startDevServer',
        params: []
    });
    
    Meteor.publish(ViteConnection.publication, () => {
        return MeteorViteConfig.find(ViteConnection.configSelector);
    });
    
    
    /**
     * Builds the 'meteor-vite' npm package where the worker and Vite server is kept.
     * Primarily to ease the testing process for the Vite plugin.
     */
    if (process.env.BUILD_METEOR_VITE_DEPENDENCY === 'true') {
        const packageBuilder = createWorkerFork({});
        packageBuilder.call({
            method: 'tsup.watchMeteorVite',
            params: [],
        });
    }
}

interface BoilerplateData {
    dynamicBody?: string;
    additionalStaticJs: [contents: string, pathname: string][];
    inline?: string;
}
