import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useDirectoryStore, type DirectoryEvent } from '@/stores/directory-store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5151';

export function useDirectoryLive() {
  const setConnected = useDirectoryStore((state) => state.setConnected);
  const setSnapshot = useDirectoryStore((state) => state.setSnapshot);
  const applyEvent = useDirectoryStore((state) => state.applyEvent);

  useEffect(() => {
    let socket: Socket | undefined;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      socket = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        withCredentials: true,
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.on('directory:snapshot', (snapshot) => setSnapshot(snapshot));
      socket.on('directory:event', (event: DirectoryEvent) => applyEvent(event));
    };

    connect();
    return () => {
      disposed = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      setConnected(false);
    };
  }, [applyEvent, setConnected, setSnapshot]);
}