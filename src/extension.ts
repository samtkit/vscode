import * as vscode from "vscode";
import {
  restartLanguageServer,
  startLanguageServer,
  stopLanguageServer,
} from "./languageServer";

async function enableTrustedFunctionality(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "samt.restartSamtServer",
      restartLanguageServer
    )
  );
  vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("samt")) {
      await restartLanguageServer();
    }
  });
  await startLanguageServer();
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

export async function deactivate(): Promise<void> {
  await stopLanguageServer();
}
