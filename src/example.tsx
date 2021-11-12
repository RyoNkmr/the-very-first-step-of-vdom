import { h, createMutation, createStore, render } from "./index";
import type { FC } from "./index";

const state = {
  count: 0,
};

const mutation = createMutation(state, {
  increment: (state) => ({ count: state.count + 1 }),
  decrement: (state) => ({ count: state.count - 1 }),
  add: (state, value: number) => ({ count: state.count + value }),
});

const store = createStore(state, mutation);
const context = { store } as const

type Context = typeof context

type BigButtonProps = {
  size: number
}

const BigButton: FC<Context, BigButtonProps> = ({ size, children, ...rest }) => (
  <button style={`font-size: '${size}px'`} {...rest}>
    {children}
  </button>
);


const HelloComponent: FC<Context> = (_, { store }) => {
  const { commit, getter } = store;
  return (
    <section>
      <h1>Hello World from {getter.count}</h1>
      <BigButton size={30} onClick={() => commit.add(getter.count)}>*2</BigButton>
      <BigButton size={30} onClick={() => commit.increment()}>+</BigButton>
      <BigButton size={30} onClick={() => commit.decrement()}>-</BigButton>
    </section>
  );
};

render(HelloComponent, document.getElementById("app"), context);
