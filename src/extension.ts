import * as vscode from 'vscode';
import getJre from './getJre';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function activate(context: vscode.ExtensionContext) {
    await getJre();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() { }
