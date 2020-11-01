import * as vscode from 'vscode';

export class Decorations {
	timeout: NodeJS.Timer | undefined = undefined;
	activeEditor = vscode.window.activeTextEditor;
    cacheDecorators = new Map();
    
    constructor(context: vscode.ExtensionContext) {
		
        vscode.window.onDidChangeActiveTextEditor(editor => {
            this.activeEditor = editor;
            if (editor) {
                this.triggerUpdateDecorations();
            }
        }, null, context.subscriptions);
    
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.activeEditor && event.document === this.activeEditor.document) {
                this.triggerUpdateDecorations();
            }
        }, null, context.subscriptions);

    	if (this.activeEditor) {
            this.triggerUpdateDecorations();
        }
    }

	triggerUpdateDecorations() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}
		this.timeout = setTimeout(() => this.updateDecorations(), 500);
    }
    
	updateDecorations() {
		if (!this.activeEditor || this.activeEditor.document.languageId !== 'stringtemplate') {
			return;
		}
		
		const regEx = /(?:\$(?:if\s*\([^$]+|elseif\s*\([^$]+|else|endif)\$)|^ *(?:>>|%>) *$/gm;
		const text = this.activeEditor.document.getText();
		let match;
		let level = 0;
		let startLine = [], endLine = [];
		let indentLines = new Map();
		while ((match = regEx.exec(text))) {
			const conditionalPosition = this.activeEditor.document.positionAt(match.index);
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
					decoratorType: this.getDecorator(indentLevel),
					conditionalCodeLines: []
				};
				decorators.set(indentLevel, decorator);
			}

			if (this.activeEditor) {
				const line = this.activeEditor.document.lineAt(lineNumber)
				if (this.activeEditor && !line.isEmptyOrWhitespace) {
					const indexStart = line.firstNonWhitespaceCharacterIndex;
					const indexEnd = line.range.end.character;

					decorator.conditionalCodeLines.push({range: new vscode.Range(new vscode.Position(lineNumber, indexStart), new vscode.Position(lineNumber, indexEnd))})	
				}	
			}
		});

		
		decorators.forEach((value) => {
			this.activeEditor?.setDecorations(value.decoratorType, value.conditionalCodeLines);
		});
	}

	getDecorator(level: number): vscode.TextEditorDecorationType {
		if (!this.cacheDecorators.has(level)) {
			this.cacheDecorators.set(
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

		return this.cacheDecorators.get(level);
	}
}