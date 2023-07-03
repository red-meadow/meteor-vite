import FS from 'fs/promises';
import Path from 'path';
import { ModuleList, PackageScopeExports } from '../../src/Parser';

export const TsModules = prepareMock({
    packageName: 'test:ts-modules',
    fileName: 'test_ts-modules.js',
    modules: {
        'explicit-relative-path.ts': [
            { type: 'export', name: 'ExplicitRelativePath' },
        ],
        'index.ts': [
            { type: 'export', name: 'first' },
            { type: 'export', name: 'FIRST' },
            { type: 'export', name: 'b' },
            { type: 'export', name: 'c' },
            { type: 'export', name: 'namedFunction' },
            { type: 're-export', name: 'Meteor', as: 'MyMeteor', from: 'meteor/meteor', id: 0 },
            { type: 're-export', name: '*', from: 'meteor/tracker', id: 1 },
            { type: 're-export', name: 'Meteor', as: 'ReExportedMeteor', from: 'meteor/meteor', id: 2 },
            { type: 'global-binding', name: 'Meteor', from: 'meteor/meteor', id: 3 },
            { type: 're-export', name: 'NamedRelativeInteger', from: './relative-module', id: 4 },
            { type: 're-export', name: '*', from: './export-star-from', id: 5 },
            { type: 'export-default', name: 'namedFunction' },
        ],
        'export-star-from.ts': [
            { type: 'export', name: 'ExportXInteger' },
            { type: 'export', name: 'ExportXString' },
            { type: 'export', name: 'ExportXObject' },
        ],
        're-exports-index.ts': [
            { type: 're-export', name: 'DefaultReExport', as: 'default', from: './re-exports-source', id: 0 },
            { type: 're-export', name: 'NamedReExport', from: './re-exports-source', id: 0 },
        ],
        're-exports-source.ts': [
            { type: 'export', name: 'DefaultReExport' },
            { type: 'export', name: 'NamedReExport' },
        ],
        'relative-module.ts': [
            { type: 'export', name: 'NamedRelativeInteger' },
        ],
    } satisfies ModuleList,
    packageScopeExports: {},
    mainModulePath: '/node_modules/meteor/test:ts-modules/index.ts'
});

export const Check = prepareMock({
    packageName: 'check',
    fileName: 'check.js',
    modules: {
        'match.js': [
            { name: 'check', type: 'export' },
            { name: 'Match', type: 'export' },
            { name: 'isPlainObject', type: 'global-binding', id: 0, from: './isPlainObject' }
        ],
        'isPlainObject.js': [
            { name: 'isPlainObject', type: 'export' }
        ]
    },
    packageScopeExports: {
        'check': ['check', 'Match']
    },
    mainModulePath: '/node_modules/meteor/check/match.js'
});

export const MeteorJs = prepareMock({
    fileName: 'meteor.js',
    modules: {},
    packageName: 'meteor',
    packageScopeExports: {
        'meteor': ['Meteor', 'global', 'meteorEnv']
    },
    mainModulePath: '',
})

function prepareMock<Modules extends ModuleList>({ fileName, ...details }: {
    fileName: string;
    packageName: string;
    modules: Modules;
    packageScopeExports: PackageScopeExports,
    mainModulePath: string;
}) {
    return {
        fileContent: FS.readFile(Path.join(__dirname, `meteor-bundle/${fileName}`), 'utf-8'),
        ...details,
    }
}