'use client';
import { io, Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error('socket-client must run in browser');
  }
  if (!_socket) {
    _socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
  }
  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
