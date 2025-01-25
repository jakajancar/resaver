import * as vscode from 'vscode';
import { spawnSync } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('resaver.bulkResave', async () => {
        // Find workspace
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return;
        }
        const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

        // Execute the file listing command
        const command = vscode.workspace.getConfiguration().get('resaver.listFilesCommand') as string | null;
        if (!command) {
            vscode.window.showErrorMessage('resaver.listFilesCommand not set.');
            return;
        }
        const { status, signal, stdout, stderr, error } = spawnSync(command, { 
            cwd: workspaceUri.fsPath,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024, // 10 MB
        });
        if (error)
            throw error; // Error spawning
        if (signal)
            throw new Error(`resaver.listFilesCommand killed by signal ${signal}`);
        if (status !== 0)
            throw new Error(`resaver.listFilesCommand failed with status ${status}: ${stderr}`);
        if (stderr !== '')
            throw new Error(`resaver.listFilesCommand wrote to stderr: ${stderr}`);
        const lines = stdout.trim().split('\n');

        // Process lines
        await vscode.window.withProgress(
            {
                cancellable: true,
                location: vscode.ProgressLocation.Notification,
                title: 'Resaving files',
            },
            async (progress, token) => {
                for (let i = 0; i < lines.length && !token.isCancellationRequested; i++) {
                    const line = lines[i];
                    try {
                        // Validate file
                        const fileUrl = vscode.Uri.joinPath(workspaceUri, line);
                        const stat = await vscode.workspace.fs.stat(fileUrl); // Throws if file does not exist
                        if (stat.type !== vscode.FileType.File) {
                            throw new Error(`not a file`);
                        }

                        // Open document
                        let document: vscode.TextDocument
                        try {
                            document = await vscode.workspace.openTextDocument(fileUrl);
                        } catch (error) {
                            if (`${error}`.includes('File seems to be binary and cannot be opened as text')) {
                                // Ignore error. Yuck!
                                continue;
                            }
                            throw error
                        }
                        if (document.isDirty) {
                            throw new Error(`document was dirty already, save your changes before running resaver`);
                        }

                        // Open text editor
                        const textEditor = await vscode.window.showTextDocument(document, { preview: false });
                        if (textEditor != vscode.window.activeTextEditor) {
                            throw new Error('opened text editor is not active?');
                        }
                        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
                        if (!activeTab) {
                            throw new Error('no active tab?');
                        }
                        if (activeTab.input instanceof vscode.TabInputText) {
                            if (activeTab.input.uri.toString() != fileUrl.toString()) {
                                throw new Error(`active tab is not the file we opened but ${activeTab.input.uri}`);
                            }
                        } else {
                            throw new Error(`active tab is not a text editor but ${activeTab.input}`);
                        }

                        // Save
                        await vscode.workspace.save(fileUrl);
                        if (document.isDirty) {
                            throw new Error(`document is dirty after save?`);
                        }

                        // Close text editor
                        await vscode.window.tabGroups.close(activeTab);
                    } catch (error) {
                        throw new Error(`Error processing ${line}: ${error}`);
                    } finally {
                        progress.report({ message: line.toString(), increment: 100 / lines.length });
                    }
                }
            }
        );
    });

    context.subscriptions.push(disposable);
}
