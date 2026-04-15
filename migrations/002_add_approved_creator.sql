-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run

-- Add approved_creator column
ALTER TABLE creator_applications
ADD COLUMN IF NOT EXISTS approved_creator boolean DEFAULT false;
