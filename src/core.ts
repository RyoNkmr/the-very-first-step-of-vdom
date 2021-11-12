import { updateVNodeTree, mount } from './vnode';

import type { FunctionComponent, Context } from './vnode';
import type { Store } from './store';

type RenderOption<S extends Store<any, any>> = {
  store: S;
};

export const render = <S extends Store<any, any>>(
  element: FunctionComponent<Context<S>, {}>,
  container: HTMLElement,
  { store }: RenderOption<S>
) => {
  let renderRequestId: number | null = null;
  const render = () => {
    updateVDOM();
    renderRequestId = null;
  };

  const queueRender = () => {
    if (renderRequestId !== null) {
      return;
    }
    renderRequestId = window.requestAnimationFrame(() => render());
  };

  const trapMutation = () => {
    queueRender();
  };
  store.registerCommitObserver(trapMutation);

  const context: Context<S> = { store };
  const getCurrentTree = () => element({}, context);

  let currentTree = getCurrentTree()
  let nextTree: typeof currentTree;

  mount(context, currentTree, container);

  const updateVDOM = () => {
    nextTree = getCurrentTree();
    console.log({ currentTree, nextTree });
    updateVNodeTree({ current: currentTree, next: nextTree });
    currentTree = nextTree;
  };

  const stopUpdate = () => {
    window.cancelAnimationFrame(renderRequestId);
    renderRequestId = null;
  };

  return {
    stopUpdate,
  };
};
