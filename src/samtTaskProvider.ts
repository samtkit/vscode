import * as vscode from "vscode";
import process from "process";
import path from "path";
import { exists } from "./fsUtil";

const scriptName = process.platform === "win32" ? "samtw.bat" : "samtw";

export default class SamtTaskProvider implements vscode.TaskProvider {
  private fileWatcher: vscode.FileSystemWatcher;
  private tasksPromise: Promise<vscode.Task[]> | null = null;

  constructor() {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      `**/${scriptName}}`,
      false,
      true, // ignore change events
    );
    const fileListener = () => {
      this.tasksPromise = null;
    };
    this.fileWatcher.onDidCreate(fileListener);
    this.fileWatcher.onDidDelete(fileListener);
  }

  provideTasks(token: vscode.CancellationToken): Promise<vscode.Task[]> {
    if (this.tasksPromise == null) {
      this.tasksPromise = getSamtTasks(token);
    }
    return this.tasksPromise;
  }

  resolveTask(task: vscode.Task): vscode.Task {
    const definition = task.definition as SamtTaskDefinition;

    return new vscode.Task(
      definition,
      task.scope ?? vscode.TaskScope.Workspace,
      task.name,
      task.source,
      getShellExecution(definition),
    );
  }

  dispose() {
    this.fileWatcher.dispose();
  }
}

/**
 * Matches the task definition in package.json
 */
interface SamtTaskDefinition extends vscode.TaskDefinition {
  type: "samt";
  cwd: string;
  command: string;
  args: string[];
}

async function getSamtTasks(
  token: vscode.CancellationToken,
): Promise<vscode.Task[]> {
  const wrappers = await findSamtWrappersWithConfig(token);
  return wrappers.map((wrapper) => {
    const folder = vscode.workspace.getWorkspaceFolder(wrapper);
    const cwd = path.dirname(wrapper.fsPath);
    const relativeCwd =
      folder != null
        ? path
            .relative(folder.uri.fsPath, cwd)
            .replaceAll(path.win32.sep, path.posix.sep)
        : null;
    const definition: SamtTaskDefinition = {
      type: "samt",
      cwd: relativeCwd ?? cwd,
      command: "compile",
      args: ["samt.yaml"],
    };
    const task = new vscode.Task(
      definition,
      folder ?? vscode.TaskScope.Workspace,
      "compile",
      "samt",
      getShellExecution(definition),
    );
    task.group = vscode.TaskGroup.Build;
    return task;
  });
}

async function findSamtWrappersWithConfig(
  token: vscode.CancellationToken,
): Promise<vscode.Uri[]> {
  const wrappers = await vscode.workspace.findFiles(
    `**/${scriptName}`,
    undefined,
    undefined,
    token,
  );
  const wrappersWithConfig: vscode.Uri[] = [];
  for (const wrapper of wrappers) {
    if (await hasConfig(wrapper.fsPath)) {
      wrappersWithConfig.push(wrapper);
    }
  }
  return wrappersWithConfig;
}

async function hasConfig(wrapperPath: string) {
  const configPath = path.resolve(wrapperPath, "../samt.yaml");
  return await exists(configPath);
}

function getShellExecution(
  definition: SamtTaskDefinition,
): vscode.ShellExecution {
  return new vscode.ShellExecution(
    `./${scriptName}`,
    [definition.command, ...definition.args],
    {
      cwd: definition.cwd,
    },
  );
}
