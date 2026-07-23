import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import { useCanvasContextRecovery } from '../../hooks/useCanvasContextRecovery.ts'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.ts'
import type { GashaponMachineHandle } from './type/GashaponMachine'
import { GashaponMachine } from './type/GashaponMachine'

export type MachineStageHandle = {
  startAnimation: () => Promise<void>
}

// Position caméra pilotée par gsap pendant le tirage : dolly-in vers la
// trappe pendant que la machine crank + distribue, puis retour idle.
type CamAnim = {
  x: number
  y: number
  z: number
  tx: number
  ty: number
}

const CAM_IDLE: CamAnim = { x: 0, y: 0.1, z: 3.5, tx: 0, ty: 0.05 }
// Cadrage serré qui garde le globe (brassage) ET la trappe dans le champ
const CAM_CLOSE: CamAnim = { x: -0.18, y: 0.02, z: 2.65, tx: -0.08, ty: -0.12 }

function CameraRig({
  cam,
  active,
}: {
  cam: CamAnim
  active: React.RefObject<boolean>
}) {
  useFrame(({ camera }) => {
    if (!active.current) {
      return
    }
    camera.position.set(cam.x, cam.y, cam.z)
    camera.lookAt(cam.tx, cam.ty, 0)
  })
  return null
}

export const MachineStage = forwardRef<MachineStageHandle, object>((_, ref) => {
  const machineRef = useRef<GashaponMachineHandle>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { canvasKey, canvasRef } = useCanvasContextRecovery()
  const reduced = usePrefersReducedMotion()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  const cam = useMemo<CamAnim>(() => ({ ...CAM_IDLE }), [])
  const rigActive = useRef(false)

  useEffect(
    () => () => {
      gsap.killTweensOf(cam)
    },
    [cam],
  )

  useImperativeHandle(ref, () => ({
    async startAnimation() {
      if (!machineRef.current) {
        return
      }
      const controls = controlsRef.current
      // Dolly-in vers la trappe pendant la séquence — coupé si reduced motion
      if (!reducedRef.current) {
        if (controls) {
          controls.enabled = false
        }
        Object.assign(cam, CAM_IDLE)
        rigActive.current = true
        gsap.to(cam, {
          ...CAM_CLOSE,
          duration: 1.3,
          delay: 0.6,
          ease: 'power2.inOut',
        })
      }

      await machineRef.current.startAnimation()

      // Retour idle discret — l'overlay plein écran couvre la page juste
      // après, le retour sert au prochain passage en idle.
      if (rigActive.current) {
        gsap.to(cam, {
          ...CAM_IDLE,
          duration: 0.5,
          ease: 'power2.out',
          onComplete: () => {
            rigActive.current = false
            if (controls) {
              controls.enabled = true
            }
          },
        })
      }
    },
  }))

  return (
    <Canvas
      key={canvasKey}
      ref={canvasRef}
      camera={{ position: [CAM_IDLE.x, CAM_IDLE.y, CAM_IDLE.z], fov: 38 }}
      shadows
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-3, 3, 3]} intensity={0.6} color="#f59e0b" />
      <pointLight position={[2.5, -1, 3]} intensity={0.35} color="#8ea2ff" />
      <GashaponMachine ref={machineRef} />
      <CameraRig cam={cam} active={rigActive} />
      <OrbitControls
        ref={controlsRef}
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
