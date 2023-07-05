import Path from 'path';
import { METEOR_STUB_KEY, PACKAGE_SCOPE_KEY, TEMPLATE_GLOBAL_KEY } from './StubTemplate';
import { ModuleExport, PackageScopeExports, ParserResult } from './Parser';


export default new class Serialize {
    
    public moduleExport(module: ModuleExport, packageName: string) {
        if (module.type === 're-export') {
            let from = module.from?.startsWith('.')
                       ? `${packageName}/${module.from?.replace(/^[./]+/, '')}`
                       : module.from;
            
            if (module.name?.trim() === '*' && !module.as) {
                return `export * from '${from}';`
            }
            
            return `export { ${module.name} ${module.as && `as ${module.as} ` || ''}} from '${from}';`
        }
        
        if (module.type === 'export-default') {
            return `export default ${METEOR_STUB_KEY}.default ?? ${METEOR_STUB_KEY};`
        }
        
        if (module.type === 'export') {
            return `export const ${module.name} = ${METEOR_STUB_KEY}.${module.name};`
        }
        
        throw new Error('Tried to format an non-supported module export!');
    }
    
    public packageScopeExport(exportName: string) {
        return `export const ${exportName} = ${PACKAGE_SCOPE_KEY}.${exportName};`;
    }
    
    public packageScopeImport(packageName: string) {
        return `const ${PACKAGE_SCOPE_KEY} = ${TEMPLATE_GLOBAL_KEY}.Package['${packageName}']`;
    }
    
    public parseModules({ packageName, packageScope, modules }: {
        packageName: string;
        packageScope: PackageScopeExports,
        modules: ModuleExport[]
    }) {
        type PlacementGroup = { top: string[], bottom: string[] }
        const result: {
            module: PlacementGroup,
            package: PlacementGroup,
            exportedKeys: string[],
        } = {
            exportedKeys: [],
            module: {
                top: [],
                bottom: []
            },
            package: {
                top: [],
                bottom: [],
            }
        }
        
        const reservedKeys = new Set<string>();
        
        Object.entries(packageScope).forEach(([name, exports]) => {
            result.package.top.push(this.packageScopeImport(name));
            
            exports.forEach((key) => {
                reservedKeys.add(key);
                result.package.bottom.push(this.packageScopeExport(key))
            });
        });
        
        modules.forEach((module) => {
            if (!module.name) return;
            if (module.type === 'global-binding') return;
            if (reservedKeys.has(module.name)) {
                console.warn('Detected duplicate export keys from module!', {
                    packageName,
                    packageScope,
                    modules
                })
                return;
            }
            
            const line = this.moduleExport(module, packageName);
            
            if (module.type === 're-export') {
                result.module.top.push(line);
            }
            if (module.type === 'export') {
                result.module.bottom.push(line);
                reservedKeys.add(module.name)
            }
            
            if (module.type === 'export-default') {
                result.module.bottom.push(line);
                reservedKeys.add('default');
            }
        });
        
        result.exportedKeys.push(...reservedKeys);
        
        return result;
    }
    
}

/**
 * Check if the two provided module paths are the same.
 * Todo: this may end up causing issues if a package has say a "myModule.ts" and a "myModule.ts" file.
 */
const REGEX_LEADING_SLASH = /^\/+/
export function isSameModulePath(options: {
    filepathA: string,
    filepathB: string,
    compareExtensions: boolean;
}) {
    const fileA = Path.parse(options.filepathA.replace(REGEX_LEADING_SLASH, ''));
    const fileB = Path.parse(options.filepathB.replace(REGEX_LEADING_SLASH, ''));

    if (fileA.dir !== fileB.dir) {
        return false;
    }
    
    if (options.compareExtensions && fileA.ext !== fileB.ext) {
        return false;
    }
    
    return fileA.name === fileB.name;
}


export function getModuleExports({ parserResult, importPath }: {
    parserResult: ParserResult,
    importPath?: string
}): PackageModuleExports {
    if (!importPath) {
        return getMainModule(parserResult);
    }
    
    const entries = Object.entries(parserResult.modules);
    const file = entries.find(
        ([fileName, modules]) => isSameModulePath({
            filepathA: importPath,
            filepathB: fileName,
            compareExtensions: false,
        }),
    );
    
    if (!file) {
        throw new Error(`Could not locate module for path: ${importPath}!`);
    }
    
    const [modulePath, exports] = file;
    
    return { modulePath, exports };
}

export function getMainModule(result: ParserResult): PackageModuleExports {
    if (!result.mainModulePath) {
        return {
            modulePath: '',
            exports: [],
        }
    }
    
    const [
        node_modules,
        meteor,
        packageName,
        ...filePath
    ] = result.mainModulePath.replace(/^\/+/g, '').split('/');
    
    const modulePath = filePath.join('/');
    const exports = result.modules[modulePath];
    
    if (!exports) {
        throw new Error(`Could not locate '${result.mainModulePath}' in parsed '${result.packageName}' exports`);
    }
    
    return {
        modulePath,
        exports,
    }
}

type PackageModuleExports = Pick<PackageSubmodule, 'modulePath' | 'exports'>

export interface PackageSubmodule {
    /**
     * Full import path for the package's requested module.
     * @example
     * 'ostrio:cookies/cookie-store.js'
     */
    importPath: string;
    
    /**
     * Relative path from the package name to the module containing these exports.
     * @example
     * 'cookie-store.js'
     */
    modulePath: string;
    
    /**
     * ESM exports from the Meteor package module.
     * @example
     * export const foo = '...'
     */
    exports: ModuleExport[];
    
    /**
     * Meteor package-scope exports.
     * @link https://docs.meteor.com/api/packagejs.html#PackageAPI-export
     * @example
     * Package.export('...')
     */
    packageExports: PackageScopeExports;
}