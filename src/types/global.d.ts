type Nullable<T> = T | null | undefined;

type Optional<T> = T | undefined;

namespace NodeJS {
  interface ProcessEnv {
    BABEL_ENV: Optional<string>;
  }
}
