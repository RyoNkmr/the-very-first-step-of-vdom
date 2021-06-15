import { createElement, createMutation, createStore } from "./index";
import type { Store, Mutation, State } from "./index";

const state = {
  count: 0,
};

const mutation = createMutation(state, {
  increment: (state) => ({ count: state.count + 1 }),
  decrement: (state) => ({ count: state.count - 1 }),
  add: (state, value: number) => ({ count: state.count + value }),
});

const store = createStore(state, mutation);

const BigButton = ({ children, ...rest }) => (
  <button style={{ fontSize: "30px" }} {...rest}>
    {children}
  </button>
);

const HelloComponent = ({ store }) => {
  return (
    <section>
      <h1>Hello World from {count}</h1>
      <BigButton onClick={() => store.increment()}>+</BigButton>
      <BigButton onClick={() => store.decrement()}>-</BigButton>
    </section>
  );
};

render(<Hello />, document.getElementById("app"));
