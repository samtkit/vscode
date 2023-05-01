import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import getJava from "./getJava";
import * as vscode from "vscode";
import getPort from "get-port";

let client: LanguageClient | null = null;

function getJarPath(): string {
  return (
    vscode.workspace
      .getConfiguration("samt")
      .get<string>("languageServer.path") ?? ""
  );
}

const JAVA_DEBUG_PORT = 5005;

export async function startLanguageServer(): Promise<void> {
  const languageServerJar = getJarPath();
  if (languageServerJar === "") {
    return;
  }

  const java = await getJava();
  if (java == null) {
    return;
  }

  const run = {
    command: java,
    args: ["-jar", languageServerJar],
    transport: {
      kind: TransportKind.socket,
      port: await getPort({ exclude: [JAVA_DEBUG_PORT] }),
    },
  } satisfies Executable;

  // only launch in debug if port is available
  const debug =
    (await getPort({ port: JAVA_DEBUG_PORT })) !== JAVA_DEBUG_PORT
      ? run
      : {
          ...run,
          args: [
            `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:${JAVA_DEBUG_PORT}`,
            ...run.args,
          ],
        };

  const serverOptions: ServerOptions = {
    run,
    debug,
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
