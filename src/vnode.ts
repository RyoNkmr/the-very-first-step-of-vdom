type TagName = string

type VNode = {
  className?: string
  style?: string
  children: VNode[]
}

type FC<P = {}> = (props: FCProps & P): VNode

type NodeType = VNode | TagName | 

export const createElement = (): VNode

