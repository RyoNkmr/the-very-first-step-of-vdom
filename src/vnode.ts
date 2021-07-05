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

const NODE_TYPE_TEXT = Symbol('TextNode') as const;

export type FunctionComponent<P = {}> = (props: Attributes & P) => VNode<P>
// e.g. 'div' | () => <p />hoge<p />
type TagName = string
type TextNode = string
type Children = Array<EmptyNode | VNode<FunctionComponent | TagName, unknown>>

type VNodeComponent<C extends FunctionComponent<P> | TagName, P = {}> = {
  component: C
  props: P & Attributes
  children: Children
  $el: Node | undefined
}
type VNodeTextNode = {
  component: symbol
  props: undefined
  children: string // 本文
  $el: Node | undefined
}

type VNode<C extends FunctionComponent<P> | TagName, P = {}> = VNodeComponent<C, P> | VNodeTextNode

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

const DIFF_DETECTOR_MAP: Record<Diff, <C extends FunctionComponent<Props> | TagName, Props>(current: VNode<C, Props>, next: VNode<C, Props>) => boolean> = {
  // Component or TextNode
  VNODE_TYPE: (current, next) => typeof current.component !== typeof next.component,
  // TextNodeの中身
  TEXT: (current, next) => [current, next].every(vnode => vnode.component === NODE_TYPE_TEXT) && typeof current.children !== typeof next.children,
  TAG:  (current, next) =>  current.$el?.nodeName !== next.$el?.nodeName,
  PROPS: (current, next) => JSON.stringify(current.props) !== JSON.stringify(next.props),
}

// ----------
// 差分更新
// ----------
type RealNodeUpdaterArgs<C extends FunctionComponent<Props> | TagName, Props = {}> = {
  parentElement: HTMLElement
  vnode: VNode<C, Props>
  nextVNode: VNode<C, Props>
}

type RealNodeUpdater = (DOMUpdaterArgs) => void
const replaceElement: DOMUpdater = ({ parentElement, currentElement, })

const DIFF_UPDATER_MAP: Record<Diff, (RealNodeUpdaterArgs) => void> = {
  NODE:
  TAG:
  PROPS:
}

// ----------
// 差分に限定しない vnode to real node
// ----------
type HTMLElementEvent<El extends HTMLElement> = Event & {target: El}
type EventHandler = <El extends >(event: HTMLElementEvent<>) => void

const parseHandlingEventName = (key: string): string | undefined => {
const [, eventName] = /^on(\w+)$/.exec(key) || []
  return eventName
}

const updateAttribute = <El extends HTMLElement, Attrs extends Record<string, string | EventHandler<El>>>(element: El, attributes: Attrs): void =>
  Object.entries(attributes).forEach(([attrKey, value]) => {
    const eventName = parseHandlingEventName(attrKey)
    eventName === undefined
      ? element.setAttribute(attribute, value as string)
      : element.addEventListener(eventName, value as EventListener)
  })

const createRealElement = <P>(node: VNode<P> | TextNode): HTMLElement | string => {
  if (typeof node === string) {
    return document.createTextNode(node)
  }

  const { tag, children, ...props } = vnode
  const element = document.createElement(nodeName)
  // NOTE: other props are treated as html attrs
  updateAttribute(element, props)

  if (children.length === 0) {
    return element
  }

  const childrenElements = children.reduce(
    <CP>(fragment, childVNodes: VNode<CP> | TextNode) =>
    fragment.appendChild(createRealElement(childVNodes)) && fragment,
    document.createDocumentFragment()
  )
  element.appendChild(childrenElements)
  return element
}

// NOTE: update recursively
export const updateTree: RealNodeUpdater = ({ parentElement, realNode vNode, nextVNode }) => {

}
