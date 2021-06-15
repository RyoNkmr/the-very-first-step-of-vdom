import type { Store } from './store'

export class App<Store<S, M>> {
  private renderRequestId = null;

  constructor(private rootElement: HTMLElement, private store: Store<S, M>) {}

  private render(): void {
    if (this.renderRequestId !== null) {
      return;
    }
    // NOTE: 描画最適化のための間引き
    this.renderRequestId = window.requestAnimationFrame(() => this.__render())
  }

  private __render(entrypoint: HTMLElement): void {
    // TODO rendering
    this.renderRequestId = null;
  };
}
