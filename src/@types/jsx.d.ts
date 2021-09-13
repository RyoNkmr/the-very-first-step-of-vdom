import type { VNode, Attributes } from '../vnode';

declare global {
  namespace JSX {
    type Element = VNode<any, any, any>;
  }
}
