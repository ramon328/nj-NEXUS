import { useEffect, useRef } from 'react'

const COLORS = ['#00d4ff', '#00e676', '#ffc107', '#b39ddb']

export default function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let particles = []
    let W, H
    let g1, g2 // gradientes precalculados (solo cambian con el tamaño)
    let lastFrame = 0
    const FRAME_INTERVAL = 1000 / 30 // ~30fps: idéntico a la vista para partículas lentas
    const CONNECT_DIST = 100
    const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight

      g1 = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.7)
      g1.addColorStop(0, 'rgba(0,40,80,0.5)')
      g1.addColorStop(1, 'rgba(5,11,24,0)')

      g2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, W * 0.6)
      g2.addColorStop(0, 'rgba(80,0,100,0.3)')
      g2.addColorStop(1, 'rgba(5,11,24,0)')
    }

    function initParticles() {
      particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.4 + 0.1,
      }))
    }

    function draw(now) {
      animId = requestAnimationFrame(draw)
      if (now - lastFrame < FRAME_INTERVAL) return
      lastFrame = now

      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = g1
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, W, H)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      })

      // Todas las conexiones en un solo trazo: distancia al cuadrado (sin sqrt)
      // y alpha fijo en vez de un stroke() por línea.
      ctx.globalAlpha = 0.08
      ctx.strokeStyle = COLORS[0]
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          if (dx * dx + dy * dy < CONNECT_DIST_SQ) {
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
          }
        }
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const handleResize = () => { resize(); initParticles() }

    resize()
    initParticles()
    animId = requestAnimationFrame(draw)
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
