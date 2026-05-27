/*
  # Add API Keys Table
  
  Creates a table to store API keys for different LLM providers.
  
  ## New Tables
  
  ### `api_keys`
  - `id` (uuid, primary key) - Unique identifier
  - `provider` (text) - Provider name (openai or anthropic)
  - `api_key` (text) - Encrypted API key
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  
  - Enable RLS on api_keys table
  - Allow all operations for MVP (will add proper auth in V2)
  
  ## Notes
  
  1. Only one key per provider allowed (enforced by unique constraint)
  2. API keys should be handled securely in production
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE CHECK (provider IN ('openai', 'anthropic')),
  api_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on api_keys"
  ON api_keys FOR ALL
  USING (true)
  WITH CHECK (true);