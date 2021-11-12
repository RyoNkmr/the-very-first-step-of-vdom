// ----------
// Nodeの定義

import { Store } from './store';

// ----------
type EmptyValue = null | undefined | false;

const isEmptyValue = (value: unknown): value is EmptyValue =>
  value == null || value === false;

// よくある Attr
export type Attributes = {
  className?: string;
  style?: string;
  onClick?: EventHandler;
};

type AnyNode<Ctx extends AnyContext> =
  | ComponentVNode<Ctx>
  | TagVNode<Ctx>
  | string
  | number
  | null
  | undefined
  | false;

type FCParameter<Ctx extends AnyContext, P> = Attributes &
  P & {
    children?: AnyNode<Ctx>;
  };

// --------------------
// VDOMの構成要素
// こいつが一番大事
// --------------------

type AnyStore = Store<any, any>;
type AnyContext = Context<AnyStore>;

export type Context<S extends AnyStore> = {
  store: S;
};

export type FunctionComponent<Ctx extends Context<Store<any, any>>, P = {}> = (
  props: FCParameter<Ctx, P>,
  context?: Ctx
) => AnyNode<Ctx>;

// alias
export type FC<
  Ctx extends Context<Store<any, any>>,
  P = {}
> = FunctionComponent<Ctx, P>;

type TagName = string & { __TagNameBrand: never };

type ComponentVNode<Ctx extends AnyContext> = {
  component: FunctionComponent<Ctx>;
  props: any;
  children: AnyNode<Ctx>[];
  $el: HTMLElement | null;
};

type TagVNode<Ctx extends AnyContext> = {
  component: TagName;
  props: Attributes;
  children: AnyNode<Ctx>[];
  $el: HTMLElement;
};

const NODE_TYPE_TEXT = Symbol('__textnode');
type ComponentTypeText = typeof NODE_TYPE_TEXT & { __TagNameBrand: never };

type TextVNode = {
  component: ComponentTypeText;
  props: null;
  children: string; // body
  $el: Text;
};

const createTextVNode = (text: any): TextVNode => ({
  component: NODE_TYPE_TEXT as any,
  props: null,
  children: text.toString(),
  $el: document.createTextNode(text),
});

// https://ja.reactjs.org/docs/react-api.html#createelement
export type CreateElement = {
  <Ctx extends AnyContext, Props>(
    component: FunctionComponent<Ctx>,
    props: FCParameter<Ctx, Props> | null,
    ...children: AnyNode<Ctx>[]
  ): ComponentVNode<Ctx>;
  <Ctx extends AnyContext, Props>(
    component: TagName,
    props: Props | null,
    ...children: AnyNode<Ctx>[]
  ): TagVNode<Ctx>;
};

export const createElement: CreateElement = <
  Ctx extends AnyContext,
  C extends FunctionComponent<Ctx, Props> | TagName,
  Props = null
>(
  component: C,
  props: Props extends null ? null : FCParameter<Ctx, Props>,
  ...children: AnyNode<Ctx>[]
) => ({
  component,
  props: props ?? ({} as Props),
  children,
  $el:
    typeof component === 'string'
      ? document.createElement(component)
      : undefined,
});

const isTagVNode = <Ctx extends AnyContext>(
  value: AnyNode<Ctx>
): value is TagVNode<Ctx> =>
  value != null &&
  typeof value === 'object' &&
  typeof value.component === 'string';

type ComponentVNodeInternal<Ctx extends AnyContext> = Omit<
  ComponentVNode<Ctx>,
  'children'
> & { children: VNodeInternal<Ctx>[] };
type TagVNodeInternal<Ctx extends AnyContext> = Omit<
  TagVNode<Ctx>,
  'children'
> & { children: VNodeInternal<Ctx>[] };

const isTagVNodeInternal = <Ctx extends AnyContext>(
  node: VNodeInternal<Ctx>
): node is TagVNodeInternal<Ctx> =>
  node !== null && typeof node.component === 'string';

export type VNodeInternal<Ctx extends AnyContext> =
  | ComponentVNodeInternal<Ctx>
  | TagVNodeInternal<Ctx>
  | TextVNode
  | null;

const convertVNodeInternal = <Ctx extends AnyContext>(
  node: AnyNode<Ctx>
): VNodeInternal<Ctx> => {
  if (isEmptyValue(node)) {
    return null;
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return createTextVNode(node);
  }
  const children = node.children.map(convertVNodeInternal);
  return {
    ...node,
    children,
  };
};

const mountVNodeInternal = <Ctx extends AnyContext>(
  parentEl: HTMLElement,
  root: VNodeInternal<Ctx>,
  context: Ctx
): void => {
  if (root === null) {
    return;
  }
  const walk = (parentEl: HTMLElement, target: VNodeInternal<Ctx>): void => {
    if (target === null) {
      return;
    }
    if (isTextVNode(target)) {
      parentEl.appendChild(target.$el);
      return;
    }
    const el = createRealNode(target, context) as any;
    target.$el = el;
    if (el === null) {
      return;
    }
    parentEl.appendChild(el);
    return target.children.forEach((child) => walk(el, child));
  };
  if (isTextVNode(root)) {
    parentEl.appendChild(root.$el);
    return;
  }
  root.children.forEach((child) => walk(root.$el, child));
};

const createRealNode = <Ctx extends AnyContext>(
  node: VNodeInternal<Ctx>,
  context: Ctx
): HTMLElement | Text | null => {
  // empty
  if (isEmptyValue(node)) {
    return null;
  }
  // TextNode
  if (isTextVNode(node)) {
    return document.createTextNode(node.children);
  }

  // TagName
  if (isTagVNodeInternal(node)) {
    const { component, props } = node;
    const element = document.createElement(component);
    // NOTE: other props are treated as html attrs
    updateAttribute(element, props);
    return element;
  }

  const { component, props } = node;
  return createRealNode(
    convertVNodeInternal(component(props, context)),
    context
  );
};

/* ----------
/* 差分検知
/* ----------*/
type Diff = 'VNODE_TYPE' | 'TAG' | 'PROPS' | 'TEXT';

const isTextVNode = (value: VNodeInternal<AnyContext>): value is TextVNode =>
  value?.component === NODE_TYPE_TEXT;

const DIFF_DETECTOR_MAP: Record<
  Diff,
  <Ctx extends AnyContext>(
    current: VNodeInternal<Ctx>,
    next: VNodeInternal<Ctx>
  ) => boolean
> = {
  VNODE_TYPE: (current, next) =>
    typeof current.component !== typeof next.component,
  // TextNodeの中身
  TEXT: (current, next) =>
    isTextVNode(current) &&
    isTextVNode(next) &&
    current.children !== next.children,
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
  (RE_PATTRN_EVENT_HANDLER.exec(key) || [])[1]?.toLowerCase();

type NodeTransitionParams<Ctx extends AnyContext, VN> = {
  current: VN | undefined;
  next: VN | undefined;
};

type VNodeUpdater = <Ctx extends AnyContext>(
  args: NodeTransitionParams<Ctx, AnyNode<Ctx>>
) => void;
type VNodeInternalUpdater = <Ctx extends AnyContext>(
  args: NodeTransitionParams<Ctx, VNodeInternal<Ctx>>
) => void;

const replaceElement: VNodeInternalUpdater = ({ current, next }) =>
  current.$el.parentNode.replaceChild(
    next.$el,
    current.$el
  );

const updateAttributes: VNodeInternalUpdater = ({ current, next }) => {
  if (isTextVNode(current) || isTextVNode(next)) {
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

const DIFF_UPDATER_MAP: Record<Diff, VNodeInternalUpdater> = {
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
    console.log({ eventName, attrKey });
    eventName === undefined
      ? element.setAttribute(attrKey, value as string)
      : element.addEventListener(eventName, value as EventListener);
  });
};

type VNodeCompareFunction = <Ctx extends AnyContext>(
  args: NodeTransitionParams<Ctx, VNodeInternal<Ctx>>
) => Diff | undefined;
const detectDiff: VNodeCompareFunction = ({ current, next }) =>
  (['VNODE_TYPE', 'TEXT', 'TAG', 'PROPS'] as Diff[]).find((diff) =>
    DIFF_DETECTOR_MAP[diff](current, next)
  );

const _updateVNodeTree: VNodeInternalUpdater = ({ current, next }) => {
  if (!isEmptyValue(current) && isEmptyValue(next)) {
    current.$el.parentElement.removeChild(current.$el);
    return;
  }
  if (isEmptyValue(current) && !isEmptyValue(next)) {
    next.$el.parentElement.appendChild(next.$el);
    return;
  }

  const diff = detectDiff({ current, next });
  if (diff === undefined) {
    next.$el = current.$el;
  } else {
    DIFF_UPDATER_MAP[diff]({ current, next });
  }

  // NOTE: diff === 'TEXT' だと型わからんので
  if (isTextVNode(current) || isTextVNode(next)) {
    return;
  }

  const { children } =
    current.children?.length > next.children?.length ? current : next;

  children.forEach((_, index) => {
    const _current = !isEmptyValue(current.children[index])
      ? current.children[index]
      : undefined;
    const _next = !isEmptyValue(next.children[index])
      ? next.children[index]
      : undefined;

    _updateVNodeTree({
      current: _current,
      next: _next,
    });
  });
};

// external APIs
export const mount = <Ctx extends AnyContext>(
  context: Ctx,
  root: AnyNode<Ctx>,
  container: HTMLElement
): void => {
  const vnode = convertVNodeInternal(root);
  mountVNodeInternal(container, vnode, context);
  container.appendChild(vnode.$el);
};

// NOTE: update recursively
export const updateVNodeTree: VNodeUpdater = ({
  current,
  next,
}): void => {
  _updateVNodeTree({
    current: convertVNodeInternal(current),
    next: convertVNodeInternal(next),
  });
};
