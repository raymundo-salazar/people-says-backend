export interface TeamAttributes { id:number; gameId:number|null; name:string; color:'blue'|'red'; createdAt:Date; updatedAt:Date; }
export interface TeamCreationAttributes { gameId?:number|null; name:string; color:'blue'|'red'; }
