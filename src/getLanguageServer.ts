import { workspace } from "vscode";

export default function getLanguageServer(): string {
    return workspace.getConfiguration('samt').get<string>('languageServer.path') ?? '';
}
