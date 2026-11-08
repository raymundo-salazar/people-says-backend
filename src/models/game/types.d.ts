export interface GameAttributes { id:number; code:string; name:string|null; mode:'classic'|'stage'|'buttons'|'auto'; state:Record<string,unknown>; createdAt:Date; updatedAt:Date; }
export interface GameCreationAttributes { code:string; name?:string|null; mode:'classic'|'stage'|'buttons'|'auto'; state?:Record<string,unknown>; }
