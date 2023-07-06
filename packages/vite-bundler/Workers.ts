import { fork } from 'node:child_process'
import Path from 'path';
import FS from 'fs';
import type { WorkerMethod, WorkerResponse } from '../../npm-packages/meteor-vite';

// Use a worker to skip reify and Fibers
// Use a child process instead of worker to avoid WASM/archived threads error
export function createWorkerFork(hooks: WorkerHooks) {
    if (!FS.existsSync(workerPath)) {
        throw new Error(`Worker entrypoint doesn't exist! You may need to run "$ npm run build" in the '/npm-packages/meteor-vite' directory`)
    }
    
    const child = fork(workerPath, ['--enable-source-maps'], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        cwd,
        detached: false,
    });
    
    child.on('message', (message: WorkerResponse) => {
        const hook = hooks[message.kind];
        
        if (typeof hook !== 'function') {
            return console.warn('Unrecognized worker message!', { message });
        }
        
        return hooks[message.kind](message.data);
    });
    
    ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(event => {
        process.once(event, () => {
            child.kill()
        })
    });
    
    return {
        call(method: WorkerMethod) {
            child.send(method);
        },
        child,
    }
}

export const cwd = guessCwd();
export const workerPath = Path.join(cwd, 'node_modules/meteor-vite/dist/bin/worker/index.mjs');
function guessCwd () {
    let cwd = process.env.PWD ?? process.cwd()
    const index = cwd.indexOf('.meteor')
    if (index !== -1) {
        cwd = cwd.substring(0, index)
    }
    return cwd
}

type WorkerHooks = {
    [key in WorkerResponse['kind']]: (data: WorkerResponse['data']) => void;
}