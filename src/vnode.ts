// ----------
// Nodeの定義

import { Store } from './store';

// ----------
type EmptyNode = null | undefined | false;

// よくある Attr
export type Attributes = {
  className?: string;
  style?: string;
};

type FCParameter<Ctx extends Context<any>, P> = Attributes &
  P & {
    children?: Children<Ctx>;
  };

// --------------------
// VDOMの構成要素
// こいつが一番大事
// --------------------

type TextNodeType = symbol & { __textNodeTypeBrand: never };
const NODE_TYPE_TEXT = Symbol('TextNode') as TextNodeType;

export type Context<S extends Store<any, any>> = {
  store: S;
};

export type FunctionComponent<Ctx extends Context<Store<any, any>>, P = {}> = (
  context: Ctx,
  props: FCParameter<Ctx, P>
) => VNode<Ctx, FunctionComponent<Ctx>> | VNode<Ctx, TagName> | string;
// alias
export type FC<
  Ctx extends Context<Store<any, any>>,
  P = {}
> = FunctionComponent<Ctx, P>;

// const a: FC<any, { size?: number }> = (_, { size, children }) => {
//   return createElement('div', null, size.toString(), ...children)
// }

// const b: FC<any, {}> = () => {
//   return createElement(a, { className: 'hoge', style: 'color: red;' },
//     createElement('p', null, 'hoge'),
//     createElement('p', null, 'fuga'),
//   )
// }

// e.g. 'div' | () => <p />hoge<p />
type TagName = string;
type Child<Ctx extends Context<Store<any, any>>> =
  | VNode<Ctx, FunctionComponent<Ctx> | TagName, unknown>
  | string
  | number
  | undefined
  | false
  | null;
type Children<Ctx extends Context<Store<any, any>>> = Child<Ctx>[];

const isVNodeChild = <Ctx extends Context<Store<any, any>>>(
  child: Child<Ctx>
): child is VNode<Ctx, FunctionComponent<Ctx> | TagName, unknown> =>
  child != null && typeof child === 'object';

type VNodeComponent<
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, P> | TagName,
  P = {}
> = {
  component: C;
  props: P & Attributes;
  children: Children<Ctx>;
  $el: HTMLElement;
};
type VNodeTextNode = {
  component: TextNodeType;
  props: undefined;
  children: string; // 本文
  $el: Text;
};

export type VNode<
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props extends FCParameter<Ctx, {}> = {}
> = VNodeComponent<Ctx, C> | VNodeTextNode | EmptyNode;
type VNodeInstance<
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props extends FCParameter<Ctx, {}> = {}
> = Exclude<VNode<Ctx, C, Props>, EmptyNode>;

const isEmptyNode = (vnode: unknown): vnode is EmptyNode =>
  vnode === null || vnode === undefined || vnode === false;
const isVNodeInstance = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, P> | TagName,
  P
>(
  vnode: unknown
): vnode is VNodeInstance<Ctx, C, P> =>
  !isEmptyNode(vnode) &&
  Object.prototype.hasOwnProperty.call(vnode, 'component');
const isVNodeComponent = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, P> | TagName,
  P
>(
  vnode: VNode<Ctx, C, P>
): vnode is VNodeComponent<Ctx, C, P> =>
  !isEmptyNode(vnode) && typeof vnode.children !== 'string';
const isVNodeTextNode = (vnode: VNode<any, any>): vnode is VNodeTextNode =>
  !isEmptyNode(vnode) && vnode.component === NODE_TYPE_TEXT;

// const isTagName = <Props>(component: FunctionComponent<Props> | TagName): component is TagName => typeof component === 'string'

// https://ja.reactjs.org/docs/react-api.html#createelement
export type CreateElement = {
  <Ctx extends Context<Store<any, any>>, Props>(
    component: FunctionComponent<Ctx, Props>,
    props: FCParameter<Ctx, Props> | null,
    ...children: Children<Ctx>
  ): VNodeComponent<Ctx, FunctionComponent<Ctx, Props>, Props>;
  <Ctx extends Context<Store<any, any>>, Props>(
    component: TagName,
    props: Props | null,
    ...children: Children<Ctx>
  ): VNodeComponent<Ctx, TagName, Props>;
};
export const createElement: CreateElement = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props = null
>(
  component: C,
  props: Props extends null ? null : FCParameter<Ctx, Props>,
  ...children: Children<Ctx>
): VNodeComponent<Ctx, C, Props> => ({
  component,
  props: props ?? ({} as Props),
  children,
  $el: undefined,
});

/* ----------
/* 差分検知
/* ----------*/
type Diff = 'VNODE_TYPE' | 'TAG' | 'PROPS' | 'TEXT';

const DIFF_DETECTOR_MAP: Record<
  Diff,
  <
    Ctx extends Context<Store<any, any>>,
    C extends FunctionComponent<Ctx, Props> | TagName,
    Props
  >(
    current: VNodeInstance<Ctx, C, Props>,
    next: VNodeInstance<Ctx, C, Props>
  ) => boolean
> = {
  // Component or TextNode
  VNODE_TYPE: (current, next) =>
    typeof current.component !== typeof next.component,
  // TextNodeの中身
  TEXT: (current, next) =>
    isVNodeTextNode(current) &&
    isVNodeTextNode(next) &&
    typeof current.children !== typeof next.children,
  TAG: (current, next) => current.$el?.nodeName !== next.$el?.nodeName,
  PROPS: (current, next) =>
    JSON.stringify(current.props) !== JSON.stringify(next.props),
};

/* ----------
/* 差分更新
/* ----------*/
const RE_PATTRN_EVENT_HANDLER = /^on(\w+)$/;
const isEventHandlerKey = (key: string): boolean =>
  RE_PATTRN_EVENT_HANDLER.test(key);
const parseHandlingEventName = (key: string): string | undefined =>
  (RE_PATTRN_EVENT_HANDLER.exec(key) || [])[1];

type NodeTransitionParams<
  Ctx extends Context<Store<any, any>>,
  VN extends VNode<any, any>
> = {
  current: VN | undefined;
  next: VN | undefined;
  context: Ctx;
};

type VNodeUpdater = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props
>(
  args: NodeTransitionParams<Ctx, VNodeInstance<Ctx, C, Props>>
) => void;
type VNodeTreeUpdater = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props
>(
  args: NodeTransitionParams<Ctx, VNode<Ctx, C, Props>>
) => void;

const replaceElement: VNodeUpdater = ({ current, next, context }) =>
  current.$el.parentNode.replaceChild(
    createRealNode(next, context),
    current.$el
  );

const updateAttributes: VNodeUpdater = ({ current, next }) => {
  if (!isVNodeComponent(current) || !isVNodeComponent(next)) {
    console.warn('ミスってる');
    return;
  }
  // removed
  Object.keys(current.props).forEach((attributeName) => {
    if (
      isEventHandlerKey(attributeName) ||
      next.props.hasOwnProperty(attributeName)
    ) {
      return;
    }
    current.$el.removeAttribute(attributeName);
  });

  // updated
  Object.keys(next.props).forEach((attributeName) => {
    if (isEventHandlerKey(attributeName)) {
      return;
    }
    current.$el.setAttribute(attributeName, next.props[attributeName]);
  });
};

const DIFF_UPDATER_MAP: Record<Diff, VNodeUpdater> = {
  VNODE_TYPE: replaceElement,
  TEXT: updateAttributes,
  TAG: replaceElement,
  PROPS: updateAttributes,
};

// ----------
// 差分に限定しない vnode to real node
// ----------
type HTMLElementEvent<El extends HTMLElement> = Event & { target: El };
type EventHandler = <El extends HTMLElement>(
  event: HTMLElementEvent<El>
) => void;

const updateAttribute = <
  El extends HTMLElement,
  Attrs extends Record<string, string | EventHandler>
>(
  element: El,
  attributes: Attrs
): void => {
  Object.entries(attributes ?? {}).forEach(([attrKey, value]) => {
    const eventName = parseHandlingEventName(attrKey);
    eventName === undefined
      ? element.setAttribute(attrKey, value as string)
      : element.addEventListener(eventName, value as EventListener);
  });
};

const createRealNode = <
  Ctx extends Context<Store<object, any>>,
  C extends TagName | FunctionComponent<Ctx, unknown>
>(
  node: VNodeInstance<Ctx, C, any>,
  context: Ctx
): HTMLElement | Text | undefined => {
  // TextNode
  if (isVNodeTextNode(node)) {
    return document.createTextNode(node.children);
  }

  const { component, children, props } = node;

  // component
  if (typeof component === 'function') {
    const rendered = component(context, { ...props, children });
    if (typeof rendered === 'string') {
      return document.createTextNode(rendered);
    }
    if (isEmptyNode(rendered)) {
      return undefined;
    }
    return rendered ? createRealNode(rendered, context) : undefined;
  }

  // TagName
  const element = document.createElement(component);
  // NOTE: other props are treated as html attrs
  updateAttribute(element, props);

  if (children == null || children.length === 0) {
    return element;
  }

  const childrenElements = children.reduce((fragment, child: Child<Ctx>) => {
    if (isEmptyNode(child)) {
      return fragment;
    }
    fragment.appendChild(createRealNode(child, context));
    return fragment;
  }, document.createDocumentFragment());
  element.appendChild(childrenElements);
  return element;
};

type VNodeCompareFunction = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props
>(
  args: NodeTransitionParams<Ctx, VNodeInstance<Ctx, C>>
) => Diff | undefined;
const detectDiff: VNodeCompareFunction = ({ current, next }) =>
  (['VNODE_TYPE', 'TEXT', 'TAG', 'PROPS'] as Diff[]).find((diff) =>
    DIFF_DETECTOR_MAP[diff](current, next)
  );

const createVNodeTextNode = (text: string): VNodeTextNode => ({
  component: NODE_TYPE_TEXT,
  props: undefined,
  children: text,
  $el: undefined,
});

export const mount = <
  Ctx extends Context<Store<any, any>>,
  C extends FunctionComponent<Ctx, {}> | TagName
>(
  context: Ctx,
  component: VNodeInstance<Ctx, C>,
  container: HTMLElement
) => {
  console.log({ component });
  component.$el = createRealNode(component, context);
  if (!isVNodeTextNode(component)) {
    component.children = component.children
      .map((child, index) => {
        if (isEmptyNode(child)) {
          return undefined;
        }
        if (isVNodeInstance(child)) {
          return mount(context, child, component.$el);
        }
        return createVNodeTextNode(child.toString());
      })
      .filter((node) => node !== undefined);
    console.log({ component });
  }
  container.appendChild(component.$el);
  return component;
};

// NOTE: update recursively
export const updateVNodeTree: VNodeTreeUpdater = ({
  current,
  next,
  context,
}) => {
  if (isEmptyNode(current) || isEmptyNode(next)) {
    if (isVNodeInstance(current)) {
      current.$el.parentElement.removeChild(current.$el);
      return;
    }
    if (isVNodeInstance(next)) {
      next.$el.parentElement.appendChild(createRealNode(next, context));
      return;
    }
    return;
  }

  const diff = detectDiff({ current, next, context });
  if (diff !== undefined) {
    DIFF_UPDATER_MAP[diff]({ current, next, context });
  }

  // NOTE: diff === 'TEXT' だと型わからんので
  if (isVNodeTextNode(current) || isVNodeTextNode(next)) {
    return;
  }

  const { children } =
    current.children.length > next.children.length ? current : next;

  children.forEach((_, index) => {
    const _current = !isEmptyNode(current.children[index]) ? current.children[index] : undefined
    const _next = !isEmptyNode(next.children[index]) ? next.children[index] : undefined

      updateVNodeTree({
        current: _current,
        next: _next,
        context,
  });
};
