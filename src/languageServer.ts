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
import delay from "./delay";
import { getApi } from "@microsoft/vscode-file-downloader-api";
import { getLatestReleaseAsset } from "./github";

let client: LanguageClient | null = null;

function getJarPath(): string {
  return (
    vscode.workspace
      .getConfiguration("samt")
      .get<string>("languageServer.path")
      ?.trim() ?? ""
  );
}

const javaDebugPort = 5005;
const jarName = "samt-ls.jar";
const releaseIdKey = "languageServerReleaseId";

async function downloadLanguageServer(
  context: vscode.ExtensionContext
): Promise<string> {
  const fileDownloader = await getApi();
  const currentFile = await fileDownloader.tryGetItem(jarName, context);
  const currentReleaseId = context.globalState.get<number>(releaseIdKey);
  const releaseAsset = await getLatestReleaseAsset(jarName);

  if (currentFile != null && currentReleaseId === releaseAsset.releaseId) {
    return currentFile.fsPath;
  }

  if (releaseAsset.downloadUrl === "") {
    return "";
  }
  return vscode.window.withProgress(
    {
      title: "Downloading SAMT Language Server",
      location: vscode.ProgressLocation.Window,
    },
    async () => {
      const file = await fileDownloader.downloadFile(
        vscode.Uri.parse(releaseAsset.downloadUrl),
        jarName,
        context
      );
      await context.globalState.update(releaseIdKey, releaseAsset.releaseId);
      return file.fsPath;
    }
  );
}

export async function startLanguageServer(
  context: vscode.ExtensionContext
): Promise<void> {
  let languageServerJar = getJarPath();
  if (languageServerJar === "") {
    languageServerJar = await downloadLanguageServer(context);
    if (languageServerJar === "") {
      return;
    }
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
      port: await getPort({ exclude: [javaDebugPort] }),
    },
  } satisfies Executable;

  // only launch in debug if port is available
  const debug = {
    ...run,
    args: [
      `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:${javaDebugPort}`,
      ...run.args,
    ],
  } satisfies Executable;

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

export async function restartLanguageServer(
  context: vscode.ExtensionContext
): Promise<void> {
  const isDebugging = client?.isInDebugMode ?? false;
  await stopLanguageServer();
  if (isDebugging) {
    // hopefully the java debug port is available by now
    await delay(500);
  }
  await startLanguageServer(context);
}
