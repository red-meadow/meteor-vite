import { IPCInterface } from './interface';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import ProductionBuilder from './production-build';
import ViteServerWorker from './vite-server';

export type WorkerMethod<
    key extends keyof typeof IpcMethods = keyof typeof IpcMethods,
    Method extends IPCMethods[key] = IPCMethods[key],
    Params extends Parameters<Method> = Parameters<Method>
> = {
        method: key,
        params: Params[1];
        replies: Parameters<Params[0]>[0];
};

export type WorkerResponse = WorkerMethod['replies'];

const IpcMethods = {
    ...ViteServerWorker,
    ...ProductionBuilder,
};
export type IPCMethods = typeof IpcMethods;

process.on('message', async (message: WorkerMethod) => {
    if (!message || !message.method || !(message.method in IpcMethods)) {
        console.error('Unrecognized worker IPC message', { message });
        return;
    }
    
    
    await IpcMethods[message.method]((response) => {
        validateIpcChannel(process.send);
        process.send(response);
    }, message.params);
})

validateIpcChannel(process.send);
function validateIpcChannel(send: NodeJS.Process['send']): asserts send is Required<Pick<NodeJS.Process, 'send'>>['send'] {
    if (typeof process.send !== 'function') {
        throw new Error('Worker was not launched with an IPC channel!');
    }
}