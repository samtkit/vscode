import * as vscode from 'vscode';
import getJre from './getJre';

export async function activate(context: vscode.ExtensionContext) {
    const jre = await getJre();
}

export function deactivate() { }
