// 临时 React 类型声明文件
// 这个文件在安装依赖后可以删除

declare module 'react' {
  import * as React from 'react';
  export = React;
  export as namespace React;
}

declare module 'react-native' {
  export * from 'react-native';
}

// 基础 React 类型
declare namespace React {
  type ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> = {
    type: T;
    props: P;
    key: Key | null;
  };

  type ReactNode = ReactElement | string | number | ReactFragment | ReactPortal | boolean | null | undefined;

  type Key = string | number;

  type ReactFragment = {} & Iterable<ReactNode>;
  type ReactPortal = {} & ReactNode;

  type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null) | (new (props: P) => Component<any, any>);

  interface Component<P = {}, S = {}, SS = any> {
    render(): ReactNode;
  }

  interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement<any, any> | null;
  }

  type FC<P = {}> = FunctionComponent<P>;

  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useRef<T>(initialValue: T): { current: T };
  function useRef<T>(initialValue: T | null): { current: T | null };
  function useRef<T = undefined>(): { current: T | undefined };
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function memo<P extends object>(Component: FunctionComponent<P>): FunctionComponent<P>;

  const Fragment: FunctionComponent<{ children?: ReactNode }>;
}

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}