import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { database } from './models/index.js';

const port = Number(process.env.PORT ?? 3010);
type DeviceRole = 'host'|'display'|'buzzer'|'blue_button'|'red_button';
type Room = { code: string; devices: Map<string, { role: DeviceRole; connectedAt: number }>; state: Record<string, unknown>; buzzerWinner?: 'blue'|'red' };
const rooms = new Map<string, Room>();
const app = express();
app.use(helmet()); app.use(cors({ origin: process.env.APP_ORIGIN ?? 'http://localhost:5174' })); app.use(express.json());
app.get('/health', (_req,res)=>res.json({ ok:true, service:'people-says' }));
app.post('/api/rooms', (req,res)=>{
  const modes = new Set(['classic','stage','buttons','auto']);
  const mode = typeof req.body?.mode === 'string' && modes.has(req.body.mode) ? req.body.mode : 'classic';
  let code = '';
  do { code = Math.random().toString(36).slice(2,7).toUpperCase(); } while (rooms.has(code));
  rooms.set(code, { code, devices:new Map(), state:{ phase:'lobby', mode, round:0, revealed:[], strikes:{ blue:0, red:0 } } });
  res.status(201).json({ code, mode, name:req.body?.name ?? null });
});
app.get('/api/rooms/:code', (req,res)=>{ const room=rooms.get(req.params.code.toUpperCase()); if(!room) return res.status(404).json({ error:'room_not_found' }); return res.json({ code:room.code, state:room.state, devices:[...room.devices.values()] }); });
const server = createServer(app);
const io = new Server(server, { cors: { origin: process.env.APP_ORIGIN ?? 'http://localhost:5174' } });
io.on('connection', socket => {
  socket.on('room:join', ({ code, role }:{ code:string; role:DeviceRole })=>{
    const normalized=code.toUpperCase(); const room=rooms.get(normalized);
    if(!room || room.devices.size>=4) return socket.emit('room:error', { error:room?'room_full':'room_not_found' });
    if(!['host','display','buzzer','blue_button','red_button'].includes(role)) return socket.emit('room:error',{ error:'invalid_role' });
    room.devices.set(socket.id,{ role, connectedAt:Date.now() }); socket.join(normalized); socket.data.room=normalized; socket.emit('room:state',{ code:normalized, state:room.state }); io.to(normalized).emit('room:presence',{ devices:[...room.devices.values()] });
  });
  socket.on('room:event', ({ code, event }:{code:string;event:{type:string;[key:string]:unknown}})=>{
    const normalized=code.toUpperCase(); const room=rooms.get(normalized); if(!room || !event || typeof event.type!=='string') return;
    if(event.type==='buzzer:press') {
      const team = event.team === 'blue' || event.team === 'red' ? event.team : null;
      if(!team || room.buzzerWinner) return socket.emit('room:event',{ type:'buzzer:locked', winner:room.buzzerWinner });
      room.buzzerWinner=team; return io.to(normalized).emit('room:event',{ type:'buzzer:winner', winner:team });
    }
    if(event.type==='buzzer:reset') { room.buzzerWinner=undefined; return io.to(normalized).emit('room:event',{ type:'buzzer:reset' }); }
    if(event.type==='room:assign' && typeof event.deviceId==='string' && ['display','blue_button','red_button'].includes(String(event.role))) {
      const device=room.devices.get(event.deviceId); if(device) device.role=event.role as DeviceRole;
      return io.to(normalized).emit('room:presence',{ devices:[...room.devices.values()] });
    }
    if(event.type==='answer:reveal' && Number.isInteger(event.index)) {
      const revealed = Array.isArray(room.state.revealed) ? room.state.revealed as number[] : [];
      if(!revealed.includes(event.index as number)) room.state = { ...room.state, revealed:[...revealed,event.index] };
    }
    if(event.type==='strike' && (event.team === 'blue' || event.team === 'red')) {
      const strikes = { ...(room.state.strikes as Record<string, number> ?? {}), [event.team]:Number(event.count ?? 0) };
      room.state = { ...room.state, strikes };
    }
    if(event.type==='game:state') room.state=event.state as Record<string, unknown>;
    io.to(normalized).emit('room:event', event);
  });
  socket.on('disconnect',()=>{ const code=socket.data.room as string|undefined; const room=code?rooms.get(code):undefined; if(room){ room.devices.delete(socket.id); io.to(code!).emit('room:presence',{ devices:[...room.devices.values()] }); } });
});
database.authenticate().then(()=>server.listen(port,()=>console.log(`People Says API en http://localhost:${port}`))).catch(error=>{ console.error(error); process.exitCode=1; });
