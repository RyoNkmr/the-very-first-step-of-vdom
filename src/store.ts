export type MutationType<S> = {
  [K: string]: (state: Readonly<S>, payload: any) => S;
};
type Mutation<M = {}> = M & { _mutationBrand: never };

export class Store<S extends object, M extends MutationType<S>> {
  private _state: S;
  private readonly _mutation: M;
  private _getter: S;

  public constructor(state: S, mutation: M) {
    this._state = state;
    this._mutation = mutation;
    this._getter = new Proxy(this._state, {
      get: (target, prop, receiver) => {
        if (!Object.prototype.hasOwnProperty.call(this._state, prop)) {
          console.warn(`${prop.toString()} is not a key of the state`);
          return undefined;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  public get commit(): Omit<M, "_mutationBrand"> {
    return this._mutation as any;
  }

  public get getter(): S {
    return this._getter;
  }
}

export const createMutation = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Mutation<M> => mutation as Mutaiton<M>;

export const createStore = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Store<S, M> => new Store(state, mutation);
