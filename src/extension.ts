import * as vscode from "vscode";
import getJava from "./getJava";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import getLanguageServer from "./getLanguageServer";

let client: LanguageClient | null = null;

async function startLanguageServer(): Promise<void> {
  const java = await getJava();
  if (java == null) {
    return;
  }

  const languageServerJar = getLanguageServer();
  const serverOptions: ServerOptions = {
    command: java,
    args: ["-jar", languageServerJar],
    transport: TransportKind.stdio,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "samt" }],
  };

  client = new LanguageClient(
    "samtLanguageServer",
    "SAMT Language Server",
    serverOptions,
    clientOptions
  );

  await client.start();
}

export async function activate(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: vscode.ExtensionContext
): Promise<void> {
  if (vscode.workspace.isTrusted) {
    await startLanguageServer();
  } else {
    vscode.workspace.onDidGrantWorkspaceTrust(startLanguageServer);
  }
}

export async function deactivate(): Promise<void> {
  if (client?.isRunning()) {
    await client.stop();
  }
}
