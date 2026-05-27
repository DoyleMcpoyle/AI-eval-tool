export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string
          provider: 'openai' | 'anthropic'
          api_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider: 'openai' | 'anthropic'
          api_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: 'openai' | 'anthropic'
          api_key?: string
          created_at?: string
          updated_at?: string
        }
      }
      datasets: {
        Row: {
          id: string
          name: string
          description: string
          format: 'csv' | 'json' | 'jsonl'
          row_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          format: 'csv' | 'json' | 'jsonl'
          row_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          format?: 'csv' | 'json' | 'jsonl'
          row_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      dataset_versions: {
        Row: {
          id: string
          dataset_id: string
          version_number: number
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          dataset_id: string
          version_number: number
          data: Json
          created_at?: string
        }
        Update: {
          id?: string
          dataset_id?: string
          version_number?: number
          data?: Json
          created_at?: string
        }
      }
      eval_configs: {
        Row: {
          id: string
          name: string
          description: string
          rubric_prompt: string
          grading_model: string
          grading_provider: 'openai' | 'anthropic'
          human_review_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          rubric_prompt: string
          grading_model: string
          grading_provider: 'openai' | 'anthropic'
          human_review_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          rubric_prompt?: string
          grading_model?: string
          grading_provider?: 'openai' | 'anthropic'
          human_review_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      metrics: {
        Row: {
          id: string
          eval_config_id: string
          name: string
          description: string
          scoring_type: 'boolean' | 'numeric' | 'categorical'
          scoring_config: Json
          created_at: string
        }
        Insert: {
          id?: string
          eval_config_id: string
          name: string
          description?: string
          scoring_type: 'boolean' | 'numeric' | 'categorical'
          scoring_config?: Json
          created_at?: string
        }
        Update: {
          id?: string
          eval_config_id?: string
          name?: string
          description?: string
          scoring_type?: 'boolean' | 'numeric' | 'categorical'
          scoring_config?: Json
          created_at?: string
        }
      }
      eval_runs: {
        Row: {
          id: string
          name: string
          dataset_id: string
          dataset_version_id: string
          eval_config_id: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          progress: number
          total_outputs: number
          estimated_cost: number
          actual_cost: number
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          dataset_id: string
          dataset_version_id: string
          eval_config_id: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          total_outputs?: number
          estimated_cost?: number
          actual_cost?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          dataset_id?: string
          dataset_version_id?: string
          eval_config_id?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          total_outputs?: number
          estimated_cost?: number
          actual_cost?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      eval_results: {
        Row: {
          id: string
          eval_run_id: string
          output_index: number
          prompt: string
          output: string
          expected_result: string
          metadata: Json
          scores: Json
          llm_reasoning: string
          confidence_score: number
          flagged_for_review: boolean
          created_at: string
        }
        Insert: {
          id?: string
          eval_run_id: string
          output_index: number
          prompt: string
          output: string
          expected_result?: string
          metadata?: Json
          scores?: Json
          llm_reasoning?: string
          confidence_score?: number
          flagged_for_review?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          eval_run_id?: string
          output_index?: number
          prompt?: string
          output?: string
          expected_result?: string
          metadata?: Json
          scores?: Json
          llm_reasoning?: string
          confidence_score?: number
          flagged_for_review?: boolean
          created_at?: string
        }
      }
      human_reviews: {
        Row: {
          id: string
          eval_result_id: string
          reviewer_name: string
          scores: Json
          agreement: boolean
          notes: string
          flagged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          eval_result_id: string
          reviewer_name: string
          scores?: Json
          agreement?: boolean
          notes?: string
          flagged?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          eval_result_id?: string
          reviewer_name?: string
          scores?: Json
          agreement?: boolean
          notes?: string
          flagged?: boolean
          created_at?: string
        }
      }
      suggested_templates: {
        Row: {
          id: string
          type: 'rubric' | 'metric'
          name: string
          description: string
          content: Json
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          type: 'rubric' | 'metric'
          name: string
          description?: string
          content: Json
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'rubric' | 'metric'
          name?: string
          description?: string
          content?: Json
          category?: string
          created_at?: string
        }
      }
    }
  }
}
