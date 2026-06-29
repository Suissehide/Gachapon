import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { forwardRef, useImperativeHandle, useRef } from 'react'

import { GashaponMachine } from './type/GashaponMachine'
import type { GashaponMachineHandle } from './type/GashaponMachine'

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
      camera={{ position: [0, 0.3, 6.5], fov: 45 }}
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
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.7}
      />
      <Environment preset="city" />
    </Canvas>
  )
})

MachineStage.displayName = 'MachineStage'
