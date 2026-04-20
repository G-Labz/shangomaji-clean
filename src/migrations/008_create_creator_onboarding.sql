-- Migration 008: Creator onboarding records
-- Real onboarding — not fake. A creator is only considered onboarded after
-- they have explicitly accepted platform terms via the onboarding link.
-- Admin acceptance creates the record and token. Token is consumed on accept.

CREATE TABLE IF NOT EXISTS creator_onboarding (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   uuid          NOT NULL
                                   REFERENCES creator_applications(id) ON DELETE CASCADE,
  email            text          NOT NULL,

  -- Cryptographically random token (base64url, 32 bytes of entropy)
  token            text          NOT NULL UNIQUE,
  token_expires_at timestamptz   NOT NULL,

  -- Email delivery audit
  sent_at          timestamptz,
  send_error       text,

  -- Explicit creator acceptance
  accepted_at      timestamptz,
  accepted_version text,

  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- One onboarding record per application (admin re-acceptance upserts)
CREATE UNIQUE INDEX IF NOT EXISTS creator_onboarding_application_unique
  ON creator_onboarding (application_id);

CREATE INDEX IF NOT EXISTS creator_onboarding_email_idx
  ON creator_onboarding (email);

-- Manual grandfathering step (run once, AFTER this migration, if there are
-- creators who were accepted before this system shipped and already have
-- auth accounts set up. Skip if there are none.):
--
-- INSERT INTO creator_onboarding (application_id, email, token, token_expires_at, sent_at, accepted_at, accepted_version)
-- SELECT id, email, 'grandfathered-' || id, now(), now(), now(), 'v0-grandfathered'
-- FROM creator_applications
-- WHERE status = 'accepted'
-- ON CONFLICT (application_id) DO NOTHING;
