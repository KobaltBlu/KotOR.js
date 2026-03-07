import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { LYTObject } from "../../../resource/LYTObject";

/**
 * LYTLanguageService class.
 * 
 * Provides language support for LYT (Layout) files in Monaco Editor.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LYTLanguageService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LYTLanguageService {

  static initLYTLanguage() {
    // Register a new language
    monacoEditor.languages.register({ id: 'lyt' });

    const tokenConfig: monacoEditor.languages.IMonarchLanguage = {
      keywords: [
        'beginlayout',
        'donelayout',
        'roomcount',
        'trackcount',
        'obstaclecount',
        'doorhookcount',
        'filedependancy'
      ],

      tokenizer: {
        root: [
          // Header
          [/^#MAXLAYOUT\s+ASCII/, 'keyword'],
          
          // Keywords
          [/^filedependancy\s+/, 'keyword'],
          [/^beginlayout$/, 'keyword'],
          [/^donelayout$/, 'keyword'],
          [/^\s+roomcount\s+/, 'keyword'],
          [/^\s+trackcount\s+/, 'keyword'],
          [/^\s+obstaclecount\s+/, 'keyword'],
          [/^\s+doorhookcount\s+/, 'keyword'],
          
          // Numbers
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/[+-]?[0-9]+\.[0-9]+([eE][\-+]?[0-9]+)?/, 'number.float'],
          [/[+-]?[0-9]+/, 'number'],
          
          // Identifiers (room names, door names, etc.)
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          
          // Whitespace
          [/[ \t\r\n]+/, ''],
        ],
      }
    };

    monacoEditor.languages.setMonarchTokensProvider('lyt', tokenConfig);

    monacoEditor.languages.setLanguageConfiguration('lyt', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '(', close: ')' },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
      ],
    });

    // Define a theme for LYT
    monacoEditor.editor.defineTheme('lyt-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6' },
        { token: 'identifier', foreground: '9CDCFE' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'number.float', foreground: 'CE9178' },
        { token: 'number.hex', foreground: 'D7BA7D' },
      ],
      colors: {
        'editor.foreground': '#FFFFFF'
      }
    });

    // Register diagnostics provider for linting
    monacoEditor.languages.registerDocumentFormattingEditProvider('lyt', {
      provideDocumentFormattingEdits: (model: monacoEditor.editor.ITextModel, options: monacoEditor.languages.FormattingOptions, token: monacoEditor.CancellationToken) => {
        try {
          const text = model.getValue();
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          
          // Parse and re-export to format
          const lyt = new LYTObject(encoder.encode(text));
          const formatted = decoder.decode(lyt.export());
          
          if (formatted !== text) {
            return [{
              range: model.getFullModelRange(),
              text: formatted
            }];
          }
          return [];
        } catch (error) {
          // If formatting fails, return empty array (don't break the editor)
          console.warn('LYT formatting failed:', error);
          return [];
        }
      }
    });
  }

  /**
   * Validates LYT file content and returns diagnostics
   */
  static validateLYT(text: string): monacoEditor.editor.IMarkerData[] {
    const markers: monacoEditor.editor.IMarkerData[] = [];
    
    try {
      const encoder = new TextEncoder();
      const lyt = new LYTObject(encoder.encode(text));
      
      // Validation is done during parsing - errors are thrown
      // We could add additional validations here if needed
      
      // Additional validation: check if roomcount matches actual rooms
      const lines = text.split('\n');
      for(let i = 0; i < lines.length; i++){
        const line = lines[i].trim();
        if(line.startsWith('   roomcount ')){
          const expectedCount = parseInt(line.substring('   roomcount '.length).trim());
          if(!isNaN(expectedCount) && lyt.rooms.length !== expectedCount){
            markers.push({
              severity: monacoEditor.MarkerSeverity.Warning,
              startLineNumber: i + 1,
              startColumn: 1,
              endLineNumber: i + 1,
              endColumn: line.length + 1,
              message: `Room count mismatch: declared ${expectedCount}, found ${lyt.rooms.length}`
            });
          }
        } else if(line.startsWith('   doorhookcount ')){
          const expectedCount = parseInt(line.substring('   doorhookcount '.length).trim());
          if(!isNaN(expectedCount) && lyt.doorhooks.length !== expectedCount){
            markers.push({
              severity: monacoEditor.MarkerSeverity.Warning,
              startLineNumber: i + 1,
              startColumn: 1,
              endLineNumber: i + 1,
              endColumn: line.length + 1,
              message: `Doorhook count mismatch: declared ${expectedCount}, found ${lyt.doorhooks.length}`
            });
          }
        } else if(line.startsWith('   trackcount ')){
          const expectedCount = parseInt(line.substring('   trackcount '.length).trim());
          if(!isNaN(expectedCount) && lyt.tracks.length !== expectedCount){
            markers.push({
              severity: monacoEditor.MarkerSeverity.Warning,
              startLineNumber: i + 1,
              startColumn: 1,
              endLineNumber: i + 1,
              endColumn: line.length + 1,
              message: `Track count mismatch: declared ${expectedCount}, found ${lyt.tracks.length}`
            });
          }
        } else if(line.startsWith('   obstaclecount ')){
          const expectedCount = parseInt(line.substring('   obstaclecount '.length).trim());
          if(!isNaN(expectedCount) && lyt.obstacles.length !== expectedCount){
            markers.push({
              severity: monacoEditor.MarkerSeverity.Warning,
              startLineNumber: i + 1,
              startColumn: 1,
              endLineNumber: i + 1,
              endColumn: line.length + 1,
              message: `Obstacle count mismatch: declared ${expectedCount}, found ${lyt.obstacles.length}`
            });
          }
        }
      }
      
    } catch (error: unknown) {
      // Parse error occurred
      const message = (error instanceof Error ? error.message : 'Parse error');
      
      // Try to extract line number from error message
      const lineMatch = message.match(/line (\d+)/i);
      const lineNumber = lineMatch ? parseInt(lineMatch[1]) : 1;
      
      markers.push({
        severity: monacoEditor.MarkerSeverity.Error,
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: 1000, // End of line
        message: message
      });
    }
    
    return markers;
  }

}
