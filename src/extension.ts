import { promises as fs } from 'fs';
import * as path from 'path';
import * as Mustache from 'mustache';
import { ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import { Configuration } from './types/configuration';
import { Generator } from './types/generator';
import { OutputFile } from './types/outputFile';
import * as mkdirp from 'mkdirp';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-code-generator.generate', generate)
    );
}

async function generate() {
    // TODO: Get configuration file from settings

    if (vscode.workspace.rootPath === undefined) {
        return;
    }

    const configurationText = await fs.readFile(
        path.join(vscode.workspace.rootPath, 'codegen.json'),
        { encoding: 'utf8' }
    );
    const configuration: Configuration = JSON.parse(configurationText);

    for (const generator of (configuration.generators || [])) {
        const source = await getSource(generator);
        const output = await getOutput(source, generator);
        const outputFiles = splitFiles(output);

        for (const outputFile of outputFiles) {
            // TODO: Get output dir from settings

            if (vscode.workspace.rootPath === undefined) {
                continue;
            }

            await mkdirp(
                path.join(vscode.workspace.rootPath, 'output')
            );
            await fs.writeFile(
                path.join(vscode.workspace.rootPath, 'output', outputFile.path),
                outputFile.content,
                { encoding: 'utf8' }
            );
        }
    }
}

async function getSource(generator: Generator) {
    if (vscode.workspace.rootPath === undefined) {
        return {};
    }

    const sourceFile = generator.source;
    const sourceFileText = await fs.readFile(
        path.join(vscode.workspace.rootPath, sourceFile),
        { encoding: 'utf8' }
    );
    const source = JSON.parse(sourceFileText);

    return source;
}

async function getOutput(source: any, generator: Generator): Promise<string> {
    if (vscode.workspace.rootPath === undefined) {
        return '';
    }

    switch (generator.template.type) {
        case 'mustache':
            const template = await fs.readFile(
                path.join(vscode.workspace.rootPath, generator.template.path),
                { encoding: 'utf8' }
            );
            const content = Mustache.render(template, source);

            return content;
        default:
            throw new Error(`Unknown template type [${generator.template.type}]`);
    }
}

function splitFiles(content: string): Array<OutputFile> {
    const outputFiles: Array<OutputFile> = [];

    let nextFileLines: string[] = [];

    const lines = content.split('\n');
    const regex = /--- (?<filename>.+) ---/;

    for (const line of lines) {
        const match = line.match(regex);

        if (match && match.groups) {
            const filename = match.groups['filename'];

            outputFiles.push({
                path: filename,
                content: nextFileLines.join('\n')
            });

            nextFileLines = [];
        }
        else {
            nextFileLines.push(line);
        }
    };

    return outputFiles;

}

export function deactivate() {

}