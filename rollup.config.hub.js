import { terser } from "rollup-plugin-terser";
import babel from '@rollup/plugin-babel';

export default {
  input: "src/hub.js",
  output: {
    file: 'dist/hub.min.js',
    name: 'Bridge',
    format: 'umd'
  },
  plugins: [babel({
    exclude: 'node_modules/**'
  }),terser()]
}