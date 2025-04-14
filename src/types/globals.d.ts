/**
 * Type declarations for global libraries loaded from CDN
 */

declare const mermaid: {
  initialize: (config: any) => void;
  render: (id: string, text: string, callback: (svg: string) => void) => void;
};

declare namespace monaco {
  namespace editor {
    interface IStandaloneCodeEditor {
      getValue(): string;
      onDidChangeModelContent(listener: () => void): any;
    }
    
    function create(element: HTMLElement, options: any): IStandaloneCodeEditor;
    function defineTheme(name: string, theme: any): void;
    function setTheme(name: string): void;
  }
  
  namespace languages {
    function register(options: { id: string }): void;
    function setMonarchTokensProvider(language: string, provider: any): void;
  }
}

declare function require(modules: string[], callback: (...args: any[]) => void): void;
declare namespace require {
  function config(options: { paths: { [key: string]: string } }): void;
}