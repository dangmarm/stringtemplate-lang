import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let timeout: NodeJS.Timer | undefined = undefined;
	let activeEditor = vscode.window.activeTextEditor;
	let cacheDecorators = new Map();
	
	function updateDecorations() {
		if (!activeEditor || activeEditor.document.languageId !== 'stringtemplate') {
			return;
		}
		const regEx = /(?:\$(?:if\s*\([^$]+|elseif\s*\([^$]+|else|endif)\$)|^ *(?:>>|%>) *$/gm;
		const text = activeEditor.document.getText();
		let match;
		let level = 0;
		let startLine = [], endLine = [];
		let indentLines = new Map();
		while ((match = regEx.exec(text))) {
			const conditionalPosition = activeEditor.document.positionAt(match.index);
			if (match[0].startsWith("$if")) {
				level++;
				startLine[level] = conditionalPosition.line;
			} else if (match[0].startsWith("$else")) {
				if (level > 0) {
					endLine[level] = conditionalPosition.line;
					for (let i = startLine[level] + 1; i < endLine[level]; i++) {
						if (indentLines.has(i)) {
							indentLines.set(i, Math.max(level, indentLines.get(i)));
						} else {
							indentLines.set(i, level);
						}
					}	
				} else if (level === 0) {
					level++;
				}
				startLine[level] = conditionalPosition.line;
			} else if (match[0].startsWith("$endif")) {
				if (level > 0) {
					endLine[level] = conditionalPosition.line;
					for (let i = startLine[level] + 1; i < endLine[level]; i++) {
						if (indentLines.has(i)) {
							indentLines.set(i, Math.max(level, indentLines.get(i)));
						} else {
							indentLines.set(i, level);
						}
					}
					level--;
				}
			} else if (match[0].startsWith(">>") || match[0].startsWith("%>")) {
				for(let l=level; l>0; l--) {
					endLine[l] = conditionalPosition.line;
					for (let i = startLine[l] + 1; i < endLine[l]; i++) {
						if (indentLines.has(i)) {
							indentLines.set(i, Math.max(l, indentLines.get(i)));
						} else {
							indentLines.set(i, l);
						}
					}
				}
				level = 0;
			}
		}

		let decorators = new Map();
		indentLines.forEach((indentLevel, lineNumber) => {
			let decorator: {decoratorType: vscode.TextEditorDecorationType, conditionalCodeLines: {range: vscode.Range}[]};

			if (decorators.has(indentLevel)) {
				decorator = decorators.get(indentLevel);
			} else {
				decorator = {
					decoratorType: getDecorator(indentLevel),
					conditionalCodeLines: []
				};
				decorators.set(indentLevel, decorator);
			}

			if (activeEditor) {
				const line = activeEditor.document.lineAt(lineNumber)
				if (activeEditor && !line.isEmptyOrWhitespace) {
					const indexStart = line.firstNonWhitespaceCharacterIndex;
					const indexEnd = line.range.end.character;

					decorator.conditionalCodeLines.push({range: new vscode.Range(new vscode.Position(lineNumber, indexStart), new vscode.Position(lineNumber, indexEnd))})	
				}	
			}
		});

		
		decorators.forEach((value) => {
			activeEditor?.setDecorations(value.decoratorType, value.conditionalCodeLines);
		});
	}

	function getDecorator(level: number): vscode.TextEditorDecorationType {
		if (!cacheDecorators.has(level)) {
			cacheDecorators.set(
				level, 
				vscode.window.createTextEditorDecorationType({
					dark: {
						before: {
							contentText: ''.padStart(level * 4, '·'),
							color:'rgb(64,64,64)'
						}	
					},
					light: {
						before: {
							contentText: ''.padStart(level * 4, '·'),
							color:'rgb(248,248,248)'
						}	
					}
				})
			);
		}

		return cacheDecorators.get(level);
	}

	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		timeout = setTimeout(updateDecorations, 500);
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

}