export interface QuestionAttributes { id:number; prompt:string; region:string; answersCount:number; createdAt:Date; updatedAt:Date; }
export interface QuestionCreationAttributes { prompt:string; region?:string; answersCount:number; }
