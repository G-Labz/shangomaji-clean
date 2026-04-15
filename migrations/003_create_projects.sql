-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run

CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending_review',

  -- Project
  title text NOT NULL,
  type text NOT NULL,
  logline text NOT NULL,
  description text NOT NULL,

  -- Media
  thumbnail_url text,
  banner_url text,
  trailer_url text,
  video_url text,

  -- Creator
  creator_name text NOT NULL,
  creator_bio text,
  creator_email text,

  -- Metadata
  genre text,

  -- Admin
  admin_notes text
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow inserts from the API (service role bypasses RLS,
-- but this policy allows anon inserts if you ever need it)
CREATE POLICY "Anyone can submit projects"
  ON projects FOR INSERT
  WITH CHECK (true);
