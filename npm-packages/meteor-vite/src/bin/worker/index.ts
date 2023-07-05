import type { InferIpcReplies } from './interface';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { StartProductionBuild } from './production-build';
import ViteServerWorker from './vite-server';

export type WorkerMethod = keyof typeof IpcMethods;
export type WorkerResponse = InferIpcReplies<typeof IpcMethods>;

const IpcMethods = {
    ...ViteServerWorker,
}

process.on('message', async (message: WorkerMethod) => {
    if (!(message in IpcMethods)) {
        console.warn('Unrecognized worker IPC message', { message });
        return;
    }
    
    
    await IpcMethods[message]((response) => {
        validateIpcChannel(process.send);
        process.send(response);
    });
})

validateIpcChannel(process.send);
function validateIpcChannel(send: NodeJS.Process['send']): asserts send is Required<Pick<NodeJS.Process, 'send'>>['send'] {
    if (typeof process.send !== 'function') {
        throw new Error('Worker was not launched with an IPC channel!');
    }
}