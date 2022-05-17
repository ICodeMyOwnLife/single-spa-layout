import babel, { RollupBabelInputPluginOptions } from "@rollup/plugin-babel";
import replace from "@rollup/plugin-replace";
import { resolve } from "node:path";
import { defineConfig, ModuleFormat } from "rollup";
import { terser } from "rollup-plugin-terser";
import ts from "rollup-plugin-ts";
import pkg from "./package.json";

const CWD = process.cwd();

const createConfig = ({
  format,
  mode,
}: {
  format: ModuleFormat;
  mode: "browser" | "server";
}) => {
  const inputFile =
    mode === "server"
      ? resolve(CWD, "src/server/index.ts")
      : resolve(CWD, "src/browser/index.ts");
  const outputFile = resolve(CWD, `dist/${format}/${mode}.js`);
  const babelOpts: RollupBabelInputPluginOptions =
    mode === "server"
      ? { babelHelpers: "bundled", envName: "server" }
      : { babelHelpers: "bundled" };

  return defineConfig({
    input: inputFile,
    output: {
      banner: `/*! ${pkg.name}/${mode}@${pkg.version} - ${format} format */`,
      file: outputFile,
      format,
      sourcemap: true,
    },
    external: ["merge2", /^node:*/, /^parse5.*/, "single-spa"],
    plugins: [
      ts({ tsconfig: resolve(CWD, "tsconfig.json") }),
      babel(babelOpts),
      replace({
        preventAssignment: true,
        values: {
          "process.env.BABEL_ENV": JSON.stringify("production"),
        },
      }),
      process.env["DEVELOPMENT"] !== "true" &&
        terser({ compress: { passes: 2 } }),
    ],
  });
};

export default [
  createConfig({ format: "esm", mode: "browser" }),
  createConfig({ format: "system", mode: "browser" }),
  createConfig({ format: "cjs", mode: "server" }),
  createConfig({ format: "esm", mode: "server" }),
];
