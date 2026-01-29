// ============================================================================
// PROMPTS INDEX
// Central re-export of all prompt modules for easy importing
// ============================================================================


// Learning Mode Prompts
export {
    CONCEPT_EXTRACTION_PROMPTS,
    SOCRATIC_TUTOR_PROMPTS,
    INTRODUCTION_PROMPTS,
    STEP_BY_STEP_SOLUTION_PROMPTS,
    getConceptExtractionPrompt,
    getSocraticTutorPrompt,
    getIntroductionPrompt,
    getStepByStepSolutionPrompt
} from './learningPrompts';

// Lesson Mode Prompts
export {
    LESSON_PLAN_PROMPTS,
    LESSON_CONTENT_PROMPTS,
    getLessonPlanPrompt,
    getLessonContentPrompt
} from './lessonPrompts';

// Workbook Mode Prompts
export {
    EXERCISE_GENERATION_PROMPTS,
    SOLUTION_GENERATION_PROMPTS,
    getExerciseGenerationPrompt,
    getSolutionGenerationPrompt
} from './workbookPrompts';

// Challenge Mode Prompts
export {
    CHALLENGE_GENERATION_PROMPTS,
    CHALLENGE_INTERVIEW_PROMPTS,
    CHALLENGE_HINT_PROMPT,
    CHALLENGE_SOLUTION_PROMPT,
    CHALLENGE_SAVE_PROMPT,
    CUSTOM_CHALLENGE_GENERATION_PROMPTS,
    getChallengeGenerationPrompt,
    getChallengeInterviewPrompt,
    getChallengeHintPrompt,
    getChallengeSolutionPrompt,
    getChallengeSavePrompt,
    getCustomChallengeGenerationPrompt
} from './challengePrompts';

// Interview Mode Prompts
export {
    INTERVIEW_QUESTIONS_PROMPT,
    INTERVIEW_FOLLOW_UP_PROMPT,
    INTERVIEW_EVALUATION_PROMPT,
    INTERVIEW_FINAL_VERDICT_PROMPT,
    getInterviewQuestionsPrompt,
    getInterviewFollowUpPrompt,
    getInterviewEvaluationPrompt,
    getInterviewFinalVerdictPrompt
} from './interviewPrompts';

// Concept Definition Prompts
export {
    CONCEPT_DEFINITION_PROMPTS,
    getConceptDefinitionPrompt
} from './conceptDefinitionPrompts';

// Pair Programming Mode Prompts
export {
    PAIR_PROGRAMMING_METHODOLOGY,
    DATA_ENGINEERING_CHALLENGE_PROMPT,
    COMPUTING_CHALLENGE_PROMPT,
    NAVIGATOR_INTERACTION_PROMPT,
    FULL_SOLUTION_PROMPT,
    getDataEngineeringChallengePrompt,
    getComputingChallengePrompt,
    getNavigatorInteractionPrompt,
    getFullSolutionPrompt
} from './pairProgrammingPrompts';
