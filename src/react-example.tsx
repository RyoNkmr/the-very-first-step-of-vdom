import React, { useState, useCallback } from "react";
import { render } from "react-dom";

const BigButton: React.FC = ({ children, ...rest }) => (
  <button style={{ fontSize: "30px" }} {...rest}>
    {children}
  </button>
);

const HelloComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => {
    setCount(count + 1);
  }, [count, setCount]);
  const decrement = useCallback(() => {
    setCount(count - 1);
  }, [count, setCount]);

  return (
    <section>
      <h1>Hello World from {count}</h1>
      <BigButton onClick={increment}>+</BigButton>
      <BigButton onClick={decrement}>-</BigButton>
    </section>
  );
};

render(<HelloComponent />, document.getElementById("app"));
