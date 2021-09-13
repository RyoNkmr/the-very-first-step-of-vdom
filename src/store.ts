type Immutable<T> = T extends object ? ImmutableObject<T> : Readonly<T>;
type ImmutableObject<T> = {
  readonly [P in keyof T]: Immutable<T[P]>;
};

export type MutationType<S> = {
  [K: string]: (state: Readonly<S>, payload: any) => S;
};
type Mutation<M = {}> = M & { _mutationBrand: never };
type CommitObserver = () => void;

export class Store<S extends object, M extends MutationType<S>> {
  private _state: S;
  private readonly _mutation: M;
  private _getter: S;
  private _commitObserver: CommitObserver = () => {}

  public constructor(state: S, mutation: M) {
    this._state = state;
    this._mutation = Object.entries(mutation).reduce((accmulator, [key, callback]) => ({
      ...accmulator,
      [key]: (...args: Parameters<typeof callback>) => {
        this.dispatchCommitObserver()
        callback(...args);
      },
    }), {} as M);
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

  private dispatchCommitObserver = (): void => this._commitObserver();

  // for internal
  public registerCommitObserver(callback: CommitObserver): void {
    this._commitObserver = callback;
  }

  public get commit(): Omit<M, '_mutationBrand'> {
    return this._mutation as any;
  }

  public get getter(): Immutable<S> {
    return this._getter as any;
  }

  public next(state: S): Store<S, M> {
    this._state = state;
    return this;
  }
}

export const createMutation = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Mutation<M> => mutation as Mutation<M>;

export const createStore = <S extends object, M extends MutationType<S>>(
  state: S,
  mutation: M
): Store<S, M> => new Store(state, mutation);
