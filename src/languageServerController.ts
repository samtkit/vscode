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

const githubRepository = "samtkit/core";
const javaDebugPort = 5005;
const jarName = "samt-ls.jar";
const releaseIdKey = "languageServerReleaseId";

export default class LanguageServerController extends vscode.Disposable {
  private client: LanguageClient | null = null;
  private wasDownloaded = false;
  private readonly samtYamlFileWatcher =
    vscode.workspace.createFileSystemWatcher("**/samt.yaml");

  constructor(private readonly context: vscode.ExtensionContext) {
    super(() => {
      this.samtYamlFileWatcher.dispose();
      void this.stop();
    });
    for (const event of ["Create", "Change", "Delete"] as const) {
      this.samtYamlFileWatcher[`onDid${event}`](() => this.restart());
    }
  }

  async start(): Promise<void> {
    let languageServerJar = this.getConfiguredJar();
    if (languageServerJar === "") {
      languageServerJar = this.wasDownloaded
        ? await this.getDownloadedJar()
        : await this.downloadJar();
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

    const debug = {
      ...run,
      args: [
        `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:${javaDebugPort}`,
        ...run.args,
        "--trace",
      ],
    } satisfies Executable;

    const serverOptions: ServerOptions = {
      run,
      debug,
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: "file", language: "samt" }],
    };

    this.client = new LanguageClient(
      "samtLanguageServer",
      "SAMT Language Server",
      serverOptions,
      clientOptions
    );

    await this.client.start();
  }

  async stop(): Promise<void> {
    if (this.client == null) {
      return;
    }

    if (this.client.isRunning()) {
      await this.client.stop();
    }
    await this.client.dispose();
    this.client.outputChannel.dispose();
  }

  async restart(): Promise<void> {
    const isDebugging = this.client?.isInDebugMode ?? false;
    await this.stop();
    if (isDebugging) {
      await delay(500);
    }
    await this.start();
  }

  private getConfiguredJar(): string {
    return (
      vscode.workspace
        .getConfiguration("samt")
        .get<string>("languageServer.path")
        ?.trim() ?? ""
    );
  }

  private async getDownloadedJar(): Promise<string> {
    const fileDownloader = await getApi();
    const uri = await fileDownloader.tryGetItem(jarName, this.context);
    return uri?.fsPath ?? "";
  }

  private async downloadJar(): Promise<string> {
    const fileDownloader = await getApi();
    const currentFile = await fileDownloader.tryGetItem(jarName, this.context);
    const currentReleaseId = this.context.globalState.get<number>(releaseIdKey);
    try {
      const releaseAsset = await getLatestReleaseAsset(
        githubRepository,
        jarName
      );

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
            this.context
          );
          await this.context.globalState.update(
            releaseIdKey,
            releaseAsset.releaseId
          );
          this.wasDownloaded = true;
          return file.fsPath;
        }
      );
    } catch (e) {
      console.error(e);
      return currentFile?.fsPath ?? "";
    }
  }
}
