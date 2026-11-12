export interface AnswerAttributes { id:number; questionId:number; text:string; votes:number; position:number; createdAt:Date; updatedAt:Date; }
export interface AnswerCreationAttributes { questionId:number; text:string; votes:number; position:number; }
