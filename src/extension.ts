import * as vscode from "vscode";
import LanguageServerController from "./languageServerController";
import SamtTaskProvider from "./samtTaskProvider";

let languageServerController: LanguageServerController | null = null;

async function enableTrustedFunctionality(context: vscode.ExtensionContext) {
  languageServerController = new LanguageServerController(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("samt.restartSamtServer", () =>
      languageServerController?.restart()
    ),
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("samt")) {
        await languageServerController?.restart();
      }
    }),
    vscode.tasks.registerTaskProvider("samt", new SamtTaskProvider())
  );
  await languageServerController.start();
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  if (vscode.workspace.isTrusted) {
    await enableTrustedFunctionality(context);
  } else {
    context.subscriptions.push(
      vscode.workspace.onDidGrantWorkspaceTrust(() =>
        enableTrustedFunctionality(context)
      )
    );
  }
}

export async function deactivate(): Promise<void> {
  await languageServerController?.stop();
}
