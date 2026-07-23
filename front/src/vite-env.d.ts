/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.glsl' {
  const shader: string
  export default shader
}
