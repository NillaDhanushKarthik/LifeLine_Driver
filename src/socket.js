import { io } from 'socket.io-client';
import { API_URL } from './config';
// Same JWT handshake the backend expects: socket.handshake.auth.token
export const connectSocket = (token) => io(API_URL, { auth: { token }, transports: ['websocket'], reconnection: true, reconnectionDelayMax: 4000 });
