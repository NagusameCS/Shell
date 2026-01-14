declare module 'which' {
  function which(cmd: string): Promise<string>;
  function which(cmd: string, options: { all: true }): Promise<string[]>;
  function which(cmd: string, options: { nothrow: true }): Promise<string | null>;
  function which(cmd: string, options: { all: true; nothrow: true }): Promise<string[] | null>;
  
  namespace which {
    function sync(cmd: string): string;
    function sync(cmd: string, options: { nothrow: true }): string | null;
    function sync(cmd: string, options: { all: true }): string[];
    function sync(cmd: string, options: { all: true; nothrow: true }): string[] | null;
  }
  
  export = which;
}
