-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run

CREATE TABLE creator_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  display_name text,
  handle text,
  bio_short text,
  bio_long text,
  city text,
  country text,
  website text,
  instagram text,
  twitter text,
  youtube text,
  avatar_url text,
  banner_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Allow inserts and updates via service role (which bypasses RLS)
-- Add a basic select policy for safety
CREATE POLICY "Profiles are readable"
  ON creator_profiles FOR SELECT
  USING (true);

CREATE POLICY "Profiles are insertable"
  ON creator_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Profiles are updatable"
  ON creator_profiles FOR UPDATE
  USING (true);
