import { terser } from "rollup-plugin-terser";
import babel from '@rollup/plugin-babel';

export default {
  input: "src/bridge.js",
  output: {
    file: 'dist/bridge.min.js',
    name: 'Bridge',
    format: 'umd'
  },
  plugins: [babel({
    exclude: 'node_modules/**'
  }),terser()]
}