export type MutationType<S> = {
  [K: string]: (state: Readonly<S>, payload: any) => S;
};
type Mutation<M = {}> = M & { _mutationBrand: never };

export type Store<S, M> = {
  state: S;
  mutation: M;
};

export const createMutation = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Mutation<M> => mutation as Mutation<M>;
export const createStore = <S extends object, M extends Mutation>(
  state: S,
  mutation: M
): Store<S, M> => ({
  state,
  mutation,
});

export const createMutation = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Mutation<M> => mutation as Mutaiton<M>;

export const createStore = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Store<S, M> => ({
  state,
  mutation,
});
