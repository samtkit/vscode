import * as vscode from 'vscode';
import getJre from './getJre';

async function startLanguageServer(): Promise<void> {
    await getJre();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function activate(context: vscode.ExtensionContext) {
    if (vscode.workspace.isTrusted) {
        await startLanguageServer();
    } else {
        vscode.workspace.onDidGrantWorkspaceTrust(startLanguageServer);
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() { }
