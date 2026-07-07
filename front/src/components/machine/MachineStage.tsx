import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { forwardRef, useImperativeHandle, useRef } from 'react'

import type { GashaponMachineHandle } from './type/GashaponMachine'
import { GashaponMachine } from './type/GashaponMachine'

export type MachineStageHandle = {
  startAnimation: () => Promise<void>
}

export const MachineStage = forwardRef<MachineStageHandle, object>((_, ref) => {
  const machineRef = useRef<GashaponMachineHandle>(null)

  useImperativeHandle(ref, () => ({
    async startAnimation() {
      if (!machineRef.current) {
        return
      }
      await machineRef.current.startAnimation()
    },
  }))

  return (
    <Canvas
      camera={{ position: [0, 0.1, 3.5], fov: 38 }}
      shadows
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-3, 3, 3]} intensity={0.6} color="#f59e0b" />
      <GashaponMachine ref={machineRef} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        target={[0, 0.05, 0]}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.7}
      />
      <Environment preset="city" />
    </Canvas>
  )
})

MachineStage.displayName = 'MachineStage'
