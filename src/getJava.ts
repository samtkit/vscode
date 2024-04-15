import {
  IJavaRuntime,
  IJavaVersion,
  IOptions,
  findRuntimes,
  getRuntime,
  JAVA_FILENAME,
} from "jdk-utils";
import * as vscode from "vscode";
import which from "which";
import { realpath } from "fs/promises";
import path from "path";

const minimumVersion = 17;
const jdkUtilsOptions: IOptions = { withVersion: true, withTags: true };

// make some fields required
type JavaRuntime = IJavaRuntime & {
  version: IJavaVersion;
  javaExecutable: string;
  isJavaHomeEnv: boolean;
  isJdkHomeEnv: boolean;
  isInPathEnv: boolean;
  isExecutableInPath: boolean;
};

function convertJre(
  jre: IJavaRuntime,
  javaInPath: string | null = null,
): JavaRuntime {
  const { homedir, version, isJavaHomeEnv, isJdkHomeEnv, isInPathEnv } = jre;
  if (version == null) {
    throw new Error("Missing JRE version information");
  }
  const javaExecutable = path.join(homedir, "bin", JAVA_FILENAME);
  return {
    ...jre,
    version,
    javaExecutable,
    isJavaHomeEnv: isJavaHomeEnv ?? false,
    isJdkHomeEnv: isJdkHomeEnv ?? false,
    isInPathEnv: isInPathEnv ?? false,
    isExecutableInPath: javaInPath === javaExecutable,
  };
}

function meetsMinimumRequirement(jre: JavaRuntime): boolean {
  return jre.version.major >= minimumVersion;
}

async function getConfiguredJre(): Promise<JavaRuntime | null> {
  const config = vscode.workspace.getConfiguration("samt");
  const javaHome = config.get<string>("java.home")?.trim();
  if (!javaHome) {
    return null;
  }

  const jre = await getRuntime(javaHome, jdkUtilsOptions);
  if (jre == null) {
    return null;
  }

  const convertedJre = convertJre(jre);
  if (!meetsMinimumRequirement(convertedJre)) {
    return null;
  }

  return convertedJre;
}

function compareSource(jre1: JavaRuntime, jre2: JavaRuntime) {
  if (jre1.isJavaHomeEnv !== jre2.isJavaHomeEnv) {
    return jre1.isJavaHomeEnv ? -1 : 1;
  }
  if (jre1.isJdkHomeEnv !== jre2.isJdkHomeEnv) {
    return jre1.isJdkHomeEnv ? -1 : 1;
  }
  if (jre1.isInPathEnv !== jre2.isInPathEnv) {
    return jre1.isInPathEnv ? -1 : 1;
  }
  if (jre1.isExecutableInPath !== jre2.isExecutableInPath) {
    return jre1.isExecutableInPath ? -1 : 1;
  }
  return 0;
}

function compareVersion(jre1: JavaRuntime, jre2: JavaRuntime) {
  function getParts(jre: JavaRuntime) {
    return jre.version.java_version.split(".").map((v) => parseInt(v));
  }

  const parts1 = getParts(jre1);
  const parts2 = getParts(jre2);
  const len = Math.min(parts1.length, parts2.length);
  for (let i = 0; i < len; ++i) {
    const n1 = parts1[i];
    const n2 = parts2[i];
    if (n1 !== n2) {
      return n1 - n2;
    }
  }
  return parts1.length - parts2.length;
}

async function collectJres(): Promise<JavaRuntime[]> {
  const jres = await findRuntimes(jdkUtilsOptions);
  // @types/which has an incorrect return type for nothrow: true
  const javaInPath = (await which(JAVA_FILENAME, { nothrow: true })) as
    | string
    | null;
  if (javaInPath == null) {
    return jres.map((jre) => convertJre(jre));
  }

  const resolvedJavaInPath = await realpath(javaInPath);
  const javaHome = path.dirname(path.dirname(resolvedJavaInPath));
  if (!jres.some((jre) => jre.homedir === javaHome)) {
    const jre = await getRuntime(javaHome, jdkUtilsOptions);
    if (jre != null) {
      jres.push(jre);
    }
  }
  return jres.map((jre) => convertJre(jre, resolvedJavaInPath));
}

async function findJre(): Promise<JavaRuntime | null> {
  const jres = await collectJres();
  const suitableJres = jres.filter(meetsMinimumRequirement);
  if (suitableJres.length === 0) {
    return null;
  }

  suitableJres.sort((jre1, jre2) => {
    let cmp = compareSource(jre1, jre2);
    if (cmp === 0) {
      cmp = compareVersion(jre2, jre1);
    }
    return cmp;
  });
  return suitableJres[0];
}

const OPEN_SETTINGS = "Open Settings";

export default async function getJava(): Promise<string | null> {
  let jre = await getConfiguredJre();
  if (jre == null) {
    jre = await findJre();
  }
  if (jre == null) {
    void showMissingJavaError();
    return null;
  }
  return jre.javaExecutable;
}

async function showMissingJavaError(): Promise<void> {
  const item = await vscode.window.showErrorMessage(
    `The SAMT language server requires Java ${minimumVersion} or later to be installed. If the automatic detection failed, please configure the path to the Java home directory in the SAMT extension settings.`,
    OPEN_SETTINGS,
  );
  if (item === OPEN_SETTINGS) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "samt.java.home",
    );
  }
}
