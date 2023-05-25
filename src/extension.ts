import * as vscode from "vscode";
import LanguageServerController from "./languageServerController";

async function enableTrustedFunctionality(context: vscode.ExtensionContext) {
  const languageServerController = new LanguageServerController(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("samt.restartSamtServer", () =>
      languageServerController.restart()
    ),
    languageServerController
  );
  vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("samt")) {
      await languageServerController.restart();
    }
  });
  await languageServerController.start();
}

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  if (vscode.workspace.isTrusted) {
    await enableTrustedFunctionality(context);
  } else {
    vscode.workspace.onDidGrantWorkspaceTrust(() =>
      enableTrustedFunctionality(context)
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function deactivate(): Promise<void> {}
