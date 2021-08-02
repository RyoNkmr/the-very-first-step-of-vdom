// ----------
// Nodeの定義

import { Component, VoidFunctionComponent } from "react";

// ----------
type EmptyNode = null | undefined | false;

// よくある Attr
type Attributes = {
  className?: string
  style?: string
}

// --------------------
// VDOMの構成要素
// こいつが一番大事
// --------------------

const NODE_TYPE_TEXT = Symbol('TextNode');

export type FunctionComponent<P = {}> = (props: Attributes & P) => VNode<FunctionComponent<P>, P>
// e.g. 'div' | () => <p />hoge<p />
type TagName = string
type Child = VNode<FunctionComponent | TagName, unknown>
type Children = Child[]

type VNodeComponent<C extends FunctionComponent<P> | TagName, P = {}> = {
  component: C
  props: P & Attributes
  children: Children
  $el: HTMLElement
}
type VNodeTextNode = {
  component: symbol
  props: undefined
  children: string // 本文
  $el: Text
}

type VNode<C extends FunctionComponent<P> | TagName, P = {}> = VNodeComponent<C, P> | VNodeTextNode | EmptyNode
type VNodeInstance<C extends FunctionComponent<P> | TagName, P = {}> = Exclude<VNode<C, P>, EmptyNode>

const isEmptyNode = (vnode: VNode<any>): vnode is EmptyNode => vnode === null || vnode === undefined || vnode === false
const isVNodeInstance = <C extends FunctionComponent<P> | TagName, P>(vnode: VNode<C, P>): vnode is VNodeInstance<C, P> => !isEmptyNode(vnode)
const isVNodeComponent = <C extends FunctionComponent<P> | TagName, P>(vnode: VNode<C, P>): vnode is VNodeComponent<C, P> => !isEmptyNode(vnode) && typeof vnode.children !== 'string'
const isVNodeTextNode = (vnode: VNode<any>): vnode is VNodeTextNode => !isEmptyNode(vnode) && vnode.component === NODE_TYPE_TEXT

// const isTagName = <Props>(component: FunctionComponent<Props> | TagName): component is TagName => typeof component === 'string'

// https://ja.reactjs.org/docs/react-api.html#createelement
type CreateElement = {
  <Props>(component: FunctionComponent<Props>, props?: Props & Attributes, ...children?: Children): VNodeComponent<FunctionComponent<Props>, Props>;
  <Props>(component: TagName, props?: Props & Attributes, ...children?: Children): VNodeComponent<TagName, Props>;
}
export const createElement: CreateElement = <Props>(component: FunctionComponent<Props> | TagName, props?: Props & Attributes, ...children?: Children): any => { 
  return {
    component,
    props: props ?? ({} as Props),
    children,
    $el: undefined,
  }
}

/* ----------
/* 差分検知
/* ----------*/
type Diff = 'VNODE_TYPE' | 'TAG' | 'PROPS' | 'TEXT'

const DIFF_DETECTOR_MAP: Record<Diff, <C extends FunctionComponent<Props> | TagName, Props>(current: VNodeInstance<C, Props>, next: VNodeInstance<C, Props>) => boolean> = {
  // Component or TextNode
  VNODE_TYPE: (current, next) => typeof current.component !== typeof next.component,
  // TextNodeの中身
  TEXT: (current, next) => isVNodeTextNode(current) && isVNodeTextNode(next) && typeof current.children !== typeof next.children,
  TAG:  (current, next) =>  current.$el?.nodeName !== next.$el?.nodeName,
  PROPS: (current, next) => JSON.stringify(current.props) !== JSON.stringify(next.props),
}

/* ----------
/* 差分更新
/* ----------*/
const RE_PATTRN_EVENT_HANDLER = /^on(\w+)$/
const isEventHandlerKey = (key: string): boolean => RE_PATTRN_EVENT_HANDLER.test(key)
const parseHandlingEventName = (key: string): string | undefined => (RE_PATTRN_EVENT_HANDLER.exec(key) || [])[1]

type NodeTransitionParams<VN extends VNode<any, any>> = {
  current: VN
  next: VN
}

type VNodeUpdater = <C extends FunctionComponent<Props> | TagName, Props>(args: NodeTransitionParams<VNodeInstance<C, Props>>) => void;
type VNodeTreeUpdater = <C extends FunctionComponent<Props> | TagName, Props>(args: NodeTransitionParams<VNode<C, Props>>) => void;

const replaceElement: VNodeUpdater = ({ current, next }) => 
  current.$el.parentNode.replaceChild(createRealNode(next), current.$el)

const updateAttributes: VNodeUpdater = ({ current, next }) => {
  if(!isVNodeComponent(current) || !isVNodeComponent(next)) {
    console.warn('ミスってる')
    return
  }
  // removed
  Object.keys(current.props).forEach(
      attributeName => {
        if (isEventHandlerKey(attributeName) || next.props.hasOwnProperty(attributeName)) {
          return
        }
      current.$el.removeAttribute(attributeName)
      }
    )

  // updated
  Object.keys(next.props)
    .forEach(attributeName => {
      if (isEventHandlerKey(attributeName)) {
        return
      }
      current.$el.setAttribute(attributeName, next.props[attributeName])
    })
}

const DIFF_UPDATER_MAP: Record<Diff, VNodeUpdater> = {
  VNODE_TYPE: replaceElement,
  TEXT: updateAttributes,
  TAG: replaceElement,
  PROPS: updateAttributes,
}

// ----------
// 差分に限定しない vnode to real node
// ----------
type HTMLElementEvent<El extends HTMLElement> = Event & {target: El}
type EventHandler = <El extends HTMLElement>(event: HTMLElementEvent<El>) => void

const updateAttribute = <El extends HTMLElement, Attrs extends Record<string, string | EventHandler>>(element: El, attributes: Attrs): void =>
  Object.entries(attributes).forEach(([attrKey, value]) => {
    const eventName = parseHandlingEventName(attrKey)
    eventName === undefined
      ? element.setAttribute(attrKey, value as string)
      : element.addEventListener(eventName, value as EventListener)
  })

const createRealNode = <C extends TagName | FunctionComponent<P>, P>(node: VNodeInstance<C, P>): Node | undefined => {
  // TextNode
  if (isVNodeTextNode(node)) {
    return document.createTextNode(node.children)
  }

  const { component, children, props } = node

  // component
  if (typeof component === 'function') {
    const rendered = component(props)
    return !isEmptyNode(rendered) ? createRealNode(rendered) : undefined
  }

  // TagName
  const element = document.createElement(component)
  // NOTE: other props are treated as html attrs
  updateAttribute(element, props)

  if (children.length === 0) {
    return element
  }

  const childrenElements = children.reduce((fragment, child: Child) => {
    if (isEmptyNode(child)) {
      return fragment
    }
    fragment.appendChild(createRealNode(child))
    return fragment
  },
    document.createDocumentFragment()
  )
  element.appendChild(childrenElements)
  return element
}

type VNodeCompareFunction = <C extends FunctionComponent<Props> | TagName, Props>(args: NodeTransitionParams<VNodeInstance<C, Props>>) => Diff | undefined;
const detectDiff: VNodeCompareFunction = ({ current, next }) =>
  (['VNODE_TYPE', 'TEXT', 'TAG', 'PROPS'] as Diff[]).find(diff => DIFF_DETECTOR_MAP[diff](current, next))

// NOTE: update recursively
export const updateVNodeTree: VNodeTreeUpdater = ({ current, next }) => {
  if (isEmptyNode(current) || isEmptyNode(next)) {
    if (isVNodeInstance(current)) {
      current.$el.parentElement.removeChild(current.$el)
      return
    }
    if (isVNodeInstance(next)) {
      next.$el.parentElement.appendChild(createRealNode(next))
      return
    }
    return
  }

  const diff = detectDiff({current, next})
  if (diff !== undefined) {
    DIFF_UPDATER_MAP[diff]({current, next})
  }

  const children = current.children.length > next.children.length ? current
}
