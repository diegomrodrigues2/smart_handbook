import { GoogleGenAI } from "@google/genai";
import { PairChallenge, PairSession, PairMessage, ProgrammingLanguage, SubjectMode } from "../types";
import { arrayBufferToBase64 } from "./pdfContentService";
import {
    getDataEngineeringChallengePrompt,
    getComputingChallengePrompt,
    getNavigatorInteractionPrompt,
    getFullSolutionPrompt
} from "./prompts";

// ============================================================================
// API CLIENT SETUP
// ============================================================================

const apiKey = process.env.API_KEY || '';
let client: GoogleGenAI | null = null;

const getClient = () => {
    if (!client && apiKey) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};

const MODEL_ID = "gemini-3-pro-preview";

// ============================================================================
// LANGUAGE TEMPLATES
// ============================================================================

const LANGUAGE_TEMPLATES: Record<ProgrammingLanguage, { name: string; template: string; comment: string }> = {
    python: {
        name: 'Python',
        template: `# ============================================================================
# [SYSTEM_NAME] - [Component]
# ============================================================================
# 
# Context: [Business problem description]
# Owner: team@company.com
# 
# Architecture Decisions:
# - [Decision 1]
# 
# Known Issues:
# - [Issue to discover]
# ============================================================================

from typing import Optional, Dict, List, Any
from dataclasses import dataclass
import logging
import time

logger = logging.getLogger(__name__)

@dataclass
class Config:
    """External configuration."""
    max_retries: int = 3
    timeout_ms: int = 5000

class Solution:
    """
    Main solution class.
    
    Example:
        >>> solution = Solution(Config())
        >>> result = solution.process(data)
    """
    
    def __init__(self, config: Config):
        self.config = config
        
    def process(self, data: Any) -> Any:
        """Process the input data."""
        logger.info("processing_started", extra={"data_size": len(str(data))})
        # TODO: Implement solution
        return None

# Example usage:
# if __name__ == "__main__":
#     solution = Solution(Config())
#     result = solution.process(input_data)
`,
        comment: '#'
    },
    java: {
        name: 'Java',
        template: `// ============================================================================
// [SYSTEM_NAME] - [Component]
// ============================================================================
// 
// Context: [Business problem description]
// Owner: team@company.com
// 
// Architecture Decisions:
// - [Decision 1]
// 
// Known Issues:
// - [Issue to discover]
// ============================================================================

import java.util.*;
import java.util.concurrent.locks.ReentrantLock;
import java.util.logging.Logger;

public class Solution {
    private static final Logger logger = Logger.getLogger(Solution.class.getName());
    
    private final Config config;
    private final ReentrantLock lock = new ReentrantLock();
    
    public Solution(Config config) {
        this.config = config;
    }
    
    public Object process(Object input) {
        logger.info("Processing started");
        // TODO: Implement solution
        return null;
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution(new Config());
        // Test here
    }
}

class Config {
    int maxRetries = 3;
    int timeoutMs = 5000;
}
`,
        comment: '//'
    },
    cpp: {
        name: 'C++',
        template: `// ============================================================================
// [SYSTEM_NAME] - [Component]
// ============================================================================
// 
// Context: [Business problem description]
// Owner: team@company.com
// ============================================================================

#include <iostream>
#include <vector>
#include <string>
#include <mutex>
#include <chrono>

class Solution {
private:
    std::mutex mtx;
    int maxRetries = 3;
    
public:
    void process() {
        std::lock_guard<std::mutex> lock(mtx);
        // TODO: Implement solution
    }
};

int main() {
    Solution solution;
    solution.process();
    return 0;
}
`,
        comment: '//'
    },
    typescript: {
        name: 'TypeScript',
        template: `// ============================================================================
// [SYSTEM_NAME] - [Component]
// ============================================================================
// 
// Context: [Business problem description]
// Owner: team@company.com
// ============================================================================

interface Config {
    maxRetries: number;
    timeoutMs: number;
}

class Solution {
    private config: Config;
    
    constructor(config: Config) {
        this.config = config;
    }
    
    process(input: any): any {
        console.log('Processing started', { dataSize: JSON.stringify(input).length });
        // TODO: Implement solution
        return null;
    }
}

// Example usage:
// const solution = new Solution({ maxRetries: 3, timeoutMs: 5000 });
// const result = solution.process(inputData);

export { Solution, Config };
`,
        comment: '//'
    },
    go: {
        name: 'Go',
        template: `// ============================================================================
// [SYSTEM_NAME] - [Component]
// ============================================================================
// 
// Context: [Business problem description]
// Owner: team@company.com
// ============================================================================

package main

import (
    "fmt"
    "log"
    "sync"
    "time"
)

type Config struct {
    MaxRetries int
    TimeoutMs  int
}

type Solution struct {
    config Config
    mu     sync.RWMutex
}

func NewSolution(config Config) *Solution {
    return &Solution{config: config}
}

func (s *Solution) Process(input interface{}) interface{} {
    log.Println("Processing started")
    // TODO: Implement solution
    return nil
}

func main() {
    solution := NewSolution(Config{MaxRetries: 3, TimeoutMs: 5000})
    _ = solution.Process("input")
    fmt.Println("Done")
}
`,
        comment: '//'
    },
    rust: {
        name: 'Rust',
        template: `// ============================================================================
// [SYSTEM_NAME] - [Component]
// ============================================================================
// 
// Context: [Business problem description]
// Owner: team@company.com
// ============================================================================

use std::sync::{Arc, Mutex};
use std::collections::HashMap;

struct Config {
    max_retries: u32,
    timeout_ms: u64,
}

struct Solution {
    config: Config,
    cache: Arc<Mutex<HashMap<String, String>>>,
}

impl Solution {
    fn new(config: Config) -> Self {
        Solution {
            config,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }
    
    fn process(&self, input: &str) -> String {
        println!("Processing started");
        // TODO: Implement solution
        String::new()
    }
}

fn main() {
    let solution = Solution::new(Config { max_retries: 3, timeout_ms: 5000 });
    let result = solution.process("input");
    println!("{}", result);
}
`,
        comment: '//'
    },
    sql: {
        name: 'SQL',
        template: `-- ============================================================================
-- [SYSTEM_NAME] - [Query/Report Name]
-- ============================================================================
-- 
-- Context: [Business problem description]
-- Owner: team@company.com
-- 
-- Expected Performance: [latency target, data volume]
-- 
-- Indexes Required:
-- - idx_table_column
-- 
-- Known Issues:
-- - [Issue to discover]
-- ============================================================================

-- CTE for data preparation
WITH base_data AS (
    SELECT 
        column1,
        column2,
        created_at
    FROM table_name
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
),

-- Aggregation
aggregated AS (
    SELECT 
        column1,
        COUNT(*) as record_count,
        SUM(column2) as total_value
    FROM base_data
    GROUP BY column1
)

-- Final output
SELECT 
    a.column1,
    a.record_count,
    a.total_value,
    LAG(a.total_value) OVER (ORDER BY a.column1) as prev_value
FROM aggregated a
ORDER BY a.total_value DESC;

-- EXPLAIN: Expected to use idx_table_created_at for date range filter
`,
        comment: '--'
    },
    pyspark: {
        name: 'PySpark',
        template: `# ============================================================================
# [SYSTEM_NAME] - [Pipeline/Job Name]
# ============================================================================
# 
# Context: [Business problem description]
# Owner: data-engineering@company.com
# 
# Data Volume: [expected volume per day]
# SLA: [processing time target]
# 
# Architecture Decisions:
# - [Decision 1]
# 
# Known Issues:
# - [Issue to discover]
# ============================================================================

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, sum, count, window, lag
from pyspark.sql.types import StructType, StructField, StringType, TimestampType, DoubleType
from pyspark.sql.window import Window
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Spark Session with production configs
spark = SparkSession.builder \\
    .appName("DataPipeline") \\
    .config("spark.sql.shuffle.partitions", "200") \\
    .config("spark.sql.adaptive.enabled", "true") \\
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \\
    .getOrCreate()

spark.sparkContext.setJobDescription("Main processing job")

# Define schema for input data
event_schema = StructType([
    StructField("event_id", StringType(), False),
    StructField("user_id", StringType(), False),
    StructField("event_type", StringType(), False),
    StructField("timestamp", TimestampType(), False),
    StructField("value", DoubleType(), True)
])

def process_data(input_path: str, output_path: str):
    """
    Process events data with transformations.
    
    Args:
        input_path: S3 path for input parquet files
        output_path: S3 path for output
    """
    logger.info(f"Starting processing from {input_path}")
    
    # Read with schema enforcement
    df = spark.read.schema(event_schema).parquet(input_path)
    
    # TODO: Add transformations
    
    # Write with intelligent partitioning
    df.write \\
        .format("parquet") \\
        .partitionBy("date") \\
        .mode("overwrite") \\
        .save(output_path)
    
    logger.info("Processing completed")

# Example usage:
# process_data("s3://bucket/input/", "s3://bucket/output/")
`,
        comment: '#'
    },
    scala: {
        name: 'Scala (Spark)',
        template: `// ============================================================================
// [SYSTEM_NAME] - [Pipeline/Job Name]
// ============================================================================
// 
// Context: [Business problem description]
// Owner: data-engineering@company.com
// 
// Data Volume: [expected volume per day]
// SLA: [processing time target]
// ============================================================================

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import org.slf4j.LoggerFactory

object DataPipeline {
  private val logger = LoggerFactory.getLogger(getClass)
  
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("DataPipeline")
      .config("spark.sql.shuffle.partitions", "200")
      .config("spark.sql.adaptive.enabled", "true")
      .getOrCreate()
    
    import spark.implicits._
    
    logger.info("Starting data processing")
    
    // TODO: Implement processing logic
    
    spark.stop()
  }
  
  def processData(spark: SparkSession, inputPath: String, outputPath: String): Unit = {
    import spark.implicits._
    
    val df = spark.read.parquet(inputPath)
    
    // Transformations here
    val result = df
      .filter($"value" > 0)
      .groupBy($"category")
      .agg(sum($"value").as("total"))
    
    result.write
      .partitionBy("date")
      .mode("overwrite")
      .parquet(outputPath)
  }
}
`,
        comment: '//'
    }
};

// ============================================================================
// CHALLENGE GENERATION
// ============================================================================

export const generatePairChallenges = async (
    noteContent: string,
    noteName: string,
    language: ProgrammingLanguage,
    subjectMode: SubjectMode = 'computing',
    pdfData?: ArrayBuffer
): Promise<PairChallenge[]> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return [];
    }

    const langName = LANGUAGE_TEMPLATES[language].name;

    // Select prompt based on mode - using the new prompts from prompts folder
    const isDataEngineering = subjectMode === 'data-engineering';
    const contentForPrompt = pdfData ? "[PDF ANEXADO - Analise o conteúdo do PDF]" : noteContent;

    const prompt = isDataEngineering
        ? getDataEngineeringChallengePrompt(contentForPrompt, noteName, langName)
        : getComputingChallengePrompt(contentForPrompt, noteName, langName);

    // Schema for challenge types based on mode
    const challengeTypes = isDataEngineering
        ? ["spark-job", "sql-query", "dynamodb"]
        : ["leetcode", "pseudocode"];

    const challengeSchema = {
        type: "object" as const,
        properties: {
            challenges: {
                type: "array" as const,
                items: {
                    type: "object" as const,
                    properties: {
                        id: { type: "string" as const, description: "Unique ID (e.g., challenge-001)" },
                        title: { type: "string" as const, description: "Descriptive title with business context" },
                        type: { type: "string" as const, enum: challengeTypes, description: "Type of challenge" },
                        difficulty: { type: "string" as const, enum: ["easy", "medium", "hard"], description: "Difficulty level" },
                        description: { type: "string" as const, description: "Detailed description with business context narrative" },
                        businessContext: { type: "string" as const, description: "Company/team context (e.g., 'You are on the Data Platform team at Uber...')" },
                        expectedTopics: { type: "array" as const, items: { type: "string" as const }, description: "Technical topics covered" },
                        hiddenIssues: { type: "array" as const, items: { type: "string" as const }, description: "Hidden bugs/issues for the candidate to find (do not reveal to user)" },
                        inputFormat: { type: "string" as const, description: "Input format/schema (for leetcode type)" },
                        outputFormat: { type: "string" as const, description: "Output format/expected result (for leetcode type)" },
                        examples: {
                            type: "array" as const,
                            items: {
                                type: "object" as const,
                                properties: {
                                    input: { type: "string" as const },
                                    output: { type: "string" as const },
                                    explanation: { type: "string" as const }
                                },
                                required: ["input", "output"]
                            },
                            description: "Examples for leetcode type"
                        },
                        constraints: { type: "array" as const, items: { type: "string" as const }, description: "Constraints and performance requirements" },
                        conceptFocus: { type: "array" as const, items: { type: "string" as const }, description: "Concepts to focus on (for pseudocode type)" },
                        expectedSteps: { type: "array" as const, items: { type: "string" as const }, description: "Expected implementation/analysis steps" },
                        initialDraft: { type: "string" as const, description: "PRODUCTION-GRADE code (80-150 lines) with hidden issues. Include: logging, error handling, type hints, architectural comments, metrics setup. Must have 2-3 subtle bugs or inefficiencies that a Staff Engineer should identify during code review." }
                    },
                    required: ["id", "title", "type", "difficulty", "description", "businessContext", "hiddenIssues", "initialDraft"]
                }
            }
        },
        required: ["challenges"]
    };

    try {
        // Prepare content parts: PDF attachment if available
        const contentParts: any[] = [];
        if (pdfData) {
            contentParts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
            contentParts.push({ text: prompt });
        } else {
            contentParts.push({ text: prompt });
        }

        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: challengeSchema
            }
        });

        const text = response.text || '';

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw text:', text.substring(0, 500));
            return [];
        }

        if (!parsed.challenges || !Array.isArray(parsed.challenges)) {
            console.error('Invalid response structure:', parsed);
            return [];
        }

        // Map to ensure proper structure
        return parsed.challenges.map((c: any, index: number) => ({
            id: c.id || `challenge-${Date.now()}-${index}`,
            title: c.title || 'Desafio sem título',
            type: c.type || 'leetcode',
            difficulty: c.difficulty || 'medium',
            description: c.description || '',
            businessContext: c.businessContext,
            expectedTopics: c.expectedTopics || [],
            hiddenIssues: c.hiddenIssues || [], // Store but don't show to user
            inputFormat: c.inputFormat,
            outputFormat: c.outputFormat,
            examples: c.examples || [],
            constraints: c.constraints || [],
            conceptFocus: c.conceptFocus || [],
            expectedSteps: c.expectedSteps || [],
            initialDraft: c.initialDraft
        }));
    } catch (error) {
        console.error("Error generating pair challenges:", error);
        return [];
    }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export const startPairSession = async (
    noteId: string,
    noteName: string,
    noteContent: string,
    language: ProgrammingLanguage = 'python',
    subjectMode: SubjectMode = 'computing',
    pdfData?: ArrayBuffer
): Promise<PairSession | null> => {
    const challenges = await generatePairChallenges(noteContent, noteName, language, subjectMode, pdfData);
    if (challenges.length === 0) return null;

    return {
        noteId,
        noteName,
        challenges,
        selectedChallenge: null,
        language,
        currentCode: '',
        messages: [],
        isComplete: false
    };
};

export const getLanguageTemplate = (language: ProgrammingLanguage): string => {
    return LANGUAGE_TEMPLATES[language].template;
};

export const getLanguageName = (language: ProgrammingLanguage): string => {
    return LANGUAGE_TEMPLATES[language].name;
};

// ============================================================================
// NAVIGATOR INTERACTION (Driver-Navigator Pattern)
// ============================================================================

export const getNavigatorResponse = async (
    session: PairSession,
    noteContent: string,
    driverMessage: string,
    currentCode: string,
    onChunk: (text: string) => void,
    pdfData?: ArrayBuffer
): Promise<{ text: string; suggestedCode?: string }> => {
    const ai = getClient();
    if (!ai) {
        onChunk("Erro: Cliente de IA não disponível.");
        return { text: "Erro: Cliente de IA não disponível." };
    }

    const challenge = session.selectedChallenge;
    if (!challenge) {
        onChunk("Erro: Nenhum desafio selecionado.");
        return { text: "Erro: Nenhum desafio selecionado." };
    }

    // Build dialog history (last 10 messages for context)
    // Safety: ensure text is always a string
    const safeText = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const dialogHistory = session.messages
        .slice(-10)
        .map(m => `${m.role === 'navigator' ? 'NAVIGATOR (Entrevistador)' : 'DRIVER (Candidato)'}: ${safeText(m.text)}`)
        .join('\n\n');

    const langInfo = LANGUAGE_TEMPLATES[session.language];

    // Use the new prompt from prompts folder
    const prompt = getNavigatorInteractionPrompt({
        noteContent: pdfData ? "[PDF ANEXADO]" : noteContent,
        challengeTitle: challenge.title,
        challengeType: challenge.type,
        challengeDifficulty: challenge.difficulty,
        challengeDescription: challenge.description,
        language: session.language,
        languageName: langInfo.name,
        currentCode: currentCode,
        dialogHistory: dialogHistory || 'Início da sessão',
        driverMessage: driverMessage
    });

    try {
        let fullResponse = '';

        // Prepare content parts
        const contentParts: any[] = [];
        if (pdfData) {
            contentParts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
            contentParts.push({ text: prompt });
        } else {
            contentParts.push({ text: prompt });
        }

        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: { temperature: 0.7 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                fullResponse += chunk.text;
                onChunk(chunk.text);
            }
        }

        // Extract suggested code if present
        let suggestedCode: string | undefined;
        const codeMatch = fullResponse.match(/---CODIGO_SUGERIDO---\s*```\w*\n([\s\S]*?)```/);
        if (codeMatch) {
            suggestedCode = codeMatch[1].trim();
            fullResponse = fullResponse.replace(/---CODIGO_SUGERIDO---[\s\S]*$/, '').trim();
        }

        return { text: fullResponse, suggestedCode };
    } catch (error: any) {
        console.error("Error generating navigator response:", error);
        const errorMsg = `[Erro: ${error.message || "Falha ao gerar resposta"}]`;
        onChunk(errorMsg);
        return { text: errorMsg };
    }
};

// ============================================================================
// FULL SOLUTION GENERATION
// ============================================================================

export const generateFullSolution = async (
    session: PairSession,
    noteContent: string,
    onChunk: (text: string) => void,
    pdfData?: ArrayBuffer
): Promise<{ code: string; explanation: string; complexity: { time: string; space: string }; keyDecisions: string[] } | null> => {
    const ai = getClient();
    if (!ai) return null;

    const challenge = session.selectedChallenge;
    if (!challenge) return null;

    const langInfo = LANGUAGE_TEMPLATES[session.language];

    // Build additional context based on challenge type
    let additionalContext = '';
    if (challenge.type === 'leetcode') {
        additionalContext = `
Input: ${challenge.inputFormat}
Output: ${challenge.outputFormat}
Exemplos: ${JSON.stringify(challenge.examples)}`;
    } else {
        additionalContext = `
Foco Conceitual: ${challenge.conceptFocus?.join(', ')}`;
    }

    // Use the new prompt from prompts folder
    const prompt = getFullSolutionPrompt({
        noteContent: pdfData ? "[PDF ANEXADO]" : noteContent,
        challengeTitle: challenge.title,
        challengeType: challenge.type === 'leetcode' ? 'LeetCode (Input/Output)' : 'Design de Sistema / Pseudocódigo',
        challengeDescription: challenge.description,
        additionalContext: additionalContext,
        language: session.language,
        languageName: langInfo.name,
        currentCode: session.currentCode
    });

    try {
        let fullResponse = '';

        // Prepare content parts
        const contentParts: any[] = [];
        if (pdfData) {
            contentParts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
            contentParts.push({ text: prompt });
        } else {
            contentParts.push({ text: prompt });
        }

        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: { temperature: 0.5 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                fullResponse += chunk.text;
                onChunk(chunk.text);
            }
        }

        // Extract code from response
        const codeMatch = fullResponse.match(/## 🔧 Implementação\s*```\w*\n([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : session.currentCode;

        // Extract complexity
        const timeMatch = fullResponse.match(/\*\*Tempo\*\*:\s*O\(([^)]+)\)/);
        const spaceMatch = fullResponse.match(/\*\*Espaço\*\*:\s*O\(([^)]+)\)/);

        return {
            code,
            explanation: fullResponse,
            complexity: {
                time: timeMatch ? `O(${timeMatch[1]})` : 'N/A',
                space: spaceMatch ? `O(${spaceMatch[1]})` : 'N/A'
            },
            keyDecisions: []
        };
    } catch (error) {
        console.error("Error generating solution:", error);
        return null;
    }
};

// ============================================================================
// SOLUTION FILE GENERATION
// ============================================================================

export const generatePairSolutionFile = (
    session: PairSession,
    noteName: string
): string => {
    const challenge = session.selectedChallenge;
    if (!challenge) return '';

    const langInfo = LANGUAGE_TEMPLATES[session.language];

    let content = `# Solução: ${challenge.title}\n\n`;
    content += `**Nota Base:** ${noteName}\n`;
    content += `**Tipo:** ${challenge.type === 'leetcode' ? 'LeetCode Style' : challenge.type === 'spark-job' ? 'Spark Job' : challenge.type === 'sql-query' ? 'SQL Query' : challenge.type === 'dynamodb' ? 'DynamoDB' : 'Pseudocódigo'}\n`;
    content += `**Dificuldade:** ${challenge.difficulty.toUpperCase()}\n`;
    content += `**Linguagem:** ${langInfo.name}\n`;
    content += `**Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;

    if (challenge.businessContext) {
        content += `---\n\n## 🏢 Contexto de Negócio\n\n${challenge.businessContext}\n\n`;
    }

    content += `---\n\n## 📋 Problema\n\n${challenge.description}\n\n`;

    if (challenge.type === 'leetcode' && challenge.examples) {
        content += `### Exemplos\n\n`;
        challenge.examples.forEach((ex, i) => {
            content += `**Exemplo ${i + 1}:**\n`;
            content += `- Input: \`${ex.input}\`\n`;
            content += `- Output: \`${ex.output}\`\n`;
            if (ex.explanation) content += `- Explicação: ${ex.explanation}\n`;
            content += `\n`;
        });
    }

    content += `---\n\n`;

    // Only include solution explanation if available, otherwise just the code
    if (session.solution && session.solution.explanation) {
        content += session.solution.explanation;
    } else {
        content += `## 🔧 Código Final\n\n`;
        content += `\`\`\`${session.language}\n${session.currentCode}\n\`\`\`\n`;
    }

    content += `\n\n*Gerado pelo Smart Handbook Pair Programming Mode*\n`;

    return content;
};
