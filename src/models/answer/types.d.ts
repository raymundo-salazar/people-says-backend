export interface AnswerAttributes { id:number; questionId:number; text:string; points:number; position:number; createdAt:Date; updatedAt:Date; }
export interface AnswerCreationAttributes { questionId:number; text:string; points:number; position:number; }
