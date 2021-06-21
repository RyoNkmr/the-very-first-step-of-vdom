// ----------
// Nodeの定義
// ----------
type EmptyNode = null | undefined | false;
type Children = children: Array<EmptyNode | NodeType>
type TextNode = string

// --------------------
// VDOMの構成要素
// こいつが一番大事
// --------------------
type VNode<P> = (P & {
  tag: string
  children: Children
}) | TextNode

// よくある Attr
type Attributes = {
  className?: string
  style?: string
}
export type FunctionComponent<P = {}> = (props: Attributes & P): VNode<P>

// e.g. 'div' | () => <p />hoge<p />
type NodeType<P> = TagName | FunctionComponent<P>

// https://ja.reactjs.org/docs/react-api.html#createelement
export const createElement = <P>(type: NodeType<P>, _props?: P & Attributes, ..._children?: Children): VNode<P> => {
  const props = _props ?? {}
  const children = _children ?? []

  if (typeof type === 'function') {
    // TODO: ここを実装してもらう
    return type({...props, children})
  }

  // TODO: ここを実装してもらう
  return {
    ...(props ?? {})
    tag: type,
    children,
  }
}

// ----------
// 差分検知
// ----------
type Diff = 'NONE' | 'VNODE' | 'TAG' | 'PROPS'



// ----------
// 差分更新
// ----------
