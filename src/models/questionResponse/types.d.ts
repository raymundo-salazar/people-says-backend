export interface QuestionResponseAttributes {
  id: number
  questionId: number
  answerId: number | null
  gameId: number | null
  gameRoundId: number | null
  roundIndex: number | null
  teamId: number | null
  playerId: number | null
  submittedText: string
  isValid: boolean
  awardedPoints: number
  createdAt: Date
  updatedAt: Date
}
export interface QuestionResponseCreationAttributes {
  questionId: number
  answerId?: number | null
  gameId?: number | null
  gameRoundId?: number | null
  roundIndex?: number | null
  teamId?: number | null
  playerId?: number | null
  submittedText: string
  isValid: boolean
  awardedPoints: number
}
