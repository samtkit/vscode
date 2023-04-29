import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import getJava from "./getJava";
import * as vscode from "vscode";

let client: LanguageClient | null = null;

function getJarPath(): string {
  return (
    vscode.workspace
      .getConfiguration("samt")
      .get<string>("languageServer.path") ?? ""
  );
}

export async function startLanguageServer(): Promise<void> {
  const languageServerJar = getJarPath();
  if (languageServerJar === "") {
    return;
  }

  const java = await getJava();
  if (java == null) {
    return;
  }

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

export async function stopLanguageServer(): Promise<void> {
  if (client == null) {
    return;
  }

  if (client.isRunning()) {
    await client.stop();
  }
  await client.dispose();
  client.outputChannel.dispose();
}

export async function restartLanguageServer(): Promise<void> {
  await stopLanguageServer();
  await startLanguageServer();
}
