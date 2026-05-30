/// <reference types="vite/client" />

// Ensure react-three-fiber's JSX intrinsic elements (e.g. <mesh/>, <spotLight/>)
// are augmented into the global JSX namespace under React 19 / R3F v9.
import type {} from '@react-three/fiber'
