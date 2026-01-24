export {};

declare global {
  interface Window {
    __ESC__?: {
      use: (enabled: boolean, handler: () => void) => void | (() => void);
    };
  }
}
