import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { jwtVerify } from 'jose'

const SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null

let io: SocketIOServer | null = null

async function verifySocketAuth(socket: Socket): Promise<{ userId: string; role: string } | null> {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token
    if (!token || !SECRET) return null
    const { payload } = await jwtVerify(token as string, SECRET)
    return payload as { userId: string; role: string }
  } catch {
    return null
  }
}

export function initWebSocket(httpServer: HTTPServer) {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'https://trait-rho.vercel.app',
      methods: ['GET', 'POST'],
    },
  })

  io.use(async (socket, next) => {
    const auth = await verifySocketAuth(socket)
    if (!auth) {
      return next(new Error('Authentication required'))
    }
    socket.data.userId = auth.userId
    socket.data.role = auth.role
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    if (userId) {
      socket.join(`user:${userId}`)
    }

    socket.on('join-user', (uid: string) => {
      if (uid === userId || socket.data.role === 'admin') {
        socket.join(`user:${uid}`)
      }
    })

    socket.on('disconnect', () => {})
  })

  return io
}

export function getIO(): SocketIOServer | null {
  return io
}

export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data)
  }
}

export function emitToAll(event: string, data: any) {
  if (io) {
    io.emit(event, data)
  }
}
